import type { Metadata } from "next";
import { Section } from "@/components/ui/Section";
import { RoiCalculator } from "@/components/marketing/RoiCalculator";

export const metadata: Metadata = { title: "ROI calculator", description: "Estimate what DMV rejections cost your dealership in floorplan interest, using your own numbers." };

export default function Roi() {
  return (
    <Section eyebrow="ROI" title="What does a rejected title cost you?" intro="Titles per month × rejection rate × days delayed × floorplan interest. Enter your own figures.">
      <RoiCalculator />
    </Section>
  );
}
