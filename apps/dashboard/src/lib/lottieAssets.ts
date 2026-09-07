/**
 * Registry of bundled Lottie animations.
 * JSONs live in src/assets/lottie so Vite bundles them locally — no external
 * hosts (the app CSP blocks remote animation sources).
 */
import loading from '../assets/lottie/loading.json';
import success from '../assets/lottie/success.json';
import empty from '../assets/lottie/empty.json';

export type LottieName = 'loading' | 'success' | 'empty';

export const LOTTIE_ASSETS: Record<LottieName, object> = {
  loading,
  success,
  empty,
};
