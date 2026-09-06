import { useMemo, useState } from 'react';
import { Box, Button, Chip, Paper, Typography } from '@mui/material';
import { useFamilyData } from '@/data/useFamilyData';
import { allPendingPayouts, previewNextPayout } from '@/lib/ledger';
import { fmtMoney } from '@/lib/money';
import { fmtDate, todayISO } from '@/lib/dates';
import { monoSx } from '@/theme';
import { EmptyState } from '@/components/EmptyState';
import { BottomSheet } from '@/components/BottomSheet';
import { CollectorPicker } from '@/components/CollectorPicker';
import { Icon } from '@/icons/Icon';

type Tab = 'ready' | 'upcoming' | 'withdrawals';

/** One row in either the "Ready to collect" or "Upcoming" list. Real,
 * already-due payouts have a real id you can call collectPayouts with;
 * upcoming previews use a synthetic id and are never collectible. */
type DueRow = {
  id: string;
  memberId: string;
  memberName: string;
  due_date: string;
  amount: number;
};

type MemberGroup = { memberId: string; name: string; items: DueRow[] };

type CollectTarget = { ids: string[]; memberName: string; amount: number; label: string };

function groupByMember(rows: DueRow[]): MemberGroup[] {
  const map = new Map<string, MemberGroup>();
  rows.forEach((p) => {
    if (!map.has(p.memberId)) map.set(p.memberId, { memberId: p.memberId, name: p.memberName, items: [] });
    map.get(p.memberId)!.items.push(p);
  });
  return [...map.values()];
}

export function Collections() {
  const { members, collectPayouts } = useFamilyData();
  const [tab, setTab] = useState<Tab>('ready');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [collecting, setCollecting] = useState<CollectTarget | null>(null);
  const [collector, setCollector] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const readyGroups = useMemo(() => {
    const rows: DueRow[] = allPendingPayouts(members).map((p) => ({
      id: p.id,
      memberId: p.memberId,
      memberName: p.memberName,
      due_date: p.due_date,
      amount: p.amount
    }));
    rows.sort((a, b) => a.due_date.localeCompare(b.due_date));
    return groupByMember(rows);
  }, [members]);

  const upcomingGroups = useMemo(() => {
    const rows: DueRow[] = [];
    members.forEach((m) => {
      m.deposits.forEach((d) => {
        const preview = previewNextPayout(d);
        if (preview) {
          rows.push({
            id: `preview-${d.id}`,
            memberId: m.id,
            memberName: m.name,
            due_date: preview.due_date,
            amount: preview.amount
          });
        }
      });
    });
    rows.sort((a, b) => a.due_date.localeCompare(b.due_date));
    return groupByMember(rows);
  }, [members]);

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

  function toggleCollapse(memberId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  }

  async function submitCollect() {
    if (!collecting || !collector) return;
    setSaving(true);
    try {
      await collectPayouts(collecting.ids, collector);
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

      <Box sx={{ display: 'flex', gap: 1, mb: 2, overflowX: 'auto' }}>
        <TabChip label="Ready to collect" active={tab === 'ready'} onClick={() => setTab('ready')} />
        <TabChip label="Upcoming" active={tab === 'upcoming'} onClick={() => setTab('upcoming')} />
        <TabChip label="Withdrawals" active={tab === 'withdrawals'} onClick={() => setTab('withdrawals')} />
      </Box>

      {tab === 'ready' &&
        (readyGroups.length === 0 ? (
          <EmptyState title="All caught up" subtitle="No interest payments waiting to be collected" />
        ) : (
          readyGroups.map((g) => {
            const total = g.items.reduce((s, i) => s + i.amount, 0);
            const isCollapsed = collapsed.has(g.memberId);
            return (
              <Box key={g.memberId} sx={{ mb: 2 }}>
                <GroupHeader
                  name={g.name}
                  total={total}
                  collapsed={isCollapsed}
                  onToggle={() => toggleCollapse(g.memberId)}
                  onCollectAll={() =>
                    setCollecting({
                      ids: g.items.map((i) => i.id),
                      memberName: g.name,
                      amount: total,
                      label: `${g.items.length} payout${g.items.length === 1 ? '' : 's'}`
                    })
                  }
                />
                {!isCollapsed && (
                  <Paper sx={{ borderRadius: 1, overflow: 'hidden' }}>
                    {g.items.map((p, i) => (
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
                        <Typography fontSize={12.5}>Due {fmtDate(p.due_date)}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                          <Typography sx={monoSx} fontSize={13} fontWeight={600}>
                            {fmtMoney(p.amount)}
                          </Typography>
                          <Button
                            onClick={() =>
                              setCollecting({
                                ids: [p.id],
                                memberName: p.memberName,
                                amount: p.amount,
                                label: `Due ${fmtDate(p.due_date)}`
                              })
                            }
                            variant="contained"
                            size="small"
                            sx={{ fontSize: 11.5, px: 1.5 }}
                          >
                            Collect
                          </Button>
                        </Box>
                      </Box>
                    ))}
                  </Paper>
                )}
              </Box>
            );
          })
        ))}

      {tab === 'upcoming' &&
        (upcomingGroups.length === 0 ? (
          <EmptyState title="Nothing upcoming" subtitle="Active deposits with a future cycle will show up here" />
        ) : (
          upcomingGroups.map((g) => {
            const total = g.items.reduce((s, i) => s + i.amount, 0);
            const isCollapsed = collapsed.has(g.memberId);
            return (
              <Box key={g.memberId} sx={{ mb: 2 }}>
                <GroupHeader
                  name={g.name}
                  total={total}
                  collapsed={isCollapsed}
                  onToggle={() => toggleCollapse(g.memberId)}
                />
                {!isCollapsed && (
                  <Paper sx={{ borderRadius: 1, overflow: 'hidden' }}>
                    {g.items.map((p, i) => (
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
                          <Typography fontSize={12.5}>Next payout {fmtDate(p.due_date)}</Typography>
                          <Typography fontSize={10.5} color="text.secondary" mt={0.25}>
                            Not due yet
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                          <Typography sx={monoSx} fontSize={13} fontWeight={600}>
                            {fmtMoney(p.amount)}
                          </Typography>
                          <Button disabled variant="outlined" size="small" sx={{ fontSize: 11.5, px: 1.5 }}>
                            Collect
                          </Button>
                        </Box>
                      </Box>
                    ))}
                  </Paper>
                )}
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
                {collecting.memberName} &middot; {collecting.label}
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

function GroupHeader({
  name,
  total,
  collapsed,
  onToggle,
  onCollectAll
}: {
  name: string;
  total: number;
  collapsed: boolean;
  onToggle: () => void;
  onCollectAll?: () => void;
}) {
  return (
    <Box
      onClick={onToggle}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 0.25,
        py: 0.5,
        mb: collapsed ? 0 : 1,
        cursor: 'pointer'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Icon
          name="chevronRight"
          fontSize="small"
          sx={{
            color: 'text.secondary',
            transform: collapsed ? 'none' : 'rotate(90deg)',
            transition: 'transform 0.15s'
          }}
        />
        <Typography fontSize={13.5} fontWeight={700}>
          {name}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography sx={monoSx} fontSize={12.5} fontWeight={600} color="text.secondary">
          Total {fmtMoney(total)}
        </Typography>
        {onCollectAll && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onCollectAll();
            }}
            variant="outlined"
            size="small"
            sx={{ fontSize: 11, px: 1.25 }}
          >
            Collect all
          </Button>
        )}
      </Box>
    </Box>
  );
}

function TabChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <Chip
      label={label}
      onClick={onClick}
      sx={{
        flexShrink: 0,
        bgcolor: active ? 'rgba(201,122,43,0.12)' : 'background.paper',
        color: active ? 'primary.main' : 'text.primary',
        border: '1px solid',
        borderColor: active ? 'rgba(201,122,43,0.4)' : 'divider'
      }}
    />
  );
}
