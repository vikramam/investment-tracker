import { useMemo, useState } from 'react';
import { Box, Button, Chip, Paper, Typography } from '@mui/material';
import { useFamilyData } from '@/data/useFamilyData';
import { allPendingPayouts } from '@/lib/ledger';
import { fmtMoney } from '@/lib/money';
import { fmtDate, todayISO } from '@/lib/dates';
import { monoSx } from '@/theme';
import { EmptyState } from '@/components/EmptyState';
import { BottomSheet } from '@/components/BottomSheet';
import { CollectorPicker } from '@/components/CollectorPicker';
import type { PendingPayoutRow } from '@/types';

type Tab = 'interest' | 'withdrawals';

export function Collections() {
  const { members, collectPayout } = useFamilyData();
  const [tab, setTab] = useState<Tab>('interest');
  const [collecting, setCollecting] = useState<PendingPayoutRow | null>(null);
  const [collector, setCollector] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const today = todayISO();
  const pending = useMemo(() => allPendingPayouts(members), [members]);

  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; items: PendingPayoutRow[] }>();
    pending.forEach((p) => {
      if (!map.has(p.memberId)) map.set(p.memberId, { name: p.memberName, items: [] });
      map.get(p.memberId)!.items.push(p);
    });
    return [...map.values()];
  }, [pending]);

  const withdrawalRows = useMemo(
    () =>
      members
        .flatMap((m) => m.deposits.flatMap((d) => d.withdrawals.map((w) => ({ memberName: m.name, ...w }))))
        .sort((a, b) => b.withdrawal_date.localeCompare(a.withdrawal_date)),
    [members]
  );

  function collectorName(id: string) {
    return members.find((m) => m.id === id)?.name ?? '—';
  }

  async function submitCollect() {
    if (!collecting || !collector) return;
    setSaving(true);
    try {
      await collectPayout(collecting.id, collector);
      setCollecting(null);
      setCollector(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box sx={{ animation: 'fadeUp 0.35s ease both' }}>
      <Typography variant="h4" fontSize={20} mb={2}>
        Collections
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TabChip label="Interest due" active={tab === 'interest'} onClick={() => setTab('interest')} />
        <TabChip label="Withdrawals" active={tab === 'withdrawals'} onClick={() => setTab('withdrawals')} />
      </Box>

      {tab === 'interest' &&
        (grouped.length === 0 ? (
          <EmptyState title="All caught up" subtitle="No interest payments waiting to be collected" />
        ) : (
          grouped.map((g) => {
            const total = g.items.reduce((s, i) => s + i.amount, 0);
            return (
              <Box key={g.items[0].memberId} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 0.25, mb: 1 }}>
                  <Typography fontSize={13.5} fontWeight={700}>
                    {g.name}
                  </Typography>
                  <Typography sx={monoSx} fontSize={12.5} fontWeight={600} color="text.secondary">
                    Total {fmtMoney(total)}
                  </Typography>
                </Box>
                <Paper sx={{ borderRadius: 1, overflow: 'hidden' }}>
                  {g.items.map((p, i) => {
                    const isDue = p.due_date <= today;
                    return (
                      <Box
                        key={p.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          px: 1.75,
                          py: 1.5,
                          borderTop: i > 0 ? '1px solid' : 'none',
                          borderColor: 'divider'
                        }}
                      >
                        <Box>
                          <Typography fontSize={12.5}>Due {fmtDate(p.due_date)}</Typography>
                          {!isDue && (
                            <Typography fontSize={10.5} color="text.secondary" mt={0.25}>
                              Not due yet
                            </Typography>
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                          <Typography sx={monoSx} fontSize={13} fontWeight={600}>
                            {fmtMoney(p.amount)}
                          </Typography>
                          <Button
                            disabled={!isDue}
                            onClick={() => setCollecting(p)}
                            variant={isDue ? 'contained' : 'outlined'}
                            size="small"
                            sx={{ fontSize: 11.5, px: 1.5 }}
                          >
                            Collect
                          </Button>
                        </Box>
                      </Box>
                    );
                  })}
                </Paper>
              </Box>
            );
          })
        ))}

      {tab === 'withdrawals' &&
        (withdrawalRows.length === 0 ? (
          <EmptyState title="No withdrawals yet" subtitle="Principal withdrawals will show up here" />
        ) : (
          withdrawalRows.map((w) => (
            <Paper
              key={w.id}
              sx={{ p: 1.75, borderRadius: 1, mb: 1.25, display: 'flex', justifyContent: 'space-between' }}
            >
              <Box>
                <Typography fontSize={13.5} fontWeight={600}>
                  {w.memberName}
                </Typography>
                <Typography fontSize={11.5} color="text.secondary" mt={0.25}>
                  {fmtDate(w.withdrawal_date)} &middot; collected by {collectorName(w.collected_by)}
                </Typography>
              </Box>
              <Typography sx={monoSx} fontSize={13.5} fontWeight={600}>
                {fmtMoney(w.amount)}
              </Typography>
            </Paper>
          ))
        ))}

      <BottomSheet open={!!collecting} onClose={() => setCollecting(null)} title="Log collection">
        {collecting && (
          <>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                px: 1.75,
                py: 1.5,
                bgcolor: 'background.default',
                borderRadius: 0.75,
                mb: 1.75
              }}
            >
              <Typography fontSize={13} color="text.secondary">
                {collecting.memberName} &middot; due {fmtDate(collecting.due_date)}
              </Typography>
              <Typography sx={monoSx} fontSize={15} fontWeight={600}>
                {fmtMoney(collecting.amount)}
              </Typography>
            </Box>
            <CollectorPicker members={members} value={collector} onChange={setCollector} />
            <Button fullWidth variant="contained" onClick={submitCollect} disabled={saving}>
              {saving ? 'Saving…' : 'Mark as collected'}
            </Button>
          </>
        )}
      </BottomSheet>
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
        borderColor: active ? 'rgba(201,122,43,0.4)' : 'divider'
      }}
    />
  );
}
