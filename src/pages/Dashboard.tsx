import { useMemo, useRef, useState } from 'react';
import { Box, Paper, Typography, Button, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useFamilyData } from '@/data/useFamilyData';
import { allPendingPayouts, breakEvenStats } from '@/lib/ledger';
import { fmtMoney } from '@/lib/money';
import { fmtDate } from '@/lib/dates';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/icons/Icon';
import { AMBER, AMBER_GRADIENT, monoSx } from '@/theme';
import type { MemberWithDeposits } from '@/types';

const CARD_WIDTH = 250;
const CARD_GAP = 12;

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function Dashboard() {
  const { members, loading, error, refresh } = useFamilyData();
  const navigate = useNavigate();
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const readyToCollect = useMemo(() => {
    const map = new Map<string, { memberId: string; name: string; total: number }>();
    allPendingPayouts(members).forEach((p) => {
      if (!map.has(p.memberId)) map.set(p.memberId, { memberId: p.memberId, name: p.memberName, total: 0 });
      map.get(p.memberId)!.total += p.amount;
    });
    return [...map.values()];
  }, [members]);

  const slides = useMemo(() => {
    const allDeposits = members.flatMap((m) => m.deposits);
    return [
      { name: 'All family', member: null, stats: breakEvenStats(allDeposits), isAll: true },
      ...members.map((m) => ({
        name: m.name,
        member: m,
        stats: breakEvenStats(m.deposits),
        isAll: false
      }))
    ];
  }, [members]);

  function onSliderScroll() {
    const el = trackRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / (CARD_WIDTH + CARD_GAP));
    setActiveSlide(idx);
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }
  if (error) {
    return <EmptyState title="Couldn't load data" subtitle={error} onAction={refresh} />;
  }

  return (
    <Box sx={{ animation: 'fadeUp 0.35s ease both' }}>
      <Typography variant="h3" fontSize={26} mb={0.25}>
        {greeting()}
      </Typography>
      <Typography fontSize={13} color="text.secondary" mb={2.5}>
        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
      </Typography>

      <Typography fontSize={13} fontWeight={600} mb={1.25}>
        Family overview &middot; swipe for each member
      </Typography>
      <Box
        ref={trackRef}
        onScroll={onSliderScroll}
        sx={{
          display: 'flex',
          gap: `${CARD_GAP}px`,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          pb: 0.5,
          mx: -2.5,
          px: 2.5
        }}
      >
        {slides.map((slide, i) => (
          <SlideCard
            key={i}
            name={slide.name}
            member={slide.member}
            stats={slide.stats}
            isAll={slide.isAll}
            fullWidth={slides.length <= 1}
            onView={() => slide.member && navigate(`/family/${slide.member.id}`)}
          />
        ))}
      </Box>
      <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'center', mt: 1.25, mb: 2.5 }}>
        {slides.map((_, i) => (
          <Box
            key={i}
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: i === activeSlide ? AMBER : 'divider',
              transition: 'background 0.2s'
            }}
          />
        ))}
      </Box>

      <Typography fontSize={13} fontWeight={600} mb={1.25}>
        Ready To Collect
      </Typography>
      {readyToCollect.length === 0 ? (
        <EmptyState title="No payouts due" subtitle="Add a deposit to start the monthly cycle" />
      ) : (
        readyToCollect.map((g) => (
          <Button
            key={g.memberId}
            fullWidth
            onClick={() => navigate('/collections')}
            sx={{
              justifyContent: 'space-between',
              textAlign: 'left',
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 0.875,
              px: 1.75,
              py: 1.5,
              mb: 1,
              color: 'text.primary'
            }}
          >
            <Typography fontSize={13} fontWeight={600}>
              {g.name}
            </Typography>
            <Typography sx={monoSx} fontSize={14} fontWeight={600}>
              {fmtMoney(g.total)}
            </Typography>
          </Button>
        ))
      )}
    </Box>
  );
}

function SlideCard({
  name,
  member,
  stats,
  isAll,
  fullWidth,
  onView
}: {
  name: string;
  member: MemberWithDeposits | null;
  stats: ReturnType<typeof breakEvenStats>;
  isAll: boolean;
  fullWidth: boolean;
  onView: () => void;
}) {
  const nextDue =
    !isAll && member
      ? member.deposits
          .flatMap((d) => d.payouts)
          .filter((p) => p.status === 'pending')
          .sort((a, b) => a.due_date.localeCompare(b.due_date))[0]
      : null;
  const hasNoDeposits = !isAll && member && member.deposits.length === 0;

  return (
    <Paper
      sx={{
        width: fullWidth ? '100%' : CARD_WIDTH,
        minWidth: CARD_WIDTH,
        scrollSnapAlign: 'start',
        flexShrink: 0,
        p: 2,
        borderRadius: 1,
        backgroundImage: isAll
          ? 'linear-gradient(160deg, rgba(201,122,43,0.14), rgba(201,122,43,0.02))'
          : 'none',
        borderColor: isAll ? 'rgba(201,122,43,0.35)' : 'divider'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
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
        <Typography fontSize={13.5} fontWeight={600}>
          {name}
        </Typography>
      </Box>

      <Typography fontSize={11} color="text.secondary">
        Invested
      </Typography>
      <Typography sx={monoSx} fontSize={19} fontWeight={600} mb={1}>
        {fmtMoney(stats.invested)}
      </Typography>

      <Box sx={{ display: 'flex', gap: 1.75 }}>
        <Box>
          <Typography fontSize={10.5} color="text.secondary">
            Interest
          </Typography>
          <Typography sx={monoSx} fontSize={12.5}>
            {fmtMoney(stats.interestPaid)}
          </Typography>
        </Box>
        <Box>
          <Typography fontSize={10.5} color="text.secondary">
            Withdrawn
          </Typography>
          <Typography sx={monoSx} fontSize={12.5}>
            {fmtMoney(stats.withdrawn)}
          </Typography>
        </Box>
      </Box>

      {nextDue && (
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
          <Typography fontSize={10.5} color="text.secondary">
            Next {fmtDate(nextDue.due_date)} &middot; {fmtMoney(nextDue.amount)}
          </Typography>
        </Box>
      )}
      {hasNoDeposits && (
        <Typography fontSize={10.5} color="text.secondary" mt={1.25} pt={1.25} borderTop="1px solid" borderColor="divider">
          No deposits yet
        </Typography>
      )}

      {!isAll && (
        <Button
          fullWidth
          onClick={onView}
          sx={{
            mt: 1.5,
            border: '1px solid',
            borderColor: 'divider',
            color: 'text.primary',
            fontSize: 11.5,
            py: 0.75
          }}
        >
          View details
        </Button>
      )}
    </Paper>
  );
}
