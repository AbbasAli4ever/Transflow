export type SupplierStatus = "Active" | "Inactive";

export interface OpenDocument {
  docNumber: string;
  date: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  outstanding: number;
  daysOutstanding: number;
}

export type LedgerEntryType = "PURCHASE" | "PAYMENT" | "CREDIT" | "ADJUSTMENT";

export interface LedgerEntry {
  date: string;
  docNumber: string;
  type: LedgerEntryType;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface Supplier {
  id: number;
  supplierCode: string;
  name: string;
  phone: string;
  email: string;
  location: string;
  notes: string;
  currentBalance: number;
  totalPurchased: number;
  totalPurchasedCount: number;
  totalPaid: number;
  unappliedCredits: number;
  openingBalance: number;
  status: SupplierStatus;
  createdDate: string;
  openDocuments: OpenDocument[];
  ledgerEntries: LedgerEntry[];
}

export const SUPPLIERS: Supplier[] = [
  {
    id: 1,
    supplierCode: "SUP-00001",
    name: "Northwind Traders",
    phone: "+1 (555) 013-4421",
    email: "contact@northwind.com",
    location: "480 Market St, New York, NY 10001",
    notes: "Preferred weekday deliveries. Requires signed receiving document.",
    currentBalance: 12480.0,
    totalPurchased: 428650.0,
    totalPurchasedCount: 184,
    totalPaid: 389120.0,
    unappliedCredits: 420.0,
    openingBalance: 12480.0,
    status: "Active",
    createdDate: "2024-01-15",
    openDocuments: [
      { docNumber: "BILL-00421", date: "2026-01-05", dueDate: "2026-02-04", amount: 2150.0, paidAmount: 500.0, outstanding: 1650.0, daysOutstanding: 27 },
      { docNumber: "BILL-00477", date: "2026-01-20", dueDate: "2026-02-19", amount: 860.0, paidAmount: 0.0, outstanding: 860.0, daysOutstanding: 12 },
      { docNumber: "BILL-00503", date: "2026-01-27", dueDate: "2026-02-26", amount: 3240.0, paidAmount: 1000.0, outstanding: 2240.0, daysOutstanding: 5 },
    ],
    ledgerEntries: [
      { date: "2026-01-05", docNumber: "BILL-00421", type: "PURCHASE", description: "Inventory replenishment invoice", debit: 2150.0, credit: 0, runningBalance: 14630.0 },
      { date: "2026-01-12", docNumber: "PAY-00118", type: "PAYMENT", description: "Bank transfer payment", debit: 0, credit: 1000.0, runningBalance: 13630.0 },
      { date: "2026-01-20", docNumber: "BILL-00477", type: "PURCHASE", description: "Spare parts invoice", debit: 860.0, credit: 0, runningBalance: 14490.0 },
      { date: "2026-01-28", docNumber: "PAY-00143", type: "PAYMENT", description: "Partial settlement", debit: 0, credit: 500.0, runningBalance: 13990.0 },
    ],
  },
  {
    id: 2,
    supplierCode: "SUP-00002",
    name: "BlueLine Foods",
    phone: "+1 (555) 019-9822",
    email: "hello@bluelinefoods.com",
    location: "200 N Michigan Ave, Chicago, IL 60601",
    notes: "Contact purchasing dept. before placing large orders.",
    currentBalance: 2190.0,
    totalPurchased: 54300.0,
    totalPurchasedCount: 22,
    totalPaid: 52110.0,
    unappliedCredits: 0,
    openingBalance: 0,
    status: "Inactive",
    createdDate: "2024-03-08",
    openDocuments: [
      { docNumber: "BILL-00881", date: "2026-01-15", dueDate: "2026-02-14", amount: 2190.0, paidAmount: 0.0, outstanding: 2190.0, daysOutstanding: 34 },
    ],
    ledgerEntries: [
      { date: "2026-01-15", docNumber: "BILL-00881", type: "PURCHASE", description: "Bulk food order", debit: 2190.0, credit: 0, runningBalance: 2190.0 },
    ],
  },
  {
    id: 3,
    supplierCode: "SUP-00003",
    name: "Pacific Supply Co.",
    phone: "+1 (555) 032-7741",
    email: "info@pacificsupply.com",
    location: "350 S Grand Ave, Los Angeles, CA 90071",
    notes: "Ships via FedEx only. Net 30 terms.",
    currentBalance: 8750.5,
    totalPurchased: 185000.0,
    totalPurchasedCount: 76,
    totalPaid: 176249.5,
    unappliedCredits: 0,
    openingBalance: 5100.5,
    status: "Active",
    createdDate: "2024-02-20",
    openDocuments: [
      { docNumber: "BILL-02041", date: "2026-01-28", dueDate: "2026-02-27", amount: 5100.5, paidAmount: 0.0, outstanding: 5100.5, daysOutstanding: 21 },
      { docNumber: "BILL-02059", date: "2026-02-05", dueDate: "2026-03-07", amount: 3650.0, paidAmount: 0.0, outstanding: 3650.0, daysOutstanding: 13 },
    ],
    ledgerEntries: [
      { date: "2026-01-28", docNumber: "BILL-02041", type: "PURCHASE", description: "Equipment parts order", debit: 5100.5, credit: 0, runningBalance: 10201.0 },
      { date: "2026-02-01", docNumber: "PAY-00201", type: "PAYMENT", description: "Wire transfer", debit: 0, credit: 1450.5, runningBalance: 8750.5 },
      { date: "2026-02-05", docNumber: "BILL-02059", type: "PURCHASE", description: "Supply restock", debit: 3650.0, credit: 0, runningBalance: 12400.5 },
    ],
  },
  {
    id: 4,
    supplierCode: "SUP-00004",
    name: "Granite Peak Logistics",
    phone: "+1 (555) 047-3310",
    email: "ops@granitepeak.com",
    location: "1700 Lincoln St, Denver, CO 80203",
    notes: "Freight carrier. Always confirm ETA one day before delivery.",
    currentBalance: 430.0,
    totalPurchased: 32100.0,
    totalPurchasedCount: 15,
    totalPaid: 31670.0,
    unappliedCredits: 0,
    openingBalance: 0,
    status: "Active",
    createdDate: "2024-04-01",
    openDocuments: [
      { docNumber: "BILL-03310", date: "2026-02-10", dueDate: "2026-03-12", amount: 430.0, paidAmount: 0.0, outstanding: 430.0, daysOutstanding: 8 },
    ],
    ledgerEntries: [
      { date: "2026-02-10", docNumber: "BILL-03310", type: "PURCHASE", description: "Freight delivery charge", debit: 430.0, credit: 0, runningBalance: 430.0 },
    ],
  },
];
