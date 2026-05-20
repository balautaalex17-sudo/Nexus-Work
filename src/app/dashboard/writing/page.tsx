import { redirect } from "next/navigation";

export default function WritingPage() {
  redirect("/dashboard/mistakes?mode=papers");
}
