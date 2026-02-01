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

  let fileId
  try {
    const body = JSON.parse(event.body || '{}')
    fileId = body.fileId
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid body' }) }
  }

  if (!fileId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'File ID required' }) }
  }

  const { data: file, error } = await supabase
    .from('files')
    .select('id, storage_path, owner_id')
    .eq('id', fileId)
    .single()

  if (error || !file) {
    return { statusCode: 404, body: JSON.stringify({ error: 'File not found' }) }
  }

  if (file.owner_id !== authData.user.id) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Not allowed to delete this file' }) }
  }

  await supabase.storage.from('vault').remove([file.storage_path])
  const { error: deleteError } = await supabase.from('files').delete().eq('id', fileId)

  if (deleteError) {
    return { statusCode: 500, body: JSON.stringify({ error: deleteError.message }) }
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) }
}
