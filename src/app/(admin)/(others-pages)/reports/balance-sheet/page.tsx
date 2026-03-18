"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { HiOutlineCalendar, HiOutlineExclamationTriangle } from "react-icons/hi2";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import RateLimitBanner from "@/components/ui/RateLimitBanner";
import { useAuth } from "@/context/AuthContext";
import { ApiError, isRateLimitError } from "@/lib/api";
import { BalanceSheetReport, formatPKR, getBalanceSheet } from "@/lib/reports";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-1 pt-4 pb-1">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
        {label}
      </p>
    </div>
  );
}

function getBreakdownRows(
  value: Array<{ name: string; balance: number }> | number | undefined,
  fallbackLabel: string
) {
  if (Array.isArray(value)) return value;
  if (typeof value === "number") {
    return [{ name: fallbackLabel, balance: value }];
  }
  return [];
}

function getSectionTotal(
  value: Array<{ name: string; balance: number }> | number | undefined,
  explicitTotal: number | undefined
) {
  if (typeof explicitTotal === "number") return explicitTotal;
  if (typeof value === "number") return value;
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + item.balance, 0);
  return 0;
}

function ReportRow({
  label,
  value,
  variant = "normal",
}: {
  label: string;
  value: number;
  variant?: "normal" | "total";
}) {
  const isTotal = variant === "total";

  return (
    <div
      className={`flex items-center justify-between rounded-lg px-4 py-3 ${
        isTotal
          ? "border border-blue-100 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
          : "border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/40"
      }`}
    >
      <span
        className={
          isTotal
            ? "text-base font-bold uppercase tracking-wide text-blue-700 dark:text-blue-400"
            : "text-sm text-gray-700 dark:text-gray-300"
        }
      >
        {label}
      </span>
      <span
        className={
          isTotal
            ? "text-base font-bold text-blue-700 dark:text-blue-400"
            : "text-sm font-medium text-gray-800 dark:text-gray-200"
        }
      >
        {formatPKR(value)}
      </span>
    </div>
  );
}

export default function BalanceSheetPage() {
  const { user, isLoading: authLoading } = useAuth();
  const canView = user?.role === "OWNER" || user?.role === "ADMIN";

  const [asOfDate, setAsOfDate] = useState(todayStr());
  const [report, setReport] = useState<BalanceSheetReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
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
    setRateLimited(false);
    try {
      const data = await getBalanceSheet(asOfDate);
      setReport(data);
    } catch (err) {
      if (isRateLimitError(err)) {
        setRateLimited(true);
      } else {
        const apiErr = err as ApiError;
        setError(apiErr.message ?? "Failed to generate balance sheet.");
      }
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

  if (!authLoading && !canView) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-lg font-medium text-gray-500">Balance Sheet is restricted.</p>
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

  const liabilitiesAndEquity = report
    ? report.totalLiabilitiesAndEquity ??
      report.liabilities.totalLiabilities + report.equity.totalEquity
    : 0;

  const cashRows = report ? getBreakdownRows(report.assets.cash, "Cash & Bank") : [];
  const receivableRows = report
    ? getBreakdownRows(report.assets.accountsReceivable, "Accounts Receivable")
    : [];
  const inventoryRows = report
    ? getBreakdownRows(report.assets.inventory, "Inventory")
    : [];
  const payableRows = report
    ? getBreakdownRows(report.liabilities.accountsPayable, "Accounts Payable")
    : [];
  const totalCash = report
    ? getSectionTotal(report.assets.cash, report.assets.totalCash)
    : 0;
  const totalAccountsReceivable = report
    ? getSectionTotal(
        report.assets.accountsReceivable,
        report.assets.totalAccountsReceivable
      )
    : 0;
  const totalInventory = report
    ? getSectionTotal(report.assets.inventory, report.assets.totalInventory)
    : 0;
  const totalAccountsPayable = report
    ? getSectionTotal(
        report.liabilities.accountsPayable,
        report.liabilities.totalAccountsPayable
      )
    : 0;

  return (
    <div className="mx-auto w-full max-w-full">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Balance Sheet Report
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Review assets, liabilities, and equity as of a specific date.
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

      {rateLimited && (
        <RateLimitBanner onRetry={() => void handleGenerate()} />
      )}
      {error && !rateLimited && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <HiOutlineExclamationTriangle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {report && (
        <>
          {!report.isBalanced && (
            <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              <HiOutlineExclamationTriangle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">
                Balance sheet is out of balance — contact support.
              </span>
            </div>
          )}

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                As of {report.asOfDate}
              </p>
              <Badge
                variant="light"
                size="sm"
                color={report.isBalanced ? "success" : "error"}
              >
                {report.isBalanced ? "Balanced" : "Out of balance"}
              </Badge>
            </div>

            <div className="space-y-1">
              <SectionHeader label="Assets" />
              {cashRows.map((item) => (
                <ReportRow key={`cash-${item.name}`} label={item.name} value={item.balance} />
              ))}
              <ReportRow
                label="Cash & Bank"
                value={totalCash}
                variant="total"
              />
              {receivableRows.map((item) => (
                <ReportRow key={`receivable-${item.name}`} label={item.name} value={item.balance} />
              ))}
              <ReportRow
                label="Accounts Receivable"
                value={totalAccountsReceivable}
                variant="total"
              />
              {inventoryRows.map((item) => (
                <ReportRow key={`inventory-${item.name}`} label={item.name} value={item.balance} />
              ))}
              <ReportRow
                label="Inventory"
                value={totalInventory}
                variant="total"
              />
              <ReportRow label="Total Assets" value={report.assets.totalAssets} variant="total" />

              <SectionHeader label="Liabilities" />
              {payableRows.map((item) => (
                <ReportRow key={`payable-${item.name}`} label={item.name} value={item.balance} />
              ))}
              <ReportRow
                label="Accounts Payable"
                value={totalAccountsPayable}
                variant="total"
              />
              <ReportRow
                label="Total Liabilities"
                value={report.liabilities.totalLiabilities}
                variant="total"
              />

              <SectionHeader label="Equity" />
              <ReportRow label="Opening Capital" value={report.equity.openingCapital} />
              <ReportRow label="Retained Earnings" value={report.equity.retainedEarnings} />
              <ReportRow label="Total Equity" value={report.equity.totalEquity} variant="total" />

              <div className="pt-2" />
              <ReportRow
                label="Total Liabilities + Equity"
                value={liabilitiesAndEquity}
                variant="total"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
