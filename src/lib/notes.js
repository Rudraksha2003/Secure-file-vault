import { supabase } from './supabase'
import { validateEmail } from './validation'

export async function getNotesAuthHeaders() {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) return null
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

/** List collaborative notes for the current user. */
export async function listNotes() {
  const headers = await getNotesAuthHeaders()
  if (!headers) return []
  const res = await fetch('/.netlify/functions/listNotes', { method: 'GET', headers })
  const data = await res.json()
  if (!res.ok) return []
  return data.notes || []
}

/** Create a new collaborative note. expiresAt: Date or ISO string; password: string or null. Returns note id or null. */
export async function createCollaborativeNote(expiresAt, password = null) {
  const headers = await getNotesAuthHeaders()
  if (!headers) return null
  const expires_at = expiresAt instanceof Date ? expiresAt.toISOString() : (expiresAt || null)
  const res = await fetch('/.netlify/functions/createNote', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      content: '',
      expires_at,
      password: password && String(password).trim() ? String(password).trim() : null,
      is_collaborative: true,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to create note')
  return data.id
}

/** Load a note for editing. Returns { content, role, ... } or null. */
export async function getNoteForEdit(noteId) {
  const headers = await getNotesAuthHeaders()
  if (!headers) return null
  const res = await fetch('/.netlify/functions/getNoteForEdit', {
    method: 'POST',
    headers,
    body: JSON.stringify({ noteId }),
  })
  const data = await res.json()
  if (!res.ok) return null
  return data
}

/** Save note content. */
export async function updateNoteContent(noteId, content) {
  const headers = await getNotesAuthHeaders()
  if (!headers) return false
  const res = await fetch('/.netlify/functions/updateNote', {
    method: 'POST',
    headers,
    body: JSON.stringify({ noteId, content }),
  })
  return res.ok
}

/** Share note by email (owner only). */
export async function shareNoteByEmail(noteId, email) {
  const emailCheck = validateEmail(typeof email === 'string' ? email.trim() : '')
  if (!emailCheck.valid) return { ok: false, error: emailCheck.error }
  const headers = await getNotesAuthHeaders()
  if (!headers) return { ok: false, error: 'Not logged in' }
  const res = await fetch('/.netlify/functions/shareNote', {
    method: 'POST',
    headers,
    body: JSON.stringify({ noteId, email: emailCheck.value }),
  })
  const text = await res.text()
  let data = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    return { ok: false, error: 'Server error. Try again.' }
  }
  return { ok: res.ok, error: data.error, message: data.message }
}

/** List pending invite emails (owner only). */
export async function getNoteInvites(noteId) {
  const headers = await getNotesAuthHeaders()
  if (!headers) return []
  const res = await fetch('/.netlify/functions/getNoteInvites', {
    method: 'POST',
    headers,
    body: JSON.stringify({ noteId }),
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

/** Delete a collaborative note (owner only). */
export async function deleteNote(noteId) {
  const headers = await getNotesAuthHeaders()
  if (!headers) return { ok: false, error: 'Not logged in' }
  const res = await fetch('/.netlify/functions/deleteNote', {
    method: 'POST',
    headers,
    body: JSON.stringify({ noteId }),
  })
  const data = await res.json()
  if (!res.ok) return { ok: false, error: data.error || 'Failed to delete note' }
  return { ok: true }
}

const REALTIME_BROADCAST_EVENT = 'content_updated'
const CURSOR_THROTTLE_MS = 150

/**
 * Subscribe to realtime presence and broadcast for a note.
 * - onContentUpdated: () => void — called when another user saved; refetch content.
 * - onPresenceChange: (presences: Array<{ user_id, email?, cursorOffset? }>) => void
 * Returns { unsubscribe, broadcastContentUpdated, trackCursor }.
 */
export function subscribeNoteRealtime(noteId, currentUserId, currentUserEmail, onContentUpdated, onPresenceChange) {
  const channelName = `note:${noteId}`
  const channel = supabase.channel(channelName)

  let lastPresence = {
    user_id: currentUserId,
    email: currentUserEmail || undefined,
    online_at: new Date().toISOString(),
    cursorOffset: 0,
  }

  channel
    .on('broadcast', { event: REALTIME_BROADCAST_EVENT }, () => {
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
              cursorOffset: p.cursorOffset != null ? p.cursorOffset : 0,
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
      online_at: new Date().toISOString(),
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
      event: REALTIME_BROADCAST_EVENT,
      payload: {},
    })
  }

  function unsubscribe() {
    supabase.removeChannel(channel)
  }

  return { unsubscribe, broadcastContentUpdated, trackCursor }
}
