import { motion } from 'motion/react'

/**
 * React Bits–style animated gradient orbs background.
 * Soft moving blobs for a modern hero background.
 */
export default function GradientOrbs({ className = '' }) {
  const orbs = [
    { x: '20%', y: '20%', size: 320, color: 'from-amber-500/20 to-transparent', duration: 25 },
    { x: '70%', y: '60%', size: 280, color: 'from-amber-600/15 to-transparent', duration: 30 },
    { x: '50%', y: '80%', size: 240, color: 'from-amber-400/10 to-transparent', duration: 22 },
  ]

  return (
    <div className={`pointer-events-none fixed inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full bg-gradient-to-br ${orb.color} blur-3xl`}
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            transform: 'translate(-50%, -50%)',
          }}
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -25, 15, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}
