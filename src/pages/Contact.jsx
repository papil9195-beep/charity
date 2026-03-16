import React from 'react'
import { useLocation } from 'react-router-dom'
import InfoCard from '../components/InfoCard.jsx'
import {
  assistanceOptions,
  digitOnlyLimits,
  employmentStatusOptions,
  foodSupportOptions,
  hardshipCauseOptions,
  incomeVerificationUploads,
  languageOptions,
  letterOnlyFields,
  maritalStatusOptions,
  mortgageLoanOptions,
  stepContent,
} from './contactFormConfig.js'
import {
  getPrefilledBasicInfo,
  hasSelectedFile,
  isValidEmail,
  sanitizeFieldValue,
} from './contactFormUtils.js'

const localHostnamePattern = /^(localhost|127\.0\.0\.1)$/i
const localApiBaseUrlPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i

function resolveApiBaseUrl() {
  const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '')
  const browserIsLocal =
    typeof window !== 'undefined' && localHostnamePattern.test(window.location.hostname)

  if (configuredBaseUrl) {
    if (!(localApiBaseUrlPattern.test(configuredBaseUrl) && !browserIsLocal)) {
      return configuredBaseUrl
    }
  }

  if (browserIsLocal) {
    return 'http://localhost:5000'
  }

  return ''
}

const apiBaseUrl = resolveApiBaseUrl()
const enrollmentEndpoint = apiBaseUrl ? `${apiBaseUrl}/api/enrollments` : '/api/enrollments'
const topLevelUploadFields = [
  'educationInvoiceUploaded',
  'foodIncomeProofUploaded',
  'foodAddressProofUploaded',
  'medicalBillUploaded',
  'housingEvictionNoticeUploaded',
  'mortgageStatementUploaded',
  'mortgageDelinquencyNoticeUploaded',
  'mortgageIncomeProofUploaded',
]
const incomeVerificationUploadFields = incomeVerificationUploads.map((upload) => upload.key)

export default function Contact() {
  const location = useLocation()
  const [state, setState] = React.useState(() => {
    const prefilled = getPrefilledBasicInfo(location.state)

    return {
      firstName: prefilled.firstName, middleName: prefilled.middleName, lastName: prefilled.lastName, ssn: '', dateOfBirth: '', phoneNumber: '', email: prefilled.email,
      currentAddress: '', city: '', stateRegion: '', zipCode: '', preferredLanguage: '', householdSize: '',
      childrenAges: '', maritalStatus: '', employmentStatus: '', monthlyIncome: '', receivesBenefits: '',
      foodAssistanceReason: '', foodAssistanceDuration: '', foodDeclaration: false, foodSignature: '', foodSignatureDate: '',
      schoolName: '', gradeProgram: '', educationAmountRequested: '', hospitalClinicName: '', diagnosisSummary: '',
      medicalAmountRequested: '', facingEviction: '', landlordContactInformation: '', housingAmountOwed: '',
      mortgageApplicantName: '', mortgageDateOfBirth: '', mortgagePhoneNumber: '', mortgageEmail: '',
      mortgagePropertyAddress: '', mortgageCity: '', mortgageStateRegion: '', mortgageZipCode: '', primaryResidence: '',
      ownsHome: '', mortgageLenderName: '', mortgageLoanAccountLast4: '', currentMortgagePayment: '',
      totalPastDueAmount: '', inForeclosure: '', auctionDate: '', hardshipStartDate: '', mortgageCurrentMonthlyIncome: '',
      mortgageAmountRequested: '', mortgageHelpType: '', mortgageAuthorization: false,
      eligibilityAuthorization: false, nonDiscriminationAcknowledgment: false,
      educationInvoiceUploaded: false,
      foodIncomeProofUploaded: false,
      foodAddressProofUploaded: false,
      medicalBillUploaded: false,
      housingEvictionNoticeUploaded: false,
      mortgageStatementUploaded: false,
      mortgageDelinquencyNoticeUploaded: false,
      mortgageIncomeProofUploaded: false,
      incomeVerificationDocuments: {
        lastTwoPayStubs: false,
        taxReturn1040: false,
        snapOrSsiApprovalLetter: false,
        unemploymentBenefitsLetter: false,
        bankAndCreditScoreProof: false,
      },
      assistanceRequested: {
        educationSupport: false, foodAssistance: false, medicalAssistance: false,
        rentalHousingSupport: false, mortgageReliefAssistance: false,
      },
      foodSupportTypes: {
        oneTimeEmergencyFoodPackage: false, monthlyFoodSupport: false,
        specialDietaryNeeds: false, communityFeedingProgram: false,
      },
      mortgageLoanTypes: { fha: false, va: false, conventional: false, usda: false },
      hardshipCauses: {
        jobLoss: false, medicalEmergency: false, disability: false,
        divorce: false, naturalDisaster: false, other: false,
      },
    }
  })
  const [currentStep, setCurrentStep] = React.useState(1)
  const [touched, setTouched] = React.useState({})
  const [sent, setSent] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState('')
  const uploadFilesRef = React.useRef({})

  const selectedAssistance = assistanceOptions.filter((option) => state.assistanceRequested[option.key])
  const selectedAssistanceCount = selectedAssistance.length
  const selectedFoodSupportCount = Object.values(state.foodSupportTypes).filter(Boolean).length
  const selectedMortgageLoanCount = Object.values(state.mortgageLoanTypes).filter(Boolean).length
  const selectedHardshipCauseCount = Object.values(state.hardshipCauses).filter(Boolean).length
  const foodAssistanceSelected = state.assistanceRequested.foodAssistance
  const educationSelected = state.assistanceRequested.educationSupport
  const medicalSelected = state.assistanceRequested.medicalAssistance
  const housingSelected = state.assistanceRequested.rentalHousingSupport
  const mortgageReliefSelected = state.assistanceRequested.mortgageReliefAssistance
  const foodDocumentUploaded = state.foodIncomeProofUploaded || state.foodAddressProofUploaded
  const mortgageDocumentUploaded =
    state.mortgageStatementUploaded ||
    state.mortgageDelinquencyNoticeUploaded ||
    state.mortgageIncomeProofUploaded
  const incomeVerificationDocumentUploaded = Object.values(state.incomeVerificationDocuments).some(Boolean)
  const applicantFullName = [state.firstName, state.middleName, state.lastName].filter(Boolean).join(' ')
  const expectedFoodSignature = [state.firstName.trim(), state.lastName.trim()].filter(Boolean).join(' ')
  const normalizedExpectedFoodSignature = expectedFoodSignature.replace(/\s+/g, ' ').trim().toLowerCase()
  const normalizedFoodSignature = state.foodSignature.replace(/\s+/g, ' ').trim().toLowerCase()
  const applicantAddressSummary = [state.currentAddress, state.city, state.stateRegion, state.zipCode].filter(Boolean).join(', ')
  const preferredLanguageLabel =
    (state.preferredLanguage && languageOptions.find((option) => option.value === state.preferredLanguage)?.label) || 'Not provided yet'
  const foodSignatureMatches =
    !foodAssistanceSelected || (normalizedExpectedFoodSignature !== '' && normalizedFoodSignature === normalizedExpectedFoodSignature)
  const basicRequiredMissingCount = [
    state.firstName.trim() !== '',
    state.lastName.trim() !== '',
    state.ssn.length === 9,
    state.dateOfBirth !== '',
    state.phoneNumber.length === 10,
    isValidEmail(state.email),
    state.currentAddress.trim() !== '',
    state.city.trim() !== '',
    state.stateRegion.trim() !== '',
    state.zipCode.length === 5,
    state.preferredLanguage !== '',
  ].filter((complete) => !complete).length
  const basicStepComplete = basicRequiredMissingCount === 0

  const serviceRequiredChecks = [selectedAssistanceCount > 0]
  if (educationSelected) {
    serviceRequiredChecks.push(
      state.schoolName.trim() !== '',
      state.gradeProgram.trim() !== '',
      state.educationAmountRequested.trim() !== '',
      state.educationInvoiceUploaded
    )
  }
  if (foodAssistanceSelected) {
    serviceRequiredChecks.push(
      selectedFoodSupportCount > 0,
      state.foodAssistanceReason.trim() !== '',
      state.foodAssistanceDuration.trim() !== '',
      foodDocumentUploaded,
      state.foodDeclaration,
      state.foodSignatureDate !== '',
      foodSignatureMatches
    )
  }
  if (medicalSelected) {
    serviceRequiredChecks.push(
      state.hospitalClinicName.trim() !== '',
      state.medicalAmountRequested.trim() !== '',
      state.medicalBillUploaded
    )
  }
  if (housingSelected) {
    serviceRequiredChecks.push(
      state.facingEviction !== '',
      state.landlordContactInformation.trim() !== '',
      state.housingAmountOwed.trim() !== '',
      state.facingEviction !== 'yes' || state.housingEvictionNoticeUploaded
    )
  }
  if (mortgageReliefSelected) {
    serviceRequiredChecks.push(
      state.mortgageApplicantName.trim() !== '',
      state.mortgageDateOfBirth !== '',
      state.mortgagePhoneNumber.length === 10,
      isValidEmail(state.mortgageEmail),
      state.mortgagePropertyAddress.trim() !== '',
      state.mortgageCity.trim() !== '',
      state.mortgageStateRegion.trim() !== '',
      state.mortgageZipCode.length === 5,
      state.primaryResidence !== '',
      state.ownsHome !== '',
      selectedMortgageLoanCount > 0,
      state.mortgageLenderName.trim() !== '',
      state.mortgageLoanAccountLast4.length === 4,
      state.currentMortgagePayment.trim() !== '',
      state.totalPastDueAmount.trim() !== '',
      state.inForeclosure !== '',
      state.inForeclosure !== 'yes' || state.auctionDate !== '',
      selectedHardshipCauseCount > 0,
      state.hardshipStartDate !== '',
      state.mortgageCurrentMonthlyIncome.trim() !== '',
      state.mortgageAmountRequested.trim() !== '',
      state.mortgageHelpType.trim() !== '',
      mortgageDocumentUploaded,
      state.mortgageAuthorization
    )
  }
  const serviceRequiredMissingCount = serviceRequiredChecks.filter((complete) => !complete).length
  const serviceStepComplete = serviceRequiredMissingCount === 0

  const finalRequiredMissingCount = [
    incomeVerificationDocumentUploaded,
    state.eligibilityAuthorization,
    state.nonDiscriminationAcknowledgment,
  ].filter((complete) => !complete).length
  const finalSubmissionReady = basicStepComplete && serviceStepComplete && finalRequiredMissingCount === 0
  const basicProgressMessage = basicStepComplete
    ? 'All required basic information is complete. Only optional fields can stay blank.'
    : `Complete ${basicRequiredMissingCount} more required ${basicRequiredMissingCount === 1 ? 'field' : 'fields'} before continuing. Only optional fields can stay blank.`
  const serviceProgressMessage = selectedAssistanceCount === 0
    ? 'Select 1 assistance type before continuing. Optional fields and extra document slots can stay blank.'
    : serviceStepComplete
      ? 'All required step 2 fields are complete. Optional fields and extra document slots can stay blank.'
      : `Complete ${serviceRequiredMissingCount} more required ${serviceRequiredMissingCount === 1 ? 'field' : 'fields'} before continuing. Optional fields and extra document slots can stay blank.`
  const finalProgressMessage = finalRequiredMissingCount === 0
    ? 'Required uploads and authorizations are complete. Optional household fields can stay blank.'
    : `Complete ${finalRequiredMissingCount} more required ${finalRequiredMissingCount === 1 ? 'item' : 'items'} before submitting. Required uploads and authorizations must be completed.`
  const activeStep = stepContent[currentStep]

  function getFieldError(field) {
    if (!touched[field]) return ''

    switch (field) {
      case 'firstName':
        return state.firstName.trim() ? '' : 'Enter a first name using letters only.'
      case 'lastName':
        return state.lastName.trim() ? '' : 'Enter a last name using letters only.'
      case 'ssn':
        return state.ssn.length === 9 ? '' : 'SSN must contain exactly 9 digits.'
      case 'dateOfBirth':
        return state.dateOfBirth ? '' : 'Enter your date of birth.'
      case 'phoneNumber':
        return state.phoneNumber.length === 10 ? '' : 'Phone number must contain exactly 10 digits.'
      case 'email':
        return isValidEmail(state.email) ? '' : 'Enter a valid email address.'
      case 'currentAddress':
        return state.currentAddress.trim() ? '' : 'Enter your current address.'
      case 'city':
        return state.city.trim() ? '' : 'Enter a city name using letters only.'
      case 'stateRegion':
        return state.stateRegion.trim() ? '' : 'Enter a state name using letters only.'
      case 'zipCode':
        return state.zipCode.length === 5 ? '' : 'ZIP Code must contain exactly 5 digits.'
      case 'preferredLanguage':
        return state.preferredLanguage ? '' : 'Select a preferred language.'
      case 'mortgagePhoneNumber':
        return state.mortgagePhoneNumber !== '' && state.mortgagePhoneNumber.length !== 10
          ? 'Phone number must contain exactly 10 digits.'
          : ''
      case 'mortgageZipCode':
        return state.mortgageZipCode !== '' && state.mortgageZipCode.length !== 5
          ? 'ZIP Code must contain exactly 5 digits.'
          : ''
      case 'mortgageLoanAccountLast4':
        return state.mortgageLoanAccountLast4 !== '' && state.mortgageLoanAccountLast4.length !== 4
          ? 'Loan account number must contain exactly 4 digits.'
          : ''
      default:
        return ''
    }
  }

  function renderFieldError(field) {
    const error = getFieldError(field)
    return error ? <p className="fieldError">{error}</p> : null
  }

  function markFieldsTouched(fields) {
    setTouched((current) =>
      fields.reduce((next, field) => ({ ...next, [field]: true }), { ...current })
    )
  }

  function updateField(field, value) {
    setSent(false)
    setSubmitError('')
    setTouched((current) => ({ ...current, [field]: true }))
    setState((current) => ({
      ...current,
      [field]: sanitizeFieldValue(field, value, digitOnlyLimits, letterOnlyFields),
    }))
  }
  function updateAssistance(field, checked) {
    setSent(false)
    setSubmitError('')
    setState((current) => ({
      ...current,
      assistanceRequested: Object.keys(current.assistanceRequested).reduce(
        (next, key) => ({ ...next, [key]: checked && key === field }),
        {}
      ),
    }))
  }
  function updateFoodSupportType(field, checked) {
    setSent(false)
    setSubmitError('')
    setState((current) => ({
      ...current,
      foodSupportTypes: Object.keys(current.foodSupportTypes).reduce(
        (next, key) => ({ ...next, [key]: checked && key === field }),
        {}
      ),
    }))
  }
  function updateMortgageLoanType(field, checked) {
    setSent(false)
    setSubmitError('')
    setState((current) => ({
      ...current,
      mortgageLoanTypes: Object.keys(current.mortgageLoanTypes).reduce(
        (next, key) => ({ ...next, [key]: checked && key === field }),
        {}
      ),
    }))
  }
  function updateHardshipCause(field, checked) {
    setSent(false)
    setSubmitError('')
    setState((current) => ({ ...current, hardshipCauses: { ...current.hardshipCauses, [field]: checked } }))
  }
  function updateUpload(field, files) {
    setSent(false)
    setSubmitError('')
    const file = hasSelectedFile(files) ? files[0] : null
    if (file) {
      uploadFilesRef.current[field] = file
    } else {
      delete uploadFilesRef.current[field]
    }
    setState((current) => ({ ...current, [field]: hasSelectedFile(files) }))
  }
  function updateIncomeVerificationUpload(field, files) {
    setSent(false)
    setSubmitError('')
    const key = `incomeVerificationDocuments.${field}`
    const file = hasSelectedFile(files) ? files[0] : null
    if (file) {
      uploadFilesRef.current[key] = file
    } else {
      delete uploadFilesRef.current[key]
    }
    setState((current) => ({
      ...current,
      incomeVerificationDocuments: {
        ...current.incomeVerificationDocuments,
        [field]: hasSelectedFile(files),
      },
    }))
  }
  function goToStep(step) {
    setSent(false)
    setSubmitError('')
    setCurrentStep(step)
  }
  function handleContinueToAssistance() {
    if (!basicStepComplete) {
      markFieldsTouched([
        'firstName',
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
      return
    }
    goToStep(2)
  }
  async function onSubmit(e) {
    e.preventDefault()
    if (!finalSubmissionReady || isSubmitting) return

    setSent(false)
    setSubmitError('')
    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('payload', JSON.stringify(state))

      for (const field of topLevelUploadFields) {
        const file = uploadFilesRef.current[field]
        if (file) {
          formData.append(field, file, file.name)
        }
      }

      for (const field of incomeVerificationUploadFields) {
        const key = `incomeVerificationDocuments.${field}`
        const file = uploadFilesRef.current[key]
        if (file) {
          formData.append(key, file, file.name)
        }
      }

      const response = await fetch(enrollmentEndpoint, {
        method: 'POST',
        body: formData,
      })

      const contentType = response.headers.get('content-type') || ''
      const result = contentType.includes('application/json') ? await response.json().catch(() => null) : null
      const fallbackResponseText = result ? '' : await response.text().catch(() => '')
      if (!response.ok) {
        throw new Error(result?.error || getSubmissionFailureMessage(response, fallbackResponseText))
      }
      if (!result || typeof result.id !== 'string') {
        throw new Error(getUnexpectedSubmissionResponseMessage(fallbackResponseText))
      }

      setSent(true)
    } catch (error) {
      const isNetworkError = error?.name === 'TypeError' && /fetch/i.test(String(error?.message || ''))
      const message = isNetworkError
        ? 'Unable to reach the enrollment service right now. If you are running locally, start the API with `npm run api` or `npm run dev:all`, then try again.'
        : (error?.message || 'Unable to submit enrollment right now.')
      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  function renderBasicStep() {
    return (
      <>
        <div className="fieldGrid3">
          <label className="label">
            First Name
            <input className="input" value={state.firstName} onChange={(e) => updateField('firstName', e.target.value)} placeholder="First name" />
            {renderFieldError('firstName')}
          </label>
          <label className="label">
            Middle Name
            <input className="input" value={state.middleName} onChange={(e) => updateField('middleName', e.target.value)} placeholder="Middle name" />
          </label>
          <label className="label">
            Last Name
            <input className="input" value={state.lastName} onChange={(e) => updateField('lastName', e.target.value)} placeholder="Last name" />
            {renderFieldError('lastName')}
          </label>
        </div>

        <div className="fieldGrid">
          <label className="label">
            9 Digits SSN
            <input className="input" inputMode="numeric" maxLength="9" value={state.ssn} onChange={(e) => updateField('ssn', e.target.value)} placeholder="Enter 9 digits" />
            {renderFieldError('ssn')}
          </label>
          <label className="label">
            Date of Birth
            <input className="input" type="date" value={state.dateOfBirth} onChange={(e) => updateField('dateOfBirth', e.target.value)} />
            {renderFieldError('dateOfBirth')}
          </label>
        </div>

        <div className="fieldGrid">
          <label className="label">
            Phone Number
            <input className="input" type="tel" inputMode="numeric" maxLength="10" value={state.phoneNumber} onChange={(e) => updateField('phoneNumber', e.target.value)} placeholder="10 digits" />
            {renderFieldError('phoneNumber')}
          </label>
          <label className="label">
            Email Address
            <input className="input" type="email" value={state.email} onChange={(e) => updateField('email', e.target.value)} placeholder="you@example.com" />
            {renderFieldError('email')}
          </label>
        </div>

        <label className="label">
          Current Address
          <input className="input" value={state.currentAddress} onChange={(e) => updateField('currentAddress', e.target.value)} placeholder="Street address" />
          {renderFieldError('currentAddress')}
        </label>

        <div className="fieldGrid3">
          <label className="label">
            City
            <input className="input" value={state.city} onChange={(e) => updateField('city', e.target.value)} placeholder="City" />
            {renderFieldError('city')}
          </label>
          <label className="label">
            State
            <input className="input" value={state.stateRegion} onChange={(e) => updateField('stateRegion', e.target.value)} placeholder="State" />
            {renderFieldError('stateRegion')}
          </label>
          <label className="label">
            ZIP Code
            <input className="input" inputMode="numeric" maxLength="5" value={state.zipCode} onChange={(e) => updateField('zipCode', e.target.value)} placeholder="5-digit ZIP Code" />
            {renderFieldError('zipCode')}
          </label>
        </div>

        <label className="label">
          Preferred Language
          <select className="input selectInput" value={state.preferredLanguage} onChange={(e) => updateField('preferredLanguage', e.target.value)}>
            {languageOptions.map((option) => (
              <option key={option.label} value={option.value}>{option.label}</option>
            ))}
          </select>
          {renderFieldError('preferredLanguage')}
        </label>

        <div className="enrollFooter">
          <button className="btn btnPrimary" type="button" onClick={handleContinueToAssistance} disabled={!basicStepComplete}>
            Continue to Assistance
          </button>
        </div>

        <p className="fieldHint" aria-live="polite">{basicProgressMessage}</p>
      </>
    )
  }

  function renderAssistanceSelector() {
    return (
      <div className="formSectionCard">
        <div className="formSectionTitle">Choose Your Charity Assistance</div>
        <p className="muted">Select one assistance type. Only the matching section will appear below.</p>
        <div className="assistBox">
          <div className="assistTitle">Available Assistance</div>
          <div className="assistGrid">
            {assistanceOptions.map((option) => (
              <label key={option.key} className="assistOption">
                <input
                  type="radio"
                  name="assistanceRequested"
                  checked={state.assistanceRequested[option.key]}
                  onChange={(e) => updateAssistance(option.key, e.target.checked)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>
        <p className="fieldHint">
          Rental / Housing Support is for rent or eviction needs. Mortgage Relief Assistance is a separate homeowner section.
        </p>
      </div>
    )
  }

  function renderEducationSection() {
    if (!educationSelected) return null
    return (
      <div className="formSectionCard">
        <div className="formSectionTitle">Education Assistance Section</div>
        <div className="fieldGrid">
          <label className="label">
            School Name
            <input className="input" value={state.schoolName} onChange={(e) => updateField('schoolName', e.target.value)} placeholder="School name" />
          </label>
          <label className="label">
            Grade / Program
            <input className="input" value={state.gradeProgram} onChange={(e) => updateField('gradeProgram', e.target.value)} placeholder="Grade or program" />
          </label>
        </div>
        <div className="fieldGrid">
          <label className="label">
            Amount Requested
            <input className="input" inputMode="decimal" value={state.educationAmountRequested} onChange={(e) => updateField('educationAmountRequested', e.target.value)} placeholder="$0.00" />
          </label>
        </div>
        <div className="subSectionLabel">One or More Documents</div>
        <p className="fieldHint">Upload 1 file here to continue to the next step.</p>
        <div className="fieldGrid">
          <label className="label">
            Upload school invoice or supporting document
            <input className="input fileInput" type="file" onChange={(e) => updateUpload('educationInvoiceUploaded', e.target.files)} />
          </label>
        </div>
      </div>
    )
  }

  function renderFoodSection() {
    if (!foodAssistanceSelected) return null
    return (
      <div className="formSectionCard">
        <div className="formSectionTitle">Food Assistance Intake Form</div>
        <p className="muted">Complete this section if you are requesting food support.</p>
        <div className="subSectionLabel">Applicant Info</div>
        <div className="miniCard">
          <div className="miniTitle">Applicant information on file</div>
          <ul className="list">
            <li>Full Legal Name: {applicantFullName || 'Use the name entered above'}</li>
            <li>Date of Birth: {state.dateOfBirth || 'Use the date entered above'}</li>
            <li>Phone Number: {state.phoneNumber || 'Use the phone number entered above'}</li>
            <li>Email: {state.email || 'Use the email entered above'}</li>
            <li>Address, City, State, ZIP: {applicantAddressSummary || 'Use the address entered above'}</li>
            <li>Preferred Language: {preferredLanguageLabel}</li>
          </ul>
        </div>
        <div className="subSectionLabel">Type of Food Assistance Needed</div>
        <div className="assistBox">
          <div className="assistGrid">
            {foodSupportOptions.map((option) => (
              <label key={option.key} className="assistOption">
                <input type="radio" name="foodSupportTypes" checked={state.foodSupportTypes[option.key]} onChange={(e) => updateFoodSupportType(option.key, e.target.checked)} />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="subSectionLabel">Reason for Assistance</div>
        <label className="label">
          Short description: Why do you need food support?
          <textarea className="textarea" rows="4" value={state.foodAssistanceReason} onChange={(e) => updateField('foodAssistanceReason', e.target.value)} placeholder="Briefly explain your need for food support" />
        </label>
        <label className="label">
          How long do you expect to need assistance?
          <input className="input" value={state.foodAssistanceDuration} onChange={(e) => updateField('foodAssistanceDuration', e.target.value)} placeholder="Example: 30 days or 3 months" />
        </label>
        <div className="subSectionLabel">One or More Documents</div>
        <p className="fieldHint">Upload at least 1 file here to continue to the next step.</p>
        <div className="uploadGrid">
          <label className="uploadField">
            <span>Proof of income (pay stub, unemployment, SSI/SSDI letter)</span>
            <input className="input fileInput" type="file" onChange={(e) => updateUpload('foodIncomeProofUploaded', e.target.files)} />
          </label>
          <label className="uploadField">
            <span>Proof of address (utility bill, ID, lease)</span>
            <input className="input fileInput" type="file" onChange={(e) => updateUpload('foodAddressProofUploaded', e.target.files)} />
          </label>
        </div>
        <div className="subSectionLabel">Consent & Privacy</div>
        <div className="sectionDisclaimer">All information is confidential and used solely for eligibility determination.</div>
        <label className="checkRow">
          <input type="checkbox" checked={state.foodDeclaration} onChange={(e) => updateField('foodDeclaration', e.target.checked)} />
          <span>I confirm that the information provided is accurate and true.</span>
        </label>
        <div className="fieldGrid">
          <label className="label">
            Signature (first and last name written in full)
            <input className="input" value={state.foodSignature} onChange={(e) => updateField('foodSignature', e.target.value)} placeholder="First and last name" />
          </label>
          <label className="label">
            Date
            <input className="input" type="date" value={state.foodSignatureDate} onChange={(e) => updateField('foodSignatureDate', e.target.value)} />
          </label>
        </div>
        <p className="fieldHint">Use your first and last name in full as your signature.</p>
        {state.foodSignature.trim() !== '' && !foodSignatureMatches && (
          <p className="fieldHint">Signature must match the first and last name entered in Step 1.</p>
        )}
      </div>
    )
  }

  function renderMedicalSection() {
    if (!medicalSelected) return null
    return (
      <div className="formSectionCard">
        <div className="formSectionTitle">Medical Assistance Section</div>
        <div className="fieldGrid">
          <label className="label">
            Hospital / Clinic Name
            <input className="input" value={state.hospitalClinicName} onChange={(e) => updateField('hospitalClinicName', e.target.value)} placeholder="Hospital or clinic name" />
          </label>
          <label className="label">
            Amount Requested
            <input className="input" inputMode="decimal" value={state.medicalAmountRequested} onChange={(e) => updateField('medicalAmountRequested', e.target.value)} placeholder="$0.00" />
          </label>
        </div>
        <label className="label">
          Diagnosis (optional summary)
          <textarea className="textarea" rows="4" value={state.diagnosisSummary} onChange={(e) => updateField('diagnosisSummary', e.target.value)} placeholder="Optional medical summary" />
        </label>
        <div className="subSectionLabel">One or More Documents</div>
        <p className="fieldHint">Upload 1 file here to continue to the next step.</p>
        <label className="label">
          Upload medical bill or supporting document
          <input className="input fileInput" type="file" onChange={(e) => updateUpload('medicalBillUploaded', e.target.files)} />
        </label>
        <div className="sectionDisclaimer">Medical information will be kept confidential in accordance with privacy laws.</div>
      </div>
    )
  }

  function renderHousingSection() {
    if (!housingSelected) return null
    return (
      <div className="formSectionCard">
        <div className="formSectionTitle">Housing Assistance Section</div>
        <div className="fieldGrid">
          <div className="label">
            <span>Are you facing eviction?</span>
            <div className="optionGrid">
              <label className="optionCard">
                <input type="radio" name="facingEviction" checked={state.facingEviction === 'yes'} onChange={() => updateField('facingEviction', 'yes')} />
                <span>Yes</span>
              </label>
              <label className="optionCard">
                <input type="radio" name="facingEviction" checked={state.facingEviction === 'no'} onChange={() => updateField('facingEviction', 'no')} />
                <span>No</span>
              </label>
            </div>
          </div>
        </div>
        <div className="subSectionLabel">One or More Documents</div>
        <p className="fieldHint">Upload 1 file here if you selected Yes for eviction.</p>
        <div className="fieldGrid">
          <label className="label">
            Upload eviction notice or supporting document
            <input className="input fileInput" type="file" onChange={(e) => updateUpload('housingEvictionNoticeUploaded', e.target.files)} />
          </label>
        </div>
        <div className="fieldGrid">
          <label className="label">
            Landlord Contact Information
            <input className="input" value={state.landlordContactInformation} onChange={(e) => updateField('landlordContactInformation', e.target.value)} placeholder="Phone number or email" />
          </label>
          <label className="label">
            Amount Owed
            <input className="input" inputMode="decimal" value={state.housingAmountOwed} onChange={(e) => updateField('housingAmountOwed', e.target.value)} placeholder="$0.00" />
          </label>
        </div>
      </div>
    )
  }

  function renderMortgageSection() {
    if (!mortgageReliefSelected) return null
    return (
      <div className="formSectionCard">
        <div className="formSectionTitle">Mortgage Relief Assistance</div>
        <p className="muted">This section is separate from Housing Assistance and is for homeowners requesting mortgage payment support.</p>
        <div className="subSectionTitle">Mortgage Assistance Intake Form</div>
        <div className="subSectionLabel">Applicant Information</div>
        <div className="fieldGrid">
          <label className="label">
            Full Legal Name
            <input className="input" value={state.mortgageApplicantName} onChange={(e) => updateField('mortgageApplicantName', e.target.value)} placeholder="Full legal name" />
          </label>
          <label className="label">
            Date of Birth
            <input className="input" type="date" value={state.mortgageDateOfBirth} onChange={(e) => updateField('mortgageDateOfBirth', e.target.value)} />
          </label>
        </div>
        <div className="fieldGrid">
          <label className="label">
            Phone Number
            <input className="input" type="tel" inputMode="numeric" maxLength="10" value={state.mortgagePhoneNumber} onChange={(e) => updateField('mortgagePhoneNumber', e.target.value)} placeholder="10 digits" />
            {renderFieldError('mortgagePhoneNumber')}
          </label>
          <label className="label">
            Email
            <input className="input" type="email" value={state.mortgageEmail} onChange={(e) => updateField('mortgageEmail', e.target.value)} placeholder="you@example.com" />
          </label>
        </div>
        <label className="label">
          Property Address
          <input className="input" value={state.mortgagePropertyAddress} onChange={(e) => updateField('mortgagePropertyAddress', e.target.value)} placeholder="Property address" />
        </label>
        <div className="fieldGrid3">
          <label className="label">
            City
            <input className="input" value={state.mortgageCity} onChange={(e) => updateField('mortgageCity', e.target.value)} placeholder="City" />
          </label>
          <label className="label">
            State
            <input className="input" value={state.mortgageStateRegion} onChange={(e) => updateField('mortgageStateRegion', e.target.value)} placeholder="State" />
          </label>
          <label className="label">
            ZIP
            <input className="input" inputMode="numeric" maxLength="5" value={state.mortgageZipCode} onChange={(e) => updateField('mortgageZipCode', e.target.value)} placeholder="5-digit ZIP" />
            {renderFieldError('mortgageZipCode')}
          </label>
        </div>
        <div className="label">
          <span>Is this your primary residence?</span>
          <div className="optionGrid">
            <label className="optionCard">
              <input type="radio" name="primaryResidence" checked={state.primaryResidence === 'yes'} onChange={() => updateField('primaryResidence', 'yes')} />
              <span>Yes</span>
            </label>
            <label className="optionCard">
              <input type="radio" name="primaryResidence" checked={state.primaryResidence === 'no'} onChange={() => updateField('primaryResidence', 'no')} />
              <span>No</span>
            </label>
          </div>
        </div>
        <div className="subSectionLabel">Home Ownership Details</div>
        <div className="fieldGrid">
          <div className="label">
            <span>Do you own the home?</span>
            <div className="optionGrid">
              <label className="optionCard">
                <input type="radio" name="ownsHome" checked={state.ownsHome === 'yes'} onChange={() => updateField('ownsHome', 'yes')} />
                <span>Yes</span>
              </label>
              <label className="optionCard">
                <input type="radio" name="ownsHome" checked={state.ownsHome === 'no'} onChange={() => updateField('ownsHome', 'no')} />
                <span>No</span>
              </label>
            </div>
          </div>
          <div className="assistBox compactBox">
            <div className="assistTitle">Type of loan</div>
            <div className="assistGrid">
              {mortgageLoanOptions.map((option) => (
                <label key={option.key} className="assistOption">
                  <input type="radio" name="mortgageLoanTypes" checked={state.mortgageLoanTypes[option.key]} onChange={(e) => updateMortgageLoanType(option.key, e.target.checked)} />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="fieldGrid">
          <label className="label">
            Mortgage Lender / Servicer Name
            <input className="input" value={state.mortgageLenderName} onChange={(e) => updateField('mortgageLenderName', e.target.value)} placeholder="Lender or servicer name" />
          </label>
          <label className="label">
            Loan Account Number (last 4 digits only for privacy)
            <input className="input" inputMode="numeric" maxLength="4" value={state.mortgageLoanAccountLast4} onChange={(e) => updateField('mortgageLoanAccountLast4', e.target.value)} placeholder="Last 4 digits" />
            {renderFieldError('mortgageLoanAccountLast4')}
          </label>
        </div>
        <div className="subSectionLabel">Mortgage Status</div>
        <div className="fieldGrid">
          <label className="label">
            Current Monthly Mortgage Payment
            <input className="input" inputMode="decimal" value={state.currentMortgagePayment} onChange={(e) => updateField('currentMortgagePayment', e.target.value)} placeholder="$0.00" />
          </label>
          <label className="label">
            Total Past Due Amount
            <input className="input" inputMode="decimal" value={state.totalPastDueAmount} onChange={(e) => updateField('totalPastDueAmount', e.target.value)} placeholder="$0.00" />
          </label>
        </div>
        <div className="fieldGrid">
          <div className="label">
            <span>Are you in foreclosure?</span>
            <div className="optionGrid">
              <label className="optionCard">
                <input type="radio" name="inForeclosure" checked={state.inForeclosure === 'yes'} onChange={() => updateField('inForeclosure', 'yes')} />
                <span>Yes</span>
              </label>
              <label className="optionCard">
                <input type="radio" name="inForeclosure" checked={state.inForeclosure === 'no'} onChange={() => updateField('inForeclosure', 'no')} />
                <span>No</span>
              </label>
            </div>
          </div>
          <label className="label">
            Auction Date (if scheduled)
            <input className="input" type="date" value={state.auctionDate} onChange={(e) => updateField('auctionDate', e.target.value)} />
          </label>
        </div>
        <div className="subSectionLabel">One or More Documents</div>
        <p className="fieldHint">Upload at least 1 file here to continue to the next step.</p>
        <div className="uploadGrid">
          <label className="uploadField">
            <span>Most recent mortgage statement</span>
            <input className="input fileInput" type="file" onChange={(e) => updateUpload('mortgageStatementUploaded', e.target.files)} />
          </label>
          <label className="uploadField">
            <span>Delinquency notice or foreclosure letter</span>
            <input className="input fileInput" type="file" onChange={(e) => updateUpload('mortgageDelinquencyNoticeUploaded', e.target.files)} />
          </label>
          <label className="uploadField">
            <span>Proof of income (pay stub, unemployment letter, etc.)</span>
            <input className="input fileInput" type="file" onChange={(e) => updateUpload('mortgageIncomeProofUploaded', e.target.files)} />
          </label>
        </div>
        <div className="subSectionLabel">Financial Hardship Information</div>
        <div className="assistBox">
          <div className="assistTitle">What caused the hardship?</div>
          <div className="assistGrid">
            {hardshipCauseOptions.map((option) => (
              <label key={option.key} className="assistOption">
                <input type="checkbox" checked={state.hardshipCauses[option.key]} onChange={(e) => updateHardshipCause(option.key, e.target.checked)} />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="fieldGrid">
          <label className="label">
            Date Hardship Began
            <input className="input" type="date" value={state.hardshipStartDate} onChange={(e) => updateField('hardshipStartDate', e.target.value)} />
          </label>
          <label className="label">
            Current Household Monthly Income
            <input className="input" inputMode="decimal" value={state.mortgageCurrentMonthlyIncome} onChange={(e) => updateField('mortgageCurrentMonthlyIncome', e.target.value)} placeholder="$0.00" />
          </label>
        </div>
        <div className="subSectionLabel">Requested Assistance</div>
        <div className="fieldGrid">
          <label className="label">
            Amount Requested
            <input className="input" inputMode="decimal" value={state.mortgageAmountRequested} onChange={(e) => updateField('mortgageAmountRequested', e.target.value)} placeholder="$0.00" />
          </label>
          <label className="label">
            Is this one-time or temporary help?
            <input className="input" value={state.mortgageHelpType} onChange={(e) => updateField('mortgageHelpType', e.target.value)} placeholder="One-time or temporary" />
          </label>
        </div>
        <div className="subSectionLabel">Authorization</div>
        <label className="checkRow">
          <input type="checkbox" checked={state.mortgageAuthorization} onChange={(e) => updateField('mortgageAuthorization', e.target.checked)} />
          <span>I authorize the organization to verify my mortgage information with my loan servicer if necessary.</span>
        </label>
      </div>
    )
  }
  function renderStepTwo() {
    return (
      <>
        {renderAssistanceSelector()}

        {selectedAssistanceCount === 0 && (
          <div className="miniCard">
            <div className="miniTitle">Select at least one assistance type</div>
            <div className="muted">After you check an assistance option, only that intake section will appear here.</div>
          </div>
        )}

        {renderEducationSection()}
        {renderFoodSection()}
        {renderMedicalSection()}
        {renderHousingSection()}
        {renderMortgageSection()}

        <div className="enrollFooter">
          <button className="btn btnSecondary" type="button" onClick={() => goToStep(1)}>
            Back to Basic
          </button>
          <button className="btn btnPrimary" type="button" onClick={() => goToStep(3)} disabled={!serviceStepComplete}>
            Continue to Income
          </button>
        </div>

        <p className="fieldHint" aria-live="polite">{serviceProgressMessage}</p>
      </>
    )
  }

  function renderHouseholdIncomeSection() {
    return (
      <div className="formSectionCard">
        <div className="formSectionTitle">Household Information</div>
        <p className="muted">This final step covers household size, income review, and the final submission details.</p>
        <div className="fieldGrid">
          <label className="label">
            Number of People in Household
            <input className="input" inputMode="numeric" value={state.householdSize} onChange={(e) => updateField('householdSize', e.target.value)} placeholder="Number of people" />
          </label>
          <label className="label">
            Ages of Children
            <input className="input" value={state.childrenAges} onChange={(e) => updateField('childrenAges', e.target.value)} placeholder="Example: 4, 8, 12" />
          </label>
        </div>
        <div className="fieldGrid">
          <label className="label">
            Marital Status
            <select className="input selectInput" value={state.maritalStatus} onChange={(e) => updateField('maritalStatus', e.target.value)}>
              {maritalStatusOptions.map((option) => (
                <option key={option.label} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="label">
            Employment Status
            <select className="input selectInput" value={state.employmentStatus} onChange={(e) => updateField('employmentStatus', e.target.value)}>
              {employmentStatusOptions.map((option) => (
                <option key={option.label} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="fieldGrid">
          <label className="label">
            Total Household Monthly Income
            <input className="input" inputMode="decimal" value={state.monthlyIncome} onChange={(e) => updateField('monthlyIncome', e.target.value)} placeholder="$0.00" />
          </label>
          <div className="label">
            <span>Do you receive SNAP, Medicaid, SSI, etc.?</span>
            <div className="optionGrid">
              <label className="optionCard">
                <input type="radio" name="receivesBenefits" checked={state.receivesBenefits === 'yes'} onChange={() => updateField('receivesBenefits', 'yes')} />
                <span>Yes</span>
              </label>
              <label className="optionCard">
                <input type="radio" name="receivesBenefits" checked={state.receivesBenefits === 'no'} onChange={() => updateField('receivesBenefits', 'no')} />
                <span>No</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    )
  }

  function renderIncomeVerificationSection() {
    return (
      <div className="formSectionCard">
        <div className="formSectionTitle">Income Verification</div>
        <p className="muted">Upload 1 or more documents for income review before submitting.</p>
        <p className="fieldHint">One file is enough to continue, and you can add more if they apply to you.</p>
        <div className="subSectionLabel">One or More Documents</div>
        <div className="uploadGrid">
          {incomeVerificationUploads.map((upload) => (
            <label key={upload.key} className="uploadField">
              <span>{upload.label}</span>
              <input
                className="input fileInput"
                type="file"
                onChange={(e) => updateIncomeVerificationUpload(upload.key, e.target.files)}
              />
            </label>
          ))}
        </div>
      </div>
    )
  }

  function renderFinalStep() {
    return (
      <>
        <div className="miniCard">
          <div className="miniTitle">Selected Assistance</div>
          <div className="muted">
            {selectedAssistanceCount > 0 ? selectedAssistance.map((option) => option.label).join(', ') : 'No assistance type selected yet.'}
          </div>
        </div>

        {renderHouseholdIncomeSection()}
        {renderIncomeVerificationSection()}

        <div className="formSectionCard">
          <div className="formSectionTitle">No Guarantee Statement</div>
          <div className="sectionDisclaimer">Submission does not guarantee funding. Assistance is subject to review and available funds.</div>
        </div>

        <div className="formSectionCard">
          <div className="formSectionTitle">Consent & Authorization</div>
          <div className="checkStack">
            <label className="checkRow">
              <input type="checkbox" checked={state.eligibilityAuthorization} onChange={(e) => updateField('eligibilityAuthorization', e.target.checked)} />
              <span>I authorize the organization to verify the information provided for eligibility determination.</span>
            </label>
            <label className="checkRow">
              <input type="checkbox" checked={state.nonDiscriminationAcknowledgment} onChange={(e) => updateField('nonDiscriminationAcknowledgment', e.target.checked)} />
              <span>I understand that this organization does not discriminate based on race, religion, gender, disability, national origin, or sexual orientation.</span>
            </label>
          </div>
        </div>

        <div className="enrollFooter">
          <button className="btn btnSecondary" type="button" onClick={() => goToStep(2)}>
            Back to Assistance
          </button>
          <button className="btn btnPrimary enrollBtn" type="submit" disabled={!finalSubmissionReady || isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Enrollment Request'}
          </button>
        </div>

        <p className="fieldHint" aria-live="polite">{finalProgressMessage}</p>
        {submitError && <p className="fieldError" role="alert">{submitError}</p>}

        {sent && (
          <div className="successBox" role="status">
            Your enrollment request was securely submitted and saved for coordinator review.
          </div>
        )}
      </>
    )
  }

  return (
    <div className="section">
      <div className="container">
        <header className="pageHeader">
          <h1 className="h1">Complete Your Enrollment Request</h1>
          <p className="muted">
            Follow the three-step process to complete your basic intake, choose the right assistance, and finish the income review.
          </p>
          <div className="miniCard" aria-label="United States only notice">
            <div className="miniTitle">U.S. Eligibility</div>
            <div className="muted">
              This enrollment form is currently limited to applicants in the United States and uses U.S.-specific
              eligibility fields such as SSN, state, and ZIP Code.
            </div>
          </div>
        </header>

        <div className="enrollRequestLayout">
          <div className="card enrollmentFormCard">
            <div className="enrollStepBar" aria-label="Enrollment steps">
              {[1, 2, 3].map((step, index) => (
                <React.Fragment key={step}>
                  <span
                    className={['stepDot', currentStep > step ? 'complete' : '', currentStep === step ? 'active' : '']
                      .filter(Boolean)
                      .join(' ')}
                  />
                  {index < 2 && <span className="stepLine" />}
                </React.Fragment>
              ))}
            </div>

            <div className="enrollSectionTitle">{activeStep.eyebrow}</div>
            <h2 className="h2">{activeStep.title}</h2>
            <p className="muted">{activeStep.lead}</p>

            <form className="form" onSubmit={onSubmit}>
              {currentStep === 1 && renderBasicStep()}
              {currentStep === 2 && renderStepTwo()}
              {currentStep === 3 && renderFinalStep()}
            </form>
          </div>

          <InfoCard title="Enrollment Steps" icon="3">
            <ul className="list">
              <li>Step 1: Complete the required basic applicant information.</li>
              <li>Step 2: Select your assistance type and fill only the matching service forms.</li>
              <li>Step 3: Finish household income review, upload documents, and submit the request.</li>
            </ul>

            <div className="miniCard">
              <div className="miniTitle">Confidential Processing</div>
              <div className="muted">
                Sensitive information, including Social Security numbers, must be submitted through a secure intake process with appropriate safeguards and restricted access to protect confidentiality.
              </div>
            </div>
          </InfoCard>
        </div>
      </div>
    </div>
  )
}

function getSubmissionFailureMessage(response, responseText) {
  if (response.status === 404 || response.status === 405 || containsHtmlDocument(responseText)) {
    return 'The online enrollment API is not configured correctly yet. Update the deployment so /api/enrollments is available on the live site.'
  }

  if (response.status === 503) {
    return 'The online enrollment service is missing its email configuration. Add the SMTP and notification environment variables in your hosting dashboard.'
  }

  return `Unable to submit enrollment right now. Server returned status ${response.status}.`
}

function getUnexpectedSubmissionResponseMessage(responseText) {
  if (containsHtmlDocument(responseText)) {
    return 'The live site returned a web page instead of the enrollment API response. Update the deployment so /api/enrollments points to the serverless function.'
  }

  return 'Enrollment service returned an unexpected response. Please try again shortly.'
}

function containsHtmlDocument(value) {
  return /<!doctype html|<html[\s>]/i.test(String(value || ''))
}
