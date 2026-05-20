import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

const cardShapes = [
  "rounded-[2rem]",
  "rounded-tl-[4rem] rounded-tr-[2rem] rounded-br-[2rem] rounded-bl-[2rem]",
  "rounded-tr-[5rem] rounded-tl-[2rem] rounded-br-[2rem] rounded-bl-[2rem]",
  "rounded-br-[4rem] rounded-tl-[2rem] rounded-tr-[2rem] rounded-bl-[2rem]",
  "rounded-bl-[5rem] rounded-tl-[2rem] rounded-tr-[2rem] rounded-br-[2rem]",
  "rounded-[3rem_3rem_1.5rem_3rem]",
];

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  shapeIndex?: number;
  lift?: boolean;
  tone?: "default" | "stone" | "sand";
}

const tones = {
  default: "bg-[#FEFEFA]",
  stone: "bg-[#F0EBE5]",
  sand: "bg-[#E6DCCD]",
};

export function Card({
  className,
  shapeIndex = 0,
  lift = false,
  tone = "default",
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "border border-[#DED8CF]/60 p-6 md:p-8 shadow-soft transition-all duration-300 ease-organic",
        tones[tone],
        cardShapes[((shapeIndex % cardShapes.length) + cardShapes.length) % cardShapes.length],
        lift && "hover:-translate-y-1 hover:shadow-lift",
        className,
      )}
      {...props}
    />
  );
}
