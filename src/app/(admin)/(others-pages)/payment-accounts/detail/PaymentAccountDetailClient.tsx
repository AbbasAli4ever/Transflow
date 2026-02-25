"use client";

import React, { useState, useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import Link from "next/link";
import {
  HiOutlineCreditCard,
  HiOutlineArrowLeft,
  HiOutlinePencilSquare,
  HiOutlineArrowsUpDown,
  HiOutlineXMark,
  HiOutlineExclamationTriangle,
} from "react-icons/hi2";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { CalenderIcon } from "@/icons";
import {
  ApiPaymentAccount,
  PaymentAccountStatement,
  PaymentAccountStatus,
  PaymentAccountType,
  formatPKR,
  getPaymentAccount,
  getPaymentAccountStatement,
  updatePaymentAccount,
  changePaymentAccountStatus,
} from "@/lib/paymentAccounts";
import { ApiError } from "@/lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

const toLocalDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// ─── Shared input styles ──────────────────────────────────────────────────────

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500";

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
      {children}
      {required && <span className="ml-0.5 text-error-500">*</span>}
    </label>
  );
}

// ─── Type badge colors ────────────────────────────────────────────────────────

const TYPE_BADGE_COLORS: Record<PaymentAccountType, string> = {
  CASH: "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400",
  BANK: "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400",
  WALLET: "bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400",
  CARD: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
};

// ─── Page Skeleton ────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-full animate-pulse">
      <div className="mb-5 h-5 w-44 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-4 flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-7 w-48 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-24 rounded-lg bg-gray-200 dark:bg-gray-700" />
            <div className="h-8 w-16 rounded-lg bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
        <div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="h-40 w-full rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}

// ─── Change Status Modal ──────────────────────────────────────────────────────

function ChangeStatusModal({
  account,
  onClose,
  onSaved,
}: {
  account: ApiPaymentAccount;
  onClose: () => void;
  onSaved: (updated: ApiPaymentAccount) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [account.id]);

  const newStatus: PaymentAccountStatus = account.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

  const handleConfirm = async () => {
    setError(null);
    setSaving(true);
    try {
      const updated = await changePaymentAccountStatus(account.id, newStatus);
      onSaved(updated);
      onClose();
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? "Failed to change status.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} className="max-w-sm mx-4" showCloseButton={false}>
      <div className="p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning-50 dark:bg-warning-500/10">
            <HiOutlineArrowsUpDown size={24} className="text-warning-500" />
          </div>
          <h3 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">
            Change Status
          </h3>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Set{" "}
            <span className="font-medium text-gray-700 dark:text-gray-200">{account.name}</span>{" "}
            to{" "}
            <span
              className={
                newStatus === "ACTIVE"
                  ? "font-semibold text-success-600"
                  : "font-semibold text-warning-600"
              }
            >
              {newStatus === "ACTIVE" ? "Active" : "Inactive"}
            </span>
            ?
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
            <HiOutlineExclamationTriangle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex justify-center gap-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={saving}>
            {saving ? "Saving..." : "Confirm"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Edit Drawer ──────────────────────────────────────────────────────────────

function EditDrawer({
  isOpen,
  onClose,
  account,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  account: ApiPaymentAccount;
  onSaved: (updated: ApiPaymentAccount) => void;
}) {
  const [name, setName] = useState(account.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(account.name);
    setError(null);
  }, [account, isOpen]);

  useEffect(() => {
    if (isOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const updated = await updatePaymentAccount(account.id, { name });
      onSaved(updated);
      onClose();
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.statusCode === 409) {
        setError("An account with this name already exists.");
      } else if (apiErr.errors?.length) {
        setError(apiErr.errors.map((e) => e.message).join(", "));
      } else {
        setError(apiErr.message ?? "Failed to save account.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-[9998] bg-gray-900/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed right-0 top-0 z-[9999] flex h-full w-full max-w-[420px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out dark:bg-gray-900 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Edit Account</h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Update account name.</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <HiOutlineXMark size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-4 px-6 py-5">
            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
                <HiOutlineExclamationTriangle size={16} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}
            <div>
              <FieldLabel required>Name</FieldLabel>
              <input
                required
                className={inputClass}
                placeholder="Account name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>
          <div className="border-t border-gray-100 px-6 py-4 dark:border-gray-800">
            <div className="flex gap-3">
              <Button variant="outline" size="sm" className="flex-1" onClick={onClose} type="button">
                Cancel
              </Button>
              <Button size="sm" className="flex-1" disabled={saving} type="submit">
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}

// ─── Statement Section ────────────────────────────────────────────────────────

function StatementSection({ accountId }: { accountId: string }) {
  const today = toLocalDate(new Date());
  const firstOfMonth = `${today.slice(0, 7)}-01`;

  const datePickerRef = useRef<HTMLInputElement>(null);
  const [runFrom, setRunFrom] = useState(firstOfMonth);
  const [runTo, setRunTo] = useState(today);
  const [statement, setStatement] = useState<PaymentAccountStatement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatement = async (from: string, to: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPaymentAccountStatement(accountId, from, to);
      setStatement(data);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? "Failed to load statement.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatement(runFrom, runTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!datePickerRef.current) return;

    const fp = flatpickr(datePickerRef.current, {
      mode: "range",
      static: true,
      monthSelectorType: "static",
      dateFormat: "M j, Y",
      rangeSeparator: " → ",
      defaultDate: [firstOfMonth, today],
      onReady: () => {
        if (datePickerRef.current) {
          datePickerRef.current.value = datePickerRef.current.value.replace(" to ", " → ");
        }
      },
      prevArrow:
        '<svg class="stroke-current" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.5 15L7.5 10L12.5 5" stroke="" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      nextArrow:
        '<svg class="stroke-current" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.5 15L12.5 10L7.5 5" stroke="" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      onChange: (dates: Date[]) => {
        if (dates.length === 2) {
          const from = toLocalDate(dates[0]);
          const to = toLocalDate(dates[1]);
          setRunFrom(from);
          setRunTo(to);
          fetchStatement(from, to);
          if (datePickerRef.current) {
            datePickerRef.current.value = datePickerRef.current.value.replace(" to ", " → ");
          }
        }
      },
    } as Parameters<typeof flatpickr>[1]);

    return () => {
      if (!Array.isArray(fp)) fp.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalIn = statement ? statement.entries.reduce((s, e) => s + e.moneyIn, 0) : 0;
  const totalOut = statement ? statement.entries.reduce((s, e) => s + e.moneyOut, 0) : 0;

  return (
    <div>
      {/* Summary cards — shown after statement loads */}
      {statement && (
        <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Opening Balance</p>
            <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
              {formatPKR(statement.openingBalance)}
            </p>
          </div>
          <div className="rounded-xl border border-success-200 bg-success-50 p-4 dark:border-success-500/30 dark:bg-success-500/10">
            <p className="text-xs font-medium text-success-700 dark:text-success-400">Total In</p>
            <p className="mt-1 text-lg font-bold text-success-700 dark:text-success-400">
              {formatPKR(totalIn)}
            </p>
          </div>
          <div className="rounded-xl border border-error-200 bg-error-50 p-4 dark:border-error-500/30 dark:bg-error-500/10">
            <p className="text-xs font-medium text-error-600 dark:text-error-400">Total Out</p>
            <p className="mt-1 text-lg font-bold text-error-600 dark:text-error-400">
              {formatPKR(totalOut)}
            </p>
          </div>
          <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
            <p className="text-xs font-medium text-brand-600 dark:text-brand-400">Closing Balance</p>
            <p className="mt-1 text-lg font-bold text-brand-600 dark:text-brand-400">
              {formatPKR(statement.closingBalance)}
            </p>
          </div>
        </div>
      )}

      {/* Date range picker */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative inline-flex items-center">
          <CalenderIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none z-10" />
          <input
            ref={datePickerRef}
            className="h-10 w-58 pl-9 pr-0 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 cursor-pointer"
            placeholder="Select date range"
            readOnly
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          <HiOutlineExclamationTriangle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 w-full rounded bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      ) : !statement || statement.entries.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">
          No transactions in this date range.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                {[
                  "Date",
                  "Document #",
                  "Transaction Type",
                  "Party",
                  "Money In",
                  "Money Out",
                  "Running Balance",
                ].map((col) => (
                  <th
                    key={col}
                    className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 last:text-right last:pr-0"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {statement.entries.map((entry, i) => (
                <tr key={i} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                  <td className="py-3.5 pr-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                    {fmtDate(entry.date)}
                  </td>
                  <td className="py-3.5 pr-4 text-sm font-medium text-brand-500 whitespace-nowrap">
                    {entry.documentNumber ?? "—"}
                  </td>
                  <td className="py-3.5 pr-4 text-sm font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">
                    {entry.type}
                  </td>
                  <td className="py-3.5 pr-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                    {entry.partyName ?? "—"}
                  </td>
                  <td
                    className={`py-3.5 pr-4 text-sm font-medium whitespace-nowrap ${
                      entry.moneyIn > 0
                        ? "text-success-600 dark:text-success-400"
                        : "text-gray-400 dark:text-gray-600"
                    }`}
                  >
                    {entry.moneyIn > 0 ? formatPKR(entry.moneyIn) : "—"}
                  </td>
                  <td
                    className={`py-3.5 pr-4 text-sm font-medium whitespace-nowrap ${
                      entry.moneyOut > 0
                        ? "text-error-600 dark:text-error-400"
                        : "text-gray-400 dark:text-gray-600"
                    }`}
                  >
                    {entry.moneyOut > 0 ? formatPKR(entry.moneyOut) : "—"}
                  </td>
                  <td className="py-3.5 text-sm font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap text-right">
                    {formatPKR(entry.runningBalance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer balance cards */}
      {statement && (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Opening Balance (as of {runFrom})
            </p>
            <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
              {formatPKR(statement.openingBalance)}
            </p>
          </div>
          <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
            <p className="text-xs font-medium text-brand-600 dark:text-brand-400">
              Closing Balance (as of {runTo})
            </p>
            <p className="mt-1 text-xl font-bold text-brand-600 dark:text-brand-400">
              {formatPKR(statement.closingBalance)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PaymentAccountDetailClient({ id }: { id: string }) {
  const [account, setAccount] = useState<ApiPaymentAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const acc = await getPaymentAccount(id);
        setAccount(acc);
      } catch (err) {
        const apiErr = err as ApiError;
        if (apiErr.statusCode === 404) {
          setNotFound(true);
        } else {
          setError(apiErr.message ?? "Failed to load account.");
        }
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id]);

  if (isLoading) return <PageSkeleton />;

  if (notFound || !account) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <HiOutlineCreditCard size={48} className="text-gray-300" />
        <p className="text-lg font-medium text-gray-500">Account not found.</p>
        <Link href="/payment-accounts">
          <Button variant="outline" size="sm" startIcon={<HiOutlineArrowLeft size={15} />}>
            Back to Payment Accounts
          </Button>
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <div className="flex items-start gap-2 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          <HiOutlineExclamationTriangle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
        <Link href="/payment-accounts">
          <Button variant="outline" size="sm" startIcon={<HiOutlineArrowLeft size={15} />}>
            Back to Payment Accounts
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-full">
      {/* Back nav */}
      <div className="mb-5">
        <Link
          href="/payment-accounts"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-brand-500 dark:text-gray-400"
        >
          <HiOutlineArrowLeft size={15} />
          Back to Payment Accounts
        </Link>
      </div>

      {/* ── Header card ── */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
              <HiOutlineCreditCard size={22} className="text-brand-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{account.name}</h1>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TYPE_BADGE_COLORS[account.type]}`}
                >
                  {account.type}
                </span>
                <Badge
                  variant="solid"
                  color={account.status === "ACTIVE" ? "success" : "warning"}
                  size="sm"
                >
                  {account.status}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              startIcon={<HiOutlineArrowsUpDown size={14} />}
              onClick={() => setStatusModalOpen(true)}
            >
              Change Status
            </Button>
            <Button
              size="sm"
              startIcon={<HiOutlinePencilSquare size={14} />}
              onClick={() => setEditOpen(true)}
            >
              Edit
            </Button>
          </div>
        </div>

        <div className="mt-2">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Opening Balance</p>
          <p className="mt-0.5 text-sm font-semibold text-gray-800 dark:text-gray-100">
            {formatPKR(account.openingBalance)}
          </p>
        </div>
      </div>

      {/* ── Statement section ── */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Account Statement
          </h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Money in and out with running balance.
          </p>
        </div>
        <div className="p-6">
          <StatementSection accountId={account.id} />
        </div>
      </div>

      {/* Modals / Drawers */}
      <EditDrawer
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        account={account}
        onSaved={(updated) => setAccount(updated)}
      />
      {statusModalOpen && (
        <ChangeStatusModal
          account={account}
          onClose={() => setStatusModalOpen(false)}
          onSaved={(updated) => setAccount(updated)}
        />
      )}
    </div>
  );
}
