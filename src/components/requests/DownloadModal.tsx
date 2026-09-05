import React, { useState, useMemo } from 'react';
import {
  ServiceRequest,
  HoldingDepositRequest,
  HoldingWithdrawRequest,
  SupportTicket,
  AuditLog,
  Notification,
} from '../../types';
import { formatDateTimeIST } from '../../lib/dateUtils';
import {
  X,
  Download,
  FileText,
  FileSpreadsheet,
  FileJson,
  Printer,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Filter,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface StaffUser {
  id: string;
  name: string;
  role: string;
}

export type DownloadViewType =
  | 'support'
  | 'deposit'
  | 'withdrawal'
  | 'holding'
  | 'all-requests'
  | 'analytics'
  | 'audit'
  | 'notifications';

export interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewType: DownloadViewType;
  data: (ServiceRequest | AuditLog | Notification)[];
  staffUsers?: StaffUser[];
  activeHex?: string;
  currentUserRole?: string;
}

type FileFormat = 'csv' | 'json' | 'excel' | 'pdf';

// ── Period helpers ─────────────────────────────────────────────────────────────

function getIndianFinancialYearStart(): Date {
  const now = new Date();
  const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return new Date(fyStartYear, 3, 1, 0, 0, 0, 0); // April 1st
}

function getRecordTimestamp(item: ServiceRequest | AuditLog | Notification): number {
  if ('timestamp' in item && typeof item.timestamp === 'string') {
    return new Date(item.timestamp).getTime();
  }
  if ('createdAt' in item && typeof item.createdAt === 'string') {
    return new Date(item.createdAt).getTime();
  }
  return Date.now();
}

function applyPeriodFilter<T extends ServiceRequest | AuditLog | Notification>(
  records: T[],
  period: string,
  fromDate: string,
  toDate: string
): T[] {
  if (period === 'all') return records;

  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  return records.filter(r => {
    const created = getRecordTimestamp(r);

    switch (period) {
      case 'today': {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        return created >= startOfToday.getTime();
      }
      case 'yesterday': {
        const startOfYesterday = new Date();
        startOfYesterday.setHours(0, 0, 0, 0);
        startOfYesterday.setDate(startOfYesterday.getDate() - 1);
        const endOfYesterday = new Date(startOfYesterday);
        endOfYesterday.setHours(23, 59, 59, 999);
        return created >= startOfYesterday.getTime() && created <= endOfYesterday.getTime();
      }
      case '7d':
        return now - created <= 7 * ONE_DAY;
      case '30d':
        return now - created <= 30 * ONE_DAY;
      case '90d':
        return now - created <= 90 * ONE_DAY;
      case 'fy': {
        const fyStart = getIndianFinancialYearStart().getTime();
        return created >= fyStart;
      }
      case 'custom': {
        const from = fromDate ? new Date(fromDate).getTime() : 0;
        const to = toDate ? new Date(toDate + 'T23:59:59').getTime() : Infinity;
        return created >= from && created <= to;
      }
      default:
        return true;
    }
  });
}

// ── Record Flatteners ──────────────────────────────────────────────────────────

function auditLogToFlat(l: AuditLog): Record<string, string | number> {
  return {
    'Timestamp (IST)': formatDateTimeIST(l.timestamp),
    'Actor Name': l.actorName || '',
    'Actor Role': (l.actorRole || '').toUpperCase(),
    'Action Event': l.action || '',
    'Target Type': l.targetType || '',
    'Target ID': l.targetId || '',
    'Details': l.details || '',
    'IP Address': l.ipAddress || '',
  };
}

function notificationToFlat(n: Notification): Record<string, string | number> {
  return {
    'Timestamp (IST)': formatDateTimeIST(n.createdAt),
    'Title': n.title || '',
    'Message': n.message || '',
    'Category': n.category || '',
    'Severity': (n.type || '').toUpperCase(),
    'Recipient ID': n.userId || '',
    'Linked Request ID': n.requestId || '',
    'Read Status': n.isRead ? 'Read' : 'Unread',
  };
}

function requestToFlat(r: ServiceRequest): Record<string, string | number> {
  const base: Record<string, string | number> = {
    'Ticket #': r.ticketNumber,
    'Type': r.type === 'deposit' ? 'Deposit' : r.type === 'withdraw' ? 'Withdrawal' : 'Support Ticket',
    'Title': r.title,
    'Status': r.status.toUpperCase(),
    'Priority': r.priority.toUpperCase(),
    'Client Name': r.clientName,
    'Client Company': r.clientCompany || '',
    'Assigned Operator': r.assignedOperatorName || '',
    'Created At': formatDateTimeIST(r.createdAt),
    'Updated At': r.updatedAt ? formatDateTimeIST(r.updatedAt) : '',
    'Description': r.description,
  };

  if (r.type === 'deposit') {
    const d = r as HoldingDepositRequest;
    base['Amount'] = d.amount || 0;
    base['Currency'] = d.currency || 'INR';
    base['Amount In Words'] = d.amountInWords || '';
    base['Deposit Method'] = d.depositMethod === 'bank_deposit' ? 'Cash Deposit' : (d.depositMethod || '').toUpperCase();
    base['Sender Account'] = d.senderAccountName || '';
    base['Txn Reference'] = d.transactionReferenceId || '';
    base['Deposit Date'] = d.depositDate ? formatDateTimeIST(d.depositDate) : '';
  } else if (r.type === 'withdraw') {
    const w = r as HoldingWithdrawRequest;
    base['Amount'] = w.amount || 0;
    base['Currency'] = w.currency || 'INR';
    base['Amount In Words'] = w.amountInWords || '';
    base['Withdraw Method'] = (w.withdrawMethod || '').toUpperCase();
    base['Beneficiary Name'] = w.beneficiaryAccountName || '';
    base['Beneficiary Account'] = w.beneficiaryAccountNumberOrAddress || '';
    base['Bank / Network'] = w.bankNameOrNetwork || '';
    base['Authorized Amount'] = w.authorizedAmount || 0;
    base['Assigned Authorizer'] = (w as any).assignedAuthorizerName || '';
  } else if (r.type === 'support') {
    const s = r as SupportTicket;
    base['Category'] = (s.category || '').toUpperCase();
    base['Comments Count'] = s.comments?.length || 0;
    base['Attachments Count'] = s.attachments?.length || 0;
  }

  return base;
}

function recordToFlat(item: ServiceRequest | AuditLog | Notification, viewType: DownloadViewType): Record<string, string | number> {
  if (viewType === 'audit') {
    return auditLogToFlat(item as AuditLog);
  }
  if (viewType === 'notifications') {
    return notificationToFlat(item as Notification);
  }
  return requestToFlat(item as ServiceRequest);
}

// ── Export Generators ──────────────────────────────────────────────────────────

function generateCSV(records: (ServiceRequest | AuditLog | Notification)[], viewType: DownloadViewType): string {
  if (records.length === 0) return '';
  const flattened = records.map(r => recordToFlat(r, viewType));
  const headers = Object.keys(flattened[0]);
  const rows = flattened.map(r =>
    headers.map(h => {
      const val = String(r[h] ?? '').replace(/"/g, '""');
      return `"${val}"`;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\r\n');
}

function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getViewTitle(viewType: DownloadViewType): string {
  switch (viewType) {
    case 'audit':
      return 'Security Audit Trail & System Logs';
    case 'notifications':
      return 'Notification & Alert Logs Center';
    case 'all-requests':
      return 'All Service Requests';
    case 'support':
      return 'Technical Support Tickets';
    case 'deposit':
      return 'Holding Deposit Requests';
    case 'withdrawal':
      return 'Holding Withdrawal Requests';
    case 'holding':
      return 'Holding Balance Update Requests';
    case 'analytics':
      return 'Service Operations & SLA Analytics Dataset';
    default:
      return 'System Data Export';
  }
}

function triggerPDFPrint(records: (ServiceRequest | AuditLog | Notification)[], viewType: DownloadViewType) {
  const title = getViewTitle(viewType);
  const flattened = records.map(r => recordToFlat(r, viewType));
  if (flattened.length === 0) return;
  const headers = Object.keys(flattened[0]);

  const tableRows = flattened.map((r, i) =>
    `<tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'}">${headers.map(h => `<td style="padding:5px 8px;border:1px solid #e2e8f0;font-size:10px;vertical-align:top;">${r[h] ?? ''}</td>`).join('')}</tr>`
  ).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title} - E-Gramin CSMP</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 24px; color: #0f172a; }
        .header { border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 16px; }
        .brand { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #059669; font-weight: 700; margin-bottom: 4px; }
        h1 { font-size: 18px; margin: 0 0 6px 0; color: #0f172a; }
        .meta { font-size: 11px; color: #64748b; }
        table { border-collapse: collapse; width: 100%; margin-top: 12px; }
        th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 10px; text-align: left; font-weight: 700; color: #334155; }
        @media print {
          body { padding: 0; }
          @page { size: landscape; margin: 12mm; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="brand">E-Gramin Client Service Management Platform (CSMP)</div>
        <h1>${title}</h1>
        <div class="meta">Exported on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST &nbsp;|&nbsp; Total Records: <strong>${records.length}</strong></div>
      </div>
      <table>
        <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </body>
    </html>
  `;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  }
}

// ── Format Options & Periods ──────────────────────────────────────────────────

const FORMAT_OPTIONS: { id: FileFormat; label: string; icon: React.ElementType; ext: string }[] = [
  { id: 'csv',   label: 'CSV',   icon: FileText,        ext: '.csv'  },
  { id: 'excel', label: 'Excel', icon: FileSpreadsheet, ext: '.xlsx' },
  { id: 'json',  label: 'JSON',  icon: FileJson,        ext: '.json' },
  { id: 'pdf',   label: 'PDF',   icon: Printer,         ext: '.pdf'  },
];

const PERIOD_OPTIONS = [
  { value: 'all',       label: 'All Time'           },
  { value: 'today',     label: 'Today'              },
  { value: 'yesterday', label: 'Yesterday'          },
  { value: '7d',        label: 'Last 7 Days'        },
  { value: '30d',       label: 'Last Month'         },
  { value: '90d',       label: 'Last 3 Months'      },
  { value: 'fy',        label: 'This Financial Year' },
  { value: 'custom',    label: 'Custom Range'       },
];

// ── Main Component ─────────────────────────────────────────────────────────────

export const DownloadModal: React.FC<DownloadModalProps> = ({
  isOpen,
  onClose,
  viewType,
  data,
  staffUsers = [],
  activeHex = '#059669',
  currentUserRole,
}) => {
  const [format, setFormat] = useState<FileFormat>('csv');

  // Request-specific filters
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [assignedFilter, setAssignedFilter] = useState('all');

  // Audit-specific filters
  const [actionFilter, setActionFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  // Notification-specific filters
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [readFilter, setReadFilter] = useState('all');

  // Common Date / Period Filters
  const [period, setPeriod] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadDone, setDownloadDone] = useState(false);

  const isAdmin = currentUserRole === 'admin';
  const isRequestView =
    viewType === 'support' ||
    viewType === 'deposit' ||
    viewType === 'withdrawal' ||
    viewType === 'holding' ||
    viewType === 'all-requests' ||
    viewType === 'analytics';

  // ── Filter Data Computation ──
  const filteredData = useMemo(() => {
    let result = [...data];

    // 1. Audit View Filters
    if (viewType === 'audit') {
      const logs = result as AuditLog[];
      let filteredLogs = logs;

      if (actionFilter !== 'all') {
        filteredLogs = filteredLogs.filter(l => {
          const act = (l.action || '').toUpperCase();
          if (actionFilter === 'CAT_CREATIONS') return act.includes('CREATE');
          if (actionFilter === 'CAT_STATUS') return act.includes('STATUS');
          if (actionFilter === 'CAT_ASSIGN') return act.includes('ASSIGN');
          if (actionFilter === 'CAT_COMMENTS') return act.includes('COMMENT') || act.includes('NOTE') || act.includes('MESSAGE');
          if (actionFilter === 'CAT_CMA') return act.includes('CMA');
          if (actionFilter === 'CAT_RBAC') return act.includes('RBAC') || act.includes('PERMISSION');
          if (actionFilter === 'CAT_DELETIONS') return act.includes('DELETE') || act.includes('DELETION');
          if (actionFilter === 'CAT_AUTH') return act.includes('AUTH') || act.includes('SIGN') || act.includes('USER');
          return l.action === actionFilter;
        });
      }

      if (roleFilter !== 'all') {
        filteredLogs = filteredLogs.filter(l => l.actorRole === roleFilter);
      }

      result = filteredLogs;
    }

    // 2. Notification View Filters
    else if (viewType === 'notifications') {
      const notifs = result as Notification[];
      let filteredNotifs = notifs;

      if (categoryFilter !== 'all') {
        filteredNotifs = filteredNotifs.filter(n => n.category === categoryFilter);
      }

      if (severityFilter !== 'all') {
        filteredNotifs = filteredNotifs.filter(n => n.type === severityFilter);
      }

      if (readFilter !== 'all') {
        filteredNotifs = filteredNotifs.filter(n => (readFilter === 'read' ? n.isRead : !n.isRead));
      }

      result = filteredNotifs;
    }

    // 3. Requests View Filters
    else if (isRequestView) {
      const reqs = result as ServiceRequest[];
      let filteredReqs = reqs;

      if (typeFilter !== 'all') {
        filteredReqs = filteredReqs.filter(r => r.type === typeFilter);
      }

      if (statusFilter !== 'all') {
        filteredReqs = filteredReqs.filter(r => r.status === statusFilter);
      }

      if (methodFilter !== 'all') {
        filteredReqs = filteredReqs.filter(r => {
          if (r.type === 'deposit') return (r as HoldingDepositRequest).depositMethod === methodFilter;
          if (r.type === 'withdraw') return (r as HoldingWithdrawRequest).withdrawMethod === methodFilter;
          return true;
        });
      }

      if (assignedFilter !== 'all') {
        filteredReqs = filteredReqs.filter(r => r.assignedOperatorId === assignedFilter);
      }

      result = filteredReqs;
    }

    // 4. Period / Date Range Filter (universal)
    result = applyPeriodFilter(result, period, fromDate, toDate);

    return result;
  }, [
    data,
    viewType,
    isRequestView,
    typeFilter,
    statusFilter,
    methodFilter,
    assignedFilter,
    actionFilter,
    roleFilter,
    categoryFilter,
    severityFilter,
    readFilter,
    period,
    fromDate,
    toDate,
  ]);

  const handleDownload = () => {
    setIsDownloading(true);
    const timestamp = new Date().toISOString().slice(0, 10);
    const baseSlug = viewType.replace('-', '_');
    const filename = `egspl_${baseSlug}_${timestamp}`;

    try {
      if (format === 'csv') {
        triggerDownload(generateCSV(filteredData, viewType), `${filename}.csv`, 'text/csv;charset=utf-8;');
      } else if (format === 'excel') {
        triggerDownload(
          generateCSV(filteredData, viewType),
          `${filename}.xlsx`,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
      } else if (format === 'json') {
        const jsonContent = JSON.stringify(filteredData, null, 2);
        triggerDownload(jsonContent, `${filename}.json`, 'application/json');
      } else if (format === 'pdf') {
        triggerPDFPrint(filteredData, viewType);
      }

      setDownloadDone(true);
      setTimeout(() => setDownloadDone(false), 3000);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleClose = () => {
    setFormat('csv');
    setTypeFilter('all');
    setStatusFilter('all');
    setMethodFilter('all');
    setAssignedFilter('all');
    setActionFilter('all');
    setRoleFilter('all');
    setCategoryFilter('all');
    setSeverityFilter('all');
    setReadFilter('all');
    setPeriod('all');
    setFromDate('');
    setToDate('');
    setDownloadDone(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Download Records"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal Panel */}
      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span
              className="p-1.5 rounded-lg"
              style={{ backgroundColor: `color-mix(in srgb, ${activeHex} 12%, transparent)`, color: activeHex }}
            >
              <Download className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Download Records</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {getViewTitle(viewType)}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5 max-h-[calc(100vh-160px)] overflow-y-auto">
          {/* ── File Format Selection ── */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
              File Format
            </label>
            <div className="grid grid-cols-4 gap-2">
              {FORMAT_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const isSelected = format === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setFormat(opt.id)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'border-transparent text-white shadow-md'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                    }`}
                    style={isSelected ? { backgroundColor: activeHex, borderColor: activeHex } : undefined}
                    aria-pressed={isSelected}
                  >
                    <Icon className="w-5 h-5" />
                    {opt.label}
                    {isSelected && <CheckCircle2 className="w-3 h-3 opacity-80" />}
                  </button>
                );
              })}
            </div>
            {format === 'excel' && (
              <p className="mt-1.5 text-[10px] text-amber-600 dark:text-amber-400">
                ⚠ Excel export uses CSV formatted with .xlsx extension — opens natively in Microsoft Excel and Google Sheets.
              </p>
            )}
            {format === 'pdf' && (
              <p className="mt-1.5 text-[10px] text-blue-600 dark:text-blue-400">
                ℹ PDF opens a print-ready window — use your browser's Print → Save as PDF feature.
              </p>
            )}
          </div>

          {/* ── Selective Filters ── */}
          <div>
            <div className="flex items-center gap-1.5 mb-2.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Filter Records to Download
              </label>
            </div>

            <div className="space-y-2.5">
              {/* === AUDIT LOG FILTERS === */}
              {viewType === 'audit' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-1">Event Category</label>
                    <div className="relative">
                      <select
                        value={actionFilter}
                        onChange={e => setActionFilter(e.target.value)}
                        className="w-full pl-2.5 pr-7 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 appearance-none cursor-pointer"
                      >
                        <option value="all">All Events</option>
                        <option value="CAT_CREATIONS">Creations (Tickets/Deposits)</option>
                        <option value="CAT_STATUS">Status Changes</option>
                        <option value="CAT_ASSIGN">Operator Assignments</option>
                        <option value="CAT_COMMENTS">Comments & Notes</option>
                        <option value="CAT_CMA">CMA Dual-Control Approvals</option>
                        <option value="CAT_RBAC">RBAC & Permissions</option>
                        <option value="CAT_DELETIONS">Deletion Requests</option>
                        <option value="CAT_AUTH">Auth & Logins</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-1">Actor Role</label>
                    <div className="relative">
                      <select
                        value={roleFilter}
                        onChange={e => setRoleFilter(e.target.value)}
                        className="w-full pl-2.5 pr-7 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 appearance-none cursor-pointer"
                      >
                        <option value="all">All Roles</option>
                        <option value="admin">Admin</option>
                        <option value="operator">Operator</option>
                        <option value="client">Client</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              )}

              {/* === NOTIFICATION FILTERS === */}
              {viewType === 'notifications' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-1">Category</label>
                    <div className="relative">
                      <select
                        value={categoryFilter}
                        onChange={e => setCategoryFilter(e.target.value)}
                        className="w-full pl-2.5 pr-7 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 appearance-none cursor-pointer"
                      >
                        <option value="all">All Categories</option>
                        <option value="new_request">New Request</option>
                        <option value="request_update">Status Update</option>
                        <option value="assignment">Assignment</option>
                        <option value="deposit">Deposit</option>
                        <option value="withdraw">Withdrawal</option>
                        <option value="global_notice">Global Notice</option>
                        <option value="system">System Alerts</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-1">Severity</label>
                    <div className="relative">
                      <select
                        value={severityFilter}
                        onChange={e => setSeverityFilter(e.target.value)}
                        className="w-full pl-2.5 pr-7 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 appearance-none cursor-pointer"
                      >
                        <option value="all">All Severities</option>
                        <option value="info">Info</option>
                        <option value="success">Success</option>
                        <option value="warning">Warning</option>
                        <option value="error">Urgent / Error</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-1">Read Status</label>
                    <div className="relative">
                      <select
                        value={readFilter}
                        onChange={e => setReadFilter(e.target.value)}
                        className="w-full pl-2.5 pr-7 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 appearance-none cursor-pointer"
                      >
                        <option value="all">All</option>
                        <option value="unread">Unread Only</option>
                        <option value="read">Read Only</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              )}

              {/* === SERVICE REQUEST FILTERS === */}
              {isRequestView && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Request Type (if in all-requests or analytics) */}
                    {(viewType === 'all-requests' || viewType === 'analytics') && (
                      <div>
                        <label className="block text-[10px] font-medium text-slate-400 mb-1">Request Type</label>
                        <div className="relative">
                          <select
                            value={typeFilter}
                            onChange={e => setTypeFilter(e.target.value)}
                            className="w-full pl-2.5 pr-7 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 appearance-none cursor-pointer"
                          >
                            <option value="all">All Request Types</option>
                            <option value="support">Technical Support</option>
                            <option value="deposit">Deposit Update</option>
                            <option value="withdraw">Withdraw Request</option>
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                    )}

                    {/* Status Filter */}
                    <div className={viewType !== 'all-requests' && viewType !== 'analytics' ? 'col-span-1' : ''}>
                      <label className="block text-[10px] font-medium text-slate-400 mb-1">Status</label>
                      <div className="relative">
                        <select
                          value={statusFilter}
                          onChange={e => setStatusFilter(e.target.value)}
                          className="w-full pl-2.5 pr-7 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 appearance-none cursor-pointer"
                        >
                          <option value="all">All Statuses</option>
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="rejected">Rejected</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Method Filter (Holding/Deposit/Withdraw) */}
                    {(viewType === 'deposit' || viewType === 'withdrawal' || viewType === 'holding') && (
                      <div>
                        <label className="block text-[10px] font-medium text-slate-400 mb-1">Method</label>
                        <div className="relative">
                          <select
                            value={methodFilter}
                            onChange={e => setMethodFilter(e.target.value)}
                            className="w-full pl-2.5 pr-7 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 appearance-none cursor-pointer"
                          >
                            <option value="all">All Methods</option>
                            {(viewType === 'deposit' || viewType === 'holding') && (
                              <>
                                <option value="bank_deposit">Cash Deposit</option>
                                <option value="bank_wire">Bank Wire</option>
                              </>
                            )}
                            {(viewType === 'withdrawal' || viewType === 'holding') && (
                              <option value="bank_transfer">Bank Transfer</option>
                            )}
                            <option value="imps">IMPS</option>
                            <option value="upi">UPI</option>
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Assigned Operator (Admin Only) */}
                  {isAdmin && staffUsers.length > 0 && (
                    <div>
                      <label className="block text-[10px] font-medium text-slate-400 mb-1">Assigned To</label>
                      <div className="relative">
                        <select
                          value={assignedFilter}
                          onChange={e => setAssignedFilter(e.target.value)}
                          className="w-full pl-2.5 pr-7 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 appearance-none cursor-pointer"
                        >
                          <option value="all">All Staff</option>
                          {staffUsers.map(u => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.role})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* === PERIOD / DATE RANGE (UNIVERSAL) === */}
              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1">
                  <Calendar className="inline w-3 h-3 mr-1" />
                  Period
                </label>
                <div className="relative">
                  <select
                    value={period}
                    onChange={e => setPeriod(e.target.value)}
                    className="w-full pl-2.5 pr-7 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 appearance-none cursor-pointer"
                  >
                    {PERIOD_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Custom Date Range */}
              {period === 'custom' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-1">From</label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={e => setFromDate(e.target.value)}
                      className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-1">To</label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={e => setToDate(e.target.value)}
                      min={fromDate || undefined}
                      className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Record Count Preview */}
          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
            <span className="text-slate-500 dark:text-slate-400">Records matching filters:</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {filteredData.length} <span className="font-normal text-slate-400">of {data.length}</span>
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            id="download-modal-submit-btn"
            onClick={handleDownload}
            disabled={isDownloading || filteredData.length === 0}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-98 cursor-pointer"
            style={{ backgroundColor: activeHex, boxShadow: `0 4px 14px -3px ${activeHex}40` }}
          >
            {downloadDone ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Done!
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                {isDownloading
                  ? 'Preparing…'
                  : `Download ${FORMAT_OPTIONS.find(f => f.id === format)?.label} (${filteredData.length})`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
