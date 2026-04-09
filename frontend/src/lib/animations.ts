import type { Variants } from 'framer-motion'

export const fadeUp: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.3, ease: 'easeOut' },
}

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
}

export const slideInRight: Variants = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 24 },
  transition: { duration: 0.25, ease: 'easeOut' },
}

export const staggerContainer: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.07,
    },
  },
}

export const staggerItem: Variants = {
  initial: fadeUp.initial,
  animate: fadeUp.animate,
  exit: fadeUp.exit,
  transition: fadeUp.transition,
}

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.15, ease: 'easeOut' },
}

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.25, ease: 'easeInOut' },
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
