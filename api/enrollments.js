import multer from 'multer'
import nodemailer from 'nodemailer'
import {
  incomeVerificationDocumentKeys,
  sanitizeEnrollmentPayload,
  uploadFlagFields,
  validateEnrollmentPayload,
} from '../server/lib/enrollmentPayload.js'

const defaultNotificationRecipients = [
  'williambeebejunior@gmail.com',
  'papil9195@gmail.com',
]

const expectedUploadFieldNames = new Set([
  ...uploadFlagFields,
  ...incomeVerificationDocumentKeys.map((key) => `incomeVerificationDocuments.${key}`),
])

const uploadParser = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.MAX_UPLOAD_FILE_MB || 10) * 1024 * 1024,
    files: expectedUploadFieldNames.size,
  },
})

let mailTransport = null

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Allow', 'POST, OPTIONS')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader(
    'Permissions-Policy',
    'accelerometer=(), autoplay=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
  )
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' })
  }

  if (!isEmailNotificationConfigured()) {
    return res.status(503).json({
      error: 'Enrollment service is not configured yet. Missing SMTP settings.',
    })
  }

  try {
    await parseEnrollmentUpload(req, res)
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Invalid file upload request.' })
  }

  let rawPayload
  try {
    rawPayload = getRequestPayload(req)
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Invalid request payload.' })
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

  try {
    const transport = getMailTransport()
    const recipients = getNotificationRecipients()

    await transport.sendMail({
      from: getSmtpFrom(),
      to: recipients,
      subject: buildEmailSubject(payload),
      text: buildSubmissionText({ payload, uploadedFiles }),
      attachments: Object.entries(uploadedFiles).map(([, file]) => ({
        filename: file.originalname || 'upload',
        content: file.buffer,
        contentType: file.mimetype || 'application/octet-stream',
      })),
    })

    return res.status(201).json({
      id: `mail-${Date.now()}`,
      uploadedFiles: Object.keys(uploadedFiles).length,
    })
  } catch (error) {
    console.error('Failed to submit enrollment via serverless API:', error)
    return res.status(500).json({ error: 'Unable to submit enrollment at this time.' })
  }
}

function parseEnrollmentUpload(req, res) {
  return new Promise((resolve, reject) => {
    uploadParser.any()(req, res, (error) => {
      if (!error) {
        resolve()
        return
      }

      if (error instanceof multer.MulterError) {
        reject(new Error(`File upload error: ${error.message}`))
        return
      }

      reject(new Error(error.message || 'Invalid file upload request.'))
    })
  })
}

function getRequestPayload(req) {
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

function buildEmailSubject(payload) {
  const applicantName = [payload.firstName, payload.middleName, payload.lastName]
    .filter(Boolean)
    .join(' ')
    .trim()
  return applicantName ? `New Enrollment Submission - ${applicantName}` : 'New Enrollment Submission'
}

function buildSubmissionText({ payload, uploadedFiles }) {
  const lines = []
  const selectedAssistanceKeys = getSelectedOptionKeys(payload.assistanceRequested)
  const selectedAssistanceLabels = selectedAssistanceKeys.map((key) => ASSISTANCE_OPTION_LABELS[key] || toReadableLabel(key))

  lines.push('A new enrollment submission was received.')
  lines.push('')
  lines.push(`Attached Files: ${Object.keys(uploadedFiles).length}`)
  lines.push('')

  addSectionRows(lines, 'Basic Information', createFieldRows(payload, [
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
  ]))

  if (selectedAssistanceLabels.length > 0) {
    addSectionRows(lines, 'Assistance Requested', [['Selected Assistance', selectedAssistanceLabels.join(', ')]])
  }

  if (selectedAssistanceKeys.includes('educationSupport')) {
    addSectionRows(lines, 'Education Assistance Section', createFieldRows(payload, [
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
      foodRows.unshift(['Type of Food Assistance Needed', foodSupport.join(', ')])
    }
    addSectionRows(lines, 'Food Assistance Intake Form', foodRows)
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
    addSectionRows(lines, 'Housing Assistance Section', createFieldRows(payload, [
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
      mortgageRows.unshift(['Type of loan', mortgageLoanTypes.join(', ')])
    }
    if (hardshipCauses.length > 0) {
      mortgageRows.push(['What caused the hardship?', hardshipCauses.join(', ')])
    }
    addSectionRows(lines, 'Mortgage Relief Assistance', mortgageRows)
  }

  addSectionRows(lines, 'Household Information', createFieldRows(payload, [
    'householdSize',
    'childrenAges',
    'maritalStatus',
    'employmentStatus',
    'monthlyIncome',
    'receivesBenefits',
  ]))

  const incomeDocs = getSelectedOptionLabels(payload.incomeVerificationDocuments, INCOME_DOC_LABELS)
  if (incomeDocs.length > 0) {
    addSectionRows(lines, 'Income Verification', incomeDocs.map((label) => [label, 'Yes']))
  }

  addSectionRows(lines, 'Consent & Authorization', createFieldRows(payload, [
    'eligibilityAuthorization',
    'nonDiscriminationAcknowledgment',
  ]))

  const uploadedFileRows = Object.entries(uploadedFiles).map(([fieldName, file]) => [
    getUploadFieldLabel(fieldName),
    `${file.originalname || 'upload'} (${formatBytes(file.size || 0)})`,
  ])
  addSectionRows(lines, 'Attached Files', uploadedFileRows)

  if (lines.length === 0) {
    lines.push('No non-empty fields were submitted.')
  }

  return lines.join('\n')
}

const FIELD_LABELS = {
  firstName: 'First Name',
  middleName: 'Middle Name',
  lastName: 'Last Name',
  ssn: '9 Digits SSN',
  dateOfBirth: 'Date of Birth',
  phoneNumber: 'Phone Number',
  email: 'Email Address',
  currentAddress: 'Current Address',
  city: 'City',
  stateRegion: 'State',
  zipCode: 'ZIP Code',
  preferredLanguage: 'Preferred Language',
  householdSize: 'Number of People in Household',
  childrenAges: 'Ages of Children',
  maritalStatus: 'Marital Status',
  employmentStatus: 'Employment Status',
  monthlyIncome: 'Total Household Monthly Income',
  receivesBenefits: 'Do you receive SNAP, Medicaid, SSI, etc.?',
  foodAssistanceReason: 'Short description: Why do you need food support?',
  foodAssistanceDuration: 'How long do you expect to need assistance?',
  foodDeclaration: 'I confirm that the information provided is accurate and true',
  foodSignature: 'Signature',
  foodSignatureDate: 'Date',
  schoolName: 'School Name',
  gradeProgram: 'Grade / Program',
  educationAmountRequested: 'Amount Requested',
  hospitalClinicName: 'Hospital / Clinic Name',
  diagnosisSummary: 'Diagnosis (optional summary)',
  medicalAmountRequested: 'Amount Requested',
  facingEviction: 'Are you facing eviction?',
  landlordContactInformation: 'Landlord Contact Information',
  housingAmountOwed: 'Amount Owed',
  mortgageApplicantName: 'Full Legal Name',
  mortgageDateOfBirth: 'Date of Birth',
  mortgagePhoneNumber: 'Phone Number',
  mortgageEmail: 'Email',
  mortgagePropertyAddress: 'Property Address',
  mortgageCity: 'City',
  mortgageStateRegion: 'State',
  mortgageZipCode: 'ZIP',
  primaryResidence: 'Is this your primary residence?',
  ownsHome: 'Do you own the home?',
  mortgageLenderName: 'Mortgage Lender / Servicer Name',
  mortgageLoanAccountLast4: 'Loan Account Number (last 4 digits only for privacy)',
  currentMortgagePayment: 'Current Monthly Mortgage Payment',
  totalPastDueAmount: 'Total Past Due Amount',
  inForeclosure: 'Are you in foreclosure?',
  auctionDate: 'Auction Date (if scheduled)',
  hardshipStartDate: 'Date Hardship Began',
  mortgageCurrentMonthlyIncome: 'Current Household Monthly Income',
  mortgageAmountRequested: 'Amount Requested',
  mortgageHelpType: 'Is this one-time or temporary help?',
  mortgageAuthorization: 'Authorization',
  eligibilityAuthorization: 'I authorize the organization to verify the information provided for eligibility determination',
  nonDiscriminationAcknowledgment: 'I understand that this organization does not discriminate based on race, religion, gender, disability, national origin, or sexual orientation',
  educationInvoiceUploaded: 'Invoice Upload',
  foodIncomeProofUploaded: 'Proof of income uploaded',
  foodAddressProofUploaded: 'Proof of address uploaded',
  medicalBillUploaded: 'Medical Bill Upload',
  housingEvictionNoticeUploaded: 'Upload Eviction Notice',
  mortgageStatementUploaded: 'Most recent mortgage statement uploaded',
  mortgageDelinquencyNoticeUploaded: 'Delinquency notice or foreclosure letter uploaded',
  mortgageIncomeProofUploaded: 'Upload Proof uploaded',
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
  if (typeof value === 'boolean') return value ? 'Yes' : null
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : null

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
  return Object.entries(map).filter(([, value]) => value === true).map(([key]) => key)
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

  return toTitleCase(withSpaces)
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

function getNotificationRecipients() {
  return (process.env.NOTIFICATION_RECIPIENTS || defaultNotificationRecipients.join(','))
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

function getSmtpFrom() {
  return (process.env.SMTP_FROM || process.env.SMTP_USER || '').trim()
}

function isEmailNotificationConfigured() {
  return Boolean(
    (process.env.SMTP_HOST || '').trim() &&
    (process.env.SMTP_USER || '').trim() &&
    process.env.SMTP_PASS &&
    getSmtpFrom() &&
    getNotificationRecipients().length > 0
  )
}

function getMailTransport() {
  if (mailTransport) return mailTransport

  mailTransport = nodemailer.createTransport({
    host: (process.env.SMTP_HOST || '').trim(),
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
    auth: {
      user: (process.env.SMTP_USER || '').trim(),
      pass: process.env.SMTP_PASS || '',
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  })

  return mailTransport
}
