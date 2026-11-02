import type { Invoice } from '../lib/api';
import { Money, Stamp } from './ui';
import { bsPretty, KIND_LABEL } from '../lib/format';
import { amountInWords } from '../../shared/money';

export interface DocBiz { name: string; pan: string | null; vat_registered: number; address: string; phone: string; email: string; payment_note: string; is_demo: number }
export function BillDocument({ inv, biz }: { inv: Invoice; biz: DocBiz }) {
  const vat = inv.kind !== 'pan_bill';
  return (
    <article className="carbon rounded-card print-sheet" aria-label={`Bill ${inv.number || 'draft'}`}>
      <div className="card shadow-card print-sheet p-5 sm:p-8 relative overflow-hidden">
        {inv.state === 'draft' && <p className="absolute top-4 right-4 eyebrow !text-partial">Draft · not issued</p>}
        {inv.state === 'void' && <p className="absolute top-4 right-4 eyebrow !text-overdue">Void</p>}
        <header className="flex flex-col sm:flex-row sm:justify-between gap-4">
          <div>
            <p className="display text-[22px]">{biz.name}</p>
            <p className="text-[13px] text-ink-2 mt-1 whitespace-pre-line">{[biz.address, biz.phone, biz.email].filter(Boolean).join(' · ')}</p>
            {biz.pan && <p className="text-[13px] mt-1">{biz.vat_registered ? 'VAT/PAN' : 'PAN'}: <span className="num">{biz.pan}</span></p>}
          </div>
          <div className="sm:text-right">
            <p className="eyebrow">{KIND_LABEL[inv.kind]}</p>
            <p className="num text-[16px] mt-1">{inv.number || '—'}</p>
            <p className="text-[13px] mt-1">Date: {bsPretty(inv.issue_bs)} BS <span className="text-muted num">({inv.issue_date})</span></p>
            <p className="text-[13px]">Due: {bsPretty(inv.due_bs)} BS <span className="text-muted num">({inv.due_date})</span></p>
          </div>
        </header>
        <div className="perf my-5" />
        <section className="text-[14px] flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow mb-1">Billed to</p>
            <p className="font-medium text-[16px]">{inv.client_name}</p>
            {inv.client_address && <p className="text-ink-2">{inv.client_address}</p>}
            {inv.client_pan && <p>Buyer PAN: <span className="num">{inv.client_pan}</span></p>}
          </div>
          {inv.state === 'issued' && inv.balance === 0 && <Stamp size={96} className="shrink-0 -my-2 opacity-90" />}
        </section>
        <table className="w-full mt-5 text-[14px]">
          <thead className="text-[12px] text-muted border-b border-rule"><tr>
            <th scope="col" className="text-left font-medium py-2 w-8">#</th><th scope="col" className="text-left font-medium py-2">Item</th>
            <th scope="col" className="text-right font-medium py-2">Qty</th><th scope="col" className="text-right font-medium py-2 hidden sm:table-cell">Rate</th><th scope="col" className="text-right font-medium py-2">Amount</th></tr></thead>
          <tbody className="divide-y divide-rule/70">
            {inv.items.map((it, i) => (
              <tr key={i}><td className="py-2.5 text-muted num">{i + 1}</td>
                <td className="py-2.5">{it.description}{vat && !it.taxable && <span className="text-[12px] text-muted"> (non-taxable)</span>}<span className="sm:hidden block text-[12px] text-muted num">{it.qty} × {(it.rate / 100).toFixed(2)}</span></td>
                <td className="py-2.5 text-right num">{it.qty}{it.unit ? ' ' + it.unit : ''}</td>
                <td className="py-2.5 text-right hidden sm:table-cell"><Money p={it.rate} /></td>
                <td className="py-2.5 text-right"><Money p={Math.round(it.qty * it.rate)} /></td></tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 flex flex-col sm:flex-row-reverse gap-5 justify-between">
          <dl className="sm:w-72 space-y-1.5 text-[14px]">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd><Money p={inv.subtotal} /></dd></div>
            {inv.discount > 0 && <div className="flex justify-between"><dt className="text-muted">Discount</dt><dd>−<Money p={inv.discount} /></dd></div>}
            {vat && <><div className="flex justify-between"><dt className="text-muted">Taxable amount</dt><dd><Money p={inv.taxable} /></dd></div>
              {inv.nontaxable > 0 && <div className="flex justify-between"><dt className="text-muted">Non-taxable</dt><dd><Money p={inv.nontaxable} /></dd></div>}
              <div className="flex justify-between"><dt className="text-muted">VAT 13%</dt><dd><Money p={inv.vat} /></dd></div></>}
            <div className="flex justify-between items-baseline border-t border-rule pt-2"><dt className="font-semibold">Total</dt><dd className="text-[20px]"><Money p={inv.total} /></dd></div>
            {inv.state === 'issued' && inv.paid > 0 && <><div className="flex justify-between"><dt className="text-muted">Paid</dt><dd><Money p={inv.paid} /></dd></div>
              <div className="flex justify-between font-medium"><dt>Balance due</dt><dd><span className={inv.balance ? 'marker' : ''}><Money p={inv.balance} /></span></dd></div></>}
          </dl>
          <div className="text-[13px] text-ink-2 sm:max-w-[300px] space-y-2">
            <p><span className="text-muted">In words:</span> {amountInWords(inv.total)}</p>
            {inv.notes && <p>{inv.notes}</p>}
            {biz.payment_note && <p><span className="text-muted">Payment:</span> {biz.payment_note}</p>}
          </div>
        </div>
        <footer className="mt-6 pt-3 border-t border-dashed border-rule-2 text-[11px] text-muted leading-relaxed">
          Prepared with Chukta. Chukta is not IRD-certified billing software and is not connected to CBMS.{biz.is_demo ? ' DEMO BILL: sample data, not a real transaction.' : ''}
          {inv.state === 'void' && inv.void_reason ? ` Voided: ${inv.void_reason}.` : ''}
        </footer>
      </div>
    </article>
  );
}
