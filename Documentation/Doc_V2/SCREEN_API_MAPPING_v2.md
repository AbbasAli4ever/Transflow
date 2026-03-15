# Screen → API Mapping — Round 2 (COA Rewrite)

**Previous version:** `SCREEN_API_MAPPING.md` (44 screens, v1)
**This file:** Addenda and changes introduced by the COA rewrite.

> Read `SCREEN_API_MAPPING.md` first. This file describes only what is NEW and what has CHANGED.
> Screen numbers from v1 are preserved. New screens are numbered 45–52.

**API Base:** `GET/POST/PATCH /api/v1/...`
**Auth:** All endpoints require `Authorization: Bearer <accessToken>` header.

---

## SCREENS UNCHANGED

The following screens have no API mapping changes in Round 2. Refer to the original `SCREEN_API_MAPPING.md` for their full mappings:

01 Login, 02 Register, 03 Dashboard, 04 Transactions List, 06–28 All Transaction Create/Edit forms, 30 Payment Account Detail, 31 Payment Account Add/Edit, 33 Trial Balance *(see field rename note below)*, 34 Aged Receivables, 37 Aged Payables, 38 Imports, 39 Products List, 40–41 Product Add/Edit, 42 Settings — Business Profile, 43 Settings — Users, 44 Supplier/Customer Add/Edit

---

## SCREEN 05 — Transaction Detail (UPDATED)

**What changed:** Added Void Transaction action.

### New Action — Void Transaction

| UI Element | Condition | API | Notes |
|---|---|---|---|
| "Void Transaction" button | Status is `POSTED` AND role is `OWNER` or `ADMIN` | — | Show danger-styled button in actions bar |
| Confirmation modal | On button click | — | Text: "This action is irreversible. Enter a reason (optional)." |
| Reason text input | Inside modal | — | Optional, free text |
| "Void Transaction" (confirm) | Modal submit | `POST /api/v1/transactions/:id/void` | Body: `{ reason?: string }` |
| Success | 200 response | — | Refresh the page; show toast "Transaction voided" |
| Error | 400/409 response | — | Show error message from `message` field |

### Voided State Display

| UI Element | Response Field | Notes |
|---|---|---|
| Status badge | `status === 'VOIDED'` | Show grey badge |
| "VOIDED" banner | `status === 'VOIDED'` | Show prominent banner at top of page |
| Void reason line | `voidReason` | Display as "Voided reason: [reason]" or "No reason given" if null |
| Voided at timestamp | `voidedAt` | Display as "Voided at: [formatted timestamp]" |

**Role gate:** Only `OWNER` and `ADMIN` see the Void button. `STAFF` sees the voided state display but no action buttons.

---

## SCREEN 29 — Payment Account List (UPDATED)

**What changed:** Balance field names inside each account card changed. The layout is identical; only the data source paths changed.

### Account Card — Updated Data Mapping

| UI Label | Old field (v1) | New field (v2) |
|---|---|---|
| Current Balance | `currentBalance` | `breakdown.currentBalance` |
| Opening Balance | `openingBalance` | `breakdown.openingBalance` |
| Total In | `totalIn` | `breakdown.moneyIn.totalAmount` |
| Total Out | `totalOut` | `breakdown.moneyOut.totalAmount` |

**API:** `GET /api/v1/payment-accounts` — same endpoint, same URL. Only the response shape changed.

**Frontend action:** Update field accessor paths in the account card component. No layout change needed.

---

## SCREEN 32 — P&L Report (UPDATED)

**What changed:** Response shape now includes an operating expenses section. Layout gains a new section; final line is Net Income (was Gross Profit in v1).

### API

| UI Control | API | Notes |
|---|---|---|
| Date From / Date To pickers | `GET /api/v1/reports/profit-loss?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD` | Both params required |
| Generate button | Trigger API call | — |

### Data Mapping (full, replaces v1)

| UI Line | Response Field | Notes |
|---|---|---|
| Sales Revenue | `revenue.salesRevenue` | |
| Less: Sales Returns | `revenue.salesReturns` | Value is negative — display in parentheses as a positive |
| Net Revenue | `revenue.netRevenue` | |
| Cost of Goods Sold | `costOfGoodsSold` | Display in parentheses (negative) |
| Gross Profit | `grossProfit` | |
| Operating Expenses rows | `operatingExpenses.byCategory[]` | Each item: `{ categoryName, amount }`. Skip rows where `amount === 0`. Amount is negative — display in parentheses. |
| Total Operating Expenses | `operatingExpenses.total` | Negative — display in parentheses |
| Net Income | `netIncome` | Final bottom line. Positive = profit (green), negative = loss (red). |

### Frontend Calculation

| UI Element | Calculation | Notes |
|---|---|---|
| Gross Profit Margin % | `(grossProfit / revenue.netRevenue * 100).toFixed(1) + '%'` | Guard: if `revenue.netRevenue === 0` display `'—'` |

**Removed from v1:** `grossProfitMargin` was a top-level field in v1 response. It is no longer returned. Compute client-side using the formula above.

---

## SCREEN 35 — Trial Balance (UPDATED)

**What changed:** Field names in the response changed. No layout change.

### Data Mapping Update

| UI Column | Old field (v1) | New field (v2) |
|---|---|---|
| Account name | `accounts[].name` | `accounts[].accountName` |
| Debit column | `accounts[].debit` | `accounts[].totalDebit` |
| Credit column | `accounts[].credit` | `accounts[].totalCredit` |
| Footer Total Debit | `totalDebit` | `totals.totalDebits` |
| Footer Total Credit | `totalCredit` | `totals.totalCredits` |

**API:** `GET /api/v1/reports/trial-balance?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD` — same endpoint.

---

## SCREEN 36 — Inventory Valuation (UPDATED)

**What changed:** Root array renamed from `products` to `variants`. Several field names changed.

### Data Mapping Update

| UI Column | Old field (v1) | New field (v2) |
|---|---|---|
| Product name | `products[].productName` | `variants[].productName` |
| Size | `products[].size` | `variants[].variantSize` |
| Qty on hand | `products[].qtyOnHand` | `variants[].quantity` |
| Avg cost | `products[].avgCost` | `variants[].avgCost` |
| Line total value | `products[].totalValue` | `variants[].inventoryValue` |
| Grand total footer | `grandTotalValue` | `totalInventoryValue` |

**API:** `GET /api/v1/reports/inventory-valuation?asOfDate=YYYY-MM-DD` — same endpoint.

---

## SCREEN 45 — Expense Categories List (NEW)

**Access:** Settings → Expense Categories. Visible to `OWNER` and `ADMIN` only.

### API

| UI Action | API | Notes |
|---|---|---|
| Page load / filter change | `GET /api/v1/expense-categories` | |
| Search by name | `?search=text` | |
| Status filter | `?isActive=true` / `?isActive=false` | Default: omit param or pass `true` to show active |
| Type filter (System only) | `?isSystem=true` | |
| Type filter (Custom only) | `?isSystem=false` | |
| Deactivate button | `PATCH /api/v1/expense-categories/:id` body: `{ isActive: false }` | Show confirmation modal first |
| Activate button | `PATCH /api/v1/expense-categories/:id` body: `{ isActive: true }` | |

### Table Column Mapping

| Column | Response Field | Notes |
|---|---|---|
| Name | `name` | Bold if `isSystem: true` |
| Description | `description` | Show `—` if null |
| Status badge | `isActive` | `true` → green "Active", `false` → grey "Inactive" |
| System chip | `isSystem` | Show blue "System" chip if `isSystem: true` |
| Edit button | — | Hide if `isSystem: true` |
| Deactivate button | — | Hide if `isSystem: true` |

### Sorting Rules (frontend-only)

- System categories first, sorted by `accountNumber` ascending (6001–6010)
- Custom categories below, sorted by `name` alphabetically

**Role gate:** Entire page hidden from `STAFF`. The `+ Add Category` button and Edit/Deactivate actions hidden from `STAFF`.

---

## SCREEN 46 — Add / Edit Expense Category (NEW)

**Access:** Modal opened from Screen 45. `OWNER` and `ADMIN` only.

### Create

| UI Element | API | Notes |
|---|---|---|
| Save button (create) | `POST /api/v1/expense-categories` | Body: `{ name, description? }` |
| Success | 201 response | Close modal, refresh list, show toast "Category saved" |
| 409 error | `message` field | Show inline: "A category with this name already exists" |
| 400 validation | `message` array | Show field-level errors |

### Edit

| UI Element | API | Notes |
|---|---|---|
| Load existing values | Read from list data (already fetched) | Pre-fill `name` and `description` |
| Save button (edit) | `PATCH /api/v1/expense-categories/:id` | Body: `{ name?, description? }` — send only changed fields |
| Success | 200 response | Close modal, refresh list |

### Form Field Validation (frontend-side before submit)

| Field | Rule |
|---|---|
| Name | Required; 2–100 chars |
| Description | Optional; max 500 chars |

**Guard:** Never open this modal for a category where `isSystem: true`.

---

## SCREEN 47 — Expenses List (NEW)

**Access:** Expenses → All Expenses. Visible to `OWNER` and `ADMIN` only.

### API

| UI Action | API | Notes |
|---|---|---|
| Page load | `GET /api/v1/expenses` | |
| Date From filter | `?dateFrom=YYYY-MM-DD` | |
| Date To filter | `?dateTo=YYYY-MM-DD` | |
| Category filter | `?expenseCategoryId=uuid` | Dropdown of all active categories |
| Status filter | `?status=DRAFT` / `POSTED` / `VOIDED` | Default: omit (all) |
| Pagination | `?page=1&limit=20` | |
| Reset filters | — | Frontend state reset; re-call without filter params |

### Table Column Mapping

| Column | Response Field | Notes |
|---|---|---|
| Document # | `documentNumber` | Always present (assigned at draft creation). Clickable → Screen 49 |
| Date | `date` | Format as date string |
| Category | `expenseCategory.name` | Response includes shallow category object |
| Description | `description` | Truncate to 50 chars with ellipsis |
| Amount | `amount` | Right-aligned, formatted PKR |
| Payment Account | `paymentAccount.name` | Response includes shallow account object |
| Status badge | `status` | DRAFT=yellow, POSTED=green, VOIDED=grey |
| View button | — | Navigate to Screen 49 (`/expenses/:id`) |
| Edit button | — | Navigate to Screen 48 (`/expenses/:id/edit`). Show only if `status === 'DRAFT'` AND role is `OWNER`/`ADMIN` |
| Delete button | — | Show only if `status === 'DRAFT'` AND role is `OWNER`/`ADMIN`. Calls `DELETE /api/v1/expenses/:id` |

### Pagination

| UI Element | Response Field |
|---|---|
| Current page | `meta.page` |
| Total count | `meta.total` |
| Total pages | `meta.totalPages` |
| Page size | `meta.limit` |

### Sidebar Draft Badge

| UI Element | API | Notes |
|---|---|---|
| Draft count badge on "Expenses" sidebar item | `GET /api/v1/expenses?status=DRAFT&limit=1` | Read `meta.total` for the count. Call on sidebar mount and after any create/post/delete action. |

---

## SCREEN 48 — Create / Edit Expense Draft (NEW)

**Access:** Expenses → New Expense (create) or Edit button from list/detail (edit). `OWNER` and `ADMIN` only.

### Load Data for Dropdowns

| Dropdown | API | Notes |
|---|---|---|
| Category dropdown | `GET /api/v1/expense-categories?isActive=true` | Show all active categories. Mark system ones with "System" chip. |
| Payment Account dropdown | `GET /api/v1/payment-accounts` | Show active accounts. Append current balance hint: "Cash Box — PKR 12,500" |

### Create Flow

| UI Element | API | Notes |
|---|---|---|
| "Save as Draft" button | `POST /api/v1/expenses` | Body: `{ date, amount, expenseCategoryId, paymentAccountId, description }` |
| "Save & Post" button | Two-step — see below | |
| Success (Save as Draft) | 201 response | Navigate to Screen 49 (expense detail) |

**"Save & Post" two-step flow:**
```
Step 1: POST /api/v1/expenses
        Body: { date, amount, expenseCategoryId, paymentAccountId, description }
        → Returns expense with id and documentNumber

Step 2: POST /api/v1/expenses/:id/post
        Body: { idempotencyKey: <uuid generated on frontend> }
        → Returns posted expense
```
Navigate to Screen 49 after Step 2 succeeds.

### Edit Flow

| UI Element | API | Notes |
|---|---|---|
| Load existing data | `GET /api/v1/expenses/:id` | Pre-fill all form fields |
| Guard | `status !== 'DRAFT'` | Redirect to Screen 49 — cannot edit non-draft |
| "Save as Draft" button | `PATCH /api/v1/expenses/:id` | Body: changed fields only |
| "Save & Post" button | `PATCH` then `POST /expenses/:id/post` | Same two-step pattern as create |
| Document # (read-only) | `documentNumber` | Show as read-only label above form |

### Form Fields → Request Body Mapping

| Field | Request Body Field | Validation (frontend) |
|---|---|---|
| Date picker | `date` | Required. Cannot be future date — show inline "Date cannot be in the future" |
| Amount input | `amount` | Required; integer; min 1 |
| Category dropdown | `expenseCategoryId` | Required |
| Payment Account dropdown | `paymentAccountId` | Required |
| Description textarea | `description` | Required; 3–500 chars |

### Right Summary Panel (frontend-only calculations)

| UI Element | Calculation | Notes |
|---|---|---|
| Selected category name | From selected category object | |
| Selected account + balance | From selected account object | `account.breakdown.currentBalance` |
| Amount entered | From form state | |
| Balance after expense | `account.breakdown.currentBalance - amount` | Warn if result < 0: "Balance will go below zero" |

---

## SCREEN 49 — Expense Detail (NEW)

**Access:** Click any expense row in Screen 47, or redirect after create/post.

### Load Data

| Action | API |
|---|---|
| Load expense | `GET /api/v1/expenses/:id` |

### Header Block Mapping

| UI Field | Response Field | Notes |
|---|---|---|
| Document # | `documentNumber` | Large, prominent |
| Status badge | `status` | DRAFT=yellow, POSTED=green, VOIDED=grey |
| Amount | `amount` | Large, formatted PKR |
| Date | `date` | |
| Category | `expenseCategory.name` | |
| Payment Account | `paymentAccount.name` | |
| Description | `description` | Full text (no truncation on detail view) |
| Created by | `createdByUser.fullName` | |
| Created at | `createdAt` | |

### Voided State Block (shown only when `status === 'VOIDED'`)

| UI Field | Response Field | Notes |
|---|---|---|
| Voided on | `voidedAt` | |
| Voided by | `voidedByUser.fullName` | If available, else show userId |
| Reason | `voidReason` | Show "No reason given" if null |

### Actions Bar Mapping

| Status | Role | Buttons | API |
|---|---|---|---|
| DRAFT | OWNER / ADMIN | "Edit" → navigate to Screen 48 | — |
| DRAFT | OWNER / ADMIN | "Post Expense" | `POST /api/v1/expenses/:id/post` body: `{ idempotencyKey: <frontend-generated UUID> }` |
| DRAFT | OWNER / ADMIN | "Delete Draft" | `DELETE /api/v1/expenses/:id` → navigate back to Screen 47 on success |
| DRAFT | STAFF | No buttons | — |
| POSTED | OWNER / ADMIN | "Void Expense" | `POST /api/v1/expenses/:id/void` body: `{ reason?: string }` |
| VOIDED | Any | No buttons | — |

**"Post Expense" confirmation modal:**
- Text: `Post EXP-2026-XXXX for PKR X,XXX?`
- Buttons: "Confirm" (calls API) + "Cancel"
- Generate idempotency key (UUID) on modal open, not on button click — avoids double-generation on retries

**"Void Expense" confirmation modal:**
- Text: "This action is irreversible. Enter a reason (optional)."
- Optional reason textarea
- Buttons: "Void Expense" (danger) + "Cancel"

---

## SCREEN 51 — Balance Sheet Report (NEW)

**Access:** Reports → Balance Sheet. Visible to `OWNER` and `ADMIN` only.

### API

| UI Control | API | Notes |
|---|---|---|
| "As of Date" picker | `GET /api/v1/reports/balance-sheet?asOfDate=YYYY-MM-DD` | Default: today's date |
| "Generate" button | Trigger API call | |

### Data Mapping

| UI Line | Response Field | Notes |
|---|---|---|
| Cash & Bank | `assets.cash` | |
| Accounts Receivable | `assets.accountsReceivable` | |
| Inventory | `assets.inventory` | |
| Total Assets | `assets.totalAssets` | |
| Accounts Payable | `liabilities.accountsPayable` | |
| Total Liabilities | `liabilities.totalLiabilities` | |
| Opening Capital | `equity.openingCapital` | |
| Retained Earnings | `equity.retainedEarnings` | |
| Total Equity | `equity.totalEquity` | |
| Total Liabilities + Equity | Frontend sum: `liabilities.totalLiabilities + equity.totalEquity` | Should equal `assets.totalAssets` |
| Balance check badge | `isBalanced` | `true` → show green "✓ Balanced"; `false` → show red "✗ Out of balance" warning banner |

**Warning banner (when `isBalanced === false`):**
> "Balance sheet is out of balance — contact support."

Show this banner prominently above the report body. Do not hide or downplay it.

---

## SCREEN 52 — Cash Position Report (NEW)

**Access:** Reports → Cash Position. Visible to `OWNER` and `ADMIN` only.

### API

| UI Control | API | Notes |
|---|---|---|
| "As of Date" picker | `GET /api/v1/reports/cash-position?asOfDate=YYYY-MM-DD` | Default: today's date |
| "Generate" button | Trigger API call | |

### Data Mapping

| UI Element | Response Field | Notes |
|---|---|---|
| Total Cash card (large number) | `totalCash` | Formatted PKR |
| Account rows | `accounts[]` | |
| Account name | `accounts[].accountName` | |
| Type badge | `accounts[].accountType` | CASH / BANK / WALLET / CARD |
| Balance | `accounts[].balance` | Right-aligned, formatted PKR |

**Sorting:** Rows sorted by `balance` descending — apply client-side after receiving response.

**Type badge colors (frontend logic):**

| Type | Color |
|---|---|
| CASH | green |
| BANK | blue |
| WALLET | purple |
| CARD | orange |

---

## GLOBAL UPDATES — Role Gating Summary

| Feature | OWNER | ADMIN | STAFF |
|---|---|---|---|
| Expenses sidebar section | ✓ | ✓ | ✗ (hidden) |
| Reports sidebar section | ✓ | ✓ | ✗ (hidden) |
| "New Expense" button | ✓ | ✓ | ✗ |
| Post / Void Expense buttons | ✓ | ✓ | ✗ |
| Delete Draft Expense | ✓ | ✓ | ✗ |
| Void Transaction button | ✓ | ✓ | ✗ |
| Expense Categories (Settings) | ✓ | ✓ | ✗ |
| Add / Edit / Deactivate Category | ✓ | ✓ | ✗ |

All existing STAFF restrictions from `SCREEN_API_MAPPING.md` v1 still apply. The above are new additions.

---

## TOTAL SCREEN COUNT: 52
(+8 new screens from v1's 44)
