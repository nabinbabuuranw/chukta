import { useState } from 'react';
import { Link } from '../../lib/router';
import { api, errorText, ApiError, download, type Client } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { PageHead } from '../../components/AppShell';
import { Field, Loading, ErrorBox, Money, Empty, Sheet, toast } from '../../components/ui';
import { IcPlus, IcDownload, IcBill } from '../../components/Icons';
import { bsPretty, rsShort } from '../../lib/format';

export function ClientForm({ initial, onSaved }: { initial?: Client; onSaved: (c: Client) => void }) {
  const [f, setF] = useState({ name: initial?.name || '', pan: initial?.pan || '', phone: initial?.phone || '', email: initial?.email || '', address: initial?.address || '' });
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [field, setField] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: any) => setF({ ...f, [k]: e.target.value });
  const bad = (k: string) => (field === k ? error : null);
  return (
    <form className="space-y-4" noValidate onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setError(null); setField(null);
      try { const r = initial ? await api(`/clients/${initial.id}`, { method: 'PUT', body: f }) : await api('/clients', { body: f }); onSaved(r.client); }
      catch (er) { setError(errorText(er)); if (er instanceof ApiError) setField(er.field || null); } finally { setBusy(false); }
    }}>
      <Field label="Customer or company name" value={f.name} onChange={set('name')} error={bad('name')} autoComplete="organization" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="PAN (optional)" inputMode="numeric" maxLength={9} value={f.pan} onChange={set('pan')} error={bad('pan')} />
        <Field label="Mobile (optional)" inputMode="tel" value={f.phone} onChange={set('phone')} error={bad('phone')} placeholder="98XXXXXXXX" />
      </div>
      <Field label="Email (optional)" type="email" value={f.email} onChange={set('email')} error={bad('email')} hint="If they sign up to Chukta with this email, they'll see your bills." />
      <Field label="Address (optional)" value={f.address} onChange={set('address')} error={bad('address')} />
      {error && !field && <p role="alert" className="text-overdue text-[14px]">{error}</p>}
      <button className="btn-primary w-full" disabled={busy}>{busy ? 'Saving…' : initial ? 'Save changes' : 'Add customer'}</button>
    </form>
  );
}
export default function Clients() {
  const { data, error, loading, reload } = useApi<{ items: Client[]; limit: number | null }>('/clients');
  const [open, setOpen] = useState(false);
  return (
    <>
      <PageHead title="Customers" sub={data ? `${data.items.length}${data.limit ? ` of ${data.limit} on Free` : ''} · sorted by who owes most` : undefined} actions={<button className="btn-primary" onClick={() => setOpen(true)}><IcPlus size={18} />Add customer</button>} />
      {error ? <ErrorBox text={error} retry={() => reload()} /> : loading || !data ? <Loading rows={5} /> : data.items.length === 0 ? (
        <Empty title="No customers yet" body="Add the people and companies you bill. PAN, phone and email are optional." action={<button className="btn-primary" onClick={() => setOpen(true)}>Add your first customer</button>} />
      ) : (
        <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {data.items.map((c, i) => (
            <li key={c.id} className="rise" style={{ animationDelay: Math.min(i, 8) * 30 + 'ms' }}>
              <Link to={`/app/clients/${c.id}`} className="card p-4 block h-full hover:border-baltic/50 transition-colors">
                <div className="flex justify-between gap-2"><p className="font-medium truncate">{c.name}</p>{(c.overdue || 0) > 0 && <span className="text-[12px] text-overdue font-medium whitespace-nowrap">{rsShort(c.overdue!)} late</span>}</div>
                <p className="text-[13px] text-muted truncate">{[c.pan && 'PAN ' + c.pan, c.phone].filter(Boolean).join(' · ') || 'No PAN or phone'}</p>
                <div className="flex justify-between items-baseline mt-3"><span className="text-[13px] text-muted">{c.bills} bills{c.last_bill ? ` · last ${c.last_bill}` : ''}</span>{(c.balance || 0) > 0 ? <Money p={c.balance!} /> : <span className="text-[13px] text-sage-deep font-medium">Nothing due</span>}</div>
              </Link>
            </li>))}
        </ul>)}
      <Sheet open={open} onClose={() => setOpen(false)} title="New customer"><ClientForm onSaved={(c) => { setOpen(false); toast(`${c.name} added`); reload(true); }} /></Sheet>
    </>
  );
}
interface Ledger { client: Client; rows: { date: string; date_bs: string | null; kind: string; ref: string; debit: number; credit: number; balance: number; invoice_id: number | null }[]; balance: number }
export function ClientLedger({ id }: { id: number }) {
  const { data, error, loading, reload } = useApi<Ledger>(`/clients/${id}/ledger`);
  const [edit, setEdit] = useState(false);
  if (error) return <ErrorBox text={error} retry={() => reload()} />;
  if (loading || !data) return <Loading rows={5} />;
  const c = data.client;
  return (
    <>
      <PageHead back={{ to: '/app/clients', label: 'Customers' }} title={c.name} sub={[c.pan && 'PAN ' + c.pan, c.phone, c.email].filter(Boolean).join(' · ') || undefined}
        actions={<>
          <Link to={`/app/bills/new?client=${c.id}`} className="btn-primary"><IcBill size={18} />New bill</Link>
          <button className="btn-quiet" onClick={() => download(`/clients/${c.id}/ledger?format=csv`, `${c.name.replace(/[^a-z0-9]+/gi, '-')}-statement.csv`).catch((e) => toast(errorText(e), 'err'))}><IcDownload size={18} />Statement CSV</button>
          <button className="btn-ghost" onClick={() => setEdit(true)}>Edit</button></>} />
      <div className="card p-5 mb-5 flex flex-wrap items-baseline gap-x-6 gap-y-1"><span className="text-muted">Balance owed to you</span><span className="text-[28px]"><span className={data.balance ? 'marker' : ''}><Money p={data.balance} /></span></span></div>
      {data.rows.length === 0 ? <Empty title="No bills yet" body="Issued bills and payments for this customer will show here with a running balance." /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-[14px] min-w-[560px]">
            <thead className="bg-tint/60 text-[13px] text-muted"><tr>
              <th scope="col" className="text-left font-medium px-4 py-2.5">Date (BS)</th><th scope="col" className="text-left font-medium px-4 py-2.5">Entry</th>
              <th scope="col" className="text-right font-medium px-4 py-2.5">Bill</th><th scope="col" className="text-right font-medium px-4 py-2.5">Paid</th><th scope="col" className="text-right font-medium px-4 py-2.5">Balance</th></tr></thead>
            <tbody className="divide-y divide-rule">
              {data.rows.map((r, i) => (
                <tr key={i}>
                  <td className="px-4 py-2.5 whitespace-nowrap">{bsPretty(r.date_bs)}<span className="block text-[12px] text-muted num">{r.date}</span></td>
                  <td className="px-4 py-2.5">{r.kind === 'bill' && r.invoice_id ? <Link to={`/app/bills/${r.invoice_id}`} className="num text-baltic hover:underline underline-offset-4">{r.ref}</Link> : <span className="text-ink-2">Payment · <span className="num">{r.ref}</span></span>}</td>
                  <td className="px-4 py-2.5 text-right">{r.debit ? <Money p={r.debit} /> : ''}</td>
                  <td className="px-4 py-2.5 text-right text-sage-deep">{r.credit ? <Money p={r.credit} /> : ''}</td>
                  <td className="px-4 py-2.5 text-right font-medium"><Money p={r.balance} /></td>
                </tr>))}
            </tbody>
          </table>
        </div>)}
      <Sheet open={edit} onClose={() => setEdit(false)} title="Edit customer"><ClientForm initial={c} onSaved={() => { setEdit(false); toast('Saved'); reload(true); }} /></Sheet>
    </>
  );
}
