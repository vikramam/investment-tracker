import { useState } from 'react';
import { Box, Button, IconButton, Paper, TextField, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useFamilyData } from '@/data/useFamilyData';
import { breakEvenStats } from '@/lib/ledger';
import { fmtMoney } from '@/lib/money';
import { AMBER, AMBER_GRADIENT, monoSx } from '@/theme';
import { Icon } from '@/icons/Icon';
import { BottomSheet } from '@/components/BottomSheet';
import { RowCardsSkeleton } from '@/components/skeletons';

export function Family() {
  const { members, loading, addMember } = useFamilyData();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await addMember(name.trim());
      setName('');
      setSheetOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box sx={{ animation: 'fadeUp 0.35s ease both' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4" fontSize={28}>
          Family
        </Typography>
        <IconButton
          onClick={() => setSheetOpen(true)}
          sx={{ width: 32, height: 32, borderRadius: '10px', backgroundImage: AMBER_GRADIENT, color: '#1B1710' }}
        >
          <Icon name="plus" fontSize="small" />
        </IconButton>
      </Box>

      {loading ? (
        <RowCardsSkeleton rows={3} />
      ) : (
        members.map((m) => {
        const stats = breakEvenStats(m.deposits);
        return (
          <Paper
            key={m.id}
            component="button"
            onClick={() => navigate(`/family/${m.id}`)}
            sx={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 1.75,
              borderRadius: 1,
              mb: 1.25,
              cursor: 'pointer',
              textAlign: 'left',
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: '12px',
                  bgcolor: 'rgba(201,122,43,0.12)',
                  color: AMBER,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  fontSize: 16.5
                }}
              >
                {m.name.charAt(0)}
              </Box>
              <Box>
                <Typography fontSize={15.5} fontWeight={600}>
                  {m.name}
                </Typography>
                <Typography fontSize={12.5} color="text.secondary" mt={0.25}>
                  {m.deposits.length} deposit{m.deposits.length === 1 ? '' : 's'}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={monoSx} fontSize={15} fontWeight={600}>
                {fmtMoney(stats.invested)}
              </Typography>
              <Icon name="chevronRight" fontSize="small" sx={{ color: 'text.secondary' }} />
            </Box>
          </Paper>
        );
        })
      )}

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Add family member">
        <TextField
          fullWidth
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Button fullWidth variant="contained" onClick={submit} disabled={saving}>
          {saving ? 'Saving…' : 'Save member'}
        </Button>
      </BottomSheet>
    </Box>
  );
}
