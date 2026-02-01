import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const authHeader = event.headers.authorization
  if (!authHeader) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: authData, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authData?.user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid session' }) }
  }

  let noteId
  try {
    const body = JSON.parse(event.body || '{}')
    noteId = body.noteId
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid body' }) }
  }

  if (!noteId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Note ID required' }) }
  }

  const { data: note, error } = await supabase
    .from('notes')
    .select('id, owner_id, is_collaborative')
    .eq('id', noteId)
    .single()

  if (error || !note) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Note not found' }) }
  }

  if (!note.is_collaborative) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Not a collaborative note' }) }
  }

  if (note.owner_id !== authData.user.id) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Only the owner can delete this note' }) }
  }

  await supabase.from('note_collaborators').delete().eq('note_id', noteId)
  await supabase.from('note_invites').delete().eq('note_id', noteId)
  const { error: deleteError } = await supabase.from('notes').delete().eq('id', noteId)

  if (deleteError) {
    return { statusCode: 500, body: JSON.stringify({ error: deleteError.message }) }
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) }
}
