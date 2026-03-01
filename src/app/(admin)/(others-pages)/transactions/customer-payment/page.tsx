"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  HiOutlineArrowLeft,
  HiOutlineArrowsUpDown,
  HiOutlineBanknotes,
  HiOutlineExclamationTriangle,
  HiOutlineMagnifyingGlass,
  HiOutlineCheckCircle,
} from "react-icons/hi2";
import DatePicker from "@/components/form/date-picker";
import Button from "@/components/ui/button/Button";
import { ApiError } from "@/lib/api";
import {
  ApiCustomer,
  getCustomerBalance,
  getCustomerOpenDocuments,
  listCustomers,
  OpenDocument,
} from "@/lib/customers";
import { ApiPaymentAccount, listPaymentAccounts } from "@/lib/paymentAccounts";
import {
  createCustomerPaymentDraft,
  formatPKR,
  postTransaction,
} from "@/lib/suppliers";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500";

const panelClass =
  "rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]";

type AllocationState = Record<string, number>;

function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toLocalDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
    >
      {children}
      {required && <span className="ml-0.5 text-error-500">*</span>}
    </label>
  );
}

export default function CustomerPaymentPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<ApiCustomer[]>([]);
  const [accounts, setAccounts] = useState<ApiPaymentAccount[]>([]);
  const [openDocuments, setOpenDocuments] = useState<OpenDocument[]>([]);

  const [loading, setLoading] = useState(true);
  const [docsLoading, setDocsLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerBalance, setCustomerBalance] = useState<number | null>(null);
  const [customerBalanceLoading, setCustomerBalanceLoading] = useState(false);

  const [amount, setAmount] = useState(1);
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [transactionDate, setTransactionDate] = useState(toLocalDate(new Date()));
  const [notes, setNotes] = useState("");
  const [autoAllocate, setAutoAllocate] = useState(true);
  const [allocations, setAllocations] = useState<AllocationState>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setPageError(null);
      try {
        const [customerRes, accountRes] = await Promise.all([
          listCustomers({ status: "ACTIVE", limit: 100, page: 1, sortBy: "name", sortOrder: "asc" }),
          listPaymentAccounts({ status: "ACTIVE", limit: 100, page: 1 }),
        ]);

        if (cancelled) return;

        setCustomers(customerRes.data);
        setAccounts(accountRes.data);
        setPaymentAccountId(accountRes.data[0]?.id ?? "");
      } catch (err) {
        if (cancelled) return;
        const apiErr = err as ApiError;
        setPageError(apiErr.message ?? "Failed to load customer receipt form.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!customerId) {
      setCustomerBalance(null);
      setOpenDocuments([]);
      setAllocations({});
      return;
    }

    let cancelled = false;

    const loadCustomerData = async () => {
      setCustomerBalanceLoading(true);
      setDocsLoading(true);
      try {
        const [balance, docs] = await Promise.all([
          getCustomerBalance(customerId),
          getCustomerOpenDocuments(customerId),
        ]);

        if (cancelled) return;

        setCustomerBalance(balance.currentBalance);
        setOpenDocuments(docs.documents);
        setAllocations({});
      } catch (err) {
        if (cancelled) return;
        const apiErr = err as ApiError;
        setPageError(apiErr.message ?? "Failed to load customer balances or open invoices.");
        setOpenDocuments([]);
        setAllocations({});
      } finally {
        if (!cancelled) {
          setCustomerBalanceLoading(false);
          setDocsLoading(false);
        }
      }
    };

    loadCustomerData();

    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const filteredCustomers = useMemo(() => {
    const query = customerQuery.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((customer) => customer.name.toLowerCase().includes(query));
  }, [customerQuery, customers]);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === customerId) ?? null,
    [customerId, customers]
  );

  const totalAllocated = useMemo(
    () => Object.values(allocations).reduce((sum, value) => sum + Math.max(value || 0, 0), 0),
    [allocations]
  );

  const unallocated = Math.max(amount - totalAllocated, 0);

  const selectCustomer = (customer: ApiCustomer) => {
    setCustomerId(customer.id);
    setCustomerQuery(customer.name);
    setCustomerOpen(false);
    setValidationError(null);
  };

  const updateAllocation = (documentId: string, nextValue: number) => {
    setAllocations((current) => ({
      ...current,
      [documentId]: Math.max(0, nextValue),
    }));
  };

  const submit = async () => {
    if (!customerId) {
      setValidationError("Select a customer before posting this receipt.");
      return;
    }

    if (!Number.isFinite(amount) || amount < 1) {
      setValidationError("Amount must be at least 1.");
      return;
    }

    if (!paymentAccountId) {
      setValidationError("Select a payment account.");
      return;
    }

    if (!transactionDate) {
      setValidationError("Select a transaction date.");
      return;
    }

    if (notes.length > 1000) {
      setValidationError("Notes cannot exceed 1000 characters.");
      return;
    }

    const manualAllocations = openDocuments
      .map((doc) => ({
        transactionId: doc.id,
        amount: Math.trunc(allocations[doc.id] ?? 0),
        outstanding: doc.outstanding,
      }))
      .filter((item) => item.amount > 0);

    if (!autoAllocate) {
      for (const item of manualAllocations) {
        if (item.amount > item.outstanding) {
          setValidationError("An allocation cannot exceed the document outstanding amount.");
          return;
        }
      }

      if (totalAllocated > amount) {
        setValidationError("Total allocated cannot exceed the receipt amount.");
        return;
      }
    }

    setValidationError(null);
    setPageError(null);
    setSubmitting(true);

    try {
      const draft = await createCustomerPaymentDraft({
        customerId,
        amount: Math.trunc(amount),
        paymentAccountId,
        transactionDate,
        notes: notes.trim() || undefined,
        idempotencyKey: generateId(),
      });

      const posted = await postTransaction(draft.id, {
        idempotencyKey: generateId(),
        ...(autoAllocate
          ? {}
          : {
              allocations: manualAllocations.map((item) => ({
                transactionId: item.transactionId,
                amount: item.amount,
              })),
            }),
      });

      sessionStorage.setItem("transactionId", posted.id);
      router.push("/transactions/detail");
    } catch (err) {
      const apiErr = err as ApiError;
      setPageError(apiErr.message ?? "Failed to save and post customer receipt.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-3">
          <Link
            href="/transactions"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
          >
            <HiOutlineArrowLeft size={16} />
            Back to Transactions
          </Link>
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
              <HiOutlineArrowsUpDown size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Customer Receipt</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Record a payment received from a customer and optionally allocate it across open sales.
              </p>
            </div>
          </div>
        </div>
      </div>

      {pageError && (
        <div className="flex items-start gap-3 rounded-2xl border border-error-100 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-400">
          <HiOutlineExclamationTriangle size={18} className="mt-0.5 shrink-0" />
          <span>{pageError}</span>
        </div>
      )}

      {validationError && (
        <div className="flex items-start gap-3 rounded-2xl border border-warning-100 bg-warning-50 px-4 py-3 text-sm text-warning-700 dark:border-warning-500/20 dark:bg-warning-500/10 dark:text-warning-300">
          <HiOutlineExclamationTriangle size={18} className="mt-0.5 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className={`${panelClass} overflow-visible`}>
          <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Receipt Details</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Choose the customer, amount, payment account, and how this receipt should be allocated.
            </p>
          </div>

          <div className="space-y-8 px-6 py-6">
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="relative">
                <FieldLabel htmlFor="customer-search" required>
                  Customer
                </FieldLabel>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <HiOutlineMagnifyingGlass size={18} />
                  </span>
                  <input
                    id="customer-search"
                    value={customerQuery}
                    onChange={(e) => {
                      setCustomerQuery(e.target.value);
                      setCustomerId("");
                      setCustomerOpen(true);
                    }}
                    onFocus={() => setCustomerOpen(true)}
                    placeholder={loading ? "Loading customers..." : "Search customer by name"}
                    className={`${inputClass} pl-11 pr-10`}
                    disabled={loading}
                  />
                </div>
                {customerOpen && (
                  <div className="absolute z-30 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
                    {filteredCustomers.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No customers found.</p>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => selectCustomer(customer)}
                          className="block w-full rounded-xl px-3 py-2 text-left transition hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                        >
                          <span className="block text-sm font-medium text-gray-800 dark:text-white/90">
                            {customer.name}
                          </span>
                          <span className="block text-xs text-gray-500 dark:text-gray-400">
                            Balance {formatPKR(customer.currentBalance ?? 0)}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {customerBalanceLoading
                    ? "Loading current balance..."
                    : customerBalance === null
                      ? "Select a customer to see current balance."
                      : `Current balance: ${formatPKR(customerBalance)}`}
                </p>
              </div>

              <div>
                <FieldLabel htmlFor="receipt-amount" required>
                  Amount
                </FieldLabel>
                <input
                  id="receipt-amount"
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(Math.max(1, Number(e.target.value || 1)))}
                  className={inputClass}
                />
              </div>

              <div>
                <FieldLabel htmlFor="payment-account" required>
                  Payment Account
                </FieldLabel>
                <select
                  id="payment-account"
                  value={paymentAccountId}
                  onChange={(e) => setPaymentAccountId(e.target.value)}
                  className={inputClass}
                  disabled={loading || accounts.length === 0}
                >
                  <option value="">Select account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({formatPKR(account._computed.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel required>Transaction Date</FieldLabel>
                <DatePicker
                  id="customer-payment-date"
                  mode="single"
                  defaultDate={transactionDate}
                  placeholder="Select transaction date"
                  onChange={(selectedDates) => {
                    if (selectedDates[0]) {
                      setTransactionDate(toLocalDate(selectedDates[0]));
                    }
                  }}
                />
              </div>
            </div>

            <div>
              <FieldLabel htmlFor="receipt-notes">Notes</FieldLabel>
              <textarea
                id="receipt-notes"
                rows={4}
                value={notes}
                maxLength={1000}
                onChange={(e) => setNotes(e.target.value)}
                className={`${inputClass} min-h-[110px] resize-y`}
                placeholder="Optional notes for this customer receipt"
              />
              <p className="mt-1 text-right text-xs text-gray-500 dark:text-gray-400">{notes.length}/1000</p>
            </div>

            <div className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Allocations</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Let the backend auto-allocate, or assign this receipt manually to open sales.
                  </p>
                </div>
                <label className="inline-flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={autoAllocate}
                    onChange={(e) => setAutoAllocate(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                  />
                  Auto-allocate
                </label>
              </div>

              {!customerId ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Select a customer to load open invoices.</p>
              ) : autoAllocate ? (
                <div className="rounded-2xl bg-gray-50 px-4 py-4 text-sm text-gray-600 dark:bg-gray-900/40 dark:text-gray-300">
                  Backend auto-allocation is enabled. No manual allocations will be sent.
                </div>
              ) : docsLoading ? (
                <div className="space-y-3 animate-pulse">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="h-12 rounded-xl bg-gray-100 dark:bg-gray-800" />
                  ))}
                </div>
              ) : openDocuments.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No open sales invoices found for this customer.</p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                    <thead className="bg-gray-50 dark:bg-gray-900/40">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Document #</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Total</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Outstanding</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Allocate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {openDocuments.map((doc) => {
                        const currentValue = allocations[doc.id] ?? 0;
                        const overOutstanding = currentValue > doc.outstanding;
                        return (
                          <tr key={doc.id}>
                            <td className="px-4 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                              {doc.documentNumber}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                              {fmtDate(doc.transactionDate)}
                            </td>
                            <td className="px-4 py-4 text-right text-sm text-gray-600 dark:text-gray-300">
                              {formatPKR(doc.totalAmount)}
                            </td>
                            <td className="px-4 py-4 text-right text-sm text-gray-600 dark:text-gray-300">
                              {formatPKR(doc.outstanding)}
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div className="ml-auto w-32">
                                <input
                                  type="number"
                                  min={0}
                                  max={doc.outstanding}
                                  value={currentValue}
                                  onChange={(e) => updateAllocation(doc.id, Number(e.target.value || 0))}
                                  className={`${inputClass} text-right ${
                                    overOutstanding
                                      ? "border-warning-300 focus:border-warning-500 focus:ring-warning-500/20"
                                      : ""
                                  }`}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-gray-200 pt-6 dark:border-gray-800">
              <Button onClick={() => void submit()} disabled={submitting} startIcon={<HiOutlineCheckCircle size={18} />}>
                {submitting ? "Posting..." : "Save & Post"}
              </Button>
            </div>
          </div>
        </section>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <section className={`${panelClass} p-6`}>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400">
                <HiOutlineBanknotes size={22} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Receipt Summary</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Review the receipt before posting.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Customer</span>
                <span className="font-medium text-gray-800 dark:text-white/90">
                  {selectedCustomer?.name ?? "Not selected"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Receipt Amount</span>
                <span className="font-medium text-gray-800 dark:text-white/90">{formatPKR(amount)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Total Allocated</span>
                <span className="font-medium text-gray-800 dark:text-white/90">{formatPKR(totalAllocated)}</span>
              </div>
              <div className="rounded-2xl bg-gray-50 px-4 py-4 dark:bg-gray-900/40">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Unallocated Remainder</span>
                  <span className="text-xl font-bold text-gray-900 dark:text-white">{formatPKR(unallocated)}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 px-4 py-4 dark:border-gray-800">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Mode</span>
                  <span className="font-medium text-gray-800 dark:text-white/90">
                    {autoAllocate ? "Auto-allocate" : "Manual allocation"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {autoAllocate
                    ? "The backend will distribute this receipt across open customer invoices."
                    : "Only the allocation rows with amounts greater than zero will be sent."}
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
