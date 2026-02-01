import { requireAdmin } from './_admin.js'

/** GET: last cleanup run (run_at, files_deleted, notes_deleted). */
async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const admin = await requireAdmin(event)
  if (admin.error) return admin.error

  const { supabase } = admin

  try {
    const { data, error } = await supabase
      .from('cleanup_runs')
      .select('run_at, files_deleted, notes_deleted')
      .order('run_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data ? { last_run: data } : { last_run: null })
    }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}

export { handler }
