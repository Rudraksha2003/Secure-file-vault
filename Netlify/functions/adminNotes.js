import { requireAdmin } from './_admin.js'

/** GET: list anonymous notes metadata only (id, created_at, expires_at, has_password). No content. */
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
    const offset = (page - 1) * perPage

    const { data: rows, error } = await supabase
      .from('notes')
      .select('id, created_at, expires_at, password_hash')
      .is('owner_id', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1)

    if (error) {
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
    }

    const now = new Date()
    const notes = (rows || []).map((n) => ({
      id: n.id,
      created_at: n.created_at,
      expires_at: n.expires_at,
      expired: n.expires_at ? new Date(n.expires_at) <= now : false,
      has_password: !!n.password_hash
    }))

    const { count: total } = await supabase
      .from('notes')
      .select('*', { count: 'exact', head: true })
      .is('owner_id', null)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes, total: total ?? notes.length, page, perPage })
    }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Internal error' }) }
  }
}

export { handler }
