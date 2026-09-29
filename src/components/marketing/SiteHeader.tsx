import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { NAV } from "./data";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight">
      <span aria-hidden className="grid h-7 w-7 place-items-center rounded-md bg-brand text-sm text-brand-ink">T</span>
      TitleDesk
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-6 text-sm font-medium md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-muted hover:text-ink">{n.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button href="/app" size="sm" className="hidden sm:inline-flex">Open the demo</Button>
          <details className="relative md:hidden">
            <summary className="cursor-pointer list-none rounded-full border border-line px-3.5 py-2 text-sm font-semibold">Menu</summary>
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-line bg-surface p-3 shadow-lg">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="block rounded-lg px-3 py-2 text-sm hover:bg-line/50">{n.label}</Link>
              ))}
              <Link href="/app" className="mt-2 block rounded-full bg-brand px-3 py-2 text-center text-sm font-semibold text-brand-ink">Open the demo</Link>
            </div>
          </details>
        </div>
      </Container>
    </header>
  );
}
