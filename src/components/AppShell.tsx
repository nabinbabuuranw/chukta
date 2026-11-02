import { useEffect, type ReactNode } from 'react';
import { Link, navigate, useLocation } from '../lib/router';
import { useAuth } from '../lib/auth';
import { Logo } from './Logo';
import { IcHome, IcBill, IcPeople, IcChart, IcCog, IcPlus, IcLogout } from './Icons';

const TABS = [['/app', 'Home', IcHome], ['/app/bills', 'Bills', IcBill], ['/app/clients', 'Customers', IcPeople], ['/app/reports', 'VAT register', IcChart], ['/app/settings', 'Settings', IcCog]] as const;
export function AppShell({ children }: { children: ReactNode }) {
  const { user, business, logout, loading } = useAuth(); const { path } = useLocation();
  useEffect(() => { if (!loading && (!user || user.role !== 'owner')) navigate(user ? '/' : '/login', { replace: true }); }, [user, loading]);
  if (loading || !user || user.role !== 'owner') return <div className="min-h-screen grid place-items-center text-muted" role="status">Loading…</div>;
  const active = (to: string) => (to === '/app' ? path === '/app' : path.startsWith(to));
  return (
    <div className="min-h-screen pb-24 md:pb-10">
      <header className="no-print bg-sheet border-b border-rule sticky top-0 z-30">
        <div className="wrap h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/app" aria-label="Chukta home" className="shrink-0"><Logo compact /></Link>
            <div className="min-w-0 leading-tight">
              <p className="font-medium truncate max-w-[52vw] md:max-w-[360px]">{business?.name}</p>
              <p className="text-[12px] text-muted truncate">{business?.vat_registered ? `VAT · PAN ${business?.pan}` : business?.pan ? `PAN ${business.pan}` : 'PAN bills'}{business?.is_demo ? ' · demo data' : ''}{business?.plan === 'pro' ? ' · Pro' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Link to="/app/bills/new" className="hidden md:inline-flex btn-primary btn-sm"><IcPlus size={18} />New bill</Link>
            <Link to="/app/settings" className="md:hidden btn-ghost btn-sm !px-2" aria-label="Settings"><IcCog /></Link>
            <button className="btn-ghost btn-sm !px-2.5" onClick={async () => { await logout(); navigate('/'); }} aria-label="Sign out" title="Sign out"><IcLogout /></button>
          </div>
        </div>
        <nav aria-label="Sections" className="hidden md:block border-t border-rule/70">
          <ul className="wrap flex gap-1 h-12 items-center">
            {TABS.map(([to, label, Ic]) => (
              <li key={to}><Link to={to} aria-current={active(to) ? 'page' : undefined} className={`inline-flex items-center gap-2 h-9 px-3.5 rounded-full text-[14px] transition-colors duration-150 ${active(to) ? 'tab-on' : 'text-ink-2 hover:bg-tint'}`}><Ic size={17} />{label}</Link></li>
            ))}
          </ul>
        </nav>
      </header>
      {business?.status === 'suspended' && <div role="alert" className="bg-overdue-soft text-overdue text-center py-2 text-[14px]">This business is suspended. You can read your data but not change it.</div>}
      <main id="main" key={path} className="wrap pt-6 md:pt-8 page-in">{children}</main>
      <nav aria-label="Sections" className="md:hidden no-print fixed bottom-0 inset-x-0 z-30 bg-sheet/97 backdrop-blur border-t border-rule pb-[env(safe-area-inset-bottom)]">
        <ul className="grid grid-cols-5 h-16 items-center">
          {TABS.slice(0, 2).map(([to, label, Ic]) => <BottomTab key={to} to={to} label={label} Ic={Ic} on={active(to)} />)}
          <li className="grid place-items-center"><Link to="/app/bills/new" aria-label="New bill" className="size-[52px] -mt-6 rounded-full bg-baltic text-sheet grid place-items-center shadow-pop border-4 border-mist active:scale-95 transition-transform"><IcPlus size={24} /></Link></li>
          {TABS.slice(2, 4).map(([to, label, Ic]) => <BottomTab key={to} to={to} label={label === 'VAT register' ? 'VAT' : label} Ic={Ic} on={active(to)} />)}
        </ul>
      </nav>
    </div>
  );
}
function BottomTab({ to, label, Ic, on }: { to: string; label: string; Ic: any; on: boolean }) {
  return (
    <li><Link to={to} aria-current={on ? 'page' : undefined} className={`flex flex-col items-center gap-0.5 py-1.5 text-[11px] ${on ? 'text-baltic font-semibold' : 'text-muted'}`}>
      <span className={`grid place-items-center h-7 w-12 rounded-full transition-colors ${on ? 'bg-baltic-soft' : ''}`}><Ic size={20} /></span>{label}</Link></li>
  );
}
export function PageHead({ title, sub, actions, back }: { title: string; sub?: ReactNode; actions?: ReactNode; back?: { to: string; label: string } }) {
  return (
    <div className="mb-6">
      {back && <Link to={back.to} className="inline-flex items-center gap-1.5 text-[14px] text-baltic mb-2 hover:underline underline-offset-4">← {back.label}</Link>}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0"><h1 className="text-[28px] md:text-[34px]">{title}</h1>{sub && <div className="text-muted mt-1">{sub}</div>}</div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
