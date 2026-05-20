import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { BlobField } from "@/components/ui/BlobField";
import { NavPill } from "@/components/ui/NavPill";
import { createClient } from "@/lib/supabase/server";

const featureCards = [
  {
    eyebrow: "Use of English",
    title: "Four functional parts, generated fresh.",
    body: "Multiple-choice cloze, open cloze, word formation, and key word transformation — new passages every time, so the surface never repeats.",
    shape: 1,
  },
  {
    eyebrow: "Reading",
    title: "Full-length papers, marked the moment you finish.",
    body: "Multiple choice, gapped text, and multiple matching with extracts you actually want to read.",
    shape: 2,
  },
  {
    eyebrow: "Review",
    title: "Every mistake remembered, every retry checked.",
    body: "A senior-examiner-style mark scheme grades free-text answers. Wrong items are revisitable from the mistakes dashboard.",
    shape: 3,
  },
];

const stepCards = [
  { n: "01", t: "Pick a part", b: "KET, PET, FCE, CAE, or CPE, then choose a part." },
  { n: "02", t: "Sit the paper", b: "Generated to Cambridge calibration, freshly written." },
  { n: "03", t: "Review and retry", b: "Wrong items become a study list. Try them again from any device." },
];

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main className="app-page">
      <NavPill
        links={[
          { href: "/", label: "Home" },
        ]}
        rightSlot={
          <>
            <Link href="/login" className="text-sm font-bold text-[#2C2C24]/80 hover:text-[#5D7052] px-3 border-b-0">
              Log in
            </Link>
            <Link href="/signup">
              <Button size="sm">Sign up</Button>
            </Link>
          </>
        }
      />

      <Section maxWidth="2xl" spacing="lg" className="overflow-hidden">
        <BlobField
          blobs={[
            { shape: 0, color: "#5D7052", size: 520, top: "-120px", left: "-160px", opacity: 0.22 },
            { shape: 2, color: "#C18C5D", size: 420, top: "120px", right: "-140px", opacity: 0.18 },
            { shape: 3, color: "#E6DCCD", size: 360, bottom: "-160px", left: "30%", opacity: 0.45 },
          ]}
        />
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="eyebrow mb-4">Cambridge English practice</p>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight text-[#2C2C24] mb-6">
              Practice papers that feel <em className="italic text-[#5D7052] font-semibold">handmade</em>, marked the moment you finish.
            </h1>
            <p className="lede mb-10">
              Generate fresh KET, PET, FCE, CAE, and CPE exercises for any of the seven parts. Submit, get a real
              examiner-style score, and reopen every completed paper from a calm, paper-grain dashboard.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/signup">
                <Button size="lg">
                  Start practising
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg">I already have an account</Button>
              </Link>
            </div>
          </div>

          <div className="relative">
            <BlobField
              blobs={[{ shape: 1, color: "#5D7052", size: 280, top: "10%", right: "5%", opacity: 0.14 }]}
            />
            <Card shapeIndex={1} lift className="relative">
              <p className="eyebrow mb-3">Sample paper</p>
              <h3 className="font-display text-2xl text-[#2C2C24] mb-4">Part 1 · Multiple Choice Cloze</h3>
              <p className="font-display text-[1.05rem] leading-[1.9] text-[#2C2C24]">
                The renewed interest in fermentation has{" "}
                <span className="inline-flex items-center justify-center min-w-[26px] h-[26px] rounded-full bg-[#5D7052]/10 text-[#5D7052] text-xs font-bold px-2 mx-1">1</span>{" "}
                much to a quiet rediscovery of slowness in modern kitchens, where home cooks{" "}
                <span className="inline-flex items-center justify-center min-w-[26px] h-[26px] rounded-full bg-[#5D7052]/10 text-[#5D7052] text-xs font-bold px-2 mx-1">2</span>{" "}
                care over speed.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="px-3 py-1.5 rounded-full bg-[#E6DCCD] text-[#4A4A40] text-xs font-bold">KET</span>
                <span className="px-3 py-1.5 rounded-full bg-[#E6DCCD] text-[#4A4A40] text-xs font-bold">PET</span>
                <span className="px-3 py-1.5 rounded-full bg-[#E6DCCD] text-[#4A4A40] text-xs font-bold">FCE</span>
                <span className="px-3 py-1.5 rounded-full bg-[#E6DCCD] text-[#4A4A40] text-xs font-bold">CAE</span>
                <span className="px-3 py-1.5 rounded-full bg-[#E6DCCD] text-[#4A4A40] text-xs font-bold">CPE</span>
                <span className="px-3 py-1.5 rounded-full bg-[#5D7052]/10 text-[#5D7052] text-xs font-bold">7 parts</span>
                <span className="px-3 py-1.5 rounded-full bg-[#5D7052]/10 text-[#5D7052] text-xs font-bold">AI-marked</span>
              </div>
            </Card>
          </div>
        </div>
      </Section>

      <Section maxWidth="xl" tone="stone" spacing="default">
        <div className="text-center mb-14">
          <p className="eyebrow mb-3">How it works</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-[#2C2C24]">
            Three steps from blank page to marked paper.
          </h2>
        </div>
        <div className="grid gap-8 md:grid-cols-3 relative">
          <svg
            className="hidden md:block absolute top-1/3 left-[16%] right-[16%] w-auto h-12 text-[#C18C5D]/40 pointer-events-none"
            viewBox="0 0 800 60"
            fill="none"
            preserveAspectRatio="none"
          >
            <path d="M 0 30 Q 200 -10 400 30 T 800 30" stroke="currentColor" strokeWidth="2" strokeDasharray="6 8" strokeLinecap="round" />
          </svg>
          {stepCards.map((step, i) => (
            <Card key={step.n} shapeIndex={i + 1} lift className="text-center">
              <span className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-[#5D7052] text-[#F3F4F1] font-display font-bold text-lg mb-4">
                {step.n}
              </span>
              <h3 className="font-display text-2xl text-[#2C2C24] mb-2">{step.t}</h3>
              <p className="text-[#78786C] text-sm leading-relaxed">{step.b}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section maxWidth="2xl" spacing="default">
        <div className="mb-14 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="eyebrow mb-3">What&apos;s inside</p>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-[#2C2C24] max-w-2xl">
              All seven Cambridge parts. Generated fresh, never repeated.
            </h2>
          </div>
          <Link href="/signup">
            <Button variant="outline">Start the first paper</Button>
          </Link>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {featureCards.map((f, i) => (
            <Card key={f.title} shapeIndex={i + 2} lift>
              <p className="eyebrow mb-3">{f.eyebrow}</p>
              <h3 className="font-display text-2xl text-[#2C2C24] mb-3">{f.title}</h3>
              <p className="text-[#78786C] leading-relaxed">{f.body}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section maxWidth="lg" spacing="lg" className="overflow-hidden">
        <BlobField
          blobs={[
            { shape: 4, color: "#5D7052", size: 420, top: "-100px", right: "-100px", opacity: 0.18 },
            { shape: 1, color: "#C18C5D", size: 340, bottom: "-140px", left: "-80px", opacity: 0.2 },
          ]}
        />
        <Card shapeIndex={2} className="text-center px-8 py-16 md:py-20">
          <p className="eyebrow mb-3">Ready when you are</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-[#2C2C24] mb-4 max-w-2xl mx-auto">
            Sit a paper this afternoon. Mark it before tea.
          </h2>
          <p className="lede mx-auto mb-8">
            Free to try. Generates new exercises on demand, scores them with a Cambridge-style mark
            scheme, and keeps every completed paper in your history.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup">
              <Button size="lg">Create an account</Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" size="lg">Log in instead</Button>
            </Link>
          </div>
        </Card>
      </Section>

      <footer className="px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl border-t border-dashed border-[#DED8CF] py-10 flex flex-wrap items-center justify-between gap-4 text-xs text-[#78786C]">
          <span className="font-display italic text-base text-[#2C2C24]">Nexus Work</span>
          <span>Cambridge C1 / C2 preparation · for practice use only</span>
        </div>
      </footer>
    </main>
  );
}
