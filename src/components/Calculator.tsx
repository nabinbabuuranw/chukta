// Live bill calculator on the homepage: same maths module the API uses.
import { useMemo, useState } from 'react';
import { computeTotals, amountInWords, parseNpr, adIsoToBs, ktmTodayIso, fiscalYear } from '../../shared/money';
import { bsPretty } from '../lib/format';
import { Money, Stamp } from './ui';

export function Calculator() {
  const [amount, setAmount] = useState('42,500');
  const [vat, setVat] = useState(true);
  const [paid, setPaid] = useState(false);
  const rate = parseNpr(amount);
  const t = useMemo(() => computeTotals([{ description: 'x', qty: 1, rate: rate ?? 0, taxable: true }], 0, vat), [rate, vat]);
  const today = ktmTodayIso();
  return (
    <div className="grid md:grid-cols-[1fr_1.15fr] gap-6 md:gap-10 items-start">
      <div className="space-y-5">
        <div>
          <label htmlFor="calc-amt" className="label">Amount before VAT (Rs)</label>
          <input id="calc-amt" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="field num !h-14 !text-[22px]" aria-invalid={rate === null ? true : undefined} aria-describedby="calc-help" />
          <p id="calc-help" className={`mt-1 text-[13px] ${rate === null ? 'text-overdue' : 'text-muted'}`}>{rate === null ? 'Type an amount like 42500 or 1,25,000.50' : 'Try a big one: 1,25,00,000'}</p>
        </div>
        <fieldset>
          <legend className="label">Your business is</legend>
          <div className="inline-flex p-1 rounded-full bg-tint border border-rule" role="radiogroup">
            {[[true, 'VAT registered'], [false, 'PAN only']].map(([v, l]) => (
              <button key={String(v)} role="radio" aria-checked={vat === v} onClick={() => setVat(v as boolean)} className={`h-9 px-4 rounded-full text-[14px] cursor-pointer transition-colors duration-150 ${vat === v ? 'bg-baltic text-sheet' : 'text-ink-2 hover:text-ink'}`}>{l as string}</button>
            ))}
          </div>
        </fieldset>
        <label className="flex items-center gap-3 cursor-pointer select-none w-fit">
          <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="size-5 accent-[#679436] cursor-pointer" />
          <span>Customer has paid it all</span>
        </label>
      </div>
      <div className="carbon rounded-card" aria-live="polite">
        <div className="card shadow-card p-5 sm:p-6 relative overflow-hidden">
          <div className="flex justify-between items-start gap-3 mb-4">
            <div><p className="eyebrow">{vat ? 'Tax invoice' : 'PAN bill'} · sample</p><p className="num text-[13px] text-muted mt-1">INV-{fiscalYear(today)}-0042</p></div>
            <div className="text-right text-[13px]"><p className="font-medium">{bsPretty(adIsoToBs(today))} BS</p><p className="text-muted num">{today} AD</p></div>
          </div>
          <div className="perf mb-4" />
          <dl className="space-y-2.5 text-[15px]">
            <div className="flex justify-between"><dt className="text-muted">Taxable amount</dt><dd><Money p={t.taxable + t.nontaxable} /></dd></div>
            <div className="flex justify-between"><dt className="text-muted">VAT {vat ? '13%' : '(not registered)'}</dt><dd><Money p={t.vat} /></dd></div>
            <div className="flex justify-between items-baseline pt-3 border-t border-rule"><dt className="font-semibold">Total</dt><dd className="text-[24px] font-medium"><span className="marker"><Money p={t.total} /></span></dd></div>
          </dl>
          <p className="mt-4 text-[13px] text-ink-2 leading-snug min-h-[2.6em]">{rate !== null ? amountInWords(t.total) : '—'}</p>
          {paid && rate ? <div className="absolute right-3 top-2 pointer-events-none"><Stamp size={104} /></div> : null}
        </div>
      </div>
    </div>
  );
}
