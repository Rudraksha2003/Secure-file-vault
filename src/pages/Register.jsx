import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import MetaBalls from '../components/MetaBalls'
import { PageContainer, Card, Button, Input, BackHome } from '../components/Layout'
import { register } from '../lib/auth'

export default function Register() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    setEmailSent(false)
    try {
      const result = await register({ email, password })
      if (result?.needsEmailConfirmation) {
        setEmailSent(true)
      } else {
        navigate('/login')
      }
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
            <h1 className="text-2xl font-bold text-white mb-6">Register</h1>
            {emailSent ? (
              <div className="space-y-4 text-center">
                <p className="text-slate-300">
                  Check your email to confirm your account. Click the link in the message, then sign in.
                </p>
                <Link to="/login" className="inline-block text-amber-400 hover:text-amber-300 font-medium transition">
                  Go to login
                </Link>
              </div>
            ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              {error && <p className="text-amber-400 text-sm">{error}</p>}
              <Input
                label="Email"
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              <Input
                label="Password"
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating account…' : 'Register'}
              </Button>
              <p className="text-center text-slate-400 text-sm">
                <Link to="/login" className="hover:text-amber-400 transition">Already have an account? Login</Link>
              </p>
            </form>
            )}
          </Card>
        </div>
      </PageContainer>
    </>
  )
}
