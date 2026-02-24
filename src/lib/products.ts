import { apiRequest } from "./api";
export { formatPKR } from "./customers";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProductStatus = "ACTIVE" | "INACTIVE";

export interface ApiProductVariant {
  id: string;
  productId: string;
  size: string;
  sku: string | null;
  avgCost: number;
  currentStock: number;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ApiProduct {
  id: string;
  tenantId: string;
  name: string;
  sku: string | null;
  category: string | null;
  unit: string | null;
  status: ProductStatus;
  totalStock: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  variants: ApiProductVariant[];
}

export interface VariantStock {
  variantId: string;
  size: string;
  sku: string | null;
  currentStock: number;
  avgCost: number;
}

export interface ProductStock {
  productId: string;
  productName: string;
  totalStock: number;
  variants: VariantStock[];
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

export interface ProductMovementsResponse {
  data: ProductMovement[];
  meta: { page: number; limit: number; total: number; totalPages: number };
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

export interface ListProductsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: ProductStatus | "ALL";
  category?: string;
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
  status: ProductStatus
): Promise<ApiProduct> {
  return apiRequest<ApiProduct>(`/products/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function getProduct(id: string): Promise<ApiProduct> {
  return apiRequest<ApiProduct>(`/products/${id}`);
}

export function getProductStock(id: string): Promise<ProductStock> {
  return apiRequest<ProductStock>(`/products/${id}/stock`);
}

export function getProductMovements(
  id: string,
  page: number,
  limit: number
): Promise<ProductMovementsResponse> {
  return apiRequest<ProductMovementsResponse>(
    `/products/${id}/movements?page=${page}&limit=${limit}`
  );
}

export function addVariant(
  productId: string,
  body: CreateVariantBody
): Promise<ApiProductVariant> {
  return apiRequest<ApiProductVariant>(`/products/${productId}/variants`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateVariant(
  productId: string,
  variantId: string,
  body: UpdateVariantBody
): Promise<ApiProductVariant> {
  return apiRequest<ApiProductVariant>(
    `/products/${productId}/variants/${variantId}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    }
  );
}

export function changeVariantStatus(
  productId: string,
  variantId: string,
  status: ProductStatus
): Promise<ApiProductVariant> {
  return apiRequest<ApiProductVariant>(
    `/products/${productId}/variants/${variantId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }
  );
}
