import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageContainer, Card, Button, Input, navLinkClass } from '../components/Layout'
import { supabase } from '../lib/supabase'
import { validateFile } from '../lib/validation'

export default function Upload() {
  const [file, setFile] = useState(null)
  const [password, setPassword] = useState('')
  const [expiry, setExpiry] = useState('')
  const [downloadLink, setDownloadLink] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copyLabel, setCopyLabel] = useState('Copy')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setDownloadLink('')
    if (!file || !expiry) {
      setError('File and expiry are required.')
      return
    }
    const fileCheck = validateFile(file)
    if (!fileCheck.valid) {
      setError(fileCheck.error)
      return
    }
    const expires_at = new Date(expiry).toISOString()
    const maxExpiry = Date.now() + 10 * 60 * 60 * 1000
    if (new Date(expiry).getTime() > maxExpiry) {
      setError('Maximum expiry is 10 hours.')
      return
    }
    setLoading(true)
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !sessionData.session) throw new Error('Login required')
      const user = sessionData.session.user
      const storagePath = `uploads/${user.id}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from('vault').upload(storagePath, file, { upsert: false })
      if (uploadError) throw new Error(uploadError.message)
      const res = await fetch('/.netlify/functions/registerFile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session.access_token}` },
        body: JSON.stringify({ storagePath, expires_at, password: password || null }),
      })
      const result = await res.json()
      if (!res.ok || !result.url) throw new Error(result.error || 'Failed to generate download link')
      let url = result.url
      try {
        const shortRes = await fetch('/.netlify/functions/createShortLink', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: result.url }),
        })
        const shortData = await shortRes.json()
        if (shortRes.ok && shortData.shortUrl) url = shortData.shortUrl
      } catch (_) {}
      setDownloadLink(url)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  const handleCopy = async () => {
    if (!downloadLink) return
    try {
      await navigator.clipboard.writeText(downloadLink)
      setCopyLabel('Copied!')
      setTimeout(() => setCopyLabel('Copy'), 2000)
    } catch {
      setCopyLabel('Failed')
      setTimeout(() => setCopyLabel('Copy'), 2000)
    }
  }

  return (
    <PageContainer>
      <nav className="flex flex-wrap items-center gap-2 sm:gap-3 mb-6 sm:mb-8">
        <Link to="/dashboard" className={navLinkClass}>Dashboard</Link>
        <Link to="/files" className={navLinkClass}>My Files</Link>
      </nav>
      <Card>
        <h1 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Upload File</h1>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <p className="text-amber-400 text-sm">{error}</p>}
          <div className="space-y-1">
            <label htmlFor="upload-file" className="block text-sm font-medium text-slate-300">File</label>
            <input id="upload-file" type="file" required className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-amber-500 file:px-4 file:py-2 file:font-semibold file:text-slate-900" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <Input label="Optional password" type="password" placeholder="Leave empty for no password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Input label="Expiry (required, max 10 hours)" type="datetime-local" required value={expiry} onChange={(e) => setExpiry(e.target.value)} />
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Uploading…' : 'Upload File'}</Button>
        </form>
        {downloadLink && (
          <div className="mt-6 rounded-xl border border-slate-700 bg-slate-800/50 p-4">
            <p className="text-sm font-medium text-slate-300 mb-2">Share / download link</p>
            <div className="flex gap-2">
              <input readOnly value={downloadLink} className="flex-1 min-w-0 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-300" />
              <Button type="button" variant="secondary" onClick={handleCopy}>{copyLabel}</Button>
            </div>
          </div>
        )}
      </Card>
    </PageContainer>
  )
}
