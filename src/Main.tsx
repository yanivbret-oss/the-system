import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import Svg, { Polyline, Rect, Path, Circle } from 'react-native-svg';
import { Win, T, Caps, Num, Btn, Row, Divider, Appear, Ring, Meter, GoalHeading, useT, Tone } from './ui';
import { F } from './theme';
import { WORKOUTS, QUESTS, XP, DAYS, DAY_LETTERS, KEY_NAMES, GEAR, Gear, fitLevel } from './data';
import { FitForm } from './Onboarding';
import {
  Profile, Rec, player, streak, onDay, penaltyActive, secretFor, weekStart, weights, ACH, fmt, rxFor, QUEST_KEYS, startOfDay, parseYmd, todaysWorkout, isFirstDay, gatesFor, gateDay, gradeFor, isPremium, trialLeft, RANKS, FREE_RANK_CAP, DEFAULT_DAYS, TRIAL_DAYS, store,
} from './logic';
import { useGame } from './game';
import { QuestScreen } from './QuestScreen';
import { askPermission, scheduleAll, REMIND_HOURS, DEFAULT_REMIND } from './notify';
import * as billing from './billing';

type Tab = 'quest' | 'status' | 'premium' | 'settings';

export function Main({ profile, history, setHistory, onRedGate, onProfile }: { profile: Profile; history: Rec[]; setHistory: (h: Rec[]) => void; onRedGate: (on: boolean) => void; onProfile: (p: Profile) => void }) {
  const g = useGame(profile, history, setHistory);
  const [tab, setTab] = useState<Tab>('quest');
  const [inQuest, setInQuest] = useState(false);
  // new achievements stay marked until the Status tab has been opened
  const got = ACH.filter(a => a[3](history, g.today)).map(a => a[0]);
  const [viewed, setViewed] = useState<string[] | null>(null);
  const [fresh, setFresh] = useState<string[]>([]);
  useEffect(() => { store.achViewed().then(v => setViewed(v || [])); }, []);
  const unseen = viewed ? got.filter(n => !viewed.includes(n)) : [];
  useEffect(() => {
    if (tab !== 'status' || !viewed || !unseen.length) return;
    setFresh(unseen); setViewed(got); store.saveAchViewed(got);
  }, [tab, unseen.length, viewed]);
  useEffect(() => { if (tab !== 'status') setFresh([]); }, [tab]);
  const s = g.s;
  const red = !!s && s.key === 'D' && !s.saved && (inQuest || g.running);
  useEffect(() => { onRedGate(red); }, [red]);
  // day 8: the trial ends once, with a System notification
  const premium = isPremium(profile, g.today);
  useEffect(() => {
    if (premium || profile.trialSeen) return;
    g.notify({ title: 'TRIAL ENDED', tone: 'gold', lines: ['Your ' + TRIAL_DAYS + '-day premium trial has ended.', 'The Red Gate and ranks above ' + FREE_RANK_CAP + ' are now sealed.', 'Open the Premium tab to keep the full System.'] });
    onProfile({ ...profile, trialSeen: true });
  }, [premium]);
  // the weekly weigh-in pops up as a System window once per app start, until it is done
  const weighDue = !weights(history).some(x => new Date(x.createdAt) >= weekStart(g.today));
  const [weighOpen, setWeighOpen] = useState(false);
  const weighShown = useRef(false);
  const busy = !s || inQuest || g.running || (!!s.endedAt && !s.saved) || !!g.notices.length;
  useEffect(() => {
    if (weighDue && !busy && !weighShown.current) { weighShown.current = true; setWeighOpen(true); }
  }, [weighDue, busy]);
  // premium follows the Google Play subscription: checked at start, set when a purchase completes
  const latest = useRef(profile); latest.current = profile;
  const setPremium = (on: boolean) => { if (on !== !!latest.current.premium) onProfile({ ...latest.current, premium: on }); };
  useEffect(() => {
    billing.entitled().then(on => { if (on !== null) setPremium(on); });
    return billing.listen(on => { setPremium(on); if (on) g.notify(PREMIUM_ON); }, msg => g.notify({ title: 'PURCHASE', tone: 'gold', lines: [msg] }));
  }, []);
  // phone reminders for the coming week, rebuilt whenever something changes
  const [asked, setAsked] = useState(false);
  useEffect(() => { askPermission().catch(() => {}).finally(() => setAsked(true)); }, []);
  useEffect(() => { if (asked) scheduleAll(profile, history).catch(() => {}); }, [asked, history.length, profile.notify, profile.remindAt, (profile.days || []).join(), profile.gear, profile.premium]);
  if (!s) return null;

  const showQuest = inQuest || g.running || (!!s.endedAt && !s.saved);
  const open = (key: string) => { if (s.key !== key || s.saved) g.actions.open(key); setInQuest(true); };

  return (
    <View style={{ flex: 1 }}>
      {showQuest ? <QuestScreen g={g} onBack={() => setInQuest(false)} /> : (
        <>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 16 }}>
            {tab === 'quest' ? <QuestTab g={g} profile={profile} history={history} onProfile={onProfile} open={open} onStatus={() => setTab('status')} onWeigh={() => setWeighOpen(true)} />
              : tab === 'status' ? <StatusTab profile={profile} history={history} fresh={fresh} />
              : tab === 'premium' ? <PremiumWin g={g} profile={profile} onPremium={setPremium} />
              : <Settings g={g} profile={profile} onProfile={onProfile} />}
          </ScrollView>
          <TabBar tab={tab} setTab={setTab} badge={unseen.length ? 'status' : undefined} />
        </>
      )}
      {weighOpen && weighDue && !g.notices.length ? <WeighQuest last={weights(history).slice(-1)[0]?.kg} onSave={kg => { setWeighOpen(false); g.actions.saveWeight(kg); }} onLater={() => setWeighOpen(false)} /> : null}
      {g.notices.length ? <NoticeOverlay n={g.notices[0]} onClose={g.dismiss} /> : null}
    </View>
  );
}

function TabBar({ tab, setTab, badge }: { tab: Tab; setTab: (t: Tab) => void; badge?: Tab }) {
  const t = useT();
  const items: [Tab, string][] = [['quest', 'Quests'], ['status', 'Status'], ['premium', 'Premium'], ['settings', 'Settings']];
  return (
    <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: t.line, backgroundColor: 'rgba(2, 6, 17, 0.9)' }}>
      {items.map(([k, label]) => {
        const on = k === tab;
        return (
          <Pressable key={k} onPress={() => setTab(k)} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: on }} style={{ flex: 1, alignItems: 'center', paddingTop: 10, paddingBottom: 8, gap: 5 }}>
            <View style={{ position: 'absolute', top: -1, left: '25%', right: '25%', height: 2, backgroundColor: on ? t.bright : 'transparent', boxShadow: on ? `0 0 10px 1px ${t.railGlow}` : undefined }} />
            <View>
              <TabIcon k={k} color={k === 'premium' ? t.gold : on ? t.bright : t.muted} on={on} />
              {badge === k ? <View style={{ position: 'absolute', top: -2, right: -5, width: 8, height: 8, borderRadius: 4, backgroundColor: t.secret, boxShadow: `0 0 8px ${t.secretGlow}` }} /> : null}
            </View>
            <Caps size={9} color={k === 'premium' ? t.gold : on ? t.bright : t.muted} glow={on} style={{ letterSpacing: 1.5, opacity: k === 'premium' && !on ? 0.75 : 1 }}>{label}</Caps>
          </Pressable>
        );
      })}
    </View>
  );
}

// Line icons in the System style: quest notice, status, crown, gear
function TabIcon({ k, color, on }: { k: Tab; color: string; on: boolean }) {
  const sw = 1.6, o = on ? 1 : 0.75;
  return (
    <View style={{ opacity: o, filter: on ? `drop-shadow(0 0 4px ${color})` : undefined }}>
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round">
        {k === 'quest' ? <>
          <Rect x={3.5} y={3.5} width={17} height={17} />
          <Path d="M12 7.5v6.5" /><Circle cx={12} cy={17} r={0.6} fill={color} />
        </> : k === 'status' ? <>
          <Circle cx={12} cy={8} r={3.5} />
          <Path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
        </> : k === 'premium' ? <>
          <Path d="M3.5 8l4.5 4 4-6.5 4 6.5 4.5-4-1.8 10H5.3z" />
          <Path d="M6 20.5h12" />
        </> : <>
          <Circle cx={12} cy={12} r={3} />
          <Path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.9 1.9M16.6 16.6l1.9 1.9M5.5 18.5l1.9-1.9M16.6 7.4l1.9-1.9" />
          <Circle cx={12} cy={12} r={6.2} />
        </>}
      </Svg>
    </View>
  );
}

// ---------- QUESTS: today's quest, the week strip, notifications, other gates
function QuestTab({ g, profile, history, onProfile, open, onStatus, onWeigh }: { g: ReturnType<typeof useGame>; profile: Profile; history: Rec[]; onProfile: (p: Profile) => void; open: (k: string) => void; onStatus: () => void; onWeigh: () => void }) {
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
  // counted on the wall clock, so a daylight-saving day still shows 23:47 at 00:12, not 24:47
  const now = new Date();
  const left = Math.max(0, 86400 - (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()));
  const h = Math.floor(left / 3600), m = Math.floor((left % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  const goals: [string, string][] = todayW
    ? g.wk(todayW).items.filter(i => i.id !== 'warm').map(i => [i.name, rxFor(i, g.week)])
    : QUESTS.Q.goals(g.week, g.fit).map(x => [x.label, x.target + (x.unit || '')]);

  return (
    <>
      <View style={{ paddingTop: 4, gap: 2 }}>
        <Caps size={10} glow={false} style={{ color: t.muted }}>{DAYS[today.getDay()] + ' · cycle week ' + g.week + ' / 4'}</Caps>
        <Caps size={20} color={t.bright} style={{ letterSpacing: 6 }}>The System</Caps>
      </View>
      <HomeStatus profile={profile} history={history} onPress={onStatus} />
      <WeekStrip history={history} profile={profile} today={today} />

      {/* players from before the fitness test take it once, so their reps fit them too */}
      {!profile.fit ? (
        <Appear>
          <Win hero title="FITNESS TEST">
            <T glow style={{ textAlign: 'center', fontSize: 16 }}>How many can you do in a row?</T>
            <T muted style={{ textAlign: 'center', fontSize: 13, lineHeight: 20 }}>The System now sets your reps to your level. Clean reps, no rest.</T>
            <FitForm gear={g.gear} onDone={f => onProfile({ ...profile, fit: f })} />
          </Win>
        </Appear>
      ) : null}

      {penalty ? (
        <>
          <Appear>
            <Win hero title="PENALTY" tone="penalty">
              <T style={{ textAlign: 'center' }}>{"Yesterday's daily quest was not completed."}</T>
              <T style={{ textAlign: 'center', color: t.warn, fontFamily: F.semi }}>You have been moved to the Penalty Zone.</T>
              <T muted style={{ textAlign: 'center', fontSize: 13 }}>{QUESTS.P.goals(g.gear).map(x => x.target + ' ' + x.label.toLowerCase()).join(' and ') + ". Clear it to unlock today's quests."}</T>
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
          <Win hero title="DAILY QUEST">
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
                {isFirstDay(profile, today)
                  ? <Text style={{ color: t.good, fontFamily: F.semi, fontSize: 13, lineHeight: 19 }}>Day one is a free day. Clear it for a head start, or begin tomorrow with no penalty.</Text>
                  : <Text style={{ color: t.warn, fontFamily: F.semi, fontSize: 13, lineHeight: 19 }}>Complete it by midnight, or face the penalty zone.</Text>}
                <Text style={{ color: t.muted, fontFamily: F.medium, fontSize: 12 }}>{'Reward: ' + (XP[qKey] || 0) + ' XP'}</Text>
              </View>
            </Row>
            <Btn primary big label="Accept quest" onPress={() => open(qKey)} />
          </Win>
        </Appear>
      )}


      {weighDue ? <WeighReminder onPress={onWeigh} /> : null}

      <View style={{ gap: 10, marginTop: 4 }}>
        <Caps size={12} style={{ color: t.muted }} glow={false}>Gates this week</Caps>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {gates.map(k => {
            const w = g.wk(k), day = gateDay(k, profile), cleared = history.some(x => x.key === k && new Date(x.createdAt) >= weekStart(today));
            const isRed = k === 'D', isToday = k === todayW;
            // gates ahead stay sealed until their day: the workout is a surprise
            const locked = isRed && !premium;
            const sealed = !cleared && day > today.getDay();
            const gd = weekStart(today); gd.setDate(gd.getDate() + day);
            const missed = !cleared && !locked && day < today.getDay() && !isFirstDay(profile, gd);
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

// The player's window at the top of the home screen, kept short; the full window lives in the Status tab
function HomeStatus({ profile, history, onPress }: { profile: Profile; history: Rec[]; onPress: () => void }) {
  const t = useT(), p = player(history);
  return (
    <Appear>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Open status">
        <Win title="STATUS" icon="i" pad={16}>
          <View>
            <Caps size={10} glow={false} style={{ color: t.muted }}>{'Player: ' + profile.name}</Caps>
            <Text style={{ color: t.bright, fontFamily: F.bold, fontSize: 28, lineHeight: 34 }}>{'Level ' + p.level}</Text>
          </View>
          <Meter value={p.into / p.need} height={7} />
          <Text style={{ color: t.muted, fontFamily: F.medium, fontSize: 12, marginTop: -6 }}>{(p.need - p.into) + ' XP to level ' + (p.level + 1)}</Text>
        </Win>
      </Pressable>
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
        const missed = past && !done && d > start;
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

// Home reminder while the weigh-in is open; the quest itself is a pop-up window
function WeighReminder({ onPress }: { onPress: () => void }) {
  const t = useT();
  return (
    <Appear delay={200}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Weekly quest: weigh-in"
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: t.edge, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: pressed ? 'rgba(40, 110, 200, 0.16)' : 'rgba(10, 30, 60, 0.45)', boxShadow: `0 0 12px ${t.glow}` })}>
        <View style={{ width: 22, height: 22, borderWidth: 1, borderColor: t.bright, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: t.bright, fontFamily: F.bold, fontSize: 13 }}>!</Text></View>
        <View style={{ flex: 1 }}>
          <Caps size={10} color={t.accent} glow={false}>Weekly quest</Caps>
          <T style={{ fontFamily: F.semi, fontSize: 15, color: t.bright }}>Weigh-in</T>
        </View>
        <Caps size={11} color={t.bright}>Open ›</Caps>
      </Pressable>
    </Appear>
  );
}

// The weekly weigh-in, as a QUEST INFO window like the System's pop-ups
function WeighQuest({ last, onSave, onLater }: { last?: number; onSave: (kg: number) => void; onLater: () => void }) {
  const t = useT();
  const [kg, setKg] = useState('');
  const v = Math.round(parseFloat(kg) * 10) / 10, ok = v > 30 && v < 250;
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 3, 10, 0.8)', justifyContent: 'center', padding: 20 }}>
      <Appear>
        <Win hero title="QUEST INFO">
          <T glow style={{ textAlign: 'center', fontSize: 15, color: t.fg }}>[Weekly Quest: Weigh-in has arrived.]</T>
          <GoalHeading />
          <Row style={{ gap: 12, paddingHorizontal: 6, paddingVertical: 8 }}>
            <T glow style={{ flex: 1, fontSize: 18 }}>Body weight</T>
            <Text style={{ color: t.bright, fontFamily: F.semi, fontSize: 18 }}>[</Text>
            <TextInput value={kg} onChangeText={setKg} keyboardType="decimal-pad" placeholder={last ? String(last) : '80.0'} placeholderTextColor={t.dim} autoFocus accessibilityLabel="Weight in kg"
              style={{ width: 84, borderBottomWidth: 1, borderColor: t.bright, color: t.bright, fontFamily: F.semi, fontSize: 20, textAlign: 'center', paddingVertical: 4 }} />
            <Text style={{ color: t.bright, fontFamily: F.semi, fontSize: 18 }}>kg]</Text>
          </Row>
          <T muted style={{ textAlign: 'center', fontSize: 13 }}>In the morning, before eating. Reward: 20 XP</T>
          <T glow style={{ textAlign: 'center', fontSize: 15, lineHeight: 24, paddingHorizontal: 10 }}>
            <Text style={{ color: t.warn }}>WARNING</Text>: Failure to report your weight this week will result in a penalty of 20 XP.
          </T>
          <Btn primary big label="Report weight" disabled={!ok} onPress={() => onSave(v)} />
          <Pressable onPress={onLater} hitSlop={10} style={{ alignSelf: 'center' }}><Caps size={11} glow={false} style={{ color: t.muted }}>Later</Caps></Pressable>
        </Win>
      </Appear>
    </View>
  );
}

// ---------- STATUS: the player's window, stats, weight, achievements
function StatusTab({ profile, history, fresh }: { profile: Profile; history: Rec[]; fresh: string[] }) {
  const t = useT();
  const p = player(history), today = new Date();
  const premium = isPremium(profile, today);
  const ws = weights(history);
  const got = ACH.filter(a => a[3](history, today)).map(a => a[0]);
  const p0 = player(history.filter(x => x.createdAt < today.getTime() - 7 * 864e5));
  const weekDone = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart(today)); d.setDate(d.getDate() + i); return onDay(history, d, QUEST_KEYS) ? 1 : 0; }).reduce((a: number, b) => a + b, 0);
  return (
    <>
      <Appear>
        <Win hero title="STATUS" icon="i">
          <Row style={{ gap: 18, alignItems: 'center', paddingHorizontal: 4 }}>
            <View style={{ alignItems: 'center', minWidth: 74 }}>
              <Num size={50} style={{ lineHeight: 54 }}>{p.level}</Num>
              <Caps size={11} color={t.bright}>Level</Caps>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <InfoLine k="Name" v={profile.name} />
              <InfoLine k="Job" v="Player" />
              <InfoLine k="Title" v={gradeFor(p.level)} />
            </View>
          </Row>
          <View style={{ borderWidth: 1, borderColor: t.edge, padding: 12, gap: 10, backgroundColor: 'rgba(0,0,0,0.3)' }}>
            <Bar label="EXP" value={p.into} max={p.need} color={t.accent} />
            <Bar label="WEEK" value={weekDone} max={7} color={t.good} />
          </View>
          <View style={{ borderWidth: 1, borderColor: t.edge, padding: 12, backgroundColor: 'rgba(0,0,0,0.3)', flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 }}>
            {([['str', 'STR', p.str, p.str - p0.str], ['vit', 'VIT', p.end, p.end - p0.end], ['agi', 'AGI', p.agi, p.agi - p0.agi]] as [string, string, number, number][]).map(([ic, k, v, d]) => (
              <Row key={k} style={{ width: '50%', gap: 8 }}>
                <StatIcon k={ic} color={t.bright} />
                <T glow style={{ fontFamily: F.semi, fontSize: 16, color: t.bright }}>{k + ': ' + v}</T>
                {d > 0 ? <Text style={{ color: '#58f08a', fontFamily: F.medium, fontSize: 13, textShadowColor: 'rgba(88,240,138,0.7)', textShadowRadius: 6 }}>{'(+' + d + ')'}</Text> : null}
              </Row>
            ))}
            <Row style={{ width: '50%', gap: 8 }}>
              <StatIcon k="rank" color={t.accent} />
              <T glow style={{ fontFamily: F.semi, fontSize: 16, color: t.bright }}>{'RANK: '}<Text style={{ color: t.accent }}>{profile.rank}</Text></T>
            </Row>
          </View>
          <Caps size={9} glow={false} style={{ color: t.muted, textAlign: 'center', marginTop: -6 }}>Green numbers: gained in the last 7 days</Caps>
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
          <Row style={{ justifyContent: 'space-around' }}>
            <View style={{ alignItems: 'center' }}><Num size={22}>{streak(history, today)}</Num><Caps size={9} glow={false} style={{ color: t.muted }}>Day streak</Caps></View>
            <View style={{ alignItems: 'center' }}><Num size={22}>{history.filter(x => !'WX'.includes(x.key)).length}</Num><Caps size={9} glow={false} style={{ color: t.muted }}>Quests</Caps></View>
            <View style={{ alignItems: 'center' }}><Num size={22}>{history.filter(x => x.key === 'D').length}</Num><Caps size={9} glow={false} style={{ color: t.muted }}>Red Gates</Caps></View>
          </Row>
        </Win>
      </Appear>

      {ws.length ? (
        <Appear delay={80}>
          <Win title="BODY" icon="i">
            <Row style={{ gap: 14 }}>
              <View><Caps size={10} glow={false} style={{ color: t.muted }}>Latest</Caps><Num size={20}>{ws[ws.length - 1].kg + ' kg'}</Num></View>
              <View style={{ flex: 1 }}>{ws.length > 1 ? <Spark values={ws.map(x => x.kg!)} color={t.accent} /> : null}</View>
              <View style={{ alignItems: 'flex-end' }}><Caps size={10} glow={false} style={{ color: t.muted }}>Since start</Caps>
                <Num size={20} color={t.accent}>{(() => { const d = Math.round((ws[ws.length - 1].kg! - ws[0].kg!) * 10) / 10; return (d > 0 ? '+' : '') + d; })()}</Num></View>
            </Row>
          </Win>
        </Appear>
      ) : null}

      <Appear delay={140}>
        <Win title={'ACHIEVEMENTS ' + got.length + '/' + ACH.length} icon="★" tone="secret">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {ACH.map(a => {
              const on = got.includes(a[0]);
              return (
                <View key={a[0]} style={{ width: '47%', flexGrow: 1, borderWidth: 1, borderColor: on ? t.secret : t.line, boxShadow: fresh.includes(a[0]) ? `0 0 12px ${t.secretGlow}` : undefined, padding: 10, gap: 2, backgroundColor: on ? 'rgba(170,120,255,0.08)' : 'rgba(0,0,0,0.25)' }}>
                  <Row style={{ gap: 6 }}>
                    {on ? null : <Lock color={t.dim} size={12} />}
                    <T style={{ fontFamily: F.semi, fontSize: 13, color: on ? t.secret : t.dim, flex: 1 }}>{on ? a[0] : '???'}</T>
                    {fresh.includes(a[0]) ? <Caps size={8} color={t.bright} style={{ backgroundColor: t.secret, paddingHorizontal: 5, paddingVertical: 1 }}>New</Caps> : null}
                  </Row>
                  <T muted style={{ fontSize: 11, lineHeight: 16 }}>{on ? a[1] : 'Hint: ' + a[2]}</T>
                </View>
              );
            })}
          </View>
        </Win>
      </Appear>
      <History history={history} />
    </>
  );
}

const PREMIUM_NOTICE = { title: 'PREMIUM', tone: 'gold' as Tone, lines: ['This gate is sealed for free players.', 'Premium unlocks the Red Gate, ranks up to S and a plan that adapts to you every week.', 'Open the Premium tab to see the plan.'] };

// What premium unlocks, and the trial state
const FREE_PERKS = ['Daily quest and penalty zone', '3 gates a week on your days', 'Levels, grades and ranks up to ' + FREE_RANK_CAP];
// [title, line, coming soon]: perks not built yet are shown as coming, never sold as present
const PAID_PERKS: [string, string, boolean?][] = [
  ['The Red Gate', 'The hardest gate, new every week. Double XP.'],
  ['Ranks B, A and S', 'Keep climbing past rank ' + FREE_RANK_CAP + '.'],
  ['Any equipment, any time', 'Switch between none, home kit and gym.'],
  ['A plan that adapts', 'Every gate adjusts to how your last ones went.', true],
  ['Monthly progress report', 'Strength, streaks and body, side by side.', true],
];
const PREMIUM_ON = { title: 'PREMIUM', tone: 'gold' as Tone, lines: ['Premium is active.', 'The Red Gate and every rank up to S are open.'] };
// shown when Play prices can't be loaded (web, or before the subscription exists in Play Console)
const FALLBACK: Record<billing.PlanId, string> = { yearly: '$17.99', monthly: '$2.99' };

function PremiumWin({ g, profile, onPremium }: { g: ReturnType<typeof useGame>; profile: Profile; onPremium: (on: boolean) => void }) {
  const t = useT(), today = new Date(), left = trialLeft(profile, today), on = !!profile.premium || left > 0;
  const [plan, setPlan] = useState<billing.PlanId>('yearly');
  const [offers, setOffers] = useState<billing.Plan[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!profile.premium) billing.plans().then(setOffers); }, [profile.premium]);
  const price = (k: billing.PlanId) => offers.find(o => o.id === k)?.price || FALLBACK[k];
  const plans: [billing.PlanId, string, string][] = [['yearly', 'Yearly', 'Best for the full 12-week cycle'], ['monthly', 'Monthly', 'Cancel any time']];
  const unlock = async () => {
    setBusy(true);
    // the first load can miss (Play still connecting): ask again before giving up
    let list = offers;
    if (!list.some(x => x.id === plan)) { list = await billing.plans(); setOffers(list); }
    const o = list.find(x => x.id === plan);
    if (!o) { setBusy(false); return g.notify({ title: 'PREMIUM', tone: 'gold', lines: ['The store is not reachable right now.', 'Check your connection and try again.'] }); }
    try { await billing.buy(o); } catch (e) { g.notify({ title: 'PURCHASE', tone: 'gold', lines: [String((e as Error).message || e)] }); }
    setBusy(false);
  };
  const restore = async () => {
    const r = await billing.entitled();
    if (r === null) return g.notify({ title: 'RESTORE', tone: 'gold', lines: ['The store is not reachable right now.'] });
    onPremium(r);
    g.notify(r ? PREMIUM_ON : { title: 'RESTORE', tone: 'gold', lines: ['No active subscription was found for this Google account.'] });
  };
  return (
    <>
      <Appear>
        <Win title="PREMIUM" icon="★" tone="gold">
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text style={{ color: t.gold, fontFamily: F.bold, fontSize: 22, textAlign: 'center' }}>The System learns you</Text>
            <Caps size={10} glow={false} style={{ color: on ? t.good : t.muted }}>
              {profile.premium ? 'Premium is active' : left ? 'Free trial · ' + left + (left === 1 ? ' day' : ' days') + ' left' : 'You are on the free plan'}
            </Caps>
          </View>
          <Divider />
          <Caps size={10} glow={false} style={{ color: t.gold }}>{profile.premium ? 'Your premium perks' : 'Premium unlocks'}</Caps>
          <View style={{ gap: 14 }}>
            {PAID_PERKS.map(([title, sub, soon]) => (
              <Row key={title} style={{ gap: 12, alignItems: 'flex-start' }}>
                <View style={{ width: 28, height: 28, borderWidth: 1, borderColor: 'rgba(255,201,77,0.55)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,201,77,0.08)' }}>
                  {on && !soon ? <Text style={{ color: t.gold, fontFamily: F.bold, fontSize: 13 }}>✓</Text> : <Lock color={t.gold} size={12} />}
                </View>
                <View style={{ flex: 1, gap: 1 }}>
                  <Row style={{ gap: 8 }}>
                    <T style={{ fontFamily: F.semi, fontSize: 15, color: t.bright }}>{title}</T>
                    {soon ? <View style={{ borderWidth: 1, borderColor: 'rgba(255,201,77,0.55)', paddingHorizontal: 5, paddingVertical: 1 }}><Caps size={8} glow={false} style={{ color: t.gold }}>Soon</Caps></View> : null}
                  </Row>
                  <T muted style={{ fontSize: 13, lineHeight: 18 }}>{sub}</T>
                </View>
              </Row>
            ))}
          </View>
        </Win>
      </Appear>

      {profile.premium ? (
        <Appear delay={80}>
          <Btn label="Manage subscription" onPress={() => billing.manage()} />
        </Appear>
      ) : (
        <Appear delay={80}>
          <View style={{ gap: 10 }}>
            <Row style={{ gap: 10, alignItems: 'stretch' }}>
              {plans.map(([k, name, sub]) => {
                const sel = plan === k;
                return (
                  <Pressable key={k} onPress={() => setPlan(k)} accessibilityRole="radio" accessibilityState={{ checked: sel }} accessibilityLabel={name}
                    style={{ flex: 1, padding: 14, gap: 4, alignItems: 'center', borderWidth: 1, borderColor: sel ? t.gold : t.line,
                      backgroundColor: sel ? 'rgba(255,201,77,0.1)' : 'rgba(4,10,24,0.7)', boxShadow: sel ? '0 0 14px rgba(255,201,77,0.35)' : undefined }}>
                    {k === 'yearly' ? <View style={{ position: 'absolute', top: -9, backgroundColor: t.gold, paddingHorizontal: 6, paddingVertical: 1 }}><Caps size={8} glow={false} style={{ color: '#1a1200' }}>Best value</Caps></View> : null}
                    <Caps size={10} glow={false} style={{ color: sel ? t.gold : t.muted }}>{name}</Caps>
                    <Num size={22} color={sel ? t.gold : t.fg}>{price(k)}</Num>
                    <T muted style={{ fontSize: 11, textAlign: 'center' }}>{sub}</T>
                  </Pressable>
                );
              })}
            </Row>
            <Btn gold big label={busy ? 'Opening Google Play…' : left ? 'Keep premium' : 'Unlock premium'} disabled={busy} onPress={unlock} />
            <T muted style={{ fontSize: 11, textAlign: 'center', lineHeight: 16 }}>Billed through Google Play. Renews automatically until you cancel in Play Store › Subscriptions.</T>
            <Pressable onPress={restore} accessibilityRole="button" style={{ alignSelf: 'center', padding: 6 }}>
              <Caps size={10} glow={false} style={{ color: t.muted }}>Restore purchase</Caps>
            </Pressable>
          </View>
        </Appear>
      )}

      {profile.premium ? null : (
      <Appear delay={140}>
        <Win title="FREE PLAN" icon="i">
          <View style={{ gap: 8 }}>
            {FREE_PERKS.map(x => (
              <Row key={x} style={{ gap: 12 }}>
                <View style={{ width: 28, alignItems: 'center' }}><Text style={{ color: t.good, fontFamily: F.bold, fontSize: 13 }}>✓</Text></View>
                <T style={{ fontSize: 14, flex: 1 }}>{x}</T>
              </Row>
            ))}
          </View>
        </Win>
      </Appear>
      )}
    </>
  );
}

// Training days and equipment; changing equipment after the trial is a premium perk
function Settings({ g, profile, onProfile }: { g: ReturnType<typeof useGame>; profile: Profile; onProfile: (p: Profile) => void }) {
  const t = useT();
  const premium = isPremium(profile, new Date());
  const [days, setDays] = useState<number[]>(profile.days || DEFAULT_DAYS);
  const [retest, setRetest] = useState(false);
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
        <Divider />
        <Row style={{ justifyContent: 'space-between' }}>
          <Caps size={10} glow={false} style={{ color: t.muted }}>Fitness test</Caps>
          {profile.fit && !retest ? <Btn small label="Retest" onPress={() => setRetest(true)} /> : null}
        </Row>
        {profile.fit && !retest ? (
          <T muted style={{ fontSize: 13 }}>{profile.fit.push + ' push-ups' + (gear === 'none' ? '' : ' · ' + profile.fit.pull + ' pull-ups') + ' · ' + profile.fit.squat + ' squats · ' + fitLevel(profile.fit, gear) + ' reps'}</T>
        ) : (
          <FitForm gear={gear} init={profile.fit} label="Save" onDone={f => { onProfile({ ...profile, fit: f }); setRetest(false); }} />
        )}
        <Divider />
        <Row style={{ justifyContent: 'space-between' }}>
          <Caps size={10} glow={false} style={{ color: t.muted }}>Notifications</Caps>
          <Row style={{ gap: 6 }}>
            <Btn small label="On" on={profile.notify !== false} onPress={() => { askPermission().catch(() => {}); onProfile({ ...profile, notify: true }); }} />
            <Btn small label="Off" on={profile.notify === false} onPress={() => onProfile({ ...profile, notify: false })} />
          </Row>
        </Row>
        {profile.notify !== false ? (
          <>
            <T muted style={{ fontSize: 12 }}>Daily quest reminder</T>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {REMIND_HOURS.map(hr => <Btn key={hr} small label={String(hr).padStart(2, '0') + ':00'} on={(profile.remindAt ?? DEFAULT_REMIND) === hr} onPress={() => onProfile({ ...profile, remindAt: hr })} style={{ flex: 1 }} />)}
            </View>
            <T muted style={{ fontSize: 12, lineHeight: 18 }}>Plus a warning at 22:00 if today's quest is not done, and the weekly weigh-in at 08:00.</T>
          </>
        ) : null}
      </Win>
    </Appear>
  );
}

function InfoLine({ k, v }: { k: string; v: string }) {
  const t = useT();
  return (
    <Row style={{ gap: 8 }}>
      <Caps size={9} glow={false} style={{ color: t.muted, width: 44 }}>{k}</Caps>
      <T glow numberOfLines={1} style={{ flex: 1, fontFamily: F.semi, fontSize: 15, color: t.bright }}>{v}</T>
    </Row>
  );
}

// A labelled HP/MP-style bar with its numbers
function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const t = useT();
  return (
    <Row style={{ gap: 10 }}>
      <Caps size={10} color={t.bright} style={{ width: 40 }}>{label}</Caps>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ height: 6, borderWidth: 1, borderColor: t.edge, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ width: `${Math.min(1, value / max) * 100}%`, height: '100%', backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
        </View>
        <Text style={{ color: t.muted, fontFamily: F.medium, fontSize: 10, alignSelf: 'flex-end', fontVariant: ['tabular-nums'] }}>{value + ' / ' + max}</Text>
      </View>
    </Row>
  );
}

function StatIcon({ k, color }: { k: string; color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      {k === 'str' ? <Path d="M2.5 12h19M5 8.5v7M8 7v10M16 7v10M19 8.5v7" />
        : k === 'vit' ? <Path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" />
        : k === 'agi' ? <Path d="M13 3L5 13.5h6L10 21l8-10.5h-6z" />
        : <Path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.3l6-.7z" />}
    </Svg>
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
              <T style={{ fontFamily: F.semi, fontSize: 14, color: 'DPX'.includes(x.key) ? t.warn : t.fg }}>{x.key === 'W' ? 'Weigh-in: ' + x.kg + ' kg' : x.workout || KEY_NAMES[x.key] || x.key}</T>
              <Num size={14} color={t.muted}>{'WSQPX'.includes(x.key) ? (XP[x.key] < 0 ? '' : '+') + (XP[x.key] || 0) + ' XP' : fmt(x.totalSec)}</Num>
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
        <Win hero title={n.title} tone={n.tone}>
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
  const pts = values.map((v, i) => (i / (values.length - 1) * 300).toFixed(1) + ',' + (26 - (v - mn) / (mx - mn) * 24).toFixed(1)).join(' ');
  return <Svg width="100%" height={28} viewBox="0 0 300 28" preserveAspectRatio="none"><Polyline points={pts} fill="none" stroke={color} strokeWidth={2} /></Svg>;
}
