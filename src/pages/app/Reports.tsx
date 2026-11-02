import { useState } from 'react';
import { download, errorText } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { PageHead } from '../../components/AppShell';
import { Loading, ErrorBox, Money, Empty, toast } from '../../components/ui';
import { IcDownload } from '../../components/Icons';
import { adIsoToBs, ktmTodayIso } from '../../../shared/money';
import { bsPretty, KIND_LABEL } from '../../lib/format';

const MON = ['Baishakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];
interface Rep { month: string; range: { start: string; end: string }; rows: any[]; totals: { taxable: number; nontaxable: number; vat: number; total: number } }
export default function Reports() {
  const cur = (adIsoToBs(ktmTodayIso()) || '2083-01').slice(0, 7);
  const [y, setY] = useState(Number(cur.slice(0, 4))); const [m, setM] = useState(Number(cur.slice(5, 7)));
  const month = `${y}-${String(m).padStart(2, '0')}`;
  const { data, error, loading, reload } = useApi<Rep>(`/reports/vat?month=${month}`);
  const step = (d: number) => { let mm = m + d, yy = y; if (mm < 1) { mm = 12; yy--; } if (mm > 12) { mm = 1; yy++; } setM(mm); setY(yy); };
  return (
    <>
      <PageHead title="VAT sales register" sub="Bills issued in a Nepali month. Voided bills are listed but not counted."
        actions={<button className="btn-quiet" onClick={() => download(`/reports/vat?month=${month}&format=csv`, `sales-register-${month}.csv`).catch((e) => toast(errorText(e), 'err'))}><IcDownload size={18} />Download CSV</button>} />
      <div className="flex items-center gap-2 mb-5">
        <button className="btn-quiet btn-sm !px-3" onClick={() => step(-1)} aria-label="Previous month">←</button>
        <p className="min-w-[170px] text-center font-medium" aria-live="polite">{MON[m - 1]} {y}</p>
        <button className="btn-quiet btn-sm !px-3" onClick={() => step(1)} aria-label="Next month" disabled={month >= cur}>→</button>
        {data && <span className="text-[13px] text-muted ml-2 hidden sm:inline num">{data.range.start} → {data.range.end}</span>}
      </div>
      {error ? <ErrorBox text={error} retry={() => reload()} /> : loading || !data ? <Loading rows={4} /> : <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {([['Taxable sales', data.totals.taxable], ['Non-taxable', data.totals.nontaxable], ['Output VAT 13%', data.totals.vat], ['Total billed', data.totals.total]] as const).map(([l, v], i) => (
            <div key={l} className="card p-4"><p className="text-[13px] text-muted">{l}</p><p className="text-[20px] mt-1">{i === 2 ? <span className="marker"><Money p={v} /></span> : <Money p={v} />}</p></div>))}
        </div>
        {data.rows.length === 0 ? <Empty title={`No bills in ${MON[m - 1]}`} body="Issued and voided bills dated in this month will be listed here." /> : (
          <div className="card overflow-x-auto">
            <table className="w-full text-[14px] min-w-[720px]">
              <thead className="bg-tint/60 text-[13px] text-muted"><tr>
                {['Date (BS)', 'Bill no.', 'Buyer', 'Buyer PAN', 'Type', 'Taxable', 'VAT', 'Total'].map((h, i) => <th key={h} scope="col" className={`font-medium px-3 py-2.5 ${i >= 5 ? 'text-right' : 'text-left'}`}>{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-rule">
                {data.rows.map((r) => (
                  <tr key={r.number} className={r.state === 'void' ? 'text-muted line-through' : ''}>
                    <td className="px-3 py-2.5 whitespace-nowrap">{bsPretty(r.issue_bs)}</td><td className="px-3 py-2.5 num">{r.number}</td><td className="px-3 py-2.5">{r.buyer}</td>
                    <td className="px-3 py-2.5 num">{r.buyer_pan || '—'}</td><td className="px-3 py-2.5 text-[13px]">{KIND_LABEL[r.kind]}</td>
                    <td className="px-3 py-2.5 text-right"><Money p={r.taxable} /></td><td className="px-3 py-2.5 text-right"><Money p={r.vat} /></td><td className="px-3 py-2.5 text-right"><Money p={r.total} /></td>
                  </tr>))}
              </tbody>
            </table>
          </div>)}
        <p className="text-[13px] text-muted mt-4">This register helps you and your accountant prepare the VAT return. It is not a filing with IRD.</p>
      </>}
    </>
  );
}
