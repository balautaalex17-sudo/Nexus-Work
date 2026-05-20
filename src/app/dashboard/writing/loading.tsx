import { BlobField } from "@/components/ui/BlobField";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";

export default function WritingLoading() {
  return (
    <Section maxWidth="2xl" spacing="sm" className="overflow-hidden">
      <BlobField
        blobs={[
          { shape: 0, color: "#5D7052", size: 360, top: "-120px", left: "-100px", opacity: 0.18 },
          { shape: 3, color: "#E6DCCD", size: 280, bottom: "-100px", right: "0", opacity: 0.5 },
        ]}
      />
      <Card shapeIndex={1} className="mx-auto max-w-3xl py-16 text-center">
        <p className="eyebrow mb-3">Writing feedback</p>
        <h1 className="mb-3 font-display text-3xl font-bold text-[#2C2C24] md:text-4xl">
          Loading...
        </h1>
        <p className="mb-6 text-[#78786C]">Opening your marked writing feedback.</p>
        <div className="inline-flex items-center gap-2 text-[#5D7052]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#5D7052]" />
          <span
            className="h-2 w-2 animate-pulse rounded-full bg-[#5D7052]"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="h-2 w-2 animate-pulse rounded-full bg-[#5D7052]"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </Card>
    </Section>
  );
}
