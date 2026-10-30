import { useState } from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { Win, T, Btn, Row, Caps, Appear, useT } from './ui';
import { DAYS, GEAR, Gear, Fit, Kit, KIT, FULL_KIT, Setup } from './data';
import { DEFAULT_DAYS } from './logic';
import { F } from './theme';
import { beep } from './sound';

// The awakening: the System offers to make you a Player, then asks your name
// What a home player owns, and whether they run; every gate is rebuilt around it
export function KitPicker({ gear, kit, noRun, onChange }: { gear: Gear; kit: Kit[]; noRun: boolean; onChange: (kit: Kit[], noRun: boolean) => void }) {
  const t = useT();
  const flip = (k: Kit) => onChange(kit.includes(k) ? kit.filter(x => x !== k) : [...kit, k], noRun);
  return (
    <View style={{ gap: 8 }}>
      {gear === 'basic' ? (
        <>
          <Caps size={10} glow={false} style={{ color: t.muted }}>What do you have?</Caps>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {KIT.map(([k, label]) => <Btn key={k} small label={label} on={kit.includes(k)} onPress={() => flip(k)} />)}
          </View>
        </>
      ) : null}
      <Caps size={10} glow={false} style={{ color: t.muted }}>Running</Caps>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <Btn small label="I run" on={!noRun} onPress={() => onChange(kit, false)} style={{ flex: 1 }} />
        <Btn small label="Jumping jacks instead" on={noRun} onPress={() => onChange(kit, true)} style={{ flex: 1.6 }} />
      </View>
    </View>
  );
}

// Fitness test: the most reps in a row of each base movement; the System scales the plan to it
export function FitForm({ gear, init, label = 'Confirm', onDone }: { gear: Gear; init?: Fit; label?: string; onDone: (f: Fit) => void }) {
  const t = useT();
  const [v, setV] = useState<Record<keyof Fit, string>>({ push: init ? String(init.push) : '', pull: init ? String(init.pull) : '', squat: init ? String(init.squat) : '' });
  const rows: [keyof Fit, string][] = [['push', 'Push-ups'], ...(gear === 'none' ? [] : [['pull', 'Pull-ups'] as [keyof Fit, string]]), ['squat', 'Squats']];
  const ok = rows.every(([k]) => /^\d+$/.test(v[k]));
  const num = (k: keyof Fit) => Math.min(999, parseInt(v[k] || '0', 10) || 0);
  return (
    <View style={{ gap: 10 }}>
      {rows.map(([k, label]) => (
        <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <T style={{ flex: 1, fontFamily: F.semi, fontSize: 16 }}>{label}</T>
          <TextInput value={v[k]} onChangeText={x => setV(c => ({ ...c, [k]: x.replace(/[^0-9]/g, '').slice(0, 3) }))} keyboardType="number-pad" placeholder="0" placeholderTextColor={t.muted}
            accessibilityLabel={label + ' in a row'}
            style={{ width: 80, borderWidth: 1, borderColor: t.edge, color: t.bright, fontFamily: F.semi, fontSize: 20, textAlign: 'center', padding: 8, backgroundColor: 'rgba(0,0,0,0.4)' }} />
        </View>
      ))}
      <T muted style={{ fontSize: 12, lineHeight: 18 }}>Your best guess is fine. Zero is fine too. You can retest any time in Settings.</T>
      <Btn primary big label={label} disabled={!ok} onPress={() => { beep(1175, true); onDone({ push: num('push'), pull: gear === 'none' ? 0 : num('pull'), squat: num('squat') }); }} />
    </View>
  );
}

export function Onboarding({ onDone }: { onDone: (name: string, days: number[], gear: Gear, fit: Fit, setup: Setup) => void }) {
  const t = useT();
  const [step, setStep] = useState<'offer' | 'refused' | 'rules' | 'name' | 'days' | 'gear' | 'fit'>('offer');
  const [name, setName] = useState('');
  const ok = name.trim().length > 0;
  const [days, setDays] = useState<number[]>(DEFAULT_DAYS);
  const nDays = days.length, daysOk = nDays === 3 || nDays === 4;
  const [gear, setGear] = useState<Gear | null>(null);
  const [kit, setKit] = useState<Kit[]>(FULL_KIT);
  const [noRun, setNoRun] = useState(false);

  if (step === 'fit' && gear) {
    return (
      <Appear key="fit">
        <Win title="FITNESS TEST">
          <T glow style={{ textAlign: 'center', fontSize: 16 }}>How many can you do in a row?</T>
          <T muted style={{ textAlign: 'center', fontSize: 13, lineHeight: 20 }}>Clean reps, no rest. The System sets your reps from this, so your first gate is hard but possible.</T>
          <FitForm gear={gear} onDone={f => onDone(name.trim(), days, gear, f, { kit: gear === 'basic' ? kit : undefined, noRun })} />
        </Win>
      </Appear>
    );
  }

  if (step === 'gear') {
    return (
      <Appear key="gear">
        <Win title="EQUIPMENT">
          <T glow style={{ textAlign: 'center', fontSize: 16 }}>Where will you train?</T>
          <T muted style={{ textAlign: 'center', fontSize: 13, lineHeight: 20 }}>The System builds every gate around what you have.</T>
          <View style={{ gap: 8 }}>
            {GEAR.map(([k, label, sub]) => {
              const on = gear === k;
              return (
                <Pressable key={k} onPress={() => { beep(740); setGear(k); }} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: on }}
                  style={({ pressed }) => ({ padding: 14, gap: 2, borderWidth: 1, borderColor: on ? t.edge : t.line, backgroundColor: pressed || on ? 'rgba(80,170,255,0.12)' : 'rgba(0,0,0,0.3)', boxShadow: on ? `0 0 12px ${t.glow}` : undefined })}>
                  <T style={{ fontFamily: F.semi, fontSize: 16, color: on ? t.bright : t.fg }}>{label}</T>
                  <T muted style={{ fontSize: 13 }}>{sub}</T>
                </Pressable>
              );
            })}
          </View>
          {gear ? <KitPicker gear={gear} kit={kit} noRun={noRun} onChange={(k, n) => { beep(740); setKit(k); setNoRun(n); }} /> : null}
          <Btn primary big label="Next" disabled={!gear} onPress={() => { beep(880); setStep('fit'); }} />
        </Win>
      </Appear>
    );
  }

  if (step === 'days') {
    const flip = (d: number) => setDays(cur => cur.includes(d) ? cur.filter(x => x !== d) : [...cur, d].sort((a, b) => a - b));
    return (
      <Appear key="days">
        <Win title="TRAINING DAYS">
          <T glow style={{ textAlign: 'center', fontSize: 16 }}>Which days will you enter a gate?</T>
          <T muted style={{ textAlign: 'center', fontSize: 13, lineHeight: 20 }}>Pick 3 or 4 days. With 4, the last one is the Red Gate. Every other day gets the daily quest.</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {DAYS.map((d, i) => <Btn key={d} small label={d.slice(0, 3)} on={days.includes(i)} onPress={() => flip(i)} style={{ minWidth: 64 }} />)}
          </View>
          <Caps size={10} glow={false} style={{ textAlign: 'center', color: daysOk ? t.muted : t.warn }}>{nDays + ' days selected' + (daysOk ? '' : ' · choose 3 or 4')}</Caps>
          <Btn primary big label="Next" disabled={!daysOk || !ok} onPress={() => { beep(880); setStep('gear'); }} />
        </Win>
      </Appear>
    );
  }

  if (step === 'rules') {
    const rules: [string, string][] = [
      ['DAILY QUEST', 'One quest every day, cleared before midnight. On rest days it is push-ups, squats and a plank.'],
      ['GATES', 'You choose 3 or 4 training days. On those days the workout is the quest, and it stays sealed until the day comes.'],
      ['RED GATE', 'Train 4 days and your last gate of the week is the Red Gate. The hardest one. Double XP.'],
      ['PENALTY', 'Miss a day and the penalty zone opens the next morning. Nothing else unlocks until it is cleared.'],
    ];
    return (
      <Appear key="rules">
        <Win title="SYSTEM BRIEFING">
          <View style={{ gap: 14, paddingVertical: 6 }}>
            {rules.map(([h, d], i) => (
              <View key={h} style={{ gap: 3 }}>
                <T style={{ fontFamily: F.bold, fontSize: 13, letterSpacing: 2, color: i === 2 || i === 3 ? t.warn : t.bright }}>{h}</T>
                <T style={{ fontSize: 15, lineHeight: 22 }}>{d}</T>
              </View>
            ))}
            <T style={{ fontSize: 14, color: t.muted }}>Clear quests to earn XP, level up and rise in rank. Your first 7 days include every premium feature.</T>
          </View>
          <Btn primary big label="Understood" onPress={() => { beep(880); setStep('name'); }} />
        </Win>
      </Appear>
    );
  }

  if (step === 'name') {
    return (
      <Appear key="name">
        <Win hero title="PLAYER AWAKENING">
          <T glow style={{ textAlign: 'center', fontSize: 16 }}>What should the System call you?</T>
          <TextInput
            value={name} onChangeText={setName} placeholder="Player name" placeholderTextColor={t.muted} maxLength={20} autoFocus
            autoCapitalize="words" onSubmitEditing={() => ok && setStep('days')}
            style={{ borderWidth: 1, borderColor: t.edge, color: t.bright, fontFamily: F.semi, fontSize: 20, letterSpacing: 2, textAlign: 'center', padding: 12, backgroundColor: 'rgba(0,0,0,0.4)' }}
          />
          <Btn primary big label="Next" disabled={!ok} onPress={() => { beep(880); setStep('days'); }} />
        </Win>
      </Appear>
    );
  }

  return (
    <Appear key="offer">
      <Win hero title="NOTIFICATION">
        <View style={{ gap: 4, paddingVertical: 18, paddingHorizontal: 6 }}>
          <T glow style={{ fontSize: 17, lineHeight: 30 }}>
            You have been chosen to become a <T glow style={{ fontFamily: F.bold, fontStyle: 'italic', fontSize: 17, color: t.bright }}>Player</T>.
          </T>
          <T glow style={{ fontSize: 17, lineHeight: 30 }}>Will you accept?</T>
          {step === 'refused' ? <T style={{ color: t.warn, fontFamily: F.semi, marginTop: 10, fontSize: 16 }}>Refusal is not an option.</T> : null}
        </View>
        <Row style={{ justifyContent: 'space-around', paddingBottom: 4 }}>
          <Btn primary label="Yes" style={{ minWidth: 120 }} onPress={() => { beep(880); setStep('rules'); }} />
          <Btn label="No" style={{ minWidth: 120 }} onPress={() => { beep(440); setStep('refused'); }} />
        </Row>
      </Win>
    </Appear>
  );
}
