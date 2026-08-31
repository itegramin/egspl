import React, { useMemo } from 'react';
import { Lottie } from 'lottie-react';
import { LOTTIE_ASSETS, LottieName } from '../../lib/lottieAssets';

interface LottieIconProps {
  name: LottieName;
  /** Rendered width/height in px (container is square). Default 48. */
  size?: number | string;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
}

/**
 * Renders a bundled Lottie animation. If `prefers-reduced-motion` is set, it
 * plays a single static frame instead of looping (accessible default).
 */
export const LottieIcon: React.FC<LottieIconProps> = ({
  name,
  size = 48,
  loop = true,
  autoplay = true,
  className,
}) => {
  const reduceMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  return (
    <Lottie
      src={LOTTIE_ASSETS[name]}
      loop={reduceMotion ? false : loop}
      autoplay={autoplay}
      style={{ width: size, height: size }}
      className={className}
      aria-hidden
    />
  );
};
