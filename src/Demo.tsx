import { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { DEMOS, MOVES } from './data';
import { useT, Btn, Caps } from './ui';

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
  // mixWithOthers: the silent loop must not take audio focus, or the app's beeps pause it
  const player = useVideoPlayer(src, p => { p.loop = true; p.muted = true; p.audioMixingMode = 'mixWithOthers'; p.play(); });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  // if the system pauses it anyway, try to resume; still stopped after that shows a replay button
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    if (isPlaying) { setStuck(false); return; }
    const a = setTimeout(() => { try { player.play(); } catch {} }, 600);
    const b = setTimeout(() => setStuck(true), 1500);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [isPlaying]);
  return (
    <View style={{ width: '100%', aspectRatio: 16 / 9, borderWidth: 1, borderColor: t.line, backgroundColor: '#060d1c', overflow: 'hidden', boxShadow: `0 0 14px ${t.glow}` }}>
      <VideoView player={player} style={{ flex: 1 }} contentFit="cover" nativeControls={false} />
      {isPlaying || !stuck ? null : (
        <Pressable onPress={() => { try { player.replay(); player.play(); } catch {} }} accessibilityLabel="Play again"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(6,13,28,0.45)' }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 1.5, borderColor: t.accent, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(6,13,28,0.7)', boxShadow: `0 0 14px ${t.glow}` }}>
            <Caps size={30} color={t.accent}>↻</Caps>
          </View>
        </Pressable>
      )}
    </View>
  );
}
