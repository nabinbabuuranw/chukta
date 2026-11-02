import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { handleApi, validPhone, validEmail, validDate, statusOf, reminderText, SESSION_COOKIE, APP_ROUTES } from '../src/worker.ts';
import { computeTotals, amountInWords, fmtNpr, parseNpr, fiscalYear, bsMonthRange, adIsoToBs, validPan, ktmTodayIso } from '../../shared/money.ts';
import { hashPassword, verifyPassword } from '../src/crypto.ts';
import { D1Shim } from './d1shim.ts';

const ORIGIN = 'https://chukta.sites.tab.bot';
const SETUP_KEY = 'test-setup-key-' + Math.random().toString(36).slice(2);
let env: any; let ipc = 0;
async function call(method: string, path: string, o: { body?: any; cookie?: string; origin?: string | null; ip?: string; ct?: string } = {}) {
  const h: Record<string, string> = {};
  if (o.origin !== null && method !== 'GET') h.Origin = o.origin || ORIGIN;
  if (o.cookie) h.Cookie = `${SESSION_COOKIE}=${o.cookie}`;
  if (o.body !== undefined) h['Content-Type'] = o.ct || 'application/json';
  h['CF-Connecting-IP'] = o.ip || `10.1.0.${++ipc % 250}`;
  const res = await handleApi(new Request(ORIGIN + path, { method, headers: h, body: o.body !== undefined ? JSON.stringify(o.body) : undefined }), env);
  const text = await res.text();
  const m = new RegExp(SESSION_COOKIE + '=([^;]*)').exec(res.headers.get('set-cookie') || '');
  let j: any = null; try { j = text ? JSON.parse(text) : null; } catch { j = text; }
  return { status: res.status, json: j, text, cookie: m ? m[1] : null, headers: res.headers };
}
const PW = 'Kathmandu123';
let owner: string, owner2: string, customer: string, admin: string, clientId: number, invId: number, invToken: string;

test.before(async () => {
  const h = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(SETUP_KEY))), (b) => b.toString(16).padStart(2, '0')).join('');
  env = { DB: new D1Shim(), SETUP_KEY_SHA256: h };
});

test('money maths: VAT 13%, pro-rata discount, rounding', () => {
  const t = computeTotals([{ description: 'a', qty: 2, rate: 150000, taxable: true }, { description: 'b', qty: 1, rate: 50000, taxable: false }], 10000, true);
  assert.equal(t.subtotal, 350000); assert.equal(t.taxable + t.nontaxable, 340000); assert.equal(t.vat, Math.round(t.taxable * 0.13)); assert.equal(t.total, 340000 + t.vat);
  const p = computeTotals([{ description: 'x', qty: 1, rate: 100000, taxable: true }], 0, false);
  assert.equal(p.vat, 0); assert.equal(p.total, 100000);
  assert.equal(computeTotals([{ description: 'x', qty: 1.5, rate: 33333, taxable: true }], 0, true).subtotal, 50000);
});
test('formatting: lakh grouping, words, parsing, PAN', () => {
  assert.equal(fmtNpr(1234567891), '1,23,45,678.91'); assert.equal(fmtNpr(100000, false), '1,000');
  assert.equal(amountInWords(11234589), 'Rupees One Lakh Twelve Thousand Three Hundred Forty-Five and Eighty-Nine Paisa Only');
  assert.equal(amountInWords(1250000000), 'Rupees One Crore Twenty-Five Lakh Only');
  assert.equal(parseNpr('1,23,456.5'), 12345650); assert.equal(parseNpr('-5'), null); assert.equal(parseNpr('1.234'), null);
  assert.equal(validPan('123456789'), '123456789'); assert.equal(validPan('12345678'), null); assert.equal(validPan('12345678a'), null);
});
test('dates: BS conversion, fiscal year starts 1 Shrawan, BS month range', () => {
  assert.equal(adIsoToBs('2026-11-02'), '2083-07-16');
  assert.equal(fiscalYear('2026-11-02'), '2083/84');
  assert.equal(fiscalYear('2026-07-01'), '2082/83'); // before 1 Shrawan 2083 (2026-07-17)
  assert.deepEqual(bsMonthRange('2083-07'), { start: '2026-10-18', end: '2026-11-16' });
  assert.equal(validDate('2026-02-30'), null); assert.equal(validDate('2026-11-02'), '2026-11-02');
  assert.equal(validPhone('+977 9841-234567'), '9841234567'); assert.equal(validEmail('A@B.co'), 'a@b.co');
});
test('status derivation', () => {
  assert.equal(statusOf({ state: 'issued', total: 100, paid: 100, due_date: '2000-01-01' }), 'paid');
  assert.equal(statusOf({ state: 'issued', total: 100, paid: 0, due_date: '2000-01-01' }), 'overdue');
  assert.equal(statusOf({ state: 'issued', total: 100, paid: 10, due_date: '2999-01-01' }), 'partial');
  assert.equal(statusOf({ state: 'issued', total: 100, paid: 0, due_date: '2999-01-01' }), 'due');
  assert.equal(statusOf({ state: 'void', total: 100, paid: 0, due_date: '2999-01-01' }), 'void');
});
test('password hashing', async () => {
  const h = await hashPassword('Secret123'); assert.ok(await verifyPassword('Secret123', h)); assert.ok(!(await verifyPassword('Secret124', h)));
});
test('setup: wrong key refused, admin created once', async () => {
  assert.equal((await call('POST', '/api/setup', { body: { key: 'nope', admin: { email: 'a@x.np', password: PW, name: 'Admin' } } })).status, 403);
  const r = await call('POST', '/api/setup', { body: { key: SETUP_KEY, admin: { email: 'admin@chukta.test', password: PW, name: 'Admin' }, demo: { owner_email: 'demo@chukta.test', owner_password: PW, customer_email: 'cust@chukta.test', customer_password: PW } } });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  assert.equal((await call('POST', '/api/setup', { body: { key: SETUP_KEY, admin: { email: 'b@x.np', password: PW, name: 'B' } } })).status, 409);
  admin = (await call('POST', '/api/auth/login', { body: { email: 'admin@chukta.test', password: PW } })).cookie!;
  assert.ok(admin);
});
test('register: owner needs valid business; VAT business needs PAN; duplicate email', async () => {
  assert.equal((await call('POST', '/api/auth/register', { body: { name: 'Ram', email: 'ram@shop.np', password: PW, account: 'owner', business: { name: 'Ram Hardware', vat_registered: true } } })).json.field, 'pan');
  assert.equal((await call('POST', '/api/auth/register', { body: { name: 'Ram', email: 'ram@shop.np', password: 'short', account: 'owner', business: { name: 'Ram Hardware', pan: '301234567' } } })).json.field, 'password');
  const r = await call('POST', '/api/auth/register', { body: { name: 'Ram', email: 'ram@shop.np', password: PW, account: 'owner', business: { name: 'Ram Hardware', pan: '301234567', vat_registered: true, prefix: 'rh' } } });
  assert.equal(r.status, 201); owner = r.cookie!;
  assert.match(r.headers.get('set-cookie')!, /HttpOnly; Secure; SameSite=Lax/);
  assert.equal((await call('POST', '/api/auth/register', { body: { name: 'Ram', email: 'RAM@shop.np', password: PW, account: 'customer' } })).status, 409);
  const r2 = await call('POST', '/api/auth/register', { body: { name: 'Sita', email: 'sita@tea.np', password: PW, account: 'owner', business: { name: 'Sita Tea Supply', vat_registered: false } } });
  owner2 = r2.cookie!;
  const c = await call('POST', '/api/auth/register', { body: { name: 'Hari', email: 'hari@buyer.np', password: PW, account: 'customer' } });
  customer = c.cookie!; assert.equal(c.json.user.role, 'customer');
  const me = await call('GET', '/api/me', { cookie: owner }); assert.equal(me.json.business.prefix, 'RH');
});
test('login: bad password 401, rate limited per email', async () => {
  assert.equal((await call('POST', '/api/auth/login', { body: { email: 'ram@shop.np', password: 'wrong123x' } })).status, 401);
  let last = 0; for (let i = 0; i < 12; i++) last = (await call('POST', '/api/auth/login', { body: { email: 'victim@x.np', password: 'wrong123x' } })).status;
  assert.equal(last, 429);
});
test('CSRF: cross-origin and non-JSON writes refused', async () => {
  assert.equal((await call('POST', '/api/clients', { cookie: owner, body: { name: 'X Co' }, origin: 'https://evil.example' })).status, 403);
  assert.equal((await call('POST', '/api/clients', { cookie: owner, body: { name: 'X Co' }, ct: 'text/plain' })).status, 415);
});
test('RBAC: customer and anonymous cannot use owner or admin APIs', async () => {
  assert.equal((await call('GET', '/api/clients')).status, 401);
  assert.equal((await call('GET', '/api/clients', { cookie: customer })).status, 403);
  assert.equal((await call('GET', '/api/admin/overview', { cookie: owner })).status, 403);
  assert.equal((await call('GET', '/api/my/bills', { cookie: owner })).status, 403);
});
test('clients: validation, create, update, isolation between businesses', async () => {
  assert.equal((await call('POST', '/api/clients', { cookie: owner, body: { name: 'Hari Traders', pan: '123' } })).json.field, 'pan');
  const r = await call('POST', '/api/clients', { cookie: owner, body: { name: 'Hari Traders', pan: '600111222', email: 'hari@buyer.np', phone: '9841000000', address: 'Bhaktapur' } });
  assert.equal(r.status, 201); clientId = r.json.client.id;
  assert.equal((await call('PUT', `/api/clients/${clientId}`, { cookie: owner, body: { name: 'Hari Traders Pvt Ltd', pan: '600111222', email: 'hari@buyer.np', phone: '9841000000' } })).json.client.name, 'Hari Traders Pvt Ltd');
  assert.equal((await call('GET', `/api/clients/${clientId}`, { cookie: owner2 })).status, 404);
  assert.equal((await call('PUT', `/api/clients/${clientId}`, { cookie: owner2, body: { name: 'Hijack' } })).status, 404);
});
test('invoices: server computes totals, rejects bad items, issues sequential FY numbers', async () => {
  const bad = await call('POST', '/api/invoices', { cookie: owner, body: { client_id: clientId, items: [{ description: 'Cement', qty: -1, rate: '800' }] } });
  assert.equal(bad.status, 422);
  const tooBig = await call('POST', '/api/invoices', { cookie: owner, body: { client_id: clientId, kind: 'abbreviated', items: [{ description: 'Steel rods', qty: 10, rate: '2000' }] } });
  assert.equal(tooBig.json.why, 'abbreviated_over_limit');
  const today = ktmTodayIso();
  const r = await call('POST', '/api/invoices', { cookie: owner, body: { client_id: clientId, issue_date: today, due_date: today, items: [{ description: 'Cement (OPC) bag', qty: 50, rate: '850', unit: 'bag' }, { description: 'Transport', qty: 1, rate: '1500', taxable: false }], discount: '500', total: 1, vat: 999 } });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const inv = r.json.invoice; invId = inv.id;
  assert.equal(inv.state, 'draft'); assert.equal(inv.subtotal, 4400000);
  assert.equal(inv.vat, Math.round(inv.taxable * 0.13)); assert.equal(inv.total, inv.taxable + inv.nontaxable + inv.vat);
  const iss = await call('POST', `/api/invoices/${invId}/issue`, { cookie: owner, body: {} });
  assert.equal(iss.json.invoice.number, `RH-${fiscalYear(today)}-0001`);
  assert.equal((await call('POST', `/api/invoices/${invId}/issue`, { cookie: owner, body: {} })).status, 409);
  assert.equal((await call('PUT', `/api/invoices/${invId}`, { cookie: owner, body: { client_id: clientId, items: [{ description: 'x', qty: 1, rate: '1' }] } })).status, 409);
  const r2 = await call('POST', '/api/invoices', { cookie: owner, body: { client_id: clientId, issue: true, items: [{ description: 'Paint 20L', qty: 2, rate: '7800' }] } });
  assert.equal(r2.json.invoice.number, `RH-${fiscalYear(today)}-0002`);
  invToken = (await call('GET', `/api/invoices/${invId}`, { cookie: owner })).json.invoice.token;
  assert.equal((await call('GET', `/api/invoices/${invId}`, { cookie: owner2 })).status, 404);
});
test('non-VAT business issues PAN bills without VAT', async () => {
  const c = await call('POST', '/api/clients', { cookie: owner2, body: { name: 'Corner Cafe' } });
  assert.equal((await call('POST', '/api/invoices', { cookie: owner2, body: { client_id: c.json.client.id, kind: 'tax_invoice', items: [{ description: 'Tea 1kg', qty: 1, rate: '900' }] } })).json.why, 'business_not_vat_registered');
  const r = await call('POST', '/api/invoices', { cookie: owner2, body: { client_id: c.json.client.id, issue: true, items: [{ description: 'Tea 1kg', qty: 3, rate: '900' }] } });
  assert.equal(r.json.invoice.kind, 'pan_bill'); assert.equal(r.json.invoice.vat, 0); assert.equal(r.json.invoice.total, 270000);
  assert.equal((await call('POST', '/api/invoices', { cookie: owner2, body: { client_id: clientId, items: [{ description: 'x', qty: 1, rate: '1' }] } })).json.field, 'client_id');
});
test('payments: partial, overpay refused, full -> paid, void payment restores balance', async () => {
  const inv = (await call('GET', `/api/invoices/${invId}`, { cookie: owner })).json.invoice;
  const half = Math.floor(inv.total / 2);
  const p1 = await call('POST', `/api/invoices/${invId}/payments`, { cookie: owner, body: { amount: (half / 100).toFixed(2), method: 'esewa', ref: 'TXN1' } });
  assert.equal(p1.status, 201); assert.equal(p1.json.invoice.status, 'partial');
  const over = await call('POST', `/api/invoices/${invId}/payments`, { cookie: owner, body: { amount: (inv.total / 100).toFixed(2), method: 'cash' } });
  assert.equal(over.json.why, 'more_than_balance');
  assert.equal((await call('POST', `/api/invoices/${invId}/payments`, { cookie: owner, body: { amount: '10', method: 'bitcoin' } })).json.field, 'method');
  const p2 = await call('POST', `/api/invoices/${invId}/payments`, { cookie: owner, body: { amount: ((inv.total - half) / 100).toFixed(2), method: 'bank' } });
  assert.equal(p2.json.invoice.status, 'paid'); assert.equal(p2.json.invoice.balance, 0);
  const pays = (await call('GET', `/api/invoices/${invId}`, { cookie: owner })).json.payments;
  assert.equal((await call('DELETE', `/api/payments/${pays[1].id}`, { cookie: owner })).status, 200);
  assert.equal((await call('GET', `/api/invoices/${invId}`, { cookie: owner })).json.invoice.status, 'partial');
  assert.equal((await call('POST', `/api/invoices/${invId}/void`, { cookie: owner, body: { reason: 'wrong client' } })).json.error, 'has_payments');
});
test('client ledger: running balance and CSV export', async () => {
  const l = await call('GET', `/api/clients/${clientId}/ledger`, { cookie: owner });
  assert.equal(l.status, 200); const rows = l.json.rows;
  assert.equal(rows[rows.length - 1].balance, l.json.balance);
  const bills = rows.filter((r: any) => r.kind === 'bill').reduce((s: number, r: any) => s + r.debit, 0);
  const pays = rows.filter((r: any) => r.kind === 'payment').reduce((s: number, r: any) => s + r.credit, 0);
  assert.equal(l.json.balance, bills - pays);
  const c = await call('GET', `/api/clients/${clientId}/ledger?format=csv`, { cookie: owner });
  assert.match(c.headers.get('content-type')!, /text\/csv/); assert.match(c.text, /Balance \(Rs\)/);
});
test('reminder: text has balance + link; WhatsApp link uses +977; nothing due -> 409', async () => {
  const r = await call('POST', `/api/invoices/${invId}/reminder`, { cookie: owner, body: { lang: 'ne', log: true } });
  assert.equal(r.status, 200); assert.match(r.json.text, /बाँकी/); assert.match(r.json.whatsapp, /^https:\/\/wa\.me\/9779841000000\?text=/);
  assert.match(r.json.text, new RegExp('/i/' + invToken));
  const txt = reminderText({ name: 'A', payment_note: '' }, { client_name: 'B', number: 'N-1', issue_date: '2026-11-01', due_date: '2026-11-10', total: 1000, paid: 0 }, 'en', 'L');
  assert.match(txt, /Rs 10\.00 is outstanding/);
});
test('void: needs reason, excluded from VAT register totals, CSV escapes formulas', async () => {
  const c = await call('POST', '/api/clients', { cookie: owner, body: { name: '=HYPERLINK("x")' } });
  const r = await call('POST', '/api/invoices', { cookie: owner, body: { client_id: c.json.client.id, issue: true, items: [{ description: 'Mistake', qty: 1, rate: '1000' }] } });
  assert.equal((await call('POST', `/api/invoices/${r.json.invoice.id}/void`, { cookie: owner, body: { reason: '' } })).status, 422);
  assert.equal((await call('POST', `/api/invoices/${r.json.invoice.id}/void`, { cookie: owner, body: { reason: 'Issued to wrong buyer' } })).json.invoice.status, 'void');
  const month = adIsoToBs(ktmTodayIso())!.slice(0, 7);
  const v = await call('GET', `/api/reports/vat?month=${month}`, { cookie: owner });
  const issued = v.json.rows.filter((x: any) => x.state === 'issued');
  assert.equal(v.json.totals.vat, issued.reduce((s: number, x: any) => s + x.vat, 0));
  assert.ok(v.json.rows.some((x: any) => x.state === 'void'));
  const csvR = await call('GET', `/api/reports/vat?month=${month}&format=csv`, { cookie: owner });
  assert.match(csvR.text, /'=HYPERLINK/); assert.match(csvR.text, /VOID: Issued to wrong buyer/);
});
test('summary: receivable equals sum of open balances', async () => {
  const s = await call('GET', '/api/summary', { cookie: owner });
  const list = (await call('GET', '/api/invoices', { cookie: owner })).json.items;
  assert.equal(s.json.receivable, list.filter((i: any) => i.state === 'issued').reduce((a: number, i: any) => a + i.balance, 0));
  assert.equal(s.json.aging.length, 4);
});
test('public bill link: works by token, hides internal ids, drafts not public', async () => {
  const p = await call('GET', `/api/public/invoice/${invToken}`);
  assert.equal(p.status, 200); assert.equal(p.json.invoice.client_id, undefined); assert.equal(p.json.invoice.token, undefined);
  assert.match(p.json.words, /^Rupees /);
  assert.equal((await call('GET', '/api/public/invoice/short')).status, 404);
  const d = await call('POST', '/api/invoices', { cookie: owner, body: { client_id: clientId, items: [{ description: 'Draft', qty: 1, rate: '10' }] } });
  const tok = (await call('GET', `/api/invoices/${d.json.invoice.id}`, { cookie: owner })).json.invoice.token;
  assert.equal((await call('GET', `/api/public/invoice/${tok}`)).status, 404);
  assert.equal((await call('DELETE', `/api/invoices/${d.json.invoice.id}`, { cookie: owner })).status, 200);
});
test('customer portal: sees only bills addressed to their email', async () => {
  const r = await call('GET', '/api/my/bills', { cookie: customer });
  assert.equal(r.status, 200); assert.ok(r.json.items.length >= 2);
  assert.ok(r.json.items.every((i: any) => i.business_name === 'Ram Hardware'));
  const demoCust = (await call('POST', '/api/auth/login', { body: { email: 'cust@chukta.test', password: PW } })).cookie!;
  const d = await call('GET', '/api/my/bills', { cookie: demoCust });
  assert.ok(d.json.items.every((i: any) => /Demo business/.test(i.business_name)));
});
test('admin: overview, suspend business blocks writes, disable user kills sessions, audit trail', async () => {
  const o = await call('GET', '/api/admin/overview', { cookie: admin }); assert.ok(o.json.businesses >= 3);
  const biz = (await call('GET', '/api/admin/businesses', { cookie: admin })).json.items.find((b: any) => b.name === 'Sita Tea Supply');
  assert.equal((await call('PUT', `/api/admin/businesses/${biz.id}`, { cookie: admin, body: { status: 'suspended' } })).status, 200);
  assert.equal((await call('POST', '/api/clients', { cookie: owner2, body: { name: 'New One' } })).json.error, 'business_suspended');
  assert.equal((await call('GET', '/api/clients', { cookie: owner2 })).status, 200);
  const u = (await call('GET', '/api/admin/users', { cookie: admin })).json.items.find((x: any) => x.email === 'sita@tea.np');
  await call('PUT', `/api/admin/users/${u.id}`, { cookie: admin, body: { disabled: true } });
  assert.equal((await call('GET', '/api/me', { cookie: owner2 })).json.user, null);
  assert.equal((await call('POST', '/api/auth/login', { body: { email: 'sita@tea.np', password: PW } })).status, 403);
  const a = await call('GET', '/api/admin/audit', { cookie: admin });
  assert.ok(a.json.items.some((x: any) => x.action === 'invoice.void'));
});
test('free plan limit on clients (25)', async () => {
  const r = await call('POST', '/api/auth/register', { body: { name: 'Lim', email: 'lim@x.np', password: PW, account: 'owner', business: { name: 'Limit Test', vat_registered: false } } });
  let last: any; for (let i = 0; i < 26; i++) last = await call('POST', '/api/clients', { cookie: r.cookie!, body: { name: 'Client ' + i } });
  assert.equal(last.status, 402); assert.equal(last.json.error, 'plan_limit');
});
test('logout ends the session', async () => {
  const r = await call('POST', '/api/auth/logout', { cookie: customer, body: {} });
  assert.match(r.headers.get('set-cookie')!, /Max-Age=0/);
  assert.equal((await call('GET', '/api/me', { cookie: customer })).json.user, null);
});
test('SPA routing: known routes 200, unknown 404, security headers', async () => {
  const assets = { fetch: async () => new Response('<html></html>', { headers: { 'content-type': 'text/html' } }) };
  const e2 = { ...env, ASSETS: assets };
  for (const p of ['/', '/login', '/app', '/app/bills', '/app/bills/12', '/app/clients/3', '/my', '/admin', '/terms', '/privacy', '/i/' + 'a'.repeat(32)]) {
    const r = await worker.fetch(new Request(ORIGIN + p), e2); assert.equal(r.status, 200, p);
    assert.match(r.headers.get('content-security-policy')!, /frame-ancestors 'none'/);
  }
  assert.equal((await worker.fetch(new Request(ORIGIN + '/nope'), e2)).status, 404);
  assert.ok(APP_ROUTES.test('/app/new'));
});
