"use client";

import * as React from "react";
import { create } from "zustand";

/** Lightweight UI state — nothing here is a source of truth for data. */
interface UiState {
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
}));

/**
 * Global keyboard shortcuts (docs/spec/07 §46).
 *
 * Shortcuts are ignored while the user is typing, and `G`-prefixed pairs wait
 * briefly for their second key — so `G` then `D` goes to the dashboard.
 */
export function useKeyboardShortcuts(handlers: {
  onCommandPalette?: () => void;
  onSearch?: () => void;
  onNewJournal?: () => void;
  onNavigate?: (path: string) => void;
}) {
  const pendingGoto = React.useRef(false);
  const gotoTimer = React.useRef<ReturnType<typeof setTimeout>>();

  React.useEffect(() => {
    const isTyping = (target: EventTarget | null): boolean => {
      const element = target as HTMLElement | null;
      if (!element) return false;
      return (
        element.tagName === "INPUT" ||
        element.tagName === "TEXTAREA" ||
        element.tagName === "SELECT" ||
        element.isContentEditable
      );
    };

    const handler = (event: KeyboardEvent) => {
      // The command palette is reachable even from inside a field.
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        handlers.onCommandPalette?.();
        return;
      }

      if (isTyping(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;

      if (pendingGoto.current) {
        pendingGoto.current = false;
        clearTimeout(gotoTimer.current);

        const destinations: Record<string, string> = {
          d: "/",
          j: "/accounting/journals",
          a: "/accounting/chart-of-accounts",
          l: "/accounting/general-ledger",
          t: "/reports/trial-balance",
          p: "/reports/profit-loss",
          b: "/purchases/bills",
          i: "/sales/invoices",
          r: "/banking/reconciliation",
          c: "/ai",
          h: "/insights/business-health",
        };

        const destination = destinations[event.key.toLowerCase()];
        if (destination) {
          event.preventDefault();
          handlers.onNavigate?.(destination);
        }
        return;
      }

      switch (event.key.toLowerCase()) {
        case "/":
          event.preventDefault();
          handlers.onSearch?.();
          break;
        case "g":
          pendingGoto.current = true;
          gotoTimer.current = setTimeout(() => {
            pendingGoto.current = false;
          }, 1200);
          break;
        case "n":
        case "j":
          event.preventDefault();
          handlers.onNewJournal?.();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      clearTimeout(gotoTimer.current);
    };
  }, [handlers]);
}

/** Debounce a rapidly-changing value, for search boxes and filters. */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/** Persist a small preference across reloads, tolerating a blocked store. */
export function useLocalStorage<T>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = React.useState<T>(initial);

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) setValue(JSON.parse(stored) as T);
    } catch {
      // A private window or a browser blocking site data — keep the default.
    }
  }, [key]);

  const update = React.useCallback(
    (next: T) => {
      setValue(next);
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Not being able to remember a preference must never break the page.
      }
    },
    [key],
  );

  return [value, update];
}
