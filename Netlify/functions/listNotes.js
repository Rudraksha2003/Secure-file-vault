import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function handler(event) {
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const authHeader = event.headers.authorization
    if (!authHeader) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Login required' })
      }
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: authData } = await supabase.auth.getUser(token)
    const user = authData?.user
    if (!user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid or expired session' })
      }
    }

    // Notes where user is owner (and collaborative) or in note_collaborators
    const { data: owned } = await supabase
      .from('notes')
      .select('id, content, created_at, updated_at, is_collaborative, expires_at')
      .eq('owner_id', user.id)
      .eq('is_collaborative', true)
      .order('updated_at', { ascending: false })

    const { data: collabRows } = await supabase
      .from('note_collaborators')
      .select('note_id')
      .eq('user_id', user.id)

    const collabNoteIds = (collabRows || []).map((r) => r.note_id).filter(Boolean)

    // Notes where user has a pending invite (so they show up on dashboard and can open to accept)
    const userEmail = (user.email || '').toLowerCase().trim()
    let invitedNotes = []
    if (userEmail) {
      const { data: inviteRows } = await supabase
        .from('note_invites')
        .select('note_id')
        .eq('email', userEmail)
      const invitedNoteIds = (inviteRows || []).map((r) => r.note_id).filter(Boolean)
      if (invitedNoteIds.length > 0) {
        const { data: invited } = await supabase
          .from('notes')
          .select('id, content, created_at, updated_at, is_collaborative, expires_at')
          .in('id', invitedNoteIds)
          .eq('is_collaborative', true)
        invitedNotes = (invited || []).map((n) => ({ ...n, role: 'invited', invited: true }))
      }
    }

    const { data: shared } = collabNoteIds.length > 0
      ? await supabase
          .from('notes')
          .select('id, content, created_at, updated_at, is_collaborative, expires_at')
          .in('id', collabNoteIds)
          .order('updated_at', { ascending: false })
      : { data: [] }

    const ownedIds = new Set((owned || []).map((n) => n.id))
    const collabIds = new Set(collabNoteIds)
    const combined = [
      ...(owned || []).map((n) => ({ ...n, role: 'owner' })),
      ...(shared || []).filter((n) => !ownedIds.has(n.id)).map((n) => ({ ...n, role: 'editor' })),
      ...invitedNotes.filter((n) => !ownedIds.has(n.id) && !collabIds.has(n.id))
    ].sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: combined })
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Internal server error' })
    }
  }
}
