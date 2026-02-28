import { apiRequest } from "./api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProductStatus = "ACTIVE" | "INACTIVE";

export interface ProductVariant {
  id: string;
  productId: string;
  size: string;
  sku: string | null;
  avgCost: number;
  currentStock: number;
  status: ProductStatus;
  createdAt?: string;
  updatedAt?: string;
}

export type ApiProductVariant = ProductVariant;

export interface ApiProduct {
  id: string;
  tenantId: string;
  name: string;
  sku: string | null;
  category: string | null;
  unit: string;
  status: ProductStatus;
  avgCost: number;
  createdBy?: string | null;
  totalStock?: number;
  createdAt: string;
  updatedAt: string;
  variants: ProductVariant[];
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

export interface ProductMovement {
  date: string;
  documentNumber: string | null;
  type: string;
  variantSize: string;
  quantityIn: number;
  quantityOut: number;
  runningStock: number;
}

export interface ProductStock {
  productId: string;
  productName?: string;
  totalStock?: number;
  totalQuantity: number;
  avgCost: number;
  totalValue: number;
  movements: StockMovement[];
  variants: Array<{
    variantId: string;
    size: string;
    sku?: string | null;
    currentStock: number;
    avgCost: number;
  }>;
}

export interface ProductMovementsResponse {
  data: ProductMovement[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
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
  sku?: string | null;
  category?: string;
  unit?: string;
}

export interface CreateVariantBody {
  size: string;
  sku?: string;
}

export interface UpdateVariantBody {
  size?: string;
  sku?: string | null;
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
  return apiRequest<Partial<ProductStock> & { totalStock?: number }>(`/products/${id}/stock`).then(
    (stock) => {
      const variants = stock.variants ?? [];
      const totalQuantity =
        stock.totalQuantity ?? stock.totalStock ?? variants.reduce((sum, item) => sum + item.currentStock, 0);
      const totalValue =
        stock.totalValue ?? variants.reduce((sum, item) => sum + item.currentStock * item.avgCost, 0);

      return {
        productId: stock.productId ?? id,
        productName: stock.productName,
        totalStock: stock.totalStock ?? totalQuantity,
        totalQuantity,
        avgCost: stock.avgCost ?? 0,
        totalValue,
        movements: stock.movements ?? [],
        variants,
      };
    }
  );
}

export function getProductMovements(
  id: string,
  page = 1,
  limit = 20
): Promise<ProductMovementsResponse> {
  const qs = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  return apiRequest<ProductMovementsResponse>(`/products/${id}/movements?${qs.toString()}`);
}

export function addVariant(
  id: string,
  body: CreateVariantBody
): Promise<ApiProductVariant> {
  return apiRequest<ApiProductVariant>(`/products/${id}/variants`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateVariant(
  id: string,
  variantId: string,
  body: UpdateVariantBody
): Promise<ApiProductVariant> {
  return apiRequest<ApiProductVariant>(`/products/${id}/variants/${variantId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function changeVariantStatus(
  id: string,
  variantId: string,
  status: ProductStatus,
  reason?: string
): Promise<ApiProductVariant> {
  return apiRequest<ApiProductVariant>(`/products/${id}/variants/${variantId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, ...(reason ? { reason } : {}) }),
  });
}
