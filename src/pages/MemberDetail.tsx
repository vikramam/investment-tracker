import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  TextField,
  Typography
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useFamilyData } from '@/data/useFamilyData';
import { breakEvenStats, outstanding, previewNextPayout } from '@/lib/ledger';
import { fmtMoney, formatAmountInput, rupeesToPaise, sanitizeAmountInput } from '@/lib/money';
import { fmtDate, todayISO } from '@/lib/dates';
import { AMBER_GRADIENT, GREEN, monoSx } from '@/theme';
import { Icon } from '@/icons/Icon';
import { EmptyState } from '@/components/EmptyState';
import { BottomSheet } from '@/components/BottomSheet';
import { CollectorPicker } from '@/components/CollectorPicker';
import type { DepositWithHistory, MemberWithDeposits } from '@/types';

type Tab = 'deposits' | 'interest' | 'withdrawals';

export function MemberDetail() {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const { members, addDeposit, withdrawPrincipal } = useFamilyData();
  const member = members.find((m) => m.id === memberId);

  const [tab, setTab] = useState<Tab>('deposits');
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDate, setDepositDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);

  const [withdrawDeposit, setWithdrawDeposit] = useState<DepositWithHistory | null>(null);
  const [withdrawCollector, setWithdrawCollector] = useState<string | null>(null);

  const stats = useMemo(() => (member ? breakEvenStats(member.deposits) : null), [member]);
  const sortedDeposits = useMemo(
    () => (member ? [...member.deposits].sort((a, b) => b.deposit_date.localeCompare(a.deposit_date)) : []),
    [member]
  );

  if (!member || !stats) {
    return <EmptyState title="Member not found" subtitle="They may have been removed" />;
  }

  async function submitDeposit() {
    const paise = rupeesToPaise(depositAmount);
    if (paise <= 0) return;
    setSaving(true);
    try {
      await addDeposit(member!.id, paise, depositDate);
      setDepositAmount('');
      setDepositDate(todayISO());
      setAddSheetOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function submitWithdraw() {
    if (!withdrawDeposit || !withdrawCollector) return;
    // Only full withdrawal is allowed — always the deposit's entire
    // outstanding principal, which closes it. No partial amount.
    const paise = outstanding(withdrawDeposit);
    if (paise <= 0) return;
    setSaving(true);
    try {
      await withdrawPrincipal(withdrawDeposit.id, paise, withdrawCollector);
      setWithdrawCollector(null);
      setWithdrawDeposit(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box sx={{ animation: 'fadeUp 0.35s ease both' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
        <IconButton onClick={() => navigate('/family')} size="small">
          <Icon name="chevronLeft" />
        </IconButton>
        <Typography variant="h5" fontSize={18}>
          {member.name}
        </Typography>
      </Box>

      <Paper
        sx={{ p: 2, borderRadius: 1, mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1.75, rowGap: 1.5 }}
      >
        <Stat label="Invested" value={fmtMoney(stats.invested)} />
        <Stat label="Interest paid" value={fmtMoney(stats.interestPaid)} />
        <Stat label="Withdrawn" value={fmtMoney(stats.withdrawn)} />
      </Paper>

      <Button
        fullWidth
        variant="contained"
        startIcon={<Icon name="plus" fontSize="small" />}
        onClick={() => setAddSheetOpen(true)}
        sx={{ mb: 2 }}
      >
        Add deposit
      </Button>

      <Box sx={{ display: 'flex', gap: 1, mb: 1.75, overflowX: 'auto' }}>
        <TabChip label="Deposits" active={tab === 'deposits'} onClick={() => setTab('deposits')} />
        <TabChip
          label="Interest collected"
          active={tab === 'interest'}
          onClick={() => setTab('interest')}
        />
        <TabChip
          label="Principal withdrawn"
          active={tab === 'withdrawals'}
          onClick={() => setTab('withdrawals')}
        />
      </Box>

      {tab === 'deposits' &&
        (sortedDeposits.length === 0 ? (
          <EmptyState title="No deposits yet" subtitle="Add their first deposit above" />
        ) : (
          sortedDeposits.map((d) => (
            <DepositCard key={d.id} deposit={d} onWithdraw={() => setWithdrawDeposit(d)} />
          ))
        ))}

      {tab === 'interest' && <InterestTab member={member} allMembers={members} />}
      {tab === 'withdrawals' && <WithdrawalsTab member={member} allMembers={members} />}

      <BottomSheet open={addSheetOpen} onClose={() => setAddSheetOpen(false)} title="Add deposit">
        <TextField
          fullWidth
          label="Amount (Rs.)"
          inputMode="decimal"
          value={formatAmountInput(depositAmount)}
          onChange={(e) => setDepositAmount(sanitizeAmountInput(e.target.value))}
          sx={{ mb: 1.5 }}
        />
        <TextField
          fullWidth
          label="Deposit date"
          type="date"
          value={depositDate}
          onChange={(e) => setDepositDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ mb: 2 }}
        />
        <Button fullWidth variant="contained" onClick={submitDeposit} disabled={saving}>
          {saving ? 'Saving…' : 'Save deposit'}
        </Button>
      </BottomSheet>

      <BottomSheet
        open={!!withdrawDeposit}
        onClose={() => setWithdrawDeposit(null)}
        title="Withdraw principal"
      >
        {withdrawDeposit && (
          <>
            <Typography fontSize={12.5} color="text.secondary" mb={0.5}>
              Only full withdrawal is allowed — this closes the deposit.
            </Typography>
            <Typography sx={monoSx} fontSize={20} fontWeight={700} mb={1.75}>
              {fmtMoney(outstanding(withdrawDeposit))}
            </Typography>
            <CollectorPicker
              members={members}
              value={withdrawCollector}
              onChange={setWithdrawCollector}
            />
            <Button fullWidth variant="contained" onClick={submitWithdraw} disabled={saving}>
              {saving ? 'Saving…' : 'Confirm withdrawal'}
            </Button>
          </>
        )}
      </BottomSheet>
    </Box>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ minWidth: 100, flex: '1 1 auto' }}>
      <Typography fontSize={11} color="text.secondary">
        {label}
      </Typography>
      <Typography sx={monoSx} fontSize={15} fontWeight={600} mt={0.25}>
        {value}
      </Typography>
    </Box>
  );
}

function TabChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <Chip
      label={label}
      onClick={onClick}
      sx={{
        bgcolor: active ? 'rgba(201,122,43,0.12)' : 'background.paper',
        color: active ? 'primary.main' : 'text.primary',
        border: '1px solid',
        borderColor: active ? 'rgba(201,122,43,0.4)' : 'divider',
        flexShrink: 0
      }}
    />
  );
}

function DepositCard({ deposit, onWithdraw }: { deposit: DepositWithHistory; onWithdraw: () => void }) {
  const out = outstanding(deposit);
  const isActive = out > 0;
  const nextDue = deposit.payouts.find((p) => p.status === 'pending');
  const preview = !nextDue && isActive ? previewNextPayout(deposit) : null;

  return (
    <Paper sx={{ p: 2, borderRadius: 1, mb: 1.25 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography sx={monoSx} fontSize={16} fontWeight={600}>
            {fmtMoney(out)}
          </Typography>
          <Typography fontSize={11.5} color="text.secondary" mt={0.375}>
            Deposited {fmtDate(deposit.deposit_date)}
          </Typography>
        </Box>
        <Chip
          label={isActive ? 'Active' : 'Closed'}
          size="small"
          sx={{
            bgcolor: isActive ? 'rgba(95,177,88,0.12)' : 'transparent',
            color: isActive ? GREEN : 'text.secondary',
            fontWeight: 700,
            fontSize: 10.5
          }}
        />
      </Box>

      {(nextDue || preview) && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            mt: 1.25,
            pt: 1.25,
            borderTop: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Icon name="calendar" sx={{ fontSize: 13, color: 'text.secondary' }} />
          <Typography fontSize={11.5} color="text.secondary">
            {nextDue ? (
              <>
                Next due {fmtDate(nextDue.due_date)} &middot; {fmtMoney(nextDue.amount)}
              </>
            ) : (
              <>
                Next payout {fmtDate(preview!.due_date)} &middot; {fmtMoney(preview!.amount)} &middot; not
                due yet
              </>
            )}
          </Typography>
        </Box>
      )}

      {isActive && (
        <Button
          fullWidth
          onClick={onWithdraw}
          startIcon={<Icon name="withdraw" fontSize="small" />}
          sx={{ mt: 1.25, border: '1px solid', borderColor: 'divider', color: 'text.primary', fontSize: 12 }}
        >
          Withdraw principal
        </Button>
      )}
    </Paper>
  );
}

function InterestTab({ member, allMembers }: { member: MemberWithDeposits; allMembers: MemberWithDeposits[] }) {
  const rows = member.deposits
    .flatMap((d) => d.payouts.filter((p) => p.status === 'collected').map((p) => ({ dep: d, ...p })))
    .sort((a, b) => (b.collected_date ?? '').localeCompare(a.collected_date ?? ''));

  if (rows.length === 0) {
    return <EmptyState title="No interest collected yet" subtitle="Collected payouts will show up here" />;
  }

  // System-generated collections (the "Mark Interest Collected Till Date"
  // bulk backfill) leave collected_by null — there's no individual
  // collector to attribute, so show a plain "-" rather than a name.
  function collectorName(id: string | null) {
    if (!id) return '-';
    return allMembers.find((m) => m.id === id)?.name ?? '-';
  }

  return (
    <>
      {rows.map((p) => (
        <Paper
          key={p.id}
          sx={{ p: 1.75, borderRadius: 1, mb: 1.25, display: 'flex', justifyContent: 'space-between' }}
        >
          <Box>
            <Typography fontSize={13} fontWeight={600}>
              Collected {fmtDate(p.collected_date!)}
            </Typography>
            <Typography fontSize={11.5} color="text.secondary" mt={0.25}>
              Due {fmtDate(p.due_date)} &middot; collected by {collectorName(p.collected_by)}
            </Typography>
          </Box>
          <Typography sx={monoSx} fontSize={13.5} fontWeight={600}>
            {fmtMoney(p.amount)}
          </Typography>
        </Paper>
      ))}
    </>
  );
}

function WithdrawalsTab({
  member,
  allMembers
}: {
  member: MemberWithDeposits;
  allMembers: MemberWithDeposits[];
}) {
  const rows = member.deposits
    .flatMap((d) => d.withdrawals.map((w) => ({ dep: d, ...w })))
    .sort((a, b) => b.withdrawal_date.localeCompare(a.withdrawal_date));

  if (rows.length === 0) {
    return (
      <EmptyState title="No principal withdrawn yet" subtitle="Withdrawals against a deposit will show up here" />
    );
  }

  function collectorName(id: string) {
    return allMembers.find((m) => m.id === id)?.name ?? '—';
  }

  return (
    <>
      {rows.map((w) => (
        <Paper
          key={w.id}
          sx={{ p: 1.75, borderRadius: 1, mb: 1.25, display: 'flex', justifyContent: 'space-between' }}
        >
          <Box>
            <Typography fontSize={13} fontWeight={600}>
              Withdrawn {fmtDate(w.withdrawal_date)}
            </Typography>
            <Typography fontSize={11.5} color="text.secondary" mt={0.25}>
              From deposit of {fmtMoney(w.dep.principal_amount)} &middot; by {collectorName(w.collected_by)}
            </Typography>
          </Box>
          <Typography sx={monoSx} fontSize={13.5} fontWeight={600}>
            {fmtMoney(w.amount)}
          </Typography>
        </Paper>
      ))}
    </>
  );
}
