import { apiRequest } from "./api";

export type ExpenseStatus = "DRAFT" | "POSTED" | "VOIDED";

export interface ExpenseCategoryRef {
  id: string;
  name: string;
}

export interface PaymentAccountRef {
  id: string;
  name: string;
}

export interface Expense {
  id: string;
  tenantId: string;
  expenseDate?: string;
  date?: string;
  amount: number;
  expenseCategoryId: string;
  paymentAccountId: string;
  description: string;
  status: ExpenseStatus;
  documentNumber: string;
  createdAt: string;
  updatedAt: string;
  categoryName?: string;
  paymentAccountName?: string;
  expenseCategory?: ExpenseCategoryRef | null;
  paymentAccount?: PaymentAccountRef | null;
  voidReason?: string | null;
  voidedAt?: string | null;
  voidedBy?: string | null;
  voidedByUser?: {
    fullName: string;
  } | null;
  createdByUser?: {
    fullName: string;
  } | null;
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

export interface ListExpensesParams {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  expenseCategoryId?: string;
  status?: ExpenseStatus | "ALL";
}

export interface CreateExpenseBody {
  date: string;
  amount: number;
  expenseCategoryId: string;
  paymentAccountId: string;
  description: string;
}

export interface UpdateExpenseBody {
  date?: string;
  amount?: number;
  expenseCategoryId?: string;
  paymentAccountId?: string;
  description?: string;
}

export function listExpenses(
  params: ListExpensesParams = {}
): Promise<PaginatedResponse<Expense>> {
  const qs = new URLSearchParams();
  if (params.page !== undefined) qs.set("page", String(params.page));
  if (params.limit !== undefined) qs.set("limit", String(params.limit));
  if (params.dateFrom) qs.set("dateFrom", params.dateFrom);
  if (params.dateTo) qs.set("dateTo", params.dateTo);
  if (params.expenseCategoryId) qs.set("expenseCategoryId", params.expenseCategoryId);
  if (params.status) qs.set("status", params.status);
  const query = qs.toString();
  return apiRequest<PaginatedResponse<Expense>>(`/expenses${query ? `?${query}` : ""}`);
}

export function getExpense(id: string): Promise<Expense> {
  return apiRequest<Expense>(`/expenses/${id}`);
}

export function createExpense(body: CreateExpenseBody): Promise<Expense> {
  return apiRequest<Expense>("/expenses", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateExpense(id: string, body: UpdateExpenseBody): Promise<Expense> {
  return apiRequest<Expense>(`/expenses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteExpense(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/expenses/${id}`, {
    method: "DELETE",
  });
}

export function postExpense(
  id: string,
  body: { idempotencyKey: string }
): Promise<Expense> {
  return apiRequest<Expense>(`/expenses/${id}/post`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function voidExpense(
  id: string,
  body: { reason?: string }
): Promise<Expense> {
  return apiRequest<Expense>(`/expenses/${id}/void`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
