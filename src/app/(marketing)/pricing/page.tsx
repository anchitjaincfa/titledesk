import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { PricingTiers } from "@/components/marketing/PricingTiers";

export const metadata: Metadata = { title: "Pricing", description: "Per-title pricing: $99 under 10 a month, $79 for 10–49, $49 for 50+. First 5 titles free." };

const rows = [
  ["Cost", "Per title, by monthly volume", "Salary, taxes, benefits, software"],
  ["Coverage", "Every business day the agent runs", "Vacation, sick days, turnover"],
  ["Rule updates", "Rules carry source links and last-verified dates", "Depends on who trains whom"],
  ["Rejections", "Classified, fixed where possible, resubmitted", "Handled when someone notices"],
  ["Judgment calls", "Escalated to a person after 3 failed attempts", "Handled by the clerk directly"],
  ["Accountability", "Dealer stays responsible for filings", "Dealer stays responsible for filings"],
];

export default function Pricing() {
  return (
    <>
      <Section eyebrow="Pricing" title="Per title, not per seat." intro="Your first 5 titles are a free pilot. After that, the price per title falls as your monthly volume rises.">
        <PricingTiers />
        <p className="mt-6 text-muted">The price applies to titles processed in the month, based on that month’s volume.</p>
      </Section>
      <Section eyebrow="Compare" title="TitleDesk vs. hiring a title clerk" tone="soft">
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[34rem] text-left">
            <thead><tr className="border-b border-line"><th className="p-4" /><th className="p-4">TitleDesk</th><th className="p-4">Title clerk</th></tr></thead>
            <tbody>
              {rows.map(([a, b, c]) => (
                <tr key={a} className="border-b border-line last:border-0"><th className="p-4 font-semibold">{a}</th><td className="p-4">{b}</td><td className="p-4 text-muted">{c}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <Card className="mt-6">
          <h3 className="font-display text-lg font-bold">A breakeven you can check yourself</h3>
          <p className="mt-2 text-muted">
            Suppose a part-time clerk costs you $3,000 a month all-in. That is an illustrative figure, so use your own. At $99 a title, $3,000 covers
            about 30 titles. At $79, about 37. Below your own breakeven, per-title pricing is cheaper; above it, a clerk may be. TitleDesk can also sit
            alongside a clerk, who then handles the exceptions.
          </p>
        </Card>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button href="/app" size="lg">Start the free pilot</Button>
          <Button href="/roi" size="lg" variant="secondary">Run the ROI calculator</Button>
        </div>
      </Section>
    </>
  );
}
