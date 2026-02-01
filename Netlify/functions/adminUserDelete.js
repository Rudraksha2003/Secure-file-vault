import { requireAdmin, logAudit } from './_admin.js'

/** POST: delete user from database (auth + related data). Body: { user_id }. Cannot delete self (admin). */
async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const admin = await requireAdmin(event)
  if (admin.error) return admin.error

  const { adminId, supabase } = admin
  const adminUserId = process.env.ADMIN_USER_ID

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid body' }) }
  }

  const userId = body.user_id
  if (!userId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'user_id required' }) }
  }

  if (userId === adminUserId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Cannot delete the admin user' }) }
  }

  try {
    const { data: files } = await supabase.from('files').select('id, storage_path').eq('owner_id', userId)
    for (const file of files || []) {
      await supabase.storage.from('vault').remove([file.storage_path])
      await supabase.from('files').delete().eq('id', file.id)
    }

    const { data: ownedNotes } = await supabase.from('notes').select('id').eq('owner_id', userId)
    const noteIds = (ownedNotes || []).map((n) => n.id)
    if (noteIds.length > 0) {
      await supabase.from('note_collaborators').delete().in('note_id', noteIds)
      await supabase.from('note_invites').delete().in('note_id', noteIds)
      await supabase.from('notes').delete().in('id', noteIds)
    }

    await supabase.from('note_collaborators').delete().eq('user_id', userId)
    await supabase.from('user_flags').delete().eq('user_id', userId)

    const { error } = await supabase.auth.admin.deleteUser(userId)
    if (error) {
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
    }

    await logAudit(supabase, adminId, 'user_deleted', 'user', userId, {})
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Internal error' }) }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true })
  }
}

export { handler }
