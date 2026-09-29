function toUtcDay(iso: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return NaN;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86400000;
}

/** Whole calendar days from `iso` to `nowIso` (negative if `iso` is in the future). Pure; no clock access. */
export function daysSince(iso: string, nowIso: string): number {
  return Math.round(toUtcDay(nowIso) - toUtcDay(iso));
}