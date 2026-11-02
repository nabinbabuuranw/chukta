import { useState, type FormEvent } from 'react';
import { Link, navigate, useLocation } from '../lib/router';
import { api, errorText, ApiError } from '../lib/api';
import { useAuth, homeFor } from '../lib/auth';
import { Logo } from '../components/Logo';
import { Field } from '../components/ui';

export const DEMO = { owner: 'demo-owner@chukta.demo', buyer: 'demo-buyer@chukta.demo', password: 'chukta2083demo' };

function Frame({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <main id="main" className="min-h-screen grid lg:grid-cols-[1fr_1.05fr]">
      <div className="hidden lg:flex flex-col justify-between bg-ink text-sheet p-12">
        <Link to="/" aria-label="Chukta home" className="w-fit"><span className="inline-flex items-center gap-2 text-sheet"><Logo compact /><span className="display text-[22px]">Chukta</span></span></Link>
        <div>
          <p className="deva text-[64px] leading-none text-lime/90">चुक्ता</p>
          <p className="mt-4 text-[22px] max-w-[420px] text-sheet/90" style={{ fontStretch: '88%' }}>"Paid in full." The two best words in any shop's day.</p>
        </div>
        <p className="text-[13px] text-sheet/60">Not IRD-certified billing software. Built for tracking what you're owed.</p>
      </div>
      <div className="flex flex-col px-5 py-8 sm:px-10">
        <Link to="/" className="lg:hidden w-fit mb-8" aria-label="Chukta home"><Logo /></Link>
        <div className="w-full max-w-[440px] mx-auto my-auto rise">
          <h1 className="text-[32px] md:text-[38px]">{title}</h1>
          <p className="mt-2 mb-7 text-ink-2">{sub}</p>
          {children}
        </div>
      </div>
    </main>
  );
}

export function Login() {
  const { search } = useLocation(); const demo = new URLSearchParams(search).get('demo');
  const { refresh } = useAuth();
  const [email, setEmail] = useState(demo ? DEMO.owner : ''); const [password, setPassword] = useState(demo ? DEMO.password : '');
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    try { const r = await api('/auth/login', { body: { email, password } }); await refresh(); navigate(homeFor(r.user.role), { replace: true }); }
    catch (er) { setError(errorText(er)); } finally { setBusy(false); }
  }
  return (
    <Frame title="Welcome back" sub="Sign in to your bills, customers and dues.">
      {demo && (
        <div className="card bg-lime-soft/70 border-lime/60 p-4 mb-6 text-[14px]">
          <p className="font-medium">Demo business (shared sample data)</p>
          <p className="mt-1 text-ink-2">Owner: <span className="num">{DEMO.owner}</span> · Buyer: <span className="num">{DEMO.buyer}</span> · Password: <span className="num">{DEMO.password}</span>. Anyone can use it, so don't type real customer details here.</p>
          <div className="flex gap-2 mt-3"><button type="button" className="btn-quiet btn-sm" onClick={() => setEmail(DEMO.owner)}>Use owner</button><button type="button" className="btn-quiet btn-sm" onClick={() => setEmail(DEMO.buyer)}>Use buyer</button></div>
        </div>
      )}
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p role="alert" className="text-overdue text-[14px]">{error}</p>}
        <button className="btn-primary w-full !h-12" disabled={busy || !email || !password}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <p className="mt-6 text-[14px] text-ink-2">New to Chukta? <Link to="/register" className="text-baltic font-medium underline underline-offset-4">Create an account</Link>{!demo && <> · <Link to="/login?demo=1" className="text-baltic underline underline-offset-4">try the demo</Link></>}</p>
    </Frame>
  );
}

export function Register() {
  const { refresh } = useAuth();
  const [account, setAccount] = useState<'owner' | 'customer'>('owner');
  const [f, setF] = useState({ name: '', email: '', password: '', biz: '', pan: '', vat: true });
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [field, setField] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: any) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(null); setField(null);
    try {
      const r = await api('/auth/register', { body: { name: f.name, email: f.email, password: f.password, account, business: account === 'owner' ? { name: f.biz, pan: f.pan || undefined, vat_registered: f.vat } : undefined } });
      await refresh(); navigate(homeFor(r.user.role), { replace: true });
    } catch (er) { setError(errorText(er)); if (er instanceof ApiError) setField(er.field || null); } finally { setBusy(false); }
  }
  const bad = (k: string) => (field === k ? error : null);
  return (
    <Frame title="Create your account" sub="Free for up to 25 customers. Takes about a minute.">
      <div className="grid grid-cols-2 p-1 rounded-full bg-tint border border-rule mb-6" role="radiogroup" aria-label="Account type">
        {([['owner', 'I send bills'], ['customer', 'I receive bills']] as const).map(([v, l]) => (
          <button key={v} type="button" role="radio" aria-checked={account === v} onClick={() => setAccount(v)} className={`h-10 rounded-full text-[14px] cursor-pointer transition-colors duration-150 ${account === v ? 'bg-baltic text-sheet' : 'text-ink-2 hover:text-ink'}`}>{l}</button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Your name" autoComplete="name" value={f.name} onChange={set('name')} error={bad('name')} />
        <Field label="Email" type="email" autoComplete="email" value={f.email} onChange={set('email')} error={bad('email')} hint={account === 'customer' ? 'Use the email your suppliers have for you, so their bills appear here.' : undefined} />
        <Field label="Password" type="password" autoComplete="new-password" value={f.password} onChange={set('password')} error={bad('password')} hint="8+ characters with a letter and a number." />
        {account === 'owner' && (
          <fieldset className="card p-4 space-y-4">
            <legend className="px-1 text-[13px] font-semibold text-muted uppercase tracking-[0.12em]">Business</legend>
            <Field label="Business name" value={f.biz} onChange={set('biz')} error={bad('business_name')} />
            <label className="flex items-center gap-3 cursor-pointer select-none"><input type="checkbox" checked={f.vat} onChange={set('vat')} className="size-5 accent-[#05668D]" />Registered for VAT</label>
            <Field label={f.vat ? 'PAN / VAT number' : 'PAN (optional)'} inputMode="numeric" maxLength={9} value={f.pan} onChange={set('pan')} error={bad('pan')} hint="9 digits, printed on your bills." />
          </fieldset>
        )}
        {error && !field && <p role="alert" className="text-overdue text-[14px]">{error}</p>}
        {error && field && <p role="alert" className="sr-only">{error}</p>}
        <button className="btn-primary w-full !h-12" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
        <p className="text-[13px] text-muted">By creating an account you agree to the <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy</Link>.</p>
      </form>
      <p className="mt-6 text-[14px] text-ink-2">Already have an account? <Link to="/login" className="text-baltic font-medium underline underline-offset-4">Sign in</Link></p>
    </Frame>
  );
}
