# Frontend Wireframe Plan — v3
**Product:** Persona Finance System — Trading Business ERP
**Audience:** Design agent / Frontend developer
**Total Screens:** 52
**Stack context:** Web app, sidebar navigation, data-heavy tables, form-heavy entry screens
**Status:** This is the canonical, standalone document. Do not read V1 or V2 alongside this.

---

## CHANGELOG

### v3.0 — Current
**Changes from v2:**

| Screen | Change |
|--------|--------|
| 17 — Add Supplier | Phone field is now **required + unique** (was optional) |
| 22 — Add Customer | Phone field is now **required + unique** (was optional) |
| 04 — Transaction List | Document # column now populated for **all** statuses including DRAFT; VOIDED added to status filter |
| 05 — Transaction Detail | Document number shown for DRAFT transactions (no longer null for drafts) |
| 06–15 — All transaction create screens | After saving draft, the assigned draft document number is shown |
| 29 — Payment Account List | Added **Sort by Balance** option to filter bar |

### v2.0 — COA Rewrite
Expenses module (screens 45–52), void transaction, P&L/Trial Balance/Inventory Valuation response shape changes, Balance Sheet + Cash Position reports, role restrictions for Reports and Expenses.

### v1.1 — ProductVariant
Products now have size variants. Transaction line items use Product → Size selection. Inventory Valuation shows per-variant rows.

---

## NAVIGATION STRUCTURE

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
├── Expenses                          ← OWNER / ADMIN only
│   ├── All Expenses
│   └── New Expense
├── Suppliers
├── Customers
├── Products
├── Payment Accounts
├── Reports                           ← OWNER / ADMIN only
│   ├── P&L
│   ├── Balance Sheet
│   ├── Cash Position
│   ├── Trial Balance
│   ├── Aged Receivables
│   ├── Aged Payables
│   └── Inventory Valuation
├── Settings
│   ├── Business Profile
│   ├── Users & Roles
│   ├── Payment Accounts
│   └── Expense Categories            ← OWNER / ADMIN only
└── Imports
```

**Role visibility rules:**
- Expenses section (sidebar + all sub-items): OWNER and ADMIN only. STAFF does not see it.
- Reports section (sidebar + all sub-items): OWNER and ADMIN only. STAFF does not see it.
- Expense Categories (Settings sub-item): OWNER and ADMIN only.
- All other navigation items: visible to all roles.

---

## SCREEN 01 — Login

**Purpose:** Authenticate existing user.

**Layout:** Centered card on a plain background. No sidebar.

**Content:**
- Product logo + name at top
- Heading: "Sign in to your account"
- Email input field
- Password input field (with show/hide toggle)
- "Sign in" button (primary, full width)
- Link: "Don't have an account? Register"
- Error state: inline error banner below form ("Invalid email or password")

**Notes:**
- No "Forgot password" (not in backend)
- No social login

---

## SCREEN 02 — Register

**Purpose:** Create a new tenant (business) and owner account.

**Layout:** Centered card, slightly taller than login. No sidebar.

**Content:**
- Logo + name at top
- Heading: "Create your account"
- **Section: Business Info**
  - Business name input
  - Base currency input (default: PKR)
  - Timezone dropdown (default: Asia/Karachi)
- **Section: Owner Account**
  - Full name input
  - Email input
  - Password input (with strength indicator)
  - Confirm password input
- "Create Account" button (primary, full width)
- Link: "Already have an account? Sign in"
- Error state: inline banner for conflict (email taken), validation errors inline per field

---

## SCREEN 03 — Dashboard

**Purpose:** Single-glance business health view. First screen after login.

**Layout:** Full page with sidebar. Top row = stat cards. Middle row = charts. Bottom = quick actions + recent activity.

**Top stat cards (5 cards):**
- Total Cash (sum of all payment accounts)
- Total Receivables (what customers owe)
- Total Payables (what we owe suppliers)
- Inventory Value (stock qty × avg cost)
- Overdue (combined overdue receivables)

**Each card shows:** Label, main number (formatted currency), sub-label (e.g., "from 12 customers"), color indicator.

**Middle section — two panels:**
- Left: Cash by Account — horizontal bar/list showing each account name + balance
- Right: Receivables vs Payables — comparison bar or donut

**Bottom section:**
- Left: Recent Activity table — Date, Type, Party name, Amount, Status badge. Last 10 POSTED transactions, clickable rows.
- Right: Quick Actions — New Sale, New Purchase, Receive Payment, Pay Supplier

**Top bar:**
- "As of date" date picker (defaults to today)
- Refresh button

---

## SCREEN 04 — Transactions List

**Purpose:** View and filter all transactions across all types.

**Layout:** Full page with sidebar. Filter bar at top, table below.

**Filter bar (horizontal, collapsible):**
- Date range: From / To date pickers
- Type dropdown: ALL / PURCHASE / SALE / SUPPLIER_PAYMENT / CUSTOMER_PAYMENT / SUPPLIER_RETURN / CUSTOMER_RETURN / INTERNAL_TRANSFER / ADJUSTMENT
- Status dropdown: ALL / DRAFT / POSTED / **VOIDED**
- Party search: text input (searches supplier or customer name)
- Reset filters button

**Table columns:**
- Date
- Document # — clickable. **Now populated for ALL statuses including DRAFT** (draft format: DPUR-NNNN, DSAL-NNNN, etc.)
- Type badge (color-coded pill)
- Status badge (DRAFT=yellow, POSTED=green, VOIDED=grey)
- Party (supplier or customer name)
- Amount (right-aligned)
- Action: View button

**Table footer:** Pagination — Previous / Page X of Y / Next. Page size: 20 / 50 / 100.

**Top right:** "New Transaction" dropdown button.

---

## SCREEN 05 — Transaction Detail

**Purpose:** View a single transaction in full.

**Layout:** Full page. Header info block, lines table, payment section.

**Header block:**
- Document number (large, prominent) — **present for DRAFT and POSTED statuses**
  - DRAFT format: e.g., `DPUR-0001` (assigned immediately on draft creation)
  - POSTED format: e.g., `PUR-2026-0001` (assigned at posting, replaces draft number)
  - VOIDED: shows the posted number with VOIDED badge
- Status badge (DRAFT=yellow, POSTED=green, VOIDED=grey)
- Transaction type
- Date
- Party name (supplier or customer) — clickable link to their profile
- Created by + created at timestamp

**Transaction Lines table:**
- Columns: Product name, Size, Qty, Unit Cost / Unit Price, Discount, Line Total
- Footer: Subtotal, Discount Total, Delivery Fee, **Total Amount** (bold)

**Payment Info block (only if applicable):**
- For purchases: Paid Now, Payment Account used
- For sales: Received Now, Payment Account used
- For payments: Amount, Payment Account, Allocations

**Allocations section (if payment type):**
- Table: Applied to Document #, Date, Amount Applied

**Actions bar:**
- If DRAFT: "Post Transaction" (primary) + "Edit" + "Delete Draft"
- If POSTED: "Print / Export PDF" (placeholder) + **"Void Transaction"** (danger, OWNER/ADMIN only)
- If VOIDED: No action buttons. Show void metadata block:
  - "Voided reason: [reason or 'No reason given']"
  - "Voided at: [timestamp]"

**"Void Transaction" behavior:**
- Confirmation modal: "This action is irreversible. Enter a reason (optional)."
- Modal: reason text input (optional) + "Void Transaction" (danger) + "Cancel"
- On confirm: `POST /transactions/:id/void`

---

## SCREEN 06 — Create Purchase (Step 1: Draft)

**Layout:** Full page. Two-column: left = form, right = live summary panel.

**Left — Form:**
- Supplier — searchable dropdown (active suppliers)
- Transaction Date — date picker (defaults to today)
- Idempotency Key — hidden (auto-generated UUID)
- **Line Items table:**
  - Product — searchable dropdown
  - Size / Variant — dependent dropdown (after product selected; shows active sizes with stock hint per size)
  - Quantity — number input (min 1)
  - Unit Cost — number input (min 1)
  - Discount — number input (default 0)
  - Line Total — auto-calculated, read-only
  - "+ Add Line" button
- Delivery Fee — number input (default 0)
- Notes — textarea (optional)
- Buttons: "Save as Draft" / "Save & Post"

**After saving draft:** Show the assigned draft document number (e.g., `DPUR-0001`) — display as read-only label.

**Right — Live Summary panel (sticky):**
- Subtotal, Total Discount, Delivery Fee, **Total Amount** (large)
- Supplier current balance

---

## SCREEN 07 — Create Purchase (Step 2: Post / Payment)

**Layout:** Modal overlay or inline expansion.

**Content:**
- Summary of draft (document number, total amount)
- **Payment section (optional):**
  - "Pay now?" toggle
  - If yes: Amount to Pay (pre-filled with total, editable), Payment Account dropdown (with balances)
- Idempotency key for posting — hidden (new UUID, different from draft key)
- "Confirm & Post" button
- "Cancel" link

**Notes:** If "Pay now?" is off, purchase posts as fully on credit.

---

## SCREEN 08 — Create Sale (Step 1: Draft)

**Layout:** Identical structure to Create Purchase.

**Left — Form:**
- Customer — searchable dropdown
- Transaction Date — date picker
- Delivery Type — dropdown: NONE / DELIVERY (optional)
- Delivery Address — text input (shown only if DELIVERY selected)
- Notes — textarea
- **Line Items table:** Product, Size/Variant (with stock hint per size), Quantity, Unit Price, Discount, Line Total
  - Stock warning inline if qty exceeds current stock for that size
- Buttons: "Save as Draft" / "Save & Post"

**After saving draft:** Show assigned draft document number (e.g., `DSAL-0001`).

**Right — Live Summary:** Subtotal, Discount, Delivery Fee, Total Amount, Customer current balance.

---

## SCREEN 09 — Create Sale (Step 2: Post / Payment)

**Layout:** Modal or inline expansion.

**Content:**
- Draft summary
- "Receive payment now?" toggle
- If yes: Amount Received (number input), Payment Account dropdown
- "Confirm & Post" button / "Cancel"

---

## SCREEN 10 — Create Supplier Payment

**Layout:** Single page form.

**Form fields:**
- Supplier — searchable dropdown (shows current balance below)
- Amount — number input
- Payment Account — dropdown (shows current balance per account)
- Transaction Date — date picker
- Notes — textarea (optional)

**Allocations section (optional):**
- "Auto-allocate" toggle (default ON)
- If OFF: table of open purchase invoices — Document #, Date, Total, Outstanding, Allocate Amount input
  - Total allocated must not exceed payment amount

**Right panel:** Payment amount, Total allocated, Unallocated remainder.

**Buttons:** "Save & Post"

---

## SCREEN 11 — Create Customer Receipt (Customer Payment)

**Layout:** Identical to Supplier Payment, mirrored for customers.

**Content:**
- Customer — searchable dropdown (shows current balance)
- Amount, Payment Account, Transaction Date, Notes
- Allocations section (auto or manual)
- "Save & Post" button

---

## SCREEN 12 — Create Supplier Return

**Step 1 — Select Source:**
- Supplier — searchable dropdown
- Source Purchase — searchable dropdown (POSTED purchases for selected supplier)
- Lines table: Product, Size, Original Qty, Already Returned, Returnable Qty, Return Qty input
- Notes — textarea
- "Continue" button

**Step 2 — Review & Confirm:**
- Summary: supplier name, source document, return lines with qty and amounts
- Calculated credit amount (AP reduction)
- "Confirm Return" / "Back"

---

## SCREEN 13 — Create Customer Return

**Step 1 — Select Source:**
- Customer — searchable dropdown
- Source Sale — dropdown (POSTED sales for this customer)
- Return lines table: Product, Size, Original Qty, Already Returned, Returnable Qty, Return Qty input
- Notes — textarea
- "Continue"

**Step 2 — Review & Handling:**
- Return lines summary
- **Return Handling — required radio:**
  - "Refund now" — reduces AR, immediate refund
  - "Store credit" — keeps credit on customer account
- If "Refund now": Payment Account dropdown appears
- "Confirm Return" / "Back"

---

## SCREEN 14 — Create Internal Transfer

**Layout:** Simple single-page form.

**Content:**
- From Account — dropdown (active accounts with balances)
- To Account — dropdown (active accounts, excludes selected From account)
- Amount — number input (shows available From account balance as hint)
- Transaction Date — date picker
- Notes — textarea (optional)
- "Transfer" button
- Validation: cannot transfer to same account

---

## SCREEN 15 — Create Stock Adjustment

**Layout:** Single page with line items table.

**Content:**
- Transaction Date, Notes
- **Line Items table:**
  - Product, Size/Variant (dependent dropdown)
  - Direction — toggle per row: IN (green) / OUT (red)
  - Quantity
  - Reason — text input per line
  - Current Stock hint (for that size)
  - OUT warning if qty exceeds current stock for that size
- Right panel: Summary of net IN/OUT by product
- Buttons: "Save & Post" (OWNER/ADMIN only — hide for STAFF)

---

## SCREEN 16 — Suppliers List

**Filter bar:** Search input (name or phone), Status filter (Active / Inactive / All), Sort by (Name / Created Date).

**Table columns:**
- Name (clickable → supplier detail)
- Phone
- Current Balance (what we owe them)
- Status badge
- Actions: View / Edit / Change Status

**Top right:** "+ Add Supplier" button.

---

## SCREEN 17 — Add Supplier *(v3 change: phone required)*

**Layout:** Modal dialog or right-side drawer.

**Content:**
- Name — text input (required)
- **Phone — text input (required, min 10 chars, must be unique)** ← v3 change: was optional
- Address — textarea (optional)
- Notes — textarea (optional)
- "Save Supplier" / "Cancel"

**Errors:**
- 409: Name already exists
- **409: Phone number already in use** ← v3 change

---

## SCREEN 18 — Supplier Detail

**Layout:** Full page. Top = profile + balance cards. Below = tabbed content.

**Top section:** Supplier name, status badge + "Change Status", "Edit", Phone/Address/Notes.

**Balance cards:** Total Purchased, Total Paid, Current Balance (PAYABLE / CREDIT / SETTLED label).

**Tabs:**
- **Ledger** → Supplier Ledger (Screen 19)
- **Open Documents** → unpaid invoices
- **Transactions** → all transactions for this supplier

---

## SCREEN 19 — Supplier Ledger (Statement)

**Filter bar:** Date From / Date To, "Run Report" button.

**Ledger table:**
- Columns: Date | Document # | Type | Description | Debit (AP Increase) | Credit (AP Decrease) | Running Balance
- Debit rows = light red tint; Credit rows = light green tint
- Document # clickable → Transaction Detail

**Footer:** Opening Balance (as of dateFrom), Closing Balance (as of dateTo).

**Top right:** Export button (placeholder).

---

## SCREEN 20 — Supplier Open Documents

**Table columns:** Document #, Date, Total Amount, Paid Amount, Outstanding (highlighted if large), Days Outstanding.

**Footer:** Total Outstanding, Unapplied Credits, Net Outstanding.

**Quick action:** "Pay Now" per row → opens Create Supplier Payment pre-filled.

---

## SCREEN 21 — Customers List

**Layout:** Identical to Suppliers List.

**Table columns:** Name (clickable), Phone, Current Balance (what they owe us), Status badge, Actions.

**Top right:** "+ Add Customer" button.

---

## SCREEN 22 — Add Customer *(v3 change: phone required)*

**Layout:** Modal or drawer.

**Content:**
- Name — text input (required)
- **Phone — text input (required, min 10 chars, must be unique)** ← v3 change
- Address — textarea (optional)
- Notes — textarea (optional)
- "Save Customer" / "Cancel"

**Errors:**
- 409: Name already exists
- **409: Phone number already in use** ← v3 change

---

## SCREEN 23 — Customer Detail

**Layout:** Identical to Supplier Detail.

**Balance cards:** Total Sales, Total Received, Current Balance (RECEIVABLE / CREDIT / SETTLED).

**Tabs:** Ledger → Screen 24, Open Documents, Transactions.

---

## SCREEN 24 — Customer Ledger (Statement)

**Layout:** Identical to Supplier Ledger.

**Ledger table:** Date | Document # | Type | Description | Debit (AR Decrease = payments/returns) | Credit (AR Increase = sales) | Running Balance.

---

## SCREEN 25 — Customer Open Documents

**Layout:** Identical to Supplier Open Documents (mirrored for AR).

**Content:** Document #, Date, Total, Received, Outstanding, Days Outstanding. Net Outstanding after unapplied credits.

**Quick action:** "Receive Payment" per row → opens Customer Receipt pre-filled.

---

## SCREEN 26 — Products List

**Filter bar:** Search (name, SKU, category), Status filter, Category filter.

**Table columns:**
- Name (clickable → product detail)
- SKU (product-level)
- Category
- Unit
- Total Stock (sum across all sizes; red if 0)
- # Sizes (count of active variants)
- Status badge
- Actions: View / Edit / Change Status

**Top right:** "+ Add Product" button.

---

## SCREEN 27 — Add Product

**Layout:** Modal or drawer.

**Content:**
- Name (required), SKU (optional, auto-uppercase), Category (optional), Unit (optional)
- "Save Product" / "Cancel"
- Saving auto-creates a default "one-size" variant — no extra UI step.

---

## SCREEN 28 — Product Detail

**Layout:** Full page. Top = profile + stock cards. Below = tabs.

**Summary cards:** Total Stock (all sizes), Total Inventory Value, Active Sizes count.

**Per-size breakdown table:**
- Columns: Size | SKU (variant-level) | Current Stock | Avg Cost | Value (qty × avgCost) | Status | Actions
- Actions per row: **Edit** (change size label + variant SKU, inline), **Change Status** (blocked if stock > 0 on deactivate)
- Low stock rows: amber (≤5); zero stock: red
- "Add Size" button → inline form: Size name + optional variant SKU

**Tabs:** Purchase History, Sale History, Stock Movements (per-variant with Size column).

---

## SCREEN 29 — Payment Accounts List *(v3 change: sort by balance)*

**Filter bar:**
- Type filter: All / CASH / BANK / WALLET / CARD
- Status filter: Active / Inactive / All
- **Sort by: Name / Balance (asc) / Balance (desc)** ← v3 change: Balance sort added

**Account cards (or table rows):**
- Account name
- Type badge
- Current Balance (large, prominent) — source: `breakdown.currentBalance`
- Opening Balance — source: `breakdown.openingBalance`
- Total In — source: `breakdown.moneyIn.totalAmount`
- Total Out — source: `breakdown.moneyOut.totalAmount`
- Status badge
- Actions: View Statement / Edit / Change Status

**Top right:** "+ Add Account" button. Total across all accounts (bold summary).

---

## SCREEN 30 — Add Payment Account

**Layout:** Modal dialog.

**Content:**
- Name (required)
- Type — dropdown: CASH / BANK / WALLET / CARD
- Opening Balance — number input (default 0; can be negative for overdraft)
- "Save Account" / "Cancel"

---

## SCREEN 31 — Payment Account Statement

**Filter bar:** Date From / Date To, "Run Report" button.

**Summary cards (above table):** Opening Balance, Total In, Total Out, Closing Balance.

**Statement table:**
- Date | Document # | Transaction Type | Party | Money In | Money Out | Running Balance
- Opening Balance row at top (as of dateFrom)
- Closing Balance row at bottom

**Top right:** Export button (placeholder).

---

## SCREEN 32 — P&L Report

**Controls:** Date From / Date To pickers, "Generate" button.

**Report body:**
```
REVENUE
  Sales Revenue                       XXX,XXX
  Less: Sales Returns                (XX,XXX)
                                     ─────────
  Net Revenue                         XXX,XXX

COST OF GOODS SOLD                   (XXX,XXX)
                                     ─────────
GROSS PROFIT                          XXX,XXX
GROSS PROFIT MARGIN                    XX.X%

OPERATING EXPENSES
  Delivery & Shipping                 (X,XXX)
  Utilities                           (X,XXX)
  [... other categories with amounts]
                                     ─────────
  Total Operating Expenses            (XX,XXX)

                                     ─────────
NET INCOME                            XXX,XXX
```

**Notes:**
- Skip operating expense rows where amount = 0
- Gross Profit Margin % is a frontend calculation: `(grossProfit / netRevenue * 100).toFixed(1)`. Guard against divide-by-zero.
- Net Income positive = profit (green text); negative = loss (red text)

**Top right:** Export button (placeholder).

---

## SCREEN 33 — Aged Receivables Report

**Controls:** As of Date picker, "Generate" button.

**Table columns:** Customer Name | Current (0–30 days) | 31–60 days | 61–90 days | 90+ days | Total Outstanding.

**Footer:** Totals per bucket. Rows in red if 90+ bucket has amount.

Click customer name → Customer Open Documents.

---

## SCREEN 34 — Aged Payables Report

**Layout:** Identical to Aged Receivables, for suppliers.

**Columns:** Supplier Name | 0–30 | 31–60 | 61–90 | 90+ | Total Outstanding.

Click supplier name → Supplier Open Documents.

---

## SCREEN 35 — Trial Balance

**Controls:** As of Date picker, "Generate" button.

**Report table:**
```
Account Name          Debit        Credit
─────────────────────────────────────────
Accounts Receivable   XXX,XXX
Accounts Payable                   XXX,XXX
Cash                               XXX,XXX
Inventory             XXX,XXX
─────────────────────────────────────────
TOTALS                XXX,XXX      XXX,XXX
```

**Column sources:** `accountName`, `totalDebit`, `totalCredit`. Totals from `totals.totalDebits` / `totals.totalCredits`.

---

## SCREEN 36 — Inventory Valuation Report

**Controls:** As of Date picker, "Generate" button.

**Table columns:** Product Name | Size | SKU | Category | Qty on Hand | Avg Cost | Total Value.

**Data source:** `variants[]` array (field `variants[].productName`, `variants[].variantSize`, `variants[].quantity`, `variants[].avgCost`, `variants[].inventoryValue`).

**Grouping:** Rows grouped by Product Name; sub-total per group. Footer: Grand Total Inventory Value (from `totalInventoryValue`).

---

## SCREEN 37 — Imports List

**Filter bar:** Module filter (All / SUPPLIERS / CUSTOMERS / PRODUCTS / OPENING_BALANCES), Status filter (All / PENDING_MAPPING / VALIDATED / PROCESSING / COMPLETED / ROLLED_BACK).

**Status meanings:**
- `PENDING_MAPPING` — uploaded, awaiting column mapping
- `VALIDATED` — columns mapped, rows validated, ready to commit
- `PROCESSING` — commit in progress
- `COMPLETED` — all valid rows imported
- `ROLLED_BACK` — import undone

**Table:** Date, Module badge, File name, Total Rows / Success / Failed, Status badge, Actions (View / Rollback if COMPLETED).

**Top right:** "+ New Import" button.

---

## SCREEN 38 — New Import (Step 1: Upload)

**Stepper:** Upload → Map Columns → Preview & Commit.

**Content:**
- Module selector — SUPPLIERS / CUSTOMERS / PRODUCTS / OPENING_BALANCES
- File upload area (accepts .csv, .xlsx, max 10MB)
- Template download link
- "Upload & Continue" button

---

## SCREEN 39 — New Import (Step 2: Map Columns)

**Content:**
- Detected CSV/XLSX columns listed
- Mapping rows: for each system field → dropdown to select which CSV column
- Required fields marked with asterisk; sample values shown
- "Next: Preview" / "Back"

---

## SCREEN 40 — New Import (Step 3: Preview & Commit)

**Summary bar:** Total rows, Valid (green), Failed (red).

**Preview table:** Row # | Data columns | Status (VALID / FAILED) | Error message.

**Actions:** "Commit Import" (primary) / "Cancel".

**After commit success:**
- "Import committed successfully"
- X records imported, X skipped
- "View Import Details" → Import Detail

---

## SCREEN 41 — Import Detail

**Header:** Module badge, Status badge, File name, Committed at, Committed by.

**Summary cards:** Total Rows / Committed / Failed.

**Results table:** Row # | Data | Status | Error | Created Record (with link if committed).

**Actions:** "Rollback Import" (danger, shown only if COMMITTED and rollback possible) with confirmation modal.

---

## SCREEN 42 — Settings: Business Profile

**Content:** Business Name, Base Currency (read-only), Timezone dropdown. "Save Changes" button.

---

## SCREEN 43 — Settings: Users & Roles

**Users table:** Full Name, Email, Role badge (OWNER / ADMIN / STAFF), Status badge, Actions (Change Role / Deactivate).

**Note:** No invite flow — "Invite User" button shows "Coming soon" modal.

---

## SCREEN 44 — Settings: Payment Accounts

Shortcut to Payment Accounts List (Screen 29) and Add Account (Screen 30).

---

## SCREEN 45 — Expense Categories List

**Access:** Settings → Expense Categories. OWNER / ADMIN only.

**Filter bar:** Search (category name), Status (Active / Inactive / All), Type (All / System only / Custom only).

**Table columns:**
- Name (bold if system category)
- Description
- Status badge
- System chip (blue "System" badge for the 10 pre-seeded categories)
- Actions: Edit / Deactivate — **hidden for system categories**

**Top right:** "+ Add Category" button (OWNER/ADMIN only).

**System categories (pre-seeded, read-only):** Delivery & Shipping, Office Supplies, Utilities, Rent & Lease, Salaries & Wages, Maintenance & Repairs, Bank Charges & Fees, Marketing & Advertising, Professional Services, Miscellaneous.

**Sorting:** System categories first (by account number 6001–6010), custom categories below (alphabetically by name).

---

## SCREEN 46 — Add / Edit Expense Category

**Layout:** Modal dialog.

**Content:**
- Name — text input (required, 2–100 chars)
- Description — textarea (optional, max 500 chars)
- "Save Category" / "Cancel"

**Edit mode:** Pre-fill fields. Never open for system categories (`isSystem: true`).

**Errors:** 409: "A category with this name already exists".

---

## SCREEN 47 — Expenses List

**Access:** Expenses → All Expenses. OWNER / ADMIN only.

**Filter bar:** Date From / Date To, Category filter (dropdown of active categories), Status (All / Draft / Posted / Voided), Reset filters.

**Table columns:**
- Document # (e.g., `EXP-2026-0001`) — **present for all statuses including DRAFT** — clickable → Screen 49
- Date
- Category name
- Description (truncated at 50 chars)
- Amount (right-aligned, PKR)
- Payment Account
- Status badge (DRAFT=yellow, POSTED=green, VOIDED=grey)
- Actions: View / Edit (DRAFT + OWNER/ADMIN only) / Delete (DRAFT + OWNER/ADMIN only)

**Top right:** "+ New Expense" (OWNER/ADMIN only).

**Sidebar badge:** Draft count badge on "Expenses" item (count of DRAFT status expenses).

---

## SCREEN 48 — Create / Edit Expense Draft

**Access:** OWNER / ADMIN only.

**Form fields:**

| Field | Input type | Notes |
|---|---|---|
| Date | Date picker | Required; cannot be future |
| Amount (PKR) | Number input | Required; min 1; integer |
| Category | Searchable dropdown | Required; active only; system items shown with "System" chip |
| Payment Account | Searchable dropdown | Required; active only; balance hint shown |
| Description | Textarea | Required; 3–500 chars |

**Right summary panel (sticky):**
- Selected category, selected account + balance
- Amount entered
- "Balance after this expense: [account balance - amount]" — warn if negative

**Buttons:**
- "Save as Draft" → `POST /expenses` (create) or `PATCH /expenses/:id` (edit)
- "Save & Post" → creates draft then immediately posts (two-step; auto-generates idempotency UUID on frontend)

**Edit mode:** Pre-fill from existing draft. Show document number (e.g., `EXP-2026-0001`) as read-only label. Redirect to detail if status is not DRAFT.

---

## SCREEN 49 — Expense Detail

**Layout:** Full page. Header card + details block + action bar.

**Header block:**
- Document # (large): `EXP-2026-0001`
- Status badge
- Amount (large)
- Date, Category name, Payment account name
- Description (full text)
- Created by + created at

**If VOIDED — void info block:**
- "Voided on: [timestamp]"
- "Voided by: [user]"
- "Reason: [reason or 'No reason given']"

**Actions bar:**

| Status | Role | Buttons |
|---|---|---|
| DRAFT | OWNER / ADMIN | "Edit" + "Post Expense" + "Delete Draft" |
| DRAFT | STAFF | No buttons |
| POSTED | OWNER / ADMIN | "Void Expense" (danger) |
| VOIDED | Any | No buttons |

**"Post Expense":** Confirmation modal — "Post EXP-2026-XXXX for PKR X,XXX?". Auto-generate idempotency key on modal open.

**"Void Expense":** Confirmation modal with optional reason input.

---

## SCREEN 51 — Balance Sheet Report

**Access:** Reports → Balance Sheet. OWNER / ADMIN only.

**Controls:** As of Date picker (default: today), "Generate" button.

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

**Balance check indicator:** Badge below totals — ✓ Balanced (green) / ✗ Out of balance (red). If `isBalanced: false`, show warning banner: "Balance sheet is out of balance — contact support."

---

## SCREEN 52 — Cash Position Report

**Access:** Reports → Cash Position. OWNER / ADMIN only.

**Controls:** As of Date picker (default: today), "Generate" button.

**Content:**
- **Total Cash card (top):** Large number from `totalCash`
- **Accounts table:** Account Name | Type badge | Balance (right-aligned). Sorted by balance descending.

**Type badge colors:** CASH=green, BANK=blue, WALLET=purple, CARD=orange.

---

## GLOBAL COMPONENTS

**Top Navigation Bar:** Business name/logo (left), Page title (center), User avatar + dropdown (Profile / Logout) (right).

**Sidebar:**
- Collapsible on mobile
- Active item highlighted
- Badge: Draft transaction count on "Transactions" (DRAFT status count)
- Badge: Draft expense count on "Expenses" (OWNER/ADMIN only)

**Confirmation Modal (reused everywhere):** Title, description, Confirm (danger/primary), Cancel.

**Toast Notifications:** Success (green), Error (red), Warning (yellow).

**Empty State:** Icon + message + primary action button.

**Loading States:** Skeleton loaders on tables. Disabled buttons with spinner during API calls.

---

## ROLE GATING SUMMARY

| Feature | OWNER | ADMIN | STAFF |
|---|---|---|---|
| Expenses sidebar section | ✓ | ✓ | ✗ |
| Reports sidebar section | ✓ | ✓ | ✗ |
| New Expense button | ✓ | ✓ | ✗ |
| Post / Void Expense buttons | ✓ | ✓ | ✗ |
| Delete Draft Expense | ✓ | ✓ | ✗ |
| Void Transaction button | ✓ | ✓ | ✗ |
| Expense Categories (Settings) | ✓ | ✓ | ✗ |
| Add / Edit / Deactivate Category | ✓ | ✓ | ✗ |
| Stock Adjustment (create/post) | ✓ | ✓ | ✗ |

All other features are accessible to all authenticated roles.

---

## TOTAL SCREEN COUNT: 52
