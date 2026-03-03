"use client";

import React, { useRef, useState } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import {
  HiOutlineCalendar,
  HiOutlineExclamationTriangle,
} from "react-icons/hi2";
import Button from "@/components/ui/button/Button";
import {
  getInventoryValuation,
  InventoryValuationReport,
  InventoryProduct,
  formatPKR,
} from "@/lib/reports";
import { ApiError } from "@/lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InventoryValuationPage() {
  const [asOfDate, setAsOfDate] = useState(todayStr());
  const [report, setReport] = useState<InventoryValuationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedDefaultReport, setHasLoadedDefaultReport] = useState(false);

  const dateRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (dateRef.current) {
      flatpickr(dateRef.current, {
        dateFormat: "Y-m-d",
        defaultDate: asOfDate,
        onChange: ([d]) => {
          if (d) setAsOfDate(d.toISOString().slice(0, 10));
        },
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const data = await getInventoryValuation(asOfDate);
      setReport(data);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? "Failed to generate report");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (hasLoadedDefaultReport) return;
    setHasLoadedDefaultReport(true);
    void handleGenerate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLoadedDefaultReport]);

  const products: InventoryProduct[] = report?.products ?? [];

  function navigateToProduct(productId: string) {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("productId", productId);
      window.location.href = "/products/detail";
    }
  }

  return (
    <div className="w-full max-w-full mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Inventory Valuation Report
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Stock on hand value by product.
          </p>
        </div>
        <button
          disabled
          className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-400 dark:text-gray-500 cursor-not-allowed"
        >
          Export
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4 mb-8">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            As of
          </label>
          <div className="relative">
            <input
              ref={dateRef}
              type="text"
              value={asOfDate}
              className="h-10 pl-3 pr-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 w-44"
              readOnly
            />
            <HiOutlineCalendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          </div>
        </div>
        <Button onClick={handleGenerate} disabled={loading} className="h-10 px-6">
          {loading ? "Generating…" : "Generate"}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
          <HiOutlineExclamationTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Report */}
      {report && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 w-56">
                    Product Name
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">
                    Size
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">
                    SKU
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">
                    Category
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">
                    Qty on Hand
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">
                    Avg Cost
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">
                    Total Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-center py-12 text-gray-400 dark:text-gray-500"
                    >
                      No inventory found as of {asOfDate}.
                    </td>
                  </tr>
                ) : (
                  products.map((product) =>
                    product.variants.map((variant, vIdx) => (
                      <tr
                        key={variant.variantId}
                        className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40"
                      >
                        {/* Product name only in first variant row */}
                        <td className="px-4 py-3">
                          {vIdx === 0 ? (
                            <button
                              onClick={() => navigateToProduct(product.productId)}
                              className="text-brand-600 dark:text-brand-400 hover:underline font-medium text-left"
                            >
                              {product.productName}
                            </button>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {variant.size}
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">
                          {variant.sku ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                          {product.category ?? "—"}
                        </td>
                        <td className="text-right px-4 py-3 text-gray-700 dark:text-gray-300">
                          {variant.qtyOnHand.toLocaleString("en-PK")}
                        </td>
                        <td className="text-right px-4 py-3 text-gray-700 dark:text-gray-300">
                          {formatPKR(variant.avgCost)}
                        </td>
                        <td className="text-right px-4 py-3 text-gray-700 dark:text-gray-300">
                          {formatPKR(variant.totalValue)}
                        </td>
                      </tr>
                    ))
                  )
                )}

                {/* Per-product subtotals */}
                {products.map((product) => (
                  <tr
                    key={`sub-${product.productId}`}
                    className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700"
                  >
                    <td
                      colSpan={4}
                      className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 italic"
                    >
                      Sub-total — {product.productName}
                    </td>
                    <td className="text-right px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                      Total Qty: {product.productTotalQty.toLocaleString("en-PK")}
                    </td>
                    <td />
                    <td className="text-right px-4 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                      Total Value: {formatPKR(product.productTotalValue)}
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Grand total */}
              {products.length > 0 && (
                <tfoot>
                  <tr className="bg-blue-50 dark:bg-blue-900/20 border-t-2 border-blue-200 dark:border-blue-800">
                    <td
                      colSpan={6}
                      className="px-4 py-3 font-bold text-blue-700 dark:text-blue-400"
                    >
                      Grand Total Inventory Value
                    </td>
                    <td className="text-right px-4 py-3 font-bold text-blue-700 dark:text-blue-400 text-base">
                      {formatPKR(report.grandTotalValue)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!report && !loading && !error && (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-sm">No report data found for the selected date.</p>
        </div>
      )}
    </div>
  );
}
