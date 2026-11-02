import { Link } from '../../lib/router';
import { useApi } from '../../lib/useApi';
import { PageHead } from '../../components/AppShell';
import { Loading, ErrorBox, StatusChip, Money, Empty } from '../../components/ui';
import { bsPretty, rsShort } from '../../lib/format';
import { IcPlus } from '../../components/Icons';
import type { Invoice } from '../../lib/api';

interface Summary { today: string; today_bs: string; month_bs: string; receivable: number; overdue: number; aging: number[]; billed_month: number; collected_month: number; vat_month: number; attention: Invoice[]; clients: number; drafts: number; bills_last_30d: number; plan: string }
const MON = ['Baishakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];
export default function Overview() {
  const { data: s, error, loading, reload } = useApi<Summary>('/summary');
  if (error) return <ErrorBox text={error} retry={() => reload()} />;
  if (loading || !s) return <><div className="skel h-10 w-64 mb-6" /><div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">{[0, 1, 2, 3].map((i) => <div key={i} className="skel h-28" />)}</div><Loading rows={3} /></>;
  const month = MON[Number(s.month_bs.slice(5, 7)) - 1] + ' ' + s.month_bs.slice(0, 4);
  const agingTotal = s.aging.reduce((a, b) => a + b, 0);
  const pct = s.billed_month ? Math.min(100, Math.round((s.collected_month / s.billed_month) * 100)) : 0;
  const tiles: [string, number, string, string][] = [
    ['Still to collect', s.receivable, 'all open bills', 'text-ink'], ['Overdue', s.overdue, 'past the due date', s.overdue ? 'text-overdue' : 'text-ink'],
    [`Billed in ${MON[Number(s.month_bs.slice(5, 7)) - 1]}`, s.billed_month, 'incl. VAT', 'text-ink'], [`VAT in ${MON[Number(s.month_bs.slice(5, 7)) - 1]}`, s.vat_month, 'output VAT on bills', 'text-ink'],
  ];
  return (
    <>
      <PageHead title="Today's dues" sub={<>{bsPretty(s.today_bs)} BS · {s.today}</>} actions={<Link to="/app/bills/new" className="btn-primary md:hidden"><IcPlus size={18} />New bill</Link>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {tiles.map(([l, v, h, c], i) => (
          <div key={l} className="card p-4 rise" style={{ animationDelay: i * 50 + 'ms' }}>
            <p className="text-[13px] text-muted">{l}</p>
            <p className={`mt-1.5 text-[22px] md:text-[26px] ${c}`}>{i === 0 ? <span className="marker num">{rsShort(v)}</span> : <span className="num">{rsShort(v)}</span>}</p>
            <p className="text-[12px] text-muted mt-0.5">{h}</p>
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-[1.25fr_1fr] gap-4 mb-8">
        <section className="card p-5" aria-labelledby="ag-h">
          <div className="flex items-baseline justify-between mb-4"><h2 id="ag-h" className="text-[20px]">How late is the money?</h2><span className="text-[13px] text-muted">overdue only</span></div>
          {agingTotal === 0 ? <p className="text-muted">Nothing is overdue. Nice.</p> : <>
            <div className="flex h-4 rounded-full overflow-hidden bg-tint grow-x" role="img" aria-label={`Overdue by age: ${s.aging.map((a, i) => ['1-30', '31-60', '61-90', '90+'][i] + ' days ' + rsShort(a)).join(', ')}`}>
              {s.aging.map((a, i) => a > 0 && <div key={i} style={{ width: (a / agingTotal) * 100 + '%', background: ['#A5BE00', '#427AA1', '#05668D', '#A63D2A'][i] }} />)}
            </div>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {s.aging.map((a, i) => <div key={i}><dt className="flex items-center gap-1.5 text-[13px] text-muted"><span className="size-2.5 rounded-sm" style={{ background: ['#A5BE00', '#427AA1', '#05668D', '#A63D2A'][i] }} />{['1–30', '31–60', '61–90', '90+'][i]} days</dt><dd className="num mt-0.5">{rsShort(a)}</dd></div>)}
            </dl></>}
        </section>
        <section className="card p-5" aria-labelledby="col-h">
          <div className="flex items-baseline justify-between mb-4"><h2 id="col-h" className="text-[20px]">Collected in {month}</h2></div>
          <p className="text-[26px]"><Money p={s.collected_month} /></p>
          <div className="mt-3 h-2 rounded-full bg-tint overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Collected compared with billed this month"><div className="h-full bg-sage rounded-full grow-x" style={{ width: pct + '%' }} /></div>
          <p className="text-[13px] text-muted mt-2">{s.billed_month ? `${pct}% of ${rsShort(s.billed_month)} billed this month` : 'No bills issued this month yet.'}</p>
          <p className="text-[13px] text-muted mt-3">{s.clients} customers · {s.drafts} drafts · {s.bills_last_30d} bills in 30 days{s.plan === 'free' ? ' (Free: 30)' : ''}</p>
        </section>
      </div>
      <section aria-labelledby="att-h">
        <div className="flex items-baseline justify-between mb-3"><h2 id="att-h" className="text-[22px]">Needs a nudge</h2><Link to="/app/bills?status=open" className="text-[14px] text-baltic hover:underline underline-offset-4">All open bills</Link></div>
        {s.attention.length === 0 ? <Empty title="No open bills" body="Bills you issue show up here until the last rupee is paid." action={<Link to="/app/bills/new" className="btn-primary">Make a bill</Link>} /> : (
          <ul className="card divide-y divide-rule overflow-hidden">
            {s.attention.map((b) => (
              <li key={b.id}><Link to={`/app/bills/${b.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-tint/60 transition-colors">
                <div className="min-w-0 flex-1"><p className="font-medium truncate">{b.client_name}</p><p className="text-[13px] text-muted num truncate">{b.number} · due {bsPretty(b.due_bs)}</p></div>
                <div className="text-right"><Money p={b.balance} className="block" /><StatusChip status={b.status} days={b.days_overdue} /></div>
              </Link></li>
            ))}
          </ul>)}
      </section>
    </>
  );
}
