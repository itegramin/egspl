import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { cookieStorageAdapter } from './cookieStorage';
import { formatAmountInWords } from './indianCurrency';
import type {
  Database,
  DbUser,
  DbUserInsert,
  DbRequest,
  DbRequestInsert,
  DbRolePermission,
  DbRolePermissionInsert,
  DbNotification,
  DbNotificationInsert,
  DbAuditLog,
  DbAuditLogInsert,
  User,
  UserRole,
  ServiceRequest,
  SupportTicket,
  HoldingDepositRequest,
  HoldingWithdrawRequest,
  RolePermissions,
  Notification,
  AuditLog,
  Comment,
  Attachment,
  RequestStatus,
  RequestPriority,
  PageId,
  AssignmentConfig,
  TypeWiseAssignmentRule,
} from '../types/app.type';
import { getRuleHandlers, getRuleAuthorizers } from '../types/app.type';

const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey: string =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  '';

export const isSupabaseConfigured: boolean = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('http')
);

// If Supabase credentials are configured via environment variables, initialize the live client.
// Otherwise, export a safe mock proxy to prevent startup crashes when running in offline/demo mode.
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      // ── Security: session stored in Secure, SameSite=Lax cookies ──────────
      // persistSession: true + cookieStorageAdapter writes the access/refresh
      // tokens into cookies (not localStorage) so the session survives page
      // reloads. SameSite=Lax blocks cross-origin CSRF; Secure ensures the
      // cookie is only sent over HTTPS. The cookie Max-Age (15 min) mirrors
      // the inactivity timeout enforced by SessionContext.
      persistSession: true,
      storage: cookieStorageAdapter,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
  : (new Proxy(
    {},
    {
      get(_, prop) {
        if (prop === 'auth') {
          return {
            getSession: async () => ({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({
              data: {
                subscription: {
                  unsubscribe: () => { },
                },
              },
            }),
            refreshSession: async () => ({
              data: { session: null, user: null },
              error: new Error('env configuration error'),
            }),
            signInWithPassword: async () => ({
              data: { session: null, user: null },
              error: new Error('env configuration error'),
            }),
            signUp: async () => ({
              data: { session: null, user: null },
              error: new Error('env configuration error'),
            }),
            signInWithOtp: async () => ({
              data: {},
              error: new Error('env configuration error'),
            }),
            resetPasswordForEmail: async () => ({
              data: {},
              error: new Error('env configuration error'),
            }),
            signOut: async () => ({ error: null }),
            updateUser: async () => ({
              data: { user: null },
              error: new Error('env configuration error'),
            }),
          };
        }
        if (prop === 'from') {
          return () => {
            const builder: any = {
              select: () => builder,
              order: () => builder,
              limit: () => builder,
              eq: () => builder,
              or: () => builder,
              upsert: async () => ({ data: null, error: new Error('env configuration error') }),
              insert: async () => ({ data: null, error: new Error('env configuration error') }),
              update: () => builder,
              delete: () => builder,
              then: (resolve: any) => resolve({ data: [], error: null }),
            };
            return builder;
          };
        }
        if (prop === 'channel' || prop === 'removeChannel') {
          return () => ({
            on: () => ({ subscribe: () => ({}) }),
            subscribe: () => ({}),
            unsubscribe: () => { },
          });
        }
        return () => { };
      },
    }
  ) as unknown as SupabaseClient);

// -------------------------------------------------------------
// Type mappers (DB Snake_Case <-> Frontend CamelCase)
// -------------------------------------------------------------

export function mapDbUser(row: DbUser | any): User {
  return {
    id: row.id,
    authUserId: row.auth_user_id || undefined,
    name: row.name,
    email: row.email,
    role: (row.role as UserRole) || 'client',
    avatarUrl: row.avatar_url || undefined,
    companyName: row.company_name || undefined,
    phoneNumber: row.phone_number || undefined,
    account: row.account ? String(row.account) : '',
    ifsc: row.ifsc || '',
    bank: row.bank || '',
    kioskId: row.kiosk_id || undefined,
    estimatedHoldingBalance: row.estimated_holding_balance ? Number(row.estimated_holding_balance) : 0,
    currency: row.currency || 'INR',
    status: (row.status as User['status']) || 'active',
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export function mapUserToDb(u: User): DbUserInsert {
  return {
    id: u.id,
    auth_user_id: u.authUserId || null,
    name: u.name,
    email: u.email,
    role: u.role,
    avatar_url: u.avatarUrl || null,
    company_name: u.companyName || null,
    phone_number: u.phoneNumber || null,
    account: u.account || null,
    ifsc: u.ifsc || null,
    bank: u.bank || null,
    kiosk_id: u.kioskId || null,
    estimated_holding_balance: u.estimatedHoldingBalance ?? null,
    currency: u.currency || 'INR',
    status: u.status,
    created_at: u.createdAt,
  };
}

export async function saveUserToSupabase(user: User): Promise<void> {
  const payload = mapUserToDb(user);
  const { error } = await supabase.from('csmp_users').upsert(payload, { onConflict: 'email' });
  if (error) throw error;
}

export function mapDbRequest(row: DbRequest | any): ServiceRequest {
  const base: any = {
    id: row.id,
    ticketNumber: row.ticket_number,
    type: row.type,
    title: row.title,
    description: row.description || '',
    status: row.status as RequestStatus,
    priority: row.priority as RequestPriority,
    clientId: row.client_id,
    clientName: row.client_name,
    clientEmail: row.client_email,
    clientCompany: row.client_company || undefined,
    kioskId: row.kiosk_id || undefined,
    branchCode: row.branch_code || undefined,
    assignedOperatorId: row.assigned_operator_id || undefined,
    assignedOperatorName: row.assigned_operator_name || undefined,
    assignedAuthorizerId: (row as any).assigned_authorizer_id || undefined,
    assignedAuthorizerName: (row as any).assigned_authorizer_name || undefined,
    assignedHandlers: Array.isArray((row as any).assigned_handlers)
      ? (row as any).assigned_handlers
      : (row.cma_status?.handlers && Array.isArray(row.cma_status.handlers)
        ? row.cma_status.handlers
        : (row.assigned_operator_id ? [{ id: row.assigned_operator_id, name: row.assigned_operator_name || 'Assigned Operator' }] : undefined)),
    assignedAuthorizers: Array.isArray((row as any).assigned_authorizers)
      ? (row as any).assigned_authorizers
      : (row.cma_status?.authorizers && Array.isArray(row.cma_status.authorizers)
        ? row.cma_status.authorizers
        : ((row as any).assigned_authorizer_id ? [{ id: (row as any).assigned_authorizer_id, name: (row as any).assigned_authorizer_name || 'Assigned Authorizer' }] : undefined)),
    rejectionReason: (row as any).rejection_reason || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
    resolvedAt: row.resolved_at || undefined,
    deleteRequested: Boolean(row.delete_requested),
    deleteRequestedBy: row.delete_requested_by || undefined,
    deleteRequestedById: row.delete_requested_by_id || undefined,
    deleteRequestedReason: row.delete_requested_reason || undefined,
    deleteRequestedAt: row.delete_requested_at || undefined,
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    comments: Array.isArray(row.comments)
      ? row.comments.map((c: any) => ({
        id: c.id || `cm_${Date.now()}`,
        authorId: c.authorId || c.author_id || 'usr_system',
        authorName: c.authorName || c.author_name || 'System User',
        authorRole: c.authorRole || c.author_role || 'client',
        authorAvatar: c.authorAvatar || c.author_avatar,
        content: c.content || '',
        isInternal: c.isInternal !== undefined ? c.isInternal : (c.is_internal !== undefined ? c.is_internal : false),
        createdAt: c.createdAt || c.created_at || (row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()),
        attachments: Array.isArray(c.attachments) ? c.attachments : [],
      }))
      : [],
  };

  if (row.type === 'support') {
    return {
      ...base,
      type: 'support',
      category: row.category || 'matm',
      remoteId: row.remote_id || undefined,
      environment: row.browser_info || undefined,
      browserInfo: row.browser_info || undefined,
    } as SupportTicket;
  }

  if (row.type === 'deposit') {
    const amt = row.amount ? Number(row.amount) : 0;
    const cur = row.currency || 'INR';
    return {
      ...base,
      type: 'deposit',
      amount: amt,
      amountInWords: row.amount_in_words || formatAmountInWords(amt, { currency: cur }),
      currency: cur,
      depositMethod: row.deposit_method || 'bank_deposit',
      transactionReferenceId: row.transaction_reference_id || '',
      senderAccountName: row.sender_account_name || undefined,
      depositDate: row.deposit_date || new Date().toISOString().split('T')[0],
      destinationAccount: '',
      verifiedTransactionId: row.verified_transaction_id || undefined,
    } as HoldingDepositRequest;
  }

  const amt = row.amount ? Number(row.amount) : 0;
  const cur = row.currency || 'INR';
  return {
    ...base,
    type: 'withdraw',
    amount: amt,
    amountInWords: row.amount_in_words || formatAmountInWords(amt, { currency: cur }),
    currency: cur,
    withdrawMethod: row.withdraw_method || 'bank_wire',
    beneficiaryAccountName: row.beneficiary_account_name || '',
    beneficiaryAccountNumberOrAddress: row.beneficiary_account_number || '',
    bankNameOrNetwork: row.bank_name || undefined,
    swiftOrIban: row.bank_ifsc || undefined,
    kioskId: row.kiosk_id || base.kioskId || undefined,
    reason: row.reason || undefined,
    transferReceiptRef: row.transfer_receipt_ref || undefined,
    cmaStatus: row.cma_status || undefined,
    authorizedAmount: row.cma_status?.authorizedAmount || (row.authorized_amount ? Number(row.authorized_amount) : undefined),
  } as HoldingWithdrawRequest;
}

export function mapRequestToDb(req: ServiceRequest): DbRequestInsert {
  const dbReq: any = {
    id: req.id,
    ticket_number: req.ticketNumber,
    type: req.type,
    title: req.title,
    description: req.description,
    status: req.status,
    priority: req.priority,
    client_id: req.clientId,
    client_name: req.clientName,
    client_email: req.clientEmail,
    client_company: req.clientCompany || null,
    kiosk_id: (req as any).kioskId || null,
    assigned_operator_id: req.assignedHandlers?.[0]?.id || req.assignedOperatorId || null,
    assigned_operator_name: (req.assignedHandlers && req.assignedHandlers.length > 0)
      ? req.assignedHandlers.map(h => h.name).join(', ')
      : (req.assignedOperatorName || null),
    assigned_authorizer_id: (req as any).assignedAuthorizers?.[0]?.id || (req as any).assignedAuthorizerId || null,
    assigned_authorizer_name: ((req as any).assignedAuthorizers && (req as any).assignedAuthorizers.length > 0)
      ? (req as any).assignedAuthorizers.map((a: any) => a.name).join(', ')
      : ((req as any).assignedAuthorizerName || null),
    rejection_reason: req.rejectionReason || null,
    attachments: (req.attachments || []) as any,
    comments: ((req.comments || []).map((c: any) => {
      const ts = c.createdAt || c.created_at || new Date().toISOString();
      return {
        id: c.id,
        authorId: c.authorId || c.author_id,
        authorName: c.authorName || c.author_name,
        authorRole: c.authorRole || c.author_role,
        authorAvatar: c.authorAvatar || c.author_avatar,
        content: c.content,
        isInternal: c.isInternal !== undefined ? c.isInternal : (c.is_internal !== undefined ? c.is_internal : false),
        createdAt: ts,
        created_at: ts,
        attachments: c.attachments || [],
      };
    })) as any,
    created_at: req.createdAt,
    updated_at: req.updatedAt,
    resolved_at: req.resolvedAt || null,
    delete_requested: Boolean(req.deleteRequested),
    delete_requested_by: req.deleteRequestedBy || null,
    delete_requested_by_id: req.deleteRequestedById || null,
    delete_requested_reason: req.deleteRequestedReason || null,
    delete_requested_at: req.deleteRequestedAt || null,
  };

  if (req.type === 'support') {
    const sReq = req as SupportTicket;
    dbReq.category = sReq.category;
    dbReq.remote_id = sReq.remoteId || null;
    dbReq.browser_info = sReq.browserInfo || null;
  } else if (req.type === 'deposit') {
    const dReq = req as HoldingDepositRequest;
    dbReq.amount = dReq.amount;
    dbReq.currency = dReq.currency;
    dbReq.deposit_method = dReq.depositMethod;
    dbReq.transaction_reference_id = dReq.transactionReferenceId;
    dbReq.sender_account_name = dReq.senderAccountName || null;
    dbReq.branch_code = dReq.branchCode || null;
    dbReq.deposit_date = dReq.depositDate;
    dbReq.verified_transaction_id = dReq.verifiedTransactionId || null;
  } else if (req.type === 'withdraw') {
    const wReq = req as HoldingWithdrawRequest;
    dbReq.amount = wReq.amount;
    dbReq.currency = wReq.currency;
    dbReq.withdraw_method = wReq.withdrawMethod;
    dbReq.beneficiary_account_name = wReq.beneficiaryAccountName;
    dbReq.beneficiary_account_number = wReq.beneficiaryAccountNumberOrAddress;
    dbReq.bank_name = wReq.bankNameOrNetwork || null;
    dbReq.bank_ifsc = wReq.swiftOrIban || null;
    dbReq.reason = wReq.reason || null;
    dbReq.transfer_receipt_ref = wReq.transferReceiptRef || null;
    const cmaPayload = wReq.cmaStatus ? { ...wReq.cmaStatus } : {};
    if (wReq.assignedHandlers && wReq.assignedHandlers.length > 0) {
      cmaPayload.handlers = wReq.assignedHandlers;
    }
    if (wReq.assignedAuthorizers && wReq.assignedAuthorizers.length > 0) {
      cmaPayload.authorizers = wReq.assignedAuthorizers;
    }
    dbReq.cma_status = Object.keys(cmaPayload).length > 0 ? cmaPayload : null;
    dbReq.authorized_amount = wReq.authorizedAmount || wReq.cmaStatus?.authorizedAmount || null;
  }

  return dbReq;
}

export function mapDbAuditLog(row: DbAuditLog | any): AuditLog {
  return {
    id: row.id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    actorRole: (row.actor_role as UserRole) || 'client',
    action: row.action,
    targetType: (row.target_type as any) || 'system',
    targetId: row.target_id,
    details: row.details,
    timestamp: row.timestamp || new Date().toISOString(),
    ipAddress: row.ip_address || undefined,
  };
}

export function mapAuditLogToDb(log: AuditLog): DbAuditLogInsert {
  return {
    id: log.id,
    actor_id: log.actorId,
    actor_name: log.actorName,
    actor_role: log.actorRole,
    action: log.action,
    target_type: log.targetType,
    target_id: log.targetId,
    details: log.details,
    timestamp: log.timestamp,
    ip_address: log.ipAddress || null,
  };
}

export function mapDbNotification(row: DbNotification | any): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    message: row.message,
    type: (row.type as any) || 'info',
    category: (row.category as any) || 'system',
    requestId: row.request_id || undefined,
    isRead: Boolean(row.is_read),
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export function mapNotificationToDb(n: Notification): DbNotificationInsert {
  return {
    id: n.id,
    user_id: n.userId,
    title: n.title,
    message: n.message,
    type: n.type,
    category: n.category,
    request_id: n.requestId || null,
    is_read: n.isRead,
    created_at: n.createdAt,
  };
}

// -------------------------------------------------------------
// API / Database Operations
// -------------------------------------------------------------

export async function fetchUsersFromSupabase(): Promise<User[]> {
  const { data, error } = await supabase.from('csmp_users').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapDbUser);
}

export async function deleteUserFromSupabase(userId: string): Promise<void> {
  const { error } = await supabase.from('csmp_users').delete().eq('id', userId);
  if (error) throw error;
}

export async function fetchRequestsFromSupabase(): Promise<ServiceRequest[]> {
  const { data, error } = await supabase.from('csmp_requests').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapDbRequest);
}

// -------------------------------------------------------------
// Collision-resistant identifiers & ticket numbers
// -------------------------------------------------------------
// Request ids and ticket numbers must be unique app-wide. The old
// scheme derived numbers from the in-memory request list (which is
// empty on every fresh load), so two clients could generate the same
// ticket_number and hit the UNIQUE constraint. A random suffix makes
// each value distinct without a DB round-trip.
export function generateRequestId(prefix = 'req'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function generateTicketNumber(type: ServiceRequest['type'], counter: number): string {
  const prefix = type === 'support' ? 'TCK' : 'HLD';
  const offset = type === 'support' ? 101 : type === 'deposit' ? 201 : 301;
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${new Date().getFullYear()}-${counter + offset}-${suffix}`;
}

// Lightweight in-memory queue for requests whose Supabase write failed
// (e.g. transient network outage). Retried on the app's heartbeat.
const pendingSyncQueue: ServiceRequest[] = [];

export function queueRequestForRetry(req: ServiceRequest): void {
  if (!pendingSyncQueue.some(r => r.id === req.id)) pendingSyncQueue.push(req);
}

export async function flushPendingRequestSync(): Promise<void> {
  for (const req of [...pendingSyncQueue]) {
    try {
      await saveRequestToSupabase(req);
      pendingSyncQueue.splice(pendingSyncQueue.indexOf(req), 1);
    } catch (err: any) {
      console.warn(`Still unable to sync ${req.ticketNumber}:`, err.message);
    }
  }
}

export async function saveRequestToSupabase(req: ServiceRequest): Promise<void> {
  const payload = mapRequestToDb(req);

  const attempt = (ticketNumber: string) =>
    supabase.from('csmp_requests').upsert(
      { ...payload, ticket_number: ticketNumber },
      { onConflict: 'id' }
    );

  let { error } = await attempt(req.ticketNumber);
  if (error) {
    console.warn('Initial Supabase upsert error:', error.message, error.details || '');
    // ticket_number UNIQUE constraint collision → retry once with a fresh suffix.
    if (error.message && /unique|duplicate/i.test(error.message)) {
      const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
      const collisionRetry = await attempt(`${req.ticketNumber}-${suffix}`);
      if (!collisionRetry.error) return;
      error = collisionRetry.error;
      console.warn('Ticket-number collision retry failed:', error.message);
    }
    // Graceful fallback: strip columns that may not yet exist in older schema deployments
    // Typed loosely: the generated DbRequestInsert type is stale (describes a
    // newer schema than the live DB), so column names here reflect the actual
    // database rather than the type definitions.
    const fallbackPayload: any = { ...payload };
    delete fallbackPayload.cma_status;
    delete fallbackPayload.authorized_amount;
    delete fallbackPayload.transfer_receipt_ref;
    delete fallbackPayload.resolved_at;
    delete fallbackPayload.client_company;
    delete fallbackPayload.beneficiary_account_number;
    delete fallbackPayload.bank_name;
    delete fallbackPayload.bank_ifsc;
    delete fallbackPayload.delete_requested;
    delete fallbackPayload.delete_requested_by;
    delete fallbackPayload.delete_requested_by_id;
    delete fallbackPayload.delete_requested_reason;
    delete fallbackPayload.delete_requested_at;
    const retry = await supabase.from('csmp_requests').upsert(fallbackPayload, { onConflict: 'id' });
    if (retry.error) {
      console.error('Supabase request upsert fallback error:', retry.error.message, retry.error.details || '');
      throw retry.error;
    }
    return;
  }
}

export async function updateRequestInSupabase(reqId: string, updates: Partial<any>): Promise<void> {
  const { error } = await supabase.from('csmp_requests').update(updates).eq('id', reqId);
  if (error) throw error;
}

export async function deleteRequestFromSupabase(reqId: string): Promise<void> {
  const { error } = await supabase.from('csmp_requests').delete().eq('id', reqId);
  if (error) throw error;
}

export const INITIAL_ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    role: 'admin',
    allowedPages: ['dashboard', 'support', 'holding', 'all-requests', 'assignments', 'clients', 'analytics', 'rbac', 'audit-logs', 'notifications', 'settings'],
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
    allowedPages: ['dashboard', 'support', 'holding', 'all-requests', 'assignments', 'clients', 'analytics', 'notifications'],
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

export async function fetchPermissionsFromSupabase(): Promise<Record<UserRole, RolePermissions> | null> {
  return INITIAL_ROLE_PERMISSIONS;
}

export async function savePermissionsToSupabase(_role: UserRole, _perms: RolePermissions): Promise<void> {
  // Hardcoded permissions array used - no-op for database writes
}

function normalizeAssignmentRule(rule: any): TypeWiseAssignmentRule | null {
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

export async function fetchAssignmentConfigFromSupabase(): Promise<AssignmentConfig | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('csmp_settings')
      .select('value')
      .eq('key', 'assignment_config')
      .maybeSingle();

    if (error || !data?.value) return null;
    const rawConfig = data.value as AssignmentConfig;
    return {
      autoAssignmentEnabled: Boolean(rawConfig.autoAssignmentEnabled),
      rules: {
        limit: normalizeAssignmentRule(rawConfig.rules?.limit),
        support: normalizeAssignmentRule(rawConfig.rules?.support),
        deposit: normalizeAssignmentRule(rawConfig.rules?.deposit),
      },
    };
  } catch (err: any) {
    console.warn('[Auto-Assign] Could not fetch assignment config from Supabase:', err?.message || err);
    return null;
  }
}

export async function saveAssignmentConfigToSupabase(config: AssignmentConfig): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const { error } = await supabase.from('csmp_settings').upsert({
      key: 'assignment_config',
      value: config,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' });

    if (error) {
      console.error('[Auto-Assign] Failed to persist assignment config to Supabase:', error.message, error.details || '');
      throw error;
    }
  } catch (err: any) {
    console.warn('[Auto-Assign] Could not persist assignment config to Supabase:', err?.message || err);
    throw err;
  }
}


export async function fetchNotificationsFromSupabase(): Promise<Notification[]> {
  const { data, error } = await supabase.from('csmp_notifications').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapDbNotification);
}

export async function saveNotificationToSupabase(n: Notification): Promise<void> {
  const payload = mapNotificationToDb(n);
  const { error } = await supabase.from('csmp_notifications').insert(payload);
  if (error) throw error;
}

export async function markNotificationReadInSupabase(id: string): Promise<void> {
  const { error } = await supabase.from('csmp_notifications').update({ is_read: true }).eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsReadInSupabase(userId: string): Promise<void> {
  const { error } = await supabase
    .from('csmp_notifications')
    .update({ is_read: true })
    .or(`user_id.eq.${userId},user_id.eq.all_operators,user_id.eq.all_admins`);
  if (error) throw error;
}

export async function fetchAuditLogsFromSupabase(): Promise<AuditLog[]> {
  const { data, error } = await supabase.from('csmp_audit_logs').select('*').order('timestamp', { ascending: false }).limit(100);
  if (error) throw error;
  return (data || []).map(mapDbAuditLog);
}

export async function saveAuditLogToSupabase(log: AuditLog): Promise<void> {
  const payload = mapAuditLogToDb(log);
  const { error } = await supabase.from('csmp_audit_logs').insert(payload);
  if (error) throw error;
}

// -------------------------------------------------------------
// Health Check & Diagnostic
// -------------------------------------------------------------

export async function checkSupabaseHealth(): Promise<{
  connected: boolean;
  latencyMs: number;
  error?: string;
  tables?: { users: number; requests: number; auditLogs: number };
}> {
  if (!isSupabaseConfigured) {
    return {
      connected: false,
      latencyMs: 0,
      error: 'Supabase credentials are not configured or using placeholder values.',
    };
  }
  const start = performance.now();
  try {
    const [usersRes, reqsRes, auditRes] = await Promise.all([
      supabase.from('csmp_users').select('*', { count: 'exact', head: true }),
      supabase.from('csmp_requests').select('*', { count: 'exact', head: true }),
      supabase.from('csmp_audit_logs').select('*', { count: 'exact', head: true }),
    ]);

    if (usersRes.error) throw usersRes.error;
    if (reqsRes.error) throw reqsRes.error;
    if (auditRes.error) throw auditRes.error;

    const latencyMs = Math.round(performance.now() - start);

    return {
      connected: true,
      latencyMs,
      tables: {
        users: usersRes.count || 0,
        requests: reqsRes.count || 0,
        auditLogs: auditRes.count || 0,
      },
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      connected: false,
      latencyMs,
      // Sanitize: never expose raw DB error messages to the UI
      error: 'Could not reach database. Check your connection or Supabase project status.',
    };
  }
}

// -------------------------------------------------------------
// STORAGE: Request attachments
// -------------------------------------------------------------
const ATTACHMENT_BUCKET = 'csmp-attachments';

function sanitizeAttachmentName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80) || 'file';
}

/**
 * Upload a set of files to the `csmp-attachments` Storage bucket and return
 * Attachment records (public URLs) ready to store on a request.
 *
 * Falls back to local data-URL attachments when Supabase is not configured or
 * the upload fails, so the client UI never hard-crashes on a storage outage.
 */
export type UploadableAttachment =
  | File
  | Attachment
  | { name: string; size: number; type: string; url: string; file?: File };

/** Resolve the raw bytes to upload, if any, from a local record or File. */
function resolveSourceFile(f: UploadableAttachment): File | null {
  if (f instanceof File) return f;
  const maybe = (f as { file?: File }).file;
  return maybe || null;
}

export async function uploadAttachmentsToSupabase(
  ownerId: string,
  files: UploadableAttachment[],
): Promise<Attachment[]> {
  const uploaded: Attachment[] = [];
  const nowIso = new Date().toISOString();

  if (!isSupabaseConfigured) {
    // Offline/demo: keep in-memory data URLs (no real Storage).
    for (const f of files) {
      uploaded.push(await normalizeAttachment(f, 'local-' + Math.random().toString(36).slice(2, 8), nowIso, ownerId));
    }
    return uploaded;
  }

  for (const f of files) {
    // Already an uploaded Attachment -> pass through untouched.
    if (!(f instanceof File) && (f as Attachment).id) {
      uploaded.push(f as Attachment);
      continue;
    }

    // A local preview without raw bytes cannot reach Storage — keep its data URL.
    const rawFile = resolveSourceFile(f);
    if (!rawFile) {
      uploaded.push(await normalizeAttachment(f, 'local-' + Math.random().toString(36).slice(2, 8), nowIso, ownerId));
      continue;
    }

    try {
      const safeName = sanitizeAttachmentName(rawFile.name);
      const path = `uploads/${ownerId}/${Date.now()}_${safeName}`;
      const { error } = await supabase.storage
        .from(ATTACHMENT_BUCKET)
        .upload(path, rawFile, { upsert: false, contentType: rawFile.type || 'application/octet-stream' });
      if (error) throw error;
      const { data: pub } = supabase.storage.from(ATTACHMENT_BUCKET).getPublicUrl(path);
      const url = pub?.publicUrl || '';
      uploaded.push(toAttachment(rawFile, 'att_' + Math.random().toString(36).slice(2, 10), url, nowIso, ownerId));
    } catch (err: any) {
      // Storage unreachable -> degrade to an in-memory preview so the request still goes through.
      console.warn('Attachment upload failed, using local preview:', err?.message);
      uploaded.push(await normalizeAttachment(f, 'local-' + Math.random().toString(36).slice(2, 8), nowIso, ownerId));
    }
  }
  return uploaded;
}

async function normalizeAttachment(
  f: UploadableAttachment,
  id: string,
  uploadedAt: string,
  uploadedBy: string,
): Promise<Attachment> {
  if (f instanceof File) {
    return toAttachment(f, id, await fileToDataUrl(f), uploadedAt, uploadedBy);
  }
  const rawFile = (f as { file?: File }).file;
  if (rawFile) {
    return toAttachment(rawFile, id, (f as any).url || await fileToDataUrl(rawFile), uploadedAt, uploadedBy);
  }
  // Local preview object (name/size/type/url) — preserve its data URL.
  return {
    id,
    name: (f as any).name || 'attachment',
    size: (f as any).size || 0,
    type: (f as any).type || 'application/octet-stream',
    url: (f as any).url || '',
    uploadedAt,
    uploadedBy,
  };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function toAttachment(f: File, id: string, url: string, uploadedAt: string, uploadedBy: string): Attachment {
  return {
    id,
    name: f.name,
    size: f.size,
    type: f.type || 'application/octet-stream',
    url,
    uploadedAt,
    uploadedBy,
  };
}
