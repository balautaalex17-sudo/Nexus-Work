import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "outline" | "ghost";
type Size = "sm" | "default" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-sans font-bold leading-none whitespace-nowrap " +
  "transition-all duration-300 ease-organic " +
  "disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5D7052] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FDFCF8] " +
  "active:scale-[0.97]";

const sizes: Record<Size, string> = {
  sm: "h-10 px-6 text-sm",
  default: "h-12 px-8 text-sm",
  lg: "h-14 px-10 text-base",
};

const variants: Record<Variant, string> = {
  primary:
    "bg-[#5D7052] text-[#F3F4F1] shadow-soft hover:bg-[#486040] hover:scale-[1.04] hover:shadow-[0_6px_24px_-4px_rgba(93,112,82,0.3)]",
  outline:
    "bg-transparent text-[#C18C5D] border-2 border-[#C18C5D] hover:bg-[#C18C5D]/10 hover:scale-[1.04]",
  ghost:
    "bg-transparent text-[#5D7052] hover:bg-[#5D7052]/10",
};

export function Button({ className, variant = "primary", size = "default", ...props }: ButtonProps) {
  return (
    <button
      className={cn(base, sizes[size], variants[variant], className)}
      {...props}
    />
  );
}
