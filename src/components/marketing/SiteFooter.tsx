import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { NAV } from "./data";
import { Logo } from "./SiteHeader";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line py-12 text-sm text-muted">
      <Container className="grid gap-8 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-sm">An AI desk agent for title and registration paperwork at independent used-car dealerships.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-col gap-2">
          {NAV.map((n) => <Link key={n.href} href={n.href} className="hover:text-ink">{n.label}</Link>)}
          <Link href="/app" className="hover:text-ink">Open the demo</Link>
        </nav>
        <p>
          TitleDesk is software, not a licensed title agent, attorney or DMV. Dealers remain responsible for the accuracy and timeliness of every
          filing. State rules shown are illustrative and must be verified with the state DMV. This is a demo with simulated data.
        </p>
      </Container>
    </footer>
  );
}
