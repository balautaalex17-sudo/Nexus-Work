"use client";

import type { WritingExercise } from "@/lib/exercises/types";
import {
  WRITING_GENRE_LABEL,
  writingExamSpec,
  writingWordTarget,
  type WritingPartId,
} from "@/lib/exercises/writing";
import { cleanWritingText, writingBriefView } from "@/lib/exercises/writingBrief";

interface WritingBriefProps {
  exercise: WritingExercise;
}

export function WritingBrief({ exercise }: WritingBriefProps) {
  const part = exercise.type as WritingPartId;
  const spec = writingExamSpec(exercise.exam, part);
  const brief = writingBriefView(exercise);

  return (
    <article className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-[#E6DCCD] px-3 py-1 text-xs font-bold text-[#4A4A40]">
          {spec.taskTypes}
        </span>
        <span className="rounded-full bg-[#5D7052]/10 px-3 py-1 text-xs font-bold text-[#5D7052]">
          {writingWordTarget(exercise.exam, part)}
        </span>
        <span className="rounded-full bg-[#C18C5D]/15 px-3 py-1 text-xs font-bold text-[#9A6730]">
          {WRITING_GENRE_LABEL[exercise.genre]}
        </span>
      </div>

      {brief.taskContext ? (
        <p className="passage-text" style={{ fontSize: "1.05rem", lineHeight: 1.8 }}>
          {brief.taskContext}
        </p>
      ) : null}

      {brief.taskTitle ? (
        <div className="rounded-[1.5rem] border border-[#DED8CF]/70 bg-[#FDFCF8] p-5">
          <p className="eyebrow mb-2">Task title</p>
          <h2 className="font-display text-2xl text-[#2C2C24]">{brief.taskTitle}</h2>
        </div>
      ) : null}

      {brief.fallbackParagraphs.length > 0 ? (
        <div className="space-y-4">
          {brief.fallbackParagraphs.map((paragraph, index) => (
            <p
              key={`${paragraph}-${index}`}
              className="passage-text"
              style={{ fontSize: "1.05rem", lineHeight: 1.8, whiteSpace: "pre-wrap" }}
            >
              {paragraph}
            </p>
          ))}
        </div>
      ) : null}

      {exercise.sourceTexts && exercise.sourceTexts.length > 0 ? (
        <div className="space-y-4">
          <p className="eyebrow">Source texts</p>
          {exercise.sourceTexts.map((source) => (
            <div
              key={source.id}
              className="rounded-[1.5rem] border border-[#DED8CF]/60 bg-[#FDFCF8] p-5"
            >
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#C18C5D]">
                Text {source.id}
              </p>
              <p className="passage-text" style={{ fontSize: "1rem", lineHeight: 1.7 }}>
                {cleanWritingText(source.content)}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {brief.picturePrompts.length > 0 ? (
        <div className="space-y-3">
          <p className="eyebrow">Picture prompts</p>
          <div className="grid gap-3 md:grid-cols-3">
            {brief.picturePrompts.slice(0, 3).map((picture, index) => (
              <div
                key={`${picture}-${index}`}
                className="rounded-[1.5rem] border border-[#DED8CF]/70 bg-[#FDFCF8] p-4"
              >
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#C18C5D]">
                  Picture {index + 1}
                </p>
                <p className="text-sm leading-relaxed text-[#4A4A40]">{picture}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {brief.taskPoints.length > 0 ? (
        <div className="rounded-[1.5rem] border border-[#DED8CF]/70 bg-white/70 p-5">
          <p className="eyebrow mb-3">You must include</p>
          <ul className="space-y-2 text-sm leading-relaxed text-[#4A4A40]">
            {brief.taskPoints.map((point, index) => (
              <li key={`${point}-${index}`} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#5D7052]" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-[1.5rem] border border-[#5D7052]/20 bg-[#5D7052]/10 p-5">
        <p className="font-bold text-[#2C2C24]">
          {brief.finalInstruction || spec.promptInstruction}
        </p>
      </div>
    </article>
  );
}
