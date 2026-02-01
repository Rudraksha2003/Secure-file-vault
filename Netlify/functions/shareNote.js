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

/** Check if a user with this email is registered (Supabase Auth). */
async function isEmailRegistered(email) {
  const normalized = String(email).trim().toLowerCase()
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (error) return false
  const found = (data?.users || []).some(
    (u) => (u.email || '').toLowerCase() === normalized
  )
  return found
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
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

    const { noteId, email } = JSON.parse(event.body || '{}')
    if (!noteId || !email || !String(email).trim()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Note ID and email are required' })
      }
    }

    const ok = await isOwner(noteId, user.id)
    if (!ok) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Only the note owner can invite others' })
      }
    }

    const { data: note } = await supabase
      .from('notes')
      .select('id, is_collaborative')
      .eq('id', noteId)
      .single()

    if (!note || !note.is_collaborative) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Collaborative note not found' })
      }
    }

    const inviteEmail = String(email).trim().toLowerCase()
    const registered = await isEmailRegistered(inviteEmail)

    if (!registered) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'This user is not registered. Invite them to the app first (e.g. share the app link so they can sign up). The note will appear on their dashboard once they register.',
          registered: false
        })
      }
    }

    const { error } = await supabase.from('note_invites').insert({
      note_id: noteId,
      email: inviteEmail,
      invited_by_user_id: user.id
    })

    if (error) {
      if (error.code === '23505') {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Already invited. Share the link below with them if they haven\'t seen it yet.',
            registered: true
          })
        }
      }
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message })
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "Invitation saved. They'll see it on their Collaborative Notes page. Share the link below if needed.",
        registered: true
      })
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Internal server error' })
    }
  }
}
