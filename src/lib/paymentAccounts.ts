import { apiRequest } from "./api";
export { formatPKR } from "./customers";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PaymentAccountType = "CASH" | "BANK" | "WALLET" | "CARD";
export type PaymentAccountStatus = "ACTIVE" | "INACTIVE";

export interface ApiPaymentAccountComputed {
  currentBalance: number;
  totalIn: number;
  totalOut: number;
  lastTransactionDate: string | null;
}

export interface ApiPaymentAccount {
  id: string;
  tenantId: string;
  name: string;
  type: PaymentAccountType;
  openingBalance: number;
  status: PaymentAccountStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  _computed: ApiPaymentAccountComputed;
}

export interface StatementEntry {
  date: string;
  documentNumber: string | null;
  type: string;
  partyName: string | null;
  moneyIn: number;
  moneyOut: number;
  runningBalance: number;
}

export interface PaymentAccountStatement {
  accountId: string;
  accountName: string;
  dateFrom: string;
  dateTo: string;
  openingBalance: number;
  closingBalance: number;
  entries: StatementEntry[];
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

export interface ListPaymentAccountsParams {
  page?: number;
  limit?: number;
  type?: PaymentAccountType | "ALL";
  status?: PaymentAccountStatus | "ALL";
}

export interface CreatePaymentAccountBody {
  name: string;
  type: PaymentAccountType;
  openingBalance?: number;
}

export interface UpdatePaymentAccountBody {
  name?: string;
}

// ─── API Functions ────────────────────────────────────────────────────────────

export function listPaymentAccounts(
  params: ListPaymentAccountsParams = {}
): Promise<PaginatedResponse<ApiPaymentAccount>> {
  const qs = new URLSearchParams();
  if (params.page !== undefined) qs.set("page", String(params.page));
  if (params.limit !== undefined) qs.set("limit", String(params.limit));
  if (params.type && params.type !== "ALL") qs.set("type", params.type);
  if (params.status && params.status !== "ALL") qs.set("status", params.status);
  const query = qs.toString();
  return apiRequest<PaginatedResponse<ApiPaymentAccount>>(
    `/payment-accounts${query ? `?${query}` : ""}`
  );
}

export function createPaymentAccount(
  body: CreatePaymentAccountBody
): Promise<ApiPaymentAccount> {
  return apiRequest<ApiPaymentAccount>("/payment-accounts", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updatePaymentAccount(
  id: string,
  body: UpdatePaymentAccountBody
): Promise<ApiPaymentAccount> {
  return apiRequest<ApiPaymentAccount>(`/payment-accounts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function changePaymentAccountStatus(
  id: string,
  status: PaymentAccountStatus
): Promise<ApiPaymentAccount> {
  return apiRequest<ApiPaymentAccount>(`/payment-accounts/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function getPaymentAccount(id: string): Promise<ApiPaymentAccount> {
  return apiRequest<ApiPaymentAccount>(`/payment-accounts/${id}`);
}

export function getPaymentAccountStatement(
  id: string,
  dateFrom: string,
  dateTo: string
): Promise<PaymentAccountStatement> {
  return apiRequest<PaymentAccountStatement>(
    `/reports/payment-accounts/${id}/statement?dateFrom=${dateFrom}&dateTo=${dateTo}`
  );
}
