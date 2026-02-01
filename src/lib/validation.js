const EMAIL_MAX = 320
const USERNAME_MIN = 3
const USERNAME_MAX = 50
const PASSWORD_MIN = 6
const PASSWORD_MAX = 500
const IDENTIFIER_MAX = 320

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_RE = /^[a-zA-Z0-9_-]+$/

function trimMax(str, max) {
  if (typeof str !== 'string') return ''
  const s = str.trim()
  return s.length > max ? s.slice(0, max) : s
}

export function validateEmail(email) {
  const s = trimMax(email, EMAIL_MAX)
  if (!s) return { valid: false, error: 'Email is required.' }
  if (s.length > EMAIL_MAX) return { valid: false, error: 'Email is too long.' }
  if (!EMAIL_RE.test(s)) return { valid: false, error: 'Enter a valid email address.' }
  return { valid: true, value: s }
}

export function validateUsername(username) {
  const s = trimMax(username, USERNAME_MAX)
  if (!s) return { valid: true, value: null }
  if (s.length < USERNAME_MIN) return { valid: false, error: `Username must be at least ${USERNAME_MIN} characters.` }
  if (s.length > USERNAME_MAX) return { valid: false, error: `Username must be at most ${USERNAME_MAX} characters.` }
  if (!USERNAME_RE.test(s)) return { valid: false, error: 'Username can only contain letters, numbers, underscores and hyphens.' }
  return { valid: true, value: s }
}

export function validatePassword(password, fieldName = 'Password') {
  if (typeof password !== 'string') return { valid: false, error: `${fieldName} is required.` }
  if (password.length < PASSWORD_MIN) return { valid: false, error: `${fieldName} must be at least ${PASSWORD_MIN} characters.` }
  if (password.length > PASSWORD_MAX) return { valid: false, error: `${fieldName} is too long.` }
  return { valid: true }
}

export function validateLoginIdentifier(identifier) {
  const s = trimMax(identifier, IDENTIFIER_MAX)
  if (!s) return { valid: false, error: 'Email or username is required.' }
  if (s.includes('@')) {
    const r = validateEmail(s)
    if (!r.valid) return r
    return { valid: true, email: r.value, isEmail: true }
  }
  const r = validateUsername(s)
  if (!r.valid) return r
  return { valid: true, username: r.value, isEmail: false }
}

/** Max note content length (chars). */
export const NOTE_CONTENT_MAX = 100_000

export function validateNoteContent(content) {
  if (typeof content !== 'string') return { valid: false, error: 'Note content must be text.' }
  if (content.length > NOTE_CONTENT_MAX) {
    return { valid: false, error: `Note is too long (max ${NOTE_CONTENT_MAX.toLocaleString()} characters).` }
  }
  return { valid: true, value: content }
}

/** Max file size in bytes (50 MB). */
export const FILE_UPLOAD_MAX_BYTES = 50 * 1024 * 1024

export function validateFile(file) {
  if (!file || !(file instanceof File)) return { valid: false, error: 'Please select a file.' }
  if (file.size > FILE_UPLOAD_MAX_BYTES) {
    return { valid: false, error: `File is too large (max ${FILE_UPLOAD_MAX_BYTES / (1024 * 1024)} MB).` }
  }
  return { valid: true }
}
