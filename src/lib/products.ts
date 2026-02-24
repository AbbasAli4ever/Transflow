import { apiRequest } from "./api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProductStatus = "ACTIVE" | "INACTIVE";

export interface ApiProduct {
  id: string;
  tenantId: string;
  name: string;
  sku: string | null;
  category: string | null;
  unit: string;
  status: ProductStatus;
  avgCost: number;
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

export interface StockMovement {
  type:
    | "PURCHASE_IN"
    | "SALE_OUT"
    | "SUPPLIER_RETURN_OUT"
    | "CUSTOMER_RETURN_IN"
    | "ADJUSTMENT_IN"
    | "ADJUSTMENT_OUT";
  quantity: number;
  date: string;
}

export interface ProductStock {
  productId: string;
  totalQuantity: number;
  avgCost: number;
  totalValue: number;
  movements: StockMovement[];
}

export interface ListProductsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: ProductStatus | "ALL";
  category?: string;
  sortBy?: "name" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export interface CreateProductBody {
  name: string;
  sku?: string;
  category?: string;
  unit?: string;
}

export interface UpdateProductBody {
  name?: string;
  sku?: string;
  category?: string;
  unit?: string;
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

export function listProducts(
  params: ListProductsParams = {}
): Promise<PaginatedResponse<ApiProduct>> {
  const qs = new URLSearchParams();
  if (params.page !== undefined) qs.set("page", String(params.page));
  if (params.limit !== undefined) qs.set("limit", String(params.limit));
  if (params.search) qs.set("search", params.search);
  if (params.status && params.status !== "ALL") qs.set("status", params.status);
  if (params.category) qs.set("category", params.category);
  if (params.sortBy) qs.set("sortBy", params.sortBy);
  if (params.sortOrder) qs.set("sortOrder", params.sortOrder);
  const query = qs.toString();
  return apiRequest<PaginatedResponse<ApiProduct>>(
    `/products${query ? `?${query}` : ""}`
  );
}

export function createProduct(body: CreateProductBody): Promise<ApiProduct> {
  return apiRequest<ApiProduct>("/products", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateProduct(
  id: string,
  body: UpdateProductBody
): Promise<ApiProduct> {
  return apiRequest<ApiProduct>(`/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function changeProductStatus(
  id: string,
  status: ProductStatus,
  reason?: string
): Promise<ApiProduct> {
  return apiRequest<ApiProduct>(`/products/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, ...(reason ? { reason } : {}) }),
  });
}

export function getProduct(id: string): Promise<ApiProduct> {
  return apiRequest<ApiProduct>(`/products/${id}`);
}

export function getProductStock(id: string): Promise<ProductStock> {
  return apiRequest<ProductStock>(`/products/${id}/stock`);
}
