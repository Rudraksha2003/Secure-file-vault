import { requireAdmin, getSupabase } from './_admin.js'

/**
 * Admin-only stats. Requires ADMIN_USER_ID in env.
 * Overview metrics only: total users, active 24h, files/notes counts, last cleanup. No sensitive content.
 */
async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const admin = await requireAdmin(event)
  if (admin.error) return admin.error

  const { supabase } = admin

  try {
    const now = Date.now()
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString()

    const [
      notesRes,
      notesAnonRes,
      notesCollabRes,
      filesRes,
      shortLinksRes,
      notesLast24hRes,
      filesLast24hRes,
      lastCleanupRes
    ] = await Promise.all([
      supabase.from('notes').select('*', { count: 'exact', head: true }),
      supabase.from('notes').select('*', { count: 'exact', head: true }).is('owner_id', null),
      supabase.from('notes').select('*', { count: 'exact', head: true }).eq('is_collaborative', true),
      supabase.from('files').select('*', { count: 'exact', head: true }),
      supabase.from('short_links').select('*', { count: 'exact', head: true }),
      supabase.from('notes').select('*', { count: 'exact', head: true }).gte('created_at', oneDayAgo),
      supabase.from('files').select('*', { count: 'exact', head: true }).gte('created_at', oneDayAgo),
      supabase.from('cleanup_runs').select('run_at, files_deleted, notes_deleted').order('run_at', { ascending: false }).limit(1).maybeSingle()
    ])

    let totalUsers = 0
    let activeUsers24h = 0
    try {
      const perPage = 1000
      let page = 1
      let hasMore = true
      while (hasMore) {
        const { data } = await supabase.auth.admin.listUsers({ page, perPage })
        const users = data?.users ?? []
        totalUsers += users.length
        for (const u of users) {
          const lastSignIn = u.last_sign_in_at ? new Date(u.last_sign_in_at) : null
          if (lastSignIn && lastSignIn >= new Date(oneDayAgo)) activeUsers24h++
        }
        hasMore = users.length === perPage
        page++
        if (page > 10) break
      }
    } catch (_) {
      totalUsers = null
      activeUsers24h = null
    }

    const lastCleanup = lastCleanupRes.data
      ? {
          run_at: lastCleanupRes.data.run_at,
          files_deleted: lastCleanupRes.data.files_deleted ?? 0,
          notes_deleted: lastCleanupRes.data.notes_deleted ?? 0
        }
      : null

    const stats = {
      notes_total: notesRes.count ?? 0,
      notes_anonymous: notesAnonRes.count ?? 0,
      notes_collaborative: notesCollabRes.count ?? 0,
      files_total: filesRes.count ?? 0,
      short_links_total: shortLinksRes.count ?? 0,
      notes_last_24h: notesLast24hRes.count ?? 0,
      files_last_24h: filesLast24hRes.count ?? 0,
      total_users: totalUsers,
      active_users_24h: activeUsers24h,
      last_cleanup: lastCleanup,
      storage_usage_approx: null
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stats)
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Internal error' })
    }
  }
}

export { handler }
