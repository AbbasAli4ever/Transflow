import { apiRequest } from "./api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SupplierStatus = "ACTIVE" | "INACTIVE";

export interface ApiSupplier {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
  status: SupplierStatus;
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

export interface SupplierBalance {
  supplierId: string;
  totalPurchases: number;
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

export interface OpenDocumentsResponse {
  supplierId: string;
  supplierName: string;
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

export interface SupplierStatement {
  supplierId: string;
  supplierName: string;
  dateFrom: string;
  dateTo: string;
  openingBalance: number;
  closingBalance: number;
  entries: LedgerEntry[];
}

// ─── Transaction Types ───────────────────────────────────────────────────────

export interface ApiTransactionLine {
  id: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  discountAmount: number;
  lineTotal: number;
  costTotal: number;
  variant: {
    id: string;
    productId: string;
    size: string;
    sku: string | null;
    avgCost: number;
    status: string;
    product?: {
      id: string;
      name: string;
    } | null;
  } | null;
}

export type TransactionType =
  | "PURCHASE"
  | "SALE"
  | "SUPPLIER_PAYMENT"
  | "CUSTOMER_PAYMENT"
  | "SUPPLIER_RETURN"
  | "CUSTOMER_RETURN"
  | "INTERNAL_TRANSFER"
  | "ADJUSTMENT";

export type TransactionStatus = "DRAFT" | "POSTED" | "VOIDED";

export interface ApiTransaction {
  id: string;
  tenantId: string;
  type: TransactionType;
  status: TransactionStatus;
  documentNumber: string | null;
  transactionDate: string;
  supplierId: string | null;
  customerId: string | null;
  subtotal: number;
  discountTotal: number;
  deliveryFee: number;
  totalAmount: number;
  paidNow: number;
  notes: string | null;
  postedAt: string | null;
  createdAt: string;
  updatedAt: string;
  supplier: { id: string; name: string } | null;
  customer: { id: string; name: string } | null;
  transactionLines?: ApiTransactionLine[];
  paymentEntries?: ApiPaymentEntry[];
}

export interface ApiPaymentEntry {
  id: string;
  transactionId: string;
  paymentAccountId: string;
  amount: number;
  createdAt: string;
}

export interface TransactionAllocation {
  id: string;
  tenantId: string;
  paymentTransactionId: string;
  appliesToTransactionId: string;
  amountApplied: number;
  paymentTransaction: {
    documentNumber: string | null;
    totalAmount: number;
  };
  appliesToTransaction: {
    documentNumber: string | null;
    totalAmount: number;
    transactionDate?: string;
  };
}

export interface ListAllocationsParams {
  supplierId?: string;
  customerId?: string;
  purchaseId?: string;
  saleId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface ListTransactionsParams {
  page?: number;
  limit?: number;
  type?: TransactionType;
  status?: TransactionStatus;
  supplierId?: string;
  customerId?: string;
  productId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "transactionDate" | "createdAt" | "totalAmount";
  sortOrder?: "asc" | "desc";
}

export interface CreatePurchaseDraftBody {
  supplierId: string;
  transactionDate: string;
  lines: Array<{
    variantId: string;
    quantity: number;
    unitCost: number;
    discountAmount?: number;
  }>;
  deliveryFee?: number;
  notes?: string;
  idempotencyKey?: string;
}

export interface CreateSaleDraftBody {
  customerId: string;
  transactionDate: string;
  lines: Array<{
    variantId: string;
    quantity: number;
    unitPrice: number;
    discountAmount?: number;
  }>;
  deliveryFee?: number;
  deliveryType?: string;
  deliveryAddress?: string;
  notes?: string;
  idempotencyKey?: string;
}

export interface CreateSupplierPaymentDraftBody {
  supplierId: string;
  amount: number;
  paymentAccountId: string;
  transactionDate: string;
  notes?: string;
  idempotencyKey?: string;
}

export interface CreateCustomerPaymentDraftBody {
  customerId: string;
  amount: number;
  paymentAccountId: string;
  transactionDate: string;
  notes?: string;
  idempotencyKey?: string;
}

export interface ReturnableLine {
  lineId: string;
  productName: string;
  variantSize: string;
  originalQty: number;
  alreadyReturned: number;
  returnableQty: number;
}

export interface ReturnableLinesResponse {
  transactionId: string;
  lines: ReturnableLine[];
}

export interface CreateSupplierReturnDraftBody {
  supplierId: string;
  transactionDate: string;
  lines: Array<{
    sourceTransactionLineId: string;
    quantity: number;
  }>;
  notes?: string;
  idempotencyKey?: string;
}

export interface CreateCustomerReturnDraftBody {
  customerId: string;
  transactionDate: string;
  lines: Array<{
    sourceTransactionLineId: string;
    quantity: number;
  }>;
  notes?: string;
  idempotencyKey?: string;
}

export interface CreateInternalTransferDraftBody {
  fromPaymentAccountId: string;
  toPaymentAccountId: string;
  amount: number;
  transactionDate: string;
  notes?: string;
  idempotencyKey?: string;
}

export interface PostTransactionBody {
  idempotencyKey?: string;
  paidNow?: number;
  receivedNow?: number;
  paymentAccountId?: string;
  allocations?: Array<{
    transactionId: string;
    amount: number;
  }>;
  returnHandling?: string;
}

export interface ListSuppliersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: SupplierStatus | "ALL";
  sortBy?: "name" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export interface CreateSupplierBody {
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export interface UpdateSupplierBody {
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

export function listSuppliers(
  params: ListSuppliersParams = {}
): Promise<PaginatedResponse<ApiSupplier>> {
  const qs = new URLSearchParams();
  if (params.page !== undefined) qs.set("page", String(params.page));
  if (params.limit !== undefined) qs.set("limit", String(params.limit));
  if (params.search) qs.set("search", params.search);
  if (params.status && params.status !== "ALL") qs.set("status", params.status);
  if (params.sortBy) qs.set("sortBy", params.sortBy);
  if (params.sortOrder) qs.set("sortOrder", params.sortOrder);
  const query = qs.toString();
  return apiRequest<PaginatedResponse<ApiSupplier>>(
    `/suppliers${query ? `?${query}` : ""}`
  );
}

export function createSupplier(body: CreateSupplierBody): Promise<ApiSupplier> {
  return apiRequest<ApiSupplier>("/suppliers", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateSupplier(
  id: string,
  body: UpdateSupplierBody
): Promise<ApiSupplier> {
  return apiRequest<ApiSupplier>(`/suppliers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function changeSupplierStatus(
  id: string,
  status: SupplierStatus,
  reason?: string
): Promise<ApiSupplier> {
  return apiRequest<ApiSupplier>(`/suppliers/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, ...(reason ? { reason } : {}) }),
  });
}

export function getSupplier(id: string): Promise<ApiSupplier> {
  return apiRequest<ApiSupplier>(`/suppliers/${id}`);
}

export function getSupplierBalance(id: string): Promise<SupplierBalance> {
  return apiRequest<SupplierBalance>(`/suppliers/${id}/balance`);
}

export function getSupplierOpenDocuments(id: string): Promise<OpenDocumentsResponse> {
  return apiRequest<OpenDocumentsResponse>(`/suppliers/${id}/open-documents`);
}

export function getSupplierStatement(
  id: string,
  dateFrom: string,
  dateTo: string
): Promise<SupplierStatement> {
  return apiRequest<SupplierStatement>(
    `/reports/suppliers/${id}/statement?dateFrom=${dateFrom}&dateTo=${dateTo}`
  );
}

export function listTransactions(
  params: ListTransactionsParams = {}
): Promise<PaginatedResponse<ApiTransaction>> {
  const qs = new URLSearchParams();
  if (params.page !== undefined) qs.set("page", String(params.page));
  if (params.limit !== undefined) qs.set("limit", String(params.limit));
  if (params.type) qs.set("type", params.type);
  if (params.status) qs.set("status", params.status);
  if (params.supplierId) qs.set("supplierId", params.supplierId);
  if (params.customerId) qs.set("customerId", params.customerId);
  if (params.productId) qs.set("productId", params.productId);
  if (params.dateFrom) qs.set("dateFrom", params.dateFrom);
  if (params.dateTo) qs.set("dateTo", params.dateTo);
  if (params.sortBy) qs.set("sortBy", params.sortBy);
  if (params.sortOrder) qs.set("sortOrder", params.sortOrder);
  const query = qs.toString();
  return apiRequest<PaginatedResponse<ApiTransaction>>(
    `/transactions${query ? `?${query}` : ""}`
  );
}

export function getTransaction(id: string): Promise<ApiTransaction> {
  return apiRequest<ApiTransaction>(`/transactions/${id}`);
}

export function createPurchaseDraft(
  body: CreatePurchaseDraftBody
): Promise<ApiTransaction> {
  return apiRequest<ApiTransaction>("/transactions/purchases/draft", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function createSaleDraft(
  body: CreateSaleDraftBody
): Promise<ApiTransaction> {
  return apiRequest<ApiTransaction>("/transactions/sales/draft", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function createSupplierPaymentDraft(
  body: CreateSupplierPaymentDraftBody
): Promise<ApiTransaction> {
  return apiRequest<ApiTransaction>("/transactions/supplier-payments/draft", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function createCustomerPaymentDraft(
  body: CreateCustomerPaymentDraftBody
): Promise<ApiTransaction> {
  return apiRequest<ApiTransaction>("/transactions/customer-payments/draft", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function createSupplierReturnDraft(
  body: CreateSupplierReturnDraftBody
): Promise<ApiTransaction> {
  return apiRequest<ApiTransaction>("/transactions/supplier-returns/draft", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function createCustomerReturnDraft(
  body: CreateCustomerReturnDraftBody
): Promise<ApiTransaction> {
  return apiRequest<ApiTransaction>("/transactions/customer-returns/draft", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function createInternalTransferDraft(
  body: CreateInternalTransferDraftBody
): Promise<ApiTransaction> {
  return apiRequest<ApiTransaction>("/transactions/internal-transfers/draft", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getTransactionReturnableLines(
  id: string
): Promise<ReturnableLinesResponse> {
  return apiRequest<ReturnableLinesResponse>(`/transactions/${id}/returnable-lines`);
}

export function postTransaction(
  id: string,
  body: PostTransactionBody
): Promise<ApiTransaction> {
  return apiRequest<ApiTransaction>(`/transactions/${id}/post`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function patchTransaction(
  id: string,
  body: PatchTransactionDto
): Promise<ApiTransaction> {
  return apiRequest<ApiTransaction>(`/transactions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteTransaction(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/transactions/${id}`, {
    method: "DELETE",
  });
}

export interface PatchTransactionLineDto {
  lineId?: string;
  variantId?: string;
  quantity?: number;
  unitCost?: number;
  unitPrice?: number;
  discountAmount?: number;
  direction?: "IN" | "OUT";
  reason?: string;
}

export interface PatchTransactionDto {
  transactionDate?: string;
  notes?: string;
  supplierId?: string;
  customerId?: string;
  deliveryFee?: number;
  deliveryType?: string;
  deliveryAddress?: string;
  amount?: number;
  fromPaymentAccountId?: string;
  toPaymentAccountId?: string;
  lines?: PatchTransactionLineDto[];
}

export function listTransactionAllocations(
  params: ListAllocationsParams = {}
): Promise<PaginatedResponse<TransactionAllocation>> {
  const qs = new URLSearchParams();
  if (params.page !== undefined) qs.set("page", String(params.page));
  if (params.limit !== undefined) qs.set("limit", String(params.limit));
  if (params.supplierId) qs.set("supplierId", params.supplierId);
  if (params.customerId) qs.set("customerId", params.customerId);
  if (params.purchaseId) qs.set("purchaseId", params.purchaseId);
  if (params.saleId) qs.set("saleId", params.saleId);
  if (params.dateFrom) qs.set("dateFrom", params.dateFrom);
  if (params.dateTo) qs.set("dateTo", params.dateTo);
  const query = qs.toString();
  return apiRequest<PaginatedResponse<TransactionAllocation>>(
    `/transactions/allocations${query ? `?${query}` : ""}`
  );
}
