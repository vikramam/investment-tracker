# Family Deposit Tracker

A PWA for tracking family deposits, monthly interest, and withdrawals.
React + Vite + TypeScript + MUI, backed by Supabase, deployed on Vercel.

**Start here:** [`CLAUDE.md`](./CLAUDE.md) — full project context, the
interest/break-even calculation rules, schema, and what's built vs. not.

## Quick start

```bash
npm install
cp .env.example .env   # fill in your Supabase project URL + anon key
npm run dev
```

Run `supabase/schema.sql` once against a fresh Supabase project before
first login, and create at least one user in Supabase Auth for the shared
family login.

## Deploying

Push to GitHub, import the repo in Vercel, set `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` as Vercel environment variables (same names as
`.env`), and Vercel auto-builds with `npm run build` / serves `dist/`.
