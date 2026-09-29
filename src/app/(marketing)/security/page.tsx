import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";

export const metadata: Metadata = { title: "Security and responsibility", description: "What TitleDesk logs, what it does not store, and where dealer responsibility remains." };

const items = [
  { t: "Audit log", p: "Checks, edits, fix requests and filing attempts are recorded with a timestamp and an actor (system, dealer, DMV or agent)." },
  { t: "No DMV credentials stored", p: "The design does not store your DMV portal logins. Filing steps that would need them are done by the dealer or a licensed third party." },
  { t: "Human in the loop", p: "Low-confidence document reads go to a review queue. Repeated rejections are escalated to a person rather than retried forever." },
  { t: "Data handling posture", p: "Deal jackets contain personal and financial information, so we treat them like nonpublic personal information. We aim to align with the FTC Safeguards Rule’s expectations for dealers under GLBA (access controls, encryption, vendor oversight, incident response). This is a stated posture, not a certification, and no audit or attestation is claimed." },
  { t: "This demo", p: "The demo uses simulated data and stores its state in your browser. Do not upload real customer documents to it." },
];

export default function Security() {
  return (
    <Section eyebrow="Security" title="What we do, and what stays with you." intro="Honest limits matter more than big claims.">
      <div className="grid gap-5 md:grid-cols-2">
        {items.map((i) => <Card key={i.t}><h2 className="font-display text-lg font-bold">{i.t}</h2><p className="mt-2 text-muted">{i.p}</p></Card>)}
      </div>
      <Card className="mt-6 border-2 border-accent">
        <h2 className="font-display text-lg font-bold">Disclaimers</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-muted">
          <li>The dealer remains responsible for the accuracy, completeness and timeliness of every filing and for compliance with state and federal law.</li>
          <li>TitleDesk is not a licensed title agent, attorney or government agency, unless a specific service says otherwise in writing.</li>
          <li>State rules shown are illustrative and may be out of date. Verify with the state DMV.</li>
          <li>Nothing here is legal advice.</li>
        </ul>
      </Card>
    </Section>
  );
}
