import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { computeMissingPayouts, outstanding } from '@/lib/ledger';
import { todayISO } from '@/lib/dates';
import type {
  Deposit,
  DepositWithHistory,
  FamilyMember,
  InterestPayout,
  MemberWithDeposits,
  Withdrawal
} from '@/types';

type State = {
  members: MemberWithDeposits[];
  loading: boolean;
  error: string | null;
};

/**
 * Single source of truth for all family/deposit/payout data in the app.
 * Everything is fetched from the raw ledger tables and assembled
 * client-side — no cached "current balance" column anywhere, matching the
 * "ledger is source of truth" philosophy from MIG Stock's stock_movements.
 */
export function useFamilyData() {
  const [state, setState] = useState<State>({ members: [], loading: true, error: null });

  /**
   * Does the actual fetch + assemble + lazy-generate + auto-close pass and
   * commits it to state on success. Throws on any failure — load() below
   * is what catches it, so this can be called more than once for a retry
   * without duplicating the try/catch.
   */
  const loadOnce = useCallback(async () => {
    const [membersRes, depositsRes, withdrawalsRes, payoutsRes] = await Promise.all([
        supabase.from('family_members').select('*').order('created_at'),
        supabase.from('deposits').select('*').order('deposit_date'),
        supabase.from('withdrawals').select('*'),
        supabase.from('interest_payouts').select('*')
      ]);

      if (membersRes.error) throw membersRes.error;
      if (depositsRes.error) throw depositsRes.error;
      if (withdrawalsRes.error) throw withdrawalsRes.error;
      if (payoutsRes.error) throw payoutsRes.error;

      const members = membersRes.data as FamilyMember[];
      // principal_amount/amount are `bigint` columns in Postgres, which
      // PostgREST serializes as JSON STRINGS (not numbers) — JS numbers
      // can't safely represent the full bigint range. Coerce to Number
      // right here at the fetch boundary so every downstream sum (`+`,
      // reduce) sees real numbers; otherwise `0 + "2000"` silently string-
      // concatenates instead of adding once more than one value is summed.
      const deposits = (depositsRes.data as Deposit[]).map((d) => ({
        ...d,
        principal_amount: Number(d.principal_amount)
      }));
      const withdrawals = (withdrawalsRes.data as Withdrawal[]).map((w) => ({
        ...w,
        amount: Number(w.amount)
      }));
      const payouts = (payoutsRes.data as InterestPayout[]).map((p) => ({
        ...p,
        amount: Number(p.amount)
      }));

      const assembled: MemberWithDeposits[] = members.map((m) => ({
        ...m,
        deposits: deposits
          .filter((d) => d.member_id === m.id)
          .map<DepositWithHistory>((d) => ({
            ...d,
            withdrawals: withdrawals.filter((w) => w.deposit_id === d.id),
            payouts: payouts.filter((p) => p.deposit_id === d.id)
          }))
      }));

      // Lazily generate any interest cycles that have come due since we
      // last checked. This runs client-side on load rather than via a
      // scheduled job — see CLAUDE.md for why.
      const toInsert = assembled.flatMap((m) => m.deposits.flatMap(computeMissingPayouts));
      if (toInsert.length > 0) {
        const { error: insertError } = await supabase.from('interest_payouts').insert(toInsert);
        if (insertError) throw insertError;
        // Re-fetch payouts only, and re-merge, rather than a full reload.
        const { data: freshPayouts, error: refetchError } = await supabase
          .from('interest_payouts')
          .select('*');
        if (refetchError) throw refetchError;
        const freshPayoutsCoerced = (freshPayouts as InterestPayout[]).map((p) => ({
          ...p,
          amount: Number(p.amount)
        }));
        assembled.forEach((m) =>
          m.deposits.forEach((d) => {
            d.payouts = freshPayoutsCoerced.filter((p) => p.deposit_id === d.id);
          })
        );
      }

      // Auto-close any deposit whose outstanding balance has hit zero.
      const toClose = assembled
        .flatMap((m) => m.deposits)
        .filter((d) => d.status === 'active' && outstanding(d) <= 0)
        .map((d) => d.id);
      if (toClose.length > 0) {
        await supabase.from('deposits').update({ status: 'closed' }).in('id', toClose);
        assembled.forEach((m) =>
          m.deposits.forEach((d) => {
            if (toClose.includes(d.id)) d.status = 'closed';
          })
        );
      }

    setState({ members: assembled, loading: false, error: null });
  }, []);

  /**
   * A device's system clock can be briefly wrong right after waking from
   * sleep (before it resyncs via NTP) — Supabase rejects the JWT as
   * "issued in the future" when that happens, even though the session
   * itself is fine. This is transient and normally clears up within a
   * second or two, so retry once silently before surfacing an error the
   * user has no way to act on from inside the app.
   */
  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      await loadOnce();
    } catch (err) {
      const message = (err as Error).message ?? '';
      if (/jwt.*(future|issued)/i.test(message)) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        try {
          await loadOnce();
          return;
        } catch (retryErr) {
          setState({ members: [], loading: false, error: (retryErr as Error).message });
          return;
        }
      }
      setState({ members: [], loading: false, error: message });
    }
  }, [loadOnce]);

  useEffect(() => {
    load();
  }, [load]);

  const addMember = useCallback(
    async (name: string) => {
      const { error } = await supabase.from('family_members').insert({ name });
      if (error) throw error;
      await load();
    },
    [load]
  );

  /** Renames one or more family members in a single batch, then reloads once. */
  const renameMembers = useCallback(
    async (updates: { id: string; name: string }[]) => {
      if (updates.length === 0) return;
      const results = await Promise.all(
        updates.map((u) => supabase.from('family_members').update({ name: u.name }).eq('id', u.id))
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
      await load();
    },
    [load]
  );

  const addDeposit = useCallback(
    async (memberId: string, principalAmount: number, depositDate: string) => {
      const { error } = await supabase.from('deposits').insert({
        member_id: memberId,
        principal_amount: principalAmount,
        deposit_date: depositDate,
        interest_rate: 0.02
      });
      if (error) throw error;
      await load(); // triggers lazy payout generation for the new deposit too
    },
    [load]
  );

  /** Marks one or more payouts collected in a single update — used for both
   * a single row's "Collect" button and a member's "Collect all". */
  const collectPayouts = useCallback(
    async (payoutIds: string[], collectedBy: string) => {
      if (payoutIds.length === 0) return;
      const { error } = await supabase
        .from('interest_payouts')
        .update({ status: 'collected', collected_date: todayISO(), collected_by: collectedBy })
        .in('id', payoutIds);
      if (error) throw error;
      await load(); // next cycle's payout gets generated on this reload
    },
    [load]
  );

  const withdrawPrincipal = useCallback(
    async (depositId: string, amount: number, collectedBy: string) => {
      const { error } = await supabase.from('withdrawals').insert({
        deposit_id: depositId,
        amount,
        withdrawal_date: todayISO(),
        collected_by: collectedBy
      });
      if (error) throw error;
      await load();
    },
    [load]
  );

  return {
    ...state,
    refresh: load,
    addMember,
    renameMembers,
    addDeposit,
    collectPayouts,
    withdrawPrincipal
  };
}
