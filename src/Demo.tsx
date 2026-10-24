import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { DEMOS, MOVES } from './data';
import { useT, Btn } from './ui';

// Looping, silent demo of an exercise, drawn in the System's anime style
// Always full width and 16:9, so every demo in the app has the same proportions.
// A card with several moves (warm-up, circuits, the chipper) shows each in turn, with a chip to pick one.
export function Demo({ keys }: { keys?: string[] }) {
  const ks = (keys || []).filter(k => DEMOS[k]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(false);
  useEffect(() => {
    if (ks.length < 2 || picked) return;
    const id = setInterval(() => setI(n => (n + 1) % ks.length), 5000);
    return () => clearInterval(id);
  }, [ks.length, picked]);
  if (!ks.length) return null;
  const k = ks[i % ks.length];
  return (
    <View style={{ gap: 8 }}>
      {ks.length > 1 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {ks.map((x, n) => <Btn key={x} small on={x === k} label={MOVES[x]?.[0] || x} onPress={() => { setI(n); setPicked(true); }} />)}
        </View>
      ) : null}
      <Loop key={k} src={DEMOS[k]} />
    </View>
  );
}

function Loop({ src }: { src: number }) {
  const t = useT();
  const player = useVideoPlayer(src, p => { p.loop = true; p.muted = true; p.play(); });
  return (
    <View style={{ width: '100%', aspectRatio: 16 / 9, borderWidth: 1, borderColor: t.line, backgroundColor: '#060d1c', overflow: 'hidden', boxShadow: `0 0 14px ${t.glow}` }}>
      <VideoView player={player} style={{ flex: 1 }} contentFit="cover" nativeControls={false} />
    </View>
  );
}
