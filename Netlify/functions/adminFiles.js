import { requireAdmin } from './_admin.js'

/** GET: list all files metadata (no content, no auto-download). Paginated. */
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
      .from('files')
      .select('id, owner_id, storage_path, expires_at, password_hash, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1)

    if (error) {
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
    }

    const now = new Date()
    const files = (rows || []).map((f) => ({
      id: f.id,
      owner_id: f.owner_id,
      name: (f.storage_path || '').split('/').pop(),
      created_at: f.created_at,
      expires_at: f.expires_at,
      expired: new Date(f.expires_at) <= now,
      is_protected: !!f.password_hash
    }))

    const { count: total } = await supabase.from('files').select('*', { count: 'exact', head: true })

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files, total: total ?? files.length, page, perPage })
    }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Internal error' }) }
  }
}

export { handler }
