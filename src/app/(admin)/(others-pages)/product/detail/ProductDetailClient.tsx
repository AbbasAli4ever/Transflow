"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  HiOutlineCube,
  HiOutlineArrowLeft,
  HiOutlinePencilSquare,
  HiOutlineArrowsUpDown,
  HiOutlineXMark,
  HiOutlineExclamationTriangle,
  HiOutlineArrowTrendingUp,
  HiOutlineArrowTrendingDown,
  HiOutlineChevronRight,
} from "react-icons/hi2";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import {
  ApiProduct,
  ProductStatus,
  ProductStock,
  StockMovement,
  UpdateProductBody,
  formatPKR,
  getProduct,
  getProductStock,
  updateProduct,
  changeProductStatus,
} from "@/lib/products";
import { ApiError } from "@/lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fmtDateTime(d: string): string {
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500";

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

// Movement type display helpers
const movementMeta: Record<
  StockMovement["type"],
  { label: string; dir: "IN" | "OUT"; color: string }
> = {
  PURCHASE_IN: { label: "Purchase In", dir: "IN", color: "text-success-600 dark:text-success-400" },
  SALE_OUT: { label: "Sale Out", dir: "OUT", color: "text-error-500 dark:text-error-400" },
  SUPPLIER_RETURN_OUT: { label: "Supplier Return", dir: "OUT", color: "text-warning-600 dark:text-warning-400" },
  CUSTOMER_RETURN_IN: { label: "Customer Return", dir: "IN", color: "text-brand-500 dark:text-brand-400" },
  ADJUSTMENT_IN: { label: "Adjustment In", dir: "IN", color: "text-success-600 dark:text-success-400" },
  ADJUSTMENT_OUT: { label: "Adjustment Out", dir: "OUT", color: "text-error-500 dark:text-error-400" },
};

// ─── Page Skeleton ────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-full animate-pulse space-y-4">
      <div className="h-5 w-36 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-8 w-64 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-28 rounded-lg bg-gray-200 dark:bg-gray-700" />
            <div className="h-9 w-16 rounded-lg bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="mt-3 h-8 w-32 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: "success" | "warning" | "error";
}) {
  const valueClass =
    highlight === "success"
      ? "text-success-600 dark:text-success-400"
      : highlight === "warning"
      ? "text-warning-600 dark:text-warning-400"
      : highlight === "error"
      ? "text-error-600 dark:text-error-400"
      : "text-gray-900 dark:text-white";

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {label}
      </p>
      <div className="mt-3">
        <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
        {sub && <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Info Row ────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium text-gray-800 dark:text-gray-100">{value}</p>
    </div>
  );
}

// ─── Edit Product Drawer ──────────────────────────────────────────────────────

function EditDrawer({
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
    unit: product.unit,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setForm({
      name: product.name,
      sku: product.sku ?? "",
      category: product.category ?? "",
      unit: product.unit,
    });
    setError(null);
    setFieldErrors({});
  }, [product, isOpen]);

  useEffect(() => {
    if (isOpen) {
      const w = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.paddingRight = `${w}px`;
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
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    setError(null);
    setFieldErrors({});
    setSaving(true);
    try {
      const body: UpdateProductBody = {
        name: form.name.trim(),
        sku: form.sku.trim() || undefined,
        category: form.category.trim() || undefined,
        unit: form.unit.trim() || undefined,
      };
      const updated = await updateProduct(product.id, body);
      onSaved(updated);
      onClose();
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.statusCode === 409) {
        setFieldErrors({ sku: "A product with this SKU already exists." });
      } else if (apiErr.statusCode === 400 && apiErr.errors?.length) {
        const fe: Record<string, string> = {};
        apiErr.errors.forEach((e) => {
          fe[e.field] = e.message;
        });
        setFieldErrors(fe);
      } else {
        setError(apiErr.message ?? "Failed to update product.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-9998 bg-gray-900/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed right-0 top-0 z-9999 flex h-full w-full max-w-[420px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out dark:bg-gray-900 ${
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
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
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
                className={`${inputClass} ${fieldErrors.name ? "border-error-400" : ""}`}
                placeholder="Product name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              {fieldErrors.name && (
                <p className="mt-1 text-xs text-error-500">{fieldErrors.name}</p>
              )}
            </div>
            <div>
              <FieldLabel>SKU</FieldLabel>
              <input
                className={`${inputClass} ${fieldErrors.sku ? "border-error-400" : ""}`}
                placeholder="SKU (auto-uppercase)"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
              />
              {fieldErrors.sku && (
                <p className="mt-1 text-xs text-error-500">{fieldErrors.sku}</p>
              )}
            </div>
            <div>
              <FieldLabel>Category</FieldLabel>
              <input
                className={inputClass}
                placeholder="e.g. Fabrics, Raw Material"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
            <div>
              <FieldLabel>Unit</FieldLabel>
              <input
                className={inputClass}
                placeholder="e.g., kg, bag, pcs"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              />
            </div>
          </div>
          <div className="border-t border-gray-100 px-6 py-4 dark:border-gray-800">
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={onClose}
                type="button"
              >
                Cancel
              </Button>
              <Button size="sm" className="flex-1" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}

// ─── Change Status Modal ──────────────────────────────────────────────────────

function ChangeStatusModal({
  product,
  onClose,
  onSaved,
}: {
  product: ApiProduct | null;
  onClose: () => void;
  onSaved: (updated: ApiProduct) => void;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSaving(false);
    setReason("");
    setError(null);
  }, [product]);

  if (!product) return null;
  const newStatus: ProductStatus = product.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

  const handleConfirm = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await changeProductStatus(
        product.id,
        newStatus,
        reason.trim() || undefined
      );
      onSaved(updated);
      onClose();
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? "Failed to change status.");
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={!!product}
      onClose={onClose}
      className="max-w-sm mx-4"
      showCloseButton={false}
    >
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

          {newStatus === "INACTIVE" && (
            <div className="mb-4 text-left">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Reason (optional)
              </label>
              <input
                className={inputClass}
                placeholder="e.g. Discontinued, Out of season"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          )}

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
              <HiOutlineExclamationTriangle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}
        </div>
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

// ─── Stock Movements Table ────────────────────────────────────────────────────

function MovementsTable({ movements }: { movements: StockMovement[] }) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? movements : movements.slice(0, 10);

  if (movements.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
        No stock movements recorded yet.
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px] whitespace-nowrap text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
              {["Date", "Type", "Direction", "Quantity"].map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
            {shown.map((mv, idx) => {
              const meta = movementMeta[mv.type];
              return (
                <tr
                  key={idx}
                  className="transition hover:bg-gray-50/60 dark:hover:bg-gray-800/40"
                >
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {fmtDate(mv.date)}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">
                    {meta.label}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 font-medium ${meta.color}`}
                    >
                      {meta.dir === "IN" ? (
                        <HiOutlineArrowTrendingUp size={14} />
                      ) : (
                        <HiOutlineArrowTrendingDown size={14} />
                      )}
                      {meta.dir}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">
                    {mv.quantity.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {movements.length > 10 && (
        <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-700">
          <button
            onClick={() => setShowAll((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-brand-500 hover:text-brand-600"
          >
            {showAll ? "Show fewer" : `Show all ${movements.length} movements`}
            <HiOutlineChevronRight
              size={12}
              className={`transition-transform ${showAll ? "rotate-90" : ""}`}
            />
          </button>
        </div>
      )}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProductDetailClient({ id }: { id: string }) {
  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [stock, setStock] = useState<ProductStock | null>(null);
  const [loading, setLoading] = useState(true);
  const [stockLoading, setStockLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<ApiProduct | null>(null);

  const [activeTab, setActiveTab] = useState<"overview" | "movements" | "purchases" | "sales">("overview");

  // Load product info
  const loadProduct = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await getProduct(id);
      setProduct(p);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? "Failed to load product.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Load stock separately (may take longer)
  const loadStock = useCallback(async () => {
    setStockLoading(true);
    try {
      const s = await getProductStock(id);
      setStock(s);
    } catch {
      // Stock loading failure is non-fatal — show graceful fallback
      setStock(null);
    } finally {
      setStockLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProduct();
    loadStock();
  }, [loadProduct, loadStock]);

  if (loading) return <PageSkeleton />;

  if (error || !product) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-error-50 dark:bg-error-500/10">
          <HiOutlineExclamationTriangle size={28} className="text-error-500" />
        </div>
        <p className="text-base font-semibold text-gray-700 dark:text-gray-200">
          {error ?? "Product not found"}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setError(null);
            loadProduct();
            loadStock();
          }}
        >
          Retry
        </Button>
        <Link
          href="/product"
          className="text-sm text-brand-500 hover:underline"
        >
          Back to Products
        </Link>
      </div>
    );
  }

  // Derived stock values
  const totalQty = stock?.totalQuantity ?? 0;
  const totalValue = stock?.totalValue ?? 0;
  const avgCost = stock?.avgCost ?? product.avgCost;
  const movementCount = stock?.movements?.length ?? 0;

  return (
    <div className="mx-auto w-full max-w-full space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
        <Link
          href="/product"
          className="flex items-center gap-1 hover:text-brand-500 transition"
        >
          <HiOutlineArrowLeft size={14} />
          Products
        </Link>
        <span>/</span>
        <span className="text-gray-700 dark:text-gray-200 font-medium">{product.name}</span>
      </div>

      {/* Product Header Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: Identity */}
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
              <HiOutlineCube size={24} className="text-brand-500" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {product.name}
                </h1>
                <Badge
                  variant="light"
                  size="sm"
                  color={product.status === "ACTIVE" ? "success" : "warning"}
                >
                  {product.status === "ACTIVE" ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {product.sku ? (
                  <span className="mr-3 font-mono font-medium text-gray-600 dark:text-gray-300">
                    SKU: {product.sku}
                  </span>
                ) : null}
                {product.category && (
                  <span className="text-gray-400 dark:text-gray-500">{product.category}</span>
                )}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              startIcon={<HiOutlinePencilSquare size={15} />}
              onClick={() => setEditOpen(true)}
            >
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              startIcon={<HiOutlineArrowsUpDown size={15} />}
              onClick={() => setStatusTarget(product)}
            >
              {product.status === "ACTIVE" ? "Deactivate" : "Activate"}
            </Button>
          </div>
        </div>

        {/* Info grid */}
        <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-4 border-t border-gray-100 pt-5 sm:grid-cols-4 dark:border-gray-700">
          <InfoRow label="Unit" value={product.unit} />
          <InfoRow
            label="Category"
            value={
              product.category ?? (
                <span className="text-gray-300 dark:text-gray-600">Not set</span>
              )
            }
          />
          <InfoRow
            label="Avg Cost"
            value={
              avgCost > 0 ? (
                formatPKR(avgCost)
              ) : (
                <span className="text-gray-300 dark:text-gray-600">—</span>
              )
            }
          />
          <InfoRow label="Created" value={fmtDateTime(product.createdAt)} />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Stock"
          value={stockLoading ? "…" : totalQty.toLocaleString()}
          sub={`${product.unit} in inventory`}
          highlight={totalQty === 0 ? "error" : totalQty < 10 ? "warning" : undefined}
        />
        <StatCard
          label="Inventory Value"
          value={stockLoading ? "…" : formatPKR(totalValue)}
          sub={`at avg cost ${formatPKR(avgCost)}`}
        />
        <StatCard
          label="Stock Movements"
          value={stockLoading ? "…" : movementCount.toLocaleString()}
          sub="total recorded movements"
        />
      </div>

      {/* Low stock / inactive warning */}
      {product.status === "ACTIVE" && !stockLoading && totalQty === 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-300">
          <HiOutlineExclamationTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            <strong>Out of stock.</strong> This product has zero inventory. Add stock via a
            Purchase transaction.
          </span>
        </div>
      )}
      {product.status === "ACTIVE" && !stockLoading && totalQty > 0 && totalQty < 10 && (
        <div className="flex items-start gap-3 rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-300">
          <HiOutlineExclamationTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            <strong>Low stock.</strong> Only {totalQty} {product.unit} remaining.
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 overflow-hidden">
        {/* Tab bar */}
        <div className="flex overflow-x-auto border-b border-gray-100 dark:border-gray-700">
          {(["overview", "movements", "purchases", "sales"] as const).map((tab) => {
            const labels: Record<typeof tab, string> = {
              overview: "Product Info",
              movements: `Stock Movements${movementCount > 0 ? ` (${movementCount})` : ""}`,
              purchases: "Purchase History",
              sales: "Sale History",
            };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`shrink-0 px-6 py-3.5 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "border-b-2 border-brand-500 text-brand-500"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="p-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Full product details */}
              <div>
                <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Product Details
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                    <p className="text-xs text-gray-400 dark:text-gray-500">Product Name</p>
                    <p className="mt-1 font-medium text-gray-800 dark:text-gray-100">
                      {product.name}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                    <p className="text-xs text-gray-400 dark:text-gray-500">SKU</p>
                    <p className="mt-1 font-medium text-gray-800 dark:text-gray-100">
                      {product.sku ?? (
                        <span className="text-gray-400 dark:text-gray-600">Not set</span>
                      )}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                    <p className="text-xs text-gray-400 dark:text-gray-500">Category</p>
                    <p className="mt-1 font-medium text-gray-800 dark:text-gray-100">
                      {product.category ?? (
                        <span className="text-gray-400 dark:text-gray-600">Not set</span>
                      )}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                    <p className="text-xs text-gray-400 dark:text-gray-500">Unit of Measure</p>
                    <p className="mt-1 font-medium text-gray-800 dark:text-gray-100">
                      {product.unit}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                    <p className="text-xs text-gray-400 dark:text-gray-500">Status</p>
                    <div className="mt-1">
                      <Badge
                        variant="light"
                        size="sm"
                        color={product.status === "ACTIVE" ? "success" : "warning"}
                      >
                        {product.status === "ACTIVE" ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                    <p className="text-xs text-gray-400 dark:text-gray-500">Weighted Avg Cost</p>
                    <p className="mt-1 font-medium text-gray-800 dark:text-gray-100">
                      {avgCost > 0 ? formatPKR(avgCost) : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Stock summary */}
              <div>
                <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Stock Summary
                </h3>
                {stockLoading ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 w-64 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                ) : stock ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                      <p className="text-xs text-gray-400 dark:text-gray-500">Current Quantity</p>
                      <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                        {stock.totalQuantity.toLocaleString()}{" "}
                        <span className="text-sm font-normal text-gray-400">{product.unit}</span>
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                      <p className="text-xs text-gray-400 dark:text-gray-500">Total Value</p>
                      <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                        {formatPKR(stock.totalValue)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                      <p className="text-xs text-gray-400 dark:text-gray-500">Average Cost</p>
                      <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                        {stock.avgCost > 0 ? formatPKR(stock.avgCost) : "—"}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                        weighted average
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    Stock data unavailable.
                  </p>
                )}
              </div>

              {/* System info */}
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  System Info
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-sm">
                  <div>
                    <span className="text-gray-400 dark:text-gray-500">Product ID: </span>
                    <span className="font-mono text-xs text-gray-600 dark:text-gray-300">
                      {product.id}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 dark:text-gray-500">Created: </span>
                    <span className="text-gray-700 dark:text-gray-200">
                      {fmtDateTime(product.createdAt)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 dark:text-gray-500">Last Updated: </span>
                    <span className="text-gray-700 dark:text-gray-200">
                      {fmtDateTime(product.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Inventory note */}
              <div className="rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm dark:border-brand-500/20 dark:bg-brand-500/5">
                <p className="font-semibold text-brand-700 dark:text-brand-300 mb-1">
                  Stock is managed via Transactions
                </p>
                <p className="text-brand-600 dark:text-brand-400">
                  Inventory quantities are automatically updated when Purchase, Sale, Return, and
                  Adjustment transactions are posted. Average cost is recalculated on every
                  purchase using the weighted average method.
                </p>
              </div>
            </div>
          )}

          {activeTab === "movements" && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Stock Movement History
                </h3>
                {!stockLoading && stock && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {stock.movements.length} movement
                    {stock.movements.length !== 1 ? "s" : ""}
                  </p>
                )}
              </div>

              {stockLoading ? (
                <div className="animate-pulse space-y-3 py-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-10 rounded-xl bg-gray-200 dark:bg-gray-700" />
                  ))}
                </div>
              ) : stock ? (
                <MovementsTable movements={stock.movements} />
              ) : (
                <div className="py-12 text-center">
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    Could not load stock movements.
                  </p>
                  <button
                    onClick={loadStock}
                    className="mt-2 text-sm text-brand-500 hover:underline"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          )}

          {(activeTab === "purchases" || activeTab === "sales") && (
            <div className="py-8 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <HiOutlineCube size={22} className="text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {activeTab === "purchases" ? "Purchase History" : "Sale History"} not available here
              </p>
              <p className="mx-auto max-w-sm text-xs text-gray-400 dark:text-gray-500">
                The transactions API does not support filtering by product. To see{" "}
                {activeTab === "purchases" ? "purchases" : "sales"} involving this product, go to
                the Transactions list and filter by{" "}
                {activeTab === "purchases" ? "type PURCHASE" : "type SALE"}.
              </p>
              <a
                href={`/transaction?type=${activeTab === "purchases" ? "PURCHASE" : "SALE"}&status=POSTED`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-xs font-medium text-brand-600 transition hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400"
              >
                View {activeTab === "purchases" ? "Purchases" : "Sales"} in Transactions
                <HiOutlineChevronRight size={12} />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Edit Drawer */}
      <EditDrawer
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        product={product}
        onSaved={(updated) => {
          setProduct(updated);
          setEditOpen(false);
        }}
      />

      {/* Change Status Modal */}
      <ChangeStatusModal
        product={statusTarget}
        onClose={() => setStatusTarget(null)}
        onSaved={(updated) => {
          setProduct(updated);
          setStatusTarget(null);
        }}
      />
    </div>
  );
}
