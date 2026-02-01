import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/** If user's email is in note_invites, add them as collaborator and remove invite. */
async function acceptInviteIfAny(noteId, user) {
  const email = user.email?.toLowerCase()
  if (!email) return

  const { data: invite } = await supabase
    .from('note_invites')
    .select('id')
    .eq('note_id', noteId)
    .eq('email', email)
    .maybeSingle()

  if (!invite) return

  await supabase.from('note_collaborators').insert({
    note_id: noteId,
    user_id: user.id,
    role: 'editor'
  })
  await supabase.from('note_invites').delete().eq('id', invite.id)
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

    const { noteId } = JSON.parse(event.body || '{}')
    if (!noteId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Note ID required' })
      }
    }

    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('id, content, owner_id, is_collaborative, created_at, updated_at')
      .eq('id', noteId)
      .single()

    if (noteError || !note) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Note not found' })
      }
    }

    if (!note.is_collaborative) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'This note is not a collaborative note' })
      }
    }

    await acceptInviteIfAny(noteId, user)

    const isOwner = note.owner_id === user.id
    const { data: collab } = await supabase
      .from('note_collaborators')
      .select('id')
      .eq('note_id', noteId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!isOwner && !collab) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'You do not have access to this note' })
      }
    }

    const { data: collaborators } = await supabase
      .from('note_collaborators')
      .select('user_id, role')
      .eq('note_id', noteId)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: note.id,
        content: note.content ?? '',
        created_at: note.created_at,
        updated_at: note.updated_at,
        role: isOwner ? 'owner' : 'editor',
        collaborators: collaborators || []
      })
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Internal server error' })
    }
  }
}
