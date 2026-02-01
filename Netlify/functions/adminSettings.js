import { requireAdmin, logAudit } from './_admin.js'

/** GET: return app settings. PATCH: update settings (body: { key, value } or { settings: { k: v } }). */
async function handler(event) {
  const admin = await requireAdmin(event)
  if (admin.error) return admin.error

  const { adminId, supabase } = admin

  if (event.httpMethod === 'GET') {
    try {
      const { data, error } = await supabase.from('app_settings').select('key, value')
      if (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
      }
      const settings = {}
      ;(data || []).forEach((r) => { settings[r.key] = r.value })
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      }
    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
    }
  }

  if (event.httpMethod === 'PATCH') {
    let body
    try {
      body = JSON.parse(event.body || '{}')
    } catch {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid body' }) }
    }

    const updates = body.settings || (body.key != null ? { [body.key]: body.value } : null)
    if (!updates || typeof updates !== 'object') {
      return { statusCode: 400, body: JSON.stringify({ error: 'settings object or key+value required' }) }
    }

    const now = new Date().toISOString()
    for (const [key, value] of Object.entries(updates)) {
      await supabase.from('app_settings').upsert(
        { key, value: value !== undefined && value !== null ? value : null, updated_at: now },
        { onConflict: 'key' }
      )
    }

    await logAudit(supabase, adminId, 'settings_updated', null, null, { keys: Object.keys(updates) })

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true })
    }
  }

  return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
}

export { handler }
