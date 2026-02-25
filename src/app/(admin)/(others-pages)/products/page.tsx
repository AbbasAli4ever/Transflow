"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  HiOutlineArchiveBox,
  HiOutlinePlus,
  HiOutlineMagnifyingGlass,
  HiOutlineEye,
  HiOutlinePencilSquare,
  HiOutlineArrowsUpDown,
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
  ProductStatus,
  listProducts,
  createProduct,
  updateProduct,
  changeProductStatus,
} from "@/lib/products";
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
        <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
      </td>
      <td className="px-5 py-4">
        <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
      </td>
      <td className="px-5 py-4">
        <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
      </td>
      <td className="px-5 py-4">
        <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700" />
      </td>
      <td className="px-5 py-4">
        <div className="h-4 w-12 rounded bg-gray-200 dark:bg-gray-700" />
      </td>
      <td className="px-5 py-4">
        <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-14 rounded-lg bg-gray-200 dark:bg-gray-700" />
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
  sku: string;
  category: string;
  unit: string;
}

const emptyForm: DrawerForm = { name: "", sku: "", category: "", unit: "" };

function ProductDrawer({
  isOpen,
  onClose,
  onSaved,
  initial,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial?: ApiProduct | null;
}) {
  const fromInitial = (p: ApiProduct): DrawerForm => ({
    name: p.name,
    sku: p.sku ?? "",
    category: p.category ?? "",
    unit: p.unit ?? "",
  });

  const [form, setForm] = useState<DrawerForm>(initial ? fromInitial(initial) : emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(initial ? fromInitial(initial) : emptyForm);
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
      const payload = {
        name: form.name,
        ...(form.sku.trim() ? { sku: form.sku.trim() } : {}),
        ...(form.category.trim() ? { category: form.category.trim() } : {}),
        ...(form.unit.trim() ? { unit: form.unit.trim() } : {}),
      };
      if (initial) {
        await updateProduct(initial.id, payload);
      } else {
        await createProduct(payload);
      }
      onSaved();
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
              {isEdit ? "Edit Product" : "Add Product"}
            </h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {isEdit ? "Update product details." : "Create a new product."}
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
                placeholder="Enter product name"
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
                {saving ? "Saving..." : isEdit ? "Save Changes" : "Save Product"}
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
  product,
  onClose,
  onSaved,
}: {
  product: ApiProduct | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [product]);

  if (!product) return null;

  const newStatus: ProductStatus = product.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

  const handleConfirm = async () => {
    setError(null);
    setSaving(true);
    try {
      await changeProductStatus(product.id, newStatus);
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
    <Modal isOpen={!!product} onClose={onClose} className="max-w-sm mx-4" showCloseButton={false}>
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "INACTIVE" | "ALL">("ACTIVE");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ApiProduct | null>(null);
  const [statusTarget, setStatusTarget] = useState<ApiProduct | null>(null);

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleViewProduct = (id: string) => {
    sessionStorage.setItem("productId", id);
    window.location.href = "/products/detail";
  };

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listProducts({
        page,
        limit: 20,
        search: debouncedSearch || undefined,
        status: statusFilter === "ALL" ? "ALL" : statusFilter,
      });
      setProducts(result.data);
      setMeta({ total: result.meta.total, totalPages: result.meta.totalPages });
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? "Failed to load products.");
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 300);
  };

  const handleStatusFilterChange = (f: "ACTIVE" | "INACTIVE" | "ALL") => {
    setStatusFilter(f);
    setPage(1);
  };

  return (
    <div className="mx-auto w-full max-w-full">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
            <HiOutlineArchiveBox size={22} className="text-brand-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Browse and manage all products.
            </p>
          </div>
        </div>
        <Button size="sm" startIcon={<HiOutlinePlus size={16} />} onClick={() => setAddOpen(true)}>
          Add Product
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <HiOutlineMagnifyingGlass
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by name, SKU or category"
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
          <table className="w-full min-w-[900px] whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                {(["Name", "SKU", "Category", "Unit", "Total Stock", "Sizes", "Status", "Actions"] as const).map(
                  (col) => (
                    <th
                      key={col}
                      className={`px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 ${
                        col === "Actions" ? "w-[200px]" : ""
                      }`}
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
              ) : products.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-16 text-center text-sm text-gray-400 dark:text-gray-500"
                  >
                    No products found.{" "}
                    {statusFilter === "ACTIVE" && !debouncedSearch
                      ? "Add your first product."
                      : "Try adjusting your filters."}
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr
                    key={product.id}
                    className="transition hover:bg-gray-50/60 dark:hover:bg-gray-800/40"
                  >
                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleViewProduct(product.id)}
                        className="text-sm font-semibold text-brand-500 transition hover:text-brand-600 hover:underline"
                      >
                        {product.name}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {product.sku || "—"}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {product.category || "—"}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {product.unit || "—"}
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-gray-100">
                      {product.totalStock}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {product.variants.length}
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        variant="light"
                        size="sm"
                        color={product.status === "ACTIVE" ? "success" : "warning"}
                      >
                        {product.status === "ACTIVE" ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <ActionButton
                          icon={<HiOutlineEye size={14} />}
                          label="View"
                          onClick={() => handleViewProduct(product.id)}
                        />
                        <ActionButton
                          icon={<HiOutlinePencilSquare size={14} />}
                          label="Edit"
                          onClick={() => setEditTarget(product)}
                        />
                        <ActionButton
                          icon={<HiOutlineArrowsUpDown size={14} />}
                          label="Status"
                          onClick={() => setStatusTarget(product)}
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
                  {products.length}
                </span>{" "}
                of{" "}
                <span className="font-medium text-gray-600 dark:text-gray-300">{meta.total}</span>{" "}
                products
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
      <ProductDrawer
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={fetchProducts}
      />
      <ProductDrawer
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={fetchProducts}
        initial={editTarget}
      />
      <ChangeStatusModal
        product={statusTarget}
        onClose={() => setStatusTarget(null)}
        onSaved={fetchProducts}
      />
    </div>
  );
}
