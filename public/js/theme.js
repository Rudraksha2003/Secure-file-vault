/**
 * App theme: light / dark. Persists in localStorage, applies class on <html>.
 * Call initTheme() early (e.g. from inline script in head) to avoid flash.
 * Renders a fixed top-right toggle button when DOM is ready.
 */
(function () {
  const STORAGE_KEY = 'theme'

  function getTheme () {
    try {
      const t = localStorage.getItem(STORAGE_KEY)
      return t === 'light' || t === 'dark' ? t : 'dark'
    } catch {
      return 'dark'
    }
  }

  function setTheme (value) {
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch (_) {}
  }

  function applyTheme (theme) {
    const html = document.documentElement
    html.classList.remove('theme-light', 'theme-dark')
    html.classList.add(theme === 'light' ? 'theme-light' : 'theme-dark')
  }

  function toggleTheme () {
    const next = getTheme() === 'light' ? 'dark' : 'light'
    setTheme(next)
    applyTheme(next)
    updateButton()
  }

  // Dark → show sun, light → show moon (same as React Layout so icon doesn’t flip when opening admin.html)
  function updateButton () {
    const btn = document.getElementById('theme-toggle-btn')
    if (!btn) return
    const isLight = getTheme() === 'light'
    btn.setAttribute('aria-label', isLight ? 'Switch to dark mode' : 'Switch to light mode')
    btn.setAttribute('title', isLight ? 'Switch to dark mode' : 'Switch to light mode')
    const sun = btn.querySelector('[data-icon="sun"]')
    const moon = btn.querySelector('[data-icon="moon"]')
    if (sun) sun.classList.toggle('hidden', isLight)
    if (moon) moon.classList.toggle('hidden', !isLight)
  }

  function createButton () {
    const wrap = document.createElement('div')
    wrap.id = 'theme-toggle-wrap'
    wrap.className = 'theme-toggle-wrap fixed top-4 right-4 z-50 safe-area-tr'
    const isLight = getTheme() === 'light'
    wrap.innerHTML = `
      <button
        id="theme-toggle-btn"
        type="button"
        aria-label="${isLight ? 'Switch to dark mode' : 'Switch to light mode'}"
        title="${isLight ? 'Switch to dark mode' : 'Switch to light mode'}"
        class="theme-toggle-btn flex h-10 w-10 items-center justify-center rounded-xl border border-slate-600 bg-slate-800/80 text-slate-300 shadow-lg backdrop-blur-sm transition hover:border-slate-500 hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-950 touch-manipulation"
      >
        <svg data-icon="sun" class="h-5 w-5 ${isLight ? 'hidden' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
        </svg>
        <svg data-icon="moon" class="h-5 w-5 ${isLight ? '' : 'hidden'}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
        </svg>
      </button>
    `
    wrap.querySelector('button').addEventListener('click', toggleTheme)
    document.body.appendChild(wrap)
  }

  function init () {
    applyTheme(getTheme())
    if (document.body) {
      createButton()
    } else {
      document.addEventListener('DOMContentLoaded', createButton)
    }
  }

  window.initTheme = function () {
    applyTheme(getTheme())
  }

  window.toggleTheme = toggleTheme
  window.getTheme = getTheme
  window.applyTheme = applyTheme
  window.updateThemeButton = updateButton

  init()
})()
