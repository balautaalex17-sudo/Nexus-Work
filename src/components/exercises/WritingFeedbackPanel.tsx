"use client";

import { useState } from "react";
import type { WritingFeedback } from "@/lib/exercises/aiWritingFeedback";

const CRITERIA = [
  { key: "content", label: "Content", description: "Did the response answer the task?" },
  {
    key: "communicativeAchievement",
    label: "Communicative achievement",
    description: "Register, conventions, impact on the reader.",
  },
  { key: "organisation", label: "Organisation", description: "Cohesion, paragraphing, signposting." },
  { key: "language", label: "Language", description: "Range and accuracy of grammar and vocabulary." },
] as const;

type CriterionKey = (typeof CRITERIA)[number]["key"];

function bandTone(band: number) {
  if (band >= 4) return { fill: "bg-[#5D7052]", text: "text-[#5D7052]" };
  if (band >= 3) return { fill: "bg-[#C18C5D]", text: "text-[#9A6730]" };
  if (band >= 1) return { fill: "bg-[#A85448]/70", text: "text-[#A85448]" };
  return { fill: "bg-[#A85448]", text: "text-[#A85448]" };
}

interface WritingFeedbackPanelProps {
  feedback: WritingFeedback;
}

export function WritingFeedbackPanel({ feedback }: WritingFeedbackPanelProps) {
  const [openKey, setOpenKey] = useState<CriterionKey | null>(null);

  return (
    <div className="space-y-6">
      {!feedback.accepted ? (
        <div className="rounded-2xl border border-[#A85448]/30 bg-[#A85448]/10 px-5 py-4 text-sm font-semibold text-[#A85448]">
          The AI marker did not produce a verdict. Re-submit the paper to try again.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {CRITERIA.map((criterion) => {
          const band = feedback[criterion.key];
          const tone = bandTone(band);
          const filled = Math.max(0, Math.min(5, band));
          return (
            <div
              key={criterion.key}
              className="rounded-[2rem] border border-[#DED8CF]/60 bg-white/70 p-5 shadow-soft"
            >
              <div className="flex items-baseline justify-between gap-3 mb-2">
                <h3 className="font-display text-xl text-[#2C2C24]">{criterion.label}</h3>
                <span className={`font-display text-3xl font-bold ${tone.text}`}>
                  {band}
                  <span className="text-base text-[#DED8CF]"> /5</span>
                </span>
              </div>
              <p className="text-xs text-[#78786C] mb-4">{criterion.description}</p>
              <div className="flex h-3 gap-1.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <span
                    key={i}
                    className={`flex-1 rounded-full ${i < filled ? tone.fill : "bg-[#E6DCCD]"}`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-[2rem] border border-[#DED8CF]/60 bg-[#FDFCF8] p-6 shadow-soft">
        <p className="eyebrow mb-2">Overall</p>
        <p className="font-display text-lg text-[#2C2C24] leading-relaxed">{feedback.overall}</p>
      </div>

      <div className="space-y-3">
        {CRITERIA.map((criterion) => {
          const notes = feedback.notes[criterion.key];
          const isOpen = openKey === criterion.key;
          const tone = bandTone(feedback[criterion.key]);
          return (
            <details
              key={criterion.key}
              open={isOpen}
              onToggle={(event) =>
                setOpenKey(event.currentTarget.open ? criterion.key : null)
              }
              className="group rounded-[2rem] border border-[#DED8CF]/60 bg-white/70 px-5 py-4 shadow-soft"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-3 list-none">
                <div className="flex items-center gap-3">
                  <span className={`h-2.5 w-2.5 rounded-full ${tone.fill}`} aria-hidden />
                  <span className="font-display text-lg text-[#2C2C24]">{criterion.label}</span>
                  <span className="text-xs uppercase tracking-widest text-[#78786C] font-bold">
                    {notes.length} note{notes.length === 1 ? "" : "s"}
                  </span>
                </div>
                <span
                  className="text-[#5D7052] transition-transform duration-300 group-open:rotate-90"
                  aria-hidden
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </span>
              </summary>
              <ul className="mt-4 space-y-2 list-disc pl-6 marker:text-[#5D7052] text-sm text-[#4A4A40]">
                {notes.length === 0 ? (
                  <li className="list-none text-[#78786C]">No specific notes from the marker.</li>
                ) : (
                  notes.map((note, index) => <li key={`${criterion.key}-${index}`}>{note}</li>)
                )}
              </ul>
            </details>
          );
        })}
      </div>
    </div>
  );
}
