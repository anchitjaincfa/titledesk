"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store-context";
import { STATES } from "@/lib/engine";
import type { DealStage, StateCode } from "@/lib/types";
import { PageHeader, STAGES, StagePill, dealName, fmtDate, inputCls, money, openBlockers, Empty } from "@/components/app/kit";

export default function DealsPage() {
  const { store } = useStore();
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<DealStage | "all">("all");
  const [st, setSt] = useState<StateCode | "all">("all");
  const rows = useMemo(() => store.deals.filter((d) =>
    (stage === "all" || d.stage === stage) && (st === "all" || d.state === st) &&
    (!q || `${d.stock} ${d.vin} ${d.buyer} ${d.make} ${d.model}`.toLowerCase().includes(q.toLowerCase()))), [store.deals, q, stage, st]);
  return (
    <>
      <PageHeader title="Deals" sub={`${rows.length} of ${store.deals.length} deals`} />
      <div className="mb-3 flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="q">Search deals</label>
        <input id="q" className={`${inputCls} w-full sm:w-64`} placeholder="Search stock, VIN, buyer" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="sr-only" htmlFor="stage">Stage</label>
        <select id="stage" className={inputCls} value={stage} onChange={(e) => setStage(e.target.value as DealStage | "all")}>
          <option value="all">All stages</option>
          {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <label className="sr-only" htmlFor="st">State</label>
        <select id="st" className={inputCls} value={st} onChange={(e) => setSt(e.target.value as StateCode | "all")}>
          <option value="all">All states</option>
          {STATES.map((s) => <option key={s.state} value={s.state}>{s.state}</option>)}
        </select>
      </div>
      {rows.length === 0 ? <Empty>No deals match these filters.</Empty> : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[42rem] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>{["Stock", "Vehicle", "State", "Buyer", "Sold", "Price", "Stage", "Blockers"].map((h) => <th key={h} scope="col" className="px-3 py-2 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2"><Link className="font-medium text-indigo-700 hover:underline" href={`/app/deals/${d.id}`}>{d.stock}</Link></td>
                  <td className="px-3 py-2">{dealName(d)}{d.tradeIn && <span className="ml-1 text-xs text-slate-500">(trade-in)</span>}</td>
                  <td className="px-3 py-2">{d.state}</td>
                  <td className="px-3 py-2">{d.buyer}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtDate(d.soldAt)}</td>
                  <td className="px-3 py-2 tabular-nums">{money(d.price)}</td>
                  <td className="px-3 py-2"><StagePill stage={d.stage} /></td>
                  <td className="px-3 py-2 tabular-nums">{openBlockers(d).length || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
