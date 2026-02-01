import { requireAdmin, logAudit } from './_admin.js'

/** POST: block or unblock user. Body: { user_id, block: true|false } */
async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const admin = await requireAdmin(event)
  if (admin.error) return admin.error

  const { adminId, supabase } = admin

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid body' }) }
  }

  const { user_id: userId, block } = body
  if (!userId || typeof block !== 'boolean') {
    return { statusCode: 400, body: JSON.stringify({ error: 'user_id and block (boolean) required' }) }
  }

  const now = new Date().toISOString()

  const { error } = await supabase.from('user_flags').upsert(
    {
      user_id: userId,
      is_blocked: block,
      blocked_at: block ? now : null,
      blocked_by: block ? adminId : null,
      updated_at: now
    },
    { onConflict: 'user_id' }
  )

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  }

  await logAudit(supabase, adminId, block ? 'user_blocked' : 'user_unblocked', 'user', userId, { block })

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true, block })
  }
}

export { handler }
