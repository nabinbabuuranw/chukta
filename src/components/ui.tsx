import { useEffect, useId, useRef, useState, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { IcClose, IcCheck } from './Icons';
import { STATUS_LABEL } from '../lib/format';

export function Field({ label, hint, error, className = '', ...p }: { label: string; hint?: string; error?: string | null } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="label">{label}</label>
      <input id={id} className="field" aria-invalid={error ? true : undefined} aria-describedby={hint || error ? id + '-h' : undefined} {...p} />
      {(error || hint) && <p id={id + '-h'} className={`mt-1 text-[13px] ${error ? 'text-overdue' : 'text-muted'}`}>{error || hint}</p>}
    </div>
  );
}
export function Select({ label, children, className = '', ...p }: { label: string; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="label">{label}</label>
      <select id={id} className="field cursor-pointer pr-8" {...p}>{children}</select>
    </div>
  );
}
const CHIP: Record<string, string> = {
  due: 'bg-baltic-soft text-baltic-deep border-baltic/25', partial: 'bg-partial-soft text-partial border-partial/30', overdue: 'bg-overdue-soft text-overdue border-overdue/30',
  paid: 'bg-sage-soft text-sage-deep border-sage/35', draft: 'bg-tint text-ink-2 border-rule-2', void: 'bg-tint text-muted border-rule line-through',
};
export function StatusChip({ status, days }: { status: string; days?: number }) {
  return (
    <span className={`inline-flex items-center gap-1 h-6 px-2.5 rounded-full border text-[12px] font-medium whitespace-nowrap ${CHIP[status] || CHIP.draft}`}>
      {status === 'paid' && <IcCheck size={13} />}
      {STATUS_LABEL[status] || status}{status === 'overdue' && days ? ` · ${days}d` : ''}
    </span>
  );
}
export function Skeleton({ className = '' }: { className?: string }) { return <div className={`skel ${className}`} aria-hidden="true" />; }
export function Loading({ rows = 4 }: { rows?: number }) {
  return <div className="space-y-3" role="status" aria-label="Loading">{Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-14" />)}<span className="sr-only">Loading…</span></div>;
}
export function ErrorBox({ text, retry }: { text: string; retry?: () => void }) {
  return (
    <div role="alert" className="card border-overdue/40 bg-overdue-soft/60 p-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-overdue">{text}</p>
      {retry && <button className="btn-quiet btn-sm" onClick={retry}>Try again</button>}
    </div>
  );
}
export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="card p-8 text-center">
      <svg width="84" height="64" viewBox="0 0 84 64" className="mx-auto mb-4" aria-hidden="true">
        <path d="M28 8h30v46l-5-3-5 3-5-3-5 3-5-3-5 3z" fill="#DCE6F0" stroke="#427AA1" strokeWidth="1.5" transform="translate(5 4)" />
        <path d="M24 6h30v46l-5-3-5 3-5-3-5 3-5-3-5 3z" fill="#F7FAFD" stroke="#05668D" strokeWidth="1.6" />
        <path d="M30 18h18M30 25h18M30 32h11" stroke="#AFC4D6" strokeWidth="2" />
      </svg>
      <h3 className="text-[20px] mb-1">{title}</h3>
      <p className="text-muted max-w-sm mx-auto mb-5">{body}</p>
      {action}
    </div>
  );
}
// Toasts: tiny global queue.
type T = { id: number; text: string; tone: 'ok' | 'err' };
let push: ((t: Omit<T, 'id'>) => void) | null = null;
export const toast = (text: string, tone: 'ok' | 'err' = 'ok') => push?.({ text, tone });
export function Toasts() {
  const [items, set] = useState<T[]>([]);
  useEffect(() => { push = (t) => { const id = Date.now() + Math.random(); set((x) => [...x, { ...t, id }]); setTimeout(() => set((x) => x.filter((y) => y.id !== id)), 3600); }; return () => { push = null; }; }, []);
  return (
    <div className="fixed z-[60] left-1/2 -translate-x-1/2 bottom-24 md:bottom-6 flex flex-col gap-2 w-[min(92vw,420px)]" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`rise rounded-ctl px-4 py-3 shadow-pop border text-[14px] ${t.tone === 'ok' ? 'bg-ink text-sheet border-ink' : 'bg-overdue-soft text-overdue border-overdue/40'}`}>{t.text}</div>
      ))}
    </div>
  );
}
// Sheet: bottom sheet on phones, centred dialog on desktop.
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', k); document.body.style.overflow = 'hidden';
    setTimeout(() => ref.current?.querySelector<HTMLElement>('input,select,textarea,button')?.focus(), 30);
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = ''; prev?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-ink/35 fade-in" onClick={onClose} />
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className="relative sheet-up md:rise w-full md:max-w-lg bg-sheet rounded-t-card md:rounded-card border border-rule shadow-pop max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-sheet flex items-center justify-between px-5 pt-4 pb-3 border-b border-rule">
          <h2 className="text-[20px]">{title}</h2>
          <button className="btn-ghost btn-sm !px-2" onClick={onClose} aria-label="Close"><IcClose /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>, document.body);
}
export function Stamp({ size = 112, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={`stamp-in ${className}`} role="img" aria-label="Paid in full (Chukta)">
      <g fill="none" stroke="#679436" opacity=".9">
        <circle cx="60" cy="60" r="54" strokeWidth="3.5" /><circle cx="60" cy="60" r="45" strokeWidth="1.5" strokeDasharray="3 3" />
      </g>
      <text x="60" y="58" textAnchor="middle" fontSize="27" fontWeight="600" fill="#4E7329" style={{ fontFamily: '"IBM Plex Sans Devanagari", sans-serif' }}>चुक्ता</text>
      <text x="60" y="82" textAnchor="middle" fontSize="13" letterSpacing="3" fontWeight="600" fill="#4E7329" style={{ fontFamily: '"IBM Plex Mono", monospace' }}>PAID</text>
    </svg>
  );
}
export function Money({ p, className = '' }: { p: number; className?: string }) {
  const [r, ps] = (Math.abs(p) / 100).toFixed(2).split('.');
  const g = r.length > 3 ? r.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + r.slice(-3) : r;
  return <span className={`num whitespace-nowrap ${className}`}>{p < 0 ? '-' : ''}Rs {g}<span className="opacity-60">.{ps}</span></span>;
}
