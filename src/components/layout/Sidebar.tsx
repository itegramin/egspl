import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { PageId } from '../../types';
import {
  LayoutDashboard,
  Headphones,
  WalletCards,
  Inbox,
  UserCheck,
  Users,
  BarChart3,
  ShieldCheck,
  ScrollText,
  Bell,
  Settings,
  ChevronRight,
  Sparkles,
  Globe,
  ExternalLink,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NavLink } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────────────────────
// Master page catalogue — defines icon + label for every possible page ID.
// ─────────────────────────────────────────────────────────────────────────────
interface NavItemConfig {
  id: PageId;
  label: string;
  icon: React.ElementType;
  badgeCount?: (requests: any[], user: any, unread: number) => number;
}

const ALL_NAV_ITEMS: NavItemConfig[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'support',
    label: 'Support Requests',
    icon: Headphones,
    badgeCount: (reqs, u) =>
      reqs.filter(
        r => r.type === 'support' &&
          (u.role !== 'client' || r.clientId === u.id) &&
          (r.status === 'pending' || r.status === 'in_progress')
      ).length,
  },
  {
    id: 'holding',
    label: 'Limit Requests',
    icon: WalletCards,
    badgeCount: (reqs, u) =>
      reqs.filter(
        r => (r.type === 'deposit' || r.type === 'withdraw') &&
          (u.role !== 'client' || r.clientId === u.id) &&
          r.status === 'pending'
      ).length,
  },
  {
    id: 'all-requests',
    label: 'All Requests',
    icon: Inbox,
    badgeCount: (reqs, u) =>
      reqs.filter(r => u.role !== 'client' || r.clientId === u.id).length,
  },
  {
    id: 'assignments',
    label: 'Assignments',
    icon: UserCheck,
    badgeCount: (reqs, u) =>
      u.role === 'client' ? 0 : reqs.filter(r => !r.assignedOperatorId && (!r.assignedHandlers || r.assignedHandlers.length === 0) && r.status === 'pending').length,
  },
  {
    id: 'clients',
    label: 'User Directory',
    icon: Users,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
  },
  {
    id: 'rbac',
    label: 'Role Permissions',
    icon: ShieldCheck,
  },
  {
    id: 'audit-logs',
    label: 'Audit Trail',
    icon: ScrollText,
  },
  {
    id: 'notifications',
    label: 'Notification Logs',
    icon: Bell,
    badgeCount: (_reqs, _u, unread) => unread,
  },
  {
    id: 'settings',
    label: 'Settings & Supabase',
    icon: Settings,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Hardcoded role navigation permissions array
// ─────────────────────────────────────────────────────────────────────────────
const ROLE_ALLOWED_PAGES: Record<string, PageId[]> = {
  admin: [
    'dashboard',
    'support',
    'holding',
    'all-requests',
    'assignments',
    'clients',
    'analytics',
    'rbac',
    'audit-logs',
    'notifications',
    'settings',
  ],
  operator: [
    'dashboard',
    'support',
    'holding',
    'all-requests',
    'assignments',
    'analytics',
    'notifications',
  ],
  client: [
    'dashboard',
    'support',
    'holding',
    'notifications'
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar Component
// ─────────────────────────────────────────────────────────────────────────────
export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const {
    requests,
    unreadNotifCount,
    isMobileSidebarOpen,
    closeMobileSidebar,
    themeConfig,
  } = useApp();
  const userRole = user?.role || 'client';
  const allowedPageIds = ROLE_ALLOWED_PAGES[userRole] || ROLE_ALLOWED_PAGES.client;
  const visibleNavItems = ALL_NAV_ITEMS.filter(item => allowedPageIds.includes(item.id));

  const SidebarContent = (
    <div className="p-4 flex flex-col justify-between h-full">
      <div>
        {/* Brand Header */}
        <div className="flex items-center justify-between gap-3 px-2 py-3 mb-4 rounded-xl bg-slate-800/60 border border-slate-700/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-grad-brand flex items-center justify-center text-white shadow-lg shadow-primary-500/25 shrink-0 overflow-hidden">
              {themeConfig?.brandLogoUrl ? (
                <img
                  src={themeConfig.brandLogoUrl}
                  alt="Brand logo"
                  className="w-full h-full object-contain"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-white text-sm tracking-tight leading-none truncate">
                {themeConfig?.brandName || 'E-Gramin Dashboard'}
              </h1>
              <p className="text-[11px] text-primary-300/90 font-medium tracking-wide mt-1 truncate">
                {themeConfig?.brandTagline || 'Client Management'}
              </p>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            type="button"
            onClick={closeMobileSidebar}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section Label */}
        <div className="px-2 mb-2 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Navigation
          </span>
        </div>

        {/* Links — built from hardcoded role permissions */}
        <nav className="space-y-1">
          {visibleNavItems.map(item => {
            const Icon = item.icon;
            const count = item.badgeCount
              ? item.badgeCount(requests, user, unreadNotifCount)
              : 0;

            return (
              <NavLink
                key={item.id}
                id={`sidebar-nav-item-${item.id}`}
                to={`/${item.id}`}
                end={item.id === 'dashboard'}
                onClick={closeMobileSidebar}
                className={({ isActive }) =>
                  `relative w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors group overflow-hidden ${isActive ? 'text-white' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Animated active pill that slides between nav items */}
                    {isActive && (
                      <motion.span
                        layoutId="sidebar-active-pill"
                        className="absolute inset-0 bg-grad-brand shadow-lg shadow-emerald-700/30"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}

                    <div className="relative z-10 flex items-center gap-3 truncate">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                          }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="relative z-10 flex items-center gap-1.5 shrink-0 ml-2">
                      {count > 0 && (
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isActive
                            ? 'bg-white text-emerald-700'
                            : 'bg-slate-800 text-emerald-300 border border-slate-700'
                            }`}
                        >
                          {count}
                        </span>
                      )}
                      {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-70" />}
                    </div>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Public Home Page Link */}
        <div className="mt-4 pt-3 border-t border-slate-800">
          <a
            id="sidebar-public-home-btn"
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all group"
          >
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-emerald-400 group-hover:rotate-12 transition-transform shrink-0" />
              <span>Public Home Page</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Persistent Sidebar */}
      <aside
        id="main-app-sidebar"
        className="hidden lg:flex w-64 shrink-0 bg-slate-900 text-slate-300 flex-col justify-between border-r border-slate-800 select-none h-screen overflow-y-auto"
      >
        {SidebarContent}
      </aside>

      {/* 2. Mobile Sliding Drawer Navigation */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={closeMobileSidebar}
            />

            {/* Slide-out Panel */}
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="relative w-72 max-w-[85vw] bg-slate-900 text-slate-300 flex flex-col justify-between border-r border-slate-800 shadow-2xl h-full z-10 select-none overflow-y-auto"
            >
              {SidebarContent}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
