import React, { useState } from 'react';
import { useSessionTimer, EXPIRY_WARNING_SECONDS } from '../../context/SessionContext';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Clock, RefreshCw, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

/**
 * SessionExpiryModal
 *
 * Shown as a warning overlay during the final EXPIRY_WARNING_SECONDS of the
 * session. Unlike InvalidSessionModal (which appears AFTER the session is
 * gone), this appears BEFORE expiry so the user can extend it.
 *
 * Actions:
 *  - "Extend Session" → extendSession(force) → re-issues JWT, rewrites the
 *    cookie with a fresh 15-min Max-Age, resets the in-app countdown.
 *  - "Log Out Now" → signOut() → returns control to the auth flow.
 *
 * If the user does nothing and the countdown hits zero, the absolute timer in
 * SessionContext signs them out (as designed), after which InvalidSessionModal
 * takes over. This modal never overlaps that one.
 */
export const SessionExpiryModal: React.FC = () => {
  const { remainingSeconds, isActive, extendSession } = useSessionTimer();
  const { signOut, isAuthenticated } = useAuth();
  const { toast } = useApp();

  const [isExtending, setIsExtending] = useState(false);

  const isOpen = isActive && isAuthenticated && remainingSeconds > 0 && remainingSeconds <= EXPIRY_WARNING_SECONDS;

  const handleExtend = async () => {
    if (isExtending) return;
    setIsExtending(true);
    const ok = await extendSession(true);
    setIsExtending(false);
    if (ok) {
      toast('Session extended for another 15 minutes.', 'success');
    } else {
      toast('Could not extend session — please sign in again.', 'error');
    }
  };

  const handleLogOut = () => {
    signOut();
  };

  const mm = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
  const ss = String(remainingSeconds % 60).padStart(2, '0');

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="session-expiry-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[58] bg-slate-900/70 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            key="session-expiry-modal"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-0 z-[59] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-expiry-title"
          >
            <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              {/* Top accent bar */}
              <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500" />

              {/* Body */}
              <div className="p-7 flex flex-col items-center text-center gap-4">
                {/* Icon */}
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center shadow-inner shadow-amber-200/40 dark:shadow-amber-900/40">
                    <Clock className="w-8 h-8 text-amber-500 dark:text-amber-400" />
                  </div>
                  <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500" />
                  </span>
                </div>

                {/* Title + description */}
                <div>
                  <h2
                    id="session-expiry-title"
                    className="text-lg font-bold text-slate-900 dark:text-white"
                  >
                    Session Expiring Soon
                  </h2>
                  <p className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    Your session will end in{' '}
                    <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                      {mm}:{ss}
                    </span>
                    . Extend it to keep working, or log out now.
                  </p>
                </div>

                {/* Live countdown bar */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-rose-500 transition-all duration-1000 ease-linear"
                    style={{ width: `${(remainingSeconds / EXPIRY_WARNING_SECONDS) * 100}%` }}
                  />
                </div>
                <p className="-mt-2 text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                  {mm}:{ss} remaining
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full mt-1">
                  {/* Log out now */}
                  <button
                    id="session-expiry-logout-btn"
                    onClick={handleLogOut}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/70 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold transition-all active:scale-95"
                  >
                    <LogOut className="w-4 h-4 text-slate-400" />
                    Log Out Now
                  </button>

                  {/* Extend session */}
                  <button
                    id="session-expiry-extend-btn"
                    onClick={handleExtend}
                    disabled={isExtending}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/25 transition-all active:scale-95"
                  >
                    <RefreshCw className={`w-4 h-4 ${isExtending ? 'animate-spin' : ''}`} />
                    {isExtending ? 'Extending…' : 'Extend Session'}
                  </button>
                </div>

                {/* Hint */}
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Sessions expire automatically for security. Interacting with the
                  database also extends your session.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
