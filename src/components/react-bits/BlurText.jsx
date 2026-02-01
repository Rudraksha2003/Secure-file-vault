import { motion } from 'motion/react'

/**
 * React Bits–style blur-in text animation.
 * Words animate in with blur and opacity. Use for hero headings.
 */
export default function BlurText({
  text,
  className = '',
  delay = 0,
  wordByWord = true,
  duration = 0.5,
  blurAmount = 10,
}) {
  const words = text.trim().split(/\s+/)

  if (wordByWord && words.length > 1) {
    return (
      <span className={`inline-block ${className}`}>
        {words.map((word, i) => (
          <motion.span
            key={`${word}-${i}`}
            initial={{ filter: `blur(${blurAmount}px)`, opacity: 0 }}
            animate={{ filter: 'blur(0px)', opacity: 1 }}
            transition={{
              duration,
              delay: delay + i * 0.08,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className="inline-block mr-[0.25em]"
          >
            {word}
          </motion.span>
        ))}
      </span>
    )
  }

  return (
    <motion.span
      className={className}
      initial={{ filter: `blur(${blurAmount}px)`, opacity: 0 }}
      animate={{ filter: 'blur(0px)', opacity: 1 }}
      transition={{ duration, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {text}
    </motion.span>
  )
}
