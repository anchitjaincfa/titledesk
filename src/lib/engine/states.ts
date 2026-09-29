import type { DocType, StateCode, StateProfile, StateRule } from "../types";

const VERIFIED = "2026-09-28";
const NOTE = "Illustrative demo value; verify with the state DMV before relying on it.";

interface Seed {
  state: StateCode;
  name: string;
  daysToApply: number;
  eTitle: boolean;
  notaryRequired: boolean;
  odometerExemptYears: number;
  extraDocs: DocType[];
  fee: number;
  currentFormVersion: string;
  url: string;
  titlingUrl: string;
  conf: "medium" | "low";
}

function rules(s: Seed): StateRule[] {
  const mk = (
    suffix: string,
    title: string,
    severity: StateRule["severity"],
    confidence: StateRule["confidence"],
    url: string,
  ): StateRule => ({
    id: `${s.state}-${suffix}`,
    state: s.state,
    title,
    severity,
    sourceUrl: url,
    lastVerified: VERIFIED,
    confidence,
    note: `${NOTE} (${s.name}, ${suffix})`,
  });
  return [
    mk("apply-window", `Dealer applies for title within ${s.daysToApply} days of sale`, "blocker", s.conf, s.titlingUrl),
    mk("odometer", `Odometer disclosure required unless vehicle is ${s.odometerExemptYears}+ model years old`, "blocker", s.conf, s.titlingUrl),
    mk(
      "notary",
      s.notaryRequired ? "Notarized signatures required on sale documents" : "Notarization not typically required on sale documents",
      s.notaryRequired ? "blocker" : "info",
      "low",
      s.url,
    ),
    mk("lien", "Lien release required when the vehicle has a prior lien", "blocker", s.conf, s.titlingUrl),
    mk("form-version", `Use current title application form (${s.currentFormVersion})`, "warning", "low", s.url),
  ];
}

const BASE: DocType[] = ["bill_of_sale", "title_or_mso", "odometer_disclosure", "application_for_title", "buyer_id"];

const SEEDS: Seed[] = [
  { state: "CA", name: "California", daysToApply: 30, eTitle: true, notaryRequired: false, odometerExemptYears: 20, extraDocs: ["insurance_proof"], fee: 27, currentFormVersion: "REG 343 (2026-01)", url: "https://www.dmv.ca.gov/", titlingUrl: "https://www.dmv.ca.gov/portal/vehicle-registration/", conf: "medium" },
  { state: "TX", name: "Texas", daysToApply: 30, eTitle: true, notaryRequired: false, odometerExemptYears: 20, extraDocs: ["tax_form"], fee: 33, currentFormVersion: "130-U (2026-02)", url: "https://www.txdmv.gov/", titlingUrl: "https://www.txdmv.gov/motorists/buying-or-selling-a-vehicle", conf: "medium" },
  { state: "FL", name: "Florida", daysToApply: 30, eTitle: true, notaryRequired: false, odometerExemptYears: 20, extraDocs: [], fee: 77, currentFormVersion: "82040 (2026-03)", url: "https://www.flhsmv.gov/", titlingUrl: "https://www.flhsmv.gov/motor-vehicles-tags-titles/", conf: "medium" },
  { state: "GA", name: "Georgia", daysToApply: 30, eTitle: false, notaryRequired: false, odometerExemptYears: 10, extraDocs: ["tax_form"], fee: 18, currentFormVersion: "MV-1 (2026-01)", url: "https://dor.georgia.gov/", titlingUrl: "https://dor.georgia.gov/motor-vehicles", conf: "low" },
  { state: "NC", name: "North Carolina", daysToApply: 28, eTitle: true, notaryRequired: false, odometerExemptYears: 20, extraDocs: ["insurance_proof"], fee: 56, currentFormVersion: "MVR-1 (2026-01)", url: "https://www.ncdot.gov/dmv/", titlingUrl: "https://www.ncdot.gov/dmv/title-registration/", conf: "medium" },
  { state: "OH", name: "Ohio", daysToApply: 30, eTitle: true, notaryRequired: true, odometerExemptYears: 20, extraDocs: [], fee: 15, currentFormVersion: "BMV 3774 (2026-01)", url: "https://www.bmv.ohio.gov/", titlingUrl: "https://www.bmv.ohio.gov/", conf: "medium" },
  { state: "PA", name: "Pennsylvania", daysToApply: 20, eTitle: true, notaryRequired: true, odometerExemptYears: 20, extraDocs: ["tax_form"], fee: 67, currentFormVersion: "MV-4ST (2026-02)", url: "https://www.dmv.pa.gov/", titlingUrl: "https://www.dmv.pa.gov/", conf: "low" },
  { state: "AZ", name: "Arizona", daysToApply: 15, eTitle: true, notaryRequired: false, odometerExemptYears: 20, extraDocs: ["insurance_proof"], fee: 4, currentFormVersion: "96-0236 (2026-01)", url: "https://azdot.gov/", titlingUrl: "https://azdot.gov/mvd", conf: "low" },
];

export const STATES: StateProfile[] = SEEDS.map((s) => ({
  state: s.state,
  name: s.name,
  daysToApply: s.daysToApply,
  eTitle: s.eTitle,
  notaryRequired: s.notaryRequired,
  odometerExemptYears: s.odometerExemptYears,
  requiredDocs: [...BASE, ...s.extraDocs],
  fee: s.fee,
  currentFormVersion: s.currentFormVersion,
  rules: rules(s),
}));

export function getProfile(state: StateCode): StateProfile {
  const p = STATES.find((x) => x.state === state);
  if (!p) throw new Error(`Unknown state: ${state}`);
  return p;
}