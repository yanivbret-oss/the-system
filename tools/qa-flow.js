// End-to-end QA: plays two weeks as a real player on one device, jumping the clock between days.
// Usage: node tools/qa-flow.js <baseUrl> <outDir>
const { chromium } = require('playwright');
const [base = 'http://localhost:8767', out = 'qa-flow'] = process.argv.slice(2);
require('fs').mkdirSync(out, { recursive: true });
const at = (m, d, h = 10, mi = 0) => new Date(2026, m - 1, d, h, mi);
const fails = [];
const check = (ok, what) => { console.log((ok ? 'PASS ' : 'FAIL ') + what); if (!ok) fails.push(what); };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.clock.install({ time: at(10, 25, 10) }); await p.clock.resume();
  const shot = n => p.screenshot({ path: `${out}/${n}.png` });
  const text = () => p.evaluate(() => document.body.innerText);
  const has = async s => (await text()).includes(s);
  const click = async (label, i = 0) => { const l = p.getByLabel(label, { exact: true }); if (await l.count()) { await l.nth(i).click(); await p.waitForTimeout(250); return true; } return false; };
  const tick = async label => { await p.getByLabel(label, { exact: true }).first().click({ position: { x: 10, y: 10 } }); await p.waitForTimeout(200); };
  const okAll = async () => { const seen = []; for (let i = 0; i < 8; i++) { if (!(await p.getByLabel('OK', { exact: true }).count())) break; seen.push((await text()).split('\n').slice(-12).join(' ')); await click('OK'); } return seen.join(' || '); };
  const day = async (d, label) => { await p.clock.setSystemTime(d); await p.reload(); await p.waitForTimeout(1500); console.log('--- ' + label + ' ' + d.toDateString()); };
  const xpLine = async () => ((await text()).match(/\d+ XP to level \d+/) || [''])[0];

  // Day 1, Sunday: onboarding
  await p.goto(base); await p.waitForTimeout(1500);
  await click('Yes'); await click('Understood'); await p.locator('input').fill('Tester'); await click('Next'); await click('Next');
  await p.getByLabel('Home kit').click(); await click('Next'); await p.waitForTimeout(500);
  await p.getByLabel('Push-ups in a row').fill('30'); await p.getByLabel('Pull-ups in a row').fill('10'); await p.getByLabel('Squats in a row').fill('50'); await click('Confirm'); await p.waitForTimeout(800);
  check(await has('Preparation to Become Strong'), 'onboarding lands on home with the daily quest');
  check(await has('300 XP to level 2'), 'starts at level 1 with 0 XP');
  // weigh-in pops up on its own
  check(await p.getByLabel('Weight in kg').count() > 0, 'weigh-in popup opens on first start');
  await p.getByLabel('Weight in kg').fill('92.4'); await click('Report weight'); await p.waitForTimeout(400);
  const n1 = await okAll(); check(n1.includes('92.4'), 'weigh-in notice shows the weight');
  // daily quest
  await click('Accept quest'); await p.waitForTimeout(500);
  for (const g of ['Push-ups', 'Squats', 'Plank']) await tick(g);
  await click('Complete quest'); await p.waitForTimeout(500);
  const n2 = await okAll(); console.log('  notices: ' + n2.slice(-200));
  await click('Back'); await p.waitForTimeout(300);
  await shot('d1-after');
  check((await xpLine()) === '250 XP to level 2', 'XP after daily quest + weigh-in = 50 (' + await xpLine() + ')');

  // Day 2, Monday: gate A
  await day(at(10, 26, 9), 'gate day');
  check(/today.s training/i.test(await text()), 'Monday shows the training gate');
  check(!(await p.getByLabel('Weight in kg').count()), 'no weigh-in popup after weighing this week');
  await click('Accept quest'); await click('Start quest');
  for (let i = 0; i < 80; i++) {
    const btn = p.getByRole('button', { name: /^(Set \d+ of \d+ done|Done|Start|Resume)$/ });
    if (!(await btn.count())) break;
    await btn.first().click(); await p.waitForTimeout(150);
  }
  await click('End quest'); await click('4'); await click('Report to the System'); await p.waitForTimeout(500);
  const n3 = await okAll(); console.log('  notices: ' + n3.slice(-200));
  await click('Back'); await p.waitForTimeout(300);
  await shot('d2-after');
  check((await xpLine()) === '150 XP to level 2', 'XP after gate A = 150 (' + await xpLine() + ')');

  // Day 3 skipped. Day 4, Wednesday: penalty zone
  await day(at(10, 28, 8), 'after a missed day');
  await okAll();
  check(await has('Penalty Zone') || await has('PENALTY'), 'missed Tuesday opens the penalty zone');
  await shot('d4-penalty');
  await click('Enter penalty zone'); await p.waitForTimeout(400);
  for (const g of ['Kettlebell swings', 'Burpees']) await tick(g);
  await shot('d4-penalty-quest');
  if (await p.getByLabel('Complete quest', { exact: true }).isDisabled()) { check(false, 'penalty goals can be ticked'); await b.close(); return; }
  await click('Complete quest'); await p.waitForTimeout(500);
  const n4 = await okAll(); console.log('  notices: ' + n4.slice(0, 300));
  await click('Back'); await p.waitForTimeout(300);
  check(!(await has('ENTER PENALTY ZONE')) && !(await has('Enter penalty zone')), 'penalty cleared unlocks the day');
  check((await xpLine()) === '150 XP to level 2', 'penalty gives no XP (' + await xpLine() + ')');
  await shot('d4-after');

  // Day 9, next Monday: trial ended, last week had a weigh-in so no weigh-in penalty
  await day(at(11, 2, 9), 'day 9');
  const n5 = await okAll(); console.log('  notices: ' + n5.slice(0, 400));
  check(n5.includes('TRIAL ENDED') || n5.includes('trial has ended'), 'trial-ended notice on day 8+');
  check(!n5.includes('did not report your weight'), 'no weigh-in penalty when the week had one');
  await shot('d9');
  await p.waitForTimeout(800); if (await p.getByText('Later', { exact: true }).count()) { await p.getByText('Later', { exact: true }).click(); await p.waitForTimeout(300); }

  // Day 15, the Monday after: week of Nov 1 had no weigh-in
  await day(at(11, 9, 9), 'day 15');
  const n6 = await okAll(); console.log('  notices: ' + n6.slice(0, 400));
  check(n6.includes('did not report your weight'), 'missed weigh-in week is punished');
  await shot('d15');
  await p.waitForTimeout(800); if (await p.getByText('Later', { exact: true }).count()) { await p.getByText('Later', { exact: true }).click(); await p.waitForTimeout(300); }
  await p.getByRole('tab', { name: 'Status' }).click(); await p.waitForTimeout(500);
  check(await has('Weigh-in missed'), 'history lists the missed weigh-in');
  check(await has('-20 XP'), 'history shows -20 XP');
  await shot('d15-status');
  // reload the same day: no second penalty
  await p.reload(); await p.waitForTimeout(1500);
  const n7 = await okAll(); await p.waitForTimeout(800); if (await p.getByText('Later', { exact: true }).count()) await p.getByText('Later', { exact: true }).click(); check(!n7.includes('did not report your weight'), 'penalty is not applied twice');

  // Settings: notifications toggle persists
  await p.getByRole('tab', { name: 'Settings' }).click(); await p.waitForTimeout(300);
  await click('20:00'); await click('Off'); await p.reload(); await p.waitForTimeout(1500); await okAll(); await p.waitForTimeout(800); if (await p.getByText('Later', { exact: true }).count()) await p.getByText('Later', { exact: true }).click();
  await p.getByRole('tab', { name: 'Settings' }).click(); await p.waitForTimeout(300);
  check(!(await has('Daily quest reminder')), 'notifications Off survives a restart');
  await click('On'); await p.waitForTimeout(300);
  check(await has('Daily quest reminder'), 'notifications back On');

  check(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  console.log(fails.length ? '\n' + fails.length + ' FAILED' : '\nALL PASSED');
  await b.close();
})();
