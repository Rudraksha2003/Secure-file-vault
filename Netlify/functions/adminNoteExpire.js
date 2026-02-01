import { requireAdmin, logAudit } from './_admin.js'

/** POST: force-expire a note. Body: { note_id } */
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

  const now = new Date().toISOString()

  const { data: note, error: fetchErr } = await supabase
    .from('notes')
    .select('id')
    .eq('id', noteId)
    .single()

  if (fetchErr || !note) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Note not found' }) }
  }

  const { error: updateErr } = await supabase
    .from('notes')
    .update({ expires_at: now })
    .eq('id', noteId)

  if (updateErr) {
    return { statusCode: 500, body: JSON.stringify({ error: updateErr.message }) }
  }

  await logAudit(supabase, adminId, 'note_force_expired', 'note', noteId, {})

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true })
  }
}

export { handler }
