import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TIERS } from "./data";

export function PricingTiers() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {TIERS.map((t) => (
        <Card key={t.name} className={t.featured ? "border-2 border-brand" : ""}>
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-bold">{t.name}</h3>
            {t.featured && <Badge tone="brand">Common</Badge>}
          </div>
          <p className="mt-4 font-display text-5xl font-extrabold">${t.price}<span className="text-base font-medium text-muted"> / title</span></p>
          <p className="mt-2 font-semibold">{t.range}</p>
          <p className="mt-1 text-muted">{t.note}</p>
          <Button href="/app" variant={t.featured ? "primary" : "secondary"} className="mt-6 w-full">Try it free</Button>
        </Card>
      ))}
    </div>
  );
}
