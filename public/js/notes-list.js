import { listNotes, createCollaborativeNote, getAuthHeaders } from './collaborative.js'
import { supabase } from './supabaseClient.js'

async function ensureAuth() {
  const headers = await getAuthHeaders()
  if (!headers) {
    window.location.href = 'login.html'
    return false
  }
  return true
}

function showMessage(msg, isError = false) {
  const el = document.getElementById('notesMessage')
  if (!el) return
  el.textContent = msg
  el.className = isError
    ? 'rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-red-200 text-sm mb-4'
    : 'rounded-xl border border-amber-900/50 bg-amber-950/40 px-4 py-3 text-amber-200 text-sm mb-4'
  el.classList.remove('hidden')
}

function renderNotes(notes) {
  const list = document.getElementById('notesList')
  if (!list) return

  if (!notes.length) {
    list.innerHTML = '<li class="px-6 py-8 text-slate-400 text-center">No collaborative notes yet. Create one with “New note”.</li>'
    return
  }

  list.innerHTML = notes
    .map(
      (n) => {
        const label = n.role === 'owner' ? 'Owner' : n.invited ? 'Invitation — open to accept' : 'Shared with you'
        return `
    <li class="border-b border-slate-800 last:border-b-0">
      <a href="note-edit.html?id=${encodeURIComponent(n.id)}" class="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4 transition hover:bg-slate-800/50 active:bg-slate-800/50 block touch-manipulation">
        <span class="shrink-0 flex h-10 w-10 items-center justify-center rounded-lg ${n.invited ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'} text-lg">📝</span>
        <div class="min-w-0 flex-1">
          <span class="font-medium text-white block truncate">${escapeHtml((n.content ?? '').slice(0, 80) || 'Untitled note')}</span>
          <span class="text-slate-500 text-sm">${label} · ${formatDate(n.updated_at || n.created_at)}</span>
        </div>
        <span class="shrink-0 text-slate-500">→</span>
      </a>
    </li>
  `
      }
    )
    .join('')
}

function escapeHtml(s) {
  if (s == null) return ''
  const div = document.createElement('div')
  div.textContent = String(s)
  return div.innerHTML
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { dateStyle: 'short' })
}

async function loadNotes() {
  const list = document.getElementById('notesList')
  if (!list) return
  list.innerHTML = '<li class="border-b border-slate-800 px-6 py-4 text-slate-400">Loading…</li>'

  const notes = await listNotes()
  renderNotes(notes)
}

function openNewNoteModal() {
  document.getElementById('newNoteModal')?.classList.remove('hidden')
  document.getElementById('newNoteFormError')?.classList.add('hidden')
  const expiry = document.getElementById('newNoteExpiry')
  if (expiry) {
    const now = new Date()
    const in10h = new Date(now.getTime() + 10 * 60 * 60 * 1000)
    expiry.min = now.toISOString().slice(0, 16)
    expiry.max = in10h.toISOString().slice(0, 16)
    expiry.value = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16)
  }
}

function closeNewNoteModal() {
  document.getElementById('newNoteModal')?.classList.add('hidden')
}

async function handleNewNoteSubmit(e) {
  e.preventDefault()
  const expiryEl = document.getElementById('newNoteExpiry')
  const passwordEl = document.getElementById('newNotePassword')
  const errorEl = document.getElementById('newNoteFormError')
  const btn = document.getElementById('newNoteSubmitBtn')
  if (!expiryEl?.value) {
    if (errorEl) {
      errorEl.textContent = 'Expiry is required.'
      errorEl.classList.remove('hidden')
    }
    return
  }
  const expiresAt = new Date(expiryEl.value)
  const maxExpiry = Date.now() + 10 * 60 * 60 * 1000
  if (expiresAt.getTime() > maxExpiry) {
    if (errorEl) {
      errorEl.textContent = 'Expiry cannot exceed 10 hours from now.'
      errorEl.classList.remove('hidden')
    }
    return
  }
  if (expiresAt.getTime() <= Date.now()) {
    if (errorEl) {
      errorEl.textContent = 'Expiry must be in the future.'
      errorEl.classList.remove('hidden')
    }
    return
  }
  if (errorEl) errorEl.classList.add('hidden')
  if (btn) btn.disabled = true
  try {
    const password = passwordEl?.value?.trim() || null
    const id = await createCollaborativeNote(expiresAt, password)
    if (id) window.location.href = `note-edit.html?id=${id}`
  } finally {
    if (btn) btn.disabled = false
  }
}

async function init() {
  const ok = await ensureAuth()
  if (!ok) return

  document.getElementById('newNoteBtn')?.addEventListener('click', openNewNoteModal)
  document.getElementById('newNoteCancelBtn')?.addEventListener('click', closeNewNoteModal)
  document.getElementById('newNoteForm')?.addEventListener('submit', handleNewNoteSubmit)
  await loadNotes()
}

init()
