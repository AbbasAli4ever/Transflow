import { apiRequest } from "./api";

// ─── P&L Report ───────────────────────────────────────────────────────────────

export interface ProfitLossReport {
  period: {
    from: string;
    to: string;
  };
  revenue: {
    salesRevenue: number;
    salesReturns: number;
    netRevenue: number;
  };
  costOfGoodsSold: number;
  grossProfit: number;
  operatingExpenses: {
    byCategory: Array<{
      categoryName: string;
      amount: number;
    }>;
    total: number;
  };
  netIncome: number;
}

export function getProfitLossReport(
  dateFrom: string,
  dateTo: string
): Promise<ProfitLossReport> {
  return apiRequest<ProfitLossReport>(
    `/reports/profit-loss?dateFrom=${dateFrom}&dateTo=${dateTo}`
  );
}

// ─── Aged Receivables ─────────────────────────────────────────────────────────

export interface OpenDocumentRef {
  id: string;
  documentNumber: string | null;
  transactionDate: string;
  outstanding: number;
  daysPastDue: number;
}

export interface ReceivableCustomer {
  customerId: string;
  customerName: string;
  totalOutstanding: number;
  unappliedCredits: number;
  netOutstanding: number;
  balance?: number;
  oldestInvoiceDate?: string;
  daysPastDue?: number;
  openDocuments: OpenDocumentRef[];
}

export interface PendingReceivablesReport {
  asOfDate: string;
  receivables?: ReceivableCustomer[];
  customers?: ReceivableCustomer[];
}

export function getPendingReceivables(
  asOfDate: string,
  customerId?: string,
  minAmount?: number
): Promise<PendingReceivablesReport> {
  const qs = new URLSearchParams({ asOfDate });
  if (customerId) qs.set("customerId", customerId);
  if (minAmount !== undefined) qs.set("minAmount", String(minAmount));
  return apiRequest<PendingReceivablesReport>(
    `/reports/pending-receivables?${qs.toString()}`
  );
}

// ─── Aged Payables ────────────────────────────────────────────────────────────

export interface PayableSupplier {
  supplierId: string;
  supplierName: string;
  totalOutstanding: number;
  unappliedCredits: number;
  netOutstanding: number;
  balance?: number;
  oldestBillDate?: string;
  daysPastDue?: number;
  openDocuments: OpenDocumentRef[];
}

export interface PendingPayablesReport {
  asOfDate: string;
  payables?: PayableSupplier[];
  suppliers?: PayableSupplier[];
}

export function getPendingPayables(
  asOfDate: string,
  supplierId?: string,
  minAmount?: number
): Promise<PendingPayablesReport> {
  const qs = new URLSearchParams({ asOfDate });
  if (supplierId) qs.set("supplierId", supplierId);
  if (minAmount !== undefined) qs.set("minAmount", String(minAmount));
  return apiRequest<PendingPayablesReport>(
    `/reports/pending-payables?${qs.toString()}`
  );
}

// ─── Trial Balance ────────────────────────────────────────────────────────────

export interface TrialBalanceAccount {
  accountNumber: string;
  accountName: string;
  type: string;
  subtype: string;
  totalDebit: number;
  totalCredit: number;
  balance: number;
  normalBalance: string;
}

export interface TrialBalanceReport {
  asOfDate: string;
  accounts: TrialBalanceAccount[];
  totals: {
    totalDebits: number;
    totalCredits: number;
  };
}

export function getTrialBalance(asOfDate?: string): Promise<TrialBalanceReport> {
  const qs = asOfDate ? `?asOfDate=${asOfDate}` : "";
  return apiRequest<TrialBalanceReport>(`/reports/trial-balance${qs}`);
}

// ─── Inventory Valuation ──────────────────────────────────────────────────────

export interface InventoryVariant {
  productName: string;
  variantSize: string;
  accountNumber: string;
  inventoryValue: number;
  quantity: number;
  avgCost: number;
}

export interface InventoryValuationReport {
  asOfDate: string;
  totalInventoryValue: number;
  variants: InventoryVariant[];
}

export function getInventoryValuation(
  asOfDate: string
): Promise<InventoryValuationReport> {
  return apiRequest<InventoryValuationReport>(
    `/reports/inventory-valuation?asOfDate=${asOfDate}`
  );
}

// ─── Balance Sheet ────────────────────────────────────────────────────────────

export interface BalanceSheetReport {
  asOfDate: string;
  totalLiabilitiesAndEquity?: number;
  assets: {
    cash: Array<{
      name: string;
      balance: number;
    }> | number;
    totalCash?: number;
    accountsReceivable: Array<{
      name: string;
      balance: number;
    }> | number;
    totalAccountsReceivable?: number;
    inventory: Array<{
      name: string;
      balance: number;
    }> | number;
    totalInventory?: number;
    totalAssets: number;
  };
  liabilities: {
    accountsPayable: Array<{
      name: string;
      balance: number;
    }> | number;
    totalAccountsPayable?: number;
    totalLiabilities: number;
  };
  equity: {
    openingCapital: number;
    retainedEarnings: number;
    totalEquity: number;
  };
  isBalanced: boolean;
}

export function getBalanceSheet(asOfDate: string): Promise<BalanceSheetReport> {
  return apiRequest<BalanceSheetReport>(
    `/reports/balance-sheet?asOfDate=${asOfDate}`
  );
}

// ─── Cash Position ────────────────────────────────────────────────────────────

export type CashPositionAccountType = "CASH" | "BANK" | "WALLET" | "CARD";

export interface CashPositionAccount {
  accountId: string;
  accountName: string;
  accountType: CashPositionAccountType;
  balance: number;
}

export interface CashPositionReport {
  asOfDate: string;
  totalCash: number;
  accounts: CashPositionAccount[];
}

export function getCashPosition(asOfDate: string): Promise<CashPositionReport> {
  return apiRequest<CashPositionReport>(
    `/reports/cash-position?asOfDate=${asOfDate}`
  );
}

// ─── Currency Helper ──────────────────────────────────────────────────────────

export function formatPKR(value: number): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(value);
}
