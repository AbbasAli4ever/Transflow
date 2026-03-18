# API Reference — v3
**Product:** Persona Finance System
**Status:** Canonical standalone document. Do not read V1 or V2 alongside this.
**Base URL:** `http://localhost:3000/api/v1`

---

## Overview

### Authentication
JWT Bearer token. After login or register, store the `accessToken` and send it on every request:
```
Authorization: Bearer <accessToken>
```
Endpoints marked as public (`/auth/login`, `/auth/register`) do not require this header.

### Pagination
All list endpoints return:
```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```
Default `page=1`, default `limit=20`, max `limit=100`.

### Error Format
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "email must be an email" }
  ],
  "timestamp": "2026-03-15T10:00:00.000Z",
  "path": "/api/v1/...",
  "requestId": "uuid"
}
```

### Currency
All monetary values are **integers in PKR** (no decimals). `1000` = PKR 1,000.

---

## AUTH

### POST /auth/register
Creates a new tenant and owner account.

**Request:**
```json
{
  "tenantName": "My Business",
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "StrongPass123!"
}
```

**Response 201:**
```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": {
    "id": "uuid",
    "tenantId": "uuid",
    "fullName": "John Doe",
    "email": "john@example.com",
    "role": "OWNER",
    "tenant": {
      "id": "uuid",
      "name": "My Business",
      "baseCurrency": "PKR",
      "timezone": "Asia/Karachi"
    }
  }
}
```

**Notes:**
- `password` must pass `@IsStrongPassword` (uppercase, lowercase, number, symbol)
- After registration, call `PATCH /auth/tenant` to set `baseCurrency` and `timezone`

---

### POST /auth/login
**Request:** `{ email, password }`
**Response 200:** Same shape as register response.
**Error 401:** Invalid credentials.

---

### POST /auth/refresh
**Request:** `{ refreshToken: "..." }`
**Response 200:** `{ accessToken, refreshToken }`

---

### POST /auth/logout
**Request:** `{ refreshToken: "..." }`
**Response 200:** `{ "message": "Logged out" }`

---

### PATCH /auth/tenant
Update tenant settings (called right after register to apply baseCurrency/timezone).

**Request:** `{ baseCurrency?: string, timezone?: string }`
**Response 200:** Updated tenant object.

---

## SUPPLIERS

### GET /suppliers
List all suppliers.

**Query params:**

| Param | Type | Default | Notes |
|---|---|---|---|
| `page` | number | 1 | |
| `limit` | number | 20 | |
| `search` | string | — | Name or phone partial match |
| `status` | `ACTIVE` \| `INACTIVE` \| `ALL` | `ACTIVE` | |
| `sortBy` | `name` \| `createdAt` | `createdAt` | |
| `sortOrder` | `asc` \| `desc` | `desc` | |

**Response 200:** `{ data: SupplierDto[], meta }` — each item includes `_computed.currentBalance`.

---

### POST /suppliers
Create a new supplier.

**Request:**
```json
{
  "name": "ABC Textiles",
  "phone": "03001234567",
  "address": "Lahore, Pakistan",
  "notes": "Optional notes"
}
```

**Field rules:**

| Field | Required | Rules |
|---|---|---|
| `name` | Yes | Unique within tenant |
| `phone` | **Yes** | Min 10 chars; **unique within tenant** ← v3 change |
| `address` | No | — |
| `notes` | No | — |

**Response 201:** `SupplierDto`
**Error 409:** Name already exists OR phone already in use.

---

### GET /suppliers/:id
**Response 200:** `SupplierDto` with `_computed.currentBalance`.

---

### PATCH /suppliers/:id
Update supplier. All fields optional.

**Request:** `{ name?, phone?, address?, notes? }`
**Error 409:** Duplicate name or phone.

---

### PATCH /suppliers/:id/status
**Request:** `{ status: "ACTIVE" | "INACTIVE" }`
**Response 200:** Updated `SupplierDto`.

---

### GET /suppliers/:id/balance
Returns supplier's financial balance.

**Response 200:**
```json
{
  "supplierId": "uuid",
  "supplierName": "ABC Textiles",
  "asOfDate": "2026-03-15",
  "balance": 100000,
  "balanceType": "PAYABLE",
  "breakdown": {
    "purchases": { "count": 5, "totalAmount": 500000 },
    "payments": { "count": 3, "totalAmount": 300000 },
    "returns": { "count": 1, "totalAmount": 100000 },
    "netPayable": 100000
  }
}
```

`balanceType`: `"PAYABLE"` (you owe them) | `"CREDIT"` (they owe you) | `"SETTLED"` (zero).

---

### GET /suppliers/:id/open-documents
Returns unpaid/partially-paid purchase invoices for this supplier.

**Response 200:**
```json
{
  "supplierId": "uuid",
  "documents": [
    {
      "id": "uuid",
      "documentNumber": "PUR-2026-0001",
      "transactionDate": "2026-03-01",
      "totalAmount": 50000,
      "paidAmount": 20000,
      "outstanding": 30000,
      "daysOutstanding": 14
    }
  ],
  "totalOutstanding": 30000,
  "unappliedCredits": 0,
  "netOutstanding": 30000
}
```

---

## CUSTOMERS

### GET /customers
**Query params:** Same as suppliers (page, limit, search, status, sortBy, sortOrder).
**Response 200:** `{ data: CustomerDto[], meta }` — each includes `_computed.currentBalance`.

---

### POST /customers
**Request:**
```json
{
  "name": "Ahmed Stores",
  "phone": "03219876543",
  "address": "Karachi",
  "notes": ""
}
```

**Field rules:**

| Field | Required | Rules |
|---|---|---|
| `name` | Yes | Unique within tenant |
| `phone` | **Yes** | Min 10 chars; **unique within tenant** ← v3 change |
| `address` | No | — |
| `notes` | No | — |

**Response 201:** `CustomerDto`
**Error 409:** Duplicate name or phone.

---

### GET /customers/:id, PATCH /customers/:id, PATCH /customers/:id/status
Same pattern as suppliers. `phone` uniqueness applies on update too.

---

### GET /customers/:id/balance
Same pattern as supplier balance. `balanceType`: `"RECEIVABLE"` | `"CREDIT"` | `"SETTLED"`.

---

### GET /customers/:id/open-documents
Same pattern as supplier open documents, for AR (sales).

---

## PRODUCTS

### GET /products
**Query params:** page, limit, search (name/SKU/category), status, category (filter by category text), sortBy (`name` | `createdAt`), sortOrder.

**Response 200:** `{ data: ProductDto[], meta }` — each product includes:
- `variants[]`: `{ id, size, sku, avgCost, status, currentStock }`
- `totalStock`: sum of all variant currentStock

---

### POST /products
**Request:** `{ name, sku?, category?, unit? }`
Auto-creates a "one-size" default variant.
**Response 201:** `ProductDto` with `variants[]`.

---

### GET /products/:id, PATCH /products/:id, PATCH /products/:id/status
Standard CRUD. **Error 409:** Duplicate SKU.

---

### GET /products/:id/stock
Returns per-variant stock levels.
**Response 200:** `{ productId, variants: [{ variantId, size, sku, currentStock, avgCost }] }`

---

## PRODUCT VARIANTS

### POST /product-variants
Add a new size variant to a product.
**Request:** `{ productId, size, sku? }`
**Response 201:** `ProductVariantDto`

---

### PATCH /product-variants/:id
Update variant size label or SKU.
**Request:** `{ size?, sku? }`

---

### PATCH /product-variants/:id/status
**Request:** `{ status: "ACTIVE" | "INACTIVE" }` — blocked if stock > 0 on deactivate.

---

## PAYMENT ACCOUNTS

### GET /payment-accounts
**Query params:**

| Param | Type | Default | Notes |
|---|---|---|---|
| `page` | number | 1 | |
| `limit` | number | 20 | |
| `type` | `CASH` \| `BANK` \| `WALLET` \| `CARD` | — | Filter by type |
| `status` | `ACTIVE` \| `INACTIVE` \| `ALL` | `ACTIVE` | |
| `sortBy` | `name` \| `balance` | `name` | **`balance` is new in v3** |
| `sortOrder` | `asc` \| `desc` | `asc` | |

**Response 200:** `{ data: PaymentAccountDto[], meta }`

When `sortBy=balance`, the response includes `_computed.currentBalance` on each account.

**Account item shape:**
```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "name": "Main Cash",
  "type": "CASH",
  "status": "ACTIVE",
  "openingBalance": 0,
  "createdAt": "...",
  "updatedAt": "..."
}
```
When sorted by balance or on detail, includes `_computed: { currentBalance }`.

---

### POST /payment-accounts
**Request:**
```json
{
  "name": "HBL Business Account",
  "type": "BANK",
  "openingBalance": 50000
}
```

| Field | Required | Rules |
|---|---|---|
| `name` | Yes | Unique within tenant |
| `type` | Yes | `CASH` \| `BANK` \| `WALLET` \| `CARD` |
| `openingBalance` | No | Integer; default 0; can be negative (overdraft) |

**Response 201:** `PaymentAccountDto`
If `openingBalance !== 0`, a journal entry is automatically created (DR CASH, CR Opening Capital).
**Error 409:** Duplicate name.

---

### GET /payment-accounts/:id, PATCH /payment-accounts/:id, PATCH /payment-accounts/:id/status
Standard CRUD. Only `name` is updatable via PATCH. Type cannot change.

---

### GET /payment-accounts/:id/balance
Returns balance breakdown.

**Response 200:**
```json
{
  "accountId": "uuid",
  "accountName": "Main Cash",
  "accountType": "CASH",
  "asOfDate": "2026-03-15",
  "balance": 550000,
  "breakdown": {
    "openingBalance": 500000,
    "moneyIn": { "count": 12, "totalAmount": 200000 },
    "moneyOut": { "count": 8, "totalAmount": 150000 },
    "currentBalance": 550000
  }
}
```

---

## TRANSACTIONS

All transaction types share the same post endpoint: `POST /transactions/:id/post`.

### Draft Document Numbers *(v3 change)*
Drafts now receive a document number immediately on creation. Draft numbers have a `D` prefix and are **different** from the final posted document number.

| Type | Draft number format | Posted number format |
|---|---|---|
| PURCHASE | `DPUR-NNNN` | `PUR-YYYY-NNNN` |
| SALE | `DSAL-NNNN` | `SAL-YYYY-NNNN` |
| SUPPLIER_PAYMENT | `DSPY-NNNN` | `SPY-YYYY-NNNN` |
| CUSTOMER_PAYMENT | `DCPY-NNNN` | `CPY-YYYY-NNNN` |
| SUPPLIER_RETURN | `DSRN-NNNN` | `SRN-YYYY-NNNN` |
| CUSTOMER_RETURN | `DCRN-NNNN` | `CRN-YYYY-NNNN` |
| INTERNAL_TRANSFER | `DTRF-NNNN` | `TRF-YYYY-NNNN` |
| ADJUSTMENT | `DADJ-NNNN` | `ADJ-YYYY-NNNN` |

> On posting, the `documentNumber` changes from the draft format to the posted format. Frontend should update displayed document number on successful post.

---

### GET /transactions
List all transactions.

**Query params:**

| Param | Type | Notes |
|---|---|---|
| `page` | number | |
| `limit` | number | |
| `dateFrom` | YYYY-MM-DD | |
| `dateTo` | YYYY-MM-DD | |
| `type` | enum | PURCHASE, SALE, SUPPLIER_PAYMENT, CUSTOMER_PAYMENT, SUPPLIER_RETURN, CUSTOMER_RETURN, INTERNAL_TRANSFER, ADJUSTMENT |
| `status` | `DRAFT` \| `POSTED` \| `VOIDED` | ← VOIDED is a valid filter value |
| `supplierId` | UUID | Filter by specific supplier |
| `customerId` | UUID | Filter by specific customer |
| `partySearch` | string | Case-insensitive name search across both supplier and customer |
| `productId` | UUID | Filter transactions containing this product |
| `sortBy` | `transactionDate` \| `createdAt` \| `totalAmount` | |
| `sortOrder` | `asc` \| `desc` | |

**Response 200:** `{ data: TransactionResponseDto[], meta }`

Each item includes:
- `documentNumber` — **present for all statuses** (draft format for DRAFT, posted format for POSTED, posted format for VOIDED)
- `supplier.name` / `customer.name` (shallow include)

---

### GET /transactions/:id
Returns full transaction detail.

**Response 200:** `TransactionResponseDto` with deep includes:
- `transactionLines[].variant.product` (product name available)
- `supplier` / `customer` objects
- `createdByUser: { fullName }`
- `paymentEntries[]`

**Additional VOIDED fields:** `voidReason`, `voidedAt`, `voidedBy`.

---

### POST /transactions/purchases/draft
**Request:**
```json
{
  "supplierId": "uuid",
  "transactionDate": "2026-03-15",
  "lines": [
    { "variantId": "uuid", "quantity": 5, "unitCost": 1000, "discountAmount": 0 }
  ],
  "deliveryFee": 200,
  "notes": "optional",
  "idempotencyKey": "client-uuid"
}
```
**Response 201:** `TransactionResponseDto` with `status: "DRAFT"` and `documentNumber: "DPUR-NNNN"`.

---

### POST /transactions/sales/draft
**Request:**
```json
{
  "customerId": "uuid",
  "transactionDate": "2026-03-15",
  "lines": [
    { "variantId": "uuid", "quantity": 3, "unitPrice": 1500, "discountAmount": 0 }
  ],
  "deliveryFee": 0,
  "deliveryType": "HOME_DELIVERY",
  "deliveryAddress": "Karachi",
  "notes": ""
}
```
**Response 201:** `TransactionResponseDto` with `documentNumber: "DSAL-NNNN"`.
**Error 404:** Customer or variant not found.

---

### POST /transactions/supplier-payments/draft
**Request:**
```json
{
  "supplierId": "uuid",
  "amount": 10000,
  "paymentAccountId": "uuid",
  "transactionDate": "2026-03-15"
}
```
**Response 201:** `TransactionResponseDto` with `documentNumber: "DSPY-NNNN"`.

---

### POST /transactions/customer-payments/draft
**Request:**
```json
{
  "customerId": "uuid",
  "amount": 5000,
  "paymentAccountId": "uuid",
  "transactionDate": "2026-03-15"
}
```
**Response 201:** `TransactionResponseDto` with `documentNumber: "DCPY-NNNN"`.

---

### POST /transactions/supplier-returns/draft
**Request:**
```json
{
  "supplierId": "uuid",
  "transactionDate": "2026-03-15",
  "lines": [
    { "sourceTransactionLineId": "uuid", "quantity": 2 }
  ]
}
```
Return quantity cannot exceed original quantity minus already-returned quantity.
**Response 201:** `TransactionResponseDto` with `documentNumber: "DSRN-NNNN"`.

---

### POST /transactions/customer-returns/draft
**Request:**
```json
{
  "customerId": "uuid",
  "transactionDate": "2026-03-15",
  "lines": [
    { "sourceTransactionLineId": "uuid", "quantity": 1 }
  ]
}
```
**Response 201:** `TransactionResponseDto` with `documentNumber: "DCRN-NNNN"`.

---

### POST /transactions/internal-transfers/draft
**Request:**
```json
{
  "fromPaymentAccountId": "uuid",
  "toPaymentAccountId": "uuid",
  "amount": 5000,
  "transactionDate": "2026-03-15"
}
```
`fromPaymentAccountId` and `toPaymentAccountId` must be different.
**Response 201:** `TransactionResponseDto` with `documentNumber: "DTRF-NNNN"`.

---

### POST /transactions/adjustments/draft
OWNER / ADMIN only.

**Request:**
```json
{
  "transactionDate": "2026-03-15",
  "lines": [
    { "variantId": "uuid", "quantity": 5, "direction": "IN", "reason": "Found extra", "unitCost": 500 },
    { "variantId": "uuid", "quantity": 2, "direction": "OUT", "reason": "Damaged" }
  ]
}
```
`unitCost` required for `direction: "IN"`, optional (taken from avgCost) for `direction: "OUT"`.
**Response 201:** `TransactionResponseDto` with `documentNumber: "DADJ-NNNN"`.

---

### POST /transactions/:id/post
Posts a DRAFT transaction. Creates journal entries and inventory movements.

**Request:**
```json
{
  "idempotencyKey": "uuid",
  "paidNow": 5000,
  "paymentAccountId": "uuid",
  "allocations": [
    { "transactionId": "uuid", "amount": 3000 }
  ],
  "returnHandling": "STORE_CREDIT",
  "receivedNow": 2000
}
```

All fields except `idempotencyKey` are type-dependent and optional:

| Field | Used by |
|---|---|
| `paidNow` | PURCHASE |
| `paymentAccountId` | PURCHASE (with paidNow), SUPPLIER_PAYMENT, CUSTOMER_PAYMENT, INTERNAL_TRANSFER |
| `receivedNow` | SALE |
| `allocations[]` | SUPPLIER_PAYMENT, CUSTOMER_PAYMENT (manual allocation; omit for auto) |
| `returnHandling` | CUSTOMER_RETURN (`"REFUND_NOW"` or `"STORE_CREDIT"`) |

**Response 200:** `TransactionResponseDto` with `status: "POSTED"` and final `documentNumber` (e.g., `PUR-2026-0001`).

**Errors:**
- 400: Not a DRAFT
- 409: `idempotencyKey` already used on a different transaction (double-submit guard)
- 422: Insufficient stock (for SALE), over-allocation, return quantity exceeded

**Stock error shape (422 for insufficient stock):**
```json
{
  "message": "Insufficient stock",
  "errors": [
    { "variantId": "uuid", "available": 3, "required": 5 }
  ]
}
```

---

### POST /transactions/:id/void
Voids a POSTED transaction. Creates a full reversal journal entry.

**Request:** `{ "reason": "Entered wrong amounts" }` — `reason` is optional.

**Response 200:** `TransactionResponseDto` with `status: "VOIDED"`.

**Error 400:** Only POSTED transactions can be voided. DRAFT transactions must be deleted.

**Role:** OWNER / ADMIN only.

---

### PATCH /transactions/:id
Edit a DRAFT transaction. Only DRAFTs can be edited.

**Notes by type:**
- PURCHASE / SALE: full line replacement
- SUPPLIER_RETURN / CUSTOMER_RETURN: quantity per line only
- SUPPLIER_PAYMENT / CUSTOMER_PAYMENT: header + amount
- INTERNAL_TRANSFER: amount
- ADJUSTMENT: full line replacement

---

### DELETE /transactions/:id
Delete a DRAFT transaction. Only DRAFTs can be deleted.
**Response 200:** `{ "message": "Transaction deleted" }`

---

### GET /transactions/allocations
List allocations.

**Query params:** `purchaseId` OR `saleId` (filter by the invoice being paid). Alternatively `paymentId` to see all allocations from a payment.

**Response 200:** `{ data: AllocationResponseDto[], meta }`

Each allocation:
```json
{
  "id": "uuid",
  "paymentTransactionId": "uuid",
  "appliesToTransactionId": "uuid",
  "amountApplied": 5000,
  "paymentTransaction": { "id": "uuid", "documentNumber": "SPY-2026-0001", "type": "SUPPLIER_PAYMENT", "transactionDate": "...", "totalAmount": 5000 },
  "appliesToTransaction": { "id": "uuid", "documentNumber": "PUR-2026-0001", "type": "PURCHASE", "transactionDate": "...", "totalAmount": 10000 }
}
```

---

## EXPENSE CATEGORIES

### GET /expense-categories
**Query params:** page, limit, search (name partial match), status (`ACTIVE` | `INACTIVE` | `ALL`).

**Response 200:** `{ data: ExpenseCategoryDto[], meta }`

```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "name": "Utilities",
  "description": "Monthly electricity and water",
  "status": "ACTIVE",
  "isSystem": true,
  "createdAt": "...",
  "updatedAt": "..."
}
```

**System categories (pre-seeded, `isSystem: true`, read-only):**

| Account # | Name |
|---|---|
| 6001 | Delivery & Shipping |
| 6002 | Office Supplies |
| 6003 | Utilities |
| 6004 | Rent & Lease |
| 6005 | Salaries & Wages |
| 6006 | Maintenance & Repairs |
| 6007 | Bank Charges & Fees |
| 6008 | Marketing & Advertising |
| 6009 | Professional Services |
| 6010 | Miscellaneous |

System categories cannot be edited or deleted. Frontend should hide Edit/Delete for `isSystem: true` rows.

---

### POST /expense-categories
OWNER / ADMIN only.
**Request:** `{ "name": "Staff Training", "description": "Optional" }`
**Error 409:** Duplicate name.

---

### PATCH /expense-categories/:id
**Request:** `{ name?, description?, status? }`
**Error 400:** System category cannot be updated. Category with posted expenses cannot be deactivated.

---

### DELETE /expense-categories/:id
Soft-delete (sets status INACTIVE).
**Error 400:** System category or has posted expenses.

---

## EXPENSES

### Expense Lifecycle
```
POST /expenses            → DRAFT  (documentNumber EXP-YYYY-NNNN assigned at creation)
POST /expenses/:id/post   → POSTED (DR expense account, CR cash account)
POST /expenses/:id/void   → VOIDED (reversal journal entry)
```

> Document number `EXP-YYYY-NNNN` is assigned **at draft creation**, not at posting.

---

### POST /expenses — Create Draft
OWNER / ADMIN only.

**Request:**
```json
{
  "date": "2026-03-15",
  "amount": 2500,
  "expenseCategoryId": "uuid",
  "paymentAccountId": "uuid",
  "description": "Monthly electricity bill"
}
```

| Field | Required | Rules |
|---|---|---|
| `date` | Yes | Cannot be in the future; YYYY-MM-DD |
| `amount` | Yes | Integer; min 1 |
| `expenseCategoryId` | Yes | Category must be ACTIVE |
| `paymentAccountId` | Yes | Account must be ACTIVE |
| `description` | Yes | 3–500 chars |

**Response 201:**
```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "expenseDate": "2026-03-15",
  "amount": 2500,
  "expenseCategoryId": "uuid",
  "categoryName": "Utilities",
  "paymentAccountId": "uuid",
  "paymentAccountName": "Main Cash",
  "description": "Monthly electricity bill",
  "status": "DRAFT",
  "series": "2026",
  "documentNumber": "EXP-2026-0001",
  "idempotencyKey": null,
  "voidReason": null,
  "voidedAt": null,
  "voidedBy": null,
  "createdBy": "uuid",
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

### GET /expenses — List
**Query params:**

| Param | Type | Notes |
|---|---|---|
| `page` | number | |
| `limit` | number | |
| `dateFrom` | YYYY-MM-DD | |
| `dateTo` | YYYY-MM-DD | |
| `expenseCategoryId` | UUID | Filter by category |
| `status` | `DRAFT` \| `POSTED` \| `VOIDED` \| `ALL` | Default: ALL |

**Response 200:** `{ data: ExpenseResponseDto[], meta }`

---

### GET /expenses/:id
**Response 200:** `ExpenseResponseDto`

---

### PATCH /expenses/:id — Edit Draft
Only DRAFT expenses can be edited. All fields optional.
**Request:** `{ date?, amount?, expenseCategoryId?, paymentAccountId?, description? }`
**Error 400:** Not DRAFT.

---

### DELETE /expenses/:id — Delete Draft
Only DRAFT expenses can be deleted.
**Response 200:** `{ "message": "Expense deleted" }`
**Error 400:** Not DRAFT.

---

### POST /expenses/:id/post
OWNER / ADMIN only.
**Request:** `{ "idempotencyKey": "uuid" }`
**Response 200:** `ExpenseResponseDto` with `status: "POSTED"`.
**Errors:** 400 (not DRAFT), 409 (duplicate idempotency key), 422 (category or account became inactive).

---

### POST /expenses/:id/void
OWNER / ADMIN only.
**Request:** `{ "reason": "optional reason" }`
**Response 200:** `ExpenseResponseDto` with `status: "VOIDED"`, `voidReason`, `voidedAt`, `voidedBy` populated.
**Error 400:** Not POSTED.

---

## REPORTS
All report endpoints require role `OWNER` or `ADMIN`. STAFF receives **403 Forbidden**.

---

### GET /reports/profit-loss
**Query params:** `dateFrom=YYYY-MM-DD`, `dateTo=YYYY-MM-DD` (both required).

**Response 200:**
```json
{
  "period": { "from": "2026-01-01", "to": "2026-03-15" },
  "revenue": {
    "salesRevenue": 500000,
    "salesReturns": -20000,
    "netRevenue": 480000
  },
  "costOfGoodsSold": 200000,
  "grossProfit": 280000,
  "operatingExpenses": {
    "byCategory": [
      { "categoryName": "Delivery & Shipping", "amount": -15000 },
      { "categoryName": "Utilities", "amount": -8000 }
    ],
    "total": -55000
  },
  "netIncome": 225000
}
```

**Frontend calculations:**
- `grossProfitMargin` is not returned. Compute: `(grossProfit / revenue.netRevenue * 100).toFixed(1) + '%'`. Guard: if `netRevenue === 0` display `'—'`.
- `salesReturns` is a negative integer — display in parentheses as a positive value.
- `operatingExpenses.byCategory[].amount` is negative — display in parentheses. Skip rows where `amount === 0`.

---

### GET /reports/balance-sheet
**Query params:** `asOfDate=YYYY-MM-DD` (defaults to today).

**Response 200:**
```json
{
  "asOfDate": "2026-03-15",
  "assets": {
    "cash": 3500000,
    "accountsReceivable": 250000,
    "inventory": 800000,
    "totalAssets": 4550000
  },
  "liabilities": {
    "accountsPayable": 350000,
    "totalLiabilities": 350000
  },
  "equity": {
    "openingCapital": 3575000,
    "retainedEarnings": 625000,
    "totalEquity": 4200000
  },
  "isBalanced": true
}
```

`isBalanced: true` means `totalAssets === totalLiabilities + totalEquity`. If `false`, show a warning banner.

---

### GET /reports/cash-position
**Query params:** `asOfDate=YYYY-MM-DD`.

**Response 200:**
```json
{
  "asOfDate": "2026-03-15",
  "totalCash": 3575000,
  "accounts": [
    {
      "accountId": "uuid",
      "accountName": "Main Cash",
      "accountType": "CASH",
      "balance": 500000
    }
  ]
}
```

---

### GET /reports/trial-balance
**Query params:** `asOfDate=YYYY-MM-DD`.

**Response 200:**
```json
{
  "asOfDate": "2026-03-15",
  "accounts": [
    {
      "accountNumber": "1000",
      "accountName": "Cash",
      "type": "ASSET",
      "subtype": "CASH",
      "totalDebit": 600000,
      "totalCredit": 50000,
      "balance": 550000,
      "normalBalance": "DEBIT"
    }
  ],
  "totals": {
    "totalDebits": 1200000,
    "totalCredits": 1200000
  }
}
```

---

### GET /reports/aged-receivables
**Query params:** `asOfDate=YYYY-MM-DD`.

**Response 200:**
```json
{
  "asOfDate": "2026-03-15",
  "customers": [
    {
      "customerId": "uuid",
      "customerName": "Ahmed Stores",
      "current": 50000,
      "days1to30": 30000,
      "days31to60": 10000,
      "days61to90": 0,
      "days90plus": 0,
      "total": 90000
    }
  ],
  "totals": { "current": 50000, "days1to30": 30000, "days31to60": 10000, "days61to90": 0, "days90plus": 0, "total": 90000 }
}
```

---

### GET /reports/aged-payables
Same structure as aged-receivables, for suppliers.

---

### GET /reports/inventory-valuation
**Query params:** `asOfDate=YYYY-MM-DD`.

**Response 200:**
```json
{
  "asOfDate": "2026-03-15",
  "totalInventoryValue": 500000,
  "variants": [
    {
      "productName": "Men Suit - Black",
      "variantSize": "M",
      "accountNumber": "1200",
      "inventoryValue": 12000,
      "quantity": 10,
      "avgCost": 1200
    }
  ]
}
```

---

### GET /reports/suppliers/:id/statement
Returns supplier ledger with running balance.
**Query params:** `dateFrom=YYYY-MM-DD`, `dateTo=YYYY-MM-DD`.

**Response 200:**
```json
{
  "supplierId": "uuid",
  "supplierName": "ABC Textiles",
  "dateFrom": "2026-01-01",
  "dateTo": "2026-03-15",
  "openingBalance": 0,
  "closingBalance": 100000,
  "lines": [
    {
      "date": "2026-03-01",
      "documentNumber": "PUR-2026-0001",
      "type": "PURCHASE",
      "description": "Purchase",
      "debit": 100000,
      "credit": 0,
      "runningBalance": 100000
    }
  ]
}
```

---

### GET /reports/customers/:id/statement
Same structure as supplier statement, for AR.

---

## DASHBOARD

### GET /dashboard/summary
**Query params:** `asOfDate=YYYY-MM-DD` (defaults to today).

**Response 200:**
```json
{
  "asOfDate": "2026-03-15",
  "cash": {
    "totalBalance": 3500000,
    "accounts": [
      { "id": "uuid", "name": "Main Cash", "balance": 2000000 }
    ]
  },
  "receivables": {
    "totalAmount": 250000,
    "customerCount": 8,
    "overdueAmount": 50000,
    "overdueCount": 3
  },
  "payables": {
    "totalAmount": 350000,
    "supplierCount": 5
  },
  "inventory": {
    "totalValue": 800000,
    "totalProducts": 24,
    "lowStockCount": 3
  }
}
```

---

## IMPORTS

### GET /imports
**Query params:** page, limit, module (ALL | SUPPLIERS | CUSTOMERS | PRODUCTS | OPENING_BALANCES), status (ALL | PENDING_MAPPING | VALIDATED | PROCESSING | COMPLETED | ROLLED_BACK).

---

### POST /imports/upload
**Request:** Multipart form. Fields: `module` (enum), `file` (.csv or .xlsx, max 10MB).
**Response 201:** Import record with `id` and `status: "PENDING_MAPPING"`.

---

### POST /imports/:id/map
Submit column mappings.
**Request:** `{ mappings: { systemField: "csvColumnName", ... } }`

---

### POST /imports/:id/commit
Commit validated import. Skips failed rows.
**Response 200:** Import summary.

---

### POST /imports/:id/rollback
Undo a COMPLETED import.
**Response 200:** `{ "message": "Import rolled back" }`

---

### GET /imports/:id
Get single import detail with row-level results.

---

## REMOVED / RENAMED — Complete Field Checklist

The table below captures all breaking changes from V1 through V3 in one place.

| Context | Old field | New field | Changed in |
|---|---|---|---|
| POST /suppliers request | `phone` optional | `phone` **required + unique** | v3 |
| POST /customers request | `phone` optional | `phone` **required + unique** | v3 |
| Transaction `documentNumber` | null for DRAFT | Populated for ALL statuses | v3 |
| GET /payment-accounts `sortBy` | `name` only | `name` or `balance` | v3 |
| GET /transactions `status` filter | `DRAFT` \| `POSTED` | + `VOIDED` | v3 |
| POST /expenses request | `expenseDate` | `date` | v2 |
| POST /expenses request | `categoryId` | `expenseCategoryId` | v2 |
| POST /expenses request | `note` | `description` (required, min 3) | v2 |
| P&L `sales` | `sales` | `revenue.salesRevenue` | v2 |
| P&L `salesReturns` | positive integer | `revenue.salesReturns` (negative) | v2 |
| P&L `grossProfitMargin` | returned by API | **Removed — compute client-side** | v2 |
| Trial Balance `accounts[].name` | `name` | `accountName` | v2 |
| Trial Balance `accounts[].debit` | `debit` | `totalDebit` | v2 |
| Trial Balance `accounts[].credit` | `credit` | `totalCredit` | v2 |
| Trial Balance `totalDebit` | `totalDebit` | `totals.totalDebits` | v2 |
| Trial Balance `totalCredit` | `totalCredit` | `totals.totalCredits` | v2 |
| Inventory Valuation root array | `products` | `variants` | v2 |
| Inventory Valuation `grandTotalValue` | `grandTotalValue` | `totalInventoryValue` | v2 |
| Inventory Valuation `qtyOnHand` | `qtyOnHand` | `quantity` | v2 |
| Inventory Valuation `totalValue` | `totalValue` | `inventoryValue` | v2 |
| Inventory Valuation `size` | `size` | `variantSize` | v2 |
| Payment Account card `totalIn` | `totalIn` | `breakdown.moneyIn.totalAmount` | v2 |
| Payment Account card `totalOut` | `totalOut` | `breakdown.moneyOut.totalAmount` | v2 |
| Payment Account card `currentBalance` | `currentBalance` | `breakdown.currentBalance` | v2 |
