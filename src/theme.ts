import { createTheme, type Theme } from '@mui/material/styles';
import type { PaletteMode } from '@mui/material';

export const AMBER = '#C97A2B';
export const AMBER_GRADIENT = 'linear-gradient(135deg,#E0A461 0%,#C97A2B 60%,#9C5D1E 100%)';
export const GREEN = '#5FB158';

// Mode-specific colors/shadows/glass tints that aren't expressible as plain
// MUI palette tokens. Same pattern as MIG Stock's getModeTokens().
export function getModeTokens(mode: PaletteMode) {
  if (mode === 'dark') {
    return {
      bg: '#09090b',
      card: '#18181b',
      border: '#27272a',
      text: '#F4F4F5',
      textSecondary: '#A1A1AA',
      textTertiary: '#71717A',
      ambientGlow: 'radial-gradient(circle at 50% -10%, rgba(201,122,43,0.10), transparent 60%)',
      cardShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 12px 24px -8px rgba(0,0,0,0.5)',
      buttonGlowAlpha: 0.45,
      inputBg: 'rgba(255,255,255,0.04)'
    };
  }
  return {
    bg: '#fafafa',
    card: '#ffffff',
    border: 'rgba(15,23,42,0.08)',
    text: '#0f172a',
    textSecondary: '#64748b',
    textTertiary: '#94a3b8',
    ambientGlow: 'none',
    cardShadow: '0 0 0 1px rgba(15,23,42,0.05), 0 1px 3px rgba(15,23,42,0.06)',
    buttonGlowAlpha: 0.28,
    inputBg: 'rgba(15,23,42,0.04)'
  };
}

export function getTheme(mode: PaletteMode): Theme {
  const t = getModeTokens(mode);

  return createTheme({
    palette: {
      mode,
      primary: { main: AMBER, light: '#E0A461', dark: '#9C5D1E' },
      secondary: { main: '#3E6680', dark: '#2C4A5E', light: '#6C93AB', contrastText: '#FFFFFF' },
      success: { main: GREEN },
      warning: { main: '#D9822B' },
      error: { main: '#E5564A' },
      background: { default: t.bg, paper: t.card },
      text: { primary: t.text, secondary: t.textSecondary },
      divider: t.border
    },
    shape: { borderRadius: 16 },
    typography: {
      fontFamily: "'Inter', 'Helvetica', 'Arial', sans-serif",
      h1: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, letterSpacing: '-0.03em' },
      h2: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, letterSpacing: '-0.03em' },
      h3: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, letterSpacing: '-0.02em' },
      h4: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, letterSpacing: '-0.02em' },
      h5: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, letterSpacing: '-0.02em' },
      h6: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, letterSpacing: '-0.02em' },
      subtitle1: { fontWeight: 600, letterSpacing: '-0.01em' },
      subtitle2: { fontWeight: 600, letterSpacing: '-0.01em' }
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '@keyframes fadeUp': {
            from: { opacity: 0, transform: 'translateY(8px)' },
            to: { opacity: 1, transform: 'translateY(0)' }
          },
          body: {
            backgroundColor: t.bg,
            backgroundImage: t.ambientGlow,
            backgroundAttachment: 'fixed'
          },
          '@media (prefers-reduced-motion: reduce)': {
            '*': { animationDuration: '0.01ms !important', transitionDuration: '0.01ms !important' }
          }
        }
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            border: `1px solid ${t.border}`,
            boxShadow: t.cardShadow,
            backgroundImage: 'none',
            animation: 'fadeUp 0.35s ease both',
            // Drawer/Dialog/Popover/Menu paper surfaces already animate their own
            // open/close via MUI's Slide/Grow/Fade transition (JS-driven, per-frame
            // inline transform) — the fadeUp keyframe above fights that same
            // `transform` property and makes sheets/menus feel laggy on open.
            '&.MuiDrawer-paper, &.MuiDialog-paper, &.MuiPopover-paper, &.MuiMenu-paper, &.MuiAutocomplete-paper': {
              animation: 'none'
            }
          }
        }
      },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 12, textTransform: 'none', fontWeight: 700, transition: '200ms' }
        },
        variants: [
          {
            props: { variant: 'contained', color: 'primary' },
            style: {
              backgroundImage: AMBER_GRADIENT,
              color: '#1B1710',
              boxShadow: `0 6px 16px rgba(201,122,43,${t.buttonGlowAlpha})`,
              '&:hover': { transform: 'scale(1.02)', backgroundImage: AMBER_GRADIENT }
            }
          }
        ]
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            transition: 'transform 0.2s ease',
            '&:hover': { transform: 'scale(1.08)' },
            '&:active': { transform: 'scale(0.94)' }
          }
        }
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { borderRadius: 16, backgroundColor: t.inputBg },
          notchedOutline: { borderColor: t.border }
        }
      },
      MuiSkeleton: {
        defaultProps: { animation: 'wave' }
      },
      MuiChip: {
        styleOverrides: { root: { borderRadius: 10, fontWeight: 600 } }
      }
    }
  });
}

// Numeric values (money, counts, receipt-style numbers) always use
// JetBrains Mono — reused directly as an sx fragment.
export const monoSx = { fontFamily: "'JetBrains Mono', monospace" };
