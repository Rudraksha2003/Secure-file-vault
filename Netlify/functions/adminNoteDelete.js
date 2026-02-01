import { requireAdmin, logAudit } from './_admin.js'

/** POST: delete a note (e.g. abusive). Body: { note_id } */
async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const admin = await requireAdmin(event)
  if (admin.error) return admin.error

  const { adminId, supabase } = admin

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid body' }) }
  }

  const noteId = body.note_id
  if (!noteId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'note_id required' }) }
  }

  const { data: note, error: fetchErr } = await supabase
    .from('notes')
    .select('id, owner_id')
    .eq('id', noteId)
    .single()

  if (fetchErr || !note) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Note not found' }) }
  }

  await supabase.from('note_collaborators').delete().eq('note_id', noteId)
  await supabase.from('note_invites').delete().eq('note_id', noteId)
  const { error: deleteErr } = await supabase.from('notes').delete().eq('id', noteId)

  if (deleteErr) {
    return { statusCode: 500, body: JSON.stringify({ error: deleteErr.message }) }
  }

  await logAudit(supabase, adminId, 'note_deleted', 'note', noteId, {})

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true })
  }
}

export { handler }
