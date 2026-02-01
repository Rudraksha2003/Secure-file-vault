import { requireAdmin, getSupabase } from './_admin.js'

/** POST: run cleanup manually (admin-only). Same logic as scheduled cleanup. */
async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const admin = await requireAdmin(event)
  if (admin.error) return admin.error

  const supabase = getSupabase()
  const now = new Date().toISOString()

  let filesDeleted = 0
  let notesDeleted = 0

  const { data: files } = await supabase
    .from('files')
    .select('id, storage_path')
    .lt('expires_at', now)

  for (const file of files || []) {
    await supabase.storage.from('vault').remove([file.storage_path])
    const { error } = await supabase.from('files').delete().eq('id', file.id)
    if (!error) filesDeleted++
  }

  const { data: deletedNotes } = await supabase
    .from('notes')
    .delete()
    .lt('expires_at', now)
    .select('id')
  notesDeleted = (deletedNotes || []).length

  try {
    await supabase.from('cleanup_runs').insert({
      run_at: now,
      files_deleted: filesDeleted,
      notes_deleted: notesDeleted
    })
  } catch (_) {}

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ok: true,
      files_deleted: filesDeleted,
      notes_deleted: notesDeleted
    })
  }
}

export { handler }
