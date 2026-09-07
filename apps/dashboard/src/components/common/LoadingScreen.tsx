import React from 'react';
import { motion } from 'motion/react';
import { LottieIcon } from './LottieIcon';
import { fadeIn } from '../../lib/animations';

interface LoadingScreenProps {
  label?: string;
}

/**
 * Full-screen brand loading splash shown while the app initializes.
 * A CSS spinner sits behind the Lottie so there's always visible activity
 * even before/without the animation engine.
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({ label = 'Loading e-Gramin…' }) => (
  <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-white font-sans px-6">
    <div className="relative flex items-center justify-center">
      {/* CSS fallback spinner */}
      <div className="absolute w-28 h-28 rounded-full border-2 border-slate-700 border-t-emerald-400 animate-spin" />
      <motion.div variants={fadeIn} initial="hidden" animate="visible" className="relative z-10">
        <LottieIcon name="loading" size={120} />
      </motion.div>
    </div>

    <div className="mt-6 flex flex-col items-center gap-2 text-center">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
          e-Gramin
        </span>
      </div>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  </div>
);
