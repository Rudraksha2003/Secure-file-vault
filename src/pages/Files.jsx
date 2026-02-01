import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PageContainer, navLinkClass } from '../components/Layout'
import { supabase } from '../lib/supabase'

export default function Files() {
  const [files, setFiles] = useState([])
  const [notes, setNotes] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/.netlify/functions/listFiles', { headers: { Authorization: `Bearer ${session.access_token}` } })
      if (!res.ok) {
        if (res.status === 401) return
        const err = await res.json().catch(() => ({}))
        setMessage(res.status === 403 ? (err.error || 'Account is disabled') : 'Failed to load files')
        setLoading(false)
        return
      }
      const data = await res.json()
      setFiles(Array.isArray(data) ? data : [])
      try {
        const notesRes = await fetch('/.netlify/functions/listNotes', { headers: { Authorization: `Bearer ${session.access_token}` } })
        if (notesRes.ok) {
          const notesData = await notesRes.json()
          setNotes(Array.isArray(notesData) ? notesData : [])
        }
      } catch (_) {}
      setLoading(false)
    })()
  }, [])

  const formatDate = (iso) => (iso ? new Date(iso).toLocaleString() : '—')

  return (
    <PageContainer>
      <nav className="flex flex-wrap items-center gap-2 sm:gap-3 mb-6 sm:mb-8">
        <Link to="/dashboard" className={navLinkClass}>Dashboard</Link>
        <Link to="/upload" className={navLinkClass}>Upload File</Link>
        <Link to="/notes-list" className={navLinkClass}>Collaborative Notes</Link>
      </nav>
      <h1 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">My Files</h1>
      {message && <div className="rounded-xl border border-amber-900/50 bg-amber-950/40 px-4 py-3 text-amber-200 text-sm mb-4">{message}</div>}
      <section className="mb-8">
        <h2 className="text-base font-semibold text-slate-300 mb-3">Uploaded files</h2>
        <ul className="space-y-0 rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-xl">
          {loading ? <li className="border-b border-slate-800 px-6 py-4 text-slate-400">Loading…</li> : !files.length ? <li className="border-b border-slate-800 px-6 py-8 text-slate-400 text-center">No files yet. <Link to="/upload" className="text-amber-400 hover:text-amber-300">Upload one</Link></li> : files.map((f) => (
            <li key={f.id} className="border-b border-slate-800 px-6 py-4 flex flex-wrap items-center gap-3 last:border-b-0">
              <span className="flex-1 min-w-0 font-medium text-white truncate">{f.name}{f.is_protected && ' 🔒'}{f.expired && ' (expired)'}</span>
              <span className="text-sm text-slate-500">Expires: {formatDate(f.expires_at)}</span>
              <div className="flex gap-2">
                <Link to={`/view-file?id=${f.id}${f.is_protected ? '&protected=1' : ''}`} className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-600">View</Link>
                <a href={`/.netlify/functions/downloadFile?id=${f.id}`} className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-amber-500">Download</a>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-base font-semibold text-slate-300 mb-3">Collaborative notes</h2>
        <ul className="space-y-0 rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-xl">
          {!notes.length ? <li className="border-b border-slate-800 px-6 py-8 text-slate-400 text-center">No collaborative notes. <Link to="/notes-list" className="text-amber-400 hover:text-amber-300">Go to Collaborative Notes</Link></li> : notes.map((n) => (
            <li key={n.id} className="border-b border-slate-800 px-6 py-4 flex flex-wrap items-center gap-3 last:border-b-0">
              <span className="flex-1 min-w-0 font-medium text-white truncate">{(n.content ?? '').slice(0, 60) || 'Untitled note'}</span>
              <Link to={`/note-edit?id=${n.id}`} className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-600">View</Link>
            </li>
          ))}
        </ul>
      </section>
    </PageContainer>
  )
}
