import { useState } from 'react';
import { View, TextInput } from 'react-native';
import { Win, T, Btn, Row, useT } from './ui';
import { F } from './theme';
import { beep } from './sound';

// The awakening: the System offers to make you a Player, then asks your name
export function Onboarding({ onDone }: { onDone: (name: string) => void }) {
  const t = useT();
  const [step, setStep] = useState<'offer' | 'refused' | 'name'>('offer');
  const [name, setName] = useState('');

  if (step === 'name') {
    const ok = name.trim().length > 0;
    return (
      <Win title="PLAYER">
        <T glow style={{ textAlign: 'center' }}>הרישום כמעט הושלם. איך המערכת תקרא לך?</T>
        <TextInput
          value={name} onChangeText={setName} placeholder="שם השחקן" placeholderTextColor={t.muted} maxLength={20} autoFocus
          onSubmitEditing={() => ok && onDone(name.trim())}
          style={{ borderWidth: 1, borderColor: t.edge, color: t.fg, fontFamily: F.bold, fontSize: 20, textAlign: 'center', padding: 12, backgroundColor: 'rgba(0,0,0,0.35)' }}
        />
        <Btn primary big label="אישור" disabled={!ok} onPress={() => { beep(1175, true); onDone(name.trim()); }} />
      </Win>
    );
  }

  return (
    <Win title="NOTIFICATION">
      <View style={{ gap: 6, paddingVertical: 12 }}>
        <T glow style={{ textAlign: 'center', fontSize: 18, lineHeight: 30 }}>
          המערכת בחרה בך להיות <T glow style={{ fontFamily: F.heavy, fontSize: 18 }}>שחקן</T>.
        </T>
        <T glow style={{ textAlign: 'center', fontSize: 18, lineHeight: 30 }}>האם תקבל?</T>
        {step === 'refused' ? (
          <T style={{ textAlign: 'center', color: t.warn, fontFamily: F.bold, marginTop: 8 }}>סירוב אינו אפשרות.</T>
        ) : null}
      </View>
      <Row style={{ justifyContent: 'space-around' }}>
        <Btn primary label="כן" style={{ minWidth: 110 }} onPress={() => { beep(880); setStep('name'); }} />
        <Btn label="לא" style={{ minWidth: 110 }} onPress={() => { beep(440); setStep('refused'); }} />
      </Row>
    </Win>
  );
}
