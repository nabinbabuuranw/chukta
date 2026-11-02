import { useEffect, useState } from 'react';
import { api, errorText, ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { PageHead } from '../../components/AppShell';
import { Field, toast } from '../../components/ui';

export default function Settings() {
  const { business, refresh } = useAuth();
  const [f, setF] = useState({ name: '', pan: '', vat_registered: true, address: '', phone: '', email: '', prefix: '', payment_note: '', default_due_days: '15' });
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [field, setField] = useState<string | null>(null);
  useEffect(() => { if (business) setF({ name: business.name, pan: business.pan || '', vat_registered: !!business.vat_registered, address: business.address, phone: business.phone, email: business.email, prefix: business.prefix, payment_note: business.payment_note, default_due_days: String(business.default_due_days) }); }, [business]);
  const set = (k: keyof typeof f) => (e: any) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const bad = (k: string) => (field === k ? error : null);
  return (
    <>
      <PageHead title="Business settings" sub="What prints on your bills." />
      <form className="card p-5 sm:p-6 max-w-[760px] grid sm:grid-cols-2 gap-4" noValidate onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setError(null); setField(null);
        try { await api('/biz', { method: 'PUT', body: { ...f, default_due_days: Number(f.default_due_days) } }); await refresh(); toast('Saved'); }
        catch (er) { setError(errorText(er)); if (er instanceof ApiError) setField(er.field || null); } finally { setBusy(false); }
      }}>
        <Field className="sm:col-span-2" label="Business name" value={f.name} onChange={set('name')} error={bad('business_name')} />
        <label className="sm:col-span-2 flex items-center gap-3 cursor-pointer select-none"><input type="checkbox" className="size-5 accent-[#05668D]" checked={f.vat_registered} onChange={set('vat_registered')} />Registered for VAT (issues tax invoices with 13% VAT)</label>
        <Field label="PAN / VAT number" inputMode="numeric" maxLength={9} value={f.pan} onChange={set('pan')} error={bad('pan')} />
        <Field label="Bill number prefix" value={f.prefix} onChange={(e) => setF({ ...f, prefix: e.target.value.toUpperCase() })} error={bad('prefix')} hint={`Next bill looks like ${f.prefix || 'INV'}-2083/84-0001`} maxLength={6} />
        <Field className="sm:col-span-2" label="Address" value={f.address} onChange={set('address')} error={bad('address')} />
        <Field label="Phone" inputMode="tel" value={f.phone} onChange={set('phone')} error={bad('phone')} />
        <Field label="Email on bills" type="email" value={f.email} onChange={set('email')} error={bad('email')} />
        <Field label="Default days to pay" inputMode="numeric" value={f.default_due_days} onChange={set('default_due_days')} error={bad('default_due_days')} />
        <div className="sm:col-span-2"><label htmlFor="pn" className="label">How to pay you (printed on bills and reminders)</label>
          <textarea id="pn" rows={2} maxLength={400} className="field !h-auto py-2.5" value={f.payment_note} onChange={set('payment_note')} placeholder="e.g. eSewa 98XXXXXXXX · Bank: ABC Bank, A/C 0123…" /></div>
        {error && !field && <p role="alert" className="sm:col-span-2 text-overdue text-[14px]">{error}</p>}
        <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-rule">
          <p className="text-[13px] text-muted">Plan: <b className="text-ink">{business?.plan === 'pro' ? 'Pro' : 'Free'}</b>{business?.plan !== 'pro' && ' · Pro (Rs 799/month) is switched on by our team after an eSewa, Khalti or bank payment.'}</p>
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
        </div>
      </form>
    </>
  );
}
