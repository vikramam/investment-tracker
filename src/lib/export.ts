import * as XLSX from 'xlsx';
import { supabase } from './supabase';

/**
 * Exports every raw ledger table as-is (not the assembled/nested app
 * shape) — this is a full backup, so fidelity matters more than
 * readability. Each sheet gets one extra `_rs` column per money field for
 * human convenience; the paise column stays authoritative for re-import.
 */
export async function exportAllDataToExcel(): Promise<void> {
  const [membersRes, depositsRes, withdrawalsRes, payoutsRes] = await Promise.all([
    supabase.from('family_members').select('*').order('created_at'),
    supabase.from('deposits').select('*').order('deposit_date'),
    supabase.from('withdrawals').select('*').order('withdrawal_date'),
    supabase.from('interest_payouts').select('*').order('due_date')
  ]);

  if (membersRes.error) throw membersRes.error;
  if (depositsRes.error) throw depositsRes.error;
  if (withdrawalsRes.error) throw withdrawalsRes.error;
  if (payoutsRes.error) throw payoutsRes.error;

  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(membersRes.data ?? []),
    'Family Members'
  );

  const deposits = (depositsRes.data ?? []).map((d) => ({
    ...d,
    principal_amount_rs: d.principal_amount / 100
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(deposits), 'Deposits');

  const withdrawals = (withdrawalsRes.data ?? []).map((w) => ({
    ...w,
    amount_rs: w.amount / 100
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(withdrawals), 'Withdrawals');

  const payouts = (payoutsRes.data ?? []).map((p) => ({
    ...p,
    amount_rs: p.amount / 100
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(payouts), 'Interest Payouts');

  const filename = `family-deposit-backup-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}
