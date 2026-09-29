"use client";
import { useParams } from "next/navigation";
import { StoreProvider, useStore } from "@/lib/store-context";
import { getProfile } from "@/lib/engine";
import { Pill, StagePill, dealName, fmtDate, fmtDateTime, openBlockers } from "@/components/app/kit";

function Status() {
  const { token } = useParams<{ token: string }>();
  const { store, hydrated } = useStore();
  const deal = store.deals.find((d) => d.shareToken === token);
  if (!hydrated) return <p className="text-sm text-slate-500">Loading status...</p>;
  if (!deal) return <p className="text-sm text-slate-700">This link is not valid, or the demo data was reset.</p>;
  const profile = getProfile(deal.state);
  const have = profile.requiredDocs.filter((t) => deal.docs.some((d) => d.type === t)).length;
  const blockers = openBlockers(deal).length;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{dealName(deal)}</h1>
        <p className="text-sm text-slate-600">Stock {deal.stock} · {profile.name} · sold {fmtDate(deal.soldAt)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StagePill stage={deal.stage} />
        {deal.hasLien && <Pill tone="bg-slate-100 text-slate-700 ring-slate-300">Lender: {deal.lender ?? "on file"}</Pill>}
        {blockers > 0 && <Pill tone="bg-red-50 text-red-800 ring-red-300">{blockers} open item(s)</Pill>}
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="text-sm font-medium">Paperwork: {have} of {profile.requiredDocs.length} documents received</div>
        <div className="mt-2 h-2 rounded bg-slate-100" role="progressbar" aria-valuenow={have} aria-valuemin={0} aria-valuemax={profile.requiredDocs.length}>
          <div className="h-2 rounded bg-indigo-600" style={{ width: `${(have / profile.requiredDocs.length) * 100}%` }} />
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold">Timeline</h2>
        <ol className="space-y-2 text-sm">
          {[...deal.events].filter((e) => e.kind !== "note").reverse().map((e, i) => (
            <li key={i} className="border-l-2 border-slate-200 pl-3"><div className="text-xs text-slate-500">{fmtDateTime(e.at)}</div>{e.message}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export default function SharePage() {
  return (
    <StoreProvider>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white px-4 py-3">
          <span className="font-bold">TitleDesk</span> <span className="text-sm text-slate-500">Read-only deal status (demo data)</span>
        </header>
        <main className="mx-auto max-w-2xl p-4"><Status /></main>
      </div>
    </StoreProvider>
  );
}
