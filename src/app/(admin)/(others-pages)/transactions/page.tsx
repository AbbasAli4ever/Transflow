"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import {
  HiOutlineArrowsUpDown,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineMagnifyingGlass,
  HiOutlineXMark,
  HiOutlineExclamationTriangle,
  HiOutlineArrowUp,
  HiOutlineArrowDown,
} from "react-icons/hi2";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";
import {
  ApiSupplier,
  ApiTransaction,
  TransactionStatus,
  TransactionType,
  formatPKR,
  listSuppliers,
  listTransactions,
} from "@/lib/suppliers";
import { ApiError } from "@/lib/api";
import { ApiCustomer, listCustomers } from "@/lib/customers";
import { CalenderIcon } from "@/icons";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

const TYPE_LABELS: Record<TransactionType, string> = {
  PURCHASE: "Purchase",
  SALE: "Sale",
  SUPPLIER_PAYMENT: "Supplier Payment",
  CUSTOMER_PAYMENT: "Customer Payment",
  SUPPLIER_RETURN: "Supplier Return",
  CUSTOMER_RETURN: "Customer Return",
  INTERNAL_TRANSFER: "Internal Transfer",
  ADJUSTMENT: "Adjustment",
};

const TYPE_BADGE: Record<
  TransactionType,
  "primary" | "success" | "info" | "warning" | "light" | "dark"
> = {
  PURCHASE: "primary",
  SALE: "success",
  SUPPLIER_PAYMENT: "info",
  CUSTOMER_PAYMENT: "info",
  SUPPLIER_RETURN: "warning",
  CUSTOMER_RETURN: "warning",
  INTERNAL_TRANSFER: "light",
  ADJUSTMENT: "dark",
};

const STATUS_BADGE: Record<TransactionStatus, "warning" | "success" | "error"> = {
  DRAFT: "warning",
  POSTED: "success",
  VOIDED: "error",
};

const TYPE_OPTIONS: { value: TransactionType | ""; label: string }[] = [
  { value: "", label: "All Types" },
  { value: "PURCHASE", label: "Purchase" },
  { value: "SALE", label: "Sale" },
  { value: "SUPPLIER_PAYMENT", label: "Supplier Payment" },
  { value: "CUSTOMER_PAYMENT", label: "Customer Payment" },
  { value: "SUPPLIER_RETURN", label: "Supplier Return" },
  { value: "CUSTOMER_RETURN", label: "Customer Return" },
  { value: "INTERNAL_TRANSFER", label: "Internal Transfer" },
  { value: "ADJUSTMENT", label: "Adjustment" },
];

const NEW_TRANSACTION_ROUTES: Partial<Record<TransactionType, string>> = {
  PURCHASE: "/transactions/purchase",
  SALE: "/transactions/sale",
  SUPPLIER_PAYMENT: "/transactions/supplier-payment",
  CUSTOMER_PAYMENT: "/transactions/customer-payment",
  SUPPLIER_RETURN: "/transactions/supplier-return",
  CUSTOMER_RETURN: "/transactions/customer-return",
  INTERNAL_TRANSFER: "/transactions/internal-transfer",
  ADJUSTMENT: "/transactions/stock-adjustment",
};

const STATUS_OPTIONS: { value: TransactionStatus | ""; label: string }[] = [
  { value: "", label: "All Status" },
  { value: "DRAFT", label: "Draft" },
  { value: "POSTED", label: "Posted" },
  { value: "VOIDED", label: "Voided" },
];

const SORT_OPTIONS: {
  value: "transactionDate" | "createdAt" | "totalAmount";
  label: string;
}[] = [
  { value: "transactionDate", label: "Transaction Date" },
  { value: "createdAt", label: "Created At" },
  { value: "totalAmount", label: "Total Amount" },
];

const PAGE_SIZES = [20, 50, 100] as const;

// ─── Small reusable action button ────────────────────────────────────────────

function ActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-theme-xs transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
    >
      {label}
    </button>
  );
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-5 py-4">
        <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
      </td>
      <td className="px-5 py-4">
        <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700" />
      </td>
      <td className="px-5 py-4">
        <div className="h-5 w-20 rounded-full bg-gray-200 dark:bg-gray-700" />
      </td>
      <td className="px-5 py-4">
        <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
      </td>
      <td className="px-5 py-4">
        <div className="h-4 w-36 rounded bg-gray-200 dark:bg-gray-700" />
      </td>
      <td className="px-5 py-4 text-right">
        <div className="ml-auto h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
      </td>
      <td className="px-5 py-4">
        <div className="h-7 w-14 rounded-lg bg-gray-200 dark:bg-gray-700" />
      </td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type PartyOption = { type: "supplier" | "customer"; id: string; name: string };

type PartyResults = {
  suppliers: ApiSupplier[];
  customers: ApiCustomer[];
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, page: 1, limit: 20 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filtersOpen, setFiltersOpen] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransactionType | "">("");
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | "">("");
  const [sortBy, setSortBy] = useState<"transactionDate" | "createdAt" | "totalAmount">(
    "transactionDate"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<(typeof PAGE_SIZES)[number]>(20);

  const [typeDropOpen, setTypeDropOpen] = useState(false);
  const [statusDropOpen, setStatusDropOpen] = useState(false);
  const [sortDropOpen, setSortDropOpen] = useState(false);
  const [sizeDropOpen, setSizeDropOpen] = useState(false);
  const [newDropOpen, setNewDropOpen] = useState(false);

  const [partyQuery, setPartyQuery] = useState("");
  const [selectedParty, setSelectedParty] = useState<PartyOption | null>(null);
  const [partyResults, setPartyResults] = useState<PartyResults>({
    suppliers: [],
    customers: [],
  });
  const [partyLoading, setPartyLoading] = useState(false);
  const [partyOpen, setPartyOpen] = useState(false);
  const partyDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const datePickerRef = useRef<HTMLInputElement>(null);
  const datePickerInstance = useRef<flatpickr.Instance | null>(null);

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listTransactions({
        page,
        limit,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sortBy,
        sortOrder,
        supplierId: selectedParty?.type === "supplier" ? selectedParty.id : undefined,
        customerId: selectedParty?.type === "customer" ? selectedParty.id : undefined,
      });
      setTransactions(result.data);
      setMeta(result.meta);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? "Failed to load transactions.");
    } finally {
      setIsLoading(false);
    }
  }, [
    page,
    limit,
    typeFilter,
    statusFilter,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
    selectedParty,
  ]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    if (!datePickerRef.current) return;

    // Use the same flatpickr range picker configuration as Supplier Detail Ledger.
    let fp: flatpickr.Instance | flatpickr.Instance[] | null = null;
    fp = flatpickr(datePickerRef.current, {
      mode: "range",
      static: false,
      disableMobile: true,
      monthSelectorType: "static",
      dateFormat: "M j, Y",
      rangeSeparator: " → ",
      position: "below",
      positionElement: datePickerRef.current,
      onReady: () => {
        if (datePickerRef.current) {
          datePickerRef.current.value = datePickerRef.current.value.replace(" to ", " → ");
        }
      },
      onOpen: () => {
        if (!Array.isArray(fp) && fp) {
          fp.calendarContainer.style.zIndex = "50";
        }
      },
      prevArrow:
        '<svg class="stroke-current" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.5 15L7.5 10L12.5 5" stroke="" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      nextArrow:
        '<svg class="stroke-current" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.5 15L12.5 10L7.5 5" stroke="" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      onChange: (dates: Date[]) => {
        const toLocal = (d: Date) =>
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
            d.getDate()
          ).padStart(2, "0")}`;

        if (dates.length === 2) {
          const from = toLocal(dates[0]);
          const to = toLocal(dates[1]);
          setDateFrom(from);
          setDateTo(to);
          setPage(1);
          if (datePickerRef.current) {
            datePickerRef.current.value = datePickerRef.current.value.replace(" to ", " → ");
          }
        } else if (dates.length === 0) {
          setDateFrom("");
          setDateTo("");
          setPage(1);
        }
      },
    } as Parameters<typeof flatpickr>[1]);

    datePickerInstance.current = Array.isArray(fp) ? null : fp;

    return () => {
      if (!Array.isArray(fp) && fp) fp.destroy();
    };
  }, []);

  useEffect(() => {
    if (partyDebounce.current) clearTimeout(partyDebounce.current);

    if (partyQuery.trim().length < 2) {
      setPartyResults({ suppliers: [], customers: [] });
      setPartyOpen(false);
      return;
    }

    partyDebounce.current = setTimeout(async () => {
      setPartyLoading(true);
      try {
        const [suppliersRes, customersRes] = await Promise.all([
          listSuppliers({
            search: partyQuery,
            limit: 5,
            page: 1,
            status: "ALL",
            sortBy: "name",
            sortOrder: "asc",
          }),
          listCustomers({
            search: partyQuery,
            limit: 5,
            page: 1,
            status: "ALL",
            sortBy: "name",
            sortOrder: "asc",
          }),
        ]);

        setPartyResults({
          suppliers: suppliersRes.data,
          customers: customersRes.data,
        });
        setPartyOpen(true);
      } catch {
        setPartyResults({ suppliers: [], customers: [] });
      } finally {
        setPartyLoading(false);
      }
    }, 300);

    return () => {
      if (partyDebounce.current) clearTimeout(partyDebounce.current);
    };
  }, [partyQuery]);

  const handlePartySelect = (item: PartyOption) => {
    setSelectedParty(item);
    setPartyQuery(item.name);
    setPartyOpen(false);
    setPage(1);
  };

  const handleReset = () => {
    setDateFrom("");
    setDateTo("");
    setTypeFilter("");
    setStatusFilter("");
    setSortBy("transactionDate");
    setSortOrder("desc");
    setSelectedParty(null);
    setPartyQuery("");
    setPage(1);
    setLimit(20);
    if (datePickerInstance.current) {
      datePickerInstance.current.clear();
    }
  };

  const handleView = (id: string) => {
    sessionStorage.setItem("transactionId", id);
    window.location.href = "/transactions/detail";
  };

  return (
    <div className="mx-auto w-full max-w-full">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
            <HiOutlineArrowsUpDown size={22} className="text-brand-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transactions</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              View and filter all transactions.
            </p>
          </div>
        </div>
        <div className="relative">
          <Button
            size="sm"
            endIcon={<HiOutlineChevronDown size={16} />}
            className="dropdown-toggle"
            onClick={() => setNewDropOpen((v) => !v)}
          >
            New Transaction
          </Button>
          <Dropdown isOpen={newDropOpen} onClose={() => setNewDropOpen(false)} className="w-56">
            {TYPE_OPTIONS.filter((opt) => opt.value).map((opt) => (
              <DropdownItem
                key={opt.value}
                tag="a"
                href={
                  opt.value
                    ? NEW_TRANSACTION_ROUTES[opt.value] ?? `/transactions/new?type=${opt.value}`
                    : "/transactions/new"
                }
                onItemClick={() => setNewDropOpen(false)}
              >
                {opt.label}
              </DropdownItem>
            ))}
          </Dropdown>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-700 dark:bg-gray-900">
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-4 text-sm font-semibold text-gray-700 dark:text-gray-200"
        >
          <span>Filters</span>
          {filtersOpen ? (
            <HiOutlineChevronUp size={16} className="text-gray-500" />
          ) : (
            <HiOutlineChevronDown size={16} className="text-gray-500" />
          )}
        </button>

        {filtersOpen && (
          <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-800">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex flex-1 flex-col gap-3 sm:flex-row">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-500">Date range</label>
                  <div className="relative inline-flex items-center">
                    <CalenderIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none z-10" />
                    <input
                      ref={datePickerRef}
                      className="h-10 w-60 pl-9 pr-0 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 cursor-pointer"
                      placeholder="Select date range"
                      readOnly
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-3 sm:flex-row">
                <div className="relative">
                  <button
                    onClick={() => setTypeDropOpen((v) => !v)}
                    className="flex h-10 w-full min-w-[180px] items-center justify-between rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    {TYPE_OPTIONS.find((o) => o.value === typeFilter)?.label ?? "All Types"}
                    <HiOutlineChevronDown size={14} className="text-gray-400" />
                  </button>
                  <Dropdown
                    isOpen={typeDropOpen}
                    onClose={() => setTypeDropOpen(false)}
                    className="left-0 right-auto w-full"
                  >
                    {TYPE_OPTIONS.map((opt) => (
                      <DropdownItem
                        key={opt.label}
                        onClick={() => {
                          setTypeFilter(opt.value);
                          setPage(1);
                          setTypeDropOpen(false);
                        }}
                      >
                        {opt.label}
                      </DropdownItem>
                    ))}
                  </Dropdown>
                </div>

                <div className="relative">
                  <button
                    onClick={() => setStatusDropOpen((v) => !v)}
                    className="flex h-10 w-full min-w-[160px] items-center justify-between rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    {STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ?? "All Status"}
                    <HiOutlineChevronDown size={14} className="text-gray-400" />
                  </button>
                  <Dropdown
                    isOpen={statusDropOpen}
                    onClose={() => setStatusDropOpen(false)}
                    className="left-0 right-auto w-full"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <DropdownItem
                        key={opt.label}
                        onClick={() => {
                          setStatusFilter(opt.value);
                          setPage(1);
                          setStatusDropOpen(false);
                        }}
                      >
                        {opt.label}
                      </DropdownItem>
                    ))}
                  </Dropdown>
                </div>
              </div>

              <div className="relative flex-[1.5]">
                <HiOutlineMagnifyingGlass
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search supplier or customer"
                  value={partyQuery}
                  onChange={(e) => {
                    setPartyQuery(e.target.value);
                    setSelectedParty(null);
                  }}
                  onFocus={() => {
                    if (partyQuery.trim().length >= 2) setPartyOpen(true);
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-10 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                />
                {partyQuery && (
                  <button
                    onClick={() => {
                      setPartyQuery("");
                      setSelectedParty(null);
                      setPartyOpen(false);
                      setPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <HiOutlineXMark size={16} />
                  </button>
                )}

                <Dropdown
                  isOpen={partyOpen}
                  onClose={() => setPartyOpen(false)}
                  className="left-0 right-auto w-full mt-1 p-1"
                >
                  {partyLoading ? (
                    <div className="px-4 py-2 text-sm text-gray-500">Searching...</div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto">
                      {partyResults.suppliers.length === 0 &&
                        partyResults.customers.length === 0 && (
                          <div className="px-4 py-2 text-sm text-gray-500">
                            No matches found.
                          </div>
                        )}

                      {partyResults.suppliers.length > 0 && (
                        <div className="py-1">
                          <div className="px-4 py-1.5 text-xs font-semibold uppercase text-gray-400">
                            Suppliers
                          </div>
                          {partyResults.suppliers.map((s) => (
                            <DropdownItem
                              key={s.id}
                              onClick={() =>
                                handlePartySelect({ type: "supplier", id: s.id, name: s.name })
                              }
                            >
                              {s.name}
                            </DropdownItem>
                          ))}
                        </div>
                      )}

                      {partyResults.customers.length > 0 && (
                        <div className="py-1">
                          <div className="px-4 py-1.5 text-xs font-semibold uppercase text-gray-400">
                            Customers
                          </div>
                          {partyResults.customers.map((c) => (
                            <DropdownItem
                              key={c.id}
                              onClick={() =>
                                handlePartySelect({ type: "customer", id: c.id, name: c.name })
                              }
                            >
                              {c.name}
                            </DropdownItem>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </Dropdown>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setSortDropOpen((v) => !v)}
                    className="flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    <HiOutlineArrowsUpDown size={14} className="text-gray-400" />
                    Sort: {SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
                    <HiOutlineChevronDown size={14} className="text-gray-400" />
                  </button>
                  <Dropdown isOpen={sortDropOpen} onClose={() => setSortDropOpen(false)}>
                    {SORT_OPTIONS.map((opt) => (
                      <DropdownItem
                        key={opt.value}
                        onClick={() => {
                          setSortBy(opt.value);
                          setPage(1);
                          setSortDropOpen(false);
                        }}
                      >
                        {opt.label}
                      </DropdownItem>
                    ))}
                  </Dropdown>
                </div>
                <button
                  onClick={() => {
                    setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
                    setPage(1);
                  }}
                  className="flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  {sortOrder === "asc" ? (
                    <HiOutlineArrowUp size={14} className="text-gray-400" />
                  ) : (
                    <HiOutlineArrowDown size={14} className="text-gray-400" />
                  )}
                  {sortOrder === "asc" ? "Asc" : "Desc"}
                </button>
                <Button variant="outline" size="sm" onClick={handleReset} className="h-10 px-4">
                  Reset filters
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          <HiOutlineExclamationTriangle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                {([
                  "Date",
                  "Document #",
                  "Type",
                  "Status",
                  "Party",
                  "Amount",
                  "Action",
                ] as const).map((col) => (
                  <th
                    key={col}
                    className={`px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 ${
                      col === "Amount" ? "text-right" : col === "Action" ? "text-center" : ""
                    }`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : transactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-16 text-center text-sm text-gray-400 dark:text-gray-500"
                  >
                    No transactions found. Try adjusting your filters.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="transition hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                    <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {fmtDate(tx.transactionDate)}
                    </td>
                    <td className="px-5 py-4">
                      {tx.documentNumber ? (
                        <button
                          onClick={() => handleView(tx.id)}
                          className="text-sm font-semibold text-brand-500 transition hover:text-brand-600 hover:underline"
                        >
                          {tx.documentNumber}
                        </button>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant="light" size="sm" color={TYPE_BADGE[tx.type]}>
                        {TYPE_LABELS[tx.type]}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant="light" size="sm" color={STATUS_BADGE[tx.status]}>
                        {tx.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">
                      {tx.supplier?.name || tx.customer?.name || "—"}
                    </td>
                    <td className="px-5 py-4 text-right text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {formatPKR(tx.totalAmount)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <ActionButton label="View" onClick={() => handleView(tx.id)} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {isLoading ? (
              "Loading..."
            ) : (
              <>
                Showing <span className="font-medium text-gray-600 dark:text-gray-300">{transactions.length}</span> of{" "}
                <span className="font-medium text-gray-600 dark:text-gray-300">{meta.total}</span> transactions
              </>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {meta.totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || isLoading}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  <HiOutlineChevronLeft size={15} />
                </button>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Page {page} of {meta.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={page === meta.totalPages || isLoading}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  <HiOutlineChevronRight size={15} />
                </button>
              </div>
            )}

            <div className="relative">
              <button
                onClick={() => setSizeDropOpen((v) => !v)}
                className="flex h-8 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                Page size: {limit}
                <HiOutlineChevronDown size={12} className="text-gray-400" />
              </button>
              <Dropdown
                isOpen={sizeDropOpen}
                onClose={() => setSizeDropOpen(false)}
                className="left-0 right-auto w-36"
              >
                {PAGE_SIZES.map((size) => (
                  <DropdownItem
                    key={size}
                    onClick={() => {
                      setLimit(size);
                      setPage(1);
                      setSizeDropOpen(false);
                    }}
                  >
                    {size}
                  </DropdownItem>
                ))}
              </Dropdown>
            </div>
          </div>
        </div>
      </div>

      {(typeDropOpen || statusDropOpen || sortDropOpen || sizeDropOpen || newDropOpen) && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => {
            setTypeDropOpen(false);
            setStatusDropOpen(false);
            setSortDropOpen(false);
            setSizeDropOpen(false);
            setNewDropOpen(false);
          }}
        />
      )}
    </div>
  );
}
