import { useCallback, useEffect, useRef, useState } from 'react';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { WORKOUTS, QUESTS, XP, WorkoutKey, Item } from './data';
import { beep } from './sound';
import {
  Profile, Rec, Session, store, rxFor, cdFor, itemSec, player, fmt, weeksIn, planWeek, todaysWorkout, ACH,
} from './logic';

export type Notice = { title: string; lines: string[]; tone?: 'normal' | 'penalty' | 'secret' | 'gold' };

// All game state and actions: the current quest session, the record history, and System notifications
export function useGame(profile: Profile, history: Rec[], setHistory: (h: Rec[]) => void) {
  const today = new Date();
  const todayStr = today.toDateString();
  const week = planWeek(weeksIn(profile, today));
  const todayW = todaysWorkout(today, profile);

  const fresh = (key: string, w = week): Session => ({ v: 3, key, week: w, day: todayStr, startedAt: null, endedAt: null, items: {}, active: null, feel: 0 });
  const [s, setS] = useState<Session | null>(null);
  const [, setTick] = useState(0);
  const [notices, setNotices] = useState<Notice[]>([]);
  const notify = useCallback((n: Notice) => setNotices(q => [...q, n]), []);
  const dismiss = () => setNotices(q => q.slice(1));
  const seenLoaded = useRef(false);

  useEffect(() => {
    store.session().then(v => {
      const valid = v && v.v === 3 && (WORKOUTS[v.key as WorkoutKey] || v.key === 'Q' || v.key === 'P');
      setS(!v || !valid || (!v.startedAt && v.day !== todayStr) || (v.saved && v.day !== todayStr) ? fresh(todayW || 'Q') : v);
    });
  }, []);

  const update = useCallback((next: Session) => { setS({ ...next }); store.saveSession(next); }, []);
  const running = !!s && !!s.startedAt && !s.endedAt;

  useEffect(() => {
    if (running || s?.plankSince) activateKeepAwakeAsync('workout').catch(() => {});
    else deactivateKeepAwake('workout').catch(() => {});
  }, [running, s?.plankSince]);

  // hidden achievements: announce the new ones once
  useEffect(() => {
    if (!history.length && seenLoaded.current) return;
    const names = ACH.filter(a => a[3](history, today)).map(a => a[0]);
    store.achSeen().then(seen => {
      seenLoaded.current = true;
      if (seen) names.filter(n => !seen.includes(n)).forEach(n => {
        const a = ACH.find(x => x[0] === n)!;
        notify({ title: 'ACHIEVEMENT', tone: 'secret', lines: ['Hidden achievement unlocked:', n, a[1]] });
      });
      store.saveAchSeen(names);
    });
  }, [history.length]);

  // ---- the clock: timers, EMOM minute beeps, plank auto-stop
  useEffect(() => {
    const id = setInterval(() => {
      setS(cur => {
        if (!cur) return cur;
        let changed = false;
        if (cur.plankSince && cur.key === 'Q') {
          const g = QUESTS.Q.goals(cur.week).find(x => x.timer);
          if (g && (cur.counts?.[g.id] || 0) + Math.floor((Date.now() - cur.plankSince) / 1000) >= g.target) {
            cur.counts = { ...cur.counts, [g.id]: g.target }; cur.plankSince = null; beep(523, true); changed = true;
          }
        }
        const w = WORKOUTS[cur.key as WorkoutKey];
        if (w && cur.active) {
          const it = w.items.find(i => i.id === cur.active)!, st = cur.items[cur.active];
          const cd = cdFor(it, cur.week), sec = itemSec(st);
          if (st?.runningSince && cd) {
            const m = Math.floor(sec / 60);
            if (it.emom && m > (st.lastBeepMin || 0) && sec < cd) { st.lastBeepMin = m; beep(988); changed = true; }
            if (sec >= cd && !st.endBeeped) { st.endBeeped = true; beep(523, true); changed = true; }
          }
        }
        if (changed) { store.saveSession(cur); return { ...cur }; }
        return cur;
      });
      setTick(x => x + 1);
    }, 250);
    return () => clearInterval(id);
  }, []);

  async function addRec(rec: Rec) {
    const before = player(history);
    const h = await store.addRec(rec);
    setHistory(h);
    const after = player(h);
    return { before, after };
  }
  function rewardLines(key: string, before: { level: number }, after: { level: number }) {
    const lines = key === 'P' ? ['You have been released from the penalty zone.'] : ['Rewards: +' + (XP[key] || 0) + ' XP'];
    if (after.level > before.level) lines.push('LEVEL UP! You are now level ' + after.level + '.');
    return lines;
  }

  // ---- workout actions (they mutate a copy of the session, then save it)
  const W = s ? WORKOUTS[s.key as WorkoutKey] : undefined;
  function pauseItem(cur: Session, id: string) { const st = cur.items[id]; if (st && st.runningSince) { st.sec = itemSec(st); st.runningSince = null; } }
  function startItemIn(cur: Session, id: string) {
    if (cur.active && cur.active !== id) pauseItem(cur, cur.active);
    const st = cur.items[id] = cur.items[id] || { sec: 0 };
    st.runningSince = Date.now(); st.lastBeepMin = Math.floor((st.sec || 0) / 60);
    cur.active = id;
  }
  function endIn(cur: Session) { if (cur.active) pauseItem(cur, cur.active); cur.endedAt = Date.now(); cur.active = null; }
  function finishIn(cur: Session, id: string) {
    pauseItem(cur, id); cur.items[id].done = true; cur.active = null; beep(660);
    const next = W!.items.find(i => !cur.items[i.id]?.done);
    if (next) startItemIn(cur, next.id); else endIn(cur);
  }
  const act = (fn: (cur: Session) => void) => { const cur = { ...s!, items: { ...s!.items } }; fn(cur); update(cur); };

  const actions = {
    open: (key: string) => update(fresh(key, s?.week ?? week)),
    setWeek: (w: number) => act(c => { c.week = w; }),
    start: () => act(c => { c.startedAt = Date.now(); beep(880); startItemIn(c, W!.items[0].id); }),
    end: () => act(endIn),
    startItem: (id: string) => act(c => startItemIn(c, id)),
    finishItem: (id: string) => act(c => finishIn(c, id)),
    undoItem: (id: string) => act(c => { c.items[id] = { ...c.items[id], done: false }; }),
    round: (id: string) => act(c => { beep(740); c.items[id] = { ...c.items[id], rounds: (c.items[id]?.rounds || 0) + 1 }; }),
    toggleSet: (it: Item, i: number, n: number) => act(c => {
      if (c.active !== it.id) startItemIn(c, it.id);
      const st = c.items[it.id]; st.sets = [...(st.sets || [])];
      st.sets[i] = !st.sets[i]; beep(st.sets[i] ? 740 : 440);
      if (st.sets.filter(Boolean).length >= n) finishIn(c, it.id);
    }),
    feel: (n: number) => act(c => { c.feel = n; }),
    count: (id: string, d: number, target: number) => act(c => { c.counts = { ...c.counts, [id]: Math.max(0, Math.min(target, (c.counts?.[id] || 0) + d)) }; }),
    plank: (id: string, target: number) => act(c => {
      if (c.plankSince) { c.counts = { ...c.counts, [id]: Math.min(target, (c.counts?.[id] || 0) + Math.floor((Date.now() - c.plankSince) / 1000)) }; c.plankSince = null; }
      else { beep(880); c.plankSince = Date.now(); }
    }),
    autoScore: () => {
      if (!W || !s) return '';
      const it = W.items.find(i => i.finisher && !i.emom); if (!it) return '';
      const st = s.items[it.id] || { sec: 0 };
      if (it.countdown) return st.rounds ? st.rounds + ' rounds' : '';
      const sec = Math.round(itemSec(st)); return st.done && sec ? fmt(sec) : '';
    },
    saveWorkout: async (hard: string) => {
      const cur = s!;
      const rec: Rec = {
        key: cur.key, workout: W!.name, week: cur.week, date: new Date(cur.startedAt!).toISOString().slice(0, 10),
        createdAt: cur.endedAt!, totalSec: Math.round((cur.endedAt! - cur.startedAt!) / 1000),
        exercises: W!.items.map(i => ({ name: i.name, rx: rxFor(i, cur.week), sec: Math.round(itemSec(cur.items[i.id])), done: !!cur.items[i.id]?.done })),
        score: actions.autoScore(), feel: cur.feel || null, hard: hard.trim(),
      };
      const { before, after } = await addRec(rec);
      update({ ...cur, saved: true });
      beep(1175, true);
      notify({ title: 'QUEST COMPLETE', lines: [W!.name + ' cleared in ' + fmt(rec.totalSec) + '.', ...rewardLines(rec.key, before, after)] });
    },
    saveQuest: async () => {
      const cur = s!, Qd = QUESTS[cur.key as 'Q' | 'P'];
      const goals = cur.key === 'Q' ? QUESTS.Q.goals(cur.week) : QUESTS.P.goals();
      const rec: Rec = { key: cur.key, workout: Qd.title, week: cur.week, date: new Date().toISOString().slice(0, 10), createdAt: Date.now(), totalSec: 0,
        exercises: goals.map(g => ({ name: g.label, rx: String(g.target), done: true })), score: '', feel: null, hard: '' };
      const { before, after } = await addRec(rec);
      update({ ...cur, saved: true });
      beep(1175, true);
      notify({ title: cur.key === 'P' ? 'PENALTY CLEARED' : 'QUEST COMPLETE', lines: [Qd.title + ' complete.', ...rewardLines(rec.key, before, after)] });
    },
    saveSecret: async (text: string) => {
      const { before, after } = await addRec({ key: 'S', workout: 'Secret Quest', week, date: today.toISOString().slice(0, 10), createdAt: Date.now(), totalSec: 0, exercises: [], score: text, feel: null, hard: '' });
      beep(1175, true);
      notify({ title: 'SECRET QUEST', tone: 'secret', lines: ['Secret quest complete.', ...rewardLines('S', before, after)] });
    },
    saveWeight: async (kg: number) => {
      const { before, after } = await addRec({ key: 'W', workout: 'Weigh-in', kg, week, date: today.toISOString().slice(0, 10), createdAt: Date.now(), totalSec: 0, exercises: [], score: kg + ' kg', feel: null, hard: '' });
      beep(1175, true);
      notify({ title: 'WEIGH-IN', lines: ['Weight recorded: ' + kg + ' kg.', ...rewardLines('W', before, after)] });
    },
  };

  return { s, W, running, week, todayW, today, actions, notices, dismiss };
}
