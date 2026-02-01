import { requireAdmin, getSupabase } from './_admin.js'

/** GET: list users (email, created_at, last_sign_in_at, status). Paginated. */
async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const admin = await requireAdmin(event)
  if (admin.error) return admin.error

  const { supabase } = admin

  try {
    const page = Math.max(1, parseInt(event.queryStringParameters?.page || '1', 10))
    const perPage = Math.min(100, Math.max(10, parseInt(event.queryStringParameters?.perPage || '50', 10)))

    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) {
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
    }

    const users = (data?.users || []).map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      status: 'active'
    }))

    const userIds = users.map((u) => u.id)
    if (userIds.length > 0) {
      const { data: flags } = await supabase
        .from('user_flags')
        .select('user_id, is_blocked')
        .in('user_id', userIds)
      const blockedSet = new Set((flags || []).filter((f) => f.is_blocked).map((f) => f.user_id))
      users.forEach((u) => {
        u.status = blockedSet.has(u.id) ? 'blocked' : 'active'
      })

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds)
      const usernameByUserId = new Map((profiles || []).map((p) => [p.id, p.username]))
      users.forEach((u) => {
        const un = usernameByUserId.get(u.id)
        u.username = un && String(un).trim() ? un : null
      })
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users, page, perPage })
    }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Internal error' }) }
  }
}

export { handler }
