import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Jost_400Regular, Jost_500Medium, Jost_600SemiBold, Jost_700Bold } from '@expo-google-fonts/jost';
import { BLUE, RED } from './src/theme';
import { ThemeCtx, Rail, Backdrop } from './src/ui';
import { Onboarding } from './src/Onboarding';
import { Main } from './src/Main';
import { Profile, Rec, store, ymd } from './src/logic';
import { initSound } from './src/sound';

export default function App() {
  const [fonts] = useFonts({ Jost_400Regular, Jost_500Medium, Jost_600SemiBold, Jost_700Bold });
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [history, setHistory] = useState<Rec[]>([]);
  const [red, setRed] = useState(false);

  useEffect(() => {
    initSound();
    Promise.all([store.profile(), store.history()]).then(([p, h]) => { setHistory(h); setProfile(p); });
  }, []);

  const t = red ? RED : BLUE;
  const ready = fonts && profile !== undefined;

  return (
    <ThemeCtx.Provider value={t}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top', 'bottom']}>
          <Backdrop />
          <Rail />
          <View style={{ flex: 1 }}>
            {!ready ? null : profile ? (
              <Main profile={profile} history={history} setHistory={setHistory} onRedGate={setRed} onProfile={p => { store.saveProfile(p); setProfile(p); }} />
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
                <Onboarding onDone={(name, days, gear, fit) => { const p = { name, startDate: ymd(new Date()), rank: 'E', days, gear, fit }; store.saveProfile(p); setProfile(p); }} />
              </View>
            )}
          </View>
          <Rail flip />
        </SafeAreaView>
      </SafeAreaProvider>
    </ThemeCtx.Provider>
  );
}
