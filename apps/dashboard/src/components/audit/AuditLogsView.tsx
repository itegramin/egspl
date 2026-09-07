import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { RoleBadge } from '../common/Badge';
import { formatDateTimeIST } from '../../lib/dateUtils';
import { AuditLog, UserRole } from '../../types';
import {
  FileText,
  Search,
  ShieldCheck,
  RotateCcw,
  Download,
  Eye,
  X,
  Code2
} from 'lucide-react';
import { DownloadModal } from '../requests/DownloadModal';

export const AuditLogsView: React.FC = () => {
  const { auditLogs } = useApp();
  const { user } = useAuth();

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  // Extract all distinct actions present in audit logs
  const distinctActions = useMemo(() => {
    const set = new Set<string>();
    auditLogs.forEach(l => {
      if (l.action) set.add(l.action);
    });
    return Array.from(set).sort();
  }, [auditLogs]);

  // Filtered logs computation
  const filteredLogs = useMemo(() => {
    const now = new Date().getTime();

    return auditLogs.filter(log => {
      // 1. Action Filter (supports broad action categories and exact action matches)
      if (actionFilter !== 'all') {
        const actionUpper = (log.action || '').toUpperCase();
        if (actionFilter === 'CAT_CREATIONS') {
          if (!actionUpper.includes('CREATE')) return false;
        } else if (actionFilter === 'CAT_STATUS') {
          if (!actionUpper.includes('STATUS')) return false;
        } else if (actionFilter === 'CAT_ASSIGN') {
          if (!actionUpper.includes('ASSIGN')) return false;
        } else if (actionFilter === 'CAT_COMMENTS') {
          if (!actionUpper.includes('COMMENT') && !actionUpper.includes('NOTE') && !actionUpper.includes('MESSAGE')) return false;
        } else if (actionFilter === 'CAT_CMA') {
          if (!actionUpper.includes('CMA')) return false;
        } else if (actionFilter === 'CAT_RBAC') {
          if (!actionUpper.includes('RBAC') && !actionUpper.includes('PERMISSION')) return false;
        } else if (actionFilter === 'CAT_DELETIONS') {
          if (!actionUpper.includes('DELETE') && !actionUpper.includes('DELETION')) return false;
        } else if (actionFilter === 'CAT_AUTH') {
          if (!actionUpper.includes('AUTH') && !actionUpper.includes('SIGN') && !actionUpper.includes('USER')) return false;
        } else if (log.action !== actionFilter) {
          return false;
        }
      }

      // 2. Role Filter
      if (roleFilter !== 'all') {
        if (log.actorRole !== roleFilter) return false;
      }

      // 3. Target Type Filter
      if (targetTypeFilter !== 'all') {
        if (log.targetType !== targetTypeFilter) return false;
      }

      // 4. Date Range Filter
      if (dateRangeFilter !== 'all') {
        const logTime = new Date(log.timestamp).getTime();
        const diffMs = now - logTime;
        const oneDayMs = 24 * 60 * 60 * 1000;

        if (dateRangeFilter === 'today' && diffMs > oneDayMs) return false;
        if (dateRangeFilter === '7days' && diffMs > 7 * oneDayMs) return false;
        if (dateRangeFilter === '30days' && diffMs > 30 * oneDayMs) return false;
      }

      // 5. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const actor = (log.actorName || '').toLowerCase();
        const action = (log.action || '').toLowerCase();
        const targetId = (log.targetId || '').toLowerCase();
        const targetType = (log.targetType || '').toLowerCase();
        const details = (log.details || '').toLowerCase();
        const ip = (log.ipAddress || '').toLowerCase();

        const match =
          actor.includes(q) ||
          action.includes(q) ||
          targetId.includes(q) ||
          targetType.includes(q) ||
          details.includes(q) ||
          ip.includes(q);

        if (!match) return false;
      }

      return true;
    });
  }, [auditLogs, actionFilter, roleFilter, targetTypeFilter, dateRangeFilter, searchQuery]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    actionFilter !== 'all' ||
    roleFilter !== 'all' ||
    targetTypeFilter !== 'all' ||
    dateRangeFilter !== 'all';

  const resetAllFilters = () => {
    setSearchQuery('');
    setActionFilter('all');
    setRoleFilter('all');
    setTargetTypeFilter('all');
    setDateRangeFilter('all');
  };

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['Timestamp (IST)', 'Actor Name', 'Actor Role', 'Action Event', 'Target Type', 'Target ID', 'Details', 'IP Address'];
    const rows = filteredLogs.map(l => [
      `"${formatDateTimeIST(l.timestamp)}"`,
      `"${l.actorName || ''}"`,
      `"${l.actorRole || ''}"`,
      `"${l.action || ''}"`,
      `"${l.targetType || ''}"`,
      `"${l.targetId || ''}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      `"${l.ipAddress || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_export_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="audit-logs-view" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Security Audit Trail & System Logs
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Immutable security ledger tracking all user actions, status updates, permissions, and operator assignments.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            id="download-audit-logs-btn"
            onClick={() => setIsDownloadModalOpen(true)}
            disabled={auditLogs.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search Box */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search logs by actor, action, ticket, payload..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Action Event Filter */}
          <div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
            >
              <option value="all">⚡ All Event Actions ({auditLogs.length})</option>
              <optgroup label="Action Categories">
                <option value="CAT_CREATIONS">📝 All Request Creations</option>
                <option value="CAT_STATUS">🔄 All Status Updates</option>
                <option value="CAT_ASSIGN">👤 All Operator Assignments</option>
                <option value="CAT_COMMENTS">💬 All Messages & Notes</option>
                <option value="CAT_CMA">🏦 All CMA Governance</option>
                <option value="CAT_RBAC">🛡️ All RBAC & Permissions</option>
                <option value="CAT_DELETIONS">🗑️ All Deletions</option>
                <option value="CAT_AUTH">🔑 All Auth & User Events</option>
              </optgroup>
              {distinctActions.length > 0 && (
                <optgroup label="Specific Action Events">
                  {distinctActions.map(action => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Actor Role Filter */}
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
            >
              <option value="all">👥 All Roles</option>
              <option value="admin">Administrator</option>
              <option value="operator">Operator</option>
              <option value="client">Client</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <select
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
            >
              <option value="all">📅 All Time</option>
              <option value="today">Today (Past 24h)</option>
              <option value="7days">Past 7 Days</option>
              <option value="30days">Past 30 Days</option>
            </select>
          </div>
        </div>

        {/* Active Filter Summary and Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <span>Showing <strong className="text-slate-900 dark:text-white font-bold">{filteredLogs.length}</strong> of {auditLogs.length} logged entries</span>
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset All Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-4 font-medium">Timestamp (IST)</th>
                <th className="py-3 px-4 font-medium">Actor</th>
                <th className="py-3 px-4 font-medium">Action Event</th>
                <th className="py-3 px-4 font-medium">Target Entity</th>
                <th className="py-3 px-4 font-medium">Details & Payload</th>
                <th className="py-3 px-4 font-medium">IP Address</th>
                <th className="py-3 pr-4 font-medium text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                      <FileText className="w-6 h-6 text-slate-400" />
                    </div>
                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      No Audit Records Found
                    </div>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {hasActiveFilters
                        ? 'No events match the selected action, role, or search filters. Try clearing filters.'
                        : 'Audit records will automatically populate here as users and operators interact with the platform.'}
                    </p>
                    {hasActiveFilters && (
                      <button
                        onClick={resetAllFilters}
                        className="mt-3 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold shadow-xs hover:bg-indigo-500 transition-colors"
                      >
                        Clear Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                  >
                    {/* Timestamp */}
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {formatDateTimeIST(log.timestamp)}
                    </td>

                    {/* Actor */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-300">
                          {log.actorName ? log.actorName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white text-xs">{log.actorName || 'System'}</div>
                          <div className="mt-0.5">
                            <RoleBadge role={log.actorRole as UserRole} />
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Action Event */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                        {log.action}
                      </span>
                    </td>

                    {/* Target Entity */}
                    <td className="py-3.5 px-4">
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300 capitalize">
                        {log.targetType || 'request'}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400 truncate max-w-[120px]">
                        {log.targetId}
                      </div>
                    </td>

                    {/* Details */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="text-xs text-slate-600 dark:text-slate-300 truncate" title={log.details}>
                        {log.details}
                      </div>
                    </td>

                    {/* IP Address */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {log.ipAddress || '127.0.0.1'}
                    </td>

                    {/* Inspect Button */}
                    <td className="py-3.5 pr-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        title="Inspect Log Entry Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Audit Entry Inspector
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Timestamp:</span>
                  <span className="font-mono text-slate-900 dark:text-white font-medium">
                    {formatDateTimeIST(selectedLog.timestamp)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Action:</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {selectedLog.action}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Actor:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {selectedLog.actorName} ({selectedLog.actorRole})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Entity:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {selectedLog.targetType} #{selectedLog.targetId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">IP Address:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {selectedLog.ipAddress || '127.0.0.1'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block mb-1 font-semibold">Event Payload / Details:</span>
                <div className="p-3 rounded-xl bg-slate-950 font-mono text-[11px] text-slate-200 break-words leading-relaxed border border-slate-800">
                  {selectedLog.details}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Download Modal */}
      <DownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        viewType="audit"
        data={auditLogs}
        currentUserRole={user?.role}
      />
    </div>
  );
};
