import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { RoleBadge } from '../common/Badge';
import {
  Settings,
  Database,
  Key,
  ShieldCheck,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertTriangle,
  Server,
  User,
  Copy,
  ExternalLink,
  Radio,
  Layers,
  Sparkles,
  Palette
} from 'lucide-react';
import { resetToDemoData } from '../../lib/storage';
import { checkSupabaseHealth } from '../../lib/supabase';
import { formatTimeIST } from '../../lib/dateUtils';
import { THEME_PRESETS, SURFACE_TONES, RADIUS_VALUES } from '../../lib/theme';

export const SettingsView: React.FC = () => {
  const { user, token, session, openAuthModal, openProfileModal } = useAuth();
  const { requests, auditLogs, syncWithSupabase, openThemeModal, themeConfig, toast } = useApp();

  const [isTestingDb, setIsTestingDb] = useState(false);
  const [healthResult, setHealthResult] = useState<{
    connected: boolean;
    latencyMs: number;
    error?: string;
    tables?: { users: number; requests: number; auditLogs: number };
  } | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // Auto-check on mount
  useEffect(() => {
    checkSupabaseHealth().then(res => {
      setHealthResult(res);
    });
  }, []);

  const handleTestConnection = async () => {
    setIsTestingDb(true);
    try {
      const res = await checkSupabaseHealth();
      setHealthResult(res);
      if (res.connected) {
        toast(`Supabase PostgreSQL live! Latency: ${res.latencyMs}ms`, 'success');
        syncWithSupabase();
      } else {
        toast(`Supabase connection error: ${res.error}`, 'error');
      }
    } finally {
      setIsTestingDb(false);
    }
  };

  const handleCopyJwt = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      setCopiedToken(true);
      toast('JWT Auth Token copied to clipboard', 'info');
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  // Admin-only gate
  if (user?.role !== 'admin') {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-4 py-16">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Administrator Access Required</h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Platform settings, Supabase database connections, and environment diagnostics are restricted to platform administrators.
        </p>
      </div>
    );
  }

  const handleResetData = () => {
    if (window.confirm('Reset all demo requests and audit logs to original factory seeds?')) {
      resetToDemoData();
      toast('Demo data reset successfully. Reloading workspace...', 'info');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  const handleExportBackup = () => {
    const backup = {
      user,
      requests,
      auditLogs,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `client_service_platform_backup_${Date.now()}.json`;
    a.click();
    toast('System backup downloaded as JSON', 'success');
  };

  return (
    <div id="settings-view" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Settings className="w-5 h-5" />
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            System & Supabase Database Settings
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Local Supabase instance configuration, PostgreSQL health check, JWT tokens, and platform controls.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: User Profile & JWT */}
        <div className="lg:col-span-1 space-y-6">
          {/* User Profile Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-500" />
              <span>Current Authenticated Identity</span>
            </h3>

            <div className="flex items-center gap-3 pt-2">
              <img
                src={user?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'}
                alt={user?.name || 'User'}
                className="w-14 h-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
              />
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">{user?.name || 'Authenticated User'}</div>
                <div className="text-xs text-slate-400">{user?.email || ''}</div>
                <div className="mt-1">
                  <RoleBadge role={user?.role || 'client'} />
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">User ID:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">{user?.id || 'usr_active'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Company:</span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">{user?.companyName || 'Platform Operations'}</span>
              </div>
              {user?.bank && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Bank Name:</span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{user.bank}</span>
                </div>
              )}
              {user?.ifsc && (
                <div className="flex justify-between">
                  <span className="text-slate-400">IFSC Code:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">{user.ifsc}</span>
                </div>
              )}
              {user?.account && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Account No:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">
                    ••••{user.account.slice(-4)}
                  </span>
                </div>
              )}
              {user?.kioskId && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Kiosk ID:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">{user.kioskId}</span>
                </div>
              )}
            </div>

            <button
              onClick={openProfileModal}
              className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <User className="w-3.5 h-3.5" />
              <span>Edit Profile Details</span>
            </button>
          </div>

          {/* JWT Token Inspector */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-500" />
                <span>JWT Authentication Token</span>
              </h3>
              <button
                onClick={handleCopyJwt}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedToken ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 text-slate-300 font-mono text-[10px] break-all leading-relaxed max-h-24 overflow-y-auto border border-slate-800">
              {token || 'No active token'}
            </div>
            <p className="text-[11px] text-slate-400">
              Contains signed claims for <span className="font-semibold">{user?.role || 'client'}</span> role-based row level security (RLS).
            </p>
          </div>

          {/* Supabase Auth Session Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Supabase Auth Session</span>
              </h3>
              {session ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  Live Session
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                  Persona Mode
                </span>
              )}
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Provider:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">Email & Password / OTP</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className={`font-semibold ${session ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                  {session ? 'Authenticated' : 'Local Persona Active'}
                </span>
              </div>
              {session && (
                <div className="flex justify-between truncate">
                  <span className="text-slate-400">Expires:</span>
                  <span className="font-mono text-slate-600 dark:text-slate-400">
                    {session.expires_at ? `${formatTimeIST(session.expires_at * 1000)} IST` : 'Active'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Theme & Visual Identity Card (Admin Only) */}
          {user?.role === 'admin' && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Palette className="w-4 h-4 text-indigo-500" />
                  <span>Platform Theme & Styling</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  {THEME_PRESETS[themeConfig.preset]?.name.split(' ')[0] || 'Custom'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Primary Accent:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: THEME_PRESETS[themeConfig.preset]?.primaryHex }}
                    />
                    {THEME_PRESETS[themeConfig.preset]?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Dark Surface:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {SURFACE_TONES[themeConfig.surfaceTone]?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Corner Radius:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {RADIUS_VALUES[themeConfig.radius]?.name}
                  </span>
                </div>
              </div>

              <button
                id="settings-theme-customizer-btn"
                onClick={openThemeModal}
                className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Customize Visual Theme</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Supabase Architecture & Database */}
        <div className="lg:col-span-2 space-y-6">
          {/* Supabase Live Status Card */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Supabase PostgreSQL Live Architecture
                  </h3>
                  {healthResult?.connected ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      Live ({healthResult.latencyMs}ms)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300">
                      Offline / Local Fallback
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Connected to local Supabase backend with Realtime subscriptions and PostgreSQL schema tables.
                </p>
              </div>

              <button
                id="test-supabase-conn-btn"
                onClick={handleTestConnection}
                disabled={isTestingDb}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all self-start sm:self-auto"
              >
                {isTestingDb ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Server className="w-4 h-4" />
                )}
                <span>{isTestingDb ? 'Pinging DB...' : 'Test Connection'}</span>
              </button>
            </div>

            {/* Live Diagnostics Card */}
            {healthResult?.connected ? (
              <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Database Health: Optimal (PostgreSQL 15 via PostgREST)</span>
                  </div>
                  <span className="font-mono text-emerald-700 dark:text-emerald-300 font-bold">
                    Latency: {healthResult.latencyMs}ms
                  </span>
                </div>

                {healthResult.tables && (
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40 text-xs">
                    <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/60 text-center">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Users Table</div>
                      <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                        {healthResult.tables.users} rows
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/60 text-center">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Requests Table</div>
                      <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                        {healthResult.tables.requests} rows
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/60 text-center">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Audit Logs</div>
                      <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                        {healthResult.tables.auditLogs} rows
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : healthResult?.error ? (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Connection Warning:</strong> {healthResult.error}. Applet is operating smoothly with local storage mirror.
                </div>
              </div>
            ) : null}

            {/* Supabase Environment Specs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Supabase Studio Dashboard</div>
                  <div className="font-mono text-slate-900 dark:text-white font-semibold mt-1">
                    http://127.0.0.1:54323
                  </div>
                </div>
                <a
                  href="http://127.0.0.1:54323"
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
                  title="Open Supabase Studio"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Mailpit Email Inbox</div>
                  <div className="font-mono text-slate-900 dark:text-white font-semibold mt-1">
                    http://127.0.0.1:54324
                  </div>
                </div>
                <a
                  href="http://127.0.0.1:54324"
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
                  title="Open Mailpit"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">PostgREST API Endpoint</div>
                <div className="font-mono text-slate-800 dark:text-slate-200 font-medium truncate mt-1">
                  http://127.0.0.1:54321/rest/v1
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">PostgreSQL Connection</div>
                <div className="font-mono text-slate-800 dark:text-slate-200 font-medium truncate mt-1">
                  postgresql://postgres:postgres@127.0.0.1:54322/postgres
                </div>
              </div>
            </div>

            {/* Database Tables Mapping */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                PostgreSQL Schema Tables & Entities
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="font-mono font-bold text-slate-900 dark:text-white">public.csmp_requests</div>
                  <p className="text-[11px] text-slate-400 mt-1">Stores support tickets, deposits, and withdrawal requests.</p>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="font-mono font-bold text-slate-900 dark:text-white">public.csmp_audit_logs</div>
                  <p className="text-[11px] text-slate-400 mt-1">Immutable security ledger of user actions and status updates.</p>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="font-mono font-bold text-slate-900 dark:text-white">public.csmp_role_permissions</div>
                  <p className="text-[11px] text-slate-400 mt-1">Dynamic RBAC mapping for pages and capabilities.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Backup & Factory Reset */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Data Management & Backup
            </h3>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={handleExportBackup}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export System JSON Snapshot</span>
              </button>

              <button
                onClick={handleResetData}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reset Demo State to Factory Seeds</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
