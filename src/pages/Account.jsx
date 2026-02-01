import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PageContainer, Card, Button, Input, navLinkClass } from '../components/Layout'
import { getCurrentUser, updateUsername, updatePassword, updateEmail, logout } from '../lib/auth'
import { supabase } from '../lib/supabase'

export default function Account() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [user, setUser] = useState(null)
  const [username, setUsername] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [usernameMsg, setUsernameMsg] = useState({ text: '', error: false })
  const [passwordMsg, setPasswordMsg] = useState({ text: '', error: false })
  const [emailMsg, setEmailMsg] = useState({ text: '', error: false })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState({ username: false, password: false, email: false })

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser()
      if (!u) { navigate('/login'); return }
      setUser(u)
      setUsername(u.user_metadata?.full_name ?? '')
      try {
        const { data: profile } = await supabase.from('profiles').select('username').eq('id', u.id).maybeSingle()
        if (profile?.username != null) setUsername(profile.username)
      } catch (_) {}
      setLoading(false)
    })()
  }, [navigate])

  useEffect(() => {
    if (searchParams.get('email_updated') === '1') {
      setEmailMsg({ text: 'Your email has been updated. You are now signed in with your new email.', error: false })
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const handleSaveUsername = async (e) => {
    e.preventDefault()
    setUsernameMsg({ text: '', error: false })
    setSaving((s) => ({ ...s, username: true }))
    try {
      await updateUsername(username)
      setUsernameMsg({ text: 'Display name saved.', error: false })
    } catch (e) {
      const msg = e?.message || ''
      setUsernameMsg({ text: /unique|duplicate/i.test(msg) ? 'This username is already taken.' : msg || 'Failed to save.', error: true })
    }
    setSaving((s) => ({ ...s, username: false }))
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPasswordMsg({ text: '', error: false })
    if (newPassword !== newPasswordConfirm) { setPasswordMsg({ text: 'New passwords do not match.', error: true }); return }
    if (!currentPassword) { setPasswordMsg({ text: 'Enter your current password.', error: true }); return }
    setSaving((s) => ({ ...s, password: true }))
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user?.email, password: currentPassword })
      if (signInError) { setPasswordMsg({ text: 'Current password is incorrect.', error: true }); setSaving((s) => ({ ...s, password: false })); return }
      await updatePassword(newPassword)
      setCurrentPassword(''); setNewPassword(''); setNewPasswordConfirm('')
      setPasswordMsg({ text: 'Password updated.', error: false })
    } catch (e) { setPasswordMsg({ text: e?.message || 'Failed to update password.', error: true }) }
    setSaving((s) => ({ ...s, password: false }))
  }

  const handleChangeEmail = async (e) => {
    e.preventDefault()
    setEmailMsg({ text: '', error: false })
    if (!emailPassword) { setEmailMsg({ text: 'Enter your current password.', error: true }); return }
    setSaving((s) => ({ ...s, email: true }))
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user?.email, password: emailPassword })
      if (signInError) { setEmailMsg({ text: 'Password is incorrect.', error: true }); setSaving((s) => ({ ...s, email: false })); return }
      await updateEmail(newEmail)
      setEmailMsg({ text: 'Check your new email to confirm the change.', error: false })
    } catch (e) { setEmailMsg({ text: e?.message || 'Failed to update email.', error: true }) }
    setSaving((s) => ({ ...s, email: false }))
  }

  if (loading || !user) return <PageContainer><div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400">Loading…</div></PageContainer>

  return (
    <PageContainer>
      <header className="flex flex-wrap items-center justify-between gap-3 mb-8 sm:mb-10">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Account</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/dashboard" className={navLinkClass}>Dashboard</Link>
          <button type="button" onClick={() => logout(navigate)} className={navLinkClass}>Logout</button>
        </div>
      </header>
      <div className="space-y-6">
        <Card title="Profile">
          <div className="space-y-4">
            <Input label="Email" id="accountEmail" type="email" value={user.email || ''} readOnly />
            <Input label="Username" id="accountUsername" placeholder="Choose a username" maxLength={50} value={username} onChange={(e) => setUsername(e.target.value)} />
            <div>
              <Button type="button" className="w-full sm:w-auto" disabled={saving.username} onClick={handleSaveUsername}>
                Save username
              </Button>
              {usernameMsg.text && <p className={`mt-2 text-sm ${usernameMsg.error ? 'text-red-400' : 'text-emerald-400'}`}>{usernameMsg.text}</p>}
            </div>
          </div>
        </Card>
        <Card title="Change password">
          <form onSubmit={handleChangePassword} className="space-y-4">
            <Input id="account-current-password" label="Current password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
            <Input id="account-new-password" label="New password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
            <Input id="account-new-password-confirm" label="Confirm new password" type="password" value={newPasswordConfirm} onChange={(e) => setNewPasswordConfirm(e.target.value)} autoComplete="new-password" />
            <div className="pt-1">
              <Button type="submit" disabled={saving.password}>{saving.password ? 'Saving…' : 'Update password'}</Button>
              {passwordMsg.text && <p className={`mt-2 text-sm ${passwordMsg.error ? 'text-red-400' : 'text-emerald-400'}`}>{passwordMsg.text}</p>}
            </div>
          </form>
        </Card>
        <Card title="Change email">
          <form onSubmit={handleChangeEmail} className="space-y-4">
            <Input id="account-new-email" label="New email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="new@example.com" autoComplete="email" />
            <Input id="account-email-password" label="Current password" type="password" value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} autoComplete="current-password" />
            <div className="pt-1">
              <Button type="submit" disabled={saving.email}>{saving.email ? 'Sending…' : 'Send confirmation'}</Button>
              {emailMsg.text && <p className={`mt-2 text-sm ${emailMsg.error ? 'text-red-400' : 'text-emerald-400'}`}>{emailMsg.text}</p>}
            </div>
          </form>
        </Card>
      </div>
    </PageContainer>
  )
}
