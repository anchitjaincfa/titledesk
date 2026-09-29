"use client";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { tierPrice } from "./data";

function Field({ label, value, onChange, suffix, hint, step = 1 }: { label: string; value: number; onChange: (n: number) => void; suffix?: string; hint?: string; step?: number }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <span className="mt-1 flex items-center rounded-xl border border-line bg-paper px-3">
        <input
          type="number" inputMode="decimal" min={0} step={step} value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
          className="w-full bg-transparent py-2.5 text-lg outline-none"
        />
        {suffix && <span className="text-muted">{suffix}</span>}
      </span>
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function RoiCalculator() {
  const [titles, setTitles] = useState(30);
  const [rate, setRate] = useState(15);
  const [days, setDays] = useState(21);
  const [balance, setBalance] = useState(18000);
  const [apr, setApr] = useState(8);
  const [avoid, setAvoid] = useState(50);

  const rejected = (titles * rate) / 100;
  const perDeal = (balance * (apr / 100) * days) / 365;
  const monthlyInterest = rejected * perDeal;
  const fee = titles * tierPrice(titles);
  const avoided = monthlyInterest * (avoid / 100);
  const net = avoided - fee;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <Card>
        <h2 className="font-display text-xl font-bold">Your numbers</h2>
        <p className="mt-1 text-sm text-muted">Every default below is a placeholder assumption, not a benchmark. Replace them with your own.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Titles per month" value={titles} onChange={setTitles} />
          <Field label="Share rejected or held" value={rate} onChange={setRate} suffix="%" hint="Your own rate" />
          <Field label="Days a rejected title sits" value={days} onChange={setDays} suffix="days" />
          <Field label="Floorplan balance per car" value={balance} onChange={setBalance} suffix="USD" step={500} />
          <Field label="Floorplan APR" value={apr} onChange={setApr} suffix="%" step={0.25} />
          <Field label="Delay you assume is avoided" value={avoid} onChange={setAvoid} suffix="%" hint="Catching errors before filing" />
        </div>
      </Card>
      <Card className="bg-brand! text-brand-ink!">
        <h2 className="font-display text-xl font-bold">Estimate</h2>
        <dl className="mt-5 space-y-4" aria-live="polite">
          <div><dt className="text-sm opacity-80">Titles delayed per month</dt><dd className="font-display text-3xl font-bold">{rejected.toFixed(1)}</dd></div>
          <div><dt className="text-sm opacity-80">Floorplan interest on delayed cars, per month</dt><dd className="font-display text-3xl font-bold">{usd(monthlyInterest)}</dd></div>
          <div><dt className="text-sm opacity-80">TitleDesk fee at {usd(tierPrice(titles))} per title</dt><dd className="font-display text-3xl font-bold">{usd(fee)}</dd></div>
          <div className="border-t border-brand-ink/30 pt-4"><dt className="text-sm opacity-80">Interest avoided minus fee, per month</dt><dd className="font-display text-4xl font-extrabold">{net >= 0 ? "" : "−"}{usd(Math.abs(net))}</dd></div>
        </dl>
        <p className="mt-5 text-xs opacity-80">
          Counts floorplan interest only. It ignores held dealer funding, customer goodwill, staff time and late-title penalties, and it will read
          negative if your rejection rate is low. A rough model, not a promise of savings.
        </p>
      </Card>
    </div>
  );
}
