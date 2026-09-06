import type { DepositWithHistory, MemberWithDeposits, PendingPayoutRow } from '@/types';
import { addDays, nextMonthSameDay, todayISO } from './dates';

/** Current outstanding principal for a deposit (principal minus all withdrawals so far). */
export function outstanding(deposit: DepositWithHistory): number {
  const withdrawn = deposit.withdrawals.reduce((sum, w) => sum + w.amount, 0);
  return deposit.principal_amount - withdrawn;
}

/**
 * Outstanding principal AS OF a specific date — only counts withdrawals
 * dated on or before that date. Used when generating a payout row so a
 * withdrawal made AFTER a due date doesn't retroactively shrink interest
 * that was already earned for that cycle.
 */
export function outstandingAsOf(deposit: DepositWithHistory, asOfDate: string): number {
  const withdrawnByDate = deposit.withdrawals
    .filter((w) => w.withdrawal_date <= asOfDate)
    .reduce((sum, w) => sum + w.amount, 0);
  return deposit.principal_amount - withdrawnByDate;
}

/** Every pending payout across every member, sorted soonest-due first. */
export function allPendingPayouts(members: MemberWithDeposits[]): PendingPayoutRow[] {
  const rows: PendingPayoutRow[] = [];
  members.forEach((m) => {
    m.deposits.forEach((d) => {
      d.payouts.forEach((p) => {
        if (p.status === 'pending') {
          rows.push({ ...p, memberId: m.id, memberName: m.name });
        }
      });
    });
  });
  rows.sort((a, b) => a.due_date.localeCompare(b.due_date));
  return rows;
}

export type BreakEvenStats = {
  invested: number;
  withdrawn: number;
  interestPaid: number;
  recovered: number;
  pending: number;
  monthlyIncome: number;
  achieved: boolean;
  months: number | null;
};

/**
 * Break-even math for Analytics: how much of the original invested amount
 * has been recovered so far (withdrawn principal + interest collected), how
 * much is left, and — assuming today's outstanding balances stay level — how
 * many months until the remaining gap is closed by interest alone.
 *
 * This is a snapshot estimate, not a prediction: if more principal gets
 * withdrawn later, the real time-to-break-even will stretch out, since less
 * capital keeps earning. We deliberately don't try to model future
 * withdrawal behavior.
 */
export function breakEvenStats(deposits: DepositWithHistory[]): BreakEvenStats {
  let invested = 0;
  let withdrawn = 0;
  let interestPaid = 0;
  let monthlyIncome = 0;

  deposits.forEach((d) => {
    invested += d.principal_amount;
    withdrawn += d.withdrawals.reduce((s, w) => s + w.amount, 0);
    interestPaid += d.payouts
      .filter((p) => p.status === 'collected')
      .reduce((s, p) => s + p.amount, 0);
    const out = outstanding(d);
    if (out > 0) monthlyIncome += Math.round(out * d.interest_rate);
  });

  const recovered = withdrawn + interestPaid;
  const pending = Math.max(0, invested - recovered);
  const achieved = invested > 0 && pending <= 0;
  const months = !achieved && monthlyIncome > 0 ? Math.ceil(pending / monthlyIncome) : null;

  return { invested, withdrawn, interestPaid, recovered, pending, monthlyIncome, achieved, months };
}

/**
 * Recovers the anniversary (the deposit's day-of-month, clamped for short
 * months) that produced a deposit's last generated payout — by subtracting
 * the 1-day collectibility offset back off its stored due_date — or the
 * deposit date itself if no payout has ever been generated. Shared by
 * computeMissingPayouts and previewNextPayout so both walk the exact same
 * anniversary chain and can never disagree on what's "next".
 */
function lastAnniversaryOf(deposit: DepositWithHistory): string {
  return deposit.payouts.length > 0
    ? addDays(deposit.payouts.map((p) => p.due_date).sort().at(-1)!, -1)
    : deposit.deposit_date;
}

/**
 * For one deposit, figures out every monthly cycle that's come due but
 * doesn't have a payout row yet, and returns the rows that need inserting.
 * Each amount is snapshotted using the outstanding principal AS OF that
 * cycle's due date — never retroactively rewritten once created.
 *
 * A cycle's "anniversary" is the same day-of-month as the deposit (clamped
 * for short months by nextMonthSameDay); a full month has only genuinely
 * elapsed once that whole day has passed, so the actual `due_date` stored
 * is the anniversary PLUS one day. The anniversary chain itself (not the
 * offset due_date) is what's stepped forward each iteration — offsetting
 * first and then stepping from the offset value would shift every
 * subsequent cycle another day later, compounding the same way the old
 * UTC-conversion bug compounded a day earlier each cycle.
 *
 * Pure function — no Supabase calls here, so it's trivially unit-testable.
 * The caller (useFamilyData) is responsible for actually inserting the
 * returned rows and refetching.
 */
export function computeMissingPayouts(
  deposit: DepositWithHistory
): { deposit_id: string; due_date: string; amount: number }[] {
  const today = todayISO();
  const missing: { deposit_id: string; due_date: string; amount: number }[] = [];

  if (deposit.status === 'closed') return missing;

  let anniversary = nextMonthSameDay(lastAnniversaryOf(deposit));

  // Guard against a runaway loop if data is somehow corrupted.
  let iterations = 0;
  while (iterations < 240) {
    const dueDate = addDays(anniversary, 1);
    if (dueDate > today) break;

    const outAsOfDue = outstandingAsOf(deposit, dueDate);
    if (outAsOfDue <= 0) break; // deposit was fully withdrawn before this cycle — stop generating

    missing.push({
      deposit_id: deposit.id,
      due_date: dueDate,
      amount: Math.round(outAsOfDue * deposit.interest_rate)
    });

    anniversary = nextMonthSameDay(anniversary);
    iterations += 1;
  }

  return missing;
}

/**
 * For one active deposit, previews the NEXT payout cycle that hasn't come
 * due yet — i.e. the cycle immediately after whatever computeMissingPayouts
 * has already materialized as real rows. This is a preview only and is
 * never persisted: per the snapshotting rule, an amount is only ever truly
 * locked in once its cycle is actually due, so the amount shown here is a
 * best-current-estimate (today's outstanding principal times the rate)
 * that can still change if a withdrawal happens before the due date
 * arrives.
 *
 * Returns null once the deposit has no outstanding principal left as of
 * that future cycle, or if the deposit is closed.
 */
export function previewNextPayout(
  deposit: DepositWithHistory
): { due_date: string; amount: number } | null {
  if (deposit.status === 'closed') return null;

  const today = todayISO();
  let anniversary = nextMonthSameDay(lastAnniversaryOf(deposit));
  let dueDate = addDays(anniversary, 1);

  // Skip past any cycle that's already due — computeMissingPayouts should
  // already have materialized it as a real row, but stay defensive in case
  // this is called before that runs.
  let iterations = 0;
  while (dueDate <= today && iterations < 240) {
    anniversary = nextMonthSameDay(anniversary);
    dueDate = addDays(anniversary, 1);
    iterations += 1;
  }

  const outAsOfDue = outstandingAsOf(deposit, dueDate);
  if (outAsOfDue <= 0) return null;

  return { due_date: dueDate, amount: Math.round(outAsOfDue * deposit.interest_rate) };
}
