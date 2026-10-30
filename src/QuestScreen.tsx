import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ScrollViewInstance, ViewInstance } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Win, T, Caps, Num, Btn, Row, Divider, Appear, Header, GoalHeading, useT } from './ui';
import { F } from './theme';
import { WORKOUTS, QUESTS, XP, MOVES, HOW, DEMOS, Item, WorkoutKey } from './data';
import { fmt, rxFor, cdFor, setsFor, itemSec, Session } from './logic';
import { useGame } from './game';
import { Demo } from './Demo';

type Game = ReturnType<typeof useGame>;

// A full-screen quest: a workout with its exercises, or a counter quest (daily / penalty)
export function QuestScreen({ g, onBack }: { g: Game; onBack: () => void }) {
  const s = g.s!;
  const isCounter = s.key === 'Q' || s.key === 'P';
  const scroll = useRef<ScrollViewInstance>(null);
  const refs = useRef<Record<string, ViewInstance | null>>({});
  const list = useRef<ViewInstance>(null);
  const listY = useRef(0), barH = useRef(80), barY = useRef(0);
  // the timer bar is see-through until content scrolls under it
  const [stuck, setStuck] = useState(false);
  // keep the exercise in progress on screen, just under the sticky timer bar
  // (a set tap never scrolls: only a newly active exercise or the report does).
  // Positions are measured when scrolling, since cards above may have collapsed since the last layout.
  const lastActive = useRef(s.active);
  useEffect(() => {
    const moved = s.active && s.active !== lastActive.current;
    lastActive.current = s.active;
    const key = moved ? s.active! : s.endedAt && !s.saved ? 'report' : undefined;
    if (!key) return;
    const id = setTimeout(() => {
      const el = refs.current[key];
      if (el && list.current) el.measureLayout(list.current, (_x, y) => scroll.current?.scrollTo({ y: Math.max(0, listY.current + y - barH.current - 10), animated: true }));
    }, 350);
    return () => clearTimeout(id);
  }, [s.active, s.endedAt]);
  return (
    <View style={{ flex: 1 }}>
      {/* once the timer bar is pinned, the back row shares its dark band so nothing shows between them */}
      <Row style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, justifyContent: 'space-between', backgroundColor: stuck && !isCounter ? 'rgb(1, 4, 9)' : 'transparent' }}>
        <Pressable onPress={onBack} disabled={g.running} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back" style={{ opacity: g.running ? 0.3 : 1 }}>
          <Caps size={12}>‹ Back</Caps>
        </Pressable>
      </Row>
      <ScrollView ref={scroll} scrollEventThrottle={32} onScroll={e => { const on = e.nativeEvent.contentOffset.y > barY.current + 1; if (on !== stuck) setStuck(on); }} contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 14 }} stickyHeaderIndices={isCounter ? undefined : [1]}>
        {isCounter ? <CounterQuest g={g} /> : <WorkoutTop g={g} />}
        {isCounter ? <View /> : <View onLayout={e => { barH.current = e.nativeEvent.layout.height; barY.current = e.nativeEvent.layout.y; }}><SessionBar g={g} stuck={stuck} /></View>}
        {isCounter ? <View /> : <View ref={list} onLayout={e => { listY.current = e.nativeEvent.layout.y; }}><WorkoutItems g={g} refs={refs.current} /></View>}
      </ScrollView>
    </View>
  );
}

function WorkoutTop({ g }: { g: Game }) {
  const t = useT(), s = g.s!, W = g.W!;
  return (
    <Appear>
      <Win hero title="QUEST INFO">
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Caps size={20} color={t.bright} style={{ textAlign: 'center' }}>{W.name.replace(/-/g, '\u2011')}</Caps>
          <T muted style={{ fontSize: 13 }}>{W.items.length + ' exercises · reward ' + (XP[s.key] || 0) + ' XP'}</T>
        </View>
      </Win>
    </Appear>
  );
}

function SessionBar({ g, stuck }: { g: Game; stuck: boolean }) {
  const t = useT(), s = g.s!, W = g.W!;
  const done = W.items.filter(i => s.items[i.id]?.done).length;
  return (
    <View style={{ backgroundColor: stuck ? 'rgb(1, 4, 9)' : 'transparent', paddingVertical: 10, marginHorizontal: -16, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: stuck ? t.line : 'transparent', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <View>
        <Num size={30}>{s.startedAt ? fmt(((s.endedAt || Date.now()) - s.startedAt) / 1000) : '00:00'}</Num>
        <Row style={{ gap: 3, marginTop: 4 }}>
          {W.items.map(i => <View key={i.id} style={{ width: 14, height: 4, backgroundColor: s.items[i.id]?.done ? t.good : s.active === i.id ? t.bright : t.dim }} />)}
          <Caps size={9} glow={false} style={{ color: t.muted, marginLeft: 4 }}>{done + '/' + W.items.length}</Caps>
        </Row>
      </View>
      {!s.startedAt ? <Btn primary label="Start quest" onPress={g.actions.start} />
        : !s.endedAt ? <Btn label="End quest" onPress={g.actions.end} />
        : null}
    </View>
  );
}

function Check({ on, color }: { on: boolean; color: string }) {
  const t = useT();
  return (
    <View style={{ width: 22, height: 22, borderWidth: 1, borderColor: on ? color : t.muted, alignItems: 'center', justifyContent: 'center', boxShadow: on ? `0 0 8px ${t.glow}` : undefined, marginTop: 1 }}>
      {on ? <Text style={{ color, fontFamily: F.bold, fontSize: 14, lineHeight: 16 }}>✓</Text> : null}
    </View>
  );
}

function WorkoutItems({ g, refs }: { g: Game; refs: Record<string, ViewInstance | null> }) {
  const t = useT(), s = g.s!, W = g.W!;
  const [hard, setHard] = useState('');
  return (
    <View style={{ gap: 12 }}>
      {W.items.map(it => <View key={it.id} ref={el => { refs[it.id] = el; }}><ItemCard g={g} it={it} s={s} /></View>)}
      {s.endedAt && !s.saved ? (
        <Appear style={{}}>
          <View ref={el => { refs.report = el; }} />
          <Win title="QUEST REPORT">
            <Row style={{ justifyContent: 'space-between' }}>
              <View><Caps size={10} glow={false} style={{ color: t.muted }}>Time</Caps><Num size={24}>{fmt((s.endedAt - s.startedAt!) / 1000)}</Num></View>
              {g.actions.autoScore() ? <View style={{ alignItems: 'flex-end' }}><Caps size={10} glow={false} style={{ color: t.muted }}>Finisher</Caps><Num size={24}>{g.actions.autoScore()}</Num></View> : null}
            </Row>
            <Divider />
            <T muted style={{ fontSize: 13 }}>How did it feel? (1 = destroyed, 5 = easy)</T>
            <Row>{[1, 2, 3, 4, 5].map(n => <Btn key={n} label={String(n)} on={s.feel === n} style={{ flex: 1 }} onPress={() => g.actions.feel(n)} />)}</Row>
            <TextInput value={hard} onChangeText={setHard} placeholder="Hardest part (optional)" placeholderTextColor={t.muted} multiline
              style={{ borderWidth: 1, borderColor: t.line, color: t.fg, fontFamily: F.medium, fontSize: 15, padding: 10, minHeight: 56, backgroundColor: 'rgba(0,0,0,0.3)' }} />
            <Btn primary big label="Report to the System" onPress={() => g.actions.saveWorkout(hard)} />
          </Win>
        </Appear>
      ) : null}
      {s.saved ? <Btn label="Quest reported ✓" disabled /> : null}
    </View>
  );
}

function ItemCard({ g, it, s }: { g: Game; it: Item; s: Session }) {
  const t = useT();
  const st = s.items[it.id] || { sec: 0 }, active = s.active === it.id, nSets = setsFor(it, s.week);
  const sec = itemSec(st), cd = cdFor(it, s.week);
  const timer = cd ? (sec >= cd ? "TIME'S UP" : fmt(cd - sec)) : '';
  const live = !!s.startedAt && !s.endedAt;
  if (st.done && !active) {
    return (
      <View style={{ borderWidth: 1, borderColor: 'rgba(89,232,255,0.3)', backgroundColor: 'rgba(89,232,255,0.05)', paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Check on color={t.good} />
        <Text numberOfLines={1} style={{ flex: 1, color: t.good, fontFamily: F.semi, fontSize: 14 }}>{it.name}</Text>
        {sec ? <Num size={13} color={t.muted}>{fmt(sec)}</Num> : null}
        {live ? <Pressable onPress={() => g.actions.undoItem(it.id)} hitSlop={10}><Caps size={9} glow={false} style={{ color: t.muted }}>Undo</Caps></Pressable> : null}
      </View>
    );
  }
  const nextSet = nSets ? Array.from({ length: nSets }, (_, i) => i).find(i => !st.sets?.[i]) ?? -1 : -1;
  const emomMin = it.emom && cd ? Math.min(Math.floor(sec / 60) + 1, cd / 60) : 0;
  return (
    <View style={{ borderWidth: 1, borderColor: active ? t.edge : t.line, padding: 14, gap: 10, backgroundColor: active ? 'rgba(40, 110, 200, 0.12)' : 'rgba(4, 10, 24, 0.7)',
      boxShadow: active ? `0 0 16px ${t.glow}, inset 0 0 20px ${t.glow}` : undefined, opacity: st.done && !active ? 0.75 : 1 }}>
      <Row style={{ alignItems: 'flex-start', gap: 12 }}>
        <Check on={!!st.done} color={t.good} />
        <View style={{ flex: 1, gap: 2 }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <T style={{ fontFamily: F.semi, fontSize: 16, lineHeight: 22, flex: 1, color: st.done ? t.good : t.fg }}>{it.name}</T>
            {it.tag ? <Caps size={10} glow={false} style={{ color: t.muted }}>{it.tag}</Caps> : null}
          </Row>
          <T style={{ fontFamily: F.bold, fontSize: 16, color: t.bright }}>{rxFor(it, s.week)}</T>
          {it.steps ? it.steps.map(x => <T key={x} muted style={{ fontSize: 13, lineHeight: 20 }}>{'· ' + x}</T>) : null}
          {it.note ? <T muted style={{ fontSize: 14, lineHeight: 20 }}>{it.note}</T> : null}
        </View>
      </Row>
      <Demo keys={it.how || HOW[it.id]} />
      {nSets ? (
        <Row>
          {Array.from({ length: nSets }, (_, i) => {
            const on = !!st.sets?.[i] || !!st.done;
            return <Btn key={i} small label={'Set ' + (i + 1)} on={on} disabled={!live || !!st.done} onPress={() => g.actions.toggleSet(it, i, nSets)} style={{ flex: 1 }} />;
          })}
        </Row>
      ) : null}
      {timer || live ? (
        <Row>
          {timer ? (
            <View style={{ minWidth: 76 }}>
              <Num size={active ? 34 : 20} color={active ? t.bright : t.muted}>{timer}</Num>
              {active && emomMin ? <Caps size={9} glow={false} style={{ color: t.muted }}>{'Minute ' + emomMin + ' / ' + cd / 60}</Caps> : null}
            </View>
          ) : null}
          {live ? (active ? (
            <>
              {nSets && nextSet >= 0
                ? <Btn primary small label={'Set ' + (nextSet + 1) + ' of ' + nSets + ' done'} onPress={() => g.actions.toggleSet(it, nextSet, nSets)} style={{ flex: 1 }} />
                : <Btn primary small label="Done" onPress={() => g.actions.finishItem(it.id)} style={{ flex: 1 }} />}
              {it.finisher && it.countdown && !it.emom ? <Btn small label={'Round done (' + (st.rounds || 0) + ')'} onPress={() => g.actions.round(it.id)} style={{ flex: 1 }} /> : null}
            </>
          ) : !st.done ? <Btn small label={st.sec ? 'Resume' : 'Start'} onPress={() => g.actions.startItem(it.id)} style={{ flex: 1 }} />
            : <Btn small label="Undo" onPress={() => g.actions.undoItem(it.id)} style={{ flex: 1 }} />) : null}
        </Row>
      ) : null}
      <HowTo keys={it.how || HOW[it.id]} />
    </View>
  );
}

function CounterQuest({ g }: { g: Game }) {
  const t = useT(), s = g.s!;
  const pen = s.key === 'P', Qd = QUESTS[s.key as 'Q' | 'P'];
  const goals = pen ? QUESTS.P.goals(g.gear, g.kit) : QUESTS.Q.goals(s.week, g.fit);
  const count = (id: string, timer?: boolean) => { const c = s.counts?.[id] || 0; return timer && s.plankSince ? c + Math.floor((Date.now() - s.plankSince) / 1000) : c; };
  const all = goals.every(x => count(x.id, x.timer) >= x.target);
  const [how, setHow] = useState<string | null>(null);
  return (
    <Appear>
      <Win hero title="QUEST INFO" tone={pen ? 'penalty' : 'normal'}>
        <T glow style={{ textAlign: 'center', fontSize: 15, color: t.fg }}>{'[' + (pen ? 'Penalty Quest: Survival' : 'Daily Quest: ' + Qd.title) + ' has arrived.]'}</T>
        <GoalHeading />
        <View style={{ gap: 4, paddingHorizontal: 6 }}>
          {goals.map(x => {
            const n = Math.min(count(x.id, x.timer), x.target), met = n >= x.target;
            const toggle = () => { if (!s.saved && !(x.timer && s.plankSince)) g.actions.count(x.id, met ? -x.target : x.target, x.target); };
            return (
              <View key={x.id} style={{ gap: 6 }}>
                <Pressable onPress={toggle} accessibilityRole="checkbox" accessibilityState={{ checked: met }} accessibilityLabel={x.label}
                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, backgroundColor: pressed ? 'rgba(150,215,255,0.08)' : 'transparent' })}>
                  <Row style={{ flex: 1, gap: 10 }}>
                    <T glow style={{ fontSize: 18, color: met ? t.good : t.fg }}>{x.label}</T>
                    <Pressable onPress={() => setHow(how === x.id ? null : x.id)} hitSlop={10} accessibilityLabel={'How to do ' + x.label}
                      style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: how === x.id ? t.bright : t.muted, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: how === x.id ? t.bright : t.muted, fontFamily: F.bold, fontSize: 11, lineHeight: 13 }}>?</Text>
                    </Pressable>
                  </Row>
                  <Num size={18} color={met ? t.good : t.fg}>{'[' + n + '/' + x.target + (x.unit || '') + ']'}</Num>
                  <Check on={met} color={t.good} />
                </Pressable>
                {x.timer && !met ? (
                  <Row>
                    <Btn small primary label={s.plankSince ? 'Stop timer' : n ? 'Resume timer' : 'Start timer'} disabled={!!s.saved} onPress={() => g.actions.plank(x.id, x.target)} />
                    <T muted style={{ fontSize: 12 }}>or tap the goal when done</T>
                  </Row>
                ) : null}
                <Demo keys={HOW[x.how]} />
                {how === x.id ? <HowTo keys={HOW[x.how]} open /> : null}
              </View>
            );
          })}
        </View>
        <T glow style={{ fontSize: 15, textAlign: 'center', lineHeight: 26, marginTop: 6, paddingHorizontal: 10 }}>
          {pen ? <>No XP is awarded for a <Text style={{ color: t.warn }}>penalty</Text> quest.</>
            : <><Text style={{ color: t.warn }}>WARNING</Text>: Failure to complete the daily quest by midnight will result in an appropriate <Text style={{ color: t.warn }}>penalty</Text>.</>}
        </T>
        <Btn primary big label={s.saved ? 'Quest reported ✓' : 'Complete quest'} disabled={!all || !!s.saved} onPress={g.actions.saveQuest} />
      </Win>
    </Appear>
  );
}

function HowTo({ keys, open: forced }: { keys?: string[]; open?: boolean }) {
  const t = useT();
  const [opened, setOpen] = useState(false);
  const open = forced || opened;
  if (!keys) return null;
  return (
    <View style={{ gap: 8 }}>
      {forced ? null : <Pressable onPress={() => setOpen(!open)} hitSlop={8}><Caps size={10} color={t.accent} glow={false}>{(open ? '▾ ' : '▸ ') + 'How to'}</Caps></Pressable>}
      {open ? keys.map(k => (
        <View key={k} style={{ gap: 4, paddingTop: 8, borderTopWidth: 1, borderColor: t.line }}>
          <T style={{ fontFamily: F.semi, fontSize: 14 }}>{MOVES[k][0]}</T>
          <T muted style={{ fontSize: 13, lineHeight: 20 }}>{MOVES[k][1]}</T>
          <Pressable onPress={() => WebBrowser.openBrowserAsync('https://www.youtube.com/results?search_query=' + encodeURIComponent(MOVES[k][2]), { toolbarColor: '#050b18', controlsColor: '#9fd8ff', presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET }).catch(() => {})}>
            <Caps size={10} color={t.accent} glow={false}>▶ Watch a demo</Caps>
          </Pressable>
        </View>
      )) : null}
    </View>
  );
}

export { Header };
