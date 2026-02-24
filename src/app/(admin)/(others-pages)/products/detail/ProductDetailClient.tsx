"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  HiOutlineArchiveBox,
  HiOutlineArrowLeft,
  HiOutlinePencilSquare,
  HiOutlineArrowsUpDown,
  HiOutlinePlus,
  HiOutlineXMark,
  HiOutlineExclamationTriangle,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
} from "react-icons/hi2";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import {
  ApiProduct,
  ApiProductVariant,
  ProductStock,
  ProductMovement,
  ProductStatus,
  formatPKR,
  getProduct,
  getProductStock,
  getProductMovements,
  updateProduct,
  changeProductStatus,
  addVariant,
  updateVariant,
  changeVariantStatus,
} from "@/lib/products";
import { ApiError } from "@/lib/api";
import {
  ApiTransaction,
  ApiTransactionLine,
  TransactionStatus,
  listTransactions,
} from "@/lib/suppliers";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

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

// ─── Page Skeleton ────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-full animate-pulse space-y-6">
      <div className="h-5 w-44 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-4 flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-7 w-48 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="flex gap-2">
              <div className="h-5 w-20 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-28 rounded-lg bg-gray-200 dark:bg-gray-700" />
            <div className="h-8 w-20 rounded-lg bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
            <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="mt-2 h-8 w-20 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="h-40 w-full rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}

// ─── Edit Product Drawer ──────────────────────────────────────────────────────

function EditProductDrawer({
  isOpen,
  onClose,
  product,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  product: ApiProduct;
  onSaved: (updated: ApiProduct) => void;
}) {
  const [form, setForm] = useState({
    name: product.name,
    sku: product.sku ?? "",
    category: product.category ?? "",
    unit: product.unit ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      name: product.name,
      sku: product.sku ?? "",
      category: product.category ?? "",
      unit: product.unit ?? "",
    });
    setError(null);
  }, [product, isOpen]);

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
      const updated = await updateProduct(product.id, {
        name: form.name,
        sku: form.sku.trim() || null,
        category: form.category.trim() || undefined,
        unit: form.unit.trim() || undefined,
      });
      onSaved(updated);
      onClose();
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.statusCode === 409) {
        setError("A product with this name already exists.");
      } else if (apiErr.errors?.length) {
        setError(apiErr.errors.map((e) => e.message).join(", "));
      } else {
        setError(apiErr.message ?? "Failed to save product.");
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
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Edit Product</h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Update product details.</p>
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
                placeholder="Product name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <FieldLabel>SKU</FieldLabel>
              <input
                className={inputClass}
                placeholder="PRODUCT-001"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
              />
            </div>
            <div>
              <FieldLabel>Category</FieldLabel>
              <input
                className={inputClass}
                placeholder="Enter category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
            <div>
              <FieldLabel>Unit</FieldLabel>
              <input
                className={inputClass}
                placeholder="piece"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
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

// ─── Change Status Modal (product) ───────────────────────────────────────────

function ChangeStatusModal({
  product,
  onClose,
  onSaved,
}: {
  product: ApiProduct;
  onClose: () => void;
  onSaved: (updated: ApiProduct) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [product.id]);

  const newStatus: ProductStatus = product.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

  const handleConfirm = async () => {
    setError(null);
    setSaving(true);
    try {
      const updated = await changeProductStatus(product.id, newStatus);
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
            <span className="font-medium text-gray-700 dark:text-gray-200">{product.name}</span>{" "}
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

// ─── Add Variant Modal ────────────────────────────────────────────────────────

function AddVariantModal({
  productId,
  onClose,
  onSaved,
}: {
  productId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [size, setSize] = useState("");
  const [sku, setSku] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await addVariant(productId, {
        size: size.trim(),
        ...(sku.trim() ? { sku: sku.trim() } : {}),
      });
      onSaved();
      onClose();
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.errors?.length) {
        setError(apiErr.errors.map((e) => e.message).join(", "));
      } else {
        setError(apiErr.message ?? "Failed to add size.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} className="max-w-sm mx-4" showCloseButton={false}>
      <form onSubmit={handleSubmit}>
        <div className="p-6">
          <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Add Size</h3>
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
              <HiOutlineExclamationTriangle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}
          <div className="mb-4">
            <FieldLabel required>Size</FieldLabel>
            <input
              required
              autoFocus
              className={inputClass}
              placeholder="e.g. S, M, L, XL, one-size"
              value={size}
              onChange={(e) => setSize(e.target.value)}
            />
          </div>
          <div className="mb-5">
            <FieldLabel>Variant SKU</FieldLabel>
            <input
              className={inputClass}
              placeholder="VARIANT-001"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" size="sm" onClick={onClose} type="button" disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Add Size"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ─── Variant Edit Modal ───────────────────────────────────────────────────────

function VariantEditModal({
  productId,
  variant,
  onClose,
  onSaved,
}: {
  productId: string;
  variant: ApiProductVariant;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [size, setSize] = useState(variant.size);
  const [sku, setSku] = useState(variant.sku ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSize(variant.size);
    setSku(variant.sku ?? "");
    setError(null);
  }, [variant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await updateVariant(productId, variant.id, {
        size: size.trim(),
        sku: sku.trim() || null,
      });
      onSaved();
      onClose();
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.errors?.length) {
        setError(apiErr.errors.map((e) => e.message).join(", "));
      } else {
        setError(apiErr.message ?? "Failed to update size.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} className="max-w-sm mx-4" showCloseButton={false}>
      <form onSubmit={handleSubmit}>
        <div className="p-6">
          <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Edit Size</h3>
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
              <HiOutlineExclamationTriangle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}
          <div className="mb-4">
            <FieldLabel required>Size</FieldLabel>
            <input
              required
              className={inputClass}
              placeholder="e.g. S, M, L, XL"
              value={size}
              onChange={(e) => setSize(e.target.value)}
            />
          </div>
          <div className="mb-5">
            <FieldLabel>Variant SKU</FieldLabel>
            <input
              className={inputClass}
              placeholder="VARIANT-001"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" size="sm" onClick={onClose} type="button" disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ─── Variant Status Modal ─────────────────────────────────────────────────────

function VariantStatusModal({
  productId,
  variant,
  onClose,
  onSaved,
}: {
  productId: string;
  variant: ApiProductVariant;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const newStatus: ProductStatus = variant.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

  const handleConfirm = async () => {
    setError(null);
    setSaving(true);
    try {
      await changeVariantStatus(productId, variant.id, newStatus);
      onSaved();
      onClose();
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? "Failed to change variant status.");
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
            Change Size Status
          </h3>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Set size{" "}
            <span className="font-medium text-gray-700 dark:text-gray-200">
              &quot;{variant.size}&quot;
            </span>{" "}
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

// ─── Transaction Display Helpers ─────────────────────────────────────────────

const TX_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  POSTED: "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400",
  VOIDED: "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400",
};

// ─── Purchase History Tab ─────────────────────────────────────────────────────

function PurchaseHistoryTab({ productId }: { productId: string }) {
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | "">("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    listTransactions({
      productId,
      type: "PURCHASE",
      page,
      limit: 10,
      sortBy: "transactionDate",
      sortOrder: "desc",
      status: statusFilter || undefined,
    })
      .then((res) => {
        if (cancelled) return;
        setTransactions(res.data);
        setMeta({ total: res.meta.total, totalPages: res.meta.totalPages });
      })
      .catch((err) => {
        if (cancelled) return;
        const apiErr = err as ApiError;
        setError(apiErr.message ?? "Failed to load purchase history.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, page, statusFilter]);

  return (
    <div>
      {/* Filter row */}
      <div className="mb-4 flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setPage(1); setStatusFilter(e.target.value as TransactionStatus | ""); }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="POSTED">Posted</option>
          <option value="VOIDED">Voided</option>
        </select>
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
      ) : transactions.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">
          No purchase history found.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  {["Date", "Document #", "Supplier", "Sizes", "Total Qty", "Amount", "Status"].map((col) => (
                    <th
                      key={col}
                      className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 last:pr-0"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {transactions.map((tx) => {
                  const sizes =
                    tx.transactionLines
                      ?.map((l: ApiTransactionLine) => l.variant?.size)
                      .filter(Boolean)
                      .join(", ") ?? "—";
                  const totalQty =
                    tx.transactionLines?.reduce((s: number, l: ApiTransactionLine) => s + l.quantity, 0) ?? "—";
                  return (
                    <tr key={tx.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                      <td className="py-3.5 pr-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {fmtDate(tx.transactionDate)}
                      </td>
                      <td className="py-3.5 pr-4 text-sm font-medium text-brand-500 whitespace-nowrap">
                        {tx.documentNumber ?? "—"}
                      </td>
                      <td className="py-3.5 pr-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {tx.supplier?.name ?? "—"}
                      </td>
                      <td className="py-3.5 pr-4 text-sm text-gray-600 dark:text-gray-300">
                        {sizes}
                      </td>
                      <td className="py-3.5 pr-4 text-sm text-gray-700 dark:text-gray-200 whitespace-nowrap">
                        {totalQty}
                      </td>
                      <td className="py-3.5 pr-4 text-sm font-medium text-gray-800 dark:text-gray-100 whitespace-nowrap">
                        {formatPKR(tx.totalAmount)}
                      </td>
                      <td className="py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            TX_STATUS_COLORS[tx.status] ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {tx.status.charAt(0) + tx.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {meta.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-700">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Showing{" "}
                <span className="font-medium text-gray-600 dark:text-gray-300">{transactions.length}</span>{" "}
                of{" "}
                <span className="font-medium text-gray-600 dark:text-gray-300">{meta.total}</span>{" "}
                records
              </p>
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
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Sales History Tab ────────────────────────────────────────────────────────

function SalesHistoryTab({ productId }: { productId: string }) {
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | "">("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    listTransactions({
      productId,
      type: "SALE",
      page,
      limit: 10,
      sortBy: "transactionDate",
      sortOrder: "desc",
      status: statusFilter || undefined,
    })
      .then((res) => {
        if (cancelled) return;
        setTransactions(res.data);
        setMeta({ total: res.meta.total, totalPages: res.meta.totalPages });
      })
      .catch((err) => {
        if (cancelled) return;
        const apiErr = err as ApiError;
        setError(apiErr.message ?? "Failed to load sales history.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, page, statusFilter]);

  return (
    <div>
      {/* Filter row */}
      <div className="mb-4 flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setPage(1); setStatusFilter(e.target.value as TransactionStatus | ""); }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="POSTED">Posted</option>
          <option value="VOIDED">Voided</option>
        </select>
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
      ) : transactions.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">
          No sales history found.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  {["Date", "Document #", "Customer", "Sizes", "Total Qty", "Amount", "Status"].map((col) => (
                    <th
                      key={col}
                      className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 last:pr-0"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {transactions.map((tx) => {
                  const sizes =
                    tx.transactionLines
                      ?.map((l: ApiTransactionLine) => l.variant?.size)
                      .filter(Boolean)
                      .join(", ") ?? "—";
                  const totalQty =
                    tx.transactionLines?.reduce((s: number, l: ApiTransactionLine) => s + l.quantity, 0) ?? "—";
                  return (
                    <tr key={tx.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                      <td className="py-3.5 pr-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {fmtDate(tx.transactionDate)}
                      </td>
                      <td className="py-3.5 pr-4 text-sm font-medium text-brand-500 whitespace-nowrap">
                        {tx.documentNumber ?? "—"}
                      </td>
                      <td className="py-3.5 pr-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {tx.customer?.name ?? "—"}
                      </td>
                      <td className="py-3.5 pr-4 text-sm text-gray-600 dark:text-gray-300">
                        {sizes}
                      </td>
                      <td className="py-3.5 pr-4 text-sm text-gray-700 dark:text-gray-200 whitespace-nowrap">
                        {totalQty}
                      </td>
                      <td className="py-3.5 pr-4 text-sm font-medium text-gray-800 dark:text-gray-100 whitespace-nowrap">
                        {formatPKR(tx.totalAmount)}
                      </td>
                      <td className="py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            TX_STATUS_COLORS[tx.status] ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {tx.status.charAt(0) + tx.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {meta.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-700">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Showing{" "}
                <span className="font-medium text-gray-600 dark:text-gray-300">{transactions.length}</span>{" "}
                of{" "}
                <span className="font-medium text-gray-600 dark:text-gray-300">{meta.total}</span>{" "}
                records
              </p>
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
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Stock Movements Section ──────────────────────────────────────────────────

function MovementsSection({ productId }: { productId: string }) {
  const [movements, setMovements] = useState<ProductMovement[]>([]);
  const [movPage, setMovPage] = useState(1);
  const [movMeta, setMovMeta] = useState({ total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMovements = async (p: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getProductMovements(productId, p, 20);
      setMovements(result.data);
      setMovMeta({ total: result.meta.total, totalPages: result.meta.totalPages });
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? "Failed to load movements.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements(movPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movPage]);

  return (
    <div>
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
      ) : movements.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">
          No stock movements recorded yet.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  {["Date", "Document #", "Type", "Size", "Qty In", "Qty Out", "Running Stock"].map(
                    (col) => (
                      <th
                        key={col}
                        className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 last:text-right last:pr-0"
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {movements.map((mov, i) => (
                  <tr key={i} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                    <td className="py-3.5 pr-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {fmtDate(mov.date)}
                    </td>
                    <td className="py-3.5 pr-4 text-sm font-medium text-brand-500 whitespace-nowrap">
                      {mov.documentNumber ?? "—"}
                    </td>
                    <td className="py-3.5 pr-4 text-sm font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">
                      {mov.type}
                    </td>
                    <td className="py-3.5 pr-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {mov.variantSize}
                    </td>
                    <td
                      className={`py-3.5 pr-4 text-sm font-medium whitespace-nowrap ${
                        mov.quantityIn > 0
                          ? "text-success-600 dark:text-success-400"
                          : "text-gray-400 dark:text-gray-600"
                      }`}
                    >
                      {mov.quantityIn > 0 ? mov.quantityIn : "—"}
                    </td>
                    <td
                      className={`py-3.5 pr-4 text-sm font-medium whitespace-nowrap ${
                        mov.quantityOut > 0
                          ? "text-error-600 dark:text-error-400"
                          : "text-gray-400 dark:text-gray-600"
                      }`}
                    >
                      {mov.quantityOut > 0 ? mov.quantityOut : "—"}
                    </td>
                    <td className="py-3.5 text-sm font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap text-right">
                      {mov.runningStock}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {movMeta.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-700">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Showing{" "}
                <span className="font-medium text-gray-600 dark:text-gray-300">
                  {movements.length}
                </span>{" "}
                of{" "}
                <span className="font-medium text-gray-600 dark:text-gray-300">
                  {movMeta.total}
                </span>{" "}
                movements
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMovPage((p) => Math.max(1, p - 1))}
                  disabled={movPage === 1 || isLoading}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  <HiOutlineChevronLeft size={15} />
                </button>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Page {movPage} of {movMeta.totalPages}
                </span>
                <button
                  onClick={() => setMovPage((p) => Math.min(movMeta.totalPages, p + 1))}
                  disabled={movPage === movMeta.totalPages || isLoading}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  <HiOutlineChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProductDetailClient({ id }: { id: string }) {
  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [productStock, setProductStock] = useState<ProductStock | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [activeTab, setActiveTab] = useState<"movements" | "purchases" | "sales">("movements");

  const [editOpen, setEditOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [addVariantOpen, setAddVariantOpen] = useState(false);
  const [editVariant, setEditVariant] = useState<ApiProductVariant | null>(null);
  const [statusVariant, setStatusVariant] = useState<ApiProductVariant | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [prod, stock] = await Promise.all([
        getProduct(id),
        getProductStock(id),
      ]);
      setProduct(prod);
      setProductStock(stock);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.statusCode === 404) {
        setNotFound(true);
      } else {
        setError(apiErr.message ?? "Failed to load product.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (isLoading) return <PageSkeleton />;

  if (notFound || !product) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <HiOutlineArchiveBox size={48} className="text-gray-300" />
        <p className="text-lg font-medium text-gray-500">Product not found.</p>
        <Link href="/products">
          <Button variant="outline" size="sm" startIcon={<HiOutlineArrowLeft size={15} />}>
            Back to Products
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
        <Link href="/products">
          <Button variant="outline" size="sm" startIcon={<HiOutlineArrowLeft size={15} />}>
            Back to Products
          </Button>
        </Link>
      </div>
    );
  }

  const totalInventoryValue = productStock
    ? productStock.variants.reduce((sum, v) => sum + v.currentStock * v.avgCost, 0)
    : 0;
  const activeSizes = product.variants.filter((v) => v.status === "ACTIVE").length;

  const HISTORY_TABS: { key: "movements" | "purchases" | "sales"; label: string }[] = [
    { key: "movements", label: "Stock Movements" },
    { key: "purchases", label: "Purchase History" },
    { key: "sales", label: "Sales History" },
  ];

  return (
    <div className="mx-auto w-full max-w-full space-y-6">
      {/* Back nav */}
      <div>
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-brand-500 dark:text-gray-400"
        >
          <HiOutlineArrowLeft size={15} />
          Back to Products
        </Link>
      </div>

      {/* ── Header card ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
              <HiOutlineArchiveBox size={22} className="text-brand-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{product.name}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {product.sku && (
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    SKU: {product.sku}
                  </span>
                )}
                {product.category && (
                  <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                    {product.category}
                  </span>
                )}
                {product.unit && (
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    Unit: {product.unit}
                  </span>
                )}
                <Badge
                  variant="solid"
                  color={product.status === "ACTIVE" ? "success" : "warning"}
                  size="sm"
                >
                  {product.status}
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
      </div>

      {/* ── Summary stat cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Stock</p>
          <p className="mt-1.5 text-2xl font-bold text-gray-900 dark:text-white">
            {productStock?.totalStock ?? product.totalStock}
          </p>
        </div>
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-500/30 dark:bg-brand-500/10">
          <p className="text-xs font-medium text-brand-600 dark:text-brand-400">
            Total Inventory Value
          </p>
          <p className="mt-1.5 text-2xl font-bold text-brand-600 dark:text-brand-400">
            {formatPKR(totalInventoryValue)}
          </p>
        </div>
        <div className="rounded-2xl border border-success-200 bg-success-50 p-5 dark:border-success-500/30 dark:bg-success-500/10">
          <p className="text-xs font-medium text-success-700 dark:text-success-400">Active Sizes</p>
          <p className="mt-1.5 text-2xl font-bold text-success-700 dark:text-success-400">
            {activeSizes}
          </p>
        </div>
      </div>

      {/* ── Variants table ── */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Sizes &amp; Stock</h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Per-size stock and cost information.
            </p>
          </div>
          <Button
            size="sm"
            startIcon={<HiOutlinePlus size={14} />}
            onClick={() => setAddVariantOpen(true)}
          >
            Add Size
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                {["Size", "Variant SKU", "Current Stock", "Avg Cost", "Value", "Status", "Actions"].map(
                  (col) => (
                    <th
                      key={col}
                      className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500"
                    >
                      {col}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {product.variants.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-10 text-center text-sm text-gray-400 dark:text-gray-500"
                  >
                    No sizes yet.
                  </td>
                </tr>
              ) : (
                product.variants.map((variant) => {
                  const stockInfo = productStock?.variants.find(
                    (v) => v.variantId === variant.id
                  );
                  const currentStock = stockInfo?.currentStock ?? variant.currentStock ?? 0;
                  const avgCost = stockInfo?.avgCost ?? variant.avgCost ?? 0;
                  const value = (isNaN(currentStock) ? 0 : currentStock) * (isNaN(avgCost) ? 0 : avgCost);
                  return (
                    <tr
                      key={variant.id}
                      className="transition hover:bg-gray-50/60 dark:hover:bg-gray-800/40"
                    >
                      <td className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-gray-100">
                        {variant.size}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {variant.sku || "—"}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">
                        {currentStock}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {formatPKR(avgCost)}
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-gray-100">
                        {formatPKR(value)}
                      </td>
                      <td className="px-5 py-4">
                        <Badge
                          variant="light"
                          size="sm"
                          color={variant.status === "ACTIVE" ? "success" : "warning"}
                        >
                          {variant.status === "ACTIVE" ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditVariant(variant)}
                            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-theme-xs transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                          >
                            <HiOutlinePencilSquare size={14} />
                            Edit
                          </button>
                          <button
                            onClick={() => setStatusVariant(variant)}
                            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-theme-xs transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                          >
                            <HiOutlineArrowsUpDown size={14} />
                            Status
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── History Tabs ── */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center gap-1 border-b border-gray-100 p-4 dark:border-gray-800">
          {HISTORY_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.key
                  ? "bg-brand-500 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="p-5">
          {activeTab === "movements" && <MovementsSection productId={id} />}
          {activeTab === "purchases" && <PurchaseHistoryTab productId={id} />}
          {activeTab === "sales" && <SalesHistoryTab productId={id} />}
        </div>
      </div>

      {/* ── Modals / Drawers ── */}
      <EditProductDrawer
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        product={product}
        onSaved={(updated) => setProduct(updated)}
      />
      {statusModalOpen && (
        <ChangeStatusModal
          product={product}
          onClose={() => setStatusModalOpen(false)}
          onSaved={(updated) => setProduct(updated)}
        />
      )}
      {addVariantOpen && (
        <AddVariantModal
          productId={id}
          onClose={() => setAddVariantOpen(false)}
          onSaved={loadData}
        />
      )}
      {editVariant && (
        <VariantEditModal
          productId={id}
          variant={editVariant}
          onClose={() => setEditVariant(null)}
          onSaved={loadData}
        />
      )}
      {statusVariant && (
        <VariantStatusModal
          productId={id}
          variant={statusVariant}
          onClose={() => setStatusVariant(null)}
          onSaved={loadData}
        />
      )}
    </div>
  );
}
