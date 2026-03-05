import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import multer from 'multer'
import mongoose from 'mongoose'
import nodemailer from 'nodemailer'
import Enrollment from './models/Enrollment.js'
import {
  incomeVerificationDocumentKeys,
  redactSensitiveEnrollmentPayload,
  sanitizeEnrollmentPayload,
  uploadFlagFields,
  validateEnrollmentPayload,
} from './lib/enrollmentPayload.js'

dotenv.config()

const app = express()
const port = Number(process.env.PORT || 5000)
const mongoUri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB || 'empoweraid'
const uploadBucketName = process.env.MONGODB_UPLOAD_BUCKET || 'enrollmentUploads'
const maxUploadFileSizeMb = Number(process.env.MAX_UPLOAD_FILE_MB || 10)
const enrollmentRateLimitMax = Number(process.env.ENROLLMENT_RATE_LIMIT_MAX || 20)
const defaultNotificationRecipients = [
  'williambeebejunior@gmail.com',
  'papil9195@gmail.com',
]
const notificationRecipients = (
  process.env.NOTIFICATION_RECIPIENTS || defaultNotificationRecipients.join(',')
)
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)

const smtpHost = (process.env.SMTP_HOST || '').trim()
const smtpPort = Number(process.env.SMTP_PORT || 587)
const smtpSecure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true'
const smtpUser = (process.env.SMTP_USER || '').trim()
const smtpPass = process.env.SMTP_PASS || ''
const smtpFrom = (process.env.SMTP_FROM || smtpUser).trim()
const smtpVerifyTimeoutMs = Number(process.env.SMTP_VERIFY_TIMEOUT_MS || 8000)

let uploadBucket = null
let mailTransport = null
const emailStatus = {
  configured: false,
  verified: false,
  message: '',
}

if (smtpHost && smtpUser && smtpPass && smtpFrom) {
  mailTransport = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  })
  emailStatus.configured = true
  emailStatus.message = 'SMTP settings loaded.'
} else {
  emailStatus.message = 'SMTP settings are incomplete.'
}

app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY))
app.disable('x-powered-by')

if (!mongoUri) {
  console.error('Missing MONGODB_URI in environment variables.')
  process.exit(1)
}

const configuredOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
const allowedOrigins =
  configuredOrigins.length > 0 ? configuredOrigins : ['http://localhost:5173', 'http://127.0.0.1:5173']

const expectedUploadFieldNames = new Set([
  ...uploadFlagFields,
  ...incomeVerificationDocumentKeys.map((key) => `incomeVerificationDocuments.${key}`),
])

const uploadParser = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxUploadFileSizeMb * 1024 * 1024,
    files: expectedUploadFieldNames.size,
  },
})

const enrollmentRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: enrollmentRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many enrollment submissions. Please try again later.' },
})

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true)
      }
      return callback(new Error('Origin not allowed by CORS'))
    },
  })
)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
)
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uploadBucket: uploadBucketName,
    emailConfigured: emailStatus.configured,
    emailVerified: emailStatus.verified,
    emailStatus: emailStatus.message,
  })
})

app.get('/api/enrollments/:id/files', async (req, res) => {
  const enrollmentId = req.params.id
  if (!mongoose.isValidObjectId(enrollmentId)) {
    return res.status(400).json({ error: 'Invalid enrollment id.' })
  }

  try {
    const enrollment = await Enrollment.findById(enrollmentId).select('uploadedFiles')
    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found.' })
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`
    const files = (enrollment.uploadedFiles || []).map((file) => ({
      fieldName: file.fieldName,
      fileId: file.fileId.toString(),
      filename: file.filename,
      contentType: file.contentType,
      size: file.size,
      uploadedAt: file.uploadedAt,
      viewUrl: `${baseUrl}/api/uploads/${file.fileId.toString()}`,
    }))

    return res.json({
      enrollmentId: enrollment._id.toString(),
      files,
    })
  } catch (error) {
    console.error('Failed to load enrollment files:', error)
    return res.status(500).json({ error: 'Unable to load enrollment files.' })
  }
})

app.get('/api/uploads/:fileId', async (req, res) => {
  if (!uploadBucket) {
    return res.status(503).json({ error: 'Upload storage is not initialized.' })
  }

  const fileId = req.params.fileId
  if (!mongoose.isValidObjectId(fileId)) {
    return res.status(400).json({ error: 'Invalid file id.' })
  }

  const objectId = new mongoose.Types.ObjectId(fileId)

  try {
    const file = await mongoose.connection.db.collection(`${uploadBucketName}.files`).findOne({ _id: objectId })
    if (!file) {
      return res.status(404).json({ error: 'File not found.' })
    }

    res.setHeader('Content-Type', resolveStoredFileContentType(file))
    if (typeof file.length === 'number') {
      res.setHeader('Content-Length', String(file.length))
    }
    res.setHeader('Content-Disposition', `inline; filename="${sanitizeFilenameForHeader(file.filename || 'file')}"`)

    const downloadStream = uploadBucket.openDownloadStream(objectId)
    downloadStream.once('error', (error) => {
      console.error('Failed to stream uploaded file:', error)
      if (!res.headersSent) {
        return res.status(404).json({ error: 'File stream not found.' })
      }
      return res.end()
    })
    return downloadStream.pipe(res)
  } catch (error) {
    console.error('Failed to load uploaded file:', error)
    return res.status(500).json({ error: 'Unable to load uploaded file.' })
  }
})

app.post('/api/enrollments', enrollmentRateLimiter, parseEnrollmentUpload, async (req, res) => {
  if (!isEmailNotificationConfigured()) {
    return res.status(503).json({
      error: 'Email delivery is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM.',
    })
  }

  let rawPayload

  try {
    rawPayload = getRequestPayload(req)
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Invalid request payload.' })
  }

  if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
    return res.status(400).json({ error: 'Invalid request payload.' })
  }

  let uploadedFiles
  try {
    uploadedFiles = normalizeUploadedFiles(req.files || [])
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Invalid uploaded files.' })
  }

  const payloadWithFiles = applyUploadFlags(rawPayload, uploadedFiles)
  const payload = sanitizeEnrollmentPayload(payloadWithFiles)
  const validationErrors = validateEnrollmentPayload(payload)

  if (validationErrors.length > 0) {
    return res.status(422).json({
      error: 'Enrollment request failed validation.',
      details: validationErrors.slice(0, 12),
    })
  }

  const storedPayload = redactSensitiveEnrollmentPayload(payload)
  const sourceIp = req.ip || ''

  let storedFiles = []

  try {
    storedFiles = await persistUploadedFiles(uploadedFiles)
  } catch (error) {
    console.error('Failed to store uploaded files:', error)
    return res.status(500).json({ error: 'Unable to store uploaded files at this time.' })
  }

  let enrollment = null

  try {
    enrollment = await Enrollment.create({
      firstName: payload.firstName,
      middleName: payload.middleName,
      lastName: payload.lastName,
      email: payload.email,
      payload: storedPayload,
      requestMeta: {
        ipAddress: sourceIp,
        userAgent: req.get('user-agent') || '',
      },
      uploadedFiles: storedFiles,
    })

    await sendEnrollmentNotification({
      enrollmentId: enrollment._id.toString(),
      payload,
      uploadedFiles,
      sourceIp,
      userAgent: req.get('user-agent') || '',
    })

    return res.status(201).json({
      id: enrollment._id.toString(),
      uploadedFiles: storedFiles.length,
    })
  } catch (error) {
    if (enrollment?._id) {
      await Enrollment.findByIdAndDelete(enrollment._id).catch(() => undefined)
    }
    await cleanupGridFsUploads(storedFiles)
    console.error('Failed to save enrollment or send email notification:', error)
    return res.status(500).json({ error: 'Unable to submit enrollment at this time.' })
  }
})

app.use((error, _req, res, next) => {
  if (error?.message === 'Origin not allowed by CORS') {
    return res.status(403).json({ error: 'Origin not allowed by CORS.' })
  }
  return next(error)
})

app.use((error, _req, res, _next) => {
  console.error('Unhandled API error:', error)
  return res.status(500).json({ error: 'Unexpected server error.' })
})

async function startServer() {
  try {
    await mongoose.connect(mongoUri, { dbName })
    uploadBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: uploadBucketName,
    })

    app.listen(port, () => {
      console.log(`API server running on http://localhost:${port}`)
    })

    if (isEmailNotificationConfigured()) {
      verifySmtpTransportWithTimeout(mailTransport, smtpVerifyTimeoutMs)
        .then(() => {
          emailStatus.verified = true
          emailStatus.message = `SMTP verified for ${smtpFrom}.`
          console.log(`Email notifications enabled for: ${notificationRecipients.join(', ')}`)
        })
        .catch((error) => {
          emailStatus.verified = false
          emailStatus.message = error?.message || 'SMTP verification failed.'
          mailTransport = null
          console.error('SMTP verification failed. Email notifications disabled until credentials are fixed.', error)
        })
    } else {
      console.warn('Email notifications are not configured. Enrollment submission will return 503.')
      emailStatus.verified = false
    }
  } catch (error) {
    console.error('Failed to start API server:', error)
    process.exit(1)
  }
}

startServer()

function parseTrustProxy(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return false
  }

  const normalized = String(value).trim().toLowerCase()
  if (normalized === 'true') return true
  if (normalized === 'false') return false

  const asNumber = Number(normalized)
  if (Number.isInteger(asNumber) && asNumber >= 0) {
    return asNumber
  }

  return value
}

function parseEnrollmentUpload(req, res, next) {
  if (!req.is('multipart/form-data')) {
    return next()
  }

  uploadParser.any()(req, res, (error) => {
    if (!error) {
      return next()
    }
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ error: `File upload error: ${error.message}` })
    }
    return res.status(400).json({ error: error.message || 'Invalid file upload request.' })
  })
}

function getRequestPayload(req) {
  if (!req.is('multipart/form-data')) {
    return req.body
  }

  if (typeof req.body?.payload !== 'string') {
    throw new Error('Missing payload field in multipart form data.')
  }

  try {
    return JSON.parse(req.body.payload)
  } catch {
    throw new Error('Invalid payload JSON in multipart form data.')
  }
}

function normalizeUploadedFiles(files) {
  const normalized = {}

  for (const file of files) {
    const fieldName = file.fieldname
    if (!expectedUploadFieldNames.has(fieldName)) {
      throw new Error(`Unexpected upload field: ${fieldName}`)
    }
    if (normalized[fieldName]) {
      throw new Error(`Duplicate upload field: ${fieldName}`)
    }
    normalized[fieldName] = file
  }

  return normalized
}

function applyUploadFlags(payload, uploadedFiles) {
  const source = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {}

  const nextPayload = {
    ...source,
    incomeVerificationDocuments: {
      ...(source.incomeVerificationDocuments && typeof source.incomeVerificationDocuments === 'object'
        ? source.incomeVerificationDocuments
        : {}),
    },
  }

  for (const field of uploadFlagFields) {
    nextPayload[field] = Boolean(uploadedFiles[field])
  }

  for (const key of incomeVerificationDocumentKeys) {
    nextPayload.incomeVerificationDocuments[key] = Boolean(uploadedFiles[`incomeVerificationDocuments.${key}`])
  }

  return nextPayload
}

async function persistUploadedFiles(uploadedFiles) {
  const entries = Object.entries(uploadedFiles)
  if (entries.length === 0) {
    return []
  }
  if (!uploadBucket) {
    throw new Error('Upload bucket is not initialized.')
  }

  const storedFiles = []
  const uploadedIds = []

  try {
    for (const [fieldName, file] of entries) {
      const storedFile = await uploadSingleFile(fieldName, file)
      uploadedIds.push(storedFile.fileId)
      storedFiles.push(storedFile)
    }
    return storedFiles
  } catch (error) {
    await Promise.all(uploadedIds.map((id) => uploadBucket.delete(id).catch(() => undefined)))
    throw error
  }
}

function uploadSingleFile(fieldName, file) {
  const contentType = file.mimetype || 'application/octet-stream'

  return new Promise((resolve, reject) => {
    const uploadStream = uploadBucket.openUploadStream(file.originalname || 'upload', {
      metadata: {
        fieldName,
        size: file.size || 0,
        contentType,
      },
    })

    uploadStream.once('error', reject)
    uploadStream.once('finish', () => {
      resolve({
        fieldName,
        fileId: uploadStream.id,
        filename: file.originalname || 'upload',
        contentType,
        size: file.size || 0,
        uploadedAt: new Date(),
      })
    })

    uploadStream.end(file.buffer)
  })
}

async function cleanupGridFsUploads(storedFiles) {
  if (!uploadBucket) return

  const fileIds = storedFiles
    .map((file) => file?.fileId)
    .filter(Boolean)

  if (fileIds.length === 0) return

  await Promise.all(fileIds.map((id) => uploadBucket.delete(id).catch(() => undefined)))
}

function sanitizeFilenameForHeader(value) {
  return String(value).replace(/[\\\"\r\n]/g, '_')
}

function resolveStoredFileContentType(file) {
  const explicitContentType = file?.contentType || file?.metadata?.contentType
  if (explicitContentType) {
    return explicitContentType
  }

  const filename = String(file?.filename || '').toLowerCase()
  if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) return 'image/jpeg'
  if (filename.endsWith('.png')) return 'image/png'
  if (filename.endsWith('.gif')) return 'image/gif'
  if (filename.endsWith('.webp')) return 'image/webp'
  if (filename.endsWith('.pdf')) return 'application/pdf'
  if (filename.endsWith('.txt')) return 'text/plain; charset=utf-8'
  return 'application/octet-stream'
}

function isEmailNotificationConfigured() {
  return Boolean(mailTransport && smtpFrom && notificationRecipients.length > 0)
}

async function verifySmtpTransportWithTimeout(transport, timeoutMs) {
  return new Promise((resolve, reject) => {
    let settled = false
    const timer = setTimeout(() => {
      settled = true
      reject(new Error(`SMTP verification timed out after ${timeoutMs}ms.`))
    }, timeoutMs)

    Promise.resolve(transport.verify())
      .then(() => {
        if (settled) return
        clearTimeout(timer)
        resolve()
      })
      .catch((error) => {
        if (settled) return
        clearTimeout(timer)
        reject(error)
      })
  })
}

const FIELD_LABELS = {
  firstName: 'First Name',
  middleName: 'Middle Name',
  lastName: 'Last Name',
  ssn: 'Social Security Number (SSN)',
  dateOfBirth: 'Date of Birth',
  phoneNumber: 'Phone Number',
  email: 'Email Address',
  currentAddress: 'Current Address',
  city: 'City',
  stateRegion: 'State/Region',
  zipCode: 'ZIP Code',
  preferredLanguage: 'Preferred Language',
  householdSize: 'Number of People in Household',
  childrenAges: 'Ages of Children',
  maritalStatus: 'Marital Status',
  employmentStatus: 'Employment Status',
  monthlyIncome: 'Total Household Monthly Income',
  receivesBenefits: 'Do you receive SNAP, Medicaid, SSI, etc.?',
  foodAssistanceReason: 'Food Assistance Reason',
  foodAssistanceDuration: 'Food Assistance Duration',
  foodDeclaration: 'Food Assistance Declaration Accepted',
  foodSignature: 'Food Assistance Signature',
  foodSignatureDate: 'Food Assistance Signature Date',
  schoolName: 'School Name',
  gradeProgram: 'Grade/Program',
  educationAmountRequested: 'Education Amount Requested',
  hospitalClinicName: 'Hospital/Clinic Name',
  diagnosisSummary: 'Diagnosis Summary',
  medicalAmountRequested: 'Medical Amount Requested',
  facingEviction: 'Are You Currently Facing Eviction?',
  landlordContactInformation: 'Landlord Contact Information',
  housingAmountOwed: 'Housing Amount Owed',
  mortgageApplicantName: 'Mortgage Applicant Name',
  mortgageDateOfBirth: 'Mortgage Date of Birth',
  mortgagePhoneNumber: 'Mortgage Phone Number',
  mortgageEmail: 'Mortgage Email',
  mortgagePropertyAddress: 'Mortgage Property Address',
  mortgageCity: 'Mortgage City',
  mortgageStateRegion: 'Mortgage State/Region',
  mortgageZipCode: 'Mortgage ZIP Code',
  primaryResidence: 'Is This Your Primary Residence?',
  ownsHome: 'Do You Own the Home?',
  mortgageLenderName: 'Mortgage Lender / Servicer Name',
  mortgageLoanAccountLast4: 'Loan Account Number (Last 4 Digits)',
  currentMortgagePayment: 'Current Monthly Mortgage Payment',
  totalPastDueAmount: 'Total Past Due Amount',
  inForeclosure: 'Are You in Foreclosure?',
  auctionDate: 'Auction Date',
  hardshipStartDate: 'Date Hardship Began',
  mortgageCurrentMonthlyIncome: 'Current Household Monthly Income',
  mortgageAmountRequested: 'Mortgage Amount Requested',
  mortgageHelpType: 'One-Time or Temporary Help',
  mortgageAuthorization: 'Mortgage Verification Authorization',
  eligibilityAuthorization: 'Eligibility Authorization',
  nonDiscriminationAcknowledgment: 'Non-Discrimination Acknowledgment',
  educationInvoiceUploaded: 'Education Invoice Uploaded',
  foodIncomeProofUploaded: 'Food Income Proof Uploaded',
  foodAddressProofUploaded: 'Food Address Proof Uploaded',
  medicalBillUploaded: 'Medical Bill Uploaded',
  housingEvictionNoticeUploaded: 'Eviction Notice Uploaded',
  mortgageStatementUploaded: 'Mortgage Statement Uploaded',
  mortgageDelinquencyNoticeUploaded: 'Delinquency / Foreclosure Letter Uploaded',
  mortgageIncomeProofUploaded: 'Mortgage Income Proof Uploaded',
}

const ASSISTANCE_OPTION_LABELS = {
  educationSupport: 'Education Support',
  foodAssistance: 'Food Assistance',
  medicalAssistance: 'Medical Assistance',
  rentalHousingSupport: 'Rental / Housing Support',
  mortgageReliefAssistance: 'Mortgage Relief Assistance',
}

const FOOD_SUPPORT_LABELS = {
  oneTimeEmergencyFoodPackage: 'One-Time Emergency Food Package',
  monthlyFoodSupport: 'Monthly Food Support',
  specialDietaryNeeds: 'Special Dietary Needs',
  communityFeedingProgram: 'Community Feeding Program',
}

const MORTGAGE_LOAN_LABELS = {
  fha: 'FHA',
  va: 'VA',
  conventional: 'Conventional',
  usda: 'USDA',
}

const HARDSHIP_CAUSE_LABELS = {
  jobLoss: 'Job Loss',
  medicalEmergency: 'Medical Emergency',
  disability: 'Disability',
  divorce: 'Divorce',
  naturalDisaster: 'Natural Disaster',
  other: 'Other',
}

const INCOME_DOC_LABELS = {
  lastTwoPayStubs: 'Last 2 Pay Stubs',
  taxReturn1040: 'Tax Return (Form 1040)',
  snapOrSsiApprovalLetter: 'SNAP/SSI Approval Letter',
  unemploymentBenefitsLetter: 'Unemployment Benefits Letter',
  bankAndCreditScoreProof: 'Bank and Credit Score Proof',
}

async function sendEnrollmentNotification({
  enrollmentId,
  payload,
  uploadedFiles,
  sourceIp,
  userAgent,
}) {
  const compactPayload = compactNotificationPayload(payload) || {}

  const applicantName = [payload.firstName, payload.middleName, payload.lastName]
    .filter(Boolean)
    .join(' ')
    .trim()

  const subject = `New Enrollment Submission${applicantName ? ` - ${applicantName}` : ''}`
  const emailBodyLines = buildReadableSubmissionLines(compactPayload, uploadedFiles)

  const textLines = [
    'A new enrollment submission was received.',
    '',
    `Enrollment ID: ${enrollmentId}`,
    `Applicant: ${applicantName || 'N/A'}`,
    `Email: ${payload.email || 'N/A'}`,
    `Source IP: ${sourceIp || 'N/A'}`,
    `User Agent: ${userAgent || 'N/A'}`,
    `Attached Files: ${Object.keys(uploadedFiles).length}`,
    '',
    ...emailBodyLines,
  ]

  const attachments = Object.entries(uploadedFiles).map(([fieldName, file]) => ({
    filename: `${fieldName.replace(/[^A-Za-z0-9._-]/g, '_')}__${file.originalname || 'upload'}`,
    content: file.buffer,
    contentType: file.mimetype || 'application/octet-stream',
  }))

  await mailTransport.sendMail({
    from: smtpFrom,
    to: notificationRecipients,
    subject,
    text: textLines.join('\n'),
    attachments,
  })
}

function compactNotificationPayload(payload) {
  return pruneEmptyNotificationValue(payload)
}

function pruneEmptyNotificationValue(value) {
  if (value === null || value === undefined) return undefined

  if (typeof value === 'string') {
    return value.trim() === '' ? undefined : value
  }

  if (typeof value === 'boolean') {
    return value ? true : undefined
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined
  }

  if (Array.isArray(value)) {
    const nextArray = value
      .map((item) => pruneEmptyNotificationValue(item))
      .filter((item) => item !== undefined)
    return nextArray.length > 0 ? nextArray : undefined
  }

  if (typeof value === 'object') {
    const nextObject = {}
    for (const [key, childValue] of Object.entries(value)) {
      const nextValue = pruneEmptyNotificationValue(childValue)
      if (nextValue !== undefined) {
        nextObject[key] = nextValue
      }
    }
    return Object.keys(nextObject).length > 0 ? nextObject : undefined
  }

  return value
}

function buildReadableSubmissionLines(payload, uploadedFiles) {
  const lines = []

  const selectedAssistanceKeys = getSelectedOptionKeys(payload.assistanceRequested)
  const selectedAssistanceLabels = selectedAssistanceKeys.map((key) => ASSISTANCE_OPTION_LABELS[key] || toReadableLabel(key))

  const basicRows = createFieldRows(payload, [
    'firstName',
    'middleName',
    'lastName',
    'ssn',
    'dateOfBirth',
    'phoneNumber',
    'email',
    'currentAddress',
    'city',
    'stateRegion',
    'zipCode',
    'preferredLanguage',
  ])
  addSectionRows(lines, 'Basic Information', basicRows)

  const householdRows = createFieldRows(payload, [
    'householdSize',
    'childrenAges',
    'maritalStatus',
    'employmentStatus',
    'monthlyIncome',
    'receivesBenefits',
  ])
  addSectionRows(lines, 'Household Information', householdRows)

  if (selectedAssistanceLabels.length > 0) {
    addSectionRows(lines, 'Assistance Requested', [['Selected Assistance', selectedAssistanceLabels.join(', ')]])
  }

  if (selectedAssistanceKeys.includes('educationSupport')) {
    addSectionRows(lines, 'Education Support Section', createFieldRows(payload, [
      'schoolName',
      'gradeProgram',
      'educationAmountRequested',
      'educationInvoiceUploaded',
    ]))
  }

  if (selectedAssistanceKeys.includes('foodAssistance')) {
    const foodSupport = getSelectedOptionLabels(payload.foodSupportTypes, FOOD_SUPPORT_LABELS)
    const foodRows = createFieldRows(payload, [
      'foodAssistanceReason',
      'foodAssistanceDuration',
      'foodDeclaration',
      'foodSignature',
      'foodSignatureDate',
      'foodIncomeProofUploaded',
      'foodAddressProofUploaded',
    ])
    if (foodSupport.length > 0) {
      foodRows.unshift(['Food Support Type', foodSupport.join(', ')])
    }
    addSectionRows(lines, 'Food Assistance Section', foodRows)
  }

  if (selectedAssistanceKeys.includes('medicalAssistance')) {
    addSectionRows(lines, 'Medical Assistance Section', createFieldRows(payload, [
      'hospitalClinicName',
      'diagnosisSummary',
      'medicalAmountRequested',
      'medicalBillUploaded',
    ]))
  }

  if (selectedAssistanceKeys.includes('rentalHousingSupport')) {
    addSectionRows(lines, 'Rental / Housing Support Section', createFieldRows(payload, [
      'facingEviction',
      'landlordContactInformation',
      'housingAmountOwed',
      'housingEvictionNoticeUploaded',
    ]))
  }

  if (selectedAssistanceKeys.includes('mortgageReliefAssistance')) {
    const mortgageLoanTypes = getSelectedOptionLabels(payload.mortgageLoanTypes, MORTGAGE_LOAN_LABELS)
    const hardshipCauses = getSelectedOptionLabels(payload.hardshipCauses, HARDSHIP_CAUSE_LABELS)
    const mortgageRows = createFieldRows(payload, [
      'mortgageApplicantName',
      'mortgageDateOfBirth',
      'mortgagePhoneNumber',
      'mortgageEmail',
      'mortgagePropertyAddress',
      'mortgageCity',
      'mortgageStateRegion',
      'mortgageZipCode',
      'primaryResidence',
      'ownsHome',
      'mortgageLenderName',
      'mortgageLoanAccountLast4',
      'currentMortgagePayment',
      'totalPastDueAmount',
      'inForeclosure',
      'auctionDate',
      'hardshipStartDate',
      'mortgageCurrentMonthlyIncome',
      'mortgageAmountRequested',
      'mortgageHelpType',
      'mortgageAuthorization',
      'mortgageStatementUploaded',
      'mortgageDelinquencyNoticeUploaded',
      'mortgageIncomeProofUploaded',
    ])

    if (mortgageLoanTypes.length > 0) {
      mortgageRows.unshift(['Type of Loan', mortgageLoanTypes.join(', ')])
    }
    if (hardshipCauses.length > 0) {
      mortgageRows.push(['Hardship Causes', hardshipCauses.join(', ')])
    }
    addSectionRows(lines, 'Mortgage Relief Section', mortgageRows)
  }

  const incomeDocs = getSelectedOptionLabels(payload.incomeVerificationDocuments, INCOME_DOC_LABELS)
  if (incomeDocs.length > 0) {
    addSectionRows(
      lines,
      'Income Verification Documents',
      incomeDocs.map((label) => [label, 'Yes'])
    )
  }

  addSectionRows(lines, 'Final Authorizations', createFieldRows(payload, [
    'eligibilityAuthorization',
    'nonDiscriminationAcknowledgment',
  ]))

  const uploadedFileRows = Object.entries(uploadedFiles).map(([fieldName, file]) => [
    getUploadFieldLabel(fieldName),
    `${file.originalname || 'upload'} (${formatBytes(file.size || 0)})`,
  ])
  addSectionRows(lines, 'Attached Files', uploadedFileRows)

  if (lines.length === 0) {
    lines.push('No non-empty form fields were included.')
  }

  return lines
}

function addSectionRows(lines, title, rows) {
  if (!rows || rows.length === 0) return

  lines.push(`${title}:`)
  for (const [label, value] of rows) {
    lines.push(`- ${label}: ${value}`)
  }
  lines.push('')
}

function createFieldRows(payload, fields) {
  const rows = []

  for (const key of fields) {
    if (!Object.prototype.hasOwnProperty.call(payload, key)) continue
    const formatted = formatFieldValueForDisplay(key, payload[key])
    if (formatted === null) continue
    rows.push([getFieldLabel(key), formatted])
  }

  return rows
}

function formatFieldValueForDisplay(key, value) {
  if (value === null || value === undefined) return null

  if (typeof value === 'boolean') {
    return value ? 'Yes' : null
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : null
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed === '') return null
    if (trimmed.toLowerCase() === 'yes') return 'Yes'
    if (trimmed.toLowerCase() === 'no') return 'No'

    if (isMoneyLikeField(key) && /^\d+(\.\d+)?$/.test(trimmed)) {
      return `$${Number(trimmed).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
    }

    if (/^[a-z]+(-[a-z]+)+$/.test(trimmed)) {
      return toTitleCase(trimmed.replace(/-/g, ' '))
    }

    return trimmed
  }

  return null
}

function getSelectedOptionKeys(map) {
  if (!map || typeof map !== 'object') return []
  return Object.entries(map)
    .filter(([, value]) => value === true)
    .map(([key]) => key)
}

function getSelectedOptionLabels(map, labelMap) {
  return getSelectedOptionKeys(map).map((key) => labelMap[key] || toReadableLabel(key))
}

function getFieldLabel(key) {
  return FIELD_LABELS[key] || toReadableLabel(key)
}

function getUploadFieldLabel(fieldName) {
  if (fieldName.startsWith('incomeVerificationDocuments.')) {
    const nestedKey = fieldName.split('.')[1] || fieldName
    return `Income Verification - ${INCOME_DOC_LABELS[nestedKey] || toReadableLabel(nestedKey)}`
  }
  return getFieldLabel(fieldName)
}

function toReadableLabel(value) {
  const withSpaces = String(value)
    .replace(/\./g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()

  const title = toTitleCase(withSpaces)
  return title
    .replace(/\bSsn\b/g, 'SSN')
    .replace(/\bZip\b/g, 'ZIP')
    .replace(/\bSsi\b/g, 'SSI')
}

function toTitleCase(value) {
  return String(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function isMoneyLikeField(key) {
  return /(income|amount|payment|owed)/i.test(key)
}

function formatBytes(size) {
  if (!Number.isFinite(size) || size <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = size
  let idx = 0
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024
    idx += 1
  }
  const rounded = idx === 0 ? String(Math.round(value)) : value.toFixed(1)
  return `${rounded} ${units[idx]}`
}
