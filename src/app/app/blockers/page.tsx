"use client";
import Link from "next/link";
import { useStore } from "@/lib/store-context";
import { Empty, PageHeader, Panel, SevPill, StagePill, dealName, money, openBlockers } from "@/components/app/kit";

export default function BlockersPage() {
  const { store } = useStore();
  const stuck = store.deals.filter((d) => d.tradeIn && d.stage !== "cleared" && d.stage !== "filed" && (openBlockers(d).length > 0 || d.stage === "rejected"));
  const capital = stuck.reduce((a, d) => a + d.price, 0);
  return (
    <>
      <PageHeader title="Blockers" sub={`${stuck.length} trade-ins cannot be resold until paperwork clears. ${money(capital)} of inventory is tied up.`} />
      {stuck.length === 0 ? <Empty>No trade-ins are blocked right now.</Empty> : (
        <div className="grid gap-4 md:grid-cols-2">
          {stuck.map((d) => (
            <Panel key={d.id} title={<Link className="text-indigo-700 hover:underline" href={`/app/deals/${d.id}`}>{dealName(d)} · {d.stock}</Link>} action={<StagePill stage={d.stage} />}>
              <p className="mb-2 text-xs text-slate-500">Cannot resell: the dealer does not hold a clean title yet.</p>
              <ul className="space-y-2 text-sm">
                {openBlockers(d).map((i) => (
                  <li key={i.id}><SevPill sev={i.severity} /> <span className="font-medium">{i.title}</span><div className="text-slate-600">Fix: {i.fix}</div></li>
                ))}
                {d.stage === "rejected" && d.filing?.rejection && <li className="text-red-700">DMV rejection: {d.filing.rejection.message}</li>}
              </ul>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
