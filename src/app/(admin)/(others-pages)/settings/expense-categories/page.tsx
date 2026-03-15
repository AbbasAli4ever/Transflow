"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  HiOutlineArrowLeft,
  HiOutlineArrowsUpDown,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineMagnifyingGlass,
  HiOutlinePencilSquare,
  HiOutlinePlus,
  HiOutlineTag,
  HiOutlineXMark,
} from "react-icons/hi2";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/context/AuthContext";
import {
  createExpenseCategory,
  deleteExpenseCategory,
  ExpenseCategory,
  ExpenseCategoryStatus,
  listExpenseCategories,
  updateExpenseCategory,
} from "@/lib/expenseCategories";
import { ApiError } from "@/lib/api";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500";

const SYSTEM_CATEGORY_ORDER: Record<string, number> = {
  "Delivery & Shipping": 6001,
  "Office Supplies": 6002,
  Utilities: 6003,
  "Rent & Lease": 6004,
  "Salaries & Wages": 6005,
  "Maintenance & Repairs": 6006,
  "Bank Charges & Fees": 6007,
  "Marketing & Advertising": 6008,
  "Professional Services": 6009,
  Miscellaneous: 6010,
};

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
      {children}
      {required && <span className="ml-0.5 text-error-500">*</span>}
    </label>
  );
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
      <td className="px-5 py-4">
        <div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-700" />
      </td>
      <td className="px-5 py-4">
        <div className="h-4 w-52 rounded bg-gray-200 dark:bg-gray-700" />
      </td>
      <td className="px-5 py-4">
        <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
      </td>
      <td className="px-5 py-4">
        <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-14 rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="h-7 w-24 rounded-lg bg-gray-200 dark:bg-gray-700" />
        </div>
      </td>
    </tr>
  );
}

function ExpenseCategoryModal({
  isOpen,
  onClose,
  onSaved,
  initial,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
  initial: ExpenseCategory | null;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; description?: string }>({});

  useEffect(() => {
    setName(initial?.name ?? "");
    setDescription(initial?.description ?? "");
    setError(null);
    setFieldErrors({});
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
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    const nextFieldErrors: { name?: string; description?: string } = {};

    if (!trimmedName) nextFieldErrors.name = "Name is required.";
    else if (trimmedName.length < 2 || trimmedName.length > 100) {
      nextFieldErrors.name = "Name must be between 2 and 100 characters.";
    }

    if (trimmedDescription.length > 500) {
      nextFieldErrors.description = "Description cannot exceed 500 characters.";
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError(null);
      return;
    }

    if (initial?.isSystem) {
      setError("System categories cannot be edited.");
      return;
    }

    setError(null);
    setFieldErrors({});
    setSaving(true);
    try {
      if (initial) {
        const updates: { name?: string; description?: string } = {};
        if (trimmedName !== initial.name) updates.name = trimmedName;
        if (trimmedDescription !== (initial.description ?? "")) {
          updates.description = trimmedDescription || "";
        }
        if (Object.keys(updates).length === 0) {
          onClose();
          return;
        }
        await updateExpenseCategory(initial.id, updates);
      } else {
        await createExpenseCategory({
          name: trimmedName,
          ...(trimmedDescription ? { description: trimmedDescription } : {}),
        });
      }
      onSaved("Category saved");
      onClose();
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.statusCode === 409) {
        setError("A category with this name already exists.");
      } else if (apiErr.errors?.length) {
        setError(apiErr.errors.map((item) => item.message).join(", "));
      } else {
        setError(apiErr.message ?? "Failed to save category.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen onClose={onClose} className="max-w-lg mx-4" showCloseButton={false}>
      <div className="p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {initial ? "Edit Expense Category" : "Add Expense Category"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {initial ? "Update the category details." : "Create a new custom expense category."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <HiOutlineXMark size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
            <HiOutlineExclamationTriangle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <FieldLabel required>Name</FieldLabel>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFieldErrors((current) => ({ ...current, name: undefined }));
              }}
              placeholder="Enter category name"
              required
              maxLength={100}
            />
            {fieldErrors.name && (
              <p className="mt-1.5 text-sm text-error-600 dark:text-error-400">{fieldErrors.name}</p>
            )}
          </div>

          <div>
            <FieldLabel>Description</FieldLabel>
            <textarea
              rows={4}
              className={`${inputClass} resize-none`}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setFieldErrors((current) => ({ ...current, description: undefined }));
              }}
              placeholder="Optional description"
              maxLength={500}
            />
            {fieldErrors.description && (
              <p className="mt-1.5 text-sm text-error-600 dark:text-error-400">
                {fieldErrors.description}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Category"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

function DeactivateCategoryModal({
  category,
  onClose,
  onSaved,
}: {
  category: ExpenseCategory | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [category]);

  if (!category) return null;

  const handleConfirm = async () => {
    setError(null);
    setSaving(true);
    try {
      await deleteExpenseCategory(category.id);
      onSaved("Category deactivated");
      onClose();
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? "Failed to change category status.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={!!category} onClose={onClose} className="max-w-sm mx-4" showCloseButton={false}>
      <div className="p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning-50 dark:bg-warning-500/10">
            <HiOutlineArrowsUpDown size={24} className="text-warning-500" />
          </div>
          <h3 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">
            Deactivate Category
          </h3>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Categories with posted expenses cannot be deactivated.
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
            {saving ? "Saving..." : "Deactivate"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function ExpenseCategoriesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const canManage = user?.role === "OWNER" || user?.role === "ADMIN";

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ExpenseCategoryStatus | "ALL">("ACTIVE");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "SYSTEM" | "CUSTOM">("ALL");

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ExpenseCategory | null>(null);
  const [statusTarget, setStatusTarget] = useState<ExpenseCategory | null>(null);

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listExpenseCategories({
        page: 1,
        limit: 100,
        search: debouncedSearch || undefined,
        status: statusFilter,
      });
      setCategories(result.data);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? "Failed to load expense categories.");
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    if (!authLoading) {
      void fetchCategories();
    }
  }, [authLoading, fetchCategories]);

  useEffect(() => {
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
  }, []);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setDebouncedSearch(value.trim());
    }, 300);
  };

  const visibleCategories = useMemo(() => {
    const filtered = categories.filter((category) => {
      if (typeFilter === "SYSTEM") return category.isSystem;
      if (typeFilter === "CUSTOM") return !category.isSystem;
      return true;
    });

    return filtered.sort((left, right) => {
      if (left.isSystem && right.isSystem) {
        return (
          (SYSTEM_CATEGORY_ORDER[left.name] ?? Number.MAX_SAFE_INTEGER) -
          (SYSTEM_CATEGORY_ORDER[right.name] ?? Number.MAX_SAFE_INTEGER)
        );
      }
      if (left.isSystem !== right.isSystem) {
        return left.isSystem ? -1 : 1;
      }
      return left.name.localeCompare(right.name);
    });
  }, [categories, typeFilter]);

  const handleSaved = async (message: string) => {
    setSuccessMessage(message);
    await fetchCategories();
  };

  if (authLoading) return null;

  if (!canManage) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <HiOutlineTag size={48} className="text-gray-300" />
        <p className="text-lg font-medium text-gray-500">Expense categories are restricted.</p>
        <p className="max-w-md text-center text-sm text-gray-400">
          Only OWNER or ADMIN can access expense category settings.
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
            <HiOutlineTag size={22} className="text-brand-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expense Categories</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Browse and manage expense categories for your tenant.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          startIcon={<HiOutlinePlus size={16} />}
          onClick={() => {
            setEditTarget(null);
            setModalOpen(true);
          }}
        >
          Add Category
        </Button>
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

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <HiOutlineMagnifyingGlass
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search categories by name"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-10 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
          />
          {search && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <HiOutlineXMark size={16} />
            </button>
          )}
        </div>

        <div className="flex rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
          {(["ACTIVE", "INACTIVE", "ALL"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
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

        <div className="flex rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
          {([
            ["ALL", "All"],
            ["SYSTEM", "System only"],
            ["CUSTOM", "Custom only"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setTypeFilter(value)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
                typeFilter === value
                  ? "bg-brand-500 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                {(["Name", "Description", "Status", "Type", "Actions"] as const).map((col) => (
                  <th
                    key={col}
                    className={`px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 ${
                      col === "Actions" ? "w-[220px]" : ""
                    }`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, index) => <SkeletonRow key={index} />)
              ) : visibleCategories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-sm text-gray-400 dark:text-gray-500">
                    No custom expense categories. Add one to track specific expense types.
                  </td>
                </tr>
              ) : (
                visibleCategories.map((category) => (
                  <tr
                    key={category.id}
                    className="transition hover:bg-gray-50/60 dark:hover:bg-gray-800/40"
                  >
                    <td className="px-5 py-4">
                      <span
                        className={`text-sm ${category.isSystem ? "font-semibold text-gray-900 dark:text-white" : "font-medium text-gray-800 dark:text-gray-100"}`}
                      >
                        {category.name}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {category.description?.trim() || "—"}
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        variant="light"
                        size="sm"
                        color={category.status === "ACTIVE" ? "success" : "light"}
                      >
                        {category.status === "ACTIVE" ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      {category.isSystem ? (
                        <Badge variant="light" size="sm" color="info">
                          System
                        </Badge>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">Custom</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {!category.isSystem && (
                          <>
                            <ActionButton
                              icon={<HiOutlinePencilSquare size={14} />}
                              label="Edit"
                              onClick={() => {
                                setEditTarget(category);
                                setModalOpen(true);
                              }}
                            />
                            {category.status === "ACTIVE" && (
                              <ActionButton
                                icon={<HiOutlineArrowsUpDown size={14} />}
                                label="Deactivate"
                                onClick={() => setStatusTarget(category)}
                              />
                            )}
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
      </div>

      <ExpenseCategoryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={(message) => void handleSaved(message)}
        initial={editTarget}
      />

      <DeactivateCategoryModal
        category={statusTarget}
        onClose={() => setStatusTarget(null)}
        onSaved={(message) => void handleSaved(message)}
      />
    </div>
  );
}
