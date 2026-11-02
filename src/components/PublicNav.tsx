import { useEffect, useState } from 'react';
import { Link, useLocation } from '../lib/router';
import { useAuth, homeFor } from '../lib/auth';
import { Logo } from './Logo';
import { IcMenu, IcClose } from './Icons';

const LINKS = [['How it works', '/#how'], ['Features', '/#features'], ['Pricing', '/#pricing'], ['FAQ', '/#faq']] as const;
export function PublicNav() {
  const { user } = useAuth(); const { path } = useLocation();
  const [open, setOpen] = useState(false); const [scrolled, setScrolled] = useState(false);
  useEffect(() => { const f = () => setScrolled(window.scrollY > 8); f(); window.addEventListener('scroll', f, { passive: true }); return () => window.removeEventListener('scroll', f); }, []);
  useEffect(() => setOpen(false), [path]);
  return (
    <header className="sticky top-0 z-40 pt-3 px-3 no-print">
      <nav aria-label="Main" className={`mx-auto max-w-[1080px] flex items-center justify-between gap-3 h-14 pl-4 pr-2 rounded-full border transition-[background-color,border-color,box-shadow] duration-200 ${scrolled ? 'bg-sheet/95 border-rule shadow-card backdrop-blur' : 'bg-sheet/70 border-transparent'}`}>
        <Link to="/" aria-label="Chukta home" className="rounded-full"><Logo /></Link>
        <ul className="hidden md:flex items-center gap-1">
          {LINKS.map(([t, h]) => <li key={h}><a href={h} className="px-3.5 py-2 rounded-full text-[14px] text-ink-2 hover:bg-tint hover:text-ink transition-colors">{t}</a></li>)}
        </ul>
        <div className="hidden md:flex items-center gap-2">
          {user ? <Link to={homeFor(user.role)} className="btn-primary btn-sm !rounded-full !px-4">Open Chukta</Link> : <>
            <Link to="/login" className="btn-ghost btn-sm !rounded-full">Sign in</Link>
            <Link to="/register" className="btn-primary btn-sm !rounded-full !px-4">Start free</Link></>}
        </div>
        <button className="md:hidden btn-ghost btn-sm !rounded-full !px-2.5" aria-expanded={open} aria-controls="mnav" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)}>{open ? <IcClose /> : <IcMenu />}</button>
      </nav>
      {open && (
        <div id="mnav" className="md:hidden fixed inset-x-3 top-[76px] z-40 card shadow-pop p-3 rise">
          <ul className="flex flex-col">
            {LINKS.map(([t, h]) => <li key={h}><a href={h} onClick={() => setOpen(false)} className="block px-3 py-3.5 rounded-ctl text-[17px] hover:bg-tint">{t}</a></li>)}
          </ul>
          <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-rule">
            {user ? <Link to={homeFor(user.role)} className="btn-primary col-span-2">Open Chukta</Link> : <>
              <Link to="/login" className="btn-quiet">Sign in</Link><Link to="/register" className="btn-primary">Start free</Link></>}
          </div>
        </div>
      )}
    </header>
  );
}
export function Footer() {
  return (
    <footer className="border-t border-rule mt-20 no-print">
      <div className="wrap py-7 flex flex-col md:flex-row gap-4 md:items-center justify-between text-[14px] text-muted">
        <div className="flex items-center gap-3"><Logo compact /><span>Chukta · made in Kathmandu · not IRD-certified billing software</span></div>
        <nav aria-label="Footer" className="flex gap-5">
          <Link to="/terms" className="hover:text-ink">Terms</Link><Link to="/privacy" className="hover:text-ink">Privacy</Link><a href="/#faq" className="hover:text-ink">FAQ</a>
        </nav>
      </div>
    </footer>
  );
}
