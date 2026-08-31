import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { formatDateIST } from '../../lib/dateUtils';
import {
  Clock,
  RefreshCw,
  LogOut,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  Mail,
  Building,
  ExternalLink,
  Sun,
  Moon
} from 'lucide-react';
import { motion } from 'motion/react';

export const PendingApprovalScreen: React.FC = () => {
  const { user, signOut, syncUsers } = useAuth();
  const { isDarkMode, toggleTheme, toast } = useApp();
  const [isChecking, setIsChecking] = useState(false);

  const handleRefreshStatus = async () => {
    setIsChecking(true);
    try {
      if (user) {
        const users = await syncUsers();
        const updatedUser = users.find(u => u.id === user.id || u.email === user.email);
        if (updatedUser?.status === 'active') {
          toast('Your account has been approved! Redirecting...', 'success');
          window.location.reload();
        } else {
          toast('Account is still awaiting administrator approval.', 'info');
        }
      }
    } finally {
      setTimeout(() => setIsChecking(false), 600);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between font-sans relative overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      {/* Glow Accents */}
      <div className="absolute top-0 left-1/3 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="px-6 lg:px-12 py-5 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-white block">
              ServiceCore
            </span>
            <span className="text-[11px] text-indigo-400 font-medium">
              Client Service & Financial Operations
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={signOut}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-rose-400 flex items-center gap-2 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Card */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-12 flex items-center justify-center relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 text-center"
        >
          {/* Animated Icon */}
          <div className="w-16 h-16 rounded-3xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Registration Status: Pending Approval</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Awaiting Administrator Approval
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              Hello <span className="font-semibold text-white">{user?.name || 'User'}</span>, your account has been registered successfully and is in the verification queue.
            </p>
          </div>

          {/* Details Box */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-left space-y-2.5 text-xs">
            <div className="flex justify-between items-center text-slate-400">
              <span>Account Email:</span>
              <span className="font-semibold text-slate-200">{user?.email}</span>
            </div>
            {user?.companyName && (
              <div className="flex justify-between items-center text-slate-400">
                <span>Company:</span>
                <span className="font-semibold text-slate-200">{user.companyName}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-slate-400">
              <span>Submitted On:</span>
              <span className="text-slate-300">
                {user?.createdAt ? formatDateIST(user.createdAt) : 'Just now'}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400">
              <span>Required Action:</span>
              <span className="text-amber-400 font-semibold">Administrator Verification</span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <button
              onClick={handleRefreshStatus}
              disabled={isChecking}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Checking Status...' : 'Check Approval Status'}</span>
            </button>

            <button
              onClick={signOut}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-slate-700"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out / Switch Account</span>
            </button>
          </div>

          {/* Info Notice */}
          <p className="text-[11px] text-slate-400 leading-relaxed pt-2">
            Platform administrators review new account registrations to assign proper role permissions. Once approved, refreshing your status will grant immediate access to your dashboard.
          </p>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-slate-800 text-center text-xs text-slate-400 relative z-10">
        <span>ServiceCore Enterprise Client Platform • Enterprise Security Governance</span>
      </footer>
    </div>
  );
};
