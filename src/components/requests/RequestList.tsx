import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge, PriorityBadge, TypeBadge, DeletionPendingBadge } from '../common/Badge';
import {
  Search,
  Filter,
  Download,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Paperclip,
  MessageSquare,
  Clock,
  UserCheck,
  Calendar,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ArrowDownUp,
} from 'lucide-react';
import { RequestType, RequestStatus, RequestPriority, HoldingWithdrawRequest } from '../../types';
import { formatShortDateIST } from '../../lib/dateUtils';
import { exportRequestsToCSV } from '../../lib/storage';

interface RequestListProps {
  title?: string;
  subtitle?: string;
  forceType?: RequestType;
}

export const RequestList: React.FC<RequestListProps> = ({
  title = 'All Service Requests',
  subtitle = 'Master directory of technical support and holding balance update requests',
  forceType,
}) => {
  const {
    requests,
    setActiveRequest,
    openCreateModal,
    updateRequestStatus,
    assignOperator,
    permissions,
    syncWithSupabase,
    toast,
  } = useApp();
  const { user, operators, allUsers } = useAuth();

  const [isSyncing, setIsSyncing] = useState(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>(forceType || 'all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [assignedFilter, setAssignedFilter] = useState<string>(user?.role === 'operator' ? 'mine' : 'all');
  const [sortBy, setSortBy] = useState<string>('oldest_pending'); // Default: oldest on not completed request first

  const handleRefresh = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await syncWithSupabase();
      toast('Service requests updated.', 'success');
    } catch {
      toast('Refreshed from local cache.', 'info');
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  const rolePerm = permissions[user?.role || 'client'];
  const canChangeStatus = rolePerm?.canChangeStatus;
  const canAssign = rolePerm?.canAssignOperator;
  const canCreate = user?.role === 'client' && (rolePerm?.canCreateRequest ?? true);
  const isStaff = user?.role === 'admin' || user?.role === 'operator';

  const staffUsers = useMemo(
    () => (allUsers || []).filter(u => u.role === 'operator' || u.role === 'admin'),
    [allUsers]
  );

  // Clients only see their own requests
  const baseRequests = useMemo(() => {
    return requests.filter(r => {
      if (user?.role === 'client' && r.clientId !== user.id) return false;
      return true;
    });
  }, [requests, user]);

  // Filtered and Sorted Display List
  const displayRequests = useMemo(() => {
    const list = baseRequests.filter(r => {
      // Type filter
      const activeType = forceType || typeFilter;
      if (activeType !== 'all' && r.type !== activeType) return false;

      // Staff / Assigned filter
      if (user?.role === 'operator') {
        if (assignedFilter === 'mine') {
          const isMyOp = r.assignedOperatorId === user.id;
          const isMyAuth = r.type === 'withdraw' && (r as HoldingWithdrawRequest).assignedAuthorizerId === user.id;
          if (!isMyOp && !isMyAuth) return false;
        } else if (assignedFilter === 'all') {
          const isAssigned = Boolean(r.assignedOperatorId && r.assignedOperatorId.trim() !== '');
          const hasAuth =
            r.type === 'withdraw' &&
            Boolean(
              (r as HoldingWithdrawRequest).assignedAuthorizerId &&
              (r as HoldingWithdrawRequest).assignedAuthorizerId?.trim() !== ''
            );
          if (!isAssigned && !hasAuth) return false;
        }
      } else if (user?.role === 'admin') {
        if (assignedFilter === 'unassigned') {
          if (r.assignedOperatorId) return false;
        } else if (assignedFilter !== 'all') {
          const isSelectedOp = r.assignedOperatorId === assignedFilter;
          const isSelectedAuth =
            r.type === 'withdraw' &&
            (r as HoldingWithdrawRequest).assignedAuthorizerId === assignedFilter;
          if (!isSelectedOp && !isSelectedAuth) return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending_deletion') {
          if (!r.deleteRequested) return false;
        } else if (r.status !== statusFilter) {
          return false;
        }
      }

      // Priority filter
      if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false;

      // Date range filter
      if (dateRangeFilter !== 'all') {
        const created = new Date(r.createdAt).getTime();
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        if (dateRangeFilter === 'today' && now - created > oneDay) return false;
        if (dateRangeFilter === '7d' && now - created > 7 * oneDay) return false;
        if (dateRangeFilter === '30d' && now - created > 30 * oneDay) return false;
        if (dateRangeFilter === '90d' && now - created > 90 * oneDay) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNumber = r.ticketNumber.toLowerCase().includes(q);
        const matchTitle = r.title.toLowerCase().includes(q);
        const matchDesc = r.description.toLowerCase().includes(q);
        const matchClient = r.clientName.toLowerCase().includes(q);
        const matchCompany = (r.clientCompany || '').toLowerCase().includes(q);
        const matchEmail = (r.clientEmail || '').toLowerCase().includes(q);
        const matchOperator = (r.assignedOperatorName || '').toLowerCase().includes(q);
        const matchAuthorizer = (r.assignedAuthorizerName || '').toLowerCase().includes(q);
        const matchAmount =
          (r.type === 'deposit' || r.type === 'withdraw') &&
          String((r as any).amount || '').includes(q);

        if (
          !matchNumber &&
          !matchTitle &&
          !matchDesc &&
          !matchClient &&
          !matchCompany &&
          !matchEmail &&
          !matchOperator &&
          !matchAuthorizer &&
          !matchAmount
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
        const amtA = (a as any).amount || 0;
        const amtB = (b as any).amount || 0;
        return amtB - amtA;
      }

      if (sortBy === 'amount_low') {
        const amtA = (a as any).amount || 0;
        const amtB = (b as any).amount || 0;
        return amtA - amtB;
      }

      if (sortBy === 'recently_updated') {
        return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
      }

      return 0;
    });
  }, [
    baseRequests,
    forceType,
    typeFilter,
    assignedFilter,
    user,
    statusFilter,
    priorityFilter,
    dateRangeFilter,
    searchQuery,
    sortBy,
  ]);

  const isFiltered = Boolean(
    searchQuery.trim() ||
    (!forceType && typeFilter !== 'all') ||
    statusFilter !== 'all' ||
    priorityFilter !== 'all' ||
    dateRangeFilter !== 'all' ||
    (user?.role === 'operator' ? assignedFilter !== 'mine' : assignedFilter !== 'all') ||
    sortBy !== 'oldest_pending'
  );

  const activeFiltersCount = [
    searchQuery.trim() !== '',
    !forceType && typeFilter !== 'all',
    statusFilter !== 'all',
    priorityFilter !== 'all',
    dateRangeFilter !== 'all',
    user?.role === 'operator' ? assignedFilter !== 'mine' : assignedFilter !== 'all',
    sortBy !== 'oldest_pending',
  ].filter(Boolean).length;

  const handleResetFilters = () => {
    setSearchQuery('');
    setTypeFilter(forceType || 'all');
    setStatusFilter('all');
    setPriorityFilter('all');
    setDateRangeFilter('all');
    setAssignedFilter(user?.role === 'operator' ? 'mine' : 'all');
    setSortBy('oldest_pending');
  };

  const handleExportCSV = () => {
    exportRequestsToCSV(
      displayRequests,
      `service_requests_${user?.role || 'export'}_${new Date().toISOString().split('T')[0]}.csv`
    );
    toast(`Exported ${displayRequests.length} requests to CSV.`, 'success');
  };

  const openCount = baseRequests.filter(
    r => r.status !== 'completed' && r.status !== 'rejected'
  ).length;

  return (
    <div id="request-list-view" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {subtitle} • Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{displayRequests.length}</span> items
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            id="refresh-requests-table-btn"
            onClick={handleRefresh}
            disabled={isSyncing}
            className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-60"
            title="Refresh latest requests from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <button
            id="export-csv-table-btn"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 shadow-xs"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Export CSV</span>
          </button>

          {canCreate && (
            <button
              id="request-list-new-btn"
              onClick={() => openCreateModal(forceType || 'support')}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>New Request</span>
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filter Bar (Collapsible) */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        {/* Top Toolbar: Search + Collapse Toggle + Reset */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search bar */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ticket #, title, client, keyword, amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Toggle Filters Menu Button */}
            <button
              type="button"
              id="toggle-requests-filters-btn"
              onClick={() => setIsFilterExpanded(prev => !prev)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                isFilterExpanded || activeFiltersCount > 0
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
              title={isFilterExpanded ? 'Collapse filter menu' : 'Expand filter menu'}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
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
              {/* Type Filter (hidden if forceType is preset) */}
              {!forceType && (
                <div className="relative">
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full pl-2.5 pr-7 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
                  >
                    <option value="all">All Types</option>
                    <option value="support">Technical Support</option>
                    <option value="deposit">Holding Deposit</option>
                    <option value="withdraw">Holding Withdraw</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
              )}

              {/* Status Filter */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-2.5 pr-7 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                  <option value="pending_deletion">Pending Deletion</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>

              {/* Priority Filter */}
              <div className="relative">
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full pl-2.5 pr-7 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
                >
                  <option value="all">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>

              {/* Date Range Filter */}
              <div className="relative">
                <select
                  value={dateRangeFilter}
                  onChange={(e) => setDateRangeFilter(e.target.value)}
                  className="w-full pl-2.5 pr-7 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>

              {/* Staff / Assigned Operator filter for staff */}
              {isStaff && (
                <div className="relative">
                  <select
                    value={assignedFilter}
                    onChange={(e) => setAssignedFilter(e.target.value)}
                    className="w-full pl-2.5 pr-7 py-2 text-xs rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
                  >
                    {user?.role === 'operator' ? (
                      <>
                        <option value="mine">Assigned to Me</option>
                        <option value="all">All Assigned Staff</option>
                      </>
                    ) : (
                      <>
                        <option value="all">All Assignments</option>
                        <option value="unassigned">Unassigned</option>
                        {staffUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.role})
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-400 pointer-events-none" />
                </div>
              )}

              {/* Sort Dropdown */}
              <div className={`relative ${!isStaff ? 'col-span-2' : ''}`}>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full pl-7 pr-7 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
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
                  Showing <strong className="text-slate-700 dark:text-slate-200">{displayRequests.length}</strong> of{' '}
                  <strong className="text-slate-700 dark:text-slate-200">{baseRequests.length}</strong> service requests
                </span>
                <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
                  <Clock className="w-3 h-3" />
                  {openCount} Open Requests
                </span>
              </div>

              {isFiltered && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs text-rose-600 dark:text-rose-400 font-semibold hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset all filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* Active Filter Chips when collapsed */}
        {!isFilterExpanded && isFiltered && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/70 text-[11px]">
            <span className="text-slate-400 font-medium">Active:</span>
            {searchQuery.trim() && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                "{searchQuery}"
              </span>
            )}
            {!forceType && typeFilter !== 'all' && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium capitalize">
                Type: {typeFilter}
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium capitalize">
                Status: {statusFilter.replace('_', ' ')}
              </span>
            )}
            {priorityFilter !== 'all' && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium capitalize">
                Priority: {priorityFilter}
              </span>
            )}
            {dateRangeFilter !== 'all' && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                Period: {dateRangeFilter}
              </span>
            )}
            {isStaff && (user?.role === 'operator' ? assignedFilter !== 'mine' : assignedFilter !== 'all') && (
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium">
                Staff: {assignedFilter === 'mine' ? 'Assigned to Me' : assignedFilter === 'all' ? 'All' : assignedFilter === 'unassigned' ? 'Unassigned' : staffUsers.find(u => u.id === assignedFilter)?.name || assignedFilter}
              </span>
            )}
            {sortBy !== 'oldest_pending' && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                Sort: {sortBy.replace('_', ' ')}
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsFilterExpanded(true)}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold ml-1"
            >
              Edit filters →
            </button>
          </div>
        )}
      </div>

      {/* Requests Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {displayRequests.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
              <Filter className="w-6 h-6" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
              No matching service requests found
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              Try modifying your active filter parameters or create a new request.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleResetFilters}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              >
                Reset Filters
              </button>
              {canCreate && (
                <button
                  onClick={() => openCreateModal(forceType || 'support')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                >
                  Create Request
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-4 font-medium">Ticket #</th>
                  {!forceType && <th className="py-3.5 px-3 font-medium">Type</th>}
                  <th className="py-3.5 px-3 font-medium">Title & Description</th>
                  <th className="py-3.5 px-3 font-medium">Client / Org</th>
                  <th className="py-3.5 px-3 font-medium">Priority</th>
                  <th className="py-3.5 px-3 font-medium">Status</th>
                  <th className="py-3.5 px-3 font-medium">Assigned</th>
                  <th className="py-3.5 px-3 font-medium text-center">Activity</th>
                  <th className="py-3.5 pr-4 font-medium text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {displayRequests.map((req) => (
                  <tr
                    key={req.id}
                    id={`request-table-row-${req.id}`}
                    onClick={() => setActiveRequest(req)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group"
                  >
                    {/* Ticket # */}
                    <td className="py-4 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{req.ticketNumber}</span>
                        {req.deleteRequested && <DeletionPendingBadge />}
                      </div>
                    </td>

                    {/* Type (if master view) */}
                    {!forceType && (
                      <td className="py-4 px-3">
                        <TypeBadge type={req.type} />
                      </td>
                    )}

                    {/* Title */}
                    <td className="py-4 px-3 max-w-xs sm:max-w-md">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                        {req.title}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {req.description}
                      </div>
                    </td>

                    {/* Client */}
                    <td className="py-4 px-3">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[130px]">
                        {req.clientName}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[130px]">
                        {req.clientCompany || req.clientEmail}
                      </div>
                    </td>

                    {/* Priority */}
                    <td className="py-4 px-3">
                      <PriorityBadge priority={req.priority} />
                    </td>

                    {/* Status */}
                    <td className="py-4 px-3" onClick={(e) => canChangeStatus && e.stopPropagation()}>
                      {canChangeStatus ? (
                        <select
                          value={req.status}
                          onChange={(e) => updateRequestStatus(req.id, e.target.value as RequestStatus)}
                          className="px-2 py-1 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      ) : (
                        <StatusBadge status={req.status} />
                      )}
                    </td>

                    {/* Operator Assignment */}
                    <td className="py-4 px-3 text-xs" onClick={(e) => canAssign && e.stopPropagation()}>
                      {canAssign ? (
                        <select
                          value={req.assignedOperatorId || ''}
                          onChange={(e) => assignOperator(req.id, e.target.value)}
                          className="px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                        >
                          <option value="">Unassigned</option>
                          {operators.map(op => (
                            <option key={op.id} value={op.id}>
                              {op.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-slate-600 dark:text-slate-300 font-medium">
                          {req.assignedOperatorName || <span className="text-slate-400">Unassigned</span>}
                        </span>
                      )}
                    </td>

                    {/* Activity (Comments & Attachments) */}
                    <td className="py-4 px-3 text-center">
                      <div className="inline-flex items-center gap-2 text-xs text-slate-400">
                        {req.attachments.length > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-slate-500 dark:text-slate-400" title={`${req.attachments.length} attachments`}>
                            <Paperclip className="w-3.5 h-3.5" />
                            <span>{req.attachments.length}</span>
                          </span>
                        )}
                        <span className="inline-flex items-center gap-0.5" title={`${req.comments.length} comments`}>
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{req.comments.length}</span>
                        </span>
                      </div>
                    </td>

                    {/* Created Date */}
                    <td className="py-4 pr-4 text-right text-xs text-slate-400 font-mono">
                      {formatShortDateIST(req.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
