"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  HiOutlineArrowLeft,
  HiOutlineArrowsUpDown,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineArrowsRightLeft,
} from "react-icons/hi2";
import DatePicker from "@/components/form/date-picker";
import Button from "@/components/ui/button/Button";
import { ApiError } from "@/lib/api";
import { ApiPaymentAccount, listPaymentAccounts } from "@/lib/paymentAccounts";
import {
  createInternalTransferDraft,
  formatPKR,
  postTransaction,
} from "@/lib/suppliers";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500";

const panelClass =
  "rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]";

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
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
      {children}
      {required && <span className="ml-0.5 text-error-500">*</span>}
    </label>
  );
}

export default function InternalTransferPage() {
  const router = useRouter();

  const [accounts, setAccounts] = useState<ApiPaymentAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState(1);
  const [transactionDate, setTransactionDate] = useState(toLocalDate(new Date()));
  const [notes, setNotes] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadAccounts = async () => {
      setLoading(true);
      setPageError(null);
      try {
        const result = await listPaymentAccounts({ status: "ACTIVE", limit: 100, page: 1 });
        if (cancelled) return;
        setAccounts(result.data);
        setFromAccountId(result.data[0]?.id ?? "");
        setToAccountId(result.data[1]?.id ?? "");
      } catch (err) {
        if (!cancelled) {
          const apiErr = err as ApiError;
          setPageError(apiErr.message ?? "Failed to load payment accounts.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadAccounts();

    return () => {
      cancelled = true;
    };
  }, []);

  const fromAccount = useMemo(
    () => accounts.find((account) => account.id === fromAccountId) ?? null,
    [accounts, fromAccountId]
  );

  const toAccount = useMemo(
    () => accounts.find((account) => account.id === toAccountId) ?? null,
    [accounts, toAccountId]
  );

  const toAccountOptions = useMemo(
    () => accounts.filter((account) => account.id !== fromAccountId),
    [accounts, fromAccountId]
  );

  const remainingBalance = Math.max((fromAccount?._computed.currentBalance ?? 0) - amount, 0);

  useEffect(() => {
    if (toAccountId && toAccountId === fromAccountId) {
      setToAccountId("");
    }
  }, [fromAccountId, toAccountId]);

  const submit = async () => {
    if (!fromAccountId) {
      setValidationError("Select a source account.");
      return;
    }
    if (!toAccountId) {
      setValidationError("Select a destination account.");
      return;
    }
    if (fromAccountId === toAccountId) {
      setValidationError("From and To accounts must be different.");
      return;
    }
    if (!Number.isFinite(amount) || amount < 1) {
      setValidationError("Amount must be at least 1.");
      return;
    }
    if (notes.length > 1000) {
      setValidationError("Notes cannot exceed 1000 characters.");
      return;
    }
    if (!transactionDate) {
      setValidationError("Select a transaction date.");
      return;
    }
    if (fromAccount && amount > fromAccount._computed.currentBalance) {
      setValidationError("Amount cannot exceed the available balance of the source account.");
      return;
    }

    setValidationError(null);
    setPageError(null);
    setSubmitting(true);

    try {
      const draft = await createInternalTransferDraft({
        fromPaymentAccountId: fromAccountId,
        toPaymentAccountId: toAccountId,
        amount: Math.trunc(amount),
        transactionDate,
        notes: notes.trim() || undefined,
        idempotencyKey: generateId(),
      });

      const posted = await postTransaction(draft.id, {
        idempotencyKey: generateId(),
      });

      sessionStorage.setItem("transactionId", posted.id);
      router.push("/transactions/detail");
    } catch (err) {
      const apiErr = err as ApiError;
      setPageError(apiErr.message ?? "Failed to complete internal transfer.");
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Internal Transfer</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Move funds between payment accounts and post the transfer immediately.
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
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Transfer Details</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Choose the source account, destination account, transfer amount, and posting date.
            </p>
          </div>

          <div className="space-y-8 px-6 py-6">
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <FieldLabel htmlFor="from-account" required>
                  From Account
                </FieldLabel>
                <select
                  id="from-account"
                  value={fromAccountId}
                  onChange={(e) => setFromAccountId(e.target.value)}
                  className={inputClass}
                  disabled={loading || accounts.length === 0}
                >
                  <option value="">Select source account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({formatPKR(account._computed.currentBalance)})
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {fromAccount
                    ? `Available balance: ${formatPKR(fromAccount._computed.currentBalance)}`
                    : "Select an account to see available balance."}
                </p>
              </div>

              <div>
                <FieldLabel htmlFor="to-account" required>
                  To Account
                </FieldLabel>
                <select
                  id="to-account"
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className={inputClass}
                  disabled={loading || toAccountOptions.length === 0}
                >
                  <option value="">Select destination account</option>
                  {toAccountOptions.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({formatPKR(account._computed.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel htmlFor="transfer-amount" required>
                  Amount
                </FieldLabel>
                <input
                  id="transfer-amount"
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(Math.max(1, Number(e.target.value || 1)))}
                  className={inputClass}
                />
              </div>

              <div>
                <FieldLabel required>Transaction Date</FieldLabel>
                <DatePicker
                  id="internal-transfer-date"
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
              <FieldLabel htmlFor="transfer-notes">Notes</FieldLabel>
              <textarea
                id="transfer-notes"
                rows={4}
                value={notes}
                maxLength={1000}
                onChange={(e) => setNotes(e.target.value)}
                className={`${inputClass} min-h-[110px] resize-y`}
                placeholder="Optional notes for this transfer"
              />
              <p className="mt-1 text-right text-xs text-gray-500 dark:text-gray-400">{notes.length}/1000</p>
            </div>

            <div className="flex justify-end border-t border-gray-200 pt-6 dark:border-gray-800">
              <Button onClick={() => void submit()} disabled={submitting} startIcon={<HiOutlineCheckCircle size={18} />}>
                {submitting ? "Transferring..." : "Transfer"}
              </Button>
            </div>
          </div>
        </section>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <section className={`${panelClass} p-6`}>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400">
                <HiOutlineArrowsRightLeft size={22} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Transfer Summary</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Review the transfer before posting.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">From</span>
                <span className="font-medium text-gray-800 dark:text-white/90">{fromAccount?.name ?? "Not selected"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">To</span>
                <span className="font-medium text-gray-800 dark:text-white/90">{toAccount?.name ?? "Not selected"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Transfer Amount</span>
                <span className="font-medium text-gray-800 dark:text-white/90">{formatPKR(amount)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Available Balance</span>
                <span className="font-medium text-gray-800 dark:text-white/90">{formatPKR(fromAccount?._computed.currentBalance ?? 0)}</span>
              </div>
              <div className="rounded-2xl bg-gray-50 px-4 py-4 dark:bg-gray-900/40">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Remaining Balance</span>
                  <span className="text-xl font-bold text-gray-900 dark:text-white">{formatPKR(remainingBalance)}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 px-4 py-4 dark:border-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  The destination account must differ from the source account. The backend revalidates balance at posting.
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
