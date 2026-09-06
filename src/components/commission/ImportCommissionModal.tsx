import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { parseCommissionCsv } from '../../lib/commissionCalculator';
import { RawCommissionRecord, TransactionTypeDefinition } from '../../types/commission.type';
import {
  X,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Download,
  Calendar,
  Sparkles,
  Sliders,
  Check,
  Edit2,
  Tag,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ImportCommissionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SAMPLE_CSV = `Circle,Circle Name,BCBF_CODE,CSP_CODE,CSP Name,Transaction Type,Num Txns / Avg Bal,Commission
01,Bhopal,BCBF_001,1A234567,Shree Ganesh Kiosk,AEPS Cash Withdrawal,420,12600.00
01,Bhopal,BCBF_001,1A234567,Shree Ganesh Kiosk,Micro ATM,290,8700.00
01,Bhopal,BCBF_001,1A234567,Shree Ganesh Kiosk,Saving Account Opening,65,1625.00
02,Mumbai Metro,BCBF_002,CSP1001,Client Test Kiosk,AEPS Cash Withdrawal,550,16500.00
02,Mumbai Metro,BCBF_002,CSP1001,Client Test Kiosk,Micro ATM,340,10200.00
02,Mumbai Metro,BCBF_002,CSP1001,Client Test Kiosk,PMJJBY,45,1350.00
02,Mumbai Metro,BCBF_002,CSP1001,Client Test Kiosk,BBPS Bill Payment,120,3600.00
03,Lucknow,BCBF_003,CSP1002,Apna Banking Point,AEPS Cash Withdrawal,380,11400.00
03,Lucknow,BCBF_003,CSP1002,Apna Banking Point,IMPS Remittance,210,6300.00
03,Lucknow,BCBF_003,CSP1002,Apna Banking Point,FASTag Recharge,95,2850.00`;

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const YEARS = [2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030];

interface BatchTypeSummary {
  name: string;
  count: number;
  grossCommission: number;
  totalTxns: number;
  isKnown: boolean;
  hasOverride: boolean;
  cspPercent: number;
  corporatePercent: number;
  existingDef?: TransactionTypeDefinition;
}

export const ImportCommissionModal: React.FC<ImportCommissionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    importCommissionRecords,
    transactionTypes,
    commissionSplitConfig,
    updateSplitConfig,
    upsertTransactionType,
    toast,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedMonth, setSelectedMonth] = useState('September');
  const [selectedYear, setSelectedYear] = useState(2026);
  const period = `${selectedMonth} ${selectedYear}`;

  const handleMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth);
    const newPeriod = `${newMonth} ${selectedYear}`;
    if (parsedRecords.length > 0) {
      setParsedRecords((prev) =>
        prev.map((r) => ({
          ...r,
          period: newPeriod,
          month: newMonth,
          year: selectedYear,
        }))
      );
    }
  };

  const handleYearChange = (newYear: number) => {
    setSelectedYear(newYear);
    const newPeriod = `${selectedMonth} ${newYear}`;
    if (parsedRecords.length > 0) {
      setParsedRecords((prev) =>
        prev.map((r) => ({
          ...r,
          period: newPeriod,
          month: selectedMonth,
          year: newYear,
        }))
      );
    }
  };

  const [csvText, setCsvText] = useState('');
  const [parsedRecords, setParsedRecords] = useState<RawCommissionRecord[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRawPaste, setShowRawPaste] = useState(false);
  const [activeTab, setActiveTab] = useState<'types' | 'records'>('types');

  // Inline configuration editor state
  const [editingTypeName, setEditingTypeName] = useState<string | null>(null);
  const [editOriginalName, setEditOriginalName] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editCategory, setEditCategory] = useState<'banking' | 'social_security' | 'onboarding' | 'credit' | 'other'>('banking');
  const [editUseCustomSplit, setEditUseCustomSplit] = useState(false);
  const [editCspPercent, setEditCspPercent] = useState<number>(commissionSplitConfig.defaultCspPercent);
  const [renameInBatch, setRenameInBatch] = useState(true);

  // Compute breakdown of transaction types in the uploaded batch
  const batchTypesSummary = useMemo<BatchTypeSummary[]>(() => {
    if (parsedRecords.length === 0) return [];
    const map = new Map<string, BatchTypeSummary>();

    parsedRecords.forEach((r) => {
      const typeName = (r.transactionType || '').trim();
      if (!typeName) return;

      const existing = map.get(typeName);
      if (existing) {
        existing.count += 1;
        existing.grossCommission += r.rawCommission || 0;
        existing.totalTxns += r.numTxnsOrAvgBal || 0;
      } else {
        const foundDef = transactionTypes.find(
          (t) =>
            t.name.toLowerCase() === typeName.toLowerCase() ||
            t.code.toLowerCase() === typeName.toLowerCase()
        );
        const override = commissionSplitConfig.overrides?.[typeName];
        const isKnown = Boolean(foundDef || override);
        const hasOverride = Boolean(override);
        const cspPercent = override ? override.cspPercent : commissionSplitConfig.defaultCspPercent;
        const corporatePercent = override ? override.corporatePercent : commissionSplitConfig.defaultCorporatePercent;

        map.set(typeName, {
          name: typeName,
          count: 1,
          grossCommission: r.rawCommission || 0,
          totalTxns: r.numTxnsOrAvgBal || 0,
          isKnown,
          hasOverride,
          cspPercent,
          corporatePercent,
          existingDef: foundDef,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      // Prioritize unknown (new) types first so user notices them immediately
      if (!a.isKnown && b.isKnown) return -1;
      if (a.isKnown && !b.isKnown) return 1;
      return b.grossCommission - a.grossCommission;
    });
  }, [parsedRecords, transactionTypes, commissionSplitConfig]);

  const newTypes = useMemo(() => {
    return batchTypesSummary.filter((t) => !t.isKnown);
  }, [batchTypesSummary]);

  if (!isOpen) return null;

  const handleParse = (text: string) => {
    setCsvText(text);
    if (!text.trim()) {
      setParsedRecords([]);
      setParseErrors([]);
      setEditingTypeName(null);
      return;
    }
    const { records, errors } = parseCommissionCsv(text, period);
    setParsedRecords(records);
    setParseErrors(errors);
    setEditingTypeName(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = String(evt.target?.result || '');
      handleParse(content);
      setShowRawPaste(false);
    };
    reader.readAsText(file);
  };

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Sample_Raw_Commission_Transactions.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Open the configuration editor for a specific transaction type
  const handleOpenEditor = (item: BatchTypeSummary) => {
    setEditingTypeName(item.name);
    setEditOriginalName(item.name);
    setEditDisplayName(item.name);
    const autoCode =
      item.existingDef?.code ||
      item.name.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/__+/g, '_');
    setEditCode(autoCode);
    setEditCategory(item.existingDef?.category || 'banking');
    setEditUseCustomSplit(item.hasOverride);
    setEditCspPercent(item.cspPercent);
    setRenameInBatch(true);
  };

  // Quick-register a single transaction type with default 70/30 split
  const handleQuickRegisterSingle = (typeName: string) => {
    const code = typeName.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/__+/g, '_');
    upsertTransactionType({
      id: `tt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      code,
      name: typeName,
      category: 'banking',
      isActive: true,
    });
    toast(`Added "${typeName}" to master catalog with default split.`, 'success');
  };

  // Quick-register all detected new types with default 70/30 split
  const handleQuickRegisterAllNew = () => {
    newTypes.forEach((t) => {
      const code = t.name.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/__+/g, '_');
      upsertTransactionType({
        id: `tt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        code,
        name: t.name,
        category: 'banking',
        isActive: true,
      });
    });
    toast(`Registered ${newTypes.length} new transaction types to catalog.`, 'success');
  };

  // Save the configuration for the currently edited transaction type
  const handleSaveTypeConfig = async () => {
    const trimmedName = editDisplayName.trim();
    if (!trimmedName) return;

    const finalCode = editCode.trim() || trimmedName.toUpperCase().replace(/[^A-Z0-9]/g, '_');

    // 1. Update / Register in master catalog
    upsertTransactionType({
      id:
        batchTypesSummary.find((t) => t.name === editOriginalName)?.existingDef?.id ||
        `tt_${Date.now()}`,
      code: finalCode,
      name: trimmedName,
      category: editCategory,
      isActive: true,
    });

    // 2. Update split config override if customized
    const corporatePercent = Math.max(0, Math.min(100, Math.round((100 - editCspPercent) * 10) / 10));
    const newOverrides = { ...(commissionSplitConfig.overrides || {}) };

    // If name was renamed, clean up old override key
    if (editOriginalName !== trimmedName && newOverrides[editOriginalName]) {
      delete newOverrides[editOriginalName];
    }

    if (editUseCustomSplit) {
      newOverrides[trimmedName] = {
        transactionType: trimmedName,
        cspPercent: editCspPercent,
        corporatePercent,
        effectiveFrom: new Date().toISOString().split('T')[0],
      };
    } else {
      delete newOverrides[trimmedName];
    }

    await updateSplitConfig({
      ...commissionSplitConfig,
      overrides: newOverrides,
      updatedAt: new Date().toISOString(),
    });

    // 3. If name was modified and checkbox is checked, update parsedRecords in this upload batch
    if (editOriginalName !== trimmedName && renameInBatch) {
      setParsedRecords((prev) =>
        prev.map((r) =>
          r.transactionType === editOriginalName ? { ...r, transactionType: trimmedName } : r
        )
      );
    }

    setEditingTypeName(null);
    toast(`Transaction type "${trimmedName}" updated successfully.`, 'success');
  };

  const handleSubmit = async () => {
    if (parsedRecords.length === 0) return;
    setIsSubmitting(true);
    try {
      // Auto-register any remaining new transaction types into catalog so no orphaned items exist
      newTypes.forEach((t) => {
        const code = t.name.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/__+/g, '_');
        upsertTransactionType({
          id: `tt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          code,
          name: t.name,
          category: 'banking',
          isActive: true,
        });
      });

      // Apply chosen payout period, month, and year to all parsed records
      const finalRecords = parsedRecords.map((r) => ({
        ...r,
        period,
        month: selectedMonth,
        year: selectedYear,
      }));
      await importCommissionRecords(finalRecords);
      onClose();
    } catch (err: any) {
      console.error('Import failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculatedCorporatePercent = Math.max(
    0,
    Math.min(100, Math.round((100 - editCspPercent) * 10) / 10)
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shadow-xs">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Import Raw Commission Transactions
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Upload CSV file • Auto-detect & configure new transaction types • Customize splits
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadSample}
              className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Download Sample CSV template"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Sample CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Top Controls: Period (Month & Year) Selection & File Upload */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-4">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Commission Month <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedMonth}
                    onChange={(e) => handleMonthChange(e.target.value)}
                    className="w-full px-3 py-2 pr-8 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
                  >
                    {MONTHS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Year <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => handleYearChange(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  File Upload <span className="text-slate-400 font-normal">(.csv, .tsv)</span>
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,.tsv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-dashed border-indigo-400 dark:border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold flex items-center justify-center gap-2 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/50 transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Select File to Import</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-200/70 dark:border-slate-800/80 text-[11px] gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 dark:text-slate-400">Target Statement Period:</span>
                <span className="font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 px-2 py-0.5 rounded-md border border-indigo-200/80 dark:border-indigo-800/80">
                  {period}
                </span>
              </div>
              <span className="text-slate-400 dark:text-slate-500">
                All uploaded transactions will be tagged to this month & year
              </span>
            </div>
          </div>

          {/* Paste Raw Data Toggle */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Raw Transaction Data
              </label>
              <button
                type="button"
                onClick={() => setShowRawPaste((prev) => !prev)}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
              >
                <span>{showRawPaste ? 'Hide Paste Area' : 'Or Paste CSV Text Manually'}</span>
                {showRawPaste ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {showRawPaste && (
              <textarea
                rows={4}
                value={csvText}
                onChange={(e) => handleParse(e.target.value)}
                placeholder="Circle, Circle Name, BCBF_CODE, CSP_CODE, CSP Name, Transaction Type, Num Txns / Avg Bal, Commission&#10;01,Bhopal,BCBF_001,1A234567,Shree Ganesh Kiosk,AEPS Cash Withdrawal,420,12600.00"
                className="w-full font-mono text-[11px] p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
              />
            )}
          </div>

          {/* NEW TRANSACTION TYPES DETECTED BANNER & CARD */}
          {parsedRecords.length > 0 && newTypes.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                      <span>New Transaction Type(s) Detected in Upload ({newTypes.length})</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 dark:bg-amber-800/60 text-amber-800 dark:text-amber-200">
                        Action Recommended
                      </span>
                    </h3>
                    <p className="text-[11px] text-amber-700 dark:text-amber-300/80 mt-0.5">
                      The following transaction products do not exist in the master catalog yet. You can update their names, assign product categories, or configure custom commission split percentages before completing import.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleQuickRegisterAllNew}
                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold shrink-0 transition-colors shadow-xs"
                  title="Automatically add all new types with standard 70/30 split and Banking category"
                >
                  Quick-Register All (70/30)
                </button>
              </div>

              {/* Detected New Types List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {newTypes.map((t) => (
                  <div
                    key={t.name}
                    className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-900/60 shadow-xs flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                          {t.name}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 shrink-0">
                          New Type
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 space-x-1">
                        <span>{t.count} records</span>
                        <span>&bull;</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          ₹ {t.grossCommission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                        <span>Gross</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Split Rule:{' '}
                        {t.hasOverride ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            Custom ({t.cspPercent}% CSP / {t.corporatePercent}% BC)
                          </span>
                        ) : (
                          <span>Default ({t.cspPercent}% CSP / {t.corporatePercent}% BC)</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleOpenEditor(t)}
                        className="flex-1 py-1 px-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                      >
                        <Sliders className="w-3 h-3" />
                        <span>Update / Configure</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickRegisterSingle(t.name)}
                        className="py-1 px-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-semibold transition-colors"
                        title="Register with default 70/30 split"
                      >
                        Quick Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* INLINE CONFIGURATION / UPDATE EDITOR DRAWER */}
          {editingTypeName && (
            <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border-2 border-indigo-500/80 shadow-md space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                    <Edit2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Update Transaction Type: <span className="text-indigo-600 dark:text-indigo-400">{editOriginalName}</span>
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Configure product classification, product code, and commission split percentage
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEditingTypeName(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Name */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Transaction Type Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    placeholder="e.g. BBPS Bill Payment"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                  {editDisplayName !== editOriginalName && (
                    <label className="flex items-center gap-1.5 mt-1.5 text-[11px] text-indigo-700 dark:text-indigo-300 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={renameInBatch}
                        onChange={(e) => setRenameInBatch(e.target.checked)}
                        className="rounded accent-indigo-600"
                      />
                      <span>Rename in all {batchTypesSummary.find((t) => t.name === editOriginalName)?.count || 0} batch transactions</span>
                    </label>
                  )}
                </div>

                {/* Code */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Product Code
                  </label>
                  <input
                    type="text"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    placeholder="e.g. BBPS_BILL"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono uppercase focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Category */}
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Product Category
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="banking">Banking Services (Cash In/Out, Balance, Remittance)</option>
                    <option value="social_security">Social Security (PMJJBY, PMSBY, APY)</option>
                    <option value="onboarding">Customer Onboarding & Accounts</option>
                    <option value="credit">Credit / Loans / Cards</option>
                    <option value="other">Other Operations</option>
                  </select>
                </div>
              </div>

              {/* Percentage Split Rule Selection */}
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900/70 border border-indigo-100 dark:border-indigo-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Commission Split Rule</span>
                  </span>

                  <div className="flex items-center gap-3 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300 font-medium">
                      <input
                        type="radio"
                        name="splitRuleMode"
                        checked={!editUseCustomSplit}
                        onChange={() => setEditUseCustomSplit(false)}
                        className="accent-indigo-600"
                      />
                      <span>Global Default ({commissionSplitConfig.defaultCspPercent}/{commissionSplitConfig.defaultCorporatePercent})</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer text-indigo-600 dark:text-indigo-400 font-bold">
                      <input
                        type="radio"
                        name="splitRuleMode"
                        checked={editUseCustomSplit}
                        onChange={() => setEditUseCustomSplit(true)}
                        className="accent-indigo-600"
                      />
                      <span>Custom Split Override</span>
                    </label>
                  </div>
                </div>

                {editUseCustomSplit ? (
                  <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {/* Visual Ratio Bar */}
                    <div className="space-y-1">
                      <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex shadow-inner">
                        <div
                          style={{ width: `${editCspPercent}%` }}
                          className="bg-emerald-500 h-full transition-all duration-300"
                        />
                        <div
                          style={{ width: `${calculatedCorporatePercent}%` }}
                          className="bg-indigo-600 h-full transition-all duration-300"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className="text-emerald-600 dark:text-emerald-400">
                          CSP Share: {editCspPercent}%
                        </span>
                        <span className="text-indigo-600 dark:text-indigo-400">
                          Corporate BC Share: {calculatedCorporatePercent}%
                        </span>
                      </div>
                    </div>

                    {/* Sliders & Inputs */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          CSP Share %
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={editCspPercent}
                          onChange={(e) =>
                            setEditCspPercent(Math.max(0, Math.min(100, Number(e.target.value))))
                          }
                          className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                        />
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={editCspPercent}
                          onChange={(e) => setEditCspPercent(Number(e.target.value))}
                          className="w-full mt-1.5 accent-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Corporate Share %
                        </label>
                        <input
                          type="number"
                          disabled
                          value={calculatedCorporatePercent}
                          className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold"
                        />
                        <p className="text-[10px] text-slate-400 mt-1.5">
                          Automatically computed (100 - CSP%)
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-[11px] text-slate-500 dark:text-slate-400">
                    This transaction type will inherit the global commission split standard:{' '}
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {commissionSplitConfig.defaultCspPercent}% CSP / {commissionSplitConfig.defaultCorporatePercent}% Corporate BC
                    </span>.
                  </div>
                )}
              </div>

              {/* Editor Buttons */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingTypeName(null)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveTypeConfig}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save & Apply Updates</span>
                </button>
              </div>
            </div>
          )}

          {/* PARSED DATA PREVIEW & BATCH TYPE SUMMARY TABS */}
          {parsedRecords.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                {/* Tabs */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('types')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${activeTab === 'types'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Transaction Types in Batch ({batchTypesSummary.length})</span>
                    {newTypes.length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('records')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${activeTab === 'records'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Raw Records Preview ({parsedRecords.length})</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Total Bank Gross:{' '}
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    ₹{' '}
                    {parsedRecords
                      .reduce((acc, r) => acc + (r.rawCommission || 0), 0)
                      .toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* TAB 1: TRANSACTION TYPES SUMMARY & QUICK CONFIGURE */}
              {activeTab === 'types' && (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                        <th className="py-2.5 px-3">Transaction Product</th>
                        <th className="py-2.5 px-3">Catalog Status</th>
                        <th className="py-2.5 px-3 text-right">Batch Records</th>
                        <th className="py-2.5 px-3 text-right">Gross Bank (₹)</th>
                        <th className="py-2.5 px-3 text-center">Split Rule</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {batchTypesSummary.map((item) => (
                        <tr
                          key={item.name}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${!item.isKnown ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                            }`}
                        >
                          <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                            {item.name}
                          </td>
                          <td className="py-2 px-3">
                            {item.isKnown ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-900">
                                <Check className="w-3 h-3" />
                                Registered
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-800">
                                <Sparkles className="w-3 h-3" />
                                New Type
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                            {item.count} rows
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {item.grossCommission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${item.hasOverride
                                ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                }`}
                            >
                              {item.cspPercent}% CSP / {item.corporatePercent}% BC
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleOpenEditor(item)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] inline-flex items-center gap-1 transition-colors"
                            >
                              <Sliders className="w-3 h-3" />
                              <span>{item.isKnown ? 'Edit Split' : 'Configure'}</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 2: RAW RECORDS PREVIEW TABLE */}
              {activeTab === 'records' && (
                <div className="space-y-2">
                  <div className="max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-400 sticky top-0 border-b border-slate-200 dark:border-slate-700">
                          <th className="py-2 px-2.5">Circle</th>
                          <th className="py-2 px-2.5">CSP Code</th>
                          <th className="py-2 px-2.5">CSP Name</th>
                          <th className="py-2 px-2.5">Transaction Type</th>
                          <th className="py-2 px-2.5 text-right">Txns</th>
                          <th className="py-2 px-2.5 text-right">Gross (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {parsedRecords.slice(0, 10).map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="py-1.5 px-2.5 text-slate-500">{r.circleName}</td>
                            <td className="py-1.5 px-2.5 font-mono font-semibold">{r.cspCode}</td>
                            <td className="py-1.5 px-2.5 truncate max-w-[130px]">{r.cspName}</td>
                            <td className="py-1.5 px-2.5 font-medium text-slate-800 dark:text-slate-200">
                              {r.transactionType}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono">{r.numTxnsOrAvgBal}</td>
                            <td className="py-1.5 px-2.5 text-right font-mono font-bold text-emerald-600">
                              {r.rawCommission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsedRecords.length > 10 && (
                    <div className="text-[10px] text-center text-slate-400">
                      Showing first 10 of {parsedRecords.length} records.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Parse Errors */}
          {parseErrors.length > 0 && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Errors in raw transaction lines:</div>
                <ul className="list-disc list-inside text-[11px] mt-1 space-y-0.5">
                  {parseErrors.slice(0, 3).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {parseErrors.length > 3 && (
                    <li>...and {parseErrors.length - 3} more errors.</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between gap-2 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {parsedRecords.length > 0 && (
              <span>
                Ready to commit <span className="font-bold text-slate-800 dark:text-slate-200">{parsedRecords.length}</span> records
                {newTypes.length > 0 && (
                  <span className="text-amber-600 dark:text-amber-400 font-semibold ml-1">
                    ({newTypes.length} new types will be auto-registered)
                  </span>
                )}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={parsedRecords.length === 0 || isSubmitting}
              onClick={handleSubmit}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Importing...' : `Commit & Import (${parsedRecords.length})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
