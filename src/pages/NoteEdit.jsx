import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { PageContainer, Card, Button } from '../components/Layout'
import {
  getNoteForEdit,
  updateNoteContent,
  shareNoteByEmail,
  getNoteInvites,
  deleteNote,
  subscribeNoteRealtime,
} from '../lib/notes'
import { supabase } from '../lib/supabase'

const SAVE_DEBOUNCE_MS = 1500

function escapeForMirror(s) {
  if (s == null) return ''
  const div = document.createElement('div')
  div.textContent = String(s)
  return div.innerHTML
}

function hashUserId(id) {
  if (!id) return 200
  let h = 0
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h) + id.charCodeAt(i) | 0
  return Math.abs(h) % 360
}

export default function NoteEdit() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const id = searchParams.get('id')
  const [note, setNote] = useState(null)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saveStatus, setSaveStatus] = useState('')
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [shareFeedback, setShareFeedback] = useState('')
  const [pendingInvites, setPendingInvites] = useState([])
  const [shareSending, setShareSending] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [presences, setPresences] = useState([])
  const [cursorPositions, setCursorPositions] = useState([])
  const [textareaScroll, setTextareaScroll] = useState({ left: 0, top: 0 })
  const lastSavedRef = useRef('')
  const saveTimeoutRef = useRef(null)
  const textareaRef = useRef(null)
  const mirrorRef = useRef(null)
  const realtimeRef = useRef(null)

  const loadNote = useCallback(async () => {
    if (!id) return null
    const data = await getNoteForEdit(id)
    return data
  }, [id])

  const refetchContent = useCallback(async () => {
    if (!id) return
    const data = await getNoteForEdit(id)
    if (!data) return
    setContent(data.content ?? '')
    lastSavedRef.current = data.content ?? ''
    setSaveStatus('Updated')
  }, [id])

  useEffect(() => {
    if (!id) {
      setError('Invalid link: missing note id')
      setLoading(false)
      return
    }
    (async () => {
      const data = await loadNote()
      if (!data) {
        setError("Note not found or you don't have access.")
        setLoading(false)
        return
      }
      setNote(data)
      setContent(data.content ?? '')
      lastSavedRef.current = data.content ?? ''
      setLoading(false)
    })()
  }, [id, loadNote])

  useEffect(() => {
    if (!id || !note || loading) return
    let cancelled = false
    const setup = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData?.session?.user
      const userId = user?.id
      const userEmail = user?.email
      if (!userId || cancelled) return
      const realtime = subscribeNoteRealtime(
        id,
        userId,
        userEmail,
        refetchContent,
        setPresences
      )
      realtimeRef.current = realtime
    }
    setup()
    return () => {
      cancelled = true
      realtimeRef.current?.unsubscribe?.()
      realtimeRef.current = null
    }
  }, [id, note, loading, refetchContent])

  const saveContent = useCallback(async () => {
    if (!id || content === lastSavedRef.current) return
    setSaveStatus('Saving…')
    const ok = await updateNoteContent(id, content)
    if (ok) {
      lastSavedRef.current = content
      setSaveStatus('Saved')
      realtimeRef.current?.broadcastContentUpdated?.()
    } else {
      setSaveStatus('Save failed')
    }
  }, [id, content])

  useEffect(() => {
    if (!id || content === lastSavedRef.current) return
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(saveContent, SAVE_DEBOUNCE_MS)
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [content, id, saveContent])

  useEffect(() => {
    if (!shareModalOpen || !id) return
    getNoteInvites(id).then(setPendingInvites)
    setShareFeedback('')
    setShareEmail('')
  }, [shareModalOpen, id])

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    const mirror = mirrorRef.current
    if (!textarea || !mirror || !presences.length) {
      setCursorPositions([])
      return
    }
    const content = textarea.value ?? ''
    const cs = getComputedStyle(textarea)
    mirror.style.position = 'absolute'
    mirror.style.left = '0'
    mirror.style.top = '0'
    mirror.style.width = textarea.offsetWidth + 'px'
    mirror.style.minHeight = textarea.offsetHeight + 'px'
    mirror.style.padding = cs.padding
    mirror.style.fontSize = cs.fontSize
    mirror.style.fontFamily = cs.fontFamily
    mirror.style.lineHeight = cs.lineHeight
    mirror.style.boxSizing = cs.boxSizing
    mirror.style.whiteSpace = 'pre-wrap'
    mirror.style.wordBreak = 'break-word'
    mirror.style.visibility = 'hidden'
    mirror.style.pointerEvents = 'none'

    const padLeft = parseFloat(cs.paddingLeft) || 0
    const padTop = parseFloat(cs.paddingTop) || 0
    const positions = []
    presences.forEach((p) => {
      const offset = Math.min(Math.max(0, p.cursorOffset ?? 0), content.length)
      const char = content[offset] || '\u200b'
      const before = escapeForMirror(content.slice(0, offset))
      const after = escapeForMirror(content.slice(offset + 1))
      mirror.innerHTML = before + '<span data-marker>' + escapeForMirror(char) + '</span>' + after
      const span = mirror.querySelector('[data-marker]')
      if (!span) return
      positions.push({
        user_id: p.user_id,
        email: p.email,
        left: padLeft + span.offsetLeft - textareaScroll.left,
        top: padTop + span.offsetTop - textareaScroll.top,
      })
    })
    setCursorPositions(positions)
  }, [content, presences, textareaScroll])

  const handleShareInvite = async (e) => {
    e.preventDefault()
    if (!shareEmail.trim()) return
    setShareSending(true)
    setShareFeedback('')
    const result = await shareNoteByEmail(id, shareEmail.trim())
    setShareSending(false)
    if (result.ok) {
      setShareFeedback(result.message || 'Invite sent.')
      setShareEmail('')
      getNoteInvites(id).then(setPendingInvites)
    } else {
      setShareFeedback(result.error || 'Failed to send invite.')
    }
  }

  const shareLink = id ? `${window.location.origin}/note-edit?id=${encodeURIComponent(id)}` : ''

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      setShareFeedback('Link copied to clipboard.')
    } catch {
      setShareFeedback('Could not copy.')
    }
  }

  const handleDelete = async () => {
    if (!id || note?.role !== 'owner') return
    if (!window.confirm('Delete this note? This cannot be undone.')) return
    setDeleting(true)
    const result = await deleteNote(id)
    setDeleting(false)
    if (result.ok) navigate('/notes-list')
    else setError(result.error || 'Failed to delete')
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-slate-400">Loading…</div>
      </PageContainer>
    )
  }

  if (error && !note) {
    return (
      <PageContainer>
        <Card>
          <p className="text-red-400">{error}</p>
          <Link to="/notes-list" className="inline-block mt-4 text-amber-400 hover:text-amber-300">
            ← Collaborative Notes
          </Link>
        </Card>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <nav className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <Link to="/notes-list" className="text-slate-400 hover:text-white text-sm py-2 transition">
          ← Collaborative Notes
        </Link>
        <Link to="/dashboard" className="text-slate-400 hover:text-white text-sm py-2 transition">
          Dashboard
        </Link>
      </nav>

      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-white">Note</h1>
          {saveStatus && <span className="text-slate-500 text-xs sm:text-sm">{saveStatus}</span>}
          {presences.length > 0 && (
            <span className="text-slate-500 text-xs sm:text-sm truncate">
              · {presences.map((p) => p.email || p.user_id?.slice(0, 8) || 'Someone').join(', ')} viewing
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {note?.role === 'owner' && (
            <>
              <Button type="button" variant="secondary" onClick={() => setShareModalOpen(true)}>
                Share
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleDelete}
                disabled={deleting}
                className="text-red-400 border-red-800 hover:bg-red-950/50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 sm:p-6 shadow-xl">
        <div className="relative">
          <label htmlFor="note-edit-content" className="sr-only">Note content</label>
          <textarea
            ref={textareaRef}
            id="note-edit-content"
            value={content}
            onChange={(e) => {
              setContent(e.target.value)
              realtimeRef.current?.trackCursor?.(e.target.selectionStart)
            }}
            onScroll={() => {
              if (textareaRef.current) setTextareaScroll({ left: textareaRef.current.scrollLeft, top: textareaRef.current.scrollTop })
            }}
            onSelect={(e) => realtimeRef.current?.trackCursor?.(e.target.selectionStart)}
            onFocus={(e) => realtimeRef.current?.trackCursor?.(e.target.selectionStart)}
            onKeyUp={(e) => realtimeRef.current?.trackCursor?.(e.target.selectionStart)}
            onClick={(e) => {
              realtimeRef.current?.trackCursor?.(e.target.selectionStart)
              if (textareaRef.current) setTextareaScroll({ left: textareaRef.current.scrollLeft, top: textareaRef.current.scrollTop })
            }}
            rows={14}
            placeholder="Write your note…"
            aria-label="Note content"
            className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition resize-y min-h-[50vh] sm:min-h-[320px] font-mono text-sm"
          />
          <div
            ref={mirrorRef}
            className="absolute left-0 top-0 overflow-hidden font-mono text-sm whitespace-pre-wrap break-words"
            style={{ width: 0, height: 0, opacity: 0 }}
            aria-hidden
          />
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl" aria-hidden>
            {cursorPositions.map((pos) => (
              <div
                key={pos.user_id}
                className="absolute px-2 py-0.5 rounded text-xs font-medium text-white whitespace-nowrap shadow-lg border pointer-events-none z-10 min-h-[20px]"
                style={{
                  left: pos.left,
                  top: pos.top,
                  backgroundColor: `hsl(${hashUserId(pos.user_id)}, 70%, 45%)`,
                  borderColor: `hsl(${hashUserId(pos.user_id)}, 70%, 35%)`,
                }}
              >
                {pos.email || pos.user_id?.slice(0, 8) || 'Someone'}
              </div>
            ))}
          </div>
        </div>
      </div>

      {error && note && (
        <div className="mt-4 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {shareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">Share this note</h3>
            <p className="text-slate-400 text-sm mb-3">
              Add their email (they must be registered). The note will appear on their Collaborative Notes page.
            </p>
            <form onSubmit={handleShareInvite} className="flex gap-2 mb-3">
              <label htmlFor="share-note-email" className="sr-only">Email to invite</label>
              <input
                id="share-note-email"
                type="email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                placeholder="email@example.com"
                className="flex-1 min-w-0 rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm"
              />
              <Button type="submit" disabled={shareSending}>
                {shareSending ? 'Sending…' : 'Add invite'}
              </Button>
            </form>
            {shareFeedback && (
              <p className={`text-sm mb-3 ${shareFeedback.startsWith('Invite') || shareFeedback.startsWith('Link') ? 'text-emerald-400' : 'text-amber-400'}`}>
                {shareFeedback}
              </p>
            )}
            {pendingInvites.length > 0 && (
              <div className="mb-4">
                <label className="block text-slate-500 text-xs mb-2">Pending invites</label>
                <ul className="space-y-2 text-sm text-slate-300">
                  {pendingInvites.map((inv) => (
                    <li key={inv.email}>{inv.email}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mb-4">
              <label className="block text-slate-500 text-xs mb-1">Link to share (they must be logged in)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareLink}
                  className="flex-1 min-w-0 rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-slate-300 text-sm"
                />
                <Button type="button" variant="secondary" onClick={handleCopyLink}>
                  Copy
                </Button>
              </div>
            </div>
            <Button type="button" variant="secondary" onClick={() => setShareModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
