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
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 ${className}`}
        >
          <Clock className="w-3.5 h-3.5 animate-pulse" />
          Pending
        </span>
      );
    case 'in_progress':
      return (
        <span
          id={`status-badge-${status}`}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60 ${className}`}
        >
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
          In Progress
        </span>
      );
    case 'completed':
      return (
        <span
          id={`status-badge-${status}`}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 ${className}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Completed
        </span>
      );
    case 'rejected':
      return (
        <span
          id={`status-badge-${status}`}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60 ${className}`}
        >
          <XCircle className="w-3.5 h-3.5" />
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
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 ${className}`}
      title="Deletion requested, awaiting administrator approval"
    >
      <AlertCircle className="w-3 h-3 text-rose-500 animate-pulse" />
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
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-red-100 text-red-800 border border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800 ${className}`}
        >
          <AlertCircle className="w-3 h-3 text-red-600 dark:text-red-400" />
          Urgent
        </span>
      );
    case 'high':
      return (
        <span
          id={`priority-badge-${priority}`}
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800 ${className}`}
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
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 ${className}`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          Support
        </span>
      );
    case 'deposit':
      return (
        <span
          id={`type-badge-${type}`}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 ${className}`}
        >
          <ArrowDownRight className="w-3.5 h-3.5" />
          Deposit
        </span>
      );
    case 'withdraw':
      return (
        <span
          id={`type-badge-${type}`}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 ${className}`}
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
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
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 ${className}`}
        >
          <Shield className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          Administrator
        </span>
      );
    case 'operator':
      return (
        <span
          id={`role-badge-${role}`}
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 ${className}`}
        >
          <Headphones className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          Operator
        </span>
      );
    case 'client':
      return (
        <span
          id={`role-badge-${role}`}
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 ${className}`}
        >
          <User className="w-3 h-3 text-slate-600 dark:text-slate-400" />
          Client
        </span>
      );
  }
};
