# Family Deposit Tracker — Project Context

A small PWA for one family to track money deposited at a shop, the monthly
2% interest each deposit earns, and withdrawals — of interest or of the
underlying principal. Used only by the family (a handful of people sharing
one login) — this is not a shop-facing or customer-facing app.

Sibling project: **MIG Stock** (a hardware shop's stock/sales app). This app
deliberately shares MIG Stock's visual language (see "Design direction"
below) but is a **separate app, separate repo, separate Supabase project** —
there is no shared codebase or shared database between them. If you're ever
tempted to import something from MIG Stock directly, don't — copy the
*pattern*, not the code, since the domains are unrelated.

## Stack

- React (Vite) + TypeScript + MUI, built as a PWA
- Supabase: Postgres DB, Auth (no Storage needed yet)
- Hosting: GitHub -> Vercel (auto-deploy on push), free tier
- No charts library yet (Analytics uses simple progress bars, not graphs) —
  Recharts can be added later if trend charts are wanted
- No serverless functions yet — this app has no AI chatbot / API routes,
  unlike MIG Stock's `/api/chat`

## The core concept (read this before touching any calculation code)

Each **deposit** is an independent, self-contained "note":

- Has its own principal amount and deposit date.
- Earns interest = `interest_rate` (currently always 2%, but stored
  per-deposit, see below) of its **current outstanding principal**, paid
  out monthly, due the day AFTER the same day-of-month as the deposit date
  (e.g. deposited 5 May -> due 6 June, 6 July, ...), starting the month
  after the deposit was made. The +1 day exists because a full month must
  *fully elapse* before interest is collectible — due 5 June would mean
  only 30 days, not a complete month, have passed since 5 May. See
  `src/lib/dates.ts` -> `nextMonthSameDay` (still returns the plain
  same-day-of-month anniversary) and `src/lib/ledger.ts` ->
  `computeMissingPayouts` (adds the 1-day offset only on the stored
  `due_date`, while the internal loop keeps stepping the anniversary chain
  itself — offsetting before stepping would compound the shift forward by
  a day every cycle).
- Keeps paying every month until withdrawn — a `status` flips from
  `active` to `closed` once its outstanding principal hits zero.
- **Only full withdrawal is allowed (reversed from v1's original design —
  see below).** Withdrawing a deposit's principal always withdraws the
  entire outstanding amount and closes it in the same action; there is no
  partial-withdrawal amount field in the UI. `submitWithdraw` in
  `src/pages/MemberDetail.tsx` always passes `outstanding(deposit)` as the
  amount, never a user-typed value.

A family member can have **multiple concurrent deposits**, each running its
own independent monthly cycle. E.g. someone deposits 1,00,000 in August and
another 1,00,000 in September — those are two separate deposit rows, each
paying out on its own day of the month, tracked completely independently.

### Snapshotting — the rule that keeps the ledger honest

`interest_payouts.amount` is calculated ONCE, at the moment the row is
generated, using the deposit's outstanding principal **as of that specific
due date** (i.e. only counting withdrawals dated on or before the due
date). It is never recalculated afterward. So if a withdrawal happens
*after* a payout's due date but *before* it's been collected, that pending
payout keeps its original amount — only the *next* cycle's payout reflects
the reduced principal. This mirrors MIG Stock's `unit_price_at_sale`
snapshot pattern: never let a later edit rewrite an earlier, already-settled
number.

See `src/lib/ledger.ts` (`computeMissingPayouts`, `outstandingAsOf`) for the
implementation — it's a pure function, deliberately free of any Supabase
calls, so the cycle-generation math can be reasoned about (and unit tested)
in isolation from the data layer.

### Day-of-month edge case (explicit default — confirm before changing)

If a deposit date is the 29th/30th/31st and a shorter month comes around
(e.g. deposited on the 31st, next month is February), the underlying
monthly **anniversary clamps to the last day of that month** (e.g. Feb
28th) rather than rolling forward into March — this was an explicit
design default, not requirement-driven — flag it to the owner before
changing (`src/lib/dates.ts` -> `nextMonthSameDay`). The stored `due_date`
is then one day after that clamped anniversary (see above), so a deposit
on the 31st due into February shows a `due_date` of **1 March**, not Feb
28th or Mar 1st-rolled-forward-from-31 — the clamp and the +1-day
collectibility offset are independent, applied in that order.

### Break-even analytics (Analytics page)

- **Total invested** = sum of every deposit's *original* principal, not
  reduced by withdrawals — the total money ever put in.
- **Pending to break even** = `max(0, invested - (withdrawn + interest
  collected))`.
- **Estimated time to break even** = pending ÷ current monthly interest
  run-rate (2% of whatever's still outstanding across *active* deposits
  right now). This is a **frozen-snapshot estimate** — it assumes today's
  outstanding balances stay level. If more principal gets withdrawn later,
  the real time-to-break-even will stretch out, since less capital keeps
  earning. We deliberately do not try to model or predict future withdrawal
  behavior — don't "fix" this to be a smarter forecast without asking the
  owner first, it was a conscious scope decision.
- If a deposit is fully withdrawn but never broke even, this shows
  "No active deposits earning interest" rather than a fake countdown.

## Database schema (`supabase/schema.sql`)

- **`family_members`** — id, name, phone, note.
- **`deposits`** — member_id, `principal_amount` (integer paise), stored
  per-deposit `interest_rate` (always 0.02 today, but per-deposit means a
  future rate change never rewrites an existing deposit's terms —
  same reasoning as MIG Stock's per-type `default_discount`), `deposit_date`,
  `status` (`active`/`closed`, flipped automatically once outstanding
  principal hits zero — see `useFamilyData`'s auto-close logic).
- **`withdrawals`** — the schema still allows multiple rows per deposit
  (no DB-level constraint limiting it to one), but the app now only ever
  inserts a single row per deposit, equal to its full outstanding
  principal — partial withdrawal was explicitly disallowed after v1 (the
  owner tried a partial withdrawal and asked for it to be blocked; only
  full-withdrawal-and-close is offered now). `collected_by` is **any**
  family member, not locked to the depositor — the family explicitly
  wanted "one person collects for everyone" support.
- **`interest_payouts`** — one row per monthly cycle. `amount` is
  snapshotted (see above). `status` is `pending`/`collected`.
  `unique (deposit_id, due_date)` prevents ever double-generating the same
  cycle.
- **`deposit_balances`** view — a convenience for direct SQL/reporting
  only. The app itself computes outstanding balances client-side from the
  raw ledger tables (same math the view does), so the two can never drift
  — **don't build a second, different balance-calculation path** against
  this view; if the app ever needs server-side balance math, make it call
  the same logic `outstanding()`/`outstandingAsOf()` express, not
  reinvent it in SQL.

**Money is integer paise everywhere, never floats** — identical convention
to MIG Stock. `fmtMoney()` (`src/lib/money.ts`) divides by 100 only for
display; `rupeesToPaise()` converts form input the other way. If you ever
see a raw number that looks 100x too small or too large somewhere, this is
the first thing to check — it bit us once already during prototyping
(seed data was entered in rupees instead of paise).

## Payout generation — lazy, not cron-based

There is **no scheduled job** generating monthly `interest_payouts` rows.
Instead, `useFamilyData`'s `load()` function runs on every app load /
refresh: for every active deposit, it walks forward from the last
generated cycle (or from the deposit date if none exist yet) and inserts
any cycles that have come due since the last check
(`computeMissingPayouts` in `src/lib/ledger.ts`). This was a deliberate
choice over a Vercel Cron job, since:

- The family only needs "next due" to be *visible* when they open the app,
  not proactively notified — no reminders were requested for v1.
- It avoids an extra moving part (cron config, a serverless function that
  runs unattended) for an app used by 2-3 people.

If reminders/notifications are ever added, this is the piece that would
need to move server-side (e.g. a daily Vercel Cron function) so it can run
even when nobody has the app open.

## Auth

- **Single shared login** (the whole family uses one email/password) —
  same pattern as MIG Stock, but this v1 does **not** have MIG Stock's
  `settings.auth_enabled` toggle-off convenience feature. Login is always
  required. If that toggle is wanted later, mirror MIG Stock's approach:
  a `settings` table with a boolean, RLS staying enforced regardless of
  what the toggle shows.
- RLS (`auth.role() = 'authenticated'`) is the real security boundary on
  every table, same philosophy as MIG Stock. There is no per-user data
  partitioning — it's one family's shared ledger, not multi-tenant.

## Design direction — reused directly from MIG Stock, not reinvented

This app deliberately uses the **exact same visual language** as MIG
Stock's native-mobile redesign (see MIG's own `CLAUDE.md` "Design
direction" section for the full rationale) — same brand, different app.
Copied directly into `src/theme.ts`:

- Amber primary `#C97A2B` (light `#E0A461` / dark `#9C5D1E`), gradient
  `linear-gradient(135deg,#E0A461 0%,#C97A2B 60%,#9C5D1E 100%)` on primary
  CTAs.
- Dark mode: zinc-950 bg (`#09090b`), zinc-900 cards (`#18181b`), zinc-800
  border (`#27272a`). Light mode: zinc-50 bg (`#fafafa`), white cards,
  slate text. `getModeTokens(mode)` in `theme.ts` is the single place these
  live — don't hardcode a hex value in a component; read from
  `useTheme().palette` / the tokens, the way every page here already does.
- Space Grotesk (headings) / Inter (body) / **JetBrains Mono for every
  numeric value** (money, counts) — `monoSx` exported from `theme.ts`,
  apply it to any `Typography` showing a number.
- `theme.shape.borderRadius = 16` (rounded cards), pill-ish buttons/chips.
- Custom 2px-stroke line icon set (`src/icons/Icon.tsx`) — **not** MUI's
  icon library, matching MIG Stock's custom icon approach. Add new icons
  there as new screens need them, using real `<circle>`/`<rect>`/`<path>`
  elements (a JSX fragment per icon name) — don't try to encode multiple
  shapes into one path string, it breaks relative-coordinate commands.
- Bottom sheets (`src/components/BottomSheet.tsx`, wraps MUI's
  `SwipeableDrawer`) instead of modal dialogs, for "Add deposit", "Log
  collection", "Withdraw principal" — same native-mobile pattern as MIG's
  Receipt/Share sheet.
- Sun/moon theme toggle in the top bar (`src/lib/themeMode.tsx`,
  `useThemeMode()`), persisted to `localStorage` (key
  `family-deposit-theme-mode`), falling back to OS
  `prefers-color-scheme` on first visit.
- Bottom tab bar: Home / Family / Collect / Analytics
  (`src/components/Layout.tsx`).

## What's built (v1 — this handoff)

- Full schema in `supabase/schema.sql` (fresh-install, run once in the
  Supabase SQL editor)
- Real Supabase auth (`src/pages/Login.tsx`) gating the whole app
  (`src/App.tsx`)
- `useFamilyData` (`src/data/useFamilyData.ts`) — the single data-fetching
  + mutation hook everything else uses. Fetches all four tables, assembles
  the nested `MemberWithDeposits[]` shape, lazily generates due payouts,
  auto-closes fully-withdrawn deposits, and exposes `addMember`,
  `addDeposit`, `collectPayout`, `withdrawPrincipal`, `deleteDeposit`.
- **Dashboard** — greeting header, swipeable "Family overview" slider (an
  "All family" card + one card per member, dot indicators), upcoming
  payouts list.
- **Family** — list-with-chevron of members (name, deposit count, total
  invested), "+ Add member" sheet.
- **Member detail** — summary stat row, "Add deposit" button/sheet, three
  tabs: **Deposits** (cards with outstanding amount, status, next due,
  "Withdraw principal" button/sheet, and a trash icon opening a "type
  delete to confirm" sheet that permanently deletes the deposit plus its
  withdrawals/payouts — see "What's NOT built yet" #1), **Interest
  collected** (history), **Principal withdrawn** (history).
- **Collections** — "Interest due" tab: payouts **grouped by family
  member**, each showing every deposit's due amount plus a member total,
  with **Collect only enabled once `due_date <= today`** (otherwise shown
  disabled with a "Not due yet" note) — this was a specific, deliberate ask,
  don't relax it back to "always collectible." "Withdrawals" tab: flat
  history across the family.
- **Analytics** — "Family" / "By member" tabs, each a card with
  invested/withdrawn, a recovered-percentage progress bar, pending-to-break-
  even amount, and the estimated time remaining (or "Break-even reached" /
  "No active deposits earning interest").
- **Settings** (reached via the hamburger menu icon, top-left of every
  screen — `src/components/Layout.tsx`) — two tools:
  - **Export data** (`src/lib/export.ts`) — downloads all four raw ledger
    tables (`family_members`, `deposits`, `withdrawals`, `interest_payouts`)
    as separate sheets in one `.xlsx` file, via SheetJS (same library MIG
    Stock uses). Each money column gets an extra human-readable `_rs`
    column alongside the authoritative paise value. This is a full backup,
    not a curated report — every column, unmodified.
  - **Mark Interest Collected Till Date** (`src/lib/historicalMigration.ts`,
    UI in `src/pages/Settings.tsx`) — for bulk-entering ~2 years of
    historical deposits and telling the system their interest was already
    physically collected, so Analytics/break-even reflect reality instead
    of showing years of "pending" interest that was actually settled long
    ago. Important nuance worth understanding before touching this code:
    **`useFamilyData.load()` already auto-generates PENDING payout rows for
    every overdue cycle, every time the app loads** (see "Payout
    generation" below). So by the time someone opens Settings after
    entering historical deposits, those months are NOT "missing" anymore —
    they already exist as `pending` rows. This feature's real job is to
    **bulk-flip existing pending rows to `collected`** (reusing their
    already-snapshotted amounts — no interest is ever recalculated here),
    plus a safety-net pass that calls the exact same `computeMissingPayouts`
    used by normal lazy generation, for the rare case a cycle genuinely has
    no row yet. `collected_by` is left `null` for anything this bulk action
    touches — there's no meaningful individual collector for a historical
    backfill; flag to the owner if a default collector should be attributed
    instead. Shows a per-member preview + total before doing anything
    (Cancel/Confirm), and a completion summary after (created / marked
    collected / skipped / errors). **Idempotent by construction**: run it
    twice in the same month and the second run finds 0 missing cycles and
    0 pending-and-due rows, so it does nothing; run it again next month and
    it only touches that one newly-due cycle.

## What's NOT built yet (known gaps, in no particular priority)

1. **Edit/delete** for withdrawals or payouts individually — still no
   correction flow for these. Family member **names** are one exception:
   "Edit names" in the hamburger menu (`src/components/Layout.tsx`) opens
   a sheet listing every member with an editable field, backed by
   `useFamilyData`'s `renameMembers` (batches only the rows that actually
   changed into one update, then a single reload). **Deleting a whole
   deposit** is the other exception: each deposit card on Member detail ->
   Deposits has a trash icon that opens a "type delete to confirm" sheet,
   backed by `useFamilyData`'s `deleteDeposit` — it deletes the deposit's
   `interest_payouts` and `withdrawals` rows first (no `ON DELETE CASCADE`
   in `schema.sql`), then the `deposits` row itself, then reloads. This is
   a hard delete with no undo, unlike "Mark Interest Collected Till Date"
   which only ever moves pending -> collected and never un-collects
   anything. There's still no way to edit/delete a *single* withdrawal or
   payout row without deleting the whole parent deposit — that still means
   going into the Supabase table editor directly.
2. **Reminders/notifications** for upcoming due dates — explicitly
   declined for v1 (see "Payout generation" above).
3. **PDF export** — not built (Excel export/backup is — see "What's
   built"). MIG Stock has a PDF-report pattern if that's wanted here later.
4. **The `settings.auth_enabled` toggle** MIG Stock has — this app always
   requires login in v1.
5. **Realtime updates** — `useFamilyData` refetches after every mutation
   but doesn't subscribe to Supabase Realtime, so if two people have the
   app open at once, one won't see the other's change until they trigger a
   refetch themselves (navigating, or any action that calls `load()`).
6. **Validation UI polish** — e.g. the withdraw form doesn't yet show an
   inline error if you type more than the outstanding principal (the hook
   silently caps it via `Math.min`); same for empty/invalid amounts on Add
   Deposit. Functionally safe, just not communicative yet.
7. **No automated tests** — `computeMissingPayouts`/`breakEvenStats`/
   `computeMarkInterestPreview` are all pure functions and are the
   highest-value candidates for unit tests, given how much money-math logic
   lives there.
8. **No "who should be the default collector" setting** for historical
   bulk-marked interest — currently always `null` (see "Mark Interest
   Collected Till Date" above). If the owner wants every historical record
   attributed to a specific person, this would need a small UI addition
   (a collector picker in the preview dialog) rather than a data-model
   change.

## Known simplification worth knowing about

`computeMissingPayouts` walks forward one month at a time from the last
generated cycle and stops as soon as it hits a cycle where
`outstandingAsOf(deposit, dueDate) <= 0` — i.e. once a deposit's fully
withdrawn as of a given cycle, no more payouts get generated for it, ever
(status flips to `closed` separately, in `useFamilyData`). If a deposit is
ever "reopened" (e.g. by deleting a withdrawal row directly in Supabase),
the app doesn't currently have a path to resume payout generation without
a manual nudge — this hasn't come up yet since there's no delete-withdrawal
UI, but worth knowing if that gets added.

## Local development

```bash
npm install
cp .env.example .env       # fill in your Supabase project URL + anon key
npm run dev
```

Run `supabase/schema.sql` once against a fresh Supabase project (SQL editor
-> paste -> Run) before first login. You'll need at least one user created
in Supabase Auth (Authentication -> Users -> Add user) for the shared
family login — there's no self-serve signup flow.
