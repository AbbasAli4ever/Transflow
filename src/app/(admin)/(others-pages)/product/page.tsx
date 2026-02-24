"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  HiOutlineCube,
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
  CreateProductBody,
  UpdateProductBody,
  ListProductsParams,
  formatPKR,
  listProducts,
  createProduct,
  updateProduct,
  changeProductStatus,
} from "@/lib/products";
import { ApiError } from "@/lib/api";

// ─── Small Action Button ──────────────────────────────────────────────────────

function ActionButton({
  icon,
  label,
  onClick,
  variant = "default",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium shadow-theme-xs transition ${
        variant === "danger"
          ? "border-error-200 bg-error-50 text-error-600 hover:bg-error-100 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400"
          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
      }`}
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
      {[180, 100, 140, 80, 80, 80, 160].map((w, i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-4 rounded bg-gray-200 dark:bg-gray-700" style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Input Helpers ────────────────────────────────────────────────────────────

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

// ─── Add Product Drawer ───────────────────────────────────────────────────────

interface ProductForm {
  name: string;
  sku: string;
  category: string;
  unit: string;
}

const emptyForm: ProductForm = { name: "", sku: "", category: "", unit: "" };

function AddProductDrawer({
  isOpen,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (product: ApiProduct) => void;
}) {
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setForm(emptyForm);
    setError(null);
    setFieldErrors({});
  }, [isOpen]);

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
      setError("Product name is required.");
      return;
    }
    setError(null);
    setFieldErrors({});
    setSaving(true);
    try {
      const body: CreateProductBody = {
        name: form.name.trim(),
        ...(form.sku.trim() && { sku: form.sku.trim() }),
        ...(form.category.trim() && { category: form.category.trim() }),
        ...(form.unit.trim() && { unit: form.unit.trim() }),
      };
      const product = await createProduct(body);
      onSaved(product);
      onClose();
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.statusCode === 409) {
        setFieldErrors({ sku: "A product with this SKU already exists." });
      } else if (apiErr.statusCode === 400 && apiErr.errors?.length) {
        const fe: Record<string, string> = {};
        apiErr.errors.forEach((e) => { fe[e.field] = e.message; });
        setFieldErrors(fe);
      } else {
        setError(apiErr.message ?? "Failed to create product.");
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
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add Product</h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Saving creates a default ONE-SIZE variant automatically.
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
                className={`${inputClass} ${fieldErrors.name ? "border-error-400 focus:border-error-400 focus:ring-error-400/20" : ""}`}
                placeholder="Enter product name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              {fieldErrors.name && (
                <p className="mt-1 text-xs text-error-500">{fieldErrors.name}</p>
              )}
            </div>

            <div>
              <FieldLabel>SKU (optional)</FieldLabel>
              <input
                className={`${inputClass} ${fieldErrors.sku ? "border-error-400 focus:border-error-400 focus:ring-error-400/20" : ""}`}
                placeholder="Auto-uppercase (e.g. VALVE-2IN)"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
              />
              {fieldErrors.sku && (
                <p className="mt-1 text-xs text-error-500">{fieldErrors.sku}</p>
              )}
            </div>

            <div>
              <FieldLabel>Category (optional)</FieldLabel>
              <input
                className={inputClass}
                placeholder="e.g. Fabrics, Raw Material"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>

            <div>
              <FieldLabel>Unit (optional)</FieldLabel>
              <input
                className={inputClass}
                placeholder="e.g. kg, bag, pcs, meter"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              />
            </div>

            <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm dark:border-brand-500/30 dark:bg-brand-500/10">
              <p className="font-semibold text-brand-700 dark:text-brand-300 mb-2">What happens on save</p>
              <ul className="space-y-1 text-brand-600 dark:text-brand-400">
                <li>• A default ONE-SIZE variant is auto-created.</li>
                <li>• Add more sizes later from Product Detail.</li>
                <li>• Stock quantity starts at 0 — add via Purchase transactions.</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-100 px-6 py-4 dark:border-gray-800">
            <div className="flex gap-3">
              <Button variant="outline" size="sm" className="flex-1" onClick={onClose} type="button">
                Cancel
              </Button>
              <Button size="sm" className="flex-1" disabled={saving}>
                {saving ? "Saving..." : "Save Product"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}

// ─── Edit Product Drawer ──────────────────────────────────────────────────────

function EditProductDrawer({
  product,
  isOpen,
  onClose,
  onSaved,
}: {
  product: ApiProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updated: ApiProduct) => void;
}) {
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        sku: product.sku ?? "",
        category: product.category ?? "",
        unit: product.unit,
      });
    }
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

  if (!product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Product name is required.");
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
        apiErr.errors.forEach((e) => { fe[e.field] = e.message; });
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
                className={`${inputClass} ${fieldErrors.name ? "border-error-400" : ""}`}
                placeholder="Product name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              {fieldErrors.name && <p className="mt-1 text-xs text-error-500">{fieldErrors.name}</p>}
            </div>
            <div>
              <FieldLabel>SKU</FieldLabel>
              <input
                className={`${inputClass} ${fieldErrors.sku ? "border-error-400" : ""}`}
                placeholder="SKU (auto-uppercase)"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
              />
              {fieldErrors.sku && <p className="mt-1 text-xs text-error-500">{fieldErrors.sku}</p>}
            </div>
            <div>
              <FieldLabel>Category</FieldLabel>
              <input
                className={inputClass}
                placeholder="Category"
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
              <Button variant="outline" size="sm" className="flex-1" onClick={onClose} type="button">
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
      const updated = await changeProductStatus(product.id, newStatus, reason.trim() || undefined);
      onSaved(updated);
      onClose();
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? "Failed to change status.");
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
          <h3 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">Change Status</h3>
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "INACTIVE" | "ALL">("ACTIVE");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  // Drawer / modal state
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ApiProduct | null>(null);
  const [statusTarget, setStatusTarget] = useState<ApiProduct | null>(null);

  // Categories for filter dropdown (derived from current page data)
  const [allCategories, setAllCategories] = useState<string[]>([]);

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 350);
  }, []);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: ListProductsParams = {
        page,
        limit: 20,
        sortBy: "name",
        sortOrder: "asc",
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;

      const res = await listProducts(params);
      setProducts(res.data);
      setMeta(res.meta);

      // Build category list from first page (no dedicated API)
      if (!debouncedSearch && !categoryFilter && page === 1) {
        const cats = Array.from(
          new Set(res.data.map((p) => p.category).filter(Boolean) as string[])
        );
        setAllCategories((prev) => Array.from(new Set([...prev, ...cats])));
      }
    } catch (err) {
      const apiErr = err as { message?: string };
      setError(apiErr.message ?? "Failed to load products.");
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, categoryFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, categoryFilter]);

  const handleViewProduct = (id: string) => {
    sessionStorage.setItem("productId", id);
    window.location.href = "/product/detail";
  };

  const handleProductSaved = (product: ApiProduct) => {
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p.id === product.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = product;
        return updated;
      }
      // New product: prepend and refresh
      return [product, ...prev];
    });
  };

  const handleProductCreated = (product: ApiProduct) => {
    // On creation, just refresh the whole list to get accurate pagination
    fetchProducts();
    if (product.category) {
      setAllCategories((prev) =>
        Array.from(new Set([...prev, product.category as string]))
      );
    }
  };

  return (
    <div className="mx-auto w-full max-w-full">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
            <HiOutlineCube size={22} className="text-brand-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isLoading ? "Loading…" : `${meta.total} product${meta.total !== 1 ? "s" : ""} total`}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          startIcon={<HiOutlinePlus size={16} />}
          onClick={() => setAddOpen(true)}
        >
          Add Product
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <HiOutlineMagnifyingGlass
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by name, SKU, or category"
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

        {/* Status tabs */}
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

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-10 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-700 outline-none transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        >
          <option value="">All Categories</option>
          {allCategories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          <HiOutlineExclamationTriangle size={16} className="mt-0.5 shrink-0" />
          {error}
          <button
            onClick={fetchProducts}
            className="ml-auto underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                {["Name", "SKU", "Category", "Unit", "Avg Cost", "Status", "Actions"].map(
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
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : products.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-16 text-center text-sm text-gray-400 dark:text-gray-500"
                  >
                    {debouncedSearch || categoryFilter || statusFilter !== "ACTIVE"
                      ? "No products match your filters."
                      : "No products yet. Add your first product."}
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
                      {product.sku ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {product.category ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {product.unit}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-200">
                      {product.avgCost > 0 ? (
                        formatPKR(product.avgCost)
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">—</span>
                      )}
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

        {/* Footer / Pagination */}
        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 dark:border-gray-700">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {isLoading ? (
              "Loading…"
            ) : (
              <>
                Page{" "}
                <span className="font-medium text-gray-600 dark:text-gray-300">{meta.page}</span>{" "}
                of{" "}
                <span className="font-medium text-gray-600 dark:text-gray-300">
                  {meta.totalPages}
                </span>{" "}
                &mdash;{" "}
                <span className="font-medium text-gray-600 dark:text-gray-300">{meta.total}</span>{" "}
                total
              </>
            )}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              <HiOutlineChevronLeft size={14} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page >= meta.totalPages || isLoading}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              <HiOutlineChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Drawers / Modals */}
      <AddProductDrawer
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={handleProductCreated}
      />
      <EditProductDrawer
        product={editTarget}
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={(updated) => {
          handleProductSaved(updated);
          setEditTarget(null);
        }}
      />
      <ChangeStatusModal
        product={statusTarget}
        onClose={() => setStatusTarget(null)}
        onSaved={(updated) => {
          handleProductSaved(updated);
          setStatusTarget(null);
        }}
      />
    </div>
  );
}
