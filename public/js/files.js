import { supabase } from './supabaseClient.js'
import { listNotes, getAuthHeaders, getNoteForEdit, deleteNote } from './collaborative.js'

export async function uploadFile(e) {
  e.preventDefault()

  const file = document.getElementById('fileInput').files[0]
  const expiryRaw = document.getElementById('fileExpiry').value
  const password = document.getElementById('filePassword')?.value || null

  if (!file || !expiryRaw) {
    alert('File and expiry are required')
    return
  }

  const expires_at = new Date(expiryRaw).toISOString()
  const maxExpiry = Date.now() + 10 * 60 * 60 * 1000
  if (new Date(expiryRaw).getTime() > maxExpiry) {
    alert('Maximum expiry is 10 hours')
    return
  }

  /* =====================
     AUTH SESSION
  ===================== */
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession()

  if (sessionError || !sessionData.session) {
    alert('Login required')
    return
  }

  const user = sessionData.session.user

  /* =====================
     DIRECT SUPABASE UPLOAD
  ===================== */
  const storagePath =
    `uploads/${user.id}/${Date.now()}-${file.name}`

  const { error: uploadError } = await supabase.storage
    .from('vault')
    .upload(storagePath, file, {
      upsert: false
    })

  if (uploadError) {
    alert(uploadError.message)
    return
  }

  /* =====================
     REGISTER FILE (BACKEND)
  ===================== */
  const res = await fetch('/.netlify/functions/registerFile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionData.session.access_token}`
    },
    body: JSON.stringify({
      storagePath,
      expires_at,
      password
    })
  })

  const result = await res.json()

  if (!res.ok || !result.url) {
    alert(result.error || 'Failed to generate download link')
    return
  }

  /* =====================
     SHOW DOWNLOAD LINK (short link + copy)
  ===================== */
  document.getElementById('downloadLink').value = result.url
  document.getElementById('uploadResult').classList.remove('hidden')

  try {
    const shortRes = await fetch('/.netlify/functions/createShortLink', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: result.url })
    })
    const shortData = await shortRes.json()
    if (shortRes.ok && shortData.shortUrl) {
      document.getElementById('downloadLink').value = shortData.shortUrl
    }
  } catch (_) {}
}

export async function copyDownloadLink() {
  const input = document.getElementById('downloadLink')
  const btn = document.getElementById('copyDownloadBtn')
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

/* =====================
   MY FILES LIST MESSAGE (no alert)
   ===================== */
function showFileListMessage(message) {
  const el = document.getElementById('fileListMessage')
  if (!el) return
  if (!message) {
    el.classList.add('hidden')
    el.textContent = ''
    return
  }
  el.textContent = message
  el.classList.remove('hidden')
}

/* =====================
   COLLABORATIVE NOTES (My Files)
   ===================== */
export async function loadCollaborativeNotes() {
  const listEl = document.getElementById('collabNotesList')
  if (!listEl) return

  const headers = await getAuthHeaders()
  if (!headers) {
    listEl.innerHTML = '<li class="px-4 sm:px-6 py-4 text-slate-500 text-center">Log in to see collaborative notes.</li>'
    return
  }

  const notes = await listNotes()
  if (!notes.length) {
    listEl.innerHTML = '<li class="px-4 sm:px-6 py-8 text-slate-400 text-center">No collaborative notes. <a href="notes-list.html" class="text-amber-400 hover:text-amber-300">Go to Collaborative Notes</a></li>'
    return
  }

  const now = new Date()
  listEl.innerHTML = notes.map((n) => {
    const label = n.role === 'owner' ? 'Owner' : n.invited ? 'Invitation' : 'Shared with you'
    const labelClass = n.role === 'owner' ? 'text-amber-400' : n.invited ? 'text-emerald-400' : 'text-slate-400'
    const title = escapeHtml((n.content ?? '').slice(0, 60) || 'Untitled note')
    const dateStr = n.updated_at || n.created_at ? formatDate(n.updated_at || n.created_at) : ''
    const expiresAt = n.expires_at ? new Date(n.expires_at) : null
    const expired = expiresAt && expiresAt <= now
    const expiryStr = expiresAt ? expiresAt.toLocaleString() : '—'
    const expBadge = expired ? ' <span class="text-slate-500">(expired)</span>' : ''
    const isOwner = n.role === 'owner'
    const deleteBtn = isOwner
      ? `<button type="button" onclick="window.deleteCollaborativeNote('${n.id}')" class="rounded-lg bg-red-600/80 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-600">Delete</button>`
      : ''
    return `<li class="border-b border-slate-800 px-4 sm:px-6 py-4 flex flex-wrap items-center gap-3 last:border-b-0" data-note-id="${n.id}">
        <span class="shrink-0 flex h-10 w-10 items-center justify-center rounded-lg ${n.invited ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'} text-lg">📝</span>
        <div class="min-w-0 flex-1">
          <span class="font-medium text-white block truncate">${title}${expBadge}</span>
          <span class="text-slate-500 text-sm"><span class="${labelClass} font-medium">${escapeHtml(label)}</span>${dateStr ? ' · ' + dateStr : ''} · Expires: ${expiryStr}</span>
        </div>
        <div class="flex gap-2">
          <a href="note-edit.html?id=${encodeURIComponent(n.id)}" class="rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-600 inline-block">View</a>
          <button type="button" onclick="window.downloadCollaborativeNote('${n.id}')" class="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-slate-900 transition hover:bg-amber-500">Download</button>
          ${deleteBtn}
        </div>
      </li>`
  }).join('')
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'short' })
}

/* =====================
   MY FILES LIST
   ===================== */
async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data?.session) return null
  return data.session
}

export async function loadFileList() {
  const listEl = document.getElementById('fileList')
  if (!listEl) return

  showFileListMessage(null)

  const session = await getSession()
  if (!session) {
    window.location.href = 'login.html'
    return
  }

  const res = await fetch('/.netlify/functions/listFiles', {
    headers: { Authorization: `Bearer ${session.access_token}` }
  })

  if (!res.ok) {
    if (res.status === 401) {
      window.location.href = 'login.html'
      return
    }
    const err = await res.json().catch(() => ({}))
    const msg = res.status === 403 ? (err.error || 'Account is disabled') : 'Failed to load files'
    listEl.innerHTML = `<li class="border-b border-slate-800 px-6 py-4 text-red-400">${escapeHtml(msg)}</li>`
    return
  }

  const files = await res.json()
  if (!Array.isArray(files) || !files.length) {
    listEl.innerHTML = '<li class="border-b border-slate-800 px-6 py-8 text-slate-400 text-center">No files yet. <a href="upload.html" class="text-amber-400 hover:text-amber-300">Upload one</a></li>'
    return
  }

  listEl.innerHTML = files.map(f => {
    const exp = f.expired ? ' <span class="text-slate-500">(expired)</span>' : ''
    const lock = f.is_protected ? ' <span class="text-amber-400">🔒</span>' : ''
    const expiryStr = new Date(f.expires_at).toLocaleString()
    const nameAttr = escapeHtml(f.name).replace(/"/g, '&quot;')
    const disabled = f.expired ? ' disabled' : ''
    return `<li class="border-b border-slate-800 px-6 py-4 flex flex-wrap items-center gap-3 last:border-b-0" data-file-id="${f.id}">
        <span class="flex-1 min-w-0 font-medium text-white truncate">${escapeHtml(f.name)}${lock}${exp}</span>
        <span class="text-sm text-slate-500">Expires: ${expiryStr}</span>
        <div class="flex gap-2">
          <button type="button" data-file-name="${nameAttr}" onclick="window.viewFile('${f.id}', ${f.is_protected}, this.getAttribute('data-file-name'))"${disabled} class="rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed">View</button>
          <button type="button" data-file-name="${nameAttr}" onclick="window.downloadFile('${f.id}', ${f.is_protected}, this.getAttribute('data-file-name'))"${disabled} class="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-slate-900 transition hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed">Download</button>
          <button type="button" onclick="window.deleteFile('${f.id}')" class="rounded-lg bg-red-600/80 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-600">Delete</button>
        </div>
      </li>`
  }).join('')
}

function escapeHtml(s) {
  const div = document.createElement('div')
  div.textContent = s
  return div.innerHTML
}

let pendingDownloadFileId = null
let pendingAction = null   // 'view' | 'download'
let pendingFilename = null

function triggerFileDownload(url, filename) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename || 'download'
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  if (url.startsWith('blob:')) URL.revokeObjectURL(url)
}

export async function submitFilePassword() {
  const modal = document.getElementById('passwordModal')
  const input = document.getElementById('filePassword')
  if (!pendingDownloadFileId || !input) return

  const session = await getSession()
  if (!session) return

  const res = await fetch('/.netlify/functions/downloadFile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ fileId: pendingDownloadFileId, password: input.value })
  })

  const data = await res.json()

  if (res.ok && data.url) {
    modal.classList.add('hidden')
    input.value = ''
    const fileId = pendingDownloadFileId
    const action = pendingAction
    const filename = pendingFilename
    pendingDownloadFileId = null
    pendingAction = null
    pendingFilename = null
    showFileListMessage(null)

    if (action === 'download') {
      try {
        const blobRes = await fetch(data.url, { mode: 'cors' })
        const blob = await blobRes.blob()
        const blobUrl = URL.createObjectURL(blob)
        triggerFileDownload(blobUrl, filename || 'download')
      } catch {
        window.open(data.url, '_blank')
        showFileListMessage('Opened in new tab. Use browser Save to download if needed.')
      }
    } else {
      window.open(data.url, '_blank')
    }
    return
  }

  const msg = res.status === 410 ? 'This file has expired and can no longer be downloaded.' : (data.error || 'Invalid password')
  modal.classList.add('hidden')
  input.value = ''
  pendingDownloadFileId = null
  pendingAction = null
  pendingFilename = null
  showFileListMessage(msg)
}

async function getSignedUrl(fileId) {
  const session = await getSession()
  if (!session) return null
  const res = await fetch('/.netlify/functions/downloadFile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ fileId, password: null })
  })
  const data = await res.json()
  if (!res.ok) return { error: res.status === 410 ? 'This file has expired and can no longer be accessed.' : (data.error || 'Failed to get link') }
  return { url: data.url }
}

export async function viewFile(fileId, isProtected, filename) {
  const session = await getSession()
  if (!session) {
    window.location.href = 'login.html'
    return
  }
  showFileListMessage(null)

  if (isProtected) {
    pendingDownloadFileId = fileId
    pendingAction = 'view'
    pendingFilename = filename
    const hint = document.getElementById('passwordModalActionHint')
    if (hint) hint.textContent = 'Enter password to view this file.'
    document.getElementById('passwordModal').classList.remove('hidden')
    document.getElementById('filePassword').value = ''
    return
  }

  const result = await getSignedUrl(fileId)
  if (result.error) {
    showFileListMessage(result.error)
    return
  }
  window.open(result.url, '_blank')
}

export async function downloadFile(fileId, isProtected, filename) {
  const session = await getSession()
  if (!session) {
    window.location.href = 'login.html'
    return
  }
  showFileListMessage(null)

  if (isProtected) {
    pendingDownloadFileId = fileId
    pendingAction = 'download'
    pendingFilename = filename
    const hint = document.getElementById('passwordModalActionHint')
    if (hint) hint.textContent = 'Enter password to download this file.'
    document.getElementById('passwordModal').classList.remove('hidden')
    document.getElementById('filePassword').value = ''
    return
  }

  const result = await getSignedUrl(fileId)
  if (result.error) {
    showFileListMessage(result.error)
    return
  }
  try {
    const blobRes = await fetch(result.url, { mode: 'cors' })
    const blob = await blobRes.blob()
    const blobUrl = URL.createObjectURL(blob)
    triggerFileDownload(blobUrl, filename || 'download')
  } catch {
    window.open(result.url, '_blank')
    showFileListMessage('Opened in new tab. Use browser Save to download if needed.')
  }
}

export async function deleteFile(fileId) {
  if (!confirm('Delete this file? This cannot be undone.')) return

  const session = await getSession()
  if (!session) return

  const res = await fetch('/.netlify/functions/deleteFile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ fileId })
  })

  if (res.ok) {
    loadFileList()
  } else {
    const data = await res.json()
    alert(data.error || 'Failed to delete')
  }
}

/* =====================
   COLLABORATIVE NOTES ACTIONS (My Files)
   ===================== */
export async function downloadCollaborativeNote(noteId) {
  showFileListMessage(null)
  const note = await getNoteForEdit(noteId)
  if (!note || note.content == null) {
    showFileListMessage('Could not load note content.')
    return
  }
  const blob = new Blob([note.content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const filename = `note-${noteId.slice(0, 8)}.txt`
  triggerFileDownload(url, filename)
  showFileListMessage(null)
}

export async function deleteCollaborativeNote(noteId) {
  if (!confirm('Delete this note? This cannot be undone.')) return
  showFileListMessage(null)
  const result = await deleteNote(noteId)
  if (result.ok) {
    loadCollaborativeNotes()
  } else {
    showFileListMessage(result.error || 'Failed to delete note')
  }
}
