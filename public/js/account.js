/**
 * Account page: load current user, edit username, change password, change email.
 * Requires user to be logged in (redirects to login otherwise).
 * All inputs validated client-side; auth.js and server also validate.
 */
import { getCurrentUser, updateUsername, updatePassword, updateEmail } from './auth.js'
import { supabase } from './supabaseClient.js'
import { validateUsername, validateEmail, validatePassword } from './validation.js'

const accountLoading = document.getElementById('accountLoading')
const accountContent = document.getElementById('accountContent')
const accountEmail = document.getElementById('accountEmail')
const accountUsername = document.getElementById('accountUsername')
const saveUsernameBtn = document.getElementById('saveUsernameBtn')
const usernameMessage = document.getElementById('usernameMessage')
const passwordForm = document.getElementById('passwordForm')
const savePasswordBtn = document.getElementById('savePasswordBtn')
const passwordMessage = document.getElementById('passwordMessage')
const emailForm = document.getElementById('emailForm')
const saveEmailBtn = document.getElementById('saveEmailBtn')
const emailMessage = document.getElementById('emailMessage')
const newEmailEl = document.getElementById('newEmail')
const emailPasswordEl = document.getElementById('emailPassword')

function showMessage(el, text, isError = false) {
  if (!el) return
  el.textContent = text
  el.classList.remove('hidden', 'text-emerald-400', 'text-red-400')
  el.classList.add(isError ? 'text-red-400' : 'text-emerald-400')
}

async function loadUser() {
  const user = await getCurrentUser()
  if (!user) {
    const next = encodeURIComponent(window.location.pathname.replace(/^\//, '') || 'account.html')
    window.location.href = `login.html?next=${next}`
    return
  }
  if (accountEmail) accountEmail.value = user.email || ''
  let name = user.user_metadata?.full_name ?? ''
  try {
    const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).maybeSingle()
    if (profile?.username != null) name = profile.username
  } catch (_) {}
  if (accountUsername) accountUsername.value = name
  accountLoading.classList.add('hidden')
  accountContent.classList.remove('hidden')

  const params = new URLSearchParams(window.location.search)
  if (params.get('email_updated') === '1') {
    showMessage(emailMessage, 'Your email has been updated. You are now signed in with your new email.', false)
    window.history.replaceState({}, '', window.location.pathname)
  }
}

if (saveUsernameBtn && accountUsername) {
  saveUsernameBtn.addEventListener('click', async () => {
    const raw = accountUsername.value
    const check = validateUsername(raw)
    if (!check.valid) {
      showMessage(usernameMessage, check.error, true)
      return
    }
    saveUsernameBtn.disabled = true
    showMessage(usernameMessage, '')
    try {
      await updateUsername(check.value ?? null)
      showMessage(usernameMessage, 'Display name saved. You can now sign in with this username or your email.')
    } catch (e) {
      const msg = e?.message || ''
      showMessage(usernameMessage, /unique|duplicate/i.test(msg) ? 'This username is already taken.' : msg || 'Failed to save.', true)
    } finally {
      saveUsernameBtn.disabled = false
    }
  })
}

if (passwordForm) {
  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const newPassword = document.getElementById('newPassword')?.value ?? ''
    const newPasswordConfirm = document.getElementById('newPasswordConfirm')?.value ?? ''
    const currentPassword = document.getElementById('currentPassword')?.value ?? ''
    const newPwCheck = validatePassword(newPassword, 'New password')
    if (!newPwCheck.valid) {
      showMessage(passwordMessage, newPwCheck.error, true)
      return
    }
    if (newPassword !== newPasswordConfirm) {
      showMessage(passwordMessage, 'New passwords do not match.', true)
      return
    }
    if (!currentPassword || currentPassword.length > 500) {
      showMessage(passwordMessage, 'Enter your current password.', true)
      return
    }
    savePasswordBtn.disabled = true
    showMessage(passwordMessage, '')
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: (await getCurrentUser())?.email,
        password: currentPassword
      })
      if (signInError) {
        showMessage(passwordMessage, 'Current password is incorrect.', true)
        return
      }
      await updatePassword(newPassword)
      passwordForm.reset()
      showMessage(passwordMessage, 'Password updated. Use your new password next time you sign in.')
    } catch (e) {
      showMessage(passwordMessage, e?.message || 'Failed to update password.', true)
    } finally {
      savePasswordBtn.disabled = false
    }
  })
}

if (emailForm) {
  emailForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const newEmailRaw = newEmailEl?.value ?? ''
    const password = emailPasswordEl?.value ?? ''
    const emailCheck = validateEmail(newEmailRaw)
    if (!emailCheck.valid) {
      showMessage(emailMessage, emailCheck.error, true)
      return
    }
    if (!password || password.length > 500) {
      showMessage(emailMessage, 'Enter your password to confirm.', true)
      return
    }
    saveEmailBtn.disabled = true
    showMessage(emailMessage, '')
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: (await getCurrentUser())?.email,
        password
      })
      if (signInError) {
        showMessage(emailMessage, 'Password is incorrect.', true)
        return
      }
      await updateEmail(emailCheck.value)
      emailForm.reset()
      showMessage(emailMessage, 'Confirmation emails sent. Check both your current and new email and follow the links to complete the change.')
    } catch (e) {
      showMessage(emailMessage, e?.message || 'Failed to send confirmation.', true)
    } finally {
      saveEmailBtn.disabled = false
    }
  })
}

loadUser()
