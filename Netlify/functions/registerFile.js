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

  /* =====================
     AUTHENTICATION
  ===================== */
  const authHeader = event.headers.authorization
  if (!authHeader) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Login required' })
    }
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: authData, error: authError } =
    await supabase.auth.getUser(token)

  if (authError || !authData?.user) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Invalid session' })
    }
  }

  const user = authData.user

  if (await isUserBlocked(supabase, user.id)) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Account is disabled' })
    }
  }

  /* =====================
     INPUT
  ===================== */
  const { storagePath, expires_at, password } =
    JSON.parse(event.body || '{}')

  if (!storagePath || !expires_at) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing fields' })
    }
  }

  const expiresAt = new Date(expires_at)
  const now = Date.now()

  if (isNaN(expiresAt.getTime()) || expiresAt.getTime() <= now) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid expiry time' })
    }
  }

  const maxAllowed = now + 10 * 60 * 60 * 1000
  if (expiresAt.getTime() > maxAllowed) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Maximum expiry is 10 hours' })
    }
  }

  /* =====================
     PASSWORD (OPTIONAL)
  ===================== */
  let passwordHash = null
  if (password && password.trim()) {
    passwordHash = await bcrypt.hash(password, 10)
  }

  /* =====================
     DATABASE RECORD
  ===================== */
  const { data: inserted, error: dbError } = await supabase
    .from('files')
    .insert({
      owner_id: user.id,
      storage_path: storagePath,
      expires_at: expiresAt.toISOString(),
      password_hash: passwordHash
    })
    .select('id')
    .single()

  if (dbError) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: dbError.message })
    }
  }

  /* =====================
     PASSWORD-PROTECTED: return app view link so password is checked when opening
  ===================== */
  if (passwordHash) {
    const host =
      event.headers.origin ||
      event.headers['x-forwarded-host'] ||
      event.headers.host ||
      ''
    const baseUrl = host
      ? (host.startsWith('http') ? host : `https://${host}`)
      : ''
    const viewUrl = baseUrl
      ? `${baseUrl}/view-file.html?id=${inserted.id}`
      : `/view-file.html?id=${inserted.id}`
    return {
      statusCode: 200,
      body: JSON.stringify({
        url: viewUrl,
        fileId: inserted.id,
        expiresAt: expiresAt.toISOString()
      })
    }
  }

  /* =====================
     SIGNED DOWNLOAD URL (no password)
  ===================== */
  const { data: signed, error: signError } =
    await supabase.storage
      .from('vault')
      .createSignedUrl(storagePath, 300) // 5 minutes

  if (signError) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: signError.message })
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      url: signed.signedUrl,
      expiresAt: expiresAt.toISOString()
    })
  }
}

export { handler }
