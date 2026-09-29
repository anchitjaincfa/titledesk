import type { Deal, DealDoc, DealEvent, DealStage, Notification, RejectionCode, StateCode, Store } from "../types";
import { checkDeal, deriveStage, getProfile } from "../engine";
import { DEALER_ID, DEALER_NAME, NOW, addDays, buildCleanDocs, hash32, makeDoc, makeVin } from "./util";

export const REJECTION_MESSAGES: Record<RejectionCode, string> = {
  MISSING_SIGNATURE: "Application rejected: required signature missing on transfer documents.",
  ODOMETER_MISMATCH: "Application rejected: odometer reading does not match across submitted documents.",
  WRONG_FORM_VERSION: "Application rejected: outdated form version submitted; current revision required.",
  LIEN_NOT_RELEASED: "Application rejected: prior lien on record with no lien release attached.",
  NAME_MISMATCH: "Application rejected: buyer name does not match across submitted documents.",
  FEE_SHORT: "Application rejected: title and registration fees received are short of the amount due.",
  VIN_MISMATCH: "Application rejected: VIN on supporting document does not match the title record.",
};

interface Def {
  st: StateCode; y: number; make: string; model: string; wmi: string;
  buyer: string; price: number; ago: number; stage: DealStage;
  defect?: RejectionCode; lender?: string; trade?: string; attempts?: number; lowConf?: boolean;
}

const DEFS: Def[] = [
  { st: "CA", y: 2019, make: "Toyota", model: "Camry", wmi: "4T1", buyer: "Maria Alvarez", price: 18450, ago: 1, stage: "intake" },
  { st: "TX", y: 2020, make: "Ford", model: "F-150", wmi: "1FT", buyer: "Darnell Brooks", price: 31900, ago: 0, stage: "intake", trade: "2012 Chevrolet Silverado" },
  { st: "FL", y: 2018, make: "Honda", model: "Accord", wmi: "1HG", buyer: "Priya Nair", price: 16750, ago: 2, stage: "intake" },
  { st: "GA", y: 2017, make: "Nissan", model: "Altima", wmi: "1N4", buyer: "Terrence Holloway", price: 11800, ago: 5, stage: "needs_fixes", defect: "MISSING_SIGNATURE" },
  { st: "NC", y: 2021, make: "Hyundai", model: "Tucson", wmi: "5NM", buyer: "Emily Carraway", price: 23400, ago: 6, stage: "needs_fixes", defect: "ODOMETER_MISMATCH" },
  { st: "OH", y: 2016, make: "Chevrolet", model: "Malibu", wmi: "1G1", buyer: "Gregory Kowalski", price: 9950, ago: 4, stage: "needs_fixes", defect: "WRONG_FORM_VERSION" },
  { st: "PA", y: 2019, make: "Jeep", model: "Cherokee", wmi: "1C4", buyer: "Angela Rossi", price: 21200, ago: 8, stage: "needs_fixes", defect: "LIEN_NOT_RELEASED", lender: "Ally Financial" },
  { st: "AZ", y: 2020, make: "Kia", model: "Sorento", wmi: "5XY", buyer: "Miguel Contreras", price: 25800, ago: 3, stage: "needs_fixes", defect: "NAME_MISMATCH", lowConf: true },
  { st: "CA", y: 2018, make: "Subaru", model: "Outback", wmi: "4S4", buyer: "Hannah Lindqvist", price: 20900, ago: 9, stage: "needs_fixes", defect: "MISSING_SIGNATURE" },
  { st: "TX", y: 2019, make: "Ram", model: "1500", wmi: "1C6", buyer: "Luis Herrera", price: 28700, ago: 7, stage: "needs_fixes", defect: "ODOMETER_MISMATCH", trade: "2010 Dodge Ram 1500" },
  { st: "FL", y: 2022, make: "Toyota", model: "RAV4", wmi: "2T3", buyer: "Olivia Bennett", price: 29900, ago: 2, stage: "ready" },
  { st: "GA", y: 2020, make: "Mazda", model: "CX-5", wmi: "JM3", buyer: "Marcus Whitfield", price: 22300, ago: 3, stage: "ready", lender: "Chase Auto" },
  { st: "NC", y: 2018, make: "Volkswagen", model: "Jetta", wmi: "3VW", buyer: "Sofia Delgado", price: 13500, ago: 2, stage: "ready", trade: "2011 Honda Civic" },
  { st: "OH", y: 2021, make: "Chevrolet", model: "Equinox", wmi: "2GN", buyer: "Brian Fitzgerald", price: 22100, ago: 1, stage: "ready" },
  { st: "PA", y: 2017, make: "Honda", model: "CR-V", wmi: "2HK", buyer: "Nadia Petrova", price: 15600, ago: 3, stage: "ready" },
  { st: "AZ", y: 2019, make: "Ford", model: "Escape", wmi: "1FM", buyer: "Cody Ramirez", price: 17400, ago: 6, stage: "filed" },
  { st: "CA", y: 2020, make: "Tesla", model: "Model 3", wmi: "5YJ", buyer: "Wei Zhang", price: 27800, ago: 7, stage: "filed" },
  { st: "TX", y: 2018, make: "GMC", model: "Sierra 1500", wmi: "1GT", buyer: "Tamika Jefferson", price: 26500, ago: 5, stage: "filed", lender: "Westlake Financial" },
  { st: "FL", y: 2019, make: "Dodge", model: "Charger", wmi: "2C3", buyer: "Rafael Ortiz", price: 24300, ago: 6, stage: "filed" },
  { st: "GA", y: 2018, make: "Ford", model: "Fusion", wmi: "3FA", buyer: "Latoya Simmons", price: 10200, ago: 12, stage: "rejected", defect: "ODOMETER_MISMATCH" },
  { st: "NC", y: 2019, make: "Nissan", model: "Rogue", wmi: "5N1", buyer: "Jacob Whitaker", price: 19800, ago: 10, stage: "rejected", defect: "LIEN_NOT_RELEASED", lender: "Capital One Auto" },
  { st: "OH", y: 2018, make: "Buick", model: "Encore", wmi: "KL4", buyer: "Ruth Ann Miller", price: 14900, ago: 14, stage: "rejected", defect: "WRONG_FORM_VERSION", attempts: 2 },
  { st: "PA", y: 2021, make: "Subaru", model: "Forester", wmi: "JF2", buyer: "Daniel Okafor", price: 26100, ago: 18, stage: "cleared" },
  { st: "AZ", y: 2017, make: "Toyota", model: "Tacoma", wmi: "3TM", buyer: "Vanessa Cruz", price: 24700, ago: 22, stage: "cleared" },
  { st: "CA", y: 2020, make: "Honda", model: "Civic", wmi: "2HG", buyer: "Kevin Tran", price: 19600, ago: 25, stage: "cleared", trade: "2009 Toyota Corolla", attempts: 2 },
];

/** Introduce one deliberate defect into a deal's docs. */
export function injectDefect(docs: DealDoc[], code: RejectionCode, deal: Deal): DealDoc[] {
  const cur = getProfile(deal.state).currentFormVersion;
  const odo = docs.find((d) => d.fields.odometer !== undefined)?.fields.odometer ?? 50000;
  switch (code) {
    case "MISSING_SIGNATURE":
      return docs.map((d) => (d.type === "bill_of_sale" ? { ...d, fields: { ...d.fields, sellerSigned: false } } : d));
    case "ODOMETER_MISMATCH":
      return docs.map((d) => (d.type === "odometer_disclosure" ? { ...d, fields: { ...d.fields, odometer: odo - 4200 } } : d));
    case "WRONG_FORM_VERSION":
      return docs.map((d) => (d.type === "application_for_title" ? { ...d, fields: { ...d.fields, formVersion: cur + "-legacy" } } : d));
    case "LIEN_NOT_RELEASED":
      return docs.filter((d) => d.type !== "lien_release");
    case "NAME_MISMATCH": {
      const short = deal.buyer.replace(/^(\w)\w*/, "$1.");
      return docs.map((d) => (d.type === "buyer_id" ? { ...d, fields: { ...d.fields, buyerName: short } } : d));
    }
    default:
      return docs;
  }
}

function ev(at: string, kind: string, message: string, actor: DealEvent["actor"]): DealEvent {
  return { at, kind, message, actor };
}

function buildDeal(i: number, def: Def): Deal {
  const id = `d-${String(i + 1).padStart(2, "0")}`;
  const soldAt = addDays(NOW, -def.ago);
  const year = def.y;
  const h = hash32(id);
  const odo = (2026 - year) * 11000 + (h % 9000);
  const skeleton: Deal = {
    id, dealerId: DEALER_ID, stock: `SA-${1040 + i}`,
    vin: makeVin(def.wmi, year, id), year, make: def.make, model: def.model,
    state: def.st, soldAt, buyer: def.buyer, seller: DEALER_NAME, price: def.price,
    tradeIn: !!def.trade, hasLien: !!def.lender, ...(def.lender ? { lender: def.lender } : {}),
    stage: "intake", docs: [], issues: [], events: [], notes: [],
    shareToken: "t" + hash32("share:" + id).toString(36).padStart(7, "0").slice(0, 8),
  };
  const clean = buildCleanDocs(skeleton, odo, soldAt);
  let docs: DealDoc[] = clean;
  if (def.stage === "intake") docs = clean.filter((d) => d.type === "bill_of_sale" || d.type === "buyer_id");
  if (def.defect) docs = injectDefect(docs, def.defect, skeleton);
  if (def.lowConf) docs = docs.map((d) => (d.type === "buyer_id" ? { ...d, confidence: 0.62 } : d));
  const attempts = def.attempts ?? 1;

  const events: DealEvent[] = [ev(soldAt, "created", `Deal created for ${def.buyer} (${year} ${def.make} ${def.model}).`, "dealer")];
  events.push(ev(soldAt, "docs_uploaded", `${docs.length} document${docs.length === 1 ? "" : "s"} uploaded and read.`, "system"));
  const notes: string[] = [];
  if (def.trade) notes.push(`Trade-in: ${def.trade}. Trade title to follow.`);
  if (def.lender) notes.push(`Lienholder: ${def.lender}.`);

  let deal: Deal = { ...skeleton, docs, events, notes };
  deal = { ...deal, issues: checkDeal(deal, NOW) };
  let stage: DealStage = def.stage;
  if (stage === "needs_fixes" || stage === "ready") stage = deriveStage(deal);
  deal = { ...deal, stage };

  const channel = getProfile(def.st).eTitle ? "e-file" : "paper";
  if (def.stage === "filed") {
    const at = addDays(NOW, -Math.min(2, def.ago - 1));
    deal = { ...deal, filing: { channel, submittedAt: at, status: "submitted", attempts: 1 },
      events: [...deal.events, ev(at, "filed", `Filed with ${getProfile(def.st).name} DMV via ${channel}.`, "dealer")] };
  } else if (def.stage === "rejected" && def.defect) {
    const sub = addDays(NOW, -4);
    const rat = addDays(NOW, -2);
    deal = { ...deal, filing: { channel, submittedAt: sub, status: "rejected", attempts,
      rejection: { code: def.defect, message: REJECTION_MESSAGES[def.defect], at: rat } },
      events: [...deal.events, ev(sub, "filed", `Filed with ${getProfile(def.st).name} DMV via ${channel}.`, "dealer"),
        ev(rat, "rejected", REJECTION_MESSAGES[def.defect], "dmv")] };
  } else if (def.stage === "cleared") {
    const sub = addDays(soldAt, 3);
    const cat = addDays(sub, 5);
    deal = { ...deal, filing: { channel, submittedAt: sub, status: "cleared", attempts },
      events: [...deal.events, ev(sub, "filed", `Filed with ${getProfile(def.st).name} DMV via ${channel}.`, "dealer"),
        ev(cat, "cleared", "Title application accepted. Title issued.", "dmv")] };
  }
  if (deal.stage === "needs_fixes") {
    deal = { ...deal, assignee: "Dana", events: [...deal.events, ev(NOW, "issues_found", `${deal.issues.filter((x) => x.severity === "blocker" && !x.resolved).length} blocker(s) found by the desk agent.`, "agent")] };
  }
  return { ...deal, issues: checkDeal(deal, NOW) };
}

export function seedStore(): Store {
  const deals = DEFS.map((d, i) => buildDeal(i, d));
  const notifications: Notification[] = deals
    .filter((d) => d.stage === "rejected" && d.filing?.rejection)
    .map((d, i) => ({
      id: `n-${i + 1}`, dealId: d.id, at: d.filing!.rejection!.at, channel: "in_app" as const,
      subject: `DMV rejected ${d.stock}`, body: d.filing!.rejection!.message, read: false,
    }));
  return { deals, notifications, now: NOW, credits: 5 };
}

export { makeDoc };