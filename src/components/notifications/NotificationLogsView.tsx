import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { formatDateTimeIST } from '../../lib/dateUtils';
import { Notification } from '../../types';
import {
  Bell,
  Search,
  RotateCcw,
  Download,
  CheckCheck,
  Check,
  Trash2,
  ExternalLink,
  Eye,
  X,
  Code2,
  Headphones,
  WalletCards,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Info,
  Layers,
  Calendar,
  Filter,
  Megaphone,
  Radio,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  Clock,
} from 'lucide-react';

export const NotificationLogsView: React.FC = () => {
  const {
    userNotifications,
    notifications,
    unreadNotifCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotification,
    setActiveRequest,
    requests,
    globalNotices,
    broadcastGlobalNotice,
    deactivateGlobalNotice,
    deleteGlobalNotice,
  } = useApp();
  const { user } = useAuth();

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [readFilter, setReadFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  // Broadcast form state (admin only)
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastType, setBroadcastType] = useState<'info' | 'success' | 'warning' | 'error'>('info');
  const [broadcastExpiry, setBroadcastExpiry] = useState('');
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [isSubmittingBroadcast, setIsSubmittingBroadcast] = useState(false);

  // Admin users can see all system notifications, other users see their relevant notifications
  const sourceNotifications = user?.role === 'admin' ? notifications : userNotifications;

  // Handle broadcast submit
  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;
    setIsSubmittingBroadcast(true);
    broadcastGlobalNotice({
      title: broadcastTitle.trim(),
      message: broadcastMessage.trim(),
      type: broadcastType,
      expiresAt: broadcastExpiry ? new Date(broadcastExpiry).toISOString() : undefined,
    });
    setBroadcastTitle('');
    setBroadcastMessage('');
    setBroadcastType('info');
    setBroadcastExpiry('');
    setIsSubmittingBroadcast(false);
    setIsBroadcastOpen(false);
  };

  // Filtered Notifications computation
  const filteredNotifications = useMemo(() => {
    const now = new Date().getTime();

    return sourceNotifications.filter(notif => {
      // 1. Category Filter
      if (categoryFilter !== 'all') {
        if (notif.category !== categoryFilter) return false;
      }

      // 2. Type / Severity Filter
      if (typeFilter !== 'all') {
        if (notif.type !== typeFilter) return false;
      }

      // 3. Read Status Filter
      if (readFilter === 'unread' && notif.isRead) return false;
      if (readFilter === 'read' && !notif.isRead) return false;

      // 4. Date Range Filter
      if (dateRangeFilter !== 'all') {
        const notifTime = new Date(notif.createdAt).getTime();
        const diffMs = now - notifTime;
        const oneDayMs = 24 * 60 * 60 * 1000;

        if (dateRangeFilter === 'today' && diffMs > oneDayMs) return false;
        if (dateRangeFilter === '7days' && diffMs > 7 * oneDayMs) return false;
        if (dateRangeFilter === '30days' && diffMs > 30 * oneDayMs) return false;
      }

      // 5. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const title = (notif.title || '').toLowerCase();
        const msg = (notif.message || '').toLowerCase();
        const category = (notif.category || '').toLowerCase();
        const targetUser = (notif.userId || '').toLowerCase();
        const reqId = (notif.requestId || '').toLowerCase();

        const match =
          title.includes(q) ||
          msg.includes(q) ||
          category.includes(q) ||
          targetUser.includes(q) ||
          reqId.includes(q);

        if (!match) return false;
      }

      return true;
    });
  }, [sourceNotifications, categoryFilter, typeFilter, readFilter, dateRangeFilter, searchQuery]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    categoryFilter !== 'all' ||
    typeFilter !== 'all' ||
    readFilter !== 'all' ||
    dateRangeFilter !== 'all';

  const resetAllFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setTypeFilter('all');
    setReadFilter('all');
    setDateRangeFilter('all');
  };

  const handleExportCSV = () => {
    if (filteredNotifications.length === 0) return;
    const headers = ['Timestamp (IST)', 'Title', 'Message', 'Category', 'Type', 'Target Recipient', 'Linked Request ID', 'Read Status'];
    const rows = filteredNotifications.map(n => [
      `"${formatDateTimeIST(n.createdAt)}"`,
      `"${(n.title || '').replace(/"/g, '""')}"`,
      `"${(n.message || '').replace(/"/g, '""')}"`,
      `"${n.category || ''}"`,
      `"${n.type || ''}"`,
      `"${n.userId || ''}"`,
      `"${n.requestId || ''}"`,
      `"${n.isRead ? 'Read' : 'Unread'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notification_logs_export_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'new_request':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            <Sparkles className="w-3 h-3" /> New Request
          </span>
        );
      case 'request_update':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
            <Layers className="w-3 h-3" /> Status Update
          </span>
        );
      case 'assignment':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
            <Headphones className="w-3 h-3" /> Assignment
          </span>
        );
      case 'deposit':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <WalletCards className="w-3 h-3" /> Deposit
          </span>
        );
      case 'withdraw':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <WalletCards className="w-3 h-3" /> Withdrawal
          </span>
        );
      case 'global_notice':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <Megaphone className="w-3 h-3" /> Global Notice
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <Info className="w-3 h-3" /> System
          </span>
        );
    }
  };

  const getTypeBadge = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-2.5 h-2.5" /> Success
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
            <AlertCircle className="w-2.5 h-2.5" /> Warning
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300">
            <AlertCircle className="w-2.5 h-2.5" /> Urgent
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300">
            <Info className="w-2.5 h-2.5" /> Info
          </span>
        );
    }
  };

  return (
    <div id="notification-logs-view" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Bell className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Notification & Alert Logs Center
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Complete audit trail of system alerts, ticket creation dispatches, status update notifications, and client communications.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {unreadNotifCount > 0 && (
            <button
              onClick={markAllNotificationsAsRead}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors shadow-xs"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark All Read ({unreadNotifCount})</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            disabled={filteredNotifications.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── Admin: Broadcast Global Notice Panel ────────────────────────────── */}
      {user?.role === 'admin' && (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-800/60 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          {/* Panel header — always visible */}
          <button
            type="button"
            onClick={() => setIsBroadcastOpen(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-rose-50/40 dark:hover:bg-rose-950/20 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                <Megaphone className="w-4 h-4" />
              </span>
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">Broadcast Global Notice</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Send a platform-wide announcement visible to all users on their dashboard.
                </div>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isBroadcastOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Collapsible form */}
          {isBroadcastOpen && (
            <form onSubmit={handleBroadcastSubmit} className="px-5 pb-5 border-t border-slate-100 dark:border-slate-800 pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Title */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Notice Title <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={broadcastTitle}
                    onChange={e => setBroadcastTitle(e.target.value)}
                    placeholder="e.g. Scheduled Maintenance Tonight"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                {/* Message */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Message Body <span className="text-rose-500">*</span></label>
                  <textarea
                    required
                    rows={3}
                    value={broadcastMessage}
                    onChange={e => setBroadcastMessage(e.target.value)}
                    placeholder="Enter the full notice message for all platform users..."
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                  />
                </div>
                {/* Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Notice Severity</label>
                  <select
                    value={broadcastType}
                    onChange={e => setBroadcastType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium cursor-pointer"
                  >
                    <option value="info">ℹ️ Informational</option>
                    <option value="success">✅ Positive / Success</option>
                    <option value="warning">⚠️ Caution / Warning</option>
                    <option value="error">🚨 Critical / Alert</option>
                  </select>
                </div>
                {/* Expiry */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Auto-Expire (optional)</label>
                  <input
                    type="datetime-local"
                    value={broadcastExpiry}
                    onChange={e => setBroadcastExpiry(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Leave blank to keep active until manually deactivated.</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsBroadcastOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBroadcast || !broadcastTitle.trim() || !broadcastMessage.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50 shadow-sm transition-colors"
                >
                  <Radio className="w-3.5 h-3.5" />
                  Broadcast to All Users
                </button>
              </div>
            </form>
          )}

          {/* Active notices sub-table */}
          {globalNotices.length > 0 && (
            <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-4">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Radio className="w-3.5 h-3.5" />
                Active Broadcast History ({globalNotices.length})
              </div>
              <div className="space-y-2">
                {globalNotices.map(notice => {
                  const isExpired = notice.expiresAt && new Date(notice.expiresAt) < new Date();
                  const effectivelyActive = notice.isActive && !isExpired;
                  return (
                    <div
                      key={notice.id}
                      className={`flex items-start justify-between gap-3 p-3 rounded-xl border text-xs ${effectivelyActive
                        ? 'border-rose-200 dark:border-rose-800/50 bg-rose-50/50 dark:bg-rose-950/20'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 opacity-60'
                        }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {effectivelyActive && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200 uppercase">
                              <Radio className="w-2.5 h-2.5" /> Live
                            </span>
                          )}
                          {isExpired && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 uppercase">
                              <Clock className="w-2.5 h-2.5" /> Expired
                            </span>
                          )}
                          {!notice.isActive && !isExpired && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 uppercase">
                              Deactivated
                            </span>
                          )}
                          <span className="font-bold text-slate-900 dark:text-white truncate">{notice.title}</span>
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 truncate">{notice.message}</div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          By {notice.createdByName} · {formatDateTimeIST(notice.createdAt)}
                          {notice.expiresAt && ` · Expires ${formatDateTimeIST(notice.expiresAt)}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {notice.isActive && !isExpired && (
                          <button
                            onClick={() => deactivateGlobalNotice(notice.id)}
                            title="Deactivate"
                            className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                          >
                            <ToggleRight className="w-4 h-4" />
                          </button>
                        )}
                        {!notice.isActive && (
                          <button
                            onClick={() => { /* reactivate by toggling isActive back */
                              /* handled by deactivate being a toggle concept — add re-activate if needed */
                            }}
                            title="Already deactivated"
                            className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 cursor-default"
                          >
                            <ToggleLeft className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteGlobalNotice(notice.id)}
                          title="Delete"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter Control Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search Box */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search notifications by title, message, ticket..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
            >
              <option value="all">⚡ All Categories</option>
              <option value="new_request">📝 New Request Submissions</option>
              <option value="request_update">🔄 Status & Queue Updates</option>
              <option value="assignment">🎧 Assignment Notifications</option>
              <option value="deposit">💰 Holding Deposits</option>
              <option value="withdraw">💳 Holding Withdrawals</option>
              <option value="system">⚙️ System & Security</option>
              <option value="global_notice">📢 Global Broadcast Notices</option>
            </select>
          </div>

          {/* Severity / Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
            >
              <option value="all">🔔 All Alert Levels</option>
              <option value="info">ℹ️ Information</option>
              <option value="warning">⚠️ Warning / Pending</option>
              <option value="success">✅ Success / Resolved</option>
              <option value="error">🚨 Urgent / Error</option>
            </select>
          </div>

          {/* Read Status & Date Filter */}
          <div>
            <select
              value={readFilter}
              onChange={(e) => setReadFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
            >
              <option value="all">📬 Read & Unread</option>
              <option value="unread">🔵 Unread Only</option>
              <option value="read">⚪ Read Only</option>
            </select>
          </div>
        </div>

        {/* Filter Summary and Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <span>
              Showing <strong className="text-slate-900 dark:text-white font-bold">{filteredNotifications.length}</strong> of {sourceNotifications.length} notifications
            </span>
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

      {/* Notification Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-4 font-medium">Timestamp (IST)</th>
                <th className="py-3 px-4 font-medium">Level</th>
                <th className="py-3 px-4 font-medium">Category</th>
                <th className="py-3 px-4 font-medium">Title & Message</th>
                <th className="py-3 px-4 font-medium">Linked Entity</th>
                <th className="py-3 pr-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredNotifications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                      <Bell className="w-6 h-6 text-slate-400" />
                    </div>
                    <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      No Notifications Found
                    </div>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {hasActiveFilters
                        ? 'No notifications match the active filter criteria. Try clearing filters.'
                        : 'Notifications and platform alerts will automatically populate here in real-time.'}
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
                filteredNotifications.map((notif) => (
                  <tr
                    key={notif.id}
                    onClick={() => setSelectedNotification(notif)}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group ${!notif.isRead ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''
                      }`}
                  >
                    {/* Timestamp */}
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {formatDateTimeIST(notif.createdAt)}
                    </td>

                    {/* Level */}
                    <td className="py-3.5 px-4">
                      {getTypeBadge(notif.type)}
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4">
                      {getCategoryBadge(notif.category)}
                    </td>

                    {/* Title & Message */}
                    <td className="py-3.5 px-4 max-w-sm">
                      <div className="flex items-center gap-2">
                        {!notif.isRead && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0" />
                        )}
                        <span className="font-bold text-slate-900 dark:text-white text-xs truncate">
                          {notif.title}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate" title={notif.message}>
                        {notif.message}
                      </div>
                    </td>
                    {/* Linked Entity */}
                    <td className="py-3.5 px-4">
                      {notif.requestId ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const req = requests.find(r => r.id === notif.requestId);
                            if (req) {
                              if (!notif.isRead) markNotificationAsRead(notif.id);
                              setActiveRequest(req);
                            }
                          }}
                          className="inline-flex items-center gap-1 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                        >
                          <span>{requests.find(r => r.id === notif.requestId)?.ticketNumber || notif.requestId}</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 pr-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!notif.isRead) {
                              markNotificationAsRead(notif.id);
                            }
                          }}
                          className={`p-1.5 rounded-lg transition-colors ${notif.isRead
                            ? 'text-slate-400 cursor-default'
                            : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50'
                            }`}
                          title={notif.isRead ? 'Already Read' : 'Mark as Read'}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            clearNotification(notif.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="Dismiss / Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Inspector Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Notification Payload Inspector
                </h3>
              </div>
              <button
                onClick={() => setSelectedNotification(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-800/60 active:scale-95 transition-all"
                title="Close inspector"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Timestamp:</span>
                  <span className="font-mono text-slate-900 dark:text-white font-medium">
                    {formatDateTimeIST(selectedNotification.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Title:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedNotification.title}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Category / Type:</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">
                    {selectedNotification.category} ({selectedNotification.type})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Recipient:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {selectedNotification.userId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Read Status:</span>
                  <span className={`font-semibold ${selectedNotification.isRead ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {selectedNotification.isRead ? 'Read' : 'Unread'}
                  </span>
                </div>
                {selectedNotification.requestId && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Linked Request ID:</span>
                    <span className="font-mono text-indigo-500 font-bold">
                      {selectedNotification.requestId}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <span className="text-slate-400 block mb-1 font-semibold">Message Body:</span>
                <div className="p-3 rounded-xl bg-slate-950 font-mono text-[11px] text-slate-200 break-words leading-relaxed border border-slate-800">
                  {selectedNotification.message}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center">
              {selectedNotification.requestId && (
                <button
                  onClick={() => {
                    const req = requests.find(r => r.id === selectedNotification.requestId);
                    if (req) {
                      if (!selectedNotification.isRead) markNotificationAsRead(selectedNotification.id);
                      setSelectedNotification(null);
                      setActiveRequest(req);
                    }
                  }}
                  className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Linked Request</span>
                </button>
              )}

              <button
                onClick={() => setSelectedNotification(null)}
                className="ml-auto px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
