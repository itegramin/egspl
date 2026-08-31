/**
 * Shared motion variants + transition presets for the egramin redesign.
 * Centralized so every page animates with a consistent feel (single source
 * of truth for easing, durations, and stagger rhythm).
 */
import type { Variants } from 'motion/react';

/** Fade up + small translate — the default entrance for cards/blocks. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

/** Simple cross-fade — used for page-level transitions. */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  exit: { opacity: 0, y: -8, transition: { duration: 0.18, ease: 'easeIn' } },
};

/** Scale-in with a touch of overshoot — good for modals/cards. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 320, damping: 26 },
  },
};

/**
 * Parent container that staggers its {@link staggerItem} children.
 * Usage: <motion.div variants={staggerContainer} initial="hidden" animate="visible">
 */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

/** Child item bound to {@link staggerContainer}. */
export const staggerItem: Variants = fadeUp;

/** Fade-in only (no movement) for subtle content reveals. */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } },
};

/** Standard viewport config so reveal-on-scroll only plays once. */
export const viewportOnce = { once: true, margin: '-60px' } as const;

/** Single shared spring for hover micro-interactions (e.g. card lift). */
export const hoverLift = {
  y: -4,
  transition: { type: 'spring' as const, stiffness: 400, damping: 22 },
};
