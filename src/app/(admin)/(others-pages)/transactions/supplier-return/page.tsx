"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineMagnifyingGlass,
} from "react-icons/hi2";
import DatePicker from "@/components/form/date-picker";
import Button from "@/components/ui/button/Button";
import { ApiError } from "@/lib/api";
import { getProductStock } from "@/lib/products";
import {
  ApiTransaction,
  ApiTransactionLine,
  ApiSupplier,
  createSupplierReturnDraft,
  formatPKR,
  getTransaction,
  getTransactionReturnableLines,
  listSuppliers,
  listTransactions,
  postTransaction,
  ReturnableLine,
} from "@/lib/suppliers";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500";

const panelClass =
  "rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-700 dark:bg-gray-900";

type Step = "select" | "review";
type QuantitiesState = Record<string, number>;

type ReviewLine = ReturnableLine & {
  quantity: number;
  lineCredit: number;
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

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
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
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
    >
      {children}
      {required && <span className="ml-0.5 text-error-500">*</span>}
    </label>
  );
}

export default function SupplierReturnPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("select");
  const [suppliers, setSuppliers] = useState<ApiSupplier[]>([]);
  const [purchases, setPurchases] = useState<ApiTransaction[]>([]);
  const [selectedPurchase, setSelectedPurchase] = useState<ApiTransaction | null>(null);
  const [purchaseDetail, setPurchaseDetail] = useState<ApiTransaction | null>(null);
  const [returnableLines, setReturnableLines] = useState<ReturnableLine[]>([]);
  const [quantities, setQuantities] = useState<QuantitiesState>({});
  const [inHandByVariant, setInHandByVariant] = useState<Record<string, number>>({});

  const [loading, setLoading] = useState(true);
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [linesLoading, setLinesLoading] = useState(false);
  const [stockLoading, setStockLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [supplierId, setSupplierId] = useState("");
  const [supplierQuery, setSupplierQuery] = useState("");
  const [supplierOpen, setSupplierOpen] = useState(false);
  const supplierDropdownRef = useRef<HTMLDivElement | null>(null);
  const [purchaseId, setPurchaseId] = useState("");
  const [transactionDate, setTransactionDate] = useState(toLocalDate(new Date()));
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (supplierOpen && supplierDropdownRef.current && !supplierDropdownRef.current.contains(target)) {
        setSupplierOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [supplierOpen]);

  useEffect(() => {
    let cancelled = false;

    const loadSuppliers = async () => {
      setLoading(true);
      setPageError(null);
      try {
        const result = await listSuppliers({
          status: "ACTIVE",
          limit: 100,
          page: 1,
          sortBy: "createdAt",
          sortOrder: "desc",
        });
        if (!cancelled) {
          setSuppliers(result.data);
          const prefillId = sessionStorage.getItem("prefillSupplierId");
          if (prefillId) {
            const match = result.data.find((s) => s.id === prefillId);
            if (match) { setSupplierId(match.id); setSupplierQuery(match.name); }
            sessionStorage.removeItem("prefillSupplierId");
          }
        }
      } catch (err) {
        if (!cancelled) {
          const apiErr = err as ApiError;
          setPageError(apiErr.message ?? "Failed to load suppliers.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadSuppliers();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!supplierId) {
      setPurchases([]);
      setPurchaseId("");
      setSelectedPurchase(null);
      setPurchaseDetail(null);
      setReturnableLines([]);
      setQuantities({});
      setInHandByVariant({});
      return;
    }

    let cancelled = false;

    const loadPurchases = async () => {
      setPurchasesLoading(true);
      setPageError(null);
      try {
        const result = await listTransactions({
          supplierId,
          type: "PURCHASE",
          status: "POSTED",
          limit: 100,
          page: 1,
          sortBy: "createdAt",
          sortOrder: "desc",
        });
        if (cancelled) return;
        setPurchases(result.data);
        setPurchaseId("");
        setSelectedPurchase(null);
        setPurchaseDetail(null);
        setReturnableLines([]);
        setQuantities({});
        setInHandByVariant({});
      } catch (err) {
        if (cancelled) return;
        const apiErr = err as ApiError;
        setPageError(apiErr.message ?? "Failed to load source purchases.");
        setPurchases([]);
      } finally {
        if (!cancelled) {
          setPurchasesLoading(false);
        }
      }
    };

    loadPurchases();

    return () => {
      cancelled = true;
    };
  }, [supplierId]);

  useEffect(() => {
    if (!purchaseId) {
      setSelectedPurchase(null);
      setPurchaseDetail(null);
      setReturnableLines([]);
      setQuantities({});
      setInHandByVariant({});
      return;
    }

    let cancelled = false;

    const loadPurchaseLines = async () => {
      setLinesLoading(true);
      setPageError(null);
      try {
        const purchase = purchases.find((item) => item.id === purchaseId) ?? null;
        const [detail, returnable] = await Promise.all([
          getTransaction(purchaseId),
          getTransactionReturnableLines(purchaseId),
        ]);

        const productIds = Array.from(
          new Set(
            (detail.transactionLines ?? [])
              .map((line) => line.variant?.productId)
              .filter((productId): productId is string => Boolean(productId))
          )
        );

        setStockLoading(true);
        let stockByVariant: Record<string, number> = {};
        if (productIds.length > 0) {
          const stocks = await Promise.all(productIds.map((productId) => getProductStock(productId)));
          stocks.forEach((stock) => {
            stock.variants.forEach((variant) => {
              stockByVariant[variant.variantId] = variant.currentStock;
            });
          });
        }

        if (cancelled) return;

        setSelectedPurchase(purchase);
        setPurchaseDetail(detail);
        setReturnableLines(returnable.lines);
        setQuantities({});
        setInHandByVariant(stockByVariant);
      } catch (err) {
        if (cancelled) return;
        const apiErr = err as ApiError;
        setPageError(apiErr.message ?? "Failed to load purchase lines.");
        setPurchaseDetail(null);
        setReturnableLines([]);
        setInHandByVariant({});
      } finally {
        if (!cancelled) {
          setLinesLoading(false);
          setStockLoading(false);
        }
      }
    };

    loadPurchaseLines();

    return () => {
      cancelled = true;
    };
  }, [purchaseId, purchases]);

  const filteredSuppliers = useMemo(() => {
    const query = supplierQuery.trim().toLowerCase();
    if (!query) return suppliers;
    return suppliers.filter((supplier) => supplier.name.toLowerCase().includes(query));
  }, [supplierQuery, suppliers]);

  const reviewLines = useMemo<ReviewLine[]>(() => {
    const linesById = new Map<string, ApiTransactionLine>();
    (purchaseDetail?.transactionLines ?? []).forEach((line) => {
      linesById.set(line.id, line);
    });

    return returnableLines
      .map((line) => {
        const quantity = Math.max(0, quantities[line.lineId] ?? 0);
        if (quantity <= 0) return null;

        const sourceLine = linesById.get(line.lineId);
        const derivedUnit = sourceLine
          ? sourceLine.quantity > 0
            ? (sourceLine.lineTotal + sourceLine.discountAmount) / sourceLine.quantity
            : 0
          : 0;

        return {
          ...line,
          quantity,
          lineCredit: derivedUnit * quantity,
        };
      })
      .filter((line): line is ReviewLine => Boolean(line));
  }, [purchaseDetail, quantities, returnableLines]);

  const totalCredit = useMemo(
    () => reviewLines.reduce((sum, line) => sum + line.lineCredit, 0),
    [reviewLines]
  );

  const selectedSupplier = useMemo(
    () => suppliers.find((supplier) => supplier.id === supplierId) ?? null,
    [supplierId, suppliers]
  );

  const lineVariantMap = useMemo(() => {
    const map: Record<string, string> = {};
    (purchaseDetail?.transactionLines ?? []).forEach((line) => {
      if (line.variantId) {
        map[line.id] = line.variantId;
      }
    });
    return map;
  }, [purchaseDetail]);

  const selectedQtyByVariant = useMemo(() => {
    const totals: Record<string, number> = {};
    returnableLines.forEach((line) => {
      const qty = Math.max(0, quantities[line.lineId] ?? 0);
      if (qty <= 0) return;
      const variantId = lineVariantMap[line.lineId];
      if (!variantId) return;
      totals[variantId] = (totals[variantId] ?? 0) + qty;
    });
    return totals;
  }, [lineVariantMap, quantities, returnableLines]);

  const validateStepOne = () => {
    const hasInvalid = returnableLines.some((line) => {
      const qty = quantities[line.lineId] ?? 0;
      return qty < 0 || qty > line.returnableQty;
    });

    if (hasInvalid) {
      return "Return quantity cannot exceed the available returnable quantity.";
    }

    if (stockLoading) {
      return "Please wait. In-hand stock is still loading.";
    }

    for (const [variantId, selectedQty] of Object.entries(selectedQtyByVariant)) {
      const currentStock = inHandByVariant[variantId];
      if (currentStock === undefined) {
        return "Unable to validate in-hand stock for one or more lines. Please reload the source purchase.";
      }

      if (selectedQty > currentStock) {
        const sampleLine = returnableLines.find((line) => lineVariantMap[line.lineId] === variantId);
        const lineLabel = sampleLine
          ? `${sampleLine.productName} (${sampleLine.variantSize})`
          : "selected item";
        return `Return quantity for ${lineLabel} exceeds in-hand stock. In hand: ${currentStock}.`;
      }
    }

    return null;
  };

  const selectSupplier = (supplier: ApiSupplier) => {
    setSupplierId(supplier.id);
    setSupplierQuery(supplier.name);
    setSupplierOpen(false);
    setStep("select");
    setValidationError(null);
  };

  const updateQuantity = (lineId: string, nextValue: number) => {
    setQuantities((current) => ({
      ...current,
      [lineId]: Math.max(0, nextValue),
    }));
  };

  const handleContinue = () => {
    if (!supplierId) {
      setValidationError("Select a supplier before continuing.");
      return;
    }

    if (!purchaseId) {
      setValidationError("Select a source purchase before continuing.");
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

    const stepOneError = validateStepOne();
    if (stepOneError) {
      setValidationError(stepOneError);
      return;
    }

    if (reviewLines.length === 0) {
      setValidationError("Enter a return quantity for at least one line.");
      return;
    }

    setValidationError(null);
    setStep("review");
  };

  const handleConfirm = async () => {
    if (!selectedSupplier || reviewLines.length === 0) {
      setValidationError("Select a valid supplier return before confirming.");
      return;
    }

    setSubmitting(true);
    setPageError(null);
    setValidationError(null);

    try {
      const stepOneError = validateStepOne();
      if (stepOneError) {
        setValidationError(stepOneError);
        setStep("select");
        return;
      }

      const draft = await createSupplierReturnDraft({
        supplierId: selectedSupplier.id,
        transactionDate,
        lines: reviewLines.map((line) => ({
          sourceTransactionLineId: line.lineId,
          quantity: Math.trunc(line.quantity),
        })),
        notes: notes.trim() || undefined,
        idempotencyKey: generateId(),
      });

      const posted = await postTransaction(draft.id, {
        idempotencyKey: generateId(),
      });

      sessionStorage.setItem("transactionId", posted.id);
      router.push("/transactions/detail");
    } catch (err) {
      const apiErr = err as ApiError;
      setPageError(apiErr.message ?? "Failed to confirm supplier return.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6">
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className={`${panelClass} overflow-visible`}>
          <div className="border-b border-gray-200 px-4 py-4 dark:border-gray-800 sm:px-6 sm:py-5">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {step === "select" ? "Step 1 - Select Source" : "Step 2 - Review & Confirm"}
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {step === "select"
                    ? "Pick the supplier and source purchase, then enter the quantities to return."
                    : "Review the selected lines and confirm the supplier return."}
                </p>
              </div>
              <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {step === "select" ? "1 / 2" : "2 / 2"}
              </div>
            </div>
          </div>

          {step === "select" ? (
            <div className="space-y-6 px-4 py-5 sm:space-y-8 sm:px-6 sm:py-6">
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="relative" ref={supplierDropdownRef}>
                  <FieldLabel htmlFor="supplier-search" required>
                    Supplier
                  </FieldLabel>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <HiOutlineMagnifyingGlass size={18} />
                    </span>
                    <input
                      id="supplier-search"
                      value={supplierQuery}
                      onChange={(e) => {
                        setSupplierQuery(e.target.value);
                        setSupplierId("");
                        setSupplierOpen(true);
                      }}
                      onFocus={() => setSupplierOpen(true)}
                      placeholder={loading ? "Loading suppliers..." : "Search supplier by name"}
                      className={`${inputClass} pl-11`}
                      disabled={loading}
                    />
                  </div>
                  {supplierOpen && (
                    <div className="absolute z-30 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
                      {filteredSuppliers.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No suppliers found.</p>
                      ) : (
                        filteredSuppliers.map((supplier) => (
                          <button
                            key={supplier.id}
                            type="button"
                            onClick={() => selectSupplier(supplier)}
                            className="block w-full rounded-xl px-3 py-2 text-left transition hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                          >
                            <span className="block text-sm font-medium text-gray-800 dark:text-white/90">
                              {supplier.name}
                            </span>
                            <span className="block text-xs text-gray-500 dark:text-gray-400">
                              {formatPKR(supplier.currentBalance ?? 0)} current balance
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <FieldLabel htmlFor="source-purchase" required>
                    Source Purchase
                  </FieldLabel>
                  <select
                    id="source-purchase"
                    value={purchaseId}
                    onChange={(e) => setPurchaseId(e.target.value)}
                    className={inputClass}
                    disabled={!supplierId || purchasesLoading}
                  >
                    <option value="">{purchasesLoading ? "Loading purchases..." : "Select purchase"}</option>
                    {purchases.map((purchase) => (
                      <option key={purchase.id} value={purchase.id}>
                        {(purchase.documentNumber ?? "Undocumented") + " - " + fmtDate(purchase.transactionDate)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <FieldLabel required>Transaction Date</FieldLabel>
                  <DatePicker
                    id="supplier-return-date"
                    mode="single"
                    defaultDate={transactionDate}
                    placeholder="Select transaction date"
                    onChange={(selectedDates) => {
                      if (selectedDates[0]) {
                        setTransactionDate(toLocalDate(selectedDates[0]));
                      }
                    }}
                  />
                </div>

                <div>
                  <FieldLabel htmlFor="return-notes">Notes</FieldLabel>
                  <input
                    id="return-notes"
                    type="text"
                    value={notes}
                    maxLength={1000}
                    onChange={(e) => setNotes(e.target.value)}
                    className={`${inputClass} h-11`}
                    placeholder="Optional notes for this supplier return"
                  />
                  <p className="mt-1 text-right text-xs text-gray-500 dark:text-gray-400">{notes.length}/1000</p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800">
                <div className="mb-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">Return Lines</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Enter the quantity to return for each eligible purchase line.
                      Max allowed is limited by both source returnable quantity and current in-hand stock.
                    </p>
                  </div>
                </div>

                {linesLoading ? (
                  <div className="space-y-3 animate-pulse">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="h-12 rounded-xl bg-gray-100 dark:bg-gray-800" />
                    ))}
                  </div>
                ) : !purchaseId ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Select a source purchase to load its returnable lines.</p>
                ) : returnableLines.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No returnable lines available for this purchase.</p>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
                    <table className="w-full table-auto divide-y divide-gray-200 dark:divide-gray-800">
                      <thead className="bg-gray-50 dark:bg-gray-900/40">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Product</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Size</th>
                          <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">Original Qty</th>
                          <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">In-Hand Stock</th>
                          <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">Return Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {returnableLines.map((line) => {
                          const currentQty = quantities[line.lineId] ?? 0;
                          const variantId = lineVariantMap[line.lineId];
                          const inHand = variantId ? inHandByVariant[variantId] : undefined;
                          const selectedForVariant = variantId ? selectedQtyByVariant[variantId] ?? 0 : 0;
                          const exceedsReturnable = currentQty > line.returnableQty;
                          const exceedsInHand =
                            variantId && inHand !== undefined ? selectedForVariant > inHand : false;
                          const invalid = exceedsReturnable || exceedsInHand;
                          return (
                            <tr key={line.lineId}>
                              <td className="px-4 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                                {line.productName}
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{line.variantSize}</td>
                              <td className="px-3 py-4 text-right text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{line.originalQty}</td>
                              <td className="px-3 py-4 text-right text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                {stockLoading ? "Loading..." : inHand ?? "—"}
                              </td>
                              <td className="px-3 py-4 text-right">
                                <div className="ml-auto w-20">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={currentQty}
                                    onChange={(e) => {
                                      const raw = e.target.value.replace(/[^0-9]/g, "");
                                      updateQuantity(line.lineId, Number(raw || 0));
                                    }}
                                    className={`${inputClass} text-right ${
                                      invalid ? "border-warning-300 focus:border-warning-500 focus:ring-warning-500/20" : ""
                                    }`}
                                  />
                                  {invalid && (
                                    <p className="mt-1 text-left text-xs text-warning-600 dark:text-warning-400">
                                      Max {Math.min(line.returnableQty, inHand ?? line.returnableQty)}
                                    </p>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 border-t border-gray-200 pt-6 dark:border-gray-800 sm:flex-row sm:justify-end">
                <Button onClick={handleContinue} endIcon={<HiOutlineChevronRight size={16} />}>
                  Continue
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 px-4 py-5 sm:space-y-8 sm:px-6 sm:py-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Supplier</p>
                  <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">{selectedSupplier?.name ?? "—"}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Source Purchase</p>
                  <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">{selectedPurchase?.documentNumber ?? "—"}</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {selectedPurchase ? fmtDate(selectedPurchase.transactionDate) : ""}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
                <table className="w-full table-auto divide-y divide-gray-200 dark:divide-gray-800">
                  <thead className="bg-gray-50 dark:bg-gray-900/40">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Size</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Return Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {reviewLines.map((line) => (
                      <tr key={line.lineId}>
                        <td className="px-4 py-4 text-sm font-medium text-gray-800 dark:text-white/90">{line.productName}</td>
                        <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{line.variantSize}</td>
                        <td className="px-4 py-4 text-right text-sm text-gray-600 dark:text-gray-300">{line.quantity}</td>
                        <td className="px-4 py-4 text-right text-sm font-semibold text-gray-800 dark:text-white/90">
                          {formatPKR(line.lineCredit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rounded-2xl bg-gray-50 px-5 py-4 dark:bg-gray-900/40">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Credit Amount</span>
                  <span className="text-xl font-bold text-gray-900 dark:text-white">{formatPKR(totalCredit)}</span>
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  This is the estimated reduction in accounts payable for the selected supplier.
                </p>
              </div>

              <div className="flex flex-col gap-3 border-t border-gray-200 pt-6 dark:border-gray-800 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setStep("select")} disabled={submitting} startIcon={<HiOutlineChevronLeft size={16} />}>
                  Back
                </Button>
                <Button onClick={() => void handleConfirm()} disabled={submitting} startIcon={<HiOutlineCheckCircle size={18} />}>
                  {submitting ? "Confirming..." : "Confirm Return"}
                </Button>
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <section className={`${panelClass} p-4 sm:p-6`}>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400">
                <HiOutlineCheckCircle size={22} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Return Summary</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Current selection at a glance.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Supplier</span>
                <span className="font-medium text-gray-800 dark:text-white/90">{selectedSupplier?.name ?? "Not selected"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Source Purchase</span>
                <span className="font-medium text-gray-800 dark:text-white/90">{selectedPurchase?.documentNumber ?? "Not selected"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Selected Lines</span>
                <span className="font-medium text-gray-800 dark:text-white/90">{reviewLines.length}</span>
              </div>
              <div className="rounded-2xl bg-gray-50 px-4 py-4 dark:bg-gray-900/40">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Estimated Credit</span>
                  <span className="text-xl font-bold text-gray-900 dark:text-white">{formatPKR(totalCredit)}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 px-4 py-4 dark:border-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Return quantities are revalidated by the backend when the draft is created.
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
