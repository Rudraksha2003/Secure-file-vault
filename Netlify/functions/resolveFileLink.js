import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Public endpoint for shared file links (no auth).
 * Returns signed download URL if access allowed, or requiresPassword / error.
 */
export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  let fileId, password
  try {
    const body = JSON.parse(event.body || '{}')
    fileId = body.fileId
    password = body.password || null
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid body' }) }
  }

  if (!fileId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'File ID required' }) }
  }

  const { data: file, error } = await supabase
    .from('files')
    .select('id, storage_path, expires_at, password_hash')
    .eq('id', fileId)
    .single()

  if (error || !file) {
    return { statusCode: 404, body: JSON.stringify({ error: 'File not found' }) }
  }

  if (new Date(file.expires_at) <= new Date()) {
    return { statusCode: 410, body: JSON.stringify({ error: 'File expired' }) }
  }

  if (file.password_hash) {
    if (!password) {
      return {
        statusCode: 401,
        body: JSON.stringify({ requiresPassword: true, error: 'Password required' })
      }
    }
    const ok = await bcrypt.compare(password, file.password_hash)
    if (!ok) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Invalid password' }) }
    }
  }

  const { data: signed, error: signError } = await supabase.storage
    .from('vault')
    .createSignedUrl(file.storage_path, 60 * 5)

  if (signError) {
    return { statusCode: 500, body: JSON.stringify({ error: signError.message }) }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ url: signed.signedUrl })
  }
}
