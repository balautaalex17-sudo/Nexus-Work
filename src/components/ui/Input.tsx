import { cn } from "@/lib/utils";
import { forwardRef, type InputHTMLAttributes } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-12 w-full rounded-full border border-[#DED8CF] bg-white/60 px-5 text-sm text-[#2C2C24] outline-none transition-all duration-200",
          "placeholder:text-[#78786C]",
          "focus-visible:border-[#5D7052] focus-visible:ring-2 focus-visible:ring-[#5D7052]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FDFCF8]",
          className,
        )}
        {...props}
      />
    );
  },
);
