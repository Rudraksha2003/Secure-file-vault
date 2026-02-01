import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

function ConfigError({ message }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#020617',
        color: '#94a3b8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'system-ui, sans-serif',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 420 }}>
        <h1 style={{ color: '#f59e0b', marginBottom: 12 }}>Configuration missing</h1>
        <p style={{ marginBottom: 16 }}>{message}</p>
        <p style={{ fontSize: 14, color: '#64748b' }}>
          On Netlify: Site settings → Environment variables → add <code style={{ background: '#1e293b', padding: '2px 6px', borderRadius: 4 }}>VITE_SUPABASE_URL</code> and <code style={{ background: '#1e293b', padding: '2px 6px', borderRadius: 4 }}>VITE_SUPABASE_ANON_KEY</code>, then trigger a new deploy.
        </p>
      </div>
    </div>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root'))

import('./App')
  .then(({ default: App }) => {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )
  })
  .catch((err) => {
    root.render(<ConfigError message={err?.message || 'Something went wrong.'} />)
  })
