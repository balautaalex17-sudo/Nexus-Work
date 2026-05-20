import type { ReactNode } from "react";
import { NavPill, type NavLink } from "@/components/ui/NavPill";

interface PaperShellProps {
  links: NavLink[];
  rightSlot?: ReactNode;
  candidateEmail?: string;
  children: ReactNode;
}

export function PaperShell({ links, rightSlot, candidateEmail, children }: PaperShellProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <NavPill links={links} rightSlot={rightSlot} candidateEmail={candidateEmail} />
      <main className="flex-1 w-full pt-8">{children}</main>
      <footer className="mt-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl border-t border-dashed border-[#DED8CF] py-10 flex flex-wrap items-center justify-between gap-4 text-xs text-[#78786C]">
          <span className="font-display italic text-base text-[#2C2C24]">Nexus Work</span>
          <span>Cambridge C1 / C2 preparation · for practice use only</span>
        </div>
      </footer>
    </div>
  );
}
