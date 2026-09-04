import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  ServiceRequest,
  SupportTicket,
  HoldingDepositRequest,
  HoldingWithdrawRequest,
  CmaStatus,
  RolePermissions,
  Notification,
  NotificationType,
  AuditLog,
  PageId,
  AppView,
  RequestStatus,
  RequestPriority,
  FilterState,
  UserRole,
  AssignmentConfig,
  getRuleHandlers,
  getRuleAuthorizers,
  GlobalNotice,
} from '../types';
import {
  getStoredRequests,
  saveRequests,
  savePermissions,
  saveNotifications,
  saveAuditLogs,
  logAuditEvent as localLogAuditEvent,
  resetToDemoData,
  exportRequestsToCSV,
  DEFAULT_PERMISSIONS,
  getStoredPermissions,
  clearSensitiveStorage,
  getStoredAssignmentConfig,
  saveAssignmentConfig,
  getStoredGlobalNotices,
  saveGlobalNotices,
} from '../lib/storage';
import { formatAmountInWords } from '../lib/indianCurrency';
import {
  supabase,
  fetchRequestsFromSupabase,
  saveRequestToSupabase,
  deleteRequestFromSupabase,
  fetchPermissionsFromSupabase,
  savePermissionsToSupabase,
  fetchNotificationsFromSupabase,
  saveNotificationToSupabase,
  markNotificationReadInSupabase,
  markAllNotificationsReadInSupabase,
  fetchAuditLogsFromSupabase,
  saveAuditLogToSupabase,
  mapDbNotification,
  mapDbRequest,
  checkSupabaseHealth,
  generateRequestId,
  generateTicketNumber,
  queueRequestForRetry,
  flushPendingRequestSync,
  fetchAssignmentConfigFromSupabase,
  saveAssignmentConfigToSupabase,
} from '../lib/supabase';
import { ThemeConfig, getStoredTheme, applyTheme, DEFAULT_THEME } from '../lib/theme';
import { useAuth } from './AuthContext';
import { useSessionTimer } from './SessionContext';
import { useLocation, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';

interface AppContextType {
  // Top-Level View Routing
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  goToDashboard: () => void;
  goToHome: () => void;
  goToAuth: () => void;

  // Navigation & View
  currentPage: PageId;
  setCurrentPage: (page: PageId) => void;
  allowedPages: PageId[];
  isPageAllowed: (page: PageId) => boolean;

  // Requests Data & Actions
  requests: ServiceRequest[];
  filteredRequests: ServiceRequest[];
  activeRequest: ServiceRequest | null;
  setActiveRequest: (req: ServiceRequest | null) => void;
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
  initialCreateType?: 'support' | 'deposit' | 'withdraw';
  openCreateModal: (type?: 'support' | 'deposit' | 'withdraw') => void;

  createSupportTicket: (data: {
    title: string;
    description: string;
    category?: SupportTicket['category'];
    priority: RequestPriority;
    remoteId?: string;
    browserInfo?: string;
    attachments?: { name: string; size: number; type: string; url: string }[];
  }) => Promise<ServiceRequest>;

  createHoldingDeposit: (data: {
    amount: number;
    amountInWords?: string;
    currency: string;
    depositMethod: HoldingDepositRequest['depositMethod'];
    transactionReferenceId: string;
    senderAccountName?: string;
    kioskId?: string;
    branchCode?: string;
    depositDate: string;
    description: string;
    attachments?: { name: string; size: number; type: string; url: string }[];
  }) => Promise<ServiceRequest>;

  createHoldingWithdraw: (data: {
    amount: number;
    amountInWords?: string;
    currency: string;
    withdrawMethod: HoldingWithdrawRequest['withdrawMethod'];
    beneficiaryAccountName: string;
    beneficiaryAccountNumberOrAddress: string;
    bankNameOrNetwork?: string;
    swiftOrIban?: string;
    reason?: string;
    kioskId?: string;
    description: string;
    attachments?: { name: string; size: number; type: string; url: string }[];
  }) => Promise<ServiceRequest>;

  updateRequestStatus: (
    requestId: string,
    newStatus: RequestStatus,
    note?: string,
    verifiedTxId?: string
  ) => void;

  updateWithdrawalCmaStep: (
    requestId: string,
    step: 'configure' | 'make' | 'authorize',
    checked: boolean,
    authorizedAmount?: number
  ) => void;

  assignOperator: (requestId: string, operatorId: string) => void;
  assignAuthorizer: (requestId: string, authorizerId: string) => Promise<void>;
  rejectRequest: (requestId: string, reason: string) => Promise<void>;

  addComment: (
    requestId: string,
    content: string,
    isInternal: boolean,
    attachments?: { name: string; size: number; type: string; url: string }[]
  ) => void;

  deleteRequest: (requestId: string) => void;
  requestDeletion: (requestId: string, reason: string) => void;
  approveDeletion: (requestId: string) => void;
  rejectDeletion: (requestId: string) => void;

  // Permissions & RBAC
  permissions: Record<UserRole, RolePermissions>;
  updateRolePermission: (role: UserRole, updates: Partial<RolePermissions>) => void;
  togglePageForRole: (role: UserRole, pageId: PageId) => void;

  // Notifications
  notifications: Notification[];
  userNotifications: Notification[];
  unreadNotifCount: number;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotification: (id: string) => void;

  // Global Broadcast Notices
  globalNotices: GlobalNotice[];
  activeGlobalNotice: GlobalNotice | null;
  broadcastGlobalNotice: (data: {
    title: string;
    message: string;
    type: NotificationType;
    expiresAt?: string;
  }) => void;
  deactivateGlobalNotice: (id: string) => void;
  deleteGlobalNotice: (id: string) => void;

  // Audit Logs
  auditLogs: AuditLog[];

  // Filter & Search
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;

  // Theme & Styling
  isDarkMode: boolean;
  toggleTheme: () => void;
  themeConfig: ThemeConfig;
  setThemeConfig: (config: ThemeConfig) => void;
  updateThemeConfig: (updates: Partial<ThemeConfig>) => void;
  resetThemeConfig: () => void;
  isThemeModalOpen: boolean;
  setIsThemeModalOpen: (open: boolean) => void;
  openThemeModal: () => void;
  closeThemeModal: () => void;

  // Branding Modal (admin only)
  isBrandingModalOpen: boolean;
  openBrandingModal: () => void;
  closeBrandingModal: () => void;

  // Mobile Navigation
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;

  // Supabase Backend Status & Sync
  isSupabaseConnected: boolean;
  syncWithSupabase: () => Promise<void>;

  // Assignment Config
  assignmentConfig: AssignmentConfig;
  updateAssignmentConfig: (updates: Partial<AssignmentConfig>) => void;

  // Utilities
  triggerExportCSV: () => void;
  resetAllDemoData: () => void;
  toast: (msg: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  toastMessage: { text: string; type: 'success' | 'info' | 'error' | 'warning'; id: number } | null;
}

const initialFilters: FilterState = {
  searchQuery: '',
  typeFilter: 'all',
  statusFilter: 'all',
  priorityFilter: 'all',
  operatorFilter: 'all',
  dateRange: 'all',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const VALID_PAGES: PageId[] = [
  'dashboard',
  'support',
  'holding',
  'all-requests',
  'assignments',
  'clients',
  'analytics',
  'rbac',
  'audit-logs',
  'notifications',
  'settings',
];

const PAGE_ALIASES: Record<string, PageId> = {
  userdirectory: 'clients',
  'user-directory': 'clients',
  users: 'clients',
  clientdirectory: 'clients',
  'client-directory': 'clients',
  clients: 'clients',
  requests: 'all-requests',
  allrequests: 'all-requests',
  'all-requests': 'all-requests',
  assignments: 'assignments',
  'assignment-management': 'assignments',
  tasks: 'assignments',
  audit: 'audit-logs',
  auditlogs: 'audit-logs',
  'audit-logs': 'audit-logs',
  audittrail: 'audit-logs',
  'audit-trail': 'audit-logs',
};

function getRouteFromPathname(pathname: string): { view: AppView; page: PageId } {
  const path = pathname.replace(/^\/+/, '').trim().toLowerCase().split('?')[0];

  if (path === '' || path === 'home' || path === 'public') {
    return { view: 'home', page: 'dashboard' };
  }
  if (path === 'auth' || path === 'login' || path === 'signin' || path === 'signup') {
    return { view: 'auth', page: 'dashboard' };
  }
  if (PAGE_ALIASES[path]) {
    return { view: 'app', page: PAGE_ALIASES[path] };
  }
  if (VALID_PAGES.includes(path as PageId)) {
    return { view: 'app', page: path as PageId };
  }

  return { view: 'home', page: 'dashboard' };
}

function routeToPath(view: AppView, page: PageId): string {
  if (view === 'home') return '/';
  if (view === 'auth') return '/auth';
  return `/${page}`;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, allUsers, isAuthenticated, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Auto-extend the auth session whenever the user interacts with the database.
  const { extendSession } = useSessionTimer();

  // One-time eviction: purge all sensitive legacy caches from localStorage.
  React.useEffect(() => {
    clearSensitiveStorage();
  }, []);

  const [currentView, setCurrentViewState] = useState<AppView>(() => getRouteFromPathname(window.location.pathname).view);
  const [currentPage, setCurrentPageState] = useState<PageId>(() => getRouteFromPathname(window.location.pathname).page);


  const setCurrentView = useCallback((view: AppView) => {
    setCurrentViewState(view);
    navigate(routeToPath(view, currentPage), { replace: true });
  }, [navigate, currentPage]);

  const setCurrentPage = useCallback((page: PageId) => {
    setCurrentPageState(page);
    setCurrentViewState('app');
    navigate(routeToPath('app', page), { replace: true });
  }, [navigate]);

  const goToDashboard = useCallback(() => {
    if (isAuthenticated && user) {
      setCurrentViewState('app');
      setCurrentPageState('dashboard');
      navigate('/dashboard', { replace: true });
    } else {
      setCurrentViewState('auth');
      navigate('/auth', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const goToHome = useCallback(() => {
    setCurrentViewState('home');
    navigate('/', { replace: true });
  }, [navigate]);

  const goToAuth = useCallback(() => {
    setCurrentViewState('auth');
    navigate('/auth', { replace: true });
  }, [navigate]);

  // Listen to browser route changes (e.g. Back / Forward button, manual URL changes)
  useEffect(() => {
    const route = getRouteFromPathname(location.pathname);
    setCurrentViewState(route.view);
    setCurrentPageState(route.page);
  }, [location.pathname]);
  // All sensitive state starts empty — populated by syncWithSupabase after auth succeeds.
  // Do NOT initialize from localStorage on cold start: unauthenticated visits must see nothing.
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  // Permissions start from built-in defaults or local storage
  const [permissions, setPermissions] = useState<Record<UserRole, RolePermissions>>(() => getStoredPermissions());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [globalNotices, setGlobalNotices] = useState<GlobalNotice[]>(() => getStoredGlobalNotices());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(false);
  const [assignmentConfig, setAssignmentConfig] = useState<AssignmentConfig>(() => getStoredAssignmentConfig());

  const updateAssignmentConfig = (updates: Partial<AssignmentConfig>) => {
    setAssignmentConfig(prev => {
      const nextRules = updates.rules !== undefined ? { ...prev.rules, ...updates.rules } : prev.rules;
      const next: AssignmentConfig = {
        ...prev,
        ...updates,
        rules: nextRules,
      };
      saveAssignmentConfig(next);

      // Persist to Supabase if configured
      saveAssignmentConfigToSupabase(next).catch(() => {});

      // Broadcast across tabs on the same device via BroadcastChannel
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const bc = new BroadcastChannel('csmp_live_sync');
          bc.postMessage({ type: 'ASSIGNMENT_CONFIG_UPDATED', payload: next });
          bc.close();
        } catch { /* ignore */ }
      }

      return next;
    });
  };

  const [activeRequest, setActiveRequest] = useState<ServiceRequest | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [initialCreateType, setInitialCreateType] = useState<'support' | 'deposit' | 'withdraw'>('support');

  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' | 'warning'; id: number } | null>(null);

  // Dark mode init
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('csmp_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Dynamic Theme Config
  const [themeConfig, setThemeConfigState] = useState<ThemeConfig>(() => getStoredTheme());
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isBrandingModalOpen, setIsBrandingModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    applyTheme(themeConfig);
  }, [themeConfig]);

  const setThemeConfig = useCallback((newConfig: ThemeConfig) => {
    setThemeConfigState(newConfig);
    applyTheme(newConfig);
  }, []);

  const updateThemeConfig = useCallback((updates: Partial<ThemeConfig>) => {
    setThemeConfigState(prev => {
      const next = { ...prev, ...updates };
      applyTheme(next);
      return next;
    });
  }, []);

  const resetThemeConfig = useCallback(() => {
    setThemeConfigState(DEFAULT_THEME);
    applyTheme(DEFAULT_THEME);
  }, []);

  const openThemeModal = useCallback(() => setIsThemeModalOpen(true), []);
  const closeThemeModal = useCallback(() => setIsThemeModalOpen(false), []);

  const openBrandingModal = useCallback(() => setIsBrandingModalOpen(true), []);
  const closeBrandingModal = useCallback(() => setIsBrandingModalOpen(false), []);

  const toggleMobileSidebar = useCallback(() => setIsMobileSidebarOpen(prev => !prev), []);
  const closeMobileSidebar = useCallback(() => setIsMobileSidebarOpen(false), []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('csmp_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('csmp_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  const toast = useCallback((text: string, type: 'success' | 'info' | 'error' | 'warning' = 'info') => {
    setToastMessage({ text, type, id: Date.now() });
    setTimeout(() => {
      setToastMessage(prev => (prev?.text === text ? null : prev));
    }, 4000);
  }, []);

  // Fetch initial data from Supabase and listen to real-time events
  const syncWithSupabase = useCallback(async () => {
    try {
      const health = await checkSupabaseHealth();
      setIsSupabaseConnected(health.connected);

      if (health.connected) {
        const [dbReqs, dbNotifs, dbAudit, dbAssignmentConfig] = await Promise.all([
          fetchRequestsFromSupabase().catch(() => null),
          fetchNotificationsFromSupabase().catch(() => null),
          fetchAuditLogsFromSupabase().catch(() => null),
          fetchAssignmentConfigFromSupabase().catch(() => null),
        ]);

        if (dbReqs && dbReqs.length > 0) {
          setRequests(dbReqs);
          saveRequests(dbReqs);
        }
        if (dbNotifs && dbNotifs.length > 0) {
          setNotifications(dbNotifs);
          saveNotifications(dbNotifs);
        }
        if (dbAudit && dbAudit.length > 0) {
          setAuditLogs(dbAudit);
          saveAuditLogs(dbAudit);
        }
        if (dbAssignmentConfig) {
          setAssignmentConfig(dbAssignmentConfig);
          saveAssignmentConfig(dbAssignmentConfig);
        }
      }
    } catch (err: any) {
      console.warn('Supabase sync error (using local storage fallback):', err.message);
      setIsSupabaseConnected(false);
    }
  }, []);

  // Initial mount: check health and sync — only when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    syncWithSupabase();

    // 1. Cross-Tab Live Synchronization via BroadcastChannel
    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel('csmp_live_sync');
      bc.onmessage = (event) => {
        if (event.data?.type === 'NOTIFICATION_DISPATCHED' && event.data?.payload) {
          const newNotif = event.data.payload as Notification;
          setNotifications(prev => {
            if (prev.some(n => n.id === newNotif.id)) return prev;
            const updated = [newNotif, ...prev];
            saveNotifications(updated);
            return updated;
          });

          if (user) {
            const isForUser =
              newNotif.userId === user.id ||
              newNotif.userId === 'all' ||
              (newNotif.userId === 'all_staff' && user.role !== 'client') ||
              (newNotif.userId === 'all_operators' && user.role === 'operator') ||
              (newNotif.userId === 'all_admins' && user.role === 'admin');

            if (isForUser && !newNotif.isRead) {
              toast(`${newNotif.title}: ${newNotif.message}`, newNotif.type === 'error' ? 'error' : newNotif.type === 'warning' ? 'warning' : 'info');
            }
          }
        } else if (event.data?.type === 'REQUEST_UPDATED' || event.data?.type === 'REQUEST_CREATED') {
          fetchRequestsFromSupabase().then(dbReqs => {
            if (dbReqs) {
              setRequests(dbReqs);
              saveRequests(dbReqs);
            }
          }).catch(() => { });
        } else if (event.data?.type === 'RBAC_UPDATED' && event.data?.payload) {
          // Another tab updated RBAC — merge the changed role permissions into state
          const updatedRole = event.data.payload as { role: UserRole; perms: RolePermissions };
          setPermissions(prev => {
            const next = { ...prev, [updatedRole.role]: updatedRole.perms };
            savePermissions(next);
            return next;
          });
        } else if (event.data?.type === 'ASSIGNMENT_CONFIG_UPDATED' && event.data?.payload) {
          // Another tab updated assignment rules — sync into state and storage
          const incomingConfig = event.data.payload as AssignmentConfig;
          setAssignmentConfig(incomingConfig);
          saveAssignmentConfig(incomingConfig);
        }
      };
    }

    // 2. Supabase Realtime Subscription Channel
    const channel = supabase
      .channel('csmp_realtime_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'csmp_requests' }, (payload: any) => {
        if (payload.new) {
          try {
            const updatedReq = mapDbRequest(payload.new);
            setRequests(prev => {
              const exists = prev.some(r => r.id === updatedReq.id);
              const updated = exists ? prev.map(r => r.id === updatedReq.id ? updatedReq : r) : [updatedReq, ...prev];
              saveRequests(updated);
              return updated;
            });
            if (activeRequest && activeRequest.id === updatedReq.id) {
              setActiveRequest(updatedReq);
            }
          } catch {
            fetchRequestsFromSupabase().then(dbReqs => {
              if (dbReqs) {
                setRequests(dbReqs);
                saveRequests(dbReqs);
              }
            }).catch(() => { });
          }
        } else {
          fetchRequestsFromSupabase().then(dbReqs => {
            if (dbReqs) {
              setRequests(dbReqs);
              saveRequests(dbReqs);
            }
          }).catch(() => { });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'csmp_notifications' }, (payload: any) => {
        if (payload.new) {
          try {
            const newNotif = mapDbNotification(payload.new);
            setNotifications(prev => {
              const exists = prev.some(n => n.id === newNotif.id);
              const updated = exists ? prev.map(n => n.id === newNotif.id ? newNotif : n) : [newNotif, ...prev];
              saveNotifications(updated);
              return updated;
            });

            if (user) {
              const isForUser =
                newNotif.userId === user.id ||
                newNotif.userId === 'all' ||
                (newNotif.userId === 'all_staff' && user.role !== 'client') ||
                (newNotif.userId === 'all_operators' && user.role === 'operator') ||
                (newNotif.userId === 'all_admins' && user.role === 'admin');

              if (isForUser && !newNotif.isRead) {
                toast(`${newNotif.title}: ${newNotif.message}`, newNotif.type === 'error' ? 'error' : newNotif.type === 'warning' ? 'warning' : 'info');
              }
            }
          } catch {
            fetchNotificationsFromSupabase().then(dbNotifs => {
              if (dbNotifs) {
                setNotifications(dbNotifs);
                saveNotifications(dbNotifs);
              }
            }).catch(() => { });
          }
        } else {
          fetchNotificationsFromSupabase().then(dbNotifs => {
            if (dbNotifs) {
              setNotifications(dbNotifs);
              saveNotifications(dbNotifs);
            }
          }).catch(() => { });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'csmp_audit_logs' }, () => {
        fetchAuditLogsFromSupabase().then(dbAudit => {
          if (dbAudit) {
            setAuditLogs(dbAudit);
            saveAuditLogs(dbAudit);
          }
        }).catch(() => { });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'csmp_settings' }, (payload: any) => {
        if (payload?.new && payload.new.key === 'assignment_config') {
          fetchAssignmentConfigFromSupabase().then(latestConfig => {
            if (latestConfig) {
              setAssignmentConfig(latestConfig);
              saveAssignmentConfig(latestConfig);
            }
          }).catch(() => { });
        }
      })
      .subscribe();

    // 3. Heartbeat Polling Interval (every 4 seconds) to guarantee sync across distributed instances
    const heartbeatInterval = setInterval(() => {
      fetchNotificationsFromSupabase().then(dbNotifs => {
        if (dbNotifs && dbNotifs.length > 0) {
          setNotifications(dbNotifs);
          saveNotifications(dbNotifs);
        }
      }).catch(() => { });

      fetchRequestsFromSupabase().then(dbReqs => {
        if (dbReqs && dbReqs.length > 0) {
          setRequests(dbReqs);
          saveRequests(dbReqs);
        }
      }).catch(() => { });

      // Retry any requests whose Supabase write failed earlier
      flushPendingRequestSync().catch(() => { });
    }, 4000);

    return () => {
      supabase.removeChannel(channel);
      if (bc) bc.close();
      clearInterval(heartbeatInterval);
    };
  }, [isAuthenticated, user, syncWithSupabase, toast]);

  // Clear in-memory sensitive state when auth is lost (session expiry / sign-out)
  useEffect(() => {
    if (!isAuthenticated && !session) {
      setRequests([]);
      setNotifications([]);
      setAuditLogs([]);
      setPermissions(DEFAULT_PERMISSIONS);
      // Global notices are intentionally kept across sign-out — they are public broadcasts.
      // setGlobalNotices stays as-is.
    }
  }, [isAuthenticated, session]);

  // Sync state if activeRequest updates
  useEffect(() => {
    if (activeRequest) {
      const updated = requests.find(r => r.id === activeRequest.id);
      if (updated) setActiveRequest(updated);
    }
  }, [requests]);

  // Allowed pages — sourced from permissions with resilient hardcoded fallback
  const userRole = user?.role || 'client';
  const rolePerm = permissions[userRole] || DEFAULT_PERMISSIONS[userRole] || DEFAULT_PERMISSIONS.client;
  const allowedPages: PageId[] = (rolePerm?.allowedPages && rolePerm.allowedPages.length > 0)
    ? rolePerm.allowedPages
    : (DEFAULT_PERMISSIONS[userRole]?.allowedPages || DEFAULT_PERMISSIONS.client.allowedPages);
  const isPageAllowed = (page: PageId) => allowedPages.includes(page);

  // Redirect if current page not allowed for authenticated user
  useEffect(() => {
    if (isAuthenticated && user && !isPageAllowed(currentPage)) {
      setCurrentPage('dashboard');
    }
  }, [isAuthenticated, user?.role, permissions, currentPage]);

  const openCreateModal = (type: 'support' | 'deposit' | 'withdraw' = 'support') => {
    setInitialCreateType(type);
    setIsCreateModalOpen(true);
  };

  const dispatchNotification = (
    userId: string,
    title: string,
    message: string,
    category: Notification['category'],
    type: Notification['type'] = 'info',
    requestId?: string
  ) => {
    const newNotif: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      title,
      message,
      type,
      category,
      requestId,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    setNotifications(prev => {
      const updated = [newNotif, ...prev];
      saveNotifications(updated);
      return updated;
    });

    // Broadcast to other tabs via BroadcastChannel
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('csmp_live_sync');
        bc.postMessage({ type: 'NOTIFICATION_DISPATCHED', payload: newNotif });
        bc.close();
      } catch { /* not supported */ }
    }

    // Show in-tab toast for notifications relevant to the current user
    const isForCurrentUser =
      newNotif.userId === user.id ||
      newNotif.userId === 'all' ||
      (newNotif.userId === 'all_staff' && user.role !== 'client') ||
      (newNotif.userId === 'all_operators' && user.role === 'operator') ||
      (newNotif.userId === 'all_admins' && user.role === 'admin');

    if (isForCurrentUser) {
      toast(
        `${newNotif.title}\n${newNotif.message}`,
        newNotif.type === 'error' ? 'error' : newNotif.type === 'warning' ? 'warning' : 'success'
      );
    }

    // Save to Supabase (triggers Realtime on other sessions/devices)
    saveNotificationToSupabase(newNotif)
      .then(() => extendSession())
      .catch(() => { });
  };

  const recordAudit = (
    action: string,
    targetType: AuditLog['targetType'],
    targetId: string,
    details: string
  ) => {
    const newLog: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action,
      targetType,
      targetId,
      details,
      timestamp: new Date().toISOString(),
      ipAddress: '127.0.0.1 (Supabase Auth)',
    };

    setAuditLogs(prev => {
      const updated = [newLog, ...prev];
      saveAuditLogs(updated);
      return updated;
    });

    // Save to Supabase
    saveAuditLogToSupabase(newLog).catch(() => { });
  };

  // ── Auto-assignment helper ──────────────────────────────────────────────────
  // Applies the type-wise rule from assignmentConfig to a freshly created request.
  // When multiple handlers are configured, assigns to the handler with the lowest
  // active workload (open tickets count).
  const autoAssignRequest = <T extends ServiceRequest>(req: T, type: 'support' | 'deposit' | 'limit'): T => {
    if (!assignmentConfig.autoAssignmentEnabled) return req;
    const rule = assignmentConfig.rules[type];
    if (!rule) return req;

    const handlers = getRuleHandlers(rule);
    if (handlers.length === 0) return req;

    // Pick handler from pool: choose the handler with lowest active workload
    let chosenHandler = handlers[0];
    if (handlers.length > 1) {
      const activeCounts = new Map<string, number>();
      handlers.forEach(h => activeCounts.set(h.id, 0));
      for (const r of requests) {
        if (r.status !== 'completed' && r.status !== 'rejected' && r.assignedOperatorId) {
          if (activeCounts.has(r.assignedOperatorId)) {
            activeCounts.set(r.assignedOperatorId, (activeCounts.get(r.assignedOperatorId) || 0) + 1);
          }
        }
      }
      const sorted = [...handlers].sort((a, b) => (activeCounts.get(a.id) || 0) - (activeCounts.get(b.id) || 0));
      chosenHandler = sorted[0];
    }

    const opUser = allUsers.find(u => u.id === chosenHandler.id);
    const operatorName = (chosenHandler.name && chosenHandler.name.trim()) || opUser?.name || 'Assigned Operator';

    const patched: T = {
      ...req,
      assignedOperatorId: chosenHandler.id.trim(),
      assignedOperatorName: operatorName,
      status: 'in_progress' as const,
    };

    // For limit (withdraw / CMA) requests also assign the authorizer
    if (type === 'limit') {
      const authorizers = getRuleAuthorizers(rule);
      if (authorizers.length > 0) {
        let chosenAuth = authorizers[0];
        if (authorizers.length > 1) {
          const authCounts = new Map<string, number>();
          authorizers.forEach(a => authCounts.set(a.id, 0));
          for (const r of requests) {
            const authId = (r as any).assignedAuthorizerId;
            if (r.status !== 'completed' && r.status !== 'rejected' && authId && authCounts.has(authId)) {
              authCounts.set(authId, (authCounts.get(authId) || 0) + 1);
            }
          }
          const sortedAuth = [...authorizers].sort((a, b) => (authCounts.get(a.id) || 0) - (authCounts.get(b.id) || 0));
          chosenAuth = sortedAuth[0];
        }
        const authUser = allUsers.find(u => u.id === chosenAuth.id);
        const authorizerName = (chosenAuth.name && chosenAuth.name.trim()) || authUser?.name || 'Assigned Authorizer';
        (patched as any).assignedAuthorizerId = chosenAuth.id.trim();
        (patched as any).assignedAuthorizerName = authorizerName;
      }
    }

    return patched;
  };

  // Create Support Ticket
  const createSupportTicket = async (data: {
    title: string;
    description: string;
    category?: SupportTicket['category'];
    priority: RequestPriority;
    remoteId?: string;
    environment?: string;
    browserInfo?: string;
    attachments?: { name: string; size: number; type: string; url: string }[];
  }): Promise<ServiceRequest> => {
    const now = new Date().toISOString();
    const count = requests.filter(r => r.type === 'support').length;
    const ticketNumber = generateTicketNumber('support', count);

    const newTicket: SupportTicket = {
      id: generateRequestId('req'),
      ticketNumber,
      type: 'support',
      title: data.title,
      description: data.description,
      category: data.category || 'matm',
      remoteId: data.remoteId,
      browserInfo: data.browserInfo || navigator.userAgent,
      status: 'pending',
      priority: data.priority,
      clientId: user.id,
      clientName: user.name,
      clientEmail: user.email,
      clientCompany: user.companyName,
      createdAt: now,
      updatedAt: now,
      comments: [],
      attachments: (data.attachments || []).map((att, i) => ({
        id: `att_${Date.now()}_${i}`,
        name: att.name,
        size: att.size,
        type: att.type,
        url: att.url,
        uploadedAt: now,
        uploadedBy: user.name,
      })),
    };

    const assignedTicket = autoAssignRequest(newTicket, 'support');
    const updated = [assignedTicket, ...requests];
    setRequests(updated);
    saveRequests(updated);

    // Persist to Supabase — only report success once the row is actually saved.
    try {
      await saveRequestToSupabase(assignedTicket);
    } catch (err: any) {
      console.warn('Request not persisted to Supabase:', err.message);
      queueRequestForRetry(assignedTicket);
      toast(`Saved locally — will retry syncing "${ticketNumber}".`, 'warning');
      return assignedTicket;
    }

    recordAudit('CREATED_SUPPORT_TICKET', 'request', assignedTicket.id, `Ticket ${ticketNumber}: ${data.title} (${data.priority.toUpperCase()})`);

    // 1. Notify the submitting client
    dispatchNotification(
      user.id,
      `Support Request`,
      `Your ticket "${data.title}" (${data.priority.toUpperCase()}) was logged successfully.`,
      'new_request',
      'info',
      assignedTicket.id
    );

    // 2. Broadcast to all operations staff and admins
    dispatchNotification(
      'all_staff',
      `Support Request`,
      `${user.name} submitted ticket "${data.title}" (${data.priority.toUpperCase()})${assignedTicket.assignedOperatorId ? ` — auto-assigned to ${assignedTicket.assignedOperatorName}` : ''
      }`,
      'new_request',
      data.priority === 'urgent' ? 'warning' : 'info',
      assignedTicket.id
    );

    // 3. Direct notification to assigned operator
    if (assignedTicket.assignedOperatorId) {
      dispatchNotification(
        assignedTicket.assignedOperatorId,
        `Assigned to ${ticketNumber}`,
        `Support ticket "${data.title}" submitted by ${user.name} was automatically assigned to you.`,
        'assignment',
        data.priority === 'urgent' ? 'warning' : 'info',
        assignedTicket.id
      );
    }

    toast(`Support ticket ${ticketNumber} submitted successfully!`, 'success');
    return assignedTicket;
  };

  // Create Holding Deposit Request
  const createHoldingDeposit = async (data: {
    amount: number;
    amountInWords?: string;
    currency: string;
    depositMethod: HoldingDepositRequest['depositMethod'];
    transactionReferenceId: string;
    senderAccountName?: string;
    kioskId?: string;
    branchCode?: string;
    depositDate: string;
    destinationAccount?: string;
    description: string;
    attachments?: { name: string; size: number; type: string; url: string }[];
  }): Promise<ServiceRequest> => {
    const now = new Date().toISOString();
    const count = requests.filter(r => r.type === 'deposit').length;
    const ticketNumber = generateTicketNumber('deposit', count);

    const newDeposit: HoldingDepositRequest = {
      id: generateRequestId('req'),
      ticketNumber,
      type: 'deposit',
      amount: data.amount,
      amountInWords: data.amountInWords || formatAmountInWords(data.amount, { currency: data.currency }),
      currency: data.currency,
      depositMethod: data.depositMethod,
      transactionReferenceId: data.transactionReferenceId,
      senderAccountName: data.senderAccountName || user.name,
      kioskId: data.kioskId,
      branchCode: data.branchCode,
      depositDate: data.depositDate,
      title: `Deposit ${data.currency} ${data.amount.toLocaleString()} via ${data.depositMethod.replace('_', ' ').toUpperCase()}`,
      description: data.description,
      status: 'pending',
      priority: data.amount >= 50000 ? 'urgent' : 'high',
      clientId: user.id,
      clientName: user.name,
      clientEmail: user.email,
      clientCompany: user.companyName,
      createdAt: now,
      updatedAt: now,
      comments: [],
      attachments: (data.attachments || []).map((att, i) => ({
        id: `att_${Date.now()}_${i}`,
        name: att.name,
        size: att.size,
        type: att.type,
        url: att.url,
        uploadedAt: now,
        uploadedBy: user.name,
      })),
    };

    const assignedDeposit = autoAssignRequest(newDeposit, 'deposit');
    const updated = [assignedDeposit, ...requests];
    setRequests(updated);
    saveRequests(updated);

    // Persist to Supabase — only report success once the row is actually saved.
    try {
      await saveRequestToSupabase(assignedDeposit);
    } catch (err: any) {
      console.warn('Request not persisted to Supabase:', err.message);
      queueRequestForRetry(assignedDeposit);
      toast(`Saved locally — will retry syncing "${ticketNumber}".`, 'warning');
      return assignedDeposit;
    }

    recordAudit('CREATED_DEPOSIT_REQUEST', 'request', assignedDeposit.id, `Deposit request ${ticketNumber} for ${data.currency} ${data.amount.toLocaleString()}`);

    // 1. Notify the submitting client
    dispatchNotification(
      user.id,
      `Deposit Request`,
      `Deposit update for ${data.currency} ${data.amount.toLocaleString()} is pending operator verification.`,
      'new_request',
      'info',
      assignedDeposit.id
    );

    // 2. Broadcast to financial operators and admins
    dispatchNotification(
      'all_staff',
      `Deposit Update`,
      `${user.name} submitted a ${data.currency} ${data.amount.toLocaleString()} deposit confirmation.${assignedDeposit.assignedOperatorId ? ` Auto-assigned to ${assignedDeposit.assignedOperatorName}.` : ''
      }`,
      'new_request',
      'warning',
      assignedDeposit.id
    );

    // 3. Direct notification to assigned operator
    if (assignedDeposit.assignedOperatorId) {
      dispatchNotification(
        assignedDeposit.assignedOperatorId,
        `Assigned to ${ticketNumber}`,
        `Deposit confirmation request for ${data.currency} ${data.amount.toLocaleString()} submitted by ${user.name} was automatically assigned to you.`,
        'assignment',
        'info',
        assignedDeposit.id
      );
    }

    toast(`Deposit update request ${ticketNumber} logged. Operator will verify transaction.`, 'success');
    return assignedDeposit;
  };

  // Create Holding Withdraw Request
  const createHoldingWithdraw = async (data: {
    amount: number;
    amountInWords?: string;
    currency: string;
    withdrawMethod: HoldingWithdrawRequest['withdrawMethod'];
    beneficiaryAccountName: string;
    beneficiaryAccountNumberOrAddress: string;
    bankNameOrNetwork?: string;
    swiftOrIban?: string;
    reason?: string;
    kioskId?: string;
    description: string;
    attachments?: { name: string; size: number; type: string; url: string }[];
  }): Promise<ServiceRequest> => {
    const now = new Date().toISOString();
    const count = requests.filter(r => r.type === 'withdraw').length;
    const ticketNumber = generateTicketNumber('withdraw', count);

    const newWithdraw: HoldingWithdrawRequest = {
      id: generateRequestId('req'),
      ticketNumber,
      type: 'withdraw',
      title: `Withdraw ${data.currency} ${data.amount.toLocaleString()} to ${data.beneficiaryAccountName}`,
      description: data.description,
      amount: data.amount,
      amountInWords: data.amountInWords || formatAmountInWords(data.amount, { currency: data.currency }),
      currency: data.currency,
      withdrawMethod: data.withdrawMethod,
      beneficiaryAccountName: data.beneficiaryAccountName,
      beneficiaryAccountNumberOrAddress: data.beneficiaryAccountNumberOrAddress,
      bankNameOrNetwork: data.bankNameOrNetwork,
      swiftOrIban: data.swiftOrIban,
      reason: data.reason,
      kioskId: data.kioskId,
      status: 'pending',
      priority: 'high',
      clientId: user.id,
      clientName: user.name,
      clientEmail: user.email,
      clientCompany: user.companyName,
      createdAt: now,
      updatedAt: now,
      comments: [],
      attachments: (data.attachments || []).map((att, i) => ({
        id: `att_${Date.now()}_${i}`,
        name: att.name,
        size: att.size,
        type: att.type,
        url: att.url,
        uploadedAt: now,
        uploadedBy: user.name,
      })),
    };

    const assignedWithdraw = autoAssignRequest(newWithdraw, 'limit');
    const updated = [assignedWithdraw, ...requests];
    setRequests(updated);
    saveRequests(updated);

    // Persist to Supabase — only report success once the row is actually saved.
    try {
      await saveRequestToSupabase(assignedWithdraw);
    } catch (err: any) {
      console.warn('Request not persisted to Supabase:', err.message);
      queueRequestForRetry(assignedWithdraw);
      toast(`Saved locally — will retry syncing "${ticketNumber}".`, 'warning');
      return assignedWithdraw;
    }

    recordAudit('CREATED_WITHDRAWAL_REQUEST', 'request', assignedWithdraw.id, `Withdrawal request ${ticketNumber} for ${data.currency} ${data.amount.toLocaleString()}`);

    // 1. Notify the submitting client
    dispatchNotification(
      user.id,
      `Withdrawal Request`,
      `Payout request for ${data.currency} ${data.amount.toLocaleString()} submitted for compliance checks.`,
      'new_request',
      'info',
      assignedWithdraw.id
    );

    // 2. Broadcast to staff and compliance admins
    dispatchNotification(
      'all_staff',
      `Withdrawal Request`,
      `${user.name} requested withdrawal of ${data.currency} ${data.amount.toLocaleString()}.${assignedWithdraw.assignedOperatorId
        ? ` Maker: ${assignedWithdraw.assignedOperatorName}.`
        : ''
      }${(assignedWithdraw as HoldingWithdrawRequest).assignedAuthorizerId
        ? ` Authorizer: ${(assignedWithdraw as HoldingWithdrawRequest).assignedAuthorizerName}.`
        : ''
      }`,
      'new_request',
      'warning',
      assignedWithdraw.id
    );

    // 3. Direct notification to assigned maker operator
    if (assignedWithdraw.assignedOperatorId) {
      dispatchNotification(
        assignedWithdraw.assignedOperatorId,
        `Assigned as Maker: ${ticketNumber}`,
        `Withdrawal request for ${data.currency} ${data.amount.toLocaleString()} submitted by ${user.name} was automatically assigned to you.`,
        'assignment',
        'info',
        assignedWithdraw.id
      );
    }

    // 4. Direct notification to assigned authorizer
    if ((assignedWithdraw as HoldingWithdrawRequest).assignedAuthorizerId) {
      dispatchNotification(
        (assignedWithdraw as HoldingWithdrawRequest).assignedAuthorizerId!,
        `Assigned as Authorizer: ${ticketNumber}`,
        `Withdrawal request for ${data.currency} ${data.amount.toLocaleString()} submitted by ${user.name} requires your authorization.`,
        'assignment',
        'warning',
        assignedWithdraw.id
      );
    }

    toast(`Withdrawal request ${ticketNumber} submitted for compliance approval.`, 'success');
    return assignedWithdraw;
  };

  // Persist a request to Supabase with honest feedback.
  // Returns true on success, false on failure (and queues for retry).
  const persistRequest = async (req: ServiceRequest): Promise<boolean> => {
    try {
      await saveRequestToSupabase(req);
      // A successful write is real DB activity — extend the session (throttled).
      extendSession();
      return true;
    } catch (err: any) {
      console.warn('Request DB sync failed:', err.message);
      queueRequestForRetry(req);
      return false;
    }
  };

  // Update Status
  const updateRequestStatus = async (
    requestId: string,
    newStatus: RequestStatus,
    note?: string,
    verifiedTxId?: string
  ) => {
    const now = new Date().toISOString();
    let targetReq: ServiceRequest | undefined;

    const updated = requests.map(req => {
      if (req.id !== requestId) return req;
      const updatedReq: ServiceRequest = {
        ...req,
        status: newStatus,
        rejectionReason: newStatus === 'rejected' ? (note?.trim() || req.rejectionReason) : req.rejectionReason,
        updatedAt: now,
        resolvedAt: (newStatus === 'completed' || newStatus === 'rejected') ? now : undefined,
      };

      if (newStatus === 'pending') {
        updatedReq.resolvedAt = undefined;
        if (req.type === 'withdraw') {
          (updatedReq as HoldingWithdrawRequest).cmaStatus = {
            configure: false,
            make: false,
            authorize: false,
          };
        }
      }

      if (req.type === 'deposit' && verifiedTxId) {
        (updatedReq as HoldingDepositRequest).verifiedTransactionId = verifiedTxId;
      }

      const commentContent = note && note.trim()
        ? `[Status changed to ${newStatus.toUpperCase().replace('_', ' ')}] ${note.trim()}`
        : `[Status updated to ${newStatus.toUpperCase().replace('_', ' ')} by ${user.name} (${user.role.toUpperCase()})]`;

      const commentObj = {
        id: `cm_${Date.now()}`,
        authorId: user.id,
        authorName: user.name,
        authorRole: user.role,
        authorAvatar: user.avatarUrl,
        content: commentContent,
        isInternal: false,
        createdAt: now,
      };
      updatedReq.comments = [...updatedReq.comments, commentObj];

      targetReq = updatedReq;
      return updatedReq;
    });

    setRequests(updated);
    saveRequests(updated);

    if (targetReq) {
      setActiveRequest(targetReq);

      // Persist to Supabase — only toast success when it actually succeeds.
      const persisted = await persistRequest(targetReq);

      recordAudit(
        'UPDATED_REQUEST_STATUS',
        'request',
        requestId,
        `Changed status of ${(targetReq as ServiceRequest).ticketNumber} to ${newStatus.toUpperCase()}`
      );

      const reqItem = targetReq as ServiceRequest;
      const isApproved = newStatus === 'completed';
      const isRejected = newStatus === 'rejected';

      const clientTitle = isApproved
        ? `Request Approved: ${reqItem.ticketNumber}`
        : isRejected
          ? `Request Rejected: ${reqItem.ticketNumber}`
          : `Request In Progress: ${reqItem.ticketNumber}`;

      const clientMsg = isApproved
        ? `Your request "${reqItem.title}" has been reviewed and APPROVED by ${user.name}.${note && note.trim() ? ` Note: ${note.trim()}` : ''}`
        : isRejected
          ? `Your request "${reqItem.title}" was REJECTED by ${user.name}.${note && note.trim() ? ` Reason: ${note.trim()}` : ''}`
          : `Your request "${reqItem.title}" has been moved to In Progress by ${user.name}.`;

      const staffTitle = isApproved
        ? `Approved: ${reqItem.ticketNumber}`
        : isRejected
          ? `Rejected: ${reqItem.ticketNumber}`
          : `Status Update: ${reqItem.ticketNumber}`;

      const staffMsg = isApproved
        ? `${user.name} (${user.role.toUpperCase()}) approved request "${reqItem.title}" submitted by ${reqItem.clientName}.`
        : isRejected
          ? `${user.name} (${user.role.toUpperCase()}) rejected request "${reqItem.title}" for ${reqItem.clientName}.${note && note.trim() ? ` Reason: ${note.trim()}` : ''}`
          : `${user.name} updated ${reqItem.ticketNumber} to ${newStatus.toUpperCase().replace('_', ' ')}.`;

      // 1. Dispatch directly to the requesting client
      dispatchNotification(
        reqItem.clientId,
        clientTitle,
        clientMsg,
        'request_update',
        isApproved ? 'success' : isRejected ? 'error' : 'info',
        reqItem.id
      );

      // 2. Notify the assigned operator (Maker) — only if they are not the one performing this action
      if (reqItem.assignedOperatorId && reqItem.assignedOperatorId !== user.id) {
        dispatchNotification(
          reqItem.assignedOperatorId,
          staffTitle,
          staffMsg,
          'request_update',
          isApproved ? 'success' : isRejected ? 'error' : 'info',
          reqItem.id
        );
      }

      // 3. Notify the assigned authorizer — only if different from actor and operator
      if (
        (reqItem as any).assignedAuthorizerId &&
        (reqItem as any).assignedAuthorizerId !== user.id &&
        (reqItem as any).assignedAuthorizerId !== reqItem.assignedOperatorId
      ) {
        dispatchNotification(
          (reqItem as any).assignedAuthorizerId,
          staffTitle,
          staffMsg,
          'request_update',
          isApproved ? 'success' : isRejected ? 'error' : 'info',
          reqItem.id
        );
      }

      if (newStatus === 'completed') {
        try {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 },
          });
        } catch {
          // ignore if canvas unavailable
        }
      }

      // Only show success toast if persistence succeeded
      if (persisted) {
        toast(`Request status updated to ${newStatus.replace('_', ' ')}`, 'success');
      } else {
        toast('Change saved locally — DB sync pending.', 'warning');
      }
    }
  };

  // Update Withdrawal CMA Step (Configure, Make, Authorize)
  // Strictly enforces sequence: Configure -> Make -> Authorize (steps cannot be skipped)
  // Authorizer is designated once configured & made; only assigned authorizer can authorize.
  // Authorizer also retains permission to configure and make if needed.
  const updateWithdrawalCmaStep = async (
    requestId: string,
    step: 'configure' | 'make' | 'authorize',
    checked: boolean,
    authorizedAmount?: number
  ) => {
    const now = new Date().toISOString();
    let targetReq: ServiceRequest | undefined;

    const stepLabelMap: Record<string, string> = {
      configure: 'Configure (C)',
      make: 'Make (M)',
      authorize: 'Authorize (A)',
    };

    const target = requests.find(r => r.id === requestId && r.type === 'withdraw') as HoldingWithdrawRequest | undefined;
    if (!target) return;

    const currentCma = target.cmaStatus || {};

    // 1. Strict sequence validation when checking steps:
    if (checked) {
      if (step === 'make') {
        if (!currentCma.configure) {
          toast('Sequence Violation: You must complete Configure (C) before Make (M)', 'error');
          return;
        }
      } else if (step === 'authorize') {
        if (!currentCma.configure || !currentCma.make) {
          toast('Sequence Violation: Both Configure (C) and Make (M) must be completed before Authorize (A)', 'error');
          return;
        }

        // Only the assigned authorizer (or admin) can authorize
        const isAuthorizedStaff = target.assignedAuthorizerId
          ? target.assignedAuthorizerId === user.id || user.role === 'admin'
          : user.role === 'admin';

        if (!isAuthorizedStaff) {
          toast(
            `Authorization Restricted: Only designated authorizer (${target.assignedAuthorizerName || 'Assigned Authorizer'}) can authorize this request`,
            'error'
          );
          return;
        }
      }
    }

    const updated = requests.map(req => {
      if (req.id !== requestId || req.type !== 'withdraw') return req;

      const withdrawReq = req as HoldingWithdrawRequest;
      const cur = withdrawReq.cmaStatus || {};
      const newCma: CmaStatus = {
        ...cur,
        [step]: checked,
        [`${step}At`]: checked ? now : undefined,
        [`${step}By`]: checked ? user.name : undefined,
        [`${step}ById`]: checked ? user.id : undefined,
      };

      // Cascade resets if a prior step is unchecked:
      if (!checked) {
        if (step === 'configure') {
          newCma.make = false;
          newCma.madeAt = undefined;
          newCma.madeBy = undefined;
          newCma.madeById = undefined;
          newCma.authorize = false;
          newCma.authorizedAt = undefined;
          newCma.authorizedBy = undefined;
          newCma.authorizedById = undefined;
          newCma.authorizedAmount = undefined;
        } else if (step === 'make') {
          newCma.authorize = false;
          newCma.authorizedAt = undefined;
          newCma.authorizedBy = undefined;
          newCma.authorizedById = undefined;
        }
      }

      // Capture authorized amount at Configure or Authorize
      let finalAuthorizedAmount = withdrawReq.authorizedAmount;
      if (step === 'configure') {
        if (checked) {
          finalAuthorizedAmount = authorizedAmount !== undefined ? authorizedAmount : (cur.authorizedAmount || withdrawReq.amount);
          newCma.authorizedAmount = finalAuthorizedAmount;
        } else {
          finalAuthorizedAmount = undefined;
          newCma.authorizedAmount = undefined;
        }
      }

      // Determine new status based on CMA:
      let newStatus: RequestStatus = req.status;
      let resolvedAt = req.resolvedAt;

      if (step === 'authorize' && checked) {
        newStatus = 'completed';
        resolvedAt = now;
      } else if (checked) {
        if (req.status === 'pending') {
          newStatus = 'in_progress';
        }
      } else {
        if (req.status === 'completed') {
          newStatus = 'in_progress';
          resolvedAt = undefined;
        }
      }

      const commentContent = step === 'authorize' && checked
        ? `[CMA Checkpoint] Authorize (A) signed off with Authorized Amount: ${withdrawReq.currency} ${finalAuthorizedAmount?.toLocaleString()} by ${user.name} (${user.role.toUpperCase()}) - Request Completed`
        : `[CMA Checkpoint] ${stepLabelMap[step]} marked as ${checked ? 'COMPLETED' : 'PENDING'} by ${user.name} (${user.role.toUpperCase()})`;

      const commentObj = {
        id: `cm_${Date.now()}`,
        authorId: user.id,
        authorName: user.name,
        authorRole: user.role,
        authorAvatar: user.avatarUrl,
        content: commentContent,
        isInternal: true,
        createdAt: now,
      };

      const updatedReq: HoldingWithdrawRequest = {
        ...withdrawReq,
        cmaStatus: newCma,
        authorizedAmount: finalAuthorizedAmount,
        status: newStatus,
        updatedAt: now,
        resolvedAt: resolvedAt,
        comments: [...withdrawReq.comments, commentObj],
      };

      targetReq = updatedReq;
      return updatedReq;
    });

    setRequests(updated);
    saveRequests(updated);

    if (targetReq) {
      setActiveRequest(targetReq);
      await persistRequest(targetReq);

      recordAudit(
        'UPDATED_WITHDRAWAL_CMA',
        'request',
        requestId,
        `Updated CMA step ${stepLabelMap[step]} to ${checked ? 'COMPLETED' : 'PENDING'} on ${(targetReq as ServiceRequest).ticketNumber}`
      );

      dispatchNotification(
        (targetReq as ServiceRequest).clientId,
        `Withdrawal ${(targetReq as ServiceRequest).ticketNumber} Update`,
        targetReq.status === 'completed'
          ? `Your withdrawal ${(targetReq as ServiceRequest).ticketNumber} has been Authorized and Completed!`
          : `Checkpoint ${stepLabelMap[step]} has been ${checked ? 'completed' : 'reset'} for your withdrawal.`,
        'request_update',
        targetReq.status === 'completed' ? 'success' : 'info',
        targetReq.id
      );

      if (targetReq.status === 'completed') {
        try {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 },
          });
        } catch {
          // ignore
        }
      }
    }

    toast(`${stepLabelMap[step]} ${checked ? 'completed' : 'reset'} successfully`, 'success');
  };

  // Assign Operator
  const assignOperator = async (requestId: string, operatorId: string) => {
    const operator = allUsers.find(u => u.id === operatorId);
    if (!operator) return;

    const now = new Date().toISOString();
    let targetReq: ServiceRequest | undefined;

    const updated = requests.map(req => {
      if (req.id !== requestId) return req;
      const updatedReq = {
        ...req,
        assignedOperatorId: operator.id,
        assignedOperatorName: operator.name,
        updatedAt: now,
        status: req.status === 'pending' ? ('in_progress' as RequestStatus) : req.status,
      };
      targetReq = updatedReq;
      return updatedReq;
    });

    setRequests(updated);
    saveRequests(updated);

    if (targetReq) {
      await persistRequest(targetReq);

      recordAudit(
        'ASSIGNED_OPERATOR',
        'request',
        requestId,
        `Assigned operator ${operator.name} to ${(targetReq as ServiceRequest).ticketNumber}`
      );

      dispatchNotification(
        operator.id,
        `Assigned to ${(targetReq as ServiceRequest).ticketNumber}`,
        `You were assigned to "${(targetReq as ServiceRequest).title}" submitted by ${(targetReq as ServiceRequest).clientName}.`,
        'assignment',
        'info',
        (targetReq as ServiceRequest).id
      );

      // Notify the client that an operator has been assigned to their request
      if ((targetReq as ServiceRequest).clientId) {
        dispatchNotification(
          (targetReq as ServiceRequest).clientId,
          `Handler Assigned: ${(targetReq as ServiceRequest).ticketNumber}`,
          `${operator.name} has been assigned to handle your request "${(targetReq as ServiceRequest).title}".`,
          'assignment',
          'info',
          (targetReq as ServiceRequest).id
        );
      }
    }

    toast(`Assigned ${operator.name} to ticket`, 'success');
  };

  // Assign Authorizer (Checker for Limit Requests)
  const assignAuthorizer = async (requestId: string, authorizerId: string) => {
    const authorizer = allUsers.find(u => u.id === authorizerId);
    if (!authorizer) return;

    const now = new Date().toISOString();
    let targetReq: ServiceRequest | undefined;

    const updated = requests.map(req => {
      if (req.id !== requestId) return req;
      const updatedReq = {
        ...req,
        assignedAuthorizerId: authorizer.id,
        assignedAuthorizerName: authorizer.name,
        updatedAt: now,
      };
      targetReq = updatedReq;
      return updatedReq;
    });

    setRequests(updated);
    saveRequests(updated);

    if (targetReq) {
      if (activeRequest?.id === requestId) {
        setActiveRequest(targetReq);
      }
      await persistRequest(targetReq);

      recordAudit(
        'ASSIGNED_AUTHORIZER',
        'request',
        requestId,
        `Assigned authorizer ${authorizer.name} (${authorizer.role.toUpperCase()}) to ${(targetReq as ServiceRequest).ticketNumber}`
      );

      dispatchNotification(
        authorizer.id,
        `Authorizer Assignment: ${(targetReq as ServiceRequest).ticketNumber}`,
        `You have been assigned as Authorizer for ${(targetReq as ServiceRequest).ticketNumber} (${(targetReq as ServiceRequest).title}).`,
        'assignment',
        'info',
        (targetReq as ServiceRequest).id
      );

      // Notify the client that an authorizer was assigned
      if ((targetReq as ServiceRequest).clientId) {
        dispatchNotification(
          (targetReq as ServiceRequest).clientId,
          `Authorizer Assigned: ${(targetReq as ServiceRequest).ticketNumber}`,
          `${authorizer.name} has been assigned as Authorizer for your request "${(targetReq as ServiceRequest).title}".`,
          'assignment',
          'info',
          (targetReq as ServiceRequest).id
        );
      }
    }

    toast(`Assigned ${authorizer.name} as Authorizer`, 'success');
  };

  // Structured Request Rejection with message to client
  const rejectRequest = async (requestId: string, reason: string) => {
    const now = new Date().toISOString();
    let targetReq: ServiceRequest | undefined;

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      toast('Please provide a message explaining the rejection reason', 'error');
      return;
    }

    const updated = requests.map(req => {
      if (req.id !== requestId) return req;

      const rejectionComment = {
        id: `cm_${Date.now()}`,
        authorId: user.id,
        authorName: user.name,
        authorRole: user.role,
        authorAvatar: user.avatarUrl,
        content: `[Request Rejected] ${trimmedReason}`,
        isInternal: false, // Visible to client
        createdAt: now,
      };

      const updatedReq: ServiceRequest = {
        ...req,
        status: 'rejected' as RequestStatus,
        rejectionReason: trimmedReason,
        resolvedAt: now,
        updatedAt: now,
        comments: [...req.comments, rejectionComment],
      };
      targetReq = updatedReq;
      return updatedReq;
    });

    setRequests(updated);
    saveRequests(updated);

    if (targetReq) {
      setActiveRequest(targetReq);
      await persistRequest(targetReq);

      recordAudit(
        'REJECTED_REQUEST',
        'request',
        requestId,
        `Rejected ${(targetReq as ServiceRequest).ticketNumber}. Reason: ${trimmedReason}`
      );

      dispatchNotification(
        (targetReq as ServiceRequest).clientId,
        `Request Rejected: ${(targetReq as ServiceRequest).ticketNumber}`,
        `Your request was rejected by ${user.name}: "${trimmedReason}"`,
        'request_update',
        'error',
        (targetReq as ServiceRequest).id
      );
    }

    toast(`Request ${(targetReq as ServiceRequest)?.ticketNumber || ''} marked as Rejected`, 'info');
  };

  // Add Comment / Message
  const addComment = async (
    requestId: string,
    content: string,
    isInternal: boolean,
    attachments?: { name: string; size: number; type: string; url: string }[]
  ) => {
    const now = new Date().toISOString();
    let targetReq: ServiceRequest | undefined;

    const newComment = {
      id: `cm_${Date.now()}`,
      authorId: user.id,
      authorName: user.name,
      authorRole: user.role,
      authorAvatar: user.avatarUrl,
      content,
      isInternal,
      createdAt: now,
      attachments: (attachments || []).map((att, i) => ({
        id: `att_c_${Date.now()}_${i}`,
        name: att.name,
        size: att.size,
        type: att.type,
        url: att.url,
        uploadedAt: now,
        uploadedBy: user.name,
      })),
    };

    const updated = requests.map(req => {
      if (req.id !== requestId) return req;
      const updatedReq = {
        ...req,
        updatedAt: now,
        comments: [...req.comments, newComment],
      };
      targetReq = updatedReq;
      return updatedReq;
    });

    setRequests(updated);
    saveRequests(updated);

    if (targetReq) {
      setActiveRequest(targetReq);

      await persistRequest(targetReq);

      recordAudit(
        isInternal ? 'ADDED_INTERNAL_NOTE' : 'POSTED_COMMENT',
        'request',
        requestId,
        `${isInternal ? 'Internal Note' : 'Public Reply'} added to ${(targetReq as ServiceRequest).ticketNumber}`
      );

      // If client commented, notify assigned operator or admins
      if (user.role === 'client') {
        const notifyTarget = (targetReq as ServiceRequest).assignedOperatorId || 'usr_admin_1';
        dispatchNotification(
          notifyTarget,
          `New reply on ${(targetReq as ServiceRequest).ticketNumber}`,
          `${user.name}: "${content.substring(0, 70)}..."`,
          'request_update',
          'info',
          (targetReq as ServiceRequest).id
        );
      } else if (!isInternal) {
        // If staff commented publicly, notify client
        dispatchNotification(
          (targetReq as ServiceRequest).clientId,
          `Update on ${(targetReq as ServiceRequest).ticketNumber}`,
          `${user.name} (${user.role.toUpperCase()}): "${content.substring(0, 70)}..."`,
          'request_update',
          'info',
          (targetReq as ServiceRequest).id
        );
      }
    }

    toast(isInternal ? 'Internal staff note saved.' : 'Message posted.', 'success');
  };

  // Delete Request (Admin Permanent Deletion)
  const deleteRequest = (requestId: string) => {
    const target = requests.find(r => r.id === requestId);
    const updated = requests.filter(r => r.id !== requestId);
    setRequests(updated);
    saveRequests(updated);
    if (activeRequest?.id === requestId) setActiveRequest(null);

    // Delete in Supabase
    deleteRequestFromSupabase(requestId)
      .then(() => extendSession())
      .catch(() => { });

    if (target) {
      recordAudit('DELETED_REQUEST', 'request', requestId, `Deleted request ${target.ticketNumber}`);
    }
    toast('Request permanently removed.', 'info');
  };

  // Request Deletion (Submits request for admin approval)
  const requestDeletion = async (requestId: string, reason: string) => {
    const now = new Date().toISOString();
    let targetReq: ServiceRequest | undefined;

    const updated = requests.map(req => {
      if (req.id !== requestId) return req;
      const updatedReq: ServiceRequest = {
        ...req,
        deleteRequested: true,
        deleteRequestedBy: user.name,
        deleteRequestedById: user.id,
        deleteRequestedReason: reason.trim(),
        deleteRequestedAt: now,
        updatedAt: now,
      };

      const commentObj = {
        id: `cm_${Date.now()}`,
        authorId: user.id,
        authorName: user.name,
        authorRole: user.role,
        authorAvatar: user.avatarUrl,
        content: `[DELETION REQUESTED] ${user.name} (${user.role.toUpperCase()}) requested deletion of this request. Reason: "${reason.trim()}" — Awaiting Administrator Approval.`,
        isInternal: true,
        createdAt: now,
      };
      updatedReq.comments = [...updatedReq.comments, commentObj];

      targetReq = updatedReq;
      return updatedReq;
    });

    setRequests(updated);
    saveRequests(updated);

    if (targetReq) {
      setActiveRequest(targetReq);
      await persistRequest(targetReq);
      recordAudit(
        'REQUESTED_REQUEST_DELETION',
        'request',
        requestId,
        `Requested deletion of ${(targetReq as ServiceRequest).ticketNumber}. Reason: ${reason.trim()}`
      );

      // Notify all admins
      allUsers
        .filter(u => u.role === 'admin')
        .forEach(admin => {
          dispatchNotification(
            admin.id,
            `Deletion Approval Needed: ${(targetReq as ServiceRequest).ticketNumber}`,
            `${user.name} requested deletion of ${(targetReq as ServiceRequest).ticketNumber}. Reason: ${reason.trim()}`,
            'system',
            'warning',
            requestId
          );
        });
    }

    toast('Deletion request submitted. Awaiting administrator approval.', 'info');
  };

  // Approve Deletion (Admin approves deletion request)
  const approveDeletion = (requestId: string) => {
    const target = requests.find(r => r.id === requestId);
    deleteRequest(requestId);
    if (target && target.deleteRequestedById) {
      dispatchNotification(
        target.deleteRequestedById,
        `Deletion Approved: ${target.ticketNumber}`,
        `Administrator ${user.name} approved the deletion of ${target.ticketNumber}.`,
        'request_update',
        'warning'
      );
    }
  };

  // Reject Deletion (Admin rejects deletion request)
  const rejectDeletion = async (requestId: string) => {
    const now = new Date().toISOString();
    const originalReq = requests.find(r => r.id === requestId);
    const requesterId = originalReq?.deleteRequestedById || (originalReq as any)?.delete_requested_by_id;
    let targetReq: ServiceRequest | undefined;

    const updated = requests.map(req => {
      if (req.id !== requestId) return req;
      const updatedReq: ServiceRequest = {
        ...req,
        deleteRequested: false,
        deleteRequestedBy: undefined,
        deleteRequestedById: undefined,
        deleteRequestedReason: undefined,
        deleteRequestedAt: undefined,
        updatedAt: now,
      };

      const commentObj = {
        id: `cm_${Date.now()}`,
        authorId: user.id,
        authorName: user.name,
        authorRole: user.role,
        authorAvatar: user.avatarUrl,
        content: `[DELETION REJECTED] Administrator ${user.name} reviewed and REJECTED the deletion request. Request remains active.`,
        isInternal: true,
        createdAt: now,
      };
      updatedReq.comments = [...updatedReq.comments, commentObj];

      targetReq = updatedReq;
      return updatedReq;
    });

    setRequests(updated);
    saveRequests(updated);

    if (targetReq) {
      setActiveRequest(targetReq);
      await persistRequest(targetReq);
      recordAudit(
        'REJECTED_REQUEST_DELETION',
        'request',
        requestId,
        `Admin ${user.name} rejected deletion request for ${(targetReq as ServiceRequest).ticketNumber}`
      );

      if (requesterId) {
        dispatchNotification(
          requesterId,
          `Deletion Request Rejected: ${(targetReq as ServiceRequest).ticketNumber}`,
          `Administrator ${user.name} reviewed and rejected the deletion request for ${(targetReq as ServiceRequest).ticketNumber}.`,
          'request_update',
          'info',
          requestId
        );
      }
    }

    toast('Deletion request rejected. Request remains active.', 'info');
  };

  // RBAC Matrix Updates
  const updateRolePermission = async (role: UserRole, updates: Partial<RolePermissions>) => {
    const updatedRolePerm = { ...permissions[role], ...updates };
    const updated = {
      ...permissions,
      [role]: updatedRolePerm,
    };

    // 1. Apply optimistic local update immediately so the UI reflects the change
    setPermissions(updated);
    savePermissions(updated);

    // 2. Persist to Supabase csmp_role_permissions table
    try {
      await savePermissionsToSupabase(role, updatedRolePerm);
      toast(`Permissions for ${role.toUpperCase()} saved to database.`, 'success');
    } catch (err: any) {
      console.warn('[RBAC] Supabase database sync warning:', err?.message || err);
      const isRls = err?.code === '42501' || err?.message?.includes('violates row-level security');
      if (isRls) {
        toast(`Supabase RLS: Run the policy SQL in Supabase SQL Editor to allow database writes.`, 'warning');
      } else {
        toast(`Database write notice: ${err?.message || 'Offline mode active'}`, 'warning');
      }
    }

    // 3. Broadcast to other tabs on the same device via BroadcastChannel
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('csmp_live_sync');
        bc.postMessage({ type: 'RBAC_UPDATED', payload: { role, perms: updatedRolePerm } });
        bc.close();
      } catch { /* not supported */ }
    }

    recordAudit('MODIFIED_RBAC_PERMISSIONS', 'rbac', role, `Updated capabilities for role [${role.toUpperCase()}]`);
  };

  const togglePageForRole = (role: UserRole, pageId: PageId) => {
    const currentAllowed = permissions[role].allowedPages;
    const isPresent = currentAllowed.includes(pageId);
    const newPages = isPresent
      ? currentAllowed.filter(p => p !== pageId)
      : [...currentAllowed, pageId];

    updateRolePermission(role, { allowedPages: newPages });
  };

  // Notifications helpers
  const userNotifications = notifications.filter(n => {
    if (!user) return false;
    if (n.userId === user.id) return true;
    if (n.userId === 'all') return true;
    if (user.role === 'admin') return true; // Administrators see all system & broadcast notifications
    if (n.userId === 'all_staff') return user.role !== 'client';
    if (n.userId === 'all_operators') return user.role === 'operator';
    return false;
  });

  const unreadNotifCount = userNotifications.filter(n => !n.isRead).length;

  const markNotificationAsRead = (id: string) => {
    const updated = notifications.map(n => (n.id === id ? { ...n, isRead: true } : n));
    setNotifications(updated);
    saveNotifications(updated);

    markNotificationReadInSupabase(id)
      .then(() => extendSession())
      .catch(() => { });
  };

  const markAllNotificationsAsRead = () => {
    const userNotifIds = new Set(userNotifications.map(n => n.id));
    const updated = notifications.map(n =>
      userNotifIds.has(n.id) ? { ...n, isRead: true } : n
    );
    setNotifications(updated);
    saveNotifications(updated);

    if (user) {
      markAllNotificationsReadInSupabase(user.id)
        .then(() => extendSession())
        .catch(() => { });
    }
    toast('All notifications marked as read', 'info');
  };

  const clearNotification = (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    setNotifications(updated);
    saveNotifications(updated);
  };

  // ── Global Broadcast Notices ──────────────────────────────────────────────

  const broadcastGlobalNotice = (data: {
    title: string;
    message: string;
    type: NotificationType;
    expiresAt?: string;
  }) => {
    const notice: GlobalNotice = {
      id: `gnotice_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: data.title,
      message: data.message,
      type: data.type,
      createdAt: new Date().toISOString(),
      createdByName: user.name,
      expiresAt: data.expiresAt,
      isActive: true,
    };
    setGlobalNotices(prev => {
      const updated = [notice, ...prev];
      saveGlobalNotices(updated);
      return updated;
    });

    // Also dispatch as a system notification so it appears in the notification log
    dispatchNotification(
      'all',
      `📢 ${notice.title}`,
      notice.message,
      'global_notice',
      notice.type,
    );

    toast(`Global notice broadcast to all users`, 'success');
  };

  const deactivateGlobalNotice = (id: string) => {
    setGlobalNotices(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, isActive: false } : n);
      saveGlobalNotices(updated);
      return updated;
    });
  };

  const deleteGlobalNotice = (id: string) => {
    setGlobalNotices(prev => {
      const updated = prev.filter(n => n.id !== id);
      saveGlobalNotices(updated);
      return updated;
    });
  };

  // Derive the single most-recent active, non-expired global notice for the dashboard banner
  const now = new Date();
  const activeGlobalNotice: GlobalNotice | null = globalNotices.find(n => {
    if (!n.isActive) return false;
    if (n.expiresAt && new Date(n.expiresAt) < now) return false;
    return true;
  }) ?? null;

  // Filtered requests computation
  const filteredRequests = requests.filter(req => {
    // Role filter: clients only see their own requests
    if (user && user.role === 'client' && req.clientId !== user.id) {
      return false;
    }

    // Search query
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase();
      const matchTitle = req.title.toLowerCase().includes(q);
      const matchTicket = req.ticketNumber.toLowerCase().includes(q);
      const matchClient = req.clientName.toLowerCase().includes(q);
      const matchDesc = req.description.toLowerCase().includes(q);
      const matchCompany = req.clientCompany?.toLowerCase().includes(q);
      if (!matchTitle && !matchTicket && !matchClient && !matchDesc && !matchCompany) {
        return false;
      }
    }

    // Type filter
    if (filters.typeFilter !== 'all' && req.type !== filters.typeFilter) {
      return false;
    }

    // Status filter
    if (filters.statusFilter !== 'all') {
      if (filters.statusFilter === 'pending_deletion') {
        if (!req.deleteRequested) return false;
      } else if (req.status !== filters.statusFilter) {
        return false;
      }
    }

    // Priority filter
    if (filters.priorityFilter !== 'all' && req.priority !== filters.priorityFilter) {
      return false;
    }

    // Operator filter
    if (filters.operatorFilter !== 'all') {
      if (filters.operatorFilter === 'unassigned') {
        if (req.assignedOperatorId) return false;
      } else if (req.assignedOperatorId !== filters.operatorFilter) {
        return false;
      }
    }

    // Date range
    if (filters.dateRange !== 'all') {
      const created = new Date(req.createdAt).getTime();
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      if (filters.dateRange === 'today' && now - created > oneDay) return false;
      if (filters.dateRange === '7d' && now - created > 7 * oneDay) return false;
      if (filters.dateRange === '30d' && now - created > 30 * oneDay) return false;
      if (filters.dateRange === '90d' && now - created > 90 * oneDay) return false;
    }

    return true;
  });

  const resetFilters = () => setFilters(initialFilters);

  const triggerExportCSV = () => {
    const roleStr = user?.role || 'user';
    exportRequestsToCSV(filteredRequests, `requests_${roleStr}_${new Date().toISOString().split('T')[0]}.csv`);
    toast(`Exported ${filteredRequests.length} requests to CSV.`, 'success');
  };

  const resetAllDemoData = () => {
    resetToDemoData();
    // After clearing storage, reset in-memory state to safe empty defaults.
    // DB sync will re-populate when the user next triggers a manual sync.
    setRequests([]);
    setPermissions(DEFAULT_PERMISSIONS);
    setNotifications([]);
    setGlobalNotices([]);
    setAuditLogs([]);
    toast('Platform reset to original demo seed dataset.', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        currentView,
        setCurrentView,
        goToDashboard,
        goToHome,
        goToAuth,
        currentPage,
        setCurrentPage,
        allowedPages,
        isPageAllowed,
        requests,
        filteredRequests,
        activeRequest,
        setActiveRequest,
        isCreateModalOpen,
        setIsCreateModalOpen,
        initialCreateType,
        openCreateModal,
        createSupportTicket,
        createHoldingDeposit,
        createHoldingWithdraw,
        updateRequestStatus,
        updateWithdrawalCmaStep,
        assignOperator,
        assignAuthorizer,
        rejectRequest,
        addComment,
        deleteRequest,
        requestDeletion,
        approveDeletion,
        rejectDeletion,
        permissions,
        updateRolePermission,
        togglePageForRole,
        notifications,
        userNotifications,
        unreadNotifCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        clearNotification,
        globalNotices,
        activeGlobalNotice,
        broadcastGlobalNotice,
        deactivateGlobalNotice,
        deleteGlobalNotice,
        auditLogs,
        filters,
        setFilters,
        resetFilters,
        isDarkMode,
        toggleTheme,
        themeConfig,
        setThemeConfig,
        updateThemeConfig,
        resetThemeConfig,
        isThemeModalOpen,
        setIsThemeModalOpen,
        openThemeModal,
        closeThemeModal,
        isBrandingModalOpen,
        openBrandingModal,
        closeBrandingModal,
        isMobileSidebarOpen,
        setIsMobileSidebarOpen,
        toggleMobileSidebar,
        closeMobileSidebar,
        isSupabaseConnected,
        syncWithSupabase,
        assignmentConfig,
        updateAssignmentConfig,
        triggerExportCSV,
        resetAllDemoData,
        toast,
        toastMessage,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
