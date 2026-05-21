import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type MaxWidth = "md" | "lg" | "xl" | "2xl" | "3xl";
type Tone = "default" | "stone" | "sand" | "moss" | "clay";

interface SectionProps extends HTMLAttributes<HTMLElement> {
  maxWidth?: MaxWidth;
  tone?: Tone;
  spacing?: "sm" | "default" | "lg";
}

const widths: Record<MaxWidth, string> = {
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
  "2xl": "max-w-7xl",
  "3xl": "max-w-screen-2xl",
};

const tones: Record<Tone, string> = {
  default: "",
  stone: "bg-[#F0EBE5]/40",
  sand: "bg-[#E6DCCD]/40",
  moss: "bg-[#5D7052] text-[#F3F4F1]",
  clay: "bg-[#C18C5D] text-white",
};

const spacings = {
  sm: "py-6 md:py-8",
  default: "py-10 md:py-14",
  lg: "py-16 md:py-20",
};

export function Section({
  className,
  maxWidth = "2xl",
  tone = "default",
  spacing = "default",
  children,
  ...props
}: SectionProps) {
  return (
    <section
      className={cn("relative px-4 sm:px-6 lg:px-8", spacings[spacing], tones[tone], className)}
      {...props}
    >
      <div className={cn("mx-auto w-full", widths[maxWidth])}>{children}</div>
    </section>
  );
}
