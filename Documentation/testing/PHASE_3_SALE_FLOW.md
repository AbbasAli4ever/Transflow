# Phase 3 — Sale Flow
## Draft → Edit → Post → Verify All Side Effects

> **Goal**: Test the complete lifecycle of a Sale transaction.
> Verify that posting a sale correctly decreases product stock, increases customer balance,
> updates the ledger, open documents, dashboard receivables KPI, and reports.
>
> **Depends on**: Phase 1 (seed data) + Phase 2 (stock must exist from purchases).
>
> **Starting state** (from Phase 2 completion):
> | Entity | Balance |
> |--------|---------|
> | C1 (Ahmed Traders) | PKR 0.00 |
> | C2 (Zara Retail) | PKR 0.00 |
> | P1-V1 stock | 30 Meters |
> | P1-V2 stock | 5 Meters |
> | P2-V1 stock | 100 Kg |
> | P2-V2 stock | 50 Kg |
> | Dashboard Receivables | PKR 0.00 |

---

## Transaction TX-S1: Sale to C1 (Ahmed Traders — Fabric)

### TC-601 — Create Sale Draft

**Where**: `/transactions/new` → select "Sale" → goes to `/transactions/sale`

**Inputs**:
| Field | Value |
|-------|-------|
| Customer | `Ahmed Traders` (C1) |
| Transaction Date | `2026-03-10` |
| Delivery Fee | `300` |
| Delivery Type | `HOME_DELIVERY` (or as available) |
| Address | `Blue Area, Islamabad` |
| Notes | `First sale test` |

**Line Items**:
| # | Product/Variant | Qty | Unit Price | Discount |
|---|-----------------|-----|------------|---------|
| 1 | Premium Cloth → Small (S) (P1-V1) | `8` | `2,000` | `0` |
| 2 | Premium Cloth → Medium (P1-V2) | `3` | `2,200` | `0` |

**Calculated amounts** (verify in form):
- Line 1: `8 × 2,000 = PKR 16,000`
- Line 2: `3 × 2,200 = PKR 6,600`
- Subtotal: `PKR 22,600`
- Discount Total: `PKR 0`
- Delivery Fee: `PKR 300`
- **Total Amount: `PKR 22,900`**

**Action**: Click "Save as Draft"

**Expected — Draft state**:
- [ ] Status: **DRAFT**
- [ ] Type: SALE
- [ ] Customer: Ahmed Traders
- [ ] Total: PKR 22,900.00

**Expected — NO side effects yet**:
- [ ] C1 balance still **PKR 0.00** (`/customer/detail/[C1_ID]`)
- [ ] P1-V1 stock still **30** (`/products/detail/[P1_ID]`)
- [ ] P1-V2 stock still **5**
- [ ] Dashboard Receivables still **PKR 0.00**

**Record TX ID**: `TX-S1 ID = _______________`

---

### TC-602 — View Sale Draft in Transaction List

**Where**: `/transactions`

**Expected**:
- [ ] TX-S1 in list with status **DRAFT**, type SALE
- [ ] Customer: Ahmed Traders, Amount: PKR 22,900.00

**Filter tests**:
- Filter type = SALE → TX-S1 visible
- Filter type = PURCHASE → TX-S1 NOT visible
- Filter status = DRAFT → TX-S1 visible
- Filter status = POSTED → TX-S1 NOT visible

---

### TC-603 — Edit Draft: Add Discount

**Where**: `/transactions/detail/[TX-S1_ID]` → Edit

**Change**: Add a discount to Line 1

| # | Variant | Qty | Unit Price | Old Discount | New Discount |
|---|---------|-----|------------|-------------|-------------|
| 1 | P1-V1 | 8 | 2,000 | 0 | `500` |

**New calculated amounts**:
- Line 1: `(8 × 2,000) − 500 = PKR 15,500`
- Line 2: unchanged PKR 6,600
- Subtotal: `PKR 22,100`
- Delivery: `PKR 300`
- **New Total: `PKR 22,400`**

**Expected**:
- [ ] Total updates to PKR 22,400.00
- [ ] Discount Total shows PKR 500.00
- [ ] C1 balance still PKR 0.00 (still draft)

---

### TC-604 — POST the Sale (TX-S1)

**Where**: `/transactions/detail/[TX-S1_ID]` → click "Post"

**Action**: Confirm posting

**Expected — Transaction status**:
- [ ] Status changes to **POSTED**
- [ ] `postedAt` timestamp visible
- [ ] Document number assigned (e.g., `SAL-001`)

---

### TC-604a — Verify: Customer Balance Increased

**Where**: `/customer/detail/[C1_ID]`

**Expected**:
- [ ] Current Balance: **PKR 22,400.00** (was 0.00 → now owes us this amount)
- [ ] Balance card shows the new receivable

---

### TC-604b — Verify: Customer Ledger Entry

**Where**: `/customer/detail/[C1_ID]` → **Ledger tab**

**Expected**:
- [ ] One entry for TX-S1, dated 2026-03-10
- [ ] Type/Reference: SALE (or SAL-001)
- [ ] Amount: PKR 22,400.00 (debit against customer)
- [ ] Running balance: PKR 22,400.00

---

### TC-604c — Verify: Customer Open Documents

**Where**: `/customer/detail/[C1_ID]` → **Open Documents tab**

**Expected**:
- [ ] TX-S1 listed as an unpaid invoice
- [ ] Amount: PKR 22,400.00
- [ ] Paid: PKR 0.00
- [ ] Remaining: PKR 22,400.00

---

### TC-604d — Verify: Product Stock Decreased

**Where**: `/products/detail/[P1_ID]`

**Expected — Stock cards**:
- [ ] P1-V1 (Small S): **22 Meters** (was 30, sold 8 → 30 − 8 = 22)
- [ ] P1-V2 (Medium): **2 Meters** (was 5, sold 3 → 5 − 3 = 2)
- [ ] Total Stock: **24 Meters** (was 35)

**Expected — Avg Cost**:
- [ ] Avg cost should NOT change from sales (cost is set at purchase time)
- [ ] P1-V1 Avg Cost: still **PKR 1,500.00**
- [ ] P1-V2 Avg Cost: still **PKR 1,100.00**

---

### TC-604e — Verify: Product Stock Movements

**Where**: `/products/detail/[P1_ID]` → **Movements tab**

**Expected**:
- [ ] New movement: type **SALE_OUT** (or equivalent), date 2026-03-10
- [ ] P1-V1 entry: Qty −8
- [ ] P1-V2 entry: Qty −3
- [ ] Previous PURCHASE_IN entries still visible
- [ ] Movements sorted newest first (or chronologically — note the order)
- [ ] Running stock shown correctly per entry

---

### TC-604f — Verify: Transaction in Global List

**Where**: `/transactions`

**Expected**:
- [ ] TX-S1 now shows **POSTED**
- [ ] Filter status = POSTED → TX-S1 visible alongside TX-P1, TX-P2, TX-P3

---

### TC-604g — Verify: Dashboard Receivables KPI

**Where**: `/` (Dashboard)

**Expected**:
- [ ] "Total Receivables" KPI: **PKR 22,400.00** (was 0.00)
- [ ] Customer count in receivables: 1
- [ ] Payables KPI: still PKR 61,000.00 (unaffected)

---

### TC-604h — Verify: Dashboard Cash & Bank (No Change)

**Expected**:
- [ ] Cash & Bank still **PKR 170,000.00** (sale doesn't affect cash unless paid upfront)

---

## Transaction TX-S2: Sale to C1 with Discount (Accumulation Test)

### TC-605 — Create and Post Second Sale to C1

**Where**: `/transactions/sale`

**Inputs**:
| Field | Value |
|-------|-------|
| Customer | `Ahmed Traders` (C1) |
| Transaction Date | `2026-03-12` |
| Delivery Fee | `0` |

**Line Items**:
| # | Variant | Qty | Unit Price | Discount |
|---|---------|-----|------------|---------|
| 1 | P1-V1 (Small S) | `5` | `2,000` | `0` |

**Total**: `5 × 2,000 = PKR 10,000`

**Action**: Save Draft → Post

**Record TX ID**: `TX-S2 ID = _______________`

---

### TC-605a — Verify: C1 Cumulative Balance

**Where**: `/customer/detail/[C1_ID]`

**Expected**:
- [ ] Current Balance: **PKR 32,400.00** (22,400 + 10,000)

---

### TC-605b — Verify: P1-V1 Stock after 2 Sales

**Where**: `/products/detail/[P1_ID]`

**Expected**:
- [ ] P1-V1: **17 Meters** (30 − 8 − 5 = 17)
- [ ] P1-V2: **2 Meters** (unchanged from TX-S2)

---

### TC-605c — Verify: Customer Ledger (2 entries)

**Where**: `/customer/detail/[C1_ID]` → Ledger tab

**Expected**:
- [ ] 2 entries total
- [ ] Entry 1: 2026-03-10, PKR 22,400.00, running balance 22,400
- [ ] Entry 2: 2026-03-12, PKR 10,000.00, running balance 32,400

---

### TC-605d — Verify: Customer Open Documents (2 invoices)

**Where**: `/customer/detail/[C1_ID]` → Open Documents tab

**Expected**:
- [ ] TX-S1: PKR 22,400.00 remaining
- [ ] TX-S2: PKR 10,000.00 remaining
- [ ] Total outstanding: PKR 32,400.00

---

## Transaction TX-S3: Sale to C2 (Isolation Test)

### TC-606 — Create and Post Sale to C2

**Where**: `/transactions/sale`

**Inputs**:
| Field | Value |
|-------|-------|
| Customer | `Zara Retail` (C2) |
| Transaction Date | `2026-03-13` |
| Delivery Fee | `200` |

**Line Items**:
| # | Variant | Qty | Unit Price |
|---|---------|-----|------------|
| 1 | Steel Rod → 6mm (P2-V1) | `20` | `100` |

**Total**: `(20 × 100) + 200 = PKR 2,200`

**Action**: Save Draft → Post

**Record TX ID**: `TX-S3 ID = _______________`

---

### TC-606a — Verify: C2 Balance (separate from C1)

**Where**: `/customer/detail/[C2_ID]`

**Expected**:
- [ ] C2 balance: **PKR 2,200.00**
- [ ] C1 balance: still **PKR 32,400.00** (unaffected)

---

### TC-606b — Verify: P2 Stock

**Where**: `/products/detail/[P2_ID]`

**Expected**:
- [ ] P2-V1 (6mm): **80 Kg** (was 100, sold 20 → 100 − 20 = 80)
- [ ] P2-V2 (12mm): **50 Kg** (unchanged)

---

### TC-606c — Verify: Dashboard Receivables (both customers)

**Where**: `/` (Dashboard)

**Expected**:
- [ ] Total Receivables: **PKR 34,600.00** (32,400 + 2,200)
- [ ] Customer count: 2

---

## Oversell Test (TC-607)

### TC-607 — Attempt to Sell More Than Available Stock

**Where**: `/transactions/sale`

**Inputs**:
| Field | Value |
|-------|-------|
| Customer | C1 |
| Transaction Date | `2026-03-14` |

**Line Items**:
| # | Variant | Qty | Unit Price |
|---|---------|-----|------------|
| 1 | P1-V2 (Medium) | `999` | `2,200` |

> Available stock of P1-V2 is only **2 Meters**.

**Test A — Save as Draft**:
- [ ] Does the system allow saving the draft? (Note the behavior — many systems allow oversell drafts)

**Test B — Post**:
- [ ] Does the system block posting? Expected: error message "Insufficient stock" or equivalent
- [ ] If posting is blocked: P1-V2 stock remains unchanged at 2

**Test C — If posting is allowed**:
- [ ] Note as a potential bug — negative stock should typically be blocked
- [ ] Check P1-V2 stock after posting: negative value would be a bug

> **If this results in an error, log a GitHub issue.** Either behavior (block at draft vs block at post vs allow negative) is worth documenting.

**Cleanup**: Delete the draft if it wasn't posted.

---

## Sale with Zero Stock (TC-608)

### TC-608 — Attempt Sale on Product With No Stock

**Where**: `/transactions/sale`

**Inputs**:
| Line | Variant | Qty |
|------|---------|-----|
| 1 | P2-V2 (12mm) | `1` |

> P2-V2 has 50 in stock — this is fine. Instead, try a variant that has 0 stock.
> Use any variant that currently has 0 stock (if one exists), or reduce stock via adjustment first.

**If no zero-stock variant exists**: Skip this test until Phase 6 (Stock Adjustment).

---

## Reports Spot-Check (Phase 3)

### TC-609 — Aged Receivables Report

**Where**: `/reports/aged-receivables`

**Set date**: `2026-03-14`

**Expected**:
- [ ] C1 (Ahmed Traders) row: PKR 32,400.00
- [ ] C2 (Zara Retail) row: PKR 2,200.00
- [ ] Total: PKR 34,600.00
- [ ] TX-S1 and TX-S2 listed under C1
- [ ] TX-S3 listed under C2
- [ ] All invoices in "0–30 days" bucket (all recent)

---

### TC-610 — Inventory Valuation Post-Sales

**Where**: `/reports/inventory-valuation`

**Set date**: `2026-03-14`

**Expected**:
- [ ] P1-V1: Qty 17, Cost PKR 1,500 → Value PKR 25,500
- [ ] P1-V2: Qty 2, Cost PKR 1,100 → Value PKR 2,200
- [ ] P2-V1: Qty 80, Cost PKR 50 → Value PKR 4,000
- [ ] P2-V2: Qty 50, Cost PKR 80 → Value PKR 4,000
- [ ] Total: **PKR 35,700.00** (down from PKR 59,500 after sales)

---

### TC-611 — Profit & Loss Report

**Where**: `/reports/profit-loss`

**Date range**: `2026-03-01` to `2026-03-14`

**Expected**:
- [ ] Revenue line includes sales from TX-S1, TX-S2, TX-S3
- [ ] Total Revenue: PKR 34,600.00 (22,400 + 10,000 + 2,200)
- [ ] COGS reflected (based on avg cost at time of sale)
- [ ] Gross Profit = Revenue − COGS > 0 (we sold above cost)

---

### TC-612 — Trial Balance

**Where**: `/reports/trial-balance`

**Set date**: `2026-03-14`

**Expected**:
- [ ] Accounts Receivable: Debit balance ~ PKR 34,600 (C1 + C2 outstanding)
- [ ] Accounts Payable: Credit balance ~ PKR 61,000 (S1 + S2 outstanding)
- [ ] Inventory: Debit balance ~ PKR 35,700 (current stock value)
- [ ] Debits = Credits (balanced)

---

## Phase 3 Completion State

| Entity | Balance After Phase 3 |
|--------|-----------------------|
| S1 (Karachi Fabrics) | PKR 51,000.00 (unchanged) |
| S2 (Punjab Steel Works) | PKR 10,000.00 (unchanged) |
| C1 (Ahmed Traders) | **PKR 32,400.00** |
| C2 (Zara Retail) | **PKR 2,200.00** |
| P1-V1 stock | **17 Meters** |
| P1-V2 stock | **2 Meters** |
| P2-V1 stock | **80 Kg** |
| P2-V2 stock | **50 Kg** (unchanged) |
| A1 (HBL Main) | PKR 100,000.00 (unchanged) |
| A2 (Cash Box) | PKR 50,000.00 (unchanged) |
| A3 (JazzCash) | PKR 20,000.00 (unchanged) |
| Dashboard Receivables | **PKR 34,600.00** |
| Dashboard Payables | PKR 61,000.00 (unchanged) |

---

**→ Next: [PHASE_4_PAYMENT_FLOWS.md](./PHASE_4_PAYMENT_FLOWS.md)**
