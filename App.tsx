import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Heebo_400Regular, Heebo_500Medium, Heebo_700Bold, Heebo_800ExtraBold } from '@expo-google-fonts/heebo';
import { Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { JetBrainsMono_500Medium, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import { BLUE, RED } from './src/theme';
import { ThemeCtx, Rail } from './src/ui';
import { Onboarding } from './src/Onboarding';
import { Home } from './src/Home';
import { Profile, Rec, store, ymd } from './src/logic';
import { initSound } from './src/sound';

export default function App() {
  const [fonts] = useFonts({ Heebo_400Regular, Heebo_500Medium, Heebo_700Bold, Heebo_800ExtraBold, Montserrat_600SemiBold, Montserrat_700Bold, JetBrainsMono_500Medium, JetBrainsMono_700Bold });
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
          <View style={{ paddingHorizontal: 16 }}><Rail /></View>
          {!ready ? <View style={{ flex: 1 }} /> : profile ? (
            <Home profile={profile} history={history} setHistory={setHistory} onRedGate={setRed} />
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', padding: 16 }}>
              <Onboarding onDone={name => { const p = { name, startDate: ymd(new Date()), rank: 'E' }; store.saveProfile(p); setProfile(p); }} />
            </View>
          )}
          <View style={{ paddingHorizontal: 16 }}><Rail /></View>
        </SafeAreaView>
      </SafeAreaProvider>
    </ThemeCtx.Provider>
  );
}
