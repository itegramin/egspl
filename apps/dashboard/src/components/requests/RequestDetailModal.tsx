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
  getRequestHandlers,
  getRequestAuthorizers,
  isUserAssignedAuthorizer,
  Attachment,
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
  Image as ImageIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AttachmentItemProps {
  att: Attachment;
  req: ServiceRequest;
  onPreview: (url: string, title?: string) => void;
}

const AttachmentItem: React.FC<AttachmentItemProps> = ({ att, req, onPreview }) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const isImage = Boolean(
    (att.type && typeof att.type === 'string' && att.type.startsWith('image/')) ||
    att.url?.startsWith('data:image') ||
    att.url?.includes('images.unsplash') ||
    /\.(jpe?g|png|gif|webp|svg|bmp|heic|heif|avif)(\?|$)/i.test(att.url || '') ||
    /\.(jpe?g|png|gif|webp|svg|bmp|heic|heif|avif)$/i.test(att.name || '')
  );

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = att.url;
    link.download = att.name || 'attachment';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      onClick={() => onPreview(att.url, att.name)}
      className="group relative p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/70 hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col justify-between"
    >
      {/* Thumbnail Area */}
      {isImage && !hasError ? (
        <div className="relative h-28 w-full rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900/60 flex items-center justify-center">
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400">
              <ImageIcon className="w-5 h-5 animate-pulse text-indigo-400" />
            </div>
          )}
          <img
            src={att.url}
            alt={att.name}
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          />
          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[1px]">
            <Eye className="w-5 h-5 text-white drop-shadow-md" />
          </div>
        </div>
      ) : isImage && hasError ? (
        /* Fallback Digital Counterfoil when remote storage object is missing / 404 */
        <div className="h-28 w-full rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/20 border border-amber-200/70 dark:border-amber-800/50 p-2 flex flex-col justify-between text-left">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-[9px] font-bold tracking-wider text-amber-700 dark:text-amber-400 uppercase bg-amber-100/90 dark:bg-amber-900/60 px-1.5 py-0.5 rounded">
              <ShieldCheck className="w-3 h-3" /> Slip Proof
            </span>
            <span className="text-[9px] font-mono text-slate-400">
              {req.ticketNumber}
            </span>
          </div>
          <div className="py-1">
            <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
              {(req as any).amount ? `₹ ${(req as any).amount.toLocaleString()}` : req.title}
            </div>
            <div className="text-[9px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5 shrink-0" />
              <span>Storage Link Offline</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-amber-200/40 dark:border-amber-800/30">
            <span className="truncate max-w-[85px]">{req.clientName}</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">Inspect</span>
          </div>
        </div>
      ) : (
        /* PDF Document */
        <div className="h-28 w-full rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex flex-col items-center justify-center p-2 text-center border border-indigo-100 dark:border-indigo-900/40">
          <FileCheck className="w-8 h-8 mb-1 text-indigo-500" />
          <span className="text-[11px] font-bold font-mono">PDF Document</span>
          <span className="text-[9px] text-slate-400 mt-0.5">Click to preview</span>
        </div>
      )}

      {/* Metadata & Actions */}
      <div className="mt-2 flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={att.name}>
            {att.name}
          </p>
          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
            <span>{(att.size / 1024).toFixed(0)} KB</span>
            <span>•</span>
            <span className="truncate">{att.uploadedBy}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          className="p-1 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-colors shrink-0"
          title="Download Attachment"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export const RequestDetailModal: React.FC = () => {
  const {
    activeRequest,
    setActiveRequest,
    updateRequestStatus,
    updateWithdrawalCmaStep,
    assignOperator,
    rejectRequest,
    addComment,
    deleteRequest,
    requestDeletion,
    approveDeletion,
    rejectDeletion,
    permissions,
    assignmentConfig,
  } = useApp();
  const { user, operators } = useAuth();

  const [commentText, setCommentText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [statusChangeNote, setStatusChangeNote] = useState('');
  const [verifiedTxIdInput, setVerifiedTxIdInput] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('Proof Attachment');
  const [previewHasError, setPreviewHasError] = useState<boolean>(false);
  const [showThread, setShowThread] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [authorizedAmountInput, setAuthorizedAmountInput] = useState<number | string>('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteReasonInput, setDeleteReasonInput] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

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

  // Authorizer check: only assigned authorizer(s) (or admin) can tick 'Authorize'
  const isAssignedAuthorizer =
    user.role === 'admin' ||
    isUserAssignedAuthorizer(req, user.id, assignmentConfig?.rules?.limit);

  const assignedMakers = getRequestHandlers(
    req,
    assignmentConfig?.rules?.[req.type === 'withdraw' ? 'limit' : req.type]
  );
  const assignedAuthorizersList = getRequestAuthorizers(req, assignmentConfig?.rules?.limit);

  // CMA sequence guards
  const canMake = isConfigureDone;  // Must Configure first
  const canAuthorize = isConfigureDone && isMakeDone && isAssignedAuthorizer;

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
                  className="p-2 text-rose-500 hover:text-white hover:bg-rose-600 rounded-xl border border-rose-200 dark:border-rose-900/60 shadow-2xs hover:shadow-md hover:shadow-rose-600/20 active:scale-95 transition-all"
                  title="Permanently delete request"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : req.deleteRequested ? (
                <button
                  disabled
                  className="p-2 text-rose-400 rounded-xl bg-rose-500/10 border border-rose-500/20 opacity-70 cursor-not-allowed"
                  title="Deletion pending administrator approval"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : (isStaff || req.clientId === user.id) ? (
                <button
                  id="user-request-delete-btn"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="p-2 text-rose-500 hover:text-white hover:bg-rose-600 rounded-xl border border-rose-200 dark:border-rose-900/60 shadow-2xs hover:shadow-md hover:shadow-rose-600/20 active:scale-95 transition-all"
                  title="Request Deletion (Requires Admin Approval)"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : null}

              <button
                id="close-request-modal-btn"
                onClick={() => setActiveRequest(null)}
                className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl border border-transparent hover:border-rose-200 dark:hover:border-rose-800/60 active:scale-95 transition-all"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Top Alert Banner for Pending Deletion */}
          {req.deleteRequested && (
            <div className="px-5 py-3.5 bg-rose-500/10 dark:bg-rose-950/40 border-b border-rose-500/30 dark:border-rose-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-300 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <AlertTriangle className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-rose-900 dark:text-rose-200">
                      Deletion Requested by {req.deleteRequestedBy || 'User'}
                    </span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-rose-500/25 text-rose-900 dark:text-rose-100 font-bold uppercase tracking-wider border border-rose-500/40">
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
                    className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition-all shadow-2xs"
                  >
                    Reject Request
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to approve deletion of ${req.ticketNumber}? This will permanently remove the record.`)) {
                        approveDeletion(req.id);
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-rose-600/30 flex items-center gap-1.5 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Approve & Delete</span>
                  </button>
                </div>
              ) : (
                <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 italic">
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
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>CMA Checkpoints</span>
                          </div>
                          <span className="text-[11px] font-medium text-slate-400">
                            {[isConfigureDone, isMakeDone, isAuthorizeDone].filter(Boolean).length}/3 Checkpoints Complete
                          </span>
                        </div>
                        {/* Assigned Staff Info Pills */}
                        {(assignedMakers.length > 0 || assignedAuthorizersList.length > 0) && (
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {assignedMakers.length > 0 && (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                <span className="font-bold">Maker{assignedMakers.length > 1 ? 's' : ''}:</span>
                                <span>{assignedMakers.map(m => m.name).join(', ')}</span>
                              </div>
                            )}
                            {assignedAuthorizersList.length > 0 && (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                                <span className="font-bold">Authorizer{assignedAuthorizersList.length > 1 ? 's' : ''}:</span>
                                <span>{assignedAuthorizersList.map(a => a.name).join(', ')}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {!canAuthorize && !isAuthorizeDone && canChangeStatus && (
                          <span className="text-[10px] text-violet-500 dark:text-violet-400 leading-snug block mt-1">
                            {!isConfigureDone || !isMakeDone
                              ? 'Complete Configure → Make first'
                              : 'Only designated Authorizer can authorize'}
                          </span>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-2.5">
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
                              disabled={!canChangeStatus || isAuthorized || !canMake}
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
                                disabled={!canChangeStatus || isAuthorized || !canAuthorize}
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
                                ? 'bg-blue-600 text-white border-blue-600 ring-4 ring-blue-100 dark:ring-blue-950/80 shadow-md shadow-blue-500/20'
                                : isPast
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs shadow-emerald-500/30'
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
                  <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex flex-col gap-1 text-xs">
                    <div className="flex items-center gap-2 font-semibold text-rose-700 dark:text-rose-300">
                      <XCircle className="w-4 h-4 shrink-0" />
                      <span>This request was rejected.</span>
                    </div>
                    {req.rejectionReason && (
                      <div className="pl-6 text-rose-600 dark:text-rose-400 italic">
                        Reason: {req.rejectionReason}
                      </div>
                    )}
                  </div>
                )}

                {/* Operator Status Control Bar (if permitted) */}
                {canChangeStatus && (
                  isWithdraw ? (
                    isAuthorized ? (
                      /* Withdrawal Authorized and Completed -> Locked state */
                      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 dark:border-emerald-800 text-xs">
                        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Withdrawal Authorized & Completed. Status transitions are locked.</span>
                        </div>
                        <div className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                          Authorized: {withdrawReq?.currency} {authorizedAmountValue.toLocaleString()}
                        </div>
                      </div>
                    ) : (
                      /* Withdrawal: Only Reset to Pending and Reject are allowed */
                      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Update State:
                        </span>
                        {req.status !== 'rejected' && (
                          <button
                            id="set-rejected-btn"
                            onClick={() => setShowRejectDialog(true)}
                            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 active:scale-95 transition-all flex items-center gap-1.5 border border-rose-500"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        )}
                        {req.status !== 'pending' && (
                          <button
                            id="set-pending-btn"
                            onClick={() => handleStatusChange('pending')}
                            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-200 border border-amber-500/30 dark:border-amber-500/40 active:scale-95 transition-all flex items-center gap-1.5"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Reset to Pending
                          </button>
                        )}
                      </div>
                    )
                  ) : (
                    /* Standard Request Status Controls for Support Tickets & Deposits */
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Update State:
                      </span>
                      {req.status !== 'in_progress' && (
                        <button
                          id="set-in-progress-btn"
                          onClick={() => handleStatusChange('in_progress')}
                          className="px-3 py-1.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 active:scale-95 transition-all flex items-center gap-1.5 border border-blue-500"
                        >
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                          </span>
                          Verification In Progress
                        </button>
                      )}
                      {req.status !== 'completed' && (
                        <button
                          id="set-completed-btn"
                          onClick={() => handleStatusChange('completed')}
                          className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 active:scale-95 transition-all flex items-center gap-1.5 border border-emerald-500"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve
                        </button>
                      )}
                      {req.status !== 'rejected' && (
                        <button
                          id="set-rejected-btn"
                          onClick={() => setShowRejectDialog(true)}
                          className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/25 active:scale-95 transition-all flex items-center gap-1.5 border border-rose-500"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      )}
                      {req.status !== 'pending' && (
                        <button
                          id="set-pending-btn"
                          onClick={() => handleStatusChange('pending')}
                          className="px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-200 border border-amber-500/30 dark:border-amber-500/40 active:scale-95 transition-all flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
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
                      <AttachmentItem
                        key={att.id}
                        att={att}
                        req={req}
                        onPreview={(url, title) => {
                          setPreviewImage(url);
                          setPreviewTitle(title || att.name);
                          setPreviewHasError(false);
                        }}
                      />
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
                    <div className="col-span-2 sm:col-span-3">
                      <span className="text-slate-400">Assigned Staff</span>
                      {canAssign ? (
                        <div className="mt-1 space-y-1.5">
                          <select
                            value={req.assignedOperatorId || ''}
                            onChange={(e) => assignOperator(req.id, e.target.value)}
                            className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                          >
                            <option value="">Unassigned</option>
                            {operators.map((op) => (
                              <option key={op.id} value={op.id}>
                                {op.name} ({op.role.toUpperCase()})
                              </option>
                            ))}
                          </select>
                          {/* Show all auto-assigned handlers / authorizers */}
                          {(assignedMakers.length > 0 || assignedAuthorizersList.length > 0) && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {assignedMakers.map(h => (
                                <span key={h.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700">
                                  <span className="w-3 h-3 rounded-sm bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center text-[8px] font-black">H</span>
                                  {h.name}
                                </span>
                              ))}
                              {assignedAuthorizersList.map(a => (
                                <span key={a.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700">
                                  <span className="w-3 h-3 rounded-sm bg-violet-600 dark:bg-violet-500 text-white flex items-center justify-center text-[8px] font-black">A</span>
                                  {a.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-1">
                          {(assignedMakers.length > 0 || assignedAuthorizersList.length > 0) ? (
                            <div className="flex flex-wrap gap-1.5">
                              {assignedMakers.map(h => (
                                <span key={h.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700">
                                  <span className="w-3 h-3 rounded-sm bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center text-[8px] font-black">H</span>
                                  {h.name}
                                </span>
                              ))}
                              {assignedAuthorizersList.map(a => (
                                <span key={a.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700">
                                  <span className="w-3 h-3 rounded-sm bg-violet-600 dark:bg-violet-500 text-white flex items-center justify-center text-[8px] font-black">A</span>
                                  {a.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                              {req.assignedOperatorName || 'Unassigned'}
                            </span>
                          )}
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
            className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setPreviewImage(null)}
          >
            <div
              className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 p-3 shadow-2xl flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Top Bar */}
              <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-white text-xs">
                <div className="flex items-center gap-2 truncate pr-4">
                  <Paperclip className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="font-semibold truncate">{previewTitle}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={previewImage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-[11px]"
                    title="Open full size in new window"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open</span>
                  </a>
                  <button
                    onClick={() => setPreviewImage(null)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600/80 text-slate-300 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Preview Body */}
              {previewHasError ? (
                <div className="p-8 text-center text-slate-300 flex flex-col items-center gap-3 my-auto max-w-md">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Attachment Preview Unavailable</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      The remote storage file could not be loaded directly (HTTP 404 / bucket restricted). You can try opening the direct link below.
                    </p>
                  </div>
                  <a
                    href={previewImage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-lg transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Open Remote Storage Link</span>
                  </a>
                </div>
              ) : (
                <img
                  src={previewImage}
                  alt="Enlarged proof"
                  onError={() => setPreviewHasError(true)}
                  className="max-h-[80vh] max-w-full object-contain mx-auto rounded-lg"
                />
              )}
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
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 active:scale-95 disabled:opacity-50 text-white shadow-md shadow-rose-600/30 transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Submit Deletion Request
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Rejection Reason Dialog ── */}
      {showRejectDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => { setShowRejectDialog(false); setRejectionReasonInput(''); }}
          />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-rose-200 dark:border-rose-800 p-6 z-10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Reject Request</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ticket: <span className="font-mono font-semibold">{req.ticketNumber}</span>
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Rejection Message <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                autoFocus
                placeholder="Explain the reason for rejecting this request (visible to the client)..."
                value={rejectionReasonInput}
                onChange={e => setRejectionReasonInput(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setShowRejectDialog(false); setRejectionReasonInput(''); }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rejectionReasonInput.trim()}
                onClick={async () => {
                  await rejectRequest(req.id, rejectionReasonInput);
                  setShowRejectDialog(false);
                  setRejectionReasonInput('');
                  setActiveRequest(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 active:scale-95 disabled:opacity-50 text-white shadow-md shadow-rose-600/30 transition-all flex items-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
