import { getSupabaseClient, isSupabaseConfigured } from './client';
import type { Session, User as SupabaseAuthUser } from '@supabase/supabase-js';

export async function signInWithEmail(email: string, password: string) {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase not configured' };
  }
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { success: false, error: error.message };
  return { success: true, session: data.session, user: data.user };
}

export async function signUpWithEmail(
  email: string,
  password: string,
  metadata: { name: string; role?: string; companyName?: string; phoneNumber?: string }
) {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase not configured' };
  }
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: metadata },
  });
  if (error) return { success: false, error: error.message };
  if (data.user?.identities?.length === 0) {
    return { success: false, error: 'An account with this email already exists.' };
  }
  return {
    success: true,
    session: data.session,
    user: data.user,
    message: data.session
      ? undefined
      : 'Account created successfully! Please check your email to confirm your account.',
  };
}

export async function signInWithOtp(email: string) {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase not configured' };
  }
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) return { success: false, error: error.message };
  return { success: true, message: 'Magic link sent! Check your email.' };
}

export async function resetPassword(email: string) {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase not configured' };
  }
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${import.meta.env.VITE_DASHBOARD_URL}/reset-password`,
  });
  if (error) return { success: false, error: error.message };
  return { success: true, message: 'Password reset email sent! Check your inbox.' };
}

export async function signOut() {
  if (!isSupabaseConfigured) return;
  const supabase = getSupabaseClient();
  await supabase.auth.signOut();
  // Clear the cross-subdomain cookie
  document.cookie = 'egspl-session=; path=/; domain=.egraminservices.com; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

export function onAuthStateChange(callback: (event: string, session: Session | null) => void) {
  const supabase = getSupabaseClient();
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

export async function getSession(): Promise<Session | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function refreshSession(): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase not configured' };
  }
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) return { success: false, error: error.message };
  if (!data.session) return { success: false, error: 'No active session' };
  return { success: true };
}
