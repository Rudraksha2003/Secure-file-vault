import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import MetaBalls from '../components/MetaBalls'
import { PageContainer, Card, Button, Input, BackHome } from '../components/Layout'

export default function ViewNote() {
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id')
  const [state, setState] = useState('loading') // loading | password | content | error
  const [password, setPassword] = useState('')
  const [content, setContent] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const loadNote = async (pwd = null) => {
    if (!id) {
      setErrorMsg('Invalid link: missing note id')
      setState('error')
      return
    }
    setState('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/.netlify/functions/getNote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId: id, password: pwd }),
      })
      const data = await res.json()

      if (res.status === 401) {
        setState('password')
        return
      }
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to load note')
        setState('error')
        return
      }
      setContent(data.content ?? '')
      setState('content')
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load note')
      setState('error')
    }
  }

  useEffect(() => {
    loadNote()
  }, [id])

  const handleUnlock = (e) => {
    e.preventDefault()
    loadNote(password)
  }

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'note.txt'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <>
      <MetaBalls opacity={0.2} />
      <PageContainer>
        <BackHome />
        <h1 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Secure Note</h1>

        {state === 'loading' && (
          <Card>
            <p className="text-slate-400">Loading…</p>
          </Card>
        )}

        {state === 'password' && (
          <Card>
            <form onSubmit={handleUnlock}>
              <Input
                id="view-note-password"
                label="Enter password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <div className="mt-4">
                <Button type="submit" className="w-full">Unlock Note</Button>
              </div>
            </form>
          </Card>
        )}

        {state === 'content' && (
          <Card>
            <div className="flex justify-end mb-4">
              <Button type="button" variant="secondary" onClick={handleDownload}>
                Download as text file
              </Button>
            </div>
            <pre className="whitespace-pre-wrap break-words text-slate-300 font-mono text-sm">{content}</pre>
          </Card>
        )}

        {state === 'error' && (
          <div className="rounded-2xl border border-red-900/50 bg-red-950/30 p-6 text-red-400">
            <p>{errorMsg}</p>
          </div>
        )}
      </PageContainer>
    </>
  )
}
