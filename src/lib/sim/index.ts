import type { Deal, DealDoc, DealEvent, DocFields, DocType, RejectionCode, Store } from "../types";
import { checkDeal, daysSince, deriveStage, getProfile } from "../engine";
import { REJECTION_MESSAGES } from "./seed";
import { addDays, hash32, makeDoc } from "./util";

export { seedStore } from "./seed";
export { hash32, addDays, makeVin, vinCheckDigit } from "./util";

export const MAX_ATTEMPTS = 3;

// ---------- helpers ----------
function mapDeal(store: Store, dealId: string, fn: (d: Deal) => Deal): Store {
  if (!store.deals.some((d) => d.id === dealId)) return store;
  return { ...store, deals: store.deals.map((d) => (d.id === dealId ? fn(d) : d)) };
}
function findDeal(store: Store, dealId: string): Deal | undefined {
  return store.deals.find((d) => d.id === dealId);
}
function withEvents(d: Deal, ...evs: DealEvent[]): Deal {
  return { ...d, events: [...d.events, ...evs] };
}
function notify(store: Store, dealId: string | undefined, channel: "in_app" | "email", subject: string, body: string): Store {
  const n = { id: `n-${store.notifications.length + 1}`, ...(dealId ? { dealId } : {}), at: store.now, channel, subject, body, read: false };
  return { ...store, notifications: [...store.notifications, n] };
}
function blockers(issues: Deal["issues"]): number {
  return issues.filter((i) => i.severity === "blocker" && !i.resolved).length;
}
const LOCKED = ["filed", "rejected", "cleared"];
/** Re-run the issue engine and (for pre-filing deals) re-derive the stage. */
function refresh(d: Deal, now: string): Deal {
  const issues = checkDeal(d, now);
  const next = { ...d, issues };
  return LOCKED.includes(d.stage) ? next : { ...next, stage: deriveStage(next) };
}

// ---------- defect detection / repair (shared by DMV sim and chase agent) ----------
/** What a DMV clerk would notice in the submitted paperwork. */
export function detectDefect(deal: Deal): RejectionCode | undefined {
  const docs = deal.docs;
  if (docs.some((d) => d.fields.sellerSigned === false || d.fields.buyerSigned === false)) return "MISSING_SIGNATURE";
  const odos = new Set(docs.map((d) => d.fields.odometer).filter((x): x is number => x !== undefined));
  if (odos.size > 1) return "ODOMETER_MISMATCH";
  const cur = getProfile(deal.state).currentFormVersion;
  if (docs.some((d) => d.fields.formVersion !== undefined && d.fields.formVersion !== cur)) return "WRONG_FORM_VERSION";
  if (deal.hasLien && !docs.some((d) => d.type === "lien_release")) return "LIEN_NOT_RELEASED";
  if (docs.some((d) => (d.fields.buyerName !== undefined && d.fields.buyerName !== deal.buyer) || (d.fields.sellerName !== undefined && d.fields.sellerName !== deal.seller))) return "NAME_MISMATCH";
  if (docs.some((d) => d.fields.vin !== undefined && d.fields.vin !== deal.vin)) return "VIN_MISMATCH";
  return undefined;
}

export const CLASSIFICATION: Record<RejectionCode, { cause: string; fix: string }> = {
  MISSING_SIGNATURE: { cause: "a signature line is blank on a transfer document", fix: "Collected e-signature and applied it to the unsigned lines" },
  ODOMETER_MISMATCH: { cause: "odometer figures disagree between documents", fix: "Aligned every document to the odometer on the bill of sale" },
  WRONG_FORM_VERSION: { cause: "the application used an outdated form revision", fix: "Regenerated the application on the current state form" },
  LIEN_NOT_RELEASED: { cause: "a prior lien is on record with no release attached", fix: "Requested and attached the lien release from the lender" },
  NAME_MISMATCH: { cause: "the buyer name differs between documents", fix: "Normalised names on all documents to the bill of sale" },
  FEE_SHORT: { cause: "fees paid were below the amount due", fix: "Recalculated state fees and attached a supplemental payment" },
  VIN_MISMATCH: { cause: "a document carries a different VIN than the title", fix: "Corrected the VIN on every document to the title VIN" },
};

export function repairDocs(deal: Deal, code: RejectionCode, nowIso: string): DealDoc[] {
  const docs = deal.docs;
  const ref = docs.find((d) => d.type === "bill_of_sale")?.fields.odometer ?? docs.find((d) => d.fields.odometer !== undefined)?.fields.odometer;
  const patch = (fn: (d: DealDoc) => DocFields): DealDoc[] => docs.map((d) => ({ ...d, fields: fn(d) }));
  switch (code) {
    case "MISSING_SIGNATURE":
      return patch((d) => ({ ...d.fields, ...(d.fields.sellerSigned === false ? { sellerSigned: true } : {}), ...(d.fields.buyerSigned === false ? { buyerSigned: true } : {}) }));
    case "ODOMETER_MISMATCH":
      return patch((d) => (d.fields.odometer !== undefined && ref !== undefined ? { ...d.fields, odometer: ref } : d.fields));
    case "WRONG_FORM_VERSION": {
      const cur = getProfile(deal.state).currentFormVersion;
      return patch((d) => (d.fields.formVersion !== undefined ? { ...d.fields, formVersion: cur } : d.fields));
    }
    case "LIEN_NOT_RELEASED":
      return docs.some((d) => d.type === "lien_release")
        ? docs
        : [...docs, makeDoc("lien_release", deal, ref ?? 0, nowIso, 0.93)];
    case "NAME_MISMATCH":
      return patch((d) => ({
        ...d.fields,
        ...(d.fields.buyerName !== undefined ? { buyerName: deal.buyer } : {}),
        ...(d.fields.sellerName !== undefined ? { sellerName: deal.seller } : {}),
      }));
    case "VIN_MISMATCH":
      return patch((d) => (d.fields.vin !== undefined ? { ...d.fields, vin: deal.vin } : d.fields));
    case "FEE_SHORT":
      return docs.some((d) => d.type === "tax_form")
        ? patch((d) => (d.type === "tax_form" ? { ...d.fields, price: deal.price } : d.fields))
        : [...docs, makeDoc("tax_form", deal, ref ?? 0, nowIso, 0.93)];
  }
}

// ---------- store actions ----------
export function fileDeal(store: Store, dealId: string): Store {
  const deal = findDeal(store, dealId);
  if (!deal || deal.stage === "filed" || deal.stage === "cleared") return store;
  const issues = checkDeal(deal, store.now);
  const n = blockers(issues);
  if (n > 0) {
    return notify(store, dealId, "in_app", `Cannot file ${deal.stock}`, `${n} blocker${n === 1 ? "" : "s"} must be resolved before filing.`);
  }
  const channel = getProfile(deal.state).eTitle ? "e-file" : "paper";
  const attempts = (deal.filing?.attempts ?? 0) + 1;
  return mapDeal(store, dealId, (d) =>
    withEvents({ ...d, issues, stage: "filed", filing: { channel, submittedAt: store.now, status: "submitted", attempts } },
      { at: store.now, kind: "filed", message: `Filed with ${getProfile(d.state).name} DMV via ${channel} (attempt ${attempts}).`, actor: "dealer" }),
  );
}

export function simulateDmvDay(store: Store): Store {
  const now = addDays(store.now, 1);
  let next: Store = { ...store, now };
  for (const deal of store.deals) {
    if (deal.stage !== "filed" || !deal.filing || deal.filing.status !== "submitted") continue;
    const attempts = deal.filing.attempts;
    let code: RejectionCode | undefined = detectDefect(deal);
    if (!code && attempts <= 1 && hash32(`${deal.id}:${attempts}`) % 100 < 25) {
      code = hash32(`${deal.id}:${attempts}:c`) % 2 === 0 ? "FEE_SHORT" : "VIN_MISMATCH";
    }
    if (code) {
      const message = REJECTION_MESSAGES[code];
      next = mapDeal(next, deal.id, (d) =>
        withEvents({ ...d, stage: "rejected", filing: { ...deal.filing!, status: "rejected", rejection: { code: code!, message, at: now } } },
          { at: now, kind: "rejected", message, actor: "dmv" }));
      next = notify(next, deal.id, "in_app", `DMV rejected ${deal.stock}`, message);
    } else {
      next = mapDeal(next, deal.id, (d) =>
        withEvents({ ...d, stage: "cleared", filing: { ...deal.filing!, status: "cleared" } },
          { at: now, kind: "cleared", message: "Title application accepted. Title issued.", actor: "dmv" }));
      next = notify(next, deal.id, "in_app", `Title cleared for ${deal.stock}`, "The DMV accepted the application.");
    }
  }
  return next;
}

export function chaseRejection(store: Store, dealId: string): Store {
  const deal = findDeal(store, dealId);
  const rej = deal?.filing?.rejection;
  if (!deal || !deal.filing || !rej || deal.stage !== "rejected") return store;
  const at = store.now;
  const attempts = deal.filing.attempts;
  if (attempts >= MAX_ATTEMPTS) {
    if (deal.notes.some((x) => x.startsWith("ESCALATED"))) return store;
    const note = `ESCALATED after ${attempts} rejected attempts (${rej.code}). Needs a human at the DMV counter.`;
    const s = mapDeal(store, dealId, (d) =>
      withEvents({ ...d, notes: [...d.notes, note] }, { at, kind: "escalated", message: note, actor: "agent" }));
    return notify(s, dealId, "in_app", `Escalation: ${deal.stock} rejected ${attempts} times`, note);
  }
  const cls = CLASSIFICATION[rej.code];
  const docs = repairDocs(deal, rej.code, at);
  const repaired: Deal = { ...deal, docs };
  const issues = checkDeal(repaired, at);
  const evs: DealEvent[] = [
    { at, kind: "classified", message: `Classified ${rej.code}: ${cls.cause}.`, actor: "agent" },
    { at, kind: "repaired", message: `${cls.fix}.`, actor: "agent" },
  ];
  const n = blockers(issues);
  if (n > 0) {
    evs.push({ at, kind: "held", message: `Re-check still shows ${n} blocker(s); held for the dealer.`, actor: "agent" });
    return mapDeal(store, dealId, (d) => withEvents({ ...d, docs, issues, stage: "needs_fixes" }, ...evs));
  }
  evs.push({ at, kind: "resubmitted", message: `Re-check clean. Resubmitted (attempt ${attempts + 1}).`, actor: "agent" });
  return mapDeal(store, dealId, (d) =>
    withEvents({ ...d, docs, issues, stage: "filed", filing: { channel: deal.filing!.channel, submittedAt: at, status: "submitted", attempts: attempts + 1 } }, ...evs));
}

export function addDoc(store: Store, dealId: string, doc: DealDoc): Store {
  return mapDeal(store, dealId, (d) => {
    const exists = d.docs.some((x) => x.type === doc.type);
    const docs = exists ? d.docs.map((x) => (x.type === doc.type ? doc : x)) : [...d.docs, doc];
    const ev: DealEvent = { at: store.now, kind: "doc_added", message: `${doc.type} uploaded (${doc.fileName}).`, actor: "dealer" };
    return refresh(withEvents({ ...d, docs }, ev), store.now);
  });
}

/** Simulated OCR: derives fields from the deal, tweaked by hints in the file name. */
export function extractFromFile(fileName: string, type: DocType, deal: Deal): DealDoc {
  const lower = fileName.toLowerCase();
  const h = hash32(`${deal.id}:${type}:${fileName}`);
  const odo = deal.docs.find((d) => d.type === "bill_of_sale")?.fields.odometer
    ?? deal.docs.find((d) => d.fields.odometer !== undefined)?.fields.odometer
    ?? (2026 - deal.year) * 11000 + (hash32(deal.id) % 9000);
  const fields: DocFields = { ...makeDoc(type, deal, odo, deal.soldAt, 1).fields };
  let confidence = 0.8 + (h % 18) / 100;
  if (/blur|dark|low|skew|crop/.test(lower)) confidence = 0.55 + (h % 15) / 100;
  if (/unsigned|nosig/.test(lower)) { fields.sellerSigned = false; fields.buyerSigned = false; }
  if (/old|legacy/.test(lower) && fields.formVersion !== undefined) fields.formVersion = fields.formVersion + "-legacy";
  if (/odo|mismatch/.test(lower) && fields.odometer !== undefined) fields.odometer = fields.odometer - 5000;
  const at = deal.events.length ? deal.events[deal.events.length - 1]!.at : deal.soldAt;
  return {
    id: `${deal.id}-${type}-${h % 1000}`, type, fileName, uploadedAt: at,
    fields, confidence: Math.round(confidence * 100) / 100,
  };
}

export function requestFix(store: Store, dealId: string, issueId: string): Store {
  const deal = findDeal(store, dealId);
  const issue = deal?.issues.find((i) => i.id === issueId);
  if (!deal || !issue) return store;
  const s = notify(store, dealId, "email", `Action needed on ${deal.stock}: ${issue.title}`,
    `Hi ${deal.buyer.split(" ")[0]},\n\nTo finish the title paperwork for your ${deal.year} ${deal.make} ${deal.model}, we need one thing: ${issue.fix}\n\nThe upload link for your deal: /share/${deal.shareToken}\n\nThank you,\n${deal.seller}`);
  return mapDeal(s, dealId, (d) =>
    withEvents(d, { at: store.now, kind: "fix_requested", message: `Fix requested by email: ${issue.title}.`, actor: "dealer" }));
}

export function costOfDelay(deal: Deal, nowIso: string): { days: number; floorplanInterest: number; fundingHeld: boolean } {
  const days = Math.max(0, daysSince(deal.soldAt, nowIso));
  if (deal.stage === "cleared" || days <= 3) return { days, floorplanInterest: 0, fundingHeld: false };
  const floorplanInterest = Math.round(((deal.price * 0.09) / 365) * days * 100) / 100;
  return { days, floorplanInterest, fundingHeld: true };
}

export function pricePerTitle(volumeThisMonth: number): number {
  if (volumeThisMonth < 10) return 99;
  if (volumeThisMonth < 50) return 79;
  return 49;
}