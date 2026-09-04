import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useSessionTimer, SESSION_TIMEOUT_SECONDS } from '../../context/SessionContext';
import { RoleBadge } from '../common/Badge';
import { formatTimeIST } from '../../lib/dateUtils';
import {
  Search,
  Plus,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  Layers,
  LogOut,
  ShieldCheck,
  HelpCircle,
  ArrowDownRight,
  ArrowUpRight,
  LogIn,
  User,
  UserCheck,
  FileText,
  Users,
  BarChart3,
  Settings,
  Wallet,
  Sparkles,
  ExternalLink,
  Shield,
  RefreshCw,
  Globe,
  Home,
  Menu,
  Palette,
  Timer,
  Building,
} from 'lucide-react';
import { NotificationDrawer } from '../notifications/NotificationDrawer';
import { AnimatePresence, motion } from 'motion/react';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = () => {
  const { user, signOut, session, openProfileModal, syncUsers, refreshSession } = useAuth();
  const {
    unreadNotifCount,
    isDarkMode,
    toggleTheme,
    openCreateModal,
    filters,
    setFilters,
    setCurrentPage,
    goToHome,
    permissions,
    syncWithSupabase,
    isSupabaseConnected,
    openThemeModal,
    openBrandingModal,
    toggleMobileSidebar,
    toast,
  } = useApp();

  const { remainingSeconds, isActive, resetTimer } = useSessionTimer();

  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isCreateDropdownOpen, setIsCreateDropdownOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>(new Date());

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    const errors: string[] = [];

    try {
      const [dataResult, usersResult, sessionResult] = await Promise.allSettled([
        syncWithSupabase(),
        syncUsers(),
        refreshSession(),
      ]);

      // Collect individual failures
      if (dataResult.status === 'rejected') {
        console.error('Data sync failed:', dataResult.reason);
        errors.push('data (requests/notifications)');
      }
      if (usersResult.status === 'rejected') {
        console.error('Users sync failed:', usersResult.reason);
        errors.push('user directory');
      }
      if (sessionResult.status === 'fulfilled' && !sessionResult.value.success) {
        console.warn('Session refresh failed:', sessionResult.value.error);
        errors.push('auth session');
      } else if (sessionResult.status === 'rejected') {
        console.error('Session refresh rejected:', sessionResult.reason);
        errors.push('auth session');
      }

      // A successful auth token refresh re-issues the JWT and rewrites the
      // auth cookie with a fresh 15-min Max-Age — so reset the in-app session
      // countdown to match the newly extended cookie lifetime.
      if (sessionResult.status === 'fulfilled' && sessionResult.value.success) {
        resetTimer();
      }

      setLastSyncedAt(new Date());

      if (errors.length === 0) {
        toast('All data, users, and auth session synced successfully.', 'success');
      } else if (errors.length < 3) {
        toast(`Sync partially complete. Could not refresh: ${errors.join(', ')}.`, 'warning');
      } else {
        toast('Sync failed — check your connection and try again.', 'error');
      }
    } catch (err: any) {
      console.error('Unexpected sync error:', err);
      toast(`Sync failed: ${err?.message || 'Unknown error'}`, 'error');
    } finally {
      setTimeout(() => setIsSyncing(false), 600);
    }
  };

  const userRole = user?.role || 'client';

  return (
    <>
      <header
        id="main-app-navbar"
        className="sticky top-0 z-30 h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 lg:px-6 flex items-center justify-between transition-colors"
      >
        {/* Left: Mobile hamburger & Search input */}
        <div className="flex items-center gap-2 sm:gap-4 flex-1 max-w-lg">
          {/* Mobile Sidebar Trigger (only visible on mobile/tablet) */}
          <button
            type="button"
            id="navbar-mobile-menu-btn"
            onClick={toggleMobileSidebar}
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            title="Open navigation menu"
            aria-label="Toggle navigation drawer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="global-search-input"
              type="text"
              placeholder="Search by requests, users, title, or keywords..."
              value={filters.searchQuery}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, searchQuery: e.target.value }));
              }}
              className="w-full pl-9 pr-4 py-1.5 text-xs sm:text-sm rounded-lg bg-slate-100 dark:bg-slate-800 border-none focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-all"
            />
            {filters.searchQuery && (
              <button
                onClick={() => setFilters(prev => ({ ...prev, searchQuery: '' }))}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Right: Actions, theme toggle, notifications, and profile */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Session Countdown Timer */}
          {isActive && (
            <div
              id="session-countdown"
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold tabular-nums transition-colors ${remainingSeconds <= 120
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                : remainingSeconds <= 300
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              title={`Session expires in ${Math.floor(remainingSeconds / 60)}m ${remainingSeconds % 60}s. Database activity or the Sync button extends it.`}
            >
              <Timer className="w-3.5 h-3.5" />
              <span>
                {String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:
                {String(remainingSeconds % 60).padStart(2, '0')}
              </span>
            </div>

          )}

          {/* Live Database Sync / Refresh Button */}
          <button
            id="navbar-manual-sync-btn"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all active:scale-95 disabled:opacity-60"
            title={`Last synced: ${formatTimeIST(lastSyncedAt)} IST • Click to refresh from Supabase`}
            aria-label="Refresh latest updates from database"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`}
            />
            <span className="hidden md:inline">
              {isSyncing ? 'Syncing...' : 'Sync'}
            </span>
          </button>


          {/* Active User Role Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-xs font-medium">
            <span className="text-slate-500 dark:text-slate-400 font-semibold">Role:</span>
            <RoleBadge role={userRole} />
          </div>

          {/* Dark / Light Mode Toggle */}
          <button
            id="theme-toggle-btn"
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle visual theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notifications Bell */}
          <button
            id="notification-bell-btn"
            onClick={() => setIsNotifOpen(true)}
            className="relative p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Notifications"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
              </span>
            )}
          </button>

          {/* Supabase Auth Active Indicator */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${session
              ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
              : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
              }`}
            title="Supabase Auth Session Status"
          >
            {session ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            ) : (
              <LogIn className="w-3.5 h-3.5 text-emerald-500" />
            )}
            <span className="hidden sm:inline">
              {session ? 'Active' : 'In-Active'}
            </span>
          </div>

          {/* User Profile Avatar & Role-Specific Menu */}
          <div className="relative">
            <button
              id="user-profile-menu-btn"
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-emerald-500/30 transition-all"
            >
              <img
                src={user?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'}
                alt={user?.name || 'User'}
                className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
              />
            </button>

            <AnimatePresence>
              {isProfileDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsProfileDropdownOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.16, ease: 'easeOut' }}
                    className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 origin-top-right"
                  >
                    {/* Profile Header */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <img
                          src={user?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'}
                          alt={user?.name || 'User'}
                          className="w-11 h-11 rounded-full object-cover border-2 border-emerald-500/40 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            <div className='flex items-center gap-1 justify-baseline'>
                              <span>{user?.name || 'Authenticated User'}</span>
                              <span><RoleBadge role={userRole} /></span>
                            </div>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {user?.email || ''}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Role-Specific Navigation & Features */}
                    <div className="p-1.5 space-y-0.5 max-h-80 overflow-y-auto">
                      {/* Common: Edit Profile Action */}
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          openProfileModal();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-colors"
                      >
                        <User className="w-4 h-4 text-emerald-500" />
                        <span>Edit My Profile & Avatar</span>
                      </button>

                      <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                      {/* ===================================================
                        ADMIN ROLE SPECIFIC ITEMS
                       =================================================== */}
                      {userRole === 'admin' && (
                        <>
                          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Executive Governance
                          </div>

                          {/* Theme Customizer */}
                          <button
                            id="profile-theme-btn"
                            onClick={() => {
                              setIsProfileDropdownOpen(false);
                              openThemeModal();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-semibold text-primary-600 dark:text-primary-400 bg-primary-50/70 dark:bg-primary-950/40 hover:bg-primary-100 dark:hover:bg-primary-900/50 rounded-xl transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <Palette className="w-4 h-4 text-primary-500" />
                              <span>Theme Customization</span>
                            </div>
                            <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-primary-200/70 dark:bg-primary-900/80 text-primary-700 dark:text-primary-300">
                              LIVE
                            </span>
                          </button>

                          {/* Branding (admin only) */}
                          <button
                            id="profile-branding-btn"
                            onClick={() => {
                              setIsProfileDropdownOpen(false);
                              openBrandingModal();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-semibold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 rounded-xl transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <Building className="w-4 h-4 text-violet-500" />
                              <span>Portal Branding</span>
                            </div>
                            <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-violet-100 dark:bg-violet-900/80 text-violet-700 dark:text-violet-300">
                              ADMIN
                            </span>
                          </button>

                          <button
                            onClick={() => {
                              setIsProfileDropdownOpen(false);
                              setCurrentPage('rbac');
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-xl transition-colors"
                          >
                            <ShieldCheck className="w-4 h-4 text-purple-500" />
                            <span>RBAC Permission Matrix</span>
                          </button>
                          <button
                            onClick={() => {
                              setIsProfileDropdownOpen(false);
                              setCurrentPage('clients');
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-xl transition-colors"
                          >
                            <Users className="w-4 h-4 text-blue-500" />
                            <span>Client & Staff Directory</span>
                          </button>
                          <button
                            onClick={() => {
                              setIsProfileDropdownOpen(false);
                              setCurrentPage('analytics');
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-xl transition-colors"
                          >
                            <BarChart3 className="w-4 h-4 text-emerald-500" />
                            <span>Analytics & SLA Metrics</span>
                          </button>
                          <button
                            onClick={() => {
                              setIsProfileDropdownOpen(false);
                              setCurrentPage('audit-logs');
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-xl transition-colors"
                          >
                            <FileText className="w-4 h-4 text-amber-500" />
                            <span>Platform Audit Logs</span>
                          </button>
                          <button
                            onClick={() => {
                              setIsProfileDropdownOpen(false);
                              setCurrentPage('settings');
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-xl transition-colors"
                          >
                            <Settings className="w-4 h-4 text-slate-400" />
                            <span>System & Database Settings</span>
                          </button>
                        </>
                      )}

                      {/* ===================================================
                        OPERATOR ROLE SPECIFIC ITEMS
                       =================================================== */}
                      {userRole === 'operator' && (
                        <>
                          {/* Theme Customizer */}
                          <button
                            id="profile-theme-btn-op"
                            onClick={() => {
                              setIsProfileDropdownOpen(false);
                              openThemeModal();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-semibold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40 rounded-xl transition-colors mb-1"
                          >
                            <Palette className="w-4 h-4 text-primary-500" />
                            <span>Theme Customization</span>
                          </button>

                          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Staff Work Queues
                          </div>
                          <button
                            onClick={() => {
                              setIsProfileDropdownOpen(false);
                              setCurrentPage('support');
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-xl transition-colors"
                          >
                            <HelpCircle className="w-4 h-4 text-emerald-500" />
                            <span>Support Tickets Queue</span>
                          </button>
                          <button
                            onClick={() => {
                              setIsProfileDropdownOpen(false);
                              setCurrentPage('holding');
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-xl transition-colors"
                          >
                            <Wallet className="w-4 h-4 text-emerald-500" />
                            <span>Holding Approvals & Payouts</span>
                          </button>
                          <button
                            onClick={() => {
                              setIsProfileDropdownOpen(false);
                              setCurrentPage('all-requests');
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-xl transition-colors"
                          >
                            <Layers className="w-4 h-4 text-purple-500" />
                            <span>All Service Requests</span>
                          </button>
                          <button
                            onClick={() => {
                              setIsProfileDropdownOpen(false);
                              setCurrentPage('clients');
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-xl transition-colors"
                          >
                            <Users className="w-4 h-4 text-blue-500" />
                            <span>Client Directory</span>
                          </button>
                        </>
                      )}

                      {/* ===================================================
                        CLIENT ROLE SPECIFIC ITEMS
                       =================================================== */}
                      {userRole === 'client' && (
                        <>
                          {/* Theme Customizer */}
                          <button
                            id="profile-theme-btn-cl"
                            onClick={() => {
                              setIsProfileDropdownOpen(false);
                              openThemeModal();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-semibold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40 rounded-xl transition-colors mb-1"
                          >
                            <Palette className="w-4 h-4 text-primary-500" />
                            <span>Theme Customization</span>
                          </button>

                          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Quick Client Actions
                          </div>
                          <button
                            onClick={() => {
                              setIsProfileDropdownOpen(false);
                              openCreateModal('support');
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-colors"
                          >
                            <HelpCircle className="w-4 h-4" />
                            <span>Submit Support Ticket</span>
                          </button>
                          <button
                            onClick={() => {
                              setIsProfileDropdownOpen(false);
                              openCreateModal('deposit');
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-colors"
                          >
                            <ArrowDownRight className="w-4 h-4" />
                            <span>Deposit Funds (Wire/SEPA)</span>
                          </button>
                          <button
                            onClick={() => {
                              setIsProfileDropdownOpen(false);
                              openCreateModal('withdraw');
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-xl transition-colors"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                            <span>Request Payout / Withdrawal</span>
                          </button>

                          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            My Portal
                          </div>
                          <button
                            onClick={() => {
                              setIsProfileDropdownOpen(false);
                              setCurrentPage('support');
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-xl transition-colors"
                          >
                            <HelpCircle className="w-4 h-4 text-emerald-500" />
                            <span>My Technical Tickets</span>
                          </button>
                        </>
                      )}
                    </div>

                    {/* Sign Out Button */}
                    <div className="p-1.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          signOut();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Notifications Drawer */}
      <NotificationDrawer isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
    </>
  );
};
