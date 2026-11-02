import { useState } from 'react';
import { Link, navigate, useLocation } from '../../lib/router';
import { useApi } from '../../lib/useApi';
import { PageHead } from '../../components/AppShell';
import { Loading, ErrorBox, StatusChip, Money, Empty } from '../../components/ui';
import { IcPlus, IcSearch } from '../../components/Icons';
import { bsPretty, KIND_LABEL } from '../../lib/format';
import type { Invoice } from '../../lib/api';

const FILTERS = [['', 'All'], ['open', 'Open'], ['overdue', 'Overdue'], ['paid', 'Chukta'], ['draft', 'Drafts'], ['void', 'Void']] as const;
export default function Bills() {
  const { search } = useLocation(); const sp = new URLSearchParams(search);
  const status = sp.get('status') || ''; const [q, setQ] = useState(sp.get('q') || '');
  const { data, error, loading, reload } = useApi<{ items: Invoice[] }>(`/invoices?status=${status}&q=${encodeURIComponent(sp.get('q') || '')}`);
  const go = (st: string, qq = q) => navigate(`/app/bills?status=${st}${qq ? '&q=' + encodeURIComponent(qq) : ''}`, { replace: true });
  return (
    <>
      <PageHead title="Bills" actions={<Link to="/app/bills/new" className="btn-primary"><IcPlus size={18} />New bill</Link>} />
      <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between mb-4">
        <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-1" role="tablist" aria-label="Filter bills">
          {FILTERS.map(([v, l]) => <button key={v} role="tab" aria-selected={status === v} onClick={() => go(v)} className={`h-9 px-3.5 rounded-full text-[14px] whitespace-nowrap border cursor-pointer transition-colors duration-150 ${status === v ? 'bg-ink text-sheet border-ink' : 'bg-sheet border-rule text-ink-2 hover:border-rule-2'}`}>{l}</button>)}
        </div>
        <form role="search" onSubmit={(e) => { e.preventDefault(); go(status); }} className="relative md:w-72">
          <label htmlFor="bq" className="sr-only">Search bills</label>
          <IcSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input id="bq" className="field !pl-10" placeholder="Customer or bill no." value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
      </div>
      {error ? <ErrorBox text={error} retry={() => reload()} /> : loading || !data ? <Loading rows={6} /> : data.items.length === 0 ? (
        <Empty title={status || sp.get('q') ? 'Nothing matches' : 'No bills yet'} body={status || sp.get('q') ? 'Try another filter or search.' : 'Your first bill takes about a minute. Add a customer and the items, and Chukta does the VAT.'} action={<Link to="/app/bills/new" className="btn-primary">Make a bill</Link>} />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-[15px]">
            <thead className="bg-tint/60 text-[13px] text-muted text-left"><tr>
              <th scope="col" className="font-medium px-4 py-2.5">Customer</th><th scope="col" className="font-medium px-4 py-2.5 hidden md:table-cell">Bill no.</th>
              <th scope="col" className="font-medium px-4 py-2.5 hidden lg:table-cell">Date (BS)</th><th scope="col" className="font-medium px-4 py-2.5 hidden sm:table-cell">Status</th>
              <th scope="col" className="font-medium px-4 py-2.5 text-right">Total</th><th scope="col" className="font-medium px-4 py-2.5 text-right hidden sm:table-cell">Balance</th></tr></thead>
            <tbody className="divide-y divide-rule">
              {data.items.map((b) => (
                <tr key={b.id} className="hover:bg-tint/50 cursor-pointer transition-colors" onClick={() => navigate(`/app/bills/${b.id}`)}>
                  <td className="px-4 py-3"><Link to={`/app/bills/${b.id}`} className="font-medium hover:underline underline-offset-4" onClick={(e) => e.stopPropagation()}>{b.client_name}</Link><p className="text-[12px] text-muted md:hidden num">{b.number || 'Draft'} · {KIND_LABEL[b.kind]}</p><span className="sm:hidden mt-1 inline-block"><StatusChip status={b.status} days={b.days_overdue} /></span></td>
                  <td className="px-4 py-3 hidden md:table-cell num text-[14px]">{b.number || <span className="text-muted">—</span>}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-ink-2">{bsPretty(b.issue_bs)}</td>
                  <td className="px-4 py-3 hidden sm:table-cell"><StatusChip status={b.status} days={b.days_overdue} /></td>
                  <td className="px-4 py-3 text-right"><Money p={b.total} /></td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">{b.balance ? <Money p={b.balance} /> : <span className="text-muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
