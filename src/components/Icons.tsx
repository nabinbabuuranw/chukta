// Chukta's own icon set: 24px grid, 1.75 stroke, square caps and mitred joins, one corner "torn" at 45° where it fits.
import type { SVGProps } from 'react';
type P = SVGProps<SVGSVGElement> & { size?: number };
const S = ({ size = 20, children, ...p }: P & { children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" focusable="false" {...p}>{children}</svg>
);
export const IcBill = (p: P) => <S {...p}><path d="M5 3h10l4 4v14l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21z" /><path d="M8.5 9h7M8.5 12.5h7M8.5 16h4" /></S>;
export const IcHome = (p: P) => <S {...p}><path d="M4 11l8-6.5 8 6.5v9H14v-5.5h-4V20H4z" /></S>;
export const IcPeople = (p: P) => <S {...p}><path d="M9 11.5a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5zM3 20c.6-3.6 3-5.5 6-5.5s5.4 1.9 6 5.5" /><path d="M15.5 5.3a3.2 3.2 0 0 1 0 6M17.5 14.7c1.7.7 3 2.4 3.5 5.3" /></S>;
export const IcChart = (p: P) => <S {...p}><path d="M4 20V4M4 20h16" /><path d="M8 16v-4M12 16V8M16 16v-6" /></S>;
export const IcCog = (p: P) => <S {...p}><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" /><path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1M18.7 18.7l-2.1-2.1M7.4 7.4L5.3 5.3" /></S>;
export const IcPlus = (p: P) => <S {...p}><path d="M12 5v14M5 12h14" /></S>;
export const IcArrow = (p: P) => <S {...p}><path d="M5 12h13M13 6l6 6-6 6" /></S>;
export const IcBack = (p: P) => <S {...p}><path d="M19 12H6M11 6l-6 6 6 6" /></S>;
export const IcCheck = (p: P) => <S {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></S>;
export const IcClock = (p: P) => <S {...p}><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" /><path d="M12 7v5.5l3.5 2" /></S>;
export const IcBell = (p: P) => <S {...p}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z" /><path d="M10 21h4" /></S>;
export const IcChat = (p: P) => <S {...p}><path d="M4 5h16v11H9l-5 4z" /><path d="M8 9.5h8M8 12.5h5" /></S>;
export const IcCopy = (p: P) => <S {...p}><path d="M9 9h11v11H9z" /><path d="M5 15H4V4h11v1" /></S>;
export const IcDownload = (p: P) => <S {...p}><path d="M12 4v11M7 10.5l5 5 5-5M4 20h16" /></S>;
export const IcPrint = (p: P) => <S {...p}><path d="M7 9V3h10v6M7 17H4V9h16v8h-3" /><path d="M7 14h10v7H7z" /></S>;
export const IcSearch = (p: P) => <S {...p}><path d="M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.5 15.5L20 20" /></S>;
export const IcShield = (p: P) => <S {...p}><path d="M12 3l7.5 3v6c0 4.5-3.2 7.7-7.5 9-4.3-1.3-7.5-4.5-7.5-9V6z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></S>;
export const IcWallet = (p: P) => <S {...p}><path d="M4 7h14.5v13H4z" /><path d="M4 7l11-3.5V7M14.5 13.5h4" /></S>;
export const IcLedger = (p: P) => <S {...p}><path d="M5 3h14v18H5z" /><path d="M9 3v18M12 8h4.5M12 12h4.5M12 16h4.5" /></S>;
export const IcClose = (p: P) => <S {...p}><path d="M6 6l12 12M18 6L6 18" /></S>;
export const IcMenu = (p: P) => <S {...p}><path d="M4 7h16M4 12h16M4 17h10" /></S>;
export const IcTrash = (p: P) => <S {...p}><path d="M4.5 6.5h15M9 6.5V4h6v2.5M6.5 6.5L7.5 20h9l1-13.5" /></S>;
export const IcLogout = (p: P) => <S {...p}><path d="M14 4H5v16h9M10 12h10M16 8l4 4-4 4" /></S>;
export const IcCalendar = (p: P) => <S {...p}><path d="M4 6h16v14H4zM4 10h16M8 3.5V7M16 3.5V7" /></S>;
