# API Reference — Round 2 (COA Rewrite)

**Previous version:** `API_REFERENCE.md` (v1)
**This file:** Changes introduced by the COA (Chart of Accounts) rewrite commit `e06eec3`.

> **Rule for frontend team:** Read this file alongside `API_REFERENCE.md`. This document describes what is NEW, what CHANGED (breaking), and what is REMOVED. Anything not mentioned here works exactly as documented in v1.

---

## Quick Summary — What Changed

| Category | Impact |
|---|---|
| 2 entirely new modules | `expense-categories`, `expenses` |
| 1 new transaction action | `POST /transactions/:id/void` |
| Expense request fields renamed | Breaking — old field names return 400 |
| P&L response shape changed | Breaking — old field names are gone |
| Trial balance response shape changed | Breaking — field names renamed |
| Inventory valuation response shape changed | Breaking — `products` → `variants` |
| 3 new report endpoints | `balance-sheet`, `cash-position`, `ledger` |
| Reports role restriction | STAFF can no longer access reports |
| Expenses role restriction | STAFF can no longer write expenses |

---

## Base URL and Auth

No change from v1.

```
Base URL:   http://localhost:3000/api/v1
Auth:       Authorization: Bearer <accessToken>
```

---

## NEW MODULE — Expense Categories

`/api/v1/expense-categories`

Roles: read = any authenticated user; write = `OWNER`, `ADMIN` only.

### Important: System Categories

10 categories are pre-seeded automatically when a tenant registers. They are marked `isSystem: true` and **cannot be edited or deleted**.

| Account # | Name |
|-----------|------|
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

User-created categories appear alongside these in the list.

---

### GET /expense-categories

Lists all expense categories for the tenant.

**Query params:**

| Param | Type | Default | Notes |
|---|---|---|---|
| `page` | number | 1 | — |
| `limit` | number | 20 | — |
| `search` | string | — | Partial name match |
| `status` | `ACTIVE` \| `INACTIVE` \| `ALL` | `ACTIVE` | — |

**Response 200:**

```json
{
  "data": [
    {
      "id": "uuid",
      "tenantId": "uuid",
      "name": "Utilities",
      "description": "Monthly electricity and water",
      "status": "ACTIVE",
      "isSystem": true,
      "createdAt": "2026-03-14T00:00:00.000Z",
      "updatedAt": "2026-03-14T00:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 12, "totalPages": 1 }
}
```

**Key field:** `isSystem: true` → show as read-only, hide Edit/Delete buttons.

---

### POST /expense-categories

Creates a new user-defined expense category.

**Request body:**

```json
{
  "name": "Staff Training",
  "description": "Optional description"
}
```

**Rules:**
- `name` required, 2–100 chars, unique within tenant
- `description` optional, max 500 chars

**Response 201:** Single `ExpenseCategoryResponseDto` (same shape as item above)

**Error 409:** Name already exists within tenant.

---

### PATCH /expense-categories/:id

Updates a user-defined category.

**Request body** (all optional):

```json
{
  "name": "Staff Training & Dev",
  "description": "Updated description",
  "status": "INACTIVE"
}
```

**Rules:**
- System categories (`isSystem: true`) cannot be updated → **400 Bad Request**
- Cannot deactivate if the category has posted expenses → **400 Bad Request**

---

### DELETE /expense-categories/:id

Soft-deletes (sets `status: INACTIVE`). Does not physically remove the row.

**Rules:**
- System categories → **400 Bad Request**
- Category with posted expenses → **400 Bad Request**

---

## NEW MODULE — Expenses

`/api/v1/expenses`

Roles: read = any authenticated user; write (create/edit/delete/post/void) = `OWNER`, `ADMIN` only.
**STAFF cannot create, edit, delete, post, or void expenses.**

### Expense Lifecycle

```
[POST /expenses]       → DRAFT  (document number EXP-YYYY-NNNN assigned immediately)
[POST /expenses/:id/post]  → POSTED (journal entry created: DR expense / CR cash)
[POST /expenses/:id/void]  → VOIDED (reversal journal entry created)
```

**Key difference from transactions:** The `EXP-YYYY-NNNN` document number is assigned at **draft creation**, not at posting. The draft already has a document number.

---

### POST /expenses — Create Draft

**Request body:**

```json
{
  "date": "2026-03-15",
  "amount": 2500,
  "expenseCategoryId": "uuid",
  "paymentAccountId": "uuid",
  "description": "Monthly electricity bill"
}
```

**Field rules:**

| Field | Type | Required | Rules |
|---|---|---|---|
| `date` | string YYYY-MM-DD | Yes | Cannot be in the future |
| `amount` | integer PKR | Yes | Min 1 |
| `expenseCategoryId` | UUID | Yes | Category must be ACTIVE |
| `paymentAccountId` | UUID | Yes | Account must be ACTIVE |
| `description` | string | Yes | 3–500 chars |

**Response 201** — `ExpenseResponseDto`:

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
  "createdAt": "2026-03-15T10:00:00.000Z",
  "updatedAt": "2026-03-15T10:00:00.000Z"
}
```

> Note: `documentNumber` is already set on the draft — do not treat it as null for DRAFT status.

---

### GET /expenses — List

**Query params:**

| Param | Type | Default | Notes |
|---|---|---|---|
| `page` | number | 1 | — |
| `limit` | number | 20 | — |
| `dateFrom` | string | — | YYYY-MM-DD |
| `dateTo` | string | — | YYYY-MM-DD |
| `expenseCategoryId` | UUID | — | Filter by category |
| `status` | `DRAFT` \| `POSTED` \| `VOIDED` \| `ALL` | `ALL` | — |

**Response 200:** `{ data: ExpenseResponseDto[], meta: PaginationMeta }`

---

### GET /expenses/:id — Get One

**Response 200:** `ExpenseResponseDto`

---

### PATCH /expenses/:id — Edit Draft

Only `DRAFT` expenses can be edited.

**Request body** (all optional):

```json
{
  "date": "2026-03-16",
  "amount": 2750,
  "expenseCategoryId": "uuid",
  "paymentAccountId": "uuid",
  "description": "Updated electricity bill"
}
```

**Response 200:** Updated `ExpenseResponseDto`

**Error 400:** If expense is not DRAFT.

---

### DELETE /expenses/:id — Delete Draft

Only `DRAFT` expenses can be deleted.

**Response 200:** `{ "message": "Expense deleted" }`

**Error 400:** If expense is not DRAFT.

---

### POST /expenses/:id/post — Post Expense

Creates the double-entry journal entry (DR expense account, CR cash account).

**Request body:**

```json
{
  "idempotencyKey": "uuid"
}
```

**Response 200:** `ExpenseResponseDto` with `status: "POSTED"`

**Errors:**
- 400: Not DRAFT
- 409: `idempotencyKey` already used on a different expense
- 422: Category or payment account became inactive since draft was created

---

### POST /expenses/:id/void — Void Posted Expense

Creates a reversal journal entry (DR cash, CR expense account).

**Request body:**

```json
{
  "reason": "Posted in error"
}
```

`reason` is optional.

**Response 200:** `ExpenseResponseDto` with `status: "VOIDED"`, `voidReason`, `voidedAt`, `voidedBy` populated.

**Error 400:** If expense is not POSTED.

---

## CHANGED — Transactions

### NEW: POST /transactions/:id/void

Voids a POSTED transaction. Creates a full reversal journal entry.

**Request body:**

```json
{
  "reason": "Entered wrong amounts"
}
```

`reason` is optional.

**Response 200:** `TransactionResponseDto` with `status: "VOIDED"`

**Error 400:** Only POSTED transactions can be voided. DRAFT transactions must be deleted, not voided.

> This endpoint did not exist in v1. Transactions previously had no void path.

---

## CHANGED — Reports (Breaking)

All reports now require role `OWNER` or `ADMIN`. STAFF users will receive **403 Forbidden**.

### P&L — Response Shape Changed

**Endpoint:** `GET /reports/profit-loss?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD`

**Old shape (v1 — no longer works):**
```json
{
  "sales": 500000,
  "salesReturns": 20000,
  "grossProfitMargin": 0.45
}
```

**New shape (v2):**
```json
{
  "period": {
    "from": "2026-01-01",
    "to": "2026-01-31"
  },
  "revenue": {
    "salesRevenue": 500000,
    "salesReturns": -20000,
    "netRevenue": 480000
  },
  "costOfGoodsSold": 200000,
  "grossProfit": 280000,
  "operatingExpenses": {
    "byCategory": [
      { "categoryName": "Delivery & Shipping", "amount": 15000 },
      { "categoryName": "Utilities", "amount": 8000 }
    ],
    "total": 55000
  },
  "netIncome": 225000
}
```

**Migration notes:**
- `sales` → `revenue.salesRevenue`
- `salesReturns` (was positive) → `revenue.salesReturns` (now **negative integer**)
- `grossProfitMargin` → **removed** (compute on frontend: `grossProfit / revenue.netRevenue`)
- New: `operatingExpenses.byCategory[]` — list of expense amounts per category
- New: `netIncome` — gross profit minus operating expenses

---

### Trial Balance — Response Shape Changed

**Endpoint:** `GET /reports/trial-balance?asOfDate=YYYY-MM-DD`

**Old shape (v1):**
```json
{
  "accounts": [
    { "name": "Cash", "debit": 100000, "credit": 0 }
  ],
  "totalDebit": 500000,
  "totalCredit": 500000
}
```

**New shape (v2):**
```json
{
  "asOfDate": "2026-02-20",
  "accounts": [
    {
      "accountNumber": "1001",
      "accountName": "CASH - Main Cash",
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

**Migration notes:**
- `accounts[].name` → `accounts[].accountName`
- `accounts[].debit` → `accounts[].totalDebit`
- `accounts[].credit` → `accounts[].totalCredit`
- `totalDebit` / `totalCredit` (top-level) → `totals.totalDebits` / `totals.totalCredits`
- New fields per row: `accountNumber`, `type`, `subtype`, `balance`, `normalBalance`

---

### Inventory Valuation — Response Shape Changed

**Endpoint:** `GET /reports/inventory-valuation?asOfDate=YYYY-MM-DD`

**Old shape (v1):**
```json
{
  "products": [
    {
      "productName": "Suit",
      "size": "M",
      "qtyOnHand": 10,
      "avgCost": 1200,
      "totalValue": 12000
    }
  ],
  "grandTotalValue": 500000
}
```

**New shape (v2):**
```json
{
  "asOfDate": "2026-02-20",
  "totalInventoryValue": 500000,
  "variants": [
    {
      "productName": "Men Suit - Black",
      "variantSize": "M",
      "accountNumber": "1201",
      "inventoryValue": 12000,
      "quantity": 10,
      "avgCost": 1200
    }
  ]
}
```

**Migration notes:**
- `products` → `variants`
- `grandTotalValue` → `totalInventoryValue`
- `qtyOnHand` → `quantity`
- `totalValue` → `inventoryValue`
- `size` → `variantSize`
- New field: `accountNumber` (internal COA number — can display or ignore)

---

### NEW Report — Balance Sheet

**Endpoint:** `GET /reports/balance-sheet?asOfDate=YYYY-MM-DD`

Returns assets, liabilities, equity totals with balance check.

```json
{
  "asOfDate": "2026-03-14",
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

`isBalanced: true` means `totalAssets === totalLiabilities + totalEquity`.

---

### NEW Report — Cash Position

**Endpoint:** `GET /reports/cash-position?asOfDate=YYYY-MM-DD`

Returns per-account cash balance.

```json
{
  "asOfDate": "2026-03-14",
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

### NEW Report — Account Ledger

**Endpoint:** `GET /reports/ledger?accountId=UUID&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD`

Raw general ledger for a specific account (by account UUID, not account number).

Use `GET /reports/suppliers/:id/ledger` and `GET /reports/customers/:id/ledger` instead for supplier/customer-specific statements — these are aliases to the existing statement endpoints.

---

### Supplier/Customer Balance — Response Shape Updated

No breaking changes but new fields added.

**Supplier balance now includes:**
```json
{
  "supplierId": "uuid",
  "supplierName": "ABC Textiles",
  "asOfDate": "2026-02-20",
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

`balanceType` values: `"PAYABLE"` (you owe them), `"CREDIT"` (they owe you), `"SETTLED"` (zero).

**Customer balance now includes:**

Same pattern with `balanceType`: `"RECEIVABLE"` / `"CREDIT"` / `"SETTLED"`.

---

### Payment Account Balance — Response Shape Updated

New `breakdown` structure. Old `totalIn`/`totalOut` flat fields are gone.

```json
{
  "accountId": "uuid",
  "accountName": "Main Cash",
  "accountType": "CASH",
  "asOfDate": "2026-03-14",
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

## REMOVED / RENAMED — Breaking Field Checklist

If the frontend is currently sending any of these, they must be updated:

| Context | Old field | New field | Breaking? |
|---|---|---|---|
| `POST /expenses` request | `expenseDate` | `date` | **Yes — 400** |
| `POST /expenses` request | `categoryId` | `expenseCategoryId` | **Yes — 400** |
| `POST /expenses` request | `note` | `description` (required, min 3) | **Yes — 400** |
| `PATCH /expenses/:id` request | `expenseDate` | `date` | **Yes — 400** |
| P&L response | `sales` | `revenue.salesRevenue` | **Yes — undefined** |
| P&L response | `salesReturns` (positive) | `revenue.salesReturns` (negative) | **Yes — wrong sign** |
| P&L response | `grossProfitMargin` | Removed — compute client-side | **Yes — undefined** |
| Trial Balance response | `accounts[].name` | `accounts[].accountName` | **Yes — undefined** |
| Trial Balance response | `accounts[].debit` | `accounts[].totalDebit` | **Yes — undefined** |
| Trial Balance response | `accounts[].credit` | `accounts[].totalCredit` | **Yes — undefined** |
| Trial Balance response | `totalDebit` | `totals.totalDebits` | **Yes — undefined** |
| Trial Balance response | `totalCredit` | `totals.totalCredits` | **Yes — undefined** |
| Inventory Valuation response | `products` | `variants` | **Yes — undefined** |
| Inventory Valuation response | `grandTotalValue` | `totalInventoryValue` | **Yes — undefined** |
| Inventory Valuation response | `qtyOnHand` | `quantity` | **Yes — undefined** |
| Inventory Valuation response | `totalValue` | `inventoryValue` | **Yes — undefined** |
| Inventory Valuation response | `size` | `variantSize` | **Yes — undefined** |

---

## Unchanged Endpoints (No Frontend Work Required)

- `POST /auth/login`, `POST /auth/register`, `POST /auth/refresh`, `POST /auth/logout`
- All `/suppliers` endpoints (CRUD, balance, status)
- All `/customers` endpoints
- All `/products` and `/product-variants` endpoints
- All `/payment-accounts` endpoints (CRUD only — balance endpoint shape changed above)
- All `/transactions` draft + post endpoints (same request/response)
- All `/imports` endpoints
- `GET /dashboard/summary`
- Supplier/Customer statement endpoints (same shape)
- Payment account statement endpoint (same shape)
- Pending receivables/payables (same shape)
- Product stock report (same shape)
