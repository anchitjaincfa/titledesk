import type { Deal, DealDoc, DocFields, DocType } from "../types";
import { getProfile } from "../engine";

export const DEALER_ID = "sunrise";
export const DEALER_NAME = "Sunrise Auto";
export const NOW = "2026-09-28";

/** FNV-1a 32-bit. Deterministic seeded hash used everywhere instead of Math.random. */
export function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function addDays(iso: string, n: number): string {
  const p = iso.slice(0, 10).split("-");
  const t = Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2]) + n);
  return new Date(t).toISOString().slice(0, 10);
}

const VIN_MAP: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
};
const VIN_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

/** ISO 3779 / FMVSS 115 check digit for a 17-char VIN (position 9 ignored). */
export function vinCheckDigit(vin17: string): string {
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const c = vin17.charAt(i);
    const v = c >= "0" && c <= "9" ? Number(c) : VIN_MAP[c] ?? 0;
    sum += v * (VIN_WEIGHTS[i] ?? 0);
  }
  const r = sum % 11;
  return r === 10 ? "X" : String(r);
}

const VIN_CHARS = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";
const VIN_YEARS = "ABCDEFGHJKLMNPRSTVWXY"; // 2010..2030

export function makeVin(wmi: string, year: number, seed: string): string {
  let vds = "";
  for (let i = 0; i < 5; i++) vds += VIN_CHARS.charAt(hash32(seed + ":v" + i) % VIN_CHARS.length);
  const yc = VIN_YEARS.charAt(Math.max(0, Math.min(20, year - 2010)));
  const plant = VIN_CHARS.charAt(hash32(seed + ":p") % 23);
  const serial = String(hash32(seed + ":s") % 1000000).padStart(6, "0");
  const raw = wmi + vds + "0" + yc + plant + serial;
  return raw.slice(0, 8) + vinCheckDigit(raw) + raw.slice(9);
}

export function fieldsFor(type: DocType, deal: Deal, odo: number): DocFields {
  const n = getProfile(deal.state).notaryRequired;
  const cur = getProfile(deal.state).currentFormVersion;
  const base: DocFields = { vin: deal.vin, state: deal.state, dateSigned: deal.soldAt };
  switch (type) {
    case "bill_of_sale":
      return { ...base, sellerName: deal.seller, buyerName: deal.buyer, odometer: odo, price: deal.price, sellerSigned: true, buyerSigned: true, notarized: n };
    case "title_or_mso":
      return { ...base, sellerName: deal.seller, odometer: odo, sellerSigned: true, notarized: n };
    case "odometer_disclosure":
      return { ...base, sellerName: deal.seller, buyerName: deal.buyer, odometer: odo, sellerSigned: true, buyerSigned: true, notarized: n };
    case "power_of_attorney":
      return { ...base, sellerName: deal.seller, buyerName: deal.buyer, sellerSigned: true, buyerSigned: true, notarized: n };
    case "lien_release":
      return { ...base, sellerSigned: true };
    case "buyers_order":
      return { ...base, sellerName: deal.seller, buyerName: deal.buyer, price: deal.price, sellerSigned: true, buyerSigned: true };
    case "buyer_id":
      return { state: deal.state, buyerName: deal.buyer, dateSigned: deal.soldAt };
    case "insurance_proof":
      return { ...base, buyerName: deal.buyer };
    case "application_for_title":
      return { ...base, buyerName: deal.buyer, sellerName: deal.seller, price: deal.price, formVersion: cur, buyerSigned: true, sellerSigned: true, notarized: n };
    case "tax_form":
      return { ...base, buyerName: deal.buyer, price: deal.price, buyerSigned: true, sellerSigned: true };
  }
}

export function makeDoc(type: DocType, deal: Deal, odo: number, uploadedAt: string, confidence: number): DealDoc {
  return {
    id: `${deal.id}-${type}`,
    type,
    fileName: `${type}_${deal.stock}.pdf`,
    uploadedAt,
    fields: fieldsFor(type, deal, odo),
    confidence,
  };
}

/** All docs a state requires (plus lien_release when the deal has a lien), fully consistent and signed. */
export function buildCleanDocs(deal: Deal, odo: number, uploadedAt: string): DealDoc[] {
  const req = getProfile(deal.state).requiredDocs.filter((t) => t !== "lien_release");
  const types: DocType[] = deal.hasLien ? [...req, "lien_release"] : req;
  return types.map((t) =>
    makeDoc(t, deal, odo, uploadedAt, Math.round((0.9 + (hash32(deal.id + t) % 9) / 100) * 100) / 100),
  );
}