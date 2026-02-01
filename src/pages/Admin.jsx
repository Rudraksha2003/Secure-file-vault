import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PageContainer, Card, navLinkClass } from '../components/Layout'
import { supabase } from '../lib/supabase'

export default function Admin() {
  const [allowed, setAllowed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setLoading(false)
        return
      }
      const res = await fetch('/.netlify/functions/adminStats', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      setAllowed(res.ok)
      setLoading(false)
    })()
  }, [])

  if (loading) {
    return (
      <PageContainer>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400">Loading…</div>
      </PageContainer>
    )
  }

  if (!allowed) {
    return (
      <PageContainer>
        <Card>
          <h1 className="text-xl font-bold text-white mb-4">Admin</h1>
          <p className="text-slate-400">You do not have access to the admin panel.</p>
          <Link to="/dashboard" className="inline-block mt-4 text-amber-400 hover:text-amber-300">← Dashboard</Link>
        </Card>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <nav className="flex flex-wrap items-center gap-2 sm:gap-3 mb-6 sm:mb-8">
        <Link to="/dashboard" className={navLinkClass}>Dashboard</Link>
      </nav>
      <Card>
        <h1 className="text-xl sm:text-2xl font-bold text-white mb-4">Admin Panel</h1>
        <p className="text-slate-400 mb-4">
          Full admin UI (stats, users, files, notes, audit, settings) is being migrated to React.
        </p>
        <p className="text-slate-500 text-sm">
          For now you can use the legacy admin at <a href="/admin.html" className="text-amber-400 hover:text-amber-300">/admin.html</a> if it is still deployed, or check back soon.
        </p>
        <Link to="/dashboard" className="inline-block mt-4 text-amber-400 hover:text-amber-300">← Dashboard</Link>
      </Card>
    </PageContainer>
  )
}
