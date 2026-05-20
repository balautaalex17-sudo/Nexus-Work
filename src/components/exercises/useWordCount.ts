import { useMemo } from "react";

export type WordCountTone = "under" | "in_range" | "over" | "way_over";

export interface WordCountState {
  words: number;
  tone: WordCountTone;
  inRange: boolean;
  underMin: boolean;
  overMax: boolean;
  ratio: number;
}

export function useWordCount(text: string, range: [number, number]): WordCountState {
  return useMemo(() => {
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const [min, max] = range;

    const inRange = words >= min && words <= max;
    const underMin = words < min;
    const overMax = words > max;
    const ratio = max > 0 ? words / max : 0;

    let tone: WordCountTone = "in_range";
    if (underMin) tone = "under";
    else if (overMax && words <= Math.round(max * 1.15)) tone = "over";
    else if (overMax) tone = "way_over";

    return { words, tone, inRange, underMin, overMax, ratio };
  }, [text, range]);
}

export function wordCountClasses(tone: WordCountTone): string {
  switch (tone) {
    case "under":
      return "bg-[#E6DCCD] text-[#4A4A40]";
    case "in_range":
      return "bg-[#5D7052]/15 text-[#5D7052]";
    case "over":
      return "bg-[#C18C5D]/20 text-[#9A6730]";
    case "way_over":
      return "bg-[#A85448]/15 text-[#A85448]";
  }
}
