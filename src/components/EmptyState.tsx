import { Box, Typography } from '@mui/material';

export function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <Box
      sx={{
        textAlign: 'center',
        py: 3.5,
        px: 1.5,
        bgcolor: 'background.paper',
        border: '1px dashed',
        borderColor: 'divider',
        borderRadius: 1
      }}
    >
      <Typography fontSize={13} fontWeight={600}>
        {title}
      </Typography>
      <Typography fontSize={12} color="text.secondary" mt={0.5}>
        {subtitle}
      </Typography>
    </Box>
  );
}
