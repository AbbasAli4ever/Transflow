"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type CommandCategory = "Commands" | "Navigation" | "Customers" | "Transactions";
type BadgeTone = "success" | "warning" | "info";

type CommandItem = {
  id: string;
  category: CommandCategory;
  title: string;
  subtitle?: string;
  icon: string;
  iconClassName: string;
  hint?: string;
  badge?: string;
  badgeTone?: BadgeTone;
  actions?: string[];
};

const COMMAND_ITEMS: CommandItem[] = [
  {
    id: "cmd-new-sale",
    category: "Commands",
    title: "New Sale",
    subtitle: "Create a new sales transaction",
    icon: "+",
    iconClassName: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    hint: "Cmd+N",
  },
  {
    id: "cmd-new-purchase",
    category: "Commands",
    title: "New Purchase",
    subtitle: "Create a new purchase order",
    icon: "+",
    iconClassName: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  },
  {
    id: "cmd-customer-receipt",
    category: "Commands",
    title: "Customer Receipt",
    subtitle: "Record incoming customer payment",
    icon: "\u2193",
    iconClassName: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  },
  {
    id: "cmd-supplier-payment",
    category: "Commands",
    title: "Supplier Payment",
    subtitle: "Pay an outstanding supplier balance",
    icon: "\u2191",
    iconClassName: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  },
  {
    id: "nav-dashboard",
    category: "Navigation",
    title: "Go to Dashboard",
    icon: "DB",
    iconClassName: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
  {
    id: "nav-customers",
    category: "Navigation",
    title: "Go to Customers",
    icon: "CU",
    iconClassName: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
  {
    id: "nav-reports",
    category: "Navigation",
    title: "Go to Reports",
    icon: "RP",
    iconClassName: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
  {
    id: "customer-ali-traders",
    category: "Customers",
    title: "Ali Traders",
    subtitle: "Balance: PKR 120,000",
    icon: "AT",
    iconClassName: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    badge: "ACTIVE",
    badgeTone: "success",
    actions: [
      "New Sale",
      "Customer Receipt",
      "Customer Return",
      "View Open Documents",
      "Open Detail",
    ],
  },
  {
    id: "customer-siddiq",
    category: "Customers",
    title: "Al-Siddiq Enterprises",
    subtitle: "Balance: PKR 38,500",
    icon: "AS",
    iconClassName: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    badge: "ACTIVE",
    badgeTone: "success",
    actions: ["New Sale", "Customer Receipt", "Open Detail"],
  },
  {
    id: "trx-421",
    category: "Transactions",
    title: "TRX-2026-00421",
    subtitle: "Sale \u00b7 Ali Traders \u00b7 PKR 45,200",
    icon: "T",
    iconClassName: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    badge: "POSTED",
    badgeTone: "success",
  },
  {
    id: "trx-419",
    category: "Transactions",
    title: "TRX-2026-00419",
    subtitle: "Purchase \u00b7 HBL Textiles \u00b7 PKR 112,000",
    icon: "T",
    iconClassName: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    badge: "DRAFT",
    badgeTone: "warning",
  },
  {
    id: "trx-417",
    category: "Transactions",
    title: "TRX-2026-00417",
    subtitle: "Customer Receipt \u00b7 Pak Mills \u00b7 PKR 28,000",
    icon: "T",
    iconClassName: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    badge: "POSTED",
    badgeTone: "success",
  },
];

const CATEGORY_ORDER: CommandCategory[] = [
  "Commands",
  "Navigation",
  "Customers",
  "Transactions",
];

const badgeToneClassMap: Record<BadgeTone, string> = {
  success:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  info: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
};

type CommandPaletteProps = {
  query: string;
  onClose: () => void;
};

export default function CommandPalette({ query, onClose }: CommandPaletteProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedActionItemId, setSelectedActionItemId] = useState<string | null>(null);
  const [selectionNote, setSelectionNote] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return COMMAND_ITEMS;

    return COMMAND_ITEMS.filter((item) => {
      const searchIn = `${item.title} ${item.subtitle ?? ""} ${item.category}`.toLowerCase();
      return searchIn.includes(normalizedQuery);
    });
  }, [query]);

  const groupedItems = useMemo(() => {
    return CATEGORY_ORDER.map((category) => ({
      category,
      items: filteredItems.filter((item) => item.category === category),
    })).filter((group) => group.items.length > 0);
  }, [filteredItems]);

  const flatItems = useMemo(() => groupedItems.flatMap((group) => group.items), [groupedItems]);

  useEffect(() => {
    setActiveIndex(0);
    setSelectedActionItemId(null);
    setSelectionNote(null);
  }, [query]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const activeElement = container.querySelector<HTMLButtonElement>(
      `[data-item-index="${activeIndex}"]`
    );
    if (!activeElement) return;

    activeElement.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (flatItems.length > 0) {
          setActiveIndex((prev) => Math.min(prev + 1, flatItems.length - 1));
        }
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        if (flatItems.length > 0) {
          setActiveIndex((prev) => Math.max(prev - 1, 0));
        }
      }

      if (event.key === "Enter") {
        event.preventDefault();
        const activeItem = flatItems[activeIndex];
        if (!activeItem) return;

        if (activeItem.actions?.length) {
          setSelectedActionItemId((prev) => (prev === activeItem.id ? null : activeItem.id));
        } else {
          setSelectionNote(`Selected: ${activeItem.title}`);
        }
      }

      if (event.key === "Tab") {
        const activeItem = flatItems[activeIndex];
        if (!activeItem?.actions?.length) return;
        event.preventDefault();
        setSelectedActionItemId((prev) => (prev === activeItem.id ? null : activeItem.id));
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [activeIndex, flatItems, onClose]);

  return (
    <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[120000] w-full">
      <div className="flex max-h-[70vh] w-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <div ref={scrollContainerRef} className="max-h-[54vh] overflow-y-auto py-2">
          {groupedItems.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-12 text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">No results found</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Try another keyword like sale, customer, or trx.</p>
            </div>
          ) : (
            groupedItems.map((group) => (
              <div key={group.category}>
                <div className="px-4 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500">
                  {group.category}
                </div>
                {group.items.map((item) => {
                  const itemIndex = flatItems.findIndex((flatItem) => flatItem.id === item.id);
                  const isActive = itemIndex === activeIndex;
                  const isActionOpen = selectedActionItemId === item.id;

                  return (
                    <div key={item.id}>
                      <button
                        type="button"
                        data-item-index={itemIndex}
                        onMouseEnter={() => setActiveIndex(itemIndex)}
                        onClick={() => {
                          setSelectionNote(null);
                          if (item.actions?.length) {
                            setSelectedActionItemId((prev) => (prev === item.id ? null : item.id));
                            return;
                          }
                          setSelectionNote(`Selected: ${item.title}`);
                        }}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${
                          isActive
                            ? "bg-gray-100 dark:bg-white/5"
                            : "hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                        }`}
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${item.iconClassName}`}
                        >
                          {item.icon}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-gray-800 dark:text-white/90">{item.title}</span>
                          {item.subtitle && (
                            <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{item.subtitle}</span>
                          )}
                        </span>
                        <span className="ml-auto flex shrink-0 items-center gap-2">
                          {item.badge && item.badgeTone && (
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${badgeToneClassMap[item.badgeTone]}`}>
                              {item.badge}
                            </span>
                          )}
                          {item.hint && (
                            <span className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                              {item.hint}
                            </span>
                          )}
                        </span>
                      </button>

                      {isActionOpen && item.actions && (
                        <div className="mx-3 mb-2 mt-1 flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800/60">
                          {item.actions.map((action) => (
                            <button
                              key={action}
                              type="button"
                              onClick={() => setSelectionNote(`Selected: ${action} for ${item.title}`)}
                              className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:bg-gray-700"
                            >
                              {action}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-gray-200 px-4 py-2.5 text-[11px] text-gray-500 dark:border-gray-800 dark:text-gray-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] dark:border-gray-700 dark:bg-gray-800">Up/Down</span>
            navigate
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] dark:border-gray-700 dark:bg-gray-800">Enter</span>
            select
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] dark:border-gray-700 dark:bg-gray-800">Tab</span>
            actions
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] dark:border-gray-700 dark:bg-gray-800">Esc</span>
            close
          </span>
          {selectionNote && <span className="text-brand-500 dark:text-brand-400">{selectionNote}</span>}
        </div>
      </div>
    </div>
  );
}
