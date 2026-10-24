import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import Svg, { Polyline, Rect, Path } from 'react-native-svg';
import { Win, T, Caps, Num, Btn, Row, Divider, Appear, Ring, Meter, useT, Tone } from './ui';
import { F } from './theme';
import { WORKOUTS, QUESTS, XP, DAYS, DAY_LETTERS, KEY_NAMES, GEAR, Gear } from './data';
import {
  Profile, Rec, player, streak, onDay, penaltyActive, secretFor, weekStart, weights, ACH, fmt, rxFor, QUEST_KEYS, startOfDay, parseYmd, todaysWorkout, gatesFor, gateDay, gradeFor, isPremium, trialLeft, RANKS, FREE_RANK_CAP, DEFAULT_DAYS, TRIAL_DAYS,
} from './logic';
import { useGame } from './game';
import { QuestScreen } from './QuestScreen';

type Tab = 'quest' | 'status';

export function Main({ profile, history, setHistory, onRedGate, onProfile }: { profile: Profile; history: Rec[]; setHistory: (h: Rec[]) => void; onRedGate: (on: boolean) => void; onProfile: (p: Profile) => void }) {
  const g = useGame(profile, history, setHistory);
  const [tab, setTab] = useState<Tab>('quest');
  const [inQuest, setInQuest] = useState(false);
  const s = g.s;
  const red = !!s && s.key === 'D' && !s.saved && (inQuest || g.running);
  useEffect(() => { onRedGate(red); }, [red]);
  // day 8: the trial ends once, with a System notification
  const premium = isPremium(profile, g.today);
  useEffect(() => {
    if (premium || profile.trialSeen) return;
    g.notify({ title: 'TRIAL ENDED', tone: 'gold', lines: ['Your ' + TRIAL_DAYS + '-day premium trial has ended.', 'The Red Gate and ranks above ' + FREE_RANK_CAP + ' are now sealed.', 'Unlock premium in Status to keep the full System.'] });
    onProfile({ ...profile, trialSeen: true });
  }, [premium]);
  if (!s) return null;

  const showQuest = inQuest || g.running || (!!s.endedAt && !s.saved);
  const open = (key: string) => { if (s.key !== key || s.saved) g.actions.open(key); setInQuest(true); };

  return (
    <View style={{ flex: 1 }}>
      {showQuest ? <QuestScreen g={g} onBack={() => setInQuest(false)} /> : (
        <>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 16 }}>
            {tab === 'quest' ? <QuestTab g={g} profile={profile} history={history} open={open} />
              : <StatusTab g={g} profile={profile} history={history} onProfile={onProfile} />}
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
  const items: [Tab, string][] = [['quest', 'Quests'], ['status', 'Status']];
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
  const secret = secretFor(today, g.gear);
  const premium = isPremium(profile, today);
  const showSecret = !!secret && !onDay(history, today, ['S']);
  const ws = weights(history);
  // the weekly weigh-in is a quest from the first day of the week until it is done
  const weighDue = !ws.some(x => new Date(x.createdAt) >= weekStart(today));
  const gates = gatesFor(profile);
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).getTime();
  const left = Math.max(0, (midnight - Date.now()) / 1000);
  const h = Math.floor(left / 3600), m = Math.floor((left % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  const goals: [string, string][] = todayW
    ? g.wk(todayW).items.filter(i => i.id !== 'warm').map(i => [i.name, rxFor(i, g.week)])
    : QUESTS.Q.goals(g.week).map(x => [x.label, x.target + (x.unit || '')]);

  return (
    <>
      <View style={{ paddingTop: 4, gap: 2 }}>
        <Caps size={10} glow={false} style={{ color: t.muted }}>{DAYS[today.getDay()] + ' · cycle week ' + g.week + ' / 4'}</Caps>
        <Caps size={20} color={t.bright} style={{ letterSpacing: 6 }}>The System</Caps>
      </View>
      <HomeStatus profile={profile} history={history} today={today} />
      <WeekStrip history={history} profile={profile} today={today} />

      {penalty ? (
        <>
          <Appear>
            <Win title="PENALTY" tone="penalty">
              <T style={{ textAlign: 'center' }}>{"Yesterday's daily quest was not completed."}</T>
              <T style={{ textAlign: 'center', color: t.warn, fontFamily: F.semi }}>You have been moved to the Penalty Zone.</T>
              <T muted style={{ textAlign: 'center', fontSize: 13 }}>100 kettlebell swings and 30 burpees. Clear it to unlock today's quests.</T>
              <Btn danger big label="Enter penalty zone" onPress={() => open('P')} />
            </Win>
          </Appear>
          <View style={{ borderWidth: 1, borderColor: t.line, borderStyle: 'dashed', padding: 18, alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.35)' }}>
            <Lock color={t.muted} size={22} />
            <Caps size={11} glow={false} style={{ color: t.muted, textAlign: 'center' }}>Quests locked</Caps>
            <T muted style={{ fontSize: 13, textAlign: 'center' }}>The daily quest and this week's gates open once the penalty is cleared.</T>
          </View>
        </>
      ) : <>

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

      {qDone ? (
        <Appear delay={80}>
          <View style={{ borderWidth: 1, borderColor: 'rgba(89,232,255,0.45)', backgroundColor: 'rgba(89,232,255,0.07)', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14, boxShadow: `0 0 12px ${t.glow}` }}>
            <View style={{ width: 34, height: 34, borderWidth: 1, borderColor: t.good, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: t.good, fontFamily: F.bold, fontSize: 18 }}>✓</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Caps size={11} color={t.good}>Daily quest cleared</Caps>
              <Text style={{ color: t.fg, fontFamily: F.semi, fontSize: 15, marginTop: 2 }}>{todayW ? g.wk(todayW).name : QUESTS.Q.title}</Text>
            </View>
            <Text style={{ color: t.muted, fontFamily: F.semi, fontSize: 12 }}>{'+' + (XP[qKey] || 0) + ' XP'}</Text>
          </View>
        </Appear>
      ) : (
        <Appear delay={80}>
          <Win title="DAILY QUEST">
            <View style={{ alignItems: 'center', gap: 2 }}>
              <Caps size={11} glow={false} style={{ color: t.muted }}>{todayW ? 'Today’s training' : 'Rest day'}</Caps>
              <Text style={{ fontFamily: F.bold, fontSize: 22, textAlign: 'center', color: t.bright }}>{todayW ? g.wk(todayW).name : QUESTS.Q.title}</Text>
              <Text style={{ fontFamily: F.medium, fontSize: 13, color: t.muted, marginTop: 2 }}>{goals.length + (todayW ? (goals.length === 1 ? ' exercise' : ' exercises') : ' goals')}</Text>
            </View>
            <Row style={{ gap: 16 }}>
              <Ring size={92} progress={left / 86400}>
                <Num size={20}>{pad(h) + ':' + pad(m)}</Num>
                <Caps size={8} glow={false} style={{ color: t.muted, letterSpacing: 1.5 }}>Hrs left</Caps>
              </Ring>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ color: t.warn, fontFamily: F.semi, fontSize: 13, lineHeight: 19 }}>Complete it by midnight, or face the penalty zone.</Text>
                <Text style={{ color: t.muted, fontFamily: F.medium, fontSize: 12 }}>{'Reward: ' + (XP[qKey] || 0) + ' XP'}</Text>
              </View>
            </Row>
            <Btn primary big label="Accept quest" onPress={() => open(qKey)} />
          </Win>
        </Appear>
      )}


      {weighDue ? <WeighIn g={g} last={ws[ws.length - 1]?.kg} /> : null}

      <View style={{ gap: 10, marginTop: 4 }}>
        <Caps size={12} style={{ color: t.muted }} glow={false}>Gates this week</Caps>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {gates.map(k => {
            const w = g.wk(k), day = gateDay(k, profile), cleared = history.some(x => x.key === k && new Date(x.createdAt) >= weekStart(today));
            const isRed = k === 'D', isToday = k === todayW;
            // gates ahead stay sealed until their day: the workout is a surprise
            const locked = isRed && !premium;
            const sealed = !cleared && day > today.getDay();
            const missed = !cleared && !locked && day < today.getDay();
            if (locked) return (
              <Pressable key={k} onPress={() => g.notify(PREMIUM_NOTICE)} style={({ pressed }) => ({ width: '47%', flexGrow: 1, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,201,77,0.55)', paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center', gap: 4,
                backgroundColor: pressed ? 'rgba(255,201,77,0.12)' : 'rgba(4,10,24,0.6)' })}>
                <Row style={{ gap: 6 }}><Lock color={t.gold} size={13} /><Text style={{ color: t.gold, fontFamily: F.bold, fontSize: 16 }}>Red Gate</Text></Row>
                <Caps size={10} glow={false} style={{ color: t.gold }}>Premium</Caps>
              </Pressable>
            );
            return (
              <Pressable key={k} disabled={sealed} onPress={() => open(k)} style={({ pressed }) => ({ width: '47%', flexGrow: 1, borderWidth: 1, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center', gap: 4,
                borderColor: isRed && !sealed ? 'rgba(255,45,79,0.65)' : isToday ? t.edge : t.line, borderStyle: sealed ? 'dashed' : 'solid',
                backgroundColor: pressed ? 'rgba(150,215,255,0.12)' : cleared ? 'rgba(89,232,255,0.07)' : 'rgba(4,10,24,0.6)',
                boxShadow: isRed && !sealed ? `0 0 12px ${t.warnGlow}` : isToday ? `0 0 12px ${t.glow}` : undefined })}>
                {sealed ? (
                  <Row style={{ gap: 6 }}><Lock color={isRed ? t.warn : t.muted} size={13} /><Text style={{ color: isRed ? t.warn : t.muted, fontFamily: F.bold, fontSize: 16 }}>{isRed ? 'Red Gate' : '???'}</Text></Row>
                ) : <Text style={{ color: isRed ? t.warn : t.bright, fontFamily: F.bold, fontSize: 16 }}>{w.short}</Text>}
                <Caps size={10} glow={false} style={{ color: cleared ? t.good : missed ? t.warn : isRed ? t.warn : t.muted }}>
                  {cleared ? '✓ Cleared' : missed ? 'Missed · ' + DAYS[day].slice(0, 3) : sealed ? 'Opens ' + DAYS[day] : isToday ? 'Today' : DAYS[day]}
                </Caps>
              </Pressable>
            );
          })}
        </View>
      </View>
      </>}
    </>
  );
}

// The player's window, compact, at the top of the home screen
function HomeStatus({ profile, history, today }: { profile: Profile; history: Rec[]; today: Date }) {
  const t = useT(), p = player(history);
  const left = trialLeft(profile, today);
  return (
    <Appear>
      <Win title="STATUS" icon="i" pad={16}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View>
            <Caps size={10} glow={false} style={{ color: t.muted }}>{'Player: ' + profile.name}</Caps>
            <Text style={{ color: t.bright, fontFamily: F.bold, fontSize: 28, lineHeight: 34 }}>{'Level ' + p.level}</Text>
            <Row style={{ gap: 8 }}>
              <Caps size={10} color={t.accent} glow={false}>{gradeFor(p.level)}</Caps>
              {profile.premium || left ? <PremiumTag text={profile.premium ? 'Premium' : 'Trial · ' + left + (left === 1 ? ' day' : ' days')} /> : null}
            </Row>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Caps size={10} glow={false} style={{ color: t.muted }}>Rank</Caps>
            <Num size={28} color={t.accent}>{profile.rank}</Num>
          </View>
        </Row>
        <Meter value={p.into / p.need} height={7} />
        <Text style={{ color: t.muted, fontFamily: F.medium, fontSize: 12, marginTop: -6 }}>{(p.need - p.into) + ' XP to level ' + (p.level + 1)}</Text>
        <Row style={{ gap: 6 }}>
          {([[p.str, 'STR'], [p.end, 'VIT'], [p.agi, 'AGI'], [streak(history, today), 'STREAK']] as [number, string][]).map(([v, l]) => (
            <View key={l} style={{ flex: 1, borderWidth: 1, borderColor: t.line, paddingVertical: 8, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.25)' }}>
              <Num size={18}>{v}</Num>
              <Caps size={9} glow={false} style={{ color: t.muted, letterSpacing: 1.5 }}>{l}</Caps>
            </View>
          ))}
        </Row>
      </Win>
    </Appear>
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
        const gate = todaysWorkout(d, profile);
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 8, borderWidth: 1, borderColor: missed ? t.warn : isToday ? t.edge : done ? 'rgba(89,232,255,0.35)' : t.line,
            backgroundColor: missed ? 'rgba(255,45,79,0.16)' : done ? 'rgba(89,232,255,0.08)' : 'rgba(0,0,0,0.25)', boxShadow: missed ? `0 0 8px ${t.warnGlow}` : isToday ? `0 0 10px ${t.glow}` : undefined }}>
            <Caps size={10} glow={false} style={{ color: missed ? t.warn : isToday ? t.bright : t.muted, letterSpacing: 1 }}>{DAY_LETTERS[i]}</Caps>
            <Text style={{ color: c, fontFamily: F.bold, fontSize: 13 }}>{done ? '✓' : missed ? '✕' : d.getDate()}</Text>
            {missed ? <Text style={{ color: t.warn, fontFamily: F.bold, fontSize: 6.5, letterSpacing: 0.5 }}>PENALTY</Text>
              : <View style={{ width: 4, height: 4, transform: [{ rotate: '45deg' }], backgroundColor: gate ? (gate === 'D' ? t.warn : t.bright) : 'transparent' }} />}
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
      <Win title="WEEKLY QUEST" icon="!">
        <T style={{ textAlign: 'center', fontFamily: F.semi, fontSize: 16, color: t.bright }}>Weigh-in</T>
        <T muted style={{ textAlign: 'center', fontSize: 13 }}>Once a week, in the morning before eating. Reward: 20 XP</T>
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
function StatusTab({ g, profile, history, onProfile }: { g: ReturnType<typeof useGame>; profile: Profile; history: Rec[]; onProfile: (p: Profile) => void }) {
  const t = useT();
  const p = player(history), today = new Date();
  const premium = isPremium(profile, today);
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
              <T style={{ fontSize: 14, color: t.accent }}>{gradeFor(p.level)}</T>
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
          <Row style={{ gap: 4 }}>
            {RANKS.map(r => {
              const cur = r === profile.rank, locked = !premium && RANKS.indexOf(r) > RANKS.indexOf(FREE_RANK_CAP);
              return (
                <View key={r} style={{ flex: 1, alignItems: 'center', paddingVertical: 6, borderWidth: 1, borderColor: cur ? t.edge : locked ? 'rgba(255,201,77,0.35)' : t.line,
                  backgroundColor: cur ? 'rgba(80,170,255,0.14)' : 'rgba(0,0,0,0.25)', flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
                  {locked ? <Lock color={t.gold} size={10} /> : null}
                  <Num size={14} color={cur ? t.bright : locked ? t.gold : t.muted}>{r}</Num>
                </View>
              );
            })}
          </Row>
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
                  <Row style={{ gap: 6 }}>{on ? null : <Lock color={t.dim} size={12} />}<T style={{ fontFamily: F.semi, fontSize: 13, color: on ? t.secret : t.dim }}>{on ? a[0] : '???'}</T></Row>
                  <T muted style={{ fontSize: 11, lineHeight: 16 }}>{on ? a[1] : 'Hint: ' + a[2]}</T>
                </View>
              );
            })}
          </View>
        </Win>
      </Appear>
      <PremiumWin g={g} profile={profile} />
      <Settings g={g} profile={profile} onProfile={onProfile} />
      <History history={history} />
    </>
  );
}

const PREMIUM_NOTICE = { title: 'PREMIUM', tone: 'gold' as Tone, lines: ['This gate is sealed for free players.', 'Premium unlocks the Red Gate, ranks up to S and a plan that adapts to you every week.', 'Open Status to see the premium plan.'] };

function PremiumTag({ text }: { text: string }) {
  const t = useT();
  return (
    <View style={{ borderWidth: 1, borderColor: t.gold, paddingHorizontal: 6, paddingVertical: 1, backgroundColor: 'rgba(255,201,77,0.1)', boxShadow: '0 0 8px rgba(255,201,77,0.35)' }}>
      <Caps size={8} color={t.gold} glow={false} style={{ letterSpacing: 1.5 }}>{text}</Caps>
    </View>
  );
}

// What premium unlocks, and the trial state
const PERKS: [string, boolean][] = [
  ['Daily quest, 3 gates a week, penalty zone', false],
  ['Levels, grades and ranks up to ' + FREE_RANK_CAP, false],
  ['The Red Gate, a new one every week', true],
  ['Ranks B, A and S', true],
  ['A plan that adapts to your reports every week', true],
  ['Switch equipment any time: none, home kit or gym', true],
  ['Monthly progress report', true],
];
function PremiumWin({ g, profile }: { g: ReturnType<typeof useGame>; profile: Profile }) {
  const t = useT(), today = new Date(), left = trialLeft(profile, today);
  return (
    <Appear delay={180}>
      <Win title="PREMIUM" icon="★" tone="gold">
        <T style={{ textAlign: 'center', fontFamily: F.semi, fontSize: 16, color: t.gold }}>
          {profile.premium ? 'Premium is active' : left ? 'Free trial · ' + left + (left === 1 ? ' day' : ' days') + ' left' : 'The System learns you'}
        </T>
        <View style={{ gap: 8 }}>
          {PERKS.map(([label, paid]) => (
            <Row key={label} style={{ gap: 10 }}>
              {paid ? <Lock color={profile.premium || left ? t.good : t.gold} size={12} /> : <Text style={{ color: t.good, fontFamily: F.bold, fontSize: 13, width: 12 }}>✓</Text>}
              <T style={{ fontSize: 13, flex: 1, color: paid ? t.fg : t.muted }}>{label}</T>
              {paid ? <Caps size={8} glow={false} style={{ color: t.gold }}>Premium</Caps> : <Caps size={8} glow={false} style={{ color: t.muted }}>Free</Caps>}
            </Row>
          ))}
        </View>
        {profile.premium ? null : (
          <>
            <Divider />
            <Row style={{ justifyContent: 'center', gap: 16 }}>
              <View style={{ alignItems: 'center' }}><Num size={20} color={t.gold}>$2.99</Num><Caps size={8} glow={false} style={{ color: t.muted }}>per month</Caps></View>
              <View style={{ alignItems: 'center' }}><Num size={20} color={t.gold}>$17.99</Num><Caps size={8} glow={false} style={{ color: t.muted }}>per year · save 50%</Caps></View>
            </Row>
            <Btn gold big label="Unlock premium" onPress={() => g.notify({ title: 'PREMIUM', tone: 'gold', lines: ['Payments open with the Google Play release.', 'Until then, every feature stays visible here.'] })} />
          </>
        )}
      </Win>
    </Appear>
  );
}

// Training days and equipment; changing equipment after the trial is a premium perk
function Settings({ g, profile, onProfile }: { g: ReturnType<typeof useGame>; profile: Profile; onProfile: (p: Profile) => void }) {
  const t = useT();
  const premium = isPremium(profile, new Date());
  const [days, setDays] = useState<number[]>(profile.days || DEFAULT_DAYS);
  const gear: Gear = profile.gear || 'basic';
  const changed = days.join() !== (profile.days || DEFAULT_DAYS).join(), ok = days.length === 3 || days.length === 4;
  const flip = (d: number) => setDays(cur => cur.includes(d) ? cur.filter(x => x !== d) : [...cur, d].sort((a, b) => a - b));
  return (
    <Appear delay={190}>
      <Win title="SETTINGS" icon="i">
        <Caps size={10} glow={false} style={{ color: t.muted }}>Training days · pick 3 or 4</Caps>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {DAYS.map((d, i) => <Btn key={d} small label={d.slice(0, 3)} on={days.includes(i)} onPress={() => flip(i)} style={{ minWidth: 52, flexGrow: 1 }} />)}
        </View>
        {changed ? <Btn primary label={ok ? 'Save training days' : 'Choose 3 or 4 days'} disabled={!ok} onPress={() => onProfile({ ...profile, days })} /> : null}
        <Divider />
        <Row style={{ justifyContent: 'space-between' }}>
          <Caps size={10} glow={false} style={{ color: t.muted }}>Equipment</Caps>
          {premium ? null : <Row style={{ gap: 4 }}><Lock color={t.gold} size={10} /><Caps size={8} glow={false} style={{ color: t.gold }}>Premium to change</Caps></Row>}
        </Row>
        <View style={{ gap: 6 }}>
          {GEAR.map(([k, label, sub]) => (
            <Pressable key={k} disabled={!premium || k === gear} onPress={() => onProfile({ ...profile, gear: k })} accessibilityRole="radio" accessibilityState={{ checked: k === gear }}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderWidth: 1, borderColor: k === gear ? t.edge : t.line,
                backgroundColor: pressed ? 'rgba(150,215,255,0.12)' : k === gear ? 'rgba(80,170,255,0.12)' : 'rgba(0,0,0,0.25)', opacity: !premium && k !== gear ? 0.5 : 1 })}>
              <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: k === gear ? t.bright : t.muted, alignItems: 'center', justifyContent: 'center' }}>
                {k === gear ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.bright }} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <T style={{ fontFamily: F.semi, fontSize: 14, color: k === gear ? t.bright : t.fg }}>{label}</T>
                <T muted style={{ fontSize: 12 }}>{sub}</T>
              </View>
            </Pressable>
          ))}
        </View>
      </Win>
    </Appear>
  );
}

// ---------- recent quests, at the bottom of Status
function History({ history }: { history: Rec[] }) {
  const t = useT();
  const [all, setAll] = useState(false);
  const list = history.slice(0, all ? 60 : 5);
  return (
    <Appear delay={200}>
      <Win title="QUEST HISTORY" icon="i">
        {!history.length ? <T muted style={{ textAlign: 'center' }}>Completed quests will appear here.</T> : list.map((x, i) => (
          <View key={x.createdAt} style={{ gap: 2, paddingTop: i ? 10 : 0, borderTopWidth: i ? 1 : 0, borderColor: t.line }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T style={{ fontFamily: F.semi, fontSize: 14, color: x.key === 'D' || x.key === 'P' ? t.warn : t.fg }}>{x.key === 'W' ? 'Weigh-in: ' + x.kg + ' kg' : x.workout || KEY_NAMES[x.key] || x.key}</T>
              <Num size={14} color={t.muted}>{'WSQP'.includes(x.key) ? '+' + (XP[x.key] || 0) + ' XP' : fmt(x.totalSec)}</Num>
            </Row>
            <T muted style={{ fontSize: 12 }}>{new Date(x.createdAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + (x.score && x.key !== 'S' && x.key !== 'W' ? ' · ' + x.score : '') + (x.feel ? ' · felt ' + x.feel + '/5' : '')}</T>
          </View>
        ))}
        {history.length > 5 ? <Btn small label={all ? 'Show less' : 'Show all ' + history.length} onPress={() => setAll(!all)} style={{ alignSelf: 'center' }} /> : null}
      </Win>
    </Appear>
  );
}

function Lock({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2" fill="none" stroke={color} strokeWidth={1.6} />
      <Rect x={2.5} y={7} width={11} height={8} fill={color} />
    </Svg>
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
