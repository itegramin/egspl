import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import {
  ServiceRequest,
  SupportTicket,
  HoldingDepositRequest,
  HoldingWithdrawRequest,
  RequestStatus,
  UserRole,
} from '../../types';
import { AmountInWords } from '../common/AmountInWords';
import { StatusBadge, PriorityBadge, TypeBadge, RoleBadge, DeletionPendingBadge } from '../common/Badge';
import { formatDateIST, formatTimeIST, formatDateTimeIST } from '../../lib/dateUtils';
import {
  X,
  User,
  Building,
  Calendar,
  Clock,
  Paperclip,
  Send,
  Lock,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  ExternalLink,
  DollarSign,
  CreditCard,
  Building2,
  FileCheck,
  Trash2,
  Download,
  AlertTriangle,
  Eye,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const RequestDetailModal: React.FC = () => {
  const {
    activeRequest,
    setActiveRequest,
    updateRequestStatus,
    updateWithdrawalCmaStep,
    assignOperator,
    addComment,
    deleteRequest,
    requestDeletion,
    approveDeletion,
    rejectDeletion,
    permissions,
  } = useApp();
  const { user, operators } = useAuth();

  const [commentText, setCommentText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [statusChangeNote, setStatusChangeNote] = useState('');
  const [verifiedTxIdInput, setVerifiedTxIdInput] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showThread, setShowThread] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [authorizedAmountInput, setAuthorizedAmountInput] = useState<number | string>('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteReasonInput, setDeleteReasonInput] = useState('');

  const commentFileInputRef = useRef<HTMLInputElement | null>(null);
  const [commentAttachments, setCommentAttachments] = useState<
    { name: string; size: number; type: string; url: string }[]
  >([]);

  useEffect(() => {
    if (activeRequest && activeRequest.type === 'withdraw') {
      const wReq = activeRequest as HoldingWithdrawRequest;
      setAuthorizedAmountInput(wReq.authorizedAmount || wReq.cmaStatus?.authorizedAmount || wReq.amount || 0);
    }
  }, [activeRequest?.id]);

  if (!activeRequest) return null;

  const req = activeRequest;
  const rolePerm = permissions[user.role];
  const canChangeStatus = rolePerm?.canChangeStatus;
  const canAssign = rolePerm?.canAssignOperator;
  const canAddInternal = rolePerm?.canAddInternalNotes;
  const isAdmin = user.role === 'admin';
  const isStaff = user.role === 'admin' || user.role === 'operator';

  const isWithdraw = req.type === 'withdraw';
  const withdrawReq = isWithdraw ? (req as HoldingWithdrawRequest) : null;
  const cma = withdrawReq?.cmaStatus || {};
  const isConfigureDone = !!cma.configure;
  const isMakeDone = !!cma.make;
  const isAuthorizeDone = !!cma.authorize;
  const isAuthorized = isWithdraw && (isAuthorizeDone || req.status === 'completed');
  const authorizedAmountValue = withdrawReq?.authorizedAmount || cma.authorizedAmount || withdrawReq?.amount || 0;

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() && commentAttachments.length === 0) return;

    addComment(req.id, commentText.trim(), isInternalNote, commentAttachments);
    setCommentText('');
    setCommentAttachments([]);
    setIsInternalNote(false);
  };

  const handleStatusChange = (newStatus: RequestStatus) => {
    updateRequestStatus(
      req.id,
      newStatus,
      statusChangeNote.trim() || undefined,
      req.type === 'deposit' ? verifiedTxIdInput.trim() || undefined : undefined
    );
    setStatusChangeNote('');
    // Auto-close the detail modal once a request reaches a terminal state
    // (approved/completed or rejected) so the operator lands back on the list.
    if (newStatus === 'completed' || newStatus === 'rejected') {
      setActiveRequest(null);
    }
  };



  const steps: RequestStatus[] = ['pending', 'in_progress', 'completed'];
  const isRejected = req.status === 'rejected';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setActiveRequest(null)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className={`relative w-full ${showThread ? 'max-w-5xl' : 'max-w-3xl'} bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 my-6 transition-all duration-300`}
        >
          {/* Top Bar Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 backdrop-blur-md">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded">
                {req.ticketNumber}
              </span>
              <TypeBadge type={req.type} />
              {req.type === 'deposit' && req.status === 'in_progress' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                  Verification in Progress
                </span>
              ) : (
                <StatusBadge status={req.status} />
              )}
              <PriorityBadge priority={req.priority} />
              {req.deleteRequested && <DeletionPendingBadge />}
            </div>

            <div className="flex items-center gap-1.5">
              {/* Show/Hide Discussion Thread Toggle */}
              <button
                id="toggle-discussion-thread-btn"
                onClick={() => setShowThread(!showThread)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${showThread
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                title={showThread ? 'Hide Chat' : 'Open Chat'}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {showThread ? 'Close Chat' : `Chat (${req.comments.length})`}
                </span>
              </button>

              {/* Delete / Request Deletion Button */}
              {isAdmin ? (
                <button
                  id="admin-delete-request-btn"
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to permanently delete ${req.ticketNumber}?`)) {
                      deleteRequest(req.id);
                    }
                  }}
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  title="Permanently delete request"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : req.deleteRequested ? (
                <button
                  disabled
                  className="p-2 text-rose-400 rounded-lg opacity-70 cursor-not-allowed"
                  title="Deletion pending administrator approval"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : (isStaff || req.clientId === user.id) ? (
                <button
                  id="user-request-delete-btn"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  title="Request Deletion (Requires Admin Approval)"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : null}

              <button
                id="close-request-modal-btn"
                onClick={() => setActiveRequest(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Top Alert Banner for Pending Deletion */}
          {req.deleteRequested && (
            <div className="px-5 py-3 bg-rose-50 dark:bg-rose-950/50 border-b border-rose-200 dark:border-rose-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-rose-900 dark:text-rose-200">
                      Deletion Requested by {req.deleteRequestedBy || 'User'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-200/80 dark:bg-rose-900/80 text-rose-900 dark:text-rose-200 font-bold uppercase tracking-wider">
                      Pending Admin Approval
                    </span>
                  </div>
                  <p className="text-xs text-rose-700 dark:text-rose-300/90 mt-0.5">
                    Reason: <span className="font-semibold italic">&ldquo;{req.deleteRequestedReason || 'No reason provided'}&rdquo;</span>
                  </p>
                </div>
              </div>

              {isAdmin ? (
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => rejectDeletion(req.id)}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Reject Request
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to approve deletion of ${req.ticketNumber}? This will permanently remove the record.`)) {
                        approveDeletion(req.id);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Approve & Delete</span>
                  </button>
                </div>
              ) : (
                <span className="text-xs font-medium text-rose-600 dark:text-rose-400 italic">
                  Awaiting administrator review
                </span>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800 max-h-[82vh] overflow-y-auto">
            {/* Left Column: Request Details (Expands to full width when thread is hidden) */}
            <div className={`${showThread ? 'lg:col-span-7' : 'lg:col-span-12'} p-5 sm:p-6 space-y-6 overflow-y-auto`}>
              {/* Header Title & Date */}
              <div className="max-h-full">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">
                  {req.title}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-2">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    {req.clientName} ({req.clientCompany || 'Client'})
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDateIST(req.createdAt)}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatTimeIST(req.createdAt)}
                  </span>
                </div>
              </div>

              {/* Lifecycle Progress Stepper Card */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                  <span>{isWithdraw && isStaff ? 'Withdrawal Lifecycle & CMA Verification' : 'Lifecycle Progress'}</span>
                  {req.resolvedAt && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      Resolved: {formatDateTimeIST(req.resolvedAt)}
                    </span>
                  )}
                </div>

                {!isRejected ? (
                  isWithdraw && isStaff ? (
                    /* Withdrawal Lifecycle with C (Configure), M (Make), A (Authorize) Checkpoints for Operators/Admins */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between relative px-2 sm:px-4">
                        <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 dark:bg-slate-700 -z-0" />
                        <div className="flex flex-col items-center relative z-10">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${req.status === 'pending' && !isConfigureDone
                              ? 'bg-amber-500 text-white border-amber-500 ring-4 ring-amber-100 dark:ring-amber-950/60'
                              : 'bg-emerald-500 text-white border-emerald-500'
                              }`}
                          >
                            {req.status !== 'pending' || isConfigureDone ? <CheckCircle2 className="w-4 h-4" /> : '1'}
                          </div>
                          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mt-1">
                            Pending
                          </span>
                        </div>

                        {/* Step 2: C (Configure) */}
                        <div className="flex flex-col items-center relative z-10">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${isConfigureDone
                              ? 'bg-emerald-500 text-white border-emerald-500'
                              : req.status === 'in_progress' && !isConfigureDone
                                ? 'bg-indigo-600 text-white border-indigo-600 ring-4 ring-indigo-100 dark:ring-indigo-950/60'
                                : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-600'
                              }`}
                          >
                            {isConfigureDone ? <CheckCircle2 className="w-4 h-4" /> : 'C'}
                          </div>
                          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mt-1">
                            Configure
                          </span>
                        </div>

                        {/* Step 3: M (Make) */}
                        <div className="flex flex-col items-center relative z-10">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${isMakeDone
                              ? 'bg-emerald-500 text-white border-emerald-500'
                              : isConfigureDone && !isMakeDone
                                ? 'bg-blue-600 text-white border-blue-600 ring-4 ring-blue-100 dark:ring-blue-950/60'
                                : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-600'
                              }`}
                          >
                            {isMakeDone ? <CheckCircle2 className="w-4 h-4" /> : 'M'}
                          </div>
                          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mt-1">
                            Make
                          </span>
                        </div>

                        {/* Step 4: A (Authorize) */}
                        <div className="flex flex-col items-center relative z-10">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${isAuthorizeDone
                              ? 'bg-emerald-500 text-white border-emerald-500'
                              : isMakeDone && !isAuthorizeDone
                                ? 'bg-violet-600 text-white border-violet-600 ring-4 ring-violet-100 dark:ring-violet-950/60'
                                : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-600'
                              }`}
                          >
                            {isAuthorizeDone ? <CheckCircle2 className="w-4 h-4" /> : 'A'}
                          </div>
                          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mt-1">
                            Authorize
                          </span>
                        </div>

                        {/* Step 5: Completed */}
                        <div className="flex flex-col items-center relative z-10">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${req.status === 'completed'
                              ? 'bg-emerald-600 text-white border-emerald-600 ring-4 ring-emerald-100 dark:ring-emerald-950/60'
                              : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-600'
                              }`}
                          >
                            {req.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : '5'}
                          </div>
                          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mt-1">
                            Completed
                          </span>
                        </div>
                      </div>

                      {/* Interactive CMA Checkpoint Checkboxes */}
                      <div className="pt-3 border-t border-slate-200 dark:border-slate-700/80">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>CMA Checkpoints</span>
                          </div>
                          <span className="text-[11px] font-medium text-slate-400">
                            {[isConfigureDone, isMakeDone, isAuthorizeDone].filter(Boolean).length}/3 Checkpoints Complete
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {/* Checkbox 1: C (Configure) */}
                          <label
                            id="cma-step-configure-card"
                            className={`p-2.5 sm:p-3 rounded-xl border transition-all flex items-start gap-2.5 ${isConfigureDone
                              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-slate-900 dark:text-white shadow-2xs'
                              : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-700'
                              } ${canChangeStatus && !isAuthorized ? 'cursor-pointer' : 'cursor-default opacity-90'}`}
                          >
                            <input
                              type="checkbox"
                              id="cma-checkbox-configure"
                              checked={isConfigureDone}
                              disabled={!canChangeStatus || isAuthorized}
                              onChange={(e) => {
                                if (e.target.checked && !isConfigureDone) {
                                  // Configure (C) captures the authorized amount first.
                                  setAuthorizedAmountInput(
                                    withdrawReq?.authorizedAmount || cma.authorizedAmount || withdrawReq?.amount || 0
                                  );
                                  setIsConfiguring(true);
                                } else {
                                  setIsConfiguring(false);
                                  updateWithdrawalCmaStep(req.id, 'configure', e.target.checked);
                                }
                              }}
                              className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600 shrink-0 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-4 h-4 rounded text-[10px] font-black bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
                                    C
                                  </span>
                                  <span className="text-xs font-bold">Configure</span>
                                </div>
                                {isConfigureDone && (
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">✓ Done</span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                Setup route & beneficiary
                              </p>
                              {cma.configuredBy && (
                                <div className="text-[10px] text-slate-400 mt-1 truncate">
                                  By {cma.configuredBy}
                                </div>
                              )}
                            </div>
                          </label>

                          {/* Checkbox 2: M (Make) */}
                          <label
                            id="cma-step-make-card"
                            className={`p-2.5 sm:p-3 rounded-xl border transition-all flex items-start gap-2.5 ${isMakeDone
                              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-slate-900 dark:text-white shadow-2xs'
                              : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-700'
                              } ${canChangeStatus && !isAuthorized ? 'cursor-pointer' : 'cursor-default opacity-90'}`}
                          >
                            <input
                              type="checkbox"
                              id="cma-checkbox-make"
                              checked={isMakeDone}
                              disabled={!canChangeStatus || isAuthorized}
                              onChange={(e) => updateWithdrawalCmaStep(req.id, 'make', e.target.checked)}
                              className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600 shrink-0 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-4 h-4 rounded text-[10px] font-black bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center">
                                    M
                                  </span>
                                  <span className="text-xs font-bold">Make</span>
                                </div>
                                {isMakeDone && (
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">✓ Done</span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                Transfer execution (Maker)
                              </p>
                              {cma.madeBy && (
                                <div className="text-[10px] text-slate-400 mt-1 truncate">
                                  By {cma.madeBy}
                                </div>
                              )}
                            </div>
                          </label>

                          {/* Checkbox 3: A (Authorize) — amount already captured at the C (Configure) step */}
                          <div
                            id="cma-step-authorize-card"
                            className={`p-2.5 sm:p-3 rounded-xl border transition-all ${isAuthorizeDone
                              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-slate-900 dark:text-white shadow-2xs'
                              : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-violet-300 dark:hover:border-violet-700'
                              }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <input
                                type="checkbox"
                                id="cma-checkbox-authorize"
                                checked={isAuthorizeDone}
                                disabled={!canChangeStatus || isAuthorized}
                                onChange={(e) =>
                                  updateWithdrawalCmaStep(
                                    req.id,
                                    'authorize',
                                    e.target.checked,
                                    authorizedAmountValue || withdrawReq?.amount || 0,
                                  )
                                }
                                className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600 shrink-0 cursor-pointer disabled:cursor-not-allowed"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-4 h-4 rounded text-[10px] font-black bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 flex items-center justify-center">
                                      A
                                    </span>
                                    <span className="text-xs font-bold">Authorize</span>
                                  </div>
                                  {isAuthorizeDone ? (
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                                      <ShieldCheck className="w-3 h-3" /> Done
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-violet-600 dark:text-violet-400 font-bold">
                                      Authorize...
                                    </span>
                                  )}
                                </div>

                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                  {isAuthorizeDone
                                    ? `Authorized: ${withdrawReq?.currency} ${authorizedAmountValue.toLocaleString()}`
                                    : 'Payout sign-off (Checker)'}
                                </p>
                                {cma.authorizedBy && (
                                  <div className="text-[10px] text-slate-400 mt-1 truncate">
                                    By {cma.authorizedBy}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Configured Amount Input Box (captured at the C step) */}
                        {isConfiguring && !isConfigureDone && (
                          <div className="p-2.5 sm:p-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/40 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-indigo-900 dark:text-indigo-200">
                                Configured / Authorized Amount:
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                Req: {withdrawReq?.currency} {withdrawReq?.amount?.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="relative flex-1">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                  {withdrawReq?.currency}
                                </span>
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={authorizedAmountInput}
                                  onChange={(e) => setAuthorizedAmountInput(e.target.value)}
                                  className="w-full pl-11 pr-2 py-1.5 text-xs font-bold rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                  autoFocus
                                />
                              </div>
                              <button
                                type="button"
                                id="confirm-configure-amount-btn"
                                onClick={() => {
                                  const amt =
                                    Number(authorizedAmountInput) > 0
                                      ? Number(authorizedAmountInput)
                                      : withdrawReq?.amount || 0;
                                  updateWithdrawalCmaStep(req.id, 'configure', true, amt);
                                  setIsConfiguring(false);
                                }}
                                className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1 shrink-0 transition-colors"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsConfiguring(false);
                                  // Revert the checkbox visual state since Configure wasn't confirmed.
                                  updateWithdrawalCmaStep(req.id, 'configure', false);
                                }}
                                className="px-2 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 shrink-0 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                            {authorizedAmountInput !== '' && !isNaN(Number(authorizedAmountInput)) && Number(authorizedAmountInput) > 0 && (
                              <AmountInWords
                                amount={authorizedAmountInput}
                                currency={withdrawReq?.currency || 'INR'}
                                variant="badge"
                                prefixLabel="Configured Amount in Words:"
                                className="mt-1"
                              />
                            )}
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                              * Defaults to request amount. This amount is locked at the Configure step and shown as
                              the authorized amount throughout.
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Standard 3-Step Lifecycle for Support & Deposit */
                    <div className="flex items-center justify-between relative">
                      <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 dark:bg-slate-700 -z-0" />
                      {steps.map((st, idx) => {
                        const isPast =
                          (req.status === 'in_progress' && idx === 0) ||
                          (req.status === 'completed' && (idx === 0 || idx === 1));
                        const isCurrent = req.status === st;

                        return (
                          <div key={st} className="flex flex-col items-center relative z-10">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${isCurrent
                                ? 'bg-indigo-600 text-white border-indigo-600 ring-4 ring-indigo-100 dark:ring-indigo-950/60'
                                : isPast
                                  ? 'bg-emerald-500 text-white border-emerald-500'
                                  : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-600'
                                }`}
                            >
                              {isPast ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                            </div>
                            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 capitalize mt-1">
                              {req.type === 'deposit' && st === 'in_progress'
                                ? 'Verification in Progress'
                                : st.replace('_', ' ')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center gap-2 text-xs font-semibold text-rose-700 dark:text-rose-300">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>This request was rejected by compliance or support operations.</span>
                  </div>
                )}

                {/* Operator Status Control Bar (if permitted) */}
                {canChangeStatus && (
                  isWithdraw ? (
                    isAuthorized ? (
                      /* Withdrawal Authorized and Completed -> Locked state */
                      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs">
                        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Withdrawal Authorized & Completed. Status transitions are locked.</span>
                        </div>
                        <div className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200">
                          Authorized: {withdrawReq?.currency} {authorizedAmountValue.toLocaleString()}
                        </div>
                      </div>
                    ) : (
                      /* Withdrawal: Only Reset to Pending and Reject are allowed */
                      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Update State:
                        </span>
                        {req.status !== 'rejected' && (
                          <button
                            id="set-rejected-btn"
                            onClick={() => handleStatusChange('rejected')}
                            className="px-2.5 py-1 text-xs font-semibold rounded-md bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 transition-colors flex items-center gap-1"
                          >
                            <XCircle className="w-3 h-3" />
                            Reject
                          </button>
                        )}
                        {req.status !== 'pending' && (
                          <button
                            id="set-pending-btn"
                            onClick={() => handleStatusChange('pending')}
                            className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Reset to Pending
                          </button>
                        )}
                      </div>
                    )
                  ) : (
                    /* Standard Request Status Controls for Support Tickets & Deposits */
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Update State:
                      </span>
                      {req.status !== 'in_progress' && (
                        <button
                          id="set-pending-btn"
                          onClick={() => handleStatusChange('in_progress')}
                          className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1"
                        >
                          Verification In Progress
                        </button>
                      )}
                      {req.status !== 'completed' && (
                        <button
                          id="set-completed-btn"
                          onClick={() => handleStatusChange('completed')}
                          className="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Approve
                        </button>
                      )}
                      {req.status !== 'rejected' && (
                        <button
                          id="set-rejected-btn"
                          onClick={() => handleStatusChange('rejected')}
                          className="px-2.5 py-1 text-xs font-semibold rounded-md bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 transition-colors flex items-center gap-1"
                        >
                          <XCircle className="w-3 h-3" />
                          Reject
                        </button>
                      )}
                      {req.status !== 'pending' && (
                        <button
                          id="set-pending-btn"
                          onClick={() => handleStatusChange('pending')}
                          className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Reset to Pending
                        </button>
                      )}
                    </div>
                  )
                )}
              </div>

              {/* Specific Field Details depending on Type */}
              {req.type === 'deposit' && (
                <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    <DollarSign className="w-4 h-4" />
                    Deposit Financial Audit Info
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400">Amount</span>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">
                        {(req as HoldingDepositRequest).currency} {(req as HoldingDepositRequest).amount?.toLocaleString()}
                      </div>
                      <AmountInWords
                        amount={(req as HoldingDepositRequest).amount}
                        currency={(req as HoldingDepositRequest).currency}
                        variant="subtext"
                        className="mt-0.5"
                      />
                    </div>

                    <div>
                      <span className="text-slate-400">Transfer Method</span>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                        {(req as HoldingDepositRequest).depositMethod === 'bank_deposit'
                          ? 'Cash Deposit'
                          : (req as HoldingDepositRequest).depositMethod?.replace('_', ' ').toUpperCase()}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400">Deposit Date</span>
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {(req as HoldingDepositRequest).depositDate}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400">Kiosk ID</span>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {(req as HoldingDepositRequest).kioskId || 'N/A'}
                      </div>
                    </div>

                    {((req as HoldingDepositRequest).branchCode || (req as HoldingDepositRequest).depositMethod === 'bank_deposit') && (
                      <div>
                        <span className="text-slate-400">Branch Code</span>
                        <div className="font-semibold font-mono text-slate-800 dark:text-slate-200">
                          {(req as HoldingDepositRequest).branchCode || 'N/A'}
                        </div>
                      </div>
                    )}

                    {((req as HoldingDepositRequest).depositMethod === 'imps') && (
                      <div>
                        <span className="text-slate-400">
                          Reference Number
                        </span>
                        <div className="font-mono font-bold text-slate-900 dark:text-white break-all">
                          {(req as HoldingDepositRequest).transactionReferenceId || 'N/A'}
                        </div>
                      </div>
                    )}

                    <div>
                      <span className="text-slate-400">Sender Account Name</span>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {(req as HoldingDepositRequest).senderAccountName || 'N/A'}
                      </div>
                    </div>

                    {(req as HoldingDepositRequest).verifiedTransactionId && (
                      <div className="col-span-2 sm:col-span-3 p-2 rounded bg-emerald-100/70 dark:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5 font-mono">
                        <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Confirmed Ledger Tx: {(req as HoldingDepositRequest).verifiedTransactionId}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {req.type === 'withdraw' && (
                <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    <CreditCard className="w-4 h-4" />
                    Withdrawal Settlement Details
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400">Requested Amount</span>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">
                        {(req as HoldingWithdrawRequest).currency} {(req as HoldingWithdrawRequest).amount?.toLocaleString()}
                      </div>
                      <AmountInWords
                        amount={(req as HoldingWithdrawRequest).amount}
                        currency={(req as HoldingWithdrawRequest).currency}
                        variant="subtext"
                        className="mt-0.5"
                      />
                    </div>

                    {((req as HoldingWithdrawRequest).authorizedAmount || cma.authorizedAmount) && (
                      <div>
                        <span className="text-slate-400">Authorized Payout</span>
                        <div className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                          {(req as HoldingWithdrawRequest).currency} {authorizedAmountValue.toLocaleString()}
                        </div>
                        <AmountInWords
                          amount={authorizedAmountValue}
                          currency={(req as HoldingWithdrawRequest).currency}
                          variant="subtext"
                          className="mt-0.5"
                        />
                      </div>
                    )}

                    <div>
                      <span className="text-slate-400">Method</span>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                        {(req as HoldingWithdrawRequest).withdrawMethod?.replace('_', ' ')}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400">Reason</span>
                      <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {(req as HoldingWithdrawRequest).reason || 'Disbursement'}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400">Kiosk ID</span>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {(req as HoldingWithdrawRequest).kioskId || 'N/A'}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400">Beneficiary Legal Name</span>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {(req as HoldingWithdrawRequest).beneficiaryAccountName || 'N/A'}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400">Bank Name</span>
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {(req as HoldingWithdrawRequest).bankNameOrNetwork || 'N/A'}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400">IFSC Code</span>
                      <div className="font-mono font-medium text-slate-800 dark:text-slate-200 uppercase">
                        {(req as HoldingWithdrawRequest).swiftOrIban || 'N/A'}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400">Beneficiary Account</span>
                      <div className="font-mono font-bold text-slate-900 dark:text-white break-all">
                        {(req as HoldingWithdrawRequest).beneficiaryAccountNumberOrAddress || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {req.type === 'support' && (
                <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/50 space-y-2 text-xs">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-slate-400">Category</span>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                        {(req as SupportTicket).category?.replace('_', ' ')}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Remote ID</span>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {(req as SupportTicket).remoteId || 'None'}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Browser / Client</span>
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={(req as SupportTicket).browserInfo}>
                        {(req as SupportTicket).browserInfo || 'Web App'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Attachments & Proofs Display */}
              {req.attachments.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5" />
                    Attached Proofs & Screenshots ({req.attachments.length})
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {req.attachments.map((att) => (
                      <div
                        key={att.id}
                        onClick={() => setPreviewImage(att.url)}
                        className="group relative p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:border-indigo-500 transition-all cursor-pointer overflow-hidden"
                      >
                        {att.type.startsWith('image/') || att.url.startsWith('data:image') || att.url.includes('images.unsplash') ? (
                          <div className="relative h-24 rounded-lg overflow-hidden bg-slate-100">
                            <img
                              src={att.url}
                              alt={att.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="h-24 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex flex-col items-center justify-center p-2 text-center">
                            <FileCheck className="w-8 h-8 mb-1" />
                            <span className="text-[10px] font-mono">PDF Document</span>
                          </div>
                        )}
                        <div className="mt-2">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {att.name}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                            <span>{(att.size / 1024).toFixed(0)} KB</span>
                            <span>{att.uploadedBy}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Client & Metadata Info Card (Admin Only) */}
              {isAdmin && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Request Metadata
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-slate-400">Client Contact</span>
                      <div className="font-semibold text-slate-900 dark:text-white">{req.clientName}</div>
                      <div className="text-[11px] text-slate-400">{req.clientEmail}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Company</span>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {req.clientCompany || 'Individual'}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Assigned Operator</span>
                      {canAssign ? (
                        <select
                          value={req.assignedOperatorId || ''}
                          onChange={(e) => assignOperator(req.id, e.target.value)}
                          className="mt-1 w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                        >
                          <option value="">Unassigned</option>
                          {operators.map((op) => (
                            <option key={op.id} value={op.id}>
                              {op.name} ({op.role.toUpperCase()})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="font-semibold text-indigo-600 dark:text-indigo-400">
                          {req.assignedOperatorName || 'Unassigned'}
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-400">Created At</span>
                      <div className="font-medium text-slate-700 dark:text-slate-300">
                        {formatDateTimeIST(req.createdAt)}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Last Updated</span>
                      <div className="font-medium text-slate-700 dark:text-slate-300">
                        {formatDateTimeIST(req.updatedAt)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Banner when thread is hidden */}
              {!showThread && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>
                      Chat is hidden ({req.comments.length} message{req.comments.length === 1 ? '' : 's'}).
                    </span>
                  </div>
                  <button
                    id="unhide-discussion-thread-btn"
                    onClick={() => setShowThread(true)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors shrink-0 flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Open Chat</span>
                  </button>
                </div>
              )}
            </div>

            {/* Right Column: Interactive Conversation & Internal Notes Thread (5 Cols) */}
            {showThread && (
              <div className="lg:col-span-5 flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">
                {/* Thread Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                      {req.comments.length < 1 ? 'Open Chat' : 'Chat ' + req.comments.length}
                    </span>
                  </div>
                  {canAddInternal && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Private Chat Available
                    </span>
                  )}
                </div>

                {/* Messages Container */}
                <div className={`flex-2  p-4 overflow-y-auto space-y-3.5 max-h-full `}>
                  {req.comments.length === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center text-center p-4 ml">
                      <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        No replies yet.
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Send a message below to communicate.
                      </p>
                    </div>
                  ) : (
                    req.comments
                      .filter((c) => !c.isInternal || user.role === 'operator' || user.role === 'admin')
                      .map((c) => (
                        <div
                          key={c.id}
                          tabIndex={0}
                          className={`group text-xs`}
                        >
                          <div
                            className={`transition-all duration-200 ease-out ${c.isInternal
                              ? 'flex items-center justify-between gap-2 mb-1'
                              : `flex items-center gap-2 overflow-hidden max-h-0 opacity-0 mb-0 group-hover:max-h-6 group-hover:opacity-100 group-hover:mb-1 group-focus-within:max-h-6 group-focus-within:opacity-100 group-focus-within:mb-1 group-active:max-h-6 group-active:opacity-100 group-active:mb-1 ${c.authorId === user.id ? 'justify-end ml-10' : 'justify-start mr-10'
                              }`
                              }`}
                          >
                            <div className="flex items-center gap-2">
                              {c.isInternal && (
                                <>
                                  <span className="font-semibold text-slate-700 dark:text-slate-300">{c.authorName}</span>
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                                    <Lock className="w-2.5 h-2.5" /> Staff Only
                                  </span>
                                </>
                              )}
                              <span
                                className={`text-[10px] text-slate-400 select-none transition-opacity duration-200 ${c.isInternal ? 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 group-active:opacity-100' : ''
                                  }`}
                              >
                                <span className='px-2 font-bold'>{c.authorName}</span>
                                {formatDateTimeIST(c.createdAt)}
                              </span>
                            </div>
                          </div>

                          <p className={`py-2 px-3 rounded-lg text-xs border relative transition-all focus:outline-none  text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed ${c.isInternal
                            ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/80 text-amber-950 dark:text-amber-200'
                            : c.authorId === user.id
                              ? 'ml-10 bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/60'
                              : 'mr-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                            }`}>
                            {c.content}
                          </p>
                        </div>
                      ))
                  )}
                </div>

                {/* Message Composer Box */}
                <form onSubmit={handleSendComment} className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                  {canAddInternal && (
                    <div className="flex items-center gap-4 mb-2">
                      <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                        <input
                          type="radio"
                          name="commentType"
                          checked={!isInternalNote}
                          onChange={() => setIsInternalNote(false)}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Public</span>
                      </label>

                      <label className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-semibold cursor-pointer">
                        <input
                          type="radio"
                          name="commentType"
                          checked={isInternalNote}
                          onChange={() => setIsInternalNote(true)}
                          className="text-amber-600 focus:ring-amber-500"
                        />
                        <span className="flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Private
                        </span>
                      </label>
                    </div>
                  )}

                  <div className="relative">
                    <textarea
                      id="ticket-reply-textarea"
                      rows={2}
                      placeholder={
                        isInternalNote
                          ? 'Write internal audit note for operator team...'
                          : 'Write message to client / support desk...'
                      }
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className={`w-full px-3 py-2 text-xs sm:text-sm rounded-lg border focus:outline-none focus:ring-2 resize-none ${isInternalNote
                        ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 text-slate-900 dark:text-white focus:ring-amber-500'
                        : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-indigo-500'
                        }`}
                    />

                    <div className="flex items-center justify-between mt-2">
                      <div className="text-[11px] text-slate-400">
                        {isInternalNote ? 'Send Private Message to Team' : 'Send Public Message to Client'}
                      </div>

                      <button
                        id="send-comment-btn"
                        type="submit"
                        disabled={!commentText.trim()}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isInternalNote
                          ? 'bg-amber-600 hover:bg-amber-700'
                          : 'bg-indigo-600 hover:bg-indigo-700'
                          }`}
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>
        </motion.div>

        {/* Full Image Preview Zoom Modal */}
        {previewImage && (
          <div
            className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-xl bg-slate-900 p-2">
              <img
                src={previewImage}
                alt="Enlarged proof"
                className="max-h-[85vh] max-w-full object-contain mx-auto rounded"
              />
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-slate-900/80 text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Request Deletion Confirmation Dialog Modal */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Request Ticket Deletion
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Deleting <span className="font-semibold text-slate-700 dark:text-slate-300">{req.ticketNumber}</span> requires Administrator approval.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Reason for Deletion <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Please describe why this request should be deleted (e.g. duplicate request, customer cancellation, test record)..."
                  value={deleteReasonInput}
                  onChange={(e) => setDeleteReasonInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeleteReasonInput('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!deleteReasonInput.trim()}
                  onClick={() => {
                    if (deleteReasonInput.trim()) {
                      requestDeletion(req.id, deleteReasonInput);
                      setIsDeleteModalOpen(false);
                      setDeleteReasonInput('');
                    }
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white shadow-md shadow-rose-600/20 transition-all"
                >
                  Submit Deletion Request
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};
