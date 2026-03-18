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
  HiOutlinePencilSquare,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineXMark,
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
  unitCost: number | "";
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

function getCurrentDateSafe() {
  // Use a date that's definitely not in the future relative to server
  // by going back one day if it's within first few hours of the day
  const now = new Date();
  const currentHour = now.getHours();
  
  // If it's very early in the morning (0-3 AM), use previous day to avoid timezone issues
  if (currentHour >= 0 && currentHour < 3) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return toLocalDate(yesterday);
  }
  
  return toLocalDate(now);
}

function createEmptyLine(): AdjustmentLine {
  return {
    id: generateId(),
    productId: "",
    productQuery: "",
    variantId: "",
    direction: "IN",
    quantity: 1,
    unitCost: "",
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
  const [lines, setLines] = useState<AdjustmentLine[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [lineComposerOpen, setLineComposerOpen] = useState(false);
  const [lineComposer, setLineComposer] = useState<AdjustmentLine>(createEmptyLine());
  const [lineComposerError, setLineComposerError] = useState<string | null>(null);
  const [lineComposerProductOpen, setLineComposerProductOpen] = useState(false);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);

  const [transactionDate, setTransactionDate] = useState(getCurrentDateSafe());
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

  useEffect(() => {
    if (!lineComposerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [lineComposerOpen]);

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

  const composerProducts = useMemo(() => {
    const query = lineComposer.productQuery.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(query) ||
        (product.sku ?? "").toLowerCase().includes(query)
      );
    });
  }, [lineComposer.productQuery, products]);

  const composerSelectedProduct = useMemo(() => {
    return products.find((product) => product.id === lineComposer.productId) ?? null;
  }, [lineComposer.productId, products]);

  const composerActiveVariants = useMemo(() => {
    return (composerSelectedProduct?.variants ?? []).filter((variant) => variant.status === "ACTIVE");
  }, [composerSelectedProduct]);

  const composerSelectedVariant = useMemo(() => {
    return composerActiveVariants.find((variant) => variant.id === lineComposer.variantId) ?? null;
  }, [composerActiveVariants, lineComposer.variantId]);

  const composerStockVariants = lineComposer.productId ? stockByProductId[lineComposer.productId] ?? [] : [];

  const composerSelectedStock = useMemo(() => {
    if (!lineComposer.variantId) return null;
    return composerStockVariants.find((item) => item.variantId === lineComposer.variantId) ?? null;
  }, [composerStockVariants, lineComposer.variantId]);

  const openLineComposer = () => {
    setEditingLineId(null);
    setLineComposer(createEmptyLine());
    setLineComposerError(null);
    setLineComposerProductOpen(false);
    setLineComposerOpen(true);
  };

  const openLineComposerForEdit = (lineId: string) => {
    const target = lines.find((line) => line.id === lineId);
    if (!target) return;

    setEditingLineId(lineId);
    setLineComposer({ ...target });
    setLineComposerError(null);
    setLineComposerProductOpen(false);
    setLineComposerOpen(true);
    void ensureProductStock(target.productId);
  };

  const closeLineComposer = () => {
    setLineComposerOpen(false);
    setLineComposerProductOpen(false);
    setLineComposerError(null);
    setEditingLineId(null);
  };

  const handleComposerSelectProduct = async (product: ApiProduct) => {
    setLineComposer((current) => ({
      ...current,
      productId: product.id,
      productQuery: product.name,
      variantId: "",
    }));
    setLineComposerProductOpen(false);
    setLineComposerError(null);
    await ensureProductStock(product.id);
  };

  const saveLineFromComposer = () => {
    if (!lineComposer.productId || !composerSelectedProduct) {
      setLineComposerError("Select a product.");
      return;
    }
    if (!lineComposer.variantId || !composerSelectedVariant) {
      setLineComposerError("Select a size / variant.");
      return;
    }
    if (!Number.isFinite(lineComposer.quantity) || lineComposer.quantity < 1) {
      setLineComposerError("Quantity must be at least 1.");
      return;
    }
    if (lineComposer.direction === "IN") {
      if (lineComposer.unitCost === "" || !Number.isFinite(Number(lineComposer.unitCost))) {
        setLineComposerError("Unit cost is required for IN adjustments.");
        return;
      }
      if (!Number.isInteger(Number(lineComposer.unitCost)) || Number(lineComposer.unitCost) < 1) {
        setLineComposerError("Unit cost must be a whole number of at least 1.");
        return;
      }
    }
    if (lineComposer.direction === "OUT" && composerSelectedStock && lineComposer.quantity > composerSelectedStock.currentStock) {
      setLineComposerError(`OUT quantity exceeds current stock (${composerSelectedStock.currentStock}).`);
      return;
    }
    if (!lineComposer.reason.trim()) {
      setLineComposerError("Reason is required.");
      return;
    }
    if (lineComposer.reason.trim().length > 500) {
      setLineComposerError("Reason cannot exceed 500 characters.");
      return;
    }

    const normalizedLine: AdjustmentLine = {
      ...lineComposer,
      id: editingLineId ?? generateId(),
      quantity: Math.max(1, Math.trunc(lineComposer.quantity)),
      unitCost:
        lineComposer.direction === "IN"
          ? Math.max(1, Math.trunc(Number(lineComposer.unitCost || 1)))
          : "",
      reason: lineComposer.reason.trim(),
    };

    if (editingLineId) {
      setLines((current) =>
        current.map((line) => (line.id === editingLineId ? normalizedLine : line))
      );
    } else {
      setLines((current) => [...current, normalizedLine]);
    }

    closeLineComposer();
    setValidationError(null);
  };

  const removeLine = (lineId: string) => {
    setLines((current) => current.filter((line) => line.id !== lineId));
  };

  const blockWheelIncrement: React.WheelEventHandler<HTMLInputElement> = (event) => {
    event.currentTarget.blur();
  };

  const totals = useMemo(() => {
    const totalLines = lines.length;
    const totalIn = lines.reduce((sum, line) => sum + (line.direction === "IN" ? line.quantity : 0), 0);
    const totalOut = lines.reduce((sum, line) => sum + (line.direction === "OUT" ? line.quantity : 0), 0);
    const inboundValue = lines.reduce((sum, line) => {
      if (line.direction !== "IN" || line.unitCost === "") return sum;
      return sum + line.quantity * line.unitCost;
    }, 0);
    return {
      totalLines,
      totalIn,
      totalOut,
      inboundValue,
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
        if (line.direction === "IN") {
          if (line.unitCost === "" || !Number.isFinite(Number(line.unitCost))) {
            throw new Error(`Line ${index + 1}: unit cost is required for IN adjustments.`);
          }
          if (!Number.isInteger(Number(line.unitCost)) || Number(line.unitCost) < 1) {
            throw new Error(`Line ${index + 1}: unit cost must be a whole number of at least 1.`);
          }
        }
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
          ...(line.direction === "IN" ? { unitCost: Math.trunc(Number(line.unitCost)) } : {}),
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
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Adjustment Details</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Set the date, note the reason, and add one or more product adjustments.</p>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                IN adjustments carry value now, so unit cost is required whenever stock is added in.
              </p>
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
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Unit Cost</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Reason</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {lines.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8">
                        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50/70 p-5 text-center dark:border-gray-700 dark:bg-gray-900/30">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            No adjustment lines added yet.
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Use the composer button below to add your first adjustment line.
                          </p>
                          <div className="pt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={openLineComposer}
                              startIcon={<HiOutlinePlus size={16} />}
                            >
                              Add Line Item
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    lines.map((line) => {
                      const selectedProduct = products.find((product) => product.id === line.productId) ?? null;
                      const selectedVariant = selectedProduct?.variants.find((variant) => variant.id === line.variantId) ?? null;
                      const stockVariants = stockByProductId[line.productId] ?? [];
                      const selectedStock = stockVariants.find((item) => item.variantId === line.variantId);
                      const outWarning = line.direction === "OUT" && !!selectedStock && line.quantity > selectedStock.currentStock;

                      return (
                        <tr key={line.id} className="align-top">
                          <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-200">
                            {selectedProduct?.name || line.productQuery || "—"}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-200">
                            <p>{selectedVariant?.size || "—"}</p>
                            {selectedStock && (
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Current stock: {selectedStock.currentStock}
                              </p>
                            )}
                            {outWarning && (
                              <p className="mt-1 text-xs text-warning-600 dark:text-warning-400">
                                OUT quantity exceeds current stock.
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-4 text-sm font-medium text-gray-700 dark:text-gray-200">
                            <span className={line.direction === "IN" ? "text-success-700 dark:text-success-400" : "text-error-700 dark:text-error-400"}>
                              {line.direction}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-200">{line.quantity}</td>
                          <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-200">
                            {line.direction === "IN" && line.unitCost !== "" ? formatPKR(Number(line.unitCost)) : "Uses avg cost"}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-200">{line.reason || "—"}</td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openLineComposerForEdit(line.id)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                                aria-label="Edit line"
                              >
                                <HiOutlinePencilSquare size={18} />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeLine(line.id)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:border-error-200 hover:bg-error-50 hover:text-error-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-error-500/30 dark:hover:bg-error-500/10 dark:hover:text-error-400"
                                aria-label="Remove line"
                              >
                                <HiOutlineTrash size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                  {lines.length > 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-3">
                        <button
                          type="button"
                          onClick={openLineComposer}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50/70 px-4 py-3 text-sm font-medium text-gray-600 transition hover:border-brand-300 hover:bg-brand-50/70 hover:text-brand-700 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-300 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
                        >
                          <HiOutlinePlus size={16} />
                          Add another line item
                        </button>
                      </td>
                    </tr>
                  )}
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
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Inbound Value</span>
                <span className="font-medium text-gray-800 dark:text-white/90">{formatPKR(totals.inboundValue)}</span>
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

      {lineComposerOpen && (
        <>
          <div
            className="fixed inset-0 z-[70] bg-gray-950/45 backdrop-blur-[1px]"
            onClick={closeLineComposer}
          />
          <div className="fixed inset-y-0 right-0 z-[80] w-full max-w-xl border-l border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5 dark:border-gray-800">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {editingLineId ? "Edit Adjustment Line" : "Add Adjustment Line"}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Pick product and variant first, then set direction, quantity, cost, and reason.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeLineComposer}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                  aria-label="Close line composer"
                >
                  <HiOutlineXMark size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
                <div className="relative">
                  <FieldLabel htmlFor="composer-product" required>
                    Product
                  </FieldLabel>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <HiOutlineMagnifyingGlass size={18} />
                    </span>
                    <input
                      id="composer-product"
                      value={lineComposer.productQuery}
                      onChange={(e) => {
                        const query = e.target.value;
                        setLineComposer((current) => ({
                          ...current,
                          productQuery: query,
                          productId: "",
                          variantId: "",
                        }));
                        setLineComposerProductOpen(true);
                      }}
                      onFocus={() => setLineComposerProductOpen(true)}
                      placeholder={loading ? "Loading products..." : "Search product"}
                      className={`${inputClass} pl-11 pr-10`}
                      disabled={loading}
                    />
                    {lineComposer.productQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setLineComposer((current) => ({
                            ...current,
                            productId: "",
                            productQuery: "",
                            variantId: "",
                          }));
                          setLineComposerProductOpen(false);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-200"
                        aria-label="Clear product"
                      >
                        <HiOutlineXMark size={18} />
                      </button>
                    )}
                  </div>

                  {lineComposerProductOpen && (
                    <div className="absolute z-30 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
                      {composerProducts.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No products found.</p>
                      ) : (
                        composerProducts.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => void handleComposerSelectProduct(product)}
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

                <div>
                  <FieldLabel htmlFor="composer-variant" required>
                    Size / Variant
                  </FieldLabel>
                  <select
                    id="composer-variant"
                    value={lineComposer.variantId}
                    onChange={(e) => setLineComposer((current) => ({ ...current, variantId: e.target.value }))}
                    className={inputClass}
                    disabled={!composerSelectedProduct}
                  >
                    <option value="">Select size</option>
                    {composerActiveVariants.map((variant) => {
                      const stock = composerStockVariants.find((item) => item.variantId === variant.id);
                      return (
                        <option key={variant.id} value={variant.id}>
                          {variant.size}
                          {stock ? ` - ${stock.currentStock} in stock` : ""}
                        </option>
                      );
                    })}
                  </select>
                  {!composerSelectedProduct && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Pick a product first.</p>
                  )}
                  {composerSelectedProduct && stockLoadingByProductId[composerSelectedProduct.id] && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Loading stock...</p>
                  )}
                  {composerSelectedStock && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Current stock: {composerSelectedStock.currentStock}
                    </p>
                  )}
                </div>

                <div>
                  <FieldLabel htmlFor="composer-direction" required>
                    Direction
                  </FieldLabel>
                  <select
                    id="composer-direction"
                    value={lineComposer.direction}
                    onChange={(e) =>
                      setLineComposer((current) => ({
                        ...current,
                        direction: e.target.value as AdjustmentDirection,
                        unitCost: e.target.value === "IN" ? current.unitCost : "",
                      }))
                    }
                    className={`${inputClass} ${lineComposer.direction === "IN" ? "border-success-200 text-success-700" : "border-error-200 text-error-700"}`}
                  >
                    <option value="IN">IN</option>
                    <option value="OUT">OUT</option>
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel htmlFor="composer-qty" required>
                      Quantity
                    </FieldLabel>
                    <input
                      id="composer-qty"
                      type="number"
                      min={1}
                      value={lineComposer.quantity}
                      onChange={(e) =>
                        setLineComposer((current) => ({
                          ...current,
                          quantity: Math.max(1, Math.trunc(Number(e.target.value || 1))),
                        }))
                      }
                      onWheel={blockWheelIncrement}
                      className={inputClass}
                    />
                  </div>
                  {lineComposer.direction === "IN" && (
                    <div>
                      <FieldLabel htmlFor="composer-unit-cost" required>
                        Unit Cost
                      </FieldLabel>
                      <input
                        id="composer-unit-cost"
                        type="number"
                        min={1}
                        step={1}
                        value={lineComposer.unitCost}
                        onChange={(e) => {
                          const nextValue = e.target.value;
                          setLineComposer((current) => ({
                            ...current,
                            unitCost: nextValue === "" ? "" : Math.max(1, Math.trunc(Number(nextValue))),
                          }));
                        }}
                        onWheel={blockWheelIncrement}
                        className={inputClass}
                      />
                    </div>
                  )}
                </div>

                {lineComposer.direction === "IN" && lineComposer.unitCost !== "" && (
                  <div className="rounded-xl border border-success-100 bg-success-50 px-4 py-3 text-xs text-success-700 dark:border-success-500/25 dark:bg-success-500/10 dark:text-success-300">
                    Value impact: {formatPKR(lineComposer.quantity * Number(lineComposer.unitCost))}
                  </div>
                )}
                {lineComposer.direction === "OUT" && (
                  <div className="rounded-xl border border-dashed border-gray-200 px-4 py-3 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    OUT adjustments are validated against available stock and posted using current average cost.
                  </div>
                )}

                <div>
                  <FieldLabel htmlFor="composer-reason" required>
                    Reason
                  </FieldLabel>
                  <input
                    id="composer-reason"
                    value={lineComposer.reason}
                    maxLength={500}
                    onChange={(e) => setLineComposer((current) => ({ ...current, reason: e.target.value }))}
                    className={inputClass}
                    placeholder="Reason for adjustment"
                  />
                  <p className="mt-1 text-right text-xs text-gray-500 dark:text-gray-400">
                    {lineComposer.reason.length}/500
                  </p>
                </div>

                {lineComposerError && (
                  <div className="rounded-xl border border-warning-100 bg-warning-50 px-3 py-2 text-xs text-warning-700 dark:border-warning-500/20 dark:bg-warning-500/10 dark:text-warning-300">
                    {lineComposerError}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
                <Button variant="outline" onClick={closeLineComposer}>
                  Cancel
                </Button>
                <Button onClick={saveLineFromComposer} startIcon={<HiOutlinePlus size={16} />}>
                  {editingLineId ? "Update Line" : "Add Line"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
