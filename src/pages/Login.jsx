import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import MetaBalls from '../components/MetaBalls'
import { PageContainer, Card, Button, Input, BackHome } from '../components/Layout'
import { login } from '../lib/auth'

export default function Login() {
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login({ identifier, password }, navigate)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <>
      <MetaBalls opacity={0.2} />
      <PageContainer className="flex items-center justify-center min-h-[80vh]">
        <div className="w-full max-w-md">
          <BackHome />
          <Card>
            <h1 className="text-2xl font-bold text-white mb-6">Login</h1>
            <form className="space-y-4" onSubmit={handleSubmit}>
              {error && (
                <p className="text-amber-400 text-sm">{error}</p>
              )}
              <Input
                label="Email or username"
                id="identifier"
                placeholder="you@example.com or username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
              />
              <Input
                label="Password"
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in…' : 'Login'}
              </Button>
              <p className="text-center text-slate-400 text-sm">
                <Link to="/forgot-password" className="hover:text-amber-400 transition">Forgot password?</Link>
                {' · '}
                <Link to="/register" className="hover:text-amber-400 transition">Register</Link>
              </p>
            </form>
          </Card>
        </div>
      </PageContainer>
    </>
  )
}
