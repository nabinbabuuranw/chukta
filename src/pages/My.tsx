import { useEffect } from 'react';
import { Link, navigate } from '../lib/router';
import { useAuth } from '../lib/auth';
import { useApi } from '../lib/useApi';
import { Logo } from '../components/Logo';
import { Loading, ErrorBox, Money, StatusChip, Empty } from '../components/ui';
import { IcLogout } from '../components/Icons';
import { bsPretty } from '../lib/format';

interface Bill { id: number; number: string; business_name: string; issue_date: string; issue_bs: string; due_date: string; total: number; paid: number; balance: number; status: string; token: string }
export default function My() {
  const { user, loading: authLoading, logout } = useAuth();
  useEffect(() => { if (!authLoading && (!user || user.role !== 'customer')) navigate(user ? '/' : '/login', { replace: true }); }, [user, authLoading]);
  const { data, error, loading, reload } = useApi<{ items: Bill[]; outstanding: number }>(user?.role === 'customer' ? '/my/bills' : null);
  if (authLoading || !user || user.role !== 'customer') return <div className="min-h-screen grid place-items-center text-muted" role="status">Loading…</div>;
  const byBiz = new Map<string, Bill[]>(); (data?.items || []).forEach((b) => byBiz.set(b.business_name, [...(byBiz.get(b.business_name) || []), b]));
  return (
    <div className="min-h-screen">
      <header className="bg-sheet border-b border-rule"><div className="wrap h-14 flex items-center justify-between"><Link to="/"><Logo /></Link>
        <button className="btn-ghost btn-sm" onClick={async () => { await logout(); navigate('/'); }}><IcLogout size={18} />Sign out</button></div></header>
      <main id="main" className="wrap max-w-[860px] py-8">
        <h1 className="text-[30px] md:text-[36px]">Namaste, {user.name.split(' ')[0]}</h1>
        <p className="text-muted mt-1">Bills sent to <span className="num">{user.email}</span> by businesses that use Chukta.</p>
        {error ? <div className="mt-6"><ErrorBox text={error} retry={() => reload()} /></div> : loading || !data ? <div className="mt-6"><Loading rows={4} /></div> : <>
          <div className="card carbon p-5 mt-6 flex flex-wrap items-baseline justify-between gap-2"><span className="text-muted">You still owe in total</span><span className="text-[28px]"><span className={data.outstanding ? 'marker' : ''}><Money p={data.outstanding} /></span></span></div>
          {data.items.length === 0 ? <div className="mt-6"><Empty title="No bills here yet" body="When a business adds this email to your customer record in Chukta, their bills appear here automatically." /></div> :
            [...byBiz.entries()].map(([biz, bills]) => (
              <section key={biz} className="mt-8" aria-label={biz}>
                <h2 className="text-[20px] mb-3">{biz}</h2>
                <ul className="card divide-y divide-rule overflow-hidden">
                  {bills.map((b) => (
                    <li key={b.id}><Link to={`/i/${b.token}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-tint/60 transition-colors">
                      <div className="flex-1 min-w-0"><p className="num">{b.number}</p><p className="text-[13px] text-muted">{bsPretty(b.issue_bs)} · total <Money p={b.total} /></p></div>
                      <div className="text-right">{b.balance ? <Money p={b.balance} className="block" /> : null}<StatusChip status={b.status} /></div>
                    </Link></li>))}
                </ul>
              </section>))}
        </>}
      </main>
    </div>
  );
}
