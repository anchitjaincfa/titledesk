"use client";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { Deal, DealStage, Severity, Store } from "@/lib/types";
import { daysSince } from "@/lib/engine";
import { costOfDelay } from "@/lib/sim";

export const STAGES: { id: DealStage; label: string; tone: string }[] = [
  { id: "intake", label: "Intake", tone: "bg-slate-100 text-slate-700 ring-slate-300" },
  { id: "needs_fixes", label: "Needs fixes", tone: "bg-amber-50 text-amber-800 ring-amber-300" },
  { id: "ready", label: "Ready", tone: "bg-sky-50 text-sky-800 ring-sky-300" },
  { id: "filed", label: "Filed", tone: "bg-indigo-50 text-indigo-800 ring-indigo-300" },
  { id: "rejected", label: "Rejected", tone: "bg-red-50 text-red-800 ring-red-300" },
  { id: "cleared", label: "Cleared", tone: "bg-emerald-50 text-emerald-800 ring-emerald-300" },
];
export const stageMeta = (s: DealStage) => STAGES.find((x) => x.id === s) ?? STAGES[0];

export const SEV_TONE: Record<Severity, string> = {
  blocker: "bg-red-50 text-red-800 ring-red-300",
  warning: "bg-amber-50 text-amber-800 ring-amber-300",
  info: "bg-slate-100 text-slate-700 ring-slate-300",
};

export const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" });
export const dealName = (d: Deal) => `${d.year} ${d.make} ${d.model}`;
export const openBlockers = (d: Deal) => d.issues.filter((i) => !i.resolved && i.severity === "blocker");
export const openIssues = (d: Deal) => d.issues.filter((i) => !i.resolved);

export function metrics(store: Store) {
  const filedEver = store.deals.filter((d) => d.filing);
  const decided = filedEver.filter((d) => d.filing!.status !== "submitted" || d.filing!.attempts > 1);
  const firstPass = decided.filter((d) => d.filing!.status === "cleared" && d.filing!.attempts <= 1);
  const cleared = store.deals.filter((d) => d.stage === "cleared");
  const totalDays = cleared.reduce((a, d) => {
    const last = d.events.length ? d.events[d.events.length - 1].at : store.now;
    return a + Math.max(0, daysSince(d.soldAt, last));
  }, 0);
  const held = store.deals.filter((d) => d.hasLien && d.stage !== "cleared" && costOfDelay(d, store.now).fundingHeld);
  return {
    firstPassRate: decided.length ? Math.round((firstPass.length / decided.length) * 100) : null,
    avgDays: cleared.length ? Math.round((totalDays / cleared.length) * 10) / 10 : null,
    stuck: store.deals.filter((d) => d.stage === "needs_fixes" || d.stage === "rejected").length,
    held: held.reduce((a, d) => a + d.price, 0),
    heldCount: held.length,
    decided: decided.length,
  };
}

export function Pill({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap ${tone}`}>{children}</span>;
}
export const StagePill = ({ stage }: { stage: DealStage }) => <Pill tone={stageMeta(stage).tone}>{stageMeta(stage).label}</Pill>;
export const SevPill = ({ sev }: { sev: Severity }) => <Pill tone={SEV_TONE[sev]}>{sev}</Pill>;

export function Panel({ title, action, children, className = "" }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white shadow-sm ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function PageHeader({ title, sub, action }: { title: string; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {sub && <p className="mt-0.5 text-sm text-slate-600">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Kpi({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export const btn = "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50";
export const btnPrimary = `${btn} bg-indigo-600 text-white hover:bg-indigo-700`;
export const btnGhost = `${btn} border border-slate-300 bg-white text-slate-800 hover:bg-slate-50`;
export const inputCls = "rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-indigo-600";

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-md border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">{children}</p>;
}

const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msgs, setMsgs] = useState<{ id: number; msg: string }[]>([]);
  const push = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setMsgs((m) => [...m, { id, msg }]);
    setTimeout(() => setMsgs((m) => m.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {msgs.map((m) => (
          <div key={m.id} className="pointer-events-auto rounded-md bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">{m.msg}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
