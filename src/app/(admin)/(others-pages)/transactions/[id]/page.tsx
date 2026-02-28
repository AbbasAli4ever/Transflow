"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  HiOutlineArrowLeft,
  HiOutlineArrowsUpDown,
  HiOutlineExclamationTriangle,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlinePrinter,
  HiOutlineXMark,
} from "react-icons/hi2";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import {
  ApiTransaction,
  PatchTransactionDto,
  PatchTransactionLineDto,
  TransactionAllocation,
  TransactionStatus,
  TransactionType,
  deleteTransaction,
  getTransaction,
  listTransactionAllocations,
  patchTransaction,
  postTransaction,
  formatPKR,
} from "@/lib/suppliers";
import { ApiError } from "@/lib/api";
import {
  ApiPaymentAccount,
  listPaymentAccounts,
} from "@/lib/paymentAccounts";
import { ApiSupplier, listSuppliers } from "@/lib/suppliers";
import { ApiCustomer, listCustomers } from "@/lib/customers";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

const TYPE_LABELS: Record<TransactionType, string> = {
  PURCHASE: "Purchase",
  SALE: "Sale",
  SUPPLIER_PAYMENT: "Supplier Payment",
  CUSTOMER_PAYMENT: "Customer Payment",
  SUPPLIER_RETURN: "Supplier Return",
  CUSTOMER_RETURN: "Customer Return",
  INTERNAL_TRANSFER: "Internal Transfer",
  ADJUSTMENT: "Adjustment",
};

const TYPE_BADGE: Record<
  TransactionType,
  "primary" | "success" | "info" | "warning" | "light" | "dark"
> = {
  PURCHASE: "primary",
  SALE: "success",
  SUPPLIER_PAYMENT: "info",
  CUSTOMER_PAYMENT: "info",
  SUPPLIER_RETURN: "warning",
  CUSTOMER_RETURN: "warning",
  INTERNAL_TRANSFER: "light",
  ADJUSTMENT: "dark",
};

const STATUS_BADGE: Record<TransactionStatus, "warning" | "success" | "error"> = {
  DRAFT: "warning",
  POSTED: "success",
  VOIDED: "error",
};

// ─── Types ───────────────────────────────────────────────────────────────────

type EditLine = PatchTransactionLineDto & {
  _key: string;
};

type EditForm = {
  transactionDate: string;
  notes: string;
  supplierId: string;
  customerId: string;
  deliveryFee: number | "";
  deliveryType: string;
  deliveryAddress: string;
  amount: number | "";
  fromPaymentAccountId: string;
  toPaymentAccountId: string;
  lines: EditLine[];
};

// ─── Skeleton ────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-full animate-pulse">
      <div className="mb-5 h-5 w-44 rounded bg-gray-200 dark:bg-gray-700" />
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
        <div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="h-40 w-full rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TransactionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const routeId = (params?.id as string) || "";

  const [id, setId] = useState<string | null>(routeId || null);
  const [transaction, setTransaction] = useState<ApiTransaction | null>(null);
  const [allocations, setAllocations] = useState<TransactionAllocation[]>([]);
  const [accounts, setAccounts] = useState<ApiPaymentAccount[]>([]);
  const [suppliers, setSuppliers] = useState<ApiSupplier[]>([]);
  const [customers, setCustomers] = useState<ApiCustomer[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [postLoading, setPostLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    if (routeId) {
      setId(routeId);
      return;
    }
    const stored = sessionStorage.getItem("transactionId");
    if (stored) {
      router.replace(`/transactions/${stored}`);
      return;
    }
    router.replace("/transactions");
  }, [routeId, router]);

  const loadTransaction = async (txId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const [tx, accountsRes] = await Promise.all([
        getTransaction(txId),
        listPaymentAccounts({ status: "ACTIVE", limit: 100 }),
      ]);
      setTransaction(tx);
      setAccounts(accountsRes.data);

      if (tx.type === "SUPPLIER_PAYMENT" && tx.supplierId) {
        const allocRes = await listTransactionAllocations({
          supplierId: tx.supplierId,
          page: 1,
          limit: 100,
        });
        setAllocations(
          allocRes.data.filter((a) => a.paymentTransactionId === tx.id)
        );
      } else if (tx.type === "CUSTOMER_PAYMENT" && tx.customerId) {
        const allocRes = await listTransactionAllocations({
          customerId: tx.customerId,
          page: 1,
          limit: 100,
        });
        setAllocations(
          allocRes.data.filter((a) => a.paymentTransactionId === tx.id)
        );
      } else {
        setAllocations([]);
      }
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.statusCode === 404) {
        setNotFound(true);
      } else {
        setError(apiErr.message ?? "Failed to load transaction.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    loadTransaction(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const accountMap = useMemo(() => {
    const map = new Map<string, ApiPaymentAccount>();
    accounts.forEach((a) => map.set(a.id, a));
    return map;
  }, [accounts]);

  const paymentTotal = useMemo(() => {
    if (!transaction?.paymentEntries?.length) return 0;
    return transaction.paymentEntries.reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [transaction]);

  const paymentAccountNames = useMemo(() => {
    if (!transaction?.paymentEntries?.length) return [] as string[];
    const names = new Set<string>();
    transaction.paymentEntries.forEach((p) => {
      const acct = accountMap.get(p.paymentAccountId);
      if (acct) names.add(acct.name);
    });
    return Array.from(names);
  }, [transaction, accountMap]);

  const initEditForm = async (tx: ApiTransaction) => {
    setEditError(null);
    if (tx.type === "PURCHASE" || tx.type === "SUPPLIER_PAYMENT" || tx.type === "SUPPLIER_RETURN") {
      const sup = await listSuppliers({ status: "ALL", limit: 100, page: 1 });
      setSuppliers(sup.data);
    }
    if (tx.type === "SALE" || tx.type === "CUSTOMER_PAYMENT" || tx.type === "CUSTOMER_RETURN") {
      const cus = await listCustomers({ status: "ALL", limit: 100, page: 1 });
      setCustomers(cus.data);
    }

    const lines: EditLine[] = (tx.transactionLines || []).map((l) => ({
      _key: l.id,
      lineId: l.id,
      variantId: l.variantId,
      quantity: l.quantity,
      unitCost: l.unitCost ?? undefined,
      unitPrice: l.unitPrice ?? undefined,
      discountAmount: l.discountAmount ?? 0,
      direction: (l as unknown as { direction?: "IN" | "OUT" }).direction,
      reason: (l as unknown as { reason?: string }).reason,
    }));

    setEditForm({
      transactionDate: tx.transactionDate.split("T")[0],
      notes: tx.notes ?? "",
      supplierId: tx.supplierId ?? "",
      customerId: tx.customerId ?? "",
      deliveryFee: tx.deliveryFee ?? 0,
      deliveryType: (tx as unknown as { deliveryType?: string }).deliveryType ?? "",
      deliveryAddress: (tx as unknown as { deliveryAddress?: string }).deliveryAddress ?? "",
      amount: (tx as unknown as { amount?: number }).amount ?? "",
      fromPaymentAccountId: (tx as unknown as { fromPaymentAccountId?: string }).fromPaymentAccountId ?? "",
      toPaymentAccountId: (tx as unknown as { toPaymentAccountId?: string }).toPaymentAccountId ?? "",
      lines,
    });
  };

  const handlePost = async () => {
    if (!transaction) return;
    setPostLoading(true);
    try {
      const idempotencyKey = globalThis.crypto?.randomUUID?.() ?? undefined;
      await postTransaction(transaction.id, { idempotencyKey });
      await loadTransaction(transaction.id);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? "Failed to post transaction.");
    } finally {
      setPostLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!transaction) return;
    setDeleteLoading(true);
    try {
      await deleteTransaction(transaction.id);
      router.replace("/transactions");
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? "Failed to delete draft.");
    } finally {
      setDeleteLoading(false);
      setDeleteOpen(false);
    }
  };

  const handleEditSave = async () => {
    if (!transaction || !editForm) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const payload: PatchTransactionDto = {
        transactionDate: editForm.transactionDate || undefined,
        notes: editForm.notes.trim() ? editForm.notes.trim() : undefined,
      };

      if (transaction.type === "PURCHASE" || transaction.type === "SUPPLIER_PAYMENT" || transaction.type === "SUPPLIER_RETURN") {
        if (editForm.supplierId) payload.supplierId = editForm.supplierId;
      }
      if (transaction.type === "SALE" || transaction.type === "CUSTOMER_PAYMENT" || transaction.type === "CUSTOMER_RETURN") {
        if (editForm.customerId) payload.customerId = editForm.customerId;
      }

      if (transaction.type === "PURCHASE" || transaction.type === "SALE") {
        payload.deliveryFee = editForm.deliveryFee === "" ? undefined : Number(editForm.deliveryFee);
        if (transaction.type === "SALE") {
          payload.deliveryType = editForm.deliveryType || undefined;
          payload.deliveryAddress = editForm.deliveryAddress || undefined;
        }
      }

      if (
        transaction.type === "SUPPLIER_PAYMENT" ||
        transaction.type === "CUSTOMER_PAYMENT" ||
        transaction.type === "INTERNAL_TRANSFER"
      ) {
        payload.amount = editForm.amount === "" ? undefined : Number(editForm.amount);
        payload.fromPaymentAccountId = editForm.fromPaymentAccountId || undefined;
        if (transaction.type === "INTERNAL_TRANSFER") {
          payload.toPaymentAccountId = editForm.toPaymentAccountId || undefined;
        }
      }

      if (
        transaction.type === "PURCHASE" ||
        transaction.type === "SALE" ||
        transaction.type === "ADJUSTMENT" ||
        transaction.type === "SUPPLIER_RETURN" ||
        transaction.type === "CUSTOMER_RETURN"
      ) {
        const lines = editForm.lines.map((l) => ({
          lineId: l.lineId,
          variantId: l.variantId,
          quantity: l.quantity,
          unitCost: l.unitCost,
          unitPrice: l.unitPrice,
          discountAmount: l.discountAmount,
          direction: l.direction,
          reason: l.reason,
        }));
        payload.lines = lines;
      }

      await patchTransaction(transaction.id, payload);
      await loadTransaction(transaction.id);
      setEditOpen(false);
    } catch (err) {
      const apiErr = err as ApiError;
      setEditError(apiErr.message ?? "Failed to update draft.");
    } finally {
      setEditSaving(false);
    }
  };

  if (isLoading) return <PageSkeleton />;

  if (notFound || !transaction) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <HiOutlineArrowsUpDown size={48} className="text-gray-300" />
        <p className="text-lg font-medium text-gray-500">Transaction not found.</p>
        <Link href="/transactions">
          <Button variant="outline" size="sm" startIcon={<HiOutlineArrowLeft size={15} />}>
            Back to Transactions
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
        <Link href="/transactions">
          <Button variant="outline" size="sm" startIcon={<HiOutlineArrowLeft size={15} />}>
            Back to Transactions
          </Button>
        </Link>
      </div>
    );
  }

  const lines = transaction.transactionLines || [];
  const showPaymentInfo =
    transaction.type === "PURCHASE" ||
    transaction.type === "SALE" ||
    transaction.type === "SUPPLIER_PAYMENT" ||
    transaction.type === "CUSTOMER_PAYMENT";

  const showAllocations =
    transaction.type === "SUPPLIER_PAYMENT" || transaction.type === "CUSTOMER_PAYMENT";

  const unitLabel = transaction.type === "SALE" ? "Unit Price" : "Unit Cost";

  return (
    <div className="mx-auto w-full max-w-full">
      {/* Back nav */}
      <div className="mb-5">
        <Link
          href="/transactions"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-brand-500 dark:text-gray-400"
        >
          <HiOutlineArrowLeft size={15} />
          Back to Transactions
        </Link>
      </div>

      {/* Header card */}
      <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {transaction.documentNumber ?? "—"}
              </h1>
              <Badge variant="light" size="sm" color={STATUS_BADGE[transaction.status]}>
                {transaction.status}
              </Badge>
              <Badge variant="light" size="sm" color={TYPE_BADGE[transaction.type]}>
                {TYPE_LABELS[transaction.type]}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-300">
              <div>
                <span className="text-gray-400">Date:</span> {fmtDate(transaction.transactionDate)}
              </div>
              {transaction.supplier && (
                <div>
                  <span className="text-gray-400">Supplier:</span>{" "}
                  <Link
                    href="/supplier/detail"
                    onClick={() => sessionStorage.setItem("supplierId", transaction.supplier!.id)}
                    className="font-medium text-brand-500 hover:underline"
                  >
                    {transaction.supplier.name}
                  </Link>
                </div>
              )}
              {transaction.customer && (
                <div>
                  <span className="text-gray-400">Customer:</span>{" "}
                  <Link
                    href="/customer/detail"
                    onClick={() => sessionStorage.setItem("customerId", transaction.customer!.id)}
                    className="font-medium text-brand-500 hover:underline"
                  >
                    {transaction.customer.name}
                  </Link>
                </div>
              )}
              <div>
                <span className="text-gray-400">Created:</span> {fmtDate(transaction.createdAt)}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {transaction.status === "DRAFT" ? (
              <>
                <Button size="sm" onClick={handlePost} disabled={postLoading}>
                  {postLoading ? "Posting..." : "Post Transaction"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  startIcon={<HiOutlinePencilSquare size={16} />}
                  onClick={async () => {
                    await initEditForm(transaction);
                    setEditOpen(true);
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  startIcon={<HiOutlineTrash size={16} />}
                  onClick={() => setDeleteOpen(true)}
                >
                  Delete Draft
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" startIcon={<HiOutlinePrinter size={16} />} disabled>
                Print / Export PDF
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Lines table */}
      <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Transaction Lines</h2>
        </div>
        {lines.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">No line items.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  {[
                    "Product",
                    "Size",
                    "Qty",
                    unitLabel,
                    "Discount",
                    "Line Total",
                  ].map((col) => (
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
                {lines.map((line) => (
                  <tr key={line.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                    <td className="py-3.5 pr-4 text-sm text-gray-700 dark:text-gray-200">
                      {line.variant?.product?.name ?? "—"}
                    </td>
                    <td className="py-3.5 pr-4 text-sm text-gray-600 dark:text-gray-300">
                      {line.variant?.size ?? "—"}
                    </td>
                    <td className="py-3.5 pr-4 text-sm text-gray-600 dark:text-gray-300">
                      {line.quantity}
                    </td>
                    <td className="py-3.5 pr-4 text-sm text-gray-600 dark:text-gray-300">
                      {formatPKR(transaction.type === "SALE" ? line.unitPrice : line.unitCost)}
                    </td>
                    <td className="py-3.5 pr-4 text-sm text-gray-600 dark:text-gray-300">
                      {formatPKR(line.discountAmount ?? 0)}
                    </td>
                    <td className="py-3.5 text-right text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {formatPKR(line.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-100 dark:border-gray-700">
                  <td colSpan={5} className="py-3 pr-4 text-right text-sm text-gray-500">
                    Subtotal
                  </td>
                  <td className="py-3 text-right text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {formatPKR(transaction.subtotal)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={5} className="py-2 pr-4 text-right text-sm text-gray-500">
                    Discount Total
                  </td>
                  <td className="py-2 text-right text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {formatPKR(transaction.discountTotal)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={5} className="py-2 pr-4 text-right text-sm text-gray-500">
                    Delivery Fee
                  </td>
                  <td className="py-2 text-right text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {formatPKR(transaction.deliveryFee || 0)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={5} className="py-3 pr-4 text-right text-sm font-semibold text-gray-700">
                    Total Amount
                  </td>
                  <td className="py-3 text-right text-base font-bold text-gray-900 dark:text-white">
                    {formatPKR(transaction.totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Payment Info */}
      {showPaymentInfo && (
        <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">Payment Info</h2>
          {transaction.paymentEntries && transaction.paymentEntries.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-700">
                <p className="text-xs text-gray-400">Total Paid/Received</p>
                <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                  {formatPKR(paymentTotal)}
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-700">
                <p className="text-xs text-gray-400">Payment Accounts</p>
                <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                  {paymentAccountNames.length ? paymentAccountNames.join(", ") : "—"}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No payment entries recorded.</p>
          )}
        </div>
      )}

      {/* Allocations */}
      {showAllocations && (
        <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">Allocations</h2>
          {allocations.length === 0 ? (
            <p className="text-sm text-gray-500">No allocations found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    {[
                      "Applied to Document #",
                      "Date",
                      "Amount Applied",
                    ].map((col) => (
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
                  {allocations.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                      <td className="py-3.5 pr-4 text-sm text-gray-700 dark:text-gray-200">
                        {a.appliesToTransaction.documentNumber ?? "—"}
                      </td>
                      <td className="py-3.5 pr-4 text-sm text-gray-600 dark:text-gray-300">
                        {a.appliesToTransaction.transactionDate
                          ? fmtDate(a.appliesToTransaction.transactionDate)
                          : "—"}
                      </td>
                      <td className="py-3.5 text-right text-sm font-semibold text-gray-800 dark:text-gray-100">
                        {formatPKR(a.amountApplied)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Delete confirm */}
      {deleteOpen && (
        <Modal isOpen onClose={() => setDeleteOpen(false)} className="max-w-sm mx-4" showCloseButton={false}>
          <div className="p-6">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning-50 dark:bg-warning-500/10">
                <HiOutlineTrash size={24} className="text-warning-500" />
              </div>
              <h3 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">
                Delete Draft
              </h3>
              <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                This will permanently delete the draft transaction.
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setDeleteOpen(false)} disabled={deleteLoading}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleDelete} disabled={deleteLoading}>
                {deleteLoading ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Draft Modal */}
      {editOpen && editForm && (
        <Modal isOpen onClose={() => setEditOpen(false)} className="max-w-3xl mx-4" showCloseButton={false}>
          <div className="p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Draft</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Update transaction details before posting.
                </p>
              </div>
              <button
                onClick={() => setEditOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              >
                <HiOutlineXMark size={18} />
              </button>
            </div>

            {editError && (
              <div className="mb-4 flex items-start gap-2 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
                <HiOutlineExclamationTriangle size={16} className="mt-0.5 shrink-0" />
                {editError}
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Transaction Date
                  </label>
                  <input
                    type="date"
                    value={editForm.transactionDate}
                    onChange={(e) =>
                      setEditForm({ ...editForm, transactionDate: e.target.value })
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                {(transaction.type === "PURCHASE" || transaction.type === "SUPPLIER_PAYMENT" || transaction.type === "SUPPLIER_RETURN") && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Supplier
                    </label>
                    <select
                      value={editForm.supplierId}
                      onChange={(e) => setEditForm({ ...editForm, supplierId: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="">Select supplier</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {(transaction.type === "SALE" || transaction.type === "CUSTOMER_PAYMENT" || transaction.type === "CUSTOMER_RETURN") && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Customer
                    </label>
                    <select
                      value={editForm.customerId}
                      onChange={(e) => setEditForm({ ...editForm, customerId: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="">Select customer</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {(transaction.type === "PURCHASE" || transaction.type === "SALE") && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Delivery Fee
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editForm.deliveryFee}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          deliveryFee: e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                  </div>

                  {transaction.type === "SALE" && (
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Delivery Type
                      </label>
                      <input
                        value={editForm.deliveryType}
                        onChange={(e) =>
                          setEditForm({ ...editForm, deliveryType: e.target.value })
                        }
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        placeholder="HOME_DELIVERY / STORE_PICKUP"
                      />
                    </div>
                  )}
                </div>
              )}

              {transaction.type === "SALE" && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Delivery Address
                  </label>
                  <input
                    value={editForm.deliveryAddress}
                    onChange={(e) => setEditForm({ ...editForm, deliveryAddress: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              )}

              {(transaction.type === "SUPPLIER_PAYMENT" ||
                transaction.type === "CUSTOMER_PAYMENT" ||
                transaction.type === "INTERNAL_TRANSFER") && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Amount
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={editForm.amount}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          amount: e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      From Account
                    </label>
                    <select
                      value={editForm.fromPaymentAccountId}
                      onChange={(e) =>
                        setEditForm({ ...editForm, fromPaymentAccountId: e.target.value })
                      }
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="">Select account</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {transaction.type === "INTERNAL_TRANSFER" && (
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        To Account
                      </label>
                      <select
                        value={editForm.toPaymentAccountId}
                        onChange={(e) =>
                          setEditForm({ ...editForm, toPaymentAccountId: e.target.value })
                        }
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      >
                        <option value="">Select account</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {(transaction.type === "PURCHASE" ||
                transaction.type === "SALE" ||
                transaction.type === "ADJUSTMENT" ||
                transaction.type === "SUPPLIER_RETURN" ||
                transaction.type === "CUSTOMER_RETURN") && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Lines</h4>
                    {(transaction.type === "PURCHASE" || transaction.type === "SALE" || transaction.type === "ADJUSTMENT") && (
                      <button
                        className="text-xs font-medium text-brand-500"
                        onClick={() =>
                          setEditForm({
                            ...editForm,
                            lines: [
                              ...editForm.lines,
                              {
                                _key: `new-${Date.now()}`,
                                variantId: "",
                                quantity: 1,
                                unitCost: transaction.type === "SALE" ? undefined : 1,
                                unitPrice: transaction.type === "SALE" ? 1 : undefined,
                                discountAmount: 0,
                              },
                            ],
                          })
                        }
                      >
                        + Add line
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {editForm.lines.map((line, idx) => (
                      <div key={line._key} className="rounded-xl border border-gray-100 p-3 dark:border-gray-700">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {(transaction.type === "PURCHASE" || transaction.type === "SALE" || transaction.type === "ADJUSTMENT") && (
                            <div>
                              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300">
                                Variant ID
                              </label>
                              <input
                                value={line.variantId ?? ""}
                                onChange={(e) => {
                                  const lines = [...editForm.lines];
                                  lines[idx] = { ...lines[idx], variantId: e.target.value };
                                  setEditForm({ ...editForm, lines });
                                }}
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                              />
                            </div>
                          )}
                          {(transaction.type === "SUPPLIER_RETURN" || transaction.type === "CUSTOMER_RETURN") && (
                            <div>
                              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300">
                                Line ID
                              </label>
                              <input
                                value={line.lineId ?? ""}
                                readOnly
                                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                              />
                            </div>
                          )}

                          <div>
                            <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300">
                              Quantity
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={line.quantity ?? 1}
                              onChange={(e) => {
                                const lines = [...editForm.lines];
                                lines[idx] = { ...lines[idx], quantity: Number(e.target.value) };
                                setEditForm({ ...editForm, lines });
                              }}
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                            />
                          </div>

                          {(transaction.type === "PURCHASE" || transaction.type === "ADJUSTMENT") && (
                            <div>
                              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300">
                                Unit Cost
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={line.unitCost ?? ""}
                                onChange={(e) => {
                                  const lines = [...editForm.lines];
                                  lines[idx] = { ...lines[idx], unitCost: Number(e.target.value) };
                                  setEditForm({ ...editForm, lines });
                                }}
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                              />
                            </div>
                          )}

                          {transaction.type === "SALE" && (
                            <div>
                              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300">
                                Unit Price
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={line.unitPrice ?? ""}
                                onChange={(e) => {
                                  const lines = [...editForm.lines];
                                  lines[idx] = { ...lines[idx], unitPrice: Number(e.target.value) };
                                  setEditForm({ ...editForm, lines });
                                }}
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                              />
                            </div>
                          )}

                          {(transaction.type === "PURCHASE" || transaction.type === "SALE" || transaction.type === "ADJUSTMENT") && (
                            <div>
                              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300">
                                Discount
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={line.discountAmount ?? 0}
                                onChange={(e) => {
                                  const lines = [...editForm.lines];
                                  lines[idx] = { ...lines[idx], discountAmount: Number(e.target.value) };
                                  setEditForm({ ...editForm, lines });
                                }}
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                              />
                            </div>
                          )}

                          {transaction.type === "ADJUSTMENT" && (
                            <div>
                              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300">
                                Direction
                              </label>
                              <select
                                value={line.direction ?? "IN"}
                                onChange={(e) => {
                                  const lines = [...editForm.lines];
                                  lines[idx] = { ...lines[idx], direction: e.target.value as "IN" | "OUT" };
                                  setEditForm({ ...editForm, lines });
                                }}
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                              >
                                <option value="IN">IN</option>
                                <option value="OUT">OUT</option>
                              </select>
                            </div>
                          )}

                          {transaction.type === "ADJUSTMENT" && (
                            <div className="sm:col-span-2">
                              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-300">
                                Reason
                              </label>
                              <input
                                value={line.reason ?? ""}
                                onChange={(e) => {
                                  const lines = [...editForm.lines];
                                  lines[idx] = { ...lines[idx], reason: e.target.value };
                                  setEditForm({ ...editForm, lines });
                                }}
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                              />
                            </div>
                          )}
                        </div>

                        {(transaction.type === "PURCHASE" || transaction.type === "SALE" || transaction.type === "ADJUSTMENT") && (
                          <div className="mt-3 flex justify-end">
                            <button
                              className="text-xs font-medium text-error-500"
                              onClick={() => {
                                const lines = editForm.lines.filter((_, i) => i !== idx);
                                setEditForm({ ...editForm, lines });
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Notes
                </label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  rows={3}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(false)} disabled={editSaving}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleEditSave} disabled={editSaving}>
                {editSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
