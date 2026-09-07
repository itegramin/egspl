import React from 'react';
import { motion } from 'motion/react';
import { pageTransition } from '../../lib/animations';

/**
 * Wraps route content with a page-level cross-fade/slide.
 * Place inside <AnimatePresence mode="wait"> keyed on the page id so
 * switching pages animates out then in.
 */
export const PageTransition: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <motion.div
    variants={pageTransition}
    initial="hidden"
    animate="visible"
    exit="exit"
    className={className}
  >
    {children}
  </motion.div>
);
