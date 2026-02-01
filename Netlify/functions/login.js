/**
 * Login with email OR username + password.
 * If identifier contains '@', treat as email and get session via Supabase Auth.
 * Otherwise lookup profiles.username -> user id -> email (service role), then get session.
 * Returns { session } for client to call setSession(), or { error }.
 * All inputs validated and sanitized; never log passwords.
 */
import { createClient } from '@supabase/supabase-js'

const IDENTIFIER_MAX = 320
const PASSWORD_MIN = 6
const PASSWORD_MAX = 500
const USERNAME_MAX = 50
const USERNAME_RE = /^[a-zA-Z0-9_-]+$/

function sanitizeString(str, maxLen) {
  if (typeof str !== 'string') return ''
  return str.trim().slice(0, maxLen)
}

function validateIdentifier(identifier) {
  const s = sanitizeString(identifier, IDENTIFIER_MAX)
  if (!s) return { valid: false, error: 'Identifier and password required' }
  if (s.includes('@')) {
    if (s.length > 320) return { valid: false, error: 'Invalid login credentials' }
    return { valid: true, email: s, isEmail: true }
  }
  if (s.length < 3 || s.length > USERNAME_MAX) return { valid: false, error: 'Invalid login credentials' }
  if (!USERNAME_RE.test(s)) return { valid: false, error: 'Invalid login credentials' }
  return { valid: true, username: s, isEmail: false }
}

function validatePasswordInput(password) {
  if (typeof password !== 'string') return { valid: false }
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) return { valid: false }
  return { valid: true }
}

function getSupabaseAnon() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function getSessionByEmailPassword(email, password) {
  const supabase = getSupabaseAnon()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error }
  return { session: data.session }
}

async function getEmailByUsername(username) {
  const s = sanitizeString(username, USERNAME_MAX)
  if (!s || !USERNAME_RE.test(s)) return null
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', s)
    .maybeSingle()
  if (error || !data) return null
  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(data.id)
  if (userError || !userData?.user?.email) return null
  return userData.user.email
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }
  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch (_) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }
  const idResult = validateIdentifier(body.identifier)
  if (!idResult.valid) {
    return { statusCode: 400, body: JSON.stringify({ error: idResult.error }) }
  }
  if (!validatePasswordInput(body.password).valid) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid login credentials' }) }
  }
  const password = (body.password || '').toString()

  let email
  if (idResult.isEmail) {
    email = idResult.email
  } else {
    email = await getEmailByUsername(idResult.username)
    if (!email) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid login credentials' })
      }
    }
  }

  const result = await getSessionByEmailPassword(email, password)
  if (result.error) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: result.error.message || 'Invalid login credentials' })
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session: {
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
        expires_in: result.session.expires_in,
        expires_at: result.session.expires_at,
        token_type: result.session.token_type,
        user: result.session.user
      }
    })
  }
}
