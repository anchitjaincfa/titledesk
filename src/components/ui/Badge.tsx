import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "brand" | "ok" | "warn" | "danger";
const tones: Record<BadgeTone, string> = {
  neutral: "bg-line/60 text-ink",
  brand: "bg-brand-soft text-brand",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-ink",
  danger: "bg-danger-soft text-danger",
};

export function Badge({ children, tone = "neutral", className = "" }: { children: ReactNode; tone?: BadgeTone; className?: string }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]} ${className}`}>{children}</span>;
}
