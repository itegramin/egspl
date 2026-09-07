import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { ShieldOff, LogIn, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

/**
 * InvalidSessionModal
 *
 * Shown as an overlay on the app whenever there is no valid auth session
 * (i.e. `session === null`). Because the dashboard is already auth-gated by
 * AppAuthGate, this handles the case where a session that was valid becomes
 * invalid mid-use (expired / revoked / signed out).
 *
 * Provides two actions:
 *  - "Sign In Again" → navigates to the Auth view
 *  - "Go Home" → navigates back to the public home page
 */
export const InvalidSessionModal: React.FC = () => {
  const { isInitialLoading, session } = useAuth();
  const { goToAuth, goToHome } = useApp();

  // While auth status is being checked (initial load / reload), keep the
  // overlay hidden so the LoadingScreen is what the user sees.
  const isOpen = !isInitialLoading && !session;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="invalid-session-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-slate-900/70 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            key="invalid-session-modal"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-0 z-[61] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="invalid-session-title"
          >
            <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              {/* Top accent bar */}
              <div className="h-1 w-full bg-gradient-to-r from-rose-500 via-orange-400 to-rose-500" />

              {/* Body */}
              <div className="p-7 flex flex-col items-center text-center gap-4">
                {/* Icon */}
                <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shadow-inner shadow-rose-200/40 dark:shadow-rose-900/40">
                  <ShieldOff className="w-8 h-8 text-rose-500 dark:text-rose-400" />
                </div>

                {/* Title + description */}
                <div>
                  <h2
                    id="invalid-session-title"
                    className="text-lg font-bold text-slate-900 dark:text-white"
                  >
                    No Valid Session
                  </h2>
                  <p className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    You are not signed in or your authentication session is no
                    longer valid. Sign in again to continue, or return to the
                    home page.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full mt-1">
                  {/* Go home */}
                  <button
                    id="invalid-session-gohome-btn"
                    onClick={goToHome}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold transition-all active:scale-95"
                  >
                    <Home className="w-4 h-4 text-slate-400" />
                    Go Home
                  </button>

                  {/* Sign in again */}
                  <button
                    id="invalid-session-signin-btn"
                    onClick={goToAuth}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/25 transition-all active:scale-95"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign In Again
                  </button>
                </div>

                {/* Hint */}
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Sessions expire automatically for security. Your data is safe.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
