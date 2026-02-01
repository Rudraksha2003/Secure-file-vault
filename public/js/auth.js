import { supabase } from './supabaseClient.js'
import { validateEmail, validatePassword, validateLoginIdentifier, validateUsername } from './validation.js'

export async function register() {
  const emailRaw = document.getElementById('email')?.value
  const passwordRaw = document.getElementById('password')?.value
  const emailCheck = validateEmail(emailRaw)
  if (!emailCheck.valid) {
    alert(emailCheck.error)
    return
  }
  const pwCheck = validatePassword(passwordRaw, 'Password')
  if (!pwCheck.valid) {
    alert(pwCheck.error)
    return
  }

  const base = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/')
  const emailRedirectTo = base + 'login.html'
  const { data, error } = await supabase.auth.signUp(
    { email: emailCheck.value, password: passwordRaw },
    { options: { emailRedirectTo } }
  )
  if (error) {
    alert(error.message)
    return
  }
  if (data.session) {
    return { needsEmailConfirmation: false }
  }
  return { needsEmailConfirmation: true }
}

export async function login() {
  const identifierEl = document.getElementById('identifier') || document.getElementById('email')
  const identifier = (identifierEl?.value ?? '').trim()
  const passwordRaw = document.getElementById('password')?.value ?? ''
  const idCheck = validateLoginIdentifier(identifier)
  if (!idCheck.valid) {
    alert(idCheck.error)
    return
  }
  const pwCheck = validatePassword(passwordRaw, 'Password')
  if (!pwCheck.valid) {
    alert(pwCheck.error)
    return
  }

  if (idCheck.isEmail) {
    const { error } = await supabase.auth.signInWithPassword({ email: idCheck.email, password: passwordRaw })
    if (error) {
      alert(error.message)
      return
    }
  } else {
    const res = await fetch(`${window.location.origin}/.netlify/functions/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: idCheck.username, password: passwordRaw })
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert(data.error || 'Invalid login credentials')
      return
    }
    if (!data.session) {
      alert('Invalid login credentials')
      return
    }
    const { error } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token
    })
    if (error) {
      alert(error.message)
      return
    }
  }

  const params = new URLSearchParams(window.location.search)
  const next = params.get('next')
  const allowed = next && /^[a-zA-Z0-9_.-]+\.html$/.test(next)
  window.location.href = allowed ? next : 'dashboard.html'
}

export async function logout() {
  await supabase.auth.signOut()
  window.location.href = 'login.html'
}

/** Forgot password: send reset link to email. Add reset-password.html URL in Supabase Dashboard → Auth → URL Configuration. */
export async function requestPasswordReset() {
  const emailEl = document.getElementById('email')
  const btn = document.getElementById('submitBtn')
  const successMsg = document.getElementById('successMsg')
  if (!emailEl || !btn) return
  const emailCheck = validateEmail(emailEl.value)
  if (!emailCheck.valid) {
    alert(emailCheck.error)
    return
  }
  btn.disabled = true
  btn.textContent = 'Sending…'
  const base = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/')
  const redirectTo = base + 'reset-password.html'
  const { error } = await supabase.auth.resetPasswordForEmail(emailCheck.value, { redirectTo })
  btn.disabled = false
  btn.textContent = 'Send reset link'
  if (error) {
    alert(error.message)
    return
  }
  if (successMsg) successMsg.classList.remove('hidden')
}

/** Update password (e.g. after recovery or from account settings). */
export async function updatePassword(newPassword) {
  const pwCheck = validatePassword(newPassword, 'Password')
  if (!pwCheck.valid) throw new Error(pwCheck.error)
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

/** Update email. Supabase sends confirmation to current and new email; change completes after user confirms. */
export async function updateEmail(newEmail) {
  const emailCheck = validateEmail(newEmail)
  if (!emailCheck.valid) throw new Error(emailCheck.error)
  const { error } = await supabase.auth.updateUser({ email: emailCheck.value })
  if (error) throw error
}

/** Get current user (from session). */
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/** Update display name (user_metadata + profiles.username for login by username). Username must pass validateUsername. */
export async function updateUsername(username) {
  const { valid, value, error: validationError } = validateUsername(username)
  if (!valid) throw new Error(validationError)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  const { error: metaError } = await supabase.auth.updateUser({
    data: { full_name: value ?? null }
  })
  if (metaError) throw metaError

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: user.id, username: value ?? null, updated_at: new Date().toISOString() }, { onConflict: 'id' })
  if (profileError) throw profileError
}
