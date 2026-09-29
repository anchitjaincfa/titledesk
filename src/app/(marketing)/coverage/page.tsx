import type { Metadata } from "next";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { STATE_LIST } from "@/components/marketing/data";

export const metadata: Metadata = { title: "State coverage", description: "The eight states in the TitleDesk demo: CA, TX, FL, GA, NC, OH, PA and AZ." };

export default function Coverage() {
  return (
    <Section eyebrow="Coverage" title="Eight states, each with its own rule set." intro="Every rule in the product carries a source link, a last-verified date and a confidence level. Treat this page as orientation, and confirm requirements with the state DMV before relying on them.">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {STATE_LIST.map((s) => (
          <Card key={s.code}>
            <p className="font-mono text-sm text-brand">{s.code}</p>
            <h2 className="font-display text-xl font-bold">{s.name}</h2>
            <p className="mt-3 text-sm text-muted">Checks: required documents, notary, odometer, form version, lien, fee.</p>
            <Badge tone="warn" className="mt-4">E-title status: illustrative — verify with the state DMV</Badge>
          </Card>
        ))}
      </div>
      <p className="mt-8 max-w-2xl text-muted">Need another state? Tell us; new states are added by writing a profile and its rules, each with sources.</p>
    </Section>
  );
}
