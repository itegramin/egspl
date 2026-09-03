import {
  User,
  UserRole,
  ServiceRequest,
  RolePermissions,
  Notification,
  AuditLog,
} from '../types';
import { formatDateTimeIST } from './dateUtils';

// ─────────────────────────────────────────────────────────────────────────────
// Storage keys
// ─────────────────────────────────────────────────────────────────────────────
// NOTE: csmp_current_user_v1 is intentionally absent — the full User object
// (name, email, phone, bank details) is PII and must NOT be persisted to
// localStorage. It lives exclusively in React state, populated from the
// Supabase session on every page load.
const USERS_KEY = 'csmp_users_v1';        // Non-PII user cache (role, status, id only)
const REQUESTS_KEY = 'csmp_requests_v1';
const PERMISSIONS_KEY = 'csmp_permissions_v1';
const NOTIFICATIONS_KEY = 'csmp_notifications_v1';

// Audit logs are NOT stored in localStorage — they are fetched exclusively
// from Supabase to prevent tampering and PII leakage.

// ─────────────────────────────────────────────────────────────────────────────
// Non-PII user profile fields that are safe to cache locally for offline use.
// PII fields (email, name, phoneNumber, account, ifsc, bank) are deliberately
// excluded and will be populated from the live Supabase session.
// ─────────────────────────────────────────────────────────────────────────────
type SafeUserCache = Pick<
  User,
  'id' | 'role' | 'status' | 'companyName' | 'avatarUrl' | 'currency' | 'estimatedHoldingBalance' | 'createdAt'
>;

function stripPii(user: User): SafeUserCache {
  return {
    id: user.id,
    role: user.role,
    status: user.status,
    companyName: user.companyName,
    avatarUrl: user.avatarUrl,
    currency: user.currency,
    estimatedHoldingBalance: user.estimatedHoldingBalance,
    createdAt: user.createdAt,
  };
}

export const DEFAULT_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    role: 'admin',
    allowedPages: ['dashboard', 'support', 'holding', 'all-requests', 'clients', 'analytics', 'rbac', 'audit-logs', 'notifications', 'settings'],
    canCreateRequest: false,
    canChangeStatus: true,
    canAssignOperator: true,
    canAddInternalNotes: true,
    canViewAllClients: true,
    canManageRoles: true,
    canExportReports: true,
    canViewAuditLogs: true,
  },
  operator: {
    role: 'operator',
    allowedPages: ['dashboard', 'support', 'holding', 'all-requests', 'clients', 'analytics', 'notifications'],
    canCreateRequest: false,
    canChangeStatus: true,
    canAssignOperator: true,
    canAddInternalNotes: true,
    canViewAllClients: true,
    canManageRoles: false,
    canExportReports: true,
    canViewAuditLogs: false,
  },
  client: {
    role: 'client',
    allowedPages: ['dashboard', 'support', 'holding'],
    canCreateRequest: true,
    canChangeStatus: false,
    canAssignOperator: false,
    canAddInternalNotes: false,
    canViewAllClients: false,
    canManageRoles: false,
    canExportReports: false,
    canViewAuditLogs: false,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Users — localStorage REMOVED (PII & operational security)
// ─────────────────────────────────────────────────────────────────────────────
// Users are fetched exclusively from Supabase csmp_users via fetchUsersFromSupabase().
// Persisting users to localStorage on shared devices exposes company names, roles,
// and holding balances.

/** @deprecated Users are in-memory / database-only. */
export function getStoredUsers(): User[] {
  return [];
}

/** @deprecated Users are in-memory / database-only. No-op. */
export function saveUsers(_users: User[]): void {
  // Intentionally empty — no sensitive user metadata stored in localStorage.
}

// ─────────────────────────────────────────────────────────────────────────────
// Service Requests — localStorage REMOVED (Financial & PII protection)
// ─────────────────────────────────────────────────────────────────────────────
// Requests contain financial transaction data, amounts, bank deposit proofs,
// support ticket contents, and client identities. They live exclusively in
// React state and are fetched securely from Supabase using Row-Level Security.

/** @deprecated Requests are in-memory / database-only. */
export function getStoredRequests(): ServiceRequest[] {
  return [];
}

/** @deprecated Requests are in-memory / database-only. No-op. */
export function saveRequests(_requests: ServiceRequest[]): void {
  // Intentionally empty — financial transaction data is never written to localStorage.
}

// ─────────────────────────────────────────────────────────────────────────────
// Role Permissions — Hardcoded defaults
// ─────────────────────────────────────────────────────────────────────────────
export function getStoredPermissions(): Record<UserRole, RolePermissions> {
  return DEFAULT_PERMISSIONS;
}

export function savePermissions(_perms: Record<UserRole, RolePermissions>): void {
  // Intentionally empty — permissions use hardcoded arrays.
}

// ─────────────────────────────────────────────────────────────────────────────
// Notifications — localStorage REMOVED
// ─────────────────────────────────────────────────────────────────────────────
// Notifications are fetched exclusively from Supabase and kept in-memory.

/** @deprecated Notifications are in-memory / database-only. */
export function getStoredNotifications(): Notification[] {
  return [];
}

/** @deprecated Notifications are in-memory / database-only. No-op. */
export function saveNotifications(_notifs: Notification[]): void {
  // Intentionally empty — notifications are never written to localStorage.
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit Logs — localStorage REMOVED
// ─────────────────────────────────────────────────────────────────────────────
// Audit logs are not persisted to localStorage (they contain PII such as actor
// names, emails, and action details). They are fetched exclusively from
// Supabase via fetchAuditLogsFromSupabase(). The functions below are kept as
// no-ops so that existing callers do not need to be refactored all at once.

/** @deprecated Audit logs are no longer persisted to localStorage. No-op. */
export function getStoredAuditLogs(): AuditLog[] {
  return [];
}

/** @deprecated Audit logs are no longer persisted to localStorage. No-op. */
export function saveAuditLogs(_logs: AuditLog[]): void {
  // Intentionally empty — audit logs live in Supabase only.
}

/**
 * Writes a structured audit event.
 * NOTE: This function now only delegates to the in-memory state; the actual
 * DB write is done by saveAuditLogToSupabase() in supabase.ts. The local
 * logAuditEvent helper is retained for call-site compatibility but no longer
 * writes to localStorage.
 */
export function logAuditEvent(
  actor: User,
  action: string,
  targetType: AuditLog['targetType'],
  targetId: string,
  details: string
): void {
  // No localStorage write — audit log persistence is handled exclusively by
  // saveAuditLogToSupabase() which is called alongside every logAuditEvent().
  void actor; void action; void targetType; void targetId; void details;
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV Export (Sanitized against Formula/CSV Injection - CWE-1236)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Neutralizes Formula / CSV Injection (CWE-1236).
 * If a cell string starts with =, +, -, @, tab, or carriage return,
 * Excel/Calc may execute it as a formula or command. Prepending a single
 * quote (') forces spreadsheet parsers to treat the value strictly as text.
 */
function sanitizeForCsv(value: unknown): string {
  if (value === null || value === undefined) return '""';
  let str = String(value).replace(/"/g, '""');
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str}"`;
}

export function exportRequestsToCSV(requests: ServiceRequest[], filename = 'client_service_requests.csv'): void {
  const headers = [
    'Ticket Number',
    'Type',
    'Title',
    'Status',
    'Priority',
    'Client Name',
    'Client Email',
    'Company',
    'Assigned Operator',
    'Amount',
    'Currency',
    'Method / Category',
    'Created Date',
    'Updated Date',
  ];

  const rows = requests.map(req => {
    let amount = '';
    let currency = '';
    let methodOrCat = '';

    if (req.type === 'support') {
      methodOrCat = req.category;
    } else if (req.type === 'deposit') {
      amount = String(req.amount);
      currency = req.currency;
      methodOrCat = req.depositMethod;
    } else if (req.type === 'withdraw') {
      amount = String(req.amount);
      currency = req.currency;
      methodOrCat = req.withdrawMethod;
    }

    return [
      sanitizeForCsv(req.ticketNumber),
      sanitizeForCsv(req.type.toUpperCase()),
      sanitizeForCsv(req.title),
      sanitizeForCsv(req.status.toUpperCase()),
      sanitizeForCsv(req.priority.toUpperCase()),
      sanitizeForCsv(req.clientName),
      sanitizeForCsv(req.clientEmail),
      sanitizeForCsv(req.clientCompany || ''),
      sanitizeForCsv(req.assignedOperatorName || 'Unassigned'),
      sanitizeForCsv(amount),
      sanitizeForCsv(currency),
      sanitizeForCsv(methodOrCat),
      sanitizeForCsv(formatDateTimeIST(req.createdAt)),
      sanitizeForCsv(formatDateTimeIST(req.updatedAt)),
    ].join(',');
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ─────────────────────────────────────────────────────────────────────────────
// Demo / Reset
// ─────────────────────────────────────────────────────────────────────────────

export function resetToDemoData(): void {
  localStorage.removeItem(USERS_KEY);
  localStorage.removeItem(REQUESTS_KEY);
  localStorage.removeItem(NOTIFICATIONS_KEY);
  localStorage.removeItem(PERMISSIONS_KEY);
}

// ─────────────────────────────────────────────────────────────────────────────
// Session Cleanup
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wipes all sensitive data from localStorage on sign-out.
 * Call this whenever a session ends to prevent data leaking to
 * the next person who opens the browser.
 */
export function clearSensitiveStorage(): void {
  localStorage.removeItem(USERS_KEY);
  localStorage.removeItem(REQUESTS_KEY);
  localStorage.removeItem(NOTIFICATIONS_KEY);
  localStorage.removeItem(PERMISSIONS_KEY);
  // Navigation state — cleared so the next session starts at home
  localStorage.removeItem('csmp_current_view');
  localStorage.removeItem('csmp_current_page');
  // Legacy key guard — remove in case old versions wrote it
  localStorage.removeItem('csmp_current_user_v1');
  localStorage.removeItem('csmp_auth_session_active');
  localStorage.removeItem('csmp_audit_logs_v1');
}
