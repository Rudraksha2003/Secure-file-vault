import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const config = {
  schedule: '@hourly'
}

async function handler() {
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

export { handler, config }
