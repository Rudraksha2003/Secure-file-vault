import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { PageContainer, Card, Button, Input } from '../components/Layout'

export default function ViewFile() {
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id')
  const isProtected = searchParams.get('protected') === '1'
  const [password, setPassword] = useState('')
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const loadUrl = async (pwd = null) => {
    if (!id) {
      setError('Invalid link: missing file id')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/.netlify/functions/downloadFile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password: pwd }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to get file')
      if (data.url) setUrl(data.url)
      else setError('No download URL returned')
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!isProtected && id) loadUrl()
  }, [id, isProtected])

  const handleUnlock = (e) => {
    e.preventDefault()
    loadUrl(password)
  }

  if (!id) {
    return (
      <PageContainer>
        <Card>
          <p className="text-red-400">Invalid link: missing file id.</p>
          <Link to="/" className="inline-block mt-4 text-amber-400 hover:text-amber-300">← Home</Link>
        </Card>
      </PageContainer>
    )
  }

  if (isProtected && !url) {
    return (
      <PageContainer>
        <Card>
          <h1 className="text-xl font-bold text-white mb-4">Protected File</h1>
          {error && <p className="text-amber-400 text-sm mb-4">{error}</p>}
          <form onSubmit={handleUnlock}>
            <Input id="view-file-password" label="Password" type="password" placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            <div className="mt-4">
              <Button type="submit" disabled={loading}>{loading ? 'Checking…' : 'Unlock'}</Button>
            </div>
          </form>
          <Link to="/files" className="inline-block mt-4 text-slate-400 hover:text-white">← My Files</Link>
        </Card>
      </PageContainer>
    )
  }

  if (url) {
    return (
      <PageContainer>
        <Card>
          <p className="text-slate-300 mb-4">Opening file…</p>
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
            Click here if it does not open
          </a>
        </Card>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <Card>
        {loading ? <p className="text-slate-400">Loading…</p> : error ? <p className="text-red-400">{error}</p> : null}
        <Link to="/files" className="inline-block mt-4 text-amber-400 hover:text-amber-300">← My Files</Link>
      </Card>
    </PageContainer>
  )
}
