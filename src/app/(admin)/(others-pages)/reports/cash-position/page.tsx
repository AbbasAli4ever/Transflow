"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { HiOutlineCalendar, HiOutlineExclamationTriangle } from "react-icons/hi2";
import Button from "@/components/ui/button/Button";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import {
  CashPositionAccountType,
  CashPositionReport,
  formatPKR,
  getCashPosition,
} from "@/lib/reports";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getTypeBadgeClass(type: CashPositionAccountType) {
  switch (type) {
    case "CASH":
      return "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500";
    case "BANK":
      return "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400";
    case "WALLET":
      return "bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-500/15 dark:text-fuchsia-400";
    case "CARD":
      return "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-white/80";
  }
}

export default function CashPositionPage() {
  const { user, isLoading: authLoading } = useAuth();
  const canView = user?.role === "OWNER" || user?.role === "ADMIN";

  const [asOfDate, setAsOfDate] = useState(todayStr());
  const [report, setReport] = useState<CashPositionReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedDefaultReport, setHasLoadedDefaultReport] = useState(false);

  const dateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!dateRef.current) return;

    flatpickr(dateRef.current, {
      dateFormat: "Y-m-d",
      defaultDate: asOfDate,
      onChange: ([date]) => {
        if (date) setAsOfDate(date.toISOString().slice(0, 10));
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGenerate() {
    if (!asOfDate) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getCashPosition(asOfDate);
      setReport(data);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? "Failed to generate cash position report.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading || !canView || hasLoadedDefaultReport) return;
    setHasLoadedDefaultReport(true);
    void handleGenerate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, canView, hasLoadedDefaultReport]);

  const sortedAccounts = useMemo(
    () => [...(report?.accounts ?? [])].sort((a, b) => b.balance - a.balance),
    [report]
  );

  if (!authLoading && !canView) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-lg font-medium text-gray-500">Cash Position is restricted.</p>
        <p className="max-w-md text-sm text-gray-400">
          Only OWNER or ADMIN can access this report.
        </p>
        <Link href="/">
          <Button variant="outline" size="sm">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-full">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Cash Position Report
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Review current cash balances across all payment accounts.
          </p>
        </div>
        <button
          disabled
          className="cursor-not-allowed rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-400 dark:border-gray-700 dark:text-gray-500"
        >
          Export (Coming soon)
        </button>
      </div>

      <div className="mb-8 flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
            As of Date
          </label>
          <div className="relative">
            <input
              ref={dateRef}
              type="text"
              value={asOfDate}
              readOnly
              className="h-10 w-40 rounded-lg border border-gray-200 bg-white pl-3 pr-9 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
            <HiOutlineCalendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
        <Button onClick={handleGenerate} disabled={loading} className="h-10 px-6">
          {loading ? "Generating…" : "Generate"}
        </Button>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <HiOutlineExclamationTriangle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {report && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Total Cash as of {report.asOfDate}
            </p>
            <p className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
              {formatPKR(report.totalCash)}
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Account Balances
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Accounts are sorted by balance from highest to lowest.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Account Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Type
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAccounts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                      >
                        No cash accounts found for the selected date.
                      </td>
                    </tr>
                  ) : (
                    sortedAccounts.map((account) => (
                      <tr
                        key={account.accountId}
                        className="border-b border-gray-100 last:border-b-0 dark:border-gray-800"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                          {account.accountName}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getTypeBadgeClass(
                              account.accountType
                            )}`}
                          >
                            {account.accountType}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">
                          {formatPKR(account.balance)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
