import { useApi } from '../lib/useApi';
import { Link } from '../lib/router';
import { BillDocument, type DocBiz } from '../components/BillDocument';
import { Loading, ErrorBox, StatusChip } from '../components/ui';
import { Logo } from '../components/Logo';
import { IcPrint } from '../components/Icons';
import type { Invoice } from '../lib/api';

export default function PublicBill({ token }: { token: string }) {
  const { data, error, loading } = useApi<{ invoice: Invoice; business: DocBiz; words: string }>(`/public/invoice/${token}`);
  return (
    <div className="min-h-screen">
      <header className="no-print wrap max-w-[900px] h-16 flex items-center justify-between"><Link to="/" aria-label="Chukta"><Logo /></Link>
        <button className="btn-quiet btn-sm" onClick={() => window.print()}><IcPrint size={18} />Print / PDF</button></header>
      <main id="main" className="wrap max-w-[900px] pb-16">
        {error ? <ErrorBox text={error === 'We could not find that.' ? 'This bill link is not valid. Ask the business to send it again.' : error} /> : loading || !data ? <Loading rows={6} /> : <>
          <div className="no-print flex items-center gap-2 mb-4"><StatusChip status={data.invoice.status} days={data.invoice.days_overdue} />{data.invoice.status !== 'paid' && data.invoice.state === 'issued' && <span className="text-[14px] text-muted">Please pay {data.business.name} directly{data.business.payment_note ? ' as shown on the bill' : ''}.</span>}</div>
          <BillDocument inv={data.invoice} biz={data.business} />
        </>}
      </main>
    </div>
  );
}
