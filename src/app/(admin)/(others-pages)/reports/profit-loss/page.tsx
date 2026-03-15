"use client";

import React, { useRef, useState } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { HiOutlineCalendar, HiOutlineExclamationTriangle } from "react-icons/hi2";
import Button from "@/components/ui/button/Button";
import { getProfitLossReport, ProfitLossReport, formatPKR } from "@/lib/reports";
import { ApiError } from "@/lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoStr(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// ─── Row Component ────────────────────────────────────────────────────────────

interface ReportRowProps {
  label: string;
  value: number;
  variant?: "normal" | "deduction" | "highlight" | "total" | "margin" | "netIncome";
}

function ReportRow({ label, value, variant = "normal" }: ReportRowProps) {
  const isDeduction = variant === "deduction";
  const isHighlight = variant === "highlight";
  const isTotal = variant === "total";
  const isMargin = variant === "margin";
  const isNetIncome = variant === "netIncome";
  const isProfit = isNetIncome && value >= 0;

  const rowClass = isNetIncome
    ? isProfit
      ? "bg-success-50 dark:bg-success-900/20 border border-success-100 dark:border-success-800"
      : "bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900"
    : isHighlight
    ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800"
    : isDeduction
    ? "bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900"
    : isMargin
    ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800"
    : "border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/40";

  const labelClass = isNetIncome
    ? isProfit
      ? "text-base font-bold text-success-700 dark:text-success-400 uppercase tracking-wide"
      : "text-base font-bold text-red-700 dark:text-red-400 uppercase tracking-wide"
    : isHighlight
    ? "text-base font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide"
    : isDeduction
    ? "text-sm text-red-600 dark:text-red-400"
    : isMargin
    ? "text-base font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide"
    : "text-sm text-gray-700 dark:text-gray-300";

  const valueClass = isNetIncome
    ? isProfit
      ? "text-base font-bold text-success-700 dark:text-success-400"
      : "text-base font-bold text-red-700 dark:text-red-400"
    : isHighlight
    ? "text-base font-bold text-blue-700 dark:text-blue-400"
    : isDeduction
    ? "text-sm font-medium text-red-600 dark:text-red-400"
    : isMargin
    ? "text-base font-bold text-gray-800 dark:text-gray-200"
    : isTotal
    ? "text-sm font-semibold text-gray-800 dark:text-gray-200"
    : "text-sm text-gray-700 dark:text-gray-300";

  const displayValue =
    isMargin
      ? `${value.toFixed(1)}%`
      : isDeduction
      ? `(${formatPKR(Math.abs(value))})`
      : formatPKR(value);

  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-lg ${rowClass}`}>
      <span className={labelClass}>{label}</span>
      <div className="flex items-center gap-4">
        <span className={valueClass}>{displayValue}</span>
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-1 pt-4 pb-1">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
        {label}
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfitLossPage() {
  const [dateFrom, setDateFrom] = useState(daysAgoStr(30));
  const [dateTo, setDateTo] = useState(todayStr());
  const [report, setReport] = useState<ProfitLossReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedDefaultReport, setHasLoadedDefaultReport] = useState(false);

  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);
  const operatingExpenseRows = report?.operatingExpenses.byCategory.filter((item) => item.amount !== 0) ?? [];
  const grossProfitMargin =
    report && report.revenue.netRevenue !== 0
      ? (report.grossProfit / report.revenue.netRevenue) * 100
      : null;

  // Init flatpickr
  React.useEffect(() => {
    if (fromRef.current) {
      flatpickr(fromRef.current, {
        dateFormat: "Y-m-d",
        defaultDate: dateFrom,
        onChange: ([d]) => {
          if (d) setDateFrom(d.toISOString().slice(0, 10));
        },
      });
    }
    if (toRef.current) {
      flatpickr(toRef.current, {
        dateFormat: "Y-m-d",
        defaultDate: dateTo,
        onChange: ([d]) => {
          if (d) setDateTo(d.toISOString().slice(0, 10));
        },
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGenerate() {
    if (!dateFrom || !dateTo) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getProfitLossReport(dateFrom, dateTo);
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

  return (
    <div className="w-full max-w-full mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Profit &amp; Loss Report
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Review profitability across the selected date range.
          </p>
        </div>
        <button
          disabled
          className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-400 dark:text-gray-500 cursor-not-allowed"
        >
          Export (Coming soon)
        </button>
      </div>

      {/* Date Controls */}
      <div className="flex flex-wrap items-end gap-4 mb-8">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Date From
          </label>
          <div className="relative">
            <input
              ref={fromRef}
              type="text"
              value={dateFrom}
              className="h-10 pl-3 pr-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 w-40"
              readOnly
            />
            <HiOutlineCalendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Date To
          </label>
          <div className="relative">
            <input
              ref={toRef}
              type="text"
              value={dateTo}
              className="h-10 pl-3 pr-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 w-40"
              readOnly
            />
            <HiOutlineCalendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          </div>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={loading}
          className="h-10 px-6"
        >
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
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-1">
          <SectionHeader label="Revenue" />
          <ReportRow label="Sales Revenue" value={report.revenue.salesRevenue} />
          <ReportRow
            label="Less: Sales Returns"
            value={report.revenue.salesReturns}
            variant="deduction"
          />
          <ReportRow label="Net Revenue" value={report.revenue.netRevenue} variant="total" />

          <SectionHeader label="Cost of Goods Sold" />
          <ReportRow label="Cost of Goods Sold" value={report.costOfGoodsSold} variant="deduction" />

          <div className="pt-2" />
          <ReportRow label="Gross Profit" value={report.grossProfit} variant="highlight" />
          {grossProfitMargin !== null ? (
            <ReportRow label="Gross Profit Margin" value={grossProfitMargin} variant="margin" />
          ) : (
            <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
              <span className="text-base font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">
                Gross Profit Margin
              </span>
              <span className="text-base font-bold text-gray-800 dark:text-gray-200">—</span>
            </div>
          )}

          <SectionHeader label="Operating Expenses" />
          {operatingExpenseRows.length === 0 ? (
            <div className="flex items-center justify-between px-4 py-3 rounded-lg border border-gray-100 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              <span>No operating expenses in this period.</span>
              <span>{formatPKR(0)}</span>
            </div>
          ) : (
            operatingExpenseRows.map((item) => (
              <ReportRow
                key={item.categoryName}
                label={item.categoryName}
                value={item.amount}
                variant="deduction"
              />
            ))
          )}
          <ReportRow
            label="Total Operating Expenses"
            value={report.operatingExpenses.total}
            variant="deduction"
          />

          <div className="pt-2" />
          <ReportRow label="Net Income" value={report.netIncome} variant="netIncome" />

          <p className="text-xs text-gray-400 dark:text-gray-500 pt-4 px-1">
            Each line is clickable to drill into the transactions behind that number.
          </p>
        </div>
      )}

      {/* Empty state before generation */}
      {!report && !loading && !error && (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-sm">No report data found for the selected date range.</p>
        </div>
      )}
    </div>
  );
}
