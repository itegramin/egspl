import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { ShieldOff, LogIn, RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

/**
 * InvalidSessionModal
 *
 * Shown as an overlay on the app dashboard whenever the user's auth
 * session is missing or expired (i.e. `session === null`).
 *
 * Provides two actions:
 *  - "Sign In" → navigates to the Auth view
 *  - "Refresh Session" → attempts supabase.auth.refreshSession()
 */
export const InvalidSessionModal: React.FC = () => {
  const { session, refreshSession } = useAuth();
  const { goToAuth } = useApp();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Only show when there is no valid session
  const isOpen = !session;

  const handleSignIn = () => {
    goToAuth();
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshSession();
    setIsRefreshing(false);
    // If the session was refreshed successfully, `session` will update
    // reactively and this modal will close automatically.
  };

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
                    Session Expired
                  </h2>
                  <p className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    Your authentication session is no longer valid. You can try
                    refreshing the session, or sign in again to continue.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full mt-1">
                  {/* Refresh attempt */}
                  <button
                    id="invalid-session-refresh-btn"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-500' : 'text-slate-400'}`}
                    />
                    {isRefreshing ? 'Refreshing…' : 'Refresh Session'}
                  </button>

                  {/* Sign in */}
                  <button
                    id="invalid-session-signin-btn"
                    onClick={handleSignIn}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/25 transition-all active:scale-95"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign In
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
