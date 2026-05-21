import { redirect } from "next/navigation";

interface MistakePracticePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MistakePracticePage({ searchParams }: MistakePracticePageProps) {
  const params = (await searchParams) ?? {};
  const next = new URLSearchParams();
  const exam = firstParam(params.exam);
  const part = firstParam(params.part);
  const practice = firstParam(params.practice);
  const setId = firstParam(params.setId);

  if (exam) next.set("level", exam);
  if (part) next.set("part", part);
  if (practice) next.set("practice", practice);
  if (setId) {
    next.set("mode", "drill");
    next.set("setId", setId);
  }
  if (practice === "similar") next.set("mode", "drill");

  const query = next.toString();
  redirect(`/dashboard/mistakes${query ? `?${query}` : ""}`);
}
