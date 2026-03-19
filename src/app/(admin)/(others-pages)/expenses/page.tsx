"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  HiOutlineArrowLeft,
  HiOutlineClipboardDocumentList,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineExclamationTriangle,
  HiOutlineEye,
  HiOutlinePencilSquare,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineXMark,
} from "react-icons/hi2";
import DatePicker from "@/components/form/date-picker";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import { Expense, ExpenseStatus, deleteExpense, listExpenses } from "@/lib/expenses";
import { ExpenseCategory, listExpenseCategories } from "@/lib/expenseCategories";
import { formatPKR } from "@/lib/reports";

const STATUS_BADGE: Record<ExpenseStatus, "warning" | "success" | "light"> = {
  DRAFT: "warning",
  POSTED: "success",
  VOIDED: "light",
};

function formatDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function getExpenseDate(expense: Expense) {
  return expense.expenseDate ?? expense.date ?? "";
}

function getCategoryName(expense: Expense) {
  return expense.expenseCategory?.name ?? expense.categoryName ?? "—";
}

function getPaymentAccountName(expense: Expense) {
  return expense.paymentAccount?.name ?? expense.paymentAccountName ?? "—";
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

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

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 8 }).map((_, index) => (
        <td key={index} className="px-5 py-4">
          <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
        </td>
      ))}
    </tr>
  );
}

function DeleteDraftModal({
  expense,
  onClose,
  onDeleted,
}: {
  expense: Expense | null;
  onClose: () => void;
  onDeleted: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [expense]);

  if (!expense) return null;

  const handleDelete = async () => {
    setSaving(true);
    setError(null);
    try {
      await deleteExpense(expense.id);
      await onDeleted();
      onClose();
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? "Failed to delete draft expense.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={!!expense} onClose={onClose} className="max-w-sm mx-4" showCloseButton={false}>
      <div className="p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning-50 dark:bg-warning-500/10">
            <HiOutlineTrash size={24} className="text-warning-500" />
          </div>
          <h3 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">
            Delete Draft
          </h3>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Delete {expense.documentNumber}? This action cannot be undone.
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
          <Button size="sm" onClick={handleDelete} disabled={saving}>
            {saving ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function ExpensesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const canManage = user?.role === "OWNER" || user?.role === "ADMIN";

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, limit: 20, page: 1 });
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  const fetchExpenses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listExpenses({
        page,
        limit: 20,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        expenseCategoryId: categoryFilter || undefined,
        status: statusFilter,
      });
      setExpenses(
        [...result.data].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      );
      setMeta(result.meta);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? "Failed to load expenses.");
    } finally {
      setIsLoading(false);
    }
  }, [page, dateFrom, dateTo, categoryFilter, statusFilter]);

  const fetchCategories = useCallback(async () => {
    try {
      const result = await listExpenseCategories({
        page: 1,
        limit: 100,
        status: "ACTIVE",
      });
      setCategories(
        [...result.data].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      );
    } catch {
      setCategories([]);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && canManage) {
      void fetchExpenses();
      void fetchCategories();
    }
  }, [authLoading, canManage, fetchExpenses, fetchCategories]);

  const handleReset = () => {
    setDateFrom("");
    setDateTo("");
    setCategoryFilter("");
    setStatusFilter("ALL");
    setPage(1);
  };

  const draftCount = useMemo(
    () => expenses.filter((expense) => expense.status === "DRAFT").length,
    [expenses]
  );

  const handleDeleteSuccess = async () => {
    window.dispatchEvent(new CustomEvent("expenses:changed"));
    await fetchExpenses();
  };

  const navigatePlaceholder = (id: string, path: string) => {
    sessionStorage.setItem("expenseId", id);
    window.location.href = path;
  };

  if (authLoading) return null;

  if (!canManage) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <HiOutlineClipboardDocumentList size={48} className="text-gray-300" />
        <p className="text-lg font-medium text-gray-500">Expenses are restricted.</p>
        <p className="max-w-md text-center text-sm text-gray-400">
          Only OWNER or ADMIN can access the expenses module.
        </p>
        <Link href="/">
          <Button variant="outline" size="sm" startIcon={<HiOutlineArrowLeft size={15} />}>
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-full">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
            <HiOutlineClipboardDocumentList size={22} className="text-brand-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expenses</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Browse all expenses across all statuses.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
            Drafts on page: {draftCount}
          </div>
          <Link href="/expenses/new">
            <Button size="sm" startIcon={<HiOutlinePlus size={16} />}>
              New Expense
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          <HiOutlineExclamationTriangle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900">
        <div className="grid gap-3 lg:grid-cols-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500">
              Date From
            </label>
            <DatePicker
              id="expenses-date-from"
              mode="single"
              defaultDate={dateFrom || undefined}
              placeholder="Select start date"
              onChange={(selectedDates) => {
                const selected = selectedDates[0];
                setDateFrom(
                  selected
                    ? `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, "0")}-${String(
                        selected.getDate()
                      ).padStart(2, "0")}`
                    : ""
                );
                setPage(1);
              }}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500">
              Date To
            </label>
            <DatePicker
              id="expenses-date-to"
              mode="single"
              defaultDate={dateTo || undefined}
              placeholder="Select end date"
              onChange={(selectedDates) => {
                const selected = selectedDates[0];
                setDateTo(
                  selected
                    ? `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, "0")}-${String(
                        selected.getDate()
                      ).padStart(2, "0")}`
                    : ""
                );
                setPage(1);
              }}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as ExpenseStatus | "ALL");
                setPage(1);
              }}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="ALL">All</option>
              <option value="DRAFT">Draft</option>
              <option value="POSTED">Posted</option>
              <option value="VOIDED">Voided</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button variant="outline" size="sm" className="w-full" onClick={handleReset}>
              Reset Filters
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                {(["Document #", "Date", "Category", "Description", "Amount", "Payment Account", "Status", "Actions"] as const).map((col) => (
                  <th
                    key={col}
                    className={`px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 ${
                      col === "Amount" ? "text-right" : ""
                    } ${col === "Actions" ? "w-[240px]" : ""}`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, index) => <SkeletonRow key={index} />)
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-sm text-gray-400 dark:text-gray-500">
                    No expenses found for the selected filters.
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className="transition hover:bg-gray-50/60 dark:hover:bg-gray-800/40"
                  >
                    <td className="px-5 py-4">
                      <button
                        onClick={() => navigatePlaceholder(expense.id, "/expenses/detail")}
                        className="text-sm font-semibold text-brand-500 transition hover:text-brand-600 hover:underline"
                      >
                        {expense.documentNumber}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {formatDate(getExpenseDate(expense))}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">
                      {getCategoryName(expense)}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {truncate(expense.description, 50)}
                    </td>
                    <td className="px-5 py-4 text-right text-sm font-medium text-gray-800 dark:text-gray-100">
                      {formatPKR(expense.amount)}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {getPaymentAccountName(expense)}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant="light" size="sm" color={STATUS_BADGE[expense.status]}>
                        {expense.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <ActionButton
                          icon={<HiOutlineEye size={14} />}
                          label="View"
                          onClick={() => navigatePlaceholder(expense.id, "/expenses/detail")}
                        />
                        {expense.status === "DRAFT" && (
                          <>
                            <ActionButton
                              icon={<HiOutlinePencilSquare size={14} />}
                              label="Edit"
                              onClick={() => navigatePlaceholder(expense.id, "/expenses/edit")}
                            />
                            <ActionButton
                              icon={<HiOutlineTrash size={14} />}
                              label="Delete"
                              onClick={() => setDeleteTarget(expense)}
                            />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 dark:border-gray-700">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {isLoading ? "Loading..." : `Showing page ${meta.page} of ${meta.totalPages}`}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              disabled={page <= 1 || isLoading}
              startIcon={<HiOutlineChevronLeft size={14} />}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => Math.min(current + 1, meta.totalPages))}
              disabled={page >= meta.totalPages || isLoading}
              endIcon={<HiOutlineChevronRight size={14} />}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <DeleteDraftModal
        expense={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={handleDeleteSuccess}
      />
    </div>
  );
}
