import { motion } from 'motion/react'

/**
 * React Bits–style fade-in-up animation for sections and cards.
 */
export default function FadeInUp({
  children,
  className = '',
  delay = 0,
  duration = 0.5,
  once = true,
  y = 24,
  ...props
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-40px' }}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}
