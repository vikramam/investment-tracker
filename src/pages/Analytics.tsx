import { useMemo, useState } from 'react';
import { Box, Chip, Paper, Typography } from '@mui/material';
import { useFamilyData } from '@/data/useFamilyData';
import { breakEvenStats, type BreakEvenStats } from '@/lib/ledger';
import { fmtMoney } from '@/lib/money';
import { fmtYearsMonths } from '@/lib/dates';
import { AMBER, AMBER_GRADIENT, GREEN, monoSx } from '@/theme';
import { Icon } from '@/icons/Icon';

type Tab = 'family' | 'byMember';

export function Analytics() {
  const { members } = useFamilyData();
  const [tab, setTab] = useState<Tab>('family');

  const familyStats = useMemo(
    () => breakEvenStats(members.flatMap((m) => m.deposits)),
    [members]
  );

  return (
    <Box sx={{ animation: 'fadeUp 0.35s ease both' }}>
      <Typography variant="h4" fontSize={20} mb={2}>
        Analytics
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TabChip label="Family" active={tab === 'family'} onClick={() => setTab('family')} />
        <TabChip label="By member" active={tab === 'byMember'} onClick={() => setTab('byMember')} />
      </Box>

      {tab === 'family' ? (
        <AnalyticsCard name="Whole family" stats={familyStats} isAll />
      ) : (
        members.map((m) => (
          <AnalyticsCard key={m.id} name={m.name} stats={breakEvenStats(m.deposits)} isAll={false} />
        ))
      )}
    </Box>
  );
}

function AnalyticsCard({ name, stats, isAll }: { name: string; stats: BreakEvenStats; isAll: boolean }) {
  const header = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.75 }}>
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: '9px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundImage: isAll ? AMBER_GRADIENT : 'none',
          bgcolor: isAll ? 'transparent' : 'rgba(201,122,43,0.12)',
          color: isAll ? '#1B1710' : AMBER,
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: 12.5
        }}
      >
        {isAll ? <Icon name="family" fontSize="small" /> : name.charAt(0)}
      </Box>
      <Typography fontSize={14} fontWeight={700}>
        {name}
      </Typography>
    </Box>
  );

  if (stats.invested === 0) {
    return (
      <Paper sx={{ p: 2, borderRadius: 1, mb: 1.5 }}>
        {header}
        <Typography fontSize={12} color="text.secondary">
          No deposits yet
        </Typography>
      </Paper>
    );
  }

  const pct = Math.min(100, Math.round((stats.recovered / stats.invested) * 100));
  const barColor = stats.achieved ? GREEN : AMBER;
  const timeLabel = stats.achieved
    ? 'Break-even reached'
    : stats.months !== null
      ? `${fmtYearsMonths(stats.months)} remaining`
      : 'No active deposits earning interest';

  return (
    <Paper sx={{ p: 2, borderRadius: 1, mb: 1.5 }}>
      {header}

      <Box sx={{ display: 'flex', gap: 2.25 }}>
        <Box>
          <Typography fontSize={11} color="text.secondary">
            Invested
          </Typography>
          <Typography sx={monoSx} fontSize={16} fontWeight={600} mt={0.25}>
            {fmtMoney(stats.invested)}
          </Typography>
        </Box>
        <Box>
          <Typography fontSize={11} color="text.secondary">
            Withdrawn
          </Typography>
          <Typography sx={monoSx} fontSize={16} fontWeight={600} mt={0.25}>
            {fmtMoney(stats.withdrawn)}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ height: 6, borderRadius: 0.75, bgcolor: 'divider', overflow: 'hidden', mt: 1.75, mb: 0.5 }}>
        <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: barColor, borderRadius: 0.75 }} />
      </Box>
      <Typography fontSize={10.5} color="text.secondary">
        {pct}% recovered (withdrawn + interest vs. invested)
      </Typography>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mt: 1.75,
          pt: 1.5,
          borderTop: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Typography fontSize={11.5} color="text.secondary">
          Pending to break even
        </Typography>
        <Typography sx={monoSx} fontSize={14} fontWeight={600} color={stats.achieved ? GREEN : 'text.primary'}>
          {stats.achieved ? 'Rs. 0.00' : fmtMoney(stats.pending)}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
        <Typography fontSize={11.5} color="text.secondary">
          Est. time to break even
        </Typography>
        <Typography fontSize={13} fontWeight={700} color={stats.achieved ? GREEN : 'text.primary'}>
          {timeLabel}
        </Typography>
      </Box>
    </Paper>
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
