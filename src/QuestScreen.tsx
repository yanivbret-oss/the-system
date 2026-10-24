import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ScrollViewInstance, Linking } from 'react-native';
import { Win, T, Caps, Num, Btn, Row, Divider, Appear, Header, useT } from './ui';
import { F } from './theme';
import { WORKOUTS, QUESTS, XP, MOVES, HOW, Item, WorkoutKey } from './data';
import { fmt, rxFor, cdFor, setsFor, itemSec, Session } from './logic';
import { useGame } from './game';

type Game = ReturnType<typeof useGame>;

// A full-screen quest: a workout with its exercises, or a counter quest (daily / penalty)
export function QuestScreen({ g, onBack }: { g: Game; onBack: () => void }) {
  const s = g.s!;
  const isCounter = s.key === 'Q' || s.key === 'P';
  const scroll = useRef<ScrollViewInstance>(null);
  const ys = useRef<Record<string, number>>({});
  const listY = useRef(0);
  // keep the exercise in progress on screen, under the sticky timer bar
  useEffect(() => {
    const target = s.active ? ys.current[s.active] : s.endedAt && !s.saved ? ys.current.report : undefined;
    if (target !== undefined) setTimeout(() => scroll.current?.scrollTo({ y: Math.max(0, listY.current + target - 96), animated: true }), 400);
  }, [s.active, s.endedAt]);
  return (
    <View style={{ flex: 1 }}>
      <Row style={{ paddingHorizontal: 16, paddingTop: 10, justifyContent: 'space-between' }}>
        <Pressable onPress={onBack} disabled={g.running} hitSlop={12} style={{ opacity: g.running ? 0.3 : 1 }}>
          <Caps size={12}>‹ Back</Caps>
        </Pressable>
        <Caps size={11} glow={false} style={{ color: useT().muted }}>{'Cycle week ' + s.week + ' / 4'}</Caps>
      </Row>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 14 }} stickyHeaderIndices={isCounter ? undefined : [1]}>
        {isCounter ? <CounterQuest g={g} /> : <WorkoutTop g={g} />}
        {isCounter ? <View /> : <SessionBar g={g} />}
        {isCounter ? <View /> : <View onLayout={e => { listY.current = e.nativeEvent.layout.y; }}><WorkoutItems g={g} ys={ys.current} /></View>}
      </ScrollView>
    </View>
  );
}

function WorkoutTop({ g }: { g: Game }) {
  const t = useT(), s = g.s!, W = WORKOUTS[s.key as WorkoutKey];
  return (
    <Appear>
      <Win title="QUEST INFO">
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Caps size={20} color={t.bright}>{W.name}</Caps>
          <T muted style={{ fontSize: 13 }}>{W.items.length + ' exercises · reward ' + (XP[s.key] || 0) + ' XP'}</T>
        </View>
        <Row style={{ justifyContent: 'center' }}>
          {[1, 2, 3, 4].map(w => <Btn key={w} small label={'W' + w} on={w === s.week} disabled={g.running} onPress={() => g.actions.setWeek(w)} style={{ minWidth: 52 }} />)}
        </Row>
      </Win>
    </Appear>
  );
}

function SessionBar({ g }: { g: Game }) {
  const t = useT(), s = g.s!, W = WORKOUTS[s.key as WorkoutKey];
  const done = W.items.filter(i => s.items[i.id]?.done).length;
  return (
    <View style={{ backgroundColor: t.bg, paddingVertical: 10, borderBottomWidth: 1, borderColor: t.line, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
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
    <View style={{ width: 22, height: 22, borderWidth: 1, borderColor: on ? color : t.dim, alignItems: 'center', justifyContent: 'center', boxShadow: on ? `0 0 8px ${t.glow}` : undefined, marginTop: 1 }}>
      {on ? <Text style={{ color, fontFamily: F.bold, fontSize: 14, lineHeight: 16 }}>✓</Text> : null}
    </View>
  );
}

function WorkoutItems({ g, ys }: { g: Game; ys: Record<string, number> }) {
  const t = useT(), s = g.s!, W = WORKOUTS[s.key as WorkoutKey];
  const [hard, setHard] = useState('');
  return (
    <View style={{ gap: 12 }}>
      {W.items.map(it => <View key={it.id} onLayout={e => { ys[it.id] = e.nativeEvent.layout.y; }}><ItemCard g={g} it={it} s={s} /></View>)}
      {s.endedAt && !s.saved ? (
        <Appear style={{}}>
          <View onLayout={e => { ys.report = e.nativeEvent.layout.y; }} />
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
  const timer = cd ? (sec >= cd ? "TIME'S UP" : fmt(cd - sec)) : sec ? fmt(sec) : '';
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
      {nSets ? (
        <Row style={{ flexWrap: 'wrap', paddingLeft: 34 }}>
          {Array.from({ length: nSets }, (_, i) => {
            const on = !!st.sets?.[i] || !!st.done;
            return <Btn key={i} small label={'Set ' + (i + 1)} on={on} disabled={!live || !!st.done} onPress={() => g.actions.toggleSet(it, i, nSets)} style={{ minWidth: 64 }} />;
          })}
        </Row>
      ) : null}
      {timer || live ? (
        <Row style={{ paddingLeft: 34, flexWrap: 'wrap' }}>
          {timer ? (
            <View style={{ minWidth: 76 }}>
              <Num size={active ? 34 : 20} color={active ? t.bright : t.muted}>{timer}</Num>
              {active && emomMin ? <Caps size={9} glow={false} style={{ color: t.muted }}>{'Minute ' + emomMin + ' / ' + cd / 60}</Caps> : null}
            </View>
          ) : null}
          {live ? (active ? (
            <>
              <Btn primary small label="Done" onPress={() => g.actions.finishItem(it.id)} />
              {it.finisher && it.countdown && !it.emom ? <Btn small label={'Round done (' + (st.rounds || 0) + ')'} onPress={() => g.actions.round(it.id)} /> : null}
            </>
          ) : !st.done ? <Btn small label={st.sec ? 'Resume' : 'Start'} onPress={() => g.actions.startItem(it.id)} />
            : <Btn small label="Undo" onPress={() => g.actions.undoItem(it.id)} />) : null}
        </Row>
      ) : null}
      <View style={{ paddingLeft: 34 }}><HowTo keys={HOW[it.id]} /></View>
    </View>
  );
}

function CounterQuest({ g }: { g: Game }) {
  const t = useT(), s = g.s!;
  const pen = s.key === 'P', Qd = QUESTS[s.key as 'Q' | 'P'];
  const goals = pen ? QUESTS.P.goals() : QUESTS.Q.goals(s.week);
  const count = (id: string, timer?: boolean) => { const c = s.counts?.[id] || 0; return timer && s.plankSince ? c + Math.floor((Date.now() - s.plankSince) / 1000) : c; };
  const all = goals.every(x => count(x.id, x.timer) >= x.target);
  return (
    <Appear>
      <Win title="QUEST INFO" tone={pen ? 'penalty' : 'normal'}>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Caps size={12} glow={false} style={{ color: pen ? t.warn : t.muted }}>{pen ? 'Penalty Zone' : 'Daily Quest'}</Caps>
          <T glow style={{ fontFamily: F.semi, fontSize: 18, textAlign: 'center', color: t.bright }}>{Qd.title}</T>
        </View>
        <Caps size={12} style={{ textAlign: 'center' }}>Goals</Caps>
        {goals.map(x => {
          const n = Math.min(count(x.id, x.timer), x.target), met = n >= x.target;
          return (
            <View key={x.id} style={{ gap: 8 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row><Check on={met} color={t.good} /><T style={{ fontFamily: F.semi, color: met ? t.good : t.fg }}>{x.label}</T></Row>
                <Num size={20} color={met ? t.good : t.bright}>{'[' + n + '/' + x.target + (x.unit || '') + ']'}</Num>
              </Row>
              <Row style={{ paddingLeft: 30, flexWrap: 'wrap' }}>
                {x.timer
                  ? <Btn small primary label={s.plankSince ? 'Stop' : n ? 'Resume timer' : 'Start timer'} disabled={met || !!s.saved} onPress={() => g.actions.plank(x.id, x.target)} />
                  : <>
                      {x.steps!.map(v => <Btn key={v} small label={'+' + v} disabled={met || !!s.saved} style={{ minWidth: 50 }} onPress={() => g.actions.count(x.id, v, x.target)} />)}
                      <Btn small label="−1" disabled={!n || !!s.saved} style={{ minWidth: 50 }} onPress={() => g.actions.count(x.id, -1, x.target)} />
                    </>}
              </Row>
              <View style={{ paddingLeft: 30 }}><HowTo keys={HOW[x.how]} /></View>
            </View>
          );
        })}
        <Divider />
        <T style={{ color: t.warn, fontSize: 13, textAlign: 'center', lineHeight: 20 }}>{(pen ? '' : 'WARNING: ') + Qd.warn}</T>
        <Btn primary big label={s.saved ? 'Quest reported ✓' : 'Complete quest'} disabled={!all || !!s.saved} onPress={g.actions.saveQuest} />
      </Win>
    </Appear>
  );
}

function HowTo({ keys }: { keys?: string[] }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  if (!keys) return null;
  return (
    <View style={{ gap: 8 }}>
      <Pressable onPress={() => setOpen(!open)} hitSlop={8}><Caps size={10} color={t.accent} glow={false}>{(open ? '▾ ' : '▸ ') + 'How to'}</Caps></Pressable>
      {open ? keys.map(k => (
        <View key={k} style={{ gap: 4, paddingTop: 8, borderTopWidth: 1, borderColor: t.line }}>
          <T style={{ fontFamily: F.semi, fontSize: 14 }}>{MOVES[k][0]}</T>
          <T muted style={{ fontSize: 13, lineHeight: 20 }}>{MOVES[k][1]}</T>
          <Pressable onPress={() => Linking.openURL('https://www.youtube.com/results?search_query=' + encodeURIComponent(MOVES[k][2]))}>
            <Caps size={10} color={t.accent} glow={false}>▶ Watch a demo</Caps>
          </Pressable>
        </View>
      )) : null}
    </View>
  );
}

export { Header };
