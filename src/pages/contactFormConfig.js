export const languageOptions = [
  { value: '', label: 'Select a language' },
  { value: 'english', label: 'English' },
  { value: 'spanish', label: 'Spanish' },
  { value: 'french', label: 'French' },
  { value: 'other', label: 'Other' },
]

export const maritalStatusOptions = [
  { value: '', label: 'Select marital status' },
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed', label: 'Widowed' },
]

export const employmentStatusOptions = [
  { value: '', label: 'Select employment status' },
  { value: 'employed-full-time', label: 'Employed Full-Time' },
  { value: 'employed-part-time', label: 'Employed Part-Time' },
  { value: 'self-employed', label: 'Self-Employed' },
  { value: 'unemployed', label: 'Unemployed' },
  { value: 'retired', label: 'Retired' },
  { value: 'student', label: 'Student' },
]

export const assistanceOptions = [
  { key: 'educationSupport', label: 'Education Support' },
  { key: 'foodAssistance', label: 'Food Assistance' },
  { key: 'medicalAssistance', label: 'Medical Assistance' },
  { key: 'rentalHousingSupport', label: 'Rental / Housing Support' },
  { key: 'mortgageReliefAssistance', label: 'Mortgage Relief Assistance' },
]

export const incomeVerificationUploads = [
  { key: 'lastTwoPayStubs', label: 'Last 2 pay stubs' },
  { key: 'taxReturn1040', label: 'Tax return (Form 1040)' },
  { key: 'snapOrSsiApprovalLetter', label: 'SNAP/SSI approval letter' },
  { key: 'unemploymentBenefitsLetter', label: 'Unemployment benefits letter' },
  { key: 'bankAndCreditScoreProof', label: 'Proof of bank and credit score' },
]

export const mortgageLoanOptions = [
  { key: 'fha', label: 'FHA' },
  { key: 'va', label: 'VA' },
  { key: 'conventional', label: 'Conventional' },
  { key: 'usda', label: 'USDA' },
]

export const hardshipCauseOptions = [
  { key: 'jobLoss', label: 'Job loss' },
  { key: 'medicalEmergency', label: 'Medical emergency' },
  { key: 'disability', label: 'Disability' },
  { key: 'divorce', label: 'Divorce' },
  { key: 'naturalDisaster', label: 'Natural disaster' },
  { key: 'other', label: 'Other' },
]

export const foodSupportOptions = [
  { key: 'oneTimeEmergencyFoodPackage', label: 'One-time emergency food package' },
  { key: 'monthlyFoodSupport', label: 'Monthly food support' },
  { key: 'specialDietaryNeeds', label: 'Special dietary needs (allergies, medical restrictions)' },
  { key: 'communityFeedingProgram', label: 'Community feeding program' },
]

export const stepContent = {
  1: {
    eyebrow: 'Step 1 of 3',
    title: 'Basic Information',
    lead: 'Complete the required applicant information before moving to the service request step.',
  },
  2: {
    eyebrow: 'Step 2 of 3',
    title: 'Choose Assistance',
    lead: 'Select the charity assistance you need, then complete only the sections you choose.',
  },
  3: {
    eyebrow: 'Step 3 of 3',
    title: 'Income & Final Review',
    lead: 'Finish the household and income review, then confirm the final authorization statements.',
  },
}

export const digitOnlyLimits = {
  ssn: 9,
  zipCode: 5,
  mortgageZipCode: 5,
  mortgageLoanAccountLast4: 4,
  phoneNumber: 10,
  mortgagePhoneNumber: 10,
}

export const letterOnlyFields = new Set([
  'firstName',
  'middleName',
  'lastName',
  'foodSignature',
  'city',
  'stateRegion',
  'schoolName',
  'hospitalClinicName',
  'mortgageApplicantName',
  'mortgageCity',
  'mortgageStateRegion',
  'mortgageLenderName',
])
