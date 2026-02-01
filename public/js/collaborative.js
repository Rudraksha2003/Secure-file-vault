import { supabase } from './supabaseClient.js'

const SAVE_DEBOUNCE_MS = 1500
const BROADCAST_EVENT = 'content_updated'

/** Get auth token for API calls; returns null if not logged in. */
export async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) return null
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  }
}

/** Create a new collaborative note (requires login). expiresAt: Date or ISO string; password: string or null. */
export async function createCollaborativeNote(expiresAt, password = null) {
  const headers = await getAuthHeaders()
  if (!headers) {
    alert('Please log in to create a collaborative note.')
    window.location.href = 'login.html'
    return null
  }
  const expires_at = expiresAt instanceof Date ? expiresAt.toISOString() : (expiresAt || null)
  const res = await fetch('/.netlify/functions/createNote', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      content: '',
      expires_at,
      password: password && String(password).trim() ? String(password).trim() : null,
      is_collaborative: true
    })
  })
  const data = await res.json()
  if (!res.ok) {
    alert(data.error || 'Failed to create note')
    return null
  }
  return data.id
}

/** List collaborative notes for the current user. */
export async function listNotes() {
  const headers = await getAuthHeaders()
  if (!headers) return []
  const res = await fetch('/.netlify/functions/listNotes', {
    method: 'GET',
    headers
  })
  const data = await res.json()
  if (!res.ok) return []
  return data.notes || []
}

/** Load a note for editing (auth required; returns note or null). */
export async function getNoteForEdit(noteId) {
  const headers = await getAuthHeaders()
  if (!headers) return null
  const res = await fetch('/.netlify/functions/getNoteForEdit', {
    method: 'POST',
    headers,
    body: JSON.stringify({ noteId })
  })
  const data = await res.json()
  if (!res.ok) return null
  return data
}

/** Save note content (auth required). */
export async function updateNoteContent(noteId, content) {
  const headers = await getAuthHeaders()
  if (!headers) return false
  const res = await fetch('/.netlify/functions/updateNote', {
    method: 'POST',
    headers,
    body: JSON.stringify({ noteId, content })
  })
  const data = await res.json()
  return res.ok
}

/** Invite by email (owner only). Also used to resend: same email again sends the invite email. */
export async function shareNoteByEmail(noteId, email) {
  const headers = await getAuthHeaders()
  if (!headers) return { ok: false, error: 'Not logged in' }
  const res = await fetch('/.netlify/functions/shareNote', {
    method: 'POST',
    headers,
    body: JSON.stringify({ noteId, email: email.trim() })
  })
  const text = await res.text()
  let data = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    if (res.status === 504) return { ok: false, error: 'Request timed out. Try again or check RESEND_API_KEY and APP_URL in Netlify.' }
    return { ok: false, error: 'Server error. Try again.' }
  }
  return { ok: res.ok, error: data.error, message: data.message }
}

/** Delete a collaborative note (owner only). */
export async function deleteNote(noteId) {
  const headers = await getAuthHeaders()
  if (!headers) return { ok: false, error: 'Not logged in' }
  const res = await fetch('/.netlify/functions/deleteNote', {
    method: 'POST',
    headers,
    body: JSON.stringify({ noteId })
  })
  const data = await res.json()
  if (!res.ok) return { ok: false, error: data.error || 'Failed to delete note' }
  return { ok: true }
}

/** List pending invite emails for a note (owner only). */
export async function getNoteInvites(noteId) {
  const headers = await getAuthHeaders()
  if (!headers) return []
  const res = await fetch('/.netlify/functions/getNoteInvites', {
    method: 'POST',
    headers,
    body: JSON.stringify({ noteId })
  })
  const text = await res.text()
  let data = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    return []
  }
  if (!res.ok) return []
  return data.invites || []
}

const CURSOR_THROTTLE_MS = 150

/**
 * Subscribe to realtime updates and presence for a note.
 * - onContentUpdated: () => void — called when another user saved; refetch content.
 * - onPresenceChange: (presences: Array<{ user_id, email?, cursorOffset? }>) => void
 * Returns { unsubscribe, broadcastContentUpdated, trackCursor } so the same channel is used for sending.
 */
export function subscribeNoteRealtime(noteId, currentUserId, currentUserEmail, onContentUpdated, onPresenceChange) {
  const channelName = `note:${noteId}`
  const channel = supabase.channel(channelName)

  let lastPresence = {
    user_id: currentUserId,
    email: currentUserEmail || undefined,
    online_at: new Date().toISOString(),
    cursorOffset: 0
  }

  channel
    .on('broadcast', { event: BROADCAST_EVENT }, () => {
      onContentUpdated?.()
    })
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      const presences = []
      for (const key of Object.keys(state)) {
        for (const p of state[key] || []) {
          if (p.user_id && p.user_id !== currentUserId) {
            presences.push({
              user_id: p.user_id,
              email: p.email,
              cursorOffset: p.cursorOffset != null ? p.cursorOffset : 0
            })
          }
        }
      }
      onPresenceChange?.(presences)
    })
    .subscribe(async (status) => {
      if (status !== 'SUBSCRIBED') return
      await channel.track(lastPresence)
    })

  let cursorThrottle = null
  function trackCursor(cursorOffset) {
    lastPresence = {
      ...lastPresence,
      cursorOffset: Math.max(0, cursorOffset),
      online_at: new Date().toISOString()
    }
    if (cursorThrottle) return
    cursorThrottle = setTimeout(() => {
      cursorThrottle = null
      channel.track(lastPresence)
    }, CURSOR_THROTTLE_MS)
  }

  function broadcastContentUpdated() {
    channel.send({
      type: 'broadcast',
      event: BROADCAST_EVENT,
      payload: {}
    })
  }

  function unsubscribe() {
    supabase.removeChannel(channel)
  }

  return { unsubscribe, broadcastContentUpdated, trackCursor }
}

/** Debounced save helper. */
export function debounce(fn, ms) {
  let t
  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}

export const SAVE_DEBOUNCE = SAVE_DEBOUNCE_MS
