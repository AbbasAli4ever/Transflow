# Transflow — Manual Testing Curriculum
## Master Plan

> **Purpose**: Step-by-step testing guide for every feature in Transflow.
> Each test specifies exact values to enter, and exactly where to verify the result —
> including every screen and data point that should change as a side-effect.
>
> **How to use**: Run phases in order. Each phase builds on the state from the previous one.
> When you find a bug, open a GitHub issue using the template at the bottom of this file.

---

## Phase Overview

| Phase | Document | What It Tests | Depends On |
|-------|----------|---------------|------------|
| 1 | [PHASE_1_MASTER_DATA.md](./PHASE_1_MASTER_DATA.md) | Create/Edit/Deactivate Suppliers, Customers, Products, Payment Accounts | Nothing |
| 2 | [PHASE_2_PURCHASE_FLOW.md](./PHASE_2_PURCHASE_FLOW.md) | Purchase transaction: draft → post → verify stock + supplier balance | Phase 1 |
| 3 | [PHASE_3_SALE_FLOW.md](./PHASE_3_SALE_FLOW.md) | Sale transaction: draft → post → verify stock + customer balance | Phase 2 |
| 4 | [PHASE_4_PAYMENT_FLOWS.md](./PHASE_4_PAYMENT_FLOWS.md) | Supplier payment + Customer payment → balances + account statement | Phase 2, 3 |
| 5 | [PHASE_5_RETURN_FLOWS.md](./PHASE_5_RETURN_FLOWS.md) | Supplier return + Customer return → stock reversal, balance adjustment | Phase 2, 3 |
| 6 | [PHASE_6_TRANSFERS_ADJUSTMENTS.md](./PHASE_6_TRANSFERS_ADJUSTMENTS.md) | Internal transfer between accounts + Stock adjustment (in/out) | Phase 1 |
| 7 | [PHASE_7_REPORTS.md](./PHASE_7_REPORTS.md) | P&L, Trial Balance, Aged Receivables/Payables, Inventory Valuation | Phase 2–6 |
| 8 | [PHASE_8_CROSS_MODULE_CONSISTENCY.md](./PHASE_8_CROSS_MODULE_CONSISTENCY.md) | Dashboard KPIs, Ledger statements, Allocations, edge cases | Phase 2–6 |

---

## Seed Data (Used Across All Phases)

All test phases use this pre-defined data. Create it in Phase 1.

### Suppliers
| Ref | Name | Phone | Address |
|-----|------|-------|---------|
| S1 | Karachi Fabrics Ltd | 0300-1111111 | Karachi |
| S2 | Punjab Steel Works | 0311-2222222 | Lahore |

### Customers
| Ref | Name | Phone | Address |
|-----|------|-------|---------|
| C1 | Ahmed Traders | 0333-3333333 | Islamabad |
| C2 | Zara Retail | 0344-4444444 | Karachi |

### Products
| Ref | Name | Unit | Variants |
|-----|------|------|---------|
| P1 | Premium Cloth | Meter | P1-V1: Size S, P1-V2: Size M |
| P2 | Steel Rod | Kg | P2-V1: 6mm, P2-V2: 12mm |

### Payment Accounts
| Ref | Name | Type | Opening Balance |
|-----|------|------|----------------|
| A1 | HBL Main | BANK | 100,000 |
| A2 | Cash Box | CASH | 50,000 |
| A3 | JazzCash | WALLET | 20,000 |

---

## Cross-Module Dependency Map

This is the master reference for "if I do X, where does it show up?"

### PURCHASE (posted)
```
Action: POST /transactions/purchases/draft → /transactions/{id}/post

Side effects:
  ✓ Supplier balance increases        → /supplier/detail/[id] → Balance card "Current Balance"
  ✓ Product stock increases           → /products/detail/[id] → Stock card + Movements tab
  ✓ Transaction appears in TX list    → /transactions → filter by type PURCHASE
  ✓ Supplier ledger entry added       → /supplier/detail/[id] → Ledger tab
  ✓ Supplier open documents shows it  → /supplier/detail/[id] → Open Documents tab (if unpaid)
  ✓ Dashboard payables total up       → / → "Total Payables" KPI card
  ✓ Trial Balance: Inventory Dr, Payable Cr → /reports/trial-balance
  ✓ Inventory Valuation: stock value up → /reports/inventory-valuation
  ✓ Aged Payables: invoice appears   → /reports/aged-payables
```

### SALE (posted)
```
Action: POST /transactions/sales/draft → /transactions/{id}/post

Side effects:
  ✓ Customer balance increases        → /customer/detail/[id] → Balance card
  ✓ Product stock decreases           → /products/detail/[id] → Stock card + Movements tab
  ✓ Transaction appears in TX list    → /transactions → filter by type SALE
  ✓ Customer ledger entry added       → /customer/detail/[id] → Ledger tab
  ✓ Customer open documents shows it  → /customer/detail/[id] → Open Documents tab
  ✓ Dashboard receivables total up    → / → "Total Receivables" KPI card
  ✓ Trial Balance: Receivable Dr, Revenue Cr, COGS Dr, Inventory Cr
  ✓ Inventory Valuation: stock value down
  ✓ Aged Receivables: invoice appears → /reports/aged-receivables
  ✓ P&L: revenue line added          → /reports/profit-loss
```

### SUPPLIER PAYMENT (posted)
```
Action: POST /transactions/supplier-payments/draft → /transactions/{id}/post

Side effects:
  ✓ Supplier balance decreases        → /supplier/detail/[id] → Balance card
  ✓ Payment account balance decreases → /payment-accounts/detail/[id] → Balance card
  ✓ Payment account statement entry   → /payment-accounts/detail/[id] → Statement tab
  ✓ Supplier ledger entry added       → /supplier/detail/[id] → Ledger tab
  ✓ Supplier open documents updated   → /supplier/detail/[id] → Open Documents tab (invoice marked paid/partial)
  ✓ Dashboard payables total down     → / → "Total Payables" KPI
  ✓ Dashboard cash balance down       → / → "Cash & Bank" KPI
  ✓ Trial Balance: Payable Dr, Bank Cr
```

### CUSTOMER PAYMENT (posted)
```
Action: POST /transactions/customer-payments/draft → /transactions/{id}/post

Side effects:
  ✓ Customer balance decreases        → /customer/detail/[id] → Balance card
  ✓ Payment account balance increases → /payment-accounts/detail/[id] → Balance card
  ✓ Payment account statement entry   → /payment-accounts/detail/[id] → Statement tab
  ✓ Customer ledger entry added       → /customer/detail/[id] → Ledger tab
  ✓ Customer open documents updated   → /customer/detail/[id] → Open Documents tab
  ✓ Dashboard receivables total down  → / → "Total Receivables" KPI
  ✓ Dashboard cash balance up         → / → "Cash & Bank" KPI
  ✓ Trial Balance: Bank Dr, Receivable Cr
```

### SUPPLIER RETURN (posted)
```
Action: POST /transactions/supplier-returns/draft → /transactions/{id}/post

Side effects:
  ✓ Supplier balance decreases        → /supplier/detail/[id] → Balance card (we returned goods = less debt)
  ✓ Product stock decreases           → /products/detail/[id] → Stock card (goods sent back)
  ✓ Supplier ledger entry added       → /supplier/detail/[id] → Ledger tab
  ✓ Supplier open documents updated   → Open Documents tab
  ✓ Trial Balance: Payable Dr, Inventory Cr
```

### CUSTOMER RETURN (posted)
```
Action: POST /transactions/customer-returns/draft → /transactions/{id}/post

Side effects:
  ✓ Customer balance decreases        → /customer/detail/[id] → Balance card (we credited them)
  ✓ Product stock increases           → /products/detail/[id] → Stock card (goods came back)
  ✓ Customer ledger entry added       → /customer/detail/[id] → Ledger tab
  ✓ Trial Balance: Revenue Dr (reversal), Receivable Cr, Inventory Dr, COGS Cr
```

### INTERNAL TRANSFER (posted)
```
Action: POST /transactions/internal-transfers/draft → /transactions/{id}/post

Side effects:
  ✓ Source account balance decreases  → /payment-accounts/detail/[fromId] → Balance card
  ✓ Source account statement: debit   → /payment-accounts/detail/[fromId] → Statement tab
  ✓ Dest account balance increases    → /payment-accounts/detail/[toId] → Balance card
  ✓ Dest account statement: credit    → /payment-accounts/detail/[toId] → Statement tab
  ✓ Dashboard cash total unchanged    → / → "Cash & Bank" KPI (net zero)
  ✓ Trial Balance: Bank(to) Dr, Bank(from) Cr
```

### STOCK ADJUSTMENT (posted)
```
Action: POST /transactions/adjustments/draft → /transactions/{id}/post

Side effects (direction = IN):
  ✓ Product stock increases           → /products/detail/[id] → Stock card + Movements tab
  ✓ Inventory Valuation: value up     → /reports/inventory-valuation

Side effects (direction = OUT):
  ✓ Product stock decreases           → /products/detail/[id] → Stock card + Movements tab
  ✓ Inventory Valuation: value down
```

---

## GitHub Issue Template

When you find a bug, open an issue with this format:

```
Title: [Module] Brief description of the bug

Body:
## Steps to Reproduce
1.
2.
3.

## Expected Result
What should happen.

## Actual Result
What actually happened.

## Phase / Test Case Reference
Phase X → Test TC-XXX

## Severity
[ ] Critical (data corruption, incorrect balances)
[ ] High (wrong data displayed, flow broken)
[ ] Medium (UI issue, wrong styling)
[ ] Low (typo, cosmetic)

## Module
[ ] Supplier  [ ] Customer  [ ] Product  [ ] Payment Account
[ ] Transaction  [ ] Reports  [ ] Dashboard  [ ] Auth
```

---

## Testing Conventions

- **BEFORE each phase**: Note starting balances for all affected entities.
- **AFTER each action**: Immediately check ALL listed side-effect locations.
- **Tolerance**: Balance checks should be exact (PKR X,XXX.00), not approximate.
- **Draft vs Posted**: Many bugs appear only after posting — always test both states.
- **Date format**: Use `YYYY-MM-DD` for all date inputs (e.g., `2026-03-10`).
- **PKR format**: The system shows amounts as `PKR X,XXX.00` via `formatPKR()`.
