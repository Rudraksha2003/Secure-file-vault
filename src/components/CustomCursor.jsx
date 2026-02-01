import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const POINTER_SELECTOR = 'a, button, [role="button"], [data-cursor-pointer], input[type="submit"], input[type="button"]'
const TEXT_SELECTOR = 'input:not([type="submit"]):not([type="button"]), textarea, [contenteditable="true"], [data-cursor-text]'

function getCursorMode(element) {
  if (!element) return 'default'
  if (element.closest?.(TEXT_SELECTOR)) return 'text'
  if (element.closest?.(POINTER_SELECTOR)) return 'pointer'
  return 'default'
}

export default function CustomCursor() {
  const location = useLocation()
  const [enabled, setEnabled] = useState(false)
  const [mode, setMode] = useState('default')
  const [visible, setVisible] = useState(false)
  const wrapperRef = useRef(null)
  const lastPos = useRef({ x: 0, y: 0 })
  const modeScheduled = useRef(false)

  // Re-show cursor on route change so it never stays hidden after navigating (e.g. to admin)
  useEffect(() => {
    setVisible(true)
  }, [location.pathname])

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)')
    setEnabled(fine.matches)
    const handler = (e) => setEnabled(e.matches)
    fine.addEventListener('change', handler)
    return () => fine.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (!enabled) return
    document.body.classList.add('custom-cursor-active')
    return () => document.body.classList.remove('custom-cursor-active')
  }, [enabled])

  useEffect(() => {
    if (!enabled) return

    function move(e) {
      lastPos.current = { x: e.clientX, y: e.clientY }
      const w = wrapperRef.current
      if (w) w.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`
      if (!visible) setVisible(true)

      if (!modeScheduled.current) {
        modeScheduled.current = true
        requestAnimationFrame(() => {
          const { x, y } = lastPos.current
          setMode(getCursorMode(document.elementFromPoint(x, y)))
          modeScheduled.current = false
        })
      }
    }

    function leave(e) {
      // Only hide when pointer actually left the window (avoids disappearing on route change / admin)
      if (!e.relatedTarget || !document.body.contains(e.relatedTarget)) {
        setVisible(false)
      }
    }

    function enter() {
      setVisible(true)
    }

    window.addEventListener('mousemove', move, { passive: true })
    document.body.addEventListener('mouseleave', leave)
    document.body.addEventListener('mouseenter', enter)
    return () => {
      window.removeEventListener('mousemove', move)
      document.body.removeEventListener('mouseleave', leave)
      document.body.removeEventListener('mouseenter', enter)
    }
  }, [enabled, visible])

  if (!enabled || !visible) return null

  return (
    <div
      ref={wrapperRef}
      className="custom-cursor"
      aria-hidden
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        pointerEvents: 'none',
        zIndex: 99999,
        willChange: 'transform',
      }}
    >
      <div
        className={`custom-cursor__outer ${mode === 'pointer' ? 'custom-cursor__outer--pointer' : ''} ${mode === 'text' ? 'custom-cursor__outer--text' : ''}`}
      />
      {mode !== 'text' && <div className="custom-cursor__inner" />}
    </div>
  )
}
