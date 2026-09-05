export interface RawCommissionRecord {
  id: string;
  circle: string;              // Circle Code, e.g. "01", "12"
  circleName: string;          // Circle Name, e.g. "Bhopal", "Mumbai Metro"
  bcbfCode: string;            // BCBF Code, e.g. "BCBF_001"
  cspCode: string;             // CSP Code, e.g. "1A234567"
  cspName: string;             // CSP Name, e.g. "Shree Ganesh Kiosk"
  transactionType: string;     // Transaction Type, e.g. "AEPS Cash Withdrawal"
  numTxnsOrAvgBal: number;     // Num Txns / Avg Bal
  rawCommission: number;       // Gross Raw Commission from Bank (INR)
  period: string;              // Reporting Period, e.g. "September 2026", "2026-09"
  month?: string;              // Reporting Month, e.g. "September"
  year?: number;               // Reporting Year, e.g. 2026
  createdAt: string;
  batchId?: string;
  notes?: string;
}

export interface ProductSplitOverride {
  transactionType: string;
  cspPercent: number;          // e.g. 75
  corporatePercent: number;    // e.g. 25
  effectiveFrom?: string;      // YYYY-MM or YYYY-MM-DD
  effectiveTo?: string;
}

export interface CspCategory {
  id: string;
  code: string; // 'rural' | 'urban' | string
  name: string; // 'Rural' | 'Urban' | string
  description?: string;
  cspSharePercent: number; // e.g. 75 for rural, 70 for urban
  corporateSharePercent: number; // e.g. 25 for rural, 30 for urban
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CommissionSplitConfig {
  id: string;
  effectiveFrom: string;       // e.g. "2026-04-01"
  effectiveTo?: string;
  defaultCspPercent: number;   // default 70
  defaultCorporatePercent: number; // default 30
  categorySplits?: Record<string, { cspPercent: number; corporatePercent: number }>; // keyed by category code, e.g. 'rural' -> { cspPercent: 75, corporatePercent: 25 }
  overrides: Record<string, ProductSplitOverride>; // keyed by transactionType
  updatedAt: string;
  updatedBy: string;
}

export interface TdsRateSchedule {
  id: string;
  effectiveFrom: string;       // e.g. "2026-04-01"
  effectiveTo?: string;
  ratePercent: number;         // default 5.0 (Section 194H)
  nonPanRatePercent: number;   // default 20.0
  section: string;             // "194H"
  description: string;
}

export interface TdsConfig {
  currentRate: number;         // default 5.0%
  nonPanRate: number;          // default 20.0%
  section: string;             // "194H"
  schedules: TdsRateSchedule[];
  updatedAt: string;
  updatedBy: string;
}

export interface TransactionTypeDefinition {
  id: string;
  code: string;
  name: string;
  category: 'banking' | 'social_security' | 'onboarding' | 'credit' | 'other';
  description?: string;
  defaultCommissionRate?: number; // indicative bank rate
  isActive: boolean;
}

export interface CalculatedCommissionItem {
  id: string;
  raw: RawCommissionRecord;
  cspSplitPercent: number;
  corporateSplitPercent: number;
  cspGrossCommission: number;
  corporateCommission: number;
  tdsRate: number;
  tdsDeducted: number;
  netPayableCommission: number;
}

export interface CspTypeBreakdown {
  transactionType: string;
  numTxnsOrAvgBal: number;
  rawCommission: number;
  cspSplitPercent: number;
  cspGrossCommission: number;
  tdsDeducted: number;
  netPayable: number;
  corporateCommission: number;
}

export interface CspCommissionStatement {
  cspCode: string;
  cspName: string;
  circle: string;
  circleName: string;
  bcbfCode: string;
  period: string;
  cspCategory?: string; // 'rural' | 'urban'
  month?: string;
  year?: number;
  totalNumTxns: number;
  totalRawCommission: number;
  transactionCommission: number; // TRANSACTION
  incentivesCommission: number;  // INCENTIVES
  ruralCommission: number;       // RURAL
  totalCspGrossCommission: number; // PAYABLE TO CSP
  totalTdsDeducted: number;        // TDS
  totalNetPayable: number;         // NET PAYABLE
  totalCorporateShare: number;
  effectiveCspRate: number; // average %
  breakdown: CspTypeBreakdown[];
  items: CalculatedCommissionItem[];
}
