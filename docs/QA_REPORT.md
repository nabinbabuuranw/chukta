# Chukta — QA report · Day 2 of 100 Platforms

Live: https://chukta.sites.tab.bot/ · Repo: https://github.com/nabinbabuuranw/chukta · Tested 2 November 2026 (NPT) against the deployed site.

## Summary
- **API unit tests: 24/24 pass** (`npm test`, Node test runner, in-memory SQLite D1 shim): money maths (VAT 13%, pro-rata discount, rounding), lakh/crore formatting, amount in words, BS dates + fiscal year (1 Shrawan), PAN validation, status derivation, password hashing, setup key, registration validation, login + per-email rate limit, CSRF (cross-origin and non-JSON refused), RBAC (anonymous/customer/owner/admin), client isolation between businesses, invoice create/validate/issue with sequential FY numbers, non-VAT PAN bills, payments (partial, overpay refused, full, void payment), client ledger + CSV, reminders (Nepali/English, +977 WhatsApp link), void (needs reason, excluded from VAT totals), CSV formula-injection escaping, summary totals, public bill link (no internal ids, drafts not public), customer portal scoping, admin suspend/disable/audit, Free plan limit, logout, SPA routing + security headers.
- **Production build + `tsc --noEmit`: clean.** Main JS 186 KB (60 KB gzip), owner app lazy-loaded (45 KB), CSS 38 KB; worker 47 KB.
- **Live E2E (Python Playwright, headless Chromium): 48/48 pass**, desktop 1440 px and mobile 390 px, plus 375/768/1024/1440 breakpoints and reduced motion. Console errors: 2, both expected (a deliberate 404 page visit and a deliberate 422 from an invalid PAN in the register test).
- **30-point anti-AI audit: 30/30 pass** (1 with a stated reason).

## Live E2E checks
- ✅ home: hero renders
- ✅ home: calculator VAT 13% on 1,00,000 = 1,13,000.00
- ✅ home: paid stamp appears
- ✅ home: PAN-only removes VAT
- ✅ home: pricing toggle yearly
- ✅ legal page /terms
- ✅ legal page /privacy
- ✅ 404 page
- ✅ guard: /app without login -> /login
- ✅ register: invalid PAN shows field error
- ✅ register: owner lands on dashboard
- ✅ dashboard: empty state for new business
- ✅ customer: added
- ✅ editor: live totals (pro-rata discount, VAT on taxable only)
- ✅ bill: issued with FY number
- ✅ bill: server total matches editor
- ✅ bill: not-certified footer on bill
- ✅ payment: partial -> Part paid
- ✅ payment: full -> Chukta stamp
- ✅ overdue: past due date shows Overdue with days
- ✅ reminder: Nepali text with balance and link
- ✅ reminder: English variant
- ✅ reminder: opens WhatsApp deep link to +977 number
- ✅ reminder: logged on bill
- ✅ dashboard: aging bar shows overdue
- ✅ ledger: running balance = Rs 35,030.00 (overdue bill only)
- ✅ ledger: CSV statement downloads
- ✅ reports: register lists this month bill
- ✅ bills: overdue filter
- ✅ settings: save
- ✅ public bill: opens without login
- ✅ customer portal: sees both bills from the business
- ✅ RBAC: customer redirected away from /app
- ✅ admin: overview + businesses list has new business
- ✅ admin: audit trail
- ✅ demo owner: dashboard with sample bills
- ✅ mobile: no horizontal scroll on home
- ✅ mobile: bottom tab bar visible
- ✅ mobile: no horizontal scroll /app
- ✅ mobile: no horizontal scroll /app/bills
- ✅ mobile: no horizontal scroll /app/clients
- ✅ mobile: no horizontal scroll /app/reports
- ✅ mobile: no horizontal scroll /app/settings
- ✅ breakpoint 375: home fits
- ✅ breakpoint 768: home fits
- ✅ breakpoint 1024: home fits
- ✅ breakpoint 1440: home fits
- ✅ reduced motion: animations collapse

## 30-point anti-AI UI audit
| # | Rule | Result | Note |
|---|---|---|---|
| 1 | Harsh gradients | Pass | No gradients except a hard-stop lime marker highlight under the key amount (a highlighter, not a gradient wash). |
| 2 | Pure white backgrounds | Pass | Page #EBF2FA, surfaces #F7FAFD. White only in print CSS (paper). |
| 3 | Rainbow colouring | Pass | 5 Coolors colours + 2 derived status colours; each has one job. |
| 4 | Heavy drop shadows | Pass | One soft card shadow; a stronger one only on floating sheets/toasts. |
| 5 | Liquid glass | Pass | None. Nav uses solid surface (slight blur only when scrolled for legibility). |
| 6 | Generic purple + black | Pass | Baltic blue / sage / lime on Alice-blue paper. |
| 7 | Radial orbs | Pass | None. |
| 8 | Excessive neon | Pass | Lime used only as marker/chart fill, never text. |
| 9 | Basic pastel palette | Pass | Saturated ink blue + sage with pale ground; contrast checked (DESIGN.md). |
| 10 | Default Lucide icons | Pass | Own 24px icon set with square caps (Icons.tsx). |
| 11 | Emojis as UI icons | Pass | None. |
| 12 | Inter / Geist / Space Grotesk | Pass | IBM Plex Sans (condensed headings) + Plex Sans Devanagari + Plex Mono, self-hosted. |
| 13 | Unnecessary sparkle icons | Pass | None (an unused sparkle icon was removed from the set). |
| 14 | Animated arrows | Pass | Static arrow on one CTA only. |
| 15 | Hover animation on every element | Pass | Hovers only on interactive items; colour change, small lift on board cards. |
| 16 | Repetitive three-feature cards | Pass | Features are 6 text blocks with icons, no cards; the 3 board columns are the product's real states (Due/Overdue/Chukta). |
| 17 | Coloured left stripes on cards | Pass | None. Board columns use a top rule for status. |
| 18 | Repetitive bento grids | Pass | None. |
| 19 | Unnecessary terminal mockups | Pass | None. |
| 20 | Generic three-tier pricing | Pass | Two plans in one split card with a monthly/yearly toggle; specs as a definition list. |
| 21 | Soft rounded corners everywhere | Pass (reasoned) | Token radii: 10px controls, 14px cards, pills only for chips/tabs/nav where the pill shape carries meaning (status, segmented choice). |
| 22 | Dot-grid backgrounds | Pass | None. The dotted 'perforation' line on bills is a bill-book motif, one line. |
| 23 | Excessive em dashes | Pass | No em dashes in UI copy; '—' only as empty-cell placeholder in tables. |
| 24 | "It's not X, it's Y" copy | Pass | Not used. 'What Chukta is, and what it isn't' is a factual compliance list. |
| 25 | Repetitive checkmark bullet lists | Pass | Pricing changed to spec rows; ✓/✕ used once, in the compliance band where yes/no is the meaning. |
| 26 | Fake testimonials | Pass | None. No customer counts, logos or revenue claims. |
| 27 | Missing real product demo | Pass | Working calculator on the homepage (same maths as API) + shared demo business login. |
| 28 | Missing skeleton loaders | Pass | Skeletons on every data page; empty and error states with retry. |
| 29 | Missing Terms | Pass | /terms |
| 30 | Missing Privacy | Pass | /privacy |

## Design QA
- Palette applied through Tailwind tokens only (see DESIGN.md); contrast: body 13.2:1, muted 5.0:1, primary button 6.4:1, overdue 5.6:1.
- Focus: visible 2px Baltic outline on all controls; skip link; dialogs trap initial focus and close on Escape; every input has a real label.
- Motion: hero rise on load; homepage sections reveal on scroll and hide again when scrolled back up; page fade-in on app route changes; animated aging/collection bars; stamp lands with a spring when a bill is paid; bottom sheet slides up. `prefers-reduced-motion: reduce` collapses all of it (E2E checked: animation-duration 1e-06s).
- Mobile (390 px): no horizontal scroll on home or any app page (E2E measured scrollWidth); bottom tab bar + raised "New bill" button; tables hide secondary columns.
- Screens reviewed by eye: home (all sections), register, dashboard, bill editor, issued and paid bill, reminder sheet, ledger, VAT register, public bill, customer portal, admin, mobile equivalents.

## Security
PBKDF2-SHA256 password hashes (WebCrypto); random session tokens stored only as SHA-256 hashes; cookie HttpOnly + Secure + SameSite=Lax, 14 days; CSRF: Origin/Sec-Fetch-Site checks + JSON-only writes; rate limits on login (per IP and per email), register, setup and public bill links; strict CSP (self only), X-Frame-Options DENY, nosniff; all totals recomputed server-side (client totals ignored, tested); issued bills immutable; audit log. Setup key exists only as a SHA-256 hash in code.

## Known limitations (honest)
- Not IRD-certified billing software; not connected to CBMS (labelled on every bill, homepage, FAQ, Terms).
- No password reset email (no free mail sender wired); no staff seats; reminders are sent by the user's own WhatsApp/SMS/email app; no notification centre beyond the dashboard's "Needs a nudge" list and toasts.
- Pro upgrade is manual (admin switches plan after eSewa/Khalti/bank payment); no online card checkout.
- E2E runs created test accounts named "E2E Hardware …" in the live database (visible to the admin; harmless; can be suspended).
- Demo business is shared; anyone with the demo login can add data to it.
