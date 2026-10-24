// The System: dark glass windows with thin glowing borders, framed by bright blue rails.
// Red Gate turns everything red until the mission is reported.
export type Theme = typeof BLUE;

export const BLUE = {
  bg: '#03060D', panel: 'rgba(7, 14, 28, 0.92)', fg: '#E6F6FF', muted: '#8FB2CF', line: 'rgba(170, 225, 255, 0.22)',
  edge: '#BFEAFF', rail: '#2F8BFF', railGlow: 'rgba(47, 139, 255, 0.85)', glow: 'rgba(80, 190, 255, 0.45)',
  textGlow: 'rgba(110, 210, 255, 0.85)', live: '#5FE0FF', liveInk: '#021018', good: '#5CF2B0', goodSoft: 'rgba(92, 242, 176, 0.08)',
  warn: '#FF3355', warnGlow: 'rgba(255, 51, 85, 0.55)',
  secret: '#C9A2FF', secretGlow: 'rgba(181, 123, 255, 0.5)',
};
export const RED: Theme = {
  ...BLUE,
  bg: '#0D0205', panel: 'rgba(28, 6, 11, 0.92)', fg: '#FFECEF', muted: '#D99AA6', line: 'rgba(255, 150, 165, 0.25)',
  edge: '#FFC2CB', rail: '#FF2140', railGlow: 'rgba(255, 33, 64, 0.85)', glow: 'rgba(255, 60, 90, 0.5)',
  textGlow: 'rgba(255, 80, 100, 0.85)', live: '#FF6B7E', liveInk: '#1A0205',
};

export const F = {
  head: 'Montserrat_600SemiBold', headBold: 'Montserrat_700Bold',
  body: 'Heebo_400Regular', medium: 'Heebo_500Medium', bold: 'Heebo_700Bold', heavy: 'Heebo_800ExtraBold',
  mono: 'JetBrainsMono_500Medium', monoBold: 'JetBrainsMono_700Bold',
};
