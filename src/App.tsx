import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { SessionTimerProvider, useSessionTimer } from './context/SessionContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { Toast } from './components/common/Toast';
import { CreateRequestModal } from './components/requests/CreateRequestModal';
import { RequestDetailModal } from './components/requests/RequestDetailModal';
import { AuthScreen } from './components/auth/AuthScreen';
import { PendingApprovalScreen } from './components/auth/PendingApprovalScreen';
import { EditProfileModal } from './components/profile/EditProfileModal';
import { ThemeCustomizationModal } from './components/settings/ThemeCustomizationModal';
import { HomePage } from './components/home/HomePage';
import { InvalidSessionModal } from './components/auth/InvalidSessionModal';
import { SessionExpiryModal } from './components/auth/SessionExpiryModal';
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
      case 'clients':
        return <ClientDirectory />;
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
      <SessionExpiryModal />
      <Toast />
    </div>
  );
};

const AppAuthGate: React.FC = () => {
  const { isAuthenticated, user, isInitialLoading } = useAuth();

  // During initial loading (Supabase session restore from cookies), keep the
  // loading screen visible — never flash the auth modal or AuthScreen in between.
  if (isInitialLoading) {
    return <LoadingScreen label="Restoring session…" />;
  }

  // If not signed in, gate the dashboard behind the invalid-session modal.
  // The modal "pops" with "Sign In Again" (→ /auth) and "Go Home" (→ /) actions
  // rather than dropping the user onto a full login screen unexpectedly.
  if (!isAuthenticated || !user) {
    return (
      <>
        <InvalidSessionModal />
        <Toast />
      </>
    );
  }

  // If user account is pending approval and user is not an administrator, show holding screen
  if (user.status === 'pending' && user.role !== 'admin') {
    return (
      <>
        <PendingApprovalScreen />
        <Toast />
      </>
    );
  }

  return <MainLayout />;
};

const AppContent: React.FC = () => {
  const location = useLocation();
  const pathname = location.pathname.replace(/^\/+/, '').toLowerCase();

  // Home (public) page
  if (pathname === '' || pathname === 'home') {
    return (
      <>
        <HomePage />
        <Toast />
      </>
    );
  }

  // Auth screen
  if (pathname === 'auth' || pathname === 'login' || pathname === 'signin' || pathname === 'signup') {
    return (
      <>
        <AuthScreen />
        <Toast />
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
          <Route path="/clients" element={<AppContent />} />
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
