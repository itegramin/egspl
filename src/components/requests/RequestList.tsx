import React, { useState } from 'react';
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
} from 'lucide-react';
import { RequestType, RequestStatus, RequestPriority } from '../../types';
import { formatShortDateIST } from '../../lib/dateUtils';

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
    filteredRequests,
    filters,
    setFilters,
    resetFilters,
    setActiveRequest,
    openCreateModal,
    triggerExportCSV,
    updateRequestStatus,
    assignOperator,
    permissions,
    syncWithSupabase,
    toast,
  } = useApp();
  const { user, operators } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);

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

  // If forceType is provided, filter specifically for this view
  const displayRequests = forceType
    ? filteredRequests.filter(r => r.type === forceType)
    : filteredRequests;

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
            onClick={triggerExportCSV}
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

      {/* Advanced Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
            <span>Filters & Search</span>
          </div>

          {(filters.searchQuery ||
            filters.typeFilter !== 'all' ||
            filters.statusFilter !== 'all' ||
            filters.priorityFilter !== 'all' ||
            filters.operatorFilter !== 'all' ||
            filters.dateRange !== 'all') && (
              <button
                onClick={resetFilters}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Filters
              </button>
            )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
          {/* Search Box */}
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Search Keywords
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search ticket, title, client..."
                value={filters.searchQuery}
                onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Type Filter (hidden if forceType is preset) */}
          {!forceType && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Request Type
              </label>
              <select
                value={filters.typeFilter}
                onChange={(e) => setFilters(prev => ({ ...prev, typeFilter: e.target.value as any }))}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="all">All Types</option>
                <option value="support">Technical Support</option>
                <option value="deposit">Holding Deposit</option>
                <option value="withdraw">Holding Withdraw</option>
              </select>
            </div>
          )}

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Lifecycle Status
            </label>
            <select
              value={filters.statusFilter}
              onChange={(e) => setFilters(prev => ({ ...prev, statusFilter: e.target.value as any }))}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
              <option value="pending_deletion">Pending Deletion Approval</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Priority
            </label>
            <select
              value={filters.priorityFilter}
              onChange={(e) => setFilters(prev => ({ ...prev, priorityFilter: e.target.value as any }))}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Date Period
            </label>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>

          {/* Operator Filter (Staff Only) */}
          {user.role !== 'client' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Assigned Operator
              </label>
              <select
                value={filters.operatorFilter}
                onChange={(e) => setFilters(prev => ({ ...prev, operatorFilter: e.target.value }))}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="all">All Operators</option>
                <option value="unassigned">Unassigned</option>
                {operators.map(op => (
                  <option key={op.id} value={op.id}>
                    {op.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
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
                onClick={resetFilters}
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
