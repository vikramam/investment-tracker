import { Box, IconButton, BottomNavigation, BottomNavigationAction, Typography, useTheme } from '@mui/material';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { Icon } from '@/icons/Icon';
import { useThemeMode } from '@/lib/themeMode';

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

  const activeTab = TABS.find((t) => t.path === location.pathname)?.path ?? '/';

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
          backdropFilter: 'blur(12px)',
          bgcolor: mode === 'dark' ? 'rgba(9,9,11,0.7)' : 'rgba(250,250,250,0.7)'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <IconButton
            onClick={() => navigate('/settings')}
            size="small"
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: '10px',
              bgcolor: 'background.paper'
            }}
          >
            <Icon name="menu" fontSize="small" />
          </IconButton>
          <Typography variant="h6" fontSize={16} fontWeight={700}>
            Investment Tracker
          </Typography>
        </Box>
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
      </Box>

      <Box sx={{ flex: 1, px: 2.5, pb: 12, maxWidth: 520, width: '100%', mx: 'auto' }}>
        <Outlet />
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
    </Box>
  );
}
