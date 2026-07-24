import type { Variants } from 'framer-motion'

export const fadeUp: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.16 } },
}

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0 },
}

export const slideInRight: Variants = {
  initial: { opacity: 0, x: 12 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.18, ease: 'easeOut' } },
  exit: { opacity: 0, x: 10, transition: { duration: 0.14 } },
}

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0,
    },
  },
}

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.14, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.08 } },
}

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.12, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.08 } },
}

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.12, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.08 } },
}

const animations = {
  fadeUp,
  fadeIn,
  slideInRight,
  staggerContainer,
  staggerItem,
  scaleIn,
  pageTransition,
}

export default animations