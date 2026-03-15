# Frontend Wireframe Plan — Round 2 (COA Rewrite)

**Previous version:** `WIREFRAME_PLAN.md` (44 screens, v1.2)
**This file:** Addenda and changes introduced by the COA rewrite.

> Read `WIREFRAME_PLAN.md` first. This file describes only what is NEW and what has CHANGED. Screen numbers from v1 are preserved. New screens are numbered 45–54.

---

## CHANGELOG v2.0 — COA Rewrite

### New Screens Added

| # | Screen | Reason |
|---|---|---|
| 45 | Expense Categories List | New module |
| 46 | Expense Categories — Add/Edit | New module |
| 47 | Expenses List | New module |
| 48 | Create / Edit Expense Draft | New module |
| 49 | Expense Detail | New module |
| 50 | P&L Report (updated) | Response shape changed |
| 51 | Balance Sheet Report | New endpoint |
| 52 | Cash Position Report | New endpoint |

### Screens Changed in v1

| Screen | Change |
|---|---|
| Sidebar navigation | Add Expenses section with 2 sub-items |
| 05 — Transaction Detail | Add "Void Transaction" button for POSTED transactions |
| 29 — Payment Account List | Balance card data source changed (breakdown structure) |
| 32 — P&L Report | Full layout change — now shows operating expenses section |
| 35 — Trial Balance | Column/field name changes only |
| 36 — Inventory Valuation | Row model renamed — `products` → `variants` |
| Reports nav | Add Balance Sheet, Cash Position to Reports submenu |

---

## NAVIGATION STRUCTURE (Updated)

```
Sidebar (always visible when logged in):
├── Dashboard
├── Transactions
│   ├── All Transactions
│   ├── New Purchase
│   ├── New Sale
│   ├── New Payment (Supplier)
│   ├── New Receipt (Customer)
│   ├── New Supplier Return
│   ├── New Customer Return
│   ├── New Internal Transfer
│   └── New Stock Adjustment
├── Expenses                          ← NEW SECTION
│   ├── All Expenses
│   └── New Expense
├── Suppliers
├── Customers
├── Products
├── Payment Accounts
├── Reports
│   ├── P&L
│   ├── Balance Sheet                 ← NEW
│   ├── Cash Position                 ← NEW
│   ├── Trial Balance
│   ├── Aged Receivables
│   ├── Aged Payables
│   └── Inventory Valuation
├── Settings
│   ├── Business Profile
│   ├── Users & Roles
│   ├── Payment Accounts
│   └── Expense Categories            ← NEW (Settings subsection)
└── Imports
```

**Role visibility rules:**
- Expenses section: visible to OWNER and ADMIN only (STAFF does not see it)
- Reports section: visible to OWNER and ADMIN only (STAFF does not see it)

---

## SCREEN 05 — Transaction Detail (UPDATED)

**What changed:** Added void action.

**Actions bar update:**

| Status | Old buttons | New buttons |
|---|---|---|
| DRAFT | Post + Edit + Delete Draft | Post + Edit + Delete Draft (unchanged) |
| POSTED | Print/Export | Print/Export + **Void Transaction** button (danger) |
| VOIDED | — | Show "VOIDED" status banner + void reason + voided timestamp |

**Void Transaction button behavior:**
- Show confirmation modal: "This action is irreversible. Enter a reason (optional)."
- Modal has: reason text input (optional) + "Void Transaction" (danger) + "Cancel"
- On confirm: `POST /transactions/:id/void` with `{ reason }` body
- On success: refresh page, show "Transaction voided" toast

**Voided state display:**
- Status badge shows `VOIDED` in grey
- Show void metadata block below header:
  - "Voided reason: [reason or 'No reason given']"
  - "Voided at: [timestamp]"

---

## SCREEN 29 — Payment Account List (UPDATED)

**What changed:** Balance data structure changed. `totalIn`/`totalOut` are no longer top-level fields.

**Account cards — data mapping update:**

| UI Label | Old source | New source |
|---|---|---|
| Current Balance | `currentBalance` | `breakdown.currentBalance` |
| Opening Balance | `openingBalance` | `breakdown.openingBalance` |
| Total In | `totalIn` | `breakdown.moneyIn.totalAmount` |
| Total Out | `totalOut` | `breakdown.moneyOut.totalAmount` |

No layout change needed — just update the field names in the data layer.

---

## SCREEN 32 — P&L Report (UPDATED)

**What changed:** Report now includes operating expenses section. Layout needs a new section added.

**Updated report layout:**

```
REVENUE
  Sales Revenue                       XXX,XXX
  Less: Sales Returns                (XX,XXX)
                                     ─────────
  Net Revenue                         XXX,XXX

COST OF GOODS SOLD                   (XXX,XXX)
                                     ─────────
GROSS PROFIT                          XXX,XXX

OPERATING EXPENSES
  Delivery & Shipping                 (X,XXX)
  Utilities                           (X,XXX)
  Rent & Lease                        (X,XXX)
  [... other categories with amounts]
                                     ─────────
  Total Operating Expenses            (XX,XXX)

                                     ─────────
NET INCOME                            XXX,XXX
```

**Data mapping:**

| UI Line | Field |
|---|---|
| Sales Revenue | `revenue.salesRevenue` |
| Less: Sales Returns | `revenue.salesReturns` (negative — display as positive with parentheses) |
| Net Revenue | `revenue.netRevenue` |
| Cost of Goods Sold | `costOfGoodsSold` |
| Gross Profit | `grossProfit` |
| Operating Expenses rows | `operatingExpenses.byCategory[]` (skip categories with `amount === 0`) |
| Total Operating Expenses | `operatingExpenses.total` |
| Net Income | `netIncome` |

**Note:** `grossProfitMargin` is removed from the API. If the frontend was computing it from the response, compute it client-side: `(grossProfit / revenue.netRevenue * 100).toFixed(1) + "%"`. Guard against division by zero.

---

## SCREEN 35 — Trial Balance (UPDATED)

**What changed:** Field names in the response changed. No layout change needed.

**Data mapping update:**

| UI Column | Old field | New field |
|---|---|---|
| Account name | `accounts[].name` | `accounts[].accountName` |
| Debit column | `accounts[].debit` | `accounts[].totalDebit` |
| Credit column | `accounts[].credit` | `accounts[].totalCredit` |
| Footer Total Debit | `totalDebit` | `totals.totalDebits` |
| Footer Total Credit | `totalCredit` | `totals.totalCredits` |

---

## SCREEN 36 — Inventory Valuation (UPDATED)

**What changed:** Response array renamed, field names changed.

**Data mapping update:**

| UI Column | Old field | New field |
|---|---|---|
| Product name | `products[].productName` | `variants[].productName` |
| Size | `products[].size` | `variants[].variantSize` |
| Qty on hand | `products[].qtyOnHand` | `variants[].quantity` |
| Avg cost | `products[].avgCost` | `variants[].avgCost` |
| Line total value | `products[].totalValue` | `variants[].inventoryValue` |
| Grand total footer | `grandTotalValue` | `totalInventoryValue` |

No layout change needed.

---

## SCREEN 45 — Expense Categories List (NEW)

**Purpose:** Browse and manage expense categories. Accessible from Settings → Expense Categories.

**Layout:** Full page with sidebar. Filter bar + table.

**Content:**

**Filter bar:**
- Search input (category name)
- Status filter: Active / Inactive / All (default: Active)
- Type toggle: All / System only / Custom only

**Table columns:**
- Name (bold if system category)
- Description
- Status badge
- System badge ("System" chip in blue) — shown on the 10 seeded categories
- Actions: Edit / Deactivate (hidden for system categories)

**Top right:**
- "+ Add Category" button (OWNER/ADMIN only — hide for STAFF)

**Empty state:** "No custom expense categories. Add one to track specific expense types."

**Notes:**
- System categories always appear first, sorted by account number (6001–6010)
- Custom categories appear below, sorted by name
- Clicking "Edit" on a system category row does nothing / button is hidden
- "Deactivate" shows confirmation modal: "Categories with posted expenses cannot be deactivated."

---

## SCREEN 46 — Add / Edit Expense Category (NEW)

**Purpose:** Create a new custom expense category, or edit an existing one.

**Layout:** Modal dialog (same pattern as Add Supplier / Add Customer).

**Content:**

- Name — text input (required, 2–100 chars)
- Description — textarea (optional, max 500 chars)
- "Save Category" / "Cancel" buttons

**For Edit mode:**
- Fields pre-filled with existing values
- `isSystem: true` categories should never open this modal (disable/hide Edit action)

**Errors:**
- 409: "A category with this name already exists"

---

## SCREEN 47 — Expenses List (NEW)

**Purpose:** Browse all expenses across all statuses.

**Layout:** Full page with sidebar. Filter bar + table.

**Content:**

**Filter bar:**
- Date From / Date To pickers
- Category filter: dropdown of all active categories
- Status filter: All / Draft / Posted / Voided (default: All)
- Reset filters button

**Table columns:**
- Document # (e.g., `EXP-2026-0001`) — clickable
- Date
- Category name
- Description (truncated at 50 chars)
- Amount (right-aligned, formatted PKR)
- Payment Account
- Status badge (DRAFT=yellow, POSTED=green, VOIDED=grey)
- Actions: View / Edit (only if DRAFT + OWNER/ADMIN) / Delete (only if DRAFT + OWNER/ADMIN)

**Top right:**
- "+ New Expense" button (OWNER/ADMIN only)

**Status badge colors:**
- `DRAFT` — yellow
- `POSTED` — green
- `VOIDED` — grey/strikethrough style

**Notes:**
- STAFF users see this list (read-only) but all write action buttons are hidden
- Pagination: standard page/limit controls

---

## SCREEN 48 — Create / Edit Expense Draft (NEW)

**Purpose:** Enter a new expense or edit an existing DRAFT expense.

**Layout:** Single-page form. No sidebar sub-panel needed (expenses are simpler than transactions).

**Content:**

**Form fields:**

| Field | Input type | Notes |
|---|---|---|
| Date | Date picker | Required; cannot be future date |
| Amount (PKR) | Number input | Required; min 1; integer only |
| Category | Searchable dropdown | Required; shows ACTIVE categories only; system categories shown with "System" chip |
| Payment Account | Searchable dropdown | Required; shows ACTIVE accounts with current balance hint |
| Description | Textarea | Required; 3–500 chars |

**Right summary panel (small, sticky):**
- Selected category name
- Selected payment account + current balance
- Amount entered
- "Current balance after this expense: [balance - amount]" — warning if would go below zero

**Buttons:**
- "Save as Draft" — `POST /expenses` (create) or `PATCH /expenses/:id` (edit)
- "Save & Post" — saves draft then immediately calls `POST /expenses/:id/post`
  - For "Save & Post": auto-generate idempotency key (UUID) in frontend, no extra confirmation needed

**For Edit mode:**
- Pre-fill all fields from existing draft
- Cannot edit if status is not DRAFT (redirect to detail page)

**Notes:**
- Document number is shown read-only in edit mode (already assigned: `EXP-2026-XXXX`)
- Date validation: show inline error "Date cannot be in the future" client-side before submitting

---

## SCREEN 49 — Expense Detail (NEW)

**Purpose:** Full view of a single expense with all metadata and actions.

**Layout:** Full page. Header card + details block + action bar.

**Content:**

**Header block (top card):**
- Document # (large, prominent): `EXP-2026-0001`
- Status badge
- Amount (large)
- Date
- Category name + payment account name
- Description
- Created by + created at

**If VOIDED — void info block:**
- "Voided on: [timestamp]"
- "Voided by: [userId]"
- "Reason: [reason or 'No reason given']"

**Actions bar (top right):**

| Status | Buttons shown |
|---|---|
| DRAFT (OWNER/ADMIN) | "Edit" + "Post Expense" + "Delete Draft" |
| DRAFT (STAFF) | No action buttons |
| POSTED (OWNER/ADMIN) | "Void Expense" (danger) |
| VOIDED | No action buttons |

**"Post Expense" button behavior:**
- Show confirmation modal: "Post EXP-2026-0001 for PKR 2,500?"
- Auto-generate idempotency key (UUID) on the frontend
- On confirm: `POST /expenses/:id/post` with `{ idempotencyKey: uuid }`

**"Void Expense" button behavior:**
- Show confirmation modal with optional reason input
- On confirm: `POST /expenses/:id/void` with `{ reason }`

---

## SCREEN 50 — P&L Report (replaces v1 Screen 32 layout)

See Screen 32 changes above for the updated layout. The screen number stays 32 — this entry just confirms the layout.

The new layout matches the updated report shape with the Operating Expenses section. Net Income is the final bottom line (replaces Gross Profit as the bottom line in v1).

---

## SCREEN 51 — Balance Sheet Report (NEW)

**Purpose:** Point-in-time view of assets, liabilities, and equity.

**Layout:** Full page. Date picker at top, formatted report below.

**Controls:**
- As of Date picker (defaults to today)
- "Generate" button

**Report body:**

```
ASSETS
  Cash & Bank                       X,XXX,XXX
  Accounts Receivable                 XXX,XXX
  Inventory                           XXX,XXX
                                    ─────────
  Total Assets                      X,XXX,XXX

LIABILITIES
  Accounts Payable                    XXX,XXX
                                    ─────────
  Total Liabilities                   XXX,XXX

EQUITY
  Opening Capital                   X,XXX,XXX
  Retained Earnings                   XXX,XXX
                                    ─────────
  Total Equity                      X,XXX,XXX

                                    ─────────
  Total Liabilities + Equity        X,XXX,XXX
```

**Balance check indicator:**
- Small badge below totals: ✓ Balanced / ✗ Out of balance
- Computed from `isBalanced` field in the response
- If `isBalanced: false` → show warning banner "Balance sheet is out of balance — contact support"

**Data mapping:**

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
| Balance check | `isBalanced` |

---

## SCREEN 52 — Cash Position Report (NEW)

**Purpose:** Current cash balance across all payment accounts at a point in time.

**Layout:** Full page. Date picker + summary card + account table.

**Controls:**
- As of Date picker (defaults to today)
- "Generate" button

**Content:**

**Total Cash card (top):**
- Large number: total cash across all accounts
- Source: `totalCash`

**Accounts table:**
- Columns: Account Name | Type | Balance
- Type badge (CASH / BANK / WALLET / CARD)
- Balance right-aligned, formatted PKR
- Rows sorted by balance descending

**Data mapping:**

| UI Element | Field |
|---|---|
| Total cash card | `totalCash` |
| Account rows | `accounts[]` |
| Account name | `accounts[].accountName` |
| Type badge | `accounts[].accountType` |
| Balance | `accounts[].balance` |

---

## GLOBAL UPDATES

### Sidebar Badge
- Add draft count badge to Expenses sidebar item (count of `status: DRAFT` expenses for OWNER/ADMIN)
- Source: `GET /expenses?status=DRAFT&limit=1` — use `meta.total` for the count

### Role-Gated Rendering (Updated Rules)

| Section | OWNER | ADMIN | STAFF |
|---|---|---|---|
| Expenses sidebar | ✓ | ✓ | ✗ |
| Reports sidebar | ✓ | ✓ | ✗ |
| New Expense button | ✓ | ✓ | ✗ |
| Post/Void Expense buttons | ✓ | ✓ | ✗ |
| Void Transaction button | ✓ | ✓ | ✗ |
| Expense Categories (Settings) | ✓ | ✓ | ✗ |
| Add/Edit/Delete Category | ✓ | ✓ | ✗ |

All existing STAFF restrictions from v1 still apply. These are new additions.

---

## TOTAL SCREEN COUNT: 52
(+8 new screens from v1's 44)
