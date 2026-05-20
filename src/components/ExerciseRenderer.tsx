"use client";

import { GappedText } from "@/components/exercises/GappedText";
import { KeyWordTransformation } from "@/components/exercises/KeyWordTransformation";
import { MultipleChoiceCloze } from "@/components/exercises/MultipleChoiceCloze";
import { MultipleMatching } from "@/components/exercises/MultipleMatching";
import { OpenCloze } from "@/components/exercises/OpenCloze";
import { ReadingMultipleChoice } from "@/components/exercises/ReadingMultipleChoice";
import { WordFormation } from "@/components/exercises/WordFormation";
import { Writing } from "@/components/exercises/Writing";
import type { ExerciseProps } from "@/components/exercises/shared";

export function ExerciseRenderer(props: ExerciseProps) {
  switch (props.exercise.type) {
    case "use_of_english_part1":
      return <MultipleChoiceCloze {...props} />;
    case "use_of_english_part2":
      return <OpenCloze {...props} />;
    case "use_of_english_part3":
      return <WordFormation {...props} />;
    case "use_of_english_part4":
      return <KeyWordTransformation {...props} />;
    case "reading_part5":
      return <ReadingMultipleChoice {...props} />;
    case "reading_part6":
      return <GappedText {...props} />;
    case "reading_part7":
      return <MultipleMatching {...props} />;
    case "writing_part1":
    case "writing_part2":
      return <Writing {...props} />;
    default:
      return <p>Unsupported exercise type.</p>;
  }
}
