import { cn } from "@/lib/utils";
import { forwardRef, type SelectHTMLAttributes } from "react";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <div className="relative inline-block w-full">
        <select
          ref={ref}
          className={cn(
            "h-12 w-full appearance-none rounded-full border border-[#DED8CF] bg-white/60 pl-5 pr-10 text-sm text-[#2C2C24] outline-none cursor-pointer transition-all duration-200",
            "focus-visible:border-[#5D7052] focus-visible:ring-2 focus-visible:ring-[#5D7052]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FDFCF8]",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <svg
          aria-hidden
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#5D7052]"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    );
  },
);
