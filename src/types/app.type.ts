import type { Database, Json } from './supabase.types';

// ============================================================================
// SUPABASE DATABASE TYPE ALIASES & HELPERS
// ============================================================================

export type { Database, Json };

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// Database Row Types (snake_case directly from Supabase schema)
export type DbUser = Tables<'csmp_users'>;
export type DbUserInsert = TablesInsert<'csmp_users'>;
export type DbUserUpdate = TablesUpdate<'csmp_users'>;

export type DbRequest = Tables<'csmp_requests'>;
export type DbRequestInsert = TablesInsert<'csmp_requests'>;
export type DbRequestUpdate = TablesUpdate<'csmp_requests'>;

export type DbRolePermission = Tables<'csmp_role_permissions'>;
export type DbRolePermissionInsert = TablesInsert<'csmp_role_permissions'>;
export type DbRolePermissionUpdate = TablesUpdate<'csmp_role_permissions'>;

export type DbNotification = Tables<'csmp_notifications'>;
export type DbNotificationInsert = TablesInsert<'csmp_notifications'>;
export type DbNotificationUpdate = TablesUpdate<'csmp_notifications'>;

export type DbAuditLog = Tables<'csmp_audit_logs'>;
export type DbAuditLogInsert = TablesInsert<'csmp_audit_logs'>;
export type DbAuditLogUpdate = TablesUpdate<'csmp_audit_logs'>;

// ============================================================================
// CORE APPLICATION ROLES & VIEWS
// ============================================================================

export type UserRole = 'client' | 'operator' | 'admin';

export type AppView = 'home' | 'auth' | 'app';

export type PageId =
  | 'dashboard'
  | 'support'
  | 'holding'
  | 'all-requests'
  | 'assignments'
  | 'clients'
  | 'analytics'
  | 'rbac'
  | 'audit-logs'
  | 'notifications'
  | 'settings';

export interface PageMetadata {
  id: PageId;
  name: string;
  desc: string;
  category?: 'core' | 'operations' | 'admin' | 'system';
}

export const APP_PAGE_DEFINITIONS: PageMetadata[] = [
  { id: 'dashboard', name: 'Dashboard Overview', desc: 'KPI metrics, summary cards, and launchpad shortcuts', category: 'core' },
  { id: 'support', name: 'Support Requests', desc: 'Category-filtered tickets, bug reports, and screenshot reviews', category: 'operations' },
  { id: 'holding', name: 'Limit Requests', desc: 'Deposit confirmation slips and withdrawal payout requests', category: 'operations' },
  { id: 'all-requests', name: 'All Service Requests', desc: 'Master directory table with multi-parameter filtering and search', category: 'operations' },
  { id: 'assignments', name: 'Assignment Management', desc: 'Workload distribution, operator assignment, and authorizer sign-off', category: 'operations' },
  { id: 'clients', name: 'User Directory (CRM)', desc: 'Client account list, holding balances, and portfolio histories', category: 'operations' },
  { id: 'analytics', name: 'Analytics & SLA Reporting', desc: 'Visual charts, operator workload, and volume trends', category: 'operations' },
  { id: 'rbac', name: 'Role & RBAC Matrix', desc: 'Security access control matrix and page assignment engine', category: 'admin' },
  { id: 'audit-logs', name: 'Audit Trail & Logs', desc: 'Immutable activity log capturing status transitions and logins', category: 'admin' },
  { id: 'notifications', name: 'Notification Logs Center', desc: 'Real-time alert dispatch log, queue triggers, and client notifications', category: 'system' },
  { id: 'settings', name: 'Settings & Supabase Config', desc: 'Account credentials, simulated Supabase DB link, and JWT inspect', category: 'system' },
];

export function getPageMetadata(pageId: string): PageMetadata {
  const found = APP_PAGE_DEFINITIONS.find(p => p.id === pageId);
  if (found) return found;
  // Fallback for custom dynamic pages loaded from csmp_role_permissions.allowed_pages
  return {
    id: pageId as PageId,
    name: pageId.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    desc: `Dynamic view routed by allowed_pages (${pageId})`,
    category: 'operations',
  };
}

export type UserStatus = 'active' | 'pending' | 'suspended';

// ============================================================================
// APP DOMAIN USER MODEL
// ============================================================================

export interface User {
  id: string;
  authUserId?: string;
  kioskId?: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  companyName?: string;
  phoneNumber?: string;
  currency?: string;
  status: UserStatus;
  createdAt: string;
  account?: string;
  ifsc?: string;
  bank?: string;
  estimatedHoldingBalance?: number;
  holdingAccountId?: string;
}

// ============================================================================
// SERVICE REQUESTS & TICKETS
// ============================================================================

export type RequestType = 'support' | 'deposit' | 'withdraw';
export type RequestStatus = 'pending' | 'in_progress' | 'completed' | 'rejected';
export type RequestPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Attachment {
  id: string;
  name: string;
  size: number; // bytes
  type: string;
  url: string; // Base64 data or preview URL
  uploadedAt: string;
  uploadedBy: string;
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  authorAvatar?: string;
  content: string;
  isInternal: boolean; // Only visible to operator and admin
  createdAt: string;
  attachments?: Attachment[];
}

export interface BaseRequest {
  id: string;
  ticketNumber: string; // e.g. TCK-2026-001 or HLD-2026-042
  type: RequestType;
  title: string;
  description: string;
  status: RequestStatus;
  priority: RequestPriority;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientCompany?: string;
  assignedOperatorId?: string;
  assignedOperatorName?: string;
  assignedAuthorizerId?: string;
  assignedAuthorizerName?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  deleteRequested?: boolean;
  deleteRequestedBy?: string;
  deleteRequestedById?: string;
  deleteRequestedReason?: string;
  deleteRequestedAt?: string;
  comments: Comment[];
  attachments: Attachment[];
}

export type SupportCategory = 'matm' | 'morpho' | 'passbook_printer' | 'new_setup' | 'upgrade_services';

export interface SupportTicket extends BaseRequest {
  type: 'support';
  category: SupportCategory;
  remoteId?: string;
  environment?: string;
  browserInfo?: string;
}

export type DepositMethod = 'bank_deposit' | 'imps' | 'upi' | 'bank_wire';

export interface HoldingDepositRequest extends BaseRequest {
  type: 'deposit';
  amount: number;
  amountInWords?: string;
  currency: string;
  depositMethod: DepositMethod;
  transactionReferenceId: string; // Proof tx id or bank ref
  senderAccountName?: string;
  kioskId?: string;
  branchCode?: string;
  depositDate: string;
  destinationAccount?: string;
  verifiedTransactionId?: string; // Operator confirmation ref
}

export interface CmaStatus {
  configure?: boolean;
  configuredAt?: string;
  configuredBy?: string;
  configuredById?: string;
  make?: boolean;
  madeAt?: string;
  madeBy?: string;
  madeById?: string;
  authorize?: boolean;
  authorizedAt?: string;
  authorizedBy?: string;
  authorizedById?: string;
  authorizerId?: string;
  authorizerName?: string;
  authorizedAmount?: number;
}

export type WithdrawMethod = 'bank_transfer' | 'imps' | 'upi';


export interface HoldingWithdrawRequest extends BaseRequest {
  type: 'withdraw';
  amount: number;
  amountInWords?: string;
  currency: string;
  withdrawMethod: WithdrawMethod;
  beneficiaryAccountName: string;
  beneficiaryAccountNumberOrAddress: string;
  bankNameOrNetwork?: string;
  swiftOrIban?: string;
  reason?: string;
  kioskId?: string;
  transferReceiptRef?: string;
  cmaStatus?: CmaStatus;
  authorizedAmount?: number;
}

export type HoldingRequest = HoldingDepositRequest | HoldingWithdrawRequest;

export type ServiceRequest = SupportTicket | HoldingDepositRequest | HoldingWithdrawRequest;

// ============================================================================
// RBAC & PERMISSIONS
// ============================================================================

export interface RolePermissions {
  role: UserRole;
  allowedPages: PageId[];
  canCreateRequest: boolean;
  canChangeStatus: boolean;
  canAssignOperator: boolean;
  canAddInternalNotes: boolean;
  canViewAllClients: boolean;
  canManageRoles: boolean;
  canExportReports: boolean;
  canViewAuditLogs: boolean;
}

// ============================================================================
// NOTIFICATIONS & AUDIT TRAIL
// ============================================================================

export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type NotificationCategory = 'request_update' | 'assignment' | 'new_request' | 'system' | 'mention' | 'global_notice';

export interface Notification {
  id: string;
  userId: string; // Target user ID or 'all' | 'all_staff' | 'all_operators' | 'all_admins'
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  requestId?: string;
  isRead: boolean;
  createdAt: string;
}

/**
 * A persistent, admin-authored broadcast notice displayed as a banner
 * on the main dashboard for ALL users until deactivated or expired.
 */
export interface GlobalNotice {
  id: string;
  title: string;
  message: string;
  type: NotificationType;   // 'info' | 'success' | 'warning' | 'error'
  createdAt: string;
  createdByName: string;
  expiresAt?: string;       // ISO string — auto-hide after this timestamp if set
  isActive: boolean;        // Admin can deactivate without deleting
}

export type AuditTargetType = 'request' | 'user' | 'rbac' | 'system';

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string; // e.g. 'CREATED_REQUEST', 'UPDATED_STATUS', 'ASSIGNED_OPERATOR', 'MODIFIED_RBAC'
  targetType: AuditTargetType;
  targetId: string;
  details: string;
  timestamp: string;
  ipAddress?: string;
}

// ============================================================================
// FILTERS & UI STATE
// ============================================================================

export interface FilterState {
  searchQuery: string;
  typeFilter: 'all' | RequestType;
  statusFilter: 'all' | RequestStatus | 'pending_deletion';
  priorityFilter: 'all' | RequestPriority;
  operatorFilter: 'all' | string;
  dateRange: 'all' | 'today' | '7d' | '30d' | '90d';
  clientId?: string;
}

// ============================================================================
// AUTO ASSIGNMENT — TYPE-WISE RULES & MULTI-HANDLER POOLS
// ============================================================================

export interface HandlerMember {
  id: string;
  name: string;
  role?: string;
  email?: string;
}

/**
 * Per-request-type assignment rule.
 * Supports both single legacy handler (operatorId / operatorName) and
 * multiple handlers (handlers: HandlerMember[]).
 *
 * For Limit (withdraw) requests:
 * - handlers / operatorId: Maker / Operator
 * - authorizers / authorizerId: Authorizer / Checker
 */
export interface TypeWiseAssignmentRule {
  /** Primary / legacy single operator ID */
  operatorId?: string;
  /** Primary / legacy single operator name */
  operatorName?: string;
  /** Pool of configured operators/handlers for auto load balancing */
  handlers?: HandlerMember[];

  /** Only used for 'limit' (withdraw) request type */
  authorizerId?: string;
  authorizerName?: string;
  /** Pool of configured authorizers for limit requests */
  authorizers?: HandlerMember[];
}

/**
 * Normalize handlers array from rule, supporting both multiple handlers and legacy single fields.
 */
export function getRuleHandlers(rule: TypeWiseAssignmentRule | null | undefined): HandlerMember[] {
  if (!rule) return [];
  if (Array.isArray(rule.handlers) && rule.handlers.length > 0) {
    return rule.handlers.filter(h => Boolean(h?.id?.trim()));
  }
  if (rule.operatorId && rule.operatorId.trim()) {
    return [{ id: rule.operatorId.trim(), name: rule.operatorName || 'Assigned Operator' }];
  }
  return [];
}

/**
 * Normalize authorizers array from rule, supporting both multiple authorizers and legacy single fields.
 */
export function getRuleAuthorizers(rule: TypeWiseAssignmentRule | null | undefined): HandlerMember[] {
  if (!rule) return [];
  if (Array.isArray(rule.authorizers) && rule.authorizers.length > 0) {
    return rule.authorizers.filter(a => Boolean(a?.id?.trim()));
  }
  if (rule.authorizerId && rule.authorizerId.trim()) {
    return [{ id: rule.authorizerId.trim(), name: rule.authorizerName || 'Assigned Authorizer' }];
  }
  return [];
}

export interface AssignmentConfig {
  autoAssignmentEnabled: boolean;
  rules: {
    limit: TypeWiseAssignmentRule | null;   // Withdraw / CMA requests
    support: TypeWiseAssignmentRule | null; // Support tickets
    deposit: TypeWiseAssignmentRule | null; // Deposit requests
  };
}

