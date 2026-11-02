import { lazy, Suspense, useEffect } from 'react';
import { useLocation } from './lib/router';
import { Toasts } from './components/ui';
import Home from './pages/Home';
import { NotFound } from './pages/NotFound';

const Login = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Auth').then((m) => ({ default: m.Register })));
const Terms = lazy(() => import('./pages/Legal').then((m) => ({ default: m.Terms })));
const Privacy = lazy(() => import('./pages/Legal').then((m) => ({ default: m.Privacy })));
const OwnerApp = lazy(() => import('./pages/app/OwnerApp'));
const My = lazy(() => import('./pages/My'));
const Admin = lazy(() => import('./pages/Admin'));
const PublicBill = lazy(() => import('./pages/PublicBill'));

const TITLES: [RegExp, string][] = [[/^\/login/, 'Sign in'], [/^\/register/, 'Create account'], [/^\/app\/bills/, 'Bills'], [/^\/app\/clients/, 'Customers'], [/^\/app\/reports/, 'VAT register'], [/^\/app\/settings/, 'Settings'], [/^\/app/, 'Today'], [/^\/my/, 'My bills'], [/^\/admin/, 'Admin'], [/^\/terms/, 'Terms'], [/^\/privacy/, 'Privacy'], [/^\/i\//, 'Bill']];
export default function App() {
  const { path } = useLocation();
  useEffect(() => { const t = TITLES.find(([r]) => r.test(path)); document.title = t ? `${t[1]} · Chukta` : 'Chukta · VAT bills and dues for Nepali businesses'; }, [path]);
  let page;
  if (path === '/') page = <Home />;
  else if (path === '/login') page = <Login />;
  else if (path === '/register') page = <Register />;
  else if (path === '/terms') page = <Terms />;
  else if (path === '/privacy') page = <Privacy />;
  else if (path === '/my') page = <My />;
  else if (path === '/admin' || /^\/admin\/(users|audit)$/.test(path)) page = <Admin tab={path.split('/')[2] || 'businesses'} />;
  else if (/^\/i\/[A-Za-z0-9_-]{24,64}$/.test(path)) page = <PublicBill token={path.slice(3)} />;
  else if (path === '/app' || path.startsWith('/app/')) page = <OwnerApp path={path} />;
  else page = <NotFound />;
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[70] btn-primary">Skip to content</a>
      <Suspense fallback={<div className="min-h-screen grid place-items-center text-muted" role="status">Loading…</div>}>{page}</Suspense>
      <Toasts />
    </>
  );
}
