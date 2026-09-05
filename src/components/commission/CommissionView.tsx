import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import {
  aggregateCspStatements,
  generateCommissionCsv,
  generateCommissionSummaryReportCsv,
} from '../../lib/commissionCalculator';
import { CspCommissionStatement, CommissionSplitConfig, TdsConfig, TransactionTypeDefinition } from '../../types/commission.type';
import { formatIndianCurrency, formatAmountInWords } from '../../lib/indianCurrency';
import { CommissionStatementModal } from './CommissionStatementModal';
import { ImportCommissionModal } from './ImportCommissionModal';
import { ProductOverrideModal } from './ProductOverrideModal';
import {
  Receipt,
  Download,
  Upload,
  Search,
  Filter,
  Sliders,
  Calendar,
  Building2,
  TrendingUp,
  Percent,
  CheckCircle2,
  FileText,
  Eye,
  Plus,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  PieChart as PieIcon,
  BarChart3,
  ArrowUpRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';

export const CommissionView: React.FC = () => {
  const {
    commissionRecords,
    commissionSplitConfig,
    tdsConfig,
    transactionTypes,
    cspCategories,
    updateSplitConfig,
    updateTdsConfig,
    updateCspCategory,
    addTransactionType,
    isDarkMode,
  } = useApp();
  const { user, allUsers } = useAuth();

  const isAdmin = user.role === 'admin';
  const isStaff = user.role === 'admin' || user.role === 'operator';
  const isClient = user.role === 'client';

  // Tabs for Admin
  const [adminTab, setAdminTab] = useState<'directory' | 'rules'>('directory');

  // Filters
  const [periodFilter, setPeriodFilter] = useState<string>('September 2026');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [circleFilter, setCircleFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Selected statement for detailed modal
  const [selectedStatement, setSelectedStatement] = useState<CspCommissionStatement | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideModalInitialType, setOverrideModalInitialType] = useState<string | undefined>(undefined);

  // Rural & Urban category definitions
  const ruralCategory = useMemo(() => cspCategories.find(c => c.code === 'rural'), [cspCategories]);
  const urbanCategory = useMemo(() => cspCategories.find(c => c.code === 'urban'), [cspCategories]);

  // Split & TDS rules edit states
  const [ruralSplitInput, setRuralSplitInput] = useState<number>(() => ruralCategory?.cspSharePercent ?? 75);
  const [urbanSplitInput, setUrbanSplitInput] = useState<number>(() => urbanCategory?.cspSharePercent ?? 70);
  const [tdsRateInput, setTdsRateInput] = useState(tdsConfig.currentRate);

  useEffect(() => {
    if (ruralCategory) setRuralSplitInput(ruralCategory.cspSharePercent);
  }, [ruralCategory]);

  useEffect(() => {
    if (urbanCategory) setUrbanSplitInput(urbanCategory.cspSharePercent);
  }, [urbanCategory]);

  // CSP Statements Directory pagination
  const [dirPage, setDirPage] = useState(1);
  const [dirPageSize, setDirPageSize] = useState(25);

  // Distinct periods available in raw records
  const availablePeriods = useMemo(() => {
    const set = new Set<string>();
    commissionRecords.forEach(r => {
      if (r.period) set.add(r.period);
    });
    const arr = Array.from(set);
    if (arr.length === 0) return ['September 2026', 'August 2026'];
    return arr.sort().reverse();
  }, [commissionRecords]);

  // Distinct years available in raw records
  const availableYears = useMemo(() => {
    const set = new Set<number>();
    commissionRecords.forEach((r) => {
      const y =
        r.year != null
          ? r.year
          : r.period && !isNaN(Number(r.period.split(' ')[1]))
          ? Number(r.period.split(' ')[1])
          : null;
      if (y) set.add(y);
    });
    const arr = Array.from(set).sort((a, b) => b - a);
    return arr.length > 0 ? arr : [2026, 2025, 2024];
  }, [commissionRecords]);

  // Distinct months available in raw records
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    commissionRecords.forEach((r) => {
      const m = r.month || (r.period ? r.period.split(' ')[0] : null);
      if (m) set.add(m);
    });
    const monthOrder = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return Array.from(set).sort((a, b) => {
      const ai = monthOrder.indexOf(a);
      const bi = monthOrder.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [commissionRecords]);

  // Keep periodFilter synchronized to available records
  useEffect(() => {
    if (availablePeriods.length > 0 && periodFilter !== 'all') {
      const matchExists = commissionRecords.some(r => r.period === periodFilter);
      if (!matchExists) {
        setPeriodFilter(availablePeriods[0]);
      }
    }
  }, [availablePeriods, commissionRecords, periodFilter]);

  // Distinct circles
  const availableCircles = useMemo(() => {
    const map = new Map<string, string>();
    commissionRecords.forEach(r => {
      if (r.circle && r.circleName) {
        map.set(r.circle, r.circleName);
      }
    });
    return Array.from(map.entries()).map(([code, name]) => ({ code, name }));
  }, [commissionRecords]);

  // Aggregate statements for current period / month / year
  const allStatements = useMemo(() => {
    return aggregateCspStatements(
      commissionRecords,
      commissionSplitConfig,
      tdsConfig,
      periodFilter !== 'all' && monthFilter === 'all' && yearFilter === 'all' ? periodFilter : undefined,
      monthFilter !== 'all' ? monthFilter : undefined,
      yearFilter !== 'all' ? Number(yearFilter) : undefined,
      allUsers,
      cspCategories
    );
  }, [commissionRecords, commissionSplitConfig, tdsConfig, periodFilter, monthFilter, yearFilter, allUsers, cspCategories]);

  // If user is client, match by kioskId or show their first available statement
  const clientStatement = useMemo(() => {
    if (!isClient) return null;
    const userKiosk = (user.kioskId || '').trim().toLowerCase();

    // 1. Try matching by exact kioskId / cspCode
    if (userKiosk) {
      const match = allStatements.find(s => s.cspCode.toLowerCase() === userKiosk);
      if (match) return match;
    }

    // 2. Try matching by name or userId
    const nameMatch = allStatements.find(s =>
      s.cspName.toLowerCase().includes((user.name || '').toLowerCase()) ||
      s.cspCode.toLowerCase() === user.id.toLowerCase()
    );
    if (nameMatch) return nameMatch;

    // 3. Fallback to first statement so client demo is never empty
    return allStatements[0] || null;
  }, [isClient, user, allStatements]);

  // Admin filtered directory list
  const filteredStatements = useMemo(() => {
    return allStatements.filter(s => {
      if (circleFilter !== 'all' && s.circle !== circleFilter) return false;
      if (categoryFilter !== 'all') {
        const cat = (s.cspCategory || 'rural').toLowerCase();
        if (cat !== categoryFilter.toLowerCase()) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.cspCode.toLowerCase().includes(q) ||
          s.cspName.toLowerCase().includes(q) ||
          s.circleName.toLowerCase().includes(q) ||
          s.bcbfCode.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allStatements, circleFilter, categoryFilter, searchQuery]);

  // Directory pagination calculations
  const dirTotalPages = Math.max(1, Math.ceil(filteredStatements.length / dirPageSize));

  // Reset directory page when search, filter, period, month, year, or pageSize changes
  useEffect(() => {
    setDirPage(1);
  }, [searchQuery, circleFilter, categoryFilter, periodFilter, monthFilter, yearFilter, dirPageSize]);

  // Sliced paginated statements for directory table
  const paginatedStatements = useMemo(() => {
    const start = (dirPage - 1) * dirPageSize;
    return filteredStatements.slice(start, start + dirPageSize);
  }, [filteredStatements, dirPage, dirPageSize]);

  // Overall totals across current filtered set
  const totals = useMemo(() => {
    return filteredStatements.reduce(
      (acc, s) => ({
        raw: acc.raw + s.totalRawCommission,
        transaction: acc.transaction + (s.transactionCommission || 0),
        incentives: acc.incentives + (s.incentivesCommission || 0),
        rural: acc.rural + (s.ruralCommission || 0),
        cspGross: acc.cspGross + s.totalCspGrossCommission,
        tds: acc.tds + s.totalTdsDeducted,
        net: acc.net + s.totalNetPayable,
        corporate: acc.corporate + s.totalCorporateShare,
        txns: acc.txns + s.totalNumTxns,
      }),
      { raw: 0, transaction: 0, incentives: 0, rural: 0, cspGross: 0, tds: 0, net: 0, corporate: 0, txns: 0 }
    );
  }, [filteredStatements]);

  // Chart data for client
  const clientChartData = useMemo(() => {
    if (!clientStatement) return [];
    return clientStatement.breakdown.map(b => ({
      name: b.transactionType.length > 15 ? b.transactionType.slice(0, 14) + '…' : b.transactionType,
      net: b.netPayable,
      gross: b.cspGrossCommission,
      tds: b.tdsDeducted,
    }));
  }, [clientStatement]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316'];

  const handleSaveRuralSplit = async () => {
    const csp = Math.max(1, Math.min(99, Number(ruralSplitInput) || 75));
    const corp = 100 - csp;
    const existing = ruralCategory || {
      id: 'cat_rural',
      code: 'rural',
      name: 'Rural',
      description: 'Rural area Customer Service Points (75% base CSP share)',
      cspSharePercent: csp,
      corporateSharePercent: corp,
      isActive: true,
    };
    await updateCspCategory({ ...existing, cspSharePercent: csp, corporateSharePercent: corp });
    const updated: CommissionSplitConfig = {
      ...commissionSplitConfig,
      categorySplits: {
        ...commissionSplitConfig.categorySplits,
        rural: { cspPercent: csp, corporatePercent: corp },
        urban: {
          cspPercent: urbanCategory?.cspSharePercent || 70,
          corporatePercent: urbanCategory?.corporateSharePercent || 30,
        },
      },
      updatedAt: new Date().toISOString(),
      updatedBy: user.name || 'Admin',
    };
    await updateSplitConfig(updated);
  };

  const handleSaveUrbanSplit = async () => {
    const csp = Math.max(1, Math.min(99, Number(urbanSplitInput) || 70));
    const corp = 100 - csp;
    const existing = urbanCategory || {
      id: 'cat_urban',
      code: 'urban',
      name: 'Urban',
      description: 'Urban and Metro Customer Service Points (70% base CSP share)',
      cspSharePercent: csp,
      corporateSharePercent: corp,
      isActive: true,
    };
    await updateCspCategory({ ...existing, cspSharePercent: csp, corporateSharePercent: corp });
    const updated: CommissionSplitConfig = {
      ...commissionSplitConfig,
      categorySplits: {
        ...commissionSplitConfig.categorySplits,
        rural: {
          cspPercent: ruralCategory?.cspSharePercent || 75,
          corporatePercent: ruralCategory?.corporateSharePercent || 25,
        },
        urban: { cspPercent: csp, corporatePercent: corp },
      },
      updatedAt: new Date().toISOString(),
      updatedBy: user.name || 'Admin',
    };
    await updateSplitConfig(updated);
  };

  const handleSaveTdsConfig = async () => {
    const rate = Math.max(0, Math.min(50, Number(tdsRateInput) || 5.0));
    const updated: TdsConfig = {
      ...tdsConfig,
      currentRate: rate,
      updatedAt: new Date().toISOString(),
      updatedBy: user.name || 'Admin',
    };
    await updateTdsConfig(updated);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* Page Header Banner */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-bold">
              <Receipt className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-md">
              Banking Correspondent Finance
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 tracking-tight">
            Commission Reports & Payouts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {isClient
              ? `Monthly commission payout statement and Section 194H TDS breakdown for Kiosk ${clientStatement?.cspCode || user.kioskId || 'Portal'}`
              : 'Enterprise commission calculation engine, 70-30 CSP split configuration, TDS audits, and monthly statement publishing.'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period Selector */}
          <div className="relative">
            <select
              value={periodFilter}
              onChange={(e) => {
                const val = e.target.value;
                setPeriodFilter(val);
                if (val === 'all') {
                  setMonthFilter('all');
                  setYearFilter('all');
                } else {
                  const parts = val.trim().split(' ');
                  if (parts[0]) setMonthFilter(parts[0]);
                  if (parts[1] && !isNaN(Number(parts[1]))) setYearFilter(Number(parts[1]));
                }
              }}
              className="appearance-none pl-3 pr-8 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {availablePeriods.map(p => {
                const count = commissionRecords.filter(r => r.period === p).length;
                return (
                  <option key={p} value={p}>
                    {p} {count > 0 ? `(${count.toLocaleString()} txns)` : ''}
                  </option>
                );
              })}
              <option value="all">
                All Reporting Periods ({commissionRecords.length.toLocaleString()} txns)
              </option>
            </select>
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Admin Buttons */}
          {isAdmin && (
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Raw CSV</span>
            </button>
          )}

          {/* Client Statement Modal Trigger */}
          {isClient && clientStatement && (
            <button
              onClick={() => setSelectedStatement(clientStatement)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>View Official Slip</span>
            </button>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* CLIENT VIEW: Kiosk Operator Commission Dashboard */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isClient && clientStatement && (
        <div className="space-y-6">
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Net Payout Card */}
            <div className="p-5 rounded-2xl border-2 border-emerald-400 dark:border-emerald-600/80 bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-950/40 dark:to-teal-950/20 shadow-md">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider text-[11px]">
                  Net Payable to You
                </span>
                <span className="p-1 rounded-lg bg-emerald-200/60 dark:bg-emerald-800/40 text-emerald-800 dark:text-emerald-300">
                  <TrendingUp className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-400 mt-2">
                {formatIndianCurrency(clientStatement.totalNetPayable)}
              </div>
              <div className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300 mt-1 line-clamp-1" title={formatAmountInWords(clientStatement.totalNetPayable)}>
                {formatAmountInWords(clientStatement.totalNetPayable, { currency: 'INR' })}
              </div>
            </div>

            {/* Gross Share Card */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500 dark:text-slate-400 text-[11px]">
                  Gross Commission Share ({clientStatement.effectiveCspRate}%)
                </span>
                <span className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Percent className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                {formatIndianCurrency(clientStatement.totalCspGrossCommission)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Before 5% TDS Deduction
              </div>
            </div>

            {/* TDS Deducted Card */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500 dark:text-slate-400 text-[11px]">
                  TDS Withheld (5.0%)
                </span>
                <span className="p-1 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
                - {formatIndianCurrency(clientStatement.totalTdsDeducted)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Section 194H IT Act • Form 16A
              </div>
            </div>

            {/* Volume Card */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500 dark:text-slate-400 text-[11px]">
                  Total Transactions
                </span>
                <span className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <BarChart3 className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
                {clientStatement.totalNumTxns.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Bank Gross: {formatIndianCurrency(clientStatement.totalRawCommission)}
              </div>
            </div>
          </div>

          {/* Visual Chart & Breakdown Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Visual Recharts Bar Chart */}
            <div className="lg:col-span-1 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <PieIcon className="w-3.5 h-3.5 text-indigo-500" />
                    Earnings Distribution
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {clientStatement.period}
                  </span>
                </div>

                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={clientChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#f1f5f9'} />
                      <XAxis dataKey="name" angle={-25} textAnchor="end" tick={{ fontSize: 9, fill: isDarkMode ? '#94a3b8' : '#64748b' }} interval={0} />
                      <YAxis tick={{ fontSize: 9, fill: isDarkMode ? '#94a3b8' : '#64748b' }} tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(val: any) => [`₹ ${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 'Net Payout']}
                        contentStyle={{
                          backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                          borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                          borderRadius: '12px',
                          fontSize: '11px',
                        }}
                      />
                      <Bar dataKey="net" radius={[6, 6, 0, 0]}>
                        {clientChartData.map((_, i) => (
                          <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Top Service:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {clientStatement.breakdown[0]?.transactionType || 'AEPS'}
                </span>
              </div>
            </div>

            {/* Product-Wise Itemized Table */}
            <div className="lg:col-span-2 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Itemized Product Earnings
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Kiosk ID: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{clientStatement.cspCode}</span> • {clientStatement.circleName} Circle
                  </p>
                </div>
                <button
                  onClick={() => setSelectedStatement(clientStatement)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center gap-1 transition-all"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View Statement</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                      <th className="py-2.5 px-3">Transaction Type</th>
                      <th className="py-2.5 px-3 text-right">Txns</th>
                      <th className="py-2.5 px-3 text-right">Bank Gross</th>
                      <th className="py-2.5 px-3 text-center">Split</th>
                      <th className="py-2.5 px-3 text-right">TDS (5%)</th>
                      <th className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400 font-bold">
                        Net Payout
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {clientStatement.breakdown.map((b, i) => (
                      <tr key={i} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100">
                          {b.transactionType}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-500">
                          {b.numTxnsOrAvgBal.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {formatIndianCurrency(b.rawCommission)}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-indigo-600 dark:text-indigo-400 text-[11px]">
                          {b.cspSplitPercent}%
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-rose-600 dark:text-rose-400">
                          {formatIndianCurrency(b.tdsDeducted)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatIndianCurrency(b.netPayable)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 dark:bg-slate-800 font-black border-t-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                      <td className="py-2.5 px-3 uppercase text-[11px]">Total Net Payout</td>
                      <td className="py-2.5 px-3 text-right font-mono">{clientStatement.totalNumTxns.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatIndianCurrency(clientStatement.totalRawCommission)}</td>
                      <td className="py-2.5 px-3 text-center text-indigo-600 font-bold">{clientStatement.effectiveCspRate}%</td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-600">{formatIndianCurrency(clientStatement.totalTdsDeducted)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-black">
                        {formatIndianCurrency(clientStatement.totalNetPayable)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* If client has no records in current period */}
      {isClient && !clientStatement && (
        <div className="p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <Receipt className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            No Commission Records Found for {periodFilter}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Your CSP account (<span className="font-mono font-bold">{user.kioskId || user.id}</span>) does not have published transaction data for this reporting cycle yet. Please select another month above.
          </p>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ADMIN & STAFF VIEW: Multi-CSP Directory & Rules Configuration */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isStaff && (
        <div className="space-y-6">
          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <button
              onClick={() => setAdminTab('directory')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                adminTab === 'directory'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>CSP Statements Directory ({filteredStatements.length})</span>
            </button>

            <button
              onClick={() => setAdminTab('rules')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                adminTab === 'rules'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Split & TDS Configuration</span>
            </button>
          </div>

          {/* ── Sub-Tab 1: Directory ── */}
          {adminTab === 'directory' && (
            <div className="space-y-4">
              {/* Macro KPI Summary - Exactly matching the standard 9-column model */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    TRANSACTION
                  </div>
                  <div className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-200 mt-0.5 font-mono">
                    {formatIndianCurrency(totals.transaction)}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    INCENTIVES
                  </div>
                  <div className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-200 mt-0.5 font-mono">
                    {formatIndianCurrency(totals.incentives)}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    RURAL
                  </div>
                  <div className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-200 mt-0.5 font-mono">
                    {formatIndianCurrency(totals.rural)}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 shadow-xs">
                  <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    TOTAL (GROSS)
                  </div>
                  <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-0.5 font-mono">
                    {formatIndianCurrency(totals.raw)}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 shadow-xs">
                  <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                    TDS (5%)
                  </div>
                  <div className="text-sm sm:text-base font-black text-rose-600 dark:text-rose-400 mt-0.5 font-mono">
                    - {formatIndianCurrency(totals.tds)}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs">
                  <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    PAYABLE TO CSP
                  </div>
                  <div className="text-sm sm:text-base font-black text-indigo-700 dark:text-indigo-300 mt-0.5 font-mono">
                    {formatIndianCurrency(totals.cspGross)}
                  </div>
                </div>

                <div className="p-3 rounded-xl border-2 border-emerald-400 dark:border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/40 shadow-xs col-span-2 sm:col-span-1">
                  <div className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                    NET PAYABLE
                  </div>
                  <div className="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-400 mt-0.5 font-mono">
                    {formatIndianCurrency(totals.net)}
                  </div>
                </div>
              </div>

              {/* Filters Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by CSP Code, Name, Circle..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  {/* Month Filter */}
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-semibold text-slate-500">Month:</span>
                    <select
                      value={monthFilter}
                      onChange={(e) => {
                        const m = e.target.value;
                        setMonthFilter(m);
                        if (m !== 'all' && yearFilter !== 'all') {
                          setPeriodFilter(`${m} ${yearFilter}`);
                        } else {
                          setPeriodFilter('all');
                        }
                      }}
                      className="px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium focus:outline-none cursor-pointer"
                    >
                      <option value="all">All Months</option>
                      {availableMonths.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Year Filter */}
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-semibold text-slate-500">Year:</span>
                    <select
                      value={yearFilter}
                      onChange={(e) => {
                        const val = e.target.value;
                        const y = val === 'all' ? 'all' : Number(val);
                        setYearFilter(y);
                        if (y !== 'all' && monthFilter !== 'all') {
                          setPeriodFilter(`${monthFilter} ${y}`);
                        } else {
                          setPeriodFilter('all');
                        }
                      }}
                      className="px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium focus:outline-none cursor-pointer"
                    >
                      <option value="all">All Years</option>
                      {availableYears.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Circle Filter */}
                  <select
                    value={circleFilter}
                    onChange={(e) => setCircleFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Circles</option>
                    {availableCircles.map(c => (
                      <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                    ))}
                  </select>

                  {/* CSP Category Filter */}
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                  >
                    <option value="all">All CSP Categories</option>
                    <option value="rural">Rural CSPs ({ruralCategory?.cspSharePercent || 75}%)</option>
                    <option value="urban">Urban CSPs ({urbanCategory?.cspSharePercent || 70}%)</option>
                  </select>

                  <div className="flex items-center gap-1 text-xs text-slate-500 shrink-0">
                    <span className="text-[11px]">Show</span>
                    <select
                      value={dirPageSize}
                      onChange={(e) => setDirPageSize(Number(e.target.value))}
                      className="px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold focus:outline-none cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span className="text-[11px]">/ page</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (filteredStatements.length > 0) {
                        const csv = generateCommissionSummaryReportCsv(filteredStatements);
                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        const reportPeriod =
                          monthFilter !== 'all' && yearFilter !== 'all'
                            ? `${monthFilter}_${yearFilter}`
                            : yearFilter !== 'all'
                            ? `Year_${yearFilter}`
                            : monthFilter !== 'all'
                            ? `Month_${monthFilter}`
                            : periodFilter !== 'all'
                            ? periodFilter.replace(/\s+/g, '_')
                            : 'All_Reporting_Periods';
                        link.download = `CSP_Commission_Summary_${reportPeriod}.csv`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                    title="Export in standard 9-column format for selected month/year"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Status & Slice Info */}
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                <div>
                  Showing{' '}
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {filteredStatements.length === 0 ? 0 : (dirPage - 1) * dirPageSize + 1}
                    –{Math.min(dirPage * dirPageSize, filteredStatements.length)}
                  </span>{' '}
                  of{' '}
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {filteredStatements.length}
                  </span>{' '}
                  CSP statements
                  {filteredStatements.length !== allStatements.length && (
                    <span className="text-slate-400 ml-1">
                      (filtered from {allStatements.length} total)
                    </span>
                  )}
                </div>

                <div className="text-[11px]">
                  Net Payout Total:{' '}
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatIndianCurrency(totals.net)}
                  </span>
                </div>
              </div>

              {/* Master Statement Table in EXACT 9-COLUMN FORMAT */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                      <th className="py-2.5 px-3 whitespace-nowrap">CSP CODE</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">CSP NAME</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">TRANSACTION</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">INCENTIVES</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">RURAL</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">TOTAL</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">TDS</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">PAYABLE TO CSP</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap text-emerald-700 dark:text-emerald-400 font-bold">
                        NET PAYABLE
                      </th>
                      <th className="py-2.5 px-3 text-center whitespace-nowrap">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {paginatedStatements.map((s) => (
                      <tr
                        key={`${s.cspCode}_${s.period}`}
                        onClick={() => setSelectedStatement(s)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                          {s.cspCode}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{s.cspName}</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                (s.cspCategory || 'rural').toLowerCase() === 'urban'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              }`}
                            >
                              {(s.cspCategory || 'rural').toUpperCase()}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            {s.circleName} ({s.circle}) • {s.bcbfCode}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {s.transactionCommission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {s.incentivesCommission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {s.ruralCommission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {s.totalRawCommission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-rose-600 dark:text-rose-400 whitespace-nowrap">
                          {s.totalTdsDeducted.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                          {s.totalCspGrossCommission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {s.totalNetPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStatement(s);
                            }}
                            className="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] transition-colors"
                          >
                            Slip
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredStatements.length === 0 && (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-500 dark:text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Receipt className="w-8 h-8 text-slate-400 opacity-60" />
                            <p className="font-semibold text-sm">
                              No CSP statements found for {periodFilter === 'all' ? 'All Reporting Periods' : periodFilter}
                            </p>
                            <p className="text-xs text-slate-400 max-w-md">
                              {commissionRecords.length > 0
                                ? `Found ${commissionRecords.length.toLocaleString()} total transactions in the database. Choose a different period or select 'All Reporting Periods'.`
                                : 'No commission records found in the database. Try clicking "Import Raw CSV" or verify database synchronization.'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {filteredStatements.length > 0 && (
                    <tfoot className="bg-slate-100 dark:bg-slate-800/90 font-bold border-t-2 border-slate-300 dark:border-slate-700">
                      <tr>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white" colSpan={2}>
                          TOTAL ({filteredStatements.length} CSPs)
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-900 dark:text-white whitespace-nowrap">
                          {totals.transaction.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-900 dark:text-white whitespace-nowrap">
                          {totals.incentives.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-900 dark:text-white whitespace-nowrap">
                          {totals.rural.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 dark:text-white whitespace-nowrap">
                          {totals.raw.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-rose-600 dark:text-rose-400 whitespace-nowrap">
                          {totals.tds.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-indigo-700 dark:text-indigo-300 whitespace-nowrap">
                          {totals.cspGross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {totals.net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Bottom Pagination Bar */}
              {dirTotalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs">
                  <span className="text-slate-400">
                    Page <span className="font-bold text-slate-700 dark:text-slate-300">{dirPage}</span> of{' '}
                    <span className="font-bold text-slate-700 dark:text-slate-300">{dirTotalPages}</span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={dirPage <= 1}
                      onClick={() => setDirPage(1)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none text-slate-600 dark:text-slate-400 transition-colors"
                      title="First Page"
                    >
                      <ChevronsLeft className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={dirPage <= 1}
                      onClick={() => setDirPage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1 transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Prev</span>
                    </button>

                    {/* Page Numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: dirTotalPages }, (_, i) => i + 1)
                        .filter(
                          (pageNum) =>
                            pageNum === 1 ||
                            pageNum === dirTotalPages ||
                            Math.abs(pageNum - dirPage) <= 1
                        )
                        .map((pageNum, idx, arr) => {
                          const showEllipsis = idx > 0 && pageNum - arr[idx - 1] > 1;
                          return (
                            <React.Fragment key={pageNum}>
                              {showEllipsis && <span className="px-1 text-slate-400">…</span>}
                              <button
                                type="button"
                                onClick={() => setDirPage(pageNum)}
                                className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                                  dirPage === pageNum
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                              >
                                {pageNum}
                              </button>
                            </React.Fragment>
                          );
                        })}
                    </div>

                    <button
                      type="button"
                      disabled={dirPage >= dirTotalPages}
                      onClick={() => setDirPage((p) => Math.min(dirTotalPages, p + 1))}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1 transition-colors"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={dirPage >= dirTotalPages}
                      onClick={() => setDirPage(dirTotalPages)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none text-slate-600 dark:text-slate-400 transition-colors"
                      title="Last Page"
                    >
                      <ChevronsRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Sub-Tab 2: Rules & Config ── */}
          {adminTab === 'rules' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 1. Rural CSP Split Configuration */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 font-bold">
                      <Percent className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          Rural CSP Commission Split Ratio
                        </h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          Rural
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Default ratio is 75% to Rural CSP and 25% to Corporate BC
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <span>Rural CSP Share: <strong className="text-emerald-600 font-black text-sm">{ruralSplitInput}%</strong></span>
                    <span>Corporate BC Share: <strong className="text-slate-800 dark:text-slate-200 font-black text-sm">{100 - ruralSplitInput}%</strong></span>
                  </div>

                  <input
                    type="range"
                    min="50"
                    max="95"
                    step="1"
                    value={ruralSplitInput}
                    onChange={(e) => setRuralSplitInput(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <button type="button" onClick={() => setRuralSplitInput(70)} className="hover:text-emerald-600">70-30</button>
                    <button type="button" onClick={() => setRuralSplitInput(75)} className="font-bold text-emerald-600">75-25 (Standard Rural)</button>
                    <button type="button" onClick={() => setRuralSplitInput(80)} className="hover:text-emerald-600">80-20</button>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveRuralSplit}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all"
                    >
                      Update Rural Split
                    </button>
                  </div>
                </div>

                {/* 2. Urban CSP Split Configuration */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 font-bold">
                        <Percent className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            Urban CSP Commission Split Ratio
                          </h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            Urban
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Default ratio is 70% to Urban CSP and 30% to Corporate BC
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <span>Urban CSP Share: <strong className="text-amber-600 font-black text-sm">{urbanSplitInput}%</strong></span>
                      <span>Corporate BC Share: <strong className="text-slate-800 dark:text-slate-200 font-black text-sm">{100 - urbanSplitInput}%</strong></span>
                    </div>

                    <input
                      type="range"
                      min="50"
                      max="95"
                      step="1"
                      value={urbanSplitInput}
                      onChange={(e) => setUrbanSplitInput(Number(e.target.value))}
                      className="w-full accent-amber-600 cursor-pointer"
                    />

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <button type="button" onClick={() => setUrbanSplitInput(65)} className="hover:text-amber-600">65-35</button>
                      <button type="button" onClick={() => setUrbanSplitInput(70)} className="font-bold text-amber-600">70-30 (Standard Urban)</button>
                      <button type="button" onClick={() => setUrbanSplitInput(75)} className="hover:text-amber-600">75-25</button>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={handleSaveUrbanSplit}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-all"
                      >
                        Update Urban Split
                      </button>
                    </div>
                  </div>
                </div>

                {/* Overrides List */}
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Product-Specific Override Rules
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Custom commission percentages per product
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOverrideModalInitialType(undefined);
                        setIsOverrideModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Edit Overrides</span>
                    </button>
                  </div>

                  <div className="space-y-1.5 text-xs max-h-56 overflow-y-auto">
                    {Object.values(commissionSplitConfig.overrides || {}).length === 0 ? (
                      <div className="p-4 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                        No product-specific overrides configured. All products use the global {commissionSplitConfig.defaultCspPercent}% CSP / {commissionSplitConfig.defaultCorporatePercent}% BC ratio.
                      </div>
                    ) : (
                      Object.values(commissionSplitConfig.overrides || {}).map((o, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                        >
                          <div className="min-w-0 pr-2">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                              {o.transactionType}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900">
                              {o.cspPercent}% / {o.corporatePercent}%
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setOverrideModalInitialType(o.transactionType);
                                setIsOverrideModalOpen(true);
                              }}
                              className="px-2 py-0.5 rounded text-[11px] font-semibold text-slate-500 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* 2. TDS Deduction Rate Configuration */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 font-bold">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Section 194H TDS Rate Settings
                    </h3>
                    <p className="text-xs text-slate-400">
                      Statutory tax deduction rate on commission payouts
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Active TDS Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="30"
                        value={tdsRateInput}
                        onChange={(e) => setTdsRateInput(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Income Tax Section
                      </label>
                      <input
                        type="text"
                        disabled
                        value="Section 194H"
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 leading-relaxed">
                    Standard TDS deduction under Section 194H of the Indian Income Tax Act is 5.0%. Payouts without a linked PAN card are subject to 20.0% TDS.
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveTdsConfig}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-all"
                    >
                      Save TDS Rate
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* Modals */}
      {/* ───────────────────────────────────────────────────────────── */}
      <CommissionStatementModal
        statement={selectedStatement}
        onClose={() => setSelectedStatement(null)}
      />

      <ImportCommissionModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />

      <ProductOverrideModal
        isOpen={isOverrideModalOpen}
        onClose={() => {
          setIsOverrideModalOpen(false);
          setOverrideModalInitialType(undefined);
        }}
        initialSelectedType={overrideModalInitialType}
      />
    </div>
  );
};
