import json, math
from pathlib import Path
from playwright.sync_api import sync_playwright

HTML = 'http://127.0.0.1:8765/TaxTap.html'

sample_entries = []
# 2026/27 tax year months Apr 2026 - Mar 2027, turnover total = 400,000
monthly_income = [28000, 30000, 32000, 29000, 31000, 33000, 34000, 35000, 42000, 36000, 34000, 36000]
assert sum(monthly_income) == 400000
monthly_stock = [9000, 9500, 9800, 9200, 9600, 10200, 10400, 10800, 12500, 11000, 10600, 11000]
monthly_rent = [1800]*12
monthly_util = [420, 430, 450, 440, 445, 460, 470, 480, 520, 500, 490, 495]
monthly_pack = [380, 390, 395, 385, 400, 410, 420, 430, 470, 440, 430, 440]
monthly_staff = [4200, 4300, 4400, 4250, 4350, 4450, 4550, 4650, 5100, 4800, 4700, 4800]
monthly_miles = [120, 110, 130, 125, 140, 145, 150, 155, 170, 160, 150, 145]
months = [
    '2026-04-15','2026-05-15','2026-06-15','2026-07-15','2026-08-15','2026-09-15',
    '2026-10-15','2026-11-15','2026-12-15','2027-01-15','2027-02-15','2027-03-15'
]
uid = 1
for i, d in enumerate(months):
    sample_entries.append({'id': uid, 'type': 'income', 'amount': monthly_income[i], 'category': 'Sales', 'note': 'Flower shop sales', 'date': d}); uid += 1
    sample_entries.append({'id': uid, 'type': 'expense', 'amount': monthly_stock[i], 'category': 'Stock', 'note': 'Flowers and stock', 'date': d}); uid += 1
    sample_entries.append({'id': uid, 'type': 'expense', 'amount': monthly_rent[i], 'category': 'Rent', 'note': 'Shop rent', 'date': d}); uid += 1
    sample_entries.append({'id': uid, 'type': 'expense', 'amount': monthly_util[i], 'category': 'Utilities', 'note': 'Utilities', 'date': d}); uid += 1
    sample_entries.append({'id': uid, 'type': 'expense', 'amount': monthly_pack[i], 'category': 'Packaging', 'note': 'Packaging', 'date': d}); uid += 1
    # staff as dedicated staff entry with gross/ni/pension breakdown
    gross = monthly_staff[i] - 220 - 80
    sample_entries.append({'id': uid, 'type': 'staff', 'amount': monthly_staff[i], 'category': 'Staff cost', 'note': 'Team member · wages', 'date': d, 'grossPay': gross, 'employerNI': 220, 'pension': 80}); uid += 1
    # mileage amount using HMRC approved mileage rates
    miles = monthly_miles[i]
    mileage_amount = round(miles * 0.45, 2)
    sample_entries.append({'id': uid, 'type': 'mileage', 'amount': mileage_amount, 'miles': miles, 'category': 'Travel', 'note': 'Supplier run', 'date': d}); uid += 1

sample_state = {
    'currentTab': 'home',
    'selectedTaxYear': '2026/27',
    'selectedQuarter': 'all',
    'activeSettingsYear': '2026/27',
    'profile': {
        'fullName': 'Asha Florals',
        'address1': '12 Market Row',
        'address2': 'Birmingham',
        'postcode': 'B1 1AA',
        'email': 'owner@example.com',
        'phone': '07123456789',
        'businessName': 'Asha Flower Shop',
        'utr': '1234567890',
        'taxCode': '1257L',
        'niNumber': 'QQ123456C'
    },
    'entries': sample_entries,
    'documents': [{'id':1,'name':'invoice.pdf'},{'id':2,'name':'receipt.pdf'},{'id':3,'name':'statement.pdf'}],
    'recurring': [],
    'auditLog': [],
    'mileage': {'primary':0.45,'secondary':0.25,'limit':10000},
    'ui': {'reportView':'quarter','date':'2026-04-15'}
}

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--allow-file-access-from-files'])
    page = browser.new_page()
    page.goto(HTML)
    page.wait_for_timeout(500)
    page.evaluate("(payload) => { state = normalizeState(payload); save(); render(); }", sample_state)
    page.wait_for_timeout(300)

    # home screen checks
    prep_exists = page.locator('#prepBtn').count()
    ready_exists = page.locator('#readyBtn').count()
    hmrc_button_count = 0

    # collect annual and quarterly totals from app code
    results = page.evaluate("""() => {
      const annual = totals(periodEntries('2026/27','all'),'2026/27');
      const out = {annual};
      ['Q1','Q2','Q3','Q4'].forEach(q => out[q] = totals(periodEntries('2026/27', q), '2026/27'));
      return out;
    }""")

    # test prepare figures screen and HMRC filing button
    page.click('#prepBtn')
    page.wait_for_timeout(200)
    hmrc_button_count = page.locator('#openHmrcFileBtn').count()
    hmrc_button_text = page.locator('#openHmrcFileBtn').inner_text() if hmrc_button_count else ''
    period_heading = page.locator('text=2026/27').first.inner_text()

    # settings button existence
    page.evaluate("() => { state.currentTab='settings'; save(); render(); }")
    page.wait_for_timeout(200)
    settings_hmrc_text = page.locator('#hmrcGuideBtn').inner_text()

    browser.close()

report = {
    'ui_checks': {
        'home_ready_button_present': bool(ready_exists),
        'home_prepare_button_present': bool(prep_exists),
        'prep_hmrc_button_present': bool(hmrc_button_count),
        'prep_hmrc_button_text': hmrc_button_text,
        'settings_hmrc_button_text': settings_hmrc_text,
        'prep_heading_sample': period_heading,
    },
    'results': results,
}
Path('/tmp/taxtap/test_results.json').write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))
