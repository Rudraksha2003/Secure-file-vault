/**
 * View shared file by id. Prompts for password when required, then redirects to signed URL.
 */

async function resolveFile(fileId, password = null) {
  const res = await fetch('/.netlify/functions/resolveFileLink', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId, password })
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

function showError(message) {
  const box = document.getElementById('errorBox')
  const msg = document.getElementById('errorMessage')
  msg.textContent = message
  box.classList.remove('hidden')
  document.getElementById('loadingBox').classList.add('hidden')
  document.getElementById('passwordBox').classList.add('hidden')
}

function showPasswordPrompt() {
  document.getElementById('loadingBox').classList.add('hidden')
  document.getElementById('errorBox').classList.add('hidden')
  document.getElementById('passwordBox').classList.remove('hidden')
  document.getElementById('fileError').classList.add('hidden')
}

function showFileError(message) {
  document.getElementById('fileError').textContent = message
  document.getElementById('fileError').classList.remove('hidden')
}

async function loadFile() {
  const fileId = new URLSearchParams(location.search).get('id')
  if (!fileId) {
    showError('Invalid link: missing file id')
    return
  }

  const { ok, status, data } = await resolveFile(fileId)

  if (ok && data.url) {
    window.location.href = data.url
    return
  }

  if (status === 401 && data.requiresPassword) {
    showPasswordPrompt()
    document.getElementById('unlockBtn').onclick = () => submitPassword(fileId)
    return
  }

  if (status === 403) {
    showPasswordPrompt()
    showFileError('Invalid password')
    document.getElementById('unlockBtn').onclick = () => submitPassword(fileId)
    return
  }

  if (status === 404) showError('File not found.')
  else if (status === 410) showError('This file has expired and is no longer available.')
  else showError(data.error || 'Something went wrong')
}

async function submitPassword(fileId) {
  const password = document.getElementById('filePassword').value
  if (!password) {
    showFileError('Enter the password')
    return
  }
  document.getElementById('fileError').classList.add('hidden')

  const { ok, status, data } = await resolveFile(fileId, password)

  if (ok && data.url) {
    window.location.href = data.url
    return
  }

  if (status === 403) {
    showFileError('Invalid password')
    return
  }
  if (status === 410) {
    showError('This file has expired and is no longer available.')
    return
  }
  showError(data.error || 'Something went wrong')
}

window.addEventListener('DOMContentLoaded', loadFile)
