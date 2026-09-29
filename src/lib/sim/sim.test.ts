import { describe, it, expect } from "vitest";
import type { Deal, DealStage, Store } from "../types";
import { checkDeal, validateVin, STATES } from "../engine";
import {
  seedStore, fileDeal, simulateDmvDay, chaseRejection, addDoc, extractFromFile,
  requestFix, costOfDelay, pricePerTitle, detectDefect,
} from "./index";

const get = (s: Store, id: string): Deal => {
  const d = s.deals.find((x) => x.id === id);
  if (!d) throw new Error("no deal " + id);
  return d;
};
const blockers = (d: Deal) => d.issues.filter((i) => i.severity === "blocker" && !i.resolved);
const STAGES: DealStage[] = ["intake", "needs_fixes", "ready", "filed", "rejected", "cleared"];

describe("seedStore", () => {
  const s = seedStore();
  it("has 25 deals for Sunrise Auto at the fixed date", () => {
    expect(s.deals).toHaveLength(25);
    expect(s.now).toBe("2026-09-28");
    expect(s.deals.every((d) => d.dealerId === "sunrise" && d.seller === "Sunrise Auto")).toBe(true);
  });
  it("covers all 8 states", () => {
    expect(new Set(s.deals.map((d) => d.state)).size).toBe(8);
    expect(STATES.length).toBe(8);
  });
  it("covers all 6 stages", () => {
    const seen = new Set(s.deals.map((d) => d.stage));
    for (const st of STAGES) expect(seen.has(st)).toBe(true);
  });
  it("uses valid ISO 3779 VINs, unique ids/VINs/share tokens", () => {
    expect(s.deals.every((d) => validateVin(d.vin))).toBe(true);
    expect(new Set(s.deals.map((d) => d.id)).size).toBe(25);
    expect(new Set(s.deals.map((d) => d.vin)).size).toBe(25);
    expect(new Set(s.deals.map((d) => d.shareToken)).size).toBe(25);
  });
  it("is deterministic", () => {
    expect(seedStore()).toEqual(seedStore());
  });
  it("populates issues with checkDeal and events", () => {
    for (const d of s.deals) {
      expect(d.issues).toEqual(checkDeal(d, s.now));
      expect(d.events.length).toBeGreaterThan(0);
    }
  });
  it("has defective deals with blockers and clean ready deals without", () => {
    const nf = s.deals.filter((d) => d.stage === "needs_fixes");
    expect(nf.length).toBeGreaterThanOrEqual(5);
    expect(nf.every((d) => blockers(d).length > 0)).toBe(true);
    const ready = s.deals.filter((d) => d.stage === "ready");
    expect(ready.length).toBeGreaterThanOrEqual(3);
    expect(ready.every((d) => blockers(d).length === 0)).toBe(true);
  });
  it("includes trade-ins and liens", () => {
    expect(s.deals.filter((d) => d.tradeIn).length).toBeGreaterThanOrEqual(3);
    expect(s.deals.filter((d) => d.hasLien).length).toBeGreaterThanOrEqual(3);
  });
  it("rejected deals carry a code and message", () => {
    const rej = s.deals.filter((d) => d.stage === "rejected");
    expect(rej.length).toBeGreaterThan(0);
    for (const d of rej) {
      expect(d.filing?.rejection?.code).toBeTruthy();
      expect(d.filing?.rejection?.message.length).toBeGreaterThan(5);
      expect(detectDefect(d)).toBe(d.filing?.rejection?.code);
    }
  });
});

describe("fileDeal", () => {
  const s = seedStore();
  it("refuses a deal with blockers and adds a notification", () => {
    const out = fileDeal(s, "d-04");
    expect(get(out, "d-04")).toEqual(get(s, "d-04"));
    expect(out.notifications.length).toBe(s.notifications.length + 1);
  });
  it("files a ready deal and does not mutate the input", () => {
    const before = JSON.stringify(s);
    const out = fileDeal(s, "d-11");
    expect(get(out, "d-11").stage).toBe("filed");
    expect(get(out, "d-11").filing?.status).toBe("submitted");
    expect(get(out, "d-11").filing?.attempts).toBe(1);
    expect(JSON.stringify(s)).toBe(before);
  });
  it("ignores unknown deal ids", () => {
    expect(fileDeal(s, "nope")).toBe(s);
  });
});

describe("simulateDmvDay", () => {
  const s = seedStore();
  it("advances the day and resolves every filed deal", () => {
    const out = simulateDmvDay(s);
    expect(out.now).toBe("2026-09-29");
    expect(out.deals.filter((d) => d.stage === "filed")).toHaveLength(0);
  });
  it("is deterministic and rejections carry code + message", () => {
    const a = simulateDmvDay(s);
    const b = simulateDmvDay(s);
    expect(a).toEqual(b);
    for (const d of a.deals) {
      if (d.filing?.status === "rejected") {
        expect(d.filing.rejection?.code).toBeTruthy();
        expect(d.filing.rejection?.message).toBeTruthy();
      }
    }
  });
  it("clears a filed deal that has no defects and attempts > 1", () => {
    const s2: Store = { ...s, deals: s.deals.map((d) => (d.id === "d-16" && d.filing ? { ...d, filing: { ...d.filing, attempts: 2 } } : d)) };
    expect(get(simulateDmvDay(s2), "d-16").stage).toBe("cleared");
  });
});

describe("chaseRejection", () => {
  const s = seedStore();
  it("repairs an odometer mismatch and resubmits", () => {
    const out = chaseRejection(s, "d-20");
    const d = get(out, "d-20");
    expect(d.stage).toBe("filed");
    expect(d.filing?.attempts).toBe(2);
    expect(d.filing?.rejection).toBeUndefined();
    expect(d.events.filter((e) => e.actor === "agent").length).toBeGreaterThanOrEqual(2);
    expect(blockers(d)).toHaveLength(0);
  });
  it("attaches a missing lien release", () => {
    const d = get(chaseRejection(s, "d-21"), "d-21");
    expect(d.docs.some((x) => x.type === "lien_release")).toBe(true);
    expect(d.stage).toBe("filed");
  });
  it("fixes an outdated form version", () => {
    const d = get(chaseRejection(s, "d-22"), "d-22");
    expect(detectDefect(d)).toBeUndefined();
    expect(d.filing?.attempts).toBe(3);
  });
  it("escalates after 3 attempts", () => {
    const s3: Store = { ...s, deals: s.deals.map((d) => (d.id === "d-22" && d.filing ? { ...d, filing: { ...d.filing, attempts: 3 } } : d)) };
    const out = chaseRejection(s3, "d-22");
    expect(get(out, "d-22").stage).toBe("rejected");
    expect(get(out, "d-22").notes.some((n) => n.startsWith("ESCALATED"))).toBe(true);
    expect(out.notifications.length).toBe(s3.notifications.length + 1);
    expect(chaseRejection(out, "d-22")).toBe(out);
  });
  it("does nothing for a deal that is not rejected", () => {
    expect(chaseRejection(s, "d-11")).toBe(s);
  });
});

describe("docs, fixes and pricing", () => {
  const s = seedStore();
  it("addDoc replaces by type and refreshes issues and stage", () => {
    const bos = get(s, "d-04").docs.find((d) => d.type === "bill_of_sale")!;
    const out = addDoc(s, "d-04", { ...bos, fields: { ...bos.fields, sellerSigned: true } });
    const d = get(out, "d-04");
    expect(d.docs.filter((x) => x.type === "bill_of_sale")).toHaveLength(1);
    expect(blockers(d)).toHaveLength(0);
    expect(d.stage).toBe("ready");
  });
  it("extractFromFile simulates OCR with confidence", () => {
    const deal = get(s, "d-04");
    const ok = extractFromFile("buyer_id.jpg", "buyer_id", deal);
    expect(ok.fields.buyerName).toBe(deal.buyer);
    expect(ok.confidence).toBeGreaterThanOrEqual(0.75);
    expect(extractFromFile("blurry_scan.jpg", "buyer_id", deal).confidence).toBeLessThan(0.75);
    expect(extractFromFile("unsigned_bos.pdf", "bill_of_sale", deal).fields.sellerSigned).toBe(false);
    expect(extractFromFile("buyer_id.jpg", "buyer_id", deal)).toEqual(ok);
  });
  it("requestFix queues an email", () => {
    const issue = get(s, "d-04").issues.find((i) => i.severity === "blocker")!;
    const out = requestFix(s, "d-04", issue.id);
    const n = out.notifications[out.notifications.length - 1]!;
    expect(n.channel).toBe("email");
    expect(n.dealId).toBe("d-04");
    expect(requestFix(s, "d-04", "bogus")).toBe(s);
  });
  it("costOfDelay charges 9% APR after 3 days unless cleared", () => {
    const d = get(s, "d-04");
    const c = costOfDelay(d, s.now);
    expect(c.days).toBe(5);
    expect(c.fundingHeld).toBe(true);
    expect(c.floorplanInterest).toBeCloseTo((d.price * 0.09 / 365) * 5, 1);
    expect(costOfDelay(get(s, "d-23"), s.now).fundingHeld).toBe(false);
    expect(costOfDelay(get(s, "d-11"), s.now)).toEqual({ days: 2, floorplanInterest: 0, fundingHeld: false });
  });
  it("pricePerTitle tiers", () => {
    expect(pricePerTitle(0)).toBe(99);
    expect(pricePerTitle(9)).toBe(99);
    expect(pricePerTitle(10)).toBe(79);
    expect(pricePerTitle(49)).toBe(79);
    expect(pricePerTitle(50)).toBe(49);
  });
});

describe("golden path", () => {
  it("seed -> fix defective deal -> file -> DMV -> chase -> cleared", () => {
    let s = seedStore();
    expect(get(s, "d-04").stage).toBe("needs_fixes");
    const bos = get(s, "d-04").docs.find((d) => d.type === "bill_of_sale")!;
    s = addDoc(s, "d-04", { ...bos, fields: { ...bos.fields, sellerSigned: true } });
    expect(get(s, "d-04").stage).toBe("ready");
    s = fileDeal(s, "d-04");
    expect(get(s, "d-04").stage).toBe("filed");
    for (let i = 0; i < 4 && get(s, "d-04").stage !== "cleared"; i++) {
      s = simulateDmvDay(s);
      if (get(s, "d-04").stage === "rejected") s = chaseRejection(s, "d-04");
    }
    expect(get(s, "d-04").stage).toBe("cleared");
    expect(get(s, "d-04").filing?.status).toBe("cleared");
  });
});