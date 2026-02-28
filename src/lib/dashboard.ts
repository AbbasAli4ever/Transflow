import { apiRequest } from "./api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardSummary {
  cash: {
    totalBalance: number;
    accounts: { id?: string; name: string; balance: number }[];
  };
  receivables: {
    totalAmount: number;
    customerCount: number;
    overdueAmount: number;
    overdueCount: number;
  };
  payables: {
    totalAmount: number;
    supplierCount: number;
  };
  inventory: {
    totalValue: number;
    totalProducts: number;
    lowStockCount: number;
  };
}

// ─── API Functions ────────────────────────────────────────────────────────────

export function getDashboardSummary(asOfDate?: string): Promise<DashboardSummary> {
  const qs = asOfDate ? `?asOfDate=${asOfDate}` : "";
  return apiRequest<DashboardSummary>(`/dashboard/summary${qs}`);
}
