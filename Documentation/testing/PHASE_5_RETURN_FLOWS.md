# Phase 5 — Return Flows
## Supplier Returns · Customer Returns · Stock Reversal · Balance Adjustment

> **Goal**: Test both return types. Verify that posting a return correctly:
> - Reverses stock in the right direction (supplier return = stock OUT, customer return = stock IN)
> - Adjusts the supplier/customer balance
> - Adds a ledger entry
> - Reflects in reports and dashboard
>
> **Key mechanic**: Returns reference existing posted transaction lines via the
> "returnable lines" API. You select how many units to return from a specific original line.
>
> **Depends on**: Phase 1 + Phase 2 (purchase lines) + Phase 3 (sale lines).
>
> **Starting state** (from Phase 4 completion):
> | Entity | Balance |
> |--------|---------|
> | S1 (Karachi Fabrics) | PKR 0.00 (fully paid) |
> | S2 (Punjab Steel Works) | PKR 5,000.00 (partially paid) |
> | C1 (Ahmed Traders) | PKR 0.00 (fully collected) |
> | C2 (Zara Retail) | PKR 0.00 (fully collected) |
> | P1-V1 stock | 17 Meters |
> | P1-V2 stock | 2 Meters |
> | P2-V1 stock | 80 Kg |
> | P2-V2 stock | 50 Kg |
> | A1 (HBL Main) | PKR 101,400.00 |
> | A2 (Cash Box) | PKR 30,000.00 |
> | A3 (JazzCash) | PKR 17,200.00 |

---

## Section A: Supplier Returns

> **What a Supplier Return means**: We send goods back to the supplier.
> - Stock goes **OUT** (we lose inventory we're returning)
> - Supplier balance **decreases** (we owe them less — or they owe us if already paid)
>
> **Important**: S1 is already fully paid (balance = PKR 0.00). A return on S1 will
> create a **credit balance** (negative) meaning S1 now owes us a refund.
> S2 still has PKR 5,000.00 balance — a return there reduces what we owe.

---

### Transaction TX-SR1: Partial Return to S2 (Still Has Balance)

#### TC-901 — Navigate to Supplier Return

**Where**: `/transactions/new` → "Supplier Return" → `/transactions/supplier-return`

> The page should show a supplier selector. Once a supplier is selected, it loads
> the returnable lines (lines from posted PURCHASE transactions for that supplier).

---

#### TC-901a — Load Returnable Lines for S2

**Action**: Select supplier `Punjab Steel Works` (S2)

**Expected — Returnable Lines load**:
- [ ] Lines from TX-P3 appear:
  - Line 1: `Steel Rod → 6mm (P2-V1)` — Original Qty: 100, Unit Cost: PKR 50, Max Returnable: 100
  - Line 2: `Steel Rod → 12mm (P2-V2)` — Original Qty: 50, Unit Cost: PKR 80, Max Returnable: 50
- [ ] Lines are linked to source transaction TX-P3
- [ ] Can only return up to the original purchased quantity

> **If returnable lines don't load**: This is a critical bug. Log issue immediately.
> Check if the `/transactions/{id}/returnable-lines` API is being called.

---

#### TC-902 — Fill Return Form

**Inputs**:
| Field | Value |
|-------|-------|
| Supplier | `Punjab Steel Works` (S2) |
| Transaction Date | `2026-03-21` |
| Notes | `Defective 6mm rods returned` |

**Return Lines** (partial return — only some of line 1):
| Source Line | Variant | Return Qty | Max Allowed |
|-------------|---------|------------|-------------|
| TX-P3 Line 1 | P2-V1 (6mm) | `10` | 100 |

**Calculated amounts**:
- Return value: `10 × PKR 50 = PKR 500`
- **Total Return: PKR 500**

**Action**: Save as Draft

**Expected — Draft state**:
- [ ] Status: **DRAFT**
- [ ] Type: SUPPLIER_RETURN
- [ ] Supplier: Punjab Steel Works
- [ ] Total: PKR 500.00

**Expected — NO side effects yet**:
- [ ] S2 balance still **PKR 5,000.00**
- [ ] P2-V1 stock still **80 Kg**

**Record TX ID**: `TX-SR1 ID = _______________`

---

#### TC-903 — POST the Supplier Return (TX-SR1)

**Where**: `/transactions/detail/[TX-SR1_ID]` → Post

---

#### TC-903a — Verify: Supplier Balance Decreased

**Where**: `/supplier/detail/[S2_ID]`

**Expected**:
- [ ] Current Balance: **PKR 4,500.00** (5,000 − 500)
- [ ] Balance decreased by return value

---

#### TC-903b — Verify: Supplier Ledger Entry

**Where**: `/supplier/detail/[S2_ID]` → **Ledger tab**

**Expected**:
- [ ] New entry dated 2026-03-21
- [ ] Type: SUPPLIER_RETURN
- [ ] Amount: PKR 500.00 (credit against balance — reduces debt)
- [ ] Running balance: **PKR 4,500.00**
- [ ] TX-P3 purchase entry + TX-SP3 payment entry visible above

---

#### TC-903c — Verify: Supplier Open Documents

**Where**: `/supplier/detail/[S2_ID]` → **Open Documents tab**

**Expected**:
- [ ] TX-P3 outstanding amount reduced: was PKR 5,000, now **PKR 4,500.00**

> Alternatively, the return may appear as a separate credit document. Note actual behavior.

---

#### TC-903d — Verify: Stock Decreased (Goods sent back)

**Where**: `/products/detail/[P2_ID]`

**Expected**:
- [ ] P2-V1 (6mm): **70 Kg** (was 80, returned 10 → 80 − 10 = 70)
- [ ] P2-V2 (12mm): **50 Kg** (unchanged — not returned)
- [ ] Total stock decreased by 10

---

#### TC-903e — Verify: Product Movements Tab

**Where**: `/products/detail/[P2_ID]` → **Movements tab**

**Expected**:
- [ ] New movement: type **SUPPLIER_RETURN_OUT** (or equivalent)
- [ ] Variant: P2-V1, Qty: **−10**, Date: 2026-03-21
- [ ] Reference: TX-SR1 document number
- [ ] Previous PURCHASE_IN and SALE_OUT movements still visible

---

#### TC-903f — Verify: Dashboard Payables

**Where**: `/` (Dashboard)

**Expected**:
- [ ] Total Payables: **PKR 4,500.00** (was 5,000)

---

#### TC-903g — Verify: Inventory Valuation Decreased

**Where**: `/reports/inventory-valuation`

**Set date**: `2026-03-21`

**Expected**:
- [ ] P2-V1: Qty **70**, Value `70 × 50 = PKR 3,500` (was PKR 4,000)
- [ ] Total inventory value decreased by PKR 500

---

### Transaction TX-SR2: Full Return to S1 (Creates Credit Balance)

> This tests returning goods to a supplier who is already fully paid.
> Result: supplier owes us money (negative/credit balance).

#### TC-904 — Create Supplier Return for S1

**Where**: `/transactions/supplier-return`

**Action**: Select supplier `Karachi Fabrics Ltd` (S1)

**Expected — Returnable Lines**:
- [ ] Lines from TX-P1 appear: P1-V1 (10 units @ 1,500), P1-V2 (5 units @ 1,100)
- [ ] Lines from TX-P2 appear: P1-V1 (20 units @ 1,500)

> **Max returnable**: The system should track already-returned quantities.
> TX-SR1 returned 0 from S1's lines, so all quantities should still be fully returnable.

**Inputs**:
| Field | Value |
|-------|-------|
| Supplier | `Karachi Fabrics Ltd` (S1) |
| Transaction Date | `2026-03-22` |

**Return Lines** (return from TX-P1 only):
| Source Line | Variant | Return Qty |
|-------------|---------|------------|
| TX-P1 Line 2 | P1-V2 (Medium) | `2` |

**Value**: `2 × PKR 1,100 = PKR 2,200`

**Action**: Save Draft → Post

**Record TX ID**: `TX-SR2 ID = _______________`

---

#### TC-904a — Verify: S1 Credit Balance

**Where**: `/supplier/detail/[S1_ID]`

**Expected**:
- [ ] Current Balance: **−PKR 2,200.00** (or PKR −2,200 — they owe us a refund)
- [ ] UI should clearly indicate this is a credit balance (supplier owes us), not we owe them
- [ ] Check how the UI represents a negative balance — confusing display is a bug worth logging

---

#### TC-904b — Verify: P1-V2 Stock Decreased

**Where**: `/products/detail/[P1_ID]`

**Expected**:
- [ ] P1-V2 (Medium): **0 Meters** (was 2, returned 2 → 2 − 2 = 0)
- [ ] P1-V1: **17 Meters** (unchanged)

---

#### TC-904c — Verify: P1-V2 Movement

**Where**: `/products/detail/[P1_ID]` → Movements tab

**Expected**:
- [ ] New SUPPLIER_RETURN_OUT for P1-V2: Qty −2, Date 2026-03-22

---

### TC-905 — Attempt to Return More Than Originally Purchased

**Where**: `/transactions/supplier-return`

**Action**: Select S2, select TX-P3 Line 1 (P2-V1, max 100), enter return qty `101`

**Expected**:
- [ ] System blocks this: "Cannot return more than original quantity" or equivalent error
- [ ] If not blocked: note as a bug (over-return creates phantom inventory)

---

### TC-906 — Attempt to Return Already Returned Units

**Where**: `/transactions/supplier-return`

**Context**: We already returned 10 units of P2-V1 (TX-SR1).

**Action**: Select S2, select TX-P3 Line 1 (P2-V1), enter return qty `95`

> Original = 100, already returned = 10, so max returnable should be 90.

**Expected**:
- [ ] Max returnable shows **90**, not 100
- [ ] Entering 95 is blocked: "Only 90 units remaining to return"
- [ ] If system allows 95: this is a bug — double-returning creates stock/balance inconsistency

---

## Section B: Customer Returns

> **What a Customer Return means**: Customer sends goods back to us.
> - Stock goes **IN** (we get inventory back)
> - Customer balance **decreases** (we credit them — they owe us less, or we owe them)
>
> **Context**: C1 and C2 are both at PKR 0.00 after payments.
> A customer return will create a **credit balance** (we owe them a refund).

---

### Transaction TX-CR1: Partial Return from C1

#### TC-1001 — Navigate to Customer Return

**Where**: `/transactions/new` → "Customer Return" → `/transactions/customer-return`

---

#### TC-1001a — Load Returnable Lines for C1

**Action**: Select customer `Ahmed Traders` (C1)

**Expected — Returnable Lines from sales to C1**:
- [ ] TX-S1 lines:
  - P1-V1 (Small S): Original Qty 8, Max Returnable: 8
  - P1-V2 (Medium): Original Qty 3, Max Returnable: 3
- [ ] TX-S2 lines:
  - P1-V1 (Small S): Original Qty 5, Max Returnable: 5

> If returnable lines don't load, log as critical bug.

---

#### TC-1002 — Fill Customer Return Form

**Inputs**:
| Field | Value |
|-------|-------|
| Customer | `Ahmed Traders` (C1) |
| Transaction Date | `2026-03-23` |
| Notes | `Customer returned damaged items` |

**Return Lines**:
| Source Line | Variant | Return Qty | Original Sale Price |
|-------------|---------|------------|-------------------|
| TX-S1 Line 1 | P1-V1 (Small S) | `3` | PKR 2,000 (after discount) |

**Value**: `3 × PKR 2,000 = PKR 6,000`

> **Note**: The return value is based on the original sale price, not the purchase cost.
> The discount from TX-S1 was applied at order level, not per line — confirm how the system
> handles per-unit pricing on returns.

**Action**: Save as Draft

**Expected — NO side effects yet**:
- [ ] C1 balance still **PKR 0.00**
- [ ] P1-V1 stock still **17 Meters**

**Record TX ID**: `TX-CR1 ID = _______________`

---

#### TC-1003 — POST the Customer Return (TX-CR1)

**Where**: `/transactions/detail/[TX-CR1_ID]` → Post

---

#### TC-1003a — Verify: Customer Balance (Credit)

**Where**: `/customer/detail/[C1_ID]`

**Expected**:
- [ ] Balance: **−PKR 6,000.00** (or PKR −6,000 — we owe them a refund)
- [ ] UI clearly shows this is a credit (we owe them), not they owe us

---

#### TC-1003b — Verify: Customer Ledger Entry

**Where**: `/customer/detail/[C1_ID]` → **Ledger tab**

**Expected**:
- [ ] New entry dated 2026-03-23
- [ ] Type: CUSTOMER_RETURN
- [ ] Amount: PKR 6,000.00 (credit — reduces their balance, goes negative)
- [ ] Running balance: **−PKR 6,000.00**

---

#### TC-1003c — Verify: Customer Open Documents

**Where**: `/customer/detail/[C1_ID]` → **Open Documents tab**

**Expected**:
- [ ] TX-SR1 return document visible (if system shows credit notes as open docs)
- [ ] OR: the original TX-S1 shows partial amount if return reduces the original invoice
- [ ] Note actual behavior — either is valid, inconsistency is a bug

---

#### TC-1003d — Verify: Stock Increased (Goods Received Back)

**Where**: `/products/detail/[P1_ID]`

**Expected**:
- [ ] P1-V1 (Small S): **20 Meters** (was 17, returned 3 → 17 + 3 = 20)
- [ ] P1-V2 (Medium): **0 Meters** (unchanged from Phase 5 supplier return)

---

#### TC-1003e — Verify: Product Movements Tab

**Where**: `/products/detail/[P1_ID]` → **Movements tab**

**Expected**:
- [ ] New movement: type **CUSTOMER_RETURN_IN** (or equivalent)
- [ ] Variant: P1-V1, Qty: **+3**, Date: 2026-03-23
- [ ] All prior movements still present (PURCHASE_IN × 2, SALE_OUT × 2)
- [ ] Running stock column correct: 17 → 20

---

#### TC-1003f — Verify: Dashboard Receivables

**Where**: `/` (Dashboard)

**Expected**:
- [ ] Receivables may show **−PKR 6,000** or PKR 0 depending on how system handles credits
- [ ] Note actual display — negative receivables shown as payable is a common UI bug

---

#### TC-1003g — Verify: Inventory Valuation Increased

**Where**: `/reports/inventory-valuation`

**Set date**: `2026-03-23`

**Expected**:
- [ ] P1-V1: Qty 20, Cost PKR 1,500 → Value **PKR 30,000** (was PKR 25,500)
- [ ] Total inventory value increases by 3 × 1,500 = PKR 4,500

> **Note**: The inventory is re-valued at **cost price** (avg cost), not the sale price at which it was returned. Verify this is what the system uses.

---

### Transaction TX-CR2: Return from C2

#### TC-1004 — Create and Post Customer Return from C2

**Where**: `/transactions/customer-return`

**Action**: Select `Zara Retail` (C2)

**Expected — Returnable Lines from TX-S3**:
- [ ] P2-V1 (6mm), Original Qty: 20, Max Returnable: 20

**Inputs**:
| Field | Value |
|-------|-------|
| Customer | `Zara Retail` (C2) |
| Transaction Date | `2026-03-24` |

**Return Lines**:
| Source Line | Variant | Return Qty |
|-------------|---------|------------|
| TX-S3 Line 1 | P2-V1 (6mm) | `5` |

**Value**: `5 × PKR 100 = PKR 500`

**Action**: Save Draft → Post

**Record TX ID**: `TX-CR2 ID = _______________`

---

#### TC-1004a — Verify: C2 Credit Balance

**Where**: `/customer/detail/[C2_ID]`

**Expected**:
- [ ] Balance: **−PKR 500.00** (we owe C2 a refund)

---

#### TC-1004b — Verify: P2-V1 Stock Increased

**Where**: `/products/detail/[P2_ID]`

**Expected**:
- [ ] P2-V1 (6mm): **75 Kg** (was 70, customer returned 5 → 70 + 5 = 75)
- [ ] P2-V2: **50 Kg** (unchanged)

---

### TC-1005 — Attempt to Return More Than Sold

**Where**: `/transactions/customer-return`

**Action**: Select C2, select TX-S3 Line 1 (P2-V1, original qty 20), enter return qty `21`

**Expected**:
- [ ] System blocks: "Cannot return more than sold quantity"
- [ ] If allowed: note as bug

---

### TC-1006 — Re-Return Already Returned Units from C1

**Where**: `/transactions/customer-return`

**Context**: TX-CR1 already returned 3 units of P1-V1 from TX-S1 (original 8).

**Action**: Select C1, select TX-S1 Line 1 (P1-V1), check max returnable

**Expected**:
- [ ] Max returnable shows **5** (8 original − 3 already returned)
- [ ] Entering 6 is blocked

---

## Section C: Void/Delete Returns (Edge Cases)

### TC-1007 — Cannot Delete a Posted Return

**Where**: `/transactions/detail/[TX-SR1_ID]`

**Expected**:
- [ ] Delete button absent, disabled, or shows error "Cannot delete a posted transaction"
- [ ] If delete IS possible on posted transactions: note as critical bug

---

### TC-1008 — Can Delete a Draft Return

**Action**:
1. Create a new supplier return draft (any supplier, any line, small qty)
2. Do NOT post it
3. Delete the draft

**Expected**:
- [ ] Draft deleted successfully
- [ ] No stock or balance changes
- [ ] Draft disappears from transactions list

---

## Phase 5 Completion State

| Entity | Balance After Phase 5 |
|--------|-----------------------|
| S1 (Karachi Fabrics) | **−PKR 2,200.00** (credit — they owe us) |
| S2 (Punjab Steel Works) | **PKR 4,500.00** |
| C1 (Ahmed Traders) | **−PKR 6,000.00** (credit — we owe them) |
| C2 (Zara Retail) | **−PKR 500.00** (credit — we owe them) |
| P1-V1 stock | **20 Meters** |
| P1-V2 stock | **0 Meters** |
| P2-V1 stock | **75 Kg** |
| P2-V2 stock | **50 Kg** |
| A1 (HBL Main) | PKR 101,400.00 (unchanged) |
| A2 (Cash Box) | PKR 30,000.00 (unchanged) |
| A3 (JazzCash) | PKR 17,200.00 (unchanged) |

> Payment accounts are NOT affected by returns — only balances are affected.
> If a payment account changes after a return, that is a bug.

---

**→ Next: [PHASE_6_TRANSFERS_ADJUSTMENTS.md](./PHASE_6_TRANSFERS_ADJUSTMENTS.md)**
