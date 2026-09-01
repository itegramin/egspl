import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { uploadAttachmentsToSupabase } from '../../lib/supabase';
import { AmountInWords } from '../common/AmountInWords';
import { formatAmountInWords } from '../../lib/indianCurrency';
import { RequestType, RequestPriority, SupportTicket, HoldingDepositRequest, HoldingWithdrawRequest } from '../../types';
import {
  X,
  UploadCloud,
  FileText,
  Trash2,
  HelpCircle,
  ArrowDownRight,
  ArrowUpRight,
  Info,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AttachedFile {
  name: string;
  size: number;
  type: string;
  url: string;
  file?: File;
}

export const CreateRequestModal: React.FC = () => {
  const { isCreateModalOpen, setIsCreateModalOpen, initialCreateType, createSupportTicket, createHoldingDeposit, createHoldingWithdraw, setActiveRequest, toast } = useApp();
  const { user, session, isAuthenticated } = useAuth();
  const hasValidSession = !!session || (isAuthenticated && !!user);

  const [activeTab, setActiveTab] = useState<RequestType>(initialCreateType || 'support');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Common attachments state
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Support Ticket Form State
  const [supportTitle, setSupportTitle] = useState('');
  const [supportCategory, setSupportCategory] = useState<SupportTicket['category']>('matm');
  const [supportPriority, setSupportPriority] = useState<RequestPriority>('medium');
  const [remote, setRemote] = useState<SupportTicket['remoteId']>('');
  const [supportDesc, setSupportDesc] = useState('');

  // Deposit Form State
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [depositCurrency, setDepositCurrency] = useState('INR');
  const [depositMethod, setDepositMethod] = useState<HoldingDepositRequest['depositMethod']>('bank_deposit');
  const [depositTxRef, setDepositTxRef] = useState('');
  const [depositBranchCode, setDepositBranchCode] = useState('');
  const [depositSender, setDepositSender] = useState(user.name);
  const [kioskId, setKioskId] = useState(user.kioskId || '');
  const [depositDate, setDepositDate] = useState(new Date().toISOString().split('T')[0]);
  const [depositDesc, setDepositDesc] = useState('');

  // Withdraw Form State
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawCurrency, setWithdrawCurrency] = useState(user.currency || 'INR');
  const [withdrawMethod, setWithdrawMethod] = useState<HoldingWithdrawRequest['withdrawMethod']>('bank_transfer');
  const [beneficiaryName, setBeneficiaryName] = useState<string>(user.companyName || user.name);
  const [beneficiaryAccount, setBeneficiaryAccount] = useState<string>(user.account);
  const [showBeneficiaryAccount, setShowBeneficiaryAccount] = useState<boolean>(false);
  const [bankName, setBankName] = useState<string>(user.bank);
  const [branchCode, setBranchCode] = useState<string>(user.ifsc);
  const [ifscCode, setIfscCode] = useState<string>(user.ifsc);
  const [withdrawReason, setWithdrawReason] = useState<string>('');
  const [withdrawDesc, setWithdrawDesc] = useState<string>('');

  // Sync form states with user profile and modal open
  React.useEffect(() => {
    if (initialCreateType) setActiveTab(initialCreateType);
    if (user && isCreateModalOpen) {
      setDepositSender(user.name || '');
      setKioskId(user.kioskId || '');
      setBeneficiaryName(user.companyName || user.name || '');
      setBeneficiaryAccount(user.account || '');
      setBankName(user.bank || '');
      setBranchCode(user.ifsc || '');
      setIfscCode(user.ifsc || '');
    }
  }, [initialCreateType, isCreateModalOpen, user]);

  if (!isCreateModalOpen) return null;

  // File Upload Handlers (Supports Drag & Drop and Manual Selection)
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);

    const maxFileSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain'];

    Array.from(files).forEach(file => {
      if (file.size > maxFileSize) {
        setUploadError(`File "${file.name}" exceeds maximum allowed size of 10MB.`);
        return;
      }
      if (!allowedTypes.includes(file.type) && !file.name.endsWith('.pdf')) {
        setUploadError(`File type for "${file.name}" is not supported. Please upload PNG, JPG, or PDF.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setAttachments(prev => [
          ...prev,
          {
            name: file.name,
            size: file.size,
            type: file.type,
            url: dataUrl,
            file,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setSupportTitle('');
    setSupportCategory('matm');
    setSupportPriority('medium');
    setRemote('');
    setSupportDesc('');
    setDepositAmount('');
    setDepositTxRef('');
    setDepositBranchCode('');
    setDepositDesc('');
    setWithdrawAmount('');
    setKioskId(user.kioskId || '');
    setBeneficiaryName(user.companyName || user.name || '');
    setBeneficiaryAccount(user.account || '');
    setBankName(user.bank || '');
    setIfscCode(user.ifsc || '');
    setWithdrawReason('');
    setWithdrawDesc('');
    setAttachments([]);
    setUploadError(null);
  };

  const handleClose = () => {
    resetForm();
    setIsCreateModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Block submission if there is no valid live auth session
    if (!hasValidSession) {
      toast('Your session has expired or is invalid. Please sign in again before submitting.', 'error');
      return;
    }

    // Attachments are mandatory for support & deposit requests (per product rules).
    const requiresAttachment = activeTab === 'support' || activeTab === 'deposit';
    if (requiresAttachment && attachments.length === 0) {
      setUploadError('Attachment is required. Please upload at least one file (screenshot or document).');
      toast('An attachment is required for this request type.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload selected files to Supabase Storage (degrades to local preview on failure).
      let uploadedAttachments = attachments;
      try {
        const ownerId = user?.id || '';
        const uploaded = await uploadAttachmentsToSupabase(ownerId, attachments);
        if (uploaded.length > 0) uploadedAttachments = uploaded;
      } catch {
        // Upload helper already self-degrades; keep the in-memory previews.
      }

      if (activeTab === 'support') {
        if (!supportTitle.trim()) {
          toast('Please enter a ticket title.', 'error');
          setIsSubmitting(false);
          return;
        }
        const newReq = await createSupportTicket({
          title: supportTitle.trim(),
          description: supportDesc.trim() || 'No additional technical notes provided.',
          category: supportCategory,
          priority: supportPriority,
          remoteId: remote,
          browserInfo: navigator.userAgent,
          attachments: uploadedAttachments,
        });
        handleClose();
        setActiveRequest(newReq);
      } else if (activeTab === 'deposit') {
        const amt = parseFloat(depositAmount);
        if (isNaN(amt) || amt <= 0) {
          toast('Please enter a valid deposit amount.', 'error');
          setIsSubmitting(false);
          return;
        }
        if (depositMethod === 'bank_deposit' && !depositBranchCode.trim()) {
          toast('Please enter the branch code.', 'error');
          setIsSubmitting(false);
          return;
        }
        if ((depositMethod === 'upi' || depositMethod === 'imps') && !depositTxRef.trim()) {
          toast('Please enter the transaction reference / UTR number.', 'error');
          setIsSubmitting(false);
          return;
        }

        // const txRef = depositMethod === 'bank_deposit'
        //   ? (depositTxRef.trim() || `DEP-${depositBranchCode.trim()}-${Date.now().toString().slice(-4)}`)
        //   : depositTxRef.trim();

        const newReq = await createHoldingDeposit({
          amount: amt,
          amountInWords: formatAmountInWords(amt, { currency: depositCurrency }),
          currency: depositCurrency,
          depositMethod,
          transactionReferenceId: depositTxRef,
          senderAccountName: depositSender.trim() || user.name,
          kioskId: kioskId.trim() || user.kioskId,
          branchCode: depositBranchCode.trim(),
          depositDate: depositDate || new Date().toISOString().split('T')[0],
          description: depositDesc.trim() || `Deposit update request of ${depositCurrency} ${amt.toLocaleString()} (${formatAmountInWords(amt, { currency: depositCurrency })}) via ${depositMethod.toUpperCase()}`,
          attachments: uploadedAttachments,
        });
        handleClose();
        setActiveRequest(newReq);
      } else if (activeTab === 'withdraw') {
        const amt = parseFloat(withdrawAmount);
        if (isNaN(amt) || amt <= 0) {
          toast('Please enter a valid withdrawal amount.', 'error');
          setIsSubmitting(false);
          return;
        }
        if (!beneficiaryName.trim() || !beneficiaryAccount) {
          toast('Please provide beneficiary name and account number.', 'error');
          setIsSubmitting(false);
          return;
        }
        const newReq = await createHoldingWithdraw({
          amount: amt,
          amountInWords: formatAmountInWords(amt, { currency: withdrawCurrency }),
          currency: withdrawCurrency,
          withdrawMethod,
          beneficiaryAccountName: beneficiaryName.trim(),
          kioskId: kioskId.trim() || user.kioskId,
          beneficiaryAccountNumberOrAddress: beneficiaryAccount,
          bankNameOrNetwork: bankName.trim(),
          swiftOrIban: ifscCode.trim(),
          reason: withdrawReason.trim(),
          description: withdrawDesc.trim() || `Holding withdrawal request of ${withdrawCurrency} ${amt.toLocaleString()} (${formatAmountInWords(amt, { currency: withdrawCurrency })}) to ${beneficiaryName}`,
          attachments: uploadedAttachments,
        });
        handleClose();
        setActiveRequest(newReq);
      }
    } catch (err: any) {
      console.error('Failed to create request:', err);
      toast(err.message || 'Failed to submit request', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          id="create-request-modal-content"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative z-10 w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Submit Client Service Request
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Client: <span className="font-semibold text-slate-700 dark:text-slate-200">{user.name}</span> ({user.companyName || user.email})
              </p>
            </div>
            <button
              id="close-create-modal-btn"
              onClick={handleClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Session Warning Banner — shown when auth session is missing/expired */}
          {!hasValidSession && (
            <div className="flex items-start gap-3 px-5 py-3 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                  Session Expired — Submission Blocked
                </p>
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
                  Your auth session is no longer valid. Please sign out and sign back in, then try again.
                </p>
              </div>
            </div>
          )}

          {/* Type Selector Tabs */}
          <div className="grid grid-cols-3 p-2 bg-slate-100 dark:bg-slate-800/80 gap-1.5 border-b border-slate-200 dark:border-slate-800">
            <button
              id="tab-select-support"
              type="button"
              onClick={() => setActiveTab('support')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${activeTab === 'support'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Technical Support</span>
            </button>

            <button
              id="tab-select-deposit"
              type="button"
              onClick={() => setActiveTab('deposit')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${activeTab === 'deposit'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <ArrowDownRight className="w-4 h-4" />
              <span>Holding Deposit</span>
            </button>

            <button
              id="tab-select-withdraw"
              type="button"
              onClick={() => setActiveTab('withdraw')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${activeTab === 'withdraw'
                ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Holding Withdraw</span>
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Technical Support Tab Fields */}
            {activeTab === 'support' && (
              <div className="space-y-4 animate-in fade-in">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Ticket Summary / Issue Title *
                  </label>
                  <input
                    id="support-ticket-title-input"
                    type="text"
                    required
                    placeholder="e.g. Webhook signature failure or API latency spike..."
                    value={supportTitle}
                    onChange={(e) => setSupportTitle(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Issue Category
                    </label>
                    <select
                      id="support-ticket-category-select"
                      value={supportCategory}
                      onChange={(e) => setSupportCategory(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="matm">mATM</option>
                      <option value="morpho">Morpho</option>
                      <option value="passbook_printer">Passbook Printer</option>
                      <option value="new_setup">New Installation</option>
                      <option value="upgrade_services">Upgrade Services</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Priority Level
                    </label>
                    <select
                      id="support-ticket-priority-select"
                      value={supportPriority}
                      onChange={(e) => setSupportPriority(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold"
                    >
                      <option value="low">Low - Routine inquiry</option>
                      <option value="medium">Medium - Standard issue</option>
                      <option value="high">High - Business impact</option>
                      <option value="urgent">Urgent - Outage / Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Remote Support
                    </label>
                    <input
                      id="support-ticket-remote-input"
                      value={remote}
                      onChange={(e) => setRemote(e.target.value as any)}
                      placeholder='Remote ID'
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Detailed Description & Steps to Reproduce
                  </label>
                  <textarea
                    id="support-ticket-desc-input"
                    rows={4}
                    placeholder="Provide details on what happened, expected behavior, and error messages..."
                    value={supportDesc}
                    onChange={(e) => setSupportDesc(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-y"
                  />
                </div>
              </div>
            )}

            {/* Holding Deposit Tab Fields */}
            {activeTab === 'deposit' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="p-3 rounded-xl bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-800/60 text-yellow-900 dark:text-yellow-300 text-xs flex items-start gap-2.5">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-yellow-600 dark:text-yellow-400" />
                  <div className='text-yellow-700 dark:text-yellow-300 '>
                    <span className="font-semibold">Notice:</span> You must upload the bank transfer or deposit recipt to update your holding ledger balance.
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Deposit Amount *
                    </label>
                    <div className="relative">
                      <input
                        id="deposit-amount-input"
                        type="number"
                        min="1"
                        step="any"
                        required
                        placeholder='Enter deposit amount'
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        className="w-full pl-3.5 pr-20 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      <select
                        value={depositCurrency}
                        disabled
                        onChange={(e) => setDepositCurrency(e.target.value)}
                        className="absolute right-1 top-1 bottom-1 px-2 rounded bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 border-none"
                      >
                        <option value="INR">INR (₹)</option>
                      </select>
                    </div>
                    {depositAmount && parseFloat(depositAmount) > 0 ? (
                      <AmountInWords
                        amount={depositAmount}
                        currency={depositCurrency}
                        prefixLabel="Amount in Words:"
                        className="mt-2"
                      />
                    ) : null}
                  </div>

                  <div className='sm:col-span-2'>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Date Transferred
                    </label>
                    <input
                      type="date"
                      value={depositDate}
                      onChange={(e) => setDepositDate(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>


                <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                  <div className='sm:col-span-2'>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Transfer Method
                    </label>
                    <select
                      id="deposit-method-select"
                      value={depositMethod}
                      onChange={(e) => setDepositMethod(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="bank_deposit">Cash Deposit</option>
                      <option value="imps">IMPS</option>
                      <option value="upi">UPI</option>
                    </select>
                  </div>
                  {(depositMethod === 'upi' || depositMethod === 'imps') && (
                    <div className='sm:col-span-4'>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Reference # / Txn No *
                      </label>
                      <input
                        id="deposit-tx-ref-input"
                        type="text"
                        required
                        placeholder="Enter transaction number"
                        value={depositTxRef}
                        onChange={(e) => setDepositTxRef(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs sm:text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  )}
                  {depositMethod === 'bank_deposit' && (
                    <div className='sm:col-span-4'>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Branch Code *
                      </label>
                      <input
                        id="deposit-branch-code-input"
                        type="text"
                        required
                        placeholder="Enter branch code"
                        value={depositBranchCode}
                        onChange={(e) => setDepositBranchCode(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs sm:text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                <div className='grid grid-cols-1 sm:grid-cols-6 gap-3'>
                  <div className='sm:col-span-2'>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Kiosk ID
                    </label>
                    <input
                      id="deposit-kiosk-id-input"
                      type="text"
                      disabled
                      value={kioskId}
                      onChange={(e) => setKioskId(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className='sm:col-span-4'>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Sender Account / Remitter Name
                    </label>
                    <input
                      id="deposit-sender-input"
                      type="text"
                      disabled
                      value={depositSender}
                      onChange={(e) => setDepositSender(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Deposit Purpose / Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter deposit purpose or notes"
                    value={depositDesc}
                    onChange={(e) => setDepositDesc(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-y"
                  />
                </div>
              </div>
            )}

            {/* Holding Withdraw Tab Fields */}
            {activeTab === 'withdraw' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/60 text-violet-900 dark:text-violet-300 text-xs flex items-start gap-2.5">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-violet-600 dark:text-violet-400" />
                  <div>
                    <span className="font-semibold">Notice:</span> "Request withdrawal from your Holding balance, subject to approval based on available funds.
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Withdrawal Amount *
                    </label>
                    <div className="relative">
                      <input
                        id="withdraw-amount-input"
                        type="number"
                        min="1"
                        step="any"
                        required
                        placeholder="Enter Withdrawal Amount"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className="w-full pl-3.5 pr-20 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:outline-none"
                      />
                      <select
                        value={withdrawCurrency}
                        disabled
                        onChange={(e) => setWithdrawCurrency(e.target.value)}
                        className="absolute right-1 top-1 bottom-1 px-2 rounded bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 border-none"
                      >
                        <option value="INR">INR (₹)</option>
                      </select>
                    </div>
                    {withdrawAmount && parseFloat(withdrawAmount) > 0 ? (
                      <AmountInWords
                        amount={withdrawAmount}
                        currency={withdrawCurrency}
                        prefixLabel="Amount in Words:"
                        className="mt-2"
                      />
                    ) : null}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Payout Method
                    </label>
                    <select
                      id="withdraw-method-select"
                      value={withdrawMethod}
                      disabled
                      onChange={(e) => setWithdrawMethod(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:outline-none"
                    >
                      <option value="bank_deposit">Bank Transfer</option>
                      <option value="imps">IMPS</option>
                      <option value="upi">UPI</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Kiosk ID
                    </label>
                    <input
                      id="withdraw-kiosk-id-input"
                      type="text"
                      placeholder="e.g. KIOSK-091"
                      value={kioskId}
                      disabled
                      required
                      onChange={(e) => setKioskId(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Beneficiary Legal Name *
                    </label>
                    <input
                      id="beneficiary-name-input"
                      type="text"
                      required
                      disabled
                      placeholder="Beneficiary Account Name"
                      value={beneficiaryName}
                      onChange={(e) => setBeneficiaryName(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. State Bank of India"
                      value={bankName}
                      disabled
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. SBIN0001234"
                      value={ifscCode}
                      required
                      disabled
                      onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2 text-xs sm:text-sm font-mono uppercase rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Account Number *
                      </label>
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                        <Lock className="w-2.5 h-2.5" />
                        Masked
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        id="beneficiary-account-input"
                        type={showBeneficiaryAccount ? 'text' : 'password'}
                        required
                        disabled
                        placeholder="e.g. 123456789012"
                        value={beneficiaryAccount}
                        onChange={(e) => setBeneficiaryAccount(e.target.value)}
                        className="w-full pl-3.5 pr-10 py-2 text-xs sm:text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowBeneficiaryAccount(!showBeneficiaryAccount)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-colors"
                        title={showBeneficiaryAccount ? 'Mask account number' : 'Show account number'}
                      >
                        {showBeneficiaryAccount ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Description / Purpose
                  </label>
                  <input
                    type="text"
                    value={withdrawReason}
                    placeholder="Enter purpose or reference notes"
                    onChange={(e) => setWithdrawReason(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* File Upload Section for support and deposit only(Screenshots, Wire Slips, Invoices) */}
            {(activeTab === 'support' || activeTab === 'deposit') && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Attachments & Proofs (Screenshots, PDFs, Receipts)
                  {(activeTab === 'support' || activeTab === 'deposit') && (
                    <span className="ml-1 text-rose-500 dark:text-rose-400">* Required</span>
                  )}
                </label>

                {/* Drag & Drop Area */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleFiles(e.dataTransfer.files);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-xl p-4 sm:p-5 text-center cursor-pointer bg-slate-50/50 dark:bg-slate-800/40 transition-colors"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    onChange={(e) => handleFiles(e.target.files)}
                    className="hidden"
                  />
                  <UploadCloud className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-500 mb-1.5" />
                  <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    PNG, JPG, WebP or PDF (max. 10MB per file)
                  </p>
                </div>

                {uploadError && (
                  <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 mt-2 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* Uploaded Files Preview Grid */}
                {attachments.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {attachments.map((file, idx) => (
                      <div
                        key={idx}
                        className="relative group p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center gap-2 overflow-hidden"
                      >
                        {file.type.startsWith('image/') ? (
                          <img
                            src={file.url}
                            alt={file.name}
                            className="w-10 h-10 object-cover rounded bg-slate-100 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                            {file.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {(file.size / 1024).toFixed(0)} KB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeAttachment(idx);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Remove file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                id="submit-request-confirm-btn"
                type="submit"
                disabled={!hasValidSession || isSubmitting}
                className={`px-5 py-2 text-xs sm:text-sm font-semibold text-white rounded-lg shadow-md transition-all active:scale-98 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${activeTab === 'support'
                  ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                  : activeTab === 'deposit'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                    : 'bg-violet-600 hover:bg-violet-700 shadow-violet-600/20'
                  }`}
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
