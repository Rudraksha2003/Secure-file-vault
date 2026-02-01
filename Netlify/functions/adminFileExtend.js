import { requireAdmin, logAudit } from './_admin.js'

/** POST: extend file expiry (admin override). Body: { file_id, new_expires_at } */
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

  const { file_id: fileId, new_expires_at: newExpiresAt } = body
  if (!fileId || !newExpiresAt) {
    return { statusCode: 400, body: JSON.stringify({ error: 'file_id and new_expires_at required' }) }
  }

  const expiresAt = new Date(newExpiresAt)
  if (isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    return { statusCode: 400, body: JSON.stringify({ error: 'new_expires_at must be a future ISO date' }) }
  }

  const { data: file, error: fetchErr } = await supabase
    .from('files')
    .select('id')
    .eq('id', fileId)
    .single()

  if (fetchErr || !file) {
    return { statusCode: 404, body: JSON.stringify({ error: 'File not found' }) }
  }

  const { error: updateErr } = await supabase
    .from('files')
    .update({ expires_at: expiresAt.toISOString() })
    .eq('id', fileId)

  if (updateErr) {
    return { statusCode: 500, body: JSON.stringify({ error: updateErr.message }) }
  }

  await logAudit(supabase, adminId, 'file_expiry_extended', 'file', fileId, { new_expires_at: newExpiresAt })

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true, expires_at: expiresAt.toISOString() })
  }
}

export { handler }
