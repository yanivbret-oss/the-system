import AsyncStorage from '@react-native-async-storage/async-storage';
import { XP, XP_PER_LEVEL, SECRETS, WORKOUTS, ORDER, Item } from './data';

export type Rec = {
  key: string; workout: string; week: number; date: string; createdAt: number; totalSec: number;
  exercises: { name: string; rx: string; sec?: number; done: boolean }[];
  score: string; feel: number | null; hard: string; kg?: number;
};
export type Profile = { name: string; startDate: string; rank: string; days?: number[] };
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
// The player picks 3 or 4 training days: gates A, B, C go on the first three, the Red Gate on the fourth
export const DEFAULT_DAYS = [1, 3, 5, 6];
export const gatesFor = (p: Profile) => ORDER.slice(0, Math.min(4, (p.days || DEFAULT_DAYS).length));
export const gateDay = (k: string, p: Profile) => [...(p.days || DEFAULT_DAYS)].sort((a, b) => a - b)[ORDER.indexOf(k as never)];
export const todaysWorkout = (today: Date, p: Profile) => gatesFor(p).find(k => gateDay(k, p) === today.getDay());
// Titles by level, from the lowest soldier to the top of the army
export const GRADES: [number, string][] = [[1, 'Normal'], [5, 'Elite'], [10, 'Knight'], [20, 'Elite Knight'], [30, 'General'], [45, 'Marshal'], [60, 'Grand Marshal']];
export const gradeFor = (level: number) => GRADES.filter(([l]) => level >= l).pop()![1] + ' Grade';

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
  ['Awakening', 'Completed your first quest', 'The first step', h => h.some(x => x.key !== 'W')],
  ['Gate Opener', 'Survived your first Red Gate', 'A red door', h => h.some(x => x.key === 'D')],
  ['Gate Hunter', 'Cleared 4 Red Gates', 'Four doors', h => h.filter(x => x.key === 'D').length >= 4],
  ['Streak 7', '7 days in a row', 'A week without a break', (h, t) => streak(h, t) >= 7],
  ['Streak 30', '30 days in a row', 'A month without a break', (h, t) => streak(h, t) >= 30],
  ['Early Bird', 'Finished a workout before 7:30', 'Before everyone', h => h.some(x => 'ABCD'.includes(x.key) && new Date(x.createdAt).getHours() * 60 + new Date(x.createdAt).getMinutes() < 450)],
  ['Night Owl', 'Completed a quest after 22:00', 'Just before midnight', h => h.some(x => x.key !== 'W' && new Date(x.createdAt).getHours() >= 22)],
  ['Penalty Survivor', 'Completed a penalty quest', 'Out of the zone', h => h.some(x => x.key === 'P')],
  ['Shadow', 'Completed a secret quest', 'What no one sees', h => h.some(x => x.key === 'S')],
  ['Machine', 'Felt 5/5 after a Red Gate', 'Like it was nothing', h => h.some(x => x.key === 'D' && x.feel === 5)],
  ['Minus 2', 'Down 2 kg from your first weigh-in', 'The scale moves', h => { const w = weights(h); return w.length > 1 && w[0].kg! - w[w.length - 1].kg! >= 2; }],
  ['Minus 5', 'Down 5 kg from your first weigh-in', 'A new body', h => { const w = weights(h); return w.length > 1 && w[0].kg! - w[w.length - 1].kg! >= 5; }],
  ['Level 5', 'Reached level 5', 'Getting stronger', h => player(h).level >= 5],
  ['Level 10', 'Reached level 10', 'A real hunter', h => player(h).level >= 10],
];
