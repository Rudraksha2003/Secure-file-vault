import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState, lazy, Suspense } from 'react'
import { supabase } from './lib/supabase'
import Layout from './components/Layout'

const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const CreateNote = lazy(() => import('./pages/CreateNote'))
const ViewNote = lazy(() => import('./pages/ViewNote'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const Upload = lazy(() => import('./pages/Upload'))
const Files = lazy(() => import('./pages/Files'))
const Account = lazy(() => import('./pages/Account'))
const NotesList = lazy(() => import('./pages/NotesList'))
const NoteEdit = lazy(() => import('./pages/NoteEdit'))
const Admin = lazy(() => import('./pages/Admin'))
const ViewFile = lazy(() => import('./pages/ViewFile'))

function ThemeInit() {
  useEffect(() => {
    const t = localStorage.getItem('theme')
    const theme = t === 'light' || t === 'dark' ? t : 'dark'
    document.documentElement.classList.add(theme === 'light' ? 'theme-light' : 'theme-dark')
  }, [])
  return null
}

function SupabaseHashHandler() {
  useEffect(() => {
    const hash = window.location.hash || ''
    if (hash.includes('type=email_change')) {
      supabase.auth.getSession().then(() => {
        window.location.replace('/account?email_updated=1')
      })
    }
  }, [])
  return null
}

function ProtectedRoute({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })
  }, [])
  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function App() {
  return (
    <BrowserRouter>
      <ThemeInit />
      <SupabaseHashHandler />
      <Layout>
        <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading…</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/create" element={<CreateNote />} />
            <Route path="/view" element={<ViewNote />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
            <Route path="/files" element={<ProtectedRoute><Files /></ProtectedRoute>} />
            <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
            <Route path="/notes-list" element={<ProtectedRoute><NotesList /></ProtectedRoute>} />
            <Route path="/note-edit" element={<ProtectedRoute><NoteEdit /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/view-file" element={<ViewFile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  )
}

export default App
