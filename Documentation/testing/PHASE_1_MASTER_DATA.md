# Phase 1 — Master Data
## Suppliers · Customers · Products · Payment Accounts

> **Goal**: Verify that all four master data modules can be created, read, edited,
> status-toggled, and listed correctly. No transactions yet.
>
> **Depends on**: Nothing (this is the starting state).
> **Creates**: The seed data referenced by all later phases.

---

## Module 1A: Suppliers

### TC-101 — Create Supplier S1

**Where**: `/supplier` → click "Add Supplier" button (opens right drawer)

**Input**:
| Field | Value |
|-------|-------|
| Name | `Karachi Fabrics Ltd` |
| Phone | `0300-1111111` |
| Address | `Karachi, Pakistan` |
| Notes | `Primary fabric supplier. Credit terms: 30 days.` |

**Action**: Click "Save" / "Create"

**Expected — Drawer closes, list refreshes**:
- [ ] New row "Karachi Fabrics Ltd" appears in the supplier table
- [ ] Status badge shows **ACTIVE** (green)
- [ ] Phone column shows `0300-1111111`
- [ ] No balance shown yet (or PKR 0.00)

**Expected — Supplier Detail** (`/supplier/detail/[id]`):
- [ ] Name: `Karachi Fabrics Ltd`
- [ ] Phone: `0300-1111111`
- [ ] Address: `Karachi, Pakistan`
- [ ] Notes: `Primary fabric supplier. Credit terms: 30 days.`
- [ ] Current Balance card: **PKR 0.00**
- [ ] Ledger tab: empty (no entries)
- [ ] Open Documents tab: empty
- [ ] Transactions tab: empty

**Record the ID**: `S1 ID = _______________`

---

### TC-102 — Create Supplier S2

**Where**: `/supplier` → "Add Supplier"

**Input**:
| Field | Value |
|-------|-------|
| Name | `Punjab Steel Works` |
| Phone | `0311-2222222` |
| Address | `Lahore, Pakistan` |
| Notes | `Steel supplier. Cash payment preferred.` |

**Expected — Supplier list**:
- [ ] Both S1 and S2 appear in the list
- [ ] List shows "Showing 2 of 2 records" (or correct pagination text)
- [ ] Both have ACTIVE status

**Record the ID**: `S2 ID = _______________`

---

### TC-103 — Edit Supplier S1

**Where**: `/supplier/detail/[S1_ID]` → click Edit button

**Change**:
| Field | Old Value | New Value |
|-------|-----------|-----------|
| Phone | `0300-1111111` | `0300-9999999` |
| Notes | (existing) | `Updated: Net 45 days credit.` |

**Action**: Save

**Expected**:
- [ ] Detail page refreshes showing new phone `0300-9999999`
- [ ] Notes updated
- [ ] Name and Address unchanged
- [ ] Balance still PKR 0.00 (edit doesn't affect balance)
- [ ] Supplier appears in list with updated phone (if phone shown in list)

---

### TC-104 — Supplier List Search & Filter

**Where**: `/supplier`

**Test A — Search by name**:
- Type `Punjab` in the search box
- [ ] Only "Punjab Steel Works" appears
- [ ] "Karachi Fabrics Ltd" is hidden

**Test B — Clear search**:
- Clear the search box
- [ ] Both suppliers reappear

**Test C — Filter by status ACTIVE**:
- Apply status filter = ACTIVE
- [ ] Both suppliers shown (both are active)

---

### TC-105 — Deactivate Supplier S2

**Where**: `/supplier/detail/[S2_ID]` → Status toggle / "Change Status" button

**Action**: Change status to INACTIVE

**Expected — Detail page**:
- [ ] Status badge changes to **INACTIVE** (red/gray)
- [ ] Balance and other data remain visible

**Expected — Supplier list**:
- [ ] S2 still appears in list (not deleted)
- [ ] S2 status badge shows INACTIVE

**Test — Filter by status**:
- Filter list by status = ACTIVE → only S1 shown
- Filter list by status = INACTIVE → only S2 shown

**Action**: Reactivate S2 (change status back to ACTIVE)
- [ ] S2 status badge returns to ACTIVE
- [ ] Both suppliers show as ACTIVE in list

---

### TC-106 — Supplier Validation

**Where**: `/supplier` → "Add Supplier"

**Test A — Submit empty form**:
- Click Save without filling anything
- [ ] Error shown: Name is required (or equivalent)
- [ ] Drawer does NOT close
- [ ] No new supplier in list

**Test B — Duplicate phone** (if backend enforces):
- Enter phone `0311-2222222` (same as S2)
- [ ] Either error shown, or allowed (note behavior)

---

## Module 1B: Customers

### TC-201 — Create Customer C1

**Where**: `/customer` → "Add Customer"

**Input**:
| Field | Value |
|-------|-------|
| Name | `Ahmed Traders` |
| Phone | `0333-3333333` |
| Address | `Islamabad, Pakistan` |
| Notes | `Wholesale buyer. Credit limit PKR 500,000.` |

**Expected — Customer list**:
- [ ] "Ahmed Traders" appears with ACTIVE status
- [ ] PKR 0.00 balance

**Expected — Customer Detail** (`/customer/detail/[id]`):
- [ ] Name, Phone, Address, Notes all correct
- [ ] Current Balance: **PKR 0.00**
- [ ] All tabs (Ledger, Open Documents, Transactions) empty

**Record the ID**: `C1 ID = _______________`

---

### TC-202 — Create Customer C2

**Input**:
| Field | Value |
|-------|-------|
| Name | `Zara Retail` |
| Phone | `0344-4444444` |
| Address | `Karachi, Pakistan` |
| Notes | `Retail store. COD only.` |

**Expected**:
- [ ] Both C1 and C2 in list, both ACTIVE, both PKR 0.00

**Record the ID**: `C2 ID = _______________`

---

### TC-203 — Edit Customer C1

**Change**:
| Field | New Value |
|-------|-----------|
| Address | `Blue Area, Islamabad` |

**Expected**:
- [ ] Address updated on detail page
- [ ] Balance unchanged at PKR 0.00

---

### TC-204 — Customer List Search

- Search `Zara` → only C2 shown
- Search `traders` → only C1 shown (case-insensitive)
- Clear → both shown

---

### TC-205 — Customer Status Toggle

Same flow as TC-105 but for customers.

- Deactivate C2 → INACTIVE badge
- Reactivate C2 → ACTIVE badge
- Filter by status confirms correct grouping

---

## Module 1C: Products

### TC-301 — Create Product P1

**Where**: `/products` → "Add Product"

**Input**:
| Field | Value |
|-------|-------|
| Name | `Premium Cloth` |
| SKU | `CLT-001` |
| Category | `Fabric` |
| Unit | `Meter` |

**Action**: Save

**Expected — Product list**:
- [ ] "Premium Cloth" appears with ACTIVE status
- [ ] Unit shows `Meter`
- [ ] Stock: 0 (no stock yet)
- [ ] Avg Cost: PKR 0.00

**Expected — Product Detail** (`/products/detail/[id]`):
- [ ] Name: Premium Cloth
- [ ] SKU: CLT-001
- [ ] Category: Fabric
- [ ] Unit: Meter
- [ ] Total Stock: **0**
- [ ] Avg Cost: **PKR 0.00**
- [ ] Variants table: empty (no variants yet)
- [ ] Movements tab: empty
- [ ] Purchases tab: empty
- [ ] Sales tab: empty

**Record the ID**: `P1 ID = _______________`

---

### TC-302 — Add Variant to P1

**Where**: `/products/detail/[P1_ID]` → "Add Variant" button

**Variant 1 (P1-V1)**:
| Field | Value |
|-------|-------|
| Size / Label | `Small` |
| SKU | `CLT-001-S` |

**Expected**:
- [ ] Variant row appears in Variants table
- [ ] Size: Small, SKU: CLT-001-S
- [ ] Current Stock: 0
- [ ] Avg Cost: PKR 0.00
- [ ] Status: ACTIVE

**Record the ID**: `P1-V1 ID = _______________`

**Variant 2 (P1-V2)**:
| Field | Value |
|-------|-------|
| Size / Label | `Medium` |
| SKU | `CLT-001-M` |

**Expected**:
- [ ] Second variant row added
- [ ] Total variant count = 2

**Record the ID**: `P1-V2 ID = _______________`

---

### TC-303 — Create Product P2

**Input**:
| Field | Value |
|-------|-------|
| Name | `Steel Rod` |
| SKU | `STL-001` |
| Category | `Hardware` |
| Unit | `Kg` |

**Variants**:

**P2-V1**:
| Field | Value |
|-------|-------|
| Size / Label | `6mm` |
| SKU | `STL-001-6` |

**P2-V2**:
| Field | Value |
|-------|-------|
| Size / Label | `12mm` |
| SKU | `STL-001-12` |

**Expected**:
- [ ] P2 in list with 2 variants
- [ ] All stock = 0

**Record IDs**:
- `P2 ID = _______________`
- `P2-V1 ID = _______________`
- `P2-V2 ID = _______________`

---

### TC-304 — Edit Product P1

**Where**: `/products/detail/[P1_ID]` → Edit

**Change**:
| Field | New Value |
|-------|-----------|
| Category | `Premium Fabric` |

**Expected**:
- [ ] Category updated to "Premium Fabric"
- [ ] All other fields unchanged
- [ ] Stock and variants unaffected

---

### TC-305 — Edit Variant P1-V1

**Where**: `/products/detail/[P1_ID]` → Variants table → Edit P1-V1

**Change**:
| Field | New Value |
|-------|-----------|
| Size / Label | `Small (S)` |

**Expected**:
- [ ] Variant label updated in table
- [ ] Stock remains 0
- [ ] Other variant (P1-V2) unchanged

---

### TC-306 — Deactivate Variant P1-V2

**Where**: `/products/detail/[P1_ID]` → Variants table → change P1-V2 status

**Action**: Deactivate P1-V2

**Expected**:
- [ ] P1-V2 status badge = INACTIVE
- [ ] P1-V1 remains ACTIVE
- [ ] Product-level status still ACTIVE

**Reactivate**: Change P1-V2 back to ACTIVE before next phase.

---

### TC-307 — Product List Search & Filter

- Search `cloth` → only P1 shown
- Search `steel` → only P2 shown
- Filter by category `Fabric` → behavior depends on implementation

---

### TC-308 — Deactivate Product P2 (then reactivate)

**Where**: `/products/detail/[P2_ID]` → Change Product Status

- Deactivate → INACTIVE badge
- [ ] Variants still visible
- Reactivate → ACTIVE badge
- [ ] Product appears in active filter

---

## Module 1D: Payment Accounts

### TC-401 — Create Account A1 (HBL Main)

**Where**: `/payment-accounts` → "Add Account"

**Input**:
| Field | Value |
|-------|-------|
| Name | `HBL Main` |
| Type | `BANK` |
| Opening Balance | `100000` |

**Expected — Account list**:
- [ ] "HBL Main" appears with type BANK
- [ ] Current Balance: **PKR 100,000.00**

**Expected — Account Detail** (`/payment-accounts/detail/[id]`):
- [ ] Name: HBL Main
- [ ] Type: BANK
- [ ] Opening Balance: PKR 100,000.00
- [ ] Current Balance: **PKR 100,000.00**
- [ ] Total In: PKR 0.00
- [ ] Total Out: PKR 0.00
- [ ] Statement tab: empty (no transactions yet)

**Record the ID**: `A1 ID = _______________`

---

### TC-402 — Create Account A2 (Cash Box)

**Input**:
| Field | Value |
|-------|-------|
| Name | `Cash Box` |
| Type | `CASH` |
| Opening Balance | `50000` |

**Expected**:
- [ ] Current Balance: **PKR 50,000.00**

**Record the ID**: `A2 ID = _______________`

---

### TC-403 — Create Account A3 (JazzCash)

**Input**:
| Field | Value |
|-------|-------|
| Name | `JazzCash` |
| Type | `WALLET` |
| Opening Balance | `20000` |

**Expected**:
- [ ] Current Balance: **PKR 20,000.00**

**Record the ID**: `A3 ID = _______________`

---

### TC-404 — Dashboard: Cash & Bank KPI

**Where**: `/` (Dashboard)

**Expected — "Cash & Bank" KPI card**:
- [ ] Total = **PKR 170,000.00** (100,000 + 50,000 + 20,000)
- [ ] Individual accounts listed: HBL Main PKR 100,000, Cash Box PKR 50,000, JazzCash PKR 20,000

---

### TC-405 — Edit Account A1

**Change**:
| Field | New Value |
|-------|-----------|
| Name | `HBL Main Account` |

**Expected**:
- [ ] Name updated on detail page
- [ ] Name updated in account list
- [ ] Current Balance unchanged at PKR 100,000.00

---

### TC-406 — Account Status Toggle

- Deactivate A3 (JazzCash) → INACTIVE
- [ ] Dashboard Cash & Bank total drops to **PKR 150,000.00** (or stays same — note behavior)
- Reactivate A3 → ACTIVE
- [ ] Dashboard total returns to PKR 170,000.00

---

### TC-407 — Account List Filter by Type

- Filter by type = BANK → only A1 shown
- Filter by type = CASH → only A2 shown
- Filter by type = WALLET → only A3 shown
- Clear filter → all 3 shown

---

## Phase 1 Completion Checklist

Before moving to Phase 2, confirm all IDs are recorded:

| Entity | Ref | ID |
|--------|-----|----|
| Supplier | S1 | _______________ |
| Supplier | S2 | _______________ |
| Customer | C1 | _______________ |
| Customer | C2 | _______________ |
| Product | P1 | _______________ |
| Product Variant | P1-V1 | _______________ |
| Product Variant | P1-V2 | _______________ |
| Product | P2 | _______________ |
| Product Variant | P2-V1 | _______________ |
| Product Variant | P2-V2 | _______________ |
| Payment Account | A1 | _______________ |
| Payment Account | A2 | _______________ |
| Payment Account | A3 | _______________ |

**Starting balances to record for Phase 2**:
| Entity | Current Balance |
|--------|----------------|
| S1 (Supplier) | PKR 0.00 |
| S2 (Supplier) | PKR 0.00 |
| C1 (Customer) | PKR 0.00 |
| C2 (Customer) | PKR 0.00 |
| P1-V1 Stock | 0 Meter |
| P1-V2 Stock | 0 Meter |
| P2-V1 Stock | 0 Kg |
| P2-V2 Stock | 0 Kg |
| A1 Balance | PKR 100,000.00 |
| A2 Balance | PKR 50,000.00 |
| A3 Balance | PKR 20,000.00 |

---

**→ Next: [PHASE_2_PURCHASE_FLOW.md](./PHASE_2_PURCHASE_FLOW.md)**
