"use client";
import Link from "next/link";
import { useStore } from "@/lib/store-context";
import { STATES } from "@/lib/engine";
import type { RejectionCode } from "@/lib/types";
import { Empty, PageHeader, Panel, Pill, SevPill, dealName, fmtDate } from "@/components/app/kit";

const TAXONOMY: { code: RejectionCode; desc: string; fix: string }[] = [
  { code: "MISSING_SIGNATURE", desc: "A required signature or notarization is absent.", fix: "Request signature, re-upload" },
  { code: "ODOMETER_MISMATCH", desc: "Odometer differs between documents.", fix: "Correct the disclosure" },
  { code: "WRONG_FORM_VERSION", desc: "Outdated state form version.", fix: "Swap in the current form" },
  { code: "LIEN_NOT_RELEASED", desc: "Prior lien has no release on file.", fix: "Obtain the lien release" },
  { code: "NAME_MISMATCH", desc: "Buyer or seller name differs from ID or title.", fix: "Reconcile names" },
  { code: "FEE_SHORT", desc: "Submitted fee is below the state fee.", fix: "Top up the fee" },
  { code: "VIN_MISMATCH", desc: "VIN differs across documents.", fix: "Correct the VIN" },
];
const CONF_TONE = { high: "bg-emerald-50 text-emerald-800 ring-emerald-300", medium: "bg-amber-50 text-amber-800 ring-amber-300", low: "bg-red-50 text-red-800 ring-red-300" };

export default function AdminPage() {
  const { store } = useStore();
  const queue = store.deals.flatMap((d) => d.docs.filter((x) => x.confidence < 0.75).map((doc) => ({ d, doc })));
  const filings = store.deals.filter((d) => d.filing);
  const rejected = store.deals.filter((d) => d.filing?.rejection);
  const count = (c: RejectionCode) => rejected.filter((d) => d.filing!.rejection!.code === c).length;
  return (
    <>
      <PageHeader title="Admin" sub="State rules, extraction review, and rejection analytics." />
      <div className="space-y-5">
        <Panel title="State rules manager">
          <div className="space-y-2">
            {STATES.map((s) => (
              <details key={s.state} className="rounded-md border border-slate-200">
                <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-3 py-2 text-sm font-medium">
                  {s.state} · {s.name}
                  <span className="text-xs font-normal text-slate-500">{s.rules.length} rules · form {s.currentFormVersion} · apply within {s.daysToApply}d · notary {s.notaryRequired ? "yes" : "no"} · e-title {s.eTitle ? "yes" : "no"}</span>
                </summary>
                <div className="overflow-x-auto border-t border-slate-100 p-3">
                  <table className="w-full min-w-[40rem] text-left text-xs">
                    <thead className="text-slate-500"><tr>{["Rule", "Severity", "Source", "Last verified", "Confidence"].map((h) => <th key={h} scope="col" className="py-1 pr-3 font-medium">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-slate-100 align-top">
                      {s.rules.map((r) => (
                        <tr key={r.id}>
                          <td className="py-1.5 pr-3"><div className="font-medium text-slate-900">{r.title}</div><div className="text-slate-500">{r.note}</div></td>
                          <td className="pr-3"><SevPill sev={r.severity} /></td>
                          <td className="pr-3 break-all"><a className="text-indigo-700 underline" href={r.sourceUrl} target="_blank" rel="noreferrer noopener">{r.sourceUrl.replace(/^https?:\/\//, "")}</a></td>
                          <td className="pr-3 whitespace-nowrap">{fmtDate(r.lastVerified)}</td>
                          <td><Pill tone={CONF_TONE[r.confidence]}>{r.confidence}</Pill></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">Rules are illustrative and must be verified against the state source before real use.</p>
        </Panel>

        <Panel title={`Low-confidence extraction review (${queue.length})`}>
          {queue.length === 0 ? <Empty>Queue is empty.</Empty> : (
            <ul className="divide-y divide-slate-100 text-sm">
              {queue.map(({ d, doc }) => (
                <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span><Link className="font-medium text-indigo-700 hover:underline" href={`/app/deals/${d.id}`}>{dealName(d)}</Link> · {doc.type.replace(/_/g, " ")} · {doc.fileName}</span>
                  <Pill tone={CONF_TONE.low}>{Math.round(doc.confidence * 100)}% confidence</Pill>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Rejection-reason taxonomy">
          <p className="mb-3 text-sm text-slate-600">{filings.length} filings, {rejected.length} currently rejected ({filings.length ? Math.round((rejected.length / filings.length) * 100) : 0}%). Average attempts per filing: {filings.length ? (filings.reduce((a, d) => a + d.filing!.attempts, 0) / filings.length).toFixed(1) : "0"}.</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500"><tr>{["Code", "Meaning", "Agent action", "Open"].map((h) => <th key={h} scope="col" className="py-1 pr-3 font-medium">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {TAXONOMY.map((t) => (
                  <tr key={t.code}><td className="py-2 pr-3 font-mono text-xs">{t.code}</td><td className="pr-3">{t.desc}</td><td className="pr-3">{t.fix}</td><td className="tabular-nums">{count(t.code)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  );
}
