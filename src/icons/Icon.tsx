import { SvgIcon, type SvgIconProps } from '@mui/material';
import type { ReactNode } from 'react';

const SHAPES: Record<string, ReactNode> = {
  home: (
    <>
      <path d="M4 11 12 4l8 7" />
      <path d="M6 10v9h12v-9" />
    </>
  ),
  family: (
    <>
      <circle cx={9} cy={8} r={3} />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx={17} cy={9} r={2.4} />
      <path d="M15.5 14.3c2.4.4 4.5 2.4 4.5 5.7" />
    </>
  ),
  collect: (
    <>
      <rect x={2} y={6} width={20} height={12} rx={2} />
      <circle cx={12} cy={12} r={3} />
    </>
  ),
  analytics: (
    <>
      <path d="M4 20V14" />
      <path d="M12 20V6" />
      <path d="M20 20V11" />
      <path d="M4 20h16" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  chevronRight: <path d="M9 6l6 6-6 6" />,
  chevronLeft: <path d="M15 6l-6 6 6 6" />,
  calendar: (
    <>
      <rect x={3} y={5} width={18} height={16} rx={2} />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </>
  ),
  withdraw: (
    <>
      <circle cx={12} cy={12} r={9} />
      <path d="M12 7v7M8.5 11 12 14.5 15.5 11" />
    </>
  ),
  bell: (
    <>
      <path d="M12 8v5M12 17h.01" />
      <path d="M10.3 3.9 1.8 18.5a1.5 1.5 0 0 0 1.3 2.3h17.8a1.5 1.5 0 0 0 1.3-2.3L13.7 3.9a1.5 1.5 0 0 0-2.6 0Z" />
    </>
  ),
  check: <path d="M4 12l6 6 10-10" />,
  sun: (
    <>
      <circle cx={12} cy={12} r={4.2} />
      <path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8" />
    </>
  ),
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />,
  menu: (
    <>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </>
  ),
  settings: (
    <>
      <circle cx={12} cy={12} r={3} />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
      <path d="M10 11v6M14 11v6" />
    </>
  )
};

export type IconName = keyof typeof SHAPES;

/**
 * Deliberately NOT using MUI's Sharp icon set — this app's visual language
 * is a simple 2px-stroke line-icon set, matching MIG Stock's mobile
 * redesign. Add new icons here as new screens need them, using real
 * <circle>/<rect>/<path> elements (not path-string hacks), rather than
 * falling back to an icon library.
 */
export function Icon({ name, ...props }: { name: IconName } & SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <g fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {SHAPES[name]}
      </g>
    </SvgIcon>
  );
}
