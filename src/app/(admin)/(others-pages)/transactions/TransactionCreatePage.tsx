"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  HiOutlineBanknotes,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineMagnifyingGlass,
  HiOutlinePencilSquare,
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
import { ApiProduct, getProductStock, listProducts } from "@/lib/products";
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

const numberInputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500";

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
  avgCost: number;
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
    quantity: 0,
    unitAmount: 0,
    discountAmount: 0,
  };
}

function getLineTotal(line: LineItemState) {
  return Math.max(line.quantity * line.unitAmount - line.discountAmount, 0);
}

function blockWheelIncrement(event: React.WheelEvent<HTMLInputElement>) {
  event.currentTarget.blur();
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
                onWheel={blockWheelIncrement}
                className={numberInputClass}
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
  const [lines, setLines] = useState<LineItemState[]>([]);
  const [stockByProductId, setStockByProductId] = useState<Record<string, ProductStockVariant[]>>({});
  const [stockLoadingByProductId, setStockLoadingByProductId] = useState<Record<string, boolean>>({});
  const [lineComposerOpen, setLineComposerOpen] = useState(false);
  const [lineComposer, setLineComposer] = useState<LineItemState>(createEmptyLine());
  const [lineComposerError, setLineComposerError] = useState<string | null>(null);
  const [lineComposerProductOpen, setLineComposerProductOpen] = useState(false);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const partyDropdownRef = useRef<HTMLDivElement | null>(null);
  const composerProductDropdownRef = useRef<HTMLDivElement | null>(null);
  const [costHintMessage, setCostHintMessage] = useState<string | null>(null);
  const [costHintSecondsLeft, setCostHintSecondsLeft] = useState(0);
  const costHintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const costHintIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const composerProducts = useMemo(() => {
    const query = lineComposer.productQuery.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(query) ||
        (product.sku ?? "").toLowerCase().includes(query)
      );
    });
  }, [lineComposer.productQuery, products]);

  const composerSelectedProduct = useMemo(() => {
    return products.find((product) => product.id === lineComposer.productId) ?? null;
  }, [lineComposer.productId, products]);

  const composerActiveVariants = useMemo(() => {
    return (composerSelectedProduct?.variants ?? []).filter((variant) => variant.status === "ACTIVE");
  }, [composerSelectedProduct]);

  const composerSelectedVariant = useMemo(() => {
    return composerActiveVariants.find((variant) => variant.id === lineComposer.variantId) ?? null;
  }, [composerActiveVariants, lineComposer.variantId]);

  const composerStockVariants = useMemo(() => {
    return stockByProductId[lineComposer.productId] ?? [];
  }, [lineComposer.productId, stockByProductId]);

  const composerSelectedStock = useMemo(() => {
    return composerStockVariants.find((item) => item.variantId === lineComposer.variantId);
  }, [composerStockVariants, lineComposer.variantId]);

  const composerAvgCost = useMemo(() => {
    if (!composerSelectedProduct) return null;
    if (lineComposer.variantId) {
      return composerSelectedStock?.avgCost ?? composerSelectedVariant?.avgCost ?? null;
    }
    return composerSelectedProduct.avgCost ?? null;
  }, [
    composerSelectedProduct,
    composerSelectedStock,
    composerSelectedVariant,
    lineComposer.variantId,
  ]);

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
          avgCost: variant.avgCost,
        })),
      }));
    } catch {
      setStockByProductId((current) => ({ ...current, [productId]: [] }));
    } finally {
      setStockLoadingByProductId((current) => ({ ...current, [productId]: false }));
    }
  };

  const selectParty = (party: PartyOption) => {
    setPartyId(party.id);
    setPartyQuery(party.name);
    setPartyOpen(false);
    setValidationError(null);
  };

  useEffect(() => {
    if (!lineComposerOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [lineComposerOpen]);

  useEffect(() => {
    return () => {
      if (costHintTimeoutRef.current) {
        clearTimeout(costHintTimeoutRef.current);
      }
      if (costHintIntervalRef.current) {
        clearInterval(costHintIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;

      if (partyOpen && partyDropdownRef.current && !partyDropdownRef.current.contains(target)) {
        setPartyOpen(false);
      }

      if (
        lineComposerProductOpen &&
        composerProductDropdownRef.current &&
        !composerProductDropdownRef.current.contains(target)
      ) {
        setLineComposerProductOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [lineComposerProductOpen, partyOpen]);

  const showCostHintToast = (message: string, durationSeconds = 4) => {
    if (costHintTimeoutRef.current) {
      clearTimeout(costHintTimeoutRef.current);
    }
    if (costHintIntervalRef.current) {
      clearInterval(costHintIntervalRef.current);
    }

    setCostHintMessage(message);
    setCostHintSecondsLeft(durationSeconds);

    costHintIntervalRef.current = setInterval(() => {
      setCostHintSecondsLeft((current) => {
        if (current <= 1) {
          if (costHintIntervalRef.current) {
            clearInterval(costHintIntervalRef.current);
            costHintIntervalRef.current = null;
          }
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    costHintTimeoutRef.current = setTimeout(() => {
      setCostHintMessage(null);
      setCostHintSecondsLeft(0);
      if (costHintIntervalRef.current) {
        clearInterval(costHintIntervalRef.current);
        costHintIntervalRef.current = null;
      }
      costHintTimeoutRef.current = null;
    }, durationSeconds * 1000);
  };

  const openLineComposer = () => {
    setEditingLineId(null);
    setLineComposer(createEmptyLine());
    setLineComposerError(null);
    setLineComposerProductOpen(false);
    setLineComposerOpen(true);
  };

  const openLineComposerForEdit = (lineId: string) => {
    const target = lines.find((line) => line.id === lineId);
    if (!target) return;

    setEditingLineId(lineId);
    setLineComposer({ ...target });
    setLineComposerError(null);
    setLineComposerProductOpen(false);
    setLineComposerOpen(true);
    void ensureProductStock(target.productId);
  };

  const closeLineComposer = () => {
    setLineComposerOpen(false);
    setLineComposerProductOpen(false);
    setLineComposerError(null);
    setEditingLineId(null);
  };

  const handleComposerSelectProduct = async (product: ApiProduct) => {
    setLineComposer((current) => ({
      ...current,
      productId: product.id,
      productQuery: product.name,
      variantId: "",
    }));
    setLineComposerProductOpen(false);
    setLineComposerError(null);
    await ensureProductStock(product.id);
  };

  const addLineFromComposer = () => {
    if (!lineComposer.productId || !composerSelectedProduct) {
      setLineComposerError("Select a product.");
      return;
    }
    if (!lineComposer.variantId) {
      setLineComposerError("Select a size / variant.");
      return;
    }
    if (!Number.isFinite(lineComposer.quantity) || lineComposer.quantity < 1) {
      setLineComposerError("Quantity must be at least 1.");
      return;
    }
    if (!Number.isFinite(lineComposer.unitAmount) || lineComposer.unitAmount < 1) {
      setLineComposerError(`${isPurchase ? "Unit cost" : "Unit price"} must be at least 1.`);
      return;
    }
    if (!Number.isFinite(lineComposer.discountAmount) || lineComposer.discountAmount < 0) {
      setLineComposerError("Discount cannot be negative.");
      return;
    }
    if (lineComposer.discountAmount > lineComposer.quantity * lineComposer.unitAmount) {
      setLineComposerError("Discount cannot exceed the line amount.");
      return;
    }
    if (isSale && composerSelectedStock && lineComposer.quantity > composerSelectedStock.currentStock) {
      setLineComposerError(
        `Quantity exceeds available stock (${composerSelectedStock.currentStock}) for this size.`
      );
      return;
    }

    if (editingLineId) {
      setLines((current) =>
        current.map((line) =>
          line.id === editingLineId
            ? {
                ...lineComposer,
                id: editingLineId,
                quantity: Math.max(1, Math.trunc(lineComposer.quantity)),
                unitAmount: Math.max(1, Math.trunc(lineComposer.unitAmount)),
                discountAmount: Math.max(0, Math.trunc(lineComposer.discountAmount)),
              }
            : line
        )
      );
    } else {
      setLines((current) => [
        ...current,
        {
          ...lineComposer,
          id: generateId(),
          quantity: Math.max(1, Math.trunc(lineComposer.quantity)),
          unitAmount: Math.max(1, Math.trunc(lineComposer.unitAmount)),
          discountAmount: Math.max(0, Math.trunc(lineComposer.discountAmount)),
        },
      ]);
    }
    closeLineComposer();
    setValidationError(null);
  };

  const removeLine = (lineId: string) => {
    setLines((current) => current.filter((line) => line.id !== lineId));
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
  const unitLabel = isPurchase ? "Unit Cost" : "Unit Price";
  const balanceHelp = isPurchase
    ? "This shows what you currently owe the selected supplier."
    : "This shows what the selected customer currently owes you.";

  return (
    <>
      <div className="mx-auto w-full max-w-[1400px] space-y-6">
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
            <div className="border-b border-gray-200 px-4 py-4 dark:border-gray-800 sm:px-6 sm:py-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{pageTitle} Details</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {isPurchase
                  ? "Select the supplier, date, and the items you are receiving."
                  : "Select the customer, date, and the items you are selling."}
              </p>
            </div>

            <div className="space-y-6 px-4 py-5 sm:space-y-8 sm:px-6 sm:py-6">
              <div className={`grid gap-5 ${isSale ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
                <div className="relative" ref={partyDropdownRef}>
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
                <div className="overflow-x-visible rounded-2xl border border-gray-200 dark:border-gray-800">
                  <table className="w-full table-fixed divide-y divide-gray-200 dark:divide-gray-800">
                    <thead className="hidden bg-gray-50 dark:bg-gray-900/40 md:table-header-group">
                      <tr>
                        <th className="w-[24%] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 sm:px-4">Product</th>
                        <th className="w-[12%] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 sm:px-4">Variant</th>
                        <th className="w-[8%] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 sm:px-4">Qty</th>
                        <th className="w-[14%] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 sm:px-4">{unitLabel}</th>
                        <th className="w-[12%] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 sm:px-4">Discount</th>
                        <th className="w-[16%] px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 sm:px-4">Line Total</th>
                        <th className="w-[14%] px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 sm:px-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {lines.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8">
                            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50/70 p-5 text-center dark:border-gray-700 dark:bg-gray-900/30">
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                No line items added yet.
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Use the composer button below to add your first line item.
                              </p>
                              <div className="pt-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={openLineComposer}
                                  startIcon={<HiOutlinePlus size={16} />}
                                >
                                  Add Line Item
                                </Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        lines.map((line) => {
                        const selectedProduct = products.find((product) => product.id === line.productId) ?? null;
                        const selectedVariant = selectedProduct?.variants.find((variant) => variant.id === line.variantId) ?? null;
                        const stockVariants = stockByProductId[line.productId] ?? [];
                        const selectedStock = stockVariants.find((item) => item.variantId === line.variantId);
                        const hasStockWarning = isSale && !!selectedStock && line.quantity > selectedStock.currentStock;

                        return (
                          <React.Fragment key={line.id}>
                            <tr className="md:hidden">
                              <td colSpan={7} className="px-3 py-3">
                                <div className="rounded-xl border border-gray-200 bg-gray-50/40 p-3 dark:border-gray-700 dark:bg-gray-900/30">
                                  <p className="text-sm font-semibold text-gray-800 break-words whitespace-normal dark:text-gray-100">
                                    {selectedProduct?.name || line.productQuery || "—"}
                                  </p>
                                  <p className="mt-1 text-xs text-gray-500 break-words whitespace-normal dark:text-gray-400">
                                    Variant: {selectedVariant?.size || "—"}
                                  </p>
                                  {hasStockWarning && (
                                    <p className="mt-1 text-xs text-warning-600 dark:text-warning-400">
                                      Stock warning: only {selectedStock?.currentStock ?? 0} available.
                                    </p>
                                  )}
                                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                                    <span className="text-gray-500 dark:text-gray-400">Qty</span>
                                    <span className="text-right font-medium text-gray-800 dark:text-gray-200">{line.quantity}</span>
                                    <span className="text-gray-500 dark:text-gray-400">{unitLabel}</span>
                                    <span className="text-right font-medium text-gray-800 dark:text-gray-200">{formatPKR(line.unitAmount)}</span>
                                    <span className="text-gray-500 dark:text-gray-400">Discount</span>
                                    <span className="text-right font-medium text-gray-800 dark:text-gray-200">{formatPKR(line.discountAmount)}</span>
                                    <span className="text-gray-500 dark:text-gray-400">Line Total</span>
                                    <span className="text-right font-semibold text-gray-900 dark:text-white">{formatPKR(getLineTotal(line))}</span>
                                  </div>
                                  <div className="mt-3 flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => openLineComposerForEdit(line.id)}
                                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                                      aria-label="Edit line"
                                    >
                                      <HiOutlinePencilSquare size={18} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeLine(line.id)}
                                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-error-200 hover:bg-error-50 hover:text-error-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-error-500/30 dark:hover:bg-error-500/10 dark:hover:text-error-400"
                                      aria-label="Remove line"
                                    >
                                      <HiOutlineTrash size={18} />
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>

                            <tr className="hidden align-middle md:table-row">
                              <td className="px-4 py-4 align-middle text-sm text-gray-700 dark:text-gray-200">
                                <p className="max-w-[240px] break-words whitespace-normal">{selectedProduct?.name || line.productQuery || "—"}</p>
                              </td>
                              <td className="px-4 py-4 align-middle text-sm text-gray-700 dark:text-gray-200">
                                <p className="max-w-[140px] break-words whitespace-normal">{selectedVariant?.size || "—"}</p>
                                {hasStockWarning && (
                                  <p className="mt-1 text-xs text-warning-600 dark:text-warning-400">
                                    Stock warning: only {selectedStock?.currentStock ?? 0} available.
                                  </p>
                                )}
                              </td>
                              <td className="px-4 py-4 align-middle text-sm text-gray-700 dark:text-gray-200">{line.quantity}</td>
                              <td className="px-4 py-4 align-middle text-sm text-gray-700 dark:text-gray-200">{formatPKR(line.unitAmount)}</td>
                              <td className="px-4 py-4 align-middle text-sm text-gray-700 dark:text-gray-200">{formatPKR(line.discountAmount)}</td>
                              <td className="px-4 py-4 align-middle text-right text-sm font-semibold whitespace-nowrap text-gray-800 dark:text-white/90">
                                {formatPKR(getLineTotal(line))}
                              </td>
                              <td className="px-4 py-4 align-middle text-right">
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => openLineComposerForEdit(line.id)}
                                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                                    aria-label="Edit line"
                                  >
                                    <HiOutlinePencilSquare size={18} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeLine(line.id)}
                                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-error-200 hover:bg-error-50 hover:text-error-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-error-500/30 dark:hover:bg-error-500/10 dark:hover:text-error-400"
                                    aria-label="Remove line"
                                  >
                                    <HiOutlineTrash size={18} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })
                      )}
                      {lines.length > 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-3">
                            <button
                              type="button"
                              onClick={openLineComposer}
                              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50/70 px-4 py-3 text-sm font-medium text-gray-600 transition hover:border-brand-300 hover:bg-brand-50/70 hover:text-brand-700 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-300 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
                            >
                              <HiOutlinePlus size={16} />
                              Add another line item
                            </button>
                          </td>
                        </tr>
                      )}
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
                    onWheel={blockWheelIncrement}
                    className={numberInputClass}
                  />
                </div>
                <div className={isSale ? "lg:col-span-2" : ""}>
                  <FieldLabel htmlFor="transaction-notes">Notes</FieldLabel>
                  <input
                    id="transaction-notes"
                    type="text"
                    value={notes}
                    maxLength={1000}
                    onChange={(e) => setNotes(e.target.value)}
                    className={`${inputClass} h-11`}
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
            <section className={`${panelClass} p-4 sm:p-6`}>
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

      {lineComposerOpen && (
        <>
          <div
            className="fixed inset-0 z-[70] bg-gray-950/45 backdrop-blur-[1px]"
            onClick={closeLineComposer}
          />
          <div className="fixed inset-y-0 right-0 z-[80] w-full max-w-xl border-l border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-4 py-4 dark:border-gray-800 sm:px-6 sm:py-5">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {editingLineId ? "Edit Line Item" : "Add Line Item"}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Pick product and size first, then fill quantity and {isPurchase ? "unit cost" : "unit price"}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeLineComposer}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                  aria-label="Close line composer"
                >
                  <HiOutlineXMark size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
                <div className="relative" ref={composerProductDropdownRef}>
                  <FieldLabel htmlFor="composer-product" required>
                    Product
                  </FieldLabel>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <HiOutlineMagnifyingGlass size={18} />
                    </span>
                    <input
                      id="composer-product"
                      value={lineComposer.productQuery}
                      onChange={(e) => {
                        const query = e.target.value;
                        setLineComposer((current) => ({
                          ...current,
                          productQuery: query,
                          productId: "",
                          variantId: "",
                        }));
                        setLineComposerProductOpen(true);
                      }}
                      onFocus={() => setLineComposerProductOpen(true)}
                      placeholder={productsLoading ? "Loading products..." : "Search product"}
                      className={`${inputClass} pl-11 pr-10`}
                      disabled={productsLoading}
                    />
                    {lineComposer.productQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setLineComposer((current) => ({
                            ...current,
                            productId: "",
                            productQuery: "",
                            variantId: "",
                          }));
                          setLineComposerProductOpen(false);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-200"
                        aria-label="Clear product"
                      >
                        <HiOutlineXMark size={18} />
                      </button>
                    )}
                  </div>

                  {lineComposerProductOpen && (
                    <div className="absolute z-30 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
                      {composerProducts.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No products found.</p>
                      ) : (
                        composerProducts.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => void handleComposerSelectProduct(product)}
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

                <div>
                  <FieldLabel htmlFor="composer-variant" required>
                    Size / Variant
                  </FieldLabel>
                  <select
                    id="composer-variant"
                    value={lineComposer.variantId}
                    onChange={(e) =>
                      setLineComposer((current) => ({ ...current, variantId: e.target.value }))
                    }
                    className={inputClass}
                    disabled={!composerSelectedProduct}
                  >
                    <option value="">Select size</option>
                    {composerActiveVariants.map((variant) => {
                      const stock = composerStockVariants.find((item) => item.variantId === variant.id);
                      return (
                        <option key={variant.id} value={variant.id}>
                          {variant.size}
                          {stock ? ` - ${stock.currentStock} in stock` : ""}
                        </option>
                      );
                    })}
                  </select>
                  {!composerSelectedProduct && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Pick a product first.</p>
                  )}
                  {composerSelectedProduct && stockLoadingByProductId[composerSelectedProduct.id] && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Loading stock...</p>
                  )}
                  {isSale && composerSelectedStock && lineComposer.quantity > composerSelectedStock.currentStock && (
                    <p className="mt-1 text-xs text-warning-600 dark:text-warning-400">
                      Stock warning: only {composerSelectedStock.currentStock} available for this size.
                    </p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <FieldLabel htmlFor="composer-quantity" required>
                      Qty
                    </FieldLabel>
                    <input
                      id="composer-quantity"
                      type="number"
                      min={0}
                      value={lineComposer.quantity === 0 ? "" : lineComposer.quantity}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === "") {
                          setLineComposer((current) => ({ ...current, quantity: 0 }));
                          return;
                        }
                        const parsed = Number(raw);
                        if (Number.isNaN(parsed)) return;
                        setLineComposer((current) => ({ ...current, quantity: parsed }));
                      }}
                      onWheel={blockWheelIncrement}
                      className={numberInputClass}
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="composer-unit" required>
                      {unitLabel}
                    </FieldLabel>
                    <div className="relative">
                      <input
                        id="composer-unit"
                        type="number"
                        min={0}
                        value={lineComposer.unitAmount === 0 ? "" : lineComposer.unitAmount}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === "") {
                            setLineComposer((current) => ({ ...current, unitAmount: 0 }));
                            return;
                          }
                          const parsed = Number(raw);
                          if (Number.isNaN(parsed)) return;
                          setLineComposer((current) => ({ ...current, unitAmount: parsed }));
                        }}
                        onWheel={blockWheelIncrement}
                        className={`${numberInputClass} ${isSale ? "pr-11" : ""}`}
                      />
                      {isSale && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!composerSelectedProduct) {
                              showCostHintToast("Select a product first to view cost guidance.");
                              return;
                            }

                            if (typeof composerAvgCost !== "number") {
                              showCostHintToast("Average cost is not available for the selected item yet.");
                              return;
                            }

                            const variantText = composerSelectedVariant
                              ? ` (${composerSelectedVariant.size})`
                              : "";
                            showCostHintToast(
                              `Avg cost for ${composerSelectedProduct.name}${variantText}: ${formatPKR(
                                composerAvgCost
                              )}`
                            );
                          }}
                          title="Show average cost hint"
                          aria-label="Show average cost hint"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-brand-500"
                        >
                          <HiOutlineBanknotes size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <FieldLabel htmlFor="composer-discount">Discount</FieldLabel>
                    <input
                      id="composer-discount"
                      type="number"
                      min={0}
                      value={lineComposer.discountAmount}
                      onChange={(e) =>
                        setLineComposer((current) => ({
                          ...current,
                          discountAmount: Math.max(0, Number(e.target.value || 0)),
                        }))
                      }
                      onWheel={blockWheelIncrement}
                      className={numberInputClass}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/50">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Line Total</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatPKR(getLineTotal(lineComposer))}
                    </span>
                  </div>
                </div>

                {lineComposerError && (
                  <div className="flex items-start gap-2 rounded-xl border border-warning-100 bg-warning-50 px-4 py-3 text-sm text-warning-700 dark:border-warning-500/20 dark:bg-warning-500/10 dark:text-warning-300">
                    <HiOutlineExclamationTriangle size={16} className="mt-0.5 shrink-0" />
                    <span>{lineComposerError}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-gray-200 px-4 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-end sm:px-6">
                <Button variant="outline" onClick={closeLineComposer}>
                  Cancel
                </Button>
                <Button onClick={addLineFromComposer} startIcon={<HiOutlinePlus size={16} />}>
                  {editingLineId ? "Update Line" : "Add Line"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {costHintMessage && (
        <div className="fixed inset-x-0 bottom-6 z-[100] flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-theme-lg dark:border-gray-700 dark:bg-gray-900">
            <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{costHintMessage}</div>
            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              {costHintSecondsLeft}s
            </span>
          </div>
        </div>
      )}

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
