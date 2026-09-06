-- Family Deposit Tracker — fresh-install schema
-- Run this once against a new Supabase project (SQL Editor -> paste -> Run).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- family_members
-- ---------------------------------------------------------------------------
create table family_members (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  phone      text,
  note       text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- deposits — one row per deposit event. principal_amount is INTEGER PAISE,
-- never a float, same convention as MIG Stock's money handling.
-- interest_rate is stored per-deposit (not read from a global setting) so a
-- future rate change never rewrites the interest already promised on an
-- existing deposit — same "snapshot, don't rewrite history" principle used
-- for unit_price_at_sale in MIG Stock.
-- ---------------------------------------------------------------------------
create table deposits (
  id              uuid primary key default gen_random_uuid(),
  member_id       uuid not null references family_members(id) on delete cascade,
  principal_amount bigint not null check (principal_amount > 0),
  interest_rate   numeric not null default 0.02,
  deposit_date    date not null,
  status          text not null default 'active' check (status in ('active', 'closed')),
  created_at      timestamptz not null default now()
);

create index deposits_member_id_idx on deposits(member_id);

-- ---------------------------------------------------------------------------
-- withdrawals — principal withdrawals against a specific deposit. Partial
-- withdrawals are allowed, so a deposit can have many rows here; the deposit
-- is "closed" once the sum of withdrawals reaches its principal_amount.
-- collected_by is deliberately ANY family member, not locked to the
-- depositor — one person can collect on behalf of the whole family.
-- ---------------------------------------------------------------------------
create table withdrawals (
  id              uuid primary key default gen_random_uuid(),
  deposit_id      uuid not null references deposits(id) on delete cascade,
  amount          bigint not null check (amount > 0),
  withdrawal_date date not null,
  collected_by    uuid not null references family_members(id),
  note            text,
  created_at      timestamptz not null default now()
);

create index withdrawals_deposit_id_idx on withdrawals(deposit_id);

-- ---------------------------------------------------------------------------
-- interest_payouts — one row per monthly interest cycle. `amount` is
-- SNAPSHOTTED at the moment the row is generated (based on the deposit's
-- outstanding principal as of that due date) and is never recalculated
-- retroactively, even if a later partial withdrawal changes the deposit's
-- ongoing balance. Rows are generated lazily by the app (see
-- src/lib/ledger.ts), not by a database cron job.
-- ---------------------------------------------------------------------------
create table interest_payouts (
  id             uuid primary key default gen_random_uuid(),
  deposit_id     uuid not null references deposits(id) on delete cascade,
  due_date       date not null,
  amount         bigint not null check (amount >= 0),
  status         text not null default 'pending' check (status in ('pending', 'collected')),
  collected_date date,
  collected_by   uuid references family_members(id),
  created_at     timestamptz not null default now(),
  unique (deposit_id, due_date)
);

create index interest_payouts_deposit_id_idx on interest_payouts(deposit_id);
create index interest_payouts_status_idx on interest_payouts(status);

-- ---------------------------------------------------------------------------
-- Derived view — convenience for reporting / ad-hoc SQL only. The app itself
-- computes outstanding balances client-side from the raw ledger tables
-- (deposits - withdrawals), same as this view does, so the two can never
-- drift out of sync — this is just a shortcut for direct SQL queries.
-- ---------------------------------------------------------------------------
create view deposit_balances as
select
  d.id as deposit_id,
  d.member_id,
  d.principal_amount,
  d.principal_amount - coalesce(w.total_withdrawn, 0) as outstanding_amount,
  d.deposit_date,
  d.interest_rate,
  d.status
from deposits d
left join (
  select deposit_id, sum(amount) as total_withdrawn
  from withdrawals
  group by deposit_id
) w on w.deposit_id = d.id;

-- ---------------------------------------------------------------------------
-- Row Level Security — the real access boundary, same philosophy as MIG
-- Stock: any authenticated user (the shared family login) can read/write
-- everything; there's no per-user data partitioning since this is a single
-- family's shared ledger.
-- ---------------------------------------------------------------------------
alter table family_members  enable row level security;
alter table deposits        enable row level security;
alter table withdrawals     enable row level security;
alter table interest_payouts enable row level security;

create policy "authenticated_all_family_members" on family_members
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated_all_deposits" on deposits
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated_all_withdrawals" on withdrawals
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated_all_interest_payouts" on interest_payouts
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
