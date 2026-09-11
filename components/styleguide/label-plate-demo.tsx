"use client";

import { useState } from "react";
import { LabelPlateCard } from "@/components/ui/label-plate-card";

const CARDS = [
  { title: "Gas Release System", body: "Breaking the curve for high-GLR horizontal wells." },
  { title: "ESP Chem Screen", body: "Precise, refillable downhole chemical treatment." },
  { title: "SRP Sand Lift", body: "Protects rod pumps from sand-related failures." },
  { title: "Explore categories", body: "Browse the full product line by category." },
];

export function LabelPlateDemo() {
  const [openIndex, setOpenIndex] = useState(1);

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {CARDS.map((card, i) => (
        <LabelPlateCard
          key={card.title}
          title={card.title}
          body={card.body}
          open={openIndex === i}
          onInteract={() => setOpenIndex(i)}
        />
      ))}
    </div>
  );
}
