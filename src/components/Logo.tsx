// Wordmark: a bill with its carbon copy behind it, and a check where the total goes.
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M10 6h14v20l-3.5-2-3.5 2-3.5-2L10 26z" fill="#DCE6F0" stroke="#427AA1" strokeWidth="1.5" transform="translate(2.5 2.5)" />
      <path d="M6 4h15l4 4v18l-3.5-2-3.5 2-3.5-2-3.5 2L6 26z" fill="#F7FAFD" stroke="#05668D" strokeWidth="1.8" strokeLinejoin="miter" />
      <path d="M10 13.5l3 3 6-6.5" fill="none" stroke="#679436" strokeWidth="2.4" strokeLinecap="square" />
    </svg>
  );
}
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Mark />
      {!compact && <span className="display text-[21px] leading-none text-ink">Chukta<span className="deva ml-1.5 text-[13px] font-normal text-muted align-middle">चुक्ता</span></span>}
    </span>
  );
}
