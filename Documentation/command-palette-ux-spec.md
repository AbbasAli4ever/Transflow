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
