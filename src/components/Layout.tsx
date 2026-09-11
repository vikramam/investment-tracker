import { useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  BottomNavigation,
  BottomNavigationAction,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Typography,
  useTheme
} from '@mui/material';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Icon } from '@/icons/Icon';
import { useThemeMode } from '@/lib/themeMode';
import { supabase } from '@/lib/supabase';
import { useFamilyData } from '@/data/useFamilyData';
import { BottomSheet } from '@/components/BottomSheet';

const TABS = [
  { path: '/', label: 'Home', icon: 'home' as const },
  { path: '/collections', label: 'Collect', icon: 'collect' as const },
  { path: '/family', label: 'Family', icon: 'family' as const },
  { path: '/analytics', label: 'Analytics', icon: 'analytics' as const }
];

export function Layout() {
  const theme = useTheme();
  const { mode, toggle } = useThemeMode();
  const navigate = useNavigate();
  const location = useLocation();
  const { members, renameMembers } = useFamilyData();
  const prefersReducedMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editNamesOpen, setEditNamesOpen] = useState(false);
  const [names, setNames] = useState<Record<string, string>>({});
  const [savingNames, setSavingNames] = useState(false);

  const activeTab = TABS.find((t) => t.path === location.pathname)?.path ?? '/';

  function openEditNames() {
    setMenuOpen(false);
    setNames(Object.fromEntries(members.map((m) => [m.id, m.name])));
    setEditNamesOpen(true);
  }

  async function saveNames() {
    const updates = members
      .filter((m) => names[m.id]?.trim() && names[m.id].trim() !== m.name)
      .map((m) => ({ id: m.id, name: names[m.id].trim() }));
    if (updates.length === 0) {
      setEditNamesOpen(false);
      return;
    }
    setSavingNames(true);
    try {
      await renameMembers(updates);
      setEditNamesOpen(false);
    } finally {
      setSavingNames(false);
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 2.5,
          pt: 2,
          pb: 0.5,
          position: 'sticky',
          top: 0,
          zIndex: 10,
          borderBottom: `1px solid ${theme.palette.divider}`,
          backdropFilter: 'blur(12px)',
          bgcolor: mode === 'dark' ? 'rgba(9,9,11,0.7)' : 'rgba(250,250,250,0.7)'
        }}
      >
        <Typography variant="h6" fontSize={18} fontWeight={700}>
          Investment Tracker
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            onClick={toggle}
            size="small"
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: '10px',
              bgcolor: 'background.paper'
            }}
          >
            <Icon name={mode === 'dark' ? 'moon' : 'sun'} fontSize="small" />
          </IconButton>
          <IconButton
            onClick={() => setMenuOpen(true)}
            size="small"
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: '10px',
              bgcolor: 'background.paper'
            }}
          >
            <Icon name="menu" fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          px: 2.5,
          pt: 2,
          pb: 12,
          maxWidth: 520,
          width: '100%',
          mx: 'auto',
          position: 'relative',
          overflowX: 'hidden'
        }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: prefersReducedMotion ? 0 : 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: prefersReducedMotion ? 0 : -16 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.22, ease: [0.4, 0, 0.2, 1] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </Box>

      <BottomNavigation
        value={activeTab}
        onChange={(_, value) => navigate(value)}
        showLabels
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          borderTop: `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.paper',
          zIndex: 10,
          pb: 'env(safe-area-inset-bottom)'
        }}
      >
        {TABS.map((tab) => (
          <BottomNavigationAction
            key={tab.path}
            label={tab.label}
            value={tab.path}
            icon={<Icon name={tab.icon} fontSize="small" />}
            sx={{
              color: 'text.secondary',
              '&.Mui-selected': { color: 'primary.main' }
            }}
          />
        ))}
      </BottomNavigation>

      <BottomSheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Menu">
        <List disablePadding>
          <ListItemButton
            onClick={() => {
              setMenuOpen(false);
              navigate('/settings');
            }}
            sx={{ borderRadius: 1 }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
              <Icon name="settings" fontSize="small" />
            </ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: 13.5, fontWeight: 600 }}>
              Settings
            </ListItemText>
          </ListItemButton>
          <ListItemButton onClick={openEditNames} sx={{ borderRadius: 1 }}>
            <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
              <Icon name="family" fontSize="small" />
            </ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: 13.5, fontWeight: 600 }}>
              Edit names
            </ListItemText>
          </ListItemButton>
          <Divider sx={{ my: 1 }} />
          <ListItemButton
            onClick={() => {
              setMenuOpen(false);
              void supabase.auth.signOut();
            }}
            sx={{ borderRadius: 1 }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'error.main' }}>
              <Icon name="logout" fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primaryTypographyProps={{ fontSize: 13.5, fontWeight: 600, color: 'error.main' }}
            >
              Sign out
            </ListItemText>
          </ListItemButton>
        </List>
      </BottomSheet>

      <BottomSheet open={editNamesOpen} onClose={() => setEditNamesOpen(false)} title="Edit names">
        {members.length === 0 ? (
          <Typography fontSize={13} color="text.secondary" mb={1.5}>
            No family members yet — add one from the Family tab first.
          </Typography>
        ) : (
          members.map((m) => (
            <TextField
              key={m.id}
              fullWidth
              label={m.name}
              value={names[m.id] ?? ''}
              onChange={(e) => setNames((prev) => ({ ...prev, [m.id]: e.target.value }))}
              sx={{ mb: 1.5 }}
            />
          ))
        )}
        <Button
          fullWidth
          variant="contained"
          onClick={saveNames}
          disabled={savingNames || members.length === 0}
        >
          {savingNames ? 'Saving…' : 'Save'}
        </Button>
      </BottomSheet>
    </Box>
  );
}
