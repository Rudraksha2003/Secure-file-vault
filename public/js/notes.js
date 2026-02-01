import { supabase } from './supabaseClient.js'

export async function createNote(e) {
  e.preventDefault()

  const content = document.getElementById('content').value
  const password = document.getElementById('password').value || null
  const expiryInput = document.getElementById('expiry').value

  if (!expiryInput) return alert('Expiry is required')

  const expiresAt = new Date(expiryInput)
  const max = Date.now() + 12 * 60 * 60 * 1000
  if (expiresAt.getTime() > max)
    return alert('Maximum expiry is 12 hours')

  const res = await fetch('/.netlify/functions/createNote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content,
      password,
      expires_at: expiresAt.toISOString()
    })
  })

  const data = await res.json()
  if (!res.ok) return alert(data.error)

  const longUrl = `${window.location.origin}/view.html?id=${data.id}`
  document.getElementById('shareLink').value = longUrl
  document.getElementById('result').classList.remove('hidden')

  try {
    const shortRes = await fetch('/.netlify/functions/createShortLink', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: longUrl })
    })
    const shortData = await shortRes.json()
    if (shortRes.ok && shortData.shortUrl) {
      document.getElementById('shareLink').value = shortData.shortUrl
    }
  } catch (_) {}
}

export async function copyShareLink() {
  const input = document.getElementById('shareLink')
  const btn = document.getElementById('copyShareBtn')
  if (!input?.value) return
  try {
    await navigator.clipboard.writeText(input.value)
    if (btn) {
      btn.textContent = 'Copied!'
      setTimeout(() => { btn.textContent = 'Copy' }, 2000)
    }
  } catch {
    if (btn) btn.textContent = 'Failed'
    setTimeout(() => { if (btn) btn.textContent = 'Copy' }, 2000)
  }
}

function showNoteError(message) {
  const errBox = document.getElementById('noteErrorBox')
  const errMsg = document.getElementById('noteErrorMessage')
  if (errBox && errMsg) {
    errMsg.textContent = message
    errBox.classList.remove('hidden')
    document.getElementById('loadingBox')?.classList.add('hidden')
    document.getElementById('passwordBox')?.classList.add('hidden')
    document.getElementById('noteBox')?.classList.add('hidden')
  }
}

export async function loadNote() {
  const noteId = new URLSearchParams(location.search).get('id')
  const loadingBox = document.getElementById('loadingBox')
  const passwordBox = document.getElementById('passwordBox')
  const noteBox = document.getElementById('noteBox')
  const errorBox = document.getElementById('noteErrorBox')

  if (!noteId) {
    showNoteError('Invalid link: missing note id')
    return
  }

  const password = document.getElementById('notePassword')?.value || null

  const res = await fetch('/.netlify/functions/getNote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ noteId, password })
  })

  const data = await res.json()

  loadingBox?.classList.add('hidden')
  errorBox?.classList.add('hidden')

  if (res.status === 401) {
    passwordBox?.classList.remove('hidden')
    noteBox?.classList.add('hidden')
    return
  }

  if (!res.ok) {
    const message = res.status === 404 ? 'Note not found' : res.status === 410 ? 'This note has expired' : (data.error || 'Something went wrong')
    showNoteError(message)
    return
  }

  passwordBox?.classList.add('hidden')
  document.getElementById('noteContent').textContent = data.content
  noteBox?.classList.remove('hidden')
}

export function downloadNoteAsText() {
  const el = document.getElementById('noteContent')
  if (!el || !el.textContent) return
  const text = el.textContent
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'secure-note.txt'
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
