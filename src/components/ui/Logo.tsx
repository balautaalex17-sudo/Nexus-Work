import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 40, className }: LogoProps) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-[#5D7052] text-[#F3F4F1] shadow-soft",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        width={Math.round(size * 0.55)}
        height={Math.round(size * 0.55)}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22c4-4 8-7 8-13a8 8 0 0 0-16 0c0 6 4 9 8 13z" />
        <path d="M12 22V8" opacity="0.6" />
      </svg>
    </span>
  );
}
