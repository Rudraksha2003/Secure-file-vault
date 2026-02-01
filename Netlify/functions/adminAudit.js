import { requireAdmin } from './_admin.js'

/** GET: list recent admin audit log entries. */
async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const admin = await requireAdmin(event)
  if (admin.error) return admin.error

  const { supabase } = admin

  try {
    const limit = Math.min(200, Math.max(10, parseInt(event.queryStringParameters?.limit || '50', 10)))

    const { data: rows, error } = await supabase
      .from('audit_logs')
      .select('id, admin_id, action, target_type, target_id, details, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logs: rows || [] })
    }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Internal error' }) }
  }
}

export { handler }
