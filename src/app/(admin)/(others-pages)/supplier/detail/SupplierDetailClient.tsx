"use client";

import React, { useState, useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import Link from "next/link";
import {
  HiOutlineBuildingStorefront,
  HiOutlineArrowLeft,
  HiOutlinePencilSquare,
  HiOutlineArrowsUpDown,
  HiOutlinePhone,
  HiOutlineMapPin,
  HiOutlineXMark,
  HiOutlineArrowDownTray,
  HiOutlineExclamationTriangle,
} from "react-icons/hi2";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { CalenderIcon } from "@/icons";
import {
  ApiSupplier,
  ApiTransaction,
  SupplierBalance,
  OpenDocumentsResponse,
  SupplierStatement,
  SupplierStatus,
  TransactionType,
  TransactionStatus,
  PaginatedResponse,
  formatPKR,
  getSupplier,
  getSupplierBalance,
  getSupplierOpenDocuments,
  getSupplierStatement,
  updateSupplier,
  changeSupplierStatus,
  listTransactions,
} from "@/lib/suppliers";
import { ApiError } from "@/lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

function daysAgo(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000);
}

// ─── Shared input styles ──────────────────────────────────────────────────────

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500";

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
      {children}
      {required && <span className="ml-0.5 text-error-500">*</span>}
    </label>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  badge,
}: {
  label: string;
  value: string;
  sub?: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <div className="mt-2">
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        {sub && <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{sub}</p>}
        {badge && <div className="mt-2">{badge}</div>}
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-full animate-pulse">
      <div className="mb-5 h-5 w-36 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-4 flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-7 w-48 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-24 rounded-lg bg-gray-200 dark:bg-gray-700" />
            <div className="h-8 w-16 rounded-lg bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-12 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      </div>
      <div className="mb-4 grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
            <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="mt-3 h-8 w-32 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
        <div className="h-20 w-full rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}

// ─── Change Status Modal ──────────────────────────────────────────────────────

function ChangeStatusModal({
  supplier,
  onClose,
  onSaved,
}: {
  supplier: ApiSupplier;
  onClose: () => void;
  onSaved: (updated: ApiSupplier) => void;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setReason("");
    setError(null);
  }, [supplier.id]);

  const newStatus: SupplierStatus = supplier.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

  const handleConfirm = async () => {
    setError(null);
    setSaving(true);
    try {
      const updated = await changeSupplierStatus(
        supplier.id,
        newStatus,
        reason.trim() || undefined
      );
      onSaved(updated);
      onClose();
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? "Failed to change status.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} className="max-w-sm mx-4" showCloseButton={false}>
      <div className="p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning-50 dark:bg-warning-500/10">
            <HiOutlineArrowsUpDown size={24} className="text-warning-500" />
          </div>
          <h3 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">
            Change Status
          </h3>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Set{" "}
            <span className="font-medium text-gray-700 dark:text-gray-200">{supplier.name}</span>{" "}
            to{" "}
            <span
              className={
                newStatus === "ACTIVE"
                  ? "font-semibold text-success-600"
                  : "font-semibold text-warning-600"
              }
            >
              {newStatus === "ACTIVE" ? "Active" : "Inactive"}
            </span>
            ?
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
            <HiOutlineExclamationTriangle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="mb-4">
          <FieldLabel>Reason (optional)</FieldLabel>
          <input
            className={inputClass}
            placeholder="Enter reason for status change"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <div className="flex justify-center gap-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={saving}>
            {saving ? "Saving..." : "Confirm"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Edit Drawer ──────────────────────────────────────────────────────────────

function EditDrawer({
  isOpen,
  onClose,
  supplier,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  supplier: ApiSupplier;
  onSaved: (updated: ApiSupplier) => void;
}) {
  const [form, setForm] = useState({
    name: supplier.name,
    phone: supplier.phone ?? "",
    address: supplier.address ?? "",
    notes: supplier.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      name: supplier.name,
      phone: supplier.phone ?? "",
      address: supplier.address ?? "",
      notes: supplier.notes ?? "",
    });
    setError(null);
  }, [supplier, isOpen]);

  useEffect(() => {
    if (isOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const updated = await updateSupplier(supplier.id, form);
      onSaved(updated);
      onClose();
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.statusCode === 409) {
        setError("A supplier with this name already exists.");
      } else if (apiErr.errors?.length) {
        setError(apiErr.errors.map((e) => e.message).join(", "));
      } else {
        setError(apiErr.message ?? "Failed to save supplier.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-9998 bg-gray-900/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed right-0 top-0 z-9999 flex h-full w-full max-w-[420px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out dark:bg-gray-900 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Edit Supplier</h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Update supplier details.</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <HiOutlineXMark size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-4 px-6 py-5">
            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
                <HiOutlineExclamationTriangle size={16} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}
            <div>
              <FieldLabel required>Name</FieldLabel>
              <input required className={inputClass} placeholder="Supplier name" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <FieldLabel>Phone</FieldLabel>
              <input className={inputClass} placeholder="Phone number" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <FieldLabel>Address</FieldLabel>
              <textarea rows={3} className={`${inputClass} resize-none`}
                placeholder="Street, city, state, postal code" value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <FieldLabel>Notes</FieldLabel>
              <textarea rows={3} className={`${inputClass} resize-none`}
                placeholder="Internal notes" value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>

          <div className="border-t border-gray-100 px-6 py-4 dark:border-gray-800">
            <div className="flex gap-3">
              <Button variant="outline" size="sm" className="flex-1" onClick={onClose} type="button" disabled={saving}>
                Cancel
              </Button>
              <Button size="sm" className="flex-1" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}

// ─── Ledger Tab ───────────────────────────────────────────────────────────────

function LedgerTab({ supplierId }: { supplierId: string }) {
  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = today.slice(0, 7) + "-01";

  const [runFrom, setRunFrom] = useState(firstOfMonth);
  const [runTo, setRunTo] = useState(today);
  const [statement, setStatement] = useState<SupplierStatement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const datePickerRef = useRef<HTMLInputElement>(null);

  const fetchStatement = async (from: string, to: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSupplierStatement(supplierId, from, to);
      setStatement(data);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? "Failed to load ledger.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatement(runFrom, runTo);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!datePickerRef.current) return;

    const fp = flatpickr(datePickerRef.current, {
      mode: "range",
      static: true,
      monthSelectorType: "static",
      dateFormat: "M j, Y",
      rangeSeparator: " → ",
      defaultDate: [firstOfMonth, today],
      onReady: () => {
        if (datePickerRef.current) {
          datePickerRef.current.value = datePickerRef.current.value.replace(" to ", " → ");
        }
      },
      prevArrow:
        '<svg class="stroke-current" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.5 15L7.5 10L12.5 5" stroke="" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      nextArrow:
        '<svg class="stroke-current" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.5 15L12.5 10L7.5 5" stroke="" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      onChange: (dates: Date[]) => {
        if (dates.length === 2) {
          const toLocal = (d: Date) =>
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          const from = toLocal(dates[0]);
          const to = toLocal(dates[1]);
          setRunFrom(from);
          setRunTo(to);
          fetchStatement(from, to);
          if (datePickerRef.current) {
            datePickerRef.current.value = datePickerRef.current.value.replace(" to ", " → ");
          }
        }
      },
    } as Parameters<typeof flatpickr>[1]);

    return () => {
      if (!Array.isArray(fp)) fp.destroy();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Supplier Ledger (Statement)
          </h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Chronological statement of transactions with running balance.
          </p>
        </div>
        <button className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
          <HiOutlineArrowDownTray size={15} />
          Export (PDF/CSV)
        </button>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative inline-flex items-center">
          <CalenderIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none z-10" />
          <input
            ref={datePickerRef}
            className="h-10 w-58 pl-9 pr-0 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 cursor-pointer"
            placeholder="Select date range"
            readOnly
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          <HiOutlineExclamationTriangle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 w-full rounded bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      ) : !statement || statement.entries.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">No transactions in this date range.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                {["Date", "Document #", "Type", "Description", "Debit (AP Increase)", "Credit (AP Decrease)", "Running Balance"].map((col) => (
                  <th key={col} className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 last:text-right last:pr-0">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {statement.entries.map((entry, i) => (
                <tr key={i} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                  <td className="py-3.5 pr-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                    {fmtDate(entry.date)}
                  </td>
                  <td className="py-3.5 pr-4 text-sm font-medium text-brand-500 whitespace-nowrap">
                    {entry.documentNumber}
                  </td>
                  <td className={`py-3.5 pr-4 text-sm font-semibold whitespace-nowrap ${entry.debit > 0 ? "text-error-600" : "text-success-600"}`}>
                    {entry.type}
                  </td>
                  <td className="py-3.5 pr-4 text-sm text-gray-700 dark:text-gray-200">
                    {entry.description}
                  </td>
                  <td className="py-3.5 pr-4 text-sm font-medium text-error-500 whitespace-nowrap">
                    {entry.debit > 0 ? formatPKR(entry.debit) : "—"}
                  </td>
                  <td className="py-3.5 pr-4 text-sm font-medium text-success-600 whitespace-nowrap">
                    {entry.credit > 0 ? formatPKR(entry.credit) : "—"}
                  </td>
                  <td className="py-3.5 text-sm font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap text-right">
                    {formatPKR(entry.runningBalance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {statement && (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Opening Balance (as of {runFrom})
            </p>
            <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
              {formatPKR(statement.openingBalance)}
            </p>
          </div>
          <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
            <p className="text-xs font-medium text-brand-600 dark:text-brand-400">
              Closing Balance (as of {runTo})
            </p>
            <p className="mt-1 text-xl font-bold text-brand-600 dark:text-brand-400">
              {formatPKR(statement.closingBalance)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Open Documents Tab ───────────────────────────────────────────────────────

function OpenDocumentsTab({ openDocs }: { openDocs: OpenDocumentsResponse | null }) {
  const outstandingColor = (days: number) => {
    if (days >= 30) return "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400";
    if (days >= 14) return "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-500";
    return "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-600";
  };

  if (!openDocs) {
    return (
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 w-full rounded bg-gray-200 dark:bg-gray-700" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Supplier Open Documents
          </h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Unpaid and partially-paid purchase invoices with outstanding exposure.
          </p>
        </div>
        <button className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
          <HiOutlineArrowDownTray size={15} />
          Export (PDF/CSV)
        </button>
      </div>

      {openDocs.documents.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">No open documents.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  {["Document #", "Date", "Total Amount", "Paid Amount", "Outstanding", "Days Outstanding", "Action"].map((col) => (
                    <th key={col} className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 last:pr-0">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {openDocs.documents.map((doc) => {
                  const days = daysAgo(doc.transactionDate);
                  return (
                    <tr key={doc.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                      <td className="py-3.5 pr-4 text-sm font-medium text-brand-500 whitespace-nowrap">
                        {doc.documentNumber}
                      </td>
                      <td className="py-3.5 pr-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {fmtDate(doc.transactionDate)}
                      </td>
                      <td className="py-3.5 pr-4 text-sm text-gray-800 dark:text-gray-100 whitespace-nowrap">
                        {formatPKR(doc.totalAmount)}
                      </td>
                      <td className="py-3.5 pr-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {formatPKR(doc.paidAmount)}
                      </td>
                      <td className="py-3.5 pr-4 whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-semibold ${outstandingColor(days)}`}>
                          {formatPKR(doc.outstanding)}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 text-sm text-gray-700 dark:text-gray-200 whitespace-nowrap">
                        {days}d
                      </td>
                      <td className="py-3.5">
                        <button className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-600">
                          Pay Now
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-error-200 bg-error-50 p-4 dark:border-error-500/30 dark:bg-error-500/10">
              <p className="text-xs font-medium text-error-600 dark:text-error-400">Total Outstanding</p>
              <p className="mt-1 text-xl font-bold text-error-600 dark:text-error-400">{formatPKR(openDocs.totalOutstanding)}</p>
            </div>
            <div className="rounded-xl border border-success-200 bg-success-50 p-4 dark:border-success-500/30 dark:bg-success-500/10">
              <p className="text-xs font-medium text-success-700 dark:text-success-400">Unapplied Credits</p>
              <p className="mt-1 text-xl font-bold text-success-700 dark:text-success-400">{formatPKR(openDocs.unappliedCredits)}</p>
            </div>
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
              <p className="text-xs font-medium text-brand-600 dark:text-brand-400">Net Outstanding</p>
              <p className="mt-1 text-xl font-bold text-brand-600 dark:text-brand-400">{formatPKR(openDocs.netOutstanding)}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Transactions Tab ─────────────────────────────────────────────────────────

const TX_TYPE_LABELS: Record<TransactionType, string> = {
  PURCHASE: "Purchase",
  SALE: "Sale",
  SUPPLIER_PAYMENT: "Payment",
  CUSTOMER_PAYMENT: "Payment",
  SUPPLIER_RETURN: "Return",
  CUSTOMER_RETURN: "Return",
  INTERNAL_TRANSFER: "Transfer",
  ADJUSTMENT: "Adjustment",
};

const TX_TYPE_COLORS: Record<TransactionType, string> = {
  PURCHASE: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400",
  SALE: "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400",
  SUPPLIER_PAYMENT: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
  CUSTOMER_PAYMENT: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
  SUPPLIER_RETURN: "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-500",
  CUSTOMER_RETURN: "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-500",
  INTERNAL_TRANSFER: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  ADJUSTMENT: "bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400",
};

const TX_STATUS_COLORS: Record<TransactionStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  POSTED: "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400",
  VOIDED: "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400",
};

function TransactionsTab({ supplierId }: { supplierId: string }) {
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [meta, setMeta] = useState<PaginatedResponse<ApiTransaction>["meta"] | null>(null);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<TransactionType | "">("");
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | "">("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const limit = 10;

  const fetchData = async (p: number, type: TransactionType | "", status: TransactionStatus | "") => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listTransactions({
        supplierId,
        page: p,
        limit,
        sortBy: "transactionDate",
        sortOrder: "desc",
        ...(type ? { type } : {}),
        ...(status ? { status } : {}),
      });
      setTransactions(res.data);
      setMeta(res.meta);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? "Failed to load transactions.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(page, typeFilter, statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, typeFilter, statusFilter]);

  const handleTypeChange = (val: string) => {
    setTypeFilter(val as TransactionType | "");
    setPage(1);
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val as TransactionStatus | "");
    setPage(1);
  };

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Supplier Transactions
          </h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            All transactions linked to this supplier.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <select
          value={typeFilter}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          <option value="">All Types</option>
          <option value="PURCHASE">Purchase</option>
          <option value="SUPPLIER_PAYMENT">Payment</option>
          <option value="SUPPLIER_RETURN">Return</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="POSTED">Posted</option>
          <option value="VOIDED">Voided</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          <HiOutlineExclamationTriangle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 w-full rounded bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">No transactions found.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  {["Date", "Document #", "Type", "Status", "Notes", "Amount"].map((col) => (
                    <th
                      key={col}
                      className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 last:text-right last:pr-0"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                    <td className="py-3.5 pr-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {fmtDate(tx.transactionDate)}
                    </td>
                    <td className="py-3.5 pr-4 text-sm font-medium text-brand-500 whitespace-nowrap">
                      {tx.documentNumber ?? <span className="text-gray-400 italic">Draft</span>}
                    </td>
                    <td className="py-3.5 pr-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TX_TYPE_COLORS[tx.type]}`}
                      >
                        {TX_TYPE_LABELS[tx.type]}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TX_STATUS_COLORS[tx.status]}`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 text-sm text-gray-700 dark:text-gray-200 max-w-[200px] truncate">
                      {tx.notes || "—"}
                    </td>
                    <td className="py-3.5 text-sm font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap text-right">
                      {formatPKR(tx.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="mt-5 flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} of{" "}
                {meta.total}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Previous
                </button>
                <button
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Tab types ────────────────────────────────────────────────────────────────

type Tab = "openDocuments" | "ledger" | "transactions";

// ─── Detail Client ────────────────────────────────────────────────────────────

export default function SupplierDetailClient({ id }: { id: string }) {
  const [supplier, setSupplier] = useState<ApiSupplier | null>(null);
  const [balance, setBalance] = useState<SupplierBalance | null>(null);
  const [openDocs, setOpenDocs] = useState<OpenDocumentsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>("openDocuments");
  const [editOpen, setEditOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [sup, bal, docs] = await Promise.all([
          getSupplier(id),
          getSupplierBalance(id),
          getSupplierOpenDocuments(id),
        ]);
        setSupplier(sup);
        setBalance(bal);
        setOpenDocs(docs);
      } catch (err) {
        const apiErr = err as ApiError;
        if (apiErr.statusCode === 404) {
          setNotFound(true);
        } else {
          setError(apiErr.message ?? "Failed to load supplier.");
        }
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id]);

  if (isLoading) return <PageSkeleton />;

  if (notFound || !supplier) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <HiOutlineBuildingStorefront size={48} className="text-gray-300" />
        <p className="text-lg font-medium text-gray-500">Supplier not found.</p>
        <Link href="/supplier">
          <Button variant="outline" size="sm" startIcon={<HiOutlineArrowLeft size={15} />}>
            Back to Suppliers
          </Button>
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <div className="flex items-start gap-2 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          <HiOutlineExclamationTriangle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
        <Link href="/supplier">
          <Button variant="outline" size="sm" startIcon={<HiOutlineArrowLeft size={15} />}>
            Back to Suppliers
          </Button>
        </Link>
      </div>
    );
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "ledger", label: "Ledger" },
    { key: "openDocuments", label: "Open Documents" },
    { key: "transactions", label: "Transactions" },
  ];

  return (
    <div className="mx-auto w-full max-w-full">
      {/* Back nav */}
      <div className="mb-5">
        <Link
          href="/supplier"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-brand-500 dark:text-gray-400"
        >
          <HiOutlineArrowLeft size={15} />
          Back to Suppliers
        </Link>
      </div>

      {/* ── Header card ── */}
      <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{supplier.name}</h1>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              ID: {supplier.id.slice(0, 8)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="solid"
              color={supplier.status === "ACTIVE" ? "success" : "warning"}
              size="sm"
            >
              {supplier.status}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              startIcon={<HiOutlineArrowsUpDown size={14} />}
              onClick={() => setStatusModalOpen(true)}
            >
              Change Status
            </Button>
            <Button
              size="sm"
              startIcon={<HiOutlinePencilSquare size={14} />}
              onClick={() => setEditOpen(true)}
            >
              Edit
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Phone</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-gray-800 dark:text-gray-100">
              <HiOutlinePhone size={14} className="text-gray-400" />
              {supplier.phone || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Address</p>
            <p className="mt-0.5 flex items-start gap-1.5 text-sm font-medium text-gray-800 dark:text-gray-100">
              <HiOutlineMapPin size={14} className="mt-0.5 shrink-0 text-gray-400" />
              {supplier.address || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Notes</p>
            <p className="mt-0.5 text-sm font-medium text-gray-800 dark:text-gray-100">
              {supplier.notes || "—"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Purchased (All Time)"
          value={balance ? formatPKR(balance.totalPurchases) : "—"}
          sub="Sum of all purchases"
        />
        <StatCard
          label="Total Paid"
          value={balance ? formatPKR(balance.totalPayments) : "—"}
          sub="Payments and adjustments applied"
        />
        <StatCard
          label="Current Balance"
          value={balance ? formatPKR(balance.currentBalance) : "—"}
          badge={
            <span className="inline-flex items-center rounded-full bg-error-50 px-2.5 py-0.5 text-xs font-semibold text-error-600 dark:bg-error-500/15 dark:text-error-400">
              PAYABLE
            </span>
          }
        />
      </div>

      {/* ── Tabs ── */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center gap-1 border-b border-gray-100 p-4 dark:border-gray-800">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.key
                  ? "bg-brand-500 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === "ledger" && <LedgerTab supplierId={supplier.id} />}
          {activeTab === "openDocuments" && <OpenDocumentsTab openDocs={openDocs} />}
          {activeTab === "transactions" && <TransactionsTab supplierId={supplier.id} />}
        </div>
      </div>

      {/* Modals / Drawers */}
      <EditDrawer
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        supplier={supplier}
        onSaved={(updated) => setSupplier(updated)}
      />
      {statusModalOpen && (
        <ChangeStatusModal
          supplier={supplier}
          onClose={() => setStatusModalOpen(false)}
          onSaved={(updated) => setSupplier(updated)}
        />
      )}
    </div>
  );
}
