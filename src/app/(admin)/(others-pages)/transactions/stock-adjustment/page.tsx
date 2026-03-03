"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  HiOutlineArrowLeft,
  HiOutlineArrowsUpDown,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineMagnifyingGlass,
  HiOutlinePlus,
  HiOutlineTrash,
} from "react-icons/hi2";
import DatePicker from "@/components/form/date-picker";
import Button from "@/components/ui/button/Button";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import { ApiProduct, getProductStock, listProducts } from "@/lib/products";
import {
  createAdjustmentDraft,
  formatPKR,
  postTransaction,
} from "@/lib/suppliers";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500";

const panelClass =
  "rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]";

type AdjustmentDirection = "IN" | "OUT";

type AdjustmentLine = {
  id: string;
  productId: string;
  productQuery: string;
  variantId: string;
  direction: AdjustmentDirection;
  quantity: number;
  reason: string;
};

type StockVariant = {
  variantId: string;
  size: string;
  currentStock: number;
};

function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toLocalDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function createEmptyLine(): AdjustmentLine {
  return {
    id: generateId(),
    productId: "",
    productQuery: "",
    variantId: "",
    direction: "IN",
    quantity: 1,
    reason: "",
  };
}

function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
      {children}
      {required && <span className="ml-0.5 text-error-500">*</span>}
    </label>
  );
}

export default function StockAdjustmentPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [stockByProductId, setStockByProductId] = useState<Record<string, StockVariant[]>>({});
  const [stockLoadingByProductId, setStockLoadingByProductId] = useState<Record<string, boolean>>({});
  const [lines, setLines] = useState<AdjustmentLine[]>([createEmptyLine()]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [activeProductPickerId, setActiveProductPickerId] = useState<string | null>(null);

  const [transactionDate, setTransactionDate] = useState(toLocalDate(new Date()));
  const [notes, setNotes] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      setLoading(true);
      setPageError(null);
      try {
        const result = await listProducts({
          status: "ACTIVE",
          limit: 100,
          page: 1,
          sortBy: "name",
          sortOrder: "asc",
        });
        if (!cancelled) {
          setProducts(result.data);
        }
      } catch (err) {
        if (!cancelled) {
          const apiErr = err as ApiError;
          setPageError(apiErr.message ?? "Failed to load products.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  const canPost = user?.role === "OWNER" || user?.role === "ADMIN";

  const ensureProductStock = async (productId: string) => {
    if (!productId || stockByProductId[productId] || stockLoadingByProductId[productId]) {
      return;
    }

    setStockLoadingByProductId((current) => ({ ...current, [productId]: true }));
    try {
      const stock = await getProductStock(productId);
      setStockByProductId((current) => ({
        ...current,
        [productId]: stock.variants.map((variant) => ({
          variantId: variant.variantId,
          size: variant.size,
          currentStock: variant.currentStock,
        })),
      }));
    } catch {
      setStockByProductId((current) => ({ ...current, [productId]: [] }));
    } finally {
      setStockLoadingByProductId((current) => ({ ...current, [productId]: false }));
    }
  };

  const updateLine = (lineId: string, updates: Partial<AdjustmentLine>) => {
    setLines((current) => current.map((line) => (line.id === lineId ? { ...line, ...updates } : line)));
  };

  const handleProductQueryChange = (lineId: string, nextQuery: string) => {
    setLines((current) =>
      current.map((line) =>
        line.id === lineId
          ? { ...line, productQuery: nextQuery, productId: "", variantId: "" }
          : line
      )
    );
    setActiveProductPickerId(lineId);
  };

  const handleSelectProduct = async (lineId: string, product: ApiProduct) => {
    setLines((current) =>
      current.map((line) =>
        line.id === lineId
          ? { ...line, productId: product.id, productQuery: product.name, variantId: "" }
          : line
      )
    );
    setActiveProductPickerId(null);
    setValidationError(null);
    await ensureProductStock(product.id);
  };

  const addLine = () => setLines((current) => [...current, createEmptyLine()]);
  const removeLine = (lineId: string) =>
    setLines((current) => (current.length === 1 ? current : current.filter((line) => line.id !== lineId)));

  const totals = useMemo(() => {
    const totalLines = lines.length;
    const totalIn = lines.reduce((sum, line) => sum + (line.direction === "IN" ? line.quantity : 0), 0);
    const totalOut = lines.reduce((sum, line) => sum + (line.direction === "OUT" ? line.quantity : 0), 0);
    return {
      totalLines,
      totalIn,
      totalOut,
      net: totalIn - totalOut,
    };
  }, [lines]);

  const submit = async () => {
    if (!canPost) {
      setValidationError("Only OWNER or ADMIN can post stock adjustments.");
      return;
    }
    if (!transactionDate) {
      setValidationError("Select a transaction date.");
      return;
    }
    if (notes.length > 1000) {
      setValidationError("Notes cannot exceed 1000 characters.");
      return;
    }

    let payloadLines;
    try {
      payloadLines = lines.map((line, index) => {
        const selectedProduct = products.find((product) => product.id === line.productId);
        const selectedVariant = selectedProduct?.variants.find((variant) => variant.id === line.variantId);

        if (!selectedProduct) throw new Error(`Line ${index + 1}: select a product.`);
        if (!selectedVariant) throw new Error(`Line ${index + 1}: select a size / variant.`);
        if (selectedVariant.status !== "ACTIVE") throw new Error(`Line ${index + 1}: the selected variant is not active.`);
        if (!Number.isFinite(line.quantity) || line.quantity < 1) throw new Error(`Line ${index + 1}: quantity must be at least 1.`);
        if (!line.reason.trim()) throw new Error(`Line ${index + 1}: reason is required.`);
        if (line.reason.trim().length > 500) throw new Error(`Line ${index + 1}: reason cannot exceed 500 characters.`);

        const stock = (stockByProductId[line.productId] ?? []).find((item) => item.variantId === line.variantId);
        if (line.direction === "OUT") {
          if (!stock) throw new Error(`Line ${index + 1}: stock data is required for OUT adjustments.`);
          if (line.quantity > stock.currentStock) {
            throw new Error(`Line ${index + 1}: OUT quantity exceeds current stock (${stock.currentStock}).`);
          }
        }

        return {
          variantId: line.variantId,
          quantity: Math.trunc(line.quantity),
          direction: line.direction,
          reason: line.reason.trim(),
        };
      });
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : "Please review the adjustment lines.");
      return;
    }

    if (payloadLines.length === 0) {
      setValidationError("Add at least one adjustment line.");
      return;
    }

    setValidationError(null);
    setPageError(null);
    setSubmitting(true);

    try {
      const draft = await createAdjustmentDraft({
        transactionDate,
        lines: payloadLines,
        notes: notes.trim() || undefined,
        idempotencyKey: generateId(),
      });

      const posted = await postTransaction(draft.id, { idempotencyKey: generateId() });
      sessionStorage.setItem("transactionId", posted.id);
      router.push("/transactions/detail");
    } catch (err) {
      const apiErr = err as ApiError;
      setPageError(apiErr.message ?? "Failed to save and post stock adjustment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-3">
          <Link href="/transactions" className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-white">
            <HiOutlineArrowLeft size={16} />
            Back to Transactions
          </Link>
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
              <HiOutlineArrowsUpDown size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Stock Adjustment</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Correct inventory levels by posting inbound or outbound stock adjustments.</p>
            </div>
          </div>
        </div>
      </div>

      {pageError && (
        <div className="flex items-start gap-3 rounded-2xl border border-error-100 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-400">
          <HiOutlineExclamationTriangle size={18} className="mt-0.5 shrink-0" />
          <span>{pageError}</span>
        </div>
      )}

      {validationError && (
        <div className="flex items-start gap-3 rounded-2xl border border-warning-100 bg-warning-50 px-4 py-3 text-sm text-warning-700 dark:border-warning-500/20 dark:bg-warning-500/10 dark:text-warning-300">
          <HiOutlineExclamationTriangle size={18} className="mt-0.5 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {!canPost && (
        <div className="rounded-2xl border border-warning-100 bg-warning-50 px-4 py-3 text-sm text-warning-700 dark:border-warning-500/20 dark:bg-warning-500/10 dark:text-warning-300">
          This action is restricted. Only OWNER or ADMIN can post stock adjustments.
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className={`${panelClass} overflow-visible`}>
          <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-800">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Adjustment Details</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Set the date, note the reason, and add one or more product adjustments.</p>
              </div>
              <Button size="sm" variant="outline" onClick={addLine} startIcon={<HiOutlinePlus size={16} />}>
                Add Line
              </Button>
            </div>
          </div>

          <div className="space-y-8 px-6 py-6">
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <FieldLabel required>Transaction Date</FieldLabel>
                <DatePicker
                  id="stock-adjustment-date"
                  mode="single"
                  defaultDate={transactionDate}
                  placeholder="Select transaction date"
                  onChange={(selectedDates) => {
                    if (selectedDates[0]) setTransactionDate(toLocalDate(selectedDates[0]));
                  }}
                />
              </div>
              <div>
                <FieldLabel htmlFor="adjustment-notes">Notes</FieldLabel>
                <textarea
                  id="adjustment-notes"
                  rows={4}
                  value={notes}
                  maxLength={1000}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`${inputClass} min-h-[110px] resize-y`}
                  placeholder="Optional notes for this stock adjustment"
                />
                <p className="mt-1 text-right text-xs text-gray-500 dark:text-gray-400">{notes.length}/1000</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-900/40">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Size / Variant</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Direction</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Reason</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {lines.map((line) => {
                    const selectedProduct = products.find((product) => product.id === line.productId) ?? null;
                    const activeVariants = (selectedProduct?.variants ?? []).filter((variant) => variant.status === "ACTIVE");
                    const productMatches = products.filter((product) => {
                      const query = line.productQuery.trim().toLowerCase();
                      if (!query) return true;
                      return product.name.toLowerCase().includes(query) || (product.sku ?? "").toLowerCase().includes(query);
                    });
                    const stockVariants = stockByProductId[line.productId] ?? [];
                    const selectedStock = stockVariants.find((item) => item.variantId === line.variantId);
                    const outWarning = line.direction === "OUT" && selectedStock && line.quantity > selectedStock.currentStock;

                    return (
                      <tr key={line.id} className="align-top">
                        <td className="px-4 py-4">
                          <div className="relative min-w-[220px]">
                            <div className="relative">
                              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <HiOutlineMagnifyingGlass size={16} />
                              </span>
                              <input
                                value={line.productQuery}
                                onChange={(e) => handleProductQueryChange(line.id, e.target.value)}
                                onFocus={() => setActiveProductPickerId(line.id)}
                                placeholder={loading ? "Loading products..." : "Search product"}
                                className={`${inputClass} pl-10`}
                                disabled={loading}
                              />
                            </div>
                            {activeProductPickerId === line.id && (
                              <div className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
                                {productMatches.length === 0 ? (
                                  <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No products found.</p>
                                ) : (
                                  productMatches.map((product) => (
                                    <button
                                      key={product.id}
                                      type="button"
                                      onClick={() => void handleSelectProduct(line.id, product)}
                                      className="block w-full rounded-xl px-3 py-2 text-left transition hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                                    >
                                      <span className="block text-sm font-medium text-gray-800 dark:text-white/90">{product.name}</span>
                                      <span className="block text-xs text-gray-500 dark:text-gray-400">{product.sku || "No SKU"}</span>
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="min-w-[220px]">
                            <select
                              value={line.variantId}
                              onChange={(e) => updateLine(line.id, { variantId: e.target.value })}
                              className={inputClass}
                              disabled={!selectedProduct}
                            >
                              <option value="">Select size</option>
                              {activeVariants.map((variant) => {
                                const stock = stockVariants.find((item) => item.variantId === variant.id);
                                return (
                                  <option key={variant.id} value={variant.id}>
                                    {variant.size}
                                    {stock ? ` - ${stock.currentStock} in stock` : ""}
                                  </option>
                                );
                              })}
                            </select>
                            {!selectedProduct && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Pick a product first.</p>}
                            {selectedProduct && stockLoadingByProductId[selectedProduct.id] && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Loading stock...</p>}
                            {selectedStock && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Current stock: {selectedStock.currentStock}</p>}
                            {outWarning && <p className="mt-1 text-xs text-warning-600 dark:text-warning-400">OUT quantity exceeds current stock.</p>}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <select
                            value={line.direction}
                            onChange={(e) => updateLine(line.id, { direction: e.target.value as AdjustmentDirection })}
                            className={`${inputClass} min-w-[130px] ${line.direction === "IN" ? "border-success-200 text-success-700" : "border-error-200 text-error-700"}`}
                          >
                            <option value="IN">IN</option>
                            <option value="OUT">OUT</option>
                          </select>
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="number"
                            min={1}
                            value={line.quantity}
                            onChange={(e) => updateLine(line.id, { quantity: Math.max(1, Number(e.target.value || 1)) })}
                            className={`${inputClass} min-w-[96px]`}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="min-w-[240px]">
                            <input
                              value={line.reason}
                              maxLength={500}
                              onChange={(e) => updateLine(line.id, { reason: e.target.value })}
                              className={inputClass}
                              placeholder="Reason for adjustment"
                            />
                            <p className="mt-1 text-right text-xs text-gray-500 dark:text-gray-400">{line.reason.length}/500</p>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => removeLine(line.id)}
                            disabled={lines.length === 1}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:border-error-200 hover:bg-error-50 hover:text-error-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400"
                            aria-label="Remove line"
                          >
                            <HiOutlineTrash size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end border-t border-gray-200 pt-6 dark:border-gray-800">
              <Button onClick={() => void submit()} disabled={submitting || !canPost} startIcon={<HiOutlineCheckCircle size={18} />}>
                {submitting ? "Posting..." : "Save & Post"}
              </Button>
            </div>
          </div>
        </section>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <section className={`${panelClass} p-6`}>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400">
                <HiOutlineCheckCircle size={22} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Adjustment Summary</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Review net stock movement before posting.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Total Lines</span>
                <span className="font-medium text-gray-800 dark:text-white/90">{totals.totalLines}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Total IN</span>
                <span className="font-medium text-success-700 dark:text-success-400">{totals.totalIn}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Total OUT</span>
                <span className="font-medium text-error-700 dark:text-error-400">{totals.totalOut}</span>
              </div>
              <div className="rounded-2xl bg-gray-50 px-4 py-4 dark:bg-gray-900/40">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Net Movement</span>
                  <span className={`text-xl font-bold ${totals.net >= 0 ? "text-success-700 dark:text-success-400" : "text-error-700 dark:text-error-400"}`}>
                    {totals.net >= 0 ? `+${totals.net}` : totals.net}
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 px-4 py-4 dark:border-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  The frontend treats the lowest role (`USER`) as the restricted role for this screen, matching the STAFF-like restriction in the wireframe.
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
