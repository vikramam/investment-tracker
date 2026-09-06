import { Box, SwipeableDrawer, Typography } from '@mui/material';
import type { ReactNode } from 'react';

export function BottomSheet({
  open,
  onClose,
  title,
  children
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <SwipeableDrawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      onOpen={() => {}}
      disableSwipeToOpen
      PaperProps={{
        sx: { borderRadius: '24px 24px 0 0', p: '18px 20px 26px', maxWidth: 520, mx: 'auto' }
      }}
    >
      <Box sx={{ width: 36, height: 4, bgcolor: 'divider', borderRadius: 0.5, mx: 'auto', mb: 1.75 }} />
      <Typography variant="h6" fontSize={16} mb={1.75}>
        {title}
      </Typography>
      {children}
    </SwipeableDrawer>
  );
}
