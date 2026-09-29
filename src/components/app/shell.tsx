"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { StoreProvider, useStore } from "@/lib/store-context";
import { ToastProvider, useToast, btn, fmtDate } from "./kit";

const NAV = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/deals", label: "Deals" },
  { href: "/app/blockers", label: "Blockers" },
  { href: "/app/lender", label: "Lender view" },
  { href: "/app/notifications", label: "Notifications" },
  { href: "/app/billing", label: "Billing" },
  { href: "/app/admin", label: "Admin" },
];

function DemoBar() {
  const { store, simulateDay, reset } = useStore();
  const toast = useToast();
  return (
    <div className="flex flex-wrap items-center gap-2 bg-slate-900 px-4 py-2 text-xs text-slate-200">
      <span className="rounded bg-amber-400 px-1.5 py-0.5 font-semibold text-slate-900">DEMO</span>
      <span>Simulated data. Today is {fmtDate(store.now)}.</span>
      <span className="ml-auto flex gap-2">
        <button className={`${btn} bg-white/10 text-white hover:bg-white/20 !py-1`} onClick={() => { simulateDay(); toast("Simulated a DMV day: filed deals cleared or rejected"); }}>
          Simulate DMV day
        </button>
        <button className={`${btn} bg-white/10 text-white hover:bg-white/20 !py-1`} onClick={() => { reset(); toast("Demo reset"); }}>
          Reset demo
        </button>
      </span>
    </div>
  );
}

function Inner({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { store } = useStore();
  const [open, setOpen] = useState(false);
  const unread = store.notifications.filter((n) => !n.read).length;
  const nav = (
    <nav aria-label="Primary" className="flex flex-col gap-0.5 p-3">
      {NAV.map((n) => {
        const active = n.href === "/app" ? path === "/app" : path.startsWith(n.href);
        return (
          <Link key={n.href} href={n.href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined}
            className={`flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium ${active ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-100"}`}>
            {n.label}
            {n.href === "/app/notifications" && unread > 0 && (
              <span className="rounded-full bg-indigo-600 px-1.5 text-xs text-white" aria-label={`${unread} unread`}>{unread}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-2">Skip to content</a>
      <DemoBar />
      <div className="flex">
        <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-white md:block">
          <div className="border-b border-slate-100 px-4 py-3">
            <Link href="/" className="text-base font-bold tracking-tight text-slate-900">TitleDesk</Link>
            <div className="text-xs text-slate-500">Sunrise Auto</div>
          </div>
          {nav}
        </aside>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 md:hidden">
            <span className="font-bold">TitleDesk</span>
            <button className={`${btn} border border-slate-300`} aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(!open)}>Menu</button>
          </div>
          {open && <div id="mobile-nav" className="border-b border-slate-200 bg-white md:hidden">{nav}</div>}
          <main id="main" className="mx-auto max-w-7xl p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <ToastProvider>
        <Inner>{children}</Inner>
      </ToastProvider>
    </StoreProvider>
  );
}
