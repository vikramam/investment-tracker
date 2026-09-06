import { Box, List, ListItemButton, ListItemText, Typography } from '@mui/material';
import { Icon } from '@/icons/Icon';
import type { FamilyMember } from '@/types';

export function CollectorPicker({
  members,
  value,
  onChange
}: {
  members: FamilyMember[];
  value: string | null;
  onChange: (memberId: string) => void;
}) {
  return (
    <Box mb={1.5}>
      <Typography fontSize={11.5} color="text.secondary" mb={0.75}>
        Who collected it?
      </Typography>
      <List
        disablePadding
        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 0.75, overflow: 'hidden' }}
      >
        {members.map((m) => {
          const selected = value === m.id;
          return (
            <ListItemButton
              key={m.id}
              onClick={() => onChange(m.id)}
              sx={{
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: selected ? 'rgba(201,122,43,0.08)' : 'transparent',
                '&:last-of-type': { borderBottom: 'none' }
              }}
            >
              <ListItemText
                primaryTypographyProps={{ fontSize: 13, fontWeight: selected ? 700 : 500 }}
              >
                {m.name}
              </ListItemText>
              {selected && <Icon name="check" fontSize="small" sx={{ color: 'primary.main' }} />}
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
}
