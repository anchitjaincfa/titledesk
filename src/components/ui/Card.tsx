import type { ReactNode } from "react";

export function Card({ children, className = "", as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "article" | "li" }) {
  return <Tag className={`rounded-2xl border border-line bg-surface p-6 shadow-sm ${className}`}>{children}</Tag>;
}
