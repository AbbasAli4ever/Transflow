import { apiRequest } from "./api";

// ─── P&L Report ───────────────────────────────────────────────────────────────

export interface ProfitLossReport {
  dateFrom: string;
  dateTo: string;
  sales: number;
  salesReturns: number;
  netRevenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  grossProfitMargin: number;
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
  name: string;
  debit: number;
  credit: number;
}

export interface TrialBalanceReport {
  asOfDate: string;
  accounts: TrialBalanceAccount[];
  totalDebit: number;
  totalCredit: number;
}

export function getTrialBalance(asOfDate?: string): Promise<TrialBalanceReport> {
  const qs = asOfDate ? `?asOfDate=${asOfDate}` : "";
  return apiRequest<TrialBalanceReport>(`/reports/trial-balance${qs}`);
}

// ─── Inventory Valuation ──────────────────────────────────────────────────────

export interface InventoryVariant {
  variantId: string;
  size: string;
  sku: string | null;
  qtyOnHand: number;
  avgCost: number;
  totalValue: number;
}

export interface InventoryProduct {
  productId: string;
  productName: string;
  sku: string | null;
  category: string | null;
  variants: InventoryVariant[];
  productTotalQty: number;
  productTotalValue: number;
}

export interface InventoryValuationReport {
  asOfDate: string;
  grandTotalValue: number;
  products: InventoryProduct[];
}

export function getInventoryValuation(
  asOfDate: string
): Promise<InventoryValuationReport> {
  return apiRequest<InventoryValuationReport>(
    `/reports/inventory-valuation?asOfDate=${asOfDate}`
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
