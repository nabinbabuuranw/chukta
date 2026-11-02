// Chukta API + static host. One Cloudflare Worker: /api/* is handled here, everything else is served from ASSETS.
// Storage: Cloudflare D1 (SQLite). No third-party services, no keys.
import { SCHEMA } from './schema.ts';
import { hashPassword, verifyPassword, randomToken, sha256hex } from './crypto.ts';
import {
  computeTotals, parseNpr, validPan, fiscalYear, adIsoToBs, bsMonthRange, ktmTodayIso, daysBetween, amountInWords, fmtNpr,
  ABBREVIATED_LIMIT_PAISA, type BillKind, type LineIn,
} from '../../shared/money.ts';

export interface Env { DB: D1Database; ASSETS?: { fetch: (r: Request) => Promise<Response> }; SETUP_KEY_SHA256?: string }
type Role = 'customer' | 'owner' | 'admin';
interface User { id: number; email: string; name: string; role: Role; disabled: number; created_at: number }
interface Ctx { req: Request; env: Env; url: URL; user: User | null; ip: string; body: any; query: URLSearchParams }

export const SETUP_KEY_SHA256 = '62159038e1ae6e2b7ce3f743d40d1658d7a354293bbe5ae7c1fad8536bedd479';
export const SESSION_COOKIE = 'chukta_sid';
const SESSION_DAYS = 14;
export const KINDS: BillKind[] = ['tax_invoice', 'abbreviated', 'pan_bill'];
export const METHODS = ['cash', 'bank', 'esewa', 'khalti', 'fonepay', 'cheque', 'other'] as const;
export const FREE_CLIENT_LIMIT = 25;
export const FREE_MONTHLY_BILLS = 30;

class HttpError extends Error {
  status: number; code: string; detail?: any;
  constructor(status: number, code: string, detail?: any) { super(code); this.status = status; this.code = code; this.detail = detail; }
}
const err = (status: number, code: string, detail?: any) => new HttpError(status, code, detail);

// ------------------------------------------------------------------ validation
export function clean(v: unknown, max: number, { required = true, min = 1 } = {}): string | null {
  if (v === undefined || v === null || v === '') return required ? null : '';
  if (typeof v !== 'string') return null;
  const s = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/\r\n?/g, '\n').trim();
  if (s.length < (required ? min : 0) || s.length > max) return null;
  if (!required && s.length === 0) return '';
  return s;
}
export function validEmail(v: unknown): string | null {
  const s = clean(v, 160); if (!s) return null;
  const e = s.toLowerCase();
  return /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[a-z]{2,}$/i.test(e) ? e : null;
}
export function validPhone(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  let d = v.replace(/[\s\-()]/g, '');
  if (d.startsWith('+977')) d = d.slice(4); else if (d.startsWith('977') && d.length === 13) d = d.slice(3);
  if (/^9[678]\d{8}$/.test(d)) return d;
  if (/^0\d{7,9}$/.test(d)) return d;
  return null;
}
export function validPassword(v: unknown): string | null {
  if (typeof v !== 'string' || v.length < 8 || v.length > 200) return null;
  if (!/[a-zA-Z]/.test(v) || !/\d/.test(v)) return null;
  return v;
}
export function validDate(v: unknown): string | null {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(v + 'T00:00:00Z');
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) return null;
  return adIsoToBs(v) ? v : null; // must be inside the BS table range
}
const int = (v: unknown, min: number, max: number): number | null => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max ? n : null;
};

// ------------------------------------------------------------------ http helpers
const SEC_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'DENY', 'Cache-Control': 'no-store',
};
function json(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...SEC_HEADERS, ...extra } });
}
function csv(name: string, rows: (string | number)[][]): Response {
  const esc = (c: string | number) => { const s = String(c ?? ''); const safe = /^[=+\-@\t\r]/.test(s) ? "'" + s : s; return /[",\n]/.test(safe) ? '"' + safe.replace(/"/g, '""') + '"' : safe; };
  const body = '\uFEFF' + rows.map((r) => r.map(esc).join(',')).join('\r\n') + '\r\n';
  return new Response(body, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}"`, ...SEC_HEADERS } });
}
function cookie(token: string, maxAge: number): string { return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`; }
function readCookie(req: Request, name: string): string | null {
  const c = req.headers.get('Cookie') || '';
  for (const part of c.split(/;\s*/)) { const i = part.indexOf('='); if (i > 0 && part.slice(0, i) === name) return part.slice(i + 1); }
  return null;
}

// ------------------------------------------------------------------ schema + rate limit
const ready = new WeakSet<object>();
async function ensureSchema(db: D1Database) {
  if (ready.has(db)) return;
  await db.batch(SCHEMA.map((s) => db.prepare(s)));
  ready.add(db);
}
export async function rateLimit(db: D1Database, bucket: string, limit: number, windowSec: number): Promise<void> {
  const now = Math.floor(Date.now() / 1000); const ws = now - (now % windowSec);
  const row = await db.prepare(
    `INSERT INTO rate_limits (bucket, window_start, count) VALUES (?1, ?2, 1)
     ON CONFLICT(bucket) DO UPDATE SET count = CASE WHEN window_start = ?2 THEN count + 1 ELSE 1 END, window_start = ?2 RETURNING count`)
    .bind(bucket, ws).first<{ count: number }>();
  if (row && row.count > limit) throw err(429, 'rate_limited', { retry_after: windowSec - (now % windowSec) });
}

// ------------------------------------------------------------------ auth
async function createSession(db: D1Database, userId: number): Promise<string> {
  const token = randomToken(32); const now = Math.floor(Date.now() / 1000);
  await db.prepare('INSERT INTO sessions (id_hash, user_id, created_at, expires_at) VALUES (?1, ?2, ?3, ?4)').bind(await sha256hex(token), userId, now, now + SESSION_DAYS * 86400).run();
  return token;
}
async function loadUser(ctx: Ctx): Promise<User | null> {
  const tok = readCookie(ctx.req, SESSION_COOKIE);
  if (!tok || !/^[A-Za-z0-9_-]{30,64}$/.test(tok)) return null;
  const u = await ctx.env.DB.prepare(`SELECT u.id, u.email, u.name, u.role, u.disabled, u.created_at FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id_hash = ?1 AND s.expires_at > ?2`).bind(await sha256hex(tok), Math.floor(Date.now() / 1000)).first<User>();
  return u && !u.disabled ? u : null;
}
function need(ctx: Ctx, ...roles: Role[]): User {
  if (!ctx.user) throw err(401, 'not_signed_in');
  if (roles.length && !roles.includes(ctx.user.role)) throw err(403, 'forbidden');
  return ctx.user;
}
const publicUser = (u: User) => ({ id: u.id, email: u.email, name: u.name, role: u.role });
async function audit(db: D1Database, actor: { id: number; email: string } | null, action: string, target: string, detail = '') {
  await db.prepare('INSERT INTO audit_log (actor_id, actor_email, action, target, detail, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
    .bind(actor?.id ?? null, actor?.email ?? null, action, target, detail.slice(0, 500), Date.now()).run();
}

// ------------------------------------------------------------------ business helpers
interface Biz { id: number; owner_id: number; name: string; pan: string | null; vat_registered: number; address: string; phone: string; email: string; prefix: string; payment_note: string; default_due_days: number; plan: string; status: string; is_demo: number; created_at: number }
async function myBiz(ctx: Ctx): Promise<Biz> {
  const u = need(ctx, 'owner');
  const b = await ctx.env.DB.prepare('SELECT * FROM businesses WHERE owner_id = ?1').bind(u.id).first<Biz>();
  if (!b) throw err(404, 'no_business');
  if (b.status === 'suspended' && ctx.req.method !== 'GET') throw err(403, 'business_suspended');
  return b;
}
function bizInput(b: any, partial = false) {
  const out: any = {};
  if (!partial || b.name !== undefined) { const n = clean(b.name, 100, { min: 2 }); if (!n) throw err(422, 'invalid', { field: 'business_name' }); out.name = n; }
  if (b.pan !== undefined && b.pan !== '' && b.pan !== null) { const p = validPan(b.pan); if (!p) throw err(422, 'invalid', { field: 'pan' }); out.pan = p; } else if (b.pan === '' || b.pan === null) out.pan = null;
  if (b.vat_registered !== undefined) out.vat_registered = b.vat_registered ? 1 : 0;
  for (const [k, max] of [['address', 200], ['payment_note', 400]] as const) if (b[k] !== undefined) { const v = clean(b[k], max, { required: false }); if (v === null) throw err(422, 'invalid', { field: k }); out[k] = v; }
  if (b.phone !== undefined && b.phone !== '') { const p = validPhone(b.phone); if (!p) throw err(422, 'invalid', { field: 'phone' }); out.phone = p; } else if (b.phone === '') out.phone = '';
  if (b.email !== undefined && b.email !== '') { const e = validEmail(b.email); if (!e) throw err(422, 'invalid', { field: 'email' }); out.email = e; } else if (b.email === '') out.email = '';
  if (b.prefix !== undefined) { const p = typeof b.prefix === 'string' && /^[A-Z0-9]{1,6}$/.test(b.prefix.trim().toUpperCase()) ? b.prefix.trim().toUpperCase() : null; if (!p) throw err(422, 'invalid', { field: 'prefix' }); out.prefix = p; }
  if (b.default_due_days !== undefined) { const d = int(b.default_due_days, 0, 120); if (d === null) throw err(422, 'invalid', { field: 'default_due_days' }); out.default_due_days = d; }
  if (out.vat_registered === 1 && out.pan === undefined && !partial) throw err(422, 'invalid', { field: 'pan', why: 'vat_needs_pan' });
  return out;
}

function clientInput(b: any) {
  const name = clean(b.name, 120, { min: 2 }); if (!name) throw err(422, 'invalid', { field: 'name' });
  let pan: string | null = null; if (b.pan) { pan = validPan(b.pan); if (!pan) throw err(422, 'invalid', { field: 'pan' }); }
  let email: string | null = null; if (b.email) { email = validEmail(b.email); if (!email) throw err(422, 'invalid', { field: 'email' }); }
  let phone: string | null = null; if (b.phone) { phone = validPhone(b.phone); if (!phone) throw err(422, 'invalid', { field: 'phone' }); }
  const address = clean(b.address, 200, { required: false }); if (address === null) throw err(422, 'invalid', { field: 'address' });
  return { name, pan, email, phone, address };
}

// Derived status of an invoice row.
export function statusOf(inv: { state: string; total: number; paid: number; due_date: string }, today = ktmTodayIso()): string {
  if (inv.state !== 'issued') return inv.state; // draft | void
  if (inv.paid >= inv.total) return 'paid';
  if (inv.due_date < today) return 'overdue';
  if (inv.paid > 0) return 'partial';
  return 'due';
}
function invOut(r: any, today = ktmTodayIso()) {
  const { items_json, ...rest } = r;
  return { ...rest, items: JSON.parse(items_json), status: statusOf(r, today), balance: r.state === 'issued' ? Math.max(0, r.total - r.paid) : 0,
    issue_bs: adIsoToBs(r.issue_date), due_bs: adIsoToBs(r.due_date), days_overdue: r.state === 'issued' && r.paid < r.total && r.due_date < today ? daysBetween(r.due_date, today) : 0 };
}

function invoiceInput(b: any, biz: Biz) {
  const kind = (b.kind || (biz.vat_registered ? 'tax_invoice' : 'pan_bill')) as BillKind;
  if (!KINDS.includes(kind)) throw err(422, 'invalid', { field: 'kind' });
  if (kind !== 'pan_bill' && !biz.vat_registered) throw err(422, 'invalid', { field: 'kind', why: 'business_not_vat_registered' });
  if (kind === 'pan_bill' && biz.vat_registered) throw err(422, 'invalid', { field: 'kind', why: 'vat_business_issues_tax_invoices' });
  const client_id = int(b.client_id, 1, 2 ** 31); if (!client_id) throw err(422, 'invalid', { field: 'client_id' });
  const issue_date = validDate(b.issue_date || ktmTodayIso()); if (!issue_date) throw err(422, 'invalid', { field: 'issue_date' });
  const due_date = validDate(b.due_date || issue_date); if (!due_date || due_date < issue_date) throw err(422, 'invalid', { field: 'due_date' });
  if (!Array.isArray(b.items) || b.items.length < 1 || b.items.length > 50) throw err(422, 'invalid', { field: 'items' });
  const items: LineIn[] = b.items.map((it: any, i: number) => {
    const description = clean(it?.description, 200); if (!description) throw err(422, 'invalid', { field: `items.${i}.description` });
    const qty = typeof it.qty === 'string' ? Number(it.qty) : it.qty;
    if (typeof qty !== 'number' || !Number.isFinite(qty) || qty <= 0 || qty > 1_000_000 || Math.round(qty * 1000) !== qty * 1000) throw err(422, 'invalid', { field: `items.${i}.qty` });
    const rate = parseNpr(it.rate); if (rate === null) throw err(422, 'invalid', { field: `items.${i}.rate` });
    const unit = clean(it.unit, 20, { required: false }); if (unit === null) throw err(422, 'invalid', { field: `items.${i}.unit` });
    return { description, qty, rate, unit, taxable: it.taxable === undefined ? true : !!it.taxable };
  });
  const discount = b.discount === undefined || b.discount === '' ? 0 : parseNpr(b.discount);
  if (discount === null) throw err(422, 'invalid', { field: 'discount' });
  const totals = computeTotals(items, discount, kind !== 'pan_bill');
  if (totals.total <= 0) throw err(422, 'invalid', { field: 'items', why: 'zero_total' });
  if (kind === 'abbreviated' && totals.total > ABBREVIATED_LIMIT_PAISA) throw err(422, 'invalid', { field: 'kind', why: 'abbreviated_over_limit' });
  const notes = clean(b.notes, 500, { required: false }); if (notes === null) throw err(422, 'invalid', { field: 'notes' });
  return { kind, client_id, issue_date, due_date, items, totals, notes };
}

async function nextSeq(db: D1Database, bizId: number, fy: string): Promise<number> {
  const r = await db.prepare('SELECT COALESCE(MAX(seq), 0) + 1 AS n FROM invoices WHERE business_id = ?1 AND fy = ?2').bind(bizId, fy).first<{ n: number }>();
  return r!.n;
}
async function issueInvoice(db: D1Database, biz: Biz, invId: number, issueDate: string) {
  const fy = fiscalYear(issueDate);
  for (let attempt = 0; attempt < 3; attempt++) {
    const seq = await nextSeq(db, biz.id, fy);
    const number = `${biz.prefix}-${fy}-${String(seq).padStart(4, '0')}`;
    try {
      const r = await db.prepare("UPDATE invoices SET state = 'issued', fy = ?1, seq = ?2, number = ?3, issued_at = ?4 WHERE id = ?5 AND business_id = ?6 AND state = 'draft'")
        .bind(fy, seq, number, Date.now(), invId, biz.id).run();
      if (!r.meta.changes) throw err(409, 'not_draft');
      return number;
    } catch (e: any) { if (e instanceof HttpError) throw e; if (!/UNIQUE/i.test(String(e?.message))) throw e; }
  }
  throw err(409, 'number_conflict');
}
async function loadInvoice(db: D1Database, bizId: number, id: number) {
  const r = await db.prepare('SELECT i.*, c.name AS client_name, c.pan AS client_pan, c.phone AS client_phone, c.email AS client_email, c.address AS client_address FROM invoices i JOIN clients c ON c.id = i.client_id WHERE i.id = ?1 AND i.business_id = ?2').bind(id, bizId).first<any>();
  if (!r) throw err(404, 'not_found');
  return r;
}
async function monthlyCount(db: D1Database, bizId: number): Promise<number> {
  const since = Date.now() - 30 * 86400000;
  const r = await db.prepare("SELECT COUNT(*) AS n FROM invoices WHERE business_id = ?1 AND state != 'draft' AND issued_at > ?2").bind(bizId, since).first<{ n: number }>();
  return r!.n;
}

export function reminderText(biz: { name: string; payment_note: string }, inv: any, lang: 'en' | 'ne', link: string) {
  const bal = 'Rs ' + fmtNpr(Math.max(0, inv.total - inv.paid));
  if (lang === 'ne') return `नमस्ते ${inv.client_name}, ${biz.name} बाट सम्झना: बिल ${inv.number} (मिति ${adIsoToBs(inv.issue_date)}) को ${bal} बाँकी छ, भुक्तानी मिति ${adIsoToBs(inv.due_date)}। बिल हेर्न: ${link}${biz.payment_note ? `\nभुक्तानी: ${biz.payment_note}` : ''}\nधन्यवाद।`;
  return `Namaste ${inv.client_name}, a gentle reminder from ${biz.name}: ${bal} is outstanding on bill ${inv.number} dated ${inv.issue_date}, due ${inv.due_date}. View the bill: ${link}${biz.payment_note ? `\nPayment: ${biz.payment_note}` : ''}\nThank you.`;
}

// ------------------------------------------------------------------ routes
type Handler = (ctx: Ctx, params: string[]) => Promise<Response>;
const routes: [string, RegExp, Handler][] = [];
const on = (m: string, p: string, h: Handler) => routes.push([m, new RegExp('^' + p.replace(/:(\w+)/g, '([^/]+)') + '$'), h]);
const idOf = (s: string) => { const n = int(s, 1, 2 ** 31); if (!n) throw err(404, 'not_found'); return n; };

on('GET', '/api/health', async (ctx) => {
  const r = await ctx.env.DB.prepare('SELECT COUNT(*) AS n FROM users').first<{ n: number }>();
  return json({ ok: true, database: r ? 'connected' : 'unknown', today_ad: ktmTodayIso(), today_bs: adIsoToBs(ktmTodayIso()) });
});

on('POST', '/api/setup', async (ctx) => {
  await rateLimit(ctx.env.DB, 'setup:' + ctx.ip, 5, 3600);
  const key = typeof ctx.body.key === 'string' ? ctx.body.key : '';
  if (!key || (await sha256hex(key)) !== (ctx.env.SETUP_KEY_SHA256 || SETUP_KEY_SHA256)) throw err(403, 'forbidden');
  const existing = await ctx.env.DB.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'").first<{ n: number }>();
  if (existing && existing.n > 0) throw err(409, 'already_set_up');
  const a = ctx.body.admin || {};
  const email = validEmail(a.email), pw = validPassword(a.password), name = clean(a.name, 80);
  if (!email || !pw || !name) throw err(422, 'invalid');
  const now = Date.now();
  await ctx.env.DB.prepare("INSERT INTO users (email, name, password_hash, role, created_at) VALUES (?1, ?2, ?3, 'admin', ?4)").bind(email, name, await hashPassword(pw), now).run();
  const out: any = { admin: email };
  const d = ctx.body.demo;
  if (d && validEmail(d.owner_email) && validPassword(d.owner_password)) out.demo = await seedDemo(ctx.env.DB, d);
  await audit(ctx.env.DB, null, 'setup', 'platform', 'admin ' + email);
  return json(out, 201);
});

async function seedDemo(db: D1Database, d: any) {
  const now = Date.now();
  const o = await db.prepare("INSERT INTO users (email, name, password_hash, role, created_at) VALUES (?1, 'Demo owner', ?2, 'owner', ?3) RETURNING id")
    .bind(validEmail(d.owner_email), await hashPassword(d.owner_password), now).first<{ id: number }>();
  const b = await db.prepare(`INSERT INTO businesses (owner_id, name, pan, vat_registered, address, phone, email, prefix, payment_note, default_due_days, is_demo, created_at)
    VALUES (?1, 'Demo business: Bagmati Print House', '123456789', 1, 'Demo address, Putalisadak, Kathmandu', '', '', 'BPH', 'Demo only. No real account details.', 15, 1, ?2) RETURNING id`)
    .bind(o!.id, now).first<{ id: number }>();
  const biz = (await db.prepare('SELECT * FROM businesses WHERE id = ?1').bind(b!.id).first<Biz>())!;
  const custEmail = validEmail(d.customer_email);
  const clients: [string, string | null, string | null][] = [['Demo client: Himal Traders', '600000001', custEmail], ['Demo client: Sagarmatha Cafe', null, null], ['Demo client: Lalitpur Events', '600000002', null]];
  const ids: number[] = [];
  for (const [n, pan, em] of clients) {
    const r = await db.prepare("INSERT INTO clients (business_id, name, pan, email, phone, address, created_at) VALUES (?1, ?2, ?3, ?4, NULL, 'Demo address', ?5) RETURNING id").bind(biz.id, n, pan, em, now).first<{ id: number }>();
    ids.push(r!.id);
  }
  const today = ktmTodayIso();
  const shift = (days: number) => new Date(Date.parse(today) + days * 86400000).toISOString().slice(0, 10);
  const bills: [number, number, number, [string, number, number][], number][] = [
    // client index, issue offset, due offset, items [desc, qty, rate rupees], paid fraction*100
    [0, -40, -25, [['Flex banner print 10x4 ft', 6, 1800], ['Design and layout', 1, 3500]], 0],
    [1, -20, -5, [['Menu card printing (laminated)', 40, 120]], 50],
    [2, -12, 3, [['Event standee 6x3 ft', 4, 2600], ['Delivery in valley', 1, 500]], 0],
    [0, -6, 9, [['Visiting cards (box of 100)', 10, 450]], 100],
  ];
  for (const [ci, io, dueo, items, paidPct] of bills) {
    const lines = items.map(([description, qty, r]) => ({ description, qty, rate: r * 100, taxable: true, unit: '' }));
    const t = computeTotals(lines, 0, true);
    const ins = await db.prepare(`INSERT INTO invoices (business_id, client_id, kind, state, issue_date, due_date, items_json, subtotal, discount, taxable, nontaxable, vat, total, notes, token, created_at)
      VALUES (?1, ?2, 'tax_invoice', 'draft', ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 'Demo bill — sample data.', ?12, ?13) RETURNING id`)
      .bind(biz.id, ids[ci], shift(io), shift(dueo), JSON.stringify(lines), t.subtotal, t.discount, t.taxable, t.nontaxable, t.vat, t.total, randomToken(24), now).first<{ id: number }>();
    await issueInvoice(db, biz, ins!.id, shift(io));
    if (paidPct) {
      const amt = Math.round(t.total * paidPct / 100);
      await db.prepare("INSERT INTO payments (business_id, invoice_id, amount, date, method, ref, created_at) VALUES (?1, ?2, ?3, ?4, 'esewa', 'demo', ?5)").bind(biz.id, ins!.id, amt, shift(io + 3), now).run();
      await db.prepare('UPDATE invoices SET paid = ?1 WHERE id = ?2').bind(amt, ins!.id).run();
    }
  }
  if (custEmail && validPassword(d.customer_password)) {
    await db.prepare("INSERT INTO users (email, name, password_hash, role, created_at) VALUES (?1, 'Demo customer', ?2, 'customer', ?3)").bind(custEmail, await hashPassword(d.customer_password), now).run();
  }
  return { business_id: biz.id };
}

on('POST', '/api/auth/register', async (ctx) => {
  await rateLimit(ctx.env.DB, 'register:' + ctx.ip, 30, 3600); // generous: many Nepali users share carrier NAT IPs
  const b = ctx.body;
  const email = validEmail(b.email), name = clean(b.name, 80, { min: 2 });
  if (!email) throw err(422, 'invalid', { field: 'email' });
  if (!name) throw err(422, 'invalid', { field: 'name' });
  const pw = validPassword(b.password); if (!pw) throw err(422, 'invalid', { field: 'password' });
  const account = b.account === 'owner' ? 'owner' : 'customer';
  let biz: any = null;
  if (account === 'owner') biz = bizInput(b.business || {});
  if (await ctx.env.DB.prepare('SELECT 1 FROM users WHERE email = ?1').bind(email).first()) throw err(409, 'email_taken');
  const now = Date.now();
  const u = await ctx.env.DB.prepare('INSERT INTO users (email, name, password_hash, role, created_at) VALUES (?1, ?2, ?3, ?4, ?5) RETURNING id').bind(email, name, await hashPassword(pw), account, now).first<{ id: number }>();
  if (biz) {
    await ctx.env.DB.prepare(`INSERT INTO businesses (owner_id, name, pan, vat_registered, address, phone, email, prefix, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`)
      .bind(u!.id, biz.name, biz.pan ?? null, biz.vat_registered ?? 1, biz.address ?? '', biz.phone ?? '', biz.email ?? email, biz.prefix ?? 'INV', now).run();
  }
  const token = await createSession(ctx.env.DB, u!.id);
  await audit(ctx.env.DB, { id: u!.id, email }, 'user.register', 'user:' + u!.id, account);
  return json({ user: { id: u!.id, email, name, role: account } }, 201, { 'Set-Cookie': cookie(token, SESSION_DAYS * 86400) });
});

on('POST', '/api/auth/login', async (ctx) => {
  const email = validEmail(ctx.body.email);
  await rateLimit(ctx.env.DB, 'login:' + ctx.ip, 20, 900);
  if (email) await rateLimit(ctx.env.DB, 'login-email:' + email, 10, 900);
  const pw = typeof ctx.body.password === 'string' ? ctx.body.password : '';
  const u = email ? await ctx.env.DB.prepare('SELECT * FROM users WHERE email = ?1').bind(email).first<any>() : null;
  const ok = u ? await verifyPassword(pw, u.password_hash) : (await hashPassword('timing-equaliser-x1'), false);
  if (!u || !ok) throw err(401, 'bad_credentials');
  if (u.disabled) throw err(403, 'account_disabled');
  const token = await createSession(ctx.env.DB, u.id);
  return json({ user: publicUser(u) }, 200, { 'Set-Cookie': cookie(token, SESSION_DAYS * 86400) });
});
on('POST', '/api/auth/logout', async (ctx) => {
  const tok = readCookie(ctx.req, SESSION_COOKIE);
  if (tok) await ctx.env.DB.prepare('DELETE FROM sessions WHERE id_hash = ?1').bind(await sha256hex(tok)).run();
  return json({ ok: true }, 200, { 'Set-Cookie': cookie('', 0) });
});
on('GET', '/api/me', async (ctx) => {
  if (!ctx.user) return json({ user: null });
  const out: any = { user: publicUser(ctx.user) };
  if (ctx.user.role === 'owner') out.business = await ctx.env.DB.prepare('SELECT * FROM businesses WHERE owner_id = ?1').bind(ctx.user.id).first();
  return json(out);
});

// ---- business profile
on('GET', '/api/biz', async (ctx) => json({ business: await myBiz(ctx) }));
on('PUT', '/api/biz', async (ctx) => {
  const biz = await myBiz(ctx); const p = bizInput(ctx.body, true);
  const next = { ...biz, ...p };
  if (next.vat_registered && !next.pan) throw err(422, 'invalid', { field: 'pan', why: 'vat_needs_pan' });
  const keys = Object.keys(p); if (!keys.length) return json({ business: biz });
  await ctx.env.DB.prepare(`UPDATE businesses SET ${keys.map((k, i) => `${k} = ?${i + 1}`).join(', ')} WHERE id = ?${keys.length + 1}`).bind(...keys.map((k) => p[k]), biz.id).run();
  await audit(ctx.env.DB, ctx.user, 'business.update', 'business:' + biz.id, keys.join(','));
  return json({ business: await ctx.env.DB.prepare('SELECT * FROM businesses WHERE id = ?1').bind(biz.id).first() });
});

// ---- clients
on('GET', '/api/clients', async (ctx) => {
  const biz = await myBiz(ctx); const today = ktmTodayIso();
  const rows = (await ctx.env.DB.prepare(`SELECT c.*, COALESCE(SUM(CASE WHEN i.state='issued' THEN i.total - i.paid END),0) AS balance,
      COALESCE(SUM(CASE WHEN i.state='issued' AND i.paid < i.total AND i.due_date < ?2 THEN i.total - i.paid END),0) AS overdue,
      COUNT(i.id) AS bills, MAX(i.issue_date) AS last_bill
    FROM clients c LEFT JOIN invoices i ON i.client_id = c.id WHERE c.business_id = ?1 AND c.archived = 0 GROUP BY c.id ORDER BY balance DESC, c.name`).bind(biz.id, today).all()).results;
  return json({ items: rows, limit: biz.plan === 'free' ? FREE_CLIENT_LIMIT : null });
});
on('POST', '/api/clients', async (ctx) => {
  const biz = await myBiz(ctx); const c = clientInput(ctx.body);
  if (biz.plan === 'free') { const n = await ctx.env.DB.prepare('SELECT COUNT(*) AS n FROM clients WHERE business_id = ?1 AND archived = 0').bind(biz.id).first<{ n: number }>(); if (n!.n >= FREE_CLIENT_LIMIT) throw err(402, 'plan_limit', { limit: FREE_CLIENT_LIMIT }); }
  const r = await ctx.env.DB.prepare('INSERT INTO clients (business_id, name, pan, email, phone, address, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) RETURNING *').bind(biz.id, c.name, c.pan, c.email, c.phone, c.address, Date.now()).first();
  return json({ client: r }, 201);
});
on('GET', '/api/clients/:id', async (ctx, [id]) => {
  const biz = await myBiz(ctx);
  const c = await ctx.env.DB.prepare('SELECT * FROM clients WHERE id = ?1 AND business_id = ?2').bind(idOf(id), biz.id).first();
  if (!c) throw err(404, 'not_found'); return json({ client: c });
});
on('PUT', '/api/clients/:id', async (ctx, [id]) => {
  const biz = await myBiz(ctx); const c = clientInput(ctx.body);
  const r = await ctx.env.DB.prepare('UPDATE clients SET name = ?1, pan = ?2, email = ?3, phone = ?4, address = ?5 WHERE id = ?6 AND business_id = ?7 RETURNING *').bind(c.name, c.pan, c.email, c.phone, c.address, idOf(id), biz.id).first();
  if (!r) throw err(404, 'not_found'); return json({ client: r });
});
on('DELETE', '/api/clients/:id', async (ctx, [id]) => {
  const biz = await myBiz(ctx);
  const r = await ctx.env.DB.prepare('UPDATE clients SET archived = 1 WHERE id = ?1 AND business_id = ?2').bind(idOf(id), biz.id).run();
  if (!r.meta.changes) throw err(404, 'not_found'); return json({ ok: true });
});
async function ledger(db: D1Database, bizId: number, clientId: number) {
  const inv = (await db.prepare("SELECT id, number, issue_date AS date, total, state FROM invoices WHERE client_id = ?1 AND business_id = ?2 AND state = 'issued'").bind(clientId, bizId).all<any>()).results;
  const pay = (await db.prepare("SELECT p.id, p.amount, p.date, p.method, p.ref, i.number FROM payments p JOIN invoices i ON i.id = p.invoice_id WHERE i.client_id = ?1 AND p.business_id = ?2 AND p.voided = 0").bind(clientId, bizId).all<any>()).results;
  const rows = [...inv.map((i) => ({ date: i.date, kind: 'bill', ref: i.number, debit: i.total, credit: 0, invoice_id: i.id })),
    ...pay.map((p) => ({ date: p.date, kind: 'payment', ref: `${p.number} · ${p.method}${p.ref ? ' ' + p.ref : ''}`, debit: 0, credit: p.amount, invoice_id: null }))]
    .sort((a, b) => a.date.localeCompare(b.date) || (a.kind === 'bill' ? -1 : 1));
  let bal = 0; const out = rows.map((r) => { bal += r.debit - r.credit; return { ...r, date_bs: adIsoToBs(r.date), balance: bal }; });
  return { rows: out, balance: bal };
}
on('GET', '/api/clients/:id/ledger', async (ctx, [id]) => {
  const biz = await myBiz(ctx); const cid = idOf(id);
  const c = await ctx.env.DB.prepare('SELECT * FROM clients WHERE id = ?1 AND business_id = ?2').bind(cid, biz.id).first<any>();
  if (!c) throw err(404, 'not_found');
  const l = await ledger(ctx.env.DB, biz.id, cid);
  if (ctx.query.get('format') === 'csv') return csv(`ledger-${cid}.csv`, [['Date (AD)', 'Date (BS)', 'Entry', 'Reference', 'Debit (Rs)', 'Credit (Rs)', 'Balance (Rs)'],
    ...l.rows.map((r) => [r.date, r.date_bs || '', r.kind, r.ref, r.debit ? fmtNpr(r.debit) : '', r.credit ? fmtNpr(r.credit) : '', fmtNpr(r.balance)])]);
  return json({ client: c, ...l });
});

// ---- invoices
on('GET', '/api/invoices', async (ctx) => {
  const biz = await myBiz(ctx); const today = ktmTodayIso();
  const q = (ctx.query.get('q') || '').trim().slice(0, 60);
  const rows = (await ctx.env.DB.prepare(`SELECT i.*, c.name AS client_name FROM invoices i JOIN clients c ON c.id = i.client_id
     WHERE i.business_id = ?1 AND (?2 = '' OR c.name LIKE ?3 OR i.number LIKE ?3) ORDER BY COALESCE(i.issued_at, i.created_at) DESC LIMIT 300`).bind(biz.id, q, `%${q}%`).all()).results;
  let items = rows.map((r) => invOut(r, today));
  const st = ctx.query.get('status'); if (st) items = items.filter((i) => i.status === st || (st === 'open' && ['due', 'partial', 'overdue'].includes(i.status)));
  return json({ items });
});
on('POST', '/api/invoices', async (ctx) => {
  const biz = await myBiz(ctx); const v = invoiceInput(ctx.body, biz);
  const client = await ctx.env.DB.prepare('SELECT id FROM clients WHERE id = ?1 AND business_id = ?2 AND archived = 0').bind(v.client_id, biz.id).first();
  if (!client) throw err(422, 'invalid', { field: 'client_id' });
  if (ctx.body.issue && biz.plan === 'free' && (await monthlyCount(ctx.env.DB, biz.id)) >= FREE_MONTHLY_BILLS) throw err(402, 'plan_limit', { limit: FREE_MONTHLY_BILLS });
  const t = v.totals;
  const r = await ctx.env.DB.prepare(`INSERT INTO invoices (business_id, client_id, kind, state, issue_date, due_date, items_json, subtotal, discount, taxable, nontaxable, vat, total, notes, token, created_at)
    VALUES (?1, ?2, ?3, 'draft', ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15) RETURNING id`)
    .bind(biz.id, v.client_id, v.kind, v.issue_date, v.due_date, JSON.stringify(v.items), t.subtotal, t.discount, t.taxable, t.nontaxable, t.vat, t.total, v.notes, randomToken(24), Date.now()).first<{ id: number }>();
  if (ctx.body.issue) { const n = await issueInvoice(ctx.env.DB, biz, r!.id, v.issue_date); await audit(ctx.env.DB, ctx.user, 'invoice.issue', 'invoice:' + r!.id, n); }
  return json({ invoice: invOut(await loadInvoice(ctx.env.DB, biz.id, r!.id)) }, 201);
});
on('GET', '/api/invoices/:id', async (ctx, [id]) => {
  const biz = await myBiz(ctx); const inv = await loadInvoice(ctx.env.DB, biz.id, idOf(id));
  const payments = (await ctx.env.DB.prepare('SELECT * FROM payments WHERE invoice_id = ?1 ORDER BY date, id').bind(inv.id).all()).results;
  return json({ invoice: invOut(inv), payments, words: amountInWords(inv.total), business: biz });
});
on('PUT', '/api/invoices/:id', async (ctx, [id]) => {
  const biz = await myBiz(ctx); const inv = await loadInvoice(ctx.env.DB, biz.id, idOf(id));
  if (inv.state !== 'draft') throw err(409, 'not_draft');
  const v = invoiceInput(ctx.body, biz); const t = v.totals;
  const client = await ctx.env.DB.prepare('SELECT id FROM clients WHERE id = ?1 AND business_id = ?2 AND archived = 0').bind(v.client_id, biz.id).first();
  if (!client) throw err(422, 'invalid', { field: 'client_id' });
  await ctx.env.DB.prepare(`UPDATE invoices SET client_id=?1, kind=?2, issue_date=?3, due_date=?4, items_json=?5, subtotal=?6, discount=?7, taxable=?8, nontaxable=?9, vat=?10, total=?11, notes=?12 WHERE id=?13 AND state='draft'`)
    .bind(v.client_id, v.kind, v.issue_date, v.due_date, JSON.stringify(v.items), t.subtotal, t.discount, t.taxable, t.nontaxable, t.vat, t.total, v.notes, inv.id).run();
  return json({ invoice: invOut(await loadInvoice(ctx.env.DB, biz.id, inv.id)) });
});
on('DELETE', '/api/invoices/:id', async (ctx, [id]) => {
  const biz = await myBiz(ctx);
  const r = await ctx.env.DB.prepare("DELETE FROM invoices WHERE id = ?1 AND business_id = ?2 AND state = 'draft'").bind(idOf(id), biz.id).run();
  if (!r.meta.changes) throw err(409, 'only_drafts_can_be_deleted'); return json({ ok: true });
});
on('POST', '/api/invoices/:id/issue', async (ctx, [id]) => {
  const biz = await myBiz(ctx); const inv = await loadInvoice(ctx.env.DB, biz.id, idOf(id));
  if (inv.state !== 'draft') throw err(409, 'not_draft');
  if (biz.plan === 'free' && (await monthlyCount(ctx.env.DB, biz.id)) >= FREE_MONTHLY_BILLS) throw err(402, 'plan_limit', { limit: FREE_MONTHLY_BILLS });
  const n = await issueInvoice(ctx.env.DB, biz, inv.id, inv.issue_date);
  await audit(ctx.env.DB, ctx.user, 'invoice.issue', 'invoice:' + inv.id, n);
  return json({ invoice: invOut(await loadInvoice(ctx.env.DB, biz.id, inv.id)) });
});
on('POST', '/api/invoices/:id/void', async (ctx, [id]) => {
  const biz = await myBiz(ctx); const inv = await loadInvoice(ctx.env.DB, biz.id, idOf(id));
  if (inv.state !== 'issued') throw err(409, 'not_issued');
  if (inv.paid > 0) throw err(409, 'has_payments');
  const reason = clean(ctx.body.reason, 200, { min: 3 }); if (!reason) throw err(422, 'invalid', { field: 'reason' });
  await ctx.env.DB.prepare("UPDATE invoices SET state = 'void', void_reason = ?1 WHERE id = ?2").bind(reason, inv.id).run();
  await audit(ctx.env.DB, ctx.user, 'invoice.void', 'invoice:' + inv.id, `${inv.number}: ${reason}`);
  return json({ invoice: invOut(await loadInvoice(ctx.env.DB, biz.id, inv.id)) });
});
on('POST', '/api/invoices/:id/payments', async (ctx, [id]) => {
  const biz = await myBiz(ctx); const inv = await loadInvoice(ctx.env.DB, biz.id, idOf(id));
  if (inv.state !== 'issued') throw err(409, 'not_issued');
  const amount = parseNpr(ctx.body.amount); if (!amount) throw err(422, 'invalid', { field: 'amount' });
  if (amount > inv.total - inv.paid) throw err(422, 'invalid', { field: 'amount', why: 'more_than_balance', balance: inv.total - inv.paid });
  const date = validDate(ctx.body.date || ktmTodayIso()); if (!date || date < inv.issue_date) throw err(422, 'invalid', { field: 'date' });
  const method = METHODS.includes(ctx.body.method) ? ctx.body.method : null; if (!method) throw err(422, 'invalid', { field: 'method' });
  const ref = clean(ctx.body.ref, 60, { required: false }); if (ref === null) throw err(422, 'invalid', { field: 'ref' });
  const up = await ctx.env.DB.prepare('UPDATE invoices SET paid = paid + ?1 WHERE id = ?2 AND paid + ?1 <= total').bind(amount, inv.id).run();
  if (!up.meta.changes) throw err(409, 'balance_changed');
  await ctx.env.DB.prepare('INSERT INTO payments (business_id, invoice_id, amount, date, method, ref, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)').bind(biz.id, inv.id, amount, date, method, ref, Date.now()).run();
  await audit(ctx.env.DB, ctx.user, 'payment.add', 'invoice:' + inv.id, `${inv.number} Rs ${fmtNpr(amount)} ${method}`);
  return json({ invoice: invOut(await loadInvoice(ctx.env.DB, biz.id, inv.id)) }, 201);
});
on('DELETE', '/api/payments/:id', async (ctx, [id]) => {
  const biz = await myBiz(ctx);
  const p = await ctx.env.DB.prepare('SELECT * FROM payments WHERE id = ?1 AND business_id = ?2 AND voided = 0').bind(idOf(id), biz.id).first<any>();
  if (!p) throw err(404, 'not_found');
  await ctx.env.DB.batch([ctx.env.DB.prepare('UPDATE payments SET voided = 1 WHERE id = ?1').bind(p.id), ctx.env.DB.prepare('UPDATE invoices SET paid = paid - ?1 WHERE id = ?2').bind(p.amount, p.invoice_id)]);
  await audit(ctx.env.DB, ctx.user, 'payment.void', 'invoice:' + p.invoice_id, `Rs ${fmtNpr(p.amount)}`);
  return json({ ok: true });
});
on('POST', '/api/invoices/:id/reminder', async (ctx, [id]) => {
  const biz = await myBiz(ctx); const inv = await loadInvoice(ctx.env.DB, biz.id, idOf(id));
  if (inv.state !== 'issued' || inv.paid >= inv.total) throw err(409, 'nothing_due');
  const lang = ctx.body.lang === 'ne' ? 'ne' : 'en';
  const link = `${ctx.url.origin}/i/${inv.token}`;
  const text = reminderText(biz, inv, lang, link);
  const phone = inv.client_phone ? (inv.client_phone.startsWith('9') ? '977' + inv.client_phone : null) : null;
  if (ctx.body.log) await ctx.env.DB.prepare('UPDATE invoices SET reminded_at = ?1, reminders = reminders + 1 WHERE id = ?2').bind(Date.now(), inv.id).run();
  return json({ text, whatsapp: 'https://wa.me/' + (phone || '') + '?text=' + encodeURIComponent(text), sms: phone ? `sms:+${phone}?body=${encodeURIComponent(text)}` : null, mailto: inv.client_email ? `mailto:${inv.client_email}?subject=${encodeURIComponent('Payment reminder: ' + inv.number)}&body=${encodeURIComponent(text)}` : null });
});

// ---- summary + reports
on('GET', '/api/summary', async (ctx) => {
  const biz = await myBiz(ctx); const today = ktmTodayIso();
  const rows = (await ctx.env.DB.prepare("SELECT i.*, c.name AS client_name FROM invoices i JOIN clients c ON c.id = i.client_id WHERE i.business_id = ?1 AND i.state = 'issued'").bind(biz.id).all<any>()).results;
  const range = bsMonthRange((adIsoToBs(today) || '').slice(0, 7));
  let receivable = 0, overdue = 0, billedMonth = 0, vatMonth = 0; const aging = [0, 0, 0, 0];
  for (const r of rows) {
    const bal = r.total - r.paid; receivable += bal;
    if (bal > 0 && r.due_date < today) { overdue += bal; const d = daysBetween(r.due_date, today); aging[d <= 30 ? 0 : d <= 60 ? 1 : d <= 90 ? 2 : 3] += bal; }
    if (range && r.issue_date >= range.start && r.issue_date <= range.end) { billedMonth += r.total; vatMonth += r.vat; }
  }
  const coll = range ? await ctx.env.DB.prepare('SELECT COALESCE(SUM(amount),0) AS s FROM payments WHERE business_id = ?1 AND voided = 0 AND date >= ?2 AND date <= ?3').bind(biz.id, range.start, range.end).first<{ s: number }>() : { s: 0 };
  const attention = rows.map((r) => invOut(r, today)).filter((i) => i.balance > 0).sort((a, b) => (b.days_overdue - a.days_overdue) || a.due_date.localeCompare(b.due_date)).slice(0, 6);
  const counts = await ctx.env.DB.prepare("SELECT (SELECT COUNT(*) FROM clients WHERE business_id = ?1 AND archived = 0) AS clients, (SELECT COUNT(*) FROM invoices WHERE business_id = ?1 AND state = 'draft') AS drafts").bind(biz.id).first<any>();
  return json({ today, today_bs: adIsoToBs(today), month_bs: (adIsoToBs(today) || '').slice(0, 7), receivable, overdue, aging, billed_month: billedMonth, collected_month: coll!.s, vat_month: vatMonth, attention, ...counts, bills_last_30d: await monthlyCount(ctx.env.DB, biz.id), plan: biz.plan });
});
on('GET', '/api/reports/vat', async (ctx) => {
  const biz = await myBiz(ctx);
  const month = ctx.query.get('month') || (adIsoToBs(ktmTodayIso()) || '').slice(0, 7);
  const range = bsMonthRange(month); if (!range) throw err(422, 'invalid', { field: 'month' });
  const rows = (await ctx.env.DB.prepare(`SELECT i.number, i.issue_date, i.kind, i.state, i.taxable, i.nontaxable, i.vat, i.total, i.void_reason, c.name AS buyer, c.pan AS buyer_pan
     FROM invoices i JOIN clients c ON c.id = i.client_id WHERE i.business_id = ?1 AND i.state != 'draft' AND i.issue_date >= ?2 AND i.issue_date <= ?3 ORDER BY i.fy, i.seq`).bind(biz.id, range.start, range.end).all<any>()).results;
  const live = rows.filter((r) => r.state === 'issued');
  const totals = { taxable: 0, nontaxable: 0, vat: 0, total: 0 };
  for (const r of live) { totals.taxable += r.taxable; totals.nontaxable += r.nontaxable; totals.vat += r.vat; totals.total += r.total; }
  if (ctx.query.get('format') === 'csv') return csv(`sales-register-${month}.csv`, [
    ['Date (BS)', 'Date (AD)', 'Bill no.', 'Buyer', 'Buyer PAN', 'Type', 'Taxable (Rs)', 'Non-taxable (Rs)', 'VAT 13% (Rs)', 'Total (Rs)', 'Status'],
    ...rows.map((r) => [adIsoToBs(r.issue_date) || '', r.issue_date, r.number, r.buyer, r.buyer_pan || '', r.kind, fmtNpr(r.taxable), fmtNpr(r.nontaxable), fmtNpr(r.vat), fmtNpr(r.total), r.state === 'void' ? 'VOID: ' + r.void_reason : 'issued']),
    ['', '', '', 'TOTAL (excluding void)', '', '', fmtNpr(totals.taxable), fmtNpr(totals.nontaxable), fmtNpr(totals.vat), fmtNpr(totals.total), '']]);
  return json({ month, range, rows: rows.map((r) => ({ ...r, issue_bs: adIsoToBs(r.issue_date) })), totals });
});

// ---- public bill view (anyone with the 32-char link)
on('GET', '/api/public/invoice/:token', async (ctx, [token]) => {
  if (!/^[A-Za-z0-9_-]{24,64}$/.test(token)) throw err(404, 'not_found');
  await rateLimit(ctx.env.DB, 'public:' + ctx.ip, 120, 60);
  const inv = await ctx.env.DB.prepare(`SELECT i.*, c.name AS client_name, c.pan AS client_pan, c.address AS client_address FROM invoices i JOIN clients c ON c.id = i.client_id WHERE i.token = ?1 AND i.state != 'draft'`).bind(token).first<any>();
  if (!inv) throw err(404, 'not_found');
  const b = await ctx.env.DB.prepare('SELECT name, pan, vat_registered, address, phone, email, payment_note, is_demo FROM businesses WHERE id = ?1').bind(inv.business_id).first();
  const { client_id, business_id, token: _t, ...rest } = invOut(inv);
  return json({ invoice: rest, business: b, words: amountInWords(inv.total) });
});

// ---- customer portal
on('GET', '/api/my/bills', async (ctx) => {
  const u = need(ctx, 'customer'); const today = ktmTodayIso();
  const rows = (await ctx.env.DB.prepare(`SELECT i.*, c.name AS client_name, b.name AS business_name FROM invoices i JOIN clients c ON c.id = i.client_id JOIN businesses b ON b.id = i.business_id
     WHERE c.email = ?1 AND i.state != 'draft' ORDER BY i.issue_date DESC LIMIT 200`).bind(u.email).all<any>()).results;
  const items = rows.map((r) => { const o = invOut(r, today); return { id: o.id, number: o.number, business_name: r.business_name, issue_date: o.issue_date, issue_bs: o.issue_bs, due_date: o.due_date, total: o.total, paid: o.paid, balance: o.balance, status: o.status, token: r.token }; });
  return json({ items, outstanding: items.reduce((s, i) => s + i.balance, 0) });
});

// ---- admin
on('GET', '/api/admin/overview', async (ctx) => {
  need(ctx, 'admin');
  const r = await ctx.env.DB.prepare(`SELECT (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM users WHERE role='owner') AS owners, (SELECT COUNT(*) FROM users WHERE role='customer') AS customers,
    (SELECT COUNT(*) FROM businesses) AS businesses, (SELECT COUNT(*) FROM businesses WHERE status='suspended') AS suspended,
    (SELECT COUNT(*) FROM invoices WHERE state='issued') AS bills, (SELECT COUNT(*) FROM payments WHERE voided=0) AS payments`).first();
  return json(r);
});
on('GET', '/api/admin/businesses', async (ctx) => {
  need(ctx, 'admin');
  return json({ items: (await ctx.env.DB.prepare(`SELECT b.id, b.name, b.pan, b.vat_registered, b.plan, b.status, b.is_demo, b.created_at, u.email AS owner_email,
    (SELECT COUNT(*) FROM invoices i WHERE i.business_id = b.id AND i.state='issued') AS bills, (SELECT COUNT(*) FROM clients c WHERE c.business_id = b.id) AS clients
    FROM businesses b JOIN users u ON u.id = b.owner_id ORDER BY b.id DESC LIMIT 500`).all()).results });
});
on('PUT', '/api/admin/businesses/:id', async (ctx, [id]) => {
  const admin = need(ctx, 'admin'); const bid = idOf(id); const p: string[] = []; const v: any[] = [];
  if (ctx.body.status !== undefined) { if (!['active', 'suspended'].includes(ctx.body.status)) throw err(422, 'invalid', { field: 'status' }); p.push('status'); v.push(ctx.body.status); }
  if (ctx.body.plan !== undefined) { if (!['free', 'pro'].includes(ctx.body.plan)) throw err(422, 'invalid', { field: 'plan' }); p.push('plan'); v.push(ctx.body.plan); }
  if (!p.length) throw err(422, 'invalid');
  const r = await ctx.env.DB.prepare(`UPDATE businesses SET ${p.map((k, i) => `${k} = ?${i + 1}`).join(', ')} WHERE id = ?${p.length + 1}`).bind(...v, bid).run();
  if (!r.meta.changes) throw err(404, 'not_found');
  await audit(ctx.env.DB, admin, 'business.admin_update', 'business:' + bid, p.map((k, i) => `${k}=${v[i]}`).join(' '));
  return json({ ok: true });
});
on('GET', '/api/admin/users', async (ctx) => {
  need(ctx, 'admin');
  return json({ items: (await ctx.env.DB.prepare('SELECT id, email, name, role, disabled, created_at FROM users ORDER BY id DESC LIMIT 500').all()).results });
});
on('PUT', '/api/admin/users/:id', async (ctx, [id]) => {
  const admin = need(ctx, 'admin'); const uid = idOf(id);
  if (uid === admin.id) throw err(409, 'cannot_change_self');
  const t = await ctx.env.DB.prepare('SELECT id, role FROM users WHERE id = ?1').bind(uid).first<any>();
  if (!t) throw err(404, 'not_found'); if (t.role === 'admin') throw err(403, 'forbidden');
  const disabled = ctx.body.disabled ? 1 : 0;
  await ctx.env.DB.batch([ctx.env.DB.prepare('UPDATE users SET disabled = ?1 WHERE id = ?2').bind(disabled, uid), ...(disabled ? [ctx.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?1').bind(uid)] : [])]);
  await audit(ctx.env.DB, admin, disabled ? 'user.disable' : 'user.enable', 'user:' + uid);
  return json({ ok: true });
});
on('GET', '/api/admin/audit', async (ctx) => {
  need(ctx, 'admin');
  return json({ items: (await ctx.env.DB.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 200').all()).results });
});

// ------------------------------------------------------------------ dispatcher
export async function handleApi(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url); const method = req.method.toUpperCase();
  try {
    if (method === 'OPTIONS') return new Response(null, { status: 405, headers: SEC_HEADERS });
    if (method !== 'GET' && method !== 'HEAD') {
      // CSRF: state-changing requests must be same-origin JSON (no CORS preflight is ever answered).
      const origin = req.headers.get('Origin');
      if (origin && origin !== url.origin) throw err(403, 'bad_origin');
      const sfs = req.headers.get('Sec-Fetch-Site');
      if (sfs && !['same-origin', 'none'].includes(sfs)) throw err(403, 'bad_origin');
      if (method !== 'DELETE' || (req.headers.get('Content-Length') || '0') !== '0') {
        const ct = req.headers.get('Content-Type') || '';
        if (!ct.startsWith('application/json')) throw err(415, 'json_required');
      }
    }
    await ensureSchema(env.DB);
    let body: any = {};
    if (!['GET', 'HEAD'].includes(method)) {
      const text = await req.text();
      if (text.length > 40000) throw err(413, 'too_large');
      if (text) { try { body = JSON.parse(text); } catch { throw err(400, 'bad_json'); } }
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw err(400, 'bad_json');
    }
    const ctx: Ctx = { req, env, url, user: null, ip: req.headers.get('CF-Connecting-IP') || 'local', body, query: url.searchParams };
    ctx.user = await loadUser(ctx);
    for (const [m, re, h] of routes) {
      if (m !== method && !(method === 'HEAD' && m === 'GET')) continue;
      const match = url.pathname.match(re);
      if (match) return await h(ctx, match.slice(1).map(decodeURIComponent));
    }
    throw err(404, 'not_found');
  } catch (e: any) {
    if (e instanceof HttpError) return json({ error: e.code, ...(e.detail || {}) }, e.status, e.status === 429 && e.detail?.retry_after ? { 'Retry-After': String(e.detail.retry_after) } : {});
    console.error('api_error', (e && e.stack) || e);
    return json({ error: 'server_error' }, 500);
  }
}

export const SPA_HEADERS: Record<string, string> = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', 'Cache-Control': 'no-cache',
};
export const APP_ROUTES = /^\/(|login|register|app(\/[a-z]+)?(\/[a-z0-9-]+)*|my|admin(\/[a-z]+)?|terms|privacy|i\/[A-Za-z0-9_-]{24,64})$/;
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/')) return handleApi(req, env);
    if (!env.ASSETS) return new Response('Not found', { status: 404 });
    const res = await env.ASSETS.fetch(new Request(new URL('/', url).toString(), { method: 'GET' }));
    const h = new Headers(res.headers);
    for (const [k, v] of Object.entries(SPA_HEADERS)) h.set(k, v);
    const known = APP_ROUTES.test(url.pathname.replace(/\/$/, '') || '/');
    return new Response(res.body, { status: known ? 200 : 404, headers: h });
  },
};
