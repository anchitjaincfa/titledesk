"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Deal, DocType, Store } from "@/lib/types";
import { checkDeal, deriveStage } from "@/lib/engine";
import {
  seedStore, fileDeal, simulateDmvDay, chaseRejection, addDoc, extractFromFile, requestFix as simRequestFix,
} from "@/lib/sim";

const KEY = "titledesk.v1";

interface Ctx {
  store: Store;
  hydrated: boolean;
  reset: () => void;
  file: (dealId: string) => void;
  simulateDay: () => void;
  chase: (dealId: string) => void;
  addDocument: (dealId: string, type: DocType, fileName: string) => void;
  requestFix: (dealId: string, issueId: string) => void;
  markRead: (id: string) => void;
  recheck: (dealId: string) => void;
  addNote: (dealId: string, text: string) => void;
}

const StoreCtx = createContext<Ctx | null>(null);

function recheckDeal(store: Store, dealId: string): Store {
  return {
    ...store,
    deals: store.deals.map((d): Deal => {
      if (d.id !== dealId) return d;
      const next: Deal = { ...d, issues: checkDeal(d, store.now) };
      if (d.stage === "intake" || d.stage === "needs_fixes" || d.stage === "ready") next.stage = deriveStage(next);
      return next;
    }),
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store>(() => seedStore());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Store;
        if (parsed && Array.isArray(parsed.deals) && Array.isArray(parsed.notifications)) setStore(parsed);
      }
    } catch {
      /* ignore corrupt or blocked storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(store));
    } catch {
      /* storage full or blocked */
    }
  }, [store, hydrated]);

  const reset = useCallback(() => setStore(seedStore()), []);
  const file = useCallback((id: string) => setStore((s) => fileDeal(s, id)), []);
  const simulateDay = useCallback(() => setStore((s) => simulateDmvDay(s)), []);
  const chase = useCallback((id: string) => setStore((s) => chaseRejection(s, id)), []);
  const addDocument = useCallback((id: string, type: DocType, fileName: string) => {
    setStore((s) => {
      const deal = s.deals.find((d) => d.id === id);
      if (!deal) return s;
      return recheckDeal(addDoc(s, id, extractFromFile(fileName, type, deal)), id);
    });
  }, []);
  const requestFix = useCallback((id: string, issueId: string) => setStore((s) => simRequestFix(s, id, issueId)), []);
  const markRead = useCallback((id: string) => setStore((s) => ({
    ...s, notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
  })), []);
  const recheck = useCallback((id: string) => setStore((s) => recheckDeal(s, id)), []);
  const addNote = useCallback((id: string, text: string) => setStore((s) => ({
    ...s,
    deals: s.deals.map((d) => d.id === id ? {
      ...d,
      notes: [...d.notes, text],
      events: [...d.events, { at: s.now, kind: "note", message: "Note added", actor: "dealer" as const }],
    } : d),
  })), []);

  const value = useMemo<Ctx>(() => ({
    store, hydrated, reset, file, simulateDay, chase, addDocument, requestFix, markRead, recheck, addNote,
  }), [store, hydrated, reset, file, simulateDay, chase, addDocument, requestFix, markRead, recheck, addNote]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore(): Ctx {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore must be used inside <StoreProvider>");
  return c;
}
