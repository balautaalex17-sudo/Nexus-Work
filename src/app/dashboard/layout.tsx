import { redirect } from "next/navigation";
import { logoutAction } from "@/app/(auth)/actions";
import { PaperShell } from "@/components/PaperShell";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <PaperShell
      links={[
        { href: "/dashboard", label: "Dashboard" },
        { href: "/practice", label: "Practice" },
        { href: "/dashboard/mistakes", label: "Mistakes" },
      ]}
      candidateEmail={user.email ?? ""}
      rightSlot={
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" size="sm">
            Log out
          </Button>
        </form>
      }
    >
      {children}
    </PaperShell>
  );
}
