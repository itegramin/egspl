import React from 'react';
import { motion } from 'motion/react';
import { fadeUp, staggerContainer, staggerItem, viewportOnce } from '../../lib/animations';

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Render as a different HTML element (default div). */
  as?: 'div' | 'section' | 'li' | 'span';
  delay?: number;
}

/**
 * Reveals its children on scroll into view (fires once).
 * <Reveal> for a single block, or <Reveal.Stagger> + <Reveal.Item>
 * for a group that cascades in sequence.
 */
export const Reveal: React.FC<RevealProps> & {
  Stagger: React.FC<{ children: React.ReactNode; className?: string; as?: RevealProps['as'] }>;
  Item: React.FC<Omit<RevealProps, 'delay'>>;
} = ({ children, className, as: Tag = 'div', delay = 0 }) => {
  const Comp = motion[Tag] as typeof motion.div;
  return (
    <Comp
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      transition={{ delay }}
      className={className}
    >
      {children}
    </Comp>
  );
};

Reveal.Stagger = ({ children, className, as: Tag = 'div' }) => {
  const Comp = motion[Tag] as typeof motion.div;
  return (
    <Comp
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      className={className}
    >
      {children}
    </Comp>
  );
};

Reveal.Item = ({ children, className, as: Tag = 'div' }) => {
  const Comp = motion[Tag] as typeof motion.div;
  return (
    <Comp variants={staggerItem} className={className}>
      {children}
    </Comp>
  );
};
