import { useState } from 'react'
import { Link } from 'react-router-dom'
import MetaBalls from '../components/MetaBalls'
import { PageContainer, Card, Button, Input, BackHome } from '../components/Layout'
import { requestPasswordReset } from '../lib/auth'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await requestPasswordReset(email)
      setSuccess(true)
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
            <h1 className="text-2xl font-bold text-white mb-6">Forgot password</h1>
            {success ? (
              <p className="text-slate-300 mb-4">
                Check your email for a link to reset your password.
              </p>
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
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Sending…' : 'Send reset link'}
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
