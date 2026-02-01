import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { noteId, password } = JSON.parse(event.body)

    if (!noteId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Note ID required' })
      }
    }

    const { data: note, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', noteId)
      .single()

    if (error || !note) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Note not found' })
      }
    }

    // Expiry check
    if (note.expires_at && new Date(note.expires_at) < new Date()) {
      return {
        statusCode: 410,
        body: JSON.stringify({ error: 'Note expired' })
      }
    }

    // Password check (if protected)
    if (note.password_hash) {
      if (!password) {
        return {
          statusCode: 401,
          body: JSON.stringify({ error: 'Password required' })
        }
      }

      const valid = await bcrypt.compare(password, note.password_hash)
      if (!valid) {
        return {
          statusCode: 403,
          body: JSON.stringify({ error: 'Invalid password' })
        }
      }
    }

    // Access granted
    return {
      statusCode: 200,
      body: JSON.stringify({
        content: note.content,
        created_at: note.created_at
      })
    }

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
