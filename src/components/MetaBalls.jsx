import { useEffect, useRef } from 'react'

/**
 * Meta-balls style animated background (inspired by reactbits.dev/animations/meta-balls).
 * Renders smooth, merging blobs using canvas — soft overlapping circles for a liquid blob effect.
 */
export default function MetaBalls({ className = '', opacity = 0.35 }) {
  const canvasRef = useRef(null)
  const blobsRef = useRef([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let width = window.innerWidth
    let height = window.innerHeight

    const initBlobs = () => {
      const count = 6
      const blobs = []
      for (let i = 0; i < count; i++) {
        blobs.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          r: 80 + Math.random() * 120,
        })
      }
      return blobs
    }

    const setSize = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width
      canvas.height = height
      blobsRef.current = initBlobs()
    }

    setSize()
    window.addEventListener('resize', setSize)

    let raf
    const animate = () => {
      const blobs = blobsRef.current
      ctx.clearRect(0, 0, width, height)

      for (const b of blobs) {
        b.x += b.vx
        b.y += b.vy
        if (b.x < -b.r * 0.5 || b.x > width + b.r * 0.5) b.vx *= -1
        if (b.y < -b.r * 0.5 || b.y > height + b.r * 0.5) b.vy *= -1

        const gradient = ctx.createRadialGradient(
          b.x, b.y, 0,
          b.x, b.y, b.r
        )
        gradient.addColorStop(0, `rgba(251, 191, 36, ${opacity * 0.9})`)
        gradient.addColorStop(0.5, `rgba(251, 191, 36, ${opacity * 0.4})`)
        gradient.addColorStop(1, 'rgba(251, 191, 36, 0)')

        ctx.beginPath()
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()
      }

      raf = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', setSize)
      cancelAnimationFrame(raf)
    }
  }, [opacity])

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none fixed inset-0 ${className}`}
      style={{ filter: 'blur(60px)' }}
      aria-hidden="true"
    />
  )
}
