import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://titledesk.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/pricing", "/how-it-works", "/coverage", "/security", "/roi"].map((p) => ({
    url: `${base}${p}`,
    changeFrequency: "monthly",
    priority: p === "" ? 1 : 0.7,
  }));
}
