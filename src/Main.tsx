import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { Win, T, Caps, Num, Btn, Row, Divider, Appear, Ring, Meter, useT, Tone } from './ui';
import { F } from './theme';
import { WORKOUTS, ORDER, QUESTS, XP, DAYS, DAY_LETTERS, KEY_NAMES, WorkoutKey } from './data';
import {
  Profile, Rec, player, streak, onDay, penaltyActive, secretFor, weekStart, weights, ACH, fmt, rxFor, QUEST_KEYS, startOfDay, parseYmd,
} from './logic';
import { useGame } from './game';
import { QuestScreen } from './QuestScreen';

type Tab = 'quest' | 'status' | 'log';

export function Main({ profile, history, setHistory, onRedGate }: { profile: Profile; history: Rec[]; setHistory: (h: Rec[]) => void; onRedGate: (on: boolean) => void }) {
  const g = useGame(profile, history, setHistory);
  const [tab, setTab] = useState<Tab>('quest');
  const [inQuest, setInQuest] = useState(false);
  const s = g.s;
  const red = !!s && s.key === 'D' && !s.saved && (inQuest || g.running);
  useEffect(() => { onRedGate(red); }, [red]);
  if (!s) return null;

  const showQuest = inQuest || g.running;
  const open = (key: string) => { if (s.key !== key || s.saved) g.actions.open(key); setInQuest(true); };

  return (
    <View style={{ flex: 1 }}>
      {showQuest ? <QuestScreen g={g} onBack={() => setInQuest(false)} /> : (
        <>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 16 }}>
            {tab === 'quest' ? <QuestTab g={g} profile={profile} history={history} open={open} />
              : tab === 'status' ? <StatusTab profile={profile} history={history} />
              : <LogTab history={history} />}
          </ScrollView>
          <TabBar tab={tab} setTab={setTab} />
        </>
      )}
      {g.notices.length ? <NoticeOverlay n={g.notices[0]} onClose={g.dismiss} /> : null}
    </View>
  );
}

function TabBar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const t = useT();
  const items: [Tab, string][] = [['quest', 'Quests'], ['status', 'Status'], ['log', 'Log']];
  return (
    <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: t.line, backgroundColor: 'rgba(2, 6, 17, 0.9)' }}>
      {items.map(([k, label]) => {
        const on = k === tab;
        return (
          <Pressable key={k} onPress={() => setTab(k)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={{ flex: 1, alignItems: 'center', paddingVertical: 14 }}>
            <View style={{ position: 'absolute', top: -1, left: '25%', right: '25%', height: 2, backgroundColor: on ? t.bright : 'transparent', boxShadow: on ? `0 0 10px 1px ${t.railGlow}` : undefined }} />
            <Caps size={12} color={on ? t.bright : t.muted} glow={on}>{label}</Caps>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------- QUESTS: today's quest, the week strip, notifications, other gates
function QuestTab({ g, profile, history, open }: { g: ReturnType<typeof useGame>; profile: Profile; history: Rec[]; open: (k: string) => void }) {
  const t = useT();
  const today = g.today, p = player(history);
  const todayW = g.todayW;
  const qKey = todayW || 'Q';
  const qDone = onDay(history, today, QUEST_KEYS);
  const penalty = penaltyActive(history, profile, today);
  const secret = secretFor(today);
  const showSecret = !!secret && !onDay(history, today, ['S']);
  const ws = weights(history);
  const weighDue = today.getDay() >= 5 && !ws.some(x => new Date(x.createdAt) >= weekStart(today));
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).getTime();
  const left = Math.max(0, (midnight - Date.now()) / 1000);
  const h = Math.floor(left / 3600), m = Math.floor((left % 3600) / 60), sec = Math.floor(left % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  const goals: [string, string][] = todayW
    ? WORKOUTS[todayW].items.filter(i => i.id !== 'warm').map(i => [i.name, rxFor(i, g.week)])
    : QUESTS.Q.goals(g.week).map(x => [x.label, x.target + (x.unit || '')]);

  return (
    <>
      <TopBar profile={profile} level={p.level} />
      <WeekStrip history={history} profile={profile} today={today} />

      {penalty ? (
        <Appear>
          <Win title="PENALTY" tone="penalty">
            <T style={{ textAlign: 'center' }}>{"Yesterday's daily quest was not completed."}</T>
            <T style={{ textAlign: 'center', color: t.warn, fontFamily: F.semi }}>You have been moved to the Penalty Zone.</T>
            <T muted style={{ textAlign: 'center', fontSize: 13 }}>100 kettlebell swings and 30 burpees, today.</T>
            <Btn danger label="Enter the Penalty Zone" onPress={() => open('P')} />
          </Win>
        </Appear>
      ) : null}

      <Appear delay={80}>
        <Win title="DAILY QUEST">
          <View style={{ alignItems: 'center', gap: 2 }}>
            <Caps size={11} glow={false} style={{ color: t.muted }}>{todayW ? 'Today’s training' : 'Rest day'}</Caps>
            <T glow style={{ fontFamily: F.semi, fontSize: 18, textAlign: 'center', color: t.bright }}>{todayW ? WORKOUTS[todayW].name : QUESTS.Q.title}</T>
          </View>
          <Caps size={12} style={{ textAlign: 'center' }}>Goals</Caps>
          <View style={{ gap: 6 }}>
            {goals.map(([name, rx]) => (
              rx.length <= 18 ? (
                <Row key={name} style={{ justifyContent: 'space-between' }}>
                  <T style={{ flex: 1, fontSize: 14 }}>{name}</T>
                  <T glow style={{ fontSize: 14, fontFamily: F.semi, color: qDone ? t.good : t.bright }}>{qDone ? '[Complete]' : '[' + rx + ']'}</T>
                </Row>
              ) : (
                <View key={name}>
                  <T style={{ fontSize: 14 }}>{name}</T>
                  <T glow style={{ fontSize: 13, lineHeight: 19, fontFamily: F.semi, color: qDone ? t.good : t.bright }}>{qDone ? '[Complete]' : '[' + rx + ']'}</T>
                </View>
              )
            ))}
          </View>
          <Divider />
          <Row style={{ gap: 16 }}>
            <Ring size={92} progress={qDone ? 1 : left / 86400} color={qDone ? t.good : undefined}>
              {qDone ? <Text style={{ color: t.good, fontSize: 28, fontFamily: F.bold }}>✓</Text>
                : <><Num size={15}>{pad(h) + ':' + pad(m)}</Num><Text style={{ color: t.muted, fontFamily: F.medium, fontSize: 10 }}>{pad(sec) + 's'}</Text></>}
            </Ring>
            <View style={{ flex: 1, gap: 6 }}>
              {qDone
                ? <T glow style={{ color: t.good, fontFamily: F.semi }}>Quest complete. The System has recorded it.</T>
                : <T style={{ color: t.warn, fontSize: 13, lineHeight: 19 }}>WARNING: failing to complete the daily quest by midnight will result in a penalty.</T>}
              <T muted style={{ fontSize: 12 }}>{'Reward: ' + (XP[qKey] || 0) + ' XP'}</T>
            </View>
          </Row>
          {!qDone ? <Btn primary big label="Accept quest" onPress={() => open(qKey)} /> : null}
        </Win>
      </Appear>

      {showSecret ? (
        <Appear delay={160}>
          <Win title="SECRET QUEST" icon="?" tone="secret">
            <T style={{ textAlign: 'center' }}>The System has detected an opportunity. Available today only:</T>
            <T glow style={{ textAlign: 'center', fontFamily: F.semi, color: t.bright }}>{secret}</T>
            <T muted style={{ textAlign: 'center', fontSize: 12 }}>Reward: 50 XP. No penalty for declining.</T>
            <Btn label="Done" onPress={() => g.actions.saveSecret(secret!)} />
          </Win>
        </Appear>
      ) : null}

      {weighDue ? <WeighIn g={g} last={ws[ws.length - 1]?.kg} /> : null}

      <View style={{ gap: 10, marginTop: 4 }}>
        <Caps size={12} style={{ color: t.muted }} glow={false}>Gates this week</Caps>
        {ORDER.map(k => {
          const w = WORKOUTS[k], cleared = history.some(x => x.key === k && new Date(x.createdAt) >= weekStart(today));
          const isRed = k === 'D';
          return (
            <Pressable key={k} onPress={() => open(k)} style={({ pressed }) => ({ borderWidth: 1, borderColor: isRed ? 'rgba(255,45,79,0.6)' : t.line, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
              backgroundColor: pressed ? 'rgba(150,215,255,0.1)' : 'rgba(4,10,24,0.6)', boxShadow: isRed ? `0 0 12px ${t.warnGlow}` : undefined })}>
              <View style={{ width: 42, alignItems: 'center' }}>
                <Caps size={11} glow={false} style={{ color: isRed ? t.warn : t.muted }}>{DAYS[w.day].slice(0, 3)}</Caps>
              </View>
              <View style={{ flex: 1 }}>
                <T style={{ fontFamily: F.semi, color: isRed ? t.warn : t.fg }}>{w.name}</T>
                <T muted style={{ fontSize: 12 }}>{w.items.length + ' exercises · ' + XP[k] + ' XP'}</T>
              </View>
              {cleared ? <Caps size={10} color={t.good}>Cleared</Caps> : <Caps size={14} glow={false} style={{ color: t.muted }}>›</Caps>}
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

function TopBar({ profile, level }: { profile: Profile; level: number }) {
  const t = useT();
  return (
    <Row style={{ justifyContent: 'space-between', paddingTop: 4 }}>
      <View>
        <Caps size={20} color={t.bright} style={{ letterSpacing: 6 }}>The System</Caps>
        <T muted style={{ fontSize: 12 }}>{'Player: ' + profile.name}</T>
      </View>
      <Row style={{ gap: 6 }}>
        <View style={{ borderWidth: 1, borderColor: t.edge, paddingHorizontal: 10, paddingVertical: 4, boxShadow: `0 0 10px ${t.glow}` }}>
          <Caps size={11} color={t.bright}>{'Lv. ' + level}</Caps>
        </View>
        <View style={{ borderWidth: 1, borderColor: t.edge, width: 34, alignItems: 'center', paddingVertical: 4, boxShadow: `0 0 10px ${t.glow}` }}>
          <Caps size={11} color={t.bright}>{profile.rank}</Caps>
        </View>
      </Row>
    </Row>
  );
}

// Sunday to Saturday: cleared days glow, missed days are red, today is outlined
function WeekStrip({ history, profile, today }: { history: Rec[]; profile: Profile; today: Date }) {
  const t = useT();
  const ws = weekStart(today), start = parseYmd(profile.startDate), t0 = startOfDay(today).getTime();
  return (
    <Row style={{ justifyContent: 'space-between', gap: 6 }}>
      {Array.from({ length: 7 }, (_, i) => {
        const d = new Date(ws); d.setDate(ws.getDate() + i);
        const done = onDay(history, d, QUEST_KEYS), past = d.getTime() < t0, isToday = d.getTime() === t0;
        const missed = past && !done && d >= start;
        const c = done ? t.good : missed ? t.warn : isToday ? t.bright : t.dim;
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 8, borderWidth: 1, borderColor: isToday ? t.edge : done ? 'rgba(89,232,255,0.35)' : t.line,
            backgroundColor: done ? 'rgba(89,232,255,0.08)' : 'rgba(0,0,0,0.25)', boxShadow: isToday ? `0 0 10px ${t.glow}` : undefined }}>
            <Caps size={10} glow={false} style={{ color: isToday ? t.bright : t.muted, letterSpacing: 1 }}>{DAY_LETTERS[i]}</Caps>
            <Text style={{ color: c, fontFamily: F.bold, fontSize: 13 }}>{done ? '✓' : missed ? '✕' : d.getDate()}</Text>
          </View>
        );
      })}
    </Row>
  );
}

function WeighIn({ g, last }: { g: ReturnType<typeof useGame>; last?: number }) {
  const t = useT();
  const [kg, setKg] = useState('');
  return (
    <Appear delay={200}>
      <Win title="WEIGH-IN" icon="i">
        <T style={{ textAlign: 'center', fontSize: 14 }}>Weekly weigh-in. In the morning, before eating. +20 XP</T>
        <Row>
          <TextInput value={kg} onChangeText={setKg} keyboardType="decimal-pad" placeholder={last ? String(last) : '80.0'} placeholderTextColor={t.muted}
            style={{ flex: 1, minWidth: 0, width: 80, borderWidth: 1, borderColor: t.line, color: t.bright, fontFamily: F.semi, fontSize: 20, textAlign: 'center', padding: 8, backgroundColor: 'rgba(0,0,0,0.3)' }} />
          <Caps size={12} glow={false} style={{ color: t.muted }}>kg</Caps>
          <Btn primary label="Save" onPress={() => { const v = Math.round(parseFloat(kg) * 10) / 10; if (v > 30 && v < 250) { g.actions.saveWeight(v); setKg(''); } }} />
        </Row>
      </Win>
    </Appear>
  );
}

// ---------- STATUS: the player's window, stats, weight, achievements
function StatusTab({ profile, history }: { profile: Profile; history: Rec[] }) {
  const t = useT();
  const p = player(history), today = new Date();
  const ws = weights(history);
  const got = ACH.filter(a => a[3](history, today)).map(a => a[0]);
  const stats: [string, string, number][] = [['STR', 'Strength', p.str], ['VIT', 'Endurance', p.end], ['AGI', 'Mobility', p.agi]];
  return (
    <>
      <Appear>
        <Win title="STATUS" icon="i">
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View>
              <Caps size={10} glow={false} style={{ color: t.muted }}>Name</Caps>
              <T glow style={{ fontFamily: F.semi, fontSize: 20, color: t.bright }}>{profile.name}</T>
              <Caps size={10} glow={false} style={{ color: t.muted, marginTop: 6 }}>Title</Caps>
              <T style={{ fontSize: 14 }}>{p.level >= 10 ? 'Hunter' : p.level >= 5 ? 'Awakened' : 'Player'}</T>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Caps size={10} glow={false} style={{ color: t.muted }}>Level</Caps>
              <Num size={52}>{p.level}</Num>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Caps size={10} glow={false} style={{ color: t.muted }}>Rank</Caps>
              <Num size={36} color={t.accent}>{profile.rank}</Num>
            </View>
          </Row>
          <View style={{ gap: 6 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Caps size={10} glow={false} style={{ color: t.muted }}>Experience</Caps>
              <Caps size={10} glow={false} style={{ color: t.muted }}>{p.into + ' / ' + p.need + ' XP'}</Caps>
            </Row>
            <Meter value={p.into / p.need} height={8} />
          </View>
          <Divider />
          {stats.map(([k, name, v]) => (
            <Row key={k} style={{ gap: 12 }}>
              <Caps size={12} color={t.bright} style={{ width: 42 }}>{k}</Caps>
              <View style={{ flex: 1 }}><Meter value={v / 100} /></View>
              <Num size={16} style={{ width: 34, textAlign: 'right' }}>{v}</Num>
              <T muted style={{ fontSize: 11, width: 74 }}>{name}</T>
            </Row>
          ))}
          <Divider />
          <Row style={{ justifyContent: 'space-around' }}>
            <View style={{ alignItems: 'center' }}><Num size={22}>{streak(history, today)}</Num><Caps size={9} glow={false} style={{ color: t.muted }}>Day streak</Caps></View>
            <View style={{ alignItems: 'center' }}><Num size={22}>{history.filter(x => x.key !== 'W').length}</Num><Caps size={9} glow={false} style={{ color: t.muted }}>Quests</Caps></View>
            <View style={{ alignItems: 'center' }}><Num size={22}>{history.filter(x => x.key === 'D').length}</Num><Caps size={9} glow={false} style={{ color: t.muted }}>Red Gates</Caps></View>
          </Row>
        </Win>
      </Appear>

      {ws.length ? (
        <Appear delay={80}>
          <Win title="BODY" icon="i">
            <Row style={{ justifyContent: 'space-between' }}>
              <View><Caps size={10} glow={false} style={{ color: t.muted }}>Latest</Caps><Num size={24}>{ws[ws.length - 1].kg + ' kg'}</Num></View>
              <View style={{ alignItems: 'flex-end' }}><Caps size={10} glow={false} style={{ color: t.muted }}>Since start</Caps>
                <Num size={24} color={t.accent}>{(() => { const d = Math.round((ws[ws.length - 1].kg! - ws[0].kg!) * 10) / 10; return (d > 0 ? '+' : '') + d; })()}</Num></View>
            </Row>
            {ws.length > 1 ? <Spark values={ws.map(x => x.kg!)} color={t.accent} /> : null}
          </Win>
        </Appear>
      ) : null}

      <Appear delay={140}>
        <Win title={'ACHIEVEMENTS ' + got.length + '/' + ACH.length} icon="★" tone="secret">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {ACH.map(a => {
              const on = got.includes(a[0]);
              return (
                <View key={a[0]} style={{ width: '47%', flexGrow: 1, borderWidth: 1, borderColor: on ? t.secret : t.line, padding: 10, gap: 2, backgroundColor: on ? 'rgba(170,120,255,0.08)' : 'rgba(0,0,0,0.25)' }}>
                  <T style={{ fontFamily: F.semi, fontSize: 13, color: on ? t.secret : t.dim }}>{on ? a[0] : '???'}</T>
                  <T muted style={{ fontSize: 11, lineHeight: 16 }}>{on ? a[1] : 'Hint: ' + a[2]}</T>
                </View>
              );
            })}
          </View>
        </Win>
      </Appear>
    </>
  );
}

// ---------- LOG
function LogTab({ history }: { history: Rec[] }) {
  const t = useT();
  return (
    <Appear>
      <Win title="QUEST LOG" icon="i">
        {!history.length ? <T muted style={{ textAlign: 'center' }}>Completed quests will appear here.</T> : history.slice(0, 40).map((x, i) => (
          <View key={x.createdAt} style={{ gap: 2, paddingTop: i ? 10 : 0, borderTopWidth: i ? 1 : 0, borderColor: t.line }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T style={{ fontFamily: F.semi, fontSize: 14, color: x.key === 'D' || x.key === 'P' ? t.warn : t.fg }}>{x.key === 'W' ? 'Weigh-in: ' + x.kg + ' kg' : WORKOUTS[x.key as WorkoutKey]?.name || KEY_NAMES[x.key] || x.key}</T>
              <Num size={14} color={t.muted}>{'WSQP'.includes(x.key) ? '+' + (XP[x.key] || 0) + ' XP' : fmt(x.totalSec)}</Num>
            </Row>
            <T muted style={{ fontSize: 12 }}>{new Date(x.createdAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + (x.score && x.key !== 'S' && x.key !== 'W' ? ' · ' + x.score : '') + (x.feel ? ' · felt ' + x.feel + '/5' : '')}</T>
          </View>
        ))}
      </Win>
    </Appear>
  );
}

// ---------- System notification popup
function NoticeOverlay({ n, onClose }: { n: { title: string; lines: string[]; tone?: Tone }; onClose: () => void }) {
  const t = useT();
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 3, 10, 0.78)', justifyContent: 'center', padding: 20 }}>
      <Appear key={n.title + n.lines.join()}>
        <Win title={n.title} tone={n.tone}>
          <View style={{ gap: 8, paddingVertical: 10 }}>
            {n.lines.map((l, i) => (
              <T key={i} glow style={{ textAlign: 'center', fontSize: i === 0 ? 16 : 15, fontFamily: l.startsWith('LEVEL UP') ? F.bold : F.medium, color: l.startsWith('LEVEL UP') ? t.gold : l.startsWith('Rewards') ? t.bright : t.fg }}>{l}</T>
            ))}
          </View>
          <Btn primary label="OK" onPress={onClose} style={{ alignSelf: 'center', minWidth: 120 }} />
        </Win>
      </Appear>
    </View>
  );
}

function Spark({ values, color }: { values: number[]; color: string }) {
  const mn = Math.min(...values) - 0.5, mx = Math.max(...values) + 0.5;
  const pts = values.map((v, i) => (i / (values.length - 1) * 300).toFixed(1) + ',' + (44 - (v - mn) / (mx - mn) * 40).toFixed(1)).join(' ');
  return <Svg width="100%" height={48} viewBox="0 0 300 48" preserveAspectRatio="none"><Polyline points={pts} fill="none" stroke={color} strokeWidth={2} /></Svg>;
}
