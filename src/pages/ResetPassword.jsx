import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import MetaBalls from '../components/MetaBalls'
import { PageContainer, Card, Button, Input, BackHome } from '../components/Layout'
import { updatePassword } from '../lib/auth'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session && !window.location.hash.includes('type=recovery')) {
        navigate('/login')
      }
    })
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await updatePassword(password)
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <>
      <MetaBalls opacity={0.2} />
      <PageContainer className="flex items-center justify-center min-h-[80vh]">
        <div className="w-full max-w-md">
          <BackHome />
          <Card>
            <h1 className="text-2xl font-bold text-white mb-6">Set new password</h1>
            {success ? (
              <p className="text-slate-300">Password updated. Redirecting to login…</p>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                {error && <p className="text-amber-400 text-sm">{error}</p>}
                <Input
                  label="New password"
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Updating…' : 'Update password'}
                </Button>
              </form>
            )}
            <p className="text-center text-slate-400 text-sm mt-4">
              <Link to="/login" className="hover:text-amber-400 transition">Back to login</Link>
            </p>
          </Card>
        </div>
      </PageContainer>
    </>
  )
}
