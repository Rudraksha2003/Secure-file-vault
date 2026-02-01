/**
 * Client-side validation and sanitization for user inputs.
 * Use for auth forms and account settings. Server (Netlify) must also validate.
 */

const EMAIL_MAX = 320
const USERNAME_MIN = 3
const USERNAME_MAX = 50
const PASSWORD_MIN = 6
const PASSWORD_MAX = 500
const IDENTIFIER_MAX = 320

/** Basic email format (RFC 5322 simplified). */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Username: alphanumeric, underscore, hyphen only. */
const USERNAME_RE = /^[a-zA-Z0-9_-]+$/

/**
 * Trim and limit length. Returns trimmed string or empty.
 */
function trimMax(str, max) {
  if (typeof str !== 'string') return ''
  const s = str.trim()
  return s.length > max ? s.slice(0, max) : s
}

/**
 * Validate email. Returns { valid: boolean, error?: string }.
 */
export function validateEmail(email) {
  const s = trimMax(email, EMAIL_MAX)
  if (!s) return { valid: false, error: 'Email is required.' }
  if (s.length > EMAIL_MAX) return { valid: false, error: 'Email is too long.' }
  if (!EMAIL_RE.test(s)) return { valid: false, error: 'Enter a valid email address.' }
  return { valid: true, value: s }
}

/**
 * Validate username (for login and profile). Returns { valid: boolean, error?: string, value?: string }.
 */
export function validateUsername(username) {
  const s = trimMax(username, USERNAME_MAX)
  if (!s) return { valid: true, value: null }
  if (s.length < USERNAME_MIN) return { valid: false, error: `Username must be at least ${USERNAME_MIN} characters.` }
  if (s.length > USERNAME_MAX) return { valid: false, error: `Username must be at most ${USERNAME_MAX} characters.` }
  if (!USERNAME_RE.test(s)) return { valid: false, error: 'Username can only contain letters, numbers, underscores and hyphens.' }
  return { valid: true, value: s }
}

/**
 * Validate password. Returns { valid: boolean, error?: string }.
 */
export function validatePassword(password, fieldName = 'Password') {
  if (typeof password !== 'string') return { valid: false, error: `${fieldName} is required.` }
  if (password.length < PASSWORD_MIN) return { valid: false, error: `${fieldName} must be at least ${PASSWORD_MIN} characters.` }
  if (password.length > PASSWORD_MAX) return { valid: false, error: `${fieldName} is too long.` }
  return { valid: true }
}

/**
 * Sanitize login identifier (email or username). Returns trimmed string, max length. Does not validate format.
 */
export function sanitizeIdentifier(identifier) {
  return trimMax(identifier, IDENTIFIER_MAX)
}

/**
 * Validate login identifier: if it looks like email, validate email; else validate as username. Returns { valid, error?, email?, username? }.
 */
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
