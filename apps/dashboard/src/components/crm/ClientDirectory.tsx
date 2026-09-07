import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { User, UserRole, ServiceRequest } from '../../types';
import { StatusBadge, TypeBadge, RoleBadge } from '../common/Badge';
import { formatDateIST } from '../../lib/dateUtils';
import {
  Users,
  Search,
  Building,
  Mail,
  Phone,
  Wallet,
  Clock,
  CheckCircle2,
  Plus,
  ExternalLink,
  X,
  FileText,
  ShieldCheck,
  UserCheck,
  UserX,
  Sparkles,
  AlertTriangle,
  Filter,
  ShieldAlert,
  Trash2,
  LayoutList,
  LayoutGrid,
  Calendar,
  AlertCircle,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type DirectoryTab = 'all' | 'pending' | 'clients' | 'operators' | 'admins';
type ViewMode = 'list' | 'grid';

export const ClientDirectory: React.FC = () => {
  const { user, allUsers, clients, operators, approveUser, rejectUser, adminUpdateUserRole, deleteUser } = useAuth();
  const { requests, setActiveRequest, toast } = useApp();

  const [activeTab, setActiveTab] = useState<DirectoryTab>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const isAdmin = user?.role === 'admin';

  const pendingUsers = allUsers.filter(u => u.status === 'pending');
  const activeAdmins = allUsers.filter(u => u.role === 'admin');
  const activeOps = allUsers.filter(u => u.role === 'operator');
  const activeClients = allUsers.filter(u => u.role === 'client');

  // Decide user list based on role and tab
  const baseUsers = isAdmin
    ? (activeTab === 'all'
        ? allUsers
        : activeTab === 'pending'
        ? pendingUsers
        : activeTab === 'clients'
        ? activeClients
        : activeTab === 'operators'
        ? activeOps
        : activeAdmins)
    : clients;

  const filteredUsers = baseUsers.filter(u => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.companyName && u.companyName.toLowerCase().includes(q)) ||
      (u.holdingAccountId && u.holdingAccountId.toLowerCase().includes(q)) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const getClientRequests = (clientId: string) =>
    requests.filter(r => r.clientId === clientId);

  const handleApprove = async (targetUser: User, assignedRole?: UserRole) => {
    setProcessingUserId(targetUser.id);
    try {
      const res = await approveUser(targetUser.id, assignedRole || targetUser.role);
      if (res.success) {
        toast(`Approved and activated account for ${targetUser.name}!`, 'success');
      } else {
        toast(res.error || 'Failed to approve user', 'error');
      }
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleReject = async (targetUser: User) => {
    setProcessingUserId(targetUser.id);
    try {
      const res = await rejectUser(targetUser.id);
      if (res.success) {
        toast(`Account for ${targetUser.name} has been suspended/rejected.`, 'info');
      } else {
        toast(res.error || 'Failed to update user', 'error');
      }
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleRoleChange = async (targetUser: User, newRole: UserRole) => {
    setProcessingUserId(targetUser.id);
    try {
      const res = await adminUpdateUserRole(targetUser.id, newRole);
      if (res.success) {
        toast(`Updated role for ${targetUser.name} to [${newRole.toUpperCase()}].`, 'success');
      } else {
        toast(res.error || 'Failed to change role', 'error');
      }
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleDeleteClick = (targetUser: User) => {
    if (targetUser.id === user?.id) {
      toast('You cannot delete your own active administrator account.', 'warning');
      return;
    }
    setUserToDelete(targetUser);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteUser(userToDelete.id);
      if (res.success) {
        toast(`User account for ${userToDelete.name} has been permanently deleted.`, 'success');
        if (selectedClient?.id === userToDelete.id) {
          setSelectedClient(null);
        }
        setUserToDelete(null);
      } else {
        toast(res.error || 'Failed to delete user account', 'error');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div id="client-directory-view" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-xs">
              <Users className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {isAdmin ? 'User Governance & Client CRM Directory' : 'Client CRM Directory'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {isAdmin
                  ? 'Manage platform users, verify pending registration requests, assign privileges, and manage accounts.'
                  : 'Registered client accounts, holding account references, and complete request history.'}
              </p>
            </div>
          </div>
        </div>

        {/* Search & View Mode Switcher */}
        <div className="flex items-center gap-2.5">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search name, email, company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
            <button
              id="view-mode-list-btn"
              onClick={() => setViewMode('list')}
              title="List View"
              className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <LayoutList className="w-4 h-4" />
              <span className="hidden md:inline">List</span>
            </button>
            <button
              id="view-mode-grid-btn"
              onClick={() => setViewMode('grid')}
              title="Grid View"
              className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden md:inline">Cards</span>
            </button>
          </div>
        </div>
      </div>

      {/* Admin Tab Filters */}
      {isAdmin && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>All Users</span>
            <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
              {allUsers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
            }`}
          >
            <span>Pending Approvals</span>
            {pendingUsers.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] animate-pulse">
                {pendingUsers.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('clients')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'clients'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>Clients</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px]">
              {activeClients.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('operators')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'operators'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>Operators</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px]">
              {activeOps.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('admins')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'admins'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>Administrators</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px]">
              {activeAdmins.length}
            </span>
          </button>
        </div>
      )}

      {/* Directory Content: List / Table View (Default) */}
      {viewMode === 'list' ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          {filteredUsers.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
                No users found
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                No user profiles match your active tab selection or search term.
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-4 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                    <th className="py-3.5 px-4 font-medium">User Profile</th>
                    <th className="py-3.5 px-3 font-medium">Organization</th>
                    <th className="py-3.5 px-3 font-medium">Kiosk ID</th>
                    <th className="py-3.5 px-3 font-medium">Role</th>
                    <th className="py-3.5 px-3 font-medium">Status</th>
                    <th className="py-3.5 px-3 font-medium">Holding & Balance</th>
                    <th className="py-3.5 px-3 font-medium text-center">Requests</th>
                    <th className="py-3.5 px-3 font-medium">Joined</th>
                    <th className="py-3.5 px-4 font-medium text-right">Governance Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredUsers.map((targetUser) => {
                    const userReqs = getClientRequests(targetUser.id);
                    const isPending = targetUser.status === 'pending';
                    const isSuspended = targetUser.status === 'suspended';
                    const isBusy = processingUserId === targetUser.id;
                    const isSelf = targetUser.id === user?.id;

                    return (
                      <tr
                        key={targetUser.id}
                        id={`user-row-${targetUser.id}`}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                          isPending ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''
                        }`}
                      >
                        {/* User Profile */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={targetUser.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${targetUser.email}`}
                              alt={targetUser.name}
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0 shadow-xs"
                            />
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                                <span>{targetUser.name}</span>
                                {isSelf && (
                                  <span className="px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate mt-0.5">
                                <Mail className="w-3 h-3 shrink-0 text-slate-400" />
                                <span className="truncate">{targetUser.email}</span>
                              </div>
                              {targetUser.phoneNumber && (
                                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                  <Phone className="w-3 h-3 shrink-0 text-slate-400" />
                                  <span>{targetUser.phoneNumber}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Company / Department */}
                        <td className="py-3.5 px-3">
                          <div className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                            {targetUser.companyName || (targetUser.role === 'admin' ? 'System Administration' : 'Enterprise User')}
                          </div>
                        </td>

                        {/* Kiosk ID */}
                        <td className="py-3.5 px-3">
                          <div className="font-medium text-slate-600 dark:text-slate-300 truncate max-w-[120px]">
                            {targetUser.role === 'client' ? (targetUser.kioskId || '—') : '—'}
                          </div>
                          {targetUser.role === 'client' && (
                            <div className="mt-1">
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                  (targetUser.category || 'rural').toLowerCase() === 'urban'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                }`}
                              >
                                {(targetUser.category || 'rural').toUpperCase()}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-3">
                          {isAdmin && !isPending ? (
                            <select
                              value={targetUser.role}
                              onChange={(e) => handleRoleChange(targetUser, e.target.value as UserRole)}
                              disabled={isBusy || isSelf}
                              className="px-2 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-60 cursor-pointer"
                            >
                              <option value="client">Client</option>
                              <option value="operator">Operator</option>
                              <option value="admin">Administrator</option>
                            </select>
                          ) : (
                            <RoleBadge role={targetUser.role} />
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                              isPending
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse'
                                : isSuspended
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              isPending ? 'bg-amber-500' : isSuspended ? 'bg-rose-500' : 'bg-emerald-500'
                            }`} />
                            {targetUser.status}
                          </span>
                        </td>

                        {/* Holding Account & Balance */}
                        <td className="py-3.5 px-3">
                          {targetUser.role === 'client' ? (
                            <div>
                              {targetUser.holdingAccountId ? (
                                <div className="font-mono text-xs font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                                  <Wallet className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                  <span>{targetUser.holdingAccountId}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                              <div className="font-semibold text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                                {targetUser.currency || 'USD'} {targetUser.estimatedHoldingBalance?.toLocaleString() || '0'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Staff Account</span>
                          )}
                        </td>

                        {/* Requests Activity */}
                        <td className="py-3.5 px-3 text-center">
                          {targetUser.role === 'client' ? (
                            <button
                              onClick={() => setSelectedClient(targetUser)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 font-semibold text-xs transition-colors"
                              title="Inspect Request History"
                            >
                              <FolderOpen className="w-3.5 h-3.5" />
                              <span>{userReqs.length} reqs</span>
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>

                        {/* Joined Date */}
                        <td className="py-3.5 px-3 text-xs text-slate-500 dark:text-slate-400 font-mono">
                          {formatDateIST(targetUser.createdAt)}
                        </td>

                        {/* Governance Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Pending Approvals */}
                            {isAdmin && isPending && (
                              <>
                                <button
                                  onClick={() => handleApprove(targetUser)}
                                  disabled={isBusy}
                                  title="Approve & Activate"
                                  className="p-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1 transition-colors"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span className="hidden lg:inline">Approve</span>
                                </button>
                                <button
                                  onClick={() => handleReject(targetUser)}
                                  disabled={isBusy}
                                  title="Reject Registration"
                                  className="p-1.5 px-2.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 hover:bg-rose-100 dark:hover:bg-rose-950/80 text-amber-800 dark:text-amber-300 hover:text-rose-700 dark:hover:text-rose-300 text-xs font-semibold transition-colors"
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                  <span className="hidden lg:inline">Reject</span>
                                </button>
                              </>
                            )}

                            {/* Client Portfolio inspect */}
                            {targetUser.role === 'client' && (
                              <button
                                onClick={() => setSelectedClient(targetUser)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="View Client Portfolio"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                            )}

                            {/* Delete User Button (Admins Only) */}
                            {isAdmin && (
                              <button
                                id={`delete-user-btn-${targetUser.id}`}
                                onClick={() => handleDeleteClick(targetUser)}
                                disabled={isBusy || isSelf}
                                title={isSelf ? 'Cannot delete your active account' : `Delete user ${targetUser.name}`}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  isSelf
                                    ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                                    : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 hover:text-rose-700'
                                }`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Alternative Users Grid / Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredUsers.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 text-xs sm:text-sm">
              No users match the selected tab or search query.
            </div>
          ) : (
            filteredUsers.map((targetUser) => {
              const userReqs = getClientRequests(targetUser.id);
              const isPending = targetUser.status === 'pending';
              const isSuspended = targetUser.status === 'suspended';
              const isBusy = processingUserId === targetUser.id;
              const isSelf = targetUser.id === user?.id;

              return (
                <div
                  key={targetUser.id}
                  id={`user-card-${targetUser.id}`}
                  className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border shadow-sm transition-all flex flex-col justify-between ${
                    isPending
                      ? 'border-amber-400/80 dark:border-amber-500/50 bg-amber-50/20 dark:bg-amber-950/10'
                      : 'border-slate-200/80 dark:border-slate-800'
                  }`}
                >
                  <div>
                    {/* Top Avatar & Badges */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={targetUser.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${targetUser.email}`}
                          alt={targetUser.name}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0 shadow-xs"
                        />
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                            <span>{targetUser.name}</span>
                            {isSelf && (
                              <span className="px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold">
                                You
                              </span>
                            )}
                          </h3>
                          <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium truncate">
                            {targetUser.companyName || (targetUser.role === 'admin' ? 'System Administration' : 'Enterprise User')}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <RoleBadge role={targetUser.role} />
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isPending
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse'
                              : isSuspended
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {targetUser.status}
                        </span>
                      </div>
                    </div>

                    {/* Contact details */}
                    <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 my-3">
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{targetUser.email}</span>
                      </div>
                      {targetUser.phoneNumber && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{targetUser.phoneNumber}</span>
                        </div>
                      )}
                      {targetUser.holdingAccountId && (
                        <div className="flex items-center gap-2 font-mono">
                          <Wallet className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                          <span>{targetUser.holdingAccountId}</span>
                        </div>
                      )}
                    </div>

                    {/* Client Metrics if applicable */}
                    {targetUser.role === 'client' && (
                      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs">
                        <div>
                          <span className="text-[11px] text-slate-400">Total Requests</span>
                          <div className="font-bold text-slate-900 dark:text-white">{userReqs.length}</div>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400">Holding Balance</span>
                          <div className="font-bold text-emerald-600 dark:text-emerald-400">
                            {targetUser.currency || 'USD'} {targetUser.estimatedHoldingBalance?.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Pending Approval Alert */}
                    {isPending && (
                      <div className="mt-3 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>Awaiting admin review to grant platform access.</span>
                      </div>
                    )}
                  </div>

                  {/* Footer Controls */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    {/* Admin Governance Actions */}
                    {isAdmin && (
                      <>
                        {isPending ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleApprove(targetUser)}
                              disabled={isBusy}
                              className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Approve & Activate</span>
                            </button>
                            <button
                              onClick={() => handleReject(targetUser)}
                              disabled={isBusy}
                              className="py-1.5 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-semibold transition-colors"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-slate-400 text-[11px] font-semibold">Assign Role:</span>
                            <select
                              value={targetUser.role}
                              onChange={(e) => handleRoleChange(targetUser, e.target.value as UserRole)}
                              disabled={isBusy || isSelf}
                              className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="client">Client</option>
                              <option value="operator">Operator</option>
                              <option value="admin">Administrator</option>
                            </select>
                          </div>
                        )}
                      </>
                    )}

                    {/* Bottom Action Row with View Portfolio & Delete Button */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      {targetUser.role === 'client' ? (
                        <button
                          onClick={() => setSelectedClient(targetUser)}
                          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                        >
                          <span>View Portfolio ({userReqs.length})</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      ) : (
                        <div />
                      )}

                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteClick(targetUser)}
                          disabled={isBusy || isSelf}
                          title={isSelf ? 'Cannot delete active account' : 'Delete user'}
                          className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                            isSelf
                              ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                              : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      <AnimatePresence>
        {userToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
              onClick={() => !isDeleting && setUserToDelete(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-rose-200 dark:border-rose-950/60 overflow-hidden"
            >
              {/* Header with Danger Accent */}
              <div className="p-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-200 dark:border-rose-800 shadow-sm">
                  <Trash2 className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Delete User Account?
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Are you sure you want to permanently delete this user account from the system?
                </p>

                {/* Target User Summary Card */}
                <div className="my-5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 text-left flex items-center gap-3">
                  <img
                    src={userToDelete.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userToDelete.email}`}
                    alt={userToDelete.name}
                    className="w-11 h-11 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {userToDelete.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {userToDelete.email}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <RoleBadge role={userToDelete.role} />
                      <span className="text-[10px] text-slate-400 uppercase font-mono font-semibold">
                        {userToDelete.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2 text-left">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>
                    This action will purge their profile, credentials, and permissions from the database. This action cannot be undone.
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  onClick={() => setUserToDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  id="confirm-delete-user-btn"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 text-xs sm:text-sm font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 flex items-center gap-2 transition-all disabled:opacity-50 active:scale-98"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Confirm Delete</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Client Request History Modal */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setSelectedClient(null)}
          />
          <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-3">
                <img
                  src={selectedClient.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedClient.email}`}
                  alt={selectedClient.name}
                  className="w-9 h-9 rounded-full object-cover"
                />
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {selectedClient.name} — Request Portfolio
                  </h3>
                  <p className="text-xs text-slate-400">{selectedClient.companyName || selectedClient.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedClient(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {getClientRequests(selectedClient.id).length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No requests recorded for this client.</p>
              ) : (
                getClientRequests(selectedClient.id).map(r => (
                  <div
                    key={r.id}
                    onClick={() => {
                      setSelectedClient(null);
                      setActiveRequest(r);
                    }}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                          {r.ticketNumber}
                        </span>
                        <TypeBadge type={r.type} />
                        <StatusBadge status={r.status} />
                      </div>
                      <div className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white">
                        {r.title}
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 shrink-0">
                      Inspect <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
