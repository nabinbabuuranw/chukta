import { useState, type ReactNode } from 'react';
import { Link } from '../lib/router';
import { PublicNav, Footer } from '../components/PublicNav';
import { Calculator } from '../components/Calculator';
import { StatusChip } from '../components/ui';
import { Reveal } from '../components/Reveal';
import { IcBill, IcLedger, IcChat, IcChart, IcPeople, IcShield, IcArrow, IcCheck } from '../components/Icons';

const BOARD: { col: string; status: string; tone: string; cards: [string, string, string, number?][] }[] = [
  { col: 'Due', status: 'due', tone: 'border-t-baltic', cards: [['Annapurna Traders', 'Rs 56,500', 'due in 6 days'], ['Hotel Lakeside', 'Rs 18,080', 'due in 12 days']] },
  { col: 'Overdue', status: 'overdue', tone: 'border-t-overdue', cards: [['Shree Suppliers', 'Rs 1,12,430', 'reminded yesterday', 34], ['Everest Events', 'Rs 9,605', 'not reminded yet', 8]] },
  { col: 'Chukta', status: 'paid', tone: 'border-t-sage', cards: [['Kathmandu Clinic', 'Rs 33,900', 'eSewa · 2 Kartik'], ['Bhaktapur Bakers', 'Rs 4,520', 'cash · 29 Ashwin']] },
];
const FEATURES: [ReactNode, string, string][] = [
  [<IcBill />, 'VAT bills in a minute', 'Tax invoice, abbreviated invoice (up to Rs 10,000) or PAN bill. 13% VAT, pro-rata discount and amount in words are worked out for you.'],
  [<IcLedger />, 'A ledger per customer', 'Every bill and payment in date order with a running balance. Export it as a statement in one tap.'],
  [<IcChat />, 'Reminders they don\'t mind', 'A polite reminder in Nepali or English with a link to the bill, ready to send on WhatsApp, SMS or email.'],
  [<IcChart />, 'Monthly VAT sales register', 'Taxable, non-taxable and VAT for any Nepali month, voided bills shown separately. Download as CSV for your accountant.'],
  [<IcPeople />, 'A portal for your buyers', 'Customers who sign up with the email on their bills see every bill from you and what is still owed.'],
  [<IcShield />, 'Locked once issued', 'Issued bills get a fiscal-year number and can\'t be edited or deleted, only voided with a reason, and it is logged.'],
];
const FAQ: [string, string][] = [
  ['Is Chukta IRD-certified billing software?', 'No. Chukta is not certified by the Inland Revenue Department and is not connected to CBMS. Businesses that are legally required to use certified billing software (and all businesses above the CBMS turnover threshold) must keep using certified software for their official bills. Chukta still helps them track dues, statements and reminders. Every bill Chukta prints says this.'],
  ['Are dates in Bikram Sambat?', 'Yes. Every bill, ledger and report shows the BS date next to the AD date, and bill numbers follow the Nepali fiscal year (from 1 Shrawan).'],
  ['How do reminders get sent?', 'Chukta writes the message and opens WhatsApp, SMS or email on your phone with it filled in. You press send. We never message your customers on our own.'],
  ['Can my customers see their bills?', 'Each bill has a private link you can share. Customers can also create a free account with the same email you saved for them and see all their bills from you.'],
  ['What happens when I hit the Free limit?', 'Free covers 25 customers and 30 issued bills in any 30 days. Nothing is deleted; you just can\'t add more until you upgrade or the 30 days roll on.'],
  ['Who can see my data?', 'Only you, and the people you share a bill link with. We do not sell data or show ads. See the Privacy page for exactly what is stored.'],
];
export default function Home() {
  const [yearly, setYearly] = useState(false);
  return (
    <>
      <PublicNav />
      <main id="main">
        <section className="wrap pt-14 md:pt-24 pb-12 text-center">
          <p className="eyebrow rise">For shops, agencies, traders and workshops in Nepal</p>
          <h1 className="rise mt-4 text-[40px] sm:text-[56px] md:text-[68px] max-w-[880px] mx-auto" style={{ animationDelay: '60ms' }}>
            Make the bill. Track the dues. <span className="text-baltic">Get it <span className="deva font-semibold">चुक्ता</span>.</span>
          </h1>
          <p className="rise mt-5 text-[17px] md:text-[19px] text-ink-2 max-w-[620px] mx-auto" style={{ animationDelay: '120ms' }}>
            Chukta makes 13% VAT bills with Nepali dates, keeps a running ledger for every customer, and writes the polite WhatsApp reminder so you don't have to.
          </p>
          <div className="rise mt-8 flex flex-col sm:flex-row gap-3 justify-center" style={{ animationDelay: '180ms' }}>
            <Link to="/register" className="btn-primary !h-12 !px-7">Start free <IcArrow size={18} /></Link>
            <Link to="/login?demo=1" className="btn-quiet !h-12 !px-6">Open the demo business</Link>
          </div>
          <p className="mt-3 text-[13px] text-muted">Free for up to 25 customers. No card. The demo is a shared sample shop.</p>
        </section>

        <section aria-labelledby="calc-h" className="wrap pb-20">
          <div className="card p-5 sm:p-8 md:p-10">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-6">
              <h2 id="calc-h" className="text-[26px] md:text-[32px]">Check the maths before you sign up</h2>
              <p className="text-muted text-[14px]">Same calculation the app uses. Nothing is saved.</p>
            </div>
            <Calculator />
          </div>
        </section>

        <section id="how" aria-labelledby="how-h" className="bg-tint/70 border-y border-rule py-16 md:py-20 scroll-mt-20">
          <div className="wrap">
            <div className="max-w-[640px] mb-10">
              <p className="eyebrow">How it works</p>
              <h2 id="how-h" className="mt-3 text-[30px] md:text-[40px]">Every rupee owed, in one of three places</h2>
              <p className="mt-3 text-ink-2 text-[17px]">Issue a bill and it starts in <b>Due</b>. Miss the date and it moves to <b>Overdue</b>, with the days counted. Record the last payment and it gets the green stamp.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {BOARD.map((c, ci) => (
                <Reveal key={c.col} delay={ci * 90} className={`rounded-card bg-mist/80 border border-rule border-t-[3px] ${c.tone} p-3`}>
                  <div className="flex items-center justify-between px-1 pb-3"><h3 className="text-[18px]">{c.col}</h3><span className="text-[12px] text-muted">sample</span></div>
                  <ul className="space-y-2.5">
                    {c.cards.map(([n, a, m, d]) => (
                      <li key={n} className="card p-3.5 transition-transform duration-200 hover:-translate-y-0.5">
                        <div className="flex justify-between gap-2"><span className="font-medium">{n}</span><StatusChip status={c.status} days={d} /></div>
                        <div className="flex justify-between items-baseline mt-2"><span className="num text-[16px]">{a}</span><span className="text-[13px] text-muted">{m}</span></div>
                      </li>
                    ))}
                  </ul>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="features" aria-labelledby="f-h" className="wrap py-16 md:py-24 scroll-mt-20">
          <h2 id="f-h" className="text-[30px] md:text-[40px] max-w-[560px]">Built for how bills really move in Nepal</h2>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
            {FEATURES.map(([icon, t, b], i) => (
              <Reveal key={t} delay={(i % 3) * 80}>
                <div className="size-11 rounded-ctl bg-baltic-soft text-baltic grid place-items-center mb-4">{icon}</div>
                <h3 className="text-[20px] mb-1.5">{t}</h3>
                <p className="text-ink-2">{b}</p>
              </Reveal>
            ))}
          </div>
        </section>

        <section aria-labelledby="st-h" className="wrap pb-16">
          <div className="rounded-card bg-ink text-sheet p-6 md:p-10 grid md:grid-cols-[1fr_1.2fr] gap-6 md:gap-12">
            <div>
              <p className="eyebrow !text-lime">Straight talk</p>
              <h2 id="st-h" className="mt-3 text-[28px] md:text-[34px]">What Chukta is, and what it isn't</h2>
            </div>
            <ul className="space-y-3 text-[16px] text-sheet/90">
              <li className="flex gap-3"><span className="text-lime mt-0.5"><IcCheck size={18} /></span>A tool to draft VAT-correct bills, track receivables, and remind customers.</li>
              <li className="flex gap-3"><span className="text-lime mt-0.5"><IcCheck size={18} /></span>Your data stays yours: export ledgers and the VAT register to CSV any time.</li>
              <li className="flex gap-3"><span className="text-[#F3B9A9] mt-0.5 font-mono">✕</span>Not IRD-certified billing software and not connected to CBMS. If the law requires certified software for your business, use it for official bills.</li>
              <li className="flex gap-3"><span className="text-[#F3B9A9] mt-0.5 font-mono">✕</span>Not a payment collector: money goes straight from your customer to you.</li>
            </ul>
          </div>
        </section>

        <section id="pricing" aria-labelledby="p-h" className="wrap py-16 scroll-mt-20">
          <div className="text-center max-w-[560px] mx-auto">
            <h2 id="p-h" className="text-[30px] md:text-[40px]">One price. No surprises.</h2>
            <p className="mt-3 text-ink-2">Start free. Move to Pro when you have more customers than fit on one page.</p>
            <div className="mt-6 inline-flex p-1 rounded-full bg-sheet border border-rule" role="radiogroup" aria-label="Billing period">
              {[[false, 'Monthly'], [true, 'Yearly · 2 months free']].map(([v, l]) => (
                <button key={String(v)} role="radio" aria-checked={yearly === v} onClick={() => setYearly(v as boolean)} className={`h-9 px-4 rounded-full text-[14px] cursor-pointer transition-colors duration-150 ${yearly === v ? 'bg-baltic text-sheet' : 'text-ink-2 hover:text-ink'}`}>{l as string}</button>
              ))}
            </div>
          </div>
          <div className="mt-10 max-w-[860px] mx-auto carbon rounded-card">
            <div className="card shadow-card grid md:grid-cols-2 overflow-hidden">
              <div className="p-6 md:p-8 border-b md:border-b-0 md:border-r border-rule">
                <h3 className="text-[22px]">Free</h3>
                <p className="mt-2"><span className="num text-[36px]">Rs 0</span></p>
                <dl className="mt-5 text-[15px] divide-y divide-rule border-y border-rule">{[['Customers', '25'], ['Issued bills', '30 per 30 days'], ['Bill types', 'VAT, abbreviated, PAN'], ['Ledgers + reminders', 'Included'], ['VAT register CSV', 'Included']].map(([k, v]) => <div key={k} className="flex justify-between py-2"><dt className="text-ink-2">{k}</dt><dd className="font-medium">{v}</dd></div>)}</dl>
                <Link to="/register" className="btn-quiet w-full mt-7">Start free</Link>
              </div>
              <div className="p-6 md:p-8 bg-baltic-soft/40">
                <h3 className="text-[22px]">Pro</h3>
                <p className="mt-2"><span className="num text-[36px]">{yearly ? 'Rs 7,990' : 'Rs 799'}</span><span className="text-muted"> / {yearly ? 'year' : 'month'}</span></p>
                <dl className="mt-5 text-[15px] divide-y divide-rule border-y border-rule">{[['Customers', 'Unlimited'], ['Issued bills', 'Unlimited'], ['Bill types', 'VAT, abbreviated, PAN'], ['Ledgers + reminders', 'Included'], ['Help', 'Priority on WhatsApp']].map(([k, v]) => <div key={k} className="flex justify-between py-2"><dt className="text-ink-2">{k}</dt><dd className="font-medium">{v}</dd></div>)}</dl>
                <Link to="/register?plan=pro" className="btn-primary w-full mt-7">Start free, upgrade later</Link>
                <p className="mt-3 text-[13px] text-muted">Pro is switched on by our team after payment by eSewa, Khalti or bank transfer. Online card payment is not available yet.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" aria-labelledby="faq-h" className="wrap py-16 scroll-mt-20">
          <h2 id="faq-h" className="text-[30px] md:text-[40px] mb-8">Questions owners ask</h2>
          <div className="grid md:grid-cols-2 gap-x-10">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group border-t border-rule py-4">
                <summary className="flex justify-between gap-4 cursor-pointer list-none font-medium text-[17px] [&::-webkit-details-marker]:hidden">
                  {q}<span className="text-baltic transition-transform duration-200 group-open:rotate-45 shrink-0" aria-hidden="true">+</span>
                </summary>
                <p className="mt-2.5 text-ink-2">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
