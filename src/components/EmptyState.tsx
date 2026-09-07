import { Box, Button, Typography } from '@mui/material';

export function EmptyState({
  title,
  subtitle,
  actionLabel,
  onAction
}: {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
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
      {onAction && (
        <Button variant="outlined" size="small" onClick={onAction} sx={{ mt: 1.5, fontSize: 11.5 }}>
          {actionLabel ?? 'Try again'}
        </Button>
      )}
    </Box>
  );
}
