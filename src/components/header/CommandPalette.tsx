"use client";

import {
  BadgeTone,
  CATEGORY_ORDER,
  COMMANDS,
  CommandCategory,
  CommandItem,
  entityToCommandItem,
} from "@/lib/commandResolver";
import { searchEntities } from "@/lib/search";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";

// Entity groups surface first when present; V1 commands fall below
const DISPLAY_ORDER: CommandCategory[] = [
  "Customers",
  "Suppliers",
  "Products",
  "Accounts",
  "Navigation",
  "Transactions",
  "Reports",
];

const badgeToneClassMap: Record<BadgeTone, string> = {
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  info: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  error: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

type CommandPaletteProps = {
  query: string;
  onClearQuery: () => void;
  onClose: () => void;
};

export default function CommandPalette({ query, onClearQuery, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedActionItemId, setSelectedActionItemId] = useState<string | null>(null);
  const [activeActionIndex, setActiveActionIndex] = useState<number | null>(null);
  const [entityItems, setEntityItems] = useState<CommandItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function runEntitySearch(q: string): Promise<CommandItem[]> {
    return searchEntities(q, 5).then((res) => res.results.map(entityToCommandItem));
  }

  // Debounced entity search — fires only when query is 2+ chars
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setEntityItems([]);
      setSearchError(false);
      return;
    }

    setIsSearching(true);
    setSearchError(false);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      runEntitySearch(q)
        .then(setEntityItems)
        .catch(() => {
          setSearchError(true);
          setEntityItems([]);
        })
        .finally(() => setIsSearching(false));
    }, 300);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [query]);

  const filteredCommandItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return COMMANDS;

    return COMMANDS.filter((item) => {
      const searchIn = [
        item.title,
        item.subtitle ?? "",
        item.category,
        ...(item.keywords ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return searchIn.includes(normalizedQuery);
    });
  }, [query]);

  const groupedItems = useMemo(() => {
    const allItems = [...filteredCommandItems, ...entityItems];
    return DISPLAY_ORDER.map((category) => ({
      category,
      items: allItems.filter((item) => item.category === category),
    })).filter((group) => group.items.length > 0);
  }, [filteredCommandItems, entityItems]);

  const flatItems = useMemo(() => groupedItems.flatMap((g) => g.items), [groupedItems]);
  const activeItem: CommandItem | undefined = flatItems[activeIndex];

  const isActionMode =
    !!activeItem?.actions?.length &&
    selectedActionItemId === activeItem.id &&
    activeActionIndex !== null;

  const hasQuery = query.trim().length > 0;

  // Reset keyboard state on query change
  useEffect(() => {
    setActiveIndex(0);
    setSelectedActionItemId(null);
    setActiveActionIndex(null);
  }, [query]);

  // Exit action mode when navigating away from an entity with actions
  useEffect(() => {
    if (!selectedActionItemId) return;
    if (flatItems[activeIndex]?.id === selectedActionItemId) return;
    setSelectedActionItemId(null);
    setActiveActionIndex(null);
  }, [activeIndex, flatItems, selectedActionItemId]);

  // Scroll active row into view
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const el = container.querySelector<HTMLButtonElement>(`[data-item-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function executeItem(item: CommandItem) {
    if (item.sessionStorageEntry) {
      sessionStorage.setItem(item.sessionStorageEntry.key, item.sessionStorageEntry.value);
    }
    router.push(item.route);
    onClose();
  }

  function executeAction(item: CommandItem, actionIndex: number) {
    const action = item.actions?.[actionIndex];
    if (!action) return;
    if (action.sessionStorageEntry) {
      sessionStorage.setItem(action.sessionStorageEntry.key, action.sessionStorageEntry.value);
    }
    router.push(action.route);
    onClose();
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (isActionMode) {
          setSelectedActionItemId(null);
          setActiveActionIndex(null);
          return;
        }
        if (hasQuery) {
          onClearQuery();
          return;
        }
        onClose();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (isActionMode) return;
        setActiveIndex((prev) => Math.min(prev + 1, flatItems.length - 1));
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        if (isActionMode) return;
        setActiveIndex((prev) => Math.max(prev - 1, 0));
        return;
      }

      if (event.key === "ArrowLeft") {
        if (!isActionMode || !activeItem?.actions?.length || activeActionIndex === null) return;
        event.preventDefault();
        setActiveActionIndex((prev) => {
          if (prev === null) return 0;
          const next = prev - 1;
          return next < 0 ? activeItem.actions!.length - 1 : next;
        });
        return;
      }

      if (event.key === "ArrowRight") {
        if (!isActionMode || !activeItem?.actions?.length || activeActionIndex === null) return;
        event.preventDefault();
        setActiveActionIndex((prev) => {
          if (prev === null) return 0;
          return (prev + 1) % activeItem.actions!.length;
        });
        return;
      }

      if (event.key === "Tab") {
        if (!activeItem?.actions?.length) return;
        event.preventDefault();
        if (isActionMode) {
          setSelectedActionItemId(null);
          setActiveActionIndex(null);
          return;
        }
        setSelectedActionItemId(activeItem.id);
        setActiveActionIndex(0);
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();

        // No results yet but query is valid — cancel debounce and search immediately
        if (!activeItem && query.trim().length >= 2) {
          if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
          setIsSearching(true);
          runEntitySearch(query.trim())
            .then((items) => {
              setEntityItems(items);
              if (items.length > 0) executeItem(items[0]);
            })
            .catch(() => {
              setSearchError(true);
              setEntityItems([]);
            })
            .finally(() => setIsSearching(false));
          return;
        }

        if (!activeItem) return;

        if (isActionMode && activeItem.actions?.length && activeActionIndex !== null) {
          executeAction(activeItem, activeActionIndex);
          return;
        }

        if (activeItem.actions?.length) {
          // Entity with actions: Enter enters action mode (V2/V3 behavior)
          setSelectedActionItemId(activeItem.id);
          setActiveActionIndex(0);
          return;
        }

        // Plain navigation/create command: route directly
        executeItem(activeItem);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [
    activeActionIndex,
    activeIndex,
    activeItem,
    flatItems,
    hasQuery,
    isActionMode,
    onClearQuery,
    onClose,
  ]);

  return (
    <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[120000] w-full">
      <div className="flex max-h-[70vh] w-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <div ref={scrollContainerRef} className="max-h-[54vh] overflow-y-auto py-2">
          {groupedItems.length === 0 && !isSearching ? (
            <div className="flex flex-col items-center px-4 py-12 text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">No results found</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Try a page name, action, or report.
              </p>
            </div>
          ) : (
            groupedItems.map((group) => (
              <div key={group.category}>
                <div className="px-4 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500">
                  {group.category}
                </div>

                {group.items.map((item) => {
                  const itemIndex = flatItems.findIndex((f) => f.id === item.id);
                  const isActive = itemIndex === activeIndex;
                  const isActionOpen = selectedActionItemId === item.id;

                  return (
                    <div key={item.id}>
                      <button
                        type="button"
                        data-item-index={itemIndex}
                        onMouseEnter={() => setActiveIndex(itemIndex)}
                        onClick={() => {
                          if (item.actions?.length) {
                            setSelectedActionItemId((prev) => {
                              const next = prev === item.id ? null : item.id;
                              setActiveActionIndex(next ? 0 : null);
                              return next;
                            });
                            return;
                          }
                          executeItem(item);
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
                          <span className="block truncate text-sm font-medium text-gray-800 dark:text-white/90">
                            {item.title}
                          </span>
                          {item.subtitle && (
                            <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                              {item.subtitle}
                            </span>
                          )}
                        </span>
                        {item.badge && item.badgeTone && (
                          <span className="ml-auto shrink-0">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${badgeToneClassMap[item.badgeTone]}`}
                            >
                              {item.badge}
                            </span>
                          </span>
                        )}
                      </button>

                      {isActionOpen && item.actions && (
                        <div className="mx-3 mb-2 mt-1 flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800/60">
                          <div className="w-full text-[11px] font-medium text-gray-500 dark:text-gray-400">
                            Action Mode — Left/Right to navigate, Enter to run.
                          </div>
                          {item.actions.map((action, actionIndex) => {
                            const isKeyboardActive =
                              isActionMode &&
                              item.id === activeItem?.id &&
                              activeActionIndex === actionIndex;

                            return (
                              <button
                                key={action.label}
                                type="button"
                                onMouseEnter={() => setActiveActionIndex(actionIndex)}
                                onClick={() => executeAction(item, actionIndex)}
                                className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition ${
                                  isKeyboardActive
                                    ? "border-brand-400 bg-brand-50 text-brand-700 ring-2 ring-brand-500/25 dark:border-brand-600 dark:bg-brand-500/15 dark:text-brand-300"
                                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:bg-gray-700"
                                }`}
                              >
                                {action.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}

          {/* Entity search states */}
          {isSearching && (
            <div className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500">
              Searching...
            </div>
          )}
          {searchError && !isSearching && (
            <div className="px-4 py-3 text-xs text-gray-400 dark:text-gray-500">
              Search unavailable — navigation commands still work.
            </div>
          )}
        </div>

        {/* Footer hints */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-gray-200 px-4 py-2.5 text-[11px] text-gray-500 dark:border-gray-800 dark:text-gray-400">
          {isActionMode ? (
            <>
              <span className="inline-flex items-center gap-1.5">
                <kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] dark:border-gray-700 dark:bg-gray-800">
                  Left/Right
                </kbd>
                navigate actions
              </span>
              <span className="inline-flex items-center gap-1.5">
                <kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] dark:border-gray-700 dark:bg-gray-800">
                  Enter
                </kbd>
                run action
              </span>
              <span className="inline-flex items-center gap-1.5">
                <kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] dark:border-gray-700 dark:bg-gray-800">
                  Tab
                </kbd>
                back to results
              </span>
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5">
                <kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] dark:border-gray-700 dark:bg-gray-800">
                  ↑↓
                </kbd>
                navigate
              </span>
              <span className="inline-flex items-center gap-1.5">
                <kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] dark:border-gray-700 dark:bg-gray-800">
                  Enter
                </kbd>
                go
              </span>
            </>
          )}
          <span className="inline-flex items-center gap-1.5">
            <kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] dark:border-gray-700 dark:bg-gray-800">
              Esc
            </kbd>
            {isActionMode ? "back" : hasQuery ? "clear" : "close"}
          </span>
        </div>
      </div>
    </div>
  );
}
