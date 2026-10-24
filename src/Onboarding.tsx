import { useState } from 'react';
import { View, TextInput } from 'react-native';
import { Win, T, Btn, Row, Appear, useT } from './ui';
import { F } from './theme';
import { beep } from './sound';

// The awakening: the System offers to make you a Player, then asks your name
export function Onboarding({ onDone }: { onDone: (name: string) => void }) {
  const t = useT();
  const [step, setStep] = useState<'offer' | 'refused' | 'rules' | 'name'>('offer');
  const [name, setName] = useState('');
  const ok = name.trim().length > 0;

  if (step === 'rules') {
    const rules: [string, string][] = [
      ['DAILY QUEST', 'One quest every day, cleared before midnight. On rest days it is push-ups, squats and a plank.'],
      ['GATES', 'Monday, Wednesday and Friday are training days. The workout is that day\'s quest.'],
      ['RED GATE', 'Saturday is the hardest gate. Double XP.'],
      ['PENALTY', 'Miss a daily quest and the penalty zone opens the next day.'],
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
            <T style={{ fontSize: 14, color: t.muted }}>Clear quests to earn XP, level up and rise in rank.</T>
          </View>
          <Btn primary big label="Understood" onPress={() => { beep(880); setStep('name'); }} />
        </Win>
      </Appear>
    );
  }

  if (step === 'name') {
    return (
      <Appear key="name">
        <Win title="PLAYER REGISTRATION">
          <T glow style={{ textAlign: 'center', fontSize: 16 }}>What should the System call you?</T>
          <TextInput
            value={name} onChangeText={setName} placeholder="Player name" placeholderTextColor={t.muted} maxLength={20} autoFocus
            autoCapitalize="words" onSubmitEditing={() => ok && onDone(name.trim())}
            style={{ borderWidth: 1, borderColor: t.edge, color: t.bright, fontFamily: F.semi, fontSize: 20, letterSpacing: 2, textAlign: 'center', padding: 12, backgroundColor: 'rgba(0,0,0,0.4)' }}
          />
          <Btn primary big label="Confirm" disabled={!ok} onPress={() => { beep(1175, true); onDone(name.trim()); }} />
        </Win>
      </Appear>
    );
  }

  return (
    <Appear key="offer">
      <Win title="NOTIFICATION">
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
