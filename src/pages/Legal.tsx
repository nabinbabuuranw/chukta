import { PublicNav, Footer } from '../components/PublicNav';
const UPDATED = '2 November 2026 (17 Kartik 2083)';
export function Terms() {
  return <Doc title="Terms of use" sections={[
    ['Who we are', 'Chukta is a web app for drafting bills, tracking money owed and preparing payment reminders. It is an early-stage product built in Kathmandu, Nepal. Until a support address is published, contact the maintainer through the Chukta GitHub repository (github.com/nabinbabuuranw/chukta).'],
    ['Not certified billing software', 'Chukta is not certified by the Inland Revenue Department (IRD) of Nepal and is not connected to the Central Billing Monitoring System (CBMS). If the law requires your business to use IRD-certified billing software, you must use such software for your official tax invoices. You are responsible for the correctness of every bill you issue, your VAT returns and your tax compliance. Chukta\'s calculations are provided to help you, not as tax advice.'],
    ['Your account', 'Keep your password private. You are responsible for activity on your account. One business per owner account. Do not use Chukta for illegal activity, to harass people, or to send messages your customers have not agreed to receive.'],
    ['Your data', 'Bills, customers and payments you enter belong to you. You can export them as CSV at any time. We may suspend accounts that break these terms; we will tell you why when we can.'],
    ['Plans and payment', 'The Free plan has the limits shown on the pricing section. Pro is billed in Nepali rupees and switched on manually after payment; there is no automatic card charge. If we change prices we will tell existing customers at least 30 days in advance.'],
    ['Reminders', 'Chukta never sends messages on its own. It prepares a message and opens your WhatsApp, SMS or email app; you choose whether to send it.'],
    ['Availability and liability', 'We work to keep Chukta available but do not promise uninterrupted service. To the extent the law allows, our total liability is limited to the amount you paid us in the last 3 months. The demo business is shared sample data and may be reset at any time.'],
    ['Changes', 'We may update these terms. The date at the top shows the latest version.'],
  ]} />;
}
export function Privacy() {
  return <Doc title="Privacy" sections={[
    ['What we store', 'Your name, email and a salted PBKDF2 hash of your password (never the password itself). For businesses: business details, customers (name and optionally PAN, phone, email, address), bills, payments and an audit log of important actions. Session cookies are HttpOnly and expire after 14 days.'],
    ['What we do not do', 'No ads, no trackers, no analytics scripts, no third-party fonts or CDNs, no selling or sharing of data. Your bills are not used to train anything.'],
    ['Who can see what', 'A business owner sees their own business only. A customer who signs up with an email sees bills that businesses addressed to that email. Anyone with a bill\'s private link can view that one bill, so share links carefully. The platform admin can see account lists and the audit log to keep the service safe.'],
    ['Where it lives', 'Data is stored in a Cloudflare D1 database and served by a Cloudflare Worker. IP addresses are used briefly for rate-limiting sign-in attempts.'],
    ['Your choices', 'You can export your ledgers and VAT register at any time. To delete your account and data, open an issue on the Chukta GitHub repository (github.com/nabinbabuuranw/chukta) without posting personal details, and the maintainer will arrange verification by email and confirm when it is done.'],
    ['Children', 'Chukta is for businesses and is not intended for children under 16.'],
  ]} />;
}
function Doc({ title, sections }: { title: string; sections: [string, string][] }) {
  return (
    <>
      <PublicNav />
      <main id="main" className="wrap max-w-[760px] py-12">
        <h1 className="text-[36px] md:text-[44px]">{title}</h1>
        <p className="text-muted mt-2">Last updated {UPDATED}</p>
        <div className="mt-8 space-y-7">{sections.map(([h, b]) => <section key={h}><h2 className="text-[20px]">{h}</h2><p className="mt-2 text-ink-2 leading-relaxed">{b}</p></section>)}</div>
      </main>
      <Footer />
    </>
  );
}
