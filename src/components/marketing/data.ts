import type { StateCode } from "@/lib/types";

export const NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/coverage", label: "States" },
  { href: "/pricing", label: "Pricing" },
  { href: "/roi", label: "ROI" },
  { href: "/security", label: "Security" },
];

export const TIERS = [
  { name: "Starter", price: 99, range: "Under 10 titles / month", note: "For low-volume lots." },
  { name: "Growth", price: 79, range: "10–49 titles / month", note: "Most independent dealers land here.", featured: true },
  { name: "Volume", price: 49, range: "50+ titles / month", note: "For high-volume stores." },
];

/** Mirror of the frozen pricing rule: 99 for <10, 79 for 10-49, 49 for 50+. */
export function tierPrice(volume: number): number {
  return volume < 10 ? 99 : volume < 50 ? 79 : 49;
}

export const STEPS = [
  { n: "01", title: "Upload the deal jacket", body: "Drop in the bill of sale, title or MSO, odometer disclosure, lien release and the rest. Photos and scans are fine." },
  { n: "02", title: "Rules check", body: "TitleDesk reads each document and checks it against the state’s requirements: signatures, odometer, form version, lien status, names and VIN." },
  { n: "03", title: "File", body: "When nothing blocks the deal, the package is filed by e-file or paper, depending on the state." },
  { n: "04", title: "Chase until cleared", body: "If the DMV rejects, the agent classifies the reason, fixes what it can, resubmits, and escalates to a person after three attempts." },
];

export const FEATURES = [
  { title: "State rule engine", body: "Required documents, notary and form-version checks per state, each with a source link and a last-verified date." },
  { title: "Blocker / warning / info", body: "Every issue is ranked, with a plain-language fix. You see what stops the deal and what merely deserves a look." },
  { title: "Rejection chasing", body: "Missing signature, odometer mismatch, wrong form version, lien not released: classified, fixed and resubmitted." },
  { title: "Cost of delay", body: "Each stuck deal shows days waiting and the floorplan interest accruing while it waits." },
  { title: "Fix requests", body: "One click sends the buyer, seller or lender a specific request instead of a vague “we need more paperwork”." },
  { title: "Audit log", body: "Every check, edit and filing attempt is timestamped, so you can see who or what did what." },
  { title: "Low-confidence review", body: "Documents the reader is unsure about go to a human review queue rather than being guessed at." },
  { title: "Shareable status", body: "A private link lets a buyer or lender see where a deal stands without logging in." },
];

export const STATE_LIST: { code: StateCode; name: string }[] = [
  { code: "CA", name: "California" }, { code: "TX", name: "Texas" }, { code: "FL", name: "Florida" }, { code: "GA", name: "Georgia" },
  { code: "NC", name: "North Carolina" }, { code: "OH", name: "Ohio" }, { code: "PA", name: "Pennsylvania" }, { code: "AZ", name: "Arizona" },
];

export const FAQS = [
  { q: "Is TitleDesk a licensed title agent?", a: "No. TitleDesk is software that checks and prepares paperwork. Your dealership remains responsible for the accuracy of what is filed and for compliance with state law. Where a service is ever provided by a licensed third party, we will say so explicitly." },
  { q: "What happens during the free pilot?", a: "Your first 5 titles are free. You see the flags, the filing and the rejection chasing on real paperwork before paying anything." },
  { q: "Which states are supported?", a: "The current demo covers California, Texas, Florida, Georgia, North Carolina, Ohio, Pennsylvania and Arizona. Rules carry a last-verified date; always confirm against the state DMV." },
  { q: "Do you store our DMV logins?", a: "No. The design does not store DMV credentials. See the security page for what is and is not in scope." },
  { q: "What if the agent gets it wrong?", a: "Low-confidence reads go to a review queue, filings stay auditable, and after three failed attempts a rejection is escalated to a person. Treat the output as a second set of eyes, not a substitute for your own sign-off." },
  { q: "How is pricing calculated?", a: "Per title, by your monthly volume: $99 under 10 titles, $79 for 10–49, $49 for 50 or more. No seat fees in this pricing." },
];
