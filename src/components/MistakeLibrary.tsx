"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteMistakeAction,
  saveCustomDrillSetAction,
  type CustomDrillSetSummary,
  type DrillSetItem,
  type MistakeRow,
} from "@/actions/history";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import type { Exam } from "@/lib/exercises/types";
import { isWritingPart, writingExamSpec } from "@/lib/exercises/writing";

interface MistakeLibraryProps {
  mistakes: MistakeRow[];
  drillSets: CustomDrillSetSummary[];
}

const partOrder: Record<string, number> = {
  part1: 1,
  part2: 2,
  part3: 3,
  part4: 4,
  part5: 5,
  part6: 6,
  part7: 7,
  writing_part1: 8,
  writing_part2: 9,
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function refKey(item: DrillSetItem) {
  return `${item.attemptId}::${item.itemKey}`;
}

function parseRefKey(value: string): DrillSetItem | null {
  const [attemptId, itemKey] = value.split("::");
  if (!attemptId || !itemKey) return null;
  return { attemptId, itemKey };
}

function uniquePapers(rows: MistakeRow[]) {
  const papers = new Map<string, MistakeRow>();
  for (const row of rows) {
    if (!papers.has(row.attemptId)) papers.set(row.attemptId, row);
  }
  return Array.from(papers.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

function canDrill(row: MistakeRow) {
  return row.drillable !== false;
}

function attemptHref(row: { attemptId: string; part: string }) {
  return isWritingPart(row.part)
    ? `/dashboard/writing/${row.attemptId}`
    : `/dashboard/history/${row.attemptId}`;
}

function partLabel(exam: Exam, part: string) {
  if (isWritingPart(part)) return writingExamSpec(exam, part).selectorLabel;
  return part.replace("part", "Part ");
}

export function MistakeLibrary({ mistakes, drillSets }: MistakeLibraryProps) {
  const router = useRouter();
  const [openGroupKey, setOpenGroupKey] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [setName, setSetName] = useState("");
  const [targetSetId, setTargetSetId] = useState("new");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const groups = useMemo(() => {
    const byPart = new Map<string, MistakeRow[]>();
    for (const mistake of mistakes) {
      const key = `${mistake.exam}:${mistake.part}`;
      byPart.set(key, [...(byPart.get(key) ?? []), mistake]);
    }
    return Array.from(byPart.values())
      .map((rows) => ({
        exam: rows[0]?.exam ?? "FCE",
        part: rows[0]?.part ?? "part1",
        partName: rows[0]?.partName ?? rows[0]?.part ?? "Part",
        rows: rows.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime() ||
            a.questionNumber - b.questionNumber,
        ),
      }))
      .sort(
        (a, b) =>
          a.exam.localeCompare(b.exam) || (partOrder[a.part] ?? 99) - (partOrder[b.part] ?? 99),
      );
  }, [mistakes]);

  const selectedItems = useMemo(
    () =>
      Array.from(selected)
        .map(parseRefKey)
        .filter((item): item is DrillSetItem => Boolean(item)),
    [selected],
  );

  const toggle = (item: MistakeRow) => {
    if (!canDrill(item)) return;
    const key = refKey(item);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setMessage(null);
    setError(null);
  };

  const selectGroup = (rows: MistakeRow[]) => {
    setSelected((current) => {
      const next = new Set(current);
      for (const row of rows) {
        if (canDrill(row)) next.add(refKey(row));
      }
      return next;
    });
    setMessage(null);
    setError(null);
  };

  const clearGroup = (rows: MistakeRow[]) => {
    setSelected((current) => {
      const next = new Set(current);
      for (const row of rows) next.delete(refKey(row));
      return next;
    });
  };

  const saveSet = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await saveCustomDrillSetAction({
        name: targetSetId === "new" ? setName : undefined,
        setId: targetSetId === "new" ? undefined : targetSetId,
        items: selectedItems,
      });

      if ("error" in result) {
        setError(result.error);
        return;
      }

      setSelected(new Set());
      setSetName("");
      setMessage(targetSetId === "new" ? "Drill set created." : "Mistakes added to drill set.");
      router.refresh();
    });
  };

  const deleteMistake = (mistake: MistakeRow) => {
    const ok = window.confirm(
      `Delete question ${mistake.questionNumber} from Mistakes? This keeps the completed paper, but removes this mistake from the library and drill sets.`,
    );
    if (!ok) return;

    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await deleteMistakeAction({
        attemptId: mistake.attemptId,
        itemKey: mistake.itemKey,
      });

      if ("error" in result) {
        setError(result.error);
        return;
      }

      setSelected((current) => {
        const next = new Set(current);
        next.delete(refKey(mistake));
        return next;
      });
      setMessage("Mistake deleted.");
      router.refresh();
    });
  };

  if (mistakes.length === 0) {
    return (
      <Card shapeIndex={1} className="py-16 text-center">
        <p className="eyebrow mb-3">Mistakes</p>
        <h2 className="mb-3 font-display text-4xl text-[#2C2C24]">No mistakes here.</h2>
        <p className="mx-auto mb-6 max-w-md text-[#78786C]">
          Pick another level or complete a paper. Individual mistakes will appear here grouped by
          part.
        </p>
        <Link href="/practice">
          <Button>Choose a paper</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[1.5rem] border border-[#DED8CF] bg-[#FFFCF4]/95 p-4 shadow-soft md:p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(220px,0.9fr)_minmax(360px,1.2fr)_auto] xl:items-end">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <p className="eyebrow">Create drill set</p>
              <span className="rounded-full bg-[#5D7052]/10 px-3 py-1 text-xs font-bold text-[#5D7052]">
                {selectedItems.length} selected
              </span>
            </div>
            <h2 className="font-display text-2xl leading-tight text-[#2C2C24]">
              Pick mistakes below.
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[#78786C]">
              Save selected auto-marked questions into a reusable drill. Writing feedback is
              tracked here separately.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-bold text-[#4A4A40]">
              Add to
              <select
                className="mt-2 h-12 w-full rounded-full border border-[#DED8CF] bg-white/70 px-4 text-sm"
                value={targetSetId}
                disabled={pending}
                onChange={(event) => setTargetSetId(event.target.value)}
              >
                <option value="new">New drill set</option>
                {drillSets.map((set) => (
                  <option key={set.id} value={set.id}>
                    {set.name}
                  </option>
                ))}
              </select>
            </label>
            {targetSetId === "new" ? (
              <label className="text-sm font-bold text-[#4A4A40]">
                Set name
                <Input
                  className="mt-2"
                  value={setName}
                  disabled={pending}
                  placeholder="e.g. CAE Part 3 fixes"
                  onChange={(event) => setSetName(event.target.value)}
                />
              </label>
            ) : (
              <div className="rounded-2xl border border-[#DED8CF] bg-white/60 p-4 text-sm text-[#4A4A40]">
                Selected mistakes will be appended to the existing set.
              </div>
            )}
          </div>
          <Button type="button" disabled={pending || selectedItems.length === 0} onClick={saveSet}>
            {pending ? "Saving..." : targetSetId === "new" ? "Create set" : "Add to set"}
          </Button>
        </div>
        {message ? <p className="mt-3 text-sm font-bold text-[#5D7052]">{message}</p> : null}
        {error ? <p className="mt-3 text-sm font-bold text-[#A85448]">{error}</p> : null}
      </div>

      {groups.map((group, groupIndex) => {
        const groupKey = `${group.exam}-${group.part}`;
        const isOpen = openGroupKey === null ? groupIndex === 0 : openGroupKey === groupKey;
        const activeCount = group.rows.filter((row) => !row.resolved).length;
        const resolvedCount = group.rows.length - activeCount;
        const drillableCount = group.rows.filter(canDrill).length;
        const papers = uniquePapers(group.rows);

        return (
          <Card key={groupKey} id={groupKey} shapeIndex={groupIndex} lift className="p-0">
            <div className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="eyebrow mb-2">
                    {group.exam} - {partLabel(group.exam, group.part)}
                  </p>
                  <h2 className="font-display text-3xl text-[#2C2C24]">{group.partName}</h2>
                  <p className="mt-2 text-sm text-[#78786C]">
                    {group.rows.length} stored mistake{group.rows.length === 1 ? "" : "s"} from{" "}
                    {papers.length} completed paper{papers.length === 1 ? "" : "s"}.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="status-fail">{activeCount} active</span>
                  <span className="status-pass">{resolvedCount} resolved</span>
                </div>
              </div>
              <div className="mt-4">
                <Button
                  type="button"
                  variant={isOpen ? "ghost" : "outline"}
                  size="sm"
                  onClick={() => setOpenGroupKey(isOpen ? null : groupKey)}
                >
                  {isOpen ? "Collapse part" : "Expand part"}
                </Button>
              </div>
            </div>

            {isOpen ? (
              <>
                <div className="border-y border-dashed border-[#DED8CF] px-6 pb-6">
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={drillableCount === 0}
                      onClick={() => selectGroup(group.rows)}
                    >
                      {drillableCount === 0 ? "Tracked only" : "Select part"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => clearGroup(group.rows)}
                    >
                      Clear part
                    </Button>
                  </div>
                  <details className="mt-4 rounded-2xl border border-[#DED8CF] bg-[#FFFCF4]/80 p-4">
                    <summary className="cursor-pointer font-bold text-[#183F73]">
                      View completed papers for this part
                    </summary>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {papers.map((paper) => (
                        <div
                          key={paper.attemptId}
                          className="rounded-2xl border border-[#DED8CF]/80 bg-white/70 p-4"
                        >
                          <div className="mb-2 flex flex-wrap gap-2">
                            <span className="rounded-full bg-[#E6DCCD] px-3 py-1 text-xs font-bold text-[#4A4A40]">
                              {paper.exam}
                            </span>
                            <span className="rounded-full bg-[#5D7052]/10 px-3 py-1 text-xs font-bold text-[#5D7052]">
                              {formatDate(paper.created_at)}
                            </span>
                          </div>
                          <p className="font-display text-xl text-[#2C2C24]">{paper.title}</p>
                          <Link href={attemptHref(paper)} className="mt-2 inline-flex font-bold text-[#183F73]">
                            {isWritingPart(paper.part) ? "Open writing feedback" : "Open completed paper"}
                          </Link>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>

                <div className="divide-y divide-[#DED8CF]/70">
                  {group.rows.map((mistake) => {
                    const key = refKey(mistake);
                    const checked = selected.has(key);
                    const isWritingFeedback = mistake.kind === "writing_feedback";
                    const drillable = canDrill(mistake);

                    return (
                      <div key={key} className="grid gap-4 p-6 lg:grid-cols-[auto_1fr_auto]">
                        <label className="flex items-center gap-3 text-sm font-bold text-[#4A4A40]">
                          <input
                            type="checkbox"
                            className="h-5 w-5 accent-[#5D7052]"
                            checked={checked}
                            disabled={pending || !drillable}
                            onChange={() => toggle(mistake)}
                          />
                          {drillable ? "Add" : "Tracked"}
                        </label>
                        <div>
                          <div className="mb-2 flex flex-wrap gap-2">
                            <span className={mistake.resolved ? "status-pass" : "status-fail"}>
                              {mistake.resolved ? "Resolved" : "Active"}
                            </span>
                            <span className="rounded-full bg-[#E6DCCD] px-3 py-1 text-xs font-bold text-[#4A4A40]">
                              {isWritingFeedback ? "Criterion" : `Question ${mistake.questionNumber}`}
                            </span>
                            {isWritingFeedback ? (
                              <span className="rounded-full bg-[#183F73]/10 px-3 py-1 text-xs font-bold text-[#183F73]">
                                Writing feedback
                              </span>
                            ) : null}
                          </div>
                          <p className="font-display text-xl leading-snug text-[#2C2C24]">
                            {mistake.prompt}
                          </p>
                          <p className="mt-1 text-sm text-[#78786C]">
                            From {mistake.title} - {formatDate(mistake.created_at)}
                          </p>
                          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                            <p>
                              <span className="mr-2 text-xs font-bold uppercase tracking-wider text-[#78786C]">
                                {isWritingFeedback ? "Your band" : "You wrote"}
                              </span>
                              <span className="break-words font-mono font-bold text-[#A85448]">
                                {mistake.userAnswer || "-"}
                              </span>
                            </p>
                            <p>
                              <span className="mr-2 text-xs font-bold uppercase tracking-wider text-[#78786C]">
                                {isWritingFeedback ? "Goal" : "Expected"}
                              </span>
                              <span className="break-words font-mono font-bold text-[#5D7052]">
                                {mistake.correctAnswer}
                              </span>
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                          <Link href={attemptHref(mistake)}>
                            <Button type="button" variant="outline" size="sm">
                              {isWritingFeedback ? "Open feedback" : "Open paper"}
                            </Button>
                          </Link>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={pending}
                            className="text-[#A85448] hover:bg-[#A85448]/10 hover:text-[#A85448]"
                            onClick={() => deleteMistake(mistake)}
                          >
                            Delete mistake
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
