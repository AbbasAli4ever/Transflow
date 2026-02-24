"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  HiOutlineCreditCard,
  HiOutlinePlus,
  HiOutlineEye,
  HiOutlinePencilSquare,
  HiOutlineArrowsUpDown,
  HiOutlineXMark,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineExclamationTriangle,
} from "react-icons/hi2";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import {
  ApiPaymentAccount,
  PaymentAccountType,
  PaymentAccountStatus,
  formatPKR,
  listPaymentAccounts,
  createPaymentAccount,
  updatePaymentAccount,
  changePaymentAccountStatus,
} from "@/lib/paymentAccounts";
import { ApiError } from "@/lib/api";

// ─── Small reusable action button ────────────────────────────────────────────

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-theme-xs transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-5 py-4">
        <div className="h-4 w-36 rounded bg-gray-200 dark:bg-gray-700" />
      </td>
      <td className="px-5 py-4">
        <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
      </td>
      <td className="px-5 py-4">
        <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
      </td>
      <td className="px-5 py-4">
        <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
      </td>
      <td className="px-5 py-4">
        <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-24 rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="h-7 w-12 rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="h-7 w-28 rounded-lg bg-gray-200 dark:bg-gray-700" />
        </div>
      </td>
    </tr>
  );
}

// ─── Input helpers ────────────────────────────────────────────────────────────

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

// ─── Add / Edit Drawer ────────────────────────────────────────────────────────

interface DrawerForm {
  name: string;
  type: PaymentAccountType;
  openingBalance: string;
}

const emptyForm: DrawerForm = { name: "", type: "CASH", openingBalance: "0" };

const TYPE_OPTIONS: PaymentAccountType[] = ["CASH", "BANK", "WALLET", "CARD"];

function PaymentAccountDrawer({
  isOpen,
  onClose,
  onSaved,
  initial,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial?: ApiPaymentAccount | null;
}) {
  const [form, setForm] = useState<DrawerForm>(
    initial
      ? { name: initial.name, type: initial.type, openingBalance: String(initial.openingBalance) }
      : emptyForm
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(
      initial
        ? { name: initial.name, type: initial.type, openingBalance: String(initial.openingBalance) }
        : emptyForm
    );
    setError(null);
  }, [initial, isOpen]);

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
      if (initial) {
        await updatePaymentAccount(initial.id, { name: form.name });
      } else {
        await createPaymentAccount({
          name: form.name,
          type: form.type,
          openingBalance: parseFloat(form.openingBalance) || 0,
        });
      }
      onSaved();
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

  const isEdit = !!initial;

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
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {isEdit ? "Edit Account" : "Add Payment Account"}
            </h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {isEdit ? "Update account name." : "Create a new payment account."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <HiOutlineXMark size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
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
                placeholder="Enter account name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            {!isEdit && (
              <>
                <div>
                  <FieldLabel required>Type</FieldLabel>
                  <select
                    required
                    className={inputClass}
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as PaymentAccountType })}
                  >
                    {TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <FieldLabel>Opening Balance</FieldLabel>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputClass}
                    placeholder="0"
                    value={form.openingBalance}
                    onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>

          <div className="border-t border-gray-100 px-6 py-4 dark:border-gray-800">
            <div className="flex gap-3">
              <Button variant="outline" size="sm" className="flex-1" onClick={onClose} type="button">
                Cancel
              </Button>
              <Button size="sm" className="flex-1" disabled={saving} type="submit">
                {saving ? "Saving..." : isEdit ? "Save Changes" : "Save Account"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}

// ─── Change Status Confirm Modal ──────────────────────────────────────────────

function ChangeStatusModal({
  account,
  onClose,
  onSaved,
}: {
  account: ApiPaymentAccount | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [account]);

  if (!account) return null;

  const newStatus: PaymentAccountStatus = account.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

  const handleConfirm = async () => {
    setError(null);
    setSaving(true);
    try {
      await changePaymentAccountStatus(account.id, newStatus);
      onSaved();
      onClose();
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? "Failed to change status.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={!!account} onClose={onClose} className="max-w-sm mx-4" showCloseButton={false}>
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

// ─── Type badge colors ────────────────────────────────────────────────────────

const TYPE_BADGE_COLORS: Record<PaymentAccountType, string> = {
  CASH: "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400",
  BANK: "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400",
  WALLET: "bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400",
  CARD: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PaymentAccountsPage() {
  const [accounts, setAccounts] = useState<ApiPaymentAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<PaymentAccountType | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "INACTIVE" | "ALL">("ACTIVE");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ApiPaymentAccount | null>(null);
  const [statusTarget, setStatusTarget] = useState<ApiPaymentAccount | null>(null);

  const handleViewStatement = (id: string) => {
    sessionStorage.setItem("paymentAccountId", id);
    window.location.href = "/payment-accounts/detail";
  };

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listPaymentAccounts({
        page,
        limit: 20,
        type: typeFilter,
        status: statusFilter,
      });
      setAccounts(result.data);
      setMeta({ total: result.meta.total, totalPages: result.meta.totalPages });
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? "Failed to load payment accounts.");
    } finally {
      setIsLoading(false);
    }
  }, [page, typeFilter, statusFilter]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleTypeFilterChange = (f: PaymentAccountType | "ALL") => {
    setTypeFilter(f);
    setPage(1);
  };

  const handleStatusFilterChange = (f: "ACTIVE" | "INACTIVE" | "ALL") => {
    setStatusFilter(f);
    setPage(1);
  };

  const totalBalance = accounts.reduce((sum, a) => sum + a._computed.currentBalance, 0);

  return (
    <div className="mx-auto w-full max-w-full">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
            <HiOutlineCreditCard size={22} className="text-brand-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Accounts</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Browse and manage all payment accounts.
            </p>
          </div>
        </div>
        <Button size="sm" startIcon={<HiOutlinePlus size={16} />} onClick={() => setAddOpen(true)}>
          Add Account
        </Button>
      </div>

      {/* Total balance summary */}
      {!isLoading && accounts.length > 0 && (
        <div className="mb-4 inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 dark:border-brand-500/30 dark:bg-brand-500/10">
          <HiOutlineCreditCard size={16} className="text-brand-500" />
          <span className="text-sm font-medium text-brand-700 dark:text-brand-300">
            Total Balance: {formatPKR(totalBalance)}
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        {/* Type filter */}
        <div className="flex rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
          {(["ALL", "CASH", "BANK", "WALLET", "CARD"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTypeFilterChange(tab)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
                typeFilter === tab
                  ? "bg-brand-500 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {tab === "ALL" ? "All Types" : tab}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
          {(["ACTIVE", "INACTIVE", "ALL"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => handleStatusFilterChange(tab)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
                statusFilter === tab
                  ? "bg-brand-500 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {tab === "ACTIVE" ? "Active" : tab === "INACTIVE" ? "Inactive" : "All"}
            </button>
          ))}
        </div>
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
          <table className="w-full min-w-[800px] whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                {(["Name", "Type", "Current Balance", "Opening Balance", "Status", "Actions"] as const).map(
                  (col) => (
                    <th
                      key={col}
                      className={`px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 ${col === "Actions" ? "w-[260px]" : ""}`}
                    >
                      {col}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : accounts.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-16 text-center text-sm text-gray-400 dark:text-gray-500"
                  >
                    No payment accounts found.{" "}
                    {statusFilter === "ACTIVE" && typeFilter === "ALL"
                      ? "Add your first account."
                      : "Try adjusting your filters."}
                  </td>
                </tr>
              ) : (
                accounts.map((account) => (
                  <tr
                    key={account.id}
                    className="transition hover:bg-gray-50/60 dark:hover:bg-gray-800/40"
                  >
                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleViewStatement(account.id)}
                        className="text-sm font-semibold text-brand-500 transition hover:text-brand-600 hover:underline"
                      >
                        {account.name}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TYPE_BADGE_COLORS[account.type]}`}
                      >
                        {account.type}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-gray-100">
                      {formatPKR(account._computed.currentBalance)}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {formatPKR(account.openingBalance)}
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        variant="light"
                        size="sm"
                        color={account.status === "ACTIVE" ? "success" : "warning"}
                      >
                        {account.status === "ACTIVE" ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <ActionButton
                          icon={<HiOutlineEye size={14} />}
                          label="View Statement"
                          onClick={() => handleViewStatement(account.id)}
                        />
                        <ActionButton
                          icon={<HiOutlinePencilSquare size={14} />}
                          label="Edit"
                          onClick={() => setEditTarget(account)}
                        />
                        <ActionButton
                          icon={<HiOutlineArrowsUpDown size={14} />}
                          label="Status"
                          onClick={() => setStatusTarget(account)}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer: count + pagination */}
        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 dark:border-gray-700">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {isLoading ? (
              "Loading..."
            ) : (
              <>
                Showing{" "}
                <span className="font-medium text-gray-600 dark:text-gray-300">
                  {accounts.length}
                </span>{" "}
                of{" "}
                <span className="font-medium text-gray-600 dark:text-gray-300">{meta.total}</span>{" "}
                accounts
              </>
            )}
          </p>
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
        </div>
      </div>

      {/* Drawers / Modals */}
      <PaymentAccountDrawer
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={fetchAccounts}
      />
      <PaymentAccountDrawer
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={fetchAccounts}
        initial={editTarget}
      />
      <ChangeStatusModal
        account={statusTarget}
        onClose={() => setStatusTarget(null)}
        onSaved={fetchAccounts}
      />
    </div>
  );
}
