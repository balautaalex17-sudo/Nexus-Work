# Handoff

Date: 2026-05-20  
Workspace: `C:\Users\cycla\Documents\Nexus Work`

## Current Status

The Writing Integration & Cambridge Alignment work is implemented and builds cleanly.

The local dev server is running on `http://localhost:3000/`.

Use `npm.cmd` instead of `npm` in PowerShell because this machine blocks `npm.ps1` through execution policy.

## What Changed

- Removed visible standalone Writing navigation from dashboard/practice shells.
- Removed the dashboard Writing portfolio section.
- Kept `/dashboard/writing/[id]` as an internal marked-writing feedback detail page.
- Made `/dashboard/writing` redirect to Completed Papers via `/dashboard/mistakes?mode=papers`.
- Added Cambridge-aligned writing specs for KET, PET, FCE, CAE, and CPE.
- Updated the Practice selector so writing labels change by level:
  - KET: Part 6 Guided writing, Part 7 Picture story.
  - PET: Part 1 Email, Part 2 Article or story.
  - FCE: Part 1 Essay, Part 2 Article/email/letter/report/review.
  - CAE: Part 1 Essay, Part 2 Email/letter/proposal/report/review.
  - CPE: Part 1 Source-based discursive essay, Part 2 Article/letter/report/review.
- Added structured writing brief fields on generated writing exercises:
  - `taskTitle`
  - `taskContext`
  - `taskPoints`
  - `finalInstruction`
  - `picturePrompts`
- Added a shared `WritingBrief` renderer that strips raw markdown tokens such as `**article**` and renders briefs as exam-style cards.
- Updated writing generation prompts and normalization so the model is pushed toward exam-shaped briefs instead of decorative markdown.
- Updated writing review pages to use the shared clean brief renderer instead of raw prompt/source rendering.
- Updated Completed Papers and Mistakes displays to route writing attempts to internal feedback pages.
- Updated writing mistakes to use level-specific part names where possible.
- Restarted the dev server after stale watcher errors from the file delete/re-add during editing.

## Key Files

- `src/lib/exercises/writing.ts`
  - Added `WRITING_EXAM_SPECS`.
  - Added helpers: `writingExamSpec`, `writingAllowedGenres`, `writingWordTarget`, `writingMinimumWords`, `writingPartLabelForExam`.
  - Updated official word requirements.

- `src/lib/exercises/types.ts`
  - Extended writing exercise JSON shape with optional structured brief fields.

- `src/lib/exercises/writingBrief.ts`
  - New shared parser/cleaner for old and new writing prompts.

- `src/components/exercises/WritingBrief.tsx`
  - New exam-style brief renderer.

- `src/components/exercises/Writing.tsx`
  - Uses the new brief renderer and Cambridge spec labels/word targets.

- `src/components/PracticeSelectorForm.tsx`
  - Shows level-specific writing parts and allowed genres.

- `src/lib/gemini/prompts.ts`
  - Tightened writing-generation instructions.

- `src/lib/gemini/schemas.ts`
  - Added structured writing fields to AI JSON schema.

- `src/lib/exercises/generate.ts`
  - Normalizes writing brief fields.
  - Enforces route-selected level/part/genre as authoritative.
  - Requires CPE Part 1 source texts and KET Part 7 picture prompts.

- `src/lib/exercises/aiWritingFeedback.ts`
  - Includes structured brief fields in grading prompt.
  - Uses official word requirement labels.

- `src/app/dashboard/page.tsx`
  - Removed Writing portfolio.
  - Recent writing attempts still open internal writing feedback details.

- `src/app/dashboard/writing/page.tsx`
  - Redirects to `/dashboard/mistakes?mode=papers`.

- `src/app/dashboard/writing/[id]/page.tsx`
  - Internal writing feedback page using the clean brief renderer.

- `src/app/dashboard/writing/loading.tsx`
  - Updated wording from portfolio to writing feedback.

- `src/app/dashboard/layout.tsx`
  - Removed visible Writing nav.

- `src/app/practice/layout.tsx`
  - Removed visible Writing nav.

- `src/app/dashboard/mistakes/page.tsx`
  - Completed Papers shows level-specific writing part labels.

- `src/components/MistakeLibrary.tsx`
  - Groups mistakes by `exam + part` and shows level-specific writing labels.

- `src/actions/history.ts`
  - Writing feedback mistakes use level-specific writing part names.

## Verification

Passed:

```powershell
npm.cmd run lint
```

Passed:

```powershell
npm.cmd run build
```

Note: a parallel lint/build run briefly produced a Next page collection error for `/dashboard/writing`; rerunning `npm.cmd run build` alone passed cleanly. Treat that as a `.next` race from simultaneous Next commands, not a route bug.

Browser smoke check after restarting dev server:

- `http://localhost:3000/login` loads without console errors.
- `http://localhost:3000/dashboard/writing` redirects to login when logged out.
- No visible Writing nav or Writing portfolio text was present on the checked logged-out route.

Manual logged-in UI checks still worth doing:

- `/practice` selector shows the correct writing labels for each level.
- `/dashboard/mistakes?mode=papers` lists writing attempts in Completed Papers.
- Opening a writing attempt shows clean task brief cards with no visible markdown tokens.
- Old saved writing prompts with markdown-like `**article**` render cleanly through fallback parsing.

## Known Notes

- No database migration was needed for this task because writing exercises are stored as JSON.
- Existing saved writing attempts continue to work through the fallback prompt parser.
- Writing feedback criteria remain visible in Mistakes, but writing feedback items are tracked, not auto-drillable as cloze/reading questions.
- The repo currently appears entirely untracked in git (`git status --short` shows `??` for all top-level project files), so be careful not to infer change scope from git diff alone.

## Current Dev Server

A dev server was restarted and was responding at `http://localhost:3000/` after the changes.

If it needs to be restarted again:

```powershell
npm.cmd run dev
```

