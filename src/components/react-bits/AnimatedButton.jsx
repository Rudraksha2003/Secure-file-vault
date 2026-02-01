import { motion } from 'motion/react'

/**
 * React Bits–style button with scale and shine on hover.
 */
export default function AnimatedButton({
  children,
  variant = 'primary',
  className = '',
  ...props
}) {
  const base = 'inline-flex items-center justify-center rounded-xl font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 touch-manipulation '
  const variants = {
    primary:
      'bg-amber-500 text-slate-900 shadow-lg hover:bg-amber-400 focus:ring-amber-400 px-6 py-3',
    secondary:
      'border border-slate-600 bg-slate-700 text-white hover:bg-slate-600 focus:ring-slate-500 px-6 py-3',
  }

  return (
    <motion.button
      type="button"
      className={base + (variants[variant] || variants.primary) + ' ' + className}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      {...props}
    >
      {children}
    </motion.button>
  )
}
