import {
  User,
  UserRole,
  ServiceRequest,
  RolePermissions,
  Notification,
  AuditLog,
  AssignmentConfig,
  TypeWiseAssignmentRule,
  getRuleHandlers,
  getRuleAuthorizers,
  GlobalNotice,
} from '../types';
import {
  RawCommissionRecord,
  CommissionSplitConfig,
  TdsConfig,
  TransactionTypeDefinition,
  CspCategory,
} from '../types/commission.type';
import {
  DEFAULT_COMMISSION_SPLIT_CONFIG,
  DEFAULT_TDS_CONFIG,
} from './commissionCalculator';
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
const ASSIGNMENT_CONFIG_KEY = 'csmp_assignment_config_v1';
const GLOBAL_NOTICES_KEY = 'csmp_global_notices_v1';
const COMMISSION_RECORDS_KEY = 'csmp_commission_records_v1';
const COMMISSION_SPLIT_KEY = 'csmp_commission_split_v1';
const COMMISSION_TDS_KEY = 'csmp_commission_tds_v1';
const COMMISSION_TRANSACTION_TYPES_KEY = 'csmp_commission_transaction_types_v1';
const CSP_CATEGORIES_KEY = 'csmp_csp_categories_v1';

// Audit logs are NOT stored in localStorage — they are fetched exclusively
// from Supabase to prevent tampering and PII leakage.

// ─────────────────────────────────────────────────────────────────────────────
// Non-PII user profile fields that are safe to cache locally for offline use.
// PII fields (email, name, phoneNumber, account, ifsc, bank) are deliberately
// excluded and will be populated from the live Supabase session.
// ─────────────────────────────────────────────────────────────────────────────
type SafeUserCache = Pick<
  User,
  'id' | 'role' | 'status' | 'companyName' | 'avatarUrl' | 'currency' | 'estimatedHoldingBalance' | 'createdAt' | 'kioskId' | 'category'
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
    kioskId: user.kioskId,
    category: user.category,
  };
}

export const DEFAULT_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    role: 'admin',
    allowedPages: ['dashboard', 'support', 'holding', 'commissions', 'all-requests', 'assignments', 'clients', 'analytics', 'rbac', 'audit-logs', 'notifications', 'settings'],
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
    allowedPages: ['dashboard', 'support', 'holding', 'commissions', 'all-requests', 'assignments', 'clients', 'analytics', 'notifications'],
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
    allowedPages: ['dashboard', 'support', 'holding', 'commissions', 'notifications'],
    canCreateRequest: true,
    canChangeStatus: false,
    canAssignOperator: false,
    canAddInternalNotes: false,
    canViewAllClients: false,
    canManageRoles: false,
    canExportReports: true,
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
// Assignment Rules — Type-Wise Configuration
// ─────────────────────────────────────────────────────────────────────────────
export const DEFAULT_ASSIGNMENT_CONFIG: AssignmentConfig = {
  autoAssignmentEnabled: false,
  rules: {
    limit: null,
    support: null,
    deposit: null,
  },
};

function normalizeStoredAssignmentRule(rule: any): TypeWiseAssignmentRule | null {
  if (!rule) return null;
  const handlers = getRuleHandlers(rule);
  const authorizers = getRuleAuthorizers(rule);
  return {
    ...rule,
    operatorId: handlers[0]?.id || rule.operatorId || '',
    operatorName: handlers[0]?.name || rule.operatorName || '',
    handlers,
    authorizerId: authorizers[0]?.id || rule.authorizerId || undefined,
    authorizerName: authorizers[0]?.name || rule.authorizerName || undefined,
    authorizers,
  };
}

export function getStoredAssignmentConfig(): AssignmentConfig {
  try {
    const raw = localStorage.getItem(ASSIGNMENT_CONFIG_KEY);
    if (!raw) return DEFAULT_ASSIGNMENT_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      autoAssignmentEnabled: typeof parsed.autoAssignmentEnabled === 'boolean' ? parsed.autoAssignmentEnabled : false,
      rules: {
        limit: normalizeStoredAssignmentRule(parsed.rules?.limit),
        support: normalizeStoredAssignmentRule(parsed.rules?.support),
        deposit: normalizeStoredAssignmentRule(parsed.rules?.deposit),
      },
    };
  } catch {
    return DEFAULT_ASSIGNMENT_CONFIG;
  }
}

export function saveAssignmentConfig(config: AssignmentConfig): void {
  try {
    localStorage.setItem(ASSIGNMENT_CONFIG_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
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
// Global Notices
// ─────────────────────────────────────────────────────────────────────────────

/** Returns all admin-authored global broadcast notices from localStorage. */
export function getStoredGlobalNotices(): GlobalNotice[] {
  try {
    const raw = localStorage.getItem(GLOBAL_NOTICES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as GlobalNotice[];
  } catch {
    return [];
  }
}

/** Persists the full global notices array to localStorage. */
export function saveGlobalNotices(notices: GlobalNotice[]): void {
  try {
    localStorage.setItem(GLOBAL_NOTICES_KEY, JSON.stringify(notices));
  } catch {
    // Storage quota exceeded — silently skip.
  }
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

// ─────────────────────────────────────────────────────────────────────────────
// Commission Reporting Storage
// ─────────────────────────────────────────────────────────────────────────────

export function getStoredCommissionRecords(): RawCommissionRecord[] {
  try {
    const raw = localStorage.getItem(COMMISSION_RECORDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((r: any) => {
      const parts = (r.period || '').trim().split(' ');
      return {
        ...r,
        month: r.month || parts[0] || undefined,
        year:
          r.year != null
            ? Number(r.year)
            : parts[1] && !isNaN(Number(parts[1]))
            ? Number(parts[1])
            : undefined,
      };
    });
  } catch {
    return [];
  }
}

export function saveCommissionRecords(records: RawCommissionRecord[]): void {
  try {
    // Cap local storage cache to latest 500 records to prevent browser quota exhaustion
    const toCache = records.length > 500 ? records.slice(0, 500) : records;
    localStorage.setItem(COMMISSION_RECORDS_KEY, JSON.stringify(toCache));
  } catch (err) {
    console.warn('Could not save commission records to localStorage:', err);
  }
}

export function getStoredSplitConfig(): CommissionSplitConfig {
  try {
    const raw = localStorage.getItem(COMMISSION_SPLIT_KEY);
    if (!raw) {
      saveSplitConfig(DEFAULT_COMMISSION_SPLIT_CONFIG);
      return DEFAULT_COMMISSION_SPLIT_CONFIG;
    }
    return JSON.parse(raw) || DEFAULT_COMMISSION_SPLIT_CONFIG;
  } catch {
    return DEFAULT_COMMISSION_SPLIT_CONFIG;
  }
}

export function saveSplitConfig(cfg: CommissionSplitConfig): void {
  try {
    localStorage.setItem(COMMISSION_SPLIT_KEY, JSON.stringify(cfg));
  } catch (err) {
    console.warn('Could not save split config to localStorage:', err);
  }
}

export function getStoredTdsConfig(): TdsConfig {
  try {
    const raw = localStorage.getItem(COMMISSION_TDS_KEY);
    if (!raw) {
      saveTdsConfig(DEFAULT_TDS_CONFIG);
      return DEFAULT_TDS_CONFIG;
    }
    return JSON.parse(raw) || DEFAULT_TDS_CONFIG;
  } catch {
    return DEFAULT_TDS_CONFIG;
  }
}

export function saveTdsConfig(cfg: TdsConfig): void {
  try {
    localStorage.setItem(COMMISSION_TDS_KEY, JSON.stringify(cfg));
  } catch (err) {
    console.warn('Could not save TDS config to localStorage:', err);
  }
}

export function getStoredTransactionTypes(): TransactionTypeDefinition[] {
  try {
    const raw = localStorage.getItem(COMMISSION_TRANSACTION_TYPES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTransactionTypes(types: TransactionTypeDefinition[]): void {
  try {
    localStorage.setItem(COMMISSION_TRANSACTION_TYPES_KEY, JSON.stringify(types));
  } catch (err) {
    console.warn('Could not save transaction types to localStorage:', err);
  }
}

export const DEFAULT_CSP_CATEGORIES: CspCategory[] = [
  {
    id: 'cat_rural',
    code: 'rural',
    name: 'Rural',
    description: 'Rural area Customer Service Points (75% base CSP share)',
    cspSharePercent: 75,
    corporateSharePercent: 25,
    isActive: true,
  },
  {
    id: 'cat_urban',
    code: 'urban',
    name: 'Urban',
    description: 'Urban and Metro Customer Service Points (70% base CSP share)',
    cspSharePercent: 70,
    corporateSharePercent: 30,
    isActive: true,
  },
];

export function getStoredCspCategories(): CspCategory[] {
  try {
    const raw = localStorage.getItem(CSP_CATEGORIES_KEY);
    if (!raw) {
      saveCspCategories(DEFAULT_CSP_CATEGORIES);
      return DEFAULT_CSP_CATEGORIES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_CSP_CATEGORIES;
  } catch {
    return DEFAULT_CSP_CATEGORIES;
  }
}

export function saveCspCategories(cats: CspCategory[]): void {
  try {
    localStorage.setItem(CSP_CATEGORIES_KEY, JSON.stringify(cats));
  } catch (err) {
    console.warn('Could not save CSP categories to localStorage:', err);
  }
}

export function resetToDemoData(): void {
  localStorage.removeItem(USERS_KEY);
  localStorage.removeItem(REQUESTS_KEY);
  localStorage.removeItem(NOTIFICATIONS_KEY);
  localStorage.removeItem(PERMISSIONS_KEY);
  localStorage.removeItem(GLOBAL_NOTICES_KEY);
  localStorage.removeItem(COMMISSION_RECORDS_KEY);
  localStorage.removeItem(COMMISSION_SPLIT_KEY);
  localStorage.removeItem(COMMISSION_TDS_KEY);
  localStorage.removeItem(COMMISSION_TRANSACTION_TYPES_KEY);
}

export function clearSensitiveStorage(): void {
  localStorage.removeItem(USERS_KEY);
  localStorage.removeItem(REQUESTS_KEY);
  localStorage.removeItem(NOTIFICATIONS_KEY);
  localStorage.removeItem(PERMISSIONS_KEY);
  localStorage.removeItem('csmp_current_view');
  localStorage.removeItem('csmp_current_page');
  localStorage.removeItem('csmp_current_user_v1');
  localStorage.removeItem('csmp_auth_session_active');
  localStorage.removeItem('csmp_audit_logs_v1');
  localStorage.removeItem(GLOBAL_NOTICES_KEY);
  localStorage.removeItem(COMMISSION_TRANSACTION_TYPES_KEY);
}


