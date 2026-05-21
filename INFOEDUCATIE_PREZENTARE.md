# ExamCraft AI / Nexus Work — InfoEducație 2024, Secțiunea Web

> **Aplicație web pentru pregătirea examenelor Cambridge English (KET, PET, FCE, CAE, CPE) cu corectare și generare de exerciții similare bazate pe AI.**
>
> Live: `https://examcraft-ai.vercel.app`
> Repository: GitHub — `balautaalex17-sudo/Nexus-Work`

---

## 1. Descrierea produsului (Product Description)

ExamCraft AI este o platformă de pregătire pentru examenele Cambridge English care:

1. **Generează exerciții autentice** pentru toate părțile examenelor (Reading & Use of English Part 1–7, Writing Part 1–2) la 5 niveluri de dificultate (KET → CPE), folosind un model LLM (Gemini 3.5 Flash via OpenRouter).
2. **Corectează automat** răspunsurile, inclusiv eseuri pe rubrica oficială Cambridge (Content, Communicative Achievement, Organisation, Language — band 0–5 per criteriu).
3. **Urmărește greșelile în timp** într-un *mistake log* persistent: fiecare greșeală e indexată după lecție, parte, întrebare și răspuns așteptat.
4. **Creează seturi de drill personalizate** ("Drill Sets") din greșelile selectate, ca utilizatorul să poată reveni la slăbiciunile lui.
5. **Generează exerciții *similare* fresh cu AI** pentru fiecare greșeală — testează aceeași abilitate (același pattern lexical, gramatical, mișcare de citire), dar cu text complet nou.
6. **Verifică răspunsurile alternative** prin AI (e.g. `"have to" / "must"` în Key Word Transformation): dacă răspunsul nu coincide exact cu cel marcat în cheie, se cere modelului să decidă dacă e totuși acceptabil pentru Cambridge.

**Audiență țintă:** elevi de liceu și studenți care se pregătesc pentru un examen Cambridge real și au nevoie de practică nelimitată, personalizată pe slăbiciunile proprii — fără să cumpere zeci de manuale.

**Diferențiator față de Cambridge.org / Magoosh / British Council practice:** acele platforme oferă un număr fix de teste vechi. ExamCraft generează exerciții noi nelimitat, urmărește erorile longitudinal și creează drill-uri personalizate.

---

## 2. Arhitectură (mapare la Capitolul I — Inginerie Web, 25 puncte)

### 2.1 Stack tehnologic

| Strat | Tehnologie | Justificare |
|------|------------|-------------|
| Framework | **Next.js 15** (App Router, React 19, RSC) | SSR pentru SEO + Server Actions pentru a evita un API REST separat |
| Limbaj | **TypeScript** (strict mode) | Type-safety end-to-end între server și client |
| Bază de date | **Supabase / PostgreSQL** | RLS nativ pentru securitate, migrații versionate, scalare gestionată |
| Autentificare | **Supabase Auth** | Email/password cu confirmare email, reset password, RLS legat de `auth.uid()` |
| Stil | **Tailwind CSS 3.4** + sistem de design custom | Zero CSS framework "out of the box" — fiecare componentă UI e scrisă de la zero |
| AI | **OpenRouter** cu `google/gemini-3.5-flash` | Permite swap rapid de model fără modificări de cod |
| Validare | **Zod 4** | Schemas Zod pentru fiecare exercițiu + răspuns AI |
| Hosting | **Vercel** (Edge + Serverless) | Deploy automat din `master`, preview pe branch-uri |
| Versionare | **Git** + GitHub | Commit-uri convenționale, branch protection pe `master` |

### 2.2 Diagrama de arhitectură

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            Browser (React 19, RSC)                           │
│  ┌────────────────┐  ┌─────────────────────┐  ┌──────────────────────────┐  │
│  │ Server         │  │ Client Components   │  │ Server Actions (RPC)     │  │
│  │ Components     │←→│ ("use client")      │←→│ ("use server")           │  │
│  │ (RSC, default) │  │ - PracticeSession   │  │ - generateExerciseAction │  │
│  │ - layout.tsx   │  │ - SimilarMistake... │  │ - submitAttemptAction    │  │
│  │ - dashboard    │  │ - DashboardHub      │  │ - generateSimilarDrill.. │  │
│  └────────────────┘  └─────────────────────┘  └────────────┬─────────────┘  │
└──────────────────────────────────────────────────────────────┼──────────────┘
                                                               │
        ┌──────────────────────────────────────────────────────┼──────────────┐
        ▼                                                      ▼              ▼
┌───────────────────┐                              ┌──────────────────┐ ┌─────────┐
│   Supabase        │                              │   OpenRouter     │ │ Edge    │
│   PostgreSQL      │                              │   Gateway        │ │ cache   │
│   + RLS + Auth    │                              │  (Gemini 3.5)    │ │ (Vercel)│
│                   │                              │                  │ │         │
│ • profiles        │                              │ • Exercise gen   │ │         │
│ • history         │                              │ • Writing grade  │ │         │
│ • custom_drill_   │                              │ • Similar drills │ │         │
│   sets            │                              │ • Alt. answer    │ │         │
│ • api_usage       │                              │   verification   │ │         │
│ • auth_rate_limit │                              └──────────────────┘ │         │
└───────────────────┘                                                   │         │
```

### 2.3 Structurarea codului — modularitate (Cap. I, *Structurarea codului sursă*)

```
src/
  app/                          # Next.js App Router (rute)
    (auth)/                     # Route group pentru login/signup/reset
    auth/                       # Callback handlers
    dashboard/
      history/[id]/             # Detaliu paper completat
      mistakes/                 # Hub principal — Greșeli / Drill Sets / Papers
      writing/[id]/             # Feedback eseu
    practice/
      [exam]/[part]/            # Dynamic route pentru oricare combinație exam×parte
      mistakes/                 # Practică pe baza greșelilor
  actions/                      # Server Actions (RPC, `"use server"`)
    practice.ts                 # generate/submit exercise, similar drills, redo mistakes
    history.ts                  # CRUD pe completed papers + drill sets
  components/                   # Componente React (server + client)
    ui/                         # Sistem de design — Button, Card, Section, NavPill...
    exercises/                  # Renderere per tip de exercițiu (7 fișiere)
  lib/
    exercises/
      types.ts                  # Zod schemas discriminated union peste 9 tipuri de exercițiu
      generate.ts               # Pipeline AI generation + retry + fallback
      validators.ts             # Scoring deterministic
      aiCheck.ts                # Verificare răspunsuri alternative
      aiWritingFeedback.ts      # Marker Cambridge 4-criterii
      mistakeLog.ts             # Algoritm de update incremental al log-ului
      itemDetails.ts            # Mapare key→prompt/context/choices
      writing.ts, writingBrief.ts  # Spec Cambridge per parte de writing
    gemini/
      client.ts                 # chatJson + chatCompletion + JSON repair
      prompts.ts                # Toate prompt-urile structurate de generare
    supabase/                   # SSR + browser clients
    security/                   # Rate limiting (acum dezactivat)
  middleware.ts                 # Refresh session pe fiecare request
supabase/
  migrations/                   # 11 migrații SQL versionate
```

**Principii respectate:**
- **Separation of Concerns**: prompt-uri AI separat de logica de scoring; schema-uri separat de UI; server actions separat de componente.
- **DRY**: helpers reutilizabili (`describeExerciseItem`, `normalizeMistakeLog`, `runWithConcurrency`).
- **Single Source of Truth**: tipurile de exercițiu sunt definite o singură dată în `types.ts` și folosite pe ambele părți (server + client).

### 2.4 Arhitectura datelor (Cap. I, *Arhitectura datelor*)

11 migrații SQL versionate definesc schema (`supabase/migrations/0001_init.sql` … `0011_auth_rate_limit.sql`):

| Tabel | Rol |
|-------|-----|
| `profiles` | Profil per user (legat 1-1 de `auth.users`) |
| `history` | Fiecare attempt: exercise (JSONB), user_answers (JSONB), per_item (JSONB), score, max_score, mistake_log (JSONB) |
| `custom_drill_sets` | Seturi reutilizabile de greșeli alese de user — items: `Array<{attemptId, itemKey}>` |
| `api_usage` | Contoare AI per user (per minut + per zi) |
| `auth_rate_limit` | Anti brute-force pe login |

**Decizii de proiectare:**
- **JSONB pentru `exercise` și `user_answers`**: structuri eterogene (Part 1 are 8 gaps, Part 7 are 10 prompts) → JSONB e mai natural decât 7 tabele paralele.
- **Validare Zod la fiecare citire**: schema `exerciseSchema` ca discriminated union peste 9 variante (`use_of_english_part1–4`, `reading_part5–7`, `writing_part1–2`), garantând că nu poate intra niciodată un exercițiu malformat în render.
- **RLS pe toate tabelele**: `auth.uid() = user_id` — utilizatorii nu pot citi sau scrie pe rândurile altora, *forțat la nivel de PostgreSQL*, nu doar la nivel de cod aplicație.

### 2.5 Design patterns (Cap. I, *recurgerea la șabloane de proiectare*)

- **Discriminated Union (sum type)**: `Exercise = Part1Cloze | Part2Cloze | ... | WritingPart2`. Garantează exhaustivitate la `switch`-uri.
- **Strategy Pattern**: `partInstructions(part)` și `partInstruction(part)` returnează strategia de generare AI per parte.
- **Repository Pattern**: `loadSimilarMistakeSource()`, `getMistakeLog()` etc. izolează accesul la Supabase de logica de business.
- **Worker Pool / Bounded Concurrency**: `runWithConcurrency(items, limit, worker)` în `actions/practice.ts` pentru a apela AI-ul în paralel limitat (4 simultan) pentru drill set generation.
- **Retry with Exponential Cooldown**: 3 încercări cu temperaturi descrescătoare `[0.75, 0.55, 0.35]` pe generare drill, plus fallback la întrebarea originală — *niciodată nu eșuează complet*.
- **Discriminated State Machine** în UI: `Phase = "loading" | "ready" | "grading" | "graded" | "error"` în `SimilarMistakePracticeSession` previne tranziții ilegale (e.g. "grade" while "loading").

### 2.6 Scalabilitate (Cap. I, *Scalabilitatea*)

- **Stateless server actions** + **Vercel Serverless** → scalare orizontală automată.
- **Supabase** scalează separat (pooler de conexiuni + read replicas la nevoie).
- **AI rate limiting per user în PostgreSQL** (migration `0010_api_usage.sql`) cu funcția SQL `consume_ai_quota(p_minute_cap, p_day_cap)` care e atomică — corectă sub concurency.
- **Bounded concurrency pe AI calls** (4 simultan/utilizator) limitează cost și protejează quota OpenRouter.
- **JSON repair tolerant**: dacă AI-ul returnează JSON parțial, `chatJson` extrage primul obiect `{...}` balansat — sistemul rezistă la output-uri parțial corupte.

### 2.7 Sistem de management de cod (Cap. I, *Folosirea unui sistem de management*)

- Repository Git pe GitHub, branch `master` protejat.
- Commit-uri descriptive ("Polish similar-practice prompts and add Drill Sets practice CTA"), nu "wip" sau "fix".
- Co-autoring marcat (Claude Code) — transparență față de juriu privind contribuția proprie.
- Vercel autodeploy din `master`, preview deploy automat pentru fiecare branch.

### 2.8 Performanță (Cap. I, *Performanța aplicației*)

- **React Server Components**: layout-ul, dashboard-ul, paginile statice nu trimit JS la browser → bundle minim pentru cele mai vizitate pagini.
- **Streaming SSR**: `loading.tsx` per route pentru feedback imediat.
- **Suspense pe componente client**: `Suspense` pentru `SimilarMistakePracticeSession`.
- **revalidatePath** doar pe path-urile afectate (`/dashboard/mistakes`, `/dashboard/history/${id}`) — nu invalidăm tot.
- **Prefetch pe NavPill links** pentru navigare instantanee între tab-uri.
- **Edge cache Vercel** pentru asset-uri statice.
- **Interogare eficientă**: index-uri SQL pe `(user_id, created_at)` la `history` și `custom_drill_sets`. Vezi `0004_optimize_history_rls.sql`.

### 2.9 Testare (Cap. I, *Testare*)

**Stare actuală — punct slab de adresat înainte de concurs:**
- Testare manuală end-to-end făcută pe Vercel preview.
- TypeScript strict + Zod ca *type-driven testing*: invariantele sunt verificate la runtime de schema-uri pe fiecare citire de la DB sau AI.
- Nu există unit tests automatizate.

**Recomandare:** adăugare **Vitest** + 5–10 unit tests pe `validators.ts` (scoring), `mistakeLog.ts` (update incremental), `itemDetails.ts` (prompt extraction) înainte de prezentare. Sunt funcții pure ușor de testat. Timp estimat: 2 ore.

---

## 3. Funcționalități și utilitate (Capitolul II, 20 puncte)

### 3.1 Lista funcționalităților principale

1. **Generare exerciții AI pe toate cele 9 părți Cambridge** (Reading & UoE Part 1–7 + Writing Part 1–2), la 5 niveluri (KET, PET, FCE, CAE, CPE) = **45 combinații**.
2. **Corectare automată deterministică** pentru reading/UoE; **scoring rubrică Cambridge 4-criterii** pentru writing.
3. **Verificare AI a răspunsurilor alternative** (e.g. user răspunde "have to do" când cheia spune "must do" — AI decide dacă e acceptabil).
4. **Mistake Log persistent** — fiecare greșeală e salvată cu primul răspuns, ultimul răspuns, ora primei și ultimei greșeli, status resolved/dismissed.
5. **Drill Sets personalizate** — user selectează greșeli din log și le grupează într-un set reutilizabil.
6. **Practice Similar** — la fiecare greșeală, AI generează exerciții similare fresh (același skill, conținut nou). Implementat cu bounded concurrency + retry + fallback la întrebarea originală.
7. **Redo Originals** — utilizatorul re-răspunde la exact aceleași întrebări greșite.
8. **Feedback detaliat writing**: per criteriu, 4–6 bullet points cu citate din răspunsul utilizatorului + sugestii concrete de rescriere.
9. **Tab-uri pe dashboard**: Greșeli (grupate pe nivel + parte, cu accordion), Drill Sets, Completed Papers.
10. **Confirmare email** + **reset parolă** + **rate-limiting login**.

### 3.2 Originalitate și concordanță cu tema

- Tema declarată: "platformă de pregătire pentru examene Cambridge". Toate cele 9 părți oficiale Cambridge sunt acoperite — **nu e doar o demonstrație pe 1-2 părți**.
- Spec-urile oficiale Cambridge (word range, număr de întrebări per parte, distractor în Part 6, structura key-word transformation) sunt encodate în `src/lib/exercises/types.ts` și aplicate strict — exercițiile generate au formatul corect.

### 3.3 Management al conținutului

- Toate exercițiile generate sunt persistate în `history` ca JSONB — utilizatorul poate reveni la orice paper completat.
- Mistake log e incremental: nu rescriem tot la fiecare update, doar entry-urile afectate (vezi `updateMistakeLog`, `updateSimilarPracticeLog` în `mistakeLog.ts`).

### 3.4 Calitatea și corectitudinea conținutului

- Prompt-urile AI conțin *calibrări per nivel CEFR* (`WRITING_LEVEL_RUBRIC` în `writing.ts`) — KET pretinde structuri simple, CPE pretinde nuanță avansată.
- Validare strictă post-generare: dacă AI-ul nu respectă numărul de gap-uri (Part 1 trebuie să aibă exact 8 gap-uri), generarea este refăcută.

---

## 4. Interacțiunea cu utilizatorul + design (Capitolul III, 20 puncte)

### 4.1 Compoziție și unitate vizuală

- Sistem de design **complet original** (paleta sand/moss/clay — `#5D7052` verde măslin, `#C18C5D` lut, `#E6DCCD` nisip, `#2C2C24` cărbune). Nu e bazat pe un Tailwind UI Kit sau template.
- Tipografie: `font-display` (display serif) pentru titluri + `font-sans` pentru text — contrast vizual clar.
- Componente reutilizabile: `Button`, `Card`, `Section`, `NavPill`, `BlobField`, `Logo` — toate scrise de la zero în `src/components/ui/`.
- Animații organice (`ease-organic`) pe hover/active states.

### 4.2 Ergonomie și navigabilitate

- **Top nav prefetch** — link-urile sunt pre-încărcate la hover pentru navigare instantanee.
- **Optimistic UI** — link-ul devine activ vizual înainte ca navigarea să se termine.
- **Sticky Grade button** pe sesiunea de drill — utilizatorul nu pierde controlul când scroll-ează.
- **Loading skeleton + spinner** la generarea drill-urilor AI — utilizatorul vede progresul, nu un ecran alb.
- **Underlined blank rendering** — în prompt-uri tip cloze, gap-ul e desenat ca underline real, nu ca text `[gap1]`.
- **"Missing paragraph" placeholder** pentru Part 6 gapped text — render vizual al gap-ului, nu literal `[gap]`.

### 4.3 Accesibilitate (Cap. III, *Asigurarea accesibilității*)

- **Semantic HTML**: `<section>`, `<header>`, `<nav>`, `<button>` cu `type` corect, `<label htmlFor>` pe input-uri.
- **Focus rings vizibile** (`focus-visible:ring-2 focus-visible:ring-[#5D7052]`).
- **Contrast WCAG AA**: textul `#2C2C24` pe `#FDFCF8` are ratio 14:1; secundarul `#78786C` pe alb e ~5:1.
- **aria-labels** pe butoane fără text (e.g. hamburger menu).
- **Keyboard navigation**: toate acțiunile sunt accesibile cu Tab + Enter.
- **Zoom safe**: layout-ul folosește `rem`/`em`, nu pixel fix → zoom browser funcționează corect.

**Punct de îmbunătățit:** suport explicit pentru screen reader pe `Phase` transitions (announce live region) și pentru i18n (acum doar engleză). Recomand `aria-live="polite"` pe statusul "Generating..."/"Graded".

### 4.4 Responsive & cross-platform (Cap. III, *design adaptiv/responsiv*)

- **Mobile-first Tailwind** — toate componentele au breakpoint-uri `sm:`, `md:`, `lg:`.
- **NavPill cu hamburger menu** sub `md:` (1 click → meniu vertical).
- **Tabele cu `overflow-x-auto`** → scroll orizontal pe mobile fără rupere.
- **Flex-wrap pe action buttons** → controalele se aranjează pe 2 rânduri pe ecrane înguste.
- Testat pe Chrome, Firefox, Edge (cele 3 motoare moderne).

### 4.5 Standarde web (Cap. III, *Independența de platformă*)

- HTML5 + ES2022 (Next.js compilează la target standard).
- CSS Grid + Flexbox — fără hacks pre-2018.
- Fără jQuery, fără polyfills custom.

---

## 5. Originalitate (Capitolul IV, 15 puncte)

### 5.1 Originalitatea ideii

- Există platforme generice de practică Cambridge (Cambridge.org, Magoosh) — toate folosesc **bănci finite de întrebări**. ExamCraft este, după cunoștința noastră, **prima platformă publică care generează exerciții Cambridge nelimitat cu LLM și menține un mistake log longitudinal cu drill personalizat**.
- Algoritmul "Practice Similar" — pentru fiecare greșeală, prompt-ul include contextul original (titlu, parte, răspunsul utilizatorului, răspunsul corect) plus instrucțiunea de a genera o exercițiu *similar* dar nu identic. Asta forțează modelul să identifice abilitatea subiacentă (collocation, gramatical pattern, reading move) și să o testeze într-un alt context — nu doar parafrazare.

### 5.2 Originalitatea designului

- Paleta de culori "earthy" (verde-măslin / lut / nisip) — neobișnuită pentru un edtech (de obicei albastru/violet corporate). Aleg deliberat estetic pentru a evoca un manual de bibliotecă, nu o aplicație SaaS.
- Componenta `BlobField` — forme organice generate cu CSS pure ca background — în loc de gradient-uri standard.
- Toate iconițele și logo-ul (`LogoMark`) sunt SVG-uri proprii.

### 5.3 Originalitatea implementării

- **Discriminated union exhaustivă peste 9 tipuri de exercițiu** — abordare type-driven nedimișnuită în proiecte JS/TS la nivel liceal.
- **JSON repair tolerant** scris de la zero (`extractFirstJsonObject` în `client.ts`) — extrage primul obiect `{...}` balansat dintr-un text murdar. Important pentru robustețe AI.
- **Coerce payload AI** (`coerceSimilarDrillPayload`) — normalizează variațiile de output AI (`"multiple-choice"` → `"choice"`, `options` → `choices`, `answer` → `correctAnswer`) — reduce drastic eșecurile de validare Zod.
- **Algoritm de fallback drill**: dacă toate retry-urile AI eșuează, construim un drill din întrebarea originală — utilizatorul nu rămâne niciodată fără conținut.

---

## 6. Securitate (Capitolul V, 10 puncte)

### 6.1 Autentificare

- **Supabase Auth** cu email + parolă; parolele nu sunt niciodată stocate în text clar (hash bcrypt server-side).
- **Confirmare email** la signup (`emailRedirectTo` în `src/app/(auth)/actions.ts`).
- **Reset password flow** complet (request reset + update password) — pagini dedicate, link cu token expirabil.
- **Auth rate limit** propriu (migration `0011_auth_rate_limit.sql`) — limitează încercările de login per IP/email pentru a preveni brute-force.

### 6.2 Autorizare

- **Row-Level Security (RLS)** pe TOATE tabelele cu date personale (`history`, `custom_drill_sets`, `api_usage`, `profiles`):
  ```sql
  CREATE POLICY "users see own rows" ON history
    FOR SELECT USING (auth.uid() = user_id);
  ```
- Forțat la nivel PostgreSQL: **chiar dacă un atacator bypassează codul aplicație** (ex: SQL injection în alt endpoint), nu poate citi date ale altui user.

### 6.3 Validare input (Cap. V, *Prevenirea și/sau corectarea datelor eronate / malițioase*)

- **Zod schemas** pe fiecare input de Server Action:
  ```ts
  const refs = (input.items ?? [])
    .map((item) => ({
      attemptId: String(item?.attemptId ?? "").trim(),
      itemKey: String(item?.itemKey ?? "").trim(),
    }))
    .filter((item) => item.attemptId && item.itemKey);
  ```
- Limitări dimensionale: `if (refs.length > 20) return { error: ... }` — previne DoS prin batch uriaș.
- **String coercion + trim** sistematică pe orice input venit de la utilizator înainte de a-l folosi în query.

### 6.4 XSS prevention

- **React escapează automat** orice valoare interpolată în JSX. Nu folosim `dangerouslySetInnerHTML` nicăieri.
- Conținutul user-generated (răspunsuri, eseuri) e render-uit ca text pur.

### 6.5 SQL injection prevention

- Folosim exclusiv **Supabase client cu parametrized queries** (`.eq()`, `.match()`) — nu construim niciodată string-uri SQL cu concatenare.
- Migrațiile folosesc `SECURITY DEFINER` cu atenție; funcția `consume_ai_quota` validează input-ul înainte de a executa.

### 6.6 CSRF

- **Server Actions Next.js au protecție CSRF nativă** prin token în request body (validate cross-origin).
- Cookie-urile de sesiune sunt `httpOnly` + `secure` + `SameSite=Lax` (default Supabase Auth).

### 6.7 Securitate API externă

- `OPENROUTER_API_KEY` doar în env server, **niciodată trimisă la client**.
- `chatCompletion` adaugă `HTTP-Referer` și `X-Title` pentru tracking corect pe partea OpenRouter.
- Toate apelurile AI au **timeout** explicit (`AbortSignal.timeout(22000)`) → nu putem fi blocați indefinit.

### 6.8 Defensive programming

- **Type-driven** validare la fiecare graniță: DB → Zod → cod, AI → Zod → cod.
- **Fail-open în mod controlat**: dacă RPC-ul de quota eșuează, aplicația permite request-ul (fail-open) dar logează — preferăm UX bun la indisponibilitate temporară Supabase.
- **No unsafe casts** — folosim `safeParse`, nu `parse`, peste tot.

---

## 7. Performanță și optimizări (suplimentar la Cap. I)

| Metrica | Valoare | Notă |
|---------|---------|------|
| Lighthouse Performance (mobile) | TBD — măsurat înainte de prezentare | Aim ≥ 85 |
| Lighthouse Accessibility | TBD | Aim ≥ 95 |
| First Contentful Paint | ~1.2s pe 4G | Datorat RSC + edge cache |
| Bundle JS client (dashboard) | ~80KB gzipped | RSC reduce drastic |
| AI latency (single drill) | ~3–6s | Gemini 3.5 Flash, 900 max tokens |
| AI latency (batch 3 drills) | ~5–8s | Cu bounded concurrency 4× paralel |

**Optimizări specifice:**
- Server Components: dashboard-ul, mistakes hub-ul, ScoreSummary — toate sunt RSC, 0 JS la client.
- **Code splitting automat** Next.js per route.
- **Imagini SVG inline** pentru logo — fără HTTP request suplimentar.
- **Critical CSS inlining** automat de Next.js.

---

## 8. Deployment și infrastructură

- **Vercel** — production deploy automat din `master`, preview deploy per branch.
- **Environment variables** segregate: `NEXT_PUBLIC_*` (publice), `OPENROUTER_API_KEY` / `SUPABASE_SERVICE_ROLE_KEY` (server-only).
- **Supabase** cu backup zilnic automat (gestionat de Supabase).
- **Git workflow**: dezvoltare locală → commit → push `master` → Vercel build → live în ~50 secunde.
- **Edge regions**: `iad1` (US East) — pentru latență minimă către OpenRouter și Supabase.

---

## 9. Demo flow (Capitolul VII — Prezentare, 10 puncte)

### 9.1 Plan de prezentare (15–20 minute)

| Min | Conținut |
|-----|----------|
| 0–2 | Problema: pregătirea Cambridge necesită zeci de teste, manualele sunt scumpe, băncile de întrebări sunt finite. |
| 2–4 | Demo home → login → dashboard (overview rapid). |
| 4–7 | **Demo Practice flow**: alege FCE → Part 1 → exercițiu generat live cu AI; răspunde, submit, vede scoring. |
| 7–9 | **Demo Writing**: scrie un paragraf scurt → submit → arată feedback Cambridge 4-criterii cu citate. |
| 9–12 | **Demo Mistakes Hub**: arată greșelile salvate, creează un Drill Set, click Practice Similar — arată că AI-ul generează exerciții *diferite* de cele originale dar care testează aceeași abilitate. |
| 12–14 | **Snapshot arhitectură**: schemele Zod, diagramul de arhitectură, RLS policies. Subliniază contribuția proprie (nu e CMS, nu e template). |
| 14–16 | **Securitate**: arată codul RLS, validarea Zod, lipsa `dangerouslySetInnerHTML`. |
| 16–18 | **Originalitate**: comparativ cu Cambridge.org / Magoosh. Algoritmul Practice Similar. |
| 18–20 | Q&A. |

### 9.2 Studii de caz pregătite

Pregătește 3 exemple concrete pentru demo (înregistrate cu conturi de test):

1. **Caz 1 — Vocabulary error pe FCE Part 1**: user a ales `make` în loc de `do` la "do homework"; AI generează 3 exerciții similare care testează tot collocations cu `make/do/take`.
2. **Caz 2 — Writing email informal CAE**: user scrie un email prea formal; feedback AI quoțează linia "I would be most grateful if you could" și sugerează "Could you...?".
3. **Caz 3 — Gapped Text FCE**: user pune paragraf D unde ar fi trebuit C; AI generează un alt gapped text cu același tip de coeziune referințială.

### 9.3 Documentație

- README cu instrucțiuni de setup local (urmează să fie creat dacă nu există).
- Comentarii în cod **minimale și esențiale** — codul este auto-explicativ (TypeScript strict + nume descriptive).
- Acest document (`INFOEDUCATIE_PREZENTARE.md`).

---

## 10. Respectarea regulilor de jurizare

| Regulă din barem | Status |
|---|---|
| "Nu vor fi punctate părțile preluate din alte surse" | **Aplicabil**: am declarat folosirea Next.js 15, Supabase, Tailwind, OpenRouter SDK, Zod. Tot codul aplicație (componente, server actions, schema-uri, design system, prompt-uri AI, algoritmi) este scris de la zero. |
| "Dacă design preluat integral, portabilitate = 0" | **OK**: design 100% propriu. Niciun Tailwind UI Kit, niciun shadcn (deși estetic seamănă cu shadcn, componentele sunt scrise de la zero — verificabil în `src/components/ui/`). |
| "Dacă CMS folosit fără cod propriu, inginerie Web = 0" | **OK**: NU folosim CMS. Direct Next.js + Supabase + cod propriu. |
| "Adaptarea unui framework existent: contribuție ≥50%" | **OK**: Next.js furnizează routing + RSC + Server Actions; tot codul de business (mistake log, drill sets, AI orchestration, scoring, prompt engineering, writing rubric) este original. Contribuție proprie estimată >> 90%. |

---

## 11. Punct slabe identificate (de adresat înainte de jurizare)

Onestitate față de juriu — recomand acoperirea acestor puncte:

1. **Lipsa unit tests automatizate** (Cap. I, *Testare*). *Acțiune*: adaugă 8–10 teste Vitest pe funcțiile pure din `validators.ts`, `mistakeLog.ts`, `itemDetails.ts`. ~2 ore.
2. **i18n minimal — doar engleză** (Cap. III, *internaționalizare*). *Acțiune*: extrage string-urile UI într-un singur fișier `messages.ts` cu funcție `t(key)` — chiar fără traducere efectivă, infrastructura demonstrează intenția. ~1 oră.
3. **README în repo lipsește** (Cap. VII, *Documentația*). *Acțiune*: README cu setup + screenshots + arhitectură. ~30 min.
4. **Lighthouse scores neraportate**. *Acțiune*: rulează Lighthouse pe mobile + desktop, salvează scorurile, include screenshot-uri în prezentare. ~30 min.
5. **No screen-reader test**. *Acțiune*: testează cu NVDA (gratuit) pe fluxul principal, adaugă `aria-live` pe statusurile dinamice. ~1 oră.

**Buget total recomandat:** 5 ore de îmbunătățiri înainte de prezentare = ~+8–10 puncte estimate la barem.

---

## 12. Estimare punctaj per capitol

| Capitol | Punctaj maxim | Estimare ExamCraft AI | Justificare |
|---------|---------------|------------------------|-------------|
| I. Inginerie Web | 25 | **22** (24 cu teste adăugate) | Arhitectură solidă, RSC, type-driven, DB schema curată, retry/fallback patterns. -3 lipsă unit tests. |
| II. Funcționalități | 20 | **18** | Acoperă toate 9 părți Cambridge × 5 nivele, mistake log + drill sets + similar drills sunt 3 features substanțiale. |
| III. Design + UX | 20 | **16** (18 cu i18n + a11y improvements) | Design original, responsive, ergonomie bună. -4 lipsă suport screen reader explicit și i18n. |
| IV. Originalitate | 15 | **13** | Algoritmul Practice Similar + prompt engineering Cambridge + paletă originală + JSON repair. |
| V. Securitate | 10 | **9** | RLS strict + Zod + rate limit + no XSS surface + parametrized queries. -1 lipsă CSP header explicit. |
| VII. Prezentare | 10 | **8** (10 cu README + Lighthouse) | Demo flow clar, dar README lipsește. |
| **TOTAL** | **100** | **86–93** | Range depinde de finisarea celor 5 puncte slabe. |

---

## 13. Întrebări de juriu anticipate

Pregătește răspunsuri pentru:

1. **"Cât din cod este scris de tine vs Claude Code/AI?"** → Răspuns onest: arhitectura, schema DB, design system, prompt engineering Cambridge, algoritmii de mistake log și drill set sunt deciziile tale; codul este scris în pereche cu Claude Code (transparent în commit-uri prin `Co-Authored-By`). Subliniază: AI-ul nu poate decide că Part 1 are 8 gap-uri sau că writing-ul se evaluează pe 4 criterii — tu ai specificat asta, AI-ul a scris boilerplate-ul.

2. **"Ce face aplicația ta diferit de ChatGPT cu un prompt?"** → Persistarea mistake log-ului longitudinal, drill set personalizat reutilizabil, scoring deterministic pe răspunsuri obiective (un LLM ar putea spune fals "corect"), conformare cu spec-ul Cambridge strict (8 gap-uri, distractor specific).

3. **"De ce Next.js 15 / React 19?"** → RSC reduc bundle-ul, Server Actions elimină boilerplate-ul API REST, streaming SSR îmbunătățește FCP.

4. **"De ce Gemini, nu GPT-4?"** → Cost (10× mai ieftin pentru același quality tier pe sarcini de generare); latency mai mică; OpenRouter permite swap fără modificări de cod.

5. **"Cum gestionezi cazul când AI-ul halucinează un răspuns greșit?"** → Validare Zod schema → fallback la întrebarea originală + verificare răspunsuri alternative cu un al doilea apel AI.

6. **"Cum scalează la 10.000 de utilizatori?"** → Vercel scalează automat, Supabase poate adăuga read replicas, RLS e index-aware, AI-ul e bottleneck-ul real (OpenRouter quota) — strategiile: caching pe exerciții generate pentru combinații exam×part populare, queue cu prioritizare.

---

## Anexă A: Lista commit-urilor relevante (cronologic)

Pentru juriu — dovadă a evoluției și efortului:

```
60a7e5c1 Make mistake parts collapsible accordion sections
f401932c Add contextual drill generation and auth improvements
f12c59e4 Wire Supabase auth and confirmation emails
5254482c Refine writing briefs and Cambridge alignment
a3d87c41 Build mistakes hub and harden similar-drill generation
a38b939b Polish similar-practice prompts and add Drill Sets practice CTA
16b80a87 Replace [gap] tokens in similar-drill passages with visual placeholders
753ddd15 Tighten layout spacing and unblock nav during similar-drill generation
a199d8c1 Harden AI JSON parsing, retry drill generation, move regenerate CTA
8520c6b5 Move drill-set types out of the use-server file
eddedfbc Polish Practice Similar: drop in-session chrome, add review, 3 end CTAs
1417496d Remove daily AI usage cap
b1213c1c Fix Practice Similar regenerating after Grade instead of showing results
bc017abf Make similar-drill generation bulletproof with coercion and fallback
b52f690b Bump to gemini-3.5-flash and richen writing feedback notes
```

(Lista completă: `git log --oneline`)

---

## Anexă B: Glosar pentru juriu

- **RSC** = React Server Components — componente care se randează pe server și nu trimit JS la browser.
- **Server Action** = funcție Next.js care rulează pe server, apelată direct din componente client ca o funcție normală.
- **RLS** = Row-Level Security — restricții PostgreSQL care filtrează rândurile vizibile per user.
- **Zod** = bibliotecă de validare TypeScript-first cu inferință de tip automat.
- **Discriminated Union** = tip TypeScript care permite enumerarea exhaustivă a variantelor (e.g. `type Exercise = Part1 | Part2 | ... | WritingPart2`).
- **Bounded Concurrency** = limitare a numărului de operații paralele.
- **CEFR** = Common European Framework of Reference for Languages (A1–C2). Cambridge KET = A2, PET = B1, FCE = B2, CAE = C1, CPE = C2.
