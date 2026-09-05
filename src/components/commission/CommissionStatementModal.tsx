import React from 'react';
import { CspCommissionStatement } from '../../types/commission.type';
import { formatIndianCurrency, formatAmountInWords } from '../../lib/indianCurrency';
import { generateCommissionCsv } from '../../lib/commissionCalculator';
import {
  X,
  Printer,
  Download,
  Building2,
  Receipt,
  FileCheck2,
  Calendar,
  CheckCircle2,
} from 'lucide-react';

interface CommissionStatementModalProps {
  statement: CspCommissionStatement | null;
  onClose: () => void;
}

export const CommissionStatementModal: React.FC<CommissionStatementModalProps> = ({
  statement,
  onClose,
}) => {
  if (!statement) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCsv = () => {
    const csv = generateCommissionCsv(statement);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Commission_Statement_${statement.cspCode}_${statement.period.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 print:p-0 print:bg-white">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-auto print:border-none print:shadow-none print:rounded-none">
        {/* Top Control Bar (Hidden on Print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 print:hidden">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-sm">
            <Receipt className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>CSP Commission Payout Statement</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadCsv}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Formal Printable Statement Container */}
        <div className="p-6 sm:p-8 space-y-6 text-slate-900 dark:text-slate-100 print:p-0 print:text-black">
          {/* Statement Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold text-xs uppercase tracking-wider">
                  Official Statement
                </span>
                <span className="text-xs text-slate-400">
                  Ref: CMS-{statement.cspCode}-{statement.period.replace(/\s+/g, '')}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black mt-1.5 tracking-tight text-slate-900 dark:text-white">
                E-GRAMIN CLIENT SERVICE MANAGEMENT
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Corporate Banking Correspondent Division • Commission Payout Voucher
              </p>
            </div>

            <div className="text-right sm:text-right bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800 print:border-slate-300">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Payout Period
              </div>
              <div className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-0.5 flex items-center justify-end gap-1.5">
                <Calendar className="w-4 h-4" />
                {statement.period}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                TDS Section 194H Compliant
              </div>
            </div>
          </div>

          {/* CSP & Bank Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50/60 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <div className="text-slate-400 font-medium text-[11px]">CSP Code / Kiosk ID</div>
              <div className="font-bold text-slate-900 dark:text-white font-mono mt-0.5">
                {statement.cspCode}
              </div>
            </div>
            <div>
              <div className="text-slate-400 font-medium text-[11px]">CSP Operator / Kiosk</div>
              <div className="font-bold text-slate-900 dark:text-white truncate mt-0.5">
                {statement.cspName}
              </div>
            </div>
            <div>
              <div className="text-slate-400 font-medium text-[11px]">CSP Category</div>
              <div className="mt-0.5">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    (statement.cspCategory || 'rural').toLowerCase() === 'urban'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  }`}
                >
                  {(statement.cspCategory || 'rural').toUpperCase()}
                </span>
              </div>
            </div>
            <div>
              <div className="text-slate-400 font-medium text-[11px]">Bank Circle</div>
              <div className="font-bold text-slate-900 dark:text-white mt-0.5 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-slate-400" />
                <span>{statement.circleName} ({statement.circle})</span>
              </div>
            </div>
            <div>
              <div className="text-slate-400 font-medium text-[11px]">BCBF Branch Code</div>
              <div className="font-bold text-slate-900 dark:text-white font-mono mt-0.5">
                {statement.bcbfCode}
              </div>
            </div>
          </div>

          {/* Key Payout Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-400">Total Raw Bank Commission</div>
              <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                {formatIndianCurrency(statement.totalRawCommission)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {statement.totalNumTxns.toLocaleString()} Total Txns / Vol
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs">
              <div className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                Gross CSP Share ({statement.effectiveCspRate}%)
              </div>
              <div className="text-lg font-black text-indigo-700 dark:text-indigo-300 mt-1">
                {formatIndianCurrency(statement.totalCspGrossCommission)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Before TDS Deduction
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-rose-200/80 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 shadow-xs">
              <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                TDS Deducted (5.0%)
              </div>
              <div className="text-lg font-black text-rose-600 dark:text-rose-400 mt-1">
                - {formatIndianCurrency(statement.totalTdsDeducted)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Section 194H IT Act
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/40 shadow-xs">
              <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                Net Payable to CSP
              </div>
              <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                {formatIndianCurrency(statement.totalNetPayable)}
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-500 font-semibold mt-0.5">
                Direct Credit to Holding / Bank
              </div>
            </div>
          </div>

          {/* Amount In Words Banner */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs">
            <span className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider mr-2">
              Net Amount in Words:
            </span>
            <span className="font-bold text-slate-900 dark:text-white">
              {formatAmountInWords(statement.totalNetPayable, { currency: 'INR' })}
            </span>
          </div>

          {/* Standard 9-Column Executive Payout Summary */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>Executive Payout Summary</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-400">
                Standard Banking Correspondent Format
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold">
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
                  </tr>
                </thead>
                <tbody>
                  <tr className="font-medium text-slate-900 dark:text-white">
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                      {statement.cspCode}
                    </td>
                    <td className="py-2.5 px-3 font-semibold whitespace-nowrap">
                      {statement.cspName}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {statement.transactionCommission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {statement.incentivesCommission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {statement.ruralCommission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                      {statement.totalRawCommission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-rose-600 dark:text-rose-400 whitespace-nowrap">
                      {statement.totalTdsDeducted.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                      {statement.totalCspGrossCommission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {statement.totalNetPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Transaction Type Breakdown Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5" />
                Product-Wise Commission Breakdown
              </h3>
              <span className="text-[11px] text-slate-400">
                {statement.breakdown.length} Products Processed
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                    <th className="py-2.5 px-3">Transaction Type</th>
                    <th className="py-2.5 px-3 text-right">Num Txns / Avg Bal</th>
                    <th className="py-2.5 px-3 text-right">Bank Raw (₹)</th>
                    <th className="py-2.5 px-3 text-center">Split %</th>
                    <th className="py-2.5 px-3 text-right">CSP Gross (₹)</th>
                    <th className="py-2.5 px-3 text-right">TDS 5% (₹)</th>
                    <th className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400 font-bold">
                      Net Payout (₹)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {statement.breakdown.map((b, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                        {b.transactionType}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                        {b.numTxnsOrAvgBal.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium">
                        {b.rawCommission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-indigo-600 dark:text-indigo-400 text-[11px]">
                        {b.cspSplitPercent}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {b.cspGrossCommission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-600 dark:text-rose-400">
                        {b.tdsDeducted.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {b.netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100/90 dark:bg-slate-800/90 font-black border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                    <td className="py-3 px-3 uppercase text-[11px]">Total Summary</td>
                    <td className="py-3 px-3 text-right font-mono">
                      {statement.totalNumTxns.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono">
                      {statement.totalRawCommission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-center text-indigo-600 dark:text-indigo-400 font-bold">
                      {statement.effectiveCspRate}%
                    </td>
                    <td className="py-3 px-3 text-right font-mono">
                      {statement.totalCspGrossCommission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-rose-600 dark:text-rose-400">
                      {statement.totalTdsDeducted.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                      {statement.totalNetPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Corporate Share & Compliance Disclaimer */}
          <div className="pt-2 pb-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-[11px] text-slate-400">
            <div>
              <span className="font-semibold text-slate-600 dark:text-slate-300">Corporate BC Margin (30% Split):</span>{' '}
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                {formatIndianCurrency(statement.totalCorporateShare)}
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">
                This document is a system-generated statement and does not require a physical signature.
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-xs shrink-0">
              <CheckCircle2 className="w-4 h-4" />
              <span>Verified E-Gramin CSMP Record</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
