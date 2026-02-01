import { supabase } from './supabase'
import { validateEmail, validatePassword, validateLoginIdentifier, validateUsername } from './validation'

export async function register({ email, password }) {
  const emailCheck = validateEmail(email)
  if (!emailCheck.valid) throw new Error(emailCheck.error)
  const pwCheck = validatePassword(password, 'Password')
  if (!pwCheck.valid) throw new Error(pwCheck.error)

  const redirectTo = `${window.location.origin}/login`
  const { data, error } = await supabase.auth.signUp(
    { email: emailCheck.value, password },
    { options: { emailRedirectTo: redirectTo } }
  )
  if (error) throw new Error(error.message)
  // When "Confirm email" is enabled in Supabase, no session is created until the user confirms
  return { needsEmailConfirmation: !data.session }
}

export async function login({ identifier, password }, navigate) {
  const idCheck = validateLoginIdentifier(identifier)
  if (!idCheck.valid) throw new Error(idCheck.error)
  const pwCheck = validatePassword(password, 'Password')
  if (!pwCheck.valid) throw new Error(pwCheck.error)

  if (idCheck.isEmail) {
    const { error } = await supabase.auth.signInWithPassword({ email: idCheck.email, password })
    if (error) throw new Error(error.message)
  } else {
    const res = await fetch(`${window.location.origin}/.netlify/functions/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: idCheck.username, password }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Invalid login credentials')
    if (!data.session) throw new Error('Invalid login credentials')
    const { error } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    })
    if (error) throw new Error(error.message)
  }

  const params = new URLSearchParams(window.location.search)
  const next = params.get('next')
  const allowed = next && /^\/[a-zA-Z0-9/_.-]*$/.test(next)
  navigate(allowed ? next : '/dashboard')
}

export async function logout(navigate) {
  await supabase.auth.signOut()
  navigate('/login')
}

export async function requestPasswordReset(email) {
  const emailCheck = validateEmail(email)
  if (!emailCheck.valid) throw new Error(emailCheck.error)
  const redirectTo = `${window.location.origin}/reset-password`
  const { error } = await supabase.auth.resetPasswordForEmail(emailCheck.value, { redirectTo })
  if (error) throw new Error(error.message)
}

export async function updatePassword(newPassword) {
  const pwCheck = validatePassword(newPassword, 'Password')
  if (!pwCheck.valid) throw new Error(pwCheck.error)
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

export async function updateEmail(newEmail) {
  const emailCheck = validateEmail(newEmail)
  if (!emailCheck.valid) throw new Error(emailCheck.error)
  const { error } = await supabase.auth.updateUser({ email: emailCheck.value })
  if (error) throw error
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function updateUsername(username) {
  const { valid, value, error: validationError } = validateUsername(username)
  if (!valid) throw new Error(validationError)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  const { error: metaError } = await supabase.auth.updateUser({
    data: { full_name: value ?? null },
  })
  if (metaError) throw metaError

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: user.id, username: value ?? null, updated_at: new Date().toISOString() }, { onConflict: 'id' })
  if (profileError) throw profileError
}
