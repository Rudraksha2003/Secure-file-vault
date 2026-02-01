import {
  getNoteForEdit,
  updateNoteContent,
  shareNoteByEmail,
  getNoteInvites,
  subscribeNoteRealtime,
  debounce,
  SAVE_DEBOUNCE,
  getAuthHeaders
} from './collaborative.js'
import { supabase } from './supabaseClient.js'

let noteId = null
let unsubscribeRealtime = null
let lastSavedContent = ''

function showLoading(show) {
  const el = document.getElementById('loadingBox')
  const editor = document.getElementById('editorBox')
  const err = document.getElementById('errorBox')
  if (el) el.classList.toggle('hidden', !show)
  if (editor) editor.classList.toggle('hidden', show)
  if (err) err.classList.add('hidden')
}

function showError(msg) {
  showLoading(false)
  const box = document.getElementById('errorBox')
  const text = document.getElementById('errorMessage')
  if (box && text) {
    text.textContent = msg
    box.classList.remove('hidden')
  }
}

function setSaveStatus(text) {
  const el = document.getElementById('saveStatus')
  if (el) el.textContent = text
}

let lastPresences = []
function setPresence(presences) {
  lastPresences = presences || []
  const el = document.getElementById('presenceList')
  if (!el) return
  if (!presences.length) {
    el.textContent = ''
    updateCursorOverlay([])
    return
  }
  const names = presences.map((p) => p.email || p.user_id?.slice(0, 8) || 'Someone')
  el.textContent = `· ${names.join(', ')} viewing`
  updateCursorOverlay(presences)
}

async function saveContent() {
  if (!noteId) return
  const textarea = document.getElementById('noteContent')
  const content = textarea?.value ?? ''
  if (content === lastSavedContent) return

  setSaveStatus('Saving…')
  const ok = await updateNoteContent(noteId, content)
  if (ok) {
    lastSavedContent = content
    setSaveStatus('Saved')
    if (typeof window._broadcastContentUpdated === 'function') window._broadcastContentUpdated()
  } else {
    setSaveStatus('Save failed')
  }
}

async function refetchContent() {
  if (!noteId) return
  const note = await getNoteForEdit(noteId)
  if (!note) return
  const textarea = document.getElementById('noteContent')
  if (textarea) {
    const before = textarea.value
    textarea.value = note.content ?? ''
    lastSavedContent = note.content ?? ''
    if (before !== textarea.value) setSaveStatus('Updated')
  }
}

async function init() {
  const headers = await getAuthHeaders()
  if (!headers) {
    window.location.href = 'login.html'
    return
  }

  noteId = new URLSearchParams(location.search).get('id')
  if (!noteId) {
    showError('Invalid link: missing note id')
    return
  }

  showLoading(true)
  const note = await getNoteForEdit(noteId)
  if (!note) {
    showError('Note not found or you don’t have access.')
    return
  }

  const textarea = document.getElementById('noteContent')
  if (textarea) {
    textarea.value = note.content ?? ''
    lastSavedContent = note.content ?? ''
  }

  const { data: sessionData } = await supabase.auth.getSession()
  const user = sessionData?.session?.user
  const userId = user?.id
  const userEmail = user?.email

  showLoading(false)
  document.getElementById('editorBox')?.classList.remove('hidden')

  const isOwner = note.role === 'owner'
  document.getElementById('shareBtn')?.classList.toggle('hidden', !isOwner)

  const debouncedSave = debounce(saveContent, SAVE_DEBOUNCE)
  textarea?.addEventListener('input', () => {
    setSaveStatus('Unsaved')
    debouncedSave()
  })

  const realtime = subscribeNoteRealtime(
    noteId,
    userId,
    userEmail,
    refetchContent,
    setPresence
  )
  unsubscribeRealtime = realtime.unsubscribe
  window._broadcastContentUpdated = realtime.broadcastContentUpdated
  const trackCursor = realtime.trackCursor

  const cursorMirror = document.getElementById('cursorMirror')
  const cursorOverlay = document.getElementById('cursorOverlay')

  function escapeHtmlForMirror(s) {
    if (s == null) return ''
    const div = document.createElement('div')
    div.textContent = String(s)
    return div.innerHTML
  }

  function getCursorPosition(content, cursorOffset) {
    if (!cursorMirror || !textarea) return null
    const text = content ?? ''
    const offset = Math.min(Math.max(0, cursorOffset), text.length)
    const char = text[offset] || '\u200b'
    const before = escapeHtmlForMirror(text.slice(0, offset))
    const after = escapeHtmlForMirror(text.slice(offset + 1))
    cursorMirror.innerHTML = before + '<span data-cursor-pos>' + escapeHtmlForMirror(char) + '</span>' + after
    const span = cursorMirror.querySelector('[data-cursor-pos]')
    if (!span) return null
    return { left: span.offsetLeft, top: span.offsetTop }
  }

  function updateCursorOverlay(presences) {
    if (!cursorOverlay || !textarea) return
    const content = textarea.value

    if (cursorMirror) {
      const cs = getComputedStyle(textarea)
      cursorMirror.style.position = 'absolute'
      cursorMirror.style.left = '0'
      cursorMirror.style.top = '0'
      cursorMirror.style.width = textarea.offsetWidth + 'px'
      cursorMirror.style.minHeight = textarea.offsetHeight + 'px'
      cursorMirror.style.padding = cs.padding
      cursorMirror.style.fontSize = cs.fontSize
      cursorMirror.style.fontFamily = cs.fontFamily
      cursorMirror.style.lineHeight = cs.lineHeight
      cursorMirror.style.boxSizing = cs.boxSizing
    }

    const padLeft = parseFloat(getComputedStyle(textarea).paddingLeft) || 0
    const padTop = parseFloat(getComputedStyle(textarea).paddingTop) || 0

    const existing = cursorOverlay.querySelectorAll('[data-remote-cursor]')
    existing.forEach((el) => el.remove())

    presences.forEach((p) => {
      const pos = getCursorPosition(content, p.cursorOffset ?? 0)
      if (!pos) return
      const label = document.createElement('div')
      label.setAttribute('data-remote-cursor', p.user_id)
      label.className = 'absolute px-2 py-0.5 rounded text-xs font-medium text-white whitespace-nowrap shadow-lg border pointer-events-none z-10'
      label.style.left = (padLeft + pos.left - textarea.scrollLeft) + 'px'
      label.style.top = (padTop + pos.top - textarea.scrollTop) + 'px'
      label.style.minHeight = '20px'
      const hue = hashUserId(p.user_id)
      label.style.backgroundColor = `hsl(${hue}, 70%, 45%)`
      label.style.borderColor = `hsl(${hue}, 70%, 35%)`
      label.textContent = p.email || p.user_id?.slice(0, 8) || 'Someone'
      cursorOverlay.appendChild(label)
    })
  }

  function hashUserId(id) {
    let h = 0
    if (!id) return 200
    for (let i = 0; i < id.length; i++) h = ((h << 5) - h) + id.charCodeAt(i) | 0
    return Math.abs(h) % 360
  }

  textarea?.addEventListener('input', () => {
    if (typeof trackCursor === 'function') trackCursor(textarea.selectionStart)
    updateCursorOverlay(lastPresences)
  })
  textarea?.addEventListener('click', () => {
    if (typeof trackCursor === 'function') trackCursor(textarea.selectionStart)
    setTimeout(() => updateCursorOverlay(lastPresences), 0)
  })
  textarea?.addEventListener('keyup', () => {
    if (typeof trackCursor === 'function') trackCursor(textarea.selectionStart)
    updateCursorOverlay(lastPresences)
  })
  textarea?.addEventListener('scroll', () => updateCursorOverlay(lastPresences))
  textarea?.addEventListener('focus', () => {
    if (typeof trackCursor === 'function') trackCursor(textarea.selectionStart)
  })
  if (typeof trackCursor === 'function') trackCursor(textarea?.selectionStart ?? 0)

  const shareLinkInput = document.getElementById('shareLink')
  const shareLinkUrl = window.location.origin + window.location.pathname + '?id=' + encodeURIComponent(noteId)

  async function loadPendingInvites() {
    const container = document.getElementById('sharePendingInvites')
    const list = document.getElementById('sharePendingList')
    if (!container || !list) return
    const invites = await getNoteInvites(noteId)
    if (!invites.length) {
      container.classList.add('hidden')
      list.innerHTML = ''
      return
    }
    container.classList.remove('hidden')
    list.innerHTML = invites
      .map(
        (inv) => {
          const safeEmail = escapeHtml(inv.email ?? '')
          return `
    <li class="flex items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2">
      <span class="text-slate-300 truncate min-w-0">${safeEmail}</span>
      <button type="button" class="shareCopyLinkBtn shrink-0 rounded-lg border border-slate-600 bg-slate-700 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-600 touch-manipulation">Copy link</button>
    </li>
  `
        }
      )
      .join('')
    list.querySelectorAll('.shareCopyLinkBtn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(shareLinkUrl)
          const orig = btn.textContent
          btn.textContent = 'Copied!'
          setTimeout(() => { btn.textContent = orig }, 2000)
        } catch (_) {
          shareLinkInput?.select()
        }
      })
    })
  }

  function escapeHtml(s) {
    if (s == null) return ''
    const div = document.createElement('div')
    div.textContent = String(s)
    return div.innerHTML
  }

  document.getElementById('shareBtn')?.addEventListener('click', async () => {
    document.getElementById('shareModal')?.classList.remove('hidden')
    document.getElementById('shareFeedback')?.classList.add('hidden')
    document.getElementById('shareEmail').value = ''
    if (shareLinkInput) shareLinkInput.value = shareLinkUrl
    await loadPendingInvites()
  })

  document.getElementById('shareCloseBtn')?.addEventListener('click', () => {
    document.getElementById('shareModal')?.classList.add('hidden')
  })

  document.getElementById('shareCopyBtn')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(shareLinkUrl)
      const btn = document.getElementById('shareCopyBtn')
      if (btn) {
        const orig = btn.textContent
        btn.textContent = 'Copied!'
        setTimeout(() => { btn.textContent = orig }, 2000)
      }
    } catch (_) {
      if (shareLinkInput) shareLinkInput.select()
    }
  })

  document.getElementById('shareInviteBtn')?.addEventListener('click', async () => {
    const input = document.getElementById('shareEmail')
    const feedback = document.getElementById('shareFeedback')
    const email = input?.value?.trim()
    if (!email) {
      if (feedback) {
        feedback.textContent = 'Enter an email address.'
        feedback.className = 'text-sm text-amber-400 mb-2'
        feedback.classList.remove('hidden')
      }
      return
    }
    const result = await shareNoteByEmail(noteId, email)
    if (feedback) {
      feedback.textContent = result.ok ? (result.message || 'Done.') : (result.error || 'Failed')
      feedback.className = result.ok ? 'text-sm text-green-400 mb-2' : 'text-sm text-red-400 mb-2'
      feedback.classList.remove('hidden')
    }
  })
}

init()

window.addEventListener('beforeunload', () => {
  if (unsubscribeRealtime) unsubscribeRealtime()
})
