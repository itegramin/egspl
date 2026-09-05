import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Sliders,
  Plus,
  Trash2,
  Check,
  Sparkles,
  RotateCcw,
} from 'lucide-react';

interface ProductOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSelectedType?: string;
}

export const ProductOverrideModal: React.FC<ProductOverrideModalProps> = ({
  isOpen,
  onClose,
  initialSelectedType,
}) => {
  const {
    commissionSplitConfig,
    updateSplitConfig,
    transactionTypes,
    addTransactionType,
    commissionRecords,
  } = useApp();

  // Mode: selecting existing vs creating new transaction type
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');

  // Percentage state
  const [cspPercent, setCspPercent] = useState<number>(commissionSplitConfig.defaultCspPercent);

  // New Transaction Type form fields
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeCode, setNewTypeCode] = useState('');
  const [newTypeCategory, setNewTypeCategory] = useState<'banking' | 'social_security' | 'onboarding' | 'credit' | 'other'>('banking');

  // Comprehensive master list of all known transaction types
  const allAvailableTypes = useMemo(() => {
    const map = new Map<string, { name: string; category?: string }>();

    // 1. From transactionTypes definitions
    transactionTypes.forEach(t => {
      map.set(t.name, { name: t.name, category: t.category });
    });

    // 2. From existing overrides
    if (commissionSplitConfig.overrides) {
      Object.keys(commissionSplitConfig.overrides).forEach(type => {
        if (!map.has(type)) {
          map.set(type, { name: type, category: 'banking' });
        }
      });
    }

    // 3. From raw records in the system
    commissionRecords.forEach(r => {
      if (r.transactionType && !map.has(r.transactionType)) {
        map.set(r.transactionType, { name: r.transactionType, category: 'banking' });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [transactionTypes, commissionSplitConfig.overrides, commissionRecords]);

  // Synchronize initial selection on modal open
  useEffect(() => {
    if (!isOpen) return;

    if (initialSelectedType && allAvailableTypes.some(t => t.name === initialSelectedType)) {
      setSelectedType(initialSelectedType);
    } else if (allAvailableTypes.length > 0 && !selectedType) {
      setSelectedType(allAvailableTypes[0].name);
    }
  }, [isOpen, initialSelectedType, allAvailableTypes]);

  // When selectedType changes, populate its existing percentage or default
  useEffect(() => {
    if (!selectedType) return;
    const existingOverride = commissionSplitConfig.overrides?.[selectedType];
    if (existingOverride) {
      setCspPercent(existingOverride.cspPercent);
    } else {
      setCspPercent(commissionSplitConfig.defaultCspPercent);
    }
  }, [selectedType, commissionSplitConfig]);

  if (!isOpen) return null;

  const corporatePercent = Math.max(0, Math.min(100, Math.round((100 - cspPercent) * 10) / 10));
  const activeOverride = selectedType ? commissionSplitConfig.overrides?.[selectedType] : undefined;
  const isCurrentlyOverridden = Boolean(activeOverride);

  // Quick preset ratios
  const presets = [
    { label: '70 / 30 (Default)', csp: 70 },
    { label: '75 / 25', csp: 75 },
    { label: '80 / 20', csp: 80 },
    { label: '85 / 15', csp: 85 },
    { label: '90 / 10', csp: 90 },
  ];

  // Handle saving an override for the selected type
  const handleSaveOverride = async () => {
    if (isAddingNew) {
      const trimmedName = newTypeName.trim();
      if (!trimmedName) return;

      const code = newTypeCode.trim() || trimmedName.toUpperCase().replace(/[^A-Z0-9]/g, '_');

      // Register new type in master catalog
      addTransactionType({
        id: `tt_${Date.now()}`,
        code,
        name: trimmedName,
        category: newTypeCategory,
        isActive: true,
      });

      // Save override
      const updatedOverrides = {
        ...(commissionSplitConfig.overrides || {}),
        [trimmedName]: {
          transactionType: trimmedName,
          cspPercent: cspPercent,
          corporatePercent: corporatePercent,
          effectiveFrom: new Date().toISOString().split('T')[0],
        },
      };

      await updateSplitConfig({
        ...commissionSplitConfig,
        overrides: updatedOverrides,
        updatedAt: new Date().toISOString(),
      });

      // Switch back to selection mode with new type selected
      setSelectedType(trimmedName);
      setIsAddingNew(false);
      setNewTypeName('');
      setNewTypeCode('');
    } else {
      if (!selectedType) return;

      const updatedOverrides = {
        ...(commissionSplitConfig.overrides || {}),
        [selectedType]: {
          transactionType: selectedType,
          cspPercent: cspPercent,
          corporatePercent: corporatePercent,
          effectiveFrom: new Date().toISOString().split('T')[0],
        },
      };

      await updateSplitConfig({
        ...commissionSplitConfig,
        overrides: updatedOverrides,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  // Revert/remove an override for the selected type
  const handleRemoveOverride = async (typeToRemove: string) => {
    if (!commissionSplitConfig.overrides?.[typeToRemove]) return;

    const newOverrides = { ...commissionSplitConfig.overrides };
    delete newOverrides[typeToRemove];

    await updateSplitConfig({
      ...commissionSplitConfig,
      overrides: newOverrides,
      updatedAt: new Date().toISOString(),
    });

    if (selectedType === typeToRemove) {
      setCspPercent(commissionSplitConfig.defaultCspPercent);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shadow-xs">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Product-Specific Override Rules
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Configure customized CSP vs Corporate BC commission percentage splits per product
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Top Control: Dropdown + Add New Button */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {isAddingNew ? 'Create New Transaction Type' : 'Select Transaction Type to Edit'}
              </label>

              {!isAddingNew ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNew(true);
                    setCspPercent(commissionSplitConfig.defaultCspPercent);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNew(false);
                    if (selectedType) {
                      const ex = commissionSplitConfig.overrides?.[selectedType];
                      setCspPercent(ex ? ex.cspPercent : commissionSplitConfig.defaultCspPercent);
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold transition-all"
                >
                  Cancel & Select Existing
                </button>
              )}
            </div>

            {/* Dropdown Selection Mode */}
            {!isAddingNew ? (
              <div className="space-y-2">
                <div className="relative">
                  <select
                    id="transaction-type-override-dropdown"
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    {allAvailableTypes.map((item) => {
                      const hasRule = Boolean(commissionSplitConfig.overrides?.[item.name]);
                      const rule = commissionSplitConfig.overrides?.[item.name];
                      return (
                        <option key={item.name} value={item.name}>
                          {item.name} {hasRule ? `[Override: ${rule?.cspPercent}% CSP / ${rule?.corporatePercent}% BC]` : `[Default: ${commissionSplitConfig.defaultCspPercent}% CSP]`}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {selectedType && (
                  <div className="flex items-center justify-between text-xs pt-1 px-1">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      Current Status:
                      {isCurrentlyOverridden ? (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          Custom Override Active ({activeOverride?.cspPercent}% CSP / {activeOverride?.corporatePercent}% BC)
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">
                          Inheriting Global Default ({commissionSplitConfig.defaultCspPercent}% CSP / {commissionSplitConfig.defaultCorporatePercent}% BC)
                        </span>
                      )}
                    </span>

                    {isCurrentlyOverridden && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOverride(selectedType)}
                        className="text-rose-600 dark:text-rose-400 hover:text-rose-700 font-semibold inline-flex items-center gap-1 text-[11px] transition-colors"
                        title="Delete override and revert to default"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Revert to Default</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Add New Transaction Type Input Mode */
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Product / Transaction Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Loan Lead Generation"
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Product Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. LOAN_LEAD"
                    value={newTypeCode}
                    onChange={(e) => setNewTypeCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Product Category
                  </label>
                  <select
                    value={newTypeCategory}
                    onChange={(e) => setNewTypeCategory(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="banking">Banking Services (Cash In/Out, Balance, Remittance)</option>
                    <option value="social_security">Social Security (PMJJBY, PMSBY, APY)</option>
                    <option value="onboarding">Customer Onboarding & Accounts</option>
                    <option value="credit">Credit / Loans / Cards</option>
                    <option value="other">Other Operations</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Percentage Split Editor */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Configure Split Percentages</span>
              </h3>
              <span className="text-[11px] font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                Total: {Math.round(cspPercent + corporatePercent)}%
              </span>
            </div>

            {/* Visual Ratio Split Bar */}
            <div className="space-y-1.5">
              <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex shadow-inner">
                <div
                  style={{ width: `${cspPercent}%` }}
                  className="bg-emerald-500 h-full transition-all duration-300"
                  title={`CSP Share: ${cspPercent}%`}
                />
                <div
                  style={{ width: `${corporatePercent}%` }}
                  className="bg-indigo-600 h-full transition-all duration-300"
                  title={`Corporate BC Share: ${corporatePercent}%`}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span className="text-emerald-600 dark:text-emerald-400">
                  CSP Share: {cspPercent}%
                </span>
                <span className="text-indigo-600 dark:text-indigo-400">
                  Corporate BC Share: {corporatePercent}%
                </span>
              </div>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  CSP Commission Share (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={cspPercent}
                    onChange={(e) => {
                      const val = Math.max(0, Math.min(100, Number(e.target.value)));
                      setCspPercent(val);
                    }}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                  />
                  <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={cspPercent}
                  onChange={(e) => setCspPercent(Number(e.target.value))}
                  className="w-full mt-2 accent-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Corporate BC Share (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    disabled
                    value={corporatePercent}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold"
                  />
                  <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Automatically balanced to equal 100% of raw bank commission
                </p>
              </div>
            </div>

            {/* Presets */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
              <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                Quick Ratio Presets:
              </span>
              <div className="flex flex-wrap gap-2">
                {presets.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setCspPercent(p.csp)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                      cspPercent === p.csp
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Calculation Preview */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-xs space-y-1">
              <div className="font-semibold text-slate-700 dark:text-slate-300">
                Prorated Commission Calculation Example:
              </div>
              <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                On <span className="font-semibold text-slate-700 dark:text-slate-200">₹ 1,000.00</span> gross bank commission for{' '}
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {isAddingNew ? newTypeName || 'New Product' : selectedType}
                </span>:
                <div className="mt-1 font-mono flex items-center gap-3">
                  <span className="text-emerald-600 dark:text-emerald-400">
                    CSP: ₹ {((1000 * cspPercent) / 100).toFixed(2)} ({cspPercent}%)
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="text-indigo-600 dark:text-indigo-400">
                    Corporate BC: ₹ {((1000 * corporatePercent) / 100).toFixed(2)} ({corporatePercent}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleSaveOverride}
                disabled={isAddingNew && !newTypeName.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs inline-flex items-center gap-1.5 transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                <span>
                  {isAddingNew ? 'Create Product & Save Rule' : 'Save Product Override Rule'}
                </span>
              </button>
            </div>
          </div>

          {/* Active Configured Overrides Master Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Active Product Overrides ({Object.keys(commissionSplitConfig.overrides || {}).length})
              </h4>
              <span className="text-[11px] text-slate-400">
                Click "Edit" on any rule to load it into the editor
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {Object.values(commissionSplitConfig.overrides || {}).length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No custom product overrides active. All transactions use the default {commissionSplitConfig.defaultCspPercent}% CSP / {commissionSplitConfig.defaultCorporatePercent}% BC ratio.
                  </div>
                ) : (
                  Object.values(commissionSplitConfig.overrides || {}).map((o) => (
                    <div
                      key={o.transactionType}
                      className={`flex items-center justify-between px-3.5 py-2.5 text-xs transition-colors ${
                        selectedType === o.transactionType && !isAddingNew
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/40'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {o.transactionType}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          CSP: {o.cspPercent}% &bull; Corporate BC: {o.corporatePercent}%
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900">
                          {o.cspPercent} / {o.corporatePercent}
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingNew(false);
                            setSelectedType(o.transactionType);
                            setCspPercent(o.cspPercent);
                          }}
                          className="px-2 py-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-[11px] transition-colors"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveOverride(o.transactionType)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                          title="Remove override"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
