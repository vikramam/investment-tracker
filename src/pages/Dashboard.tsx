import { useMemo, useRef, useState } from 'react';
import { Box, Paper, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useFamilyData } from '@/data/useFamilyData';
import { allPendingPayouts, allUpcomingPreviews, breakEvenStats } from '@/lib/ledger';
import { fmtMoney } from '@/lib/money';
import { endOfMonthISO, fmtDate } from '@/lib/dates';
import { EmptyState } from '@/components/EmptyState';
import { RowCardsSkeleton, SliderCardsSkeleton } from '@/components/skeletons';
import { Icon } from '@/icons/Icon';
import { AMBER, AMBER_GRADIENT, monoSx } from '@/theme';
import type { MemberWithDeposits } from '@/types';

const CARD_WIDTH = 250;
const CARD_GAP = 12;

type UpcomingSummary = {
  total: number;
  lastDate: string;
  monthEnd: string;
  monthEndTotal: number;
  showMonthSplit: boolean;
};

type Slide =
  | { type: 'all'; name: string; stats: ReturnType<typeof breakEvenStats> }
  | { type: 'milestone'; summary: UpcomingSummary }
  | { type: 'member'; name: string; member: MemberWithDeposits; stats: ReturnType<typeof breakEvenStats> };

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

  /**
   * "Visit by <date> to collect everything upcoming" — the furthest due
   * date among every deposit's next payout preview, plus the total across
   * all of them (since visiting on that last date means every earlier
   * preview has become due by then too), and a this-month-only subtotal
   * so the family can see what's collectible sooner without waiting for
   * the furthest deposit's cycle.
   */
  const upcomingSummary = useMemo<UpcomingSummary | null>(() => {
    const rows = allUpcomingPreviews(members);
    if (rows.length === 0) return null;
    const total = rows.reduce((s, r) => s + r.amount, 0);
    const lastDate = rows[rows.length - 1].due_date;
    const monthEnd = endOfMonthISO();
    const monthEndTotal = rows.filter((r) => r.due_date <= monthEnd).reduce((s, r) => s + r.amount, 0);
    return { total, lastDate, monthEnd, monthEndTotal, showMonthSplit: monthEndTotal > 0 && monthEndTotal < total };
  }, [members]);

  const slides = useMemo<Slide[]>(() => {
    const allDeposits = members.flatMap((m) => m.deposits);
    const result: Slide[] = [{ type: 'all', name: 'All family', stats: breakEvenStats(allDeposits) }];
    if (upcomingSummary) result.push({ type: 'milestone', summary: upcomingSummary });
    members.forEach((m) => result.push({ type: 'member', name: m.name, member: m, stats: breakEvenStats(m.deposits) }));
    return result;
  }, [members, upcomingSummary]);

  function onSliderScroll() {
    const el = trackRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / (CARD_WIDTH + CARD_GAP));
    setActiveSlide(idx);
  }

  if (error) {
    return <EmptyState title="Couldn't load data" subtitle={error} onAction={refresh} />;
  }

  return (
    <Box>
      <Typography variant="h3" fontSize={30} mb={0.25}>
        {greeting()}
      </Typography>
      <Typography fontSize={13} color="text.secondary" mb={2.5}>
        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
      </Typography>

      {loading ? (
        <>
          <SliderCardsSkeleton />
          <Box sx={{ mt: 2.5 }}>
            <RowCardsSkeleton rows={2} />
          </Box>
        </>
      ) : (
        <>
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
          px: 2.5,
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' }
        }}
      >
        {slides.map((slide, i) =>
          slide.type === 'milestone' ? (
            <MilestoneSlideCard
              key={i}
              summary={slide.summary}
              fullWidth={slides.length <= 1}
              onView={() => navigate('/collections', { state: { tab: 'upcoming' } })}
            />
          ) : (
            <SlideCard
              key={i}
              name={slide.name}
              member={slide.type === 'member' ? slide.member : null}
              stats={slide.stats}
              isAll={slide.type === 'all'}
              fullWidth={slides.length <= 1}
              onView={() => slide.type === 'member' && navigate(`/family/${slide.member.id}`)}
            />
          )
        )}
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
            <Typography fontSize={14} fontWeight={600}>
              {g.name}
            </Typography>
            <Typography sx={monoSx} fontSize={15} fontWeight={600}>
              {fmtMoney(g.total)}
            </Typography>
          </Button>
        ))
      )}
        </>
      )}
    </Box>
  );
}

function MilestoneSlideCard({
  summary,
  fullWidth,
  onView
}: {
  summary: UpcomingSummary;
  fullWidth: boolean;
  onView: () => void;
}) {
  return (
    <Paper
      sx={{
        width: fullWidth ? '100%' : CARD_WIDTH,
        minWidth: CARD_WIDTH,
        scrollSnapAlign: 'start',
        flexShrink: 0,
        p: 2,
        borderRadius: 1,
        backgroundImage: 'linear-gradient(160deg, rgba(201,122,43,0.14), rgba(201,122,43,0.02))',
        borderColor: 'rgba(201,122,43,0.35)'
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
            backgroundImage: AMBER_GRADIENT,
            color: '#1B1710'
          }}
        >
          <Icon name="calendar" fontSize="small" />
        </Box>
        <Typography fontSize={13.5} fontWeight={600}>
          Next collection
        </Typography>
      </Box>

      <Typography fontSize={11} color="text.secondary">
        Visit by
      </Typography>
      <Typography sx={monoSx} fontSize={20} fontWeight={600} mb={1}>
        {fmtDate(summary.lastDate)}
      </Typography>

      <Box sx={{ display: 'flex', gap: 1.75 }}>
        <Box>
          <Typography fontSize={10.5} color="text.secondary">
            Total collectible
          </Typography>
          <Typography sx={monoSx} fontSize={12.5}>
            {fmtMoney(summary.total)}
          </Typography>
        </Box>
        {summary.showMonthSplit && (
          <Box>
            <Typography fontSize={10.5} color="text.secondary">
              By month end
            </Typography>
            <Typography sx={monoSx} fontSize={12.5}>
              {fmtMoney(summary.monthEndTotal)}
            </Typography>
          </Box>
        )}
      </Box>

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
        View upcoming
      </Button>
    </Paper>
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
      <Typography sx={monoSx} fontSize={22} fontWeight={600} mb={1}>
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
