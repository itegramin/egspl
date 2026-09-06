import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { TransactionTypeDefinition } from '../../types/commission.type';
import {
  Tags,
  Plus,
  Search,
  Pencil,
  Trash2,
  MapPin,
  Building2,
  X,
  Percent,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Category badges & helpers
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<TransactionTypeDefinition['category'], string> = {
  banking: 'Banking',
  social_security: 'Social Security',
  onboarding: 'Onboarding',
  credit: 'Credit',
  other: 'Other',
};

const CATEGORY_STYLES: Record<TransactionTypeDefinition['category'], string> = {
  banking: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
  social_security: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
  onboarding: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  credit: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
  other: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/30',
};

function slugToCode(name: string): string {
  return (name || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/[^A-Z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, '_');
}

interface ModalState {
  open: boolean;
  editing: TransactionTypeDefinition | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────────────────────────────────────

export const TransactionTypeManagement: React.FC = () => {
  const { transactionTypes, upsertTransactionType, removeTransactionType } = useApp();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [modal, setModal] = useState<ModalState>({ open: false, editing: null });
  const [deleteTarget, setDeleteTarget] = useState<TransactionTypeDefinition | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: '',
    code: '',
    category: 'banking' as TransactionTypeDefinition['category'],
    description: '',
    transactionRuralSplit: 75,
    transactionUrbanSplit: 70,
    isActive: true,
  });
  const [formError, setFormError] = useState('');

  // ── Derived values ────────────────────────────────────────────────────────
  const filteredTypes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...transactionTypes]
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter(t => {
        if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
        if (statusFilter === 'active' && !t.isActive) return false;
        if (statusFilter === 'inactive' && t.isActive) return false;
        if (q) {
          const haystack = `${t.name} ${t.code} ${t.description || ''}`.toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      });
  }, [transactionTypes, searchQuery, categoryFilter, statusFilter]);

  const stats = useMemo(() => {
    const active = transactionTypes.filter(t => t.isActive);
    const withRural = transactionTypes.filter(t => t.transactionRuralSplit != null);
    const withUrban = transactionTypes.filter(t => t.transactionUrbanSplit != null);
    const avg = (list: number[]) =>
      list.length === 0 ? 0 : Math.round((list.reduce((a, b) => a + b, 0) / list.length) * 10) / 10;
    return {
      total: transactionTypes.length,
      active: active.length,
      avgRural: avg(withRural.map(t => Number(t.transactionRuralSplit))),
      avgUrban: avg(withUrban.map(t => Number(t.transactionUrbanSplit))),
    };
  }, [transactionTypes]);

  // ── Modal helpers ─────────────────────────────────────────────────────────
  const openAddModal = () => {
    setForm({
      name: '',
      code: '',
      category: 'banking',
      description: '',
      transactionRuralSplit: 75,
      transactionUrbanSplit: 70,
      isActive: true,
    });
    setFormError('');
    setModal({ open: true, editing: null });
  };

  const openEditModal = (t: TransactionTypeDefinition) => {
    setForm({
      name: t.name,
      code: t.code,
      category: t.category,
      description: t.description || '',
      transactionRuralSplit: t.transactionRuralSplit ?? 75,
      transactionUrbanSplit: t.transactionUrbanSplit ?? 70,
      isActive: t.isActive,
    });
    setFormError('');
    setModal({ open: true, editing: t });
  };

  const closeModal = () => {
    setModal({ open: false, editing: null });
    setFormError('');
  };

  const handleSave = () => {
    // Validation
    const name = form.name.trim();
    if (!name) {
      setFormError('Transaction type name is required.');
      return;
    }
    const code = form.code.trim() || slugToCode(name);
    if (!code) {
      setFormError('A valid transaction code is required (auto-generated from name).');
      return;
    }
    const rural = Number(form.transactionRuralSplit);
    const urban = Number(form.transactionUrbanSplit);
    if (isNaN(rural) || rural < 0 || rural > 100) {
      setFormError('Rural CSP split must be between 0 and 100.');
      return;
    }
    if (isNaN(urban) || urban < 0 || urban > 100) {
      setFormError('Urban CSP split must be between 0 and 100.');
      return;
    }

    const now = Date.now();
    const tt: TransactionTypeDefinition = {
      id: modal.editing?.id || `ttx_${slugToCode(name).toLowerCase()}_${now}`,
      code,
      name,
      category: form.category,
      description: form.description.trim() || undefined,
      transactionRuralSplit: Math.round(rural * 100) / 100,
      transactionUrbanSplit: Math.round(urban * 100) / 100,
      isActive: form.isActive,
    };

    upsertTransactionType(tt);
    closeModal();
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      removeTransactionType(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Page Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-bold">
              <Tags className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-md">
              Commission Configuration
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 tracking-tight">
            Transaction Type Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Configure each transaction type with a different commission split for{' '}
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Rural</span> vs{' '}
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Urban</span> CSPs.
            Used by the commission report engine.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Transaction Type
          </button>
        )}
      </div>

      {/* ── Stat Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Types</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.active}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Avg Rural CSP Split</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.avgRural}%<span className="text-sm text-slate-400 font-semibold ml-1">/ CSP</span>
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Avg Urban CSP Split</p>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {stats.avgUrban}%<span className="text-sm text-slate-400 font-semibold ml-1">/ CSP</span>
          </p>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search transaction types…"
            className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="all">All Categories</option>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
          className="px-3 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 font-bold">Transaction Type</th>
                <th className="px-4 py-3 font-bold">Category</th>
                <th className="px-4 py-3 font-bold text-right">Rural Split</th>
                <th className="px-4 py-3 font-bold text-right">Urban Split</th>
                <th className="px-4 py-3 font-bold">Status</th>
                {isAdmin && <th className="px-4 py-3 font-bold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredTypes.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-4 py-12 text-center">
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                      No transaction types found.
                    </p>
                    {isAdmin && (
                      <button
                        onClick={openAddModal}
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add your first transaction type
                      </button>
                    )}
                  </td>
                </tr>
              )}
              {filteredTypes.map(t => {
                const rural = t.transactionRuralSplit != null ? Number(t.transactionRuralSplit) : null;
                const urban = t.transactionUrbanSplit != null ? Number(t.transactionUrbanSplit) : null;
                return (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400">
                          <Percent className="w-4 h-4" />
                        </span>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{t.name}</p>
                          <p className="text-[11px] font-medium text-slate-400 font-mono">{t.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${CATEGORY_STYLES[t.category] || CATEGORY_STYLES.other}`}>
                        {CATEGORY_LABELS[t.category] || t.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {rural != null ? (
                        <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          <MapPin className="w-3.5 h-3.5" />
                          {rural}%
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {urban != null ? (
                        <span className="inline-flex items-center gap-1 text-sm font-bold text-indigo-600 dark:text-indigo-400">
                          <Building2 className="w-3.5 h-3.5" />
                          {urban}%
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {t.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/30">
                          Inactive
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(t)}
                            title="Edit"
                            className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(t)}
                            title="Delete"
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add / Edit Modal ───────────────────────────────────────────────── */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {modal.editing ? 'Edit Transaction Type' : 'Add Transaction Type'}
                </h3>
                <p className="text-[11px] font-medium text-slate-400">
                  Set different split percentages for Rural &amp; Urban CSPs.
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-5 py-4 space-y-4 max-h-[65vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                  Transaction Type Name *
                </label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. AEPS Cash Withdrawal"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                    Code (tx_type)
                  </label>
                  <input
                    value={form.code}
                    onChange={e => setForm({ ...form, code: e.target.value })}
                    placeholder="Auto from name"
                    disabled={!!modal.editing}
                    className="w-full px-3 py-2.5 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Read-only after creation.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value as TransactionTypeDefinition['category'] })}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  placeholder="Short description of this transaction type"
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* Split Percentage Inputs */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                  CSP Split Percentage (CSP share, corporate = 100 − CSP)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1.5">
                      <MapPin className="w-3.5 h-3.5" /> Rural CSP Split %
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={form.transactionRuralSplit}
                        onChange={e => setForm({ ...form, transactionRuralSplit: Number(e.target.value) })}
                        className="w-full pr-8 pl-3 py-2.5 text-sm font-bold rounded-xl border border-emerald-500/40 dark:border-emerald-500/50 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">%</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Corporate: {form.transactionRuralSplit != null && !isNaN(Number(form.transactionRuralSplit)) ? Math.round((100 - Number(form.transactionRuralSplit)) * 100) / 100 : 100 - 75}%
                    </p>
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1.5">
                      <Building2 className="w-3.5 h-3.5" /> Urban CSP Split %
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={form.transactionUrbanSplit}
                        onChange={e => setForm({ ...form, transactionUrbanSplit: Number(e.target.value) })}
                        className="w-full pr-8 pl-3 py-2.5 text-sm font-bold rounded-xl border border-indigo-500/40 dark:border-indigo-500/50 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">%</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Corporate: {form.transactionUrbanSplit != null && !isNaN(Number(form.transactionUrbanSplit)) ? Math.round((100 - Number(form.transactionUrbanSplit)) * 100) / 100 : 100 - 70}%
                    </p>
                  </div>
                </div>
              </div>

              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Active</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.isActive}
                  onClick={() => setForm({ ...form, isActive: !form.isActive })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${form.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.isActive ? 'translate-x-5' : ''}`}
                  />
                </button>
              </label>

              {formError && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-rose-600 dark:text-rose-300">{formError}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={closeModal}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 transition-all"
              >
                {modal.editing ? 'Save Changes' : 'Add Transaction Type'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ────────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden p-5">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white text-center">
              Delete Transaction Type?
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 text-center mt-1.5 leading-relaxed">
              <span className="font-semibold text-slate-700 dark:text-slate-200">{deleteTarget.name}</span> will be removed
              from the split configuration. Existing commission records are unaffected.
            </p>
            <div className="flex items-center justify-center gap-2.5 mt-5">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-rose-600/20 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionTypeManagement;