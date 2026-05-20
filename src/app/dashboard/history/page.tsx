import { redirect } from "next/navigation";

export default function CompletedPapersRedirectPage() {
  redirect("/dashboard/mistakes?mode=papers");
}
