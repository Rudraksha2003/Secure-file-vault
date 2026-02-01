/**
 * Reset password page: user lands here from the link in the forgot-password email.
 * Supabase emits PASSWORD_RECOVERY when the URL contains the recovery tokens;
 * we then show the form and call updateUser({ password }) on submit.
 */
import { supabase } from './supabaseClient.js'
import { updatePassword } from './auth.js'

const resetForm = document.getElementById('resetForm')
const loadingMsg = document.getElementById('loadingMsg')
const invalidMsg = document.getElementById('invalidMsg')
const successMsg = document.getElementById('successMsg')

function showForm() {
  if (loadingMsg) loadingMsg.classList.add('hidden')
  if (invalidMsg) invalidMsg.classList.add('hidden')
  if (resetForm) resetForm.classList.remove('hidden')
}

function showInvalid() {
  if (loadingMsg) loadingMsg.classList.add('hidden')
  if (resetForm) resetForm.classList.add('hidden')
  if (invalidMsg) invalidMsg.classList.remove('hidden')
}

async function init() {
  const { data } = await supabase.auth.initialize()
  const hashParams = new URLSearchParams(window.location.hash?.slice(1) || '')
  const type = hashParams.get('type')

  if (type === 'recovery') {
    showForm()
    return
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    showForm()
    return
  }

  showInvalid()
}

supabase.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') showForm()
})

window.submitNewPassword = async function () {
  const password = document.getElementById('password')?.value
  const passwordConfirm = document.getElementById('passwordConfirm')?.value
  const btn = document.getElementById('submitBtn')
  if (!password || password.length < 6) {
    alert('Please enter a password of at least 6 characters.')
    return
  }
  if (password !== passwordConfirm) {
    alert('Passwords do not match.')
    return
  }
  if (!btn) return
  btn.disabled = true
  btn.textContent = 'Updating…'
  try {
    await updatePassword(password)
    resetForm.classList.add('hidden')
    successMsg.classList.remove('hidden')
  } catch (e) {
    alert(e?.message || 'Failed to update password.')
  } finally {
    btn.disabled = false
    btn.textContent = 'Update password'
  }
}

init()
