"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  HiOutlineArrowLeft,
  HiOutlineBanknotes,
  HiOutlineCheckCircle,
  HiOutlineClipboardDocumentList,
  HiOutlineExclamationTriangle,
} from "react-icons/hi2";
import Button from "@/components/ui/button/Button";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import {
  createExpense,
  Expense,
  getExpense,
  postExpense,
  updateExpense,
} from "@/lib/expenses";
import { ExpenseCategory, listExpenseCategories } from "@/lib/expenseCategories";
import { ApiPaymentAccount, listPaymentAccounts } from "@/lib/paymentAccounts";
import { formatPKR } from "@/lib/reports";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500";

const panelClass =
  "rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]";

function currentDate() {
  return new Date().toISOString().slice(0, 10);
}

function getExpenseDate(expense: Expense) {
  return expense.expenseDate ?? expense.date ?? "";
}

function getCurrentBalance(account: ApiPaymentAccount | undefined) {
  return account?.breakdown?.currentBalance ?? account?._computed?.currentBalance ?? 0;
}

function generateIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
      {children}
      {required && <span className="ml-0.5 text-error-500">*</span>}
    </label>
  );
}

type FormState = {
  date: string;
  amount: string;
  expenseCategoryId: string;
  paymentAccountId: string;
  description: string;
};

type FormErrors = {
  date?: string;
  amount?: string;
  expenseCategoryId?: string;
  paymentAccountId?: string;
  description?: string;
};

export default function ExpenseFormPage({ mode }: { mode: "create" | "edit" }) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const canManage = user?.role === "OWNER" || user?.role === "ADMIN";
  const isEdit = mode === "edit";

  const [form, setForm] = useState<FormState>({
    date: currentDate(),
    amount: "",
    expenseCategoryId: "",
    paymentAccountId: "",
    description: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [savingAndPosting, setSavingAndPosting] = useState(false);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [accounts, setAccounts] = useState<ApiPaymentAccount[]>([]);
  const [expense, setExpense] = useState<Expense | null>(null);

  const selectedCategory = categories.find((item) => item.id === form.expenseCategoryId);
  const selectedAccount = accounts.find((item) => item.id === form.paymentAccountId);
  const amountValue = Number(form.amount || 0);
  const balanceAfterExpense = getCurrentBalance(selectedAccount) - amountValue;

  const activeCategories = useMemo(
    () => categories.filter((category) => category.status === "ACTIVE"),
    [categories]
  );
  const activeAccounts = useMemo(
    () => accounts.filter((account) => account.status === "ACTIVE"),
    [accounts]
  );

  const navigateToDetail = useCallback((expenseId: string) => {
    sessionStorage.setItem("expenseId", expenseId);
    window.dispatchEvent(new CustomEvent("expenses:changed"));
    router.push("/expenses/detail");
  }, [router]);

  useEffect(() => {
    if (authLoading || !canManage) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setPageError(null);
      try {
        const [categoriesRes, accountsRes] = await Promise.all([
          listExpenseCategories({ page: 1, limit: 100, status: "ACTIVE" }),
          listPaymentAccounts({ page: 1, limit: 100, status: "ACTIVE" }),
        ]);

        if (cancelled) return;

        setCategories(
          [...categoriesRes.data].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        );
        setAccounts(
          [...accountsRes.data].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        );

        if (isEdit) {
          const expenseId = sessionStorage.getItem("expenseId");
          if (!expenseId) {
            router.replace("/expenses");
            return;
          }
          const existingExpense = await getExpense(expenseId);
          if (cancelled) return;
          setExpense(existingExpense);

          if (existingExpense.status !== "DRAFT") {
            sessionStorage.setItem("expenseId", existingExpense.id);
            router.replace("/expenses/detail");
            return;
          }

          setForm({
            date: getExpenseDate(existingExpense),
            amount: String(existingExpense.amount),
            expenseCategoryId: existingExpense.expenseCategoryId,
            paymentAccountId: existingExpense.paymentAccountId,
            description: existingExpense.description,
          });
        }
      } catch (err) {
        if (cancelled) return;
        const apiErr = err as ApiError;
        setPageError(apiErr.message ?? "Failed to load expense form.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [authLoading, canManage, isEdit, router]);

  const updateForm = (updates: Partial<FormState>) => {
    setForm((current) => ({ ...current, ...updates }));
  };

  const validate = () => {
    const nextErrors: FormErrors = {};

    if (!form.date) {
      nextErrors.date = "Date is required.";
    } else if (form.date > currentDate()) {
      nextErrors.date = "Date cannot be in the future.";
    }

    if (!form.amount.trim()) {
      nextErrors.amount = "Amount is required.";
    } else if (!/^\d+$/.test(form.amount.trim())) {
      nextErrors.amount = "Amount must be a whole number.";
    } else if (Number(form.amount) < 1) {
      nextErrors.amount = "Amount must be at least 1.";
    }

    if (!form.expenseCategoryId) {
      nextErrors.expenseCategoryId = "Category is required.";
    }

    if (!form.paymentAccountId) {
      nextErrors.paymentAccountId = "Payment account is required.";
    }

    const descriptionLength = form.description.trim().length;
    if (descriptionLength < 3 || descriptionLength > 500) {
      nextErrors.description = "Description must be between 3 and 500 characters.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildPayload = () => ({
    date: form.date,
    amount: Number(form.amount),
    expenseCategoryId: form.expenseCategoryId,
    paymentAccountId: form.paymentAccountId,
    description: form.description.trim(),
  });

  const buildUpdatePayload = () => {
    if (!expense) return buildPayload();

    const payload: {
      date?: string;
      amount?: number;
      expenseCategoryId?: string;
      paymentAccountId?: string;
      description?: string;
    } = {};

    if (form.date !== getExpenseDate(expense)) payload.date = form.date;
    if (Number(form.amount) !== expense.amount) payload.amount = Number(form.amount);
    if (form.expenseCategoryId !== expense.expenseCategoryId) payload.expenseCategoryId = form.expenseCategoryId;
    if (form.paymentAccountId !== expense.paymentAccountId) payload.paymentAccountId = form.paymentAccountId;
    if (form.description.trim() !== expense.description) payload.description = form.description.trim();

    return payload;
  };

  const handleSave = async (andPost: boolean) => {
    if (!validate()) return;

    setPageError(null);
    setSuccessMessage(null);
    if (andPost) setSavingAndPosting(true);
    else setSavingDraft(true);

    try {
      let currentExpense: Expense;

      if (isEdit && expense) {
        const updatePayload = buildUpdatePayload();
        currentExpense =
          Object.keys(updatePayload).length > 0
            ? await updateExpense(expense.id, updatePayload)
            : expense;
      } else {
        currentExpense = await createExpense(buildPayload());
      }

      if (andPost) {
        const postedExpense = await postExpense(currentExpense.id, {
          idempotencyKey: generateIdempotencyKey(),
        });
        navigateToDetail(postedExpense.id);
        return;
      }

      setSuccessMessage(isEdit ? "Draft updated" : "Draft saved");
      navigateToDetail(currentExpense.id);
    } catch (err) {
      const apiErr = err as ApiError;
      setPageError(apiErr.message ?? `Failed to ${andPost ? "save and post" : "save"} expense.`);
    } finally {
      setSavingDraft(false);
      setSavingAndPosting(false);
    }
  };

  if (authLoading) return null;

  if (!canManage) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <HiOutlineClipboardDocumentList size={48} className="text-gray-300" />
        <p className="text-lg font-medium text-gray-500">Expense drafts are restricted.</p>
        <p className="max-w-md text-sm text-gray-400">
          Only OWNER or ADMIN can create or edit expenses.
        </p>
        <Link href="/expenses">
          <Button variant="outline" size="sm" startIcon={<HiOutlineArrowLeft size={15} />}>
            Back to Expenses
          </Button>
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-full animate-pulse">
        <div className="mb-5 h-5 w-44 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <div className="space-y-4">
              <div className="h-10 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-10 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-10 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-28 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <div className="space-y-4">
              <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-6 w-40 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-6 w-28 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
        </div>
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

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEdit ? "Edit Expense Draft" : "New Expense Draft"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isEdit
              ? "Update the draft before posting it."
              : "Create a draft expense and optionally post it right away."}
          </p>
        </div>
        {isEdit && expense?.documentNumber && (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
            Document #: {expense.documentNumber}
          </div>
        )}
      </div>

      {successMessage && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-success-50 px-4 py-3 text-sm text-success-700 dark:bg-success-500/10 dark:text-success-400">
          <HiOutlineCheckCircle size={16} className="mt-0.5 shrink-0" />
          {successMessage}
        </div>
      )}

      {pageError && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          <HiOutlineExclamationTriangle size={16} className="mt-0.5 shrink-0" />
          {pageError}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className={`${panelClass} p-6`}>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <FieldLabel required>Date</FieldLabel>
              <input
                type="date"
                value={form.date}
                onChange={(e) => {
                  updateForm({ date: e.target.value });
                  setErrors((current) => ({ ...current, date: undefined }));
                }}
                className={inputClass}
              />
              {errors.date && (
                <p className="mt-1.5 text-sm text-error-600 dark:text-error-400">{errors.date}</p>
              )}
            </div>

            <div>
              <FieldLabel required>Amount (PKR)</FieldLabel>
              <input
                type="number"
                min="1"
                step="1"
                value={form.amount}
                onChange={(e) => {
                  updateForm({ amount: e.target.value });
                  setErrors((current) => ({ ...current, amount: undefined }));
                }}
                className={inputClass}
                placeholder="Enter amount"
              />
              {errors.amount && (
                <p className="mt-1.5 text-sm text-error-600 dark:text-error-400">{errors.amount}</p>
              )}
            </div>

            <div>
              <FieldLabel required>Category</FieldLabel>
              <select
                value={form.expenseCategoryId}
                onChange={(e) => {
                  updateForm({ expenseCategoryId: e.target.value });
                  setErrors((current) => ({ ...current, expenseCategoryId: undefined }));
                }}
                className={inputClass}
              >
                <option value="">Select category</option>
                {activeCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}{category.isSystem ? " (System)" : ""}
                  </option>
                ))}
              </select>
              {errors.expenseCategoryId && (
                <p className="mt-1.5 text-sm text-error-600 dark:text-error-400">
                  {errors.expenseCategoryId}
                </p>
              )}
            </div>

            <div>
              <FieldLabel required>Payment Account</FieldLabel>
              <select
                value={form.paymentAccountId}
                onChange={(e) => {
                  updateForm({ paymentAccountId: e.target.value });
                  setErrors((current) => ({ ...current, paymentAccountId: undefined }));
                }}
                className={inputClass}
              >
                <option value="">Select payment account</option>
                {activeAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} — {formatPKR(getCurrentBalance(account))}
                  </option>
                ))}
              </select>
              {errors.paymentAccountId && (
                <p className="mt-1.5 text-sm text-error-600 dark:text-error-400">
                  {errors.paymentAccountId}
                </p>
              )}
            </div>
          </div>

          <div className="mt-5">
            <FieldLabel required>Description</FieldLabel>
            <textarea
              rows={6}
              value={form.description}
              onChange={(e) => {
                updateForm({ description: e.target.value });
                setErrors((current) => ({ ...current, description: undefined }));
              }}
              className={`${inputClass} resize-none`}
              placeholder="Describe the expense"
            />
            {errors.description && (
              <p className="mt-1.5 text-sm text-error-600 dark:text-error-400">
                {errors.description}
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleSave(false)}
              disabled={savingDraft || savingAndPosting}
            >
              {savingDraft ? "Saving..." : "Save as Draft"}
            </Button>
            <Button size="sm" onClick={() => void handleSave(true)} disabled={savingDraft || savingAndPosting}>
              {savingAndPosting ? "Saving & Posting..." : "Save & Post"}
            </Button>
          </div>
        </div>

        <div className={`${panelClass} h-fit p-6 lg:sticky lg:top-6`}>
          <div className="mb-4 flex items-center gap-2">
            <HiOutlineBanknotes size={18} className="text-brand-500" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Summary</h2>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
              <p className="text-xs text-gray-400">Selected Category</p>
              <p className="mt-1 text-sm font-medium text-gray-800 dark:text-gray-100">
                {selectedCategory?.name ?? "—"}
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
              <p className="text-xs text-gray-400">Payment Account</p>
              <p className="mt-1 text-sm font-medium text-gray-800 dark:text-gray-100">
                {selectedAccount?.name ?? "—"}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Current balance: {formatPKR(getCurrentBalance(selectedAccount))}
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
              <p className="text-xs text-gray-400">Amount Entered</p>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                {formatPKR(amountValue)}
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
              <p className="text-xs text-gray-400">Balance After Expense</p>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                {formatPKR(balanceAfterExpense)}
              </p>
              {selectedAccount && balanceAfterExpense < 0 && (
                <p className="mt-2 text-xs font-medium text-warning-600 dark:text-warning-400">
                  Balance will go below zero.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
