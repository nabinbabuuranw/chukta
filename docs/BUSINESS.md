# Chukta (चुक्ता) — Business plan · Day 2 of 100 Platforms

Live: https://chukta.sites.tab.bot/ · Repo: https://github.com/nabinbabuuranw/chukta · Date: 2 November 2026 (16 Kartik 2083)

## Target customers
Nepali small and medium businesses that sell on credit and chase payments: building-material and hardware traders, wholesalers and distributors, printing presses, agencies (like ADSRUN), workshops, consultancies, event and catering firms, small manufacturers. Typical: 1–15 staff, 20–300 credit customers, owner or one accountant does the billing, works from an Android phone and a laptop.

## Problems
1. Money owed is tracked in a paper khata, Excel, or memory. Owners can't answer "who owes me what, since when?" quickly.
2. Asking for payment is awkward; reminders are late or never sent.
3. VAT maths (13%, taxable vs non-taxable, discounts), BS dates and amount-in-words are done by hand, with mistakes.
4. Monthly VAT sales register for the accountant is rebuilt by hand.

## Competitors in Nepal (seen on 2 Nov 2026 through web search; prices as published, not verified with vendors)
| Product | What it is | Price seen | Chukta's difference |
|---|---|---|---|
| Tigg (tiggapp.com) | IRD-certified cloud accounting/billing with CBMS sync | not checked | Chukta is not certified; it's lighter, receivables-first, free to start |
| OneFlow (oneflow.pro) | Cloud accounting + IRD billing | NPR 1,667–2,083 / month (oneflow.pro pricing section) | ~half the price, phone-first, reminder workflow |
| BUSY, Swastik, BizPro | Desktop/enterprise accounting (on IRD's certified list per vatupdate.com deck) | licence based | No install, works on a phone |
| Mero Hisab, Hisab Kitab | POS / inventory / billing apps | not checked | Focus on dues, statements and reminders, not POS |
| Paper khata / Excel | Free | Rs 0 | Running balance, aging, reminders, VAT register automatically |

## USP
"Get it chukta": a receivables tool that makes a VAT-correct bill in a minute, shows every rupee owed with its age, and writes the polite Nepali/English WhatsApp reminder with a link to the bill. BS dates and lakh/crore formatting everywhere. Honest about not being IRD-certified.

## Pricing (NPR)
- **Free:** 25 customers, 30 issued bills in any 30 days, all features.
- **Pro:** Rs 799/month or Rs 7,990/year. Unlimited customers and bills, priority WhatsApp help.
- Payment: eSewa / Khalti / bank transfer, switched on by the admin (Admin → Businesses → Free → Pro). No online card checkout yet (needs a merchant account; not set up, $0 rule).

## Monetization and revenue potential (illustration, not a forecast or a promise)
- 40 Pro businesses ≈ NPR 32,000/month; 125 Pro businesses ≈ NPR 1,00,000/month.
- Add-ons later: printed bill-book design service, accountant multi-business seat (Rs 1,500/month), SMS reminders through a paid gateway (only with permission, passes cost through).
- Recurring: yes. Billing tools are sticky: once a business's ledger lives in Chukta, switching costs are high.

## Acquisition
1. ADSRUN's own clients and network (agencies, shops) — direct WhatsApp demo with the shared demo business.
2. Facebook groups for Nepali traders/accountants (e.g. "Nepali Tax Club") with short how-to videos (13% VAT maths, amount in words) — useful content first.
3. Partner accountants: free Pro for accountants who move 3+ clients.
4. Every shared bill link and reminder carries "Prepared with Chukta" (organic).
5. Story Telling Nepal / NEXA audiences are not a fit; don't spend effort there.

## Operating cost
**$0 today.** Hosted as one Cloudflare Worker + D1 database through our publishing; no domain, no paid API, no SMS gateway, fonts self-hosted (SIL OFL). Free-tier limits (Cloudflare's published free plan, not re-checked today): about 100,000 Worker requests/day and D1's free storage and read/write quotas. A few hundred active businesses fit inside that; beyond it Workers Paid is about USD 5/month (needs Nabin's OK before any spend).

## Limits and risks
- **Not IRD-certified billing software, not connected to CBMS.** Businesses legally required to use certified software must keep doing so; Chukta then serves receivables/statements. Getting certified is a separate legal process (application to IRD, audit) — possible later.
- Reminder sending is manual (opens WhatsApp/SMS/email). No automatic SMS.
- No password reset by email yet (no mail sender configured at $0) — admin can help users; listed as next step.
- One user per business (no staff seats yet).
- Actual expenses: $0. Actual revenue: Rs 0 (no customers yet).
