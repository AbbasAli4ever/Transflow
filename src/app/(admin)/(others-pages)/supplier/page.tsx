"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  HiOutlineBuildingStorefront,
  HiOutlinePlus,
  HiOutlineMagnifyingGlass,
  HiOutlineEye,
  HiOutlinePencilSquare,
  HiOutlineArrowsUpDown,
  HiOutlineXMark,
  HiOutlineCheck,
  HiOutlineChevronDown,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineExclamationTriangle,
} from "react-icons/hi2";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import {
  ApiSupplier,
  SupplierStatus,
  formatPKR,
  listSuppliers,
  createSupplier,
  updateSupplier,
  changeSupplierStatus,
} from "@/lib/suppliers";
import { ApiError } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = "name" | "createdAt" | "balance";

// ─── Small reusable action button ────────────────────────────────────────────

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-theme-xs transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-5 py-4">
        <div className="h-4 w-36 rounded bg-gray-200 dark:bg-gray-700" />
      </td>
      <td className="px-5 py-4">
        <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700" />
      </td>
      <td className="px-5 py-4">
        <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
      </td>
      <td className="px-5 py-4">
        <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-14 rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="h-7 w-12 rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="h-7 w-28 rounded-lg bg-gray-200 dark:bg-gray-700" />
        </div>
      </td>
    </tr>
  );
}

// ─── Input helpers ────────────────────────────────────────────────────────────

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

// ─── Add / Edit Drawer ────────────────────────────────────────────────────────

interface DrawerForm {
  name: string;
  phone: string;
  address: string;
  notes: string;
}

const emptyForm: DrawerForm = { name: "", phone: "", address: "", notes: "" };

function SupplierDrawer({
  isOpen,
  onClose,
  onSaved,
  initial,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial?: ApiSupplier | null;
}) {
  const fromInitial = (s: ApiSupplier): DrawerForm => ({
    name: s.name,
    phone: s.phone ?? "",
    address: s.address ?? "",
    notes: s.notes ?? "",
  });

  const [form, setForm] = useState<DrawerForm>(initial ? fromInitial(initial) : emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(initial ? fromInitial(initial) : emptyForm);
    setError(null);
  }, [initial, isOpen]);

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
      if (initial) {
        await updateSupplier(initial.id, form);
      } else {
        await createSupplier(form);
      }
      onSaved();
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

  const isEdit = !!initial;

  return (
    <>
      <div
        className={`fixed inset-0 z-[9998] bg-gray-900/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed right-0 top-0 z-[9999] flex h-full w-full max-w-[420px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out dark:bg-gray-900 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {isEdit ? "Edit Supplier" : "Add Supplier"}
            </h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {isEdit ? "Update supplier details." : "Create a new supplier."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <HiOutlineXMark size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
                <HiOutlineExclamationTriangle size={16} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <div>
              <FieldLabel required>Name</FieldLabel>
              <input
                required
                className={inputClass}
                placeholder="Enter supplier name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div>
              <FieldLabel>Phone</FieldLabel>
              <input
                className={inputClass}
                placeholder="Enter phone number"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            <div>
              <FieldLabel>Address</FieldLabel>
              <textarea
                rows={3}
                className={`${inputClass} resize-none`}
                placeholder="Street, city, state, postal code"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>

            <div>
              <FieldLabel>Notes</FieldLabel>
              <textarea
                rows={3}
                className={`${inputClass} resize-none`}
                placeholder="Internal notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="border-t border-gray-100 px-6 py-4 dark:border-gray-800">
            <div className="flex gap-3">
              <Button variant="outline" size="sm" className="flex-1" onClick={onClose} type="button">
                Cancel
              </Button>
              <Button size="sm" className="flex-1" disabled={saving} type="submit">
                {saving ? "Saving..." : isEdit ? "Save Changes" : "Save Supplier"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}

// ─── Change Status Confirm Modal ──────────────────────────────────────────────

function ChangeStatusModal({
  supplier,
  onClose,
  onSaved,
}: {
  supplier: ApiSupplier | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setReason("");
    setError(null);
  }, [supplier]);

  if (!supplier) return null;

  const newStatus: SupplierStatus = supplier.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

  const handleConfirm = async () => {
    setError(null);
    setSaving(true);
    try {
      await changeSupplierStatus(supplier.id, newStatus, reason.trim() || undefined);
      onSaved();
      onClose();
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? "Failed to change status.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={!!supplier} onClose={onClose} className="max-w-sm mx-4" showCloseButton={false}>
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<ApiSupplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "INACTIVE" | "All">("ACTIVE");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDropOpen, setSortDropOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });

  const handleViewSupplier = (id: string) => {
    sessionStorage.setItem("supplierId", id);
    window.location.href = "/supplier/detail";
  };

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ApiSupplier | null>(null);
  const [statusTarget, setStatusTarget] = useState<ApiSupplier | null>(null);

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const SORT_LABELS: Record<SortKey, string> = {
    name: "Name",
    createdAt: "Created Date",
    balance: "Balance",
  };

  const fetchSuppliers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listSuppliers({
        page,
        limit: 20,
        search: debouncedSearch || undefined,
        status: statusFilter === "All" ? "ALL" : statusFilter,
        sortBy: sortKey === "balance" ? "name" : sortKey,
        sortOrder: "asc",
      });
      setSuppliers(result.data);
      setMeta({ total: result.meta.total, totalPages: result.meta.totalPages });
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? "Failed to load suppliers.");
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, sortKey]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 300);
  };

  const handleStatusFilterChange = (f: "ACTIVE" | "INACTIVE" | "All") => {
    setStatusFilter(f);
    setPage(1);
  };

  return (
    <div className="mx-auto w-full max-w-full">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
            <HiOutlineBuildingStorefront size={22} className="text-brand-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Suppliers List</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Browse and manage all suppliers.
            </p>
          </div>
        </div>
        <Button size="sm" startIcon={<HiOutlinePlus size={16} />} onClick={() => setAddOpen(true)}>
          Add Supplier
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <HiOutlineMagnifyingGlass
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by name or phone"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-10 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
          />
          {search && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <HiOutlineXMark size={16} />
            </button>
          )}
        </div>

        <div className="flex rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
          {(["ACTIVE", "INACTIVE", "All"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => handleStatusFilterChange(tab)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
                statusFilter === tab
                  ? "bg-brand-500 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {tab === "ACTIVE" ? "Active" : tab === "INACTIVE" ? "Inactive" : "All"}
            </button>
          ))}
        </div>

        <div className="relative">
          <button
            onClick={() => setSortDropOpen((v) => !v)}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <HiOutlineArrowsUpDown size={15} className="text-gray-400" />
            Sort by: {SORT_LABELS[sortKey]}
            <HiOutlineChevronDown
              size={14}
              className={`text-gray-400 transition-transform ${sortDropOpen ? "rotate-180" : ""}`}
            />
          </button>
          {sortDropOpen && (
            <div className="absolute right-0 z-50 mt-1.5 w-44 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-theme-md dark:border-gray-700 dark:bg-gray-800">
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    setSortKey(key);
                    setPage(1);
                    setSortDropOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    sortKey === key
                      ? "font-semibold text-brand-500"
                      : "text-gray-700 dark:text-gray-200"
                  }`}
                >
                  {SORT_LABELS[key]}
                  {sortKey === key && <HiOutlineCheck size={14} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          <HiOutlineExclamationTriangle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                {(["Name", "Phone", "Current Balance", "Status", "Actions"] as const).map((col) => (
                  <th
                    key={col}
                    className={`px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 ${col === "Actions" ? "w-[180px]" : ""}`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : suppliers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-16 text-center text-sm text-gray-400 dark:text-gray-500"
                  >
                    No suppliers found.{" "}
                    {statusFilter === "ACTIVE" && !debouncedSearch
                      ? "Add your first supplier."
                      : "Try adjusting your filters."}
                  </td>
                </tr>
              ) : (
                suppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className="transition hover:bg-gray-50/60 dark:hover:bg-gray-800/40"
                  >
                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleViewSupplier(supplier.id)}
                        className="text-sm font-semibold text-brand-500 transition hover:text-brand-600 hover:underline"
                      >
                        {supplier.name}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {supplier.phone || "—"}
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-gray-100">
                      {formatPKR(supplier.currentBalance)}
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        variant="light"
                        size="sm"
                        color={supplier.status === "ACTIVE" ? "success" : "warning"}
                      >
                        {supplier.status === "ACTIVE" ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <ActionButton
                          icon={<HiOutlineEye size={14} />}
                          label="View"
                          onClick={() => handleViewSupplier(supplier.id)}
                        />
                        <ActionButton
                          icon={<HiOutlinePencilSquare size={14} />}
                          label="Edit"
                          onClick={() => setEditTarget(supplier)}
                        />
                        <ActionButton
                          icon={<HiOutlineArrowsUpDown size={14} />}
                          label="Status"
                          onClick={() => setStatusTarget(supplier)}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer: count + pagination */}
        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 dark:border-gray-700">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {isLoading ? (
              "Loading..."
            ) : (
              <>
                Showing{" "}
                <span className="font-medium text-gray-600 dark:text-gray-300">
                  {suppliers.length}
                </span>{" "}
                of{" "}
                <span className="font-medium text-gray-600 dark:text-gray-300">{meta.total}</span>{" "}
                suppliers
              </>
            )}
          </p>
          {meta.totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                <HiOutlineChevronLeft size={15} />
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Page {page} of {meta.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages || isLoading}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                <HiOutlineChevronRight size={15} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Drawers / Modals */}
      <SupplierDrawer
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={fetchSuppliers}
      />
      <SupplierDrawer
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={fetchSuppliers}
        initial={editTarget}
      />
      <ChangeStatusModal
        supplier={statusTarget}
        onClose={() => setStatusTarget(null)}
        onSaved={fetchSuppliers}
      />

      {sortDropOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setSortDropOpen(false)} />
      )}
    </div>
  );
}
