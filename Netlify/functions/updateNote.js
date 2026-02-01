import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/** Returns true if user can edit this note (owner or in note_collaborators). */
async function canEditNote(noteId, userId) {
  const { data: note } = await supabase
    .from('notes')
    .select('id, owner_id, is_collaborative')
    .eq('id', noteId)
    .single()

  if (!note) return false
  if (!note.is_collaborative) return false
  if (note.owner_id === userId) return true

  const { data: collab } = await supabase
    .from('note_collaborators')
    .select('id')
    .eq('note_id', noteId)
    .eq('user_id', userId)
    .maybeSingle()

  return !!collab
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
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

    const { noteId, content } = JSON.parse(event.body || '{}')
    if (!noteId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Note ID required' })
      }
    }

    const allowed = await canEditNote(noteId, user.id)
    if (!allowed) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'You do not have permission to edit this note' })
      }
    }

    const { error } = await supabase
      .from('notes')
      .update({
        content: content ?? '',
        updated_at: new Date().toISOString()
      })
      .eq('id', noteId)

    if (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message })
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true })
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Internal server error' })
    }
  }
}
