import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { SupportTicket, isUserAssignedHandler } from '../../types';
import { StatusBadge, PriorityBadge, DeletionPendingBadge } from '../common/Badge';
import { formatShortDateIST } from '../../lib/dateUtils';
import { THEME_PRESETS } from '../../lib/theme';
import { DownloadModal } from './DownloadModal';
import {
  Headphones,
  Bug,
  Code2,
  KeyRound,
  CreditCard,
  Sparkles,
  Plus,
  Search,
  Paperclip,
  MessageSquare,
  Download,
  Inbox,
  RotateCcw,
  ArrowDownUp,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Calendar,
  CheckCircle2,
  Clock,
  SlidersHorizontal,
} from 'lucide-react';

export const SupportTicketsView: React.FC = () => {

  const {
    requests,
    setActiveRequest,
    openCreateModal,
    triggerExportCSV,
    permissions,
    themeConfig,
    assignmentConfig,
  } = useApp();

  const activeHex =
    themeConfig.preset === 'custom'
      ? themeConfig.customPrimaryHex
      : THEME_PRESETS[themeConfig.preset as keyof typeof THEME_PRESETS]?.primaryHex || '#059669';


  const { user, allUsers } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
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
  const assignedSupportTickets = useMemo(() => {
    return requests.filter(r => {
      if (r.type !== 'support') return false;

      // Clients see all requests of their own whether assigned to someone or not
      if (user?.role === 'client') {
        return r.clientId === user.id;
      }

      // Staff (operator / admin): Must be an assigned request
      const rule = assignmentConfig.rules.support;
      const isAssigned = Boolean(
        (r.assignedOperatorId && r.assignedOperatorId.trim() !== '') ||
        (r.assignedHandlers && r.assignedHandlers.length > 0) ||
        (rule && (rule.handlers?.length || rule.operatorId))
      );
      if (!isAssigned) return false;
      // Staff: hide completed and rejected tickets
      if (r.status === 'completed' || r.status === 'rejected') return false;

      return true;
    }) as SupportTicket[];
  }, [requests, user, assignmentConfig]);

  const categories = [
    { id: 'all', label: 'All Issues', icon: Headphones, count: assignedSupportTickets.length },
    { id: 'matm', label: 'mATM Support', icon: Bug, count: assignedSupportTickets.filter(t => t.category === 'matm').length },
    { id: 'morpho', label: 'L1 & L0 Support', icon: Code2, count: assignedSupportTickets.filter(t => t.category === 'morpho').length },
    { id: 'passbook_printer', label: 'Passbook Printer', icon: KeyRound, count: assignedSupportTickets.filter(t => t.category === 'passbook_printer').length },
    { id: 'new_setup', label: 'New Setup', icon: CreditCard, count: assignedSupportTickets.filter(t => t.category === 'new_setup').length },
    { id: 'upgrade_services', label: 'Upgrade Services', icon: Sparkles, count: assignedSupportTickets.filter(t => t.category === 'upgrade_services').length },
  ];

  // Filtering and Sorting
  const filteredTickets = useMemo(() => {
    const list = assignedSupportTickets.filter(t => {
      // Assigned staff filter
      if (user?.role === 'operator') {
        if (assignedFilter === 'mine' && !isUserAssignedHandler(t, user.id, assignmentConfig.rules.support)) {
          return false;
        }
      } else if (user?.role === 'admin') {
        if (assignedFilter !== 'all' && !isUserAssignedHandler(t, assignedFilter, assignmentConfig.rules.support)) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;

      // Status filter
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;

      // Priority filter
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;

      // Date range filter
      if (dateRangeFilter !== 'all') {
        const created = new Date(t.createdAt).getTime();
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        if (dateRangeFilter === 'today' && now - created > oneDay) return false;
        if (dateRangeFilter === '7d' && now - created > 7 * oneDay) return false;
        if (dateRangeFilter === '30d' && now - created > 30 * oneDay) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNumber = t.ticketNumber.toLowerCase().includes(q);
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchClient = t.clientName.toLowerCase().includes(q);
        const matchDesc = t.description.toLowerCase().includes(q);
        const matchOperator = (t.assignedOperatorName || '').toLowerCase().includes(q);
        if (!matchNumber && !matchTitle && !matchClient && !matchDesc && !matchOperator) return false;
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

      if (sortBy === 'recently_updated') {
        return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
      }

      return 0;
    });
  }, [
    assignedSupportTickets,
    selectedCategory,
    statusFilter,
    priorityFilter,
    dateRangeFilter,
    assignedFilter,
    searchQuery,
    sortBy,
    user,
  ]);

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setDateRangeFilter('all');
    setAssignedFilter(user?.role === 'operator' ? 'mine' : 'all');
    setSortBy('oldest_pending');
  };

  const isFiltered =
    selectedCategory !== 'all' ||
    searchQuery.trim() !== '' ||
    statusFilter !== 'all' ||
    priorityFilter !== 'all' ||
    dateRangeFilter !== 'all' ||
    (user?.role === 'operator' ? assignedFilter !== 'mine' : assignedFilter !== 'all') ||
    sortBy !== 'oldest_pending';

  const activeFiltersCount = [
    selectedCategory !== 'all',
    searchQuery.trim() !== '',
    statusFilter !== 'all',
    priorityFilter !== 'all',
    dateRangeFilter !== 'all',
    user?.role === 'operator' ? assignedFilter !== 'mine' : assignedFilter !== 'all',
    sortBy !== 'oldest_pending',
  ].filter(Boolean).length;

  const openTicketsCount = assignedSupportTickets.filter(
    t => t.status !== 'completed' && t.status !== 'rejected'
  ).length;

  return (
    <div id="support-tickets-view" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Headphones className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Technical Support Desk
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Support queues for software bugs, hardware maintenance, and setup tickets.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {isStaff && (
            <button
              id="download-support-tickets-btn"
              onClick={() => setIsDownloadModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-400" />
              <span>Download</span>
            </button>
          )}

          {canCreate && (
            <button
              id="new-support-ticket-btn"
              onClick={() => openCreateModal('support')}
              className="cursor-pointer px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all active:scale-98"
              style={{ backgroundColor: activeHex, boxShadow: `0 4px 14px -3px ${activeHex}40` }}

            >
              <Plus className="w-4 h-4" />
              <span>Create Ticket</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`cursor-pointer flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all 
                ${isSelected ? 'text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              style={isSelected ? { backgroundColor: activeHex } : undefined}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
              >
                {cat.count}
              </span>
            </button>
          );
        })}
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
              placeholder="Search by ticket #, title, client, keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Toggle Filters Menu Button */}
            <button
              type="button"
              id="toggle-support-filters-btn"
              onClick={() => setIsFilterExpanded(prev => !prev)}
              className={`cursor-pointer px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${isFilterExpanded || activeFiltersCount > 0
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
                className="cursor-pointer px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 transition-colors flex items-center gap-1"
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
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
                        <option value="all">All Assigned Staff</option>
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
                  Showing <strong className="text-slate-700 dark:text-slate-200">{filteredTickets.length}</strong> of{' '}
                  <strong className="text-slate-700 dark:text-slate-200">{assignedSupportTickets.length}</strong> assigned tickets
                </span>
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <Clock className="w-3 h-3" />
                  {openTicketsCount} Open / In Progress
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-100 dark:border-indigo-900/40">
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
                Showing <strong className="text-slate-700 dark:text-slate-200">{filteredTickets.length}</strong> of{' '}
                <strong className="text-slate-700 dark:text-slate-200">{assignedSupportTickets.length}</strong> assigned
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {openTicketsCount} Open
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
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
            >
              {activeFiltersCount > 0 ? 'Edit filters →' : 'More filters →'}
            </button>
          </div>
        )}
      </div>


      {/* Ticket List / Empty State */}
      {filteredTickets.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
            No assigned support tickets found
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1">
            {isFiltered
              ? 'No tickets match your active filter or search criteria. Try clearing some filters.'
              : 'There are no assigned support tickets in this queue. Unassigned requests are assigned via the Assignment Management view.'}
          </p>
          <div className="mt-4 flex items-center gap-3">
            {isFiltered && (
              <button
                onClick={handleResetFilters}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Filters & Sorting
              </button>
            )}
            {canCreate && (
              <button
                onClick={() => openCreateModal('support')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Support Ticket
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5">
          {filteredTickets.map((ticket) => {
            const isNotCompleted = ticket.status !== 'completed' && ticket.status !== 'rejected';

            return (
              <div
                key={ticket.id}
                onClick={() => setActiveRequest(ticket)}
                className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between ${isNotCompleted
                  ? 'border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600'
                  : 'border-slate-100 dark:border-slate-800/60 opacity-85 hover:opacity-100'
                  }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {ticket.ticketNumber}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {formatShortDateIST(ticket.createdAt)}
                      </span>
                      {ticket.assignedOperatorName && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40">
                          <UserCheck className="w-3 h-3 text-indigo-500" />
                          <span>Handler: {ticket.assignedOperatorName}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {ticket.deleteRequested && <DeletionPendingBadge />}
                      <PriorityBadge priority={ticket.priority} />
                      <StatusBadge status={ticket.status} />
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                            {ticket.title}
                          </h3>
                          <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 capitalize font-medium text-[10px]">
                            {ticket.category.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {ticket.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-xs text-slate-400 mt-2 sm:mt-0">
                        {ticket.attachments.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-slate-500" title={`${ticket.attachments.length} attachments`}>
                            <Paperclip className="w-3.5 h-3.5" />
                            <span>{ticket.attachments.length}</span>
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-slate-500" title={`${ticket.comments.length} replies`}>
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{ticket.comments.length}</span>
                        </span>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100/60 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                      <span>
                        Client: <strong className="text-slate-600 dark:text-slate-300 font-medium">{ticket.clientName}</strong>
                        {ticket.clientCompany && ` (${ticket.clientCompany})`}
                      </span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold group-hover:underline">
                        View Details →
                      </span>
                    </div>
                  </div>
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
        viewType="support"
        data={assignedSupportTickets}
        staffUsers={staffUsers}
        activeHex={activeHex}
        currentUserRole={user?.role}
      />
    </div>
  );
};
