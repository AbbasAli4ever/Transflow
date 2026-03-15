"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  HiOutlineArrowLeft,
  HiOutlineCheckCircle,
  HiOutlineClipboardDocumentList,
  HiOutlineExclamationTriangle,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineXMark,
} from "react-icons/hi2";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import {
  deleteExpense,
  Expense,
  ExpenseStatus,
  getExpense,
  postExpense,
  voidExpense,
} from "@/lib/expenses";
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

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
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
        <div className="h-4 w-56 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="h-40 w-full rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}

export default function ExpenseDetailPage() {
  const router = useRouter();
  const { user } = useAuth();
  const canManage = user?.role === "OWNER" || user?.role === "ADMIN";

  const [id, setId] = useState<string | null>(null);
  const [expense, setExpense] = useState<Expense | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [postOpen, setPostOpen] = useState(false);
  const [postLoading, setPostLoading] = useState(false);
  const [postIdempotencyKey, setPostIdempotencyKey] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [voidLoading, setVoidLoading] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("expenseId");
    if (!stored) {
      router.replace("/expenses");
      return;
    }
    setId(stored);
  }, [router]);

  const loadExpense = async (expenseId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getExpense(expenseId);
      setExpense(data);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.statusCode === 404) {
        setNotFound(true);
      } else {
        setError(apiErr.message ?? "Failed to load expense.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    void loadExpense(id);
  }, [id]);

  const handlePost = async () => {
    if (!expense || !postIdempotencyKey) return;
    setPostLoading(true);
    setError(null);
    try {
      await postExpense(expense.id, { idempotencyKey: postIdempotencyKey });
      await loadExpense(expense.id);
      setSuccessMessage("Expense posted");
      setPostOpen(false);
      window.dispatchEvent(new CustomEvent("expenses:changed"));
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? "Failed to post expense.");
    } finally {
      setPostLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!expense) return;
    setDeleteLoading(true);
    setError(null);
    try {
      await deleteExpense(expense.id);
      window.dispatchEvent(new CustomEvent("expenses:changed"));
      router.replace("/expenses");
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? "Failed to delete draft expense.");
    } finally {
      setDeleteLoading(false);
      setDeleteOpen(false);
    }
  };

  const handleVoid = async () => {
    if (!expense) return;
    setVoidLoading(true);
    setError(null);
    try {
      await voidExpense(expense.id, {
        reason: voidReason.trim() ? voidReason.trim() : undefined,
      });
      await loadExpense(expense.id);
      setSuccessMessage("Expense voided");
      setVoidOpen(false);
      setVoidReason("");
      window.dispatchEvent(new CustomEvent("expenses:changed"));
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? "Failed to void expense.");
    } finally {
      setVoidLoading(false);
    }
  };

  if (isLoading) return <PageSkeleton />;

  if (notFound || !expense) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <HiOutlineClipboardDocumentList size={48} className="text-gray-300" />
        <p className="text-lg font-medium text-gray-500">Expense not found.</p>
        <Link href="/expenses">
          <Button variant="outline" size="sm" startIcon={<HiOutlineArrowLeft size={15} />}>
            Back to Expenses
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-full">
      <div className="mb-5">
        <Link
          href="/expenses"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-brand-500 dark:text-gray-400"
        >
          <HiOutlineArrowLeft size={15} />
          Back to Expenses
        </Link>
      </div>

      {successMessage && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-success-50 px-4 py-3 text-sm text-success-700 dark:bg-success-500/10 dark:text-success-400">
          <HiOutlineCheckCircle size={16} className="mt-0.5 shrink-0" />
          {successMessage}
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          <HiOutlineExclamationTriangle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        {expense.status === "VOIDED" && (
          <div className="mb-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="light" size="sm" color="light">
                VOIDED
              </Badge>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                This expense has been voided.
              </p>
            </div>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
              <p>
                <span className="text-gray-400">Voided on:</span> {formatDateTime(expense.voidedAt)}
              </p>
              <p>
                <span className="text-gray-400">Voided by:</span>{" "}
                {expense.voidedByUser?.fullName ?? expense.voidedBy ?? "—"}
              </p>
              <p>
                <span className="text-gray-400">Reason:</span>{" "}
                {expense.voidReason?.trim() || "No reason given"}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {expense.documentNumber}
              </h1>
              <Badge variant="light" size="sm" color={STATUS_BADGE[expense.status]}>
                {expense.status}
              </Badge>
            </div>
            <p className="mb-3 text-3xl font-bold text-gray-900 dark:text-white">
              {formatPKR(expense.amount)}
            </p>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-300">
              <div>
                <span className="text-gray-400">Date:</span> {formatDate(getExpenseDate(expense))}
              </div>
              <div>
                <span className="text-gray-400">Category:</span> {getCategoryName(expense)}
              </div>
              <div>
                <span className="text-gray-400">Payment Account:</span>{" "}
                {getPaymentAccountName(expense)}
              </div>
              <div>
                <span className="text-gray-400">Created by:</span>{" "}
                {expense.createdByUser?.fullName ?? "—"}
              </div>
              <div>
                <span className="text-gray-400">Created at:</span> {formatDateTime(expense.createdAt)}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {expense.status === "DRAFT" && canManage && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  startIcon={<HiOutlinePencilSquare size={16} />}
                  onClick={() => {
                    sessionStorage.setItem("expenseId", expense.id);
                    router.push("/expenses/edit");
                  }}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setPostIdempotencyKey(
                      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
                        ? crypto.randomUUID()
                        : `${Date.now()}-${Math.random().toString(16).slice(2)}`
                    );
                    setPostOpen(true);
                  }}
                >
                  Post Expense
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  startIcon={<HiOutlineTrash size={16} />}
                  onClick={() => setDeleteOpen(true)}
                >
                  Delete Draft
                </Button>
              </>
            )}

            {expense.status === "POSTED" && canManage && (
              <button
                type="button"
                onClick={() => {
                  setVoidReason("");
                  setVoidOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm font-medium text-error-700 transition hover:bg-error-100 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400 dark:hover:bg-error-500/15"
              >
                <HiOutlineTrash size={16} />
                Void Expense
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">Description</h2>
        <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-gray-300">
          {expense.description}
        </p>
      </div>

      {postOpen && (
        <Modal isOpen onClose={() => setPostOpen(false)} className="max-w-sm mx-4" showCloseButton={false}>
          <div className="p-6">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-50 dark:bg-success-500/10">
                <HiOutlineCheckCircle size={24} className="text-success-500" />
              </div>
              <h3 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">
                Post Expense
              </h3>
              <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                Post {expense.documentNumber} for {formatPKR(expense.amount)}?
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setPostOpen(false)} disabled={postLoading}>
                Cancel
              </Button>
              <Button size="sm" onClick={handlePost} disabled={postLoading}>
                {postLoading ? "Posting..." : "Confirm"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {deleteOpen && (
        <Modal isOpen onClose={() => setDeleteOpen(false)} className="max-w-sm mx-4" showCloseButton={false}>
          <div className="p-6">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning-50 dark:bg-warning-500/10">
                <HiOutlineTrash size={24} className="text-warning-500" />
              </div>
              <h3 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">
                Delete Draft
              </h3>
              <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                This will permanently delete the draft expense.
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setDeleteOpen(false)} disabled={deleteLoading}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleDelete} disabled={deleteLoading}>
                {deleteLoading ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {voidOpen && (
        <Modal isOpen onClose={() => setVoidOpen(false)} className="max-w-lg mx-4" showCloseButton={false}>
          <div className="p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Void Expense
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  This action is irreversible. Enter a reason (optional).
                </p>
              </div>
              <button
                onClick={() => setVoidOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              >
                <HiOutlineXMark size={18} />
              </button>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Reason
              </label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                rows={4}
                placeholder="Optional reason for voiding this expense"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-error-500 focus:ring-2 focus:ring-error-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setVoidOpen(false)} disabled={voidLoading}>
                Cancel
              </Button>
              <button
                type="button"
                onClick={handleVoid}
                disabled={voidLoading}
                className={`inline-flex items-center justify-center rounded-lg bg-error-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-error-600 ${
                  voidLoading ? "cursor-not-allowed opacity-50" : ""
                }`}
              >
                {voidLoading ? "Voiding..." : "Void Expense"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
