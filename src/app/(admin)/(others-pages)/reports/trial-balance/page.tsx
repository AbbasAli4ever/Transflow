"use client";

import React, { useRef, useState } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import {
  HiOutlineCalendar,
  HiOutlineExclamationTriangle,
} from "react-icons/hi2";
import Button from "@/components/ui/button/Button";
import RateLimitBanner from "@/components/ui/RateLimitBanner";
import {
  getTrialBalance,
  TrialBalanceReport,
  TrialBalanceAccount,
  formatPKR,
} from "@/lib/reports";
import { ApiError, isRateLimitError } from "@/lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
  return formatDateStr(new Date());
}

function formatDateStr(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TrialBalancePage() {
  const [asOfDate, setAsOfDate] = useState(todayStr());
  const [report, setReport] = useState<TrialBalanceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [hasLoadedDefaultReport, setHasLoadedDefaultReport] = useState(false);

  const dateRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (dateRef.current) {
      flatpickr(dateRef.current, {
        dateFormat: "Y-m-d",
        defaultDate: asOfDate,
        onChange: ([d]) => {
          if (d) setAsOfDate(formatDateStr(d));
        },
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGenerate(targetDate?: string) {
    setLoading(true);
    setError(null);
    setRateLimited(false);
    try {
      const data = await getTrialBalance(targetDate);
      setReport(data);
      setAsOfDate(data.asOfDate);
    } catch (err) {
      if (isRateLimitError(err)) {
        setRateLimited(true);
      } else {
        const apiErr = err as ApiError;
        setError(apiErr.message ?? "Failed to generate report");
      }
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (hasLoadedDefaultReport) return;
    setHasLoadedDefaultReport(true);
    void handleGenerate();
  }, [hasLoadedDefaultReport]);

  const accounts: TrialBalanceAccount[] = report?.accounts ?? [];
  const balanced =
    report &&
    Math.abs(report.totals.totalDebits - report.totals.totalCredits) < 1; // integer PKR, should be exact

  return (
    <div className="w-full max-w-full mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Trial Balance
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          All account balances at a point in time.
        </p>
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
        <Button onClick={() => void handleGenerate(asOfDate)} disabled={loading} className="h-10 px-6">
          {loading ? "Generating…" : "Generate"}
        </Button>
      </div>

      {/* Error */}
      {rateLimited && (
        <RateLimitBanner onRetry={() => void handleGenerate(asOfDate)} />
      )}
      {error && !rateLimited && (
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
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">
                    Account
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">
                    Debit
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">
                    Credit
                  </th>
                </tr>
              </thead>
              <tbody>
                {accounts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="text-center py-12 text-gray-400 dark:text-gray-500"
                    >
                      No accounts found for {asOfDate}.
                    </td>
                  </tr>
                ) : (
                  accounts.map((acc, i) => {
                    const hasDebit = acc.totalDebit > 0;
                    const hasCredit = acc.totalCredit > 0;
                    return (
                      <tr
                        key={i}
                        className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40"
                      >
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {acc.accountName}
                        </td>
                        <td className="text-right px-4 py-3">
                          {hasDebit ? (
                            <span className="text-green-600 dark:text-green-400 font-medium">
                              {acc.totalDebit.toLocaleString("en-PK")}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-600">—</span>
                          )}
                        </td>
                        <td className="text-right px-4 py-3">
                          {hasCredit ? (
                            <span className="text-red-600 dark:text-red-400 font-medium">
                              {acc.totalCredit.toLocaleString("en-PK")}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-600">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {accounts.length > 0 && (
                <tfoot>
                  <tr className="bg-blue-50 dark:bg-blue-900/20 border-t-2 border-blue-200 dark:border-blue-800">
                    <td className="px-4 py-3 font-bold text-blue-700 dark:text-blue-400 uppercase text-xs tracking-wide">
                      Totals
                    </td>
                    <td className="text-right px-4 py-3 font-bold text-blue-700 dark:text-blue-400">
                      {report.totals.totalDebits.toLocaleString("en-PK")}
                    </td>
                    <td className="text-right px-4 py-3 font-bold text-blue-700 dark:text-blue-400">
                      {report.totals.totalCredits.toLocaleString("en-PK")}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {accounts.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2">
              {balanced ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                  Balanced — Debit equals Credit
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-medium">
                  <HiOutlineExclamationTriangle className="w-4 h-4" />
                  Out of balance by{" "}
                  {formatPKR(Math.abs(report.totals.totalDebits - report.totals.totalCredits))}
                </span>
              )}
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
