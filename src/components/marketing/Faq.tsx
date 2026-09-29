import { FAQS } from "./data";

export function Faq() {
  return (
    <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
      {FAQS.map((f) => (
        <details key={f.q} className="group p-5">
          <summary className="cursor-pointer list-none font-semibold">{f.q}</summary>
          <p className="mt-3 text-muted">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

export function FaqJsonLd() {
  const json = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />;
}
