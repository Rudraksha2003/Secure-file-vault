import { useState } from 'react'
import { Link } from 'react-router-dom'
import MetaBalls from '../components/MetaBalls'
import { PageContainer, Card, Button, Input, BackHome } from '../components/Layout'
import { validateNoteContent } from '../lib/validation'

export default function CreateNote() {
  const [content, setContent] = useState('')
  const [password, setPassword] = useState('')
  const [expiry, setExpiry] = useState('')
  const [shareLink, setShareLink] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copyLabel, setCopyLabel] = useState('Copy')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setShareLink('')
    const contentCheck = validateNoteContent(content)
    if (!contentCheck.valid) {
      setError(contentCheck.error)
      return
    }
    if (!expiry) {
      setError('Expiry is required.')
      return
    }
    const expiresAt = new Date(expiry)
    const max = Date.now() + 12 * 60 * 60 * 1000
    if (expiresAt.getTime() > max) {
      setError('Maximum expiry is 12 hours.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/.netlify/functions/createNote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          password: password || null,
          expires_at: expiresAt.toISOString(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create note')

      let longUrl = `${window.location.origin}/view?id=${data.id}`
      setShareLink(longUrl)

      try {
        const shortRes = await fetch('/.netlify/functions/createShortLink', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: longUrl }),
        })
        const shortData = await shortRes.json()
        if (shortRes.ok && shortData.shortUrl) setShareLink(shortData.shortUrl)
      } catch (_) {}
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  const handleCopy = async () => {
    if (!shareLink) return
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopyLabel('Copied!')
      setTimeout(() => setCopyLabel('Copy'), 2000)
    } catch {
      setCopyLabel('Failed')
      setTimeout(() => setCopyLabel('Copy'), 2000)
    }
  }

  return (
    <>
      <MetaBalls opacity={0.2} />
      <PageContainer>
        <BackHome />
        <Card>
          <h1 className="text-2xl font-bold text-white mb-6">Create Secure Note</h1>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <p className="text-amber-400 text-sm">{error}</p>}
            <div>
              <label htmlFor="content-area" className="block text-sm font-medium text-slate-300 mb-1">Note content</label>
              <textarea
                id="content-area"
                required
                rows={6}
                placeholder="Write your note…"
                className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition resize-y min-h-[120px]"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
            <Input
              label="Password (optional)"
              id="password"
              type="password"
              placeholder="Leave empty for no password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Input
              label="Expiry (optional)"
              id="expiry"
              type="datetime-local"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating…' : 'Create Note'}
            </Button>
          </form>

          {shareLink && (
            <div className="mt-6 rounded-xl border border-slate-700 bg-slate-800/50 p-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">Share link</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={shareLink}
                  className="flex-1 rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-white text-sm"
                />
                <Button type="button" variant="secondary" onClick={handleCopy}>
                  {copyLabel}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </PageContainer>
    </>
  )
}
