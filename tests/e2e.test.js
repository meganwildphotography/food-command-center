// E2E: node tests/e2e.test.js  (needs playwright-core + Chrome, local server on :8765)
const path = require('path');
const { chromium } = require(process.env.PW || '/tmp/pwtest/node_modules/playwright-core');
const BASE = process.env.BASE || 'http://127.0.0.1:8765/';
const OUT = path.join(__dirname, '..');
const res = []; let fail = 0;
function ok(name, cond, info) { res.push((cond ? 'PASS  ' : 'FAIL  ') + name + (info ? '\n      → ' + info : '')); if (!cond) fail++; }
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, timezoneId: 'America/New_York', locale: 'en-US',
    userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S921U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(BASE); await page.evaluate(() => localStorage.clear()); await page.goto(BASE + '#home'); await page.waitForSelector('.g-feed');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, 'screenshot-home.png') });
  await page.screenshot({ path: path.join(OUT, 'screenshot-home-full.png'), fullPage: true });
  const homeText = await page.textContent('#app');
  ok('Home shows Tonight, Mark/Kaden/Winter/Megan cards, Use First, Shopping, giant buttons',
    ['Tonight’s dinner', 'Mark', 'Kaden', 'Winter', 'Megan', 'Use first', 'Shopping', 'FEED EVERYBODY', 'WHAT DO I NEED?', 'FEED MARK', 'Pantry · Fridge · Freezer', 'Kids', 'Budget'].every(s => homeText.includes(s)));
  ok('Routines on first open: Tuesday adds Corn; Sunday only needs Locatelli', /Tuesday dinner: I added Corn/.test(homeText) && /Macaroni Day: everything else is in the house\. Just need Locatelli/.test(homeText));
  const tell = async (ctxId, text) => { await page.fill('#tell-' + ctxId, text); await page.click('form[data-ctx="' + ctxId + '"] button.go'); await page.waitForTimeout(250); };

  // 1
  await tell('home', 'I have chicken, rice, cheese and tortillas, what can I make?');
  const now1 = await page.textContent('#make-now');
  const firstPlates = await page.$$eval('#make-now .mealcard:first-of-type .plate-row', els => els.map(e => e.textContent.replace('Won’t eat that', '').trim()));
  ok('1) chicken/rice/cheese/tortillas → options per person', /Quesadillas/.test(now1) && /Chicken & Rice/.test(now1) && /Wraps/.test(now1) && firstPlates.length === 4,
    'Top: ' + (await page.textContent('#make-now .mealcard:first-of-type h3')) + ' | ' + firstPlates.join(' | '));

  // 2
  await page.click('[data-go="home"]'); await tell('home', 'Mark works tomorrow');
  const mp = await page.$$eval('#mark-plan .mark-meal', els => els.map(e => e.textContent));
  ok('2) "Mark works tomorrow" → one work meal', mp.length === 1 && /Sunday/.test(mp[0]), mp[0]);

  // 3
  await page.click('.nav [data-go="inv"]'); await tell('inv', 'eggs');
  const hadEggs = await page.evaluate(() => FCCApp.state.inventory.some(i => /egg/i.test(i.name)));
  await tell('inv', "We're out of eggs");
  const st3 = await page.evaluate(() => ({ inv: FCCApp.state.inventory.some(i => /egg/i.test(i.name)), shop: FCCApp.state.shopping.some(i => /egg/i.test(i.name) && !i.checked) }));
  await page.click('.nav [data-go="shop"]'); const shopHasEggs = await page.$('[data-shop="Eggs"]');
  ok('3) "We\'re out of eggs" → removed from inventory + on shopping list', hadEggs && !st3.inv && st3.shop && !!shopHasEggs, 'shop list row present: ' + !!shopHasEggs);

  // 4
  await page.goto(BASE + '#kids'); await page.waitForSelector('#kid-kaden .kid-sugs .item');
  const target = await page.getAttribute('#kid-kaden .kid-sugs .item:first-child', 'data-meal');
  await page.click('#kid-kaden .kid-sugs .item[data-meal="' + target + '"] .wont'); await page.waitForTimeout(150);
  const after1 = !!(await page.$('#kid-kaden .kid-sugs .item[data-meal="' + target + '"]'));
  await page.click('#kid-kaden .kid-sugs .item[data-meal="' + target + '"] .wont'); await page.waitForTimeout(150);
  const after2 = !!(await page.$('#kid-kaden .kid-sugs .item[data-meal="' + target + '"]'));
  const winterStill = !!(await page.$('#kid-winter .kid-sugs .item[data-meal="' + target + '"]'));
  ok('4) Kaden "Won’t eat that" ×2 → stops suggesting it (Winter unaffected)', after1 && !after2 && winterStill, target + ': after 1 tap shown=' + after1 + ', after 2 taps shown=' + after2 + ', Winter still sees it=' + winterStill);

  // 5
  await page.goto(BASE + '#make'); await page.click('[data-act="leftover"][data-v="chicken"]');
  const lo = await page.$$eval('#leftover-ideas .mealcard h3', els => els.map(e => e.textContent));
  ok('5) Leftover chicken → reuse ideas', lo.length >= 4, lo.join(', '));

  // 6
  await page.goto(BASE + '#feed'); await page.click('[data-act="feedset"][data-k="energy"][data-v="5"]'); await page.click('[data-act="feedset"][data-k="time"][data-v="15"]');
  await page.click('[data-act="feedgo"]'); await page.waitForSelector('#feed-meal-name');
  const meal6 = await page.textContent('#feed-meal-name'); const nres = (await page.$$('#feed-result')).length; const nsteps = (await page.$$('#feed-result .steps li')).length;
  await page.click('[data-act="feedelse"]'); const meal6b = await page.textContent('#feed-meal-name');
  ok('6) Exhausted (5%) + 15 min → ONE meal', nres === 1 && /Pizza|Burger/.test(meal6) && nsteps >= 3 && nsteps <= 5, meal6.trim() + ' · ' + nsteps + ' steps · "Something else" → ' + meal6b.trim());
  await page.screenshot({ path: path.join(OUT, 'screenshot-feed.png') });

  // 7
  await page.goto(BASE + '#deals');
  const chickenId = await page.evaluate(() => FCCApp.state.pricebook.find(p => p.name === 'Chicken breast').id);
  await page.selectOption('#pb-item', chickenId); await page.fill('#pb-price', '1.89'); await page.click('form[data-form="verdict"] button');
  const v7 = await page.textContent('#verdict');
  await page.fill('#pb-price', '3.79'); await page.click('form[data-form="verdict"] button'); const v7b = await page.textContent('#verdict');
  ok('7) Price book verdict', /Stock up/.test(v7) && /Wait/.test(v7b), 'Chicken breast $1.89 → ' + v7.trim() + ' · $3.79 → ' + v7b.trim());

  // Extras
  await page.goto(BASE + '#shop'); await tell('shop', 'bought everything except bananas');
  await tell('shop', 'add bananas'); await tell('shop', 'bought everything except bananas');
  const open = await page.evaluate(() => FCCApp.state.shopping.filter(s => !s.checked).map(s => s.name));
  ok('Extra: "bought everything except bananas"', open.length === 1 && open[0] === 'Bananas', 'open: ' + open.join(','));
  await page.goto(BASE + '#budget'); await page.click('[data-act="spendquick"][data-v="50"]');
  ok('Extra: budget logs spend', /\$150\.00/.test(await page.textContent('#budget-left')));
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('fcc-megan-v1')); s.lastOpened = new Date(Date.now() - 4 * 864e5).toISOString(); localStorage.setItem('fcc-megan-v1', JSON.stringify(s)); });
  await page.goto(BASE + '#home'); await page.reload(); await page.waitForSelector('.g-feed');
  ok('Extra: "Welcome back" after days away', !!(await page.$('.welcome')) && /Welcome back\. Here’s what needs attention\./.test(await page.textContent('.welcome')));
  const sw = await page.evaluate(async () => { const r = await navigator.serviceWorker.ready; return !!r.active; });
  await page.waitForTimeout(800);
  await ctx.setOffline(true); await page.reload(); await page.waitForSelector('.g-feed', { timeout: 5000 }).catch(() => {});
  ok('Extra: service worker + works offline', sw && !!(await page.$('.g-feed')));
  await ctx.setOffline(false);
  const exp = await page.evaluate(() => { const s = JSON.stringify(FCCApp.state); return JSON.parse(s).inventory.length > 0; });
  ok('Extra: no JS errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(res.join('\n')); console.log('\n' + (res.length - fail) + ' passed, ' + fail + ' failed');
  await browser.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
