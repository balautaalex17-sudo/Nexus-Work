import { cn } from "@/lib/utils";

const blobShapes = [
  "60% 40% 30% 70% / 60% 30% 70% 40%",
  "30% 70% 70% 30% / 30% 30% 70% 70%",
  "50% 50% 20% 80% / 25% 80% 20% 75%",
  "40% 60% 70% 30% / 40% 50% 60% 50%",
  "70% 30% 50% 50% / 50% 70% 30% 50%",
  "80% 20% 40% 60% / 50% 60% 40% 50%",
];

export interface Blob {
  shape?: number;
  color: string;
  size: number;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  opacity?: number;
}

interface BlobFieldProps {
  blobs: Blob[];
  className?: string;
}

export function BlobField({ blobs, className }: BlobFieldProps) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)} aria-hidden>
      {blobs.map((b, i) => (
        <div
          key={i}
          className="absolute blur-3xl"
          style={{
            width: b.size,
            height: b.size,
            top: b.top,
            left: b.left,
            right: b.right,
            bottom: b.bottom,
            background: b.color,
            opacity: b.opacity ?? 0.35,
            borderRadius: blobShapes[(b.shape ?? i) % blobShapes.length],
          }}
        />
      ))}
    </div>
  );
}
