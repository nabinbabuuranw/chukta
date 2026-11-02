
import json, sys, time, re, os
from playwright.sync_api import sync_playwright
BASE=os.environ.get('BASE','https://chukta.sites.tab.bot')
OUT=sys.argv[1]; creds=json.load(open(sys.argv[2])); os.makedirs(OUT, exist_ok=True)
stamp=str(int(time.time())); PW='Kathmandu2083x'
log=[]; errors=[]
def ok(name, cond, detail=''):
    log.append({'check':name,'pass':bool(cond),'detail':detail}); print(('PASS ' if cond else 'FAIL ')+name+(' :: '+detail if detail else ''), flush=True)
def watch(page):
    page.on('console', lambda m: errors.append(f'{page.url} console.{m.type}: {m.text}') if m.type=='error' else None)
    page.on('pageerror', lambda e: errors.append(f'{page.url} pageerror: {e}'))
def shot(page, name, full=False):
    page.wait_for_timeout(700); page.screenshot(path=f'{OUT}/{name}.png', full_page=full)
def login(page, email, pw):
    page.goto(BASE+'/login'); page.fill('input[type=email]', email); page.fill('input[type=password]', pw)
    page.click('form button:has-text("Sign in")'); page.wait_for_url(re.compile(r'/(app|my|admin)'), timeout=20000); page.wait_for_load_state('networkidle')
def tryit(name, fn):
    try: fn()
    except Exception as e: ok(name, False, str(e)[:300])
owner_email=f'e2e-owner-{stamp}@chukta.test'; buyer_email=f'e2e-buyer-{stamp}@chukta.test'
state={}
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={'width':1440,'height':900}, accept_downloads=True); page=ctx.new_page(); watch(page)
    def home():
        page.goto(BASE+'/'); page.wait_for_selector('h1:has-text("Make the bill")')
        ok('home: hero renders', True); shot(page,'d-home-hero')
        page.fill('#calc-amt','100000'); page.wait_for_timeout(300)
        txt=page.locator('[aria-live=polite]').first.inner_text()
        ok('home: calculator VAT 13% on 1,00,000 = 1,13,000.00', 'Rs 1,13,000' in txt and 'One Lakh Thirteen Thousand' in txt, txt[:160].replace('\n',' '))
        page.check('text=Customer has paid it all'); page.wait_for_selector('svg[aria-label^="Paid in full"]'); ok('home: paid stamp appears', True)
        page.locator('#calc-h').scroll_into_view_if_needed(); shot(page,'d-home-calculator')
        page.click('text=PAN only'); page.wait_for_timeout(200); t2=page.locator('[aria-live=polite]').first.inner_text(); ok('home: PAN-only removes VAT', 'Rs 1,00,000' in t2)
        page.locator('#how').scroll_into_view_if_needed(); shot(page,'d-home-board')
        page.locator('#features').scroll_into_view_if_needed(); shot(page,'d-home-features')
        page.locator('#pricing').scroll_into_view_if_needed(); page.click('text=Yearly · 2 months free'); ok('home: pricing toggle yearly', page.locator('text=Rs 7,990').count()>0); shot(page,'d-home-pricing')
        page.locator('#faq').scroll_into_view_if_needed(); page.locator('summary').first.click(); shot(page,'d-home-faq')
        page.screenshot(path=f'{OUT}/d-home-full.png', full_page=True)
    tryit('home', home)
    def legal():
        for u,t in [('/terms','Terms of use'),('/privacy','Privacy')]:
            page.goto(BASE+u); page.wait_for_selector(f'h1:has-text("{t}")'); ok(f'legal page {u}', page.locator('text=not certified').count()+page.locator('text=No ads').count()>0)
        shot(page,'d-privacy')
        page.goto(BASE+'/nope-xyz'); page.wait_for_selector('text=isn\'t on the books'); ok('404 page', True)
        page.goto(BASE+'/app'); page.wait_for_url(re.compile('/login'), timeout=15000); ok('guard: /app without login -> /login', True)
    tryit('legal', legal)
    def register():
        page.goto(BASE+'/register'); page.fill('input[autocomplete=name]','E2E Owner'); page.fill('input[type=email]', owner_email); page.fill('input[type=password]', PW)
        page.get_by_label('Business name').fill(f'E2E Hardware {stamp}'); page.get_by_label('PAN / VAT number').fill('123')
        page.click('button:has-text("Create account")'); page.wait_for_selector('text=PAN (9 digits)', timeout=10000); ok('register: invalid PAN shows field error', True)
        page.get_by_label('PAN / VAT number').fill('301234567'); shot(page,'d-register')
        page.click('button:has-text("Create account")'); page.wait_for_url(re.compile('/app$'), timeout=20000); page.wait_for_selector("h1:has-text(\"Today's dues\")")
        ok('register: owner lands on dashboard', True); ok('dashboard: empty state for new business', page.locator('text=No open bills').count()>0); shot(page,'d-app-empty')
    tryit('register', register)
    def customer():
        page.click('nav >> text=Customers'); page.wait_for_selector('text=No customers yet'); page.click('button:has-text("Add your first customer")')
        page.get_by_label('Customer or company name').fill('Annapurna Traders'); page.get_by_label('PAN (optional)').fill('600123456'); page.get_by_label('Mobile (optional)').fill('9841234567'); page.get_by_label('Email (optional)').fill(buyer_email)
        shot(page,'d-customer-sheet'); page.click('[role=dialog] button:has-text("Add customer")'); page.wait_for_selector('a:has-text("Annapurna Traders")'); ok('customer: added', True)
    tryit('customer', customer)
    def bill():
        page.goto(BASE+'/app/bills/new'); page.wait_for_selector('h1:has-text("New bill")')
        page.get_by_label('Customer', exact=True).select_option(label='Annapurna Traders · PAN 600123456')
        page.fill('#d0','Cement OPC 50kg'); page.fill('#q0','40'); page.fill('#u0','bag'); page.fill('#r0','850')
        page.click('button:has-text("Add item")'); page.fill('#d1','Delivery to site'); page.fill('#q1','1'); page.fill('#r1','1500')
        page.locator('#d1').locator('xpath=ancestor::li').locator('input[type=checkbox]').uncheck()
        page.get_by_label('Discount (Rs)').fill('500'); page.wait_for_timeout(300)
        side=page.locator('aside[aria-label=Totals]').inner_text(); state['side']=side
        # taxable 34000-478.87=33521.13 ; non 1478.87 ; vat round(3352113*0.13)=435775 paisa ; total 39357.75
        ok('editor: live totals (pro-rata discount, VAT on taxable only)', 'Rs 39,357.75' in side, side.replace('\n',' ')[:200]); shot(page,'d-bill-editor')
        page.click('button:has-text("Issue bill")'); page.wait_for_url(re.compile(r'/app/bills/\d+$'), timeout=20000); page.wait_for_selector('h1:has-text("INV-")')
        num=page.locator('h1').inner_text(); state['num']=num; state['bill_url']=page.url
        ok('bill: issued with FY number', re.match(r'^INV-20\d\d/\d\d-0001$', num) is not None, num)
        ok('bill: server total matches editor', page.locator('article >> text=Rs 39,357').count()>0)
        ok('bill: not-certified footer on bill', page.locator('text=not IRD-certified billing software').count()>0); shot(page,'d-bill-issued', full=True)
        page.click('button:has-text("Record payment")'); page.get_by_label('Amount received (Rs)').fill('20000'); page.get_by_label('Method').select_option('khalti'); page.get_by_label('Reference (optional)').fill('KH-778')
        page.click('button:has-text("Save payment")'); page.wait_for_selector('h1 ~ div >> text=Part paid', timeout=15000); ok('payment: partial -> Part paid', True)
        page.click('button:has-text("Record payment")'); page.wait_for_timeout(300); page.click('button:has-text("Save payment")')
        page.wait_for_selector('svg[aria-label^="Paid in full"]', timeout=15000); ok('payment: full -> Chukta stamp', page.locator('text=Chukta').count()>0); shot(page,'d-bill-paid', full=True)
    tryit('bill', bill)
    def overdue_and_remind():
        page.goto(BASE+'/app/bills/new'); page.wait_for_selector('h1:has-text("New bill")')
        page.get_by_label('Customer', exact=True).select_option(label='Annapurna Traders · PAN 600123456')
        page.get_by_label('Bill date').fill('2026-09-20'); page.get_by_label('Due date').fill('2026-10-05')
        page.fill('#d0','Steel rod 12mm'); page.fill('#q0','25'); page.fill('#u0','pcs'); page.fill('#r0','1240')
        page.click('button:has-text("Issue bill")'); page.wait_for_url(re.compile(r'/app/bills/\d+$'), timeout=20000); page.wait_for_selector('text=Overdue')
        ok('overdue: past due date shows Overdue with days', page.locator('text=/Overdue · \\d+d/').count()>0)
        page.click('button:has-text("Remind")'); page.wait_for_selector('[role=dialog] p[lang=ne]'); t=page.locator('[role=dialog] p[lang=ne]').inner_text()
        ok('reminder: Nepali text with balance and link', 'बाँकी' in t and '/i/' in t, t[:80]); shot(page,'d-reminder')
        page.click('[role=dialog] button:has-text("English")'); page.wait_for_selector('[role=dialog] p[lang=en]'); ok('reminder: English variant', 'outstanding' in page.locator('[role=dialog] p[lang=en]').inner_text())
        with ctx.expect_page() as pi: page.click('button:has-text("Open WhatsApp")')
        wa=pi.value; wurl=wa.url; wa.close(); ok('reminder: opens WhatsApp deep link to +977 number', 'wa.me/9779841234567' in wurl or 'whatsapp' in wurl, wurl[:80])
        page.keyboard.press('Escape'); page.reload(); page.wait_for_selector('text=reminded 1×', timeout=10000); ok('reminder: logged on bill', True)
        state['token']=page.locator('a:has-text("Open the customer view")').get_attribute('href')
    tryit('overdue', overdue_and_remind)
    def dash_ledger_reports():
        page.goto(BASE+'/app'); page.wait_for_selector('text=How late is the money?'); ok('dashboard: aging bar shows overdue', page.locator('[role=img][aria-label^="Overdue by age"]').count()>0); shot(page,'d-dashboard')
        page.goto(BASE+'/app/clients'); page.click('a:has-text("Annapurna Traders")'); page.wait_for_selector('text=Balance owed to you')
        ok('ledger: running balance = Rs 35,030.00 (overdue bill only)', page.locator('text=Rs 35,030').count()>0); shot(page,'d-ledger')
        with page.expect_download() as d: page.click('button:has-text("Statement CSV")')
        path=d.value.path(); body=open(path,encoding='utf-8-sig').read(); ok('ledger: CSV statement downloads', 'Balance (Rs)' in body and 'Annapurna' not in body.split('\n')[0], body.split('\n')[0])
        page.goto(BASE+'/app/reports'); page.wait_for_selector('h1:has-text("VAT sales register")'); shot(page,'d-reports')
        ok('reports: register lists this month bill', page.locator('td:has-text("INV-")').count()>=1)
        page.goto(BASE+'/app/bills?status=overdue'); page.wait_for_selector('text=Steel'.replace('Steel','Annapurna')); ok('bills: overdue filter', page.locator('tbody tr').count()==1); shot(page,'d-bills-list')
        page.goto(BASE+'/app/settings'); page.get_by_label('How to pay you (printed on bills and reminders)').fill('eSewa 9841XXXXXX (test)'); page.click('button:has-text("Save settings")'); page.wait_for_selector('text=Saved'); ok('settings: save', True)
    tryit('dash', dash_ledger_reports)
    def public_and_portal():
        c2=b.new_context(viewport={'width':1440,'height':900}); p2=c2.new_page(); watch(p2)
        p2.goto(BASE+state['token']); p2.wait_for_selector('article'); ok('public bill: opens without login', p2.locator('text=Annapurna Traders').count()>0 and p2.locator('text=Overdue').count()>0); shot(p2,'d-public-bill', full=True)
        p2.goto(BASE+'/register'); p2.click('text=I receive bills'); p2.fill('input[autocomplete=name]','E2E Buyer'); p2.fill('input[type=email]', buyer_email); p2.fill('input[type=password]', PW)
        p2.click('button:has-text("Create account")'); p2.wait_for_url(re.compile('/my$'), timeout=20000); p2.wait_for_selector('text=You still owe in total')
        ok('customer portal: sees both bills from the business', p2.locator('li a').count()==2); shot(p2,'d-customer-portal')
        p2.goto(BASE+'/app'); p2.wait_for_url(re.compile(r'/$'), timeout=15000); ok('RBAC: customer redirected away from /app', True)
        c2.close()
    tryit('portal', public_and_portal)
    def admin():
        c3=b.new_context(viewport={'width':1440,'height':900}); p3=c3.new_page(); watch(p3)
        login(p3, creds['admin']['email'], creds['admin']['password']); p3.wait_for_selector('text=Issued bills'); p3.wait_for_selector('tbody tr', timeout=15000)
        ok('admin: overview + businesses list has new business', p3.locator(f'text=E2E Hardware {stamp}').count()>0); shot(p3,'d-admin')
        p3.click('a:has-text("Audit trail")'); p3.wait_for_selector('text=invoice.issue'); ok('admin: audit trail', True); shot(p3,'d-admin-audit')
        c3.close()
    tryit('admin', admin)
    def demo():
        c4=b.new_context(viewport={'width':1440,'height':900}); p4=c4.new_page(); watch(p4)
        p4.goto(BASE+'/login?demo=1'); p4.wait_for_selector('text=Demo business (shared sample data)'); shot(p4,'d-login-demo')
        p4.click('form button:has-text("Sign in")'); p4.wait_for_url(re.compile('/app$')); p4.wait_for_selector('text=Needs a nudge'); ok('demo owner: dashboard with sample bills', p4.locator('text=Demo client').count()>0); shot(p4,'d-demo-dashboard')
        c4.close()
    tryit('demo', demo)
    ctx.close()
    # ---------- mobile 390
    m=b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, is_mobile=True, has_touch=True); mp=m.new_page(); watch(mp)
    def mobile():
        mp.goto(BASE+'/'); mp.wait_for_selector('h1'); shot(mp,'m-home-hero')
        sw=mp.evaluate('document.documentElement.scrollWidth'); ok('mobile: no horizontal scroll on home', sw<=390, str(sw))
        mp.click('button[aria-label="Open menu"]'); mp.wait_for_selector('#mnav'); shot(mp,'m-menu'); mp.click('button[aria-label="Close menu"]')
        mp.locator('section[aria-labelledby=calc-h]').screenshot(path=f'{OUT}/m-home-calculator.png')
        mp.locator('#how').scroll_into_view_if_needed(); shot(mp,'m-home-board')
        mp.locator('#pricing').scroll_into_view_if_needed(); shot(mp,'m-home-pricing')
        login(mp, owner_email, PW); mp.wait_for_selector('text=How late is the money?'); shot(mp,'m-dashboard')
        ok('mobile: bottom tab bar visible', mp.locator('nav[aria-label=Sections] >> visible=true').count()>=1)
        for u in ['/app','/app/bills','/app/clients','/app/reports','/app/settings']:
            mp.goto(BASE+u); mp.wait_for_load_state('networkidle'); sw=mp.evaluate('document.documentElement.scrollWidth'); ok(f'mobile: no horizontal scroll {u}', sw<=390, str(sw))
        mp.goto(BASE+'/app/bills'); mp.wait_for_selector('tbody tr'); shot(mp,'m-bills')
        mp.goto(BASE+'/app/bills/new'); mp.wait_for_selector('h1:has-text("New bill")'); mp.fill('#d0','Paint 20L'); mp.fill('#r0','7800'); shot(mp,'m-bill-editor', full=True)
        mp.goto(state['bill_url']); mp.wait_for_selector('article'); shot(mp,'m-bill-paid', full=True)
        mp.goto(BASE+state['token']); mp.wait_for_selector('article'); shot(mp,'m-public-bill', full=True)
    tryit('mobile', mobile)
    m.close()
    # ---------- breakpoints + reduced motion
    for w in [375,768,1024,1440]:
        c=b.new_context(viewport={'width':w,'height':900}); pg=c.new_page()
        pg.goto(BASE+'/'); pg.wait_for_selector('h1'); sw=pg.evaluate('document.documentElement.scrollWidth'); ok(f'breakpoint {w}: home fits', sw<=w, str(sw)); pg.screenshot(path=f'{OUT}/bp-{w}-home.png')
        c.close()
    rm=b.new_context(viewport={'width':1280,'height':800}, reduced_motion='reduce'); rp=rm.new_page(); rp.goto(BASE+'/'); rp.wait_for_selector('h1')
    dur=rp.evaluate("getComputedStyle(document.querySelector('.rise')).animationDuration"); ok('reduced motion: animations collapse', dur in ('1e-06s','0.001ms','1e-6s') or dur.startswith('1e-') or dur=='0s', dur)
    rm.close(); b.close()
fails=[l for l in log if not l['pass']]
json.dump({'checks':log,'console_errors':errors,'passed':len(log)-len(fails),'total':len(log)}, open(f'{OUT}/e2e-result.json','w'), indent=2)
print(f'{len(log)-len(fails)}/{len(log)} passed; console errors: {len(errors)}'); [print('ERR',e) for e in errors[:15]]
