import type { ReactNode } from "react";
import { Container } from "./Container";

export function Section({
  children, id, eyebrow, title, intro, tone = "plain", className = "",
}: {
  children?: ReactNode; id?: string; eyebrow?: string; title?: string; intro?: string;
  tone?: "plain" | "soft" | "dark"; className?: string;
}) {
  const bg = tone === "soft" ? "bg-brand-soft/50" : tone === "dark" ? "bg-brand text-brand-ink" : "";
  return (
    <section id={id} className={`py-16 sm:py-24 ${bg} ${className}`}>
      <Container>
        {(eyebrow || title || intro) && (
          <header className="mb-10 max-w-2xl">
            {eyebrow && <p className="mb-3 font-mono text-xs font-medium uppercase tracking-widest opacity-80">{eyebrow}</p>}
            {title && <h2 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{title}</h2>}
            {intro && <p className="mt-4 text-lg opacity-85">{intro}</p>}
          </header>
        )}
        {children}
      </Container>
    </section>
  );
}
