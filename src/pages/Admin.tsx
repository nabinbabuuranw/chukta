import { useEffect, useState } from 'react';
import { Link, navigate } from '../lib/router';
import { api, errorText } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useApi } from '../lib/useApi';
import { Logo } from '../components/Logo';
import { Loading, ErrorBox, toast } from '../components/ui';
import { IcLogout } from '../components/Icons';

const TABS = [['businesses', 'Businesses'], ['users', 'Users'], ['audit', 'Audit trail']] as const;
export default function Admin({ tab = 'businesses' }: { tab?: string }) {
  const { user, loading: al, logout } = useAuth();
  useEffect(() => { if (!al && (!user || user.role !== 'admin')) navigate(user ? '/' : '/login', { replace: true }); }, [user, al]);
  const ok = user?.role === 'admin';
  const ov = useApi<any>(ok ? '/admin/overview' : null);
  const list = useApi<{ items: any[] }>(ok ? `/admin/${tab}` : null);
  const [busy, setBusy] = useState<number | null>(null);
  if (al || !ok) return <div className="min-h-screen grid place-items-center text-muted" role="status">Loading…</div>;
  const act = async (id: number, path: string, body: any, msg: string) => { setBusy(id); try { await api(path, { method: 'PUT', body }); toast(msg); list.reload(true); ov.reload(true); } catch (e) { toast(errorText(e), 'err'); } finally { setBusy(null); } };
  return (
    <div className="min-h-screen">
      <header className="bg-ink text-sheet"><div className="wrap h-14 flex items-center justify-between"><span className="flex items-center gap-2"><Logo compact /><span className="display text-[18px]">Chukta admin</span></span>
        <button className="btn-ghost btn-sm !text-sheet hover:!bg-white/10" onClick={async () => { await logout(); navigate('/'); }}><IcLogout size={18} />Sign out</button></div></header>
      <main id="main" className="wrap py-7">
        {ov.error ? <ErrorBox text={ov.error} /> : <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-7">
          {[['Users', 'users'], ['Owners', 'owners'], ['Customers', 'customers'], ['Businesses', 'businesses'], ['Suspended', 'suspended'], ['Issued bills', 'bills'], ['Payments', 'payments']].map(([l, k]) => (
            <div key={k} className="card p-3.5"><p className="text-[12px] text-muted">{l}</p><p className="num text-[22px] mt-1">{ov.data ? ov.data[k] : '·'}</p></div>))}
        </div>}
        <nav aria-label="Admin sections" className="flex gap-1.5 mb-4">
          {TABS.map(([k, l]) => <Link key={k} to={k === 'businesses' ? '/admin' : `/admin/${k}`} aria-current={tab === k ? 'page' : undefined} className={`h-9 px-4 inline-flex items-center rounded-full text-[14px] border ${tab === k ? 'bg-baltic text-sheet border-baltic' : 'bg-sheet border-rule text-ink-2 hover:border-rule-2'}`}>{l}</Link>)}
        </nav>
        {list.error ? <ErrorBox text={list.error} retry={() => list.reload()} /> : list.loading || !list.data ? <Loading rows={5} /> : (
          <div className="card overflow-x-auto">
            {tab === 'businesses' && <table className="w-full text-[14px] min-w-[760px]"><thead className="bg-tint/60 text-[13px] text-muted text-left"><tr>{['Business', 'Owner', 'PAN', 'Customers', 'Bills', 'Plan', 'Status', ''].map((h) => <th key={h} scope="col" className="font-medium px-3 py-2.5">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-rule">{list.data.items.map((b) => <tr key={b.id}>
                <td className="px-3 py-2.5 font-medium">{b.name}{b.is_demo ? <span className="ml-2 text-[11px] text-partial">DEMO</span> : null}</td><td className="px-3 py-2.5 num text-[13px]">{b.owner_email}</td><td className="px-3 py-2.5 num">{b.pan || '—'}</td>
                <td className="px-3 py-2.5 num">{b.clients}</td><td className="px-3 py-2.5 num">{b.bills}</td>
                <td className="px-3 py-2.5"><button className="btn-quiet btn-sm" disabled={busy === b.id} onClick={() => act(b.id, `/admin/businesses/${b.id}`, { plan: b.plan === 'pro' ? 'free' : 'pro' }, 'Plan changed')}>{b.plan === 'pro' ? 'Pro → Free' : 'Free → Pro'}</button></td>
                <td className="px-3 py-2.5">{b.status === 'suspended' ? <span className="text-overdue">Suspended</span> : 'Active'}</td>
                <td className="px-3 py-2.5"><button className={b.status === 'suspended' ? 'btn-quiet btn-sm' : 'btn-danger btn-sm'} disabled={busy === b.id} onClick={() => act(b.id, `/admin/businesses/${b.id}`, { status: b.status === 'suspended' ? 'active' : 'suspended' }, 'Status changed')}>{b.status === 'suspended' ? 'Restore' : 'Suspend'}</button></td></tr>)}</tbody></table>}
            {tab === 'users' && <table className="w-full text-[14px] min-w-[620px]"><thead className="bg-tint/60 text-[13px] text-muted text-left"><tr>{['Name', 'Email', 'Role', 'Joined', ''].map((h) => <th key={h} scope="col" className="font-medium px-3 py-2.5">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-rule">{list.data.items.map((u) => <tr key={u.id} className={u.disabled ? 'text-muted' : ''}>
                <td className="px-3 py-2.5">{u.name}</td><td className="px-3 py-2.5 num text-[13px]">{u.email}</td><td className="px-3 py-2.5">{u.role}</td><td className="px-3 py-2.5 num text-[13px]">{new Date(u.created_at).toISOString().slice(0, 10)}</td>
                <td className="px-3 py-2.5">{u.role !== 'admin' && <button className={u.disabled ? 'btn-quiet btn-sm' : 'btn-danger btn-sm'} disabled={busy === u.id} onClick={() => act(u.id, `/admin/users/${u.id}`, { disabled: !u.disabled }, u.disabled ? 'Enabled' : 'Disabled')}>{u.disabled ? 'Enable' : 'Disable'}</button>}</td></tr>)}</tbody></table>}
            {tab === 'audit' && <ol className="divide-y divide-rule">{list.data.items.map((a) => <li key={a.id} className="px-4 py-3 text-[14px] flex flex-wrap gap-x-3"><span className="num text-[12px] text-muted w-36">{new Date(a.created_at).toISOString().replace('T', ' ').slice(0, 16)}</span><span className="font-medium">{a.action}</span><span className="num text-ink-2">{a.target}</span><span className="text-muted">{a.actor_email || 'system'}</span>{a.detail && <span className="text-ink-2 w-full sm:w-auto">· {a.detail}</span>}</li>)}</ol>}
          </div>)}
      </main>
    </div>
  );
}
