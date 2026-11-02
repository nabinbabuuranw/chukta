import { useEffect, useState } from 'react';
import { Link, navigate } from '../../lib/router';
import { api, errorText, type Invoice, type Business } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { PageHead } from '../../components/AppShell';
import { BillDocument } from '../../components/BillDocument';
import { Field, Select, Loading, ErrorBox, StatusChip, Money, Sheet, toast } from '../../components/ui';
import { IcWallet, IcChat, IcCopy, IcPrint, IcTrash } from '../../components/Icons';
import { METHOD_LABEL, bsPretty } from '../../lib/format';
import { adIsoToBs, ktmTodayIso } from '../../../shared/money';

interface Payment { id: number; amount: number; date: string; method: string; ref: string; voided: number }
export default function BillDetail({ id }: { id: number }) {
  const { data, error, loading, reload } = useApi<{ invoice: Invoice; payments: Payment[]; business: Business }>(`/invoices/${id}`);
  const [sheet, setSheet] = useState<null | 'pay' | 'remind' | 'void'>(null);
  const [busy, setBusy] = useState(false);
  if (error) return <ErrorBox text={error} retry={() => reload()} />;
  if (loading || !data) return <Loading rows={6} />;
  const inv = data.invoice; const link = `${location.origin}/i/${inv.token}`;
  async function act(fn: () => Promise<any>, ok: string) { setBusy(true); try { await fn(); toast(ok); await reload(true); } catch (e) { toast(errorText(e), 'err'); } finally { setBusy(false); } }
  const copy = async (text: string, ok: string) => { try { await navigator.clipboard.writeText(text); toast(ok); } catch { toast('Could not copy. Long-press to copy instead.', 'err'); } };
  return (
    <>
      <PageHead back={{ to: '/app/bills', label: 'Bills' }} title={inv.number || 'Draft bill'} sub={<span className="flex flex-wrap items-center gap-2"><StatusChip status={inv.status} days={inv.days_overdue} /><span>{inv.client_name}</span>{inv.reminders > 0 && <span className="text-[13px]">· reminded {inv.reminders}×</span>}</span>}
        actions={<div className="no-print flex flex-wrap gap-2">
          {inv.state === 'draft' && <>
            <button className="btn-primary" disabled={busy} onClick={() => act(() => api(`/invoices/${inv.id}/issue`, { body: {} }), 'Bill issued')}>Issue bill</button>
            <Link to={`/app/bills/${inv.id}/edit`} className="btn-quiet">Edit</Link>
            <button className="btn-danger !px-3" disabled={busy} aria-label="Delete draft" onClick={async () => { if (!confirm('Delete this draft?')) return; try { await api(`/invoices/${inv.id}`, { method: 'DELETE' }); toast('Draft deleted'); navigate('/app/bills'); } catch (e) { toast(errorText(e), 'err'); } }}><IcTrash size={18} /></button></>}
          {inv.state === 'issued' && inv.balance > 0 && <>
            <button className="btn-primary" onClick={() => setSheet('pay')}><IcWallet size={18} />Record payment</button>
            <button className="btn-quiet" onClick={() => setSheet('remind')}><IcChat size={18} />Remind</button></>}
          {inv.state !== 'draft' && <button className="btn-quiet" onClick={() => copy(link, 'Bill link copied')}><IcCopy size={18} />Copy link</button>}
          <button className="btn-quiet !px-3" onClick={() => window.print()} aria-label="Print bill"><IcPrint size={18} /></button>
        </div>} />
      <div className="grid xl:grid-cols-[1fr_320px] gap-6 items-start">
        <BillDocument inv={inv} biz={data.business} />
        <aside className="space-y-4 no-print">
          {inv.state === 'issued' && (
            <section className="card p-4" aria-labelledby="pay-h">
              <h2 id="pay-h" className="text-[18px] mb-3">Payments</h2>
              {data.payments.filter((p) => !p.voided).length === 0 ? <p className="text-muted text-[14px]">No payment recorded yet.</p> : (
                <ul className="divide-y divide-rule">
                  {data.payments.filter((p) => !p.voided).map((p) => (
                    <li key={p.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div><Money p={p.amount} className="block" /><span className="text-[12px] text-muted">{bsPretty(adIsoToBs(p.date))} · {METHOD_LABEL[p.method]}{p.ref ? ' · ' + p.ref : ''}</span></div>
                      <button className="btn-ghost btn-sm !px-2 text-muted hover:!text-overdue" aria-label="Remove this payment" onClick={() => confirm('Remove this payment? The balance goes back up.') && act(() => api(`/payments/${p.id}`, { method: 'DELETE' }), 'Payment removed')}><IcTrash size={16} /></button>
                    </li>))}
                </ul>)}
              {inv.paid === 0 && <button className="btn-ghost btn-sm mt-3 !px-0 text-overdue" onClick={() => setSheet('void')}>Void this bill…</button>}
            </section>)}
          <section className="card p-4 text-[14px] text-ink-2">
            <p>Your customer can open this bill at its private link, no login needed.</p>
            {inv.state !== 'draft' && <Link to={`/i/${inv.token}`} className="text-baltic underline underline-offset-4 break-all">Open the customer view</Link>}
          </section>
        </aside>
      </div>
      <Sheet open={sheet === 'pay'} onClose={() => setSheet(null)} title="Record a payment"><PayForm inv={inv} onDone={() => { setSheet(null); reload(true); }} /></Sheet>
      <Sheet open={sheet === 'remind'} onClose={() => setSheet(null)} title="Send a reminder"><Remind inv={inv} onLogged={() => reload(true)} /></Sheet>
      <Sheet open={sheet === 'void'} onClose={() => setSheet(null)} title="Void this bill"><VoidForm inv={inv} onDone={() => { setSheet(null); reload(true); }} /></Sheet>
    </>
  );
}
function PayForm({ inv, onDone }: { inv: Invoice; onDone: () => void }) {
  const [f, setF] = useState({ amount: (inv.balance / 100).toFixed(2), date: ktmTodayIso(), method: 'esewa', ref: '' });
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  return (
    <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setError(null); try { const r = await api(`/invoices/${inv.id}/payments`, { body: f }); toast(r.invoice.status === 'paid' ? 'Paid in full. Chukta!' : 'Payment recorded'); onDone(); } catch (er) { setError(errorText(er)); } finally { setBusy(false); } }}>
      <p className="text-[14px] text-muted">Balance due: <Money p={inv.balance} className="text-ink" /></p>
      <Field label="Amount received (Rs)" inputMode="decimal" className="[&_input]:num" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date" type="date" value={f.date} min={inv.issue_date} onChange={(e) => setF({ ...f, date: e.target.value })} hint={bsPretty(adIsoToBs(f.date)) + ' BS'} />
        <Select label="Method" value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}>{Object.entries(METHOD_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
      </div>
      <Field label="Reference (optional)" placeholder="Transaction ID or cheque no." value={f.ref} onChange={(e) => setF({ ...f, ref: e.target.value })} maxLength={60} />
      {error && <p role="alert" className="text-overdue text-[14px]">{error}</p>}
      <button className="btn-primary w-full" disabled={busy}>{busy ? 'Saving…' : 'Save payment'}</button>
    </form>
  );
}
function Remind({ inv, onLogged }: { inv: Invoice; onLogged: () => void }) {
  const [lang, setLang] = useState<'en' | 'ne'>('ne');
  const [msg, setMsg] = useState<{ text: string; whatsapp: string; sms: string | null; mailto: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = async (l: 'en' | 'ne') => { setLang(l); setError(null); setMsg(null); try { setMsg(await api(`/invoices/${inv.id}/reminder`, { body: { lang: l } })); } catch (e) { setError(errorText(e)); } };
  useEffect(() => { load('ne'); }, []);
  const logAnd = async (href: string) => { try { await api(`/invoices/${inv.id}/reminder`, { body: { lang, log: true } }); onLogged(); } catch { /* opening the app still works */ } window.open(href, '_blank', 'noopener'); };
  return (
    <div className="space-y-4">
      <div className="inline-flex p-1 rounded-full bg-tint border border-rule" role="radiogroup" aria-label="Language">
        {(['ne', 'en'] as const).map((l) => <button key={l} role="radio" aria-checked={lang === l} onClick={() => load(l)} className={`h-8 px-4 rounded-full text-[14px] cursor-pointer ${lang === l ? 'bg-baltic text-sheet' : 'text-ink-2'}`}>{l === 'ne' ? 'नेपाली' : 'English'}</button>)}
      </div>
      {error ? <p className="text-overdue">{error}</p> : !msg ? <div className="skel h-32" /> : <>
        <p className="card bg-mist p-3.5 text-[14px] whitespace-pre-line" lang={lang}>{msg.text}</p>
        <div className="grid gap-2">
          <button className="btn-primary" onClick={() => logAnd(msg.whatsapp)}>Open WhatsApp</button>
          {msg.sms && <button className="btn-quiet" onClick={() => logAnd(msg.sms!)}>Open SMS</button>}
          {msg.mailto && <button className="btn-quiet" onClick={() => logAnd(msg.mailto!)}>Open email</button>}
          <button className="btn-ghost" onClick={async () => { try { await navigator.clipboard.writeText(msg.text); toast('Message copied'); } catch { toast('Could not copy', 'err'); } }}>Copy text</button>
        </div>
        <p className="text-[12px] text-muted">Chukta never sends messages by itself. Your app opens with the text filled in; you press send.{!inv.client_phone ? ' Add a mobile number to this customer to open WhatsApp straight to their chat.' : ''}</p>
      </>}
    </div>
  );
}
function VoidForm({ inv, onDone }: { inv: Invoice; onDone: () => void }) {
  const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  return (
    <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setError(null); try { await api(`/invoices/${inv.id}/void`, { body: { reason } }); toast('Bill voided'); onDone(); } catch (er) { setError(errorText(er)); } finally { setBusy(false); } }}>
      <p className="text-[14px] text-ink-2">Voiding keeps bill {inv.number} on record (it stays in the VAT register marked void) but removes it from what your customer owes. This can't be undone.</p>
      <Field label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Issued to the wrong buyer" maxLength={200} />
      {error && <p role="alert" className="text-overdue text-[14px]">{error}</p>}
      <button className="btn-danger w-full" disabled={busy || reason.trim().length < 3}>{busy ? 'Voiding…' : 'Void bill'}</button>
    </form>
  );
}
