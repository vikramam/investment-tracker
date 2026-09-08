// Shared shimmer-skeleton building blocks, shaped like the real content they stand in
// for, so a page's loading state roughly outlines what's about to appear instead of a
// generic gray box. Composed per-page rather than one "PageSkeleton" since each page's
// real layout differs (slider, list-with-chevron, stat row, progress-bar card) — mirrors
// MIG Stock's src/components/skeletons.tsx pattern (see that app's own file for the
// sibling implementation this one was modeled on, not shared code).
import { Box, Paper, Skeleton, Stack } from '@mui/material';

export function StatRowSkeleton({ stats = 3 }: { stats?: number }) {
  return (
    <Paper sx={{ p: 2, borderRadius: 1, mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1.75, rowGap: 1.5 }}>
      {Array.from({ length: stats }).map((_, i) => (
        <Box key={i} sx={{ minWidth: 100, flex: '1 1 auto' }}>
          <Skeleton variant="text" width="60%" height={14} />
          <Skeleton variant="text" width="75%" height={22} sx={{ mt: 0.25 }} />
        </Box>
      ))}
    </Paper>
  );
}

export function RowCardsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Stack spacing={1.25}>
      {Array.from({ length: rows }).map((_, i) => (
        <Paper key={i} sx={{ p: 1.75, borderRadius: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Skeleton variant="rounded" width={38} height={38} sx={{ flexShrink: 0, borderRadius: '12px' }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Skeleton variant="text" width="45%" height={18} />
            <Skeleton variant="text" width="30%" height={14} sx={{ mt: 0.25 }} />
          </Box>
          <Skeleton variant="text" width={64} height={20} />
        </Paper>
      ))}
    </Stack>
  );
}

export function SliderCardsSkeleton() {
  return (
    <Box sx={{ display: 'flex', gap: 1.5, overflow: 'hidden', mx: -2.5, px: 2.5 }}>
      {Array.from({ length: 2 }).map((_, i) => (
        <Paper key={i} sx={{ p: 2, borderRadius: 1, minWidth: 250, flexShrink: 0 }}>
          <Skeleton variant="text" width="50%" height={16} />
          <Skeleton variant="text" width="70%" height={30} sx={{ mt: 0.75 }} />
          <Skeleton variant="rounded" height={6} sx={{ mt: 2, borderRadius: 0.75 }} />
        </Paper>
      ))}
    </Box>
  );
}

export function AnalyticsCardSkeleton() {
  return (
    <Paper sx={{ p: 2, borderRadius: 1, mb: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.75 }}>
        <Skeleton variant="rounded" width={28} height={28} sx={{ borderRadius: '9px' }} />
        <Skeleton variant="text" width="35%" height={18} />
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.75, rowGap: 1.5 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Box key={i} sx={{ minWidth: 100, flex: '1 1 auto' }}>
            <Skeleton variant="text" width="60%" height={14} />
            <Skeleton variant="text" width="75%" height={22} sx={{ mt: 0.25 }} />
          </Box>
        ))}
      </Box>
      <Skeleton variant="rounded" height={6} sx={{ mt: 1.75, mb: 0.5, borderRadius: 0.75 }} />
      <Skeleton variant="text" width="55%" height={14} />
    </Paper>
  );
}
