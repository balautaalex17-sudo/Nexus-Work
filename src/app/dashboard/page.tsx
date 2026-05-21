import Link from "next/link";
import { getDashboardSummary } from "@/actions/history";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { BlobField } from "@/components/ui/BlobField";
import type { Exam } from "@/lib/exercises/types";
import { isWritingPart, writingExamSpec } from "@/lib/exercises/writing";

function trendLabel(trend: number) {
  if (trend > 0) return `+${trend}% from previous set`;
  if (trend < 0) return `${trend}% from previous set`;
  return "steady across recent sets";
}

function attemptHref(row: { id: string; part: string }) {
  return isWritingPart(row.part)
    ? `/dashboard/writing/${row.id}`
    : `/dashboard/history/${row.id}`;
}

function partLabel(row: { exam: Exam; part: string }) {
  if (isWritingPart(row.part)) return writingExamSpec(row.exam, row.part).selectorLabel;
  const part = row.part;
  return part.replace("part", "Part ");
}

function activityLabel(dateString: string) {
  const now = new Date();
  const then = new Date(dateString);
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return then.toLocaleDateString();
}

function nextAction(summary: Awaited<ReturnType<typeof getDashboardSummary>>) {
  if (summary.unresolvedMistakes > 0) {
    return {
      title: "Clear active mistakes first",
      blurb: "Use drills to convert weak spots into automatic wins before starting another full paper.",
      href: "/dashboard/mistakes?mode=drill",
      cta: "Start focused drill",
    };
  }

  if (summary.totalAttempts === 0) {
    return {
      title: "Build your baseline",
      blurb: "Take one paper so the dashboard can map your strengths and gaps.",
      href: "/practice",
      cta: "Start your first paper",
    };
  }

  return {
    title: "Keep momentum",
    blurb: "You are in a clean state. Take a fresh paper to keep your streak and confidence up.",
    href: "/practice",
    cta: "Start new paper",
  };
}

export default async function DashboardPage() {
  const summary = await getDashboardSummary();
  const nextFocus = summary.weakestPart ?? summary.partStats[0] ?? null;
  const action = nextAction(summary);

  return (
    <>
      <Section maxWidth="2xl" spacing="sm" className="overflow-hidden">
        <BlobField
          blobs={[
            { shape: 0, color: "#183F73", size: 360, top: "-120px", right: "8%", opacity: 0.12 },
            { shape: 3, color: "#C18C5D", size: 280, bottom: "-110px", left: "-80px", opacity: 0.22 },
          ]}
        />
        <p className="eyebrow mb-3">Progress dashboard</p>
        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <div>
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-[#2C2C24] mb-3">
              Your exam progress, not just more buttons.
            </h1>
            <p className="lede">
              Track accuracy, weak parts, unresolved mistakes, and what to practise next. New papers
              live in Practice; this page is for knowing where you are improving.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link href="/dashboard/mistakes?mode=drill">
              <Button>Drill sets</Button>
            </Link>
            <Link href="/dashboard/mistakes?mode=papers">
              <Button variant="outline">Completed papers</Button>
            </Link>
            <Link href="/practice">
              <Button variant="ghost">New paper</Button>
            </Link>
          </div>
        </div>
      </Section>

      <Section maxWidth="2xl" spacing="sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card shapeIndex={0} className="px-6 py-5">
            <p className="text-xs uppercase tracking-widest text-[#78786C] font-bold mb-2">
              Overall accuracy
            </p>
            <p className="font-display text-4xl text-[#183F73] font-bold">{summary.accuracy}%</p>
            <p className="text-sm text-[#78786C] mt-2">
              {summary.totalScore} of {summary.totalMax} marks banked.
            </p>
          </Card>
          <Card shapeIndex={5} className="px-6 py-5">
            <p className="text-xs uppercase tracking-widest text-[#78786C] font-bold mb-2">
              Recent trend
            </p>
            <p className="font-display text-4xl text-[#5D7052] font-bold">
              {summary.lastAccuracy}%
            </p>
            <p className="text-sm text-[#78786C] mt-2">{trendLabel(summary.trend)}</p>
          </Card>
          <Card shapeIndex={2} className="px-6 py-5">
            <p className="text-xs uppercase tracking-widest text-[#78786C] font-bold mb-2">
              Unresolved mistakes
            </p>
            <p className="font-display text-4xl text-[#A85448] font-bold">
              {summary.unresolvedMistakes}
            </p>
            <p className="text-sm text-[#78786C] mt-2">
              Correct them in review or drill them as a test.
            </p>
          </Card>
          <Card shapeIndex={3} className="px-6 py-5">
            <p className="text-xs uppercase tracking-widest text-[#78786C] font-bold mb-2">
              Completed papers
            </p>
            <p className="font-display text-4xl text-[#2C2C24] font-bold">
              {summary.totalAttempts}
            </p>
            <p className="text-sm text-[#78786C] mt-2">
              {nextFocus ? `Next focus: ${nextFocus.partName}.` : "Start with one short paper."}
            </p>
          </Card>
        </div>
      </Section>

      <Section maxWidth="2xl" spacing="sm">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card shapeIndex={2} className="relative overflow-hidden">
            <BlobField
              blobs={[
                { shape: 4, color: "#5D7052", size: 220, top: "-80px", right: "-80px", opacity: 0.1 },
              ]}
            />
            <p className="eyebrow mb-2">Study control center</p>
            <h2 className="font-display text-3xl text-[#2C2C24]">{action.title}</h2>
            <p className="mt-3 max-w-2xl text-[#78786C]">{action.blurb}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={action.href}>
                <Button>{action.cta}</Button>
              </Link>
              <Link href="/dashboard/mistakes?mode=papers">
                <Button variant="outline">Open completed papers</Button>
              </Link>
            </div>
            <div className="mt-6 rounded-2xl border border-[#DED8CF] bg-[#FFFCF4] p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#78786C]">
                Quick checklist
              </p>
              <p className="text-sm text-[#4A4A40]">
                One paper, then review mistakes, then one focused drill set, then repeat.
              </p>
            </div>
          </Card>

          <Card shapeIndex={5} className="p-0 overflow-hidden">
            <div className="border-b border-dashed border-[#DED8CF] p-6">
              <p className="eyebrow mb-2">Recent activity</p>
              <h2 className="font-display text-3xl text-[#2C2C24]">Your latest attempts.</h2>
            </div>
            {summary.history.length === 0 ? (
              <div className="p-6 text-[#78786C]">
                No activity yet. Your latest papers will appear here with one-click review.
              </div>
            ) : (
              <div className="divide-y divide-[#DED8CF]/70">
                {summary.history.slice(0, 4).map((row) => (
                  <div key={row.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-[#2C2C24]">{row.title}</p>
                      <p className="text-xs text-[#78786C]">
                        {row.exam} {partLabel(row)} - {activityLabel(row.created_at)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-display font-bold text-[#183F73]">
                        {Math.round((row.score / row.max_score) * 100)}%
                      </p>
                      <Link href={attemptHref(row)} className="text-xs font-bold text-[#5D7052]">
                        Review
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </Section>

      <Section maxWidth="2xl" spacing="default">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card shapeIndex={1} className="p-0 overflow-hidden">
            <div className="p-6 border-b border-dashed border-[#DED8CF]">
              <p className="eyebrow mb-2">Recommended focus</p>
              <h2 className="font-display text-3xl text-[#2C2C24]">
                {summary.weakestPart ? summary.weakestPart.partName : "Build your baseline"}
              </h2>
              <p className="text-[#78786C] mt-2">
                {summary.weakestPart
                  ? `${summary.weakestPart.accuracy}% accuracy with ${summary.weakestPart.mistakes} active mistake${summary.weakestPart.mistakes === 1 ? "" : "s"}.`
                  : "Finish a paper and the app will tell you where to spend your energy."}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-md border border-[#DED8CF] bg-[#FFFCF4] p-4">
                <p className="text-xs uppercase tracking-widest text-[#78786C] font-bold mb-1">
                  Strongest part
                </p>
                <p className="font-display text-xl text-[#2C2C24]">
                  {summary.strongestPart
                    ? `${summary.strongestPart.partName} (${summary.strongestPart.accuracy}%)`
                    : "No data yet"}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/dashboard/mistakes?mode=drill">
                  <Button size="sm">Start drill</Button>
                </Link>
                <Link href="/dashboard/mistakes">
                  <Button variant="outline" size="sm">Manage mistakes</Button>
                </Link>
              </div>
            </div>
          </Card>

          <Card shapeIndex={4} className="p-0 overflow-hidden">
            <div className="p-6 border-b border-dashed border-[#DED8CF]">
              <p className="eyebrow mb-2">Part breakdown</p>
              <h2 className="font-display text-3xl text-[#2C2C24]">Where marks are leaking.</h2>
            </div>
            {summary.partStats.length === 0 ? (
              <div className="p-8 text-[#78786C]">
                No completed papers yet. Take one paper and this becomes a weakness map.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="paper-table">
                  <thead>
                    <tr>
                      <th className="pl-8">Part</th>
                      <th>Papers</th>
                      <th>Accuracy</th>
                      <th className="pr-8">Mistakes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.partStats.map((part) => (
                      <tr key={part.part}>
                        <td className="pl-8">
                          <span className="font-bold">{part.part.replace("part", "Part ")}</span>
                          <span className="block text-[#78786C]">{part.partName}</span>
                        </td>
                        <td>{part.attempts}</td>
                        <td className="font-display font-bold text-[#183F73]">{part.accuracy}%</td>
                        <td className="pr-8">
                          <span className={part.mistakes > 0 ? "status-fail" : "status-pass"}>
                            {part.mistakes}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </Section>
      <Section maxWidth="2xl" tone="stone" spacing="default">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-3">Recent completed papers</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-[#2C2C24]">
              Review what changed.
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/practice">
              <Button variant="ghost">Choose another paper</Button>
            </Link>
            <Link href="/dashboard/mistakes?mode=papers">
              <Button variant="outline">View completed papers</Button>
            </Link>
          </div>
        </div>

        <Card shapeIndex={0} className="overflow-hidden p-0">
          {summary.history.length === 0 ? (
            <div className="grid gap-6 p-8 md:grid-cols-[auto_1fr] md:items-center md:p-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#DED8CF] bg-[#FFFCF4] text-[#5D7052] md:mx-0">
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <line x1="8" y1="9" x2="16" y2="9" />
                  <line x1="8" y1="13" x2="16" y2="13" />
                </svg>
              </div>
              <div className="text-center md:text-left">
                <p className="mb-2 font-display text-2xl font-bold text-[#2C2C24]">
                  No completed papers yet.
                </p>
                <p className="mb-5 max-w-xl text-[#78786C]">
                  Finish your first paper and this space becomes your review timeline with scores,
                  mistakes, and direct feedback links.
                </p>
                <div className="flex flex-wrap justify-center gap-3 md:justify-start">
                  <Link href="/practice">
                    <Button size="sm">Start a paper</Button>
                  </Link>
                  <Link href="/dashboard/mistakes">
                    <Button variant="outline" size="sm">Open mistakes hub</Button>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="paper-table">
                <thead>
                  <tr>
                    <th className="pl-8">Date</th>
                    <th>Exam</th>
                    <th>Part</th>
                    <th>Title</th>
                    <th>Score</th>
                    <th className="pr-8 text-right">Review</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.history.map((row) => (
                    <tr key={row.id} className="transition-colors hover:bg-[#183F73]/5">
                      <td className="pl-8">{new Date(row.created_at).toLocaleDateString()}</td>
                      <td>
                        <span className="inline-flex px-2.5 py-0.5 rounded-full bg-[#E6DCCD] text-[#4A4A40] text-xs font-bold">
                          {row.exam}
                        </span>
                      </td>
                      <td className="font-semibold">{partLabel(row)}</td>
                      <td className="text-[#78786C]">{row.title}</td>
                      <td className="font-display font-bold">
                        {row.score}
                        <span className="text-[#DED8CF]"> / {row.max_score}</span>
                      </td>
                      <td className="pr-8 text-right">
                        <Link href={attemptHref(row)} className="font-bold text-[#183F73]">
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </Section>
    </>
  );
}
