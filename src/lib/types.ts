// FROZEN CONTRACT — do not change without the lead. All agents import from "@/lib/types".
export type StateCode = "CA" | "TX" | "FL" | "GA" | "NC" | "OH" | "PA" | "AZ";
export type DocType =
  | "bill_of_sale" | "title_or_mso" | "odometer_disclosure" | "power_of_attorney"
  | "lien_release" | "buyers_order" | "buyer_id" | "insurance_proof"
  | "application_for_title" | "tax_form";
export type Severity = "blocker" | "warning" | "info";
export type DealStage = "intake" | "needs_fixes" | "ready" | "filed" | "rejected" | "cleared";

export interface DocFields {           // simulated extraction result for one uploaded doc
  vin?: string; sellerName?: string; buyerName?: string;
  odometer?: number; price?: number; dateSigned?: string; // ISO yyyy-mm-dd
  sellerSigned?: boolean; buyerSigned?: boolean; notarized?: boolean;
  formVersion?: string; state?: StateCode;
}
export interface DealDoc {
  id: string; type: DocType; fileName: string; uploadedAt: string;
  fields: DocFields; confidence: number; // 0..1; <0.75 goes to admin review queue
}
export interface Deal {
  id: string; dealerId: string; stock: string;
  vin: string; year: number; make: string; model: string;
  state: StateCode; soldAt: string;      // ISO date
  buyer: string; seller: string; price: number;
  tradeIn: boolean; hasLien: boolean; lender?: string;
  stage: DealStage; docs: DealDoc[]; issues: Issue[];
  events: DealEvent[]; assignee?: string; notes: string[];
  filing?: Filing; shareToken: string;
}
export interface Issue {
  id: string; ruleId: string; severity: Severity; title: string;
  fix: string; docType?: DocType; resolved: boolean;
}
export interface DealEvent { at: string; kind: string; message: string; actor: "system" | "dealer" | "dmv" | "agent"; }
export interface Filing {
  channel: "e-file" | "paper"; submittedAt: string;
  status: "submitted" | "rejected" | "cleared";
  rejection?: Rejection; attempts: number;
}
export interface Rejection { code: RejectionCode; message: string; at: string; }
export type RejectionCode = "MISSING_SIGNATURE" | "ODOMETER_MISMATCH" | "WRONG_FORM_VERSION" | "LIEN_NOT_RELEASED" | "NAME_MISMATCH" | "FEE_SHORT" | "VIN_MISMATCH";
export interface StateRule {
  id: string; state: StateCode | "GEN"; title: string; severity: Severity;
  sourceUrl: string; lastVerified: string; confidence: "high" | "medium" | "low";
  note: string;
}
export interface StateProfile {
  state: StateCode; name: string; daysToApply: number; // dealer must apply within N days (illustrative, see rule note)
  eTitle: boolean; notaryRequired: boolean; odometerExemptYears: number;
  requiredDocs: DocType[]; fee: number; currentFormVersion: string;
  rules: StateRule[];
}
export interface Notification { id: string; dealId?: string; at: string; channel: "in_app" | "email"; subject: string; body: string; read: boolean; }
export interface Store { deals: Deal[]; notifications: Notification[]; now: string; // ISO "today" for the demo
  credits: number; }

// ---- Function contracts (owner in brackets) ----
// [engine] src/lib/engine/index.ts
//   validateVin(vin: string): boolean
//   getProfile(state: StateCode): StateProfile        // src/lib/engine/states.ts, exports STATES: StateProfile[]
//   checkDeal(deal: Deal, nowIso: string): Issue[]    // deterministic; stable Issue.id = `${deal.id}:${ruleId}`
//   deriveStage(deal: Deal): DealStage                // blockers>0 => needs_fixes; else ready (unless filed/rejected/cleared)
//   daysSince(iso: string, nowIso: string): number
// [sim] src/lib/sim/index.ts
//   seedStore(): Store                                // dealership "Sunrise Auto", 25 deals across all 8 states & all stages, fixed "now" 2026-09-28
//   fileDeal(store: Store, dealId: string): Store     // requires 0 blockers; sets filing, stage filed
//   simulateDmvDay(store: Store): Store               // deterministic: filed deals clear or get rejected by seeded hash
//   chaseRejection(store: Store, dealId: string): Store // classify code -> event with fix -> auto-fix docs -> resubmit; escalate after 3 attempts
//   addDoc(store, dealId, DealDoc): Store; extractFromFile(fileName: string, type: DocType, deal: Deal): DealDoc  // simulated OCR
//   requestFix(store, dealId, issueId): Store         // adds notification (email outbox)
//   costOfDelay(deal: Deal, nowIso: string): {days:number; floorplanInterest:number; fundingHeld:boolean}
//   pricePerTitle(volumeThisMonth: number): number    // 99 for <10, 79 for 10-49, 49 for 50+
// [ui] src/lib/store-context.tsx: <StoreProvider>, useStore(): {store, dispatch helpers wrapping sim fns, reset}, persists to localStorage key "titledesk.v1"
