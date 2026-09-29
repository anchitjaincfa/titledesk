"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useRef, useState, type DragEvent } from "react";
import { useStore } from "@/lib/store-context";
import { getProfile } from "@/lib/engine";
import type { DocType } from "@/lib/types";
import {
  Empty, Panel, PageHeader, SevPill, StagePill, btnGhost, btnPrimary, dealName, fmtDate, fmtDateTime, inputCls,
  money, openBlockers, useToast,
} from "@/components/app/kit";

const DOC_LABEL: Record<DocType, string> = {
  bill_of_sale: "Bill of sale", title_or_mso: "Title / MSO", odometer_disclosure: "Odometer disclosure",
  power_of_attorney: "Power of attorney", lien_release: "Lien release", buyers_order: "Buyer's order",
  buyer_id: "Buyer ID", insurance_proof: "Proof of insurance", application_for_title: "Application for title", tax_form: "Tax form",
};

export default function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const { store, file, chase, addDocument, requestFix, recheck, addNote } = useStore();
  const toast = useToast();
  const deal = store.deals.find((d) => d.id === id);
  const [docType, setDocType] = useState<DocType | "">("");
  const [note, setNote] = useState("");
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  if (!deal) return <Empty>Deal not found. <Link className="text-indigo-700 underline" href="/app/deals">Back to deals</Link></Empty>;
  const profile = getProfile(deal.state);
  const blockers = openBlockers(deal);
  const canFile = blockers.length === 0 && deal.stage === "ready";
  const disabledReason = deal.stage === "filed" || deal.stage === "cleared" ? "Already filed."
    : deal.stage === "rejected" ? "Rejected: use Chase rejection."
    : blockers.length > 0 ? `${blockers.length} blocker(s) must be fixed first.` : "";
  const missing = profile.requiredDocs.filter((t) => !deal.docs.some((d) => d.type === t));
  const target: DocType | "" = docType || missing[0] || "";

  function handleFiles(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    if (!target) { toast("Choose a document type first"); return; }
    addDocument(deal!.id, target, f.name);
    toast(`Extracted ${f.name} and re-checked the deal`);
    setDocType("");
  }
  function onDrop(e: DragEvent) { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }

  const rej = deal.filing?.rejection;
  return (
    <>
      <PageHeader
        title={`${dealName(deal)} · ${deal.stock}`}
        sub={<>VIN {deal.vin} · {profile.name} · sold {fmtDate(deal.soldAt)} · {money(deal.price)} · {deal.buyer}</>}
        action={
          <div className="flex items-center gap-2">
            <StagePill stage={deal.stage} />
            <button className={btnPrimary} disabled={!canFile} aria-describedby="file-reason"
              onClick={() => { file(deal.id); toast("Filed with the DMV (simulated)"); }}>File title packet</button>
          </div>
        }
      />
      {!canFile && disabledReason && <p id="file-reason" className="-mt-3 mb-4 text-right text-xs text-slate-500">{disabledReason}</p>}

      {rej && (
        <Panel title="Rejection" className="mb-4 border-red-300" action={
          <button className={btnPrimary} onClick={() => { chase(deal.id); toast("Agent classified the rejection and resubmitted"); }}>Chase rejection</button>}>
          <p className="text-sm"><span className="font-mono text-xs font-semibold text-red-700">{rej.code}</span> on {fmtDate(rej.at)}: {rej.message}</p>
          <p className="mt-1 text-xs text-slate-500">Attempt {deal.filing!.attempts} of 3. After 3 attempts the agent escalates to a human.</p>
        </Panel>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel title={`Document checklist · ${profile.name}`}>
            <ul className="divide-y divide-slate-100 text-sm">
              {profile.requiredDocs.map((t) => {
                const d = deal.docs.find((x) => x.type === t);
                return (
                  <li key={t} className="flex items-center justify-between gap-2 py-2">
                    <span>{DOC_LABEL[t]}</span>
                    {d ? <span className="text-xs text-emerald-700">{d.fileName} · {Math.round(d.confidence * 100)}%{d.confidence < 0.75 && " (low, in review)"}</span>
                       : <span className="text-xs font-medium text-red-700">Missing</span>}
                  </li>
                );
              })}
            </ul>
            <div
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
              className={`mt-4 rounded-md border-2 border-dashed p-4 text-center text-sm ${drag ? "border-indigo-500 bg-indigo-50" : "border-slate-300"}`}>
              <p className="mb-2 text-slate-600">Drop a file here, or pick one. Extraction is simulated.</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <label className="sr-only" htmlFor="doctype">Document type</label>
                <select id="doctype" className={inputCls} value={target} onChange={(e) => setDocType(e.target.value as DocType)}>
                  <option value="">Select type</option>
                  {profile.requiredDocs.map((t) => <option key={t} value={t}>{DOC_LABEL[t]}</option>)}
                </select>
                <input ref={input} type="file" className="sr-only" aria-label="Upload document" onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
                <button className={btnGhost} onClick={() => input.current?.click()}>Choose file</button>
              </div>
            </div>
          </Panel>

          <Panel title={`Issues (${deal.issues.filter((i) => !i.resolved).length} open)`} action={
            <button className={btnGhost} onClick={() => { recheck(deal.id); toast("Re-checked against " + profile.name + " rules"); }}>Re-check</button>}>
            {deal.issues.length === 0 ? <p className="text-sm text-slate-500">No issues found.</p> : (
              <ul className="space-y-3">
                {deal.issues.map((i) => (
                  <li key={i.id} className={`rounded-md border p-3 text-sm ${i.resolved ? "border-slate-200 opacity-60" : "border-slate-300"}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <SevPill sev={i.severity} />
                      <span className="font-medium">{i.title}</span>
                      {i.resolved && <span className="text-xs text-emerald-700">resolved</span>}
                    </div>
                    <p className="mt-1 text-slate-600"><span className="font-medium">Fix:</span> {i.fix}</p>
                    {!i.resolved && (
                      <button className={`${btnGhost} mt-2 !py-1 text-xs`} onClick={() => { requestFix(deal.id, i.id); toast("Fix request queued in the email outbox"); }}>Request fix</button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Deal">
            <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
              <dt className="text-slate-500">Buyer</dt><dd>{deal.buyer}</dd>
              <dt className="text-slate-500">Seller</dt><dd>{deal.seller}</dd>
              <dt className="text-slate-500">Trade-in</dt><dd>{deal.tradeIn ? "Yes" : "No"}</dd>
              <dt className="text-slate-500">Lien</dt><dd>{deal.hasLien ? deal.lender ?? "Yes" : "None"}</dd>
              <dt className="text-slate-500">State fee</dt><dd>{money(profile.fee)}</dd>
              <dt className="text-slate-500">Assignee</dt><dd>{deal.assignee ?? "Unassigned"}</dd>
              <dt className="text-slate-500">Share link</dt><dd><Link className="text-indigo-700 underline" href={`/share/${deal.shareToken}`}>Open</Link></dd>
            </dl>
          </Panel>
          <Panel title="Notes">
            <ul className="mb-3 space-y-1 text-sm">
              {deal.notes.length === 0 && <li className="text-slate-500">No notes yet.</li>}
              {deal.notes.map((n, i) => <li key={i} className="rounded bg-slate-50 p-2">{n}</li>)}
            </ul>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (note.trim()) { addNote(deal.id, note.trim()); setNote(""); } }}>
              <label className="sr-only" htmlFor="note">Add a note</label>
              <input id="note" className={`${inputCls} min-w-0 flex-1`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note" />
              <button className={btnGhost} type="submit">Add</button>
            </form>
          </Panel>
          <Panel title="Timeline">
            <ol className="space-y-2 text-sm">
              {[...deal.events].reverse().map((e, i) => (
                <li key={i} className="border-l-2 border-slate-200 pl-3">
                  <div className="text-xs text-slate-500">{fmtDateTime(e.at)} · {e.actor}</div>
                  <div>{e.message}</div>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </>
  );
}
