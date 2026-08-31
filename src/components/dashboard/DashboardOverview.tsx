import React from 'react';
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
  Trash2
} from 'lucide-react';
import { HoldingDepositRequest, HoldingWithdrawRequest } from '../../types';

export const DashboardOverview: React.FC = () => {
  const { requests, filteredRequests, setActiveRequest, openCreateModal, triggerExportCSV, setCurrentPage, setFilters, permissions } = useApp();
  const { user } = useAuth();

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
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Request</span>
            </button>
          )}
        </div>
      </motion.div>

      {/* Urgent Alert Banner (if any) */}
      {isStaff && (
        urgentCount > 0 && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/80 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-300 shrink-0">
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
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shrink-0 transition-colors"
            >
              View Urgent
            </button>
          </div>
        ))
      }

      {/* Pending Deletion Approval Banner (Admin Only) */}
      {user.role === 'admin' && pendingDeletionCount > 0 && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 shrink-0">
              <Trash2 className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-rose-900 dark:text-rose-200 flex items-center gap-2">
                <span>{pendingDeletionCount} Request{pendingDeletionCount > 1 ? 's' : ''} Awaiting Admin Deletion Approval</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200 font-bold uppercase">
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
            className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shrink-0 transition-colors shadow-sm flex items-center gap-1.5"
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
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
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
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
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
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
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
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
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
