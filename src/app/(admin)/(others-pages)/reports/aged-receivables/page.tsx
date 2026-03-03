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
  getPendingReceivables,
  PendingReceivablesReport,
  ReceivableCustomer,
  formatPKR,
} from "@/lib/reports";
import { ApiError } from "@/lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Bucket a customer's openDocuments into aging bands
// Returns { b0_30, b31_60, b61_90, b90plus }
interface AgingBuckets {
  b0_30: number;
  b31_60: number;
  b61_90: number;
  b90plus: number;
  total: number;
}

function computeAgingBuckets(customer: ReceivableCustomer): AgingBuckets {
  const buckets: AgingBuckets = {
    b0_30: 0,
    b31_60: 0,
    b61_90: 0,
    b90plus: 0,
    total: 0,
  };

  const docs = customer.openDocuments ?? [];
  for (const doc of docs) {
    const days = doc.daysPastDue ?? 0;
    const amt = doc.outstanding ?? 0;
    buckets.total += amt;
    if (days <= 30) buckets.b0_30 += amt;
    else if (days <= 60) buckets.b31_60 += amt;
    else if (days <= 90) buckets.b61_90 += amt;
    else buckets.b90plus += amt;
  }

  // If API doesn't return openDocuments, fall back to totalOutstanding in 0-30
  if (docs.length === 0) {
    const outstanding =
      customer.netOutstanding ?? customer.totalOutstanding ?? customer.balance ?? 0;
    buckets.total = outstanding;
    buckets.b0_30 = outstanding;
  }

  return buckets;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AgedReceivablesPage() {
  const [asOfDate, setAsOfDate] = useState(todayStr());
  const [report, setReport] = useState<PendingReceivablesReport | null>(null);
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
      const data = await getPendingReceivables(asOfDate);
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

  // Normalize: API may return receivables[] or customers[]
  const rows: ReceivableCustomer[] = report
    ? (report.receivables ?? report.customers ?? [])
    : [];

  // Compute per-row buckets
  const rowsWithBuckets = rows.map((r) => ({
    ...r,
    buckets: computeAgingBuckets(r),
  }));

  // Column totals
  const totals = rowsWithBuckets.reduce(
    (acc, r) => ({
      b0_30: acc.b0_30 + r.buckets.b0_30,
      b31_60: acc.b31_60 + r.buckets.b31_60,
      b61_90: acc.b61_90 + r.buckets.b61_90,
      b90plus: acc.b90plus + r.buckets.b90plus,
      total: acc.total + r.buckets.total,
    }),
    { b0_30: 0, b31_60: 0, b61_90: 0, b90plus: 0, total: 0 }
  );

  function navigateToCustomer(customerId: string) {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("customerId", customerId);
      window.location.href = "/customer/detail";
    }
  }

  return (
    <div className="w-full max-w-full  mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Aged Receivables Report
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Track what customers owe and how overdue balances are.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4 mb-8">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            As of Date
          </label>
          <div className="relative">
            <input
              ref={dateRef}
              type="text"
              value={asOfDate}
              className="h-10 pl-3 pr-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 w-40"
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

      {/* Table */}
      {report && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 w-64">
                    Customer Name
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">
                    Current (0–30)
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">
                    31–60
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">
                    61–90
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">
                    90+
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">
                    Total Outstanding
                  </th>
                </tr>
              </thead>
              <tbody>
                {rowsWithBuckets.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-12 text-gray-400 dark:text-gray-500"
                    >
                      No outstanding receivables as of {asOfDate}.
                    </td>
                  </tr>
                ) : (
                  rowsWithBuckets.map((row) => {
                    const hasOverdue = row.buckets.b90plus > 0;
                    return (
                      <tr
                        key={row.customerId}
                        className={`border-b border-gray-50 dark:border-gray-800 ${
                          hasOverdue
                            ? "bg-red-50 dark:bg-red-900/10"
                            : "hover:bg-gray-50 dark:hover:bg-gray-800/40"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <button
                            onClick={() => navigateToCustomer(row.customerId)}
                            className="text-brand-600 dark:text-brand-400 hover:underline font-medium text-left"
                          >
                            {row.customerName}
                          </button>
                        </td>
                        <td className="text-right px-4 py-3 text-gray-700 dark:text-gray-300">
                          {row.buckets.b0_30 > 0
                            ? row.buckets.b0_30.toLocaleString("en-PK")
                            : "0"}
                        </td>
                        <td className="text-right px-4 py-3 text-gray-700 dark:text-gray-300">
                          {row.buckets.b31_60 > 0
                            ? row.buckets.b31_60.toLocaleString("en-PK")
                            : "0"}
                        </td>
                        <td className="text-right px-4 py-3 text-gray-700 dark:text-gray-300">
                          {row.buckets.b61_90 > 0
                            ? row.buckets.b61_90.toLocaleString("en-PK")
                            : "0"}
                        </td>
                        <td
                          className={`text-right px-4 py-3 font-medium ${
                            hasOverdue
                              ? "text-red-600 dark:text-red-400"
                              : "text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {row.buckets.b90plus > 0
                            ? row.buckets.b90plus.toLocaleString("en-PK")
                            : "0"}
                        </td>
                        <td className="text-right px-4 py-3 font-semibold text-gray-800 dark:text-gray-200">
                          {row.buckets.total.toLocaleString("en-PK")}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {rowsWithBuckets.length > 0 && (
                <tfoot>
                  <tr className="bg-blue-50 dark:bg-blue-900/20 border-t-2 border-blue-200 dark:border-blue-800">
                    <td className="px-4 py-3 font-bold text-blue-700 dark:text-blue-400 uppercase text-xs tracking-wide">
                      Totals
                    </td>
                    <td className="text-right px-4 py-3 font-bold text-blue-700 dark:text-blue-400">
                      {totals.b0_30.toLocaleString("en-PK")}
                    </td>
                    <td className="text-right px-4 py-3 font-bold text-blue-700 dark:text-blue-400">
                      {totals.b31_60.toLocaleString("en-PK")}
                    </td>
                    <td className="text-right px-4 py-3 font-bold text-blue-700 dark:text-blue-400">
                      {totals.b61_90.toLocaleString("en-PK")}
                    </td>
                    <td
                      className={`text-right px-4 py-3 font-bold ${
                        totals.b90plus > 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-blue-700 dark:text-blue-400"
                      }`}
                    >
                      {totals.b90plus.toLocaleString("en-PK")}
                    </td>
                    <td className="text-right px-4 py-3 font-bold text-blue-700 dark:text-blue-400">
                      {totals.total.toLocaleString("en-PK")}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {rowsWithBuckets.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Rows are highlighted in red when the 90+ bucket has an amount.
                Click customer names to open Customer Open Documents.
              </p>
            </div>
          )}
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
