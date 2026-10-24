import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, Linking, ScrollView, ScrollViewInstance } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import Svg, { Polyline } from 'react-native-svg';
import { Win, T, Btn, Row, Chip, Head, useT } from './ui';
import { F } from './theme';
import { beep } from './sound';
import { DAYS, WORKOUTS, ORDER, QUESTS, XP, MOVES, HOW, KEY_NAMES, Item, WorkoutKey } from './data';
import {
  Profile, Rec, Session, store, fmt, rxFor, cdFor, setsFor, itemSec, player, streak, onDay, penaltyActive,
  secretFor, weekStart, weights, ACH, weeksIn, planWeek, todaysWorkout, QUEST_KEYS,
} from './logic';

type Props = { profile: Profile; history: Rec[]; setHistory: (h: Rec[]) => void; onRedGate: (on: boolean) => void };

export function Home({ profile, history, setHistory, onRedGate }: Props) {
  const t = useT();
  const today = new Date();
  const todayStr = today.toDateString();
  const wIn = weeksIn(profile, today);
  const autoWeek = planWeek(wIn);
  const todayW = todaysWorkout(today);
  const autoKey: string = todayW || 'Q';
  const trainDay = !!todayW;

  const fresh = (key: string, week: number): Session => ({ v: 3, key, week, day: todayStr, startedAt: null, endedAt: null, items: {}, active: null, feel: 0 });
  const [s, setS] = useState<Session | null>(null);
  const [, setTick] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [hard, setHard] = useState('');
  const [kg, setKg] = useState('');
  const scroll = useRef<ScrollViewInstance>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // load today's session, or start a fresh one
  useEffect(() => {
    store.session().then(v => {
      const valid = v && v.v === 3 && (WORKOUTS[v.key as WorkoutKey] || QUESTS[v.key as 'Q' | 'P']);
      setS(!v || !valid || (!v.startedAt && v.day !== todayStr) || (v.saved && v.day !== todayStr) ? fresh(autoKey, autoWeek) : v);
    });
  }, []);

  const update = useCallback((next: Session) => { setS({ ...next }); store.saveSession(next); }, []);
  const running = !!s && !!s.startedAt && !s.endedAt;
  const isQuest = !!s && (s.key === 'Q' || s.key === 'P');

  useEffect(() => { onRedGate(!!s && s.key === 'D' && !s.saved); }, [s?.key, s?.saved]);
  useEffect(() => { if (running || s?.plankSince) activateKeepAwakeAsync('workout').catch(() => {}); else deactivateKeepAwake('workout').catch(() => {}); }, [running, s?.plankSince]);

  const showToast = (text: string) => {
    setToast(text); beep(1319, true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  };

  // hidden achievements: announce the new ones once
  useEffect(() => {
    if (!history.length) return;
    const names = ACH.filter(a => a[3](history, today)).map(a => a[0]);
    store.achSeen().then(seen => {
      if (seen) names.filter(n => !seen.includes(n)).forEach((n, i) => setTimeout(() => showToast('הישג נסתר נפתח: ' + n), 600 + i * 5200));
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
          const g = QUESTS.Q.goals(cur.week, trainDay).find(x => x.timer);
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
  }, [trainDay]);

  if (!s) return null;

  async function addRec(rec: Rec) {
    const h = await store.addRec(rec);
    setHistory(h);
    return h;
  }

  // ---- workout actions
  const W = WORKOUTS[s.key as WorkoutKey];
  function pauseItem(cur: Session, id: string) { const st = cur.items[id]; if (st && st.runningSince) { st.sec = itemSec(st); st.runningSince = null; } }
  function startItem(cur: Session, id: string) {
    if (cur.active && cur.active !== id) pauseItem(cur, cur.active);
    const st = cur.items[id] = cur.items[id] || { sec: 0 };
    st.runningSince = Date.now(); st.lastBeepMin = Math.floor((st.sec || 0) / 60);
    cur.active = id;
  }
  function startWorkout() { const cur = { ...s! }; cur.startedAt = Date.now(); beep(880); startItem(cur, W.items[0].id); update(cur); }
  function endWorkout(cur: Session) {
    if (cur.active) pauseItem(cur, cur.active);
    cur.endedAt = Date.now(); cur.active = null; update(cur);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 200);
  }
  function finishItem(cur: Session, id: string) {
    pauseItem(cur, id); cur.items[id].done = true; cur.active = null; beep(660);
    const next = W.items.find(i => !cur.items[i.id]?.done);
    if (next) { startItem(cur, next.id); update(cur); } else endWorkout(cur);
  }
  function toggleSet(it: Item, i: number, n: number) {
    const cur = { ...s! };
    if (cur.active !== it.id) startItem(cur, it.id);
    const st = cur.items[it.id]; st.sets = st.sets || [];
    st.sets[i] = !st.sets[i]; beep(st.sets[i] ? 740 : 440);
    if (st.sets.filter(Boolean).length >= n) finishItem(cur, it.id); else update(cur);
  }
  function autoScore() {
    const it = W.items.find(i => i.finisher && !i.emom); if (!it) return '';
    const st = s!.items[it.id] || { sec: 0 };
    if (it.countdown) return st.rounds ? st.rounds + ' סבבים' : '';
    const sec = Math.round(itemSec(st)); return st.done && sec ? fmt(sec) : '';
  }
  async function saveWorkout() {
    const cur = s!;
    const rec: Rec = {
      key: cur.key, workout: W.name, week: cur.week, date: new Date(cur.startedAt!).toISOString().slice(0, 10),
      createdAt: cur.endedAt!, totalSec: Math.round((cur.endedAt! - cur.startedAt!) / 1000),
      exercises: W.items.map(i => ({ name: i.name, rx: rxFor(i, cur.week), sec: Math.round(itemSec(cur.items[i.id])), done: !!cur.items[i.id]?.done })),
      score: autoScore(), feel: cur.feel || null, hard: hard.trim(),
    };
    const before = player(history);
    const h = await addRec(rec);
    const after = player(h);
    update({ ...cur, saved: true }); setHard('');
    setMsg({ ok: true, text: 'המשימה הושלמה. +' + (XP[rec.key] || 0) + ' XP' + (after.level > before.level ? '. הרמה עלתה! רמה ' + after.level : '') });
    beep(1175, true);
  }

  // ---- quest (counter) actions
  const goals = isQuest ? (s.key === 'Q' ? QUESTS.Q.goals(s.week, trainDay) : QUESTS.P.goals()) : [];
  const qCount = (g: { id: string; timer?: boolean }) => { const c = s.counts?.[g.id] || 0; return g.timer && s.plankSince ? c + Math.floor((Date.now() - s.plankSince) / 1000) : c; };
  async function saveQuest() {
    const Qd = QUESTS[s!.key as 'Q' | 'P'];
    const rec: Rec = { key: s!.key, workout: Qd.title, week: s!.week, date: new Date().toISOString().slice(0, 10), createdAt: Date.now(), totalSec: 0,
      exercises: goals.map(g => ({ name: g.label, rx: String(g.target), done: true })), score: '', feel: null, hard: '' };
    const before = player(history), h = await addRec(rec), after = player(h);
    update({ ...s!, saved: true });
    setMsg({ ok: true, text: s!.key === 'P' ? 'משימת העונש הושלמה. שוחררת מאזור העונש.' : 'המשימה היומית הושלמה. +30 XP' + (after.level > before.level ? '. הרמה עלתה! רמה ' + after.level : '') });
    beep(1175, true);
  }

  const switchTo = (key: string) => { setMsg(null); update(fresh(key, s.week)); };
  const p = player(history);
  const qDone = onDay(history, today, QUEST_KEYS);
  const penalty = penaltyActive(history, profile, today) && s.key !== 'P';
  const secret = secretFor(today);
  const showSecret = !!secret && !onDay(history, today, ['S']) && !running;
  const ws = weights(history);
  const weighedThisWeek = ws.some(x => new Date(x.createdAt) >= weekStart(today));
  const weighDue = today.getDay() >= 5 && !weighedThisWeek;
  const got = ACH.filter(a => a[3](history, today)).map(a => a[0]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 16 }} stickyHeaderIndices={!isQuest && W ? [4] : undefined}>
        {/* 0: header */}
        <View style={{ gap: 2, paddingTop: 8 }}>
          <T muted style={{ fontSize: 13 }}>{'יום ' + DAYS[today.getDay()] + ' · שבוע ' + wIn + ' · מחזור ' + autoWeek + '/4'}</T>
          <Text style={{ color: t.fg, fontFamily: F.headBold, fontSize: 28, letterSpacing: 6, textAlign: 'right', textShadowColor: t.textGlow, textShadowRadius: 14 }}>THE SYSTEM</Text>
        </View>

        {/* 1: status */}
        <Win title="STATUS" icon="i">
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View>
              <T muted style={{ fontSize: 13 }}>{'שחקן: ' + profile.name}</T>
              <T glow style={{ fontFamily: F.heavy, fontSize: 26, lineHeight: 32 }}>{'רמה ' + p.level}</T>
            </View>
            <View style={{ alignItems: 'flex-start' }}>
              <T muted style={{ fontSize: 13, textAlign: 'left' }}>דרגה</T>
              <Text style={{ color: t.live, fontFamily: F.monoBold, fontSize: 26, textShadowColor: t.textGlow, textShadowRadius: 10 }}>{profile.rank}</Text>
            </View>
          </Row>
          <View style={{ height: 6, backgroundColor: t.line, overflow: 'hidden', flexDirection: 'row-reverse' }}>
            <View style={{ width: `${(p.into / p.need) * 100}%`, backgroundColor: t.live, boxShadow: `0 0 8px ${t.glow}` }} />
          </View>
          <T muted style={{ fontSize: 13 }}>{'עוד ' + (p.need - p.into) + ' XP לרמה ' + (p.level + 1)}</T>
          <Row style={{ flexWrap: 'nowrap' }}>
            {[[p.str, 'כוח'], [p.end, 'סיבולת'], [p.agi, 'גמישות'], [streak(history, today), 'ברצף']].map(([v, l]) => (
              <View key={l as string} style={{ flex: 1, borderWidth: 1, borderColor: t.line, paddingVertical: 6, alignItems: 'center' }}>
                <Text style={{ color: t.fg, fontFamily: F.monoBold, fontSize: 18 }}>{v}</Text>
                <Text style={{ color: t.muted, fontFamily: F.body, fontSize: 12 }}>{l}</Text>
              </View>
            ))}
          </Row>
        </Win>

        {/* 2: notifications from the System */}
        <View style={{ gap: 16 }}>
          {penalty ? (
            <Win title="PENALTY" tone="penalty">
              <T>המשימה היומית של אתמול לא הושלמה. משימת עונש: 100 סווינג ו־30 ברפי, היום.</T>
              <Btn danger label="קבל את העונש" disabled={running} onPress={() => switchTo('P')} />
            </Win>
          ) : null}
          {!isQuest && !qDone && !(todayW && s.key === todayW) ? (
            <Win title="DAILY QUEST">
              <T glow>{todayW ? 'המשימה של היום היא האימון: ' + WORKOUTS[todayW].name + '. אם לא תושלם עד חצות, תועבר לאזור העונש.' : 'יום בלי אימון. המשימה: הכנה להיות חזק. אם לא תושלם עד חצות, תועבר לאזור העונש.'}</T>
              {!todayW ? <Btn primary label="פתח משימה יומית" disabled={running} onPress={() => switchTo('Q')} /> : null}
            </Win>
          ) : null}
          {showSecret ? (
            <Win title="SECRET QUEST" icon="?" tone="secret">
              <T>{'המערכת זיהתה הזדמנות. משימה נסתרת זמינה רק היום: ' + secret}</T>
              <T muted style={{ fontSize: 14 }}>תגמול: 50 XP. אין עונש אם מוותרים.</T>
              <Btn primary label="בוצע" onPress={async () => { await addRec({ key: 'S', workout: 'משימה נסתרת', week: autoWeek, date: today.toISOString().slice(0, 10), createdAt: Date.now(), totalSec: 0, exercises: [], score: secret!, feel: null, hard: '' }); showToast('משימה נסתרת הושלמה. +50 XP'); }} />
            </Win>
          ) : null}
          {(weighDue || ws.length > 0) && !running ? (
            <Win title="WEIGH-IN" icon="i">
              {ws.length ? (
                <Row style={{ justifyContent: 'space-between' }}>
                  <View><T muted style={{ fontSize: 13 }}>משקל אחרון</T><T glow style={{ fontFamily: F.heavy, fontSize: 22 }}>{ws[ws.length - 1].kg + ' ק"ג'}</T></View>
                  <View><T muted style={{ fontSize: 13, textAlign: 'left' }}>מההתחלה</T>
                    <Text style={{ color: t.live, fontFamily: F.monoBold, fontSize: 22 }}>{(() => { const d = Math.round((ws[ws.length - 1].kg! - ws[0].kg!) * 10) / 10; return (d > 0 ? '+' : '') + d; })()}</Text></View>
                </Row>
              ) : null}
              {ws.length > 1 ? <Spark values={ws.map(x => x.kg!)} color={t.live} /> : null}
              {weighDue ? (
                <>
                  <T>בבוקר, אחרי שירותים ולפני שאוכלים. +20 XP</T>
                  <Row>
                    <TextInput value={kg} onChangeText={setKg} keyboardType="decimal-pad" placeholder={ws.length ? String(ws[ws.length - 1].kg) : '80.0'} placeholderTextColor={t.muted}
                      style={{ flex: 1, borderWidth: 1, borderColor: t.line, color: t.fg, fontFamily: F.monoBold, fontSize: 20, textAlign: 'center', padding: 8 }} />
                    <Btn primary label="שמור משקל" onPress={async () => {
                      const v = Math.round(parseFloat(kg) * 10) / 10; if (!(v > 30 && v < 250)) return;
                      await addRec({ key: 'W', workout: 'שקילה', kg: v, week: autoWeek, date: today.toISOString().slice(0, 10), createdAt: Date.now(), totalSec: 0, exercises: [], score: v + ' ק"ג', feel: null, hard: '' });
                      setKg(''); showToast('השקילה נרשמה. +20 XP');
                    }} />
                  </Row>
                </>
              ) : null}
            </Win>
          ) : null}
        </View>

        {/* 3: workout picker */}
        {!isQuest ? (
          <View style={{ gap: 10 }}>
            <Text style={{ color: t.fg, fontFamily: F.heavy, fontSize: 24, textAlign: 'right' }}>{W ? W.name : ''}</Text>
            <Row>
              <Chip label="משימות שהושלמו" value={history.filter(x => x.key !== 'W').length} />
              <Chip label="אימונים השבוע" value={history.filter(h => new Date(h.createdAt) >= weekStart(today) && ['A', 'B', 'C'].includes(h.key)).length + '/3'} />
              <Chip label="תגמול" value={(XP[s.key] || 0) + ' XP'} />
            </Row>
            <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
              {ORDER.map(k => (
                <Pressable key={k} disabled={running} onPress={() => switchTo(k)}
                  style={{ width: '48%', flexGrow: 1, borderWidth: 1, borderColor: k === s.key ? t.edge : t.line, paddingVertical: 8, alignItems: 'center',
                    backgroundColor: k === s.key ? 'rgba(150, 220, 255, 0.12)' : 'transparent', boxShadow: k === s.key ? `0 0 10px ${t.glow}` : undefined, opacity: running ? 0.5 : 1 }}>
                  <Text style={{ color: t.fg, fontFamily: F.bold, fontSize: 15 }}>{WORKOUTS[k].tab}</Text>
                  <Text style={{ color: t.muted, fontFamily: F.body, fontSize: 12 }}>{WORKOUTS[k].when}</Text>
                </Pressable>
              ))}
            </View>
            <Row>
              <T muted style={{ fontSize: 14 }}>שבוע במחזור:</T>
              {[1, 2, 3, 4].map(w => <Btn key={w} label={String(w)} on={w === s.week} disabled={running} style={{ minWidth: 44, paddingVertical: 4 }} onPress={() => update({ ...s, week: w })} />)}
            </Row>
          </View>
        ) : <View />}

        {/* 4: sticky session bar */}
        {!isQuest && W ? (
          <View style={{ backgroundColor: t.bg, paddingVertical: 10, borderBottomWidth: 1, borderColor: t.line, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: t.fg, fontFamily: F.monoBold, fontSize: 28, textShadowColor: t.textGlow, textShadowRadius: 10 }}>{s.startedAt ? fmt(((s.endedAt || Date.now()) - s.startedAt) / 1000) : '00:00'}</Text>
              <T muted style={{ fontSize: 13 }}>{W.items.filter(i => s.items[i.id]?.done).length + ' מתוך ' + W.items.length + ' תרגילים'}</T>
            </View>
            {!s.startedAt ? <Btn primary label="התחל אימון" onPress={startWorkout} />
              : !s.endedAt ? <Btn label="סיים אימון" onPress={() => endWorkout({ ...s })} />
              : <Btn label="אימון חדש" onPress={() => switchTo(autoKey)} />}
          </View>
        ) : <View />}

        {/* 5: workout items, or the quest window */}
        {isQuest ? (
          <Win title={s.key === 'P' ? 'PENALTY ZONE' : 'DAILY QUEST'} tone={s.key === 'P' ? 'penalty' : 'normal'}>
            <Head size={20} tone={s.key === 'P' ? 'penalty' : 'normal'}>{QUESTS[s.key as 'Q' | 'P'].title}</Head>
            <T glow>{QUESTS[s.key as 'Q' | 'P'].lead(trainDay)}</T>
            {goals.map(g => {
              const n = qCount(g), met = n >= g.target;
              const bump = (d: number) => update({ ...s, counts: { ...s.counts, [g.id]: Math.max(0, Math.min(g.target, (s.counts?.[g.id] || 0) + d)) } });
              return (
                <View key={g.id} style={{ gap: 8, paddingTop: 12, borderTopWidth: 1, borderColor: t.line }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <T style={{ fontFamily: F.bold, color: met ? t.good : t.fg }}>{(met ? '✓ ' : '') + g.label}</T>
                    <Text style={{ color: met ? t.good : t.fg, fontFamily: F.monoBold, fontSize: 22 }}>{Math.min(n, g.target) + '/' + g.target}</Text>
                  </Row>
                  <Row>
                    {g.timer ? (
                      <Btn primary label={s.plankSince ? 'עצור' : n ? 'המשך' : 'התחל טיימר'} onPress={() => {
                        if (s.plankSince) update({ ...s, counts: { ...s.counts, [g.id]: Math.min(g.target, qCount(g)) }, plankSince: null });
                        else { beep(880); update({ ...s, plankSince: Date.now() }); }
                      }} />
                    ) : (
                      <>
                        {g.steps!.map(st => <Btn key={st} label={'+' + st} style={{ minWidth: 56 }} textStyle={{ fontFamily: F.monoBold }} onPress={() => bump(st)} />)}
                        <Btn label="−1" style={{ minWidth: 56 }} textStyle={{ fontFamily: F.monoBold }} onPress={() => bump(-1)} />
                      </>
                    )}
                  </Row>
                  <HowTo keys={HOW[g.how]} />
                </View>
              );
            })}
            <T style={{ textAlign: 'center', color: t.warn, fontSize: 13 }}>{QUESTS[s.key as 'Q' | 'P'].warn}</T>
            <Btn primary big label={s.saved ? 'המשימה דווחה' : 'השלם משימה'} disabled={!goals.every(g => qCount(g) >= g.target) || !!s.saved} onPress={saveQuest} />
            {msg ? <Notice text={msg.text} /> : null}
            <Btn label="חזרה לאימונים" onPress={() => switchTo(todayW || 'A')} />
          </Win>
        ) : (
          <View style={{ gap: 10 }}>
            {W.items.map(it => {
              const st = s.items[it.id] || { sec: 0 }, active = s.active === it.id, nSets = setsFor(it, s.week);
              const sec = itemSec(st), cd = cdFor(it, s.week);
              const timer = cd ? (sec >= cd ? 'זמן!' : fmt(cd - sec)) : sec ? fmt(sec) : '';
              return (
                <View key={it.id} style={{ borderWidth: 1, borderColor: active ? t.live : st.done ? 'transparent' : t.line, backgroundColor: st.done ? t.goodSoft : t.panel, padding: 14, gap: 8,
                  boxShadow: active ? `0 0 14px ${t.glow}, inset 0 0 18px ${t.glow}` : undefined }}>
                  <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'nowrap' }}>
                    <T style={{ fontFamily: F.bold, fontSize: 17, flex: 1 }}>{it.name}</T>
                    {st.done ? <T style={{ color: t.good, fontFamily: F.bold, fontSize: 14 }}>✓ בוצע</T> : it.tag ? <T muted style={{ fontSize: 12 }}>{it.tag}</T> : null}
                  </Row>
                  <T glow style={{ fontFamily: F.bold }}>{rxFor(it, s.week)}</T>
                  {it.steps ? it.steps.map(x => <T key={x} muted style={{ fontSize: 14 }}>{'• ' + x}</T>) : null}
                  {it.note ? <T muted style={{ fontSize: 14 }}>{it.note}</T> : null}
                  <HowTo keys={HOW[it.id]} />
                  {nSets ? (
                    <Row>
                      {Array.from({ length: nSets }, (_, i) => {
                        const on = !!st.sets?.[i] || !!st.done;
                        return <Btn key={i} label={(on ? '✓ ' : '') + 'סט ' + (i + 1)} on={on} disabled={!running || !!st.done} style={{ minWidth: 70 }} onPress={() => toggleSet(it, i, nSets)} />;
                      })}
                    </Row>
                  ) : null}
                  <Row>
                    {timer ? <Text style={{ fontFamily: F.monoBold, fontSize: 20, color: active ? t.liveInk : t.fg, backgroundColor: active ? t.live : 'transparent', paddingHorizontal: 8 }}>{timer}</Text> : null}
                    {running ? (
                      active ? (
                        <>
                          <Btn primary label="סיימתי תרגיל" onPress={() => finishItem({ ...s }, it.id)} />
                          {it.finisher && it.countdown && !it.emom ? <Btn label={'סבב הושלם (' + (st.rounds || 0) + ')'} onPress={() => { beep(740); const cur = { ...s }; cur.items[it.id].rounds = (st.rounds || 0) + 1; update(cur); }} /> : null}
                        </>
                      ) : !st.done ? <Btn label={st.sec ? 'המשך' : 'התחל תרגיל'} onPress={() => { const cur = { ...s }; startItem(cur, it.id); update(cur); }} />
                        : <Btn label="בטל סימון" onPress={() => { const cur = { ...s }; cur.items[it.id].done = false; update(cur); }} />
                    ) : null}
                  </Row>
                </View>
              );
            })}

            {s.endedAt ? (
              <Win title="QUEST COMPLETE">
                <T glow style={{ fontFamily: F.bold }}>{'זמן אימון: ' + fmt((s.endedAt - s.startedAt!) / 1000) + (autoScore() ? ' · פיניש: ' + autoScore() : '')}</T>
                {!s.saved ? (
                  <>
                    <T muted style={{ fontSize: 14 }}>איך הרגשת? (1 = גמור, 5 = מעולה)</T>
                    <View style={{ flexDirection: 'row-reverse', gap: 6 }}>
                      {[1, 2, 3, 4, 5].map(n => <Btn key={n} label={String(n)} on={s.feel === n} style={{ flex: 1 }} onPress={() => update({ ...s, feel: n })} />)}
                    </View>
                    <T muted style={{ fontSize: 14 }}>מה היה הכי קשה? (לא חובה)</T>
                    <TextInput value={hard} onChangeText={setHard} multiline style={{ borderWidth: 1, borderColor: t.line, color: t.fg, fontFamily: F.body, fontSize: 16, padding: 10, textAlign: 'right', minHeight: 60 }} />
                    <Btn primary big label="השלם משימה ודווח למערכת" onPress={saveWorkout} />
                  </>
                ) : null}
                {msg ? <Notice text={msg.text} /> : null}
              </Win>
            ) : null}
          </View>
        )}

        {/* 6: achievements */}
        <Win title={'ACHIEVEMENTS ' + got.length + '/' + ACH.length} icon="★" tone="secret">
          <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 }}>
            {ACH.map(a => {
              const on = got.includes(a[0]);
              return (
                <View key={a[0]} style={{ width: '48%', flexGrow: 1, borderWidth: 1, borderColor: on ? t.good : t.line, padding: 8 }}>
                  <T style={{ fontFamily: F.bold, fontSize: 14, color: on ? t.good : t.fg }}>{on ? '✦ ' + a[0] : '🔒 ???'}</T>
                  <T muted style={{ fontSize: 13 }}>{on ? a[1] : 'רמז: ' + a[2]}</T>
                </View>
              );
            })}
          </View>
        </Win>

        {/* 7: log */}
        <View style={{ gap: 6 }}>
          <Text style={{ color: t.fg, fontFamily: F.heavy, fontSize: 20, textAlign: 'right' }}>יומן משימות</Text>
          {!history.length ? <T muted style={{ fontSize: 14 }}>המשימות שתשלים יופיעו כאן, עם הזמן והציון.</T> : history.slice(0, 15).map(x => (
            <View key={x.createdAt} style={{ borderWidth: 1, borderColor: t.line, padding: 10, flexDirection: 'row-reverse', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <T style={{ fontSize: 14 }}>{x.key === 'W' ? 'שקילה: ' + x.kg + ' ק"ג' : WORKOUTS[x.key as WorkoutKey]?.name || KEY_NAMES[x.key] || x.key}</T>
                <T muted style={{ fontSize: 13 }}>{new Date(x.createdAt).toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric' }) + (x.score ? ' · ציון: ' + x.score : '') + (x.feel ? ' · הרגשה ' + x.feel + '/5' : '')}</T>
              </View>
              <Text style={{ color: t.fg, fontFamily: F.mono, fontSize: 14 }}>{'WSQP'.includes(x.key) ? '' : fmt(x.totalSec)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {toast ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: 24 }}>
          <Win title="NOTIFICATION"><T glow style={{ textAlign: 'center', fontFamily: F.bold }}>{toast}</T></Win>
        </View>
      ) : null}
    </View>
  );
}

function Notice({ text }: { text: string }) {
  const t = useT();
  return (
    <View style={{ borderWidth: 1, borderColor: t.good, padding: 10, backgroundColor: t.goodSoft }}>
      <T style={{ fontFamily: F.bold }}><T style={{ color: t.good, fontFamily: F.monoBold }}>[התראה] </T>{text}</T>
    </View>
  );
}

function HowTo({ keys }: { keys?: string[] }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  if (!keys) return null;
  return (
    <View style={{ gap: 6 }}>
      <Pressable onPress={() => setOpen(!open)} hitSlop={8}><T style={{ color: t.live, fontFamily: F.bold, fontSize: 14 }}>{(open ? '▾ ' : '◂ ') + 'איך עושים?'}</T></Pressable>
      {open ? keys.map(k => (
        <View key={k} style={{ gap: 4, paddingTop: 8, borderTopWidth: 1, borderColor: t.line }}>
          <T style={{ fontFamily: F.bold, fontSize: 15 }}>{MOVES[k][0]}</T>
          <T muted style={{ fontSize: 14, lineHeight: 22 }}>{MOVES[k][1]}</T>
          <Pressable onPress={() => Linking.openURL('https://www.youtube.com/results?search_query=' + encodeURIComponent(MOVES[k][2]))}>
            <T style={{ color: t.live, fontFamily: F.bold, fontSize: 14 }}>▶ סרטון הדגמה</T>
          </Pressable>
        </View>
      )) : null}
    </View>
  );
}

function Spark({ values, color }: { values: number[]; color: string }) {
  const mn = Math.min(...values) - 0.5, mx = Math.max(...values) + 0.5;
  const pts = values.map((v, i) => (i / (values.length - 1) * 300).toFixed(1) + ',' + (44 - (v - mn) / (mx - mn) * 40).toFixed(1)).join(' ');
  return <Svg width="100%" height={48} viewBox="0 0 300 48" preserveAspectRatio="none"><Polyline points={pts} fill="none" stroke={color} strokeWidth={2.5} /></Svg>;
}
