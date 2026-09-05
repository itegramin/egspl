import {
  RawCommissionRecord,
  CommissionSplitConfig,
  TdsConfig,
  CalculatedCommissionItem,
  CspCommissionStatement,
  CspTypeBreakdown,
  TransactionTypeDefinition,
  CspCategory,
} from '../types/commission.type';
import type { User } from '../types/app.type';

// ─────────────────────────────────────────────────────────────────────────────
// Default System Configurations
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_COMMISSION_SPLIT_CONFIG: CommissionSplitConfig = {
  id: 'split_cfg_default',
  effectiveFrom: '2026-04-01',
  defaultCspPercent: 70, // 70-30 split standard
  defaultCorporatePercent: 30,
  categorySplits: {
    rural: { cspPercent: 75, corporatePercent: 25 },
    urban: { cspPercent: 70, corporatePercent: 30 },
  },
  overrides: {
    'AEPS Cash Withdrawal': {
      transactionType: 'AEPS Cash Withdrawal',
      cspPercent: 70,
      corporatePercent: 30,
    },
    'Micro ATM': {
      transactionType: 'Micro ATM',
      cspPercent: 70,
      corporatePercent: 30,
    },
    'Saving Account Opening': {
      transactionType: 'Saving Account Opening',
      cspPercent: 75,
      corporatePercent: 25,
    },
    'PMJJBY': {
      transactionType: 'PMJJBY',
      cspPercent: 80,
      corporatePercent: 20,
    },
    'PMSBY': {
      transactionType: 'PMSBY',
      cspPercent: 80,
      corporatePercent: 20,
    },
    'APY': {
      transactionType: 'APY',
      cspPercent: 75,
      corporatePercent: 25,
    },
    'IMPS Remittance': {
      transactionType: 'IMPS Remittance',
      cspPercent: 70,
      corporatePercent: 30,
    },
    'Passbook Printing': {
      transactionType: 'Passbook Printing',
      cspPercent: 80,
      corporatePercent: 20,
    },
  },
  updatedAt: new Date().toISOString(),
  updatedBy: 'System Admin',
};

export const DEFAULT_TDS_CONFIG: TdsConfig = {
  currentRate: 5.0, // Section 194H standard: 5%
  nonPanRate: 20.0,
  section: '194H',
  schedules: [
    {
      id: 'tds_sch_fy26_27',
      effectiveFrom: '2026-04-01',
      ratePercent: 5.0,
      nonPanRatePercent: 20.0,
      section: '194H',
      description: 'Standard Section 194H Business Correspondent TDS Rate',
    },
  ],
  updatedAt: new Date().toISOString(),
  updatedBy: 'System Admin',
};


// ─────────────────────────────────────────────────────────────────────────────
// Calculation Functions
// ─────────────────────────────────────────────────────────────────────────────

export function getApplicableSplit(
  transactionType: string,
  splitConfig: CommissionSplitConfig,
  cspCategory?: string,
  categories?: CspCategory[]
): { cspPercent: number; corporatePercent: number } {
  // 1. Transaction-type specific override takes precedence
  const override = splitConfig.overrides?.[transactionType];
  if (override) {
    return {
      cspPercent: override.cspPercent,
      corporatePercent: override.corporatePercent,
    };
  }

  const catCode = (cspCategory || 'rural').toLowerCase().trim();

  // 2. Check dynamic categories table from database
  if (categories && categories.length > 0) {
    const matched = categories.find((c) => c.code.toLowerCase() === catCode && c.isActive);
    if (matched) {
      return {
        cspPercent: Number(matched.cspSharePercent),
        corporatePercent: Number(matched.corporateSharePercent),
      };
    }
  }

  // 3. Check splitConfig categorySplits
  if (splitConfig.categorySplits?.[catCode]) {
    return {
      cspPercent: splitConfig.categorySplits[catCode].cspPercent,
      corporatePercent: splitConfig.categorySplits[catCode].corporatePercent,
    };
  }

  // 4. Default rules per category: Rural = 75% CSP, Urban = 70% CSP
  if (catCode === 'rural') {
    return { cspPercent: 75, corporatePercent: 25 };
  }
  if (catCode === 'urban') {
    return { cspPercent: 70, corporatePercent: 30 };
  }

  return {
    cspPercent: splitConfig.defaultCspPercent ?? 70,
    corporatePercent: splitConfig.defaultCorporatePercent ?? 30,
  };
}

export function calculateCommissionItem(
  record: RawCommissionRecord,
  splitConfig: CommissionSplitConfig,
  tdsConfig: TdsConfig,
  cspCategory?: string,
  categories?: CspCategory[]
): CalculatedCommissionItem {
  const { cspPercent, corporatePercent } = getApplicableSplit(
    record.transactionType,
    splitConfig,
    cspCategory,
    categories
  );
  const rawCommission = Math.max(0, record.rawCommission || 0);

  const cspGrossCommission = Math.round((rawCommission * (cspPercent / 100)) * 100) / 100;
  const corporateCommission = Math.round((rawCommission - cspGrossCommission) * 100) / 100;

  const tdsRate = tdsConfig.currentRate ?? 5.0;
  const tdsDeducted = Math.round((cspGrossCommission * (tdsRate / 100)) * 100) / 100;
  const netPayableCommission = Math.round((cspGrossCommission - tdsDeducted) * 100) / 100;

  return {
    id: `calc_${record.id}`,
    raw: record,
    cspSplitPercent: cspPercent,
    corporateSplitPercent: corporatePercent,
    cspGrossCommission,
    corporateCommission,
    tdsRate,
    tdsDeducted,
    netPayableCommission,
  };
}

export type TransactionClassification = 'transaction' | 'incentives' | 'rural';

export function classifyTransactionType(
  typeName: string,
  category?: string
): TransactionClassification {
  const lower = (typeName || '').toLowerCase().trim();
  const cat = (category || '').toLowerCase().trim();

  // 1. Rural
  if (lower.includes('rural')) {
    return 'rural';
  }

  // 2. Incentives: Social security schemes, accounts onboarding, credit/loans, or explicit incentive terms
  if (
    cat === 'social_security' ||
    cat === 'onboarding' ||
    cat === 'credit' ||
    lower.includes('incentive') ||
    lower.includes('bonus') ||
    lower.includes('scheme') ||
    lower.includes('pmjjby') ||
    lower.includes('pmsby') ||
    lower.includes('apy') ||
    lower.includes('opening') ||
    lower.includes('enrollment') ||
    lower.includes('kyc')
  ) {
    return 'incentives';
  }

  // 3. Transactions: Core banking transactions (AEPS, mATM, Remittance, Passbook, Deposit, etc.)
  return 'transaction';
}

export function calculateCspStatements(
  records: RawCommissionRecord[],
  splitConfig: CommissionSplitConfig,
  tdsConfig: TdsConfig,
  filterPeriod?: string,
  filterMonth?: string,
  filterYear?: number,
  users?: User[],
  categories?: CspCategory[]
): CspCommissionStatement[] {
  const filtered = records.filter((r) => {
    if (filterPeriod && filterPeriod !== 'all' && r.period !== filterPeriod) {
      return false;
    }
    if (filterMonth && filterMonth !== 'all') {
      const m = r.month || (r.period ? r.period.split(' ')[0] : '');
      if (m.toLowerCase() !== filterMonth.toLowerCase()) return false;
    }
    if (filterYear && filterYear > 0) {
      const y =
        r.year != null
          ? r.year
          : r.period && !isNaN(Number(r.period.split(' ')[1]))
          ? Number(r.period.split(' ')[1])
          : 0;
      if (y !== filterYear) return false;
    }
    return true;
  });

  // Group by period + cspCode
  const groups = new Map<string, RawCommissionRecord[]>();

  for (const rec of filtered) {
    const key = `${rec.period}___${rec.cspCode}`;
    const list = groups.get(key) || [];
    list.push(rec);
    groups.set(key, list);
  }

  const statements: CspCommissionStatement[] = [];

  for (const [, groupRecords] of groups.entries()) {
    if (groupRecords.length === 0) continue;

    const first = groupRecords[0];
    const cspCode = first.cspCode;
    const period = first.period;
    const parts = (period || '').trim().split(' ');
    const month = first.month || parts[0] || undefined;
    const year = first.year != null ? first.year : (parts[1] && !isNaN(Number(parts[1])) ? Number(parts[1]) : undefined);

    // Look up CSP category from csmp_users (rural or urban)
    let cspCategory = 'rural';
    if (users && users.length > 0) {
      const codeClean = (cspCode || '').trim().toLowerCase();
      const nameClean = (first.cspName || '').trim().toLowerCase();
      const matchedUser = users.find(
        (u) =>
          (u.kioskId && u.kioskId.trim().toLowerCase() === codeClean) ||
          u.id.toLowerCase() === codeClean ||
          (u.name && u.name.trim().toLowerCase() === nameClean)
      );
      if (matchedUser && matchedUser.category) {
        cspCategory = matchedUser.category.toLowerCase();
      }
    }

    let totalNumTxns = 0;
    let totalRawCommission = 0;
    let totalTransactionCommission = 0;
    let totalIncentivesCommission = 0;
    let totalRuralCommission = 0;
    let totalCspGrossCommission = 0;
    let totalTdsDeducted = 0;
    let totalNetPayable = 0;
    let totalCorporateShare = 0;

    const typeGroups = new Map<string, {
      numTxnsOrAvgBal: number;
      rawCommission: number;
      cspGross: number;
      tds: number;
      net: number;
      corporate: number;
      cspPercent: number;
    }>();

    const calculatedItems: CalculatedCommissionItem[] = [];

    for (const rec of groupRecords) {
      const calc = calculateCommissionItem(rec, splitConfig, tdsConfig, cspCategory, categories);
      calculatedItems.push(calc);

      const rawAmount = calc.raw.rawCommission || 0;
      totalNumTxns += rec.numTxnsOrAvgBal || 0;
      totalRawCommission += rawAmount;
      totalCspGrossCommission += calc.cspGrossCommission;
      totalTdsDeducted += calc.tdsDeducted;
      totalNetPayable += calc.netPayableCommission;
      totalCorporateShare += calc.corporateCommission;

      const classification = classifyTransactionType(rec.transactionType);
      if (classification === 'rural') {
        totalRuralCommission += rawAmount;
      } else if (classification === 'incentives') {
        totalIncentivesCommission += rawAmount;
      } else {
        totalTransactionCommission += rawAmount;
      }

      const tKey = rec.transactionType;
      const cur = typeGroups.get(tKey) || {
        numTxnsOrAvgBal: 0,
        rawCommission: 0,
        cspGross: 0,
        tds: 0,
        net: 0,
        corporate: 0,
        cspPercent: calc.cspSplitPercent,
      };

      cur.numTxnsOrAvgBal += rec.numTxnsOrAvgBal || 0;
      cur.rawCommission += rawAmount;
      cur.cspGross += calc.cspGrossCommission;
      cur.tds += calc.tdsDeducted;
      cur.net += calc.netPayableCommission;
      cur.corporate += calc.corporateCommission;
      typeGroups.set(tKey, cur);
    }

    const breakdown: CspTypeBreakdown[] = Array.from(typeGroups.entries()).map(([transactionType, data]) => ({
      transactionType,
      numTxnsOrAvgBal: Math.round(data.numTxnsOrAvgBal * 100) / 100,
      rawCommission: Math.round(data.rawCommission * 100) / 100,
      cspSplitPercent: data.cspPercent,
      cspGrossCommission: Math.round(data.cspGross * 100) / 100,
      tdsDeducted: Math.round(data.tds * 100) / 100,
      netPayable: Math.round(data.net * 100) / 100,
      corporateCommission: Math.round(data.corporate * 100) / 100,
    }));

    breakdown.sort((a, b) => b.netPayable - a.netPayable);

    const effectiveCspRate = totalRawCommission > 0
      ? Math.round((totalCspGrossCommission / totalRawCommission) * 1000) / 10
      : 70;

    statements.push({
      cspCode,
      cspName: first.cspName,
      circle: first.circle,
      circleName: first.circleName,
      bcbfCode: first.bcbfCode,
      period,
      cspCategory,
      month,
      year,
      totalNumTxns: Math.round(totalNumTxns * 100) / 100,
      totalRawCommission: Math.round(totalRawCommission * 100) / 100,
      transactionCommission: Math.round(totalTransactionCommission * 100) / 100,
      incentivesCommission: Math.round(totalIncentivesCommission * 100) / 100,
      ruralCommission: Math.round(totalRuralCommission * 100) / 100,
      totalCspGrossCommission: Math.round(totalCspGrossCommission * 100) / 100,
      totalTdsDeducted: Math.round(totalTdsDeducted * 100) / 100,
      totalNetPayable: Math.round(totalNetPayable * 100) / 100,
      totalCorporateShare: Math.round(totalCorporateShare * 100) / 100,
      effectiveCspRate,
      breakdown,
      items: calculatedItems,
    });
  }

  // Sort statements by period desc, then net desc
  statements.sort((a, b) => b.period.localeCompare(a.period) || b.totalNetPayable - a.totalNetPayable);

  return statements;
}

export const aggregateCspStatements = calculateCspStatements;


// ─────────────────────────────────────────────────────────────────────────────
// CSV Parser & Serializer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parses raw transaction lines in format:
 * Circle, Circle Name, BCBF_CODE, CSP_CODE, CSP Name, Transaction Type, Num Txns / Avg Bal, Commission
 */
export function parseCommissionCsv(
  csvContent: string,
  defaultPeriod = 'August 2026'
): { records: RawCommissionRecord[]; errors: string[] } {
  const records: RawCommissionRecord[] = [];
  const errors: string[] = [];

  const lines = csvContent
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length === 0) {
    return { records: [], errors: ['File is empty.'] };
  }

  const batchId = `batch_${Date.now().toString(36)}`;
  const now = new Date().toISOString();

  let startIndex = 0;
  // Check if first line is a header
  const firstLine = lines[0].toLowerCase();
  if (
    firstLine.includes('circle') ||
    firstLine.includes('bcbf') ||
    firstLine.includes('csp') ||
    firstLine.includes('transaction')
  ) {
    startIndex = 1;
  }

  for (let i = startIndex; i < lines.length; i++) {
    const rawLine = lines[i];

    // Support comma or tab separation
    const delimiter = rawLine.includes('\t') ? '\t' : ',';
    
    // Robust CSV split respecting quotes
    const parts = splitCsvLine(rawLine, delimiter);

    if (parts.length < 8) {
      errors.push(`Row ${i + 1}: Expected 8 columns, found ${parts.length}.`);
      continue;
    }

    const circle = parts[0]?.trim() || '';
    const circleName = parts[1]?.trim() || '';
    const bcbfCode = parts[2]?.trim() || '';
    const cspCode = parts[3]?.trim() || '';
    const cspName = parts[4]?.trim() || '';
    const transactionType = parts[5]?.trim() || '';
    
    const numTxnsOrAvgBal = cleanNumber(parts[6]);
    const rawCommission = cleanNumber(parts[7]);

    if (!cspCode || !transactionType) {
      errors.push(`Row ${i + 1}: Missing CSP_CODE or Transaction Type.`);
      continue;
    }

    const periodParts = defaultPeriod.trim().split(' ');
    const parsedMonth = periodParts[0] || undefined;
    const parsedYear =
      periodParts[1] && !isNaN(Number(periodParts[1]))
        ? Number(periodParts[1])
        : undefined;

    records.push({
      id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      circle: circle || '01',
      circleName: circleName || 'Default Circle',
      bcbfCode: bcbfCode || 'BCBF_001',
      cspCode,
      cspName: cspName || `CSP ${cspCode}`,
      transactionType,
      numTxnsOrAvgBal,
      rawCommission,
      period: defaultPeriod,
      month: parsedMonth,
      year: parsedYear,
      createdAt: now,
      batchId,
    });
  }

  return { records, errors };
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function cleanNumber(val: string | undefined): number {
  if (!val) return 0;
  // Strip currency symbols (₹, $, Rs), commas, and spaces
  const cleaned = val.replace(/[₹$Rs,\s]/gi, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function generateCommissionSummaryReportCsv(statements: CspCommissionStatement[]): string {
  const headers = [
    'CSP CODE',
    'CSP NAME',
    'TRANSACTION',
    'INCENTIVES',
    'RURAL',
    'TOTAL',
    'TDS',
    'PAYABLE TO CSP',
    'NET PAYABLE',
  ];

  const rows = statements.map(s => [
    `"${s.cspCode}"`,
    `"${s.cspName.replace(/"/g, '""')}"`,
    s.transactionCommission.toFixed(2),
    s.incentivesCommission.toFixed(2),
    s.ruralCommission.toFixed(2),
    s.totalRawCommission.toFixed(2),
    s.totalTdsDeducted.toFixed(2),
    s.totalCspGrossCommission.toFixed(2),
    s.totalNetPayable.toFixed(2),
  ]);

  if (statements.length > 1) {
    const totalTxn = statements.reduce((acc, s) => acc + s.transactionCommission, 0);
    const totalInc = statements.reduce((acc, s) => acc + s.incentivesCommission, 0);
    const totalRur = statements.reduce((acc, s) => acc + s.ruralCommission, 0);
    const totalRaw = statements.reduce((acc, s) => acc + s.totalRawCommission, 0);
    const totalTds = statements.reduce((acc, s) => acc + s.totalTdsDeducted, 0);
    const totalCsp = statements.reduce((acc, s) => acc + s.totalCspGrossCommission, 0);
    const totalNet = statements.reduce((acc, s) => acc + s.totalNetPayable, 0);

    rows.push([
      '"TOTAL"',
      `"ALL CSPS (${statements.length})"`,
      totalTxn.toFixed(2),
      totalInc.toFixed(2),
      totalRur.toFixed(2),
      totalRaw.toFixed(2),
      totalTds.toFixed(2),
      totalCsp.toFixed(2),
      totalNet.toFixed(2),
    ]);
  }

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
}

export function generateCommissionCsv(statement: CspCommissionStatement): string {
  const summaryHeaders = [
    'CSP CODE',
    'CSP NAME',
    'TRANSACTION',
    'INCENTIVES',
    'RURAL',
    'TOTAL',
    'TDS',
    'PAYABLE TO CSP',
    'NET PAYABLE',
  ];

  const summaryRow = [
    `"${statement.cspCode}"`,
    `"${statement.cspName.replace(/"/g, '""')}"`,
    statement.transactionCommission.toFixed(2),
    statement.incentivesCommission.toFixed(2),
    statement.ruralCommission.toFixed(2),
    statement.totalRawCommission.toFixed(2),
    statement.totalTdsDeducted.toFixed(2),
    statement.totalCspGrossCommission.toFixed(2),
    statement.totalNetPayable.toFixed(2),
  ];

  const breakdownHeaders = [
    'Transaction Type',
    'Num Txns / Avg Bal',
    'Bank Commission (INR)',
    'CSP Split %',
    'CSP Gross (INR)',
    'TDS Deducted (INR)',
    'Net Payable (INR)',
    'Corporate Share (INR)',
  ];

  const breakdownRows = statement.breakdown.map(b => [
    `"${b.transactionType}"`,
    b.numTxnsOrAvgBal,
    b.rawCommission.toFixed(2),
    `${b.cspSplitPercent}%`,
    b.cspGrossCommission.toFixed(2),
    b.tdsDeducted.toFixed(2),
    b.netPayable.toFixed(2),
    b.corporateCommission.toFixed(2),
  ]);

  return [
    summaryHeaders.join(','),
    summaryRow.join(','),
    '',
    'PRODUCT-WISE BREAKDOWN',
    breakdownHeaders.join(','),
    ...breakdownRows.map(r => r.join(',')),
  ].join('\r\n');
}
