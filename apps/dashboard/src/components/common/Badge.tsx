import React from 'react';
import { RequestStatus, RequestPriority, RequestType, UserRole } from '../../types';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  HelpCircle,
  ArrowDownRight,
  ArrowUpRight,
  Shield,
  Headphones,
  User
} from 'lucide-react';

export const StatusBadge: React.FC<{ status: RequestStatus; className?: string }> = ({
  status,
  className = '',
}) => {
  switch (status) {
    case 'pending':
      return (
        <span
          id={`status-badge-${status}`}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/30 dark:border-amber-500/40 shadow-xs shadow-amber-500/5 ${className}`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-pulse" />
          Pending
        </span>
      );
    case 'in_progress':
      return (
        <span
          id={`status-badge-${status}`}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/35 dark:border-blue-500/45 shadow-xs shadow-blue-500/10 ${className}`}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600 dark:bg-blue-400"></span>
          </span>
          In Progress
        </span>
      );
    case 'completed':
      return (
        <span
          id={`status-badge-${status}`}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/35 dark:border-emerald-500/45 shadow-xs shadow-emerald-500/10 ${className}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          Completed
        </span>
      );
    case 'rejected':
      return (
        <span
          id={`status-badge-${status}`}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/35 dark:border-rose-500/45 shadow-xs shadow-rose-500/10 ${className}`}
        >
          <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
          Rejected
        </span>
      );
    default:
      return null;
  }
};

export const DeletionPendingBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <span
      id="deletion-pending-badge"
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-800 dark:text-rose-200 border border-rose-500/40 dark:border-rose-500/50 shadow-xs shadow-rose-500/20 ${className}`}
      title="Deletion requested, awaiting administrator approval"
    >
      <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 animate-pulse" />
      <span>Deletion Pending</span>
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: RequestPriority; className?: string }> = ({
  priority,
  className = '',
}) => {
  switch (priority) {
    case 'urgent':
      return (
        <span
          id={`priority-badge-${priority}`}
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-red-500/15 text-red-800 dark:text-red-200 border border-red-500/40 dark:border-red-500/50 shadow-xs shadow-red-500/10 ${className}`}
        >
          <AlertCircle className="w-3 h-3 text-red-600 dark:text-red-400 animate-pulse" />
          Urgent
        </span>
      );
    case 'high':
      return (
        <span
          id={`priority-badge-${priority}`}
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-orange-500/15 text-orange-800 dark:text-orange-200 border border-orange-500/35 dark:border-orange-500/45 ${className}`}
        >
          High
        </span>
      );
    case 'medium':
      return (
        <span
          id={`priority-badge-${priority}`}
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-medium uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 ${className}`}
        >
          Medium
        </span>
      );
    case 'low':
      return (
        <span
          id={`priority-badge-${priority}`}
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-medium uppercase tracking-wider bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800 ${className}`}
        >
          Low
        </span>
      );
  }
};

export const TypeBadge: React.FC<{ type: RequestType; className?: string }> = ({
  type,
  className = '',
}) => {
  switch (type) {
    case 'support':
      return (
        <span
          id={`type-badge-${type}`}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-sky-500/10 text-sky-800 dark:text-sky-300 border border-sky-500/30 dark:border-sky-500/40 ${className}`}
        >
          <HelpCircle className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          Support
        </span>
      );
    case 'deposit':
      return (
        <span
          id={`type-badge-${type}`}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 dark:border-emerald-500/40 ${className}`}
        >
          <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          Deposit
        </span>
      );
    case 'withdraw':
      return (
        <span
          id={`type-badge-${type}`}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-500/10 text-purple-800 dark:text-purple-300 border border-purple-500/30 dark:border-purple-500/40 ${className}`}
        >
          <ArrowUpRight className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          Withdraw
        </span>
      );
  }
};

export const RoleBadge: React.FC<{ role: UserRole; className?: string }> = ({
  role,
  className = '',
}) => {
  switch (role) {
    case 'admin':
      return (
        <span
          id={`role-badge-${role}`}
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/15 text-purple-800 dark:text-purple-200 border border-purple-400/40 shadow-xs shadow-purple-500/10 ${className}`}
        >
          <Shield className="w-3 h-3 text-purple-600 dark:text-purple-400" />
          Administrator
        </span>
      );
    case 'operator':
      return (
        <span
          id={`role-badge-${role}`}
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-800 dark:text-indigo-200 border border-indigo-400/40 shadow-xs shadow-indigo-500/10 ${className}`}
        >
          <Headphones className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
          Operator
        </span>
      );
    case 'client':
      return (
        <span
          id={`role-badge-${role}`}
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border border-emerald-400/30 ${className}`}
        >
          <User className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          Client
        </span>
      );
  }
};
