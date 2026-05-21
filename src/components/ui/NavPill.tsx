"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/ui/Logo";

export interface NavLink {
  href: string;
  label: string;
}

interface NavPillProps {
  links?: NavLink[];
  brandHref?: string;
  brandLabel?: string;
  rightSlot?: ReactNode;
  candidateEmail?: string;
}

export function NavPill({
  links = [],
  brandHref = "/",
  brandLabel = "Nexus Work",
  rightSlot,
  candidateEmail,
}: NavPillProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [optimisticHref, setOptimisticHref] = useState<string | null>(null);
  const pathname = usePathname();
  const routeActiveHref =
    links
      .filter((l) => pathname === l.href || pathname?.startsWith(l.href + "/"))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
  const activeHref = optimisticHref ?? routeActiveHref;

  useEffect(() => {
    setOptimisticHref(null);
  }, [pathname]);

  useEffect(() => {
    for (const link of links) router.prefetch(link.href);
    if (brandHref) router.prefetch(brandHref);
  }, [brandHref, links, router]);

  return (
    <div className="sticky top-4 z-40 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <nav
        className={cn(
          "flex items-center justify-between gap-4 rounded-full border border-[#DED8CF]/60 px-3 sm:px-5 py-3",
          "bg-white/70 backdrop-blur-md shadow-soft",
        )}
      >
        <Link
          href={brandHref}
          className="flex items-center gap-3 font-display text-lg font-bold text-[#2C2C24] hover:text-[#5D7052] transition-colors border-b-0"
        >
          <LogoMark size={36} />
          <span className="hidden sm:inline">{brandLabel}</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => {
            const active = activeHref === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                prefetch
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 border-b-0",
                  active
                    ? "bg-[#5D7052]/10 text-[#5D7052]"
                    : "text-[#2C2C24]/80 hover:text-[#5D7052] hover:bg-[#5D7052]/5",
                )}
                onClick={() => setOptimisticHref(l.href)}
                onMouseEnter={() => router.prefetch(l.href)}
                onFocus={() => router.prefetch(l.href)}
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {candidateEmail ? (
            <span className="hidden lg:inline text-xs text-[#78786C] font-semibold px-3">
              {candidateEmail}
            </span>
          ) : null}
          <div className="hidden sm:flex items-center gap-2">{rightSlot}</div>
          <button
            onClick={() => setOpen((v) => !v)}
            className="md:hidden flex h-10 w-10 items-center justify-center rounded-full text-[#5D7052] hover:bg-[#5D7052]/10 transition-colors"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="6" y1="18" x2="18" y2="6" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="13" x2="20" y2="13" />
                <line x1="4" y1="19" x2="20" y2="19" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {open ? (
        <div className="md:hidden mt-3 rounded-[2rem] bg-white/90 backdrop-blur-md border border-[#DED8CF]/60 shadow-soft p-6 flex flex-col gap-2">
          {links.map((l) => {
            const active = activeHref === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                prefetch
                className={cn(
                  "px-4 py-3 rounded-full text-base font-bold transition-colors border-b-0",
                  active
                    ? "bg-[#5D7052]/10 text-[#5D7052]"
                    : "text-[#2C2C24] hover:bg-[#5D7052]/10 hover:text-[#5D7052]",
                )}
                onClick={() => {
                  setOptimisticHref(l.href);
                  setOpen(false);
                }}
                onMouseEnter={() => router.prefetch(l.href)}
                onFocus={() => router.prefetch(l.href)}
              >
                {l.label}
              </Link>
            );
          })}
          {rightSlot ? (
            <div className="mt-2 pt-3 border-t border-dashed border-[#DED8CF] flex items-center justify-between gap-3">
              {candidateEmail ? (
                <span className="text-xs text-[#78786C] font-semibold">{candidateEmail}</span>
              ) : <span />}
              <div className="flex items-center gap-2">{rightSlot}</div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
