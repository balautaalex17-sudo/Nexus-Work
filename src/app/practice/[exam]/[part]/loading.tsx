"use client";

import { useParams } from "next/navigation";
import { BlobField } from "@/components/ui/BlobField";
import { Card } from "@/components/ui/Card";

const EXAM_LABELS: Record<string, string> = {
  KET: "A2 Key",
  PET: "B1 Preliminary",
  FCE: "B2 First",
  CAE: "C1 Advanced",
  CPE: "C2 Proficiency",
};

export default function PracticeLoading() {
  const params = useParams<{ exam?: string; part?: string }>();
  const examLabel = params.exam ? EXAM_LABELS[params.exam] ?? params.exam : "Cambridge English";
  const partLabel = params.part?.replace("part", "Part ") ?? "Paper";

  return (
    <div className="relative px-4 sm:px-6 lg:px-8 pt-6 pb-20 overflow-hidden">
      <BlobField
        blobs={[
          { shape: 0, color: "#5D7052", size: 320, top: "-80px", right: "10%", opacity: 0.18 },
          { shape: 2, color: "#E6DCCD", size: 280, bottom: "-100px", left: "5%", opacity: 0.55 },
        ]}
      />
      <Card shapeIndex={1} className="mx-auto max-w-3xl text-center py-16">
        <p className="eyebrow mb-3">{examLabel}</p>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-[#2C2C24] mb-3">
          Preparing {partLabel}…
        </h1>
        <p className="text-[#78786C] mb-6">One moment while we put your paper together.</p>
        <div className="inline-flex items-center gap-2 text-[#5D7052]">
          <span className="h-2 w-2 rounded-full bg-[#5D7052] animate-pulse" style={{ animationDelay: "0ms" }} />
          <span className="h-2 w-2 rounded-full bg-[#5D7052] animate-pulse" style={{ animationDelay: "150ms" }} />
          <span className="h-2 w-2 rounded-full bg-[#5D7052] animate-pulse" style={{ animationDelay: "300ms" }} />
        </div>
      </Card>
    </div>
  );
}
