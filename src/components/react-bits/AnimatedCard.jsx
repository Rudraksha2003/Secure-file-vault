import { motion } from 'motion/react'

/**
 * React Bits–style card with hover lift and subtle border glow.
 */
export default function AnimatedCard({
  children,
  className = '',
  delay = 0,
  ...props
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      whileHover={{
        y: -4,
        transition: { duration: 0.2 },
      }}
      className={`rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm p-4 sm:p-8 shadow-xl transition-shadow hover:shadow-amber-500/5 hover:border-slate-700/80 ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  )
}
