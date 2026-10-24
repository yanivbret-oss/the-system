import { View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { DEMOS } from './data';
import { useT } from './ui';

// Looping, silent demo of an exercise, drawn in the System's anime style
export function Demo({ k, size = 240 }: { k?: string; size?: number }) {
  const src = k ? DEMOS[k] : undefined;
  return src ? <Loop src={src} size={size} /> : null;
}

function Loop({ src, size }: { src: string; size: number }) {
  const t = useT();
  const player = useVideoPlayer(src, p => { p.loop = true; p.muted = true; p.play(); });
  return (
    <View style={{ width: size, aspectRatio: 3 / 4, alignSelf: 'center', borderWidth: 1, borderColor: t.line, backgroundColor: '#060d1c', overflow: 'hidden', boxShadow: `0 0 14px ${t.glow}` }}>
      <VideoView player={player} style={{ flex: 1 }} contentFit="cover" nativeControls={false} />
    </View>
  );
}
