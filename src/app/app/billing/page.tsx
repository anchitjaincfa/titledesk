"use client";
import { useStore } from "@/lib/store-context";
import { pricePerTitle } from "@/lib/sim";
import { Kpi, PageHeader, Panel, btnPrimary, money, useToast } from "@/components/app/kit";

const PAST = [
  { id: "INV-2026-08", period: "Aug 2026", titles: 12, status: "Paid" },
  { id: "INV-2026-07", period: "Jul 2026", titles: 7, status: "Paid" },
  { id: "INV-2026-06", period: "Jun 2026 (pilot)", titles: 5, status: "Covered by pilot credits" },
];

export default function BillingPage() {
  const { store } = useStore();
  const toast = useToast();
  const volume = store.deals.filter((d) => d.filing).length;
  const rate = pricePerTitle(volume);
  const billable = Math.max(0, volume - store.credits);
  return (
    <>
      <PageHeader title="Billing" sub="Per-title pricing: metered when a packet is filed." action={
        <button className={btnPrimary} onClick={() => toast("Stripe test mode: no card was charged (stub)")}>Add payment method (Stripe test)</button>} />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Titles filed this month" value={volume} />
        <Kpi label="Rate per title" value={money(rate)} hint="$99 under 10, $79 for 10-49, $49 for 50+" />
        <Kpi label="Free pilot credits" value={store.credits} hint="Applied before billing" />
        <Kpi label="Estimated this month" value={money(billable * rate)} hint={`${billable} billable titles`} />
      </div>
      <Panel title="Invoices">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500"><tr>{["Invoice", "Period", "Titles", "Amount", "Status"].map((h) => <th key={h} scope="col" className="py-1 pr-3 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              <tr><td className="py-2 pr-3">INV-2026-09</td><td className="pr-3">Sep 2026</td><td className="pr-3 tabular-nums">{volume}</td><td className="pr-3 tabular-nums">{money(billable * rate)}</td><td>Open (test mode)</td></tr>
              {PAST.map((p) => {
                const r = pricePerTitle(p.titles);
                return <tr key={p.id}><td className="py-2 pr-3">{p.id}</td><td className="pr-3">{p.period}</td><td className="pr-3 tabular-nums">{p.titles}</td><td className="pr-3 tabular-nums">{money(p.status.startsWith("Covered") ? 0 : p.titles * r)}</td><td>{p.status}</td></tr>;
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">Prior invoices are illustrative demo data. No real payments are processed.</p>
      </Panel>
    </>
  );
}
