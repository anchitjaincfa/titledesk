import { describe, expect, it } from "vitest";
import { STATES, checkDeal, daysSince, deriveStage, getProfile, validateVin } from "./index";
import type { Deal, DealDoc, DocType, StateCode } from "../types";

const VIN = "1M8GDM9AXKP042788";
const NOW = "2026-09-28";

function doc(type: DocType, state: StateCode, over: Partial<DealDoc["fields"]> = {}, confidence = 0.95): DealDoc {
  const p = getProfile(state);
  return {
    id: `d-${type}`, type, fileName: `${type}.pdf`, uploadedAt: "2026-09-21", confidence,
    fields: {
      vin: VIN, sellerName: "Sunrise Auto", buyerName: "Jane Q. Doe", price: 12000, dateSigned: "2026-09-20",
      sellerSigned: true, buyerSigned: true, notarized: p.notaryRequired,
      ...(type === "odometer_disclosure" ? { odometer: 50000 } : {}),
      ...(type === "title_or_mso" ? { odometer: 48000 } : {}),
      ...over,
    },
  };
}

function deal(state: StateCode = "TX", over: Partial<Deal> = {}): Deal {
  const p = getProfile(state);
  return {
    id: "D1", dealerId: "dl1", stock: "S1", vin: VIN, year: 2019, make: "Ford", model: "F-150",
    state, soldAt: "2026-09-20", buyer: "Jane Q. Doe", seller: "Sunrise Auto", price: 12000,
    tradeIn: false, hasLien: false, stage: "intake", docs: p.requiredDocs.map((t) => doc(t, state)),
    issues: [], events: [], notes: [], shareToken: "tok", ...over,
  };
}

const ids = (d: Deal, now = NOW) => checkDeal(d, now).map((i) => i.ruleId);

describe("validateVin", () => {
  it("accepts known valid VINs", () => {
    expect(validateVin("1M8GDM9AXKP042788")).toBe(true);
    expect(validateVin("11111111111111111")).toBe(true);
  });
  it("accepts lowercase", () => expect(validateVin("1m8gdm9axkp042788")).toBe(true));
  it("rejects bad check digit", () => expect(validateVin("1M8GDM9A1KP042788")).toBe(false));
  it("rejects I, O, Q", () => {
    expect(validateVin("1M8GDM9AXKP04278I")).toBe(false);
    expect(validateVin("1M8GDM9AXKP04278O")).toBe(false);
    expect(validateVin("1M8GDM9AXKP04278Q")).toBe(false);
  });
  it("rejects wrong length and empty", () => {
    expect(validateVin("1M8GDM9AXKP04278")).toBe(false);
    expect(validateVin("")).toBe(false);
  });
});

describe("daysSince", () => {
  it("counts days", () => expect(daysSince("2026-09-20", "2026-09-28")).toBe(8));
  it("is zero same day", () => expect(daysSince("2026-09-28", "2026-09-28")).toBe(0));
  it("is negative for future", () => expect(daysSince("2026-10-01", "2026-09-28")).toBe(-3));
  it("crosses month and leap boundaries", () => {
    expect(daysSince("2028-02-27", "2028-03-01")).toBe(3);
    expect(daysSince("2026-08-31", "2026-09-01")).toBe(1);
  });
  it("ignores time portion", () => expect(daysSince("2026-09-20T23:00:00Z", "2026-09-28T01:00:00Z")).toBe(8));
});

describe("state profiles", () => {
  it("has 8 states with 4+ rules, sources and disclaimers", () => {
    expect(STATES.map((s) => s.state).sort()).toEqual(["AZ", "CA", "FL", "GA", "NC", "OH", "PA", "TX"]);
    for (const s of STATES) {
      expect(s.rules.length).toBeGreaterThanOrEqual(4);
      expect(getProfile(s.state)).toBe(s);
      for (const r of s.rules) {
        expect(r.sourceUrl).toMatch(/^https:\/\//);
        expect(r.lastVerified).toBe("2026-09-28");
        expect(["medium", "low"]).toContain(r.confidence);
        expect(r.note).toContain("verify with the state DMV");
      }
    }
  });
});

describe("checkDeal", () => {
  it("clean deal has no blockers or warnings", () => {
    for (const s of STATES) {
      const issues = checkDeal(deal(s.state), NOW);
      expect(issues.filter((i) => i.severity !== "info"), s.state).toEqual([]);
    }
  });
  it("uses stable ids", () => {
    const d = deal("TX", { vin: "1M8GDM9A1KP042788" });
    const i = checkDeal(d, NOW).find((x) => x.ruleId === "vin_checksum")!;
    expect(i.id).toBe("D1:vin_checksum");
    expect(i.resolved).toBe(false);
    expect(checkDeal(d, NOW)).toEqual(checkDeal(d, NOW));
  });
  it("flags each missing required doc", () => {
    const d = deal("TX", { docs: [] });
    const r = ids(d);
    for (const t of getProfile("TX").requiredDocs) expect(r).toContain(`missing_doc_${t}`);
  });
  it("flags one missing doc only", () => {
    const d = deal("CA");
    d.docs = d.docs.filter((x) => x.type !== "insurance_proof");
    expect(ids(d)).toEqual(["missing_doc_insurance_proof"]);
  });
  it("flags lien without release, clears with it", () => {
    expect(ids(deal("TX", { hasLien: true, lender: "Bank" }))).toContain("lien_release_missing");
    const d = deal("TX", { hasLien: true });
    d.docs.push(doc("lien_release", "TX"));
    expect(ids(d)).not.toContain("lien_release_missing");
  });
  it("flags VIN checksum on the deal", () => {
    expect(ids(deal("TX", { vin: "1M8GDM9A1KP042788" }))).toContain("vin_checksum");
  });
  it("flags VIN mismatch between doc and deal", () => {
    const d = deal("TX");
    d.docs[0].fields.vin = "11111111111111111";
    expect(ids(d)).toContain("vin_mismatch");
  });
  it("flags missing odometer reading on disclosure", () => {
    const d = deal("TX");
    delete d.docs.find((x) => x.type === "odometer_disclosure")!.fields.odometer;
    expect(ids(d)).toContain("odometer_missing");
  });
  it("flags decreasing odometer", () => {
    const d = deal("TX");
    d.docs.find((x) => x.type === "odometer_disclosure")!.fields.odometer = 40000;
    expect(ids(d)).toContain("odometer_decreasing");
  });
  it("flags odometer mismatch across docs", () => {
    const d = deal("TX");
    d.docs.find((x) => x.type === "bill_of_sale")!.fields.odometer = 51234;
    expect(ids(d)).toContain("odometer_mismatch");
  });
  it("marks old vehicles odometer-exempt as info and skips odometer blockers", () => {
    const d = deal("TX", { year: 2000 });
    d.docs.find((x) => x.type === "odometer_disclosure")!.fields.odometer = 1;
    const issues = checkDeal(d, NOW);
    const ex = issues.find((i) => i.ruleId === "odometer_exempt")!;
    expect(ex.severity).toBe("info");
    expect(issues.map((i) => i.ruleId)).not.toContain("odometer_decreasing");
  });
  it("does not exempt recent vehicles", () => expect(ids(deal("TX"))).not.toContain("odometer_exempt"));
  it("flags seller and buyer signatures", () => {
    const d = deal("TX");
    d.docs.find((x) => x.type === "bill_of_sale")!.fields.sellerSigned = false;
    d.docs.find((x) => x.type === "application_for_title")!.fields.buyerSigned = undefined;
    const r = ids(d);
    expect(r).toContain("signature_seller_missing");
    expect(r).toContain("signature_buyer_missing");
  });
  it("requires notary only where the profile does", () => {
    const oh = deal("OH");
    oh.docs.find((x) => x.type === "bill_of_sale")!.fields.notarized = false;
    expect(ids(oh)).toContain("notary_missing");
    const tx = deal("TX");
    tx.docs.forEach((x) => (x.fields.notarized = false));
    expect(ids(tx)).not.toContain("notary_missing");
  });
  it("flags wrong form version", () => {
    const d = deal("TX");
    d.docs.find((x) => x.type === "application_for_title")!.fields.formVersion = "OLD-2019";
    expect(ids(d)).toContain("wrong_form_version");
    d.docs.find((x) => x.type === "application_for_title")!.fields.formVersion = getProfile("TX").currentFormVersion;
    expect(ids(d)).not.toContain("wrong_form_version");
  });
  it("flags buyer and seller name mismatch but tolerates punctuation/case", () => {
    const d = deal("TX");
    d.docs[0].fields.buyerName = "JANE Q DOE";
    expect(ids(d)).not.toContain("buyer_name_mismatch");
    d.docs[0].fields.buyerName = "John Smith";
    d.docs[1].fields.sellerName = "Other Motors";
    const r = ids(d);
    expect(r).toContain("buyer_name_mismatch");
    expect(r).toContain("seller_name_mismatch");
  });
  it("flags signed-before-sold and future dates", () => {
    const d = deal("TX");
    d.docs[0].fields.dateSigned = "2026-09-01";
    expect(ids(d)).toContain("date_order");
    const f = deal("TX");
    f.docs[0].fields.dateSigned = "2026-10-15";
    expect(ids(f)).toContain("date_order");
  });
  it("warns when deadline approaching", () => {
    const d = deal("TX", { soldAt: "2026-09-01" });
    d.docs.forEach((x) => (x.fields.dateSigned = "2026-09-02"));
    const i = checkDeal(d, NOW).find((x) => x.ruleId === "apply_deadline_near")!;
    expect(i.severity).toBe("warning");
  });
  it("blocks when overdue, and not when already filed", () => {
    const d = deal("AZ", { soldAt: "2026-09-01" });
    d.docs.forEach((x) => (x.fields.dateSigned = "2026-09-02"));
    expect(checkDeal(d, NOW).find((x) => x.ruleId === "apply_overdue")!.severity).toBe("blocker");
    expect(ids({ ...d, stage: "filed" })).not.toContain("apply_overdue");
  });
  it("warns on low-confidence extraction", () => {
    const d = deal("TX");
    d.docs[2].confidence = 0.6;
    const i = checkDeal(d, NOW).find((x) => x.ruleId.startsWith("low_confidence_"))!;
    expect(i.severity).toBe("warning");
    expect(i.id).toBe(`D1:low_confidence_${d.docs[2].id}`);
  });
});

describe("deriveStage", () => {
  const mk = (stage: Deal["stage"], sev: "blocker" | "warning", resolved = false): Deal => ({
    ...deal("TX", { stage }),
    issues: [{ id: "x", ruleId: "x", severity: sev, title: "t", fix: "f", resolved }],
  });
  it("blocker => needs_fixes", () => expect(deriveStage(mk("intake", "blocker"))).toBe("needs_fixes"));
  it("warning only => ready", () => expect(deriveStage(mk("intake", "warning"))).toBe("ready"));
  it("resolved blocker => ready", () => expect(deriveStage(mk("needs_fixes", "blocker", true))).toBe("ready"));
  it("keeps filed/rejected/cleared", () => {
    for (const s of ["filed", "rejected", "cleared"] as const) expect(deriveStage(mk(s, "blocker"))).toBe(s);
  });
});