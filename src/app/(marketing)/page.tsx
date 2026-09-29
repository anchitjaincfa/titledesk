import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Faq, FaqJsonLd } from "@/components/marketing/Faq";
import { PricingTiers } from "@/components/marketing/PricingTiers";
import { FEATURES, STATE_LIST, STEPS } from "@/components/marketing/data";

export default function Home() {
  return (
    <>
      <FaqJsonLd />
      <section className="border-b border-line py-16 sm:py-28">
        <Container className="grid items-center gap-12 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <Badge tone="warn">Free pilot: your first 5 titles</Badge>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              The title desk that never lets a deal sit in DMV limbo.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted">
              Upload the paperwork. TitleDesk checks it against your state’s rules, flags what is missing, files it, and chases DMV rejections until the title clears.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/app" size="lg">Open the demo</Button>
              <Button href="/how-it-works" size="lg" variant="secondary">See how it works</Button>
            </div>
          </div>
          <Card className="font-mono text-sm">
            <p className="text-muted">Deal #2041 · 2019 Honda Civic · TX</p>
            <ul className="mt-4 space-y-3">
              <li className="flex gap-3"><Badge tone="danger">blocker</Badge><span>Odometer disclosure unsigned by seller</span></li>
              <li className="flex gap-3"><Badge tone="warn">warning</Badge><span>Title form version may be out of date</span></li>
              <li className="flex gap-3"><Badge tone="ok">ok</Badge><span>VIN matches on 4 of 4 documents</span></li>
            </ul>
            <p className="mt-4 text-xs text-muted">Simulated example from the demo.</p>
          </Card>
        </Container>
      </section>

      <Section eyebrow="The problem" title="The rejection arrives three weeks after the sale." tone="soft">
        <div className="grid gap-6 md:grid-cols-2">
          <p className="text-lg">
            The car is sold, the customer is driving it, and the paperwork went in. Then the DMV sends it back: a missing signature, an odometer that
            does not match, an old form version, a lien that was never released.
          </p>
          <p className="text-lg text-muted">
            Meanwhile the floorplan interest keeps running, funding may be held, and the buyer is calling about plates. Somebody has to find the
            problem, track down the signature, and resubmit, usually on top of a full day of selling cars. TitleDesk moves that catch to before you file, and handles the chasing after.
          </p>
        </div>
      </Section>

      <Section id="how" eyebrow="How it works" title="Four steps, no clerk required.">
        <ol className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <Card as="li" key={s.n}>
              <p className="font-mono text-sm text-brand">{s.n}</p>
              <h3 className="mt-2 font-display text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-muted">{s.body}</p>
            </Card>
          ))}
        </ol>
      </Section>

      <Section eyebrow="Features" title="Built for the back office of a small lot." tone="soft">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <Card key={f.title}>
              <h3 className="font-display text-lg font-bold">{f.title}</h3>
              <p className="mt-2 text-muted">{f.body}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section eyebrow="States" title="Eight states in the demo." intro="Rules are per state, with sources and last-verified dates. Always verify with the state DMV.">
        <div className="flex flex-wrap gap-3">
          {STATE_LIST.map((s) => <Badge key={s.code} tone="brand" className="px-4 py-2 text-base">{s.code} · {s.name}</Badge>)}
        </div>
        <Button href="/coverage" variant="secondary" className="mt-6">Coverage details</Button>
      </Section>

      <Section eyebrow="Pricing" title="Pay per title. Cheaper as you grow." tone="soft">
        <PricingTiers />
        <p className="mt-6 text-muted">The first 5 titles are free. <Link className="underline" href="/pricing">Full pricing and comparison</Link></p>
      </Section>

      <Section eyebrow="FAQ" title="Straight answers.">
        <Faq />
      </Section>

      <Section tone="dark">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <h2 className="max-w-xl font-display text-3xl font-bold sm:text-4xl">See a deal get flagged, filed and chased, in about two minutes.</h2>
          <Button href="/app" variant="accent" size="lg">Open the demo</Button>
        </div>
      </Section>
    </>
  );
}
