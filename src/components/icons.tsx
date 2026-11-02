import type { ReactNode } from 'react';

type P = { size?: number; className?: string };

function Svg({ size = 22, className, children }: P & { children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

export const IconSpeaker = (p: P) => (
  <Svg {...p}><path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" /><path d="M15.5 9a4.2 4.2 0 0 1 0 6" /><path d="M18.2 6.5a8 8 0 0 1 0 11" /></Svg>
);
export const IconSlow = (p: P) => (
  <Svg {...p}><path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" /><path d="M15.5 10.2a2.6 2.6 0 0 1 0 3.6" /></Svg>
);
export const IconMic = (p: P) => (
  <Svg {...p}><rect x="9" y="3.5" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5v3" /></Svg>
);
export const IconStop = (p: P) => (
  <Svg {...p}><rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor" stroke="none" /></Svg>
);
export const IconPlay = (p: P) => (
  <Svg {...p}><path d="M8 5.5v13l10-6.5z" fill="currentColor" stroke="none" /></Svg>
);
export const IconClose = (p: P) => (
  <Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>
);
export const IconCheck = (p: P) => (
  <Svg {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>
);
export const IconCross = (p: P) => (
  <Svg {...p}><path d="M7 7l10 10M17 7L7 17" /></Svg>
);
export const IconHome = (p: P) => (
  <Svg {...p}><path d="M4 10.5L12 4l8 6.5V20h-5.5v-5.5h-5V20H4z" /></Svg>
);
export const IconCycle = (p: P) => (
  <Svg {...p}><path d="M19.5 12a7.5 7.5 0 0 1-13.1 5M4.5 12a7.5 7.5 0 0 1 13.1-5" /><path d="M17.8 3.5V7h-3.5M6.2 20.5V17h3.5" /></Svg>
);
export const IconBook = (p: P) => (
  <Svg {...p}><path d="M4.5 5.5c2.5-1 5-1 7.5.5v13c-2.5-1.5-5-1.5-7.5-.5zM19.5 5.5c-2.5-1-5-1-7.5.5v13c2.5-1.5 5-1.5 7.5-.5z" /></Svg>
);
export const IconPin = (p: P) => (
  <Svg {...p}><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /></Svg>
);
export const IconPlane = (p: P) => (
  <Svg {...p}><path d="M10.5 13.5L3 11l1.5-1.5 7.5.5 4.5-4.5a1.8 1.8 0 0 1 2.5 2.5L14.5 12.5l.5 7.5L13.5 21.5 11 14z" /></Svg>
);
export const IconLock = (p: P) => (
  <Svg {...p}><rect x="5.5" y="10.5" width="13" height="9.5" rx="2" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></Svg>
);
