export function sanitizePrefillName(value) {
  return value.replace(/[^A-Za-z\s'-]/g, '').replace(/\s{2,}/g, ' ').trim()
}

export function getPrefilledBasicInfo(locationState) {
  const source =
    locationState && typeof locationState === 'object' && !Array.isArray(locationState)
      ? locationState
      : {}

  return {
    firstName: sanitizePrefillName(String(source.firstName || '')),
    middleName: sanitizePrefillName(String(source.middleName || '')),
    lastName: sanitizePrefillName(String(source.lastName || '')),
    email: String(source.email || '').trim(),
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
