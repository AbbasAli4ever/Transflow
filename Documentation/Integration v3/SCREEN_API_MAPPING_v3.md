# Screen → API Mapping — v3
**Product:** Persona Finance System
**Status:** Canonical standalone document. Do not read V1 or V2 alongside this.
**Total screens:** 52

**API Base:** `GET/POST/PATCH /api/v1/...`
**Auth:** All endpoints (except login/register) require `Authorization: Bearer <accessToken>`.

---

## SCREEN 01 — Login

| UI Element | Source | API / Notes |
|---|---|---|
| Email input | User input | — |
| Password input | User input | — |
| "Sign in" button | Action | `POST /api/v1/auth/login` body: `{ email, password }` |
| Error banner | API response | HTTP 401 → `"Authentication failed"` |
| Redirect after login | Response | Store `accessToken`, `refreshToken`, `user` (id, tenantId, fullName, email, role, tenant.name, tenant.baseCurrency, tenant.timezone) |

---

## SCREEN 02 — Register

| UI Element | Source | API / Notes |
|---|---|---|
| Business name | User input | `tenantName` |
| Base currency | User input | Applied via follow-up `PATCH /auth/tenant` |
| Timezone | User input | Applied via follow-up `PATCH /auth/tenant` |
| Full name | User input | `fullName` |
| Email | User input | `email` |
| Password | User input | `password` |
| Confirm password | Frontend only | Not sent to API |
| "Create Account" | Action | Two-step flow (see below) |

**Two-step registration:**
```
Step 1: POST /api/v1/auth/register
        { tenantName, fullName, email, password }
        → Returns { accessToken, refreshToken, user }

Step 2: PATCH /api/v1/auth/tenant    (using returned accessToken)
        { baseCurrency, timezone }
```

---

## SCREEN 03 — Dashboard

| UI Element | Source | API / Notes |
|---|---|---|
| All stat cards | API | `GET /api/v1/dashboard/summary?asOfDate=YYYY-MM-DD` |
| "As of date" picker | Query param | `?asOfDate=2026-03-15` |
| Refresh button | Action | Re-call `GET /api/v1/dashboard/summary` |
| Recent Activity table | Separate API | `GET /api/v1/transactions?limit=10&sortBy=createdAt&sortOrder=desc&status=POSTED` (call in parallel with dashboard/summary) |

### Stat Card Mapping

| Card | Field | Sub-label field |
|---|---|---|
| Total Cash | `cash.totalBalance` | `cash.accounts.length` → "X accounts" |
| Total Receivables | `receivables.totalAmount` | `receivables.customerCount` → "from X customers" |
| Total Payables | `payables.totalAmount` | `payables.supplierCount` → "X suppliers" |
| Inventory Value | `inventory.totalValue` | `inventory.totalProducts` → "X products" |
| Overdue | `receivables.overdueAmount` | `receivables.overdueCount` → "X overdue" |

### Middle Section

| Panel | Field |
|---|---|
| Cash by Account | `cash.accounts[]` — each has `{ name, balance }` |
| Receivables vs Payables | `receivables.totalAmount` vs `payables.totalAmount` (frontend chart) |

---

## SCREEN 04 — Transactions List *(v3: VOIDED filter; documentNumber for all statuses)*

| UI Element | Source | API / Notes |
|---|---|---|
| All table data | API | `GET /api/v1/transactions` |
| Date range | Query params | `?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD` |
| Type filter | Query param | `?type=PURCHASE` (enum: all transaction types) |
| Status filter | Query param | `?status=DRAFT` \| `POSTED` \| **`VOIDED`** ← v3: VOIDED added |
| Party search | Query param | `?partySearch=text` — case-insensitive name match on supplier and customer |
| Product filter | Query param | `?productId=uuid` |
| Pagination | Query params | `?page=1&limit=20` |
| Sort | Query params | `?sortBy=transactionDate&sortOrder=desc` |

### Table Column Mapping

| Column | Field | Notes |
|---|---|---|
| Date | `transactionDate` | Format as date |
| Document # | `documentNumber` | **Present for ALL statuses** — draft format (DPUR-NNNN) for DRAFT, posted format (PUR-YYYY-NNNN) for POSTED/VOIDED |
| Type badge | `type` | Color mapping: PURCHASE=blue, SALE=green, PAYMENT=teal, RETURN=orange, ADJUSTMENT=grey, TRANSFER=purple |
| Status badge | `status` | DRAFT=yellow, POSTED=green, VOIDED=grey |
| Party | `supplier.name` or `customer.name` | Shallow include in list response |
| Amount | `totalAmount` | Right-aligned, formatted |

---

## SCREEN 05 — Transaction Detail *(v3: document # on DRAFT; v2: void action)*

| UI Element | Source | API / Notes |
|---|---|---|
| All data | API | `GET /api/v1/transactions/:id` |

### Header Block

| Field | Response Field | Notes |
|---|---|---|
| Document number | `documentNumber` | **Present for DRAFT** (draft format), POSTED (final format), VOIDED (final format) |
| Status badge | `status` | DRAFT=yellow, POSTED=green, VOIDED=grey |
| Type | `type` | |
| Date | `transactionDate` | |
| Party name | `supplier.name` or `customer.name` | Deep include in `findOne` |
| Created by | `createdByUser.fullName` | Deep include in `findOne` |
| Created at | `createdAt` | |

### Transaction Lines

| Column | Field | Notes |
|---|---|---|
| Product name | `transactionLines[].variant.product.name` | Deep include |
| Size | `transactionLines[].variantSize` | |
| Qty | `transactionLines[].quantity` | |
| Unit Cost / Price | `transactionLines[].unitCost` or `transactionLines[].unitPrice` | Depends on type |
| Discount | `transactionLines[].discountAmount` | |
| Line Total | `transactionLines[].lineTotal` | |
| Subtotal | `subtotal` | Transaction-level |
| Discount Total | `discountTotal` | |
| Delivery Fee | `deliveryFee` | |
| Total Amount | `totalAmount` | |

### Payment Info Block

| Field | Source |
|---|---|
| Paid Now / Received Now | `paymentEntries[].amount` — sum for total |
| Payment Account | `paymentEntries[].paymentAccountId` — join with account list for name |

### Allocations Section

| Field | Source | API |
|---|---|---|
| Allocations table | Separate API | `GET /api/v1/transactions/allocations?purchaseId=:id` or `?saleId=:id` |
| Applied to doc # | `allocations[].appliesToTransaction.documentNumber` | |
| Amount applied | `allocations[].amountApplied` | |

### Voided State Block (shown when `status === 'VOIDED'`)

| Field | Response Field |
|---|---|
| Voided reason | `voidReason` — show "No reason given" if null |
| Voided at | `voidedAt` |

### Actions Bar

| Status | Role | Buttons | API |
|---|---|---|---|
| DRAFT | Any | "Post Transaction" | `POST /api/v1/transactions/:id/post` |
| DRAFT | Any | "Edit" | `PATCH /api/v1/transactions/:id` |
| DRAFT | Any | "Delete Draft" | `DELETE /api/v1/transactions/:id` |
| POSTED | OWNER/ADMIN | "Void Transaction" | `POST /api/v1/transactions/:id/void` body: `{ reason? }` |
| POSTED | Any | "Print / Export PDF" | Placeholder — no backend |
| VOIDED | Any | No action buttons | — |

**Void confirmation modal:** "This action is irreversible. Enter a reason (optional)." Reason text input + "Void Transaction" (danger) + "Cancel".

---

## SCREEN 06 — Create Purchase (Step 1: Draft)

### Form → API Mapping

| Field | API Field | Notes |
|---|---|---|
| Supplier dropdown | `supplierId` | `GET /api/v1/suppliers?status=ACTIVE&limit=100` |
| Transaction Date | `transactionDate` | YYYY-MM-DD |
| Idempotency Key | — | Auto-generated UUID, not shown to user |
| Product dropdown | — | `GET /api/v1/products?status=ACTIVE&limit=100` |
| Size/Variant dropdown | — | From `product.variants[]` — filter `status === 'ACTIVE'`; show stock hint from `GET /api/v1/products/:id/stock` |
| Quantity | `lines[].quantity` | Min 1 |
| Unit Cost | `lines[].unitCost` | Min 1 |
| Discount | `lines[].discountAmount` | Default 0 |
| Line Total | **Frontend calc** | `(quantity × unitCost) - discountAmount` |
| Delivery Fee | `deliveryFee` | Default 0 |
| Notes | `notes` | Optional |

**Submit:** `POST /api/v1/transactions/purchases/draft`

**Response:** `TransactionResponseDto` with `status: "DRAFT"` and `documentNumber: "DPUR-NNNN"` (shown as read-only label after save).

### Live Summary Panel

| Field | Source |
|---|---|
| Subtotal | Frontend calc: sum of line totals |
| Total Discount | Frontend calc: sum of discountAmount |
| Delivery Fee | User input |
| Total Amount | Frontend calc: subtotal + deliveryFee |
| Supplier current balance | `GET /api/v1/suppliers/:id/balance` → `balance` |

---

## SCREEN 07 — Create Purchase (Step 2: Post)

| UI Element | API | Notes |
|---|---|---|
| Draft summary | From Screen 06 response | Already have data |
| "Pay now?" toggle | Frontend state | |
| Amount to Pay | `paidNow` | Integer; min 0; max = totalAmount |
| Payment Account dropdown | `paymentAccountId` | `GET /api/v1/payment-accounts?status=ACTIVE` — show name + `_computed.currentBalance` |
| Idempotency key | `idempotencyKey` | New UUID (different from draft key) |
| "Confirm & Post" | `POST /api/v1/transactions/:id/post` | Body: `{ idempotencyKey, paidNow?, paymentAccountId? }` |

---

## SCREEN 08 — Create Sale (Step 1: Draft)

| Field | API Field | Notes |
|---|---|---|
| Customer dropdown | `customerId` | `GET /api/v1/customers?status=ACTIVE&limit=100` |
| Transaction Date | `transactionDate` | |
| Delivery Type | `deliveryType` | Optional; `STORE_PICKUP` or `HOME_DELIVERY` |
| Delivery Address | `deliveryAddress` | Max 500 chars; shown if DELIVERY selected |
| Notes | `notes` | |
| Product dropdown | — | `GET /api/v1/products?status=ACTIVE` |
| Size/Variant dropdown | — | From `product.variants[]` — filter active; stock hint per size |
| Quantity | `lines[].quantity` | Stock warning inline if qty > currentStock for that size |
| Unit Price | `lines[].unitPrice` | Min 1 |
| Discount | `lines[].discountAmount` | |
| Line Total | **Frontend calc** | `(quantity × unitPrice) - discountAmount` |

**Submit:** `POST /api/v1/transactions/sales/draft`
**Response:** `documentNumber: "DSAL-NNNN"`.

### Live Summary Panel

| Field | Source |
|---|---|
| Customer current balance | `GET /api/v1/customers/:id/balance` → `balance` |
| Subtotal / Discount / Total | Frontend calc |

---

## SCREEN 09 — Create Sale (Step 2: Post)

| UI Element | API | Notes |
|---|---|---|
| "Receive payment now?" toggle | Frontend state | |
| Amount Received | `receivedNow` | |
| Payment Account | `paymentAccountId` | |
| "Confirm & Post" | `POST /api/v1/transactions/:id/post` | Body: `{ idempotencyKey, receivedNow?, paymentAccountId? }` |

---

## SCREEN 10 — Create Supplier Payment

### Form → API

| Field | API Field | Notes |
|---|---|---|
| Supplier dropdown | `supplierId` | `GET /api/v1/suppliers?status=ACTIVE` |
| Supplier balance | Display only | `GET /api/v1/suppliers/:id/balance` |
| Amount | `amount` | Min 1 |
| Payment Account | `paymentAccountId` | `GET /api/v1/payment-accounts?status=ACTIVE` |
| Transaction Date | `transactionDate` | |

### Draft + Post Flow

```
Step 1: POST /api/v1/transactions/supplier-payments/draft
        { supplierId, amount, paymentAccountId, transactionDate }
        → Returns draft with documentNumber: "DSPY-NNNN"

Step 2: POST /api/v1/transactions/:id/post
        { idempotencyKey, allocations?: [{ transactionId, amount }] }
```

### Allocations Section

| UI Element | Source |
|---|---|
| Open invoices table | `GET /api/v1/suppliers/:id/open-documents` → `documents[]` |
| Document # | `documents[].documentNumber` |
| Outstanding | `documents[].outstanding` |
| Allocate Amount input | User input; must not exceed `documents[].outstanding` |
| Total allocated | Frontend sum |
| Unallocated remainder | `paymentAmount - totalAllocated` (frontend) |

---

## SCREEN 11 — Create Customer Receipt

Identical pattern to Screen 10, mirrored for customers.

| Field | Notes |
|---|---|
| Customer open invoices | `GET /api/v1/customers/:id/open-documents` |
| Draft endpoint | `POST /api/v1/transactions/customer-payments/draft` |
| `documentNumber` | `"DCPY-NNNN"` |
| Post endpoint | `POST /api/v1/transactions/:id/post` with `{ idempotencyKey, allocations? }` |

---

## SCREEN 12 — Create Supplier Return

### Step 1

| UI Element | API |
|---|---|
| Supplier dropdown | `GET /api/v1/suppliers?status=ACTIVE` |
| Source Purchase dropdown | `GET /api/v1/transactions?type=PURCHASE&status=POSTED&supplierId=:id` |
| Returnable lines | From `purchase.transactionLines[]` — calculate returnable qty client-side using existing returns |

**Submit draft:** `POST /api/v1/transactions/supplier-returns/draft`
```json
{
  "supplierId": "uuid",
  "transactionDate": "...",
  "lines": [{ "sourceTransactionLineId": "uuid", "quantity": 2 }]
}
```
Response: `documentNumber: "DSRN-NNNN"`.

### Step 2 — Post

`POST /api/v1/transactions/:id/post` with `{ idempotencyKey }`.

---

## SCREEN 13 — Create Customer Return

### Step 1

| UI Element | API |
|---|---|
| Customer dropdown | `GET /api/v1/customers?status=ACTIVE` |
| Source Sale dropdown | `GET /api/v1/transactions?type=SALE&status=POSTED&customerId=:id` |

**Submit draft:** `POST /api/v1/transactions/customer-returns/draft`
```json
{
  "customerId": "uuid",
  "transactionDate": "...",
  "lines": [{ "sourceTransactionLineId": "uuid", "quantity": 1 }]
}
```
Response: `documentNumber: "DCRN-NNNN"`.

### Step 2 — Return Handling + Post

| UI Element | API Field | Notes |
|---|---|---|
| "Refund now" radio | `returnHandling: "REFUND_NOW"` | Requires `paymentAccountId` |
| "Store credit" radio | `returnHandling: "STORE_CREDIT"` | No account needed |
| Payment Account dropdown | `paymentAccountId` | Shown only if REFUND_NOW |

`POST /api/v1/transactions/:id/post` body: `{ idempotencyKey, returnHandling, paymentAccountId? }`.

---

## SCREEN 14 — Create Internal Transfer

| UI Element | API | Notes |
|---|---|---|
| From Account | `fromPaymentAccountId` | `GET /api/v1/payment-accounts?status=ACTIVE` |
| To Account | `toPaymentAccountId` | Same list; exclude fromPaymentAccountId |
| Amount | `amount` | Show From account balance as hint |

**Draft:** `POST /api/v1/transactions/internal-transfers/draft` → `documentNumber: "DTRF-NNNN"`.
**Post:** `POST /api/v1/transactions/:id/post` with `{ idempotencyKey }`.

---

## SCREEN 15 — Create Stock Adjustment

| UI Element | API | Notes |
|---|---|---|
| Product dropdown | — | `GET /api/v1/products?status=ACTIVE` |
| Variant dropdown | — | From `product.variants[]` — active only |
| Current stock hint | — | From `product.variants[].currentStock` |

**Submit draft:** `POST /api/v1/transactions/adjustments/draft`
```json
{
  "transactionDate": "...",
  "lines": [
    { "variantId": "uuid", "quantity": 5, "direction": "IN", "reason": "Found extra", "unitCost": 500 },
    { "variantId": "uuid", "quantity": 2, "direction": "OUT", "reason": "Damaged" }
  ]
}
```
Response: `documentNumber: "DADJ-NNNN"`.
**Post:** `POST /api/v1/transactions/:id/post` with `{ idempotencyKey }`.

---

## SCREEN 16 — Suppliers List

| UI Element | API | Notes |
|---|---|---|
| Table data | `GET /api/v1/suppliers` | |
| Search | `?search=text` | |
| Status filter | `?status=ACTIVE` / `INACTIVE` / `ALL` | |
| Sort | `?sortBy=name&sortOrder=asc` | |
| Current Balance | `_computed.currentBalance` | Included in list response |

---

## SCREEN 17 — Add Supplier *(v3: phone required + unique)*

| UI Element | API Field | Notes |
|---|---|---|
| Name input | `name` | Required; unique |
| **Phone input** | `phone` | **Required; min 10 chars; unique** ← v3 change |
| Address | `address` | Optional |
| Notes | `notes` | Optional |
| "Save Supplier" | `POST /api/v1/suppliers` | |
| 409: name taken | `message` | Show inline under name field |
| **409: phone taken** | `message` | **Show inline under phone field** ← v3 change |

**Edit supplier:** `PATCH /api/v1/suppliers/:id` — same fields. Phone still must be unique.

---

## SCREEN 18 — Supplier Detail

| UI Element | API |
|---|---|
| Profile data | `GET /api/v1/suppliers/:id` |
| Balance cards | `GET /api/v1/suppliers/:id/balance` — use `balance`, `breakdown.purchases.totalAmount`, `breakdown.payments.totalAmount` |
| Change Status | `PATCH /api/v1/suppliers/:id/status` |

---

## SCREEN 19 — Supplier Ledger

| UI Element | API | Notes |
|---|---|---|
| Ledger data | `GET /api/v1/reports/suppliers/:id/statement?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD` | |
| Date, Doc #, Type | `lines[].date`, `lines[].documentNumber`, `lines[].type` | |
| Debit | `lines[].debit` | |
| Credit | `lines[].credit` | |
| Running Balance | `lines[].runningBalance` | |
| Opening Balance | `openingBalance` | |
| Closing Balance | `closingBalance` | |

---

## SCREEN 20 — Supplier Open Documents

| UI Element | API | Notes |
|---|---|---|
| Documents table | `GET /api/v1/suppliers/:id/open-documents` | |
| Doc # | `documents[].documentNumber` | |
| Total Amount | `documents[].totalAmount` | |
| Paid Amount | `documents[].paidAmount` | |
| Outstanding | `documents[].outstanding` | |
| Days Outstanding | `documents[].daysOutstanding` | |
| Footer Totals | `totalOutstanding`, `unappliedCredits`, `netOutstanding` | |
| "Pay Now" button | Navigate to Screen 10 with supplierId + documentId pre-filled | Frontend routing |

---

## SCREEN 21 — Customers List

| UI Element | API | Notes |
|---|---|---|
| Table data | `GET /api/v1/customers` | Same params as suppliers |
| Current Balance | `_computed.currentBalance` | |

---

## SCREEN 22 — Add Customer *(v3: phone required + unique)*

| UI Element | API Field | Notes |
|---|---|---|
| Name | `name` | Required; unique |
| **Phone** | `phone` | **Required; min 10 chars; unique** ← v3 change |
| Address | `address` | Optional |
| Notes | `notes` | Optional |
| "Save Customer" | `POST /api/v1/customers` | |
| 409: phone taken | `message` | Show inline under phone field |

---

## SCREEN 23 — Customer Detail

Same pattern as Supplier Detail (Screen 18) for customers.

| UI Element | API |
|---|---|
| Balance cards | `GET /api/v1/customers/:id/balance` — `balance`, `breakdown.purchases.totalAmount`, `breakdown.payments.totalAmount` |

---

## SCREEN 24 — Customer Ledger

Same pattern as Supplier Ledger (Screen 19).
`GET /api/v1/reports/customers/:id/statement?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD`

---

## SCREEN 25 — Customer Open Documents

Same pattern as Supplier Open Documents (Screen 20).
`GET /api/v1/customers/:id/open-documents`

"Receive Payment" button → navigate to Screen 11 with customerId pre-filled.

---

## SCREEN 26 — Products List

| UI Element | API | Notes |
|---|---|---|
| Table data | `GET /api/v1/products` | |
| Search | `?search=text` | Name, SKU, category |
| Status filter | `?status=ACTIVE/INACTIVE/ALL` | |
| Category filter | `?category=text` | |
| Total Stock | `totalStock` | Sum across all variants |
| # Sizes | `variants.length` (filter active) | Frontend count |

---

## SCREEN 27 — Add Product

| UI Element | API Field | Notes |
|---|---|---|
| Name | `name` | Required |
| SKU | `sku` | Optional; unique |
| Category | `category` | Optional |
| Unit | `unit` | Optional |
| "Save Product" | `POST /api/v1/products` | Auto-creates "one-size" variant |
| 409: SKU taken | `message` | Show inline |

---

## SCREEN 28 — Product Detail

| UI Element | API |
|---|---|
| Product data | `GET /api/v1/products/:id` |
| Per-variant table | `variants[]` in product response |
| `currentStock` | `variants[].currentStock` |
| `avgCost` | `variants[].avgCost` |
| Change Status (variant) | `PATCH /api/v1/product-variants/:id/status` |
| Edit variant (size/SKU) | `PATCH /api/v1/product-variants/:id` body: `{ size?, sku? }` |
| Add Size | `POST /api/v1/product-variants` body: `{ productId, size, sku? }` |

**Tabs:**
- Purchase/Sale History: `GET /api/v1/transactions?type=PURCHASE&productId=:id` (etc.)
- Stock Movements: Separate stock movements endpoint if available, or filter from transactions

---

## SCREEN 29 — Payment Accounts List *(v3: sort by balance)*

| UI Element | API | Notes |
|---|---|---|
| Table data | `GET /api/v1/payment-accounts` | |
| Type filter | `?type=CASH/BANK/WALLET/CARD` | |
| Status filter | `?status=ACTIVE/INACTIVE/ALL` | |
| **Sort by balance** | `?sortBy=balance&sortOrder=desc` | ← v3 change; also `sortBy=name` |

### Account Card Data Mapping

| UI Label | Response Field |
|---|---|
| Current Balance | `_computed.currentBalance` (when sortBy=balance) or `GET /payment-accounts/:id/balance` → `breakdown.currentBalance` |
| Opening Balance | From balance endpoint → `breakdown.openingBalance` |
| Total In | From balance endpoint → `breakdown.moneyIn.totalAmount` |
| Total Out | From balance endpoint → `breakdown.moneyOut.totalAmount` |

**Note:** For the list view, if not sorting by balance, load balance details on demand (click to expand or on account card render). When `sortBy=balance`, `_computed.currentBalance` is included in the list response directly.

---

## SCREEN 30 — Add Payment Account

| UI Element | API Field | Notes |
|---|---|---|
| Name | `name` | Required |
| Type | `type` | `CASH / BANK / WALLET / CARD` |
| Opening Balance | `openingBalance` | Default 0; integer; can be negative |
| "Save Account" | `POST /api/v1/payment-accounts` | |
| 409: name taken | `message` | Inline error |

---

## SCREEN 31 — Payment Account Statement

| UI Element | API | Notes |
|---|---|---|
| Statement data | `GET /api/v1/reports/payment-accounts/:id/statement?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD` | |
| Date, Doc #, Type | `lines[].date`, `lines[].documentNumber`, `lines[].type` | |
| Money In | `lines[].moneyIn` | |
| Money Out | `lines[].moneyOut` | |
| Running Balance | `lines[].runningBalance` | |
| Opening Balance card | `openingBalance` | |
| Total In card | Sum of `lines[].moneyIn` (frontend) or from summary fields | |
| Closing Balance card | `closingBalance` | |

---

## SCREEN 32 — P&L Report

| UI Control | API | Notes |
|---|---|---|
| Date From / Date To pickers | `GET /api/v1/reports/profit-loss?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD` | Both required |
| Generate button | Trigger API call | |

### Data Mapping

| UI Line | Response Field | Display Notes |
|---|---|---|
| Sales Revenue | `revenue.salesRevenue` | |
| Less: Sales Returns | `revenue.salesReturns` | Negative value — display as positive in parentheses |
| Net Revenue | `revenue.netRevenue` | |
| Cost of Goods Sold | `costOfGoodsSold` | Display in parentheses |
| Gross Profit | `grossProfit` | |
| Gross Profit Margin | **Frontend calc** | `(grossProfit / revenue.netRevenue * 100).toFixed(1) + '%'`; show `'—'` if netRevenue = 0 |
| Operating Expense rows | `operatingExpenses.byCategory[]` | Each: `{ categoryName, amount }`. Skip if `amount === 0`. Amount is negative — display in parentheses. |
| Total Operating Expenses | `operatingExpenses.total` | Negative — display in parentheses |
| Net Income | `netIncome` | Positive = profit (green text); negative = loss (red text) |

---

## SCREEN 33 — Aged Receivables

| UI Element | API | Notes |
|---|---|---|
| Report data | `GET /api/v1/reports/aged-receivables?asOfDate=YYYY-MM-DD` | |
| Customer name (clickable) | `customers[].customerName` | Click → Screen 25 (Customer Open Documents) |
| Current (0–30d) | `customers[].current` | |
| 31–60d | `customers[].days1to30` | |
| 61–90d | `customers[].days31to60` | |
| 90+d | `customers[].days90plus` | |
| Total | `customers[].total` | |
| Footer totals | `totals.*` | |

---

## SCREEN 34 — Aged Payables

Same as Screen 33, for suppliers.
`GET /api/v1/reports/aged-payables?asOfDate=YYYY-MM-DD`
Click supplier name → Screen 20 (Supplier Open Documents).

---

## SCREEN 35 — Trial Balance

| UI Element | API | Notes |
|---|---|---|
| Report data | `GET /api/v1/reports/trial-balance?asOfDate=YYYY-MM-DD` | |
| Account name | `accounts[].accountName` | |
| Debit column | `accounts[].totalDebit` | |
| Credit column | `accounts[].totalCredit` | |
| Footer Total Debit | `totals.totalDebits` | |
| Footer Total Credit | `totals.totalCredits` | |

---

## SCREEN 36 — Inventory Valuation

| UI Element | API | Notes |
|---|---|---|
| Report data | `GET /api/v1/reports/inventory-valuation?asOfDate=YYYY-MM-DD` | |
| Product name | `variants[].productName` | Group rows by this |
| Size | `variants[].variantSize` | |
| Qty on hand | `variants[].quantity` | |
| Avg cost | `variants[].avgCost` | |
| Line total value | `variants[].inventoryValue` | |
| Grand total footer | `totalInventoryValue` | |

---

## SCREEN 37 — Imports List

| UI Element | API |
|---|---|
| List data | `GET /api/v1/imports` |
| Module filter | `?module=SUPPLIERS` etc. |
| Status filter | `?status=COMPLETED` etc. |

---

## SCREEN 38 — New Import (Step 1: Upload)

| UI Element | API |
|---|---|
| Module selector + file upload | `POST /api/v1/imports/upload` (multipart: `module`, `file`) |
| Template download link | Frontend-provided CSV template per module |

---

## SCREEN 39 — New Import (Step 2: Map Columns)

| UI Element | API |
|---|---|
| Submit mappings | `POST /api/v1/imports/:id/map` body: `{ mappings: { systemField: csvColumn } }` |

---

## SCREEN 40 — New Import (Step 3: Preview & Commit)

| UI Element | API |
|---|---|
| Preview data | `GET /api/v1/imports/:id` — includes `rows[]` with status per row |
| Commit button | `POST /api/v1/imports/:id/commit` |

---

## SCREEN 41 — Import Detail

| UI Element | API |
|---|---|
| Import detail | `GET /api/v1/imports/:id` |
| Rollback button | `POST /api/v1/imports/:id/rollback` — shown only if COMPLETED |

---

## SCREEN 42 — Settings: Business Profile

| UI Element | API |
|---|---|
| Load current settings | From stored `user.tenant` in auth state |
| Business Name input | `PATCH /api/v1/auth/tenant` body: `{ name }` |
| Timezone dropdown | `PATCH /api/v1/auth/tenant` body: `{ timezone }` |

---

## SCREEN 43 — Settings: Users & Roles

| UI Element | API |
|---|---|
| Users list | `GET /api/v1/users` (if available) or from auth context |
| Change Role | `PATCH /api/v1/users/:id/role` body: `{ role }` |
| Deactivate | `PATCH /api/v1/users/:id/status` body: `{ status: "INACTIVE" }` |

---

## SCREEN 44 — Settings: Payment Accounts

Links to / embeds Screen 29 (Payment Accounts List) and Screen 30 (Add Account).

---

## SCREEN 45 — Expense Categories List

**Access:** OWNER / ADMIN only.

| UI Action | API | Notes |
|---|---|---|
| Page load | `GET /api/v1/expense-categories` | |
| Search | `?search=text` | |
| Status filter | `?status=ACTIVE/INACTIVE/ALL` | |
| Deactivate | `PATCH /api/v1/expense-categories/:id` body: `{ status: "INACTIVE" }` | Confirm modal first |
| Activate | `PATCH /api/v1/expense-categories/:id` body: `{ status: "ACTIVE" }` | |

### Column Mapping

| Column | Field | Notes |
|---|---|---|
| Name | `name` | Bold if `isSystem: true` |
| Description | `description` | `—` if null |
| Status badge | `status` | `ACTIVE`=green, `INACTIVE`=grey |
| System chip | `isSystem` | Blue "System" chip if `true` |
| Edit button | — | **Hidden if `isSystem: true`** |
| Deactivate button | — | **Hidden if `isSystem: true`** |

**Sorting (frontend):** System categories first (sort by `accountNumber` asc), custom below (sort by `name` asc).

---

## SCREEN 46 — Add / Edit Expense Category

**Access:** OWNER / ADMIN only.

| UI Element | Create API | Edit API |
|---|---|---|
| Save button | `POST /api/v1/expense-categories` body: `{ name, description? }` | `PATCH /api/v1/expense-categories/:id` body: `{ name?, description? }` |
| 409 error | Show "A category with this name already exists" | Same |

**Guard:** Never open for `isSystem: true` categories.

**Frontend validation before submit:**

| Field | Rule |
|---|---|
| Name | Required; 2–100 chars |
| Description | Optional; max 500 chars |

---

## SCREEN 47 — Expenses List

**Access:** OWNER / ADMIN only.

| UI Action | API | Notes |
|---|---|---|
| Page load | `GET /api/v1/expenses` | |
| Date From | `?dateFrom=YYYY-MM-DD` | |
| Date To | `?dateTo=YYYY-MM-DD` | |
| Category filter | `?expenseCategoryId=uuid` | Populate dropdown from `GET /api/v1/expense-categories?status=ACTIVE` |
| Status filter | `?status=DRAFT/POSTED/VOIDED/ALL` | |
| Pagination | `?page=1&limit=20` | |
| Reset filters | — | Frontend state reset |
| Delete button | `DELETE /api/v1/expenses/:id` | DRAFT only. Confirm modal. |

### Column Mapping

| Column | Field | Notes |
|---|---|---|
| Document # | `documentNumber` | Always present (assigned at draft creation). Clickable → Screen 49. |
| Date | `expenseDate` | |
| Category | `categoryName` | |
| Description | `description` | Truncate at 50 chars |
| Amount | `amount` | Right-aligned, formatted PKR |
| Payment Account | `paymentAccountName` | |
| Status badge | `status` | DRAFT=yellow, POSTED=green, VOIDED=grey |
| Edit button | — | Shown only if `status === 'DRAFT'` AND OWNER/ADMIN |
| Delete button | — | Shown only if `status === 'DRAFT'` AND OWNER/ADMIN |

### Sidebar Draft Badge

| Element | API | Notes |
|---|---|---|
| Badge count on "Expenses" | `GET /api/v1/expenses?status=DRAFT&limit=1` | Use `meta.total`. Call on mount and after create/post/delete. |

---

## SCREEN 48 — Create / Edit Expense Draft

**Access:** OWNER / ADMIN only.

### Dropdown Data

| Dropdown | API | Notes |
|---|---|---|
| Category | `GET /api/v1/expense-categories?status=ACTIVE` | Mark system items with "System" chip |
| Payment Account | `GET /api/v1/payment-accounts?status=ACTIVE` | Append balance hint: `"Main Cash — PKR 12,500"` using `_computed.currentBalance` or from balance endpoint |

### Create Flow

| Element | API | Notes |
|---|---|---|
| "Save as Draft" | `POST /api/v1/expenses` | Body: `{ date, amount, expenseCategoryId, paymentAccountId, description }` |
| "Save & Post" | Two-step — see below | |
| Success (Draft) | 201 response | Navigate to Screen 49 |

**"Save & Post" two-step:**
```
Step 1: POST /api/v1/expenses
        { date, amount, expenseCategoryId, paymentAccountId, description }
        → Returns expense with id and documentNumber

Step 2: POST /api/v1/expenses/:id/post
        { idempotencyKey: <UUID generated on frontend BEFORE step 1> }
```
Navigate to Screen 49 after step 2.

### Edit Flow

| Element | API | Notes |
|---|---|---|
| Load data | `GET /api/v1/expenses/:id` | Pre-fill all fields |
| Guard | If `status !== 'DRAFT'` | Redirect to Screen 49 |
| Document # (read-only) | `documentNumber` | Show as static label above form |
| "Save as Draft" | `PATCH /api/v1/expenses/:id` | Send only changed fields |

### Form → Request Body

| Field | Body Field | Frontend validation |
|---|---|---|
| Date picker | `date` | Required; cannot be future (check client-side before submit) |
| Amount input | `amount` | Required; integer; min 1 |
| Category dropdown | `expenseCategoryId` | Required |
| Account dropdown | `paymentAccountId` | Required |
| Description | `description` | Required; 3–500 chars |

### Right Summary Panel (frontend-only)

| Element | Calculation |
|---|---|
| Account balance | From selected account `_computed.currentBalance` |
| Balance after expense | `accountBalance - enteredAmount` |
| Warning | Show "Balance will go below zero" if result < 0 |

---

## SCREEN 49 — Expense Detail

### Load Data

`GET /api/v1/expenses/:id`

### Header Block

| Field | Response Field | Notes |
|---|---|---|
| Document # | `documentNumber` | Large, always present |
| Status badge | `status` | |
| Amount | `amount` | Large, formatted |
| Date | `expenseDate` | |
| Category | `categoryName` | |
| Payment Account | `paymentAccountName` | |
| Description | `description` | Full text |
| Created by | `createdBy` | UUID — show as user id or resolve to name if user endpoint available |
| Created at | `createdAt` | |

### Voided Block (when `status === 'VOIDED'`)

| Field | Response Field |
|---|---|
| Voided on | `voidedAt` |
| Voided by | `voidedBy` |
| Reason | `voidReason` — show "No reason given" if null |

### Actions Bar

| Status | Role | Button | API |
|---|---|---|---|
| DRAFT | OWNER/ADMIN | "Edit" | Navigate to Screen 48 |
| DRAFT | OWNER/ADMIN | "Post Expense" | `POST /api/v1/expenses/:id/post` body: `{ idempotencyKey: <UUID generated on modal open> }` |
| DRAFT | OWNER/ADMIN | "Delete Draft" | `DELETE /api/v1/expenses/:id` → navigate to Screen 47 on success |
| DRAFT | STAFF | No buttons | — |
| POSTED | OWNER/ADMIN | "Void Expense" | `POST /api/v1/expenses/:id/void` body: `{ reason? }` |
| VOIDED | Any | No buttons | — |

**"Post Expense" modal:** `Post EXP-2026-XXXX for PKR X,XXX?` — generate idempotency key when modal opens.

**"Void Expense" modal:** "This action is irreversible. Enter a reason (optional)." — reason textarea + "Void Expense" (danger) + "Cancel".

---

## SCREEN 51 — Balance Sheet Report

**Access:** OWNER / ADMIN only.

| UI Element | API | Notes |
|---|---|---|
| Report data | `GET /api/v1/reports/balance-sheet?asOfDate=YYYY-MM-DD` | Default: today |

### Data Mapping

| UI Line | Field |
|---|---|
| Cash & Bank | `assets.cash` |
| Accounts Receivable | `assets.accountsReceivable` |
| Inventory | `assets.inventory` |
| Total Assets | `assets.totalAssets` |
| Accounts Payable | `liabilities.accountsPayable` |
| Total Liabilities | `liabilities.totalLiabilities` |
| Opening Capital | `equity.openingCapital` |
| Retained Earnings | `equity.retainedEarnings` |
| Total Equity | `equity.totalEquity` |
| Total L + E (footer) | Frontend sum: `liabilities.totalLiabilities + equity.totalEquity` — should equal `assets.totalAssets` |
| Balance check badge | `isBalanced` — `true` → green "✓ Balanced"; `false` → red warning banner |

**Warning banner when `isBalanced === false`:** "Balance sheet is out of balance — contact support." Show prominently above report.

---

## SCREEN 52 — Cash Position Report

**Access:** OWNER / ADMIN only.

| UI Element | API | Notes |
|---|---|---|
| Report data | `GET /api/v1/reports/cash-position?asOfDate=YYYY-MM-DD` | Default: today |

### Data Mapping

| UI Element | Field | Notes |
|---|---|---|
| Total Cash card | `totalCash` | Formatted PKR |
| Account rows | `accounts[]` | Sorted by `balance` descending — apply client-side |
| Account name | `accounts[].accountName` | |
| Type badge | `accounts[].accountType` | CASH=green, BANK=blue, WALLET=purple, CARD=orange |
| Balance | `accounts[].balance` | Right-aligned |

---

## GLOBAL — Role Gating

| Feature | OWNER | ADMIN | STAFF |
|---|---|---|---|
| Expenses sidebar | ✓ | ✓ | ✗ |
| Reports sidebar | ✓ | ✓ | ✗ |
| New Expense | ✓ | ✓ | ✗ |
| Post / Void Expense | ✓ | ✓ | ✗ |
| Delete Draft Expense | ✓ | ✓ | ✗ |
| Void Transaction | ✓ | ✓ | ✗ |
| Expense Categories (Settings) | ✓ | ✓ | ✗ |
| Add / Edit / Deactivate Category | ✓ | ✓ | ✗ |
| Stock Adjustment (create/post) | ✓ | ✓ | ✗ |
| All other features | ✓ | ✓ | ✓ |

---

## TOTAL SCREEN COUNT: 52
