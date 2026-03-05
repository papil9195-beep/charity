import multer from 'multer'
import nodemailer from 'nodemailer'
import {
  incomeVerificationDocumentKeys,
  redactSensitiveEnrollmentPayload,
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
    const redactedPayload = redactSensitiveEnrollmentPayload(payload)

    await transport.sendMail({
      from: getSmtpFrom(),
      to: recipients,
      subject: buildEmailSubject(payload),
      text: buildSubmissionText({
        payload: redactedPayload,
        uploadedFiles,
        sourceIp: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '',
        userAgent: req.headers['user-agent'] || '',
      }),
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

function buildSubmissionText({ payload, uploadedFiles, sourceIp, userAgent }) {
  const lines = [
    'A new enrollment submission was received.',
    '',
    `Source IP: ${String(sourceIp || 'N/A')}`,
    `User Agent: ${String(userAgent || 'N/A')}`,
    `Attached Files: ${Object.keys(uploadedFiles).length}`,
    '',
    'Redacted payload:',
    JSON.stringify(payload, null, 2),
  ]

  return lines.join('\n')
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
