export { getSupabaseClient, isSupabaseConfigured, supabaseUrl, supabaseAnonKey } from './client';
export { signInWithEmail, signUpWithEmail, signInWithOtp, resetPassword, signOut, onAuthStateChange, getSession, refreshSession } from './auth';
export { AuthContext, useAuth, useAuthState, useAuthProvider } from './hooks';
export type { AuthContextValue } from './hooks';
export type { Session, SupabaseAuthUser } from './types';
