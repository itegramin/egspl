import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '../types';
import { getStoredUsers, saveUsers, logAuditEvent, clearSensitiveStorage } from '../lib/storage';
import { fetchUsersFromSupabase, supabase, mapUserToDb, deleteUserFromSupabase, saveAuditLogToSupabase } from '../lib/supabase';
import { Session, User as SupabaseAuthUser } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';

export type AuthModalMode = 'signin' | 'signup' | 'magic' | 'reset';

// Auth state is derived from Supabase's cookie-persisted session
// (session is stored in Secure, SameSite=Lax cookies — see supabase.ts).
// The session survives page reloads; inactivity is bounded by SessionContext.

interface AuthContextType {
  user: User | null;
  token: string;
  session: Session | null;
  supabaseUser: SupabaseAuthUser | null;
  isAuthenticated: boolean;
  isInitialLoading: boolean;
  allUsers: User[];
  operators: User[];
  clients: User[];
  syncUsers: () => Promise<User[]>;
  refreshSession: () => Promise<{ success: boolean; error?: string }>;

  // Auth Actions
  signInWithPassword: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithPassword: (
    email: string,
    password: string,
    metadata: {
      name: string;
      role?: UserRole;
      companyName?: string;
      phoneNumber?: string;
    }
  ) => Promise<{ success: boolean; error?: string; message?: string }>;
  signInWithOtp: (email: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  resetPasswordForEmail: (email: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  signOut: () => Promise<void>;
  updateUserProfile: (updates: Partial<User>) => Promise<{ success: boolean; error?: string }>;

  // Admin User Governance & Approvals
  approveUser: (userId: string, role?: UserRole) => Promise<{ success: boolean; error?: string }>;
  rejectUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
  adminUpdateUserRole: (userId: string, newRole: UserRole) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>;

  // Profile Modal State
  isProfileModalOpen: boolean;
  openProfileModal: () => void;
  closeProfileModal: () => void;

  // Auth Modal State
  isAuthModalOpen: boolean;
  authModalMode: AuthModalMode;
  openAuthModal: (mode?: AuthModalMode) => void;
  closeAuthModal: () => void;
  setAuthModalMode: (mode: AuthModalMode) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Security: generateMockJWT removed — token is exclusively sourced from
// the live Supabase session (session.access_token). A forgeable client-side
// token must never be used in any authorization context.

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // Auth state is NOT seeded from localStorage — it is populated entirely from
  // Supabase's in-memory onAuthStateChange (INITIAL_SESSION event on mount).
  // This prevents stale auth flags surviving across browser sessions.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const [user, setUserState] = useState<User | null>(null);

  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseAuthUser | null>(null);
  const [token, setToken] = useState<string>('');
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);

  // Profile Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const openProfileModal = () => setIsProfileModalOpen(true);
  const closeProfileModal = () => setIsProfileModalOpen(false);

  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('signin');

  const openAuthModal = (mode: AuthModalMode = 'signin') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => setIsAuthModalOpen(false);

  // Sync users from Supabase csmp_users
  const syncUsers = useCallback(async () => {
    try {
      const dbUsers = await fetchUsersFromSupabase();
      if (dbUsers && dbUsers.length > 0) {
        setAllUsers(dbUsers);
        saveUsers(dbUsers);
        return dbUsers;
      }
    } catch (err: any) {
      console.warn('Supabase users fetch offline, using local storage fallback:', err.message);
    }
    return getStoredUsers();
  }, []);

  // Refresh the Supabase auth session (renew JWT) and re-sync the user profile
  const refreshSession = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.warn('Session refresh failed:', error.message);
        return { success: false, error: error.message };
      }
      if (data.session) {
        setSession(data.session);
        setSupabaseUser(data.session.user);
        setIsAuthenticated(true);
        setToken(data.session.access_token);
        await matchUserToSession(data.session.user);
      }
      return { success: true };
    } catch (err: any) {
      console.warn('Session refresh error:', err.message);
      return { success: false, error: err.message };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initial mount & Supabase Auth state listener
  useEffect(() => {
    let isMounted = true;

    // 1. Initial user sync
    syncUsers();

    // 2. Check initial session — with persistSession: false Supabase does not
    //    restore a session across page reloads from localStorage. Instead it
    //    fires onAuthStateChange(INITIAL_SESSION) synchronously on mount, so
    //    we listen there rather than calling getSession() separately.
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!isMounted) return;
      if (initialSession) {
        setSession(initialSession);
        setSupabaseUser(initialSession.user);
        setIsAuthenticated(true);
        if (initialSession.access_token) {
          setToken(initialSession.access_token);
        }
        matchUserToSession(initialSession.user);
      }
      setIsInitialLoading(false);
    }).catch(() => {
      if (isMounted) setIsInitialLoading(false);
    });

    // 3. Listen to auth state changes (sign-in, sign-out, token refresh, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      setSupabaseUser(newSession?.user || null);

      if (newSession) {
        setIsAuthenticated(true);
        if (newSession.access_token) {
          setToken(newSession.access_token);
        }
        await matchUserToSession(newSession.user);
      } else {
        // Session ended (SIGNED_OUT or TOKEN_EXPIRED) — clear in-memory state
        setIsAuthenticated(false);
        setUserState(null);
        setToken('');
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [syncUsers]);

  // Match auth user to csmp_users profile
  const matchUserToSession = async (authUsr: SupabaseAuthUser) => {
    // ── Step 1: Identity comes from auth.users (the Supabase session).
    // Name, email, uid are always sourced from the JWT / auth object.
    const meta = authUsr.user_metadata || {};
    const authIdentity = {
      email: authUsr.email || '',
      name: (meta.name || meta.full_name || authUsr.email?.split('@')[0] || 'User') as string,
    };

    // ── Step 2: Role + profile fields come from public.csmp_users (auth_user_id FK).
    let { data: dbRow, error: dbErr } = await supabase
      .from('csmp_users')
      .select('id, auth_user_id, name, email, role, status, avatar_url, company_name, phone_number, currency, account, ifsc, bank, kiosk_id, category, estimated_holding_balance, created_at')
      .eq('auth_user_id', authUsr.id)
      .maybeSingle();

    // If not found by auth_user_id, try finding by email
    if (!dbRow && authIdentity.email) {
      const { data: emailRow } = await supabase
        .from('csmp_users')
        .select('id, auth_user_id, name, email, role, status, avatar_url, company_name, phone_number, currency, account, ifsc, bank, kiosk_id, category, estimated_holding_balance, created_at')
        .eq('email', authIdentity.email.trim())
        .maybeSingle();

      if (emailRow) {
        dbRow = emailRow;
        // Link auth_user_id in csmp_users
        await supabase
          .from('csmp_users')
          .update({ auth_user_id: authUsr.id })
          .eq('id', emailRow.id);
      }
    }

    // If still not found in csmp_users, auto-provision user profile (e.g. for new signups)
    if (!dbRow && authUsr) {
      // Security: always provision as 'client' + 'pending' regardless of any
      // role value in user_metadata — role promotion is admin-only.
      const defaultRole: UserRole = 'client';
      const defaultStatus = 'pending';
      const newUserId = `usr_${authUsr.id.substring(0, 8)}`;
      const newUser: User = {
        id: newUserId,
        authUserId: authUsr.id,
        name: authIdentity.name,
        email: authIdentity.email,
        role: defaultRole,
        companyName: meta.company_name || meta.companyName,
        phoneNumber: meta.phone_number || meta.phoneNumber,
        status: defaultStatus,
        currency: meta.currency || 'INR',
        category: (meta.category as any) || 'rural',
        avatarUrl: meta.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${authIdentity.email}`,
        createdAt: new Date().toISOString(),
      };

      try {
        await supabase.from('csmp_users').upsert(mapUserToDb(newUser), { onConflict: 'email' });
        await syncUsers();
        setUserState(newUser);
        return;
      } catch (err) {
        console.warn('Could not auto-provision csmp_users row:', err);
      }
    }

    if (dbRow) {
      // ── Combine: identity from auth.users + role/profile from csmp_users ──
      const matched: User = {
        // Identity: always from auth.users session (authoritative)
        email: authIdentity.email,
        name: authIdentity.name,
        // App ID: from csmp_users row
        id: dbRow.id,
        authUserId: authUsr.id,
        // Role + status: exclusively from csmp_users (never from JWT claims)
        role: dbRow.role as UserRole,
        status: dbRow.status || 'pending',
        // Profile fields: from csmp_users
        avatarUrl: dbRow.avatar_url,
        companyName: dbRow.company_name,
        phoneNumber: dbRow.phone_number,
        estimatedHoldingBalance: dbRow.estimated_holding_balance ? Number(dbRow.estimated_holding_balance) : 0,
        currency: dbRow.currency || 'INR',
        account: dbRow.account || '',
        ifsc: dbRow.ifsc || '',
        bank: dbRow.bank || '',
        kioskId: dbRow.kiosk_id || '',
        category: dbRow.category || 'rural',
        createdAt: dbRow.created_at,
      };

      // Enforce suspended status — deny access even if the JWT is still valid
      if (matched.status === 'suspended') {
        console.warn('matchUserToSession: suspended user attempted login — forcing sign-out.', matched.email);
        await supabase.auth.signOut();
        setSession(null);
        setSupabaseUser(null);
        setIsAuthenticated(false);
        setUserState(null);
        setToken('');
        return;
      }

      setUserState(matched);
      setIsAuthenticated(true);
      await syncUsers(); // keep non-PII user cache in sync
      return;
    }

    // dbErr: network offline or unexpected error — fall back to local cache.
    // Use authIdentity for name/email, local cache only for role fallback.
    const currentUsers = await syncUsers();
    const fallback = currentUsers.find(
      u => u.email.toLowerCase() === authIdentity.email.toLowerCase()
    );

    if (fallback) {
      const offlineUser: User = {
        ...fallback,
        // Always override name/email from the live auth session (authoritative)
        name: authIdentity.name,
        email: authIdentity.email,
      };
      setUserState(offlineUser);
      setIsAuthenticated(true);
      // Offline path: no audit log — USER_SIGNED_IN was already recorded on the successful signInWithPassword call
    }
  };


  // Sign In with Email & Password
  const signInWithPassword = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.session && data.user) {
        setSession(data.session);
        setSupabaseUser(data.user);
        setToken(data.session.access_token);
        setIsAuthenticated(true);
        await matchUserToSession(data.user);
        closeAuthModal();

        // Audit: write USER_SIGNED_IN directly to DB only (not localStorage).
        // matchUserToSession already resolved the csmp_users row — re-use that query result.
        const { data: csmpRow } = await supabase
          .from('csmp_users')
          .select('id, name, role')
          .eq('auth_user_id', data.user.id)
          .maybeSingle();
        if (csmpRow) {
          saveAuditLogToSupabase({
            id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            actorId: csmpRow.id,
            actorName: csmpRow.name,
            actorRole: csmpRow.role,
            action: 'USER_SIGNED_IN',
            targetType: 'user',
            targetId: csmpRow.id,
            details: `Signed in via email/password (${email.trim()})`,
            timestamp: new Date().toISOString(),
            ipAddress: 'Supabase Auth',
          }).catch(() => { });
        }

        return { success: true };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Authentication error' };
    }
  };

  // Sign Up with Email & Password (no role selection needed, defaults to client pending admin approval)
  const signUpWithPassword = async (
    email: string,
    password: string,
    metadata: {
      name: string;
      role?: UserRole;
      companyName?: string;
      phoneNumber?: string;
      holdingAccountId?: string;
    }
  ) => {
    try {
      // Security: always assign 'client' role for self-signups regardless
      // of any metadata.role value supplied by the caller — role promotion
      // is a privileged admin action performed after account approval.
      const defaultRole: UserRole = 'client';
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: metadata.name,
            role: defaultRole, // always 'client' — never trust caller-supplied role
            company_name: metadata.companyName,
            phone_number: metadata.phoneNumber,
            holding_account_id: metadata.holdingAccountId,
            status: 'pending',
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email.trim()}`,
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        const newUser: User = {
          id: `usr_${data.user.id.substring(0, 8)}`,
          authUserId: data.user.id,
          name: metadata.name,
          email: email.trim(),
          role: defaultRole,
          companyName: metadata.companyName,
          phoneNumber: metadata.phoneNumber,
          status: 'pending',
          currency: 'INR',
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email.trim()}`,
          createdAt: new Date().toISOString(),
        };

        try {
          await supabase.from('csmp_users').upsert(mapUserToDb(newUser), { onConflict: 'email' });
          await syncUsers();
        } catch (dbErr) {
          console.warn('Could not insert csmp_users row directly:', dbErr);
        }

        if (data.session) {
          setSession(data.session);
          setSupabaseUser(data.user);
          setToken(data.session.access_token);
          setIsAuthenticated(true);
          await matchUserToSession(data.user);
          closeAuthModal();

          // Audit: new user registration
          saveAuditLogToSupabase({
            id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            actorId: data.user.id,
            actorName: metadata.name,
            actorRole: metadata.role || 'client',
            action: 'USER_SIGNED_UP',
            targetType: 'user',
            targetId: data.user.id,
            details: `New account registered: ${metadata.name} (${email.trim()}) as [${(metadata.role || 'client').toUpperCase()}]`,
            timestamp: new Date().toISOString(),
            ipAddress: 'Supabase Auth',
          }).catch(() => { });

          return { success: true, message: 'Account registered! Awaiting administrator approval.' };
        } else {
          return {
            success: true,
            message: 'Sign up successful! Please check your email or wait for administrator approval.',
          };
        }
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  };

  // Magic Link / Passwordless Sign In
  const signInWithOtp = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Audit: magic link requested
      saveAuditLogToSupabase({
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        actorId: email.trim(),
        actorName: email.trim(),
        actorRole: 'client',
        action: 'MAGIC_LINK_REQUESTED',
        targetType: 'user',
        targetId: email.trim(),
        details: `Magic link / OTP sign-in requested for: ${email.trim()}`,
        timestamp: new Date().toISOString(),
        ipAddress: 'Supabase Auth',
      }).catch(() => { });

      return {
        success: true,
        message: 'Magic link sent! Please check your email inbox to log in.',
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Magic link error' };
    }
  };

  // Password Reset Email
  const resetPasswordForEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Audit: password reset requested
      saveAuditLogToSupabase({
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        actorId: email.trim(),
        actorName: email.trim(),
        actorRole: 'client',
        action: 'PASSWORD_RESET_REQUESTED',
        targetType: 'user',
        targetId: email.trim(),
        details: `Password reset email requested for: ${email.trim()}`,
        timestamp: new Date().toISOString(),
        ipAddress: 'Supabase Auth',
      }).catch(() => { });

      return {
        success: true,
        message: 'Password reset link sent! Please check your email inbox.',
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Password reset failed' };
    }
  };

  // Sign Out
  const signOut = async () => {
    // Audit BEFORE clearing state (so user info is still available)
    if (user) {
      const logEntry = {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        action: 'USER_SIGNED_OUT',
        targetType: 'user' as const,
        targetId: user.id,
        details: `${user.name} (${user.email}) signed out`,
        timestamp: new Date().toISOString(),
        ipAddress: 'Supabase Auth',
      };
      logAuditEvent(user, 'USER_SIGNED_OUT', 'user', user.id, `${user.name} (${user.email}) signed out`);
      saveAuditLogToSupabase(logEntry).catch(() => { });
    }

    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('SignOut warning:', err);
    }
    setSession(null);
    setSupabaseUser(null);
    setIsAuthenticated(false);
    setUserState(null);
    setToken('');
    // Wipe all sensitive data from localStorage (clearSensitiveStorage also
    // removes legacy auth keys) and route back to the public home page.
    clearSensitiveStorage();
    navigate('/', { replace: true });
  };


  const updateUserProfile = async (updates: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'No active user found.' };
    const updatedUser: User = { ...user, ...updates };
    setUserState(updatedUser);
    // Note: setCurrentUser removed — full User object (including PII) is no
    // longer persisted to localStorage. It lives in React state only.

    const updatedList = allUsers.map(u => (u.id === user.id ? updatedUser : u));
    setAllUsers(updatedList);
    // saveUsers strips PII before writing to localStorage
    saveUsers(updatedList);

    // Sync to Supabase csmp_users and auth metadata
    try {
      await supabase.from('csmp_users').upsert(mapUserToDb(updatedUser));
      if (session) {
        await supabase.auth.updateUser({
          data: {
            name: updatedUser.name,
            company_name: updatedUser.companyName,
            phone_number: updatedUser.phoneNumber,
            avatar_url: updatedUser.avatarUrl,
            account: updatedUser.account,
            ifsc: updatedUser.ifsc,
            bank: updatedUser.bank,
            kiosk_id: updatedUser.kioskId,
            category: updatedUser.category,
          },
        });
      }
      logAuditEvent(updatedUser, 'UPDATED_USER_PROFILE', 'user', updatedUser.id, `Updated profile settings for ${updatedUser.name}`);
      return { success: true };
    } catch (err: any) {
      console.warn('Supabase profile sync warning:', err.message);
      return { success: true };
    }
  };

  // Admin Approval Action: Approve pending user and assign active status & role
  const approveUser = async (userId: string, role?: UserRole): Promise<{ success: boolean; error?: string }> => {
    const target = allUsers.find(u => u.id === userId);
    if (!target) return { success: false, error: 'User not found.' };

    const updatedUser: User = {
      ...target,
      status: 'active',
      role: role || target.role,
    };

    const updatedList = allUsers.map(u => (u.id === userId ? updatedUser : u));
    setAllUsers(updatedList);
    saveUsers(updatedList);

    if (user?.id === userId) {
      setUserState(updatedUser);
    }

    try {
      await supabase.from('csmp_users').upsert(mapUserToDb(updatedUser));
      if (user) {
        logAuditEvent(user, 'ADMIN_APPROVED_USER', 'user', userId, `Admin approved user ${updatedUser.name} (${updatedUser.role.toUpperCase()})`);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // Admin Reject/Suspend User Action
  const rejectUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    const target = allUsers.find(u => u.id === userId);
    if (!target) return { success: false, error: 'User not found.' };

    const updatedUser: User = {
      ...target,
      status: 'suspended',
    };

    const updatedList = allUsers.map(u => (u.id === userId ? updatedUser : u));
    setAllUsers(updatedList);
    saveUsers(updatedList);

    if (user?.id === userId) {
      setUserState(updatedUser);
    }

    try {
      await supabase.from('csmp_users').upsert(mapUserToDb(updatedUser));
      if (user) {
        logAuditEvent(user, 'ADMIN_SUSPENDED_USER', 'user', userId, `Admin suspended user ${updatedUser.name}`);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // Admin Update Specific User Role Action
  const adminUpdateUserRole = async (userId: string, newRole: UserRole): Promise<{ success: boolean; error?: string }> => {
    const target = allUsers.find(u => u.id === userId);
    if (!target) return { success: false, error: 'User not found.' };

    const updatedUser: User = {
      ...target,
      role: newRole,
    };

    const updatedList = allUsers.map(u => (u.id === userId ? updatedUser : u));
    setAllUsers(updatedList);
    saveUsers(updatedList);

    if (user?.id === userId) {
      setUserState(updatedUser);
    }

    try {
      await supabase.from('csmp_users').upsert(mapUserToDb(updatedUser));
      if (user) {
        logAuditEvent(user, 'ADMIN_UPDATED_USER_ROLE', 'user', userId, `Changed role of ${updatedUser.name} to [${newRole.toUpperCase()}]`);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // Admin Delete User Action
  const deleteUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    if (user?.id === userId) {
      return { success: false, error: 'You cannot delete your own active account.' };
    }
    const target = allUsers.find(u => u.id === userId);
    if (!target) return { success: false, error: 'User not found.' };

    // Step 1: Immediately suspend in DB so any active JWT is rejected by RLS
    // before the row is physically deleted. This closes the race window.
    try {
      await supabase
        .from('csmp_users')
        .update({ status: 'suspended' })
        .eq('id', userId);
    } catch (err: any) {
      console.warn('Supabase suspend-before-delete warning:', err.message);
    }

    // Step 2: Remove from local state
    const updatedList = allUsers.filter(u => u.id !== userId);
    setAllUsers(updatedList);
    saveUsers(updatedList);

    // Step 3: Delete from csmp_users (auth.users row persists — JWT will be
    // rejected by matchUserToSession which now checks csmp_users existence)
    try {
      await deleteUserFromSupabase(userId);
    } catch (err: any) {
      console.warn('Supabase delete user error:', err.message);
    }

    if (user) {
      logAuditEvent(
        user,
        'ADMIN_DELETED_USER',
        'user',
        userId,
        `Administrator permanently removed user account: ${target.name} (${target.email}, Role: ${target.role.toUpperCase()})`
      );
    }
    return { success: true };
  };

  const operators = allUsers.filter(u => u.role === 'operator' || u.role === 'admin');
  const clients = allUsers.filter(u => u.role === 'client');

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        session,
        supabaseUser,
        isAuthenticated,
        isInitialLoading,
        allUsers,
        operators,
        clients,
        syncUsers,
        refreshSession,
        signInWithPassword,
        signUpWithPassword,
        signInWithOtp,
        resetPasswordForEmail,
        signOut,
        updateUserProfile,
        approveUser,
        rejectUser,
        adminUpdateUserRole,
        deleteUser,
        isProfileModalOpen,
        openProfileModal,
        closeProfileModal,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        setAuthModalMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
