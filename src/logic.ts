import AsyncStorage from '@react-native-async-storage/async-storage';
import { XP, XP_PER_LEVEL, SECRETS, WORKOUTS, ORDER, Item } from './data';

export type Rec = {
  key: string; workout: string; week: number; date: string; createdAt: number; totalSec: number;
  exercises: { name: string; rx: string; sec?: number; done: boolean }[];
  score: string; feel: number | null; hard: string; kg?: number;
};
export type Profile = { name: string; startDate: string; rank: string };
export type ItemState = { sec: number; runningSince?: number | null; done?: boolean; sets?: boolean[]; rounds?: number; lastBeepMin?: number; endBeeped?: boolean };
export type Session = {
  v: 3; key: string; week: number; day: string; startedAt: number | null; endedAt: number | null;
  items: Record<string, ItemState>; active: string | null; feel: number; saved?: boolean;
  counts?: Record<string, number>; plankSince?: number | null;
};

// ---- storage (on device; replaced by Firebase when accounts arrive)
async function get<T>(k: string): Promise<T | null> {
  try { const v = await AsyncStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; }
}
async function set(k: string, v: unknown) { try { await AsyncStorage.setItem(k, JSON.stringify(v)); } catch {} }
export const store = {
  profile: () => get<Profile>('profile'), saveProfile: (p: Profile) => set('profile', p),
  session: () => get<Session>('session'), saveSession: (s: Session) => set('session', s),
  history: async () => (await get<Rec[]>('history')) || [],
  addRec: async (r: Rec) => { const h = await store.history(); const n = [r, ...h]; await set('history', n); return n; },
  achSeen: () => get<string[]>('ach-seen'), saveAchSeen: (a: string[]) => set('ach-seen', a),
};

// ---- dates and plan position
export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const ymd = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
export const parseYmd = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export function weeksIn(p: Profile, today: Date) {
  return Math.floor((startOfDay(today).getTime() - parseYmd(p.startDate).getTime()) / 864e5 / 7) + 1;
}
// The 4-week block repeats until adaptive plans arrive
export const planWeek = (n: number) => ((Math.max(1, n) - 1) % 4) + 1;
export const todaysWorkout = (today: Date) => ORDER.find(k => WORKOUTS[k].day === today.getDay());

export const fmt = (s: number) => { s = Math.max(0, Math.round(s)); const m = Math.floor(s / 60), r = s % 60; return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0'); };
export const rxFor = (it: Item, week: number) => it.rx.length === 4 ? it.rx[week - 1] : it.rx[0];
export const cdFor = (it: Item, week: number) => it.countdown ? it.countdown[week - 1] : 0;
export function setsFor(it: Item, week: number) { if (it.countdown || it.finisher) return 0; const m = /^(\d+)\s*×/.exec(rxFor(it, week)); return m ? +m[1] : 0; }
export function itemSec(s?: ItemState, now = Date.now()) { if (!s) return 0; return (s.sec || 0) + (s.runningSince ? (now - s.runningSince) / 1000 : 0); }

// ---- the System
export const onDay = (h: Rec[], d: Date, keys?: string[]) => { const s = d.toDateString(); return h.some(x => new Date(x.createdAt).toDateString() === s && (!keys || keys.includes(x.key))); };
export function player(h: Rec[]) {
  const c = (k: string) => h.filter(x => x.key === k).length;
  const xp = h.reduce((s, x) => s + (XP[x.key] || 0), 0);
  // Rising curve: level n -> n+1 costs 300 + 75*(n-1) XP
  let level = 1, need = XP_PER_LEVEL, into = xp;
  while (into >= need) { into -= need; level++; need = XP_PER_LEVEL + 75 * (level - 1); }
  return { xp, level, into, need, str: 10 + 2 * (c('A') + c('B')) + c('D'), end: 10 + 2 * c('C') + 2 * c('D'), agi: 10 + c('Q') };
}
const REAL = ['Q', 'A', 'B', 'C', 'D'];
export function streak(h: Rec[], today: Date) {
  const d = startOfDay(today); let n = 0;
  if (!onDay(h, d, REAL)) d.setDate(d.getDate() - 1);
  while (onDay(h, d, REAL)) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
// On a training day the workout itself is the daily quest: one thing per day
export const QUEST_KEYS = ['Q', 'A', 'B', 'C', 'D'];
export function penaltyActive(h: Rec[], p: Profile, today: Date) {
  const yest = startOfDay(today); yest.setDate(yest.getDate() - 1);
  return yest >= parseYmd(p.startDate) && !onDay(h, yest, QUEST_KEYS) && !onDay(h, today, ['P']);
}

function dayHash(d: Date) { const x = d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate(); return (Math.imul(x, 2654435761) >>> 0) % 1000; }
export const secretFor = (d: Date) => dayHash(d) % 9 === 0 ? SECRETS[dayHash(d) % SECRETS.length] : null;
export function weekStart(d: Date) { const w = startOfDay(d); w.setDate(w.getDate() - w.getDay()); return w; }
export const weights = (h: Rec[]) => h.filter(x => x.key === 'W' && x.kg).sort((a, b) => a.createdAt - b.createdAt);

export const ACH: [string, string, string, (h: Rec[], today: Date) => boolean][] = [
  ['ההתעוררות', 'השלמת את המשימה הראשונה', 'הצעד הראשון', h => h.some(x => x.key !== 'W')],
  ['פותח השערים', 'שרדת את ה־Red Gate הראשון', 'שער אדום', h => h.some(x => x.key === 'D')],
  ['צייד שערים', '4 Red Gates', 'ארבעה שערים', h => h.filter(x => x.key === 'D').length >= 4],
  ['רצף 7', '7 ימים ברצף', 'שבוע בלי הפסקה', (h, t) => streak(h, t) >= 7],
  ['רצף 30', '30 ימים ברצף', 'חודש בלי הפסקה', (h, t) => streak(h, t) >= 30],
  ['ציפור מוקדמת', 'סיימת אימון לפני 07:30', 'לפני כולם', h => h.some(x => 'ABCD'.includes(x.key) && new Date(x.createdAt).getHours() * 60 + new Date(x.createdAt).getMinutes() < 450)],
  ['ינשוף לילה', 'השלמת משימה אחרי 22:00', 'רגע לפני חצות', h => h.some(x => x.key !== 'W' && new Date(x.createdAt).getHours() >= 22)],
  ['שורד העונש', 'השלמת משימת עונש', 'מאזור העונש', h => h.some(x => x.key === 'P')],
  ['צל', 'השלמת משימה נסתרת', 'מה שלא רואים', h => h.some(x => x.key === 'S')],
  ['מכונה', 'הרגשה 5 אחרי Red Gate', 'כאילו כלום', h => h.some(x => x.key === 'D' && x.feel === 5)],
  ['מינוס 2', 'ירדת 2 ק"ג מהשקילה הראשונה', 'המאזניים זזים', h => { const w = weights(h); return w.length > 1 && w[0].kg! - w[w.length - 1].kg! >= 2; }],
  ['מינוס 5', 'ירדת 5 ק"ג מהשקילה הראשונה', 'גוף חדש', h => { const w = weights(h); return w.length > 1 && w[0].kg! - w[w.length - 1].kg! >= 5; }],
  ['רמה 5', 'הגעת לרמה 5', 'מתחזק', h => player(h).level >= 5],
  ['רמה 10', 'הגעת לרמה 10', 'צייד אמיתי', h => player(h).level >= 10],
];
