# Chukta (चुक्ता) — DESIGN.md · Day 2 of 100 Platforms

Written 2026-11-02 (10:35–10:55 NPT), **before any UI code**, following Nabin's Global Design Workflow (Nov 2, 2026). Every step below says what was actually done and where the proof is.

Product: VAT-ready invoicing and receivables for Nepali SMEs (backlog idea #2, working name "Hisaab"). Renamed **Chukta** (चुक्ता = "settled / paid in full") because a name search showed "Hisab Kitab" (hisab-kitab.app, Nepal POS), "Mero Hisab" (merohisab.net) and "Hisab" (hisab.co, India) already exist. A search for "Chukta" showed no billing product with that name (the word appears in a Hindi khata-app's copy only).

## 1. Research — industry, audience, purpose (done: 8 web searches, 2026-11-02)
Audience: owners and accountants of small Nepali firms — traders, agencies, workshops, consultancies, wholesalers. Many work from a mid/low-end Android phone, between customers; many think in Bikram Sambat (BS) dates; amounts in lakh/crore.
Findings that shape the product (sources in BUSINESS.md):
- VAT is 13%. A full tax invoice carries seller and buyer PAN (9 digits), BS date, taxable value, VAT (BRAccount glossary "Tax invoice"; IRD VAT return help file: "PAN no is 9 digits").
- Abbreviated tax invoices are allowed for retail sales to final consumers up to Rs 10,000 per bill (VAT Rules amendment 2076, PKF TRU flash alert: limit raised from Rs 5,000 to Rs 10,000).
- Computerised billing used for compliance must be IRD-certified; IRD keeps a registry (BUSY, Swastik, Tigg, OneFlow, BizPro …) and firms over NPR 10 crore turnover must sync to CBMS (vatupdate.com Nepal e-invoicing deck; Tigg's posts). IRD announced a new bill format from Shrawan 1, 2083 (social posts; not read from IRD directly — unverified detail).
- => Chukta must be honest: **it is not IRD-certified billing software and not connected to CBMS.** Every printed bill carries that line. It is a receivables + bill-drafting tool; firms that legally need certified billing keep using it for tracking, statements and reminders.
- Competitor prices seen: OneFlow NPR 1,667–2,083/month; other SME tools ~NPR 1,200–1,500/month (synergy.com.np list). Mobile khata apps (Mero Hisab, Hisab Kitab) focus on POS/inventory; the gap Chukta targets is **"who owes me what, since when, and a one-tap polite reminder"** with VAT-correct bills.
Implications: mobile-first; big tap targets; tabular numbers; BS + AD dates side by side; amount in words (lakh/crore); WhatsApp reminders (wa.me deep links, no paid SMS); works on slow 3G (small bundle, self-hosted fonts, no external calls).

## 2. UI UX Pro Max skill (done)
Read `~/.agents/skills/ui-ux-pro-max/SKILL.md` (v2.15.0 CLI). Ran:
- `search.py "invoicing accounting SME fintech nepal" --design-system --persist -p "Hisaab"` → recommended *Enterprise Gateway* pattern, *Dark Mode (OLED)* style, Inter/Playfair, slate + green. Persisted to `design-system/hisaab/MASTER.md` in the project.
- `--domain style` for "invoice billing ledger small business" → Micro-interactions, Fluent 2, Data-Dense Dashboard; and "accounting paper ledger warm trustworthy" → E-Ink/Paper, Nature Distilled, Vintage Analog.
- `--domain typography` "fintech accounting trustworthy numbers tabular" → **Financial Trust (IBM Plex Sans)**, SaaS Mobile Boutique, Corporate Trust (Lexend/Source Sans 3), News Editorial.
- `--domain ux` "invoice dashboard form table" → tables: horizontal scroll or card layout on mobile; forms: loading → success/error feedback; real `<label>`s, never placeholder-only.
Decision and why I did NOT take the first recommendation: OLED dark mode is wrong for this audience (bills are printed/shared on paper-like light screens, sunlight readability on phones, low-end LCD Androids show dark greys muddy) and Inter is banned by the brief; Paper/editorial was Day 1's direction. Chosen style = **Data-dense utility + micro-interactions ("Carbon Copy")** in light mode, with the skill's pre-delivery checklist (SVG icons, cursor-pointer, 150–300 ms hovers, 4.5:1 text, visible focus, reduced motion, 375/768/1024/1440).

## 3. 21st.dev (done; free tier = 2 component codes/day, both used)
`21st search` for "invoice table" (ids 22164, 25157, 28473, 22187), "dashboard stats cards" (19070, 7841, 4403, 4245), "pricing section" (18754, 19886, 7539, 8408), "hero section saas" (1831, 8763, 3110, 36109); `--type theme "ledger finance"` → no results.
`21st get` (proof copies in `design-proof/21st-*.txt`):
- **25157 "Invoice Line Items Table" (olewandowski1)** — drew from it: right-aligned `tabular-nums` money columns, columns that hide by breakpoint (category/unit hidden on phones), subtotal/VAT/total in the table footer, "billed to / terms" caption. Re-implemented in our own tokens (no shadcn dependency).
- **19070 "Advanced Stats" (uilayout.contact)** — drew from it: one wide chart card + stacked KPI cards, the progress bar "x of target" pattern (used for "collected this month vs billed"), staggered reveal on first load. Not used: its black card, rounded-3xl and DM Sans.
No 21st code is copied verbatim; no 21st package is installed.

## 4. Coolors — palette on Nabin's account (done; signed in on the 1st attempt)
Signed in to coolors.co with the vault login "coolors.co — Nabin" (Browserbase session; the header shows the "N" avatar — `design-proof/coolors-01-signed-in.jpg`). Explored Explore Palettes → Trending, and Popular tagged teal, navy, professional, finance (screens 02–06); about 150 palettes read from the pages. Shortlist (palette pages opened, screens 07–09):
1. **Sky Blue Freshness** — https://coolors.co/palette/05668d-427aa1-ebf2fa-679436-a5be00 — **PICKED**
2. Midnight Sky — https://coolors.co/palette/00296b-003f88-00509d-fdc500-ffd500 (navy+gold; too "bank-ad", gold text fails contrast)
3. Gentle Sea Breeze — https://coolors.co/palette/022b3a-1f7a8c-bfdbf7-e1e5f2-ffffff (pure white in it; teal close to many SaaS)
Why Sky Blue Freshness: blue = trust and the blue ink/carbon of Nepali duplicate bill books; sage green = "paid / chukta"; zesty lime = a marker highlight for the one number that matters; pale Alice Blue background (not pure white). Not in palettes_log.md (log was empty), nothing like Day 1's pine/sindoor paper.

### Roles (HEX) and WCAG checks (computed)
| Role | HEX | Source | Use | Contrast |
|---|---|---|---|---|
| Primary | #05668D Baltic Blue | Coolors | buttons, links, active nav | white on it 6.38:1 ✓ AA; on bg 5.65:1 ✓ |
| Secondary | #427AA1 Steel Blue | Coolors | secondary buttons outline, charts, carbon offset | on bg 4.11:1 → large text/graphics only |
| Accent | #679436 Sage Green | Coolors | Paid/Chukta stamp, success | white on it 3.58:1 → bold ≥18px only; small text uses #4E7329 (4.89:1) |
| Highlight | #A5BE00 Lime | Coolors | marker underline, chart fill, focus of "amount due" | never text; ink on it 7.06:1 ✓ |
| Background | #EBF2FA Alice Blue | Coolors | page | — |
| Surface | #F7FAFD | derived (bg lightened) | cards, inputs | not pure white |
| Text | #0B2A3C | derived (primary darkened) | body/headings | 13.19:1 on bg ✓ |
| Muted text | #4F6B7D | derived | labels, meta | 4.99:1 on bg ✓ |
| Border | #C9D8E6 | derived | hairlines, table rules | — |
| Overdue (semantic) | #A63D2A | derived, not in palette | overdue chip text/border only | 5.6:1 on bg ✓ |
| Partial (semantic) | #8A6100 | derived | partly-paid chip | 4.91:1 on bg, 5.29:1 on surface ✓ AA (re-measured; an earlier draft said 5.0) |

## 5. Typography (done)
From the skill's "Financial Trust" pairing — one superfamily that covers both scripts, self-hosted (OFL, from Fontsource packages):
- **IBM Plex Sans** variable (wght 100–700, wdth 75–100%) — headings set **condensed (wdth 82%) semibold**, body normal width 400/500.
- **IBM Plex Sans Devanagari** 400/600 — Nepali words (चुक्ता, बाँकी, month names).
- **IBM Plex Mono** 400/500 — invoice numbers, PAN, money columns (tabular figures by design).
Not used: Fraunces/Figtree/Mukta (Day 1), Inter/Geist/Space Grotesk (banned). Scale: 13 / 15 / 17 / 20 / 26 / 34 / 48 px; line-height 1.5 body, 1.1 display.

## 6. Tokens
radius: control 10px, card 14px, chip 999px · spacing 4/8/12/16/24/32/48/72 · borders 1px #C9D8E6 · elevation: one soft shadow `0 1px 0 #C9D8E6, 0 8px 24px -16px rgba(11,42,60,.25)` (no heavy drop shadows) · motion: 160 ms (hover/press), 240 ms (panels), stamp 420 ms spring; `prefers-reduced-motion` → all transforms off, opacity only.
Icons: own 24px set drawn on a 1.75 stroke with **square caps** cut at 45° ("receipt-tear" corner) — not Lucide/Heroicons.

## 7. Identity & motif — "Carbon Copy"
Each bill/card can carry a *carbon duplicate*: a second outline offset 4px down-right in Steel Blue at 35% (the blue copy in a Nepali bill book). The **CHUKTA stamp** — a round rubber-stamp mark in sage green with Devanagari "चुक्ता" — lands on an invoice when the last rupee is recorded. Lime marker underline highlights the single most important figure on a screen (amount due).

## 8. Layout plan (different from Day 1 on every axis)
- Nav: **floating inset pill bar** (detached from the edge, surface colour, active item = filled primary pill); mobile = compact bar + full-height sheet from the bottom.
- Homepage: centred hero (headline + one line + 2 CTAs) → **live bill calculator** below the hero (type an amount → taxable, VAT 13%, total, amount in words, BS date; real code, same maths as the API) → **receivables board** strip (Due / Overdue / Chukta columns, sample cards labelled "sample") → 6 features in a 3×2 grid with own icons → "Straight talk on compliance" band (what Chukta is / is not) → pricing as a **Free vs Pro segmented toggle on one card** → FAQ 2-column → one-row footer.
- App (owner): **top app bar + horizontal section tabs** on desktop; **bottom tab bar** (Home, Bills, Clients, Reports) + floating "New bill" button on mobile. Home = 4 KPI tiles + aging bar (0–30 / 31–60 / 61–90 / 90+) + "collected vs billed" bar + bills needing attention.
- Bill editor: line items table (pattern from 21st 25157) → totals panel sticky on desktop, bottom summary on mobile.
- Client ledger: statement table with running balance + "Send reminder" (WhatsApp / copy text).
- Customer portal ("My bills"): list of bills addressed to my email across businesses, outstanding total.
- Admin: tiles + businesses table + users table + audit trail — card grid, not Day 1's "register" ruled style.
- Printable bill page `/i/<token>` (A4/A5 print CSS) with the not-certified footer.

## 9. Proof files (this folder)
`design-proof/coolors-01…09*.jpg` (Coolors signed in, explore pages, shortlist, pick), `design-proof/21st-25157-invoice-line-items.txt`, `design-proof/21st-19070-advanced-stats.txt`, project `design-system/hisaab/MASTER.md` (UI UX Pro Max output).
