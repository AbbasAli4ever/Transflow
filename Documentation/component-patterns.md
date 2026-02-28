# Component Patterns — Transflow

Copy-paste reference for recurring patterns. Each section has the canonical source
file:line so you can do a targeted `Read(file, offset, limit)` for the full context.

---

## A. Tab Switching

**Source:** `supplier/detail/SupplierDetailClient.tsx:885–1082`

```tsx
// 1. Type + state (outside component or at top of component)
type Tab = "ledger" | "openDocuments" | "transactions";
const [activeTab, setActiveTab] = useState<Tab>("openDocuments");

// 2. Tabs array (inside component, before return)
const TABS: { key: Tab; label: string }[] = [
  { key: "ledger",        label: "Ledger" },
  { key: "openDocuments", label: "Open Documents" },
  { key: "transactions",  label: "Transactions" },
];

// 3. JSX — tab bar + content panel
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
    {activeTab === "ledger"        && <LedgerTab supplierId={id} />}
    {activeTab === "openDocuments" && <OpenDocumentsTab openDocs={openDocs} />}
    {activeTab === "transactions"  && <TransactionsTab supplierId={id} />}
  </div>
</div>
```

---

## B. Drawer / Slide-in Panel

**Source:** `supplier/page.tsx:111–278`

```tsx
function MyDrawer({
  isOpen, onClose, onSaved, initial,
}: {
  isOpen: boolean; onClose: () => void;
  onSaved: () => void; initial?: ApiSupplier | null;
}) {
  const [form, setForm] = useState(initial ? fromInitial(initial) : emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when drawer opens/target changes
  useEffect(() => { setForm(...); setError(null); }, [initial, isOpen]);

  // Body overflow lock (prevents scroll-behind)
  useEffect(() => {
    if (isOpen) {
      const w = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.paddingRight = `${w}px`;
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }
    return () => { document.body.style.overflow = ""; document.body.style.paddingRight = ""; };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[9998] bg-gray-900/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={`fixed right-0 top-0 z-[9999] flex h-full w-full max-w-[420px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out dark:bg-gray-900 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Title</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100">
            <HiOutlineXMark size={18} />
          </button>
        </div>
        {/* Scrollable body + sticky footer */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {/* fields */}
          </div>
          <div className="border-t border-gray-100 px-6 py-4 dark:border-gray-800">
            <div className="flex gap-3">
              <Button variant="outline" size="sm" className="flex-1" onClick={onClose} type="button">Cancel</Button>
              <Button size="sm" className="flex-1" disabled={saving} type="submit">
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
```

---

## C. Drawer Form Submit

**Source:** `supplier/page.tsx:153–177`

```ts
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
      setError("A record with this name already exists.");
    } else if (apiErr.errors?.length) {
      setError(apiErr.errors.map((e) => e.message).join(", "));
    } else {
      setError(apiErr.message ?? "Failed to save.");
    }
  } finally {
    setSaving(false);
  }
};
```

---

## D. Modal (Confirm / Destructive Action)

**Source:** `products/detail/ProductDetailClient.tsx:260–336`

```tsx
function ConfirmModal({
  entity, onClose, onSaved,
}: { entity: ApiProduct; onClose: () => void; onSaved: (updated: ApiProduct) => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Modal isOpen onClose={onClose} className="max-w-sm mx-4" showCloseButton={false}>
      <div className="p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning-50 dark:bg-warning-500/10">
            <HiOutlineArrowsUpDown size={24} className="text-warning-500" />
          </div>
          <h3 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">Confirm</h3>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Description of action?</p>
        </div>
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
            <HiOutlineExclamationTriangle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}
        <div className="flex justify-center gap-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={handleConfirm} disabled={saving}>
            {saving ? "Saving..." : "Confirm"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
// Render conditionally: {modalOpen && <ConfirmModal ... />}
```

---

## E. API Paginated Fetch

**Source:** `supplier/page.tsx:407–431`

```ts
// State
const [items, setItems]     = useState<ApiXxx[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [error, setError]     = useState<string | null>(null);
const [page, setPage]       = useState(1);
const [meta, setMeta]       = useState({ total: 0, totalPages: 1 });

// Fetch (useCallback so useEffect dep is stable)
const fetchItems = useCallback(async () => {
  setIsLoading(true);
  setError(null);
  try {
    const result = await listXxx({ page, limit: 20, /* filters */ });
    setItems(result.data);
    setMeta({ total: result.meta.total, totalPages: result.meta.totalPages });
  } catch (err) {
    const apiErr = err as ApiError;
    setError(apiErr.message ?? "Failed to load.");
  } finally {
    setIsLoading(false);
  }
}, [page /*, other filter deps */]);

useEffect(() => { fetchItems(); }, [fetchItems]);
```

For sub-components (tabs) use `useEffect` with cleanup instead of `useCallback`:
```ts
useEffect(() => {
  let cancelled = false;
  setIsLoading(true);
  listXxx({ ... })
    .then((res) => { if (!cancelled) { setItems(res.data); setMeta(...); } })
    .catch((err) => { if (!cancelled) setError(...); })
    .finally(() => { if (!cancelled) setIsLoading(false); });
  return () => { cancelled = true; };
}, [dep1, dep2]);
```

---

## F. Pagination Controls

**Source:** `supplier/page.tsx:655–675`

```tsx
{meta.totalPages > 1 && (
  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-700">
    <p className="text-xs text-gray-400 dark:text-gray-500">
      Showing <span className="font-medium text-gray-600 dark:text-gray-300">{items.length}</span>{" "}
      of <span className="font-medium text-gray-600 dark:text-gray-300">{meta.total}</span> records
    </p>
    <div className="flex items-center gap-2">
      <button
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        disabled={page === 1 || isLoading}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
      >
        <HiOutlineChevronLeft size={15} />
      </button>
      <span className="text-xs text-gray-500 dark:text-gray-400">Page {page} of {meta.totalPages}</span>
      <button
        onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
        disabled={page === meta.totalPages || isLoading}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
      >
        <HiOutlineChevronRight size={15} />
      </button>
    </div>
  </div>
)}
```

---

## G. Table with Skeleton Loading

**Source:** `supplier/page.tsx:60–84` (SkeletonRow), `supplier/page.tsx:568–583` (tbody)

```tsx
// Skeleton row component — adapt column count/widths
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-5 py-4"><div className="h-4 w-36 rounded bg-gray-200 dark:bg-gray-700" /></td>
      <td className="px-5 py-4"><div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700" /></td>
      <td className="px-5 py-4"><div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700" /></td>
    </tr>
  );
}

// tbody ternary pattern
<tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
  {isLoading ? (
    Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
  ) : items.length === 0 ? (
    <tr>
      <td colSpan={5} className="py-16 text-center text-sm text-gray-400 dark:text-gray-500">
        No records found.
      </td>
    </tr>
  ) : (
    items.map((item) => (
      <tr key={item.id} className="transition hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
        {/* cells */}
      </tr>
    ))
  )}
</tbody>
```

---

## H. Transaction Status Colors

Used in any table that shows transaction status. Defined locally per client file.

```ts
const TX_STATUS_COLORS: Record<string, string> = {
  DRAFT:  "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  POSTED: "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400",
  VOIDED: "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400",
};

// Usage:
<span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
  TX_STATUS_COLORS[tx.status] ?? "bg-gray-100 text-gray-600"
}`}>
  {tx.status.charAt(0) + tx.status.slice(1).toLowerCase()}
</span>
```

---

## I. Input & Label Shared Classes

Defined at the top of each page file:

```ts
const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 " +
  "placeholder-gray-400 outline-none transition focus:border-brand-500 focus:ring-2 " +
  "focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500";

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
      {children}
      {required && <span className="ml-0.5 text-error-500">*</span>}
    </label>
  );
}
```
