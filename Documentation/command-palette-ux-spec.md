# Transflow Command Palette UX Specification

## 1. Objective
Build a global Command Palette that opens with keyboard shortcuts and allows users to quickly find records and execute high-frequency actions without navigating multiple screens.

Primary outcomes:
- Reduce clicks and time to complete common workflows.
- Enable action-first operation from anywhere.
- Improve discoverability of key business flows.

## 2. Trigger and Interaction Model
- Open palette: Cmd+K (macOS), Ctrl+K (Windows/Linux).
- Alternate open: click top search bar in header.
- Close palette: Esc.
- Navigate results: Up/Down arrows.
- Execute highlighted command: Enter.
- Open selected result in new tab (optional): Cmd+Enter / Ctrl+Enter.

Behavior:
- Palette is global and available on all authenticated pages.
- Input supports fuzzy matching and aliases.
- Results are grouped by type: Commands, Customers, Suppliers, Products, Transactions, Accounts, Reports.
- Selecting an entity opens an action panel for that entity (example: Customer -> New Sale, Customer Receipt, Customer Return).

## 3. Portal Function Inventory

### 3.1 Navigation Commands
- Go to Dashboard
- Go to All Transactions
- Go to Suppliers
- Go to Customers
- Go to Payment Accounts
- Go to Products
- Go to Expenses
- Go to Expense Categories
- Go to Reports
- Go to Profile

### 3.2 Transaction Creation Commands
- New Purchase
- New Sale
- Supplier Payment
- Customer Receipt
- Supplier Return
- Customer Return
- Internal Transfer
- Stock Adjustment

### 3.3 Entity Search Targets
- Customer (name, phone, optional document references)
- Supplier (name, phone)
- Product (name, SKU, size variants)
- Payment Account (name)
- Transaction (document number)
- Expense (document number, description)

### 3.4 Entity Action Commands

Customer:
- Open Customer Detail
- New Sale for Customer
- Customer Receipt for Customer
- Customer Return for Customer
- View Open Documents

Supplier:
- Open Supplier Detail
- New Purchase for Supplier
- Supplier Payment for Supplier
- Supplier Return for Supplier
- View Open Documents

Product:
- Open Product Detail
- New Sale with Product preselected
- New Purchase with Product preselected
- View Stock Movements

Payment Account:
- Open Account Detail
- Internal Transfer (prefill source account)

Transaction:
- Open Transaction Detail
- Edit Draft Transaction (if draft)
- Void Transaction (if permissions and status allow)

Expense:
- Open Expense Detail
- Edit Expense (if draft)
- New Expense

## 4. Commonly Used Commands (Priority Tiering)

### Tier 1 (must ship first)
- New Sale
- New Purchase
- Customer Receipt
- Supplier Payment
- Open Transaction by document number
- Search customer and run customer actions
- Search supplier and run supplier actions

### Tier 2
- Supplier Return
- Customer Return
- Product search and open detail
- Payment account search and open detail
- Expense create/open/edit draft

### Tier 3
- Reports navigation
- Settings shortcuts
- Advanced command aliases and user-personalized ranking

## 5. Result Design
Each result should contain:
- Title: entity name or command label
- Subtitle: context (type, balance, document number, status)
- Right hint: keyboard enter hint or quick key
- Optional badges: DRAFT, POSTED, ACTIVE, INACTIVE

Examples:
- Customer: Ali Traders | Balance: PKR 120,000
- Command: New Sale for Ali Traders
- Transaction: TRX-2026-00421 | SALE | POSTED

## 6. Query Behavior and Ranking
Ranking strategy:
1. Exact prefix matches (highest)
2. Fuzzy match score
3. Recently used commands/entities
4. High-frequency command boost
5. Role and permission validity filter

Special parsing:
- Numeric-like input should prioritize document numbers.
- "new sale ali" should prioritize action command with matched customer.
- Synonyms supported: receipt = customer payment, pay supplier = supplier payment.

## 7. Prefill and Routing Rules
When an action is selected for an entity, open target page with prefilled context.

Prefill mechanism options:
- sessionStorage keys (aligned with current app patterns)
- URL query fallback where suitable

Examples:
- "New Sale for Ali" -> set customerId, open /transactions/sale
- "Supplier Payment for HBL Textiles" -> set supplierId, open /transactions/supplier-payment
- "Customer Return for Ali" -> set customerId, open /transactions/customer-return

## 8. Keyboard-First UX Details
- Auto-focus search input on open.
- Maintain last query during current open session.
- Tab switches between Results and Actions panel for selected entity.
- Enter executes primary action.
- Shift+Enter can execute secondary action (optional future enhancement).

## 9. Permissions and Safety
- Do not show commands user cannot execute.
- Hide OWNER/ADMIN-only actions for restricted roles.
- Draft-only actions shown only for draft records.
- Destructive actions require confirmation modal (no direct unsafe execution from palette in v1).

## 10. Technical Architecture (v1)

Frontend modules:
- CommandPaletteProvider (global state + open/close handling)
- CommandPaletteModal (UI + keyboard handling)
- Search adapters per domain (customers, suppliers, products, transactions, expenses)
- Action resolver (maps selected entity + action -> route + prefill)

Data sources:
- Existing list APIs already in app (customers, suppliers, products, transactions, expenses, payment accounts)
- Use debounced search with local cache for current session

Performance targets:
- Open to interactive: < 100ms
- Query to results: < 200ms for cached, < 500ms for API-backed

## 11. Rollout Plan

Phase 1:
- Build shell + keyboard open/close
- Add global navigation commands
- Add transaction creation commands

Phase 2:
- Add customer/supplier search + contextual actions
- Add transaction document search

Phase 3:
- Add product/payment account/expense search
- Add recent commands and ranking improvements

Phase 4:
- Add analytics, command usage dashboard, iterative tuning

## 12. Analytics and Success Metrics
Track:
- Palette open count per user/day
- Commands executed from palette
- Time-to-action compared to sidebar navigation
- Top failed queries (no result)

Success criteria after rollout:
- 40%+ of transaction creation initiated from palette
- 30% reduction in time to create sale/purchase/payment flows
- Positive usability feedback from frequent users

## 13. Acceptance Criteria (v1)
- Cmd/Ctrl+K opens palette globally.
- Search returns commands and entities.
- Selecting a customer exposes contextual actions.
- Selecting an action routes correctly with prefilled context.
- Role-restricted commands are hidden.
- No regression in existing navigation and transaction flows.

## 14. Example User Journey
User intent: create sale for customer Ali quickly.
1. User presses Cmd+K.
2. Types "ali".
3. Palette shows customer "Ali" and related actions.
4. User selects "New Sale for Ali".
5. Sale page opens with customer preselected.
6. User completes transaction without manually navigating through customer and sales screens.

## 15. Notes for Implementation Session
- Keep this spec implementation-focused, not visual-heavy.
- Start from Tier 1 commands to deliver value quickly.
- Reuse existing sessionStorage prefill conventions already used in transaction/detail routing.

## 16. Long-Term Structure (Master Roadmap)

This section defines the complete Command + K journey in the order we will implement it.

### 16.1 Product Goal
Command + K should become a full keyboard navigation and action surface for the portal:
- Navigate to any sidebar destination.
- Start create flows directly (Add Product, Add Payment Account, Add Customer, Add Supplier, etc.).
- Find specific entities (customer, supplier, payment account, product) and jump to detail pages.
- Later, run contextual actions for each specific entity from inside the palette.

### 16.2 Delivery Model (Versioned)

V1: Global Navigation + Create Flows
- User types destination or command and navigates without sidebar clicks.
- User types creation intent and opens the matching flow.
- Examples: P&L Report, Balance Sheet, Trial Balance, Products, Payment Accounts, Add Product, Add Customer.

V2: Entity Jump (Detail-First)
- User types a specific entity name (example: Ali).
- Selecting that result opens entity detail page directly.
- No action chips required for entity results in this phase.

V3: Entity Actions (Contextual)
- User types entity name, selects entity, and action row appears.
- Keyboard-first action execution (already prototyped in current UI).
- Actions include "Open Detail" plus domain-specific actions.

V4: Cross-Domain Completion
- Apply V2 + V3 behavior consistently across:
	Customer, Supplier, Payment Account, Product.
- Add deep action coverage where valid.

V5: Quality and Intelligence
- Ranking improvements, aliases, recents, permissions hardening, analytics-driven tuning.

### 16.3 Domain-by-Domain Progression

Customer:
1. V2: type customer name -> open customer detail.
2. V3: add actions (Open Detail, New Sale, Customer Receipt, Customer Return, View Open Documents).

Supplier:
1. V2: type supplier name -> open supplier detail.
2. V3: add actions (Open Detail, New Purchase, Supplier Payment, Supplier Return, View Open Documents).

Payment Account:
1. V2: type account name -> open account detail.
2. V3: add actions (Open Detail, Internal Transfer, Statement).

Product:
1. V2: type product name/SKU -> open product detail.
2. V3: add actions (Open Detail, New Sale with prefill, New Purchase with prefill, Stock Movements).

### 16.4 UX Contract for Keyboard Behavior
- Command + K opens and can toggle-close the palette.
- Esc is hierarchical: exit action mode -> clear query -> close palette.
- Up/Down navigates result list.
- Left/Right navigates entity action chips (when action mode is active).
- Enter executes highlighted item/action.

## 17. Versioned To-Do List (Single Source of Truth)

Use this as the execution checklist for all upcoming work.

### 17.1 Foundation
- [x] Build attached, search-anchored command panel UI.
- [x] Wire Command + K open/close behavior.
- [x] Implement staged Esc behavior and keyboard action mode base.
- [x] Move command palette data to typed resolver modules (no inline demo list in component).

### 17.2 V1 - Global Navigation + Create Commands
- [x] Add full sidebar route coverage in resolver (Dashboard, Transactions, Suppliers, Customers, Payment Accounts, Products, Expenses, Settings, Reports).
- [x] Add report navigation commands (P&L, Balance Sheet, Cash Position, Trial Balance, Aged Receivables, Aged Payables, Inventory Valuation).
- [x] Add create commands: New Sale, New Purchase, Supplier Payment, Customer Receipt, Supplier Return, Customer Return, Internal Transfer, Stock Adjustment, New Expense.
- [x] Decision: all create commands navigate to dedicated transaction/expense pages (not modals) — page-level creation is the existing pattern for all transaction types.
- [x] Implement route adapter in commandResolver.ts — each command has a `route` string; resolver is the single source of truth for routes.
- [ ] Add acceptance tests for V1 keyboard-only flow.

### 17.3 V2 - Entity Jump (Detail-First)
- [ ] Customer lookup: typing customer name returns entity result and opens customer detail on Enter.
- [ ] Supplier lookup: typing supplier name returns entity result and opens supplier detail on Enter.
- [ ] Payment account lookup: typing account name returns entity result and opens account detail on Enter.
- [ ] Product lookup: typing product name/SKU returns entity result and opens product detail on Enter.
- [ ] Add empty/loading/error states for each domain adapter.

### 17.4 V3 - Entity Actions (Contextual)
- [ ] Customer actions in palette (Open Detail, New Sale, Customer Receipt, Customer Return, View Open Documents).
- [ ] Supplier actions in palette (Open Detail, New Purchase, Supplier Payment, Supplier Return, View Open Documents).
- [ ] Payment account actions in palette (Open Detail, Internal Transfer, Statement).
- [ ] Product actions in palette (Open Detail, New Sale prefill, New Purchase prefill, Stock Movements).
- [ ] Ensure Enter on entity enters action mode; Left/Right + Enter executes selected action.
- [ ] Ensure Esc/Tab behavior is consistent with action-mode contract.

### 17.5 V4 - Permissions, Ranking, and Reliability
- [ ] Permission-gate commands/actions by role.
- [ ] Add ranking layers: prefix > fuzzy > recency > frequency.
- [ ] Add command aliases and synonym map.
- [ ] Add telemetry hooks for open, query, result select, action execute.
- [ ] Add keyboard accessibility and focus regression checks.

### 17.6 V5 - Production Readiness
- [ ] Add integration tests for top 20 command journeys.
- [ ] Add performance budget checks for open/render/search latency.
- [ ] Add feature flag / rollout strategy.
- [ ] Publish quick help docs for end users.

### 17.7 Current Next Step
- [x] V1 route and create-command resolver implementation complete.
- [ ] Next: V2 entity jump — customer/supplier/product/account live search via existing list APIs.

---

## 18. Implementation Log

### 18.1 V1 Decisions (2026-03-19)

**Resolver module**: `src/lib/commandResolver.ts` is the single source of truth for all command definitions.
CommandPalette.tsx imports from it; no inline data in the component.

**Category structure shipped in V1**:
- `Navigation` — route to every sidebar destination
- `Transactions` — open every transaction/expense creation page
- `Reports` — open every report page

**Route mapping** (confirmed against `AppSidebar.tsx` and file system):
| Command | Route |
|---|---|
| Dashboard | `/` |
| All Transactions | `/transactions` |
| Suppliers | `/supplier` |
| Customers | `/customer` |
| Payment Accounts | `/payment-accounts` |
| Products | `/products` |
| Expenses | `/expenses` |
| Expense Categories | `/settings/expense-categories` |
| Profile | `/profile` |
| New Sale | `/transactions/sale` |
| New Purchase | `/transactions/purchase` |
| Supplier Payment | `/transactions/supplier-payment` |
| Customer Receipt | `/transactions/customer-payment` |
| Supplier Return | `/transactions/supplier-return` |
| Customer Return | `/transactions/customer-return` |
| Internal Transfer | `/transactions/internal-transfer` |
| Stock Adjustment | `/transactions/stock-adjustment` |
| New Expense | `/expenses/new` |
| Profit & Loss | `/reports/profit-loss` |
| Balance Sheet | `/reports/balance-sheet` |
| Cash Position | `/reports/cash-position` |
| Trial Balance | `/reports/trial-balance` |
| Aged Receivables | `/reports/aged-receivables` |
| Aged Payables | `/reports/aged-payables` |
| Inventory Valuation | `/reports/inventory-valuation` |

**Create command strategy**: All create commands navigate to dedicated pages (no modal triggers in V1).
This matches the existing app pattern — every transaction type has its own route.
"Add Customer / Add Supplier / Add Product / Add Payment Account" are deferred to V2 because they
trigger slide-in drawers on list pages; the drawer trigger mechanism (sessionStorage vs URL param)
needs a decision before implementing.

**Keywords/aliases added** to each command for broader search matching.
Examples: "receipt" matches Customer Receipt, "p&l" matches Profit & Loss, "bank" matches Payment Accounts.

**Action mode preserved**: The Left/Right action chip UX code is kept in CommandPalette.tsx
(marked as foundation complete in §17.1). In V1 no commands have `actions`, so the mode is
inert. It will activate for entity results in V2/V3 when `actions` is populated.

**Debug stubs removed**: `selectionNote` state (was a temporary stub — never routed anywhere) is gone.
