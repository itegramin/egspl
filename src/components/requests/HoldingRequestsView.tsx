import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { HoldingDepositRequest, HoldingWithdrawRequest } from '../../types';
import { StatusBadge, PriorityBadge, DeletionPendingBadge } from '../common/Badge';
import { formatShortDateIST, formatDateIST } from '../../lib/dateUtils';
import { THEME_PRESETS } from '../../lib/theme';
import {
  WalletCards,
  ArrowDownRight,
  ArrowUpRight,
  Info,
  Plus,
  Download,
  Building,
  CheckCircle2,
  Clock,
  FileText,
  ShieldCheck,
  Search,
  ExternalLink,
  Inbox,
  RotateCcw
} from 'lucide-react';

export const HoldingRequestsView: React.FC = () => {
  const {
    requests,
    setActiveRequest,
    openCreateModal,
    triggerExportCSV,
    permissions,
    themeConfig,
  } = useApp();
  const { user } = useAuth();

  // Resolve theme primary color for dynamic styling
  const activeHex =
    themeConfig.preset === 'custom'
      ? themeConfig.customPrimaryHex
      : THEME_PRESETS[themeConfig.preset as keyof typeof THEME_PRESETS]?.primaryHex || '#059669';

  const [activeTab, setActiveTab] = useState<'all' | 'deposits' | 'withdrawals'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Visible requests for current user
  const userVisibleReqs = requests.filter(
    r => (user.role !== 'client' || r.clientId === user.id) && (r.type === 'deposit' || r.type === 'withdraw')
  );

  const deposits = userVisibleReqs.filter(r => r.type === 'deposit') as HoldingDepositRequest[];
  const withdrawals = userVisibleReqs.filter(r => r.type === 'withdraw') as HoldingWithdrawRequest[];

  const totalDepositUSD = deposits.reduce((acc, c) => acc + (c.amount || 0), 0);
  const totalWithdrawUSD = withdrawals.reduce((acc, c) => acc + (c.amount || 0), 0);
  const pendingCount = userVisibleReqs.filter(r => r.status === 'pending').length;

  const displayList = userVisibleReqs
    .filter(r => {
      if (activeTab === 'deposits') return r.type === 'deposit';
      if (activeTab === 'withdrawals') return r.type === 'withdraw';
      return true;
    })
    .filter(r => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.ticketNumber.toLowerCase().includes(q) ||
        r.clientName.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        (r.type === 'deposit' && (
          ((r as HoldingDepositRequest).transactionReferenceId || '').toLowerCase().includes(q) ||
          ((r as HoldingDepositRequest).branchCode || '').toLowerCase().includes(q)
        )) ||
        (r.type === 'withdraw' && ((r as HoldingWithdrawRequest).beneficiaryAccountNumberOrAddress || '').toLowerCase().includes(q))
      );
    });

  const canCreate = user?.role === 'client' && (permissions[user?.role || 'client']?.canCreateRequest ?? true);

  return (
    <div id="holding-requests-view" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="p-2 rounded-xl"
              style={{
                backgroundColor: `color-mix(in srgb, ${activeHex} 12%, transparent)`,
                color: activeHex,
              }}
            >
              <WalletCards className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Limit (Holding) Update
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Limit (Holding) fulfillment queue for client holding accounts.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {canCreate && (
            <div className="flex items-center gap-2">
              <button
                id="log-deposit-slip-btn"
                onClick={() => openCreateModal('deposit')}
                className="px-3.5 py-2 rounded-xl text-white text-xs sm:text-sm font-bold shadow-md flex items-center gap-1.5 transition-all active:scale-98"
                style={{ backgroundColor: activeHex, boxShadow: `0 4px 14px -3px ${activeHex}40` }}
              >
                <ArrowDownRight className="w-4 h-4" />
                <span>Deposit Update</span>
              </button>

              <button
                id="request-withdraw-btn"
                onClick={() => openCreateModal('withdraw')}
                className="px-3.5 py-2 rounded-xl text-white text-xs sm:text-sm font-bold shadow-md flex items-center gap-1.5 transition-all active:scale-98"
                style={{ backgroundColor: activeHex, boxShadow: `0 4px 14px -3px ${activeHex}40` }}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Withdraw Request</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'all'
              ? 'text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            style={activeTab === 'all' ? { backgroundColor: activeHex } : undefined}
          >
            All Limit Requests ({userVisibleReqs.length})
          </button>
          <button
            onClick={() => setActiveTab('deposits')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${activeTab === 'deposits'
              ? 'text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            style={activeTab === 'deposits' ? { backgroundColor: activeHex } : undefined}
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            Deposits ({deposits.length})
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${activeTab === 'withdrawals'
              ? 'text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            style={activeTab === 'withdrawals' ? { backgroundColor: activeHex } : undefined}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Withdrawals ({withdrawals.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search wire ref, amount, client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {(activeTab !== 'all' || searchQuery.trim()) && (
            <button
              onClick={() => {
                setActiveTab('all');
                setSearchQuery('');
              }}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Holding Requests List / Empty State */}
      {displayList.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
            No limit (holding) requests found
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1">
            {searchQuery.trim() || activeTab !== 'all'
              ? 'No deposit or withdrawal requests match your search filter.'
              : 'There are no active deposit or withdrawal requests in your queue.'}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            {(searchQuery.trim() || activeTab !== 'all') && (
              <button
                onClick={() => {
                  setActiveTab('all');
                  setSearchQuery('');
                }}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3 h-3" />
                Clear Filters
              </button>
            )}
            {canCreate && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openCreateModal('deposit')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors flex items-center gap-1"
                  style={{ backgroundColor: activeHex }}
                >
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  Deposit Update
                </button>
                <button
                  onClick={() => openCreateModal('withdraw')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors flex items-center gap-1"
                  style={{ backgroundColor: activeHex }}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  Withdraw Request
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-1 gap-2">
          {displayList.map(item => {
            const isDeposit = item.type === 'deposit';
            const dep = item as HoldingDepositRequest;
            const wdr = item as HoldingWithdrawRequest;

            return (
              <div
                key={item.id}
                onClick={() => setActiveRequest(item)}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className=''>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {item.ticketNumber}
                      </span>
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${activeHex} 12%, transparent)`,
                          color: activeHex,
                        }}
                      >
                        {isDeposit ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                        {isDeposit ? 'Deposit Update' : 'Withdrawal'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {formatShortDateIST(item.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {item.deleteRequested && <DeletionPendingBadge />}
                      <StatusBadge status={item.status} />
                    </div>
                  </div>
                  <div className='grid grid-cols-2 gap-2'>
                    <div>
                      <div className="text-xl font-extrabold text-slate-900 dark:text-white">
                        {isDeposit ? dep.currency : wdr.currency} {(isDeposit ? dep.amount : wdr.amount)?.toLocaleString()}
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {item.description}
                      </div>
                    </div>

                    {/* Proof & Reference detail */}
                    <div className="p-2.5 rounded-xl text-xs space-y-1">
                      {isDeposit ? (
                        <>
                          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                            <span className="text-slate-400">Method:</span>
                            <span className="font-semibold capitalize">
                              {dep.depositMethod === 'bank_deposit' ? 'Cash Deposit' : dep.depositMethod?.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          {dep.branchCode && (
                            <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                              <span className="text-slate-400">Branch Code:</span>
                              <span className="font-mono font-medium truncate max-w-45">{dep.branchCode}</span>
                            </div>
                          )}
                          {dep.transactionReferenceId && (
                            <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                              <span className="text-slate-400">
                                {dep.depositMethod === 'bank_deposit' ? 'Ref No:' : 'Txn / UTR:'}
                              </span>
                              <span className="font-mono font-medium truncate max-w-45">{dep.transactionReferenceId}</span>
                            </div>
                          )}
                          {dep.depositDate && (
                            <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                              <span className="text-slate-400">Deposit Date:</span>
                              <span className="font-mono text-slate-500">{formatDateIST(dep.depositDate)}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-end gap-1 text-slate-600 dark:text-slate-300">
                            <span className="text-slate-400">Beneficiary:</span>
                            <span className="font-semibold truncate max-w-45">{wdr.beneficiaryAccountName}</span>
                          </div>
                          <div className="flex items-center justify-end gap-1 text-slate-600 dark:text-slate-300">
                            <span className="text-slate-400">Account/IBAN:</span>
                            <span className="font-mono font-medium truncate max-w-45">{wdr.beneficiaryAccountNumberOrAddress}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-1 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-medium text-slate-600 dark:text-slate-300 truncate max-w-37.5">
                    {item.clientName} ({item.clientCompany || 'Client'})
                  </span>
                  <span
                    className="inline-flex items-center gap-1 font-semibold group-hover:underline"
                    style={{ color: activeHex }}
                  >
                    Inspect Details <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
