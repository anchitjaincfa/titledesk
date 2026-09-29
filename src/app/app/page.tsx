"use client";
import Link from "next/link";
import { useStore } from "@/lib/store-context";
import { Kpi, PageHeader, Panel, STAGES, StagePill, dealName, metrics, money, openBlockers } from "@/components/app/kit";

export default function Dashboard() {
  const { store } = useStore();
  const m = metrics(store);
  return (
    <>
      <PageHeader title="Dashboard" sub="Every deal, from paperwork to cleared title." />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="First-pass clear rate" value={m.firstPassRate === null ? "n/a" : `${m.firstPassRate}%`} hint={`${m.decided} decided filings`} />
        <Kpi label="Avg days to title" value={m.avgDays ?? "n/a"} hint="Sale to cleared" />
        <Kpi label="Deals stuck" value={m.stuck} hint="Needs fixes or rejected" />
        <Kpi label="$ held" value={money(m.held)} hint={`${m.heldCount} lender-funded deals held`} />
      </div>
      <h2 className="mb-2 text-sm font-semibold text-slate-900">Pipeline</h2>
      <div className="grid gap-3 pb-2 md:grid-cols-3 xl:grid-cols-6">
        {STAGES.map((s) => {
          const ds = store.deals.filter((d) => d.stage === s.id);
          return (
            <section key={s.id} aria-label={`${s.label}, ${ds.length} deals`} className="min-w-0 rounded-lg border border-slate-200 bg-slate-100/60 p-2">
              <header className="mb-2 flex items-center justify-between px-1">
                <StagePill stage={s.id} />
                <span className="text-xs font-semibold tabular-nums text-slate-600">{ds.length}</span>
              </header>
              <ul className="flex max-h-[28rem] flex-col gap-2 overflow-y-auto">
                {ds.map((d) => (
                  <li key={d.id}>
                    <Link href={`/app/deals/${d.id}`} className="block rounded-md border border-slate-200 bg-white p-2 text-xs shadow-sm hover:border-indigo-400 focus-visible:outline-2 focus-visible:outline-indigo-600">
                      <div className="font-medium text-slate-900">{dealName(d)}</div>
                      <div className="text-slate-500">{d.stock} · {d.state} · {d.buyer}</div>
                      {openBlockers(d).length > 0 && <div className="mt-1 text-red-700">{openBlockers(d).length} blocker(s)</div>}
                    </Link>
                  </li>
                ))}
                {ds.length === 0 && <li className="p-2 text-xs text-slate-400">No deals</li>}
              </ul>
            </section>
          );
        })}
      </div>
      <Panel title="Needs attention" className="mt-6">
        <ul className="divide-y divide-slate-100 text-sm">
          {store.deals.filter((d) => d.stage === "rejected" || d.stage === "needs_fixes").slice(0, 6).map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2 py-2">
              <Link className="font-medium text-indigo-700 hover:underline" href={`/app/deals/${d.id}`}>{dealName(d)} ({d.stock})</Link>
              <StagePill stage={d.stage} />
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
