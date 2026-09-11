import { LabelPlateGrid } from "@/components/blocks/label-plate-grid";

const CARDS = [
  { title: "Gas Release System", body: "Breaking the curve for high-GLR horizontal wells." },
  { title: "ESP Chem Screen", body: "Precise, refillable downhole chemical treatment." },
  { title: "SRP Sand Lift", body: "Protects rod pumps from sand-related failures." },
  { title: "Explore categories", body: "Browse the full product line by category." },
];

export function LabelPlateDemo() {
  return <LabelPlateGrid items={CARDS} defaultOpenIndex={1} />;
}
