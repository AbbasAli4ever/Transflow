# Phase 6 — Transfers & Adjustments
## Internal Transfers · Stock Adjustments · Account Balances · Inventory Corrections

> **Goal**: Test the two "housekeeping" transaction types:
> - **Internal Transfer**: Move money between payment accounts (no supplier/customer involved)
> - **Stock Adjustment**: Correct inventory levels with an IN or OUT direction
>
> Both are fully self-contained — they don't affect suppliers, customers, or ledgers.
>
> **Depends on**: Phase 1 (accounts + products must exist). Can technically be run
> independently, but uses Phase 5 ending state to keep cumulative balances accurate.
>
> **Starting state** (from Phase 5 completion):
> | Entity | Balance |
> |--------|---------|
> | A1 (HBL Main) | PKR 101,400.00 |
> | A2 (Cash Box) | PKR 30,000.00 |
> | A3 (JazzCash) | PKR 17,200.00 |
> | Dashboard Cash & Bank | PKR 148,600.00 |
> | P1-V1 stock | 20 Meters |
> | P1-V2 stock | 0 Meters |
> | P2-V1 stock | 75 Kg |
> | P2-V2 stock | 50 Kg |

---

## Section A: Internal Transfers

> **What an Internal Transfer means**: Move funds from one payment account to another.
> - Source account balance **decreases**
> - Destination account balance **increases**
> - Net effect on total cash: **zero**
> - No supplier, customer, or stock is involved

---

### Transaction TX-IT1: HBL Main → Cash Box

#### TC-1101 — Create Internal Transfer Draft

**Where**: `/transactions/new` → "Internal Transfer" → `/transactions/internal-transfer`

**Inputs**:
| Field | Value |
|-------|-------|
| From Account | `HBL Main` (A1) |
| To Account | `Cash Box` (A2) |
| Amount | `25,000` |
| Transaction Date | `2026-03-25` |
| Notes | `Monthly cash withdrawal for petty expenses` |

**Action**: Save as Draft

**Expected — Draft state**:
- [ ] Status: **DRAFT**
- [ ] Type: INTERNAL_TRANSFER
- [ ] From: HBL Main
- [ ] To: Cash Box
- [ ] Amount: PKR 25,000.00

**Expected — NO side effects yet**:
- [ ] A1 balance still **PKR 101,400.00**
- [ ] A2 balance still **PKR 30,000.00**
- [ ] Dashboard Cash & Bank still **PKR 148,600.00**

**Record TX ID**: `TX-IT1 ID = _______________`

---

#### TC-1102 — POST the Internal Transfer (TX-IT1)

**Where**: `/transactions/detail/[TX-IT1_ID]` → Post

---

#### TC-1102a — Verify: Source Account Decreased

**Where**: `/payment-accounts/detail/[A1_ID]`

**Expected**:
- [ ] Current Balance: **PKR 76,400.00** (101,400 − 25,000)
- [ ] Total Out: increased by PKR 25,000

---

#### TC-1102b — Verify: Source Account Statement

**Where**: `/payment-accounts/detail/[A1_ID]` → **Statement tab**

**Expected**:
- [ ] New entry dated 2026-03-25
- [ ] Type: INTERNAL_TRANSFER (or TRANSFER_OUT)
- [ ] Amount: PKR 25,000.00 shown as **outflow/debit**
- [ ] Description: references Cash Box or TX-IT1
- [ ] Running balance: PKR 76,400.00

---

#### TC-1102c — Verify: Destination Account Increased

**Where**: `/payment-accounts/detail/[A2_ID]`

**Expected**:
- [ ] Current Balance: **PKR 55,000.00** (30,000 + 25,000)
- [ ] Total In: increased by PKR 25,000

---

#### TC-1102d — Verify: Destination Account Statement

**Where**: `/payment-accounts/detail/[A2_ID]` → **Statement tab**

**Expected**:
- [ ] New entry dated 2026-03-25
- [ ] Type: INTERNAL_TRANSFER (or TRANSFER_IN)
- [ ] Amount: PKR 25,000.00 shown as **inflow/credit**
- [ ] Description: references HBL Main or TX-IT1
- [ ] Running balance: PKR 55,000.00

---

#### TC-1102e — Verify: Dashboard Cash & Bank (Net Zero Change)

**Where**: `/` (Dashboard)

**Expected**:
- [ ] Total Cash & Bank: still **PKR 148,600.00** (no money was created or destroyed)
- [ ] Individual account breakdown updated:
  - HBL Main: PKR 76,400.00
  - Cash Box: PKR 55,000.00
  - JazzCash: PKR 17,200.00

---

#### TC-1102f — Verify: Suppliers and Customers Unaffected

- [ ] S1, S2 balances unchanged
- [ ] C1, C2 balances unchanged
- [ ] Dashboard Payables: unchanged
- [ ] Dashboard Receivables: unchanged

---

### Transaction TX-IT2: Cash Box → JazzCash

#### TC-1103 — Create and Post Second Transfer

**Where**: `/transactions/internal-transfer`

**Inputs**:
| Field | Value |
|-------|-------|
| From Account | `Cash Box` (A2) |
| To Account | `JazzCash` (A3) |
| Amount | `10,000` |
| Transaction Date | `2026-03-26` |
| Notes | `Top up JazzCash wallet` |

**Action**: Save Draft → Post

**Record TX ID**: `TX-IT2 ID = _______________`

---

#### TC-1103a — Verify: A2 Balance

**Where**: `/payment-accounts/detail/[A2_ID]`

**Expected**:
- [ ] Balance: **PKR 45,000.00** (55,000 − 10,000)

---

#### TC-1103b — Verify: A3 Balance

**Where**: `/payment-accounts/detail/[A3_ID]`

**Expected**:
- [ ] Balance: **PKR 27,200.00** (17,200 + 10,000)

---

#### TC-1103c — Verify: Dashboard Cash Total (Still Net Zero)

**Expected**:
- [ ] Cash & Bank: still **PKR 148,600.00**
- [ ] Breakdown: A1 PKR 76,400 + A2 PKR 45,000 + A3 PKR 27,200 = PKR 148,600

---

### Transfer Validation Tests

#### TC-1104 — Transfer to the Same Account

**Action**: Set From = `HBL Main`, To = `HBL Main`

**Expected**:
- [ ] System blocks: "Cannot transfer to the same account"
- [ ] If allowed: log as bug (creates phantom entries on same account)

---

#### TC-1105 — Transfer More Than Available Balance

**Action**:
| Field | Value |
|-------|-------|
| From | `JazzCash` (A3) — balance PKR 27,200 |
| To | `HBL Main` (A1) |
| Amount | `99,999` |

**Expected**:
- [ ] Does the system allow overdraft on an internal account?
- [ ] If blocked at draft: note
- [ ] If blocked at post: note
- [ ] If allowed (creates negative account balance): note as potential issue

**Cleanup**: Delete the draft without posting.

---

#### TC-1106 — Transfer Zero Amount

**Action**: Set amount = `0`

**Expected**:
- [ ] Validation error: "Amount must be greater than zero"
- [ ] Draft not saved

---

#### TC-1107 — Transfer Negative Amount

**Action**: Set amount = `-500`

**Expected**:
- [ ] Validation error or input blocked
- [ ] Draft not saved

---

## Section B: Stock Adjustments

> **What a Stock Adjustment means**: Manually correct inventory without a purchase or sale.
> Used for: physical stocktake corrections, write-offs, opening stock entry, damage.
>
> - Direction **IN**: Stock increases (found extra units, or opening stock)
> - Direction **OUT**: Stock decreases (damaged goods, write-off, shrinkage)
>
> Stock adjustments do NOT affect any supplier, customer, or payment account balance.

---

### Transaction TX-ADJ1: Adjustment IN — Restock P1-V2 (Zero Stock)

#### TC-1201 — Create Stock Adjustment Draft (IN)

**Where**: `/transactions/new` → "Stock Adjustment" → `/transactions/stock-adjustment`

> Current P1-V2 stock = **0 Meters** (sold out + all returned to supplier).
> This adjustment simulates finding extra stock during a stocktake.

**Inputs**:
| Field | Value |
|-------|-------|
| Transaction Date | `2026-03-27` |
| Notes | `Stocktake — found 3 extra Medium cloth rolls` |

**Adjustment Lines**:
| Variant | Direction | Qty | Unit Cost | Reason |
|---------|-----------|-----|-----------|--------|
| P1-V2 (Medium) | `IN` | `3` | `1,100` | `Physical stocktake surplus` |

**Action**: Save as Draft

**Expected — NO side effects yet**:
- [ ] P1-V2 stock still **0**

**Record TX ID**: `TX-ADJ1 ID = _______________`

---

#### TC-1202 — POST the Adjustment IN (TX-ADJ1)

**Where**: `/transactions/detail/[TX-ADJ1_ID]` → Post

---

#### TC-1202a — Verify: Stock Increased

**Where**: `/products/detail/[P1_ID]`

**Expected**:
- [ ] P1-V2 (Medium): **3 Meters** (was 0, adjusted +3)
- [ ] P1-V1: **20 Meters** (unchanged)

---

#### TC-1202b — Verify: Movements Tab

**Where**: `/products/detail/[P1_ID]` → **Movements tab**

**Expected**:
- [ ] New movement: type **ADJUSTMENT_IN** (or equivalent)
- [ ] Variant: P1-V2, Qty: **+3**, Date: 2026-03-27
- [ ] Unit Cost: PKR 1,100
- [ ] Reason: "Physical stocktake surplus" (if shown)
- [ ] All prior movements still intact

---

#### TC-1202c — Verify: Avg Cost Updated (if applicable)

**Where**: `/products/detail/[P1_ID]`

**Expected**:
- [ ] P1-V2 Avg Cost: **PKR 1,100** (consistent with the adjustment cost entered)
- [ ] If avg cost changes unexpectedly: note as a bug

---

#### TC-1202d — Verify: Inventory Valuation Increased

**Where**: `/reports/inventory-valuation`

**Set date**: `2026-03-27`

**Expected**:
- [ ] P1-V2: Qty 3, Cost PKR 1,100 → Value **PKR 3,300** (was PKR 0)
- [ ] Total inventory value increased by PKR 3,300

---

#### TC-1202e — Verify: No Supplier/Customer/Account Changes

- [ ] S1 balance: −PKR 2,200 (unchanged)
- [ ] S2 balance: PKR 4,500 (unchanged)
- [ ] C1 balance: −PKR 6,000 (unchanged)
- [ ] A1 balance: PKR 76,400 (unchanged)
- [ ] Dashboard payables/receivables: unchanged

---

### Transaction TX-ADJ2: Adjustment OUT — Write Off Damaged Stock

#### TC-1203 — Create Stock Adjustment Draft (OUT)

**Where**: `/transactions/stock-adjustment`

> Simulates writing off damaged P2-V2 (12mm Steel Rod).
> Current P2-V2 stock = **50 Kg**

**Inputs**:
| Field | Value |
|-------|-------|
| Transaction Date | `2026-03-28` |
| Notes | `Damaged steel rods scrapped` |

**Adjustment Lines**:
| Variant | Direction | Qty | Unit Cost | Reason |
|---------|-----------|-----|-----------|--------|
| P2-V2 (12mm) | `OUT` | `5` | `80` | `Rust damage — unfit for sale` |

**Action**: Save Draft → Post

**Record TX ID**: `TX-ADJ2 ID = _______________`

---

#### TC-1203a — Verify: Stock Decreased

**Where**: `/products/detail/[P2_ID]`

**Expected**:
- [ ] P2-V2 (12mm): **45 Kg** (was 50, adjusted −5)
- [ ] P2-V1 (6mm): **75 Kg** (unchanged)

---

#### TC-1203b — Verify: Movements Tab

**Where**: `/products/detail/[P2_ID]` → **Movements tab**

**Expected**:
- [ ] New movement: type **ADJUSTMENT_OUT**
- [ ] Variant: P2-V2, Qty: **−5**, Date: 2026-03-28
- [ ] Unit Cost: PKR 80
- [ ] Reason visible (if shown)

---

#### TC-1203c — Verify: Inventory Valuation Decreased

**Where**: `/reports/inventory-valuation`

**Set date**: `2026-03-28`

**Expected**:
- [ ] P2-V2: Qty **45**, Value `45 × 80 = PKR 3,600` (was 50 × 80 = PKR 4,000)
- [ ] Total inventory value decreased by PKR 400

---

### Transaction TX-ADJ3: Multi-Line Adjustment (IN + OUT Same Transaction)

#### TC-1204 — Create Multi-Line Adjustment

**Where**: `/transactions/stock-adjustment`

**Inputs**:
| Field | Value |
|-------|-------|
| Transaction Date | `2026-03-29` |
| Notes | `Monthly stocktake corrections` |

**Adjustment Lines**:
| Variant | Direction | Qty | Unit Cost | Reason |
|---------|-----------|-----|-----------|--------|
| P1-V1 (Small S) | `IN` | `2` | `1,500` | `Found in back store` |
| P2-V1 (6mm) | `OUT` | `3` | `50` | `Allocated as samples` |

**Action**: Save Draft → Post

**Record TX ID**: `TX-ADJ3 ID = _______________`

---

#### TC-1204a — Verify: Both Variants Updated

**Where**: `/products/detail/[P1_ID]` and `/products/detail/[P2_ID]`

**Expected**:
- [ ] P1-V1: **22 Meters** (was 20 + 2 = 22)
- [ ] P2-V1: **72 Kg** (was 75 − 3 = 72)

---

#### TC-1204b — Verify: Movements on Both Products

**Expected — P1 Movements tab**:
- [ ] New ADJUSTMENT_IN: P1-V1, Qty +2

**Expected — P2 Movements tab**:
- [ ] New ADJUSTMENT_OUT: P2-V1, Qty −3

---

### Adjustment Validation Tests

#### TC-1205 — Adjust to Exact Zero (OUT to Zero)

**Context**: P1-V2 currently has **3 Meters** (from TX-ADJ1).

**Action**: Create adjustment OUT, P1-V2, Qty `3`

**Expected**:
- [ ] Adjustment allowed
- [ ] P1-V2 stock: **0 Meters**
- [ ] Movement: ADJUSTMENT_OUT Qty −3

---

#### TC-1206 — Attempt Adjustment OUT Beyond Available Stock

**Context**: P1-V2 stock = **0 Meters** (after TC-1205).

**Action**: Create adjustment OUT, P1-V2, Qty `1`

**Expected**:
- [ ] System blocks: "Insufficient stock for adjustment"
- [ ] If allowed: P1-V2 goes to −1 → log as bug (negative stock = inventory inconsistency)

---

#### TC-1207 — Adjustment with Zero Quantity

**Action**: Create adjustment, any variant, Qty `0`

**Expected**:
- [ ] Validation error: "Quantity must be greater than zero"
- [ ] Draft not saved

---

#### TC-1208 — Adjustment with Negative Unit Cost

**Action**: Create adjustment IN, any variant, Qty `1`, Unit Cost `−500`

**Expected**:
- [ ] Validation error: "Unit cost cannot be negative"
- [ ] Draft not saved

---

## Phase 6 Completion State

### Payment Accounts
| Account | Balance After Phase 6 |
|---------|----------------------|
| A1 (HBL Main) | **PKR 76,400.00** |
| A2 (Cash Box) | **PKR 45,000.00** |
| A3 (JazzCash) | **PKR 27,200.00** |
| **Total Cash & Bank** | **PKR 148,600.00** |

### Product Stock
| Variant | Stock After Phase 6 |
|---------|---------------------|
| P1-V1 (Small S) | **22 Meters** |
| P1-V2 (Medium) | **0 Meters** *(adjusted to zero in TC-1205)* |
| P2-V1 (6mm) | **72 Kg** |
| P2-V2 (12mm) | **45 Kg** |

### Entity Balances (unchanged from Phase 5)
| Entity | Balance |
|--------|---------|
| S1 (Karachi Fabrics) | −PKR 2,200.00 |
| S2 (Punjab Steel Works) | PKR 4,500.00 |
| C1 (Ahmed Traders) | −PKR 6,000.00 |
| C2 (Zara Retail) | −PKR 500.00 |

---

## Cumulative Transaction Log (All 6 Phases)

For cross-reference when debugging reports:

| Ref | Type | Date | Amount | Entity | Account |
|-----|------|------|--------|--------|---------|
| TX-P1 | PURCHASE | 2026-03-01 | PKR 21,000 | S1 | — |
| TX-P2 | PURCHASE | 2026-03-05 | PKR 30,000 | S1 | — |
| TX-P3 | PURCHASE | 2026-03-07 | PKR 10,000 | S2 | — |
| TX-S1 | SALE | 2026-03-10 | PKR 22,400 | C1 | — |
| TX-S2 | SALE | 2026-03-12 | PKR 10,000 | C1 | — |
| TX-S3 | SALE | 2026-03-13 | PKR 2,200 | C2 | — |
| TX-SP1 | SUPPLIER_PAYMENT | 2026-03-15 | PKR 21,000 | S1 | A1 |
| TX-CP1 | CUSTOMER_PAYMENT | 2026-03-16 | PKR 22,400 | C1 | A1 |
| TX-SP2 | SUPPLIER_PAYMENT | 2026-03-17 | PKR 30,000 | S1 | A2 |
| TX-SP3 | SUPPLIER_PAYMENT | 2026-03-18 | PKR 5,000 | S2 | A3 |
| TX-CP2 | CUSTOMER_PAYMENT | 2026-03-19 | PKR 10,000 | C1 | A2 |
| TX-CP3 | CUSTOMER_PAYMENT | 2026-03-20 | PKR 2,200 | C2 | A3 |
| TX-SR1 | SUPPLIER_RETURN | 2026-03-21 | PKR 500 | S2 | — |
| TX-SR2 | SUPPLIER_RETURN | 2026-03-22 | PKR 2,200 | S1 | — |
| TX-CR1 | CUSTOMER_RETURN | 2026-03-23 | PKR 6,000 | C1 | — |
| TX-CR2 | CUSTOMER_RETURN | 2026-03-24 | PKR 500 | C2 | — |
| TX-IT1 | INTERNAL_TRANSFER | 2026-03-25 | PKR 25,000 | — | A1→A2 |
| TX-IT2 | INTERNAL_TRANSFER | 2026-03-26 | PKR 10,000 | — | A2→A3 |
| TX-ADJ1 | ADJUSTMENT (IN) | 2026-03-27 | PKR 3,300 | — | — |
| TX-ADJ2 | ADJUSTMENT (OUT) | 2026-03-28 | PKR 400 | — | — |
| TX-ADJ3 | ADJUSTMENT (mixed) | 2026-03-29 | — | — | — |

---

**→ Next: [PHASE_7_REPORTS.md](./PHASE_7_REPORTS.md)**
