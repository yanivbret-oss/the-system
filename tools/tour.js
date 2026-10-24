// Screenshot tour of every screen and state. Usage: node tools/tour.js <baseUrl> <outDir>
// Seeds on-device storage (localStorage on web) and fixes the clock for each scenario.
const { chromium } = require('playwright');
const [base = 'http://localhost:8767', out = 'shots'] = process.argv.slice(2);
require('fs').mkdirSync(out, { recursive: true });

const at = (y, m, d, h = 10, mi = 0) => new Date(y, m - 1, d, h, mi).getTime();
const NAMES = { A: 'Legs + Kettlebell', B: 'Upper Body + Pull-ups', C: 'Run + Rounds', D: 'Red Gate', Q: 'Preparation to Become Strong', S: 'Secret Quest', W: 'Weigh-in', P: 'Penalty Quest' };
const rec = (key, t, extra = {}) => ({ key, workout: NAMES[key] || key, week: 1, date: '', createdAt: t, totalSec: key.match(/[ABCD]/) ? 2400 : 0, exercises: [], score: '', feel: 4, hard: '', ...extra });
const profile = { name: 'Yaniv', startDate: '2026-10-25', rank: 'E' };
// one realistic week: Sun Q, Mon A, Tue Q, Wed B, Thu Q, Fri C, Sat D
const week1 = [rec('Q', at(2026,10,25,19)), rec('A', at(2026,10,26,9,50), { score: '06:12' }), rec('Q', at(2026,10,27,20)), rec('B', at(2026,10,28,9,45), { score: '4 rounds' }), rec('Q', at(2026,10,29,18))];
const many = (() => { const h = []; for (let w = 0; w < 3; w++) { const o = w * 7; h.push(rec('Q', at(2026,10,4+o,19)), rec('A', at(2026,10,5+o,9)), rec('Q', at(2026,10,6+o,20)), rec('B', at(2026,10,7+o,9)), rec('Q', at(2026,10,8+o,7,10)), rec('C', at(2026,10,9+o,9), { score: '5 rounds' }), rec('W', at(2026,10,9+o,7), { kg: 92 - w * 0.7 }), rec('D', at(2026,10,10+o,11), { score: '24:10', feel: w === 2 ? 5 : 3 })); } return h.reverse(); })();
const sess = (key, day, extra = {}) => ({ v: 3, key, week: 1, day: new Date(day).toDateString(), startedAt: null, endedAt: null, items: {}, active: null, feel: 0, ...extra });

const scenarios = [
  { name: '01-awakening', time: at(2026,10,25) },
  { name: '02-awakening-refused', time: at(2026,10,25), act: async p => { await p.getByLabel('No').click(); } },
  { name: '03-briefing', time: at(2026,10,25), act: async p => { await p.getByLabel('Yes').click(); } },
  { name: '03b-registration', time: at(2026,10,25), act: async p => { await p.getByLabel('Yes').click(); await p.waitForTimeout(500); await p.getByLabel('Understood').click(); await p.locator('input').fill('Yaniv'); } },
  { name: '03c-training-days', time: at(2026,10,25), act: async p => { await p.getByLabel('Yes').click(); await p.waitForTimeout(500); await p.getByLabel('Understood').click(); await p.locator('input').fill('Yaniv'); await p.getByLabel('Next').click(); } },
  { name: '03d-equipment', time: at(2026,10,25), act: async p => { await p.getByLabel('Yes').click(); await p.waitForTimeout(500); await p.getByLabel('Understood').click(); await p.locator('input').fill('Yaniv'); await p.getByLabel('Next').click(); await p.waitForTimeout(400); await p.getByLabel('Next').click(); await p.waitForTimeout(400); await p.getByLabel('No equipment').click(); } },
  { name: '04-home-first-day', time: at(2026,10,25), seed: { profile } , scroll: true },
  { name: '05-home-training-day', time: at(2026,10,26, 8), seed: { profile, history: [rec('Q', at(2026,10,25,19))] }, scroll: true },
  { name: '06-home-rest-day-secret', time: at(2026,10,29, 9), seed: { profile, history: week1.slice(0, 4).reverse() }, scroll: true },
  { name: '07-home-penalty', time: at(2026,10,28, 8), seed: { profile, history: [rec('A', at(2026,10,26,9)), rec('Q', at(2026,10,25,19))] }, scroll: true },
  { name: '08-home-cleared-weighin', time: at(2026,10,30, 11), seed: { profile, history: [rec('C', at(2026,10,30,10)), ...week1.slice().reverse()] }, scroll: true },
  { name: '09-status', time: at(2026,10,26, 12), seed: { profile: { ...profile, startDate: '2026-10-04', rank: 'D' }, history: many, 'ach-seen': ['Awakening','Gate Opener'] }, act: async p => { await p.getByRole('tab', { name: 'Status' }).click(); }, scroll: true },
  { name: '10-status-history', time: at(2026,10,26, 12), seed: { profile: { ...profile, startDate: '2026-10-04' }, history: many }, act: async p => { await p.getByRole('tab', { name: 'Status' }).click(); }, end: true },
  { name: '11-quest-before-start', time: at(2026,10,26, 9), seed: { profile, history: [rec('Q', at(2026,10,25,19))] }, act: async p => { await p.getByLabel('Accept quest').click(); }, scroll: true },
  { name: '12-quest-running-emom', time: at(2026,10,26, 9, 30), seed: { profile, session: sess('A', at(2026,10,26), { startedAt: at(2026,10,26,9,5), active: 'a4', items: { warm: { sec: 480, done: true }, a1: { sec: 420, done: true, sets: [true,true,true,true] }, a2: { sec: 400, done: true }, a3: { sec: 380, done: true }, a4: { sec: 0, runningSince: at(2026,10,26,9,26,0), lastBeepMin: 3 } } }) }, scroll: true },
  { name: '13-quest-sets', time: at(2026,10,26, 9, 12), seed: { profile, session: sess('A', at(2026,10,26), { startedAt: at(2026,10,26,9,0), active: 'a1', items: { warm: { sec: 480, done: true }, a1: { sec: 0, runningSince: at(2026,10,26,9,9), sets: [true,true] } } }) } },
  { name: '14-quest-report', time: at(2026,10,26, 9, 50), seed: { profile, session: sess('A', at(2026,10,26), { startedAt: at(2026,10,26,9,0), endedAt: at(2026,10,26,9,48), items: { warm: { sec: 480, done: true }, a1: { sec: 600, done: true }, a2: { sec: 500, done: true }, a3: { sec: 450, done: true }, a4: { sec: 600, done: true }, a5: { sec: 372, done: true } } }) }, end: true },
  { name: '15-popup-quest-complete-levelup', time: at(2026,10,26, 9, 50), seed: { profile, history: [rec('Q', at(2026,10,25,19)), rec('S', at(2026,10,25,12)), rec('W', at(2026,10,25,8), {kg: 92}), rec('Q', at(2026,10,24,19)), rec('Q', at(2026,10,23,19)), rec('Q', at(2026,10,22,19)), rec('Q', at(2026,10,21,19)), rec('Q', at(2026,10,20,19))], 'ach-seen': ['Awakening','Shadow'], session: sess('A', at(2026,10,26), { startedAt: at(2026,10,26,9,0), endedAt: at(2026,10,26,9,48), feel: 4, items: { warm: { sec: 480, done: true }, a5: { sec: 372, done: true } } }) }, act: async p => { await p.getByLabel('Report to the System').click(); }, end: true },
  { name: '16-popup-achievement', time: at(2026,10,26, 9, 50), seed: { profile, history: [rec('Q', at(2026,10,25,19))], 'ach-seen': [], session: sess('A', at(2026,10,26), { startedAt: at(2026,10,26,9,0), endedAt: at(2026,10,26,9,48), items: { a5: { sec: 372, done: true } } }) }, act: async p => { await p.getByLabel('Report to the System').click(); await p.waitForTimeout(600); } },
  { name: '17-daily-quest-counter', time: at(2026,10,27, 19), seed: { profile, history: [rec('A', at(2026,10,26,9)), rec('Q', at(2026,10,25,19))], session: sess('Q', at(2026,10,27), { counts: { push: 20, squat: 15 } }) }, act: async p => { await p.getByLabel('Accept quest').click(); }, scroll: true },
  { name: '18-daily-quest-plank-running', time: at(2026,10,27, 19), seed: { profile, history: [rec('A', at(2026,10,26,9)), rec('Q', at(2026,10,25,19))], session: sess('Q', at(2026,10,27), { counts: { push: 20, squat: 30, plank: 10 }, plankSince: at(2026,10,27,18,59,40) }) }, act: async p => { await p.getByLabel('Accept quest').click(); } },
  { name: '19-penalty-quest', time: at(2026,10,28, 8), seed: { profile, history: [rec('A', at(2026,10,26,9)), rec('Q', at(2026,10,25,19))] }, act: async p => { await p.getByLabel('Enter penalty zone').click(); } },
  { name: '20-red-gate-quest', time: at(2026,10,31, 10), seed: { profile, history: [rec('C', at(2026,10,30,10)), ...week1.slice().reverse()] }, act: async p => { await p.getByLabel('Accept quest').click(); }, scroll: true },
  { name: '21-red-gate-running', time: at(2026,10,31, 10, 20), seed: { profile, session: sess('D', at(2026,10,31), { startedAt: at(2026,10,31,10,0), active: 'd1', items: { warm: { sec: 480, done: true }, d1: { sec: 0, runningSince: at(2026,10,31,10,8) } } }) } },
  { name: '22-trial-ended-popup', time: at(2026,10,29, 9), keepPopups: true, seed: { profile: { ...profile, startDate: '2026-10-04' }, history: [...week1.slice().reverse(), ...many], 'ach-seen': ['Awakening','Gate Opener','Machine','Level 5'] } },
  { name: '23-home-free-red-gate-locked', time: at(2026,10,29, 9), seed: { profile: { ...profile, startDate: '2026-10-04', trialSeen: true }, history: [...week1.slice().reverse(), ...many] }, scroll: true },
  { name: '24a-premium-free', height: 960, time: at(2026,10,29, 9), seed: { profile: { ...profile, startDate: '2026-10-04', trialSeen: true }, history: [...week1.slice().reverse(), ...many] }, act: async p => { await p.getByRole('tab', { name: 'Premium' }).click(); } },
  { name: '24b-premium-trial', height: 960, time: at(2026,10,27, 9), seed: { profile, history: week1.slice(0, 2).reverse() }, act: async p => { await p.getByRole('tab', { name: 'Premium' }).click(); } },
  { name: '24c-settings-free', time: at(2026,10,29, 9), seed: { profile: { ...profile, startDate: '2026-10-04', trialSeen: true }, history: [...week1.slice().reverse(), ...many] }, act: async p => { await p.getByRole('tab', { name: 'Settings' }).click(); } },
  { name: '24d-status-full', height: 2700, time: at(2026,10,29, 9), seed: { profile: { ...profile, startDate: '2026-10-04', trialSeen: true }, history: [...week1.slice().reverse(), ...many] }, act: async p => { await p.getByRole('tab', { name: 'Status' }).click(); } },
  { name: '25-workout-no-equipment', time: at(2026,10,28, 9), seed: { profile: { ...profile, gear: 'none' }, history: [rec('Q', at(2026,10,27,19)), rec('A', at(2026,10,26,9)), rec('Q', at(2026,10,25,19))] }, act: async p => { await p.getByLabel('Accept quest').click(); }, scroll: true },
  { name: '26-home-premium', time: at(2026,10,29, 9), seed: { profile: { ...profile, startDate: '2026-10-04', premium: true, trialSeen: true, rank: 'B' }, history: [...week1.slice().reverse(), ...many] } },
];

(async () => {
  const b = await chromium.launch();
  const only = process.env.ONLY;
  for (const sc of scenarios) {
    if (only && !sc.name.includes(only)) continue;
    const ctx = await b.newContext({ viewport: { width: 390, height: sc.height || 844 }, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.clock.install({ time: new Date(sc.time) }); await p.clock.resume();
    await p.addInitScript(seed => { localStorage.clear(); for (const [k, v] of Object.entries(seed || {})) localStorage.setItem(k, JSON.stringify(v)); }, sc.seed || {});
    await p.goto(base); await p.waitForTimeout(1500);
    // dismiss queued achievement popups unless the scenario is about them
    if (!sc.keepPopups) for (let i = 0; i < 6; i++) { const ok = p.getByLabel('OK'); if (await ok.count()) { await ok.first().click(); await p.waitForTimeout(250); } }
    if (sc.act) { await sc.act(p); await p.waitForTimeout(900); }
    if (sc.end) { await p.mouse.move(195, 500); await p.mouse.wheel(0, 4000); await p.waitForTimeout(500); }
    await p.screenshot({ path: `${out}/${sc.name}.png` });
    if (sc.scroll) { await p.mouse.move(195, 500); await p.mouse.wheel(0, 700); await p.waitForTimeout(500); await p.screenshot({ path: `${out}/${sc.name}-b.png` }); }
    if (errs.length) console.log(sc.name, errs.join(' | '));
    await ctx.close();
  }
  await b.close();
})();
