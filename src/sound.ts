import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

const SRC: Record<string, number> = {
  '440s': require('../assets/sounds/b440_s.wav'), '440l': require('../assets/sounds/b440_l.wav'),
  '523s': require('../assets/sounds/b523_s.wav'), '523l': require('../assets/sounds/b523_l.wav'),
  '660s': require('../assets/sounds/b660_s.wav'), '660l': require('../assets/sounds/b660_l.wav'),
  '740s': require('../assets/sounds/b740_s.wav'), '740l': require('../assets/sounds/b740_l.wav'),
  '880s': require('../assets/sounds/b880_s.wav'), '880l': require('../assets/sounds/b880_l.wav'),
  '988s': require('../assets/sounds/b988_s.wav'), '988l': require('../assets/sounds/b988_l.wav'),
  '1175s': require('../assets/sounds/b1175_s.wav'), '1175l': require('../assets/sounds/b1175_l.wav'),
  '1319s': require('../assets/sounds/b1319_s.wav'), '1319l': require('../assets/sounds/b1319_l.wav'),
};
const players: Record<string, AudioPlayer> = {};
let ready = false;

export function initSound() {
  if (ready) return; ready = true;
  // Beeps must be heard over music and with the phone on the floor during a workout
  setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(() => {});
}

// freq: one of the generated tones; long: the 0.4s version for "time's up" and rewards
export function beep(freq: number, long = false) {
  const k = freq + (long ? 'l' : 's');
  try {
    if (!SRC[k]) return;
    const p = players[k] || (players[k] = createAudioPlayer(SRC[k]));
    p.seekTo(0); p.play();
  } catch {}
  Haptics.impactAsync(long ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
