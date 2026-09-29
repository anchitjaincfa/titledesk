import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";

export const metadata: Metadata = { title: "How it works", description: "Upload, rules check, file, chase: how TitleDesk takes a deal from paperwork to a cleared title." };

const detail = [
  { n: "01", t: "Upload", p: "Add the deal jacket: bill of sale, title or MSO, odometer disclosure, power of attorney, lien release, buyer’s order, ID, insurance proof, application for title and tax forms. Each document is read into fields (VIN, names, odometer, price, dates, signatures). Reads the system is unsure about (confidence under 75%) go to a human review queue." },
  { n: "02", t: "Rules check", p: "Extracted fields are compared against the state’s profile: required documents, days to apply, notary requirement, odometer exemption, fee, current form version. Findings come back as blockers, warnings or info, each with a specific fix. Fix requests can be sent to the buyer, seller or lender from the deal." },
  { n: "03", t: "File", p: "A deal with zero blockers is ready. Filing goes by e-file or paper depending on the state, and the attempt is logged with a timestamp." },
  { n: "04", t: "Chase", p: "If the DMV rejects, the reason is classified (missing signature, odometer mismatch, wrong form version, lien not released, name mismatch, fee short, VIN mismatch). The agent applies the fix it can, resubmits, and hands the deal to a person after three attempts." },
];

export default function HowItWorks() {
  return (
    <Section eyebrow="How it works" title="From deal jacket to cleared title." intro="The demo runs on simulated data so you can watch each stage without touching a real DMV.">
      <ol className="space-y-5">
        {detail.map((d) => (
          <Card as="li" key={d.n} className="grid gap-3 sm:grid-cols-[6rem_1fr]">
            <p className="font-mono text-3xl font-bold text-brand">{d.n}</p>
            <div><h2 className="font-display text-xl font-bold">{d.t}</h2><p className="mt-2 text-muted">{d.p}</p></div>
          </Card>
        ))}
      </ol>
      <div className="mt-10"><Button href="/app" size="lg">Open the demo</Button></div>
    </Section>
  );
}
