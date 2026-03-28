// Command Palette — resolver
// V1: static navigation + create commands.
// V2: entity search results (customers, suppliers, products, accounts) mixed in.
// V3: contextual action chips per entity.

import { SearchResultItem, SearchResultType } from "./search";

export type CommandCategory =
  | "Navigation"
  | "Transactions"
  | "Reports"
  | "Customers"
  | "Suppliers"
  | "Products"
  | "Accounts";

export type BadgeTone = "success" | "warning" | "info" | "error";

export type CommandItem = {
  id: string;
  category: CommandCategory;
  title: string;
  subtitle?: string;
  icon: string;
  iconClassName: string;
  route: string;
  // Set before routing — used by detail pages that read from sessionStorage
  sessionStorageEntry?: { key: string; value: string };
  // aliases checked during search alongside title/subtitle
  keywords?: string[];
  // V2+ entity results
  badge?: string;
  badgeTone?: BadgeTone;
  // V3+ entity action chips
  actions?: Array<{
    label: string;
    route: string;
    sessionStorageEntry?: { key: string; value: string };
  }>;
};

// V1 static commands display order
export const CATEGORY_ORDER: CommandCategory[] = [
  "Navigation",
  "Transactions",
  "Reports",
];

const NAV_ICON = "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
const REPORT_ICON = "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300";

export const COMMANDS: CommandItem[] = [
  // ── Navigation ──────────────────────────────────────────────────────────────
  {
    id: "nav-dashboard",
    category: "Navigation",
    title: "Dashboard",
    subtitle: "Go to the main overview",
    icon: "DB",
    iconClassName: NAV_ICON,
    route: "/",
    keywords: ["home", "overview", "main"],
  },
  {
    id: "nav-transactions",
    category: "Navigation",
    title: "All Transactions",
    subtitle: "Browse and filter every transaction",
    icon: "TX",
    iconClassName: NAV_ICON,
    route: "/transactions",
    keywords: ["ledger", "history", "list"],
  },
  {
    id: "nav-suppliers",
    category: "Navigation",
    title: "Suppliers",
    subtitle: "Manage supplier accounts",
    icon: "SU",
    iconClassName: NAV_ICON,
    route: "/supplier",
    keywords: ["vendor", "vendors", "supplier list"],
  },
  {
    id: "nav-customers",
    category: "Navigation",
    title: "Customers",
    subtitle: "Manage customer accounts",
    icon: "CU",
    iconClassName: NAV_ICON,
    route: "/customer",
    keywords: ["client", "clients", "buyer", "customer list"],
  },
  {
    id: "nav-payment-accounts",
    category: "Navigation",
    title: "Payment Accounts",
    subtitle: "Bank accounts, cash and wallets",
    icon: "PA",
    iconClassName: NAV_ICON,
    route: "/payment-accounts",
    keywords: ["bank", "cash", "wallet", "accounts"],
  },
  {
    id: "nav-products",
    category: "Navigation",
    title: "Products",
    subtitle: "Inventory and product variants",
    icon: "PR",
    iconClassName: NAV_ICON,
    route: "/products",
    keywords: ["inventory", "items", "stock", "sku"],
  },
  {
    id: "nav-expenses",
    category: "Navigation",
    title: "Expenses",
    subtitle: "Track and manage expenses",
    icon: "EX",
    iconClassName: NAV_ICON,
    route: "/expenses",
    keywords: ["expense list", "costs"],
  },
  {
    id: "nav-expense-categories",
    category: "Navigation",
    title: "Expense Categories",
    subtitle: "Manage expense category settings",
    icon: "EC",
    iconClassName: NAV_ICON,
    route: "/settings/expense-categories",
    keywords: ["categories", "settings", "expense types"],
  },
  {
    id: "nav-profile",
    category: "Navigation",
    title: "Profile",
    subtitle: "Your user profile and preferences",
    icon: "PF",
    iconClassName: NAV_ICON,
    route: "/profile",
    keywords: ["settings", "account", "user", "me"],
  },

  // ── Transactions (create flows) ──────────────────────────────────────────────
  {
    id: "create-sale",
    category: "Transactions",
    title: "New Sale",
    subtitle: "Create a new sales transaction",
    icon: "+",
    iconClassName: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    route: "/transactions/sale",
    keywords: ["sell", "selling", "invoice", "sales"],
  },
  {
    id: "create-purchase",
    category: "Transactions",
    title: "New Purchase",
    subtitle: "Create a new purchase order",
    icon: "+",
    iconClassName: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    route: "/transactions/purchase",
    keywords: ["buy", "buying", "order", "procurement"],
  },
  {
    id: "create-supplier-payment",
    category: "Transactions",
    title: "Supplier Payment",
    subtitle: "Pay an outstanding supplier balance",
    icon: "↑",
    iconClassName: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    route: "/transactions/supplier-payment",
    keywords: ["pay supplier", "pay vendor", "outgoing"],
  },
  {
    id: "create-customer-receipt",
    category: "Transactions",
    title: "Customer Receipt",
    subtitle: "Record an incoming customer payment",
    icon: "↓",
    iconClassName: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    route: "/transactions/customer-payment",
    keywords: ["receipt", "customer payment", "incoming", "collect", "collection"],
  },
  {
    id: "create-supplier-return",
    category: "Transactions",
    title: "Supplier Return",
    subtitle: "Return goods or credit to a supplier",
    icon: "←",
    iconClassName: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
    route: "/transactions/supplier-return",
    keywords: ["return to supplier", "debit note"],
  },
  {
    id: "create-customer-return",
    category: "Transactions",
    title: "Customer Return",
    subtitle: "Accept a return from a customer",
    icon: "→",
    iconClassName: "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300",
    route: "/transactions/customer-return",
    keywords: ["return from customer", "credit note"],
  },
  {
    id: "create-internal-transfer",
    category: "Transactions",
    title: "Internal Transfer",
    subtitle: "Move funds between payment accounts",
    icon: "⇄",
    iconClassName: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
    route: "/transactions/internal-transfer",
    keywords: ["transfer", "move funds", "between accounts"],
  },
  {
    id: "create-stock-adjustment",
    category: "Transactions",
    title: "Stock Adjustment",
    subtitle: "Adjust inventory quantities manually",
    icon: "≡",
    iconClassName: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
    route: "/transactions/stock-adjustment",
    keywords: ["adjust stock", "inventory adjustment", "write off"],
  },
  {
    id: "create-expense",
    category: "Transactions",
    title: "New Expense",
    subtitle: "Record a new business expense",
    icon: "+",
    iconClassName: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    route: "/expenses/new",
    keywords: ["add expense", "expense entry", "cost"],
  },

  // ── Reports ──────────────────────────────────────────────────────────────────
  {
    id: "report-pl",
    category: "Reports",
    title: "Profit & Loss",
    subtitle: "Income and expense summary report",
    icon: "PL",
    iconClassName: REPORT_ICON,
    route: "/reports/profit-loss",
    keywords: ["p&l", "income statement", "profit loss", "revenue"],
  },
  {
    id: "report-balance-sheet",
    category: "Reports",
    title: "Balance Sheet",
    subtitle: "Assets, liabilities, and equity snapshot",
    icon: "BS",
    iconClassName: REPORT_ICON,
    route: "/reports/balance-sheet",
    keywords: ["assets", "liabilities", "equity", "financial position"],
  },
  {
    id: "report-cash-position",
    category: "Reports",
    title: "Cash Position",
    subtitle: "Current cash and bank balances",
    icon: "CP",
    iconClassName: REPORT_ICON,
    route: "/reports/cash-position",
    keywords: ["cash", "bank balance", "liquidity"],
  },
  {
    id: "report-trial-balance",
    category: "Reports",
    title: "Trial Balance",
    subtitle: "Debit and credit totals by account",
    icon: "TB",
    iconClassName: REPORT_ICON,
    route: "/reports/trial-balance",
    keywords: ["trial", "debit", "credit", "accounts"],
  },
  {
    id: "report-aged-receivables",
    category: "Reports",
    title: "Aged Receivables",
    subtitle: "Outstanding customer balances by age",
    icon: "AR",
    iconClassName: REPORT_ICON,
    route: "/reports/aged-receivables",
    keywords: ["receivables", "customer dues", "outstanding customers", "debtors"],
  },
  {
    id: "report-aged-payables",
    category: "Reports",
    title: "Aged Payables",
    subtitle: "Outstanding supplier balances by age",
    icon: "AP",
    iconClassName: REPORT_ICON,
    route: "/reports/aged-payables",
    keywords: ["payables", "supplier dues", "outstanding suppliers", "creditors"],
  },
  {
    id: "report-inventory-valuation",
    category: "Reports",
    title: "Inventory Valuation",
    subtitle: "Stock value and quantity by product",
    icon: "IV",
    iconClassName: REPORT_ICON,
    route: "/reports/inventory-valuation",
    keywords: ["stock value", "inventory report", "stock on hand"],
  },
];

// ── V2 Entity helpers ─────────────────────────────────────────────────────────

const ENTITY_ICON_CLASS: Record<SearchResultType, string> = {
  customer: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  supplier: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  product:  "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  account:  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
};

const ENTITY_CATEGORY: Record<SearchResultType, CommandCategory> = {
  customer: "Customers",
  supplier: "Suppliers",
  product:  "Products",
  account:  "Accounts",
};

// sessionStorage key and detail route per entity type — matches the Shell pattern used across all detail pages
const ENTITY_ROUTING: Record<SearchResultType, { key: string; route: string }> = {
  customer: { key: "customerId",        route: "/customer/detail" },
  supplier: { key: "supplierId",        route: "/supplier/detail" },
  product:  { key: "productId",         route: "/products/detail" },
  account:  { key: "paymentAccountId",  route: "/payment-accounts/detail" },
};

function toInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return (words[0].slice(0, 2)).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function buildActions(type: SearchResultType, id: string): CommandItem["actions"] {
  const { key, route } = ENTITY_ROUTING[type];
  const detailRoute = `${route}?id=${id}`;
  const detailEntry = { key, value: id };

  switch (type) {
    case "customer":
      return [
        { label: "Open Detail",        route: detailRoute, sessionStorageEntry: detailEntry },
        { label: "New Sale",           route: "/transactions/sale",             sessionStorageEntry: { key: "prefillCustomerId", value: id } },
        { label: "Customer Receipt",   route: "/transactions/customer-payment", sessionStorageEntry: { key: "prefillCustomerId", value: id } },
        { label: "Customer Return",    route: "/transactions/customer-return",  sessionStorageEntry: { key: "prefillCustomerId", value: id } },
        { label: "Open Documents",     route: detailRoute, sessionStorageEntry: detailEntry },
      ];
    case "supplier":
      return [
        { label: "Open Detail",        route: detailRoute, sessionStorageEntry: detailEntry },
        { label: "New Purchase",       route: "/transactions/purchase",           sessionStorageEntry: { key: "prefillSupplierId", value: id } },
        { label: "Supplier Payment",   route: "/transactions/supplier-payment",   sessionStorageEntry: { key: "prefillSupplierId", value: id } },
        { label: "Supplier Return",    route: "/transactions/supplier-return",    sessionStorageEntry: { key: "prefillSupplierId", value: id } },
        { label: "Open Documents",     route: detailRoute, sessionStorageEntry: detailEntry },
      ];
    case "product":
      return [
        { label: "Open Detail",        route: detailRoute, sessionStorageEntry: detailEntry },
        { label: "New Sale",           route: "/transactions/sale" },
        { label: "New Purchase",       route: "/transactions/purchase" },
        { label: "Stock Movements",    route: detailRoute, sessionStorageEntry: detailEntry },
      ];
    case "account":
      return [
        { label: "Open Detail",        route: detailRoute, sessionStorageEntry: detailEntry },
        { label: "Internal Transfer",  route: "/transactions/internal-transfer" },
        { label: "Statement",          route: detailRoute, sessionStorageEntry: detailEntry },
      ];
  }
}

export function entityToCommandItem(result: SearchResultItem): CommandItem {
  const { key, route } = ENTITY_ROUTING[result.type];
  return {
    id: `entity-${result.type}-${result.id}`,
    category: ENTITY_CATEGORY[result.type],
    title: result.title,
    subtitle: result.subtitle,
    icon: toInitials(result.title),
    iconClassName: ENTITY_ICON_CLASS[result.type],
    route: `${route}?id=${result.id}`,
    sessionStorageEntry: { key, value: result.id },
    badge: result.status === "INACTIVE" ? "INACTIVE" : undefined,
    badgeTone: result.status === "INACTIVE" ? "error" : undefined,
    actions: buildActions(result.type, result.id),
  };
}
