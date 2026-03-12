# Phase 8 — Cross-Module Consistency & Edge Cases
## Dashboard KPIs · Ledger Statements · Pagination · Auth · Inactive Entities · UI Stress

> **Goal**: Verify the entire system is internally consistent after all 6 phases of transactions.
> This is the "does it all add up?" phase — not testing new transactions, but verifying
> that every number shown anywhere in the app agrees with every other number.
>
> **Depends on**: All phases 1–7 completed.
>
> **Final expected state** (ground truth for all checks in this phase):
> | KPI | Expected Value |
> |-----|---------------|
> | Cash & Bank | PKR 148,600.00 |
> | Accounts Receivable | PKR 0.00 (or net −PKR 6,500 credit) |
> | Accounts Payable | PKR 4,500.00 (S2) net PKR 2,300 |
> | Inventory Value | PKR 40,200.00 |

---

## Section A: Dashboard KPI Accuracy

### TC-2001 — Dashboard Final State (as of 2026-03-29)

**Where**: `/` (Dashboard)

**Expected KPI Cards**:
| Card | Expected Value | Source |
|------|---------------|--------|
| Cash & Bank | **PKR 148,600.00** | Sum of A1+A2+A3 |
| Total Receivables | **PKR 0.00** | C1 and C2 both at zero/credit |
| Total Payables | **PKR 4,500.00** | S2 remaining balance |
| Inventory Value | **PKR 40,200.00** | Current stock × avg cost |

- [ ] All 4 cards show correct values
- [ ] No card shows PKR 0 when it shouldn't, or a stale value from an earlier state

---

### TC-2002 — Dashboard Account Breakdown

**Where**: `/` → Cash & Bank card (breakdown list)

**Expected per-account**:
| Account | Balance |
|---------|---------|
| HBL Main | PKR 76,400.00 |
| Cash Box | PKR 45,000.00 |
| JazzCash | PKR 27,200.00 |
| **Total** | **PKR 148,600.00** |

- [ ] All 3 accounts listed
- [ ] Individual values correct
- [ ] Sum matches the KPI card total
- [ ] Account names match the names set in Phase 1

---

### TC-2003 — Dashboard Receivables Breakdown

**Where**: `/` → Receivables card (if drilldown exists)

**Expected**:
- [ ] Customer count: 0 (or 2 with credit balances — note behavior)
- [ ] Overdue amount: PKR 0.00
- [ ] No phantom receivables from prior phases

---

### TC-2004 — Dashboard Payables Breakdown

**Where**: `/` → Payables card (if drilldown exists)

**Expected**:
- [ ] S2 Punjab Steel: PKR 4,500.00
- [ ] S1 Karachi Fabrics: NOT shown (credit balance — we owe them nothing)
- [ ] Total: PKR 4,500.00

---

### TC-2005 — Dashboard Inventory Breakdown

**Where**: `/` → Inventory card

**Expected**:
- [ ] Total products count: 2 (Premium Cloth, Steel Rod)
- [ ] Total value: PKR 40,200.00
- [ ] Low stock count: P1-V2 (0 Meters) should count as low/out-of-stock
- [ ] Low stock badge or count visible

---

### TC-2006 — Dashboard Recent Transactions List

**Where**: `/` → Recent Transactions section

**Expected**:
- [ ] Last 5–10 transactions shown
- [ ] TX-ADJ3 (2026-03-29) is the most recent
- [ ] Each row shows: date, type, amount, entity (or account)
- [ ] Clicking a transaction navigates to `/transactions/detail/[id]`
- [ ] No duplicate rows

---

### TC-2007 — Dashboard Quick Actions

**Where**: `/` → Quick Action buttons (New Purchase, New Sale, etc.)

- [ ] "New Purchase" → navigates to `/transactions/purchase`
- [ ] "New Sale" → navigates to `/transactions/sale`
- [ ] "New Payment" (if exists) → navigates to correct page
- [ ] No broken links

---

## Section B: Ledger Statement Deep Verification

### TC-2101 — Supplier S1 Full Ledger (All Entries)

**Where**: `/supplier/detail/[S1_ID]` → Ledger tab

**Set date range**: `2026-03-01` to `2026-03-29`

**Expected entries in order**:
| # | Date | Type | Amount | Running Balance |
|---|------|------|--------|----------------|
| 1 | 2026-03-01 | PURCHASE (TX-P1) | +PKR 21,000 | PKR 21,000 |
| 2 | 2026-03-05 | PURCHASE (TX-P2) | +PKR 30,000 | PKR 51,000 |
| 3 | 2026-03-15 | PAYMENT (TX-SP1) | −PKR 21,000 | PKR 30,000 |
| 4 | 2026-03-17 | PAYMENT (TX-SP2) | −PKR 30,000 | PKR 0 |
| 5 | 2026-03-22 | RETURN (TX-SR2) | −PKR 2,200 | −PKR 2,200 |

- [ ] Exactly 5 entries
- [ ] Running balance column is correct at each row
- [ ] Final balance: **−PKR 2,200**
- [ ] Final balance matches the "Current Balance" card on the same page
- [ ] Sign convention is consistent (purchases increase, payments/returns decrease)

---

### TC-2102 — Supplier S2 Full Ledger

**Set date range**: `2026-03-01` to `2026-03-29`

**Expected entries**:
| # | Date | Type | Amount | Running Balance |
|---|------|------|--------|----------------|
| 1 | 2026-03-07 | PURCHASE (TX-P3) | +PKR 10,000 | PKR 10,000 |
| 2 | 2026-03-18 | PAYMENT (TX-SP3) | −PKR 5,000 | PKR 5,000 |
| 3 | 2026-03-21 | RETURN (TX-SR1) | −PKR 500 | PKR 4,500 |

- [ ] Exactly 3 entries
- [ ] Final balance: **PKR 4,500**
- [ ] Matches Current Balance card

---

### TC-2103 — Customer C1 Full Ledger

**Set date range**: `2026-03-01` to `2026-03-29`

**Expected entries**:
| # | Date | Type | Amount | Running Balance |
|---|------|------|--------|----------------|
| 1 | 2026-03-10 | SALE (TX-S1) | +PKR 22,400 | PKR 22,400 |
| 2 | 2026-03-12 | SALE (TX-S2) | +PKR 10,000 | PKR 32,400 |
| 3 | 2026-03-16 | PAYMENT (TX-CP1) | −PKR 22,400 | PKR 10,000 |
| 4 | 2026-03-19 | PAYMENT (TX-CP2) | −PKR 10,000 | PKR 0 |
| 5 | 2026-03-23 | RETURN (TX-CR1) | −PKR 6,000 | −PKR 6,000 |

- [ ] Exactly 5 entries
- [ ] Final balance: **−PKR 6,000**
- [ ] Matches Current Balance card

---

### TC-2104 — Customer C2 Full Ledger

**Expected entries**:
| # | Date | Type | Amount | Running Balance |
|---|------|------|--------|----------------|
| 1 | 2026-03-13 | SALE (TX-S3) | +PKR 2,200 | PKR 2,200 |
| 2 | 2026-03-20 | PAYMENT (TX-CP3) | −PKR 2,200 | PKR 0 |
| 3 | 2026-03-24 | RETURN (TX-CR2) | −PKR 500 | −PKR 500 |

- [ ] Exactly 3 entries
- [ ] Final balance: **−PKR 500**

---

### TC-2105 — Ledger Date Range Filtering

**Where**: `/supplier/detail/[S1_ID]` → Ledger tab

**Test A — Narrow range (only March 15–17)**:
- Set from: `2026-03-15`, to: `2026-03-17`
- [ ] Only TX-SP1 (March 15) and TX-SP2 (March 17) appear
- [ ] TX-P1 and TX-P2 (before range) NOT shown
- [ ] TX-SR2 (after range) NOT shown
- [ ] Running balance still correct for filtered entries

**Test B — Single day**:
- Set from: `2026-03-05`, to: `2026-03-05`
- [ ] Only TX-P2 (March 5) appears

**Test C — Empty range**:
- Set from: `2026-02-01`, to: `2026-02-28`
- [ ] No entries shown, empty state message displayed

---

### TC-2106 — Payment Account A1 Full Statement

**Where**: `/payment-accounts/detail/[A1_ID]` → Statement tab

**Set date range**: `2026-03-01` to `2026-03-29`

**Expected entries**:
| # | Date | Type | In | Out | Balance |
|---|------|------|----|-----|---------|
| opening | — | Opening Balance | PKR 100,000 | — | PKR 100,000 |
| 1 | 2026-03-15 | SUPPLIER_PAYMENT | — | PKR 21,000 | PKR 79,000 |
| 2 | 2026-03-16 | CUSTOMER_PAYMENT | PKR 22,400 | — | PKR 101,400 |
| 3 | 2026-03-25 | INTERNAL_TRANSFER | — | PKR 25,000 | PKR 76,400 |

- [ ] 3 transaction entries + opening balance
- [ ] Final balance: **PKR 76,400**
- [ ] Matches Current Balance card
- [ ] In/Out columns correctly assigned (payment in vs payment out)

---

## Section C: Global Transaction List Validation

### TC-2201 — Total Transaction Count

**Where**: `/transactions` (no filters applied)

**Expected**:
- [ ] Total transactions visible includes all posted + draft transactions from phases 2–6
- [ ] Approximate count: ~20 transactions (adjust for any extra drafts created and deleted)
- [ ] Pagination controls visible if count > page size

---

### TC-2202 — Filter by Type

**For each type, verify correct transactions appear**:
| Filter | Expected TXs |
|--------|-------------|
| PURCHASE | TX-P1, TX-P2, TX-P3 |
| SALE | TX-S1, TX-S2, TX-S3 |
| SUPPLIER_PAYMENT | TX-SP1, TX-SP2, TX-SP3 |
| CUSTOMER_PAYMENT | TX-CP1, TX-CP2, TX-CP3 |
| SUPPLIER_RETURN | TX-SR1, TX-SR2 |
| CUSTOMER_RETURN | TX-CR1, TX-CR2 |
| INTERNAL_TRANSFER | TX-IT1, TX-IT2 |
| ADJUSTMENT | TX-ADJ1, TX-ADJ2, TX-ADJ3 |

- [ ] Each filter shows only that type — no cross-contamination
- [ ] Clearing filter restores full list

---

### TC-2203 — Filter by Status

- Filter POSTED → all above transactions visible (none are in DRAFT)
- Filter DRAFT → no transactions (all were posted)
- Filter VOIDED → no transactions (none voided)

---

### TC-2204 — Filter by Date Range

**Set date range**: `2026-03-01` to `2026-03-10`

**Expected**:
- [ ] TX-P1 (Mar 1), TX-P2 (Mar 5), TX-P3 (Mar 7), TX-S1 (Mar 10) visible
- [ ] TX-S2 (Mar 12) and later NOT visible

---

### TC-2205 — Filter by Supplier / Customer

- Filter supplier = S1 → only TX-P1, TX-P2, TX-SP1, TX-SP2, TX-SR2 (all S1 transactions)
- Filter customer = C1 → only TX-S1, TX-S2, TX-CP1, TX-CP2, TX-CR1

---

### TC-2206 — Transaction Detail Navigation

**Where**: `/transactions` → click any row

**Expected**:
- [ ] Opens `/transactions/detail/[id]`
- [ ] Transaction details match what was entered (supplier/customer, lines, amounts, status)
- [ ] "Back" or breadcrumb returns to `/transactions`

---

## Section D: Inactive Entity Behavior

### TC-2301 — Deactivate S2 (Has Outstanding Balance)

**Where**: `/supplier/detail/[S2_ID]` → Change Status to INACTIVE

**Expected**:
- [ ] Status changes to INACTIVE
- [ ] Balance card still shows PKR 4,500.00 (deactivation doesn't clear balance)
- [ ] Ledger, Open Documents still visible

**Behavior to verify in transaction forms**:
- [ ] When creating a new purchase: can S2 (INACTIVE) be selected?
  - Expected: blocked or warning shown
  - If freely selectable: note as potential issue (you can transact with inactive suppliers)

**Reactivate S2** when done.

---

### TC-2302 — Deactivate P1-V1 (Has Stock)

**Where**: `/products/detail/[P1_ID]` → deactivate variant P1-V1

**Expected**:
- [ ] P1-V1 status: INACTIVE
- [ ] Stock still shows 22 Meters (deactivation doesn't erase stock)
- [ ] Movements tab still shows history

**Behavior to verify**:
- [ ] When creating a new sale: can P1-V1 be selected as a line item?
  - Expected: blocked or not shown in variant dropdown
  - If selectable: note as a potential inventory management issue

**Reactivate P1-V1** when done.

---

### TC-2303 — Deactivate Payment Account A3 (Has Balance)

**Where**: `/payment-accounts/detail/[A3_ID]` → Change Status to INACTIVE

**Expected**:
- [ ] A3 status: INACTIVE
- [ ] Balance: still PKR 27,200.00

**Dashboard behavior**:
- [ ] Does dashboard Cash & Bank include inactive accounts?
  - If included: PKR 148,600 unchanged
  - If excluded: drops by PKR 27,200 → note behavior

**Transaction form behavior**:
- [ ] Creating a supplier payment: can A3 be selected as payment account?
  - Expected: blocked or not shown
  - If selectable: log as issue

**Reactivate A3** when done.

---

## Section E: Transaction Lifecycle Edge Cases

### TC-2401 — Cannot Post an Already-Posted Transaction

**Where**: `/transactions/detail/[TX-P1_ID]`

**Expected**:
- [ ] Post button absent, disabled, or shows "Already posted"
- [ ] Attempting via UI: blocked with message

---

### TC-2402 — Cannot Edit a Posted Transaction

**Where**: `/transactions/detail/[TX-P1_ID]`

**Expected**:
- [ ] Edit button absent or disabled on POSTED transactions
- [ ] Form fields read-only if page shows edit mode

---

### TC-2403 — Cannot Delete a Posted Transaction

**Where**: `/transactions/detail/[TX-S1_ID]`

**Expected**:
- [ ] Delete button absent or disabled
- [ ] If delete attempted: error "Cannot delete a posted transaction"

---

### TC-2404 — Transaction List Pagination

**Where**: `/transactions` (if more than 1 page of results)

**Expected**:
- [ ] "Showing X of Y records" text correct
- [ ] Next page button loads next batch
- [ ] Previous page button returns to prior batch
- [ ] Page numbers (if shown) are accurate
- [ ] Navigating pages doesn't reset applied filters

---

### TC-2405 — Supplier List Pagination

**Where**: `/supplier` (only 2 suppliers — test with minimum page size if configurable)

**Expected**:
- [ ] "Showing 2 of 2 records"
- [ ] No pagination controls (only 1 page)
- [ ] If page size = 1: shows 1 supplier, Next shows second, total = 2

---

## Section F: Form Validation Edge Cases

### TC-2501 — Transaction Date: Future Date

**Where**: `/transactions/purchase`

**Action**: Set date to `2027-01-01` (1 year in future)

**Expected**:
- [ ] System allows future-dated transactions (backoffice systems often do)
- [ ] If blocked: note with error message
- [ ] No crash

---

### TC-2502 — Transaction Date: Very Old Date

**Action**: Set date to `2000-01-01`

**Expected**:
- [ ] System allows historical back-dating
- [ ] If blocked: note range restriction
- [ ] P&L for that period would include it

---

### TC-2503 — Empty Line Item in Purchase

**Where**: `/transactions/purchase` → add a line item row but leave it blank

**Expected**:
- [ ] Blank rows either auto-removed or validation error on save
- [ ] Cannot save a purchase with 0 line items

---

### TC-2504 — Line Item with Qty = 0

**Where**: `/transactions/purchase`

**Action**: Add line item, set Qty = `0`

**Expected**:
- [ ] Validation error: "Quantity must be at least 1"
- [ ] Cannot post a transaction with a zero-qty line

---

### TC-2505 — Line Item with Negative Price

**Action**: Enter unit price = `-100`

**Expected**:
- [ ] Input blocked or validation error
- [ ] Total does not go negative

---

### TC-2506 — Discount Exceeding Line Total

**Action**: Line total PKR 1,000, enter discount PKR 1,500

**Expected**:
- [ ] Validation error: "Discount cannot exceed line total"
- [ ] OR: capped at PKR 1,000 automatically
- [ ] Line total does not go negative

---

## Section G: Authentication & Session

### TC-2601 — Expired Token Handling

**Action**: Open the app, wait for access token to expire (or manually clear `accessToken` from localStorage while keeping `refreshToken`)

**Expected**:
- [ ] On next API call: system silently refreshes token using refresh token
- [ ] User NOT kicked out / redirected to login
- [ ] Data loads correctly after refresh

---

### TC-2602 — Both Tokens Expired

**Action**: Clear both `accessToken` and `refreshToken` from localStorage, then navigate to `/supplier`

**Expected**:
- [ ] Redirected to `/signin`
- [ ] No data visible
- [ ] After login: redirected back to `/supplier` (or to dashboard)

---

### TC-2603 — Direct URL Access Without Login

**Action**: Open a fresh browser (no cookies/storage), navigate directly to `/transactions`

**Expected**:
- [ ] Redirected to `/signin`
- [ ] Not a 404 or blank page

---

### TC-2604 — Logout

**Action**: Use logout button (profile menu or sidebar)

**Expected**:
- [ ] `accessToken`, `refreshToken`, `user` all cleared from localStorage
- [ ] Redirected to `/signin`
- [ ] Navigating back (browser back button) to `/supplier` redirects back to `/signin`
- [ ] Old token cannot be reused after logout

---

## Section H: UI Consistency & Polish

### TC-2701 — Currency Formatting Everywhere

**Check that `formatPKR()` is used consistently**:
- [ ] Supplier balance card: `PKR X,XXX.00`
- [ ] Customer balance card: `PKR X,XXX.00`
- [ ] Transaction amounts in list: `PKR X,XXX.00`
- [ ] Report totals: `PKR X,XXX.00`
- [ ] Payment account balances: `PKR X,XXX.00`
- [ ] Dashboard KPI cards: `PKR X,XXX.00`
- [ ] No raw numbers without PKR prefix anywhere

---

### TC-2702 — Status Badge Colors

**Verify badge colors match across all modules**:
| Status | Expected Color | Pages to Check |
|--------|---------------|----------------|
| ACTIVE | Green | Supplier, Customer, Product, Payment Account list |
| INACTIVE | Red or Gray | Same pages |
| DRAFT | Gray | Transaction list, TX detail |
| POSTED | Green | Transaction list, TX detail |
| VOIDED | Red | Transaction list (if any voided) |

- [ ] Colors consistent across all pages using the `Badge` component
- [ ] No page uses raw text status without a badge

---

### TC-2703 — Loading States

**For every list page** (supplier, customer, products, payment-accounts, transactions):
- [ ] Skeleton rows shown during initial load (not blank screen)
- [ ] Skeleton has the right number of columns matching the table

**For every detail page**:
- [ ] Loading spinner or skeleton shown while fetching data
- [ ] Page doesn't flash empty content before data arrives

---

### TC-2704 — Empty State Messages

**For each tab/section that can be empty**:
| Location | When Empty | Expected Message |
|----------|-----------|-----------------|
| Supplier list | No suppliers | "No suppliers found" or equivalent |
| Supplier Ledger tab | No transactions | "No ledger entries" or equivalent |
| Supplier Open Documents | All paid | "No open documents" |
| Product Movements tab | No stock moves | "No movements" |
| Transaction list | No TXs | "No transactions found" |
| Report table | No data | "No data for this period" |

- [ ] None show a blank white space or a JavaScript error

---

### TC-2705 — Sidebar Navigation Active State

**Navigate to each section and verify**:
- [ ] Active sidebar item is highlighted when on that page
- [ ] `/supplier` → Suppliers highlighted
- [ ] `/transactions` → Transactions highlighted
- [ ] `/reports/profit-loss` → Reports highlighted
- [ ] No two items highlighted simultaneously

---

### TC-2706 — Browser Back/Forward Navigation

**Test**:
1. Go to `/supplier` → click S1 → go to `/supplier/detail/[S1_ID]`
2. Press browser Back → `/supplier` list loads
3. Press browser Forward → `/supplier/detail/[S1_ID]` loads again

- [ ] No full page reload required (Next.js client navigation)
- [ ] Data reloads correctly (not showing stale cached data)
- [ ] Scroll position on list page preserved or reset (note behavior)

---

### TC-2707 — Mobile Sidebar Toggle

**Resize browser to mobile width (< 768px)**:
- [ ] Sidebar collapses / hidden by default
- [ ] Hamburger menu / toggle button visible
- [ ] Tapping toggle opens sidebar
- [ ] Tapping outside sidebar closes it
- [ ] Body scroll locked when sidebar is open

---

### TC-2708 — Drawer Body Scroll Lock

**For any drawer (Add Supplier, Add Product, etc.)**:
- [ ] Open the drawer
- [ ] Try scrolling the page behind it
- [ ] Page behind should NOT scroll while drawer is open
- [ ] After closing drawer: page scrolls normally again

---

## Phase 8 Final System Consistency Check

This is the last check — a complete sweep of every entity's current state.

### TC-2801 — Full Entity Balance Sweep

Navigate to each page and record the displayed value. It must match the expected column.

| Page | What to Check | Expected | Actual | Pass? |
|------|--------------|----------|--------|-------|
| `/supplier/detail/[S1_ID]` | Current Balance | −PKR 2,200.00 | | |
| `/supplier/detail/[S2_ID]` | Current Balance | PKR 4,500.00 | | |
| `/customer/detail/[C1_ID]` | Current Balance | −PKR 6,000.00 | | |
| `/customer/detail/[C2_ID]` | Current Balance | −PKR 500.00 | | |
| `/products/detail/[P1_ID]` | P1-V1 Stock | 22 Meters | | |
| `/products/detail/[P1_ID]` | P1-V2 Stock | 0 Meters | | |
| `/products/detail/[P2_ID]` | P2-V1 Stock | 72 Kg | | |
| `/products/detail/[P2_ID]` | P2-V2 Stock | 45 Kg | | |
| `/payment-accounts/detail/[A1_ID]` | Balance | PKR 76,400.00 | | |
| `/payment-accounts/detail/[A2_ID]` | Balance | PKR 45,000.00 | | |
| `/payment-accounts/detail/[A3_ID]` | Balance | PKR 27,200.00 | | |
| `/` Dashboard | Cash & Bank | PKR 148,600.00 | | |
| `/` Dashboard | Receivables | PKR 0.00 | | |
| `/` Dashboard | Payables | PKR 4,500.00 | | |
| `/` Dashboard | Inventory | PKR 40,200.00 | | |
| `/reports/inventory-valuation` | Total | PKR 40,200.00 | | |
| `/reports/aged-payables` | Total | PKR 4,500.00 | | |
| `/reports/aged-receivables` | Total | PKR 0.00 | | |

**Any mismatch** = open a GitHub issue with:
- Which page showed the wrong value
- Expected vs actual
- Which transaction(s) likely caused the discrepancy
- Phase/TC reference

---

## GitHub Issue Priority Guide

Use this when deciding severity on issues found across all phases:

| Symptom | Severity |
|---------|---------|
| Balance wrong after posting | **Critical** |
| Stock wrong after posting | **Critical** |
| Trial balance not balanced (debits ≠ credits) | **Critical** |
| Two reports show different values for same metric | **Critical** |
| Can delete/edit a posted transaction | **Critical** |
| Can over-return (return more than sold/purchased) | **Critical** |
| Draft affects balance/stock before posting | **High** |
| Negative stock allowed | **High** |
| Credit balance displayed as positive (wrong sign) | **High** |
| Report date filter including out-of-range data | **High** |
| Inactive entity selectable in transaction forms | **Medium** |
| Skeleton loading missing (blank screen flash) | **Medium** |
| Currency format inconsistent | **Medium** |
| Active sidebar item not highlighted | **Low** |
| Typo in label | **Low** |

---

## Testing Curriculum Complete

| Phase | Document | Status |
|-------|----------|--------|
| 1 | PHASE_1_MASTER_DATA.md | [ ] |
| 2 | PHASE_2_PURCHASE_FLOW.md | [ ] |
| 3 | PHASE_3_SALE_FLOW.md | [ ] |
| 4 | PHASE_4_PAYMENT_FLOWS.md | [ ] |
| 5 | PHASE_5_RETURN_FLOWS.md | [ ] |
| 6 | PHASE_6_TRANSFERS_ADJUSTMENTS.md | [ ] |
| 7 | PHASE_7_REPORTS.md | [ ] |
| 8 | PHASE_8_CROSS_MODULE_CONSISTENCY.md | [ ] |
