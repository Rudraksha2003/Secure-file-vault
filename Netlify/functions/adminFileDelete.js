import { requireAdmin, logAudit } from './_admin.js'

/** POST: force delete a file. Body: { file_id } */
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

  const fileId = body.file_id
  if (!fileId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'file_id required' }) }
  }

  const { data: file, error: fetchErr } = await supabase
    .from('files')
    .select('id, storage_path, owner_id')
    .eq('id', fileId)
    .single()

  if (fetchErr || !file) {
    return { statusCode: 404, body: JSON.stringify({ error: 'File not found' }) }
  }

  await supabase.storage.from('vault').remove([file.storage_path])
  const { error: deleteErr } = await supabase.from('files').delete().eq('id', fileId)

  if (deleteErr) {
    return { statusCode: 500, body: JSON.stringify({ error: deleteErr.message }) }
  }

  await logAudit(supabase, adminId, 'file_deleted', 'file', fileId, { owner_id: file.owner_id })

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true })
  }
}

export { handler }
