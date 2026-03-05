export function sanitizePrefillName(value) {
  return value.replace(/[^A-Za-z\s'-]/g, '').replace(/\s{2,}/g, ' ').trim()
}

export function getPrefilledBasicInfo(search) {
  const params = new URLSearchParams(search)

  return {
    firstName: sanitizePrefillName(params.get('firstName') || ''),
    middleName: sanitizePrefillName(params.get('middleName') || ''),
    lastName: sanitizePrefillName(params.get('lastName') || ''),
    email: (params.get('email') || '').trim(),
  }
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function hasSelectedFile(fileList) {
  return Boolean(fileList && fileList.length > 0)
}

export function sanitizeFieldValue(field, value, digitOnlyLimits, letterOnlyFields) {
  if (digitOnlyLimits[field]) {
    return value.replace(/\D/g, '').slice(0, digitOnlyLimits[field])
  }
  if (letterOnlyFields.has(field)) {
    return value.replace(/[^A-Za-z\s'-]/g, '').replace(/\s{2,}/g, ' ')
  }
  return value
}
