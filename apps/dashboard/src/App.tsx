import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { SessionTimerProvider } from './context/SessionContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { Toast } from './components/common/Toast';
import { CreateRequestModal } from './components/requests/CreateRequestModal';
import { RequestDetailModal } from './components/requests/RequestDetailModal';
import { EditProfileModal } from './components/profile/EditProfileModal';
import { ThemeCustomizationModal } from './components/settings/ThemeCustomizationModal';
import { BrandingModal } from './components/settings/BrandingModal';
import { PageTransition } from './components/common/PageTransition';
import { LoadingScreen } from './components/common/LoadingScreen';

import { AnimatePresence } from 'motion/react';

// Pages
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { SupportTicketsView } from './components/requests/SupportTicketsView';
import { HoldingRequestsView } from './components/requests/HoldingRequestsView';
import { RequestList } from './components/requests/RequestList';
import { ClientDirectory } from './components/crm/ClientDirectory';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { RolePermissionMatrix } from './components/rbac/RolePermissionMatrix';
import { AuditLogsView } from './components/audit/AuditLogsView';
import { NotificationLogsView } from './components/notifications/NotificationLogsView';
import { SettingsView } from './components/settings/SettingsView';
import { AssignmentManagementView } from './components/assignments/AssignmentManagementView';
import { CommissionView } from './components/commission/CommissionView';
import { TransactionTypeManagement } from './components/commission/TransactionTypeManagement';

import { ShieldAlert, ArrowLeft } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { currentPage, setCurrentPage, permissions, isPageAllowed } = useApp();
  const { user } = useAuth();

  const userRole = user?.role || 'client';

  // Check if current user has RBAC access to this page
  const hasAccess = isPageAllowed(currentPage);

  const renderPage = () => {
    if (!hasAccess) {
      return (
        <div className="p-8 sm:p-12 text-center max-w-lg mx-auto my-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Access Restricted
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            Your current persona (<span className="font-semibold text-slate-700 dark:text-slate-200 capitalize">{userRole}</span>) does not have permission to view the <span className="font-semibold">{currentPage}</span> module.
          </p>
          <button
            onClick={() => setCurrentPage('dashboard')}
            className="mt-6 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 inline-flex items-center gap-2 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </button>
        </div>
      );
    }

    switch (currentPage) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'support':
        return <SupportTicketsView />;
      case 'holding':
        return <HoldingRequestsView />;
      case 'all-requests':
        return <RequestList />;
      case 'assignments':
        return <AssignmentManagementView />;
      case 'clients':
        return <ClientDirectory />;
      case 'commissions':
        return <CommissionView />;
      case 'transaction-types':
        return <TransactionTypeManagement />;
      case 'analytics':
        return <AnalyticsView />;
      case 'rbac':
        return <RolePermissionMatrix />;
      case 'audit-logs':
        return <AuditLogsView />;
      case 'notifications':
        return <NotificationLogsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />

        <main className="flex-1 overflow-y-auto relative">
          <AnimatePresence mode="wait">
            <PageTransition key={currentPage}>{renderPage()}</PageTransition>
          </AnimatePresence>
        </main>
      </div>

      {/* Global Modals */}
      <CreateRequestModal />
      <RequestDetailModal />
      <EditProfileModal />
      <ThemeCustomizationModal />
      <BrandingModal />
      <Toast />
    </div>
  );
};

const AppAuthGate: React.FC = () => {
  const { isAuthenticated, user, isInitialLoading } = useAuth();

  // During initial loading, keep the loading screen visible while the session restores.
  if (isInitialLoading) {
    return <LoadingScreen label="Restoring session…" />;
  }

  if (!isAuthenticated || !user) {
    const authBase = import.meta.env.VITE_AUTH_URL || 'https://auth.egraminservices.com';
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Sign in to continue</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Your dashboard session is not available. Sign in to access requests, users, and reports.
          </p>
          <a
            href={`${authBase}/login`}
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-500"
          >
            Sign in
          </a>
        </div>
      </div>
    );
  }

  return <MainLayout />;
};

const AppContent: React.FC = () => {
  const location = useLocation();
  const pathname = location.pathname.replace(/^\/+/, '').toLowerCase();

  if (pathname === '' || pathname === 'home') {
    return <AppAuthGate />;
  }

  // Auth screen — these routes now live on the authentication subdomain.
  // If a user lands here, redirect them to auth.egraminservices.com.
  if (pathname === 'auth' || pathname === 'login' || pathname === 'signin' || pathname === 'signup') {
    const authBase = import.meta.env.VITE_AUTH_URL || 'https://auth.egraminservices.com';
    const target = pathname === 'signup' || pathname === 'signin' ? 'signup' : 'login';
    window.location.replace(`${authBase}/${target}`);
    return (
      <>
        <LoadingScreen />
      </>
    );
  }

  // Everything else is the dashboard / app area (auth-gated)
  return <AppAuthGate />;
};

export default function App() {
  return (
    <AuthProvider>
      <SessionTimerProvider>
        <AppProvider>
          <Routes>
            <Route path="/" element={<AppContent />} />
            <Route path="/home" element={<AppContent />} />
            <Route path="/auth" element={<AppContent />} />
            <Route path="/login" element={<AppContent />} />
            <Route path="/signin" element={<AppContent />} />
            <Route path="/signup" element={<AppContent />} />
            <Route path="/dashboard" element={<AppContent />} />
            <Route path="/support" element={<AppContent />} />
            <Route path="/holding" element={<AppContent />} />
            <Route path="/all-requests" element={<AppContent />} />
            <Route path="/assignments" element={<AppContent />} />
            <Route path="/clients" element={<AppContent />} />
            <Route path="/commissions" element={<AppContent />} />
            <Route path="/transaction-types" element={<AppContent />} />
            <Route path="/analytics" element={<AppContent />} />
            <Route path="/rbac" element={<AppContent />} />
            <Route path="/audit-logs" element={<AppContent />} />
            <Route path="/notifications" element={<AppContent />} />
            <Route path="/settings" element={<AppContent />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppProvider>
      </SessionTimerProvider>
    </AuthProvider>
  );
}
