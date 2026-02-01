import { createClient } from '@supabase/supabase-js'
import { isUserBlocked } from './_admin.js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function handler(event) {
  const authHeader = event.headers.authorization
  if (!authHeader) {
    return { statusCode: 401, body: 'Unauthorized' }
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: authData, error: authError } =
    await supabase.auth.getUser(token)

  if (authError || !authData?.user) {
    return { statusCode: 401, body: 'Invalid session' }
  }

  if (await isUserBlocked(supabase, authData.user.id)) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Account is disabled' }) }
  }

  /* =====================
      FETCH FILES
     ===================== */
  const now = new Date()

  const { data, error } = await supabase
    .from('files')
    .select(
      'id, storage_path, expires_at, password_hash, created_at'
    )
    .eq('owner_id', authData.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    }
  }

  /* =====================
      NORMALIZE RESPONSE
     ===================== */
  const files = (data || []).map(file => {
    const expired = new Date(file.expires_at) <= now

    return {
      id: file.id,
      name: file.storage_path.split('/').pop(),
      expires_at: file.expires_at,
      expired,
      is_protected: !!file.password_hash
    }
  })

  return {
    statusCode: 200,
    body: JSON.stringify(files)
  }
}

export { handler }
