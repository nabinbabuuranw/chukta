// Thin fetch wrapper: same-origin JSON, cookie session, typed errors.
export class ApiError extends Error {
  status: number; code: string; field?: string; data: any;
  constructor(status: number, data: any) { super(data?.error || 'request_failed'); this.status = status; this.code = data?.error || 'request_failed'; this.field = data?.field; this.data = data; }
}
export async function api<T = any>(path: string, opts: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const method = opts.method || (opts.body !== undefined ? 'POST' : 'GET');
  let res: Response;
  try {
    res = await fetch('/api' + path, {
      method, credentials: 'same-origin', signal: opts.signal,
      headers: method !== 'GET' ? { 'Content-Type': 'application/json' } : undefined,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : method !== 'GET' ? '{}' : undefined,
    });
  } catch (e: any) {
    if (e?.name === 'AbortError') throw e;
    throw new ApiError(0, { error: 'network' });
  }
  const text = await res.text(); let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { error: 'bad_response' }; }
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}
/** Download a CSV from the API through a blob (keeps the session cookie, no new window). */
export async function download(path: string, filename: string) {
  const res = await fetch('/api' + path, { credentials: 'same-origin' });
  if (!res.ok) throw new ApiError(res.status, { error: 'download_failed' });
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const FIELD: Record<string, string> = {
  name: 'name', business_name: 'business name', email: 'email', password: 'password (8+ characters with a letter and a number)', pan: 'PAN (9 digits)', phone: 'phone number',
  client_id: 'client', issue_date: 'bill date', due_date: 'due date (on or after the bill date)', items: 'line items', discount: 'discount', amount: 'amount',
  method: 'payment method', date: 'date', reason: 'reason', prefix: 'bill prefix (1-6 letters/numbers)', address: 'address', kind: 'bill type',
};
const WHY: Record<string, string> = {
  vat_needs_pan: 'A VAT-registered business needs its 9-digit PAN.',
  abbreviated_over_limit: 'An abbreviated tax invoice can only be used up to Rs 10,000. Use a full tax invoice.',
  business_not_vat_registered: 'Your business is not VAT-registered, so it issues PAN bills without VAT.',
  vat_business_issues_tax_invoices: 'A VAT-registered business issues tax invoices.',
  more_than_balance: 'That is more than what is still due on this bill.',
  zero_total: 'The bill total must be more than zero.',
};
const MESSAGES: Record<string, string> = {
  network: 'Could not reach Chukta. Check your connection and try again.',
  bad_credentials: 'That email and password do not match.',
  account_disabled: 'This account has been disabled.',
  rate_limited: 'Too many attempts. Please wait a few minutes and try again.',
  email_taken: 'An account with this email already exists. Try signing in.',
  not_found: 'We could not find that.', forbidden: 'You do not have access to this.', not_signed_in: 'Please sign in first.',
  server_error: 'Something went wrong on our side. Please try again.',
  plan_limit: 'You have reached the Free plan limit. Upgrade to Pro to add more.',
  business_suspended: 'This business is suspended. Contact support to restore it.',
  not_draft: 'Only drafts can be changed. Issued bills are locked.', has_payments: 'This bill has payments. Remove them before voiding it.',
  nothing_due: 'Nothing is due on this bill.', only_drafts_can_be_deleted: 'Issued bills cannot be deleted. Void it instead.', balance_changed: 'The balance changed. Reload and try again.',
};
export function errorText(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.data?.why && WHY[e.data.why]) return WHY[e.data.why];
    if (e.code === 'invalid' && e.field) { const f = e.field.replace(/^items\.(\d+)\..*/, (_m, i) => `line ${Number(i) + 1}`); return 'Please check the ' + (FIELD[e.field] || f) + '.'; }
    return MESSAGES[e.code] || 'Something went wrong. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}
export interface User { id: number; email: string; name: string; role: 'customer' | 'owner' | 'admin' }
export interface Business { id: number; name: string; pan: string | null; vat_registered: number; address: string; phone: string; email: string; prefix: string; payment_note: string; default_due_days: number; plan: string; status: string; is_demo: number }
export interface Item { description: string; qty: number; rate: number; taxable: boolean; unit?: string }
export interface Invoice { id: number; number: string | null; kind: string; state: string; status: string; client_id: number; client_name: string; issue_date: string; due_date: string; issue_bs: string | null; due_bs: string | null;
  items: Item[]; subtotal: number; discount: number; taxable: number; nontaxable: number; vat: number; total: number; paid: number; balance: number; days_overdue: number; notes: string; token: string; void_reason?: string | null; reminders: number; reminded_at: number | null;
  client_pan?: string | null; client_phone?: string | null; client_email?: string | null; client_address?: string }
export interface Client { id: number; name: string; pan: string | null; email: string | null; phone: string | null; address: string; balance?: number; overdue?: number; bills?: number; last_bill?: string | null }
