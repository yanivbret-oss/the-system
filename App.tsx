import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { BLUE, RED } from './src/theme';
import { ThemeCtx, Rail, Backdrop } from './src/ui';
import { Onboarding } from './src/Onboarding';
import { Main } from './src/Main';
import { Profile, Rec, store, ymd } from './src/logic';
import { initSound } from './src/sound';

export default function App() {
  const [fonts] = useFonts({ Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold });
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
              <Main profile={profile} history={history} setHistory={setHistory} onRedGate={setRed} />
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
                <Onboarding onDone={name => { const p = { name, startDate: ymd(new Date()), rank: 'E' }; store.saveProfile(p); setProfile(p); }} />
              </View>
            )}
          </View>
          <Rail flip />
        </SafeAreaView>
      </SafeAreaProvider>
    </ThemeCtx.Provider>
  );
}
