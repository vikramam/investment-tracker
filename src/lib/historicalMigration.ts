import { supabase } from './supabase';
import { computeMissingPayouts } from './ledger';
import { todayISO } from './dates';
import type { MemberWithDeposits } from '@/types';

export type MemberPreviewRow = {
  memberId: string;
  memberName: string;
  recordCount: number;
};

export type MarkInterestPreview = {
  rows: MemberPreviewRow[];
  totalRecords: number;
};

/**
 * Counts what "Mark Interest Collected Till Date" would do, WITHOUT
 * touching the database. Two sources of work, both reusing existing logic:
 *
 * (a) Cycles with genuinely no payout row at all yet — computeMissingPayouts,
 *     the exact same function useFamilyData uses for normal lazy generation.
 *     In practice this is usually 0, because useFamilyData.load() already
 *     ran this on the current page load, before this preview was computed.
 * (b) Existing PENDING payouts that are already due (due_date <= today) —
 *     this is the normal case after bulk-entering historical deposits: the
 *     rows already exist (auto-generated on load), they just haven't been
 *     flagged as collected yet.
 *
 * No interest amount is ever recalculated here — every amount was already
 * snapshotted, either by a previous load() or by computeMissingPayouts
 * inside this same run.
 */
export function computeMarkInterestPreview(members: MemberWithDeposits[]): MarkInterestPreview {
  const today = todayISO();
  const rows: MemberPreviewRow[] = [];

  members.forEach((m) => {
    let count = 0;
    m.deposits.forEach((d) => {
      count += computeMissingPayouts(d).length;
      count += d.payouts.filter((p) => p.status === 'pending' && p.due_date <= today).length;
    });
    if (count > 0) rows.push({ memberId: m.id, memberName: m.name, recordCount: count });
  });

  return { rows, totalRecords: rows.reduce((sum, r) => sum + r.recordCount, 0) };
}

export type MarkInterestSummary = {
  membersProcessed: number;
  recordsCreated: number;
  recordsMarkedCollected: number;
  recordsSkipped: number;
  errors: string[];
};

/**
 * IDEMPOTENCY: a second run finds zero genuinely-missing cycles (all now
 * exist, inserted by the first run or by ordinary app usage) and zero
 * pending-and-due payouts left to flip (all now `collected`) — so it
 * creates and changes nothing. This matches the requirement exactly:
 * running it again the same month is a no-op; running it again next month
 * only touches that one new cycle, because that's the only thing that's
 * newly pending-and-due by then.
 *
 * `collected_by` is left null for records created/flipped by this bulk
 * action — there's no real individual "who collected it" for a historical
 * backfill. Flag to the owner if a default collector should be attributed
 * instead.
 */
export async function executeMarkInterestCollected(
  members: MemberWithDeposits[]
): Promise<MarkInterestSummary> {
  const today = todayISO();
  let recordsCreated = 0;
  let recordsMarkedCollected = 0;
  let recordsSkipped = 0;
  let membersProcessed = 0;
  const errors: string[] = [];

  for (const m of members) {
    let touchedThisMember = false;

    for (const d of m.deposits) {
      // (a) safety net: insert any cycle that has literally no row yet,
      // directly as already-collected (no separate calculation — same
      // computeMissingPayouts the normal lazy-load path uses).
      const missing = computeMissingPayouts(d);
      if (missing.length > 0) {
        const rowsToInsert = missing.map((r) => ({
          deposit_id: r.deposit_id,
          due_date: r.due_date,
          amount: r.amount,
          status: 'collected' as const,
          collected_date: r.due_date,
          collected_by: null
        }));
        const { error } = await supabase.from('interest_payouts').insert(rowsToInsert);
        if (error) {
          errors.push(`${m.name}: ${error.message}`);
        } else {
          recordsCreated += rowsToInsert.length;
          touchedThisMember = true;
        }
      }

      // (b) the normal case: existing pending + due rows, grouped by
      // due_date so rows sharing a due date update in a single call.
      const duePending = d.payouts.filter((p) => p.status === 'pending' && p.due_date <= today);
      const byDueDate = new Map<string, string[]>();
      duePending.forEach((p) => {
        if (!byDueDate.has(p.due_date)) byDueDate.set(p.due_date, []);
        byDueDate.get(p.due_date)!.push(p.id);
      });
      for (const [dueDate, ids] of byDueDate) {
        const { error } = await supabase
          .from('interest_payouts')
          .update({ status: 'collected', collected_date: dueDate, collected_by: null })
          .in('id', ids);
        if (error) {
          errors.push(`${m.name}: ${error.message}`);
        } else {
          recordsMarkedCollected += ids.length;
          touchedThisMember = true;
        }
      }

      // Rows already collected before this run — explicitly untouched.
      recordsSkipped += d.payouts.filter((p) => p.status === 'collected').length;
    }

    if (touchedThisMember) membersProcessed += 1;
  }

  return { membersProcessed, recordsCreated, recordsMarkedCollected, recordsSkipped, errors };
}
