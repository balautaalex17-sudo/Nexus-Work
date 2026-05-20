# ExamCraft AI

ExamCraft AI is a Next.js 15 app for generating Cambridge CAE (C1) and CPE (C2) practice exercises with Gemini 2.5 Flash, then scoring and reviewing completed attempts.

## Setup

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment template:
   ```bash
   cp .env.local.example .env.local
   ```
4. Fill `.env.local` with your Supabase and Gemini keys.

## Supabase setup

1. Create a Supabase project.
2. Run the SQL migration at `supabase/migrations/0001_init.sql` in the SQL editor.

## Run locally

```bash
npm run dev
```

## Deploy to Vercel

1. Import this repo in Vercel.
2. Add all values from `.env.local.example` to Vercel project environment variables.
3. Push to your default branch and deploy.
