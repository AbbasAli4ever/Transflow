import { apiRequest } from "./api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CustomerStatus = "ACTIVE" | "INACTIVE";

export interface ApiCustomer {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  currentBalance: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CustomerBalance {
  customerId: string;
  totalSales: number;
  totalPayments: number;
  totalReturns: number;
  currentBalance: number;
}

export interface OpenDocument {
  id: string;
  documentNumber: string;
  transactionDate: string;
  totalAmount: number;
  paidAmount: number;
  outstanding: number;
}

export interface CustomerOpenDocumentsResponse {
  customerId: string;
  customerName: string;
  totalOutstanding: number;
  unappliedCredits: number;
  netOutstanding: number;
  documents: OpenDocument[];
}

export interface LedgerEntry {
  date: string;
  documentNumber: string;
  type: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface CustomerStatement {
  customerId: string;
  customerName: string;
  dateFrom: string;
  dateTo: string;
  openingBalance: number;
  closingBalance: number;
  entries: LedgerEntry[];
}

export interface ListCustomersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: CustomerStatus | "ALL";
  sortBy?: "name" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export interface CreateCustomerBody {
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export interface UpdateCustomerBody {
  name?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

// ─── Currency Helper ──────────────────────────────────────────────────────────

export function formatPKR(value: number): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(value);
}

// ─── API Functions ────────────────────────────────────────────────────────────

export function listCustomers(
  params: ListCustomersParams = {}
): Promise<PaginatedResponse<ApiCustomer>> {
  const qs = new URLSearchParams();
  if (params.page !== undefined) qs.set("page", String(params.page));
  if (params.limit !== undefined) qs.set("limit", String(params.limit));
  if (params.search) qs.set("search", params.search);
  if (params.status && params.status !== "ALL") qs.set("status", params.status);
  if (params.sortBy) qs.set("sortBy", params.sortBy);
  if (params.sortOrder) qs.set("sortOrder", params.sortOrder);
  const query = qs.toString();
  return apiRequest<PaginatedResponse<ApiCustomer>>(
    `/customers${query ? `?${query}` : ""}`
  );
}

export function createCustomer(body: CreateCustomerBody): Promise<ApiCustomer> {
  return apiRequest<ApiCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateCustomer(
  id: string,
  body: UpdateCustomerBody
): Promise<ApiCustomer> {
  return apiRequest<ApiCustomer>(`/customers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function changeCustomerStatus(
  id: string,
  status: CustomerStatus,
  reason?: string
): Promise<ApiCustomer> {
  return apiRequest<ApiCustomer>(`/customers/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, ...(reason ? { reason } : {}) }),
  });
}

export function getCustomer(id: string): Promise<ApiCustomer> {
  return apiRequest<ApiCustomer>(`/customers/${id}`);
}

export function getCustomerBalance(id: string): Promise<CustomerBalance> {
  return apiRequest<CustomerBalance>(`/customers/${id}/balance`);
}

export function getCustomerOpenDocuments(id: string): Promise<CustomerOpenDocumentsResponse> {
  return apiRequest<CustomerOpenDocumentsResponse>(`/customers/${id}/open-documents`);
}

export function getCustomerStatement(
  id: string,
  dateFrom: string,
  dateTo: string
): Promise<CustomerStatement> {
  return apiRequest<CustomerStatement>(
    `/reports/customers/${id}/statement?dateFrom=${dateFrom}&dateTo=${dateTo}`
  );
}
