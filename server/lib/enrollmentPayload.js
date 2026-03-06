const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const languageValues = new Set(['english', 'spanish', 'french', 'other'])
const maritalStatusValues = new Set(['single', 'married', 'divorced', 'widowed'])
const employmentStatusValues = new Set([
  'employed-full-time',
  'employed-part-time',
  'self-employed',
  'unemployed',
  'retired',
  'student',
])
const yesNoValues = new Set(['yes', 'no'])

const digitOnlyLimits = {
  ssn: 9,
  zipCode: 5,
  mortgageZipCode: 5,
  mortgageLoanAccountLast4: 4,
  phoneNumber: 10,
  mortgagePhoneNumber: 10,
}

const assistanceKeys = [
  'educationSupport',
  'foodAssistance',
  'medicalAssistance',
  'rentalHousingSupport',
  'mortgageReliefAssistance',
]

const foodSupportKeys = [
  'oneTimeEmergencyFoodPackage',
  'monthlyFoodSupport',
  'specialDietaryNeeds',
  'communityFeedingProgram',
]

const mortgageLoanKeys = ['fha', 'va', 'conventional', 'usda']

const hardshipCauseKeys = ['jobLoss', 'medicalEmergency', 'disability', 'divorce', 'naturalDisaster', 'other']

export const incomeVerificationDocumentKeys = [
  'lastTwoPayStubs',
  'taxReturn1040',
  'snapOrSsiApprovalLetter',
  'unemploymentBenefitsLetter',
  'bankAndCreditScoreProof',
]

export const uploadFlagFields = [
  'educationInvoiceUploaded',
  'foodIncomeProofUploaded',
  'foodAddressProofUploaded',
  'medicalBillUploaded',
  'housingEvictionNoticeUploaded',
  'mortgageStatementUploaded',
  'mortgageDelinquencyNoticeUploaded',
  'mortgageIncomeProofUploaded',
]

function toTrimmedString(value, maxLength = 500) {
  if (value === undefined || value === null) return ''
  return String(value).trim().replace(/\s{2,}/g, ' ').slice(0, maxLength)
}

function sanitizeName(value) {
  return toTrimmedString(value, 120).replace(/[^A-Za-z\s'-]/g, '').replace(/\s{2,}/g, ' ')
}

function sanitizeDate(value) {
  const text = toTrimmedString(value, 10)
  return DATE_PATTERN.test(text) ? text : ''
}

function sanitizeDigits(value, maxLength) {
  return toTrimmedString(value, maxLength * 2).replace(/\D/g, '').slice(0, maxLength)
}

function sanitizeCurrency(value) {
  const raw = toTrimmedString(value, 40).replace(/[^0-9.]/g, '')
  if (!raw) return ''

  const [wholePart = '', ...decimalParts] = raw.split('.')
  const decimals = decimalParts.join('').slice(0, 2)
  const normalizedWhole = wholePart.replace(/^0+(?=\d)/, '') || '0'
  return decimals ? `${normalizedWhole}.${decimals}` : normalizedWhole
}

function sanitizeYesNo(value) {
  const normalized = toTrimmedString(value, 3).toLowerCase()
  return yesNoValues.has(normalized) ? normalized : ''
}

function sanitizeEnum(value, allowedValues) {
  const normalized = toTrimmedString(value, 40).toLowerCase()
  return allowedValues.has(normalized) ? normalized : ''
}

function toBoolean(value) {
  return value === true || value === 'true' || value === 1 || value === '1'
}

function sanitizeBooleanMap(input, keys) {
  const source = input && typeof input === 'object' ? input : {}
  return keys.reduce((result, key) => {
    result[key] = toBoolean(source[key])
    return result
  }, {})
}

function sanitizeSingleChoiceMap(input, keys) {
  const source = input && typeof input === 'object' ? input : {}
  const selectedKey = keys.find((key) => toBoolean(source[key])) || ''

  return keys.reduce((result, key) => {
    result[key] = key === selectedKey
    return result
  }, {})
}

function countSelected(map) {
  return Object.values(map).filter(Boolean).length
}

function isPresent(value) {
  return typeof value === 'string' && value.trim() !== ''
}

export function sanitizeEnrollmentPayload(rawPayload) {
  const source = rawPayload && typeof rawPayload === 'object' && !Array.isArray(rawPayload) ? rawPayload : {}

  const payload = {
    firstName: sanitizeName(source.firstName),
    middleName: sanitizeName(source.middleName),
    lastName: sanitizeName(source.lastName),
    ssn: sanitizeDigits(source.ssn, digitOnlyLimits.ssn),
    dateOfBirth: sanitizeDate(source.dateOfBirth),
    phoneNumber: sanitizeDigits(source.phoneNumber, digitOnlyLimits.phoneNumber),
    email: toTrimmedString(source.email, 254).toLowerCase(),
    currentAddress: toTrimmedString(source.currentAddress, 240),
    city: sanitizeName(source.city),
    stateRegion: sanitizeName(source.stateRegion),
    zipCode: sanitizeDigits(source.zipCode, digitOnlyLimits.zipCode),
    preferredLanguage: sanitizeEnum(source.preferredLanguage, languageValues),
    householdSize: sanitizeDigits(source.householdSize, 2),
    childrenAges: toTrimmedString(source.childrenAges, 120),
    maritalStatus: sanitizeEnum(source.maritalStatus, maritalStatusValues),
    employmentStatus: sanitizeEnum(source.employmentStatus, employmentStatusValues),
    monthlyIncome: sanitizeCurrency(source.monthlyIncome),
    receivesBenefits: sanitizeYesNo(source.receivesBenefits),

    foodAssistanceReason: toTrimmedString(source.foodAssistanceReason, 1000),
    foodAssistanceDuration: toTrimmedString(source.foodAssistanceDuration, 120),
    foodDeclaration: toBoolean(source.foodDeclaration),
    foodSignature: sanitizeName(source.foodSignature),
    foodSignatureDate: sanitizeDate(source.foodSignatureDate),

    schoolName: sanitizeName(source.schoolName),
    gradeProgram: toTrimmedString(source.gradeProgram, 120),
    educationAmountRequested: sanitizeCurrency(source.educationAmountRequested),
    hospitalClinicName: sanitizeName(source.hospitalClinicName),
    diagnosisSummary: toTrimmedString(source.diagnosisSummary, 1500),
    medicalAmountRequested: sanitizeCurrency(source.medicalAmountRequested),
    facingEviction: sanitizeYesNo(source.facingEviction),
    landlordContactInformation: toTrimmedString(source.landlordContactInformation, 240),
    housingAmountOwed: sanitizeCurrency(source.housingAmountOwed),

    mortgageApplicantName: sanitizeName(source.mortgageApplicantName),
    mortgageDateOfBirth: sanitizeDate(source.mortgageDateOfBirth),
    mortgagePhoneNumber: sanitizeDigits(source.mortgagePhoneNumber, digitOnlyLimits.mortgagePhoneNumber),
    mortgageEmail: toTrimmedString(source.mortgageEmail, 254).toLowerCase(),
    mortgagePropertyAddress: toTrimmedString(source.mortgagePropertyAddress, 240),
    mortgageCity: sanitizeName(source.mortgageCity),
    mortgageStateRegion: sanitizeName(source.mortgageStateRegion),
    mortgageZipCode: sanitizeDigits(source.mortgageZipCode, digitOnlyLimits.mortgageZipCode),
    primaryResidence: sanitizeYesNo(source.primaryResidence),
    ownsHome: sanitizeYesNo(source.ownsHome),
    mortgageLenderName: sanitizeName(source.mortgageLenderName),
    mortgageLoanAccountLast4: sanitizeDigits(source.mortgageLoanAccountLast4, digitOnlyLimits.mortgageLoanAccountLast4),
    currentMortgagePayment: sanitizeCurrency(source.currentMortgagePayment),
    totalPastDueAmount: sanitizeCurrency(source.totalPastDueAmount),
    inForeclosure: sanitizeYesNo(source.inForeclosure),
    auctionDate: sanitizeDate(source.auctionDate),
    hardshipStartDate: sanitizeDate(source.hardshipStartDate),
    mortgageCurrentMonthlyIncome: sanitizeCurrency(source.mortgageCurrentMonthlyIncome),
    mortgageAmountRequested: sanitizeCurrency(source.mortgageAmountRequested),
    mortgageHelpType: toTrimmedString(source.mortgageHelpType, 120),
    mortgageAuthorization: toBoolean(source.mortgageAuthorization),

    eligibilityAuthorization: toBoolean(source.eligibilityAuthorization),
    nonDiscriminationAcknowledgment: toBoolean(source.nonDiscriminationAcknowledgment),
  }

  for (const field of uploadFlagFields) {
    payload[field] = toBoolean(source[field])
  }

  payload.incomeVerificationDocuments = sanitizeBooleanMap(
    source.incomeVerificationDocuments,
    incomeVerificationDocumentKeys
  )
  payload.assistanceRequested = sanitizeSingleChoiceMap(source.assistanceRequested, assistanceKeys)
  payload.foodSupportTypes = sanitizeSingleChoiceMap(source.foodSupportTypes, foodSupportKeys)
  payload.mortgageLoanTypes = sanitizeSingleChoiceMap(source.mortgageLoanTypes, mortgageLoanKeys)
  payload.hardshipCauses = sanitizeBooleanMap(source.hardshipCauses, hardshipCauseKeys)

  return payload
}

export function validateEnrollmentPayload(payload) {
  const errors = []
  const hasFoodDocumentUpload = payload.foodIncomeProofUploaded || payload.foodAddressProofUploaded
  const hasMortgageDocumentUpload =
    payload.mortgageStatementUploaded ||
    payload.mortgageDelinquencyNoticeUploaded ||
    payload.mortgageIncomeProofUploaded
  const hasIncomeVerificationUpload = countSelected(payload.incomeVerificationDocuments) > 0

  if (!isPresent(payload.firstName)) errors.push('firstName is required.')
  if (!isPresent(payload.lastName)) errors.push('lastName is required.')
  if (!EMAIL_PATTERN.test(payload.email)) errors.push('email is invalid.')
  if (payload.ssn.length !== 9) errors.push('ssn must contain exactly 9 digits.')
  if (!DATE_PATTERN.test(payload.dateOfBirth)) errors.push('dateOfBirth is required.')
  if (payload.phoneNumber.length !== 10) errors.push('phoneNumber must contain exactly 10 digits.')
  if (!isPresent(payload.currentAddress)) errors.push('currentAddress is required.')
  if (!isPresent(payload.city)) errors.push('city is required.')
  if (!isPresent(payload.stateRegion)) errors.push('stateRegion is required.')
  if (payload.zipCode.length !== 5) errors.push('zipCode must contain exactly 5 digits.')
  if (!languageValues.has(payload.preferredLanguage)) errors.push('preferredLanguage is required.')

  const selectedAssistanceCount = countSelected(payload.assistanceRequested)
  if (selectedAssistanceCount !== 1) {
    errors.push('Exactly one assistanceRequested option must be selected.')
  }

  if (payload.assistanceRequested.educationSupport) {
    if (!isPresent(payload.schoolName)) errors.push('schoolName is required for education support.')
    if (!isPresent(payload.gradeProgram)) errors.push('gradeProgram is required for education support.')
    if (!isPresent(payload.educationAmountRequested)) {
      errors.push('educationAmountRequested is required for education support.')
    }
    if (!payload.educationInvoiceUploaded) {
      errors.push('educationInvoiceUploaded is required for education support.')
    }
  }

  if (payload.assistanceRequested.foodAssistance) {
    if (countSelected(payload.foodSupportTypes) !== 1) {
      errors.push('Exactly one foodSupportTypes option must be selected for food assistance.')
    }
    if (!isPresent(payload.foodAssistanceReason)) {
      errors.push('foodAssistanceReason is required for food assistance.')
    }
    if (!isPresent(payload.foodAssistanceDuration)) {
      errors.push('foodAssistanceDuration is required for food assistance.')
    }
    if (!hasFoodDocumentUpload) {
      errors.push('At least one food assistance document upload is required for food assistance.')
    }
    if (!payload.foodDeclaration) errors.push('foodDeclaration is required for food assistance.')
    if (!DATE_PATTERN.test(payload.foodSignatureDate)) {
      errors.push('foodSignatureDate is required for food assistance.')
    }

    const expectedSignature = [payload.firstName, payload.lastName]
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
    const providedSignature = payload.foodSignature.replace(/\s+/g, ' ').trim().toLowerCase()

    if (!expectedSignature || providedSignature !== expectedSignature) {
      errors.push('foodSignature must match first and last name.')
    }
  }

  if (payload.assistanceRequested.medicalAssistance) {
    if (!isPresent(payload.hospitalClinicName)) {
      errors.push('hospitalClinicName is required for medical assistance.')
    }
    if (!isPresent(payload.medicalAmountRequested)) {
      errors.push('medicalAmountRequested is required for medical assistance.')
    }
    if (!payload.medicalBillUploaded) errors.push('medicalBillUploaded is required for medical assistance.')
  }

  if (payload.assistanceRequested.rentalHousingSupport) {
    if (!yesNoValues.has(payload.facingEviction)) {
      errors.push('facingEviction is required for rental housing support.')
    }
    if (!isPresent(payload.landlordContactInformation)) {
      errors.push('landlordContactInformation is required for rental housing support.')
    }
    if (!isPresent(payload.housingAmountOwed)) {
      errors.push('housingAmountOwed is required for rental housing support.')
    }
    if (payload.facingEviction === 'yes' && !payload.housingEvictionNoticeUploaded) {
      errors.push('housingEvictionNoticeUploaded is required when facingEviction is yes.')
    }
  }

  if (payload.assistanceRequested.mortgageReliefAssistance) {
    if (!isPresent(payload.mortgageApplicantName)) {
      errors.push('mortgageApplicantName is required for mortgage relief assistance.')
    }
    if (!DATE_PATTERN.test(payload.mortgageDateOfBirth)) {
      errors.push('mortgageDateOfBirth is required for mortgage relief assistance.')
    }
    if (payload.mortgagePhoneNumber.length !== 10) {
      errors.push('mortgagePhoneNumber must contain exactly 10 digits.')
    }
    if (!EMAIL_PATTERN.test(payload.mortgageEmail)) {
      errors.push('mortgageEmail is required and must be valid for mortgage relief assistance.')
    }
    if (!isPresent(payload.mortgagePropertyAddress)) {
      errors.push('mortgagePropertyAddress is required for mortgage relief assistance.')
    }
    if (!isPresent(payload.mortgageCity)) {
      errors.push('mortgageCity is required for mortgage relief assistance.')
    }
    if (!isPresent(payload.mortgageStateRegion)) {
      errors.push('mortgageStateRegion is required for mortgage relief assistance.')
    }
    if (payload.mortgageZipCode.length !== 5) {
      errors.push('mortgageZipCode must contain exactly 5 digits.')
    }
    if (!yesNoValues.has(payload.primaryResidence)) {
      errors.push('primaryResidence is required for mortgage relief assistance.')
    }
    if (!yesNoValues.has(payload.ownsHome)) {
      errors.push('ownsHome is required for mortgage relief assistance.')
    }
    if (countSelected(payload.mortgageLoanTypes) !== 1) {
      errors.push('Exactly one mortgageLoanTypes option must be selected for mortgage relief assistance.')
    }
    if (!isPresent(payload.mortgageLenderName)) {
      errors.push('mortgageLenderName is required for mortgage relief assistance.')
    }
    if (payload.mortgageLoanAccountLast4.length !== 4) {
      errors.push('mortgageLoanAccountLast4 must contain exactly 4 digits.')
    }
    if (!isPresent(payload.currentMortgagePayment)) {
      errors.push('currentMortgagePayment is required for mortgage relief assistance.')
    }
    if (!isPresent(payload.totalPastDueAmount)) {
      errors.push('totalPastDueAmount is required for mortgage relief assistance.')
    }
    if (!yesNoValues.has(payload.inForeclosure)) {
      errors.push('inForeclosure is required for mortgage relief assistance.')
    }
    if (payload.inForeclosure === 'yes' && !DATE_PATTERN.test(payload.auctionDate)) {
      errors.push('auctionDate is required when inForeclosure is yes.')
    }
    if (countSelected(payload.hardshipCauses) === 0) {
      errors.push('At least one hardshipCauses option must be selected for mortgage relief assistance.')
    }
    if (!DATE_PATTERN.test(payload.hardshipStartDate)) {
      errors.push('hardshipStartDate is required for mortgage relief assistance.')
    }
    if (!isPresent(payload.mortgageCurrentMonthlyIncome)) {
      errors.push('mortgageCurrentMonthlyIncome is required for mortgage relief assistance.')
    }
    if (!isPresent(payload.mortgageAmountRequested)) {
      errors.push('mortgageAmountRequested is required for mortgage relief assistance.')
    }
    if (!isPresent(payload.mortgageHelpType)) {
      errors.push('mortgageHelpType is required for mortgage relief assistance.')
    }
    if (!hasMortgageDocumentUpload) {
      errors.push('At least one mortgage relief document upload is required for mortgage relief assistance.')
    }
    if (!payload.mortgageAuthorization) {
      errors.push('mortgageAuthorization is required for mortgage relief assistance.')
    }
  }

  if (!hasIncomeVerificationUpload) {
    errors.push('At least one income verification document upload is required before final submission.')
  }
  if (!payload.eligibilityAuthorization) {
    errors.push('eligibilityAuthorization is required before final submission.')
  }
  if (!payload.nonDiscriminationAcknowledgment) {
    errors.push('nonDiscriminationAcknowledgment is required before final submission.')
  }

  return errors
}

export function redactSensitiveEnrollmentPayload(payload) {
  const storedPayload = JSON.parse(JSON.stringify(payload))

  if (storedPayload.ssn) {
    storedPayload.ssnLast4 = storedPayload.ssn.slice(-4)
    storedPayload.ssn = '[REDACTED]'
  }

  return storedPayload
}
