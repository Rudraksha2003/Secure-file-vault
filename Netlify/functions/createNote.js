import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function run(event) {
  const body = JSON.parse(event.body || '{}')
  const { content, password, expires_at, is_collaborative } = body
  const collaborative = !!is_collaborative
  if (!collaborative && content == null) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Content is required' })
    }
  }
  const noteContent = content != null ? String(content) : ''

  let password_hash = null
  if (password) {
    password_hash = await bcrypt.hash(password, 10)
  }

  let owner_id = null
  const authHeader = event.headers.authorization
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '')
    const { data } = await supabase.auth.getUser(token)
    if (data && data.user) {
      owner_id = data.user.id
    }
  }

  if (collaborative && !owner_id) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Login required to create collaborative notes' })
    }
  }

  if (collaborative) {
    if (!expires_at) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Expiry is required for collaborative notes' })
      }
    }
    const expiresAt = new Date(expires_at).getTime()
    const maxExpiry = Date.now() + 10 * 60 * 60 * 1000
    if (expiresAt > maxExpiry) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Expiry cannot exceed 10 hours' })
      }
    }
    if (expiresAt <= Date.now()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Expiry must be in the future' })
      }
    }
  }

  const now = new Date().toISOString()
  const row = {
    content: noteContent,
    password_hash,
    expires_at,
    owner_id,
    is_collaborative: collaborative,
    updated_at: now
  }
  const { data, error } = await supabase
    .from('notes')
    .insert([row])
    .select()
    .single()

  if (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    }
  }

  if (collaborative && owner_id) {
    await supabase.from('note_collaborators').insert({
      note_id: data.id,
      user_id: owner_id,
      role: 'owner'
    })
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ id: data.id })
  }
}

async function handler(event) {
  const onError = (err) => ({
    statusCode: 500,
    body: JSON.stringify({ error: err.message || 'Internal error' })
  })
  return run(event).then((r) => r, onError)
}

export { handler }
