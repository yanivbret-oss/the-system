import { View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { DEMOS } from './data';
import { useT } from './ui';

// Looping, silent demo of an exercise, drawn in the System's anime style
// Always full width and 16:9, so every demo in the app has the same proportions
export function Demo({ k }: { k?: string }) {
  const src = k ? DEMOS[k] : undefined;
  return src ? <Loop src={src} /> : null;
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
