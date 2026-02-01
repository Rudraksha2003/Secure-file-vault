import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageContainer, Card, BackHome, navLinkClass } from '../components/Layout'
import { logout } from '../lib/auth'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/.netlify/functions/adminStats', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) setIsAdmin(true)
    })()
  }, [])

  const handleLogout = () => logout(navigate)

  return (
    <PageContainer>
      <header className="flex flex-wrap items-center justify-between gap-3 mb-8 sm:mb-10">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Dashboard</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/account" className={navLinkClass}>Account</Link>
          {isAdmin && (
            <a href="/admin.html" className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-4 py-3 text-slate-900 text-sm font-medium transition hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-amber-400 touch-manipulation">
              Go to Admin
            </a>
          )}
          <button type="button" onClick={handleLogout} className={navLinkClass}>Logout</button>
        </div>
      </header>

      <Card title="Quick actions">
        <ul className="space-y-2 sm:space-y-3">
          <li>
            <Link
              to="/upload"
              className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/50 p-4 transition hover:border-slate-600 hover:bg-slate-800 touch-manipulation"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">↑</span>
              <div className="min-w-0 flex-1">
                <span className="font-medium text-white">Upload File</span>
                <p className="text-xs sm:text-sm text-slate-400">Share a file with optional password and expiry</p>
              </div>
            </Link>
          </li>
          <li>
            <Link
              to="/files"
              className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/50 p-4 transition hover:border-slate-600 hover:bg-slate-800 touch-manipulation"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-600 text-slate-300">📁</span>
              <div className="min-w-0 flex-1">
                <span className="font-medium text-white">My Files</span>
                <p className="text-xs sm:text-sm text-slate-400">View, download, or delete your uploaded files</p>
              </div>
            </Link>
          </li>
          <li>
            <Link
              to="/notes-list"
              className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/50 p-4 transition hover:border-slate-600 hover:bg-slate-800 touch-manipulation"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">📝</span>
              <div className="min-w-0 flex-1">
                <span className="font-medium text-white">Collaborative Notes</span>
                <p className="text-xs sm:text-sm text-slate-400">Share notes and edit together in real time</p>
              </div>
            </Link>
          </li>
          <li>
            <Link
              to="/account"
              className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/50 p-4 transition hover:border-slate-600 hover:bg-slate-800 touch-manipulation"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-600 text-slate-300">👤</span>
              <div className="min-w-0 flex-1">
                <span className="font-medium text-white">Account</span>
                <p className="text-xs sm:text-sm text-slate-400">Display name, password, and email</p>
              </div>
            </Link>
          </li>
          {isAdmin && (
            <li>
              <a
                href="/admin.html"
                className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/50 p-4 transition hover:border-slate-600 hover:bg-slate-800 touch-manipulation"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">⚙</span>
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-white">Admin</span>
                  <p className="text-xs sm:text-sm text-slate-400">Overview, users, files, notes, audit, settings</p>
                </div>
              </a>
            </li>
          )}
        </ul>
      </Card>

      <p className="mt-6 text-center pb-4">
        <Link to="/" className="text-slate-400 hover:text-white text-sm transition">← Back to home</Link>
      </p>
    </PageContainer>
  )
}
