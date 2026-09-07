import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';

/**
 * Absolute session timer, aligned with the auth cookie max-age.
 *
 * The session runs on a fixed 15-minute countdown that does NOT reset on
 * user interaction. It matches the cookie Max-Age (15 min) enforced by
 * lib/cookieStorage.ts, so both the in-app timer and the stored auth cookie
 * expire together. When the countdown hits zero (or the cookie expires),
 * signOut() is called and the user is logged out of the dashboard.
 *
 * The ways to extend this timer (each re-issues the JWT, rewrites the cookie
 * with a fresh Max-Age, then resets this countdown to match):
 *   - Sign in again.
 *   - The "Extend Session" button in the SessionExpiryModal warning.
 *   - The Sync button in the Navbar.
 *   - Any Supabase database write (auto-extend, throttled to once/90s).
 *
 * A readable `remainingSeconds` is exposed so the Navbar can display a
 * countdown clock (MM:SS), and SessionExpiryModal is shown during the final
 * EXPIRY_WARNING_SECONDS to warn the user before auto sign-out.
 */

export const SESSION_TIMEOUT_SECONDS = 15 * 60; // 15 minutes — aligned with cookie max-age

/**
 * Below this remaining-seconds threshold the SessionExpiryModal warning is shown.
 */
export const EXPIRY_WARNING_SECONDS = 90; // warn during the final 90 seconds

interface SessionTimerContextType {
  /** Seconds left before auto sign-out. Starts at SESSION_TIMEOUT_SECONDS. */
  remainingSeconds: number;
  /** Whether the timer has been armed (user must be authenticated). */
  isActive: boolean;
  /** Manually reset the timer (e.g. after a user action on the UI). */
  resetTimer: () => void;
  /**
   * Extend the session for a full SESSION_TIMEOUT_SECONDS. Re-issues the JWT
   * (writing a fresh cookie Max-Age) and resets the in-app countdown to match.
   *
   * - `force` (manual: the Extend Session button / Navbar sync) always extends.
   * - Auto-extends from DB interactions are throttled to once per
   *   AUTO_EXTEND_INTERVAL so we don't hammer the refresh endpoint.
   *
   * Returns true if the session was (or already is) validly extended.
   */
  extendSession: (force?: boolean) => Promise<boolean>;
  /** Whether the user was signed-out due to inactivity. */
  wasSignedOut: boolean;
  /** Clear the "was signed out" flag (e.g. after showing a toast). */
  clearSignedOutFlag: () => void;
}

/** Minimum gap between throttled auto-extends from DB interactions. */
const AUTO_EXTEND_INTERVAL = 90_000; // 90 seconds

const SessionTimerContext = createContext<SessionTimerContextType | undefined>(undefined);

export const SessionTimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, signOut, refreshSession } = useAuth();

  const [remainingSeconds, setRemainingSeconds] = useState<number>(SESSION_TIMEOUT_SECONDS);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [wasSignedOut, setWasSignedOut] = useState<boolean>(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastInteractionRef = useRef<number>(Date.now());
  const lastExtendedAtRef = useRef<number>(0);

  // Reset the countdown back to full
  const resetTimer = useCallback(() => {
    lastInteractionRef.current = Date.now();
    setRemainingSeconds(SESSION_TIMEOUT_SECONDS);
  }, []);

  const clearSignedOutFlag = useCallback(() => setWasSignedOut(false), []);

  /**
   * Refresh the underlying auth cookie and reset the in-app countdown so the
   * two stay aligned. Throttled unless `force` (manual) is passed.
   */
  const extendSession = useCallback(
    async (force?: boolean): Promise<boolean> => {
      const now = Date.now();

      // If we already refreshed within the throttle window (and the user isn't
      // explicitly requesting an extend), no round-trip is needed — the cookie
      // is still near-fresh, so just top the countdown back up.
      if (!force && now - lastExtendedAtRef.current < AUTO_EXTEND_INTERVAL) {
        resetTimer();
        return true;
      }

      const res = await refreshSession();
      if (res.success) {
        lastExtendedAtRef.current = Date.now();
        resetTimer();
        return true;
      }
      return false;
    },
    [refreshSession, resetTimer]
  );

  // ── Countdown interval: fixed countdown, never reset by user activity ───
  // The session is an ABSOLUTE timer aligned with the cookie max-age. It
  // counts down continuously and is not extended by clicks/mouse/keyboard.
  useEffect(() => {
    if (!isActive) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    setRemainingSeconds(SESSION_TIMEOUT_SECONDS);
    lastInteractionRef.current = Date.now();

    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastInteractionRef.current) / 1000);
      const left = SESSION_TIMEOUT_SECONDS - elapsed;

      if (left <= 0) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        setRemainingSeconds(0);
        setWasSignedOut(true);
        signOut();
        return;
      }

      setRemainingSeconds(left);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isActive, signOut]);

  // ── Arm / disarm the timer based on auth state ───────────────────────────
  useEffect(() => {
    if (isAuthenticated) {
      setIsActive(true);
      lastExtendedAtRef.current = Date.now();
      resetTimer();
    } else {
      setIsActive(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRemainingSeconds(SESSION_TIMEOUT_SECONDS);
    }
  }, [isAuthenticated, resetTimer]);

  return (
    <SessionTimerContext.Provider
      value={{ remainingSeconds, isActive, resetTimer, extendSession, wasSignedOut, clearSignedOutFlag }}
    >
      {children}
    </SessionTimerContext.Provider>
  );
};

export const useSessionTimer = () => {
  const ctx = useContext(SessionTimerContext);
  if (!ctx) {
    throw new Error('useSessionTimer must be used within a SessionTimerProvider');
  }
  return ctx;
};
