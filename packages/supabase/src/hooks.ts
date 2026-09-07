import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import type { Session, SupabaseAuthUser } from './types';
import { onAuthStateChange, getSession, signInWithEmail, signUpWithEmail, signInWithOtp, resetPassword, signOut as authSignOut } from './auth';

interface AuthState {
  session: Session | null;
  supabaseUser: SupabaseAuthUser | null;
  isAuthenticated: boolean;
  isInitialLoading: boolean;
}

interface AuthActions {
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, metadata: Record<string, unknown>) => Promise<{ success: boolean; error?: string; message?: string }>;
  signInOtp: (email: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  resetPwd: (email: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<{ success: boolean; error?: string }>;
}

export type AuthContextValue = AuthState & AuthActions;

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useAuthState(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseAuthUser | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    getSession().then((s) => {
      if (!mounted) return;
      setSession(s);
      setSupabaseUser(s?.user ?? null);
      setIsInitialLoading(false);
    });

    const { data: { subscription } } = onAuthStateChange((event, s) => {
      if (!mounted) return;
      setSession(s);
      setSupabaseUser(s?.user ?? null);
      setIsInitialLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    supabaseUser,
    isAuthenticated: Boolean(session),
    isInitialLoading,
  };
}

export function useAuthProvider(): AuthContextValue {
  const authState = useAuthState();

  const signIn = useCallback(async (email: string, password: string) => {
    return signInWithEmail(email, password);
  }, []);

  const signUp = useCallback(async (email: string, password: string, metadata: Record<string, unknown>) => {
    return signUpWithEmail(email, password, metadata as { name: string; role?: string; companyName?: string; phoneNumber?: string });
  }, []);

  const signInOtp = useCallback(async (email: string) => {
    return signInWithOtp(email);
  }, []);

  const resetPwd = useCallback(async (email: string) => {
    return resetPassword(email);
  }, []);

  const signOut = useCallback(async () => {
    await authSignOut();
  }, []);

  const refreshSession = useCallback(async () => {
    const s = await getSession();
    if (!s) return { success: false, error: 'No session' };
    return { success: true };
  }, []);

  return {
    ...authState,
    signIn,
    signUp,
    signInOtp,
    resetPwd,
    signOut,
    refreshSession,
  };
}
