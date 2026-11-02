// Shared money + VAT maths for the API and the browser. All amounts are integer paisa (1 rupee = 100 paisa).
import { adToBs, bsToAd, BS_MONTHS_EN } from './nepali-date.js';

export const VAT_RATE_BP = 1300; // 13.00 % in basis points
export const ABBREVIATED_LIMIT_PAISA = 10_000 * 100; // Rs 10,000 (VAT Rules 2053, rule 18(6) as amended 2076)
export type BillKind = 'tax_invoice' | 'abbreviated' | 'pan_bill';
export interface LineIn { description: string; qty: number; rate: number; taxable: boolean; unit?: string }
export interface Totals { subtotal: number; discount: number; taxable: number; nontaxable: number; vat: number; total: number }

/** qty is a decimal with up to 3 places; rate is paisa. Line amount rounded to the nearest paisa. */
export function lineAmount(qty: number, rate: number): number { return Math.round(qty * 1000 * rate / 1000); }

export function computeTotals(lines: LineIn[], discount: number, vatApplies: boolean): Totals {
  let tax = 0, non = 0;
  for (const l of lines) { const a = lineAmount(l.qty, l.rate); if (l.taxable && vatApplies) tax += a; else non += a; }
  const subtotal = tax + non;
  const d = Math.max(0, Math.min(discount, subtotal));
  // Discount is shared pro-rata between taxable and non-taxable value.
  const dTax = subtotal ? Math.round(d * tax / subtotal) : 0;
  const taxable = tax - dTax;
  const nontaxable = non - (d - dTax);
  const vat = vatApplies ? Math.round(taxable * VAT_RATE_BP / 10000) : 0;
  return { subtotal, discount: d, taxable, nontaxable, vat, total: taxable + nontaxable + vat };
}

/** 123456789 paisa -> "12,34,567.89" (Nepali/Indian digit grouping). */
export function fmtNpr(paisa: number, withPaisa = true): string {
  const neg = paisa < 0; const p = Math.abs(Math.round(paisa));
  const r = Math.floor(p / 100), ps = p % 100;
  const s = String(r); let head = s.slice(0, -3), tail = s.slice(-3);
  if (head) head = head.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',';
  return (neg ? '-' : '') + head + tail + (withPaisa ? '.' + String(ps).padStart(2, '0') : '');
}

/** Parse "1,23,456.5" / "1234" into paisa; null when not a valid non-negative amount (max Rs 99,99,99,999). */
export function parseNpr(v: unknown): number | null {
  if (typeof v === 'number') { if (!Number.isFinite(v) || v < 0) return null; return Math.round(v * 100); }
  if (typeof v !== 'string') return null;
  const s = v.replace(/[,\s]/g, '').replace(/^Rs\.?/i, '');
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(s)) return null;
  const [a, b = ''] = s.split('.');
  const n = Number(a) * 100 + Number((b + '00').slice(0, 2));
  return n <= 99_99_99_999_00 ? n : null;
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
function two(n: number): string { return n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : ''); }
function three(n: number): string { const h = Math.floor(n / 100), r = n % 100; return [h ? ONES[h] + ' Hundred' : '', r ? two(r) : ''].filter(Boolean).join(' '); }
/** Indian/Nepali system: crore, lakh, thousand. 12345678 -> "One Crore Twenty-Three Lakh Forty-Five Thousand Six Hundred Seventy-Eight" */
export function rupeesInWords(n: number): string {
  if (n === 0) return 'Zero';
  const parts: string[] = [];
  const crore = Math.floor(n / 1_00_00_000); n %= 1_00_00_000;
  const lakh = Math.floor(n / 1_00_000); n %= 1_00_000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  if (crore) parts.push((crore >= 1000 ? rupeesInWords(crore) : three(crore)) + ' Crore');
  if (lakh) parts.push(two(lakh) + ' Lakh');
  if (thousand) parts.push(two(thousand) + ' Thousand');
  if (n) parts.push(three(n));
  return parts.join(' ');
}
export function amountInWords(paisa: number): string {
  const r = Math.floor(paisa / 100), p = paisa % 100;
  return 'Rupees ' + rupeesInWords(r) + (p ? ' and ' + two(p) + ' Paisa' : '') + ' Only';
}

export function validPan(v: unknown): string | null {
  if (typeof v !== 'string') return null; const s = v.replace(/\s/g, '');
  return /^\d{9}$/.test(s) ? s : null;
}

/** AD 'YYYY-MM-DD' -> BS 'YYYY-MM-DD' (null outside range). */
export function adIsoToBs(iso: string): string | null {
  try { const b = adToBs(iso); return `${b.year}-${String(b.month).padStart(2, '0')}-${String(b.day).padStart(2, '0')}`; } catch { return null; }
}
export function bsLabel(iso: string): string {
  try { const b = adToBs(iso); return `${b.day} ${BS_MONTHS_EN[b.month - 1]} ${b.year}`; } catch { return ''; }
}
/** Nepal fiscal year (starts 1 Shrawan) for an AD date: '2083/84'. */
export function fiscalYear(iso: string): string {
  const b = adToBs(iso); const y = b.month >= 4 ? b.year : b.year - 1;
  return `${y}/${String((y + 1) % 100).padStart(2, '0')}`;
}
/** AD date range [start, end] for a BS month (YYYY-MM). */
export function bsMonthRange(bsYm: string): { start: string; end: string } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(bsYm); if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]);
  try {
    const s = bsToAd(y, mo, 1).date; let last = 32; let e: Date | null = null;
    while (last >= 28 && !e) { try { e = bsToAd(y, mo, last).date; } catch { last--; } }
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    return e ? { start: iso(s), end: iso(e) } : null;
  } catch { return null; }
}
export function ktmTodayIso(now = Date.now()): string { return new Date(now + 345 * 60000).toISOString().slice(0, 10); }
export function daysBetween(aIso: string, bIso: string): number { return Math.round((Date.parse(bIso) - Date.parse(aIso)) / 86400000); }
