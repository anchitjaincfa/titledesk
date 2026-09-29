"use client";
import Link from "next/link";
import { useStore } from "@/lib/store-context";
import { costOfDelay } from "@/lib/sim";
import { Empty, PageHeader, Pill, StagePill, btnGhost, dealName, money, useToast } from "@/components/app/kit";

export default function LenderPage() {
  const { store } = useStore();
  const toast = useToast();
  const rows = store.deals.filter((d) => d.hasLien && d.stage !== "cleared").map((d) => ({ d, c: costOfDelay(d, store.now) }));
  const totalInterest = rows.reduce((a, r) => a + r.c.floorplanInterest, 0);
  const totalHeld = rows.filter((r) => r.c.fundingHeld).reduce((a, r) => a + r.d.price, 0);
  async function copy(token: string) {
    const url = `${window.location.origin}/share/${token}`;
    try { await navigator.clipboard.writeText(url); toast("Read-only link copied"); } catch { toast(url); }
  }
  return (
    <>
      <PageHeader title="Lender view" sub={`Funding held: ${money(totalHeld)} · Estimated floorplan interest accrued: ${money(totalInterest)}`} />
      {rows.length === 0 ? <Empty>No open lien deals.</Empty> : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>{["Deal", "Lender", "Stage", "Days open", "Interest", "Funding", "Share"].map((h) => <th key={h} scope="col" className="px-3 py-2 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ d, c }) => (
                <tr key={d.id}>
                  <td className="px-3 py-2"><Link className="font-medium text-indigo-700 hover:underline" href={`/app/deals/${d.id}`}>{dealName(d)}</Link><div className="text-xs text-slate-500">{d.stock}</div></td>
                  <td className="px-3 py-2">{d.lender ?? "n/a"}</td>
                  <td className="px-3 py-2"><StagePill stage={d.stage} /></td>
                  <td className="px-3 py-2 tabular-nums">{c.days}</td>
                  <td className="px-3 py-2 tabular-nums">{money(c.floorplanInterest)}</td>
                  <td className="px-3 py-2">{c.fundingHeld ? <Pill tone="bg-red-50 text-red-800 ring-red-300">Held {money(d.price)}</Pill> : <Pill tone="bg-emerald-50 text-emerald-800 ring-emerald-300">Funded</Pill>}</td>
                  <td className="px-3 py-2"><button className={`${btnGhost} !py-1 text-xs`} onClick={() => copy(d.shareToken)}>Copy link</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-slate-500">Share links are read-only and show status only. Interest figures are illustrative estimates.</p>
    </>
  );
}
