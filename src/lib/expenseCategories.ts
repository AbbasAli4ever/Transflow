import { apiRequest } from "./api";

export type ExpenseCategoryStatus = "ACTIVE" | "INACTIVE";

export interface ExpenseCategory {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  status: ExpenseCategoryStatus;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
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

export interface ListExpenseCategoriesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: ExpenseCategoryStatus | "ALL";
}

export interface CreateExpenseCategoryBody {
  name: string;
  description?: string;
}

export interface UpdateExpenseCategoryBody {
  name?: string;
  description?: string;
}

export function listExpenseCategories(
  params: ListExpenseCategoriesParams = {}
): Promise<PaginatedResponse<ExpenseCategory>> {
  const qs = new URLSearchParams();
  if (params.page !== undefined) qs.set("page", String(params.page));
  if (params.limit !== undefined) qs.set("limit", String(params.limit));
  if (params.search) qs.set("search", params.search);
  if (params.status) qs.set("status", params.status);
  const query = qs.toString();
  return apiRequest<PaginatedResponse<ExpenseCategory>>(
    `/expense-categories${query ? `?${query}` : ""}`
  );
}

export function createExpenseCategory(
  body: CreateExpenseCategoryBody
): Promise<ExpenseCategory> {
  return apiRequest<ExpenseCategory>("/expense-categories", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateExpenseCategory(
  id: string,
  body: UpdateExpenseCategoryBody
): Promise<ExpenseCategory> {
  return apiRequest<ExpenseCategory>(`/expense-categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteExpenseCategory(id: string): Promise<ExpenseCategory> {
  return apiRequest<ExpenseCategory>(`/expense-categories/${id}`, {
    method: "DELETE",
  });
}
