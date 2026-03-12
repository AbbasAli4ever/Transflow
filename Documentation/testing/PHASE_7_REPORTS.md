# Phase 7 — Reports Validation
## Profit & Loss · Aged Receivables · Aged Payables · Trial Balance · Inventory Valuation

> **Goal**: Validate all 5 reports against known data from Phases 2–6.
> Every expected value here is calculated from the cumulative transaction log.
> Run these after completing Phases 2–6. Any mismatch between a report figure
> and the expected value below is a reportable bug.
>
> **Depends on**: All prior phases (1–6) fully completed.
> **Reference date for all "as of" reports**: `2026-03-29` (after last adjustment TX-ADJ3).
> **P&L date range**: `2026-03-01` to `2026-03-29`.

---

## Cumulative Expected State Reference

Before running reports, verify these numbers match your recorded values.
If they don't, your prior phase had a bug — fix it before continuing here.

### Stock on Hand (as of 2026-03-29)
| Variant | Qty | Avg Cost | Value |
|---------|-----|----------|-------|
| P1-V1 (Small S) | 22 Meters | PKR 1,500 | PKR 33,000 |
| P1-V2 (Medium) | 0 Meters | PKR 1,100 | PKR 0 |
| P2-V1 (6mm) | 72 Kg | PKR 50 | PKR 3,600 |
| P2-V2 (12mm) | 45 Kg | PKR 80 | PKR 3,600 |
| **Total** | | | **PKR 40,200** |

### Balance Sheet Positions
| Entity | Balance | Meaning |
|--------|---------|---------|
| S1 (Karachi Fabrics) | −PKR 2,200 | Supplier has credit (owes us) |
| S2 (Punjab Steel Works) | PKR 4,500 | We owe them |
| C1 (Ahmed Traders) | −PKR 6,000 | We owe customer (credit note) |
| C2 (Zara Retail) | −PKR 500 | We owe customer (credit note) |
| A1 HBL Main | PKR 76,400 | |
| A2 Cash Box | PKR 45,000 | |
| A3 JazzCash | PKR 27,200 | |
| **Total Cash** | **PKR 148,600** | |

---

## Report 1: Inventory Valuation

**Where**: `/reports/inventory-valuation`

### TC-1301 — Standard Valuation (as of 2026-03-29)

**Set date**: `2026-03-29`

**Expected table**:
| Product | Variant | Qty | Unit Cost | Total Value |
|---------|---------|-----|-----------|-------------|
| Premium Cloth | Small (S) — P1-V1 | 22 | PKR 1,500.00 | PKR 33,000.00 |
| Premium Cloth | Medium — P1-V2 | 0 | PKR 1,100.00 | PKR 0.00 |
| Steel Rod | 6mm — P2-V1 | 72 | PKR 50.00 | PKR 3,600.00 |
| Steel Rod | 12mm — P2-V2 | 45 | PKR 80.00 | PKR 3,600.00 |
| **Total** | | | | **PKR 40,200.00** |

**Checks**:
- [ ] Total matches **PKR 40,200.00**
- [ ] P1-V2 shows 0 qty (not hidden — zero-stock items should still appear with their cost)
- [ ] All 4 variants present, none missing
- [ ] Avg Cost column uses purchase cost, not sale price
- [ ] Values are correctly multiplied (qty × avg cost)

---

### TC-1302 — Valuation at Earlier Date (Point-in-Time)

**Set date**: `2026-03-10` (after Phase 2 purchases, before any sales)

**Expected**:
| Variant | Qty at 2026-03-10 | Value |
|---------|--------------------|-------|
| P1-V1 | 30 | PKR 45,000 |
| P1-V2 | 5 | PKR 5,500 |
| P2-V1 | 100 | PKR 5,000 |
| P2-V2 | 50 | PKR 4,000 |
| **Total** | | **PKR 59,500.00** |

- [ ] Report correctly shows historical stock (not current stock)
- [ ] This is the key test for point-in-time accuracy — if it shows current stock on a past date, that is a critical bug

---

### TC-1303 — Valuation Before Any Transactions

**Set date**: `2026-02-28` (before any purchases)

**Expected**:
- [ ] All quantities: 0
- [ ] Total value: **PKR 0.00**
- [ ] Products still appear in the list (with zero values) OR report is empty — note behavior

---

### TC-1304 — Valuation Export / Print (if available)

- [ ] Export button (CSV/PDF) present
- [ ] Exported data matches on-screen values
- [ ] Date used for export matches the selected date

---

## Report 2: Profit & Loss

**Where**: `/reports/profit-loss`

> **How P&L is derived**:
> Revenue = Sum of sale amounts (including delivery fees collected) − Customer returns
> COGS = Sum of (qty sold × avg cost at time of sale) − cost of customer-returned goods
> Gross Profit = Revenue − COGS
>
> Delivery fees on purchases are typically added to inventory cost (not a direct expense).
> Stock write-offs (ADJUSTMENT_OUT) typically appear as an operating expense or COGS adjustment.

### TC-1401 — Full Period P&L (2026-03-01 to 2026-03-29)

**Set date range**: From `2026-03-01` To `2026-03-29`

**Revenue calculation**:
| TX | Sale Amount | Note |
|----|------------|------|
| TX-S1 | PKR 22,400 | After discount |
| TX-S2 | PKR 10,000 | |
| TX-S3 | PKR 2,200 | |
| TX-CR1 | −PKR 6,000 | Customer return (revenue reversal) |
| TX-CR2 | −PKR 500 | Customer return |
| **Net Revenue** | **PKR 28,100** | |

**COGS calculation** (at avg cost):
| TX | Variant | Qty | Cost | COGS |
|----|---------|-----|------|------|
| TX-S1 | P1-V1 | 8 | 1,500 | 12,000 |
| TX-S1 | P1-V2 | 3 | 1,100 | 3,300 |
| TX-S2 | P1-V1 | 5 | 1,500 | 7,500 |
| TX-S3 | P2-V1 | 20 | 50 | 1,000 |
| TX-CR1 | P1-V1 | −3 | 1,500 | −4,500 |
| TX-CR2 | P2-V1 | −5 | 50 | −250 |
| **Net COGS** | | | | **PKR 19,050** |

**Gross Profit**: `28,100 − 19,050 = PKR 9,050`

**Other items** (may appear in P&L depending on backend design):
| Item | Amount | Source |
|------|--------|--------|
| Delivery Fees Collected | PKR 500 (S1) + PKR 200 (S3) = PKR 700 | May be in revenue or separate |
| Stock Write-off | TX-ADJ2: PKR 400, TX-ADJ3 OUT: 3×50=PKR 150 → PKR 550 | Operating expense or COGS |

**Expected P&L structure**:
```
Revenue
  Sales                         PKR 34,600
  Less: Returns                −PKR 6,500
  Net Revenue                  PKR 28,100

Cost of Goods Sold
  Opening Stock (at 2026-03-01) PKR 0
  Purchases                     PKR 61,000 (TX-P1+P2+P3)
  Less: Returns to Supplier    −PKR 2,700 (TX-SR1 PKR 500 + TX-SR2 PKR 2,200)
  Less: Closing Stock          −PKR 40,200
  Net COGS                     ≈ PKR 18,100 (may vary by delivery fee treatment)

Gross Profit                   ≈ PKR 10,000

Operating Expenses
  Stock Write-offs              PKR 550 (if treated as expense)

Net Profit                     ≈ PKR 9,450
```

> **Note**: Exact COGS figure depends on whether delivery fees on purchases are capitalized
> into inventory cost or expensed directly. Both are valid — note what the system does.

**Checks**:
- [ ] Revenue section shows gross sales and returns separately (not just net)
- [ ] Gross profit is **positive** (we sold above cost)
- [ ] Net Revenue line: ≈ **PKR 28,100**
- [ ] Total Purchases value visible: PKR 61,000
- [ ] Supplier returns visible as deduction: PKR 2,700
- [ ] P&L balances (no phantom numbers)

---

### TC-1402 — Narrow Date Range (Only March 10–14)

**Set date range**: `2026-03-10` to `2026-03-14` (TX-S1, TX-S2, TX-S3 only — no returns)

**Expected**:
- [ ] Revenue: **PKR 34,600** (22,400 + 10,000 + 2,200)
- [ ] No customer returns in this period
- [ ] Purchases within this range: PKR 0 (all purchases were before March 10)
- [ ] Report only shows transactions within the selected range

---

### TC-1403 — Date Range With No Transactions

**Set date range**: `2026-02-01` to `2026-02-28`

**Expected**:
- [ ] Revenue: PKR 0.00
- [ ] COGS: PKR 0.00
- [ ] Net Profit: PKR 0.00
- [ ] Report shows empty state gracefully (no crash, no NaN values)

---

### TC-1404 — Date Range: Single Day

**Set date range**: `2026-03-01` to `2026-03-01` (only TX-P1 on this day)

**Expected**:
- [ ] Report includes TX-P1 as a purchase
- [ ] No sales on this date → Revenue: PKR 0.00
- [ ] Only data from exactly 2026-03-01 appears

---

## Report 3: Aged Receivables

**Where**: `/reports/aged-receivables`

> Shows outstanding customer invoices grouped by age buckets (0–30, 31–60, 61–90, 90+ days).
> As of 2026-03-29, all customer invoices are either paid or have credit balances.
> This report tests correct handling of zero and negative balances.

### TC-1501 — Aged Receivables as of 2026-03-29

**Set date**: `2026-03-29`

**Expected**:
- [ ] C1 (Ahmed Traders): PKR 0 outstanding (or shows −PKR 6,000 credit if credits are included)
- [ ] C2 (Zara Retail): PKR 0 outstanding (or shows −PKR 500 credit)
- [ ] Total Outstanding: **PKR 0.00** (all invoices collected)

---

### TC-1502 — Aged Receivables at Peak (2026-03-14)

**Set date**: `2026-03-14` (after all sales, before any payments)

**Expected**:
| Customer | 0–30 days | 31–60 days | 61–90 days | Total |
|---------|-----------|-----------|-----------|-------|
| C1 Ahmed Traders | PKR 32,400 | — | — | PKR 32,400 |
| C2 Zara Retail | PKR 2,200 | — | — | PKR 2,200 |
| **Total** | **PKR 34,600** | — | — | **PKR 34,600** |

- [ ] Both customers in "0–30 days" bucket (all invoices are recent)
- [ ] Total: **PKR 34,600.00**
- [ ] TX-S1 (PKR 22,400) and TX-S2 (PKR 10,000) listed under C1
- [ ] TX-S3 (PKR 2,200) listed under C2

---

### TC-1503 — Invoice Age Bucketing

**Set date far in future**: `2026-04-30` (32 days after TX-S1 dated 2026-03-10, but assuming payments not yet made)

> This test requires re-running without the payments, OR running on fresh data.
> Skip if environment doesn't support it — flag as "not testable in current state."

**Purpose**: Verify that an invoice dated 2026-03-10 moves to the "31–60 days" bucket
when the as-of date is 2026-04-30 (41 days later).

---

### TC-1504 — Customer with No Invoices

- [ ] Customers with zero balance don't appear, OR appear with PKR 0.00 — note behavior
- [ ] No crash or empty row with undefined values

---

## Report 4: Aged Payables

**Where**: `/reports/aged-payables`

### TC-1601 — Aged Payables as of 2026-03-29

**Set date**: `2026-03-29`

**Expected**:
| Supplier | 0–30 days | Total |
|---------|-----------|-------|
| S2 Punjab Steel | PKR 4,500 | PKR 4,500 |

- [ ] S1 (Karachi Fabrics): not shown (credit balance, nothing owed)
- [ ] S2: **PKR 4,500.00** in 0–30 days bucket
- [ ] Total: **PKR 4,500.00**

---

### TC-1602 — Aged Payables at Peak (2026-03-09)

**Set date**: `2026-03-09` (after all 3 purchases, before any payments)

**Expected**:
| Supplier | Amount |
|---------|--------|
| S1 Karachi Fabrics | PKR 51,000 |
| S2 Punjab Steel | PKR 10,000 |
| **Total** | **PKR 61,000** |

- [ ] Both suppliers in "0–30 days" bucket
- [ ] TX-P1 (PKR 21,000) and TX-P2 (PKR 30,000) under S1
- [ ] TX-P3 (PKR 10,000) under S2

---

### TC-1603 — Payables Before Any Purchases

**Set date**: `2026-02-28`

**Expected**:
- [ ] No rows, total PKR 0.00
- [ ] Empty state shown without errors

---

### TC-1604 — S1 Credit Balance Handling

**Set date**: `2026-03-29`

**Expected**:
- [ ] S1 with −PKR 2,200 should either:
  - Not appear in payables (correct — we owe them nothing, they owe us)
  - OR appear with a note "Credit Balance" — acceptable
- [ ] S1 should NOT appear as PKR 2,200 owed (that would be wrong direction)
- [ ] If S1 appears as positive PKR 2,200 in payables: log as critical bug

---

## Report 5: Trial Balance

**Where**: `/reports/trial-balance`

> The Trial Balance lists every GL account with its debit or credit balance.
> Total debits MUST equal total credits. Any imbalance = critical backend bug.

### TC-1701 — Trial Balance as of 2026-03-29

**Set date**: `2026-03-29`

**Expected account balances** (approximate — exact figures depend on backend GL structure):

| Account | Expected Balance | Side |
|---------|-----------------|------|
| Cash — HBL Main | PKR 76,400 | Debit |
| Cash — Cash Box | PKR 45,000 | Debit |
| Cash — JazzCash | PKR 27,200 | Debit |
| Inventory | PKR 40,200 | Debit |
| Accounts Receivable | PKR 0 (or −6,500 credit) | Debit / Credit |
| Accounts Payable | PKR 2,300 net credit (4,500 − 2,200) | Credit |
| Revenue | ≈ PKR 28,100 | Credit |
| COGS | ≈ PKR 18,100–19,050 | Debit |
| Opening Balances | PKR 170,000 (A1+A2+A3 opening) | Credit |

**Key check — Debits = Credits**:
- [ ] Sum of all Debit balances = Sum of all Credit balances
- [ ] If imbalance exists: critical bug — log immediately with the difference amount

**Other checks**:
- [ ] Each payment account appears as a separate line (not lumped together)
- [ ] Inventory line matches inventory valuation report total
- [ ] No account shows NaN, undefined, or blank balance

---

### TC-1702 — Trial Balance at Earlier Date (2026-03-01)

**Set date**: `2026-03-01` (only TX-P1 exists)

**Expected (approximate)**:
| Account | Balance |
|---------|---------|
| Inventory | PKR 21,000 (from TX-P1, excluding delivery — or PKR 21,000 + delivery) |
| Accounts Payable — S1 | PKR 21,000 |
| All Cash Accounts | PKR 170,000 (opening, no payments yet) |

- [ ] Debits = Credits at this date too
- [ ] Only accounts with activity on/before 2026-03-01 appear (or appear with zero for earlier dates)

---

### TC-1703 — Trial Balance Before Any Transactions

**Set date**: `2026-02-28`

**Expected**:
- [ ] Only opening balance accounts appear
- [ ] Cash accounts: A1 PKR 100,000, A2 PKR 50,000, A3 PKR 20,000
- [ ] Opening equity/capital = PKR 170,000 (balancing entry)
- [ ] Debits = Credits: **PKR 170,000 = PKR 170,000**

---

### TC-1704 — Verify Trial Balance Links to Source Transactions (if applicable)

- [ ] Clicking an account line (if drilldown exists) opens the transactions for that account
- [ ] Amounts are traceable back to individual transactions

---

## Cross-Report Consistency Checks

> These checks verify that multiple reports agree with each other.
> A figure that appears in two reports must be the same number.

### TC-1801 — Inventory Valuation = Trial Balance Inventory

**Set date**: `2026-03-29`

- [ ] Inventory Valuation total: **PKR 40,200**
- [ ] Trial Balance "Inventory" account: must also show **PKR 40,200**
- [ ] If they differ: log as critical bug with both values

---

### TC-1802 — Aged Receivables Total = Trial Balance AR

**Set date**: `2026-03-29`

- [ ] Aged Receivables total outstanding: PKR 0 (all collected)
- [ ] Trial Balance "Accounts Receivable": should also show PKR 0 (or net credit of −6,500)
- [ ] Both reports must agree

---

### TC-1803 — Aged Payables Total = Trial Balance AP

**Set date**: `2026-03-29`

- [ ] Aged Payables total: PKR 4,500 (S2 remaining)
- [ ] Trial Balance "Accounts Payable" net: PKR 2,300 (4,500 − 2,200 S1 credit)
- [ ] If Aged Payables excludes credit suppliers, it shows PKR 4,500 — note which one
  the system uses

---

### TC-1804 — P&L Gross Profit vs Inventory Change

**Verification** (manual cross-check):
- Opening inventory (2026-03-01): PKR 0
- Purchases: PKR 61,000
- Supplier returns: −PKR 2,700
- Closing inventory (2026-03-29): PKR 40,200
- **COGS by formula**: 0 + 61,000 − 2,700 − 40,200 = **PKR 18,100**

- [ ] P&L COGS line is approximately PKR 18,100 (±delivery fee treatment)
- [ ] If P&L shows a wildly different COGS, log with actual value

---

## Report UI & UX Checks

### TC-1901 — Date Picker Validation

**For all reports**:
- [ ] From date cannot be set after To date (for range-based reports)
- [ ] System shows error or swaps dates if invalid range entered
- [ ] Future date can be selected (useful for planning) — note if blocked

---

### TC-1902 — Report Loading State

- [ ] Skeleton or spinner shown while report loads
- [ ] No flash of empty/wrong data before real data arrives
- [ ] If API takes long: loading indicator persists (not stuck on old data)

---

### TC-1903 — Empty Report State

- [ ] When no data in range: shows "No data for this period" (not a blank screen or error)
- [ ] PKR 0.00 shown for totals (not NaN, undefined, or blank)

---

### TC-1904 — Large Number Formatting

- [ ] Numbers use PKR + comma formatting: `PKR 148,600.00` not `148600`
- [ ] Consistent across all 5 reports
- [ ] Negative numbers shown clearly: `−PKR 6,000` or `(PKR 6,000)` — not just `6000`

---

### TC-1905 — Report Refresh

- [ ] After posting a new transaction, returning to a report and changing the date
  (or clicking refresh) shows updated data
- [ ] Old data does not persist after navigating away and back

---

## Phase 7 Completion Checklist

| Report | TC Range | Status |
|--------|----------|--------|
| Inventory Valuation | TC-1301 to TC-1304 | [ ] |
| Profit & Loss | TC-1401 to TC-1404 | [ ] |
| Aged Receivables | TC-1501 to TC-1504 | [ ] |
| Aged Payables | TC-1601 to TC-1604 | [ ] |
| Trial Balance | TC-1701 to TC-1704 | [ ] |
| Cross-Report Consistency | TC-1801 to TC-1804 | [ ] |
| UI & UX | TC-1901 to TC-1905 | [ ] |

---

**→ Next: [PHASE_8_CROSS_MODULE_CONSISTENCY.md](./PHASE_8_CROSS_MODULE_CONSISTENCY.md)**
