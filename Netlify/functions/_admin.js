/**
 * Shared admin helpers. ADMIN_USER_ID must be set in env.
 * requireAdmin(event) => { adminId, supabase } or returns error response.
 * logAudit(supabase, adminId, action, targetType, targetId, details)
 */
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

async function requireAdmin(event) {
  const adminUserId = process.env.ADMIN_USER_ID
  if (!adminUserId) {
    return { error: { statusCode: 503, body: JSON.stringify({ error: 'Admin not configured' }) } }
  }

  const authHeader = event.headers?.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: { statusCode: 401, body: JSON.stringify({ error: 'Login required' }) } }
  }

  const supabase = getSupabase()
  const token = authHeader.replace('Bearer ', '')
  const { data: authData, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authData?.user) {
    return { error: { statusCode: 401, body: JSON.stringify({ error: 'Invalid or expired session' }) } }
  }
  if (authData.user.id !== adminUserId) {
    return { error: { statusCode: 403, body: JSON.stringify({ error: 'Access denied' }) } }
  }

  return { adminId: authData.user.id, supabase }
}

async function logAudit(supabase, adminId, action, targetType = null, targetId = null, details = null) {
  try {
    await supabase.from('audit_logs').insert({
      admin_id: adminId,
      action,
      target_type: targetType,
      target_id: targetId,
      details: details ? details : undefined
    })
  } catch (_) {
    // best effort; do not fail the request
  }
}

function isUserBlocked(supabase, userId) {
  return supabase
    .from('user_flags')
    .select('is_blocked')
    .eq('user_id', userId)
    .maybeSingle()
    .then(({ data }) => !!data?.is_blocked)
}

export { getSupabase, requireAdmin, logAudit, isUserBlocked }
