import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge, PriorityBadge, TypeBadge } from '../common/Badge';
import { formatHeaderDateIST, formatShortDateIST } from '../../lib/dateUtils';
import { motion } from 'motion/react';
import { staggerContainer, staggerItem, fadeUp } from '../../lib/animations';
import { AnimatedNumber } from '../common/AnimatedNumber';
import {
  Layers,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Headphones,
  Plus,
  Download,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  FileText,
  Trash2,
  Megaphone,
  X,
  Info,
  CheckCircle,
  AlertOctagon,
} from 'lucide-react';
import { HoldingDepositRequest, HoldingWithdrawRequest } from '../../types';

export const DashboardOverview: React.FC = () => {
  const { requests, filteredRequests, setActiveRequest, openCreateModal, triggerExportCSV, setCurrentPage, setFilters, permissions, activeGlobalNotice } = useApp();
  const { user } = useAuth();

  // Session-level dismiss state for the global notice banner
  const [dismissedNoticeId, setDismissedNoticeId] = useState<string | null>(null);

  // Role-filtered requests for metrics
  const userVisibleReqs = requests.filter(r => user.role !== 'client' || r.clientId === user.id);

  const pendingCount = userVisibleReqs.filter(r => r.status === 'pending').length;
  const inProgressCount = userVisibleReqs.filter(r => r.status === 'in_progress').length;
  const completedCount = userVisibleReqs.filter(r => r.status === 'completed').length;
  const urgentCount = userVisibleReqs.filter(r => r.priority === 'urgent' && r.status !== 'completed').length;
  const pendingDeletionCount = requests.filter(r => r.deleteRequested).length;

  const supportCount = userVisibleReqs.filter(r => r.type === 'support').length;
  const depositReqs = userVisibleReqs.filter(r => r.type === 'deposit') as HoldingDepositRequest[];
  const withdrawReqs = userVisibleReqs.filter(r => r.type === 'withdraw') as HoldingWithdrawRequest[];

  const totalDepositVolumeUSD = depositReqs.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const totalWithdrawVolumeUSD = withdrawReqs.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const recentRequests = [...userVisibleReqs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 5);

  const canCreate = user?.role === 'client' && (permissions[user?.role || 'client']?.canCreateRequest ?? true);
  const isStaff = user.role === 'admin' || user.role === 'operator';


  return (
    <div id="dashboard-overview-page" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Welcome */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-grad-brand-deep text-white p-6 rounded-2xl shadow-xl border border-emerald-900/40 brand-glow"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
              {user.role} Workspace
            </span>
            <span className="text-xs text-slate-400">
              {formatHeaderDateIST()}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Welcome back, {user.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            {user.role === 'client'
              ? 'Track your active technical support tickets and submit Holding balance update requests.'
              : user.role === 'operator'
                ? 'Review pending client requests, verify holding receipts, and manage support fulfillment.'
                : 'Enterprise overview of service operations, SLA metrics, operator performance, and RBAC control.'}
          </p>
        </div>

        {/* Quick Top Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {canCreate && (
            <button
              id="dashboard-new-request-btn"
              onClick={() => openCreateModal('support')}
              className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 active:scale-98 text-white text-xs sm:text-sm font-bold shadow-lg shadow-primary-600/30 flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Request</span>
            </button>
          )}
        </div>
      </motion.div>

      {/* ── Global Notice Banner (all roles, session-dismissable) ── */}
      {activeGlobalNotice && activeGlobalNotice.id !== dismissedNoticeId && (() => {
        const palette = {
          info:    { bg: 'bg-blue-50 dark:bg-blue-950/40',    border: 'border-blue-200 dark:border-blue-800/80',    text: 'text-blue-900 dark:text-blue-100',    sub: 'text-blue-700 dark:text-blue-300/80',    icon: <Info className="w-5 h-5" />,          iconBg: 'bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400',  btn: 'bg-blue-600 hover:bg-blue-700' },
          success: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800/80', text: 'text-emerald-900 dark:text-emerald-100', sub: 'text-emerald-700 dark:text-emerald-300/80', icon: <CheckCircle className="w-5 h-5" />,  iconBg: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400', btn: 'bg-emerald-600 hover:bg-emerald-700' },
          warning: { bg: 'bg-amber-50 dark:bg-amber-950/40',   border: 'border-amber-200 dark:border-amber-800/80',   text: 'text-amber-900 dark:text-amber-100',   sub: 'text-amber-700 dark:text-amber-300/80',   icon: <AlertTriangle className="w-5 h-5" />, iconBg: 'bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400',   btn: 'bg-amber-600 hover:bg-amber-700' },
          error:   { bg: 'bg-red-50 dark:bg-red-950/40',      border: 'border-red-200 dark:border-red-800/80',      text: 'text-red-900 dark:text-red-100',      sub: 'text-red-700 dark:text-red-300/80',      icon: <AlertOctagon className="w-5 h-5" />,  iconBg: 'bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-400',       btn: 'bg-red-600 hover:bg-red-700' },
        };
        const p = palette[activeGlobalNotice.type] || palette.info;
        return (
          <div className={`p-4 rounded-xl border flex items-start gap-3 ${p.bg} ${p.border}`}>
            <div className={`p-2 rounded-lg shrink-0 ${p.iconBg}`}>{p.icon}</div>
            <div className="flex-1 min-w-0">
              <div className={`flex items-center gap-2 mb-0.5`}>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/50 dark:bg-white/10 text-current">
                  <Megaphone className="w-2.5 h-2.5" /> Platform Notice
                </span>
              </div>
              <div className={`text-xs sm:text-sm font-bold ${p.text}`}>{activeGlobalNotice.title}</div>
              <p className={`text-xs mt-0.5 ${p.sub}`}>{activeGlobalNotice.message}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className={`text-[11px] ${p.sub} opacity-70`}>
                  Issued by {activeGlobalNotice.createdByName}
                  {activeGlobalNotice.expiresAt && ` · Expires ${new Date(activeGlobalNotice.expiresAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' })}`}
                </span>
                {user.role === 'admin' && (
                  <button
                    onClick={() => setCurrentPage('notifications')}
                    className={`text-[11px] font-semibold underline underline-offset-2 ${p.sub}`}
                  >
                    Manage Notices →
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={() => setDismissedNoticeId(activeGlobalNotice.id)}
              className={`p-1.5 rounded-lg shrink-0 opacity-60 hover:opacity-100 transition-opacity ${p.text}`}
              title="Dismiss for this session"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })()}

      {/* Urgent Alert Banner (if any) */}
      {isStaff && (
        urgentCount > 0 && (
          <div className="p-4 rounded-2xl bg-red-500/10 dark:bg-red-950/50 border border-red-500/30 dark:border-red-800/80 flex items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/20 text-red-600 dark:text-red-300 shrink-0 shadow-2xs">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-red-900 dark:text-red-200">
                  {urgentCount} Urgent Request{urgentCount > 1 ? 's' : ''} Require Immediate Attention
                </div>
                <p className="text-xs text-red-700 dark:text-red-300/80">
                  High priority technical issues or large holding requests awaiting operator review.
                </p>
              </div>
            </div>
            <button
              onClick={() => setCurrentPage('all-requests')}
              className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold shrink-0 transition-all shadow-md shadow-red-600/25"
            >
              View Urgent
            </button>
          </div>
        ))
      }

      {/* Pending Deletion Approval Banner (Admin Only) */}
      {user.role === 'admin' && pendingDeletionCount > 0 && (
        <div className="p-4 rounded-2xl bg-rose-500/10 dark:bg-rose-950/50 border border-rose-500/30 dark:border-rose-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 shrink-0 shadow-2xs">
              <Trash2 className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-rose-900 dark:text-rose-200 flex items-center gap-2">
                <span>{pendingDeletionCount} Request{pendingDeletionCount > 1 ? 's' : ''} Awaiting Admin Deletion Approval</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-rose-500/25 text-rose-900 dark:text-rose-100 font-bold uppercase tracking-wider border border-rose-500/40">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-rose-700 dark:text-rose-300/80 mt-0.5">
                Staff or clients have submitted requests for permanent removal. Only an Administrator can approve or reject them.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setFilters(prev => ({ ...prev, statusFilter: 'pending_deletion' }));
              setCurrentPage('all-requests');
            }}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold shrink-0 transition-all shadow-md shadow-rose-600/30 flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Review Deletion Requests ({pendingDeletionCount})</span>
          </button>
        </div>
      )}

      {/* Metric Cards Grid */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Card 1: Pending */}
        <motion.div
          variants={staggerItem}
          whileHover={{ y: -4 }}
          onClick={() => setCurrentPage('all-requests')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Pending Actions
            </span>
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 group-hover:scale-110 shadow-xs shadow-amber-500/10 transition-transform">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <AnimatedNumber
              value={pendingCount}
              className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white"
            />
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              Awaiting triage
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Needs Operator</span>
            <span className="font-semibold text-slate-600 dark:text-slate-300">Active</span>
          </div>
        </motion.div>

        {/* Card 2: In Progress */}
        <motion.div
          variants={staggerItem}
          whileHover={{ y: -4 }}
          onClick={() => setCurrentPage('all-requests')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              In Progress
            </span>
            <div className="p-2.5 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 group-hover:scale-110 shadow-xs shadow-blue-500/10 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <AnimatedNumber
              value={inProgressCount}
              className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white"
            />
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              Being fulfilled
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Active processing</span>
            <span className="font-semibold text-slate-600 dark:text-slate-300">Assigned</span>
          </div>
        </motion.div>

        {/* Card 3: Resolved */}
        <motion.div
          variants={staggerItem}
          whileHover={{ y: -4 }}
          onClick={() => setCurrentPage('all-requests')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Completed Requests
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 shadow-xs shadow-emerald-500/10 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <AnimatedNumber
              value={completedCount}
              className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white"
            />
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              Resolved
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>SLA Compliance</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">98.4%</span>
          </div>
        </motion.div>

        {/* Card 4: Total Holding Volume Tracked */}
        <motion.div
          variants={staggerItem}
          whileHover={{ y: -4 }}
          onClick={() => setCurrentPage('holding')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Holding Volume
            </span>
            <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 group-hover:scale-110 shadow-xs shadow-purple-500/10 transition-transform">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <AnimatedNumber
              value={totalDepositVolumeUSD + totalWithdrawVolumeUSD}
              prefix="$"
              className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white"
            />
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5">
              <ArrowDownRight className="w-3 h-3" /> +${totalDepositVolumeUSD.toLocaleString()}
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" /> -${totalWithdrawVolumeUSD.toLocaleString()}
            </span>
          </div>
        </motion.div>
      </motion.div>

      {/* Recent Requests Table Section */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.15, duration: 0.5 }}
        className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Recent Service Requests
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Latest client requests across support, deposits, and payouts
            </p>
          </div>
          <button
            id="view-all-requests-link-btn"
            onClick={() => setCurrentPage('all-requests')}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            View All ({userVisibleReqs.length}) <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                <th className="pb-3 pr-4 font-medium">Ticket #</th>
                <th className="pb-3 px-3 font-medium">Type</th>
                <th className="pb-3 px-3 font-medium">Title / Summary</th>
                <th className="pb-3 px-3 font-medium">Client</th>
                <th className="pb-3 px-3 font-medium">Priority</th>
                <th className="pb-3 px-3 font-medium">Status</th>
                <th className="pb-3 pl-3 font-medium text-right">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {recentRequests.map(req => (
                <tr
                  key={req.id}
                  id={`recent-req-row-${req.id}`}
                  onClick={() => setActiveRequest(req)}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group"
                >
                  <td className="py-3.5 pr-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                    {req.ticketNumber}
                  </td>
                  <td className="py-3.5 px-3">
                    <TypeBadge type={req.type} />
                  </td>
                  <td className="py-3.5 px-3 font-medium text-slate-800 dark:text-slate-200 max-w-xs truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {req.title}
                  </td>
                  <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300 truncate max-w-[140px]">
                    {req.clientName}
                  </td>
                  <td className="py-3.5 px-3">
                    <PriorityBadge priority={req.priority} />
                  </td>
                  <td className="py-3.5 px-3">
                    <StatusBadge status={req.status} />
                  </td>
                  <td className="py-3.5 pl-3 text-right text-xs text-slate-400">
                    {formatShortDateIST(req.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};
