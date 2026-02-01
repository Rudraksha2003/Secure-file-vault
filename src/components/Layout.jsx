import { Link, Outlet } from 'react-router-dom'
import { useState, useEffect } from 'react'
import CustomCursor from './CustomCursor'

function getStoredTheme() {
  const t = localStorage.getItem('theme')
  return t === 'light' || t === 'dark' ? t : 'dark'
}

function applyTheme(theme) {
  document.documentElement.classList.remove('theme-light', 'theme-dark')
  document.documentElement.classList.add(theme === 'light' ? 'theme-light' : 'theme-dark')
  localStorage.setItem('theme', theme)
}

export function ThemeToggle() {
  const [theme, setTheme] = useState(getStoredTheme)

  useEffect(() => {
    setTheme(getStoredTheme())
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    setTheme(next)
  }

  // Dark → sun, light → moon. Use theme-toggle-btn so index.css can keep icon visible in both themes.
  return (
    <button
      type="button"
      onClick={toggle}
      className="theme-toggle-btn fixed top-4 right-4 z-50 flex h-11 w-11 items-center justify-center rounded-xl border border-slate-600 bg-slate-800/95 text-slate-200 shadow-lg transition hover:bg-slate-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-950"
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? (
        <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  )
}

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased relative">
      <CustomCursor />
      <ThemeToggle />
      {children ?? <Outlet />}
    </div>
  )
}

export function Card({ title, description, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm p-4 sm:p-8 shadow-xl ${className}`}>
      {title && <h2 className="text-lg sm:text-xl font-semibold text-white mb-2">{title}</h2>}
      {description && <p className="text-slate-400 text-sm sm:text-base mb-4 sm:mb-6">{description}</p>}
      {children}
    </section>
  )
}

export function PageContainer({ children, className = '' }) {
  return (
    <div className={`max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16 md:py-24 relative z-10 ${className}`}>
      {children}
    </div>
  )
}

export function BackHome() {
  return (
    <Link
      to="/"
      className="inline-flex items-center text-slate-400 hover:text-white text-sm mb-6 sm:mb-8 py-2 transition touch-manipulation"
    >
      ← Back home
    </Link>
  )
}

/** Shared class for secondary nav links (Dashboard, Account, Upload, etc.) */
export const navLinkClass =
  'inline-flex items-center justify-center rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 font-medium text-white text-sm transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-slate-500 touch-manipulation'

export function Button({ type = 'button', variant = 'primary', className = '', children, disabled, ...props }) {
  const base =
    'inline-flex items-center justify-center rounded-xl font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 touch-manipulation disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px] px-6 py-3 '
  const variants = {
    primary: 'bg-amber-500 text-slate-900 shadow-lg hover:bg-amber-400 focus:ring-amber-400',
    secondary: 'border border-slate-600 bg-slate-700 text-white hover:bg-slate-600 focus:ring-slate-500',
  }
  return (
    <button
      type={type}
      className={base + (variants[variant] || variants.primary) + ' ' + className}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}

/** Generate a safe id from label for accessibility when id is not provided. */
function slugifyId(label) {
  if (!label || typeof label !== 'string') return undefined
  return label
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

export function Input({ label, id: idProp, type = 'text', className = '', ...props }) {
  const id = idProp ?? (label ? slugifyId(label) : undefined)
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-300">
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        aria-invalid={props['aria-invalid']}
        className={`w-full min-h-[44px] rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition ${className}`}
        {...props}
      />
    </div>
  )
}
