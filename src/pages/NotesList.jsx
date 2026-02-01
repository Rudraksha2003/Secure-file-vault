import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageContainer, Card, Button, Input, navLinkClass } from '../components/Layout'
import { listNotes, createCollaborativeNote } from '../lib/notes'

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'short' })
}

export default function NotesList() {
  const navigate = useNavigate()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ text: '', error: false })
  const [modalOpen, setModalOpen] = useState(false)
  const [expiry, setExpiry] = useState('')
  const [password, setPassword] = useState('')
  const [creating, setCreating] = useState(false)
  const [modalError, setModalError] = useState('')

  useEffect(() => {
    (async () => {
      const list = await listNotes()
      setNotes(list)
      setLoading(false)
    })()
  }, [])

  useEffect(() => {
    if (!modalOpen) return
    const now = new Date()
    const in10h = new Date(now.getTime() + 10 * 60 * 60 * 1000)
    const defaultExpiry = new Date(now.getTime() + 2 * 60 * 60 * 1000)
    setExpiry(defaultExpiry.toISOString().slice(0, 16))
    setPassword('')
    setModalError('')
  }, [modalOpen])

  const minExpiry = () => {
    const now = new Date()
    return now.toISOString().slice(0, 16)
  }
  const maxExpiry = () => {
    const now = new Date()
    const in10h = new Date(now.getTime() + 10 * 60 * 60 * 1000)
    return in10h.toISOString().slice(0, 16)
  }

  const handleNewNote = async (e) => {
    e.preventDefault()
    setModalError('')
    if (!expiry) {
      setModalError('Expiry is required.')
      return
    }
    const expiresAt = new Date(expiry)
    const maxExpiryTime = Date.now() + 10 * 60 * 60 * 1000
    if (expiresAt.getTime() > maxExpiryTime) {
      setModalError('Expiry cannot exceed 10 hours from now.')
      return
    }
    if (expiresAt.getTime() <= Date.now()) {
      setModalError('Expiry must be in the future.')
      return
    }
    setCreating(true)
    try {
      const id = await createCollaborativeNote(expiresAt, password || null)
      setModalOpen(false)
      navigate(`/note-edit?id=${id}`)
    } catch (err) {
      setModalError(err.message || 'Failed to create note')
    }
    setCreating(false)
  }

  return (
    <PageContainer>
      <nav className="flex flex-wrap items-center gap-2 sm:gap-3 mb-6 sm:mb-8">
        <Link to="/dashboard" className={navLinkClass}>Dashboard</Link>
        <Link to="/upload" className={navLinkClass}>Upload File</Link>
        <Link to="/files" className={navLinkClass}>My Files</Link>
      </nav>

      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Collaborative Notes</h1>
        <Button type="button" onClick={() => setModalOpen(true)}>
          New note
        </Button>
      </div>

      <p className="text-slate-400 text-xs sm:text-sm mb-4 sm:mb-6">
        Notes you own or that were shared with you. Open a note to edit together.
      </p>

      {message.text && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm mb-4 ${
            message.error ? 'border-red-900/50 bg-red-950/40 text-red-200' : 'border-amber-900/50 bg-amber-950/40 text-amber-200'
          }`}
          role="alert"
        >
          {message.text}
        </div>
      )}

      <ul className="space-y-0 rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-xl">
        {loading ? (
          <li className="border-b border-slate-800 px-4 sm:px-6 py-4 text-slate-400">Loading…</li>
        ) : !notes.length ? (
          <li className="border-b border-slate-800 px-6 py-8 text-slate-400 text-center">
            No collaborative notes yet. Create one with "New note".
          </li>
        ) : (
          notes.map((n) => {
            const label = n.role === 'owner' ? 'Owner' : n.invited ? 'Invitation — open to accept' : 'Shared with you'
            const title = (n.content ?? '').slice(0, 80) || 'Untitled note'
            return (
              <li key={n.id} className="border-b border-slate-800 last:border-b-0">
                <Link
                  to={`/note-edit?id=${encodeURIComponent(n.id)}`}
                  className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4 transition hover:bg-slate-800/50 active:bg-slate-800/50 block touch-manipulation"
                >
                  <span
                    className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-lg text-lg ${
                      n.invited ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    📝
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-white block truncate">{title}</span>
                    <span className="text-slate-500 text-sm">
                      {label} · {formatDate(n.updated_at || n.created_at)}
                    </span>
                  </div>
                  <span className="shrink-0 text-slate-500">→</span>
                </Link>
              </li>
            )
          })
        )}
      </ul>

      <p className="mt-6 text-center pb-4">
        <Link to="/" className="text-slate-400 hover:text-white text-sm transition">
          ← Back to home
        </Link>
      </p>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">New collaborative note</h3>
            <p className="text-slate-400 text-sm mb-4">Expiry is required (max 10 hours). Password is optional.</p>
            <form onSubmit={handleNewNote} className="space-y-4">
              {modalError && <p className="text-amber-400 text-sm">{modalError}</p>}
              <Input
                label="Expiry *"
                type="datetime-local"
                required
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                min={minExpiry()}
                max={maxExpiry()}
              />
              <p className="text-xs text-slate-500 -mt-2">Must be within the next 10 hours</p>
              <Input
                label="Password (optional)"
                type="password"
                placeholder="Leave empty for no password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={creating} className="flex-1">
                  {creating ? 'Creating…' : 'Create'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
