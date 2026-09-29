import type { Deal, DealDoc, DealStage, DocType, Issue, Severity } from "../types";
import { daysSince } from "./dates";
import { getProfile } from "./states";
import { validateVin } from "./vin";

const LOW_CONFIDENCE = 0.75;
const DEADLINE_WARN_DAYS = 5;

const SELLER_SIGN_DOCS: DocType[] = ["title_or_mso", "bill_of_sale", "odometer_disclosure"];
const BUYER_SIGN_DOCS: DocType[] = ["bill_of_sale", "odometer_disclosure", "application_for_title", "buyers_order"];
const NOTARY_DOCS: DocType[] = ["bill_of_sale", "application_for_title", "odometer_disclosure"];
const VERSIONED_DOCS: DocType[] = ["application_for_title", "odometer_disclosure", "bill_of_sale"];

const LABEL: Record<DocType, string> = {
  bill_of_sale: "Bill of sale",
  title_or_mso: "Title / MSO",
  odometer_disclosure: "Odometer disclosure",
  power_of_attorney: "Power of attorney",
  lien_release: "Lien release",
  buyers_order: "Buyer's order",
  buyer_id: "Buyer ID",
  insurance_proof: "Proof of insurance",
  application_for_title: "Application for title",
  tax_form: "Tax form",
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const normVin = (s: string) => s.trim().toUpperCase();

export function checkDeal(deal: Deal, nowIso: string): Issue[] {
  const profile = getProfile(deal.state);
  const out: Issue[] = [];
  const add = (ruleId: string, severity: Severity, title: string, fix: string, docType?: DocType) => {
    out.push({ id: `${deal.id}:${ruleId}`, ruleId, severity, title, fix, docType, resolved: false });
  };
  const byType = (t: DocType): DealDoc[] => deal.docs.filter((d) => d.type === t);
  const has = (t: DocType) => byType(t).length > 0;

  // Missing required docs
  for (const t of profile.requiredDocs) {
    if (!has(t)) {
      add(`missing_doc_${t}`, "blocker", `${LABEL[t]} is missing`, `Upload the ${LABEL[t].toLowerCase()} for this deal.`, t);
    }
  }

  // Lien
  if (deal.hasLien && !has("lien_release")) {
    add("lien_release_missing", "blocker", `Lien${deal.lender ? ` (${deal.lender})` : ""} has no lien release`,
      "Request a lien release from the lender and upload it.", "lien_release");
  }

  // VIN
  if (!validateVin(deal.vin)) {
    add("vin_checksum", "blocker", `Deal VIN ${deal.vin} fails the check-digit test`, "Re-read the VIN from the vehicle and correct the deal record.");
  }
  const badDocVin = deal.docs.filter((d) => d.fields.vin && normVin(d.fields.vin) !== normVin(deal.vin));
  if (badDocVin.length > 0) {
    add("vin_mismatch", "blocker",
      `VIN on ${badDocVin.map((d) => LABEL[d.type]).join(", ")} does not match the deal VIN`,
      "Confirm the correct VIN and re-issue or correct the mismatched document(s).", badDocVin[0].type);
  }
  const docVinBad = deal.docs.filter((d) => d.fields.vin && !validateVin(d.fields.vin) && normVin(d.fields.vin) === normVin(deal.vin));
  if (docVinBad.length > 0 && validateVin(deal.vin)) {
    add("vin_doc_checksum", "warning", "A document VIN fails the check-digit test", "Re-scan the document; extraction may have misread a character.", docVinBad[0].type);
  }

  // Odometer
  const age = Number(nowIso.slice(0, 4)) - deal.year;
  const exempt = age >= profile.odometerExemptYears;
  if (exempt) {
    add("odometer_exempt", "info", `Odometer disclosure exempt (vehicle is ${age} model years old)`,
      "No odometer reading needed for this vehicle age; confirm with the state DMV.");
  } else {
    const disc = byType("odometer_disclosure");
    if (disc.length > 0 && disc.every((d) => d.fields.odometer === undefined)) {
      add("odometer_missing", "blocker", "Odometer reading missing on the disclosure", "Record the mileage on the odometer disclosure.", "odometer_disclosure");
    }
    const reading = disc.find((d) => d.fields.odometer !== undefined)?.fields.odometer;
    const titleReading = byType("title_or_mso").find((d) => d.fields.odometer !== undefined)?.fields.odometer;
    if (reading !== undefined && titleReading !== undefined && reading < titleReading) {
      add("odometer_decreasing", "blocker", `Odometer decreased (${titleReading} on title, ${reading} on disclosure)`,
        "Correct the reading or complete a discrepancy statement.", "odometer_disclosure");
    }
    if (reading !== undefined) {
      const other = deal.docs.find((d) => d.type !== "odometer_disclosure" && d.type !== "title_or_mso" && d.fields.odometer !== undefined && d.fields.odometer !== reading);
      if (other) {
        add("odometer_mismatch", "blocker", `Odometer on ${LABEL[other.type]} (${other.fields.odometer}) differs from disclosure (${reading})`,
          "Reconcile the mileage across documents.", other.type);
      }
    }
  }

  // Signatures
  const noSeller = deal.docs.filter((d) => SELLER_SIGN_DOCS.includes(d.type) && d.fields.sellerSigned !== true);
  if (noSeller.length > 0) {
    add("signature_seller_missing", "blocker", `Seller signature missing on ${noSeller.map((d) => LABEL[d.type]).join(", ")}`,
      "Get the seller to sign the document(s).", noSeller[0].type);
  }
  const noBuyer = deal.docs.filter((d) => BUYER_SIGN_DOCS.includes(d.type) && d.fields.buyerSigned !== true);
  if (noBuyer.length > 0) {
    add("signature_buyer_missing", "blocker", `Buyer signature missing on ${noBuyer.map((d) => LABEL[d.type]).join(", ")}`,
      "Get the buyer to sign the document(s).", noBuyer[0].type);
  }

  // Notary
  if (profile.notaryRequired) {
    const un = deal.docs.filter((d) => NOTARY_DOCS.includes(d.type) && d.fields.notarized !== true);
    if (un.length > 0) {
      add("notary_missing", "blocker", `${profile.name} requires notarization: ${un.map((d) => LABEL[d.type]).join(", ")} not notarized`,
        "Have the document(s) notarized (illustrative rule; verify with the state DMV).", un[0].type);
    }
  }

  // Form version
  const oldForm = deal.docs.filter((d) => VERSIONED_DOCS.includes(d.type) && d.fields.formVersion !== undefined && d.fields.formVersion !== profile.currentFormVersion);
  if (oldForm.length > 0) {
    add("wrong_form_version", "blocker", `${LABEL[oldForm[0].type]} uses outdated form ${oldForm[0].fields.formVersion} (current: ${profile.currentFormVersion})`,
      `Redo the paperwork on form ${profile.currentFormVersion}.`, oldForm[0].type);
  }

  // Names
  const buyerN = norm(deal.buyer);
  const sellerN = norm(deal.seller);
  const badBuyer = deal.docs.filter((d) => d.fields.buyerName && norm(d.fields.buyerName) !== buyerN);
  if (badBuyer.length > 0) {
    add("buyer_name_mismatch", "blocker", `Buyer name on ${LABEL[badBuyer[0].type]} ("${badBuyer[0].fields.buyerName}") differs from deal ("${deal.buyer}")`,
      "Correct the buyer name so it matches across all documents.", badBuyer[0].type);
  }
  const badSeller = deal.docs.filter((d) => d.fields.sellerName && norm(d.fields.sellerName) !== sellerN);
  if (badSeller.length > 0) {
    add("seller_name_mismatch", "blocker", `Seller name on ${LABEL[badSeller[0].type]} ("${badSeller[0].fields.sellerName}") differs from deal ("${deal.seller}")`,
      "Correct the seller name so it matches across all documents.", badSeller[0].type);
  }

  // Date order
  const badDate = deal.docs.filter((d) => d.fields.dateSigned && (d.fields.dateSigned < deal.soldAt || daysSince(d.fields.dateSigned, nowIso) < 0));
  if (badDate.length > 0) {
    const d = badDate[0];
    add("date_order", "blocker", `${LABEL[d.type]} is dated ${d.fields.dateSigned}, ${d.fields.dateSigned! < deal.soldAt ? `before the sale date ${deal.soldAt}` : "in the future"}`,
      "Correct the signing date or re-execute the document.", d.type);
  }

  // Deadline
  if (deal.stage !== "filed" && deal.stage !== "cleared") {
    const elapsed = daysSince(deal.soldAt, nowIso);
    const remaining = profile.daysToApply - elapsed;
    if (remaining < 0) {
      add("apply_overdue", "blocker", `Title application is ${-remaining} day(s) overdue (${profile.daysToApply}-day window)`,
        "File immediately; late fees or penalties may apply (illustrative; verify with the state DMV).");
    } else if (remaining <= DEADLINE_WARN_DAYS) {
      add("apply_deadline_near", "warning", `Title application due in ${remaining} day(s)`,
        "Finish the paperwork and file before the deadline.");
    }
  }

  // Low confidence extraction
  for (const d of deal.docs) {
    if (d.confidence < LOW_CONFIDENCE) {
      add(`low_confidence_${d.id}`, "warning", `${LABEL[d.type]} (${d.fileName}) was read with low confidence (${Math.round(d.confidence * 100)}%)`,
        "Have an admin review the extracted fields or re-scan the document.", d.type);
    }
  }

  return out;
}

export function deriveStage(deal: Deal): DealStage {
  if (deal.stage === "filed" || deal.stage === "rejected" || deal.stage === "cleared") return deal.stage;
  const blockers = deal.issues.filter((i) => i.severity === "blocker" && !i.resolved).length;
  return blockers > 0 ? "needs_fixes" : "ready";
}