import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function isOwner(noteId, userId) {
  const { data } = await supabase
    .from('notes')
    .select('owner_id')
    .eq('id', noteId)
    .single()
  return data?.owner_id === userId
}

export async function handler(event) {
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const authHeader = event.headers.authorization
    if (!authHeader) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Login required' })
      }
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: authData } = await supabase.auth.getUser(token)
    const user = authData?.user
    if (!user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid or expired session' })
      }
    }

    const noteId = event.httpMethod === 'POST'
      ? JSON.parse(event.body || '{}').noteId
      : event.queryStringParameters?.noteId

    if (!noteId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Note ID required' })
      }
    }

    const ok = await isOwner(noteId, user.id)
    if (!ok) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Only the note owner can view invites' })
      }
    }

    const { data: invites, error } = await supabase
      .from('note_invites')
      .select('email, created_at')
      .eq('note_id', noteId)
      .order('created_at', { ascending: false })

    if (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message })
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invites: invites || [] })
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Internal server error' })
    }
  }
}
