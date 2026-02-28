"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  HiOutlineArrowLeft,
  HiOutlineArrowsUpDown,
  HiOutlineBanknotes,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineMagnifyingGlass,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineXMark,
} from "react-icons/hi2";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import DatePicker from "@/components/form/date-picker";
import { ApiError } from "@/lib/api";
import { ApiCustomer, getCustomerBalance, listCustomers } from "@/lib/customers";
import { ApiPaymentAccount, listPaymentAccounts } from "@/lib/paymentAccounts";
import { ApiProduct, getProductStock, listProducts, ProductVariant } from "@/lib/products";
import {
  ApiSupplier,
  ApiTransaction,
  createPurchaseDraft,
  createSaleDraft,
  CreatePurchaseDraftBody,
  CreateSaleDraftBody,
  formatPKR,
  getSupplierBalance,
  listSuppliers,
  postTransaction,
} from "@/lib/suppliers";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500";

const panelClass =
  "rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]";

const DELIVERY_OPTIONS = [
  { value: "", label: "Select delivery type" },
  { value: "STORE_PICKUP", label: "Store Pickup" },
  { value: "HOME_DELIVERY", label: "Home Delivery" },
] as const;

type ScreenMode = "purchase" | "sale";

type LineItemState = {
  id: string;
  productId: string;
  productQuery: string;
  variantId: string;
  quantity: number;
  unitAmount: number;
  discountAmount: number;
};

type ProductStockVariant = {
  variantId: string;
  size: string;
  currentStock: number;
};

type PartyOption = {
  id: string;
  name: string;
  currentBalance: number;
};

function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toLocalDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function normaliseDate(input: string) {
  if (!input) return toLocalDate(new Date());
  return input.slice(0, 10);
}

function createEmptyLine(): LineItemState {
  return {
    id: generateId(),
    productId: "",
    productQuery: "",
    variantId: "",
    quantity: 1,
    unitAmount: 1,
    discountAmount: 0,
  };
}

function getLineTotal(line: LineItemState) {
  return Math.max(line.quantity * line.unitAmount - line.discountAmount, 0);
}

function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
    >
      {children}
      {required && <span className="ml-0.5 text-error-500">*</span>}
    </label>
  );
}

function TransactionPostModal({
  mode,
  isOpen,
  draft,
  accounts,
  accountsLoading,
  onClose,
  onConfirm,
  isSubmitting,
  error,
}: {
  mode: ScreenMode;
  isOpen: boolean;
  draft: ApiTransaction | null;
  accounts: ApiPaymentAccount[];
  accountsLoading: boolean;
  onClose: () => void;
  onConfirm: (payload: { amount?: number; paymentAccountId?: string }) => void;
  isSubmitting: boolean;
  error: string | null;
}) {
  const [collectNow, setCollectNow] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentAccountId, setPaymentAccountId] = useState("");

  useEffect(() => {
    if (!isOpen || !draft) return;
    setCollectNow(false);
    setAmount(String(draft.totalAmount || 0));
    setPaymentAccountId(accounts[0]?.id ?? "");
  }, [isOpen, draft, accounts]);

  if (!draft) return null;

  const isPurchase = mode === "purchase";
  const parsedAmount = Number(amount || 0);
  const paymentInvalid =
    collectNow &&
    (parsedAmount < 0 || parsedAmount > draft.totalAmount || (parsedAmount > 0 && !paymentAccountId));

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="mx-4 max-w-2xl">
      <div className="p-6 sm:p-7">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
              <HiOutlineCheckCircle size={22} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {isPurchase ? "Post Purchase" : "Post Sale"}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {isPurchase
                ? "Confirm this draft and optionally record a payment right now."
                : "Confirm this draft and optionally receive payment right now."}
            </p>
          </div>
        </div>

        <div className="mb-6 grid gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Draft
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-white/90">
              {draft.documentNumber ?? (isPurchase ? "Draft purchase" : "Draft sale")}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Total Amount
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-white/90">
              {formatPKR(draft.totalAmount)}
            </p>
          </div>
        </div>

        <label className="mb-4 flex items-start gap-3 rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
          <input
            type="checkbox"
            checked={collectNow}
            onChange={(e) => setCollectNow(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
          />
          <span>
            <span className="block text-sm font-medium text-gray-800 dark:text-white/90">
              {isPurchase ? "Pay now" : "Receive payment now"}
            </span>
            <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
              {isPurchase
                ? "Leave this off to post the purchase fully on credit."
                : "Leave this off to post the sale as unpaid."}
            </span>
          </span>
        </label>

        {collectNow && (
          <div className="mb-5 grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="post-amount" required>
                {isPurchase ? "Amount to Pay" : "Amount Received"}
              </FieldLabel>
              <input
                id="post-amount"
                type="number"
                min={0}
                max={draft.totalAmount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Max {formatPKR(draft.totalAmount)}
              </p>
            </div>
            <div>
              <FieldLabel htmlFor="payment-account" required>
                Payment Account
              </FieldLabel>
              <select
                id="payment-account"
                value={paymentAccountId}
                onChange={(e) => setPaymentAccountId(e.target.value)}
                className={inputClass}
                disabled={accountsLoading || accounts.length === 0}
              >
                <option value="">Select account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({formatPKR(account._computed.currentBalance)})
                  </option>
                ))}
              </select>
              {accountsLoading && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Loading accounts...</p>
              )}
              {!accountsLoading && accounts.length === 0 && (
                <p className="mt-1 text-xs text-warning-600 dark:text-warning-400">
                  No active payment accounts are available.
                </p>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-5 flex items-start gap-2 rounded-2xl border border-error-100 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-400">
            <HiOutlineExclamationTriangle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onConfirm(
                collectNow
                  ? {
                      amount: parsedAmount,
                      paymentAccountId: parsedAmount > 0 ? paymentAccountId : undefined,
                    }
                  : {}
              )
            }
            disabled={isSubmitting || paymentInvalid}
            startIcon={<HiOutlineBanknotes size={18} />}
          >
            {isSubmitting ? "Posting..." : "Confirm & Post"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function TransactionCreatePage({ mode }: { mode: ScreenMode }) {
  const router = useRouter();
  const isPurchase = mode === "purchase";
  const isSale = mode === "sale";

  const [suppliers, setSuppliers] = useState<ApiSupplier[]>([]);
  const [customers, setCustomers] = useState<ApiCustomer[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<ApiPaymentAccount[]>([]);

  const [partyOptions, setPartyOptions] = useState<PartyOption[]>([]);
  const [partyLoading, setPartyLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [paymentAccountsLoading, setPaymentAccountsLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const [partyId, setPartyId] = useState("");
  const [partyQuery, setPartyQuery] = useState("");
  const [partyOpen, setPartyOpen] = useState(false);
  const [partyBalance, setPartyBalance] = useState<number | null>(null);
  const [partyBalanceLoading, setPartyBalanceLoading] = useState(false);

  const [transactionDate, setTransactionDate] = useState(toLocalDate(new Date()));
  const [deliveryType, setDeliveryType] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItemState[]>([createEmptyLine()]);
  const [activeProductPickerId, setActiveProductPickerId] = useState<string | null>(null);
  const [stockByProductId, setStockByProductId] = useState<Record<string, ProductStockVariant[]>>({});
  const [stockLoadingByProductId, setStockLoadingByProductId] = useState<Record<string, boolean>>({});

  const [validationError, setValidationError] = useState<string | null>(null);
  const [draftSubmitting, setDraftSubmitting] = useState(false);
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [draftForPost, setDraftForPost] = useState<ApiTransaction | null>(null);
  const [postModalOpen, setPostModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadLookups = async () => {
      setPageError(null);
      setPartyLoading(true);
      setProductsLoading(true);
      setPaymentAccountsLoading(true);

      try {
        const [partyRes, productRes, accountRes] = await Promise.all([
          isPurchase
            ? listSuppliers({ status: "ACTIVE", limit: 100, page: 1, sortBy: "name", sortOrder: "asc" })
            : listCustomers({ status: "ACTIVE", limit: 100, page: 1, sortBy: "name", sortOrder: "asc" }),
          listProducts({ status: "ACTIVE", limit: 100, page: 1, sortBy: "name", sortOrder: "asc" }),
          listPaymentAccounts({ status: "ACTIVE", limit: 100, page: 1 }),
        ]);

        if (cancelled) return;

        if (isPurchase) {
          const supplierData = partyRes.data as ApiSupplier[];
          setSuppliers(supplierData);
          setPartyOptions(
            supplierData.map((supplier) => ({
              id: supplier.id,
              name: supplier.name,
              currentBalance: supplier.currentBalance ?? 0,
            }))
          );
        } else {
          const customerData = partyRes.data as ApiCustomer[];
          setCustomers(customerData);
          setPartyOptions(
            customerData.map((customer) => ({
              id: customer.id,
              name: customer.name,
              currentBalance: customer.currentBalance ?? 0,
            }))
          );
        }

        setProducts(productRes.data);
        setPaymentAccounts(accountRes.data);
      } catch (err) {
        if (cancelled) return;
        const apiErr = err as ApiError;
        setPageError(apiErr.message ?? "Failed to load form data.");
      } finally {
        if (!cancelled) {
          setPartyLoading(false);
          setProductsLoading(false);
          setPaymentAccountsLoading(false);
        }
      }
    };

    loadLookups();

    return () => {
      cancelled = true;
    };
  }, [isPurchase]);

  useEffect(() => {
    if (!partyId) {
      setPartyBalance(null);
      return;
    }

    let cancelled = false;

    const loadBalance = async () => {
      setPartyBalanceLoading(true);
      try {
        const balance = isPurchase
          ? await getSupplierBalance(partyId)
          : await getCustomerBalance(partyId);
        if (!cancelled) {
          setPartyBalance(balance.currentBalance);
        }
      } catch {
        if (!cancelled) {
          setPartyBalance(null);
        }
      } finally {
        if (!cancelled) {
          setPartyBalanceLoading(false);
        }
      }
    };

    loadBalance();

    return () => {
      cancelled = true;
    };
  }, [isPurchase, partyId]);

  const filteredParties = useMemo(() => {
    const query = partyQuery.trim().toLowerCase();
    if (!query) return partyOptions;
    return partyOptions.filter((party) => party.name.toLowerCase().includes(query));
  }, [partyOptions, partyQuery]);

  const subtotal = useMemo(() => lines.reduce((sum, line) => sum + getLineTotal(line), 0), [lines]);
  const totalDiscount = useMemo(
    () => lines.reduce((sum, line) => sum + Math.max(line.discountAmount, 0), 0),
    [lines]
  );
  const totalAmount = subtotal + Math.max(deliveryFee, 0);

  const selectedParty = useMemo(
    () => partyOptions.find((party) => party.id === partyId) ?? null,
    [partyId, partyOptions]
  );

  const ensureProductStock = async (productId: string) => {
    if (!productId || stockByProductId[productId] || stockLoadingByProductId[productId]) {
      return;
    }

    setStockLoadingByProductId((current) => ({ ...current, [productId]: true }));

    try {
      const stock = await getProductStock(productId);
      setStockByProductId((current) => ({
        ...current,
        [productId]: stock.variants.map((variant) => ({
          variantId: variant.variantId,
          size: variant.size,
          currentStock: variant.currentStock,
        })),
      }));
    } catch {
      setStockByProductId((current) => ({ ...current, [productId]: [] }));
    } finally {
      setStockLoadingByProductId((current) => ({ ...current, [productId]: false }));
    }
  };

  const updateLine = (lineId: string, updates: Partial<LineItemState>) => {
    setLines((current) => current.map((line) => (line.id === lineId ? { ...line, ...updates } : line)));
  };

  const selectParty = (party: PartyOption) => {
    setPartyId(party.id);
    setPartyQuery(party.name);
    setPartyOpen(false);
    setValidationError(null);
  };

  const handleProductQueryChange = (lineId: string, nextQuery: string) => {
    setLines((current) =>
      current.map((line) =>
        line.id === lineId
          ? {
              ...line,
              productQuery: nextQuery,
              productId: "",
              variantId: "",
            }
          : line
      )
    );
    setActiveProductPickerId(lineId);
  };

  const handleSelectProduct = async (lineId: string, product: ApiProduct) => {
    setLines((current) =>
      current.map((line) =>
        line.id === lineId
          ? {
              ...line,
              productId: product.id,
              productQuery: product.name,
              variantId: "",
            }
          : line
      )
    );
    setActiveProductPickerId(null);
    setValidationError(null);
    await ensureProductStock(product.id);
  };

  const addLine = () => {
    setLines((current) => [...current, createEmptyLine()]);
  };

  const removeLine = (lineId: string) => {
    setLines((current) => (current.length === 1 ? current : current.filter((line) => line.id !== lineId)));
  };

  const buildDraftPayload = (): CreatePurchaseDraftBody | CreateSaleDraftBody | null => {
    if (!partyId) {
      setValidationError(`Select a ${isPurchase ? "supplier" : "customer"} before saving.`);
      return null;
    }

    if (!transactionDate) {
      setValidationError("Select a transaction date.");
      return null;
    }

    if (isSale && deliveryType && !DELIVERY_OPTIONS.some((option) => option.value === deliveryType)) {
      setValidationError("Select a valid delivery type.");
      return null;
    }

    if (isSale && deliveryType === "HOME_DELIVERY" && !deliveryAddress.trim()) {
      setValidationError("Delivery address is required for home delivery.");
      return null;
    }

    if (isSale && deliveryAddress.trim().length > 500) {
      setValidationError("Delivery address cannot exceed 500 characters.");
      return null;
    }

    const preparedLines = lines.map((line, index) => {
      const selectedProduct = products.find((product) => product.id === line.productId);
      const selectedVariant = selectedProduct?.variants.find((variant) => variant.id === line.variantId);

      if (!line.productId || !selectedProduct) {
        throw new Error(`Line ${index + 1}: select a product.`);
      }
      if (!line.variantId || !selectedVariant) {
        throw new Error(`Line ${index + 1}: select a size / variant.`);
      }
      if (selectedVariant.status !== "ACTIVE") {
        throw new Error(`Line ${index + 1}: the selected variant is not active.`);
      }
      if (!Number.isFinite(line.quantity) || line.quantity < 1) {
        throw new Error(`Line ${index + 1}: quantity must be at least 1.`);
      }
      if (!Number.isFinite(line.unitAmount) || line.unitAmount < 1) {
        throw new Error(`Line ${index + 1}: ${isPurchase ? "unit cost" : "unit price"} must be at least 1.`);
      }
      if (!Number.isFinite(line.discountAmount) || line.discountAmount < 0) {
        throw new Error(`Line ${index + 1}: discount cannot be negative.`);
      }
      if (line.discountAmount > line.quantity * line.unitAmount) {
        throw new Error(`Line ${index + 1}: discount cannot exceed the line amount.`);
      }

      if (isSale) {
        const stock = (stockByProductId[line.productId] ?? []).find(
          (item) => item.variantId === line.variantId
        );
        if (stock && line.quantity > stock.currentStock) {
          throw new Error(
            `Line ${index + 1}: quantity exceeds available stock (${stock.currentStock}) for the selected size.`
          );
        }
      }

      return isPurchase
        ? {
            variantId: line.variantId,
            quantity: Math.trunc(line.quantity),
            unitCost: Math.trunc(line.unitAmount),
            discountAmount: Math.trunc(line.discountAmount),
          }
        : {
            variantId: line.variantId,
            quantity: Math.trunc(line.quantity),
            unitPrice: Math.trunc(line.unitAmount),
            discountAmount: Math.trunc(line.discountAmount),
          };
    });

    if (preparedLines.length === 0) {
      setValidationError(`Add at least one ${isPurchase ? "purchase" : "sale"} line.`);
      return null;
    }

    if (deliveryFee < 0) {
      setValidationError("Delivery fee cannot be negative.");
      return null;
    }

    if (notes.length > 1000) {
      setValidationError("Notes cannot exceed 1000 characters.");
      return null;
    }

    setValidationError(null);

    if (isPurchase) {
      return {
        supplierId: partyId,
        transactionDate: normaliseDate(transactionDate),
        lines: preparedLines as CreatePurchaseDraftBody["lines"],
        deliveryFee: Math.trunc(deliveryFee),
        notes: notes.trim() || undefined,
        idempotencyKey: generateId(),
      };
    }

    return {
      customerId: partyId,
      transactionDate: normaliseDate(transactionDate),
      lines: preparedLines as CreateSaleDraftBody["lines"],
      deliveryFee: Math.trunc(deliveryFee),
      deliveryType: deliveryType || undefined,
      deliveryAddress: deliveryAddress.trim() || undefined,
      notes: notes.trim() || undefined,
      idempotencyKey: generateId(),
    };
  };

  const submitDraft = async (intent: "draft" | "post") => {
    let payload: CreatePurchaseDraftBody | CreateSaleDraftBody | null = null;

    try {
      payload = buildDraftPayload();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Please review the transaction lines.";
      setValidationError(message);
      return;
    }

    if (!payload) return;

    setDraftSubmitting(true);
    setPageError(null);
    setPostError(null);

    try {
      const transaction = isPurchase
        ? await createPurchaseDraft(payload as CreatePurchaseDraftBody)
        : await createSaleDraft(payload as CreateSaleDraftBody);

      if (intent === "draft") {
        sessionStorage.setItem("transactionId", transaction.id);
        router.push("/transactions/detail");
        return;
      }

      setDraftForPost(transaction);
      setPostModalOpen(true);
    } catch (err) {
      const apiErr = err as ApiError;
      setPageError(
        apiErr.message ?? `Failed to save the ${isPurchase ? "purchase" : "sale"} draft.`
      );
    } finally {
      setDraftSubmitting(false);
    }
  };

  const confirmPost = async ({ amount, paymentAccountId }: { amount?: number; paymentAccountId?: string }) => {
    if (!draftForPost) return;

    setPostSubmitting(true);
    setPostError(null);

    try {
      const posted = await postTransaction(draftForPost.id, {
        idempotencyKey: generateId(),
        ...(amount && amount > 0
          ? isPurchase
            ? { paidNow: Math.trunc(amount), paymentAccountId }
            : { receivedNow: Math.trunc(amount), paymentAccountId }
          : {}),
      });
      sessionStorage.setItem("transactionId", posted.id);
      router.push("/transactions/detail");
    } catch (err) {
      const apiErr = err as ApiError;
      setPostError(
        apiErr.message ?? `Failed to post this ${isPurchase ? "purchase" : "sale"}.`
      );
    } finally {
      setPostSubmitting(false);
    }
  };

  const partyLabel = isPurchase ? "Supplier" : "Customer";
  const pageTitle = isPurchase ? "Create Purchase" : "Create Sale";
  const pageSubtitle = isPurchase
    ? "Build the draft first, then optionally post it with a payment."
    : "Build the draft first, then optionally post it and receive payment.";
  const unitLabel = isPurchase ? "Unit Cost" : "Unit Price";
  const balanceHelp = isPurchase
    ? "This shows what you currently owe the selected supplier."
    : "This shows what the selected customer currently owes you.";

  return (
    <>
      <div className="mx-auto w-full max-w-[1400px] space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <Link
              href="/transactions"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
            >
              <HiOutlineArrowLeft size={16} />
              Back to Transactions
            </Link>
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
                <HiOutlineArrowsUpDown size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{pageTitle}</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{pageSubtitle}</p>
              </div>
            </div>
          </div>
        </div>

        {pageError && (
          <div className="flex items-start gap-3 rounded-2xl border border-error-100 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-400">
            <HiOutlineExclamationTriangle size={18} className="mt-0.5 shrink-0" />
            <span>{pageError}</span>
          </div>
        )}

        {validationError && (
          <div className="flex items-start gap-3 rounded-2xl border border-warning-100 bg-warning-50 px-4 py-3 text-sm text-warning-700 dark:border-warning-500/20 dark:bg-warning-500/10 dark:text-warning-300">
            <HiOutlineExclamationTriangle size={18} className="mt-0.5 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className={`${panelClass} overflow-visible`}>
            <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{pageTitle} Details</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {isPurchase
                  ? "Select the supplier, date, and the items you are receiving."
                  : "Select the customer, date, and the items you are selling."}
              </p>
            </div>

            <div className="space-y-8 px-6 py-6">
              <div className={`grid gap-5 ${isSale ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
                <div className="relative">
                  <FieldLabel htmlFor="party-search" required>
                    {partyLabel}
                  </FieldLabel>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <HiOutlineMagnifyingGlass size={18} />
                    </span>
                    <input
                      id="party-search"
                      value={partyQuery}
                      onChange={(e) => {
                        setPartyQuery(e.target.value);
                        setPartyId("");
                        setPartyOpen(true);
                      }}
                      onFocus={() => setPartyOpen(true)}
                      placeholder={partyLoading ? `Loading ${partyLabel.toLowerCase()}s...` : `Search ${partyLabel.toLowerCase()} by name`}
                      className={`${inputClass} pl-11 pr-10`}
                      disabled={partyLoading}
                    />
                    {partyQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setPartyId("");
                          setPartyQuery("");
                          setPartyOpen(false);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-200"
                        aria-label={`Clear ${partyLabel.toLowerCase()}`}
                      >
                        <HiOutlineXMark size={18} />
                      </button>
                    )}
                  </div>
                  {partyOpen && (
                    <div className="absolute z-30 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
                      {filteredParties.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No results found.</p>
                      ) : (
                        filteredParties.map((party) => (
                          <button
                            key={party.id}
                            type="button"
                            onClick={() => selectParty(party)}
                            className="block w-full rounded-xl px-3 py-2 text-left transition hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                          >
                            <span className="block text-sm font-medium text-gray-800 dark:text-white/90">
                              {party.name}
                            </span>
                            <span className="block text-xs text-gray-500 dark:text-gray-400">
                              Balance {formatPKR(party.currentBalance)}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <FieldLabel required>Transaction Date</FieldLabel>
                  <DatePicker
                    id={`${mode}-transaction-date`}
                    mode="single"
                    defaultDate={transactionDate}
                    placeholder="Select transaction date"
                    onChange={(selectedDates) => {
                      if (selectedDates[0]) {
                        setTransactionDate(toLocalDate(selectedDates[0]));
                      }
                    }}
                  />
                </div>

                {isSale && (
                  <div>
                    <FieldLabel htmlFor="delivery-type">Delivery Type</FieldLabel>
                    <select
                      id="delivery-type"
                      value={deliveryType}
                      onChange={(e) => {
                        const next = e.target.value;
                        setDeliveryType(next);
                        if (next !== "HOME_DELIVERY") {
                          setDeliveryAddress("");
                        }
                      }}
                      className={inputClass}
                    >
                      {DELIVERY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">Line Items</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Product selection follows the Product to Size flow defined in the wireframe.
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={addLine} startIcon={<HiOutlinePlus size={16} />}>
                    Add Line
                  </Button>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                    <thead className="bg-gray-50 dark:bg-gray-900/40">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Size / Variant</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Qty</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{unitLabel}</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Discount</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Line Total</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {lines.map((line) => {
                        const selectedProduct = products.find((product) => product.id === line.productId) ?? null;
                        const activeVariants = (selectedProduct?.variants ?? []).filter(
                          (variant) => variant.status === "ACTIVE"
                        );
                        const productMatches = products.filter((product) => {
                          const query = line.productQuery.trim().toLowerCase();
                          if (!query) return true;
                          return (
                            product.name.toLowerCase().includes(query) ||
                            (product.sku ?? "").toLowerCase().includes(query)
                          );
                        });
                        const stockVariants = stockByProductId[line.productId] ?? [];
                        const selectedStock = stockVariants.find((item) => item.variantId === line.variantId);
                        const hasStockWarning = isSale && !!selectedStock && line.quantity > selectedStock.currentStock;

                        return (
                          <tr key={line.id} className="align-top">
                            <td className="px-4 py-4">
                              <div className="relative min-w-[220px]">
                                <div className="relative">
                                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                    <HiOutlineMagnifyingGlass size={16} />
                                  </span>
                                  <input
                                    value={line.productQuery}
                                    onChange={(e) => handleProductQueryChange(line.id, e.target.value)}
                                    onFocus={() => setActiveProductPickerId(line.id)}
                                    placeholder={productsLoading ? "Loading products..." : "Search product"}
                                    className={`${inputClass} pl-10`}
                                    disabled={productsLoading}
                                  />
                                </div>
                                {activeProductPickerId === line.id && (
                                  <div className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
                                    {productMatches.length === 0 ? (
                                      <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No products found.</p>
                                    ) : (
                                      productMatches.map((product) => (
                                        <button
                                          key={product.id}
                                          type="button"
                                          onClick={() => void handleSelectProduct(line.id, product)}
                                          className="block w-full rounded-xl px-3 py-2 text-left transition hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                                        >
                                          <span className="block text-sm font-medium text-gray-800 dark:text-white/90">
                                            {product.name}
                                          </span>
                                          <span className="block text-xs text-gray-500 dark:text-gray-400">
                                            {product.sku || "No SKU"}
                                          </span>
                                        </button>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="min-w-[220px]">
                                <select
                                  value={line.variantId}
                                  onChange={(e) => updateLine(line.id, { variantId: e.target.value })}
                                  className={inputClass}
                                  disabled={!selectedProduct}
                                >
                                  <option value="">Select size</option>
                                  {activeVariants.map((variant: ProductVariant) => {
                                    const stock = stockVariants.find((item) => item.variantId === variant.id);
                                    return (
                                      <option key={variant.id} value={variant.id}>
                                        {variant.size}
                                        {stock ? ` - ${stock.currentStock} in stock` : ""}
                                      </option>
                                    );
                                  })}
                                </select>
                                {!selectedProduct && (
                                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Pick a product first.</p>
                                )}
                                {selectedProduct && stockLoadingByProductId[selectedProduct.id] && (
                                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Loading stock...</p>
                                )}
                                {hasStockWarning && (
                                  <p className="mt-1 text-xs text-warning-600 dark:text-warning-400">
                                    Stock warning: only {selectedStock.currentStock} available for this size.
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <input
                                type="number"
                                min={1}
                                value={line.quantity}
                                onChange={(e) =>
                                  updateLine(line.id, {
                                    quantity: Math.max(1, Number(e.target.value || 1)),
                                  })
                                }
                                className={`${inputClass} min-w-[96px]`}
                              />
                            </td>
                            <td className="px-4 py-4">
                              <input
                                type="number"
                                min={1}
                                value={line.unitAmount}
                                onChange={(e) =>
                                  updateLine(line.id, {
                                    unitAmount: Math.max(1, Number(e.target.value || 1)),
                                  })
                                }
                                className={`${inputClass} min-w-[120px]`}
                              />
                            </td>
                            <td className="px-4 py-4">
                              <input
                                type="number"
                                min={0}
                                value={line.discountAmount}
                                onChange={(e) =>
                                  updateLine(line.id, {
                                    discountAmount: Math.max(0, Number(e.target.value || 0)),
                                  })
                                }
                                className={`${inputClass} min-w-[120px]`}
                              />
                            </td>
                            <td className="px-4 py-4 text-right text-sm font-semibold text-gray-800 dark:text-white/90">
                              {formatPKR(getLineTotal(line))}
                            </td>
                            <td className="px-4 py-4 text-right">
                              <button
                                type="button"
                                onClick={() => removeLine(line.id)}
                                disabled={lines.length === 1}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:border-error-200 hover:bg-error-50 hover:text-error-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:border-error-500/30 dark:hover:bg-error-500/10 dark:hover:text-error-400"
                                aria-label="Remove line"
                              >
                                <HiOutlineTrash size={18} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className={`grid gap-5 ${isSale ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
                {isSale && deliveryType === "HOME_DELIVERY" && (
                  <div className="lg:col-span-3">
                    <FieldLabel htmlFor="delivery-address" required>
                      Delivery Address
                    </FieldLabel>
                    <input
                      id="delivery-address"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      maxLength={500}
                      className={inputClass}
                      placeholder="Enter delivery address"
                    />
                    <p className="mt-1 text-right text-xs text-gray-500 dark:text-gray-400">
                      {deliveryAddress.length}/500
                    </p>
                  </div>
                )}

                <div>
                  <FieldLabel htmlFor="delivery-fee">Delivery Fee</FieldLabel>
                  <input
                    id="delivery-fee"
                    type="number"
                    min={0}
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(Math.max(0, Number(e.target.value || 0)))}
                    className={inputClass}
                  />
                </div>
                <div className={isSale ? "lg:col-span-2" : ""}>
                  <FieldLabel htmlFor="transaction-notes">Notes</FieldLabel>
                  <textarea
                    id="transaction-notes"
                    rows={4}
                    value={notes}
                    maxLength={1000}
                    onChange={(e) => setNotes(e.target.value)}
                    className={`${inputClass} min-h-[110px] resize-y`}
                    placeholder={isPurchase ? "Optional notes for this purchase" : "Optional notes for this sale"}
                  />
                  <p className="mt-1 text-right text-xs text-gray-500 dark:text-gray-400">{notes.length}/1000</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-gray-200 pt-6 dark:border-gray-800 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => void submitDraft("draft")} disabled={draftSubmitting}>
                  {draftSubmitting ? "Saving..." : "Save as Draft"}
                </Button>
                <Button onClick={() => void submitDraft("post")} disabled={draftSubmitting}>
                  {draftSubmitting ? "Saving..." : "Save & Post"}
                </Button>
              </div>
            </div>
          </section>

          <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <section className={`${panelClass} p-6`}>
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400">
                  <HiOutlineBanknotes size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Live Summary</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Totals update as you edit the draft.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{partyLabel}</span>
                  <span className="font-medium text-gray-800 dark:text-white/90">
                    {selectedParty?.name ?? "Not selected"}
                  </span>
                </div>
                {isSale && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Delivery Type</span>
                    <span className="font-medium text-gray-800 dark:text-white/90">
                      {deliveryType
                        ? DELIVERY_OPTIONS.find((option) => option.value === deliveryType)?.label ?? "—"
                        : "—"}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                  <span className="font-medium text-gray-800 dark:text-white/90">{formatPKR(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Total Discount</span>
                  <span className="font-medium text-gray-800 dark:text-white/90">{formatPKR(totalDiscount)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Delivery Fee</span>
                  <span className="font-medium text-gray-800 dark:text-white/90">
                    {formatPKR(Math.max(deliveryFee, 0))}
                  </span>
                </div>
                <div className="rounded-2xl bg-gray-50 px-4 py-4 dark:bg-gray-900/40">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Amount</span>
                    <span className="text-xl font-bold text-gray-900 dark:text-white">{formatPKR(totalAmount)}</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-200 px-4 py-4 dark:border-gray-800">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{partyLabel} Current Balance</span>
                    <span className="font-medium text-gray-800 dark:text-white/90">
                      {partyBalanceLoading
                        ? "Loading..."
                        : partyBalance === null
                          ? "—"
                          : formatPKR(partyBalance)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{balanceHelp}</p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>

      <TransactionPostModal
        mode={mode}
        isOpen={postModalOpen}
        draft={draftForPost}
        accounts={paymentAccounts}
        accountsLoading={paymentAccountsLoading}
        onClose={() => {
          if (postSubmitting) return;
          setPostModalOpen(false);
          setPostError(null);
        }}
        onConfirm={confirmPost}
        isSubmitting={postSubmitting}
        error={postError}
      />
    </>
  );
}
