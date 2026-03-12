# Phase 2 — Purchase Flow
## Draft → Edit → Post → Verify All Side Effects

> **Goal**: Test the complete lifecycle of a Purchase transaction.
> Verify that posting a purchase correctly updates supplier balance, product stock,
> the transaction list, ledger, dashboard KPIs, and reports.
>
> **Depends on**: Phase 1 (all seed data must exist with recorded IDs).
>
> **Starting state** (from Phase 1 completion):
> - S1 balance: PKR 0.00
> - P1-V1 stock: 0 Meters
> - P1-V2 stock: 0 Meters
> - A1 balance: PKR 100,000.00

---

## Transaction TX-P1: Purchase from S1 (Fabric)

### TC-501 — Create Purchase Draft

**Where**: `/transactions/new` → select "Purchase" → goes to `/transactions/purchase`

**Inputs**:
| Field | Value |
|-------|-------|
| Supplier | `Karachi Fabrics Ltd` (S1) |
| Transaction Date | `2026-03-01` |
| Delivery Fee | `500` |
| Notes | `First purchase test` |

**Line Items**:
| # | Product/Variant | Qty | Unit Cost | Discount |
|---|-----------------|-----|-----------|---------|
| 1 | Premium Cloth → Small (S) (P1-V1) | `10` | `1,000` | `0` |
| 2 | Premium Cloth → Medium (P1-V2) | `5` | `1,100` | `0` |

**Calculated amounts** (verify these appear in the form):
- Line 1 subtotal: `10 × 1,000 = PKR 10,000`
- Line 2 subtotal: `5 × 1,100 = PKR 5,500`
- Subtotal: `PKR 15,500`
- Discount Total: `PKR 0`
- Delivery Fee: `PKR 500`
- **Total Amount: `PKR 16,000`**

**Action**: Click "Save as Draft" (NOT Post yet)

**Expected — Transaction saved as DRAFT**:
- [ ] Redirected to transaction detail page (or draft confirmation)
- [ ] Status badge: **DRAFT**
- [ ] Document number may be empty or assigned
- [ ] Type: PURCHASE
- [ ] Supplier: Karachi Fabrics Ltd
- [ ] Total Amount: PKR 16,000.00

**Expected — NO side effects yet (draft is not posted)**:
- [ ] S1 balance still **PKR 0.00** (go check `/supplier/detail/[S1_ID]`)
- [ ] P1-V1 stock still **0** (go check `/products/detail/[P1_ID]` → Movements tab)
- [ ] P1-V2 stock still **0**
- [ ] Dashboard payables: unchanged from Phase 1

**Record TX ID**: `TX-P1 ID = _______________`

---

### TC-502 — View Draft in Transaction List

**Where**: `/transactions`

**Expected**:
- [ ] TX-P1 appears in list with status **DRAFT**
- [ ] Type: PURCHASE
- [ ] Supplier: Karachi Fabrics Ltd
- [ ] Amount: PKR 16,000.00
- [ ] Date: 2026-03-01

**Filter tests**:
- Filter by type = PURCHASE → TX-P1 visible
- Filter by status = DRAFT → TX-P1 visible
- Filter by status = POSTED → TX-P1 NOT visible

---

### TC-503 — Edit Draft Before Posting

**Where**: `/transactions/detail/[TX-P1_ID]` → Edit

**Change**: Add 500 to Line 1 unit cost (from 1,000 to 1,500)

| # | Variant | Qty | Old Cost | New Cost |
|---|---------|-----|----------|----------|
| 1 | P1-V1 | 10 | 1,000 | `1,500` |

**New calculated amounts**:
- Line 1: `10 × 1,500 = PKR 15,000`
- Line 2: `5 × 1,100 = PKR 5,500`
- Subtotal: `PKR 20,500`
- Delivery: `PKR 500`
- **New Total: `PKR 21,000`**

**Expected**:
- [ ] Total Amount on draft updates to PKR 21,000.00
- [ ] S1 balance still PKR 0.00 (not posted yet)
- [ ] Stock still 0

---

### TC-504 — POST the Purchase (TX-P1)

**Where**: `/transactions/detail/[TX-P1_ID]` → click "Post" button

**Action**: Confirm posting

**Expected — Transaction status**:
- [ ] Status changes from DRAFT → **POSTED**
- [ ] `postedAt` timestamp visible
- [ ] Document number assigned (e.g., `PUR-001`)

---

### TC-504a — Verify: Supplier Balance Updated

**Where**: `/supplier/detail/[S1_ID]`

**Expected**:
- [ ] Current Balance: **PKR 21,000.00** (was 0.00, now owes 21,000)
- [ ] Balance card shows the increase

---

### TC-504b — Verify: Supplier Ledger Entry

**Where**: `/supplier/detail/[S1_ID]` → **Ledger tab**

**Expected**:
- [ ] One entry visible for TX-P1 dated 2026-03-01
- [ ] Type/Reference: PURCHASE (or document number PUR-001)
- [ ] Amount: PKR 21,000.00 (debit/credit appropriately shown)
- [ ] Running balance: PKR 21,000.00

---

### TC-504c — Verify: Supplier Open Documents

**Where**: `/supplier/detail/[S1_ID]` → **Open Documents tab**

**Expected**:
- [ ] TX-P1 appears as an unpaid invoice
- [ ] Amount: PKR 21,000.00
- [ ] Paid: PKR 0.00
- [ ] Remaining: PKR 21,000.00

---

### TC-504d — Verify: Product Stock Increased

**Where**: `/products/detail/[P1_ID]`

**Expected — Stock cards**:
- [ ] Total Stock: **15 Meters** (10 + 5)
- [ ] P1-V1 (Small S) stock: **10**
- [ ] P1-V2 (Medium) stock: **5**

**Expected — Avg Cost updated**:
- [ ] P1-V1 Avg Cost: **PKR 1,500.00** (purchased at 1,500)
- [ ] P1-V2 Avg Cost: **PKR 1,100.00**
- [ ] Product-level Avg Cost: weighted average of both

---

### TC-504e — Verify: Product Stock Movements

**Where**: `/products/detail/[P1_ID]` → **Movements tab**

**Expected**:
- [ ] One movement entry: type `PURCHASE_IN` (or equivalent)
- [ ] Variant: P1-V1, Qty: +10, Date: 2026-03-01
- [ ] Another entry: P1-V2, Qty: +5, Date: 2026-03-01
- [ ] Unit cost visible in movement
- [ ] Reference links back to TX-P1

---

### TC-504f — Verify: Transaction Appears in Global List

**Where**: `/transactions`

**Expected**:
- [ ] TX-P1 now shows status **POSTED**
- [ ] Filter by status = POSTED → TX-P1 visible
- [ ] Filter by status = DRAFT → TX-P1 NOT visible

---

### TC-504g — Verify: Dashboard Payables KPI

**Where**: `/` (Dashboard)

**Expected**:
- [ ] "Total Payables" KPI: **PKR 21,000.00** (was 0)
- [ ] Supplier count in payables: 1

---

### TC-504h — Verify: Dashboard Cash & Bank (No Change)

**Where**: `/` (Dashboard)

**Expected**:
- [ ] Cash & Bank total still **PKR 170,000.00** (purchase doesn't affect cash unless paid upfront)

---

## Transaction TX-P2: Second Purchase from S1 (to Test Accumulation)

### TC-505 — Create and Post Second Purchase

**Where**: `/transactions/purchase`

**Inputs**:
| Field | Value |
|-------|-------|
| Supplier | `Karachi Fabrics Ltd` (S1) |
| Transaction Date | `2026-03-05` |
| Delivery Fee | `0` |

**Line Items**:
| # | Variant | Qty | Unit Cost |
|---|---------|-----|-----------|
| 1 | P1-V1 (Small S) | `20` | `1,500` |

**Total**: `20 × 1,500 = PKR 30,000`

**Action**: Save as Draft → Post immediately

**Record TX ID**: `TX-P2 ID = _______________`

---

### TC-505a — Verify: Cumulative Supplier Balance

**Where**: `/supplier/detail/[S1_ID]`

**Expected**:
- [ ] Current Balance: **PKR 51,000.00** (21,000 + 30,000)

---

### TC-505b — Verify: Cumulative Stock

**Where**: `/products/detail/[P1_ID]`

**Expected**:
- [ ] P1-V1 stock: **30** (10 from TX-P1 + 20 from TX-P2)
- [ ] P1-V2 stock: **5** (unchanged)
- [ ] Total Stock: **35 Meters**

---

### TC-505c — Verify: Movements Tab (2 Purchase entries)

**Where**: `/products/detail/[P1_ID]` → Movements tab

**Expected**:
- [ ] 2 PURCHASE_IN entries for P1-V1 (one per purchase)
- [ ] 1 PURCHASE_IN entry for P1-V2 (only from TX-P1)
- [ ] Dates correct: 2026-03-01 and 2026-03-05

---

### TC-505d — Verify: Supplier Ledger (2 entries)

**Where**: `/supplier/detail/[S1_ID]` → Ledger tab

**Expected**:
- [ ] 2 entries visible
- [ ] Entry 1: 2026-03-01, PKR 21,000.00
- [ ] Entry 2: 2026-03-05, PKR 30,000.00
- [ ] Running balance after entry 2: PKR 51,000.00

---

### TC-505e — Verify: Supplier Open Documents (2 invoices)

**Where**: `/supplier/detail/[S1_ID]` → Open Documents tab

**Expected**:
- [ ] 2 open invoices listed
- [ ] TX-P1: PKR 21,000.00 remaining
- [ ] TX-P2: PKR 30,000.00 remaining
- [ ] Total outstanding visible somewhere: PKR 51,000.00

---

## Transaction TX-P3: Purchase from S2 (Steel)

### TC-506 — Create and Post Purchase from S2

**Where**: `/transactions/purchase`

**Inputs**:
| Field | Value |
|-------|-------|
| Supplier | `Punjab Steel Works` (S2) |
| Transaction Date | `2026-03-07` |
| Delivery Fee | `1,000` |

**Line Items**:
| # | Variant | Qty | Unit Cost |
|---|---------|-----|-----------|
| 1 | Steel Rod → 6mm (P2-V1) | `100` | `50` |
| 2 | Steel Rod → 12mm (P2-V2) | `50` | `80` |

**Totals**:
- Line 1: `100 × 50 = PKR 5,000`
- Line 2: `50 × 80 = PKR 4,000`
- Subtotal: `PKR 9,000`
- Delivery: `PKR 1,000`
- **Total: PKR 10,000**

**Action**: Save Draft → Post

**Record TX ID**: `TX-P3 ID = _______________`

---

### TC-506a — Verify: S2 Balance (separate from S1)

**Where**: `/supplier/detail/[S2_ID]`

**Expected**:
- [ ] Current Balance: **PKR 10,000.00**
- [ ] S1 balance unaffected: still PKR 51,000.00

---

### TC-506b — Verify: P2 Stock

**Where**: `/products/detail/[P2_ID]`

**Expected**:
- [ ] P2-V1 (6mm) stock: **100 Kg**
- [ ] P2-V2 (12mm) stock: **50 Kg**
- [ ] Total: 150 Kg

---

### TC-506c — Verify: Dashboard Payables (both suppliers)

**Where**: `/` (Dashboard)

**Expected**:
- [ ] Total Payables: **PKR 61,000.00** (51,000 + 10,000)
- [ ] Supplier count: 2

---

## Delete a Draft (TC-507)

### TC-507 — Create and Delete a Draft Purchase

**Where**: `/transactions/purchase`

**Inputs**: Any supplier, any 1 line item (something small)

**Action**: Save as Draft — but DO NOT post

**Expected — Draft created**:
- [ ] Draft visible in transactions list

**Action**: Delete the draft from the transaction detail page

**Expected — After delete**:
- [ ] Draft disappears from transactions list
- [ ] Supplier balance unchanged (draft deletion has no effect)
- [ ] Stock unchanged
- [ ] Dashboard unchanged

> **Note**: If the system doesn't allow deleting a POSTED transaction, confirm that the Delete button is absent/disabled on posted transactions.

---

## Reports Spot-Check (Phase 2)

### TC-508 — Aged Payables Report

**Where**: `/reports/aged-payables`

**Set date**: `2026-03-10`

**Expected**:
- [ ] S1 (Karachi Fabrics) row: PKR 51,000.00
- [ ] S2 (Punjab Steel Works) row: PKR 10,000.00
- [ ] Total payables: PKR 61,000.00
- [ ] TX-P1 and TX-P2 listed under S1 (within 30 days bucket since < 30 days old)
- [ ] TX-P3 listed under S2

---

### TC-509 — Inventory Valuation Report

**Where**: `/reports/inventory-valuation`

**Set date**: `2026-03-10`

**Expected**:
- [ ] P1-V1: Qty 30, Cost PKR 1,500, Value PKR 45,000
- [ ] P1-V2: Qty 5, Cost PKR 1,100, Value PKR 5,500
- [ ] P2-V1: Qty 100, Cost PKR 50, Value PKR 5,000
- [ ] P2-V2: Qty 50, Cost PKR 80, Value PKR 4,000
- [ ] Total Inventory Value: PKR 59,500.00

> Note: Delivery fees may or may not be included in unit cost depending on backend logic.
> Verify what the system actually shows and note it.

---

### TC-510 — Trial Balance Spot-Check

**Where**: `/reports/trial-balance`

**Set date**: `2026-03-10`

**Expected (high-level)**:
- [ ] Inventory account: Debit balance ~ PKR 59,500 (or however backend allocates delivery)
- [ ] Accounts Payable: Credit balance ~ PKR 61,000
- [ ] Debits = Credits (balanced)

---

## Phase 2 Completion State

Record final balances after Phase 2:

| Entity | Balance After Phase 2 |
|--------|-----------------------|
| S1 (Karachi Fabrics) | PKR 51,000.00 |
| S2 (Punjab Steel Works) | PKR 10,000.00 |
| C1 (Ahmed Traders) | PKR 0.00 |
| C2 (Zara Retail) | PKR 0.00 |
| P1-V1 stock | 30 Meters |
| P1-V2 stock | 5 Meters |
| P2-V1 stock | 100 Kg |
| P2-V2 stock | 50 Kg |
| A1 (HBL Main) | PKR 100,000.00 |
| A2 (Cash Box) | PKR 50,000.00 |
| A3 (JazzCash) | PKR 20,000.00 |

---

**→ Next: [PHASE_3_SALE_FLOW.md](./PHASE_3_SALE_FLOW.md)**
