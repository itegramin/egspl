import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import {
  HoldingDepositRequest,
  HoldingWithdrawRequest,
  HoldingRequest,
  ServiceRequest,
  isUserAssignedHandler,
  isUserAssignedAuthorizer,
} from '../../types';
import { AmountInWords } from '../common/AmountInWords';
import { StatusBadge, PriorityBadge, DeletionPendingBadge } from '../common/Badge';
import { formatShortDateIST, formatDateIST } from '../../lib/dateUtils';
import { THEME_PRESETS } from '../../lib/theme';
import { DownloadModal } from './DownloadModal';
import {
  WalletCards,
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  Download,
  Search,
  ExternalLink,
  Inbox,
  RotateCcw,
  ArrowDownUp,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileCheck,
  X,
  Sparkles,
  CreditCard,
  Building2,
  Calendar,
  AlertTriangle,
  SlidersHorizontal,
  Filter,
} from 'lucide-react';

function getCmaStage(req: ServiceRequest): string {
  if (req.type !== 'withdraw') return '';
  const wr = req as HoldingWithdrawRequest;
  const cma = wr.cmaStatus || {};
  if (cma.authorize) return 'Authorized';
  if (cma.make) return 'Made — Awaiting Authorizer';
  if (cma.configure) return 'Configured — Awaiting Make';
  return 'Pending — Awaiting Configure';
}

function getCmaBadgeStyle(stage: string) {
  if (stage === 'Authorized')
    return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800';
  if (stage.includes('Awaiting Authorizer'))
    return 'bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-800';
  if (stage.includes('Awaiting Make'))
    return 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800';
  return 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800';
}

export const HoldingRequestsView: React.FC = () => {
  const {
    requests,
    setActiveRequest,
    openCreateModal,
    triggerExportCSV,
    permissions,
    themeConfig,
    assignmentConfig,
  } = useApp();
  const { user, allUsers } = useAuth();

  // Resolve theme primary color for dynamic styling
  const activeHex =
    themeConfig.preset === 'custom'
      ? themeConfig.customPrimaryHex
      : THEME_PRESETS[themeConfig.preset as keyof typeof THEME_PRESETS]?.primaryHex || '#059669';

  const [activeTab, setActiveTab] = useState<'all' | 'deposits' | 'withdrawals'>('withdrawals');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [assignedFilter, setAssignedFilter] = useState<string>(user?.role === 'operator' ? 'mine' : 'all');
  const [sortBy, setSortBy] = useState<string>('oldest_pending'); // Default: oldest on not completed request first
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  const canCreate = user?.role === 'client' && (permissions[user?.role || 'client']?.canCreateRequest ?? true);
  const isStaff = user?.role === 'admin' || user?.role === 'operator';

  const staffUsers = useMemo(
    () => (allUsers || []).filter(u => u.role === 'operator' || u.role === 'admin'),
    [allUsers]
  );

  // Client view: All own requests (assigned or unassigned). Staff view: Only assigned requests.
  // For the "All" tab, completed/rejected are included. For Deposits/Withdrawals tabs they are excluded.
  const assignedHoldingReqs = useMemo(() => {
    return requests.filter((r): r is HoldingRequest => {
      if (r.type !== 'deposit' && r.type !== 'withdraw') return false;

      // Clients see all requests of their own whether assigned to someone or not
      if (user?.role === 'client') {
        return r.clientId === user.id;
      }

      const ruleForType = assignmentConfig.rules[r.type === 'withdraw' ? 'limit' : r.type];
      const hasOp = Boolean(
        (r.assignedOperatorId && r.assignedOperatorId.trim() !== '') ||
        (r.assignedHandlers && r.assignedHandlers.length > 0) ||
        (r.type === 'withdraw' && (r as HoldingWithdrawRequest).cmaStatus?.handlers && (r as HoldingWithdrawRequest).cmaStatus!.handlers!.length > 0) ||
        (ruleForType && (ruleForType.handlers?.length || ruleForType.operatorId))
      );
      const hasAuth =
        r.type === 'withdraw' &&
        Boolean(
          ((r as HoldingWithdrawRequest).assignedAuthorizerId &&
            (r as HoldingWithdrawRequest).assignedAuthorizerId?.trim() !== '') ||
          ((r as HoldingWithdrawRequest).assignedAuthorizers &&
            (r as HoldingWithdrawRequest).assignedAuthorizers!.length > 0) ||
          ((r as HoldingWithdrawRequest).cmaStatus?.authorizers &&
            (r as HoldingWithdrawRequest).cmaStatus!.authorizers!.length > 0) ||
          (assignmentConfig.rules.limit &&
            (assignmentConfig.rules.limit.authorizers?.length || assignmentConfig.rules.limit.authorizerId))
        );

      // Staff: Must be an assigned request (completed/rejected are still included for the All tab)
      if (!hasOp && !hasAuth) return false;

      return true;
    });
  }, [requests, user, assignmentConfig]);

  // Deposits and Withdrawals tabs only show open (non-completed/rejected) requests
  const deposits = assignedHoldingReqs.filter(
    r => r.type === 'deposit' && r.status !== 'completed' && r.status !== 'rejected'
  ) as HoldingDepositRequest[];
  const withdrawals = assignedHoldingReqs.filter(
    r => r.type === 'withdraw' && r.status !== 'completed' && r.status !== 'rejected'
  ) as HoldingWithdrawRequest[];

  const totalDepositUSD = deposits.reduce((acc, c) => acc + (c.amount || 0), 0);
  const totalWithdrawUSD = withdrawals.reduce((acc, c) => acc + (c.amount || 0), 0);

  // Dynamic scope for current tab (withdrawals vs deposits vs all)
  const tabScope = useMemo(() => {
    if (activeTab === 'deposits') {
      const open = deposits.filter(r => r.status !== 'completed' && r.status !== 'rejected').length;
      return {
        total: deposits.length,
        open,
        label: 'deposits',
        openLabel: `${open} Open Deposits`,
      };
    }
    if (activeTab === 'withdrawals') {
      const open = withdrawals.filter(r => r.status !== 'completed' && r.status !== 'rejected').length;
      return {
        total: withdrawals.length,
        open,
        label: 'withdrawals',
        openLabel: `${open} Open Withdrawals`,
      };
    }
    const open = assignedHoldingReqs.filter(r => r.status !== 'completed' && r.status !== 'rejected').length;
    return {
      total: assignedHoldingReqs.length,
      open,
      label: 'limit requests',
      openLabel: `${open} Open Requests`,
    };
  }, [activeTab, deposits, withdrawals, assignedHoldingReqs]);

  // Filtered and Sorted Display List
  const displayList = useMemo(() => {
    const list = assignedHoldingReqs.filter(r => {
      // Assignment filter (operator vs admin)
      if (user?.role === 'operator') {
        if (assignedFilter === 'mine') {
          const ruleForType = assignmentConfig.rules[r.type === 'withdraw' ? 'limit' : r.type];
          const isMyOp = isUserAssignedHandler(r, user.id, ruleForType);
          const isMyAuth = isUserAssignedAuthorizer(r, user.id, assignmentConfig.rules.limit);
          if (!isMyOp && !isMyAuth) return false;
        }
      } else if (user?.role === 'admin') {
        if (assignedFilter !== 'all') {
          const ruleForType = assignmentConfig.rules[r.type === 'withdraw' ? 'limit' : r.type];
          const isSelectedOp = isUserAssignedHandler(r, assignedFilter, ruleForType);
          const isSelectedAuth = isUserAssignedAuthorizer(r, assignedFilter, assignmentConfig.rules.limit);
          if (!isSelectedOp && !isSelectedAuth) return false;
        }
      }

      // Tab filter
      if (activeTab === 'deposits' && r.type !== 'deposit') return false;
      if (activeTab === 'withdrawals' && r.type !== 'withdraw') return false;
      // Deposits/Withdrawals tabs only show open requests; completed/rejected only show in All tab
      if ((activeTab === 'deposits' || activeTab === 'withdrawals') && (r.status === 'completed' || r.status === 'rejected')) return false;

      // Status filter
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;

      // Priority filter
      if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false;

      // Method filter
      if (methodFilter !== 'all') {
        if (r.type === 'deposit') {
          if ((r as HoldingDepositRequest).depositMethod !== methodFilter) return false;
        } else if (r.type === 'withdraw') {
          if ((r as HoldingWithdrawRequest).withdrawMethod !== methodFilter) return false;
        }
      }

      // Date range filter
      if (dateRangeFilter !== 'all') {
        const created = new Date(r.createdAt).getTime();
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        if (dateRangeFilter === 'today' && now - created > oneDay) return false;
        if (dateRangeFilter === '7d' && now - created > 7 * oneDay) return false;
        if (dateRangeFilter === '30d' && now - created > 30 * oneDay) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNumber = r.ticketNumber.toLowerCase().includes(q);
        const matchClient = r.clientName.toLowerCase().includes(q);
        const matchTitle = r.title.toLowerCase().includes(q);
        const matchAmount = String(r.amount || '').includes(q);
        const matchOperator = (r.assignedOperatorName || '').toLowerCase().includes(q);
        const matchAuthorizer = ((r as any).assignedAuthorizerName || '').toLowerCase().includes(q);
        const matchDepRef =
          r.type === 'deposit' &&
          (((r as HoldingDepositRequest).transactionReferenceId || '').toLowerCase().includes(q) ||
            ((r as HoldingDepositRequest).branchCode || '').toLowerCase().includes(q) ||
            ((r as HoldingDepositRequest).senderAccountName || '').toLowerCase().includes(q));
        const matchWdrAcc =
          r.type === 'withdraw' &&
          (((r as HoldingWithdrawRequest).beneficiaryAccountNumberOrAddress || '').toLowerCase().includes(q) ||
            ((r as HoldingWithdrawRequest).beneficiaryAccountName || '').toLowerCase().includes(q));

        if (
          !matchNumber &&
          !matchClient &&
          !matchTitle &&
          !matchAmount &&
          !matchOperator &&
          !matchAuthorizer &&
          !matchDepRef &&
          !matchWdrAcc
        ) {
          return false;
        }
      }

      return true;
    });

    // Requirement: "make it oldest on not completed request first by default."
    return list.sort((a, b) => {
      if (sortBy === 'oldest_pending') {
        const isNotDoneA = a.status !== 'completed' && a.status !== 'rejected';
        const isNotDoneB = b.status !== 'completed' && b.status !== 'rejected';

        // 1. Not completed requests come first
        if (isNotDoneA && !isNotDoneB) return -1;
        if (!isNotDoneA && isNotDoneB) return 1;

        // 2. Both are not completed: OLDEST first (ascending createdAt)
        if (isNotDoneA && isNotDoneB) {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }

        // 3. Both are completed: newest first
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }

      if (sortBy === 'priority') {
        const pMap = { urgent: 0, high: 1, medium: 2, low: 3 };
        return (pMap[a.priority] ?? 3) - (pMap[b.priority] ?? 3);
      }

      if (sortBy === 'amount_high') {
        return (b.amount || 0) - (a.amount || 0);
      }

      if (sortBy === 'amount_low') {
        return (a.amount || 0) - (b.amount || 0);
      }

      if (sortBy === 'recently_updated') {
        return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
      }

      return 0;
    });
  }, [
    assignedHoldingReqs,
    activeTab,
    statusFilter,
    priorityFilter,
    methodFilter,
    dateRangeFilter,
    assignedFilter,
    searchQuery,
    sortBy,
    user,
  ]);

  const handleResetFilters = () => {
    // Do NOT reset activeTab — tab is navigation, not a filter.
    // Reset stays on whichever tab (Withdrawals / Deposits / All) is currently active.
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setMethodFilter('all');
    setDateRangeFilter('all');
    setAssignedFilter(user?.role === 'operator' ? 'mine' : 'all');
    setSortBy('oldest_pending');
  };

  // Tab is navigation, not a filter — excluded from isFiltered so reset button
  // won't appear just because a tab is selected.
  const isFiltered =
    searchQuery.trim() !== '' ||
    statusFilter !== 'all' ||
    priorityFilter !== 'all' ||
    methodFilter !== 'all' ||
    dateRangeFilter !== 'all' ||
    (user?.role === 'operator' ? assignedFilter !== 'mine' : assignedFilter !== 'all') ||
    sortBy !== 'oldest_pending';

  const activeFiltersCount = [
    searchQuery.trim() !== '',
    statusFilter !== 'all',
    priorityFilter !== 'all',
    methodFilter !== 'all',
    dateRangeFilter !== 'all',
    user?.role === 'operator' ? assignedFilter !== 'mine' : assignedFilter !== 'all',
    sortBy !== 'oldest_pending',
  ].filter(Boolean).length;

  return (
    <div id="holding-requests-view" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="p-2 rounded-xl"
              style={{
                backgroundColor: `color-mix(in srgb, ${activeHex} 12%, transparent)`,
                color: activeHex,
              }}
            >
              <WalletCards className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Limit (Holding) Update
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Deposit verification and limit payout fulfillment queue for client holding accounts.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {isStaff && (
            <button
              id="download-holding-requests-btn"
              onClick={() => setIsDownloadModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-400" />
              <span>Download</span>
            </button>
          )}

          {canCreate && (
            <div className="flex items-center gap-2">
              <button
                id="log-deposit-slip-btn"
                onClick={() => openCreateModal('deposit')}
                className="px-3.5 py-2 rounded-xl text-white text-xs sm:text-sm font-bold shadow-md flex items-center gap-1.5 transition-all active:scale-98"
                style={{ backgroundColor: activeHex, boxShadow: `0 4px 14px -3px ${activeHex}40` }}
              >
                <ArrowDownRight className="w-4 h-4" />
                <span>Deposit Update</span>
              </button>

              <button
                id="request-withdraw-btn"
                onClick={() => openCreateModal('withdraw')}
                className="px-3.5 py-2 rounded-xl text-white text-xs sm:text-sm font-bold shadow-md flex items-center gap-1.5 transition-all active:scale-98"
                style={{ backgroundColor: activeHex, boxShadow: `0 4px 14px -3px ${activeHex}40` }}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Withdraw Request</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('withdrawals')}
          className={`cursor-pointer px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${activeTab === 'withdrawals'
            ? 'text-white shadow-sm'
            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          style={activeTab === 'withdrawals' ? { backgroundColor: activeHex } : undefined}
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          Withdrawals ({withdrawals.length})
        </button>
        <button
          onClick={() => setActiveTab('deposits')}
          className={`cursor-pointer px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${activeTab === 'deposits'
            ? 'text-white shadow-sm'
            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          style={activeTab === 'deposits' ? { backgroundColor: activeHex } : undefined}
        >
          <ArrowDownRight className="w-3.5 h-3.5" />
          Deposits ({deposits.length})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`cursor-pointer px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'all'
            ? 'text-white shadow-sm'
            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          style={activeTab === 'all' ? { backgroundColor: activeHex } : undefined}
        >
          All Assigned Limit Requests ({assignedHoldingReqs.length})
        </button>
      </div>

      {/* Filter & Sorting Controls Bar (Collapsible) */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        {/* Top Toolbar: Search + Collapse Toggle + Reset */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search bar */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search wire ref, amount, client, account..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Toggle Filters Menu Button */}
            <button
              type="button"
              id="toggle-holding-filters-btn"
              onClick={() => setIsFilterExpanded(prev => !prev)}
              className={`cursor-pointer px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${isFilterExpanded || activeFiltersCount > 0
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              title={isFilterExpanded ? 'Collapse filter menu' : 'Expand filter menu'}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                  {activeFiltersCount}
                </span>
              )}
              {isFilterExpanded ? (
                <ChevronUp className="w-3.5 h-3.5 ml-0.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 ml-0.5 text-slate-400" />
              )}
            </button>

            {/* Reset Button */}
            {isFiltered && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 transition-colors flex items-center gap-1"
                title="Reset all filters and sorting to defaults"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Section */}
        {isFilterExpanded && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 animate-in fade-in-50 duration-200">
            {/* Filter Dropdowns Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {/* Status Filter */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-2.5 pr-7 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>

              {/* Priority Filter */}
              <div className="relative">
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full pl-2.5 pr-7 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
                >
                  <option value="all">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>

              {/* Method Filter */}
              <div className="relative">
                <select
                  value={methodFilter}
                  onChange={(e) => setMethodFilter(e.target.value)}
                  className="w-full pl-2.5 pr-7 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
                >
                  <option value="all">All Methods</option>
                  {activeTab !== 'withdrawals' && (
                    <>
                      <option value="bank_deposit">Cash Deposit</option>
                      <option value="bank_wire">Bank Wire</option>
                    </>
                  )}
                  {activeTab !== 'deposits' && (
                    <option value="bank_transfer">Bank Transfer</option>
                  )}
                  <option value="imps">IMPS</option>
                  <option value="upi">UPI</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>

              {/* Date Range Filter */}
              <div className="relative">
                <select
                  value={dateRangeFilter}
                  onChange={(e) => setDateRangeFilter(e.target.value)}
                  className="w-full pl-2.5 pr-7 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>

              {/* Staff / Assigned Operator filter for staff */}
              {isStaff && (
                <div className="relative">
                  <select
                    value={assignedFilter}
                    onChange={(e) => setAssignedFilter(e.target.value)}
                    className="w-full pl-2.5 pr-7 py-2 text-xs rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
                  >
                    {user?.role === 'operator' ? (
                      <>
                        <option value="mine">Assigned to Me</option>
                        <option value="all">All Assigned Staff</option>
                      </>
                    ) : (
                      <>
                        <option value="all">All Assigned Staff</option>
                        {staffUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.role})
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-400 pointer-events-none" />
                </div>
              )}

              {/* Sort Dropdown */}
              <div className={`relative ${!isStaff ? 'col-span-2' : ''}`}>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full pl-7 pr-7 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
                >
                  <option value="oldest_pending">Oldest Open First (Default)</option>
                  <option value="newest">Newest Created</option>
                  <option value="oldest">Oldest Created</option>
                  <option value="priority">Highest Priority</option>
                  <option value="amount_high">Highest Amount</option>
                  <option value="amount_low">Lowest Amount</option>
                  <option value="recently_updated">Recently Updated</option>
                </select>
                <ArrowDownUp className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Status Strip & Guidance */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-3">
                <span>
                  Showing <strong className="text-slate-700 dark:text-slate-200">{displayList.length}</strong> of{' '}
                  <strong className="text-slate-700 dark:text-slate-200">{tabScope.total}</strong> assigned {tabScope.label}
                </span>
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <Clock className="w-3 h-3" />
                  {tabScope.openLabel}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200/60 dark:border-emerald-800/40">
                  <UserCheck className="w-3 h-3" />
                  Only Assigned Requests
                </span>
                {sortBy === 'oldest_pending' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold border border-amber-200/60 dark:border-amber-800/40">
                    <Clock className="w-3 h-3" />
                    Default: Oldest Open First
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* When Collapsed: Compact Active Filters Bar */}
        {!isFilterExpanded && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex flex-wrap items-center gap-1.5">
              <span>
                Showing <strong className="text-slate-700 dark:text-slate-200">{displayList.length}</strong> of{' '}
                <strong className="text-slate-700 dark:text-slate-200">{tabScope.total}</strong> assigned {tabScope.label}
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {tabScope.openLabel}
              </span>

              {statusFilter !== 'all' && (
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium capitalize">
                  {statusFilter.replace('_', ' ')}
                </span>
              )}
              {priorityFilter !== 'all' && (
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium capitalize">
                  {priorityFilter}
                </span>
              )}
              {methodFilter !== 'all' && (
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium capitalize">
                  {methodFilter.replace('_', ' ')}
                </span>
              )}
              {dateRangeFilter !== 'all' && (
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                  {dateRangeFilter}
                </span>
              )}
              {sortBy !== 'oldest_pending' && (
                <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-medium">
                  Sort: {sortBy.replace('_', ' ')}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsFilterExpanded(true)}
              className="cursor-pointer text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
            >
              {activeFiltersCount > 0 ? 'Edit filters →' : 'More filters →'}
            </button>
          </div>
        )}
      </div>


      {/* Holding Requests List / Empty State */}
      {displayList.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
            No assigned {tabScope.label} found
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1">
            {isFiltered
              ? `No ${tabScope.label} match your active filters. Try clearing filters.`
              : `There are no assigned ${tabScope.label} in this queue. Unassigned requests are assigned via the Assignment Management view.`}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            {isFiltered && (
              <button
                onClick={handleResetFilters}
                className="cursor-pointer px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Filters & Sorting
              </button>
            )}
            {canCreate && (
              <div className="flex items-center gap-2">
                <button
                  className="cursor-pointer px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors flex items-center gap-1"
                  style={{ backgroundColor: activeHex }}
                  onClick={() => openCreateModal('deposit')}
                >
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  Deposit Update
                </button>
                <button
                  className="cursor-pointer px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors flex items-center gap-1"
                  style={{ backgroundColor: activeHex }}
                  onClick={() => openCreateModal('withdraw')}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  Withdraw Request
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5">
          {displayList.map((item) => {
            const isDeposit = item.type === 'deposit';
            const dep = item as HoldingDepositRequest;
            const wdr = item as HoldingWithdrawRequest;
            const cmaStage = getCmaStage(item);
            const isNotCompleted = item.status !== 'completed' && item.status !== 'rejected';

            return (
              <div
                key={item.id}
                onClick={() => setActiveRequest(item)}
                className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between ${isNotCompleted
                  ? 'border-slate-200/80 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600'
                  : 'border-slate-100 dark:border-slate-800/60 opacity-85 hover:opacity-100'
                  }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-mono">
                        {formatShortDateIST(item.createdAt)}
                      </span>
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {item.ticketNumber}
                      </span>
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${activeHex} 12%, transparent)`,
                          color: activeHex,
                        }}
                      >
                        {isDeposit ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                        {isDeposit ? 'Deposit' : 'Withdrawal'}
                      </span>

                      {isStaff && (
                        <>
                          {/* Maker / Handler Badge */}
                          {item.assignedOperatorName && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              <UserCheck className="w-3 h-3 text-emerald-500" />
                              <span>M: {item.assignedOperatorName}</span>
                            </span>
                          )}

                          {/* Authorizer Badge for Limit Requests */}
                          {!isDeposit && (item as any).assignedAuthorizerName && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-100 dark:border-violet-900/40">
                              <ShieldCheck className="w-3 h-3 text-violet-500" />
                              <span>A: {(item as any).assignedAuthorizerName}</span>
                            </span>
                          )}

                          {/* CMA Stage Badge for Withdrawals */}
                          {!isDeposit && cmaStage && (
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${getCmaBadgeStyle(cmaStage)}`}>
                              {cmaStage}
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.deleteRequested && <DeletionPendingBadge />}
                      <PriorityBadge priority={item.priority} />
                      <StatusBadge status={item.status} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div>
                      <div className="text-xl font-extrabold text-slate-900 dark:text-white">
                        {isDeposit ? dep.currency : wdr.currency} {(isDeposit ? dep.amount : wdr.amount)?.toLocaleString()}
                      </div>
                      <AmountInWords
                        amount={isDeposit ? dep.amount : wdr.amount}
                        currency={isDeposit ? dep.currency : wdr.currency}
                        variant="subtext"
                        className="mt-0.5 text-[10px]"
                      />

                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2">
                        {item.description}
                      </div>
                    </div>

                    {/* Proof & Reference detail */}
                    <div className="p-1 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 text-xs space-y-1 border border-slate-100 dark:border-slate-800/50">
                      {isDeposit ? (
                        <>
                          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                            <span className="text-slate-400">Method:</span>
                            <span className="font-semibold capitalize">
                              {dep.depositMethod === 'bank_deposit'
                                ? 'Cash Deposit'
                                : dep.depositMethod?.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          {dep.branchCode && (
                            <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                              <span className="text-slate-400">Branch Code:</span>
                              <span className="font-mono font-medium truncate max-w-45">{dep.branchCode}</span>
                            </div>
                          )}
                          {dep.transactionReferenceId && (
                            <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                              <span className="text-slate-400">
                                {dep.depositMethod === 'bank_deposit' ? 'Ref No:' : 'Txn / UTR:'}
                              </span>
                              <span className="font-mono font-medium truncate max-w-45">{dep.transactionReferenceId}</span>
                            </div>
                          )}
                          {dep.depositDate && (
                            <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                              <span className="text-slate-400">Deposit Date:</span>
                              <span className="font-mono text-slate-500">{formatDateIST(dep.depositDate)}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                            <span className="text-slate-400">Method:</span>
                            <span className="font-semibold capitalize">
                              {wdr.withdrawMethod?.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                            <span className="text-slate-400">Beneficiary:</span>
                            <span className="font-semibold truncate max-w-45">{wdr.beneficiaryAccountName}</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                            <span className="text-slate-400">Account/IBAN:</span>
                            <span className="font-mono font-medium truncate max-w-45">
                              {wdr.beneficiaryAccountNumberOrAddress}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-medium text-slate-600 dark:text-slate-300 truncate max-w-45">
                    {item.clientName} {item.clientCompany && `(${item.clientCompany})`}
                  </span>
                  <span
                    className="inline-flex items-center gap-1 font-semibold group-hover:underline cursor-pointer"
                    style={{ color: activeHex }}
                  >
                    Inspect Details <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Download Modal */}
      <DownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        viewType={activeTab === 'deposits' ? 'deposit' : activeTab === 'withdrawals' ? 'withdrawal' : 'holding'}
        data={activeTab === 'deposits' ? deposits : activeTab === 'withdrawals' ? withdrawals : assignedHoldingReqs}
        staffUsers={staffUsers}
        activeHex={activeHex}
        currentUserRole={user?.role}
      />
    </div>
  );
};
