"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  HiOutlineArrowPath,
  HiOutlineChevronRight,
  HiOutlineExclamationTriangle,
  HiOutlineShoppingCart,
  HiOutlineArrowDownTray,
  HiOutlineCreditCard,
  HiOutlineArrowUpTray,
} from "react-icons/hi2";
import {
  getDashboardSummary,
  DashboardSummary,
} from "@/lib/dashboard";
import {
  listTransactions,
  formatPKR,
  ApiTransaction,
  TransactionType,
  TransactionStatus,
} from "@/lib/suppliers";
import { ApiError } from "@/lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

// ─── TX Color Maps ────────────────────────────────────────────────────────────

const TX_TYPE_COLORS: Record<TransactionType, string> = {
  SALE: "text-blue-800 font-semibold dark:text-blue-400",
  PURCHASE: "text-amber-800 font-semibold dark:text-amber-400",
  SUPPLIER_PAYMENT: "text-sky-900 font-semibold dark:text-sky-400",
  CUSTOMER_PAYMENT: "text-sky-900 font-semibold dark:text-sky-400",
  SUPPLIER_RETURN: "text-purple-700 font-semibold dark:text-purple-400",
  CUSTOMER_RETURN: "text-purple-700 font-semibold dark:text-purple-400",
  INTERNAL_TRANSFER: "text-gray-600 font-semibold dark:text-gray-400",
  ADJUSTMENT: "text-gray-600 font-semibold dark:text-gray-400",
};

const TX_STATUS_COLORS: Record<TransactionStatus, string> = {
  POSTED: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400",
  DRAFT: "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-400",
  VOIDED: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400",
};

const TX_TYPE_LABEL: Record<TransactionType, string> = {
  SALE: "Sale",
  PURCHASE: "Purchase",
  SUPPLIER_PAYMENT: "Supplier Pmt",
  CUSTOMER_PAYMENT: "Customer Pmt",
  SUPPLIER_RETURN: "Supplier Ret",
  CUSTOMER_RETURN: "Customer Ret",
  INTERNAL_TRANSFER: "Transfer",
  ADJUSTMENT: "Adjustment",
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-5 gap-3.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-[150px] rounded-xl bg-gray-200 dark:bg-gray-700" />
        ))}
      </div>
      {/* Middle row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="h-[260px] rounded-xl bg-gray-200 dark:bg-gray-700" />
        <div className="h-[260px] rounded-xl bg-gray-200 dark:bg-gray-700" />
      </div>
      {/* Bottom row */}
      <div className="flex gap-4">
        <div className="h-64 flex-1 rounded-xl bg-gray-200 dark:bg-gray-700" />
        <div className="h-64 w-80 rounded-xl bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  isOverdue = false,
}: {
  label: string;
  value: string;
  sub: string;
  isOverdue?: boolean;
}) {
  const borderClass = isOverdue
    ? "border-red-200 dark:border-red-800"
    : "border-gray-200 dark:border-gray-700";
  const barClass = isOverdue ? "bg-red-400" : "bg-green-400";
  const valueClass = isOverdue
    ? "text-red-700 dark:text-red-400"
    : "text-gray-900 dark:text-white";
  const subClass = isOverdue
    ? "text-red-400 dark:text-red-500"
    : "text-gray-500 dark:text-gray-400";

  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border bg-white p-3.5 dark:bg-gray-900 ${borderClass}`}
    >
      <div className={`h-1 w-10 rounded-full ${barClass}`} />
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-lg font-bold leading-tight ${valueClass}`}>{value}</p>
      <p className={`text-xs ${subClass}`}>{sub}</p>
    </div>
  );
}

// ─── CashByAccountPanel ───────────────────────────────────────────────────────

function CashByAccountPanel({
  accounts,
}: {
  accounts: DashboardSummary["cash"]["accounts"];
}) {
  return (
    <div className="flex h-[260px] flex-col gap-3 overflow-hidden rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <p className="shrink-0 text-sm font-semibold text-gray-800 dark:text-white">
        Cash by Account
      </p>
      {/* Sub-header */}
      <div className="flex shrink-0 items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Account
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Balance
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {accounts.length === 0 ? (
          <p className="py-4 text-center text-xs text-gray-400 dark:text-gray-500">
            No accounts found.
          </p>
        ) : (
          accounts.map((acc) => (
            <div
              key={acc.id ?? acc.name}
              className="flex h-[30px] items-center justify-between border-b border-gray-100 last:border-0 dark:border-gray-800"
            >
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {acc.name}
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {formatPKR(acc.balance)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── RvsPPanel (Receivables vs Payables) ──────────────────────────────────────

function RvsPPanel({
  receivables,
  payables,
}: {
  receivables: DashboardSummary["receivables"];
  payables: DashboardSummary["payables"];
}) {
  const recv = receivables.totalAmount;
  const pay = payables.totalAmount;
  const maxVal = Math.max(recv, pay, 1);
  const recvPct = (recv / maxVal) * 100;
  const payPct = (pay / maxVal) * 100;

  const delta = recv - pay;
  const deltaText =
    delta > 0
      ? `Receivables exceed payables by ${formatPKR(delta)}`
      : delta < 0
      ? `Payables exceed receivables by ${formatPKR(Math.abs(delta))}`
      : "Receivables and payables are equal";

  return (
    <div className="flex h-[260px] flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <p className="text-sm font-semibold text-gray-800 dark:text-white">
        Receivables vs Payables
      </p>

      {/* Receivables */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Total Receivables
          </span>
          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
            {formatPKR(recv)}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-blue-100 dark:bg-blue-900/30">
          <div
            className="h-2 rounded-full bg-blue-500"
            style={{ width: `${recvPct}%` }}
          />
        </div>
      </div>

      {/* Payables */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Total Payables
          </span>
          <span className="text-sm font-bold text-red-600 dark:text-red-400">
            {formatPKR(pay)}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-red-100 dark:bg-red-900/30">
          <div
            className="h-2 rounded-full bg-red-500"
            style={{ width: `${payPct}%` }}
          />
        </div>
      </div>

      {/* Delta */}
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {deltaText}
        </span>
      </div>
    </div>
  );
}

// ─── RecentActivityTable ──────────────────────────────────────────────────────

function RecentActivityTable({ transactions }: { transactions: ApiTransaction[] }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800 dark:text-white">
          Recent Activity
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Last 10 transactions
        </p>
      </div>

      {/* Column headers */}
      <div className="flex h-[30px] items-center gap-2 rounded-lg bg-slate-50 px-3 dark:bg-gray-800">
        <span className="w-[110px] shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">
          Date
        </span>
        <span className="w-[110px] shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">
          Type
        </span>
        <span className="flex-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
          Party
        </span>
        <span className="w-[120px] shrink-0 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">
          Amount
        </span>
        <span className="w-[120px] shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">
          Status
        </span>
      </div>

      {/* Rows */}
      {transactions.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
          No transactions found.
        </p>
      ) : (
        <div className="space-y-0">
          {transactions.map((tx) => {
            const partyName =
              tx.supplier?.name ?? tx.customer?.name ?? "—";
            return (
              <Link
                key={tx.id}
                href="/transactions"
                className="flex items-center gap-2 rounded-lg px-3 py-2 transition hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <span className="w-[110px] shrink-0 text-xs text-gray-500 dark:text-gray-400">
                  {fmtDate(tx.transactionDate)}
                </span>
                <span
                  className={`w-[110px] shrink-0 text-xs ${TX_TYPE_COLORS[tx.type]}`}
                >
                  {TX_TYPE_LABEL[tx.type]}
                </span>
                <span className="flex-1 truncate text-xs text-gray-700 dark:text-gray-300">
                  {partyName}
                </span>
                <span className="w-[120px] shrink-0 text-right text-xs font-medium text-gray-900 dark:text-white">
                  {formatPKR(tx.totalAmount)}
                </span>
                <div className="flex w-[120px] shrink-0 items-center gap-1.5">
                  <span
                    className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] ${TX_STATUS_COLORS[tx.status]}`}
                  >
                    {tx.status.charAt(0) + tx.status.slice(1).toLowerCase()}
                  </span>
                  <HiOutlineChevronRight size={14} className="text-slate-400" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── QuickActionsPanel ────────────────────────────────────────────────────────

function QuickActionsPanel() {
  const actions = [
    {
      label: "New Sale",
      icon: <HiOutlineShoppingCart size={18} />,
      theme: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300",
    },
    {
      label: "New Purchase",
      icon: <HiOutlineArrowDownTray size={18} />,
      theme: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300",
    },
    {
      label: "Receive Payment",
      icon: <HiOutlineCreditCard size={18} />,
      theme: "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-300",
    },
    {
      label: "Pay Supplier",
      icon: <HiOutlineArrowUpTray size={18} />,
      theme: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300",
    },
  ];

  return (
    <div className="flex w-80 shrink-0 flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <p className="text-sm font-semibold text-gray-800 dark:text-white">
        Quick Actions
      </p>
      <div className="flex flex-col gap-2.5">
        {actions.map((action) => (
          <Link
            key={action.label}
            href="/transactions"
            className={`flex h-14 items-center gap-2.5 rounded-xl border px-3.5 text-sm font-medium transition hover:opacity-80 ${action.theme}`}
          >
            {action.icon}
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const today = new Date().toISOString().split("T")[0];

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asOfDate, setAsOfDate] = useState(today);

  const fetchAll = useCallback(async (date: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const [summaryData, txData] = await Promise.all([
        getDashboardSummary(date),
        listTransactions({ limit: 10, sortBy: "createdAt", sortOrder: "desc" }),
      ]);
      setSummary(summaryData);
      setTransactions(txData.data);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? "Failed to load dashboard data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll(asOfDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-1 flex-col gap-4 bg-[#F8FAFC] p-6 dark:bg-gray-950">
      {/* ── Top Bar ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[28px] font-bold leading-tight text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Single-glance business health
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">As of date</span>
          <input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            className="w-[190px] rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <button
            onClick={() => fetchAll(asOfDate)}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            <HiOutlineArrowPath
              size={16}
              className={isLoading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
          <HiOutlineExclamationTriangle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {isLoading ? (
        <DashboardSkeleton />
      ) : summary ? (
        <>
          {/* ── Row 2: Stats ── */}
          <div className="grid grid-cols-5 gap-3.5">
            <StatCard
              label="Total Cash"
              value={formatPKR(summary.cash.totalBalance)}
              sub={`${summary.cash.accounts.length} accounts`}
            />
            <StatCard
              label="Total Receivables"
              value={formatPKR(summary.receivables.totalAmount)}
              sub={`from ${summary.receivables.customerCount} customers`}
            />
            <StatCard
              label="Total Payables"
              value={formatPKR(summary.payables.totalAmount)}
              sub={`${summary.payables.supplierCount} supplier bills`}
            />
            <StatCard
              label="Inventory Value"
              value={formatPKR(summary.inventory.totalValue)}
              sub={`${summary.inventory.totalProducts} products`}
            />
            <StatCard
              label="Overdue"
              value={formatPKR(summary.receivables.overdueAmount)}
              sub={`${summary.receivables.overdueCount} overdue invoices`}
              isOverdue
            />
          </div>

          {/* ── Row 3: Middle ── */}
          <div className="grid grid-cols-2 gap-4">
            <CashByAccountPanel accounts={summary.cash.accounts} />
            <RvsPPanel
              receivables={summary.receivables}
              payables={summary.payables}
            />
          </div>

          {/* ── Row 4: Bottom ── */}
          <div className="flex gap-4">
            <RecentActivityTable transactions={transactions} />
            <QuickActionsPanel />
          </div>
        </>
      ) : null}
    </div>
  );
}
