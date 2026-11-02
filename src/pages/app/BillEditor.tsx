import { useEffect, useMemo, useState } from 'react';
import { navigate, useLocation } from '../../lib/router';
import { api, errorText, ApiError, type Client, type Invoice } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useApi } from '../../lib/useApi';
import { PageHead } from '../../components/AppShell';
import { Field, Select, Loading, ErrorBox, Money, Sheet, toast } from '../../components/ui';
import { IcPlus, IcTrash } from '../../components/Icons';
import { computeTotals, parseNpr, amountInWords, adIsoToBs, ktmTodayIso, ABBREVIATED_LIMIT_PAISA } from '../../../shared/money';
import { bsPretty } from '../../lib/format';
import { ClientForm } from './Clients';

interface Row { description: string; qty: string; unit: string; rate: string; taxable: boolean }
const blank = (): Row => ({ description: '', qty: '1', unit: '', rate: '', taxable: true });
const addDays = (iso: string, d: number) => new Date(Date.parse(iso) + d * 86400000).toISOString().slice(0, 10);

export default function BillEditor({ id }: { id?: number }) {
  const { business } = useAuth();
  const clients = useApi<{ items: Client[] }>('/clients');
  const existing = useApi<{ invoice: Invoice }>(id ? `/invoices/${id}` : null);
  const { search } = useLocation(); const pre = new URLSearchParams(search).get('client') || '';
  const today = ktmTodayIso();
  const vatBiz = !!business?.vat_registered;
  const [f, setF] = useState({ client_id: pre, kind: vatBiz ? 'tax_invoice' : 'pan_bill', issue_date: today, due_date: addDays(today, business?.default_due_days ?? 15), discount: '', notes: '' });
  const [rows, setRows] = useState<Row[]>([blank()]);
  const [busy, setBusy] = useState<string | null>(null); const [error, setError] = useState<string | null>(null); const [field, setField] = useState<string | null>(null);
  const [addClient, setAddClient] = useState(false);
  useEffect(() => {
    const inv = existing.data?.invoice; if (!inv) return;
    if (inv.state !== 'draft') { navigate(`/app/bills/${inv.id}`, { replace: true }); return; }
    setF({ client_id: String(inv.client_id), kind: inv.kind, issue_date: inv.issue_date, due_date: inv.due_date, discount: inv.discount ? (inv.discount / 100).toFixed(2) : '', notes: inv.notes });
    setRows(inv.items.map((it) => ({ description: it.description, qty: String(it.qty), unit: it.unit || '', rate: (it.rate / 100).toFixed(2), taxable: it.taxable })));
  }, [existing.data]);
  const lines = rows.map((r) => ({ description: r.description, qty: Number(r.qty) || 0, rate: parseNpr(r.rate) ?? 0, taxable: r.taxable }));
  const disc = parseNpr(f.discount || '0');
  const t = useMemo(() => computeTotals(lines, disc ?? 0, f.kind !== 'pan_bill'), [JSON.stringify(lines), disc, f.kind]);
  const setRow = (i: number, k: keyof Row, v: any) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  async function save(issue: boolean) {
    setBusy(issue ? 'issue' : 'draft'); setError(null); setField(null);
    const body = { ...f, client_id: Number(f.client_id), discount: f.discount || '0', items: rows.map((r) => ({ description: r.description, qty: Number(r.qty), unit: r.unit, rate: r.rate || '', taxable: r.taxable })) };
    try {
      let inv: Invoice;
      if (id) { inv = (await api(`/invoices/${id}`, { method: 'PUT', body })).invoice; if (issue) inv = (await api(`/invoices/${id}/issue`, { body: {} })).invoice; }
      else inv = (await api('/invoices', { body: { ...body, issue } })).invoice;
      toast(issue ? `Bill ${inv.number} issued` : 'Draft saved');
      navigate(`/app/bills/${inv.id}`, { replace: true });
    } catch (e) { setError(errorText(e)); if (e instanceof ApiError) setField(e.field || null); } finally { setBusy(null); }
  }
  if (clients.error) return <ErrorBox text={clients.error} retry={() => clients.reload()} />;
  if (clients.loading || (id && existing.loading)) return <Loading rows={5} />;
  const list = clients.data?.items || [];
  const overAbbr = f.kind === 'abbreviated' && t.total > ABBREVIATED_LIMIT_PAISA;
  return (
    <>
      <PageHead title={id ? 'Edit draft' : 'New bill'} back={{ to: id ? `/app/bills/${id}` : '/app/bills', label: id ? 'Back to bill' : 'Bills' }} />
      <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">
        <div className="space-y-5">
          <section className="card p-4 sm:p-5 grid sm:grid-cols-2 gap-4" aria-label="Bill details">
            <div className="sm:col-span-2 flex items-end gap-2">
              <Select label="Customer" className="flex-1" value={f.client_id} onChange={(e) => setF({ ...f, client_id: e.target.value })} aria-invalid={field === 'client_id' || undefined}>
                <option value="">{list.length ? 'Choose a customer…' : 'No customers yet, add one →'}</option>
                {list.map((c) => <option key={c.id} value={c.id}>{c.name}{c.pan ? ` · PAN ${c.pan}` : ''}</option>)}
              </Select>
              <button type="button" className="btn-quiet !px-3" onClick={() => setAddClient(true)} aria-label="Add a new customer"><IcPlus size={18} /><span className="hidden sm:inline">New</span></button>
            </div>
            <Select label="Bill type" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} disabled={!vatBiz}>
              {vatBiz ? <><option value="tax_invoice">Tax invoice (VAT 13%)</option><option value="abbreviated">Abbreviated tax invoice (≤ Rs 10,000)</option></> : <option value="pan_bill">PAN bill (no VAT)</option>}
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bill date" type="date" value={f.issue_date} onChange={(e) => setF({ ...f, issue_date: e.target.value })} hint={bsPretty(adIsoToBs(f.issue_date)) + ' BS'} error={field === 'issue_date' ? 'Check the date' : null} />
              <Field label="Due date" type="date" value={f.due_date} min={f.issue_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} hint={bsPretty(adIsoToBs(f.due_date)) + ' BS'} error={field === 'due_date' ? 'On or after the bill date' : null} />
            </div>
          </section>
          <section className="card overflow-hidden" aria-labelledby="li-h">
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-rule"><h2 id="li-h" className="text-[18px]">Items</h2><span className="text-[13px] text-muted">{rows.length} of 50</span></div>
            <ul className="divide-y divide-rule">
              {rows.map((r, i) => {
                const amt = Math.round((Number(r.qty) || 0) * (parseNpr(r.rate) ?? 0));
                const bad = field?.startsWith(`items.${i}.`);
                return (
                  <li key={i} className={`p-4 sm:px-5 grid grid-cols-6 sm:grid-cols-[1fr_76px_70px_120px_auto] gap-2.5 items-end ${bad ? 'bg-overdue-soft/40' : ''}`}>
                    <div className="col-span-6 sm:col-span-1"><label className="label sm:sr-only" htmlFor={`d${i}`}>Item {i + 1}</label><input id={`d${i}`} className="field" placeholder="What did you sell?" value={r.description} onChange={(e) => setRow(i, 'description', e.target.value)} aria-invalid={field === `items.${i}.description` || undefined} /></div>
                    <div className="col-span-2 sm:col-span-1"><label className="label sm:sr-only" htmlFor={`q${i}`}>Qty</label><input id={`q${i}`} className="field num text-right" inputMode="decimal" value={r.qty} onChange={(e) => setRow(i, 'qty', e.target.value)} aria-invalid={field === `items.${i}.qty` || undefined} /></div>
                    <div className="col-span-1 sm:col-span-1"><label className="label sm:sr-only" htmlFor={`u${i}`}>Unit</label><input id={`u${i}`} className="field !px-2" placeholder="pcs" value={r.unit} onChange={(e) => setRow(i, 'unit', e.target.value)} /></div>
                    <div className="col-span-3 sm:col-span-1"><label className="label sm:sr-only" htmlFor={`r${i}`}>Rate (Rs)</label><input id={`r${i}`} className="field num text-right" inputMode="decimal" placeholder="0.00" value={r.rate} onChange={(e) => setRow(i, 'rate', e.target.value)} aria-invalid={field === `items.${i}.rate` || undefined} /></div>
                    <div className="col-span-6 sm:col-span-1 flex items-center justify-between sm:justify-end gap-3 h-11">
                      {f.kind !== 'pan_bill' && <label className="flex items-center gap-1.5 text-[13px] text-ink-2 cursor-pointer"><input type="checkbox" className="size-4 accent-[#05668D]" checked={r.taxable} onChange={(e) => setRow(i, 'taxable', e.target.checked)} />VAT</label>}
                      <Money p={amt} className="sm:hidden text-[14px]" />
                      <button type="button" className="btn-ghost btn-sm !px-2 text-muted hover:!text-overdue" onClick={() => setRows(rows.length > 1 ? rows.filter((_, j) => j !== i) : [blank()])} aria-label={`Remove item ${i + 1}`}><IcTrash size={18} /></button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="px-4 sm:px-5 py-3 border-t border-rule"><button type="button" className="btn-quiet btn-sm" disabled={rows.length >= 50} onClick={() => setRows([...rows, blank()])}><IcPlus size={16} />Add item</button></div>
          </section>
          <section className="card p-4 sm:p-5 grid sm:grid-cols-[180px_1fr] gap-4" aria-label="Discount and note">
            <Field label="Discount (Rs)" inputMode="decimal" className="[&_input]:num" value={f.discount} onChange={(e) => setF({ ...f, discount: e.target.value })} error={disc === null ? 'Not a valid amount' : null} />
            <div><label htmlFor="notes" className="label">Note on the bill (optional)</label><textarea id="notes" rows={2} maxLength={500} className="field !h-auto py-2.5" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="e.g. Goods once sold are not returnable." /></div>
          </section>
        </div>
        <aside className="lg:sticky lg:top-32 carbon rounded-card" aria-label="Totals">
          <div className="card shadow-card p-5">
            <dl className="space-y-2 text-[15px]">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd><Money p={t.subtotal} /></dd></div>
              {t.discount > 0 && <div className="flex justify-between"><dt className="text-muted">Discount</dt><dd>−<Money p={t.discount} /></dd></div>}
              {f.kind !== 'pan_bill' && <><div className="flex justify-between"><dt className="text-muted">Taxable</dt><dd><Money p={t.taxable} /></dd></div>
                {t.nontaxable > 0 && <div className="flex justify-between"><dt className="text-muted">Non-taxable</dt><dd><Money p={t.nontaxable} /></dd></div>}
                <div className="flex justify-between"><dt className="text-muted">VAT 13%</dt><dd><Money p={t.vat} /></dd></div></>}
              <div className="flex justify-between items-baseline pt-3 mt-1 border-t border-rule"><dt className="font-semibold">Total</dt><dd className="text-[22px]"><span className="marker"><Money p={t.total} /></span></dd></div>
            </dl>
            <p className="text-[12px] text-ink-2 mt-2 leading-snug">{t.total ? amountInWords(t.total) : ' '}</p>
            {overAbbr && <p className="text-[13px] text-overdue mt-2">Over Rs 10,000: use a full tax invoice.</p>}
            {error && <p role="alert" className="text-[14px] text-overdue mt-3">{error}</p>}
            <div className="grid gap-2 mt-5">
              <button className="btn-primary" disabled={!!busy || overAbbr} onClick={() => save(true)}>{busy === 'issue' ? 'Issuing…' : 'Issue bill'}</button>
              <button className="btn-quiet" disabled={!!busy} onClick={() => save(false)}>{busy === 'draft' ? 'Saving…' : 'Save as draft'}</button>
            </div>
            <p className="text-[12px] text-muted mt-3">Issued bills get the next number and are locked. Totals are re-checked on our server.</p>
          </div>
        </aside>
      </div>
      <Sheet open={addClient} onClose={() => setAddClient(false)} title="New customer">
        <ClientForm onSaved={(c) => { setAddClient(false); clients.reload(true); setF((x) => ({ ...x, client_id: String(c.id) })); toast(`${c.name} added`); }} />
      </Sheet>
    </>
  );
}
