# Phase 4 — Payment Flows
## Supplier Payments · Customer Payments · Balances · Account Statements · Allocations

> **Goal**: Test both payment types. Verify that payments correctly:
> - Reduce the supplier/customer outstanding balance
> - Debit/credit the payment account
> - Update the payment account statement
> - Update open documents (partial vs full settlement)
> - Reflect correctly in the ledger, dashboard KPIs, and reports
>
> **Depends on**: Phase 1 + Phase 2 (supplier balances) + Phase 3 (customer balances).
>
> **Starting state** (from Phase 3 completion):
> | Entity | Balance |
> |--------|---------|
> | S1 (Karachi Fabrics) | PKR 51,000.00 (we owe this) |
> | S2 (Punjab Steel Works) | PKR 10,000.00 |
> | C1 (Ahmed Traders) | PKR 32,400.00 (they owe us) |
> | C2 (Zara Retail) | PKR 2,200.00 |
> | A1 (HBL Main) | PKR 100,000.00 |
> | A2 (Cash Box) | PKR 50,000.00 |
> | A3 (JazzCash) | PKR 20,000.00 |

---

## Section A: Supplier Payments

### Transaction TX-SP1: Partial Payment to S1

#### TC-701 — Create Supplier Payment Draft (Partial)

**Where**: `/transactions/new` → "Supplier Payment" → `/transactions/supplier-payment`

**Inputs**:
| Field | Value |
|-------|-------|
| Supplier | `Karachi Fabrics Ltd` (S1) |
| Amount | `21,000` |
| Payment Account | `HBL Main` (A1) |
| Transaction Date | `2026-03-15` |
| Notes | `Partial payment — clearing PUR-001` |

> We are paying PKR 21,000 out of PKR 51,000 total owed.

**Action**: Save as Draft

**Expected — Draft state**:
- [ ] Status: **DRAFT**
- [ ] Type: SUPPLIER_PAYMENT
- [ ] Supplier: Karachi Fabrics Ltd
- [ ] Amount: PKR 21,000.00
- [ ] Payment Account: HBL Main

**Expected — NO side effects yet**:
- [ ] S1 balance still **PKR 51,000.00** (`/supplier/detail/[S1_ID]`)
- [ ] A1 balance still **PKR 100,000.00** (`/payment-accounts/detail/[A1_ID]`)
- [ ] A1 statement tab: no new entry

**Record TX ID**: `TX-SP1 ID = _______________`

---

#### TC-702 — POST the Supplier Payment (TX-SP1)

**Where**: `/transactions/detail/[TX-SP1_ID]` → Post

---

#### TC-702a — Verify: Supplier Balance Decreased

**Where**: `/supplier/detail/[S1_ID]`

**Expected**:
- [ ] Current Balance: **PKR 30,000.00** (51,000 − 21,000)

---

#### TC-702b — Verify: Supplier Ledger Entry

**Where**: `/supplier/detail/[S1_ID]` → **Ledger tab**

**Expected**:
- [ ] New entry dated 2026-03-15
- [ ] Type: SUPPLIER_PAYMENT (or reference code)
- [ ] Amount: PKR 21,000.00 (credit — reduces what we owe)
- [ ] Running balance: **PKR 30,000.00**
- [ ] Previous 2 purchase entries still visible above it

---

#### TC-702c — Verify: Supplier Open Documents (Partial Settlement)

**Where**: `/supplier/detail/[S1_ID]` → **Open Documents tab**

> TX-SP1 was for PKR 21,000 which exactly matches TX-P1 (PKR 21,000).

**Expected**:
- [ ] TX-P1 (PKR 21,000): now shows **Paid: PKR 21,000 / Remaining: PKR 0.00** → possibly removed or marked as PAID
- [ ] TX-P2 (PKR 30,000): still shows **Remaining: PKR 30,000.00** (unaffected)

> **Note on allocation behavior**: The system may auto-allocate payment to the oldest invoice (FIFO), or require manual allocation. Observe and note actual behavior. If auto-allocation is not applied, open documents may just show total paid without per-invoice breakdown — note this as-is.

---

#### TC-702d — Verify: Payment Account Balance Decreased

**Where**: `/payment-accounts/detail/[A1_ID]`

**Expected**:
- [ ] Current Balance: **PKR 79,000.00** (100,000 − 21,000)
- [ ] Total Out: increased by PKR 21,000

---

#### TC-702e — Verify: Payment Account Statement Entry

**Where**: `/payment-accounts/detail/[A1_ID]` → **Statement tab**

**Expected**:
- [ ] New entry dated 2026-03-15
- [ ] Type: SUPPLIER_PAYMENT
- [ ] Amount: PKR 21,000.00 (debit/outflow)
- [ ] Reference: Karachi Fabrics Ltd or TX-SP1 document number
- [ ] Running balance: PKR 79,000.00

---

#### TC-702f — Verify: Dashboard Payables Decreased

**Where**: `/` (Dashboard)

**Expected**:
- [ ] Total Payables: **PKR 40,000.00** (61,000 − 21,000)
- [ ] Supplier count: still 2 (S2 still has balance)

---

#### TC-702g — Verify: Dashboard Cash & Bank Decreased

**Where**: `/` (Dashboard)

**Expected**:
- [ ] Cash & Bank total: **PKR 149,000.00** (170,000 − 21,000)
- [ ] HBL Main shows PKR 79,000.00 in account breakdown

---

### Transaction TX-SP2: Full Payment to S1 (Clear Remaining Balance)

#### TC-703 — Create and Post Full Supplier Payment

**Where**: `/transactions/supplier-payment`

**Inputs**:
| Field | Value |
|-------|-------|
| Supplier | `Karachi Fabrics Ltd` (S1) |
| Amount | `30,000` |
| Payment Account | `Cash Box` (A2) |
| Transaction Date | `2026-03-17` |

**Action**: Save Draft → Post

**Record TX ID**: `TX-SP2 ID = _______________`

---

#### TC-703a — Verify: S1 Balance Zeroed

**Where**: `/supplier/detail/[S1_ID]`

**Expected**:
- [ ] Current Balance: **PKR 0.00** (fully paid)

---

#### TC-703b — Verify: S1 Ledger (3 debit entries + 2 payment entries)

**Where**: `/supplier/detail/[S1_ID]` → Ledger tab

**Expected**:
- [ ] 4 entries total (TX-P1, TX-P2, TX-SP1, TX-SP2)
- [ ] Final running balance: **PKR 0.00**

---

#### TC-703c — Verify: S1 Open Documents (All Cleared)

**Where**: `/supplier/detail/[S1_ID]` → Open Documents tab

**Expected**:
- [ ] Both TX-P1 and TX-P2 now either removed or marked fully paid
- [ ] Remaining on both: PKR 0.00

---

#### TC-703d — Verify: A2 (Cash Box) Balance Decreased

**Where**: `/payment-accounts/detail/[A2_ID]`

**Expected**:
- [ ] Balance: **PKR 20,000.00** (50,000 − 30,000)
- [ ] Statement shows TX-SP2 as outflow PKR 30,000

---

#### TC-703e — Verify: Dashboard Payables

**Where**: `/` (Dashboard)

**Expected**:
- [ ] Total Payables: **PKR 10,000.00** (only S2 remains)
- [ ] Supplier count: 1 (S1 is at 0 balance — may or may not show)

---

#### TC-703f — Verify: Dashboard Cash & Bank

**Expected**:
- [ ] Cash & Bank: **PKR 119,000.00** (149,000 − 30,000)
- [ ] HBL Main: PKR 79,000.00
- [ ] Cash Box: PKR 20,000.00
- [ ] JazzCash: PKR 20,000.00

---

### Transaction TX-SP3: Payment to S2 (Partial)

#### TC-704 — Partial Payment to S2

**Where**: `/transactions/supplier-payment`

**Inputs**:
| Field | Value |
|-------|-------|
| Supplier | `Punjab Steel Works` (S2) |
| Amount | `5,000` |
| Payment Account | `JazzCash` (A3) |
| Transaction Date | `2026-03-18` |

**Action**: Save Draft → Post

**Record TX ID**: `TX-SP3 ID = _______________`

---

#### TC-704a — Verify: S2 Balance Partial Reduction

**Where**: `/supplier/detail/[S2_ID]`

**Expected**:
- [ ] Balance: **PKR 5,000.00** (10,000 − 5,000)
- [ ] Ledger shows 1 purchase entry + 1 payment entry

---

#### TC-704b — Verify: A3 Balance (JazzCash)

**Where**: `/payment-accounts/detail/[A3_ID]`

**Expected**:
- [ ] Balance: **PKR 15,000.00** (20,000 − 5,000)
- [ ] Statement: new outflow entry PKR 5,000

---

#### TC-704c — Verify: Dashboard Payables

**Expected**:
- [ ] Total Payables: **PKR 5,000.00** (only remaining S2 balance)

---

### Overpayment Test (TC-705)

#### TC-705 — Attempt to Overpay a Supplier

**Where**: `/transactions/supplier-payment`

**Inputs**:
| Field | Value |
|-------|-------|
| Supplier | S2 |
| Amount | `99,999` (far more than the PKR 5,000 balance) |
| Payment Account | A1 |
| Date | `2026-03-18` |

**Action**: Save Draft → Post

**Expected**:
- [ ] Does the system allow overpayment? (Creates a credit balance on supplier)
- [ ] If allowed: S2 balance goes negative (credit) → this may be valid for advance payments
- [ ] If blocked: error message shown

> **Note the behavior.** Negative supplier balance = we overpaid (supplier owes us).
> If the UI shows a negative balance confusingly, log a UI issue.

**Cleanup**: If draft was created, delete it. Do NOT post overpayment.

---

## Section B: Customer Payments

### Transaction TX-CP1: Partial Payment from C1

#### TC-801 — Create Customer Payment Draft (Partial)

**Where**: `/transactions/new` → "Customer Payment" → `/transactions/customer-payment`

**Inputs**:
| Field | Value |
|-------|-------|
| Customer | `Ahmed Traders` (C1) |
| Amount | `22,400` |
| Payment Account | `HBL Main` (A1) |
| Transaction Date | `2026-03-16` |
| Notes | `Clearing SAL-001` |

> C1 owes PKR 32,400. We are collecting PKR 22,400 first.

**Action**: Save as Draft

**Expected — NO side effects yet**:
- [ ] C1 balance still **PKR 32,400.00**
- [ ] A1 balance still **PKR 79,000.00**

**Record TX ID**: `TX-CP1 ID = _______________`

---

#### TC-802 — POST the Customer Payment (TX-CP1)

**Where**: `/transactions/detail/[TX-CP1_ID]` → Post

---

#### TC-802a — Verify: Customer Balance Decreased

**Where**: `/customer/detail/[C1_ID]`

**Expected**:
- [ ] Current Balance: **PKR 10,000.00** (32,400 − 22,400)

---

#### TC-802b — Verify: Customer Ledger Entry

**Where**: `/customer/detail/[C1_ID]` → **Ledger tab**

**Expected**:
- [ ] New entry dated 2026-03-16
- [ ] Type: CUSTOMER_PAYMENT
- [ ] Amount: PKR 22,400.00 (credit — reduces what they owe)
- [ ] Running balance: **PKR 10,000.00**
- [ ] All previous entries (TX-S1, TX-S2) still visible

---

#### TC-802c — Verify: Customer Open Documents

**Where**: `/customer/detail/[C1_ID]` → **Open Documents tab**

> TX-CP1 = PKR 22,400 matches TX-S1 exactly.

**Expected**:
- [ ] TX-S1 (PKR 22,400): now PAID or removed from open documents
- [ ] TX-S2 (PKR 10,000): still shows remaining PKR 10,000
- [ ] Note actual allocation behavior (FIFO auto or manual)

---

#### TC-802d — Verify: Payment Account Balance Increased

**Where**: `/payment-accounts/detail/[A1_ID]`

**Expected**:
- [ ] Balance: **PKR 101,400.00** (79,000 + 22,400)

> Note: A1 was at 79,000 after TX-SP1 reduced it from 100,000.

---

#### TC-802e — Verify: A1 Statement Entry

**Where**: `/payment-accounts/detail/[A1_ID]` → **Statement tab**

**Expected**:
- [ ] New entry dated 2026-03-16
- [ ] Type: CUSTOMER_PAYMENT
- [ ] Amount: PKR 22,400.00 (credit/inflow)
- [ ] Reference: Ahmed Traders or TX-CP1
- [ ] Running balance: PKR 101,400.00
- [ ] Previous TX-SP1 outflow entry still visible above

---

#### TC-802f — Verify: Dashboard Receivables Decreased

**Where**: `/` (Dashboard)

**Expected**:
- [ ] Total Receivables: **PKR 12,200.00** (34,600 − 22,400)
- [ ] Breakdown: C1 PKR 10,000 + C2 PKR 2,200

---

#### TC-802g — Verify: Dashboard Cash & Bank Increased

**Where**: `/` (Dashboard)

**Expected**:
- [ ] Cash & Bank: **PKR 141,400.00** (119,000 + 22,400)
- [ ] HBL Main: PKR 101,400.00

---

### Transaction TX-CP2: Full Payment from C1 (Clear Remaining)

#### TC-803 — Create and Post Full Customer Payment

**Where**: `/transactions/customer-payment`

**Inputs**:
| Field | Value |
|-------|-------|
| Customer | `Ahmed Traders` (C1) |
| Amount | `10,000` |
| Payment Account | `Cash Box` (A2) |
| Transaction Date | `2026-03-19` |

**Action**: Save Draft → Post

**Record TX ID**: `TX-CP2 ID = _______________`

---

#### TC-803a — Verify: C1 Balance Zeroed

**Where**: `/customer/detail/[C1_ID]`

**Expected**:
- [ ] Balance: **PKR 0.00** (fully collected)

---

#### TC-803b — Verify: C1 Ledger (4 entries)

**Where**: `/customer/detail/[C1_ID]` → Ledger tab

**Expected**:
- [ ] 4 entries: TX-S1, TX-S2, TX-CP1, TX-CP2
- [ ] Final running balance: **PKR 0.00**

---

#### TC-803c — Verify: C1 Open Documents (All Cleared)

**Where**: `/customer/detail/[C1_ID]` → Open Documents tab

**Expected**:
- [ ] TX-S1 and TX-S2 both cleared
- [ ] Open Documents tab: empty (or shows 0 outstanding)

---

#### TC-803d — Verify: A2 (Cash Box) Increased

**Where**: `/payment-accounts/detail/[A2_ID]`

**Expected**:
- [ ] Balance: **PKR 30,000.00** (20,000 + 10,000)
- [ ] Statement: new inflow entry PKR 10,000

---

#### TC-803e — Verify: Dashboard Receivables

**Expected**:
- [ ] Total Receivables: **PKR 2,200.00** (only C2 remains)
- [ ] Customer count: 1

---

### Transaction TX-CP3: Payment from C2 (Using Different Account)

#### TC-804 — Collect from C2

**Where**: `/transactions/customer-payment`

**Inputs**:
| Field | Value |
|-------|-------|
| Customer | `Zara Retail` (C2) |
| Amount | `2,200` |
| Payment Account | `JazzCash` (A3) |
| Transaction Date | `2026-03-20` |

**Action**: Save Draft → Post

**Record TX ID**: `TX-CP3 ID = _______________`

---

#### TC-804a — Verify: C2 Balance Zeroed

**Where**: `/customer/detail/[C2_ID]`

**Expected**:
- [ ] Balance: **PKR 0.00**

---

#### TC-804b — Verify: A3 (JazzCash) Increased

**Where**: `/payment-accounts/detail/[A3_ID]`

**Expected**:
- [ ] Balance: **PKR 17,200.00** (15,000 + 2,200)

---

#### TC-804c — Verify: Dashboard Receivables Zeroed

**Where**: `/` (Dashboard)

**Expected**:
- [ ] Total Receivables: **PKR 0.00**
- [ ] Customer count: 0

---

## Section C: Payment Account Statement Completeness

### TC-805 — Verify A1 (HBL Main) Full Statement

**Where**: `/payment-accounts/detail/[A1_ID]` → Statement tab

**Set date range**: `2026-03-01` to `2026-03-20`

**Expected entries in order**:
| Date | Type | Description | In (Credit) | Out (Debit) | Balance |
|------|------|-------------|-------------|-------------|---------|
| (opening) | — | Opening Balance | PKR 100,000 | — | PKR 100,000 |
| 2026-03-15 | SUPPLIER_PAYMENT | Karachi Fabrics Ltd | — | PKR 21,000 | PKR 79,000 |
| 2026-03-16 | CUSTOMER_PAYMENT | Ahmed Traders | PKR 22,400 | — | PKR 101,400 |

- [ ] All 2 transaction entries visible
- [ ] Opening balance row shown
- [ ] Running balance column correct at each row
- [ ] Final balance matches the Current Balance card

---

### TC-806 — Verify A2 (Cash Box) Full Statement

**Set date range**: `2026-03-01` to `2026-03-20`

**Expected entries**:
| Date | Type | Out | In | Balance |
|------|------|-----|----|---------|
| (opening) | — | — | PKR 50,000 | PKR 50,000 |
| 2026-03-17 | SUPPLIER_PAYMENT | PKR 30,000 | — | PKR 20,000 |
| 2026-03-19 | CUSTOMER_PAYMENT | — | PKR 10,000 | PKR 30,000 |

- [ ] Final balance: **PKR 30,000.00**
- [ ] Matches Current Balance card

---

### TC-807 — Verify A3 (JazzCash) Full Statement

**Expected entries**:
| Date | Type | Out | In | Balance |
|------|------|-----|----|---------|
| (opening) | — | — | PKR 20,000 | PKR 20,000 |
| 2026-03-18 | SUPPLIER_PAYMENT | PKR 5,000 | — | PKR 15,000 |
| 2026-03-20 | CUSTOMER_PAYMENT | — | PKR 2,200 | PKR 17,200 |

- [ ] Final balance: **PKR 17,200.00**

---

## Section D: Reports After Payments

### TC-808 — Aged Payables After Payments

**Where**: `/reports/aged-payables`

**Set date**: `2026-03-20`

**Expected**:
- [ ] S1 (Karachi Fabrics): **PKR 0.00** (fully paid) — may not appear, or appears with 0
- [ ] S2 (Punjab Steel Works): **PKR 5,000.00** (partially paid)
- [ ] Total: PKR 5,000.00

---

### TC-809 — Aged Receivables After Payments

**Where**: `/reports/aged-receivables`

**Set date**: `2026-03-20`

**Expected**:
- [ ] C1 (Ahmed Traders): **PKR 0.00** (fully collected) — may not appear
- [ ] C2 (Zara Retail): **PKR 0.00** (fully collected)
- [ ] Total: PKR 0.00

---

### TC-810 — Trial Balance After All Payments

**Where**: `/reports/trial-balance`

**Set date**: `2026-03-20`

**Expected**:
- [ ] Accounts Receivable: **PKR 0.00** (all collected)
- [ ] Accounts Payable: **PKR 5,000.00** (S2 remaining)
- [ ] Bank/Cash total (debit): should reflect new account balances
  - A1 HBL Main: PKR 101,400
  - A2 Cash Box: PKR 30,000
  - A3 JazzCash: PKR 17,200
  - Total cash: PKR 148,600
- [ ] Debits = Credits (balanced)

---

### TC-811 — Dashboard Final State Check

**Where**: `/` (Dashboard)

**Expected**:
| KPI | Expected Value |
|-----|---------------|
| Cash & Bank | **PKR 148,600.00** |
| Total Receivables | **PKR 0.00** |
| Total Payables | **PKR 5,000.00** |
| Inventory Value | PKR 35,700.00 (unchanged) |

---

## Phase 4 Completion State

| Entity | Balance After Phase 4 |
|--------|-----------------------|
| S1 (Karachi Fabrics) | **PKR 0.00** |
| S2 (Punjab Steel Works) | **PKR 5,000.00** |
| C1 (Ahmed Traders) | **PKR 0.00** |
| C2 (Zara Retail) | **PKR 0.00** |
| A1 (HBL Main) | **PKR 101,400.00** |
| A2 (Cash Box) | **PKR 30,000.00** |
| A3 (JazzCash) | **PKR 17,200.00** |
| Dashboard Cash & Bank | **PKR 148,600.00** |
| Dashboard Receivables | **PKR 0.00** |
| Dashboard Payables | **PKR 5,000.00** |

> Stock levels unchanged from Phase 3 (payments don't affect inventory).

---

**→ Next: [PHASE_5_RETURN_FLOWS.md](./PHASE_5_RETURN_FLOWS.md)**
