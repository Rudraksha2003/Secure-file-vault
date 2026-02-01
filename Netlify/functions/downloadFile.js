import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'
import { isUserBlocked } from './_admin.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid body' }) }
  }
  const { fileId, password } = body

  const authHeader = event.headers.authorization
  if (!authHeader) {
    return { statusCode: 401, body: 'Unauthorized' }
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: authData } = await supabase.auth.getUser(token)
  if (!authData?.user) {
    return { statusCode: 401, body: 'Invalid session' }
  }

  if (await isUserBlocked(supabase, authData.user.id)) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Account is disabled' }) }
  }

  /* -------- FILE META -------- */
  const { data: file, error } = await supabase
    .from('files')
    .select('*')
    .eq('id', fileId)
    .single()

  if (error || !file) {
    return { statusCode: 404, body: 'File not found' }
  }

  /* -------- EXPIRY BLOCK -------- */
  if (new Date(file.expires_at) <= new Date()) {
    return {
      statusCode: 410,
      body: JSON.stringify({ error: 'File expired' })
    }
  }

  /* -------- PASSWORD BLOCK -------- */
  if (file.password_hash) {
    if (!password) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Password required' })
      }
    }

    const ok = await bcrypt.compare(password, file.password_hash)
    if (!ok) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid password' })
      }
    }
  }

  /* -------- SIGNED URL -------- */
  const { data: signed } = await supabase.storage
    .from('vault')
    .createSignedUrl(file.storage_path, 60 * 5)

  return {
    statusCode: 200,
    body: JSON.stringify({ url: signed.signedUrl })
  }
}

export { handler }
