// The System: dark glass windows with thin glowing edges on deep navy, framed by bright blue rails.
// Red Gate turns everything red until the mission is reported.
export type Theme = typeof BLUE;

export const BLUE = {
  bg: '#020611', bgTop: '#071733', fg: '#E3F4FF', muted: '#7F9DBB', dim: '#3A5372', line: 'rgba(160, 215, 255, 0.18)',
  edge: 'rgba(205, 238, 255, 0.85)', bright: '#FFFFFF', accent: '#3DA2FF', rail: '#2C86FF', railGlow: 'rgba(44, 134, 255, 0.9)',
  glow: 'rgba(70, 170, 255, 0.45)', textGlow: 'rgba(120, 200, 255, 0.9)', glassTop: 'rgba(28, 58, 98, 0.55)', glassBottom: 'rgba(3, 9, 22, 0.88)',
  good: '#59E8FF', warn: '#FF2D4F', warnGlow: 'rgba(255, 45, 79, 0.6)', gold: '#FFC94D', secret: '#B98CFF', secretGlow: 'rgba(170, 120, 255, 0.55)',
};
export const RED: Theme = {
  ...BLUE,
  bg: '#0B0105', bgTop: '#2A0510', fg: '#FFE8EC', muted: '#C9909B', dim: '#6B2A38', line: 'rgba(255, 150, 165, 0.2)',
  edge: 'rgba(255, 205, 212, 0.85)', accent: '#FF3B55', rail: '#FF1E3C', railGlow: 'rgba(255, 30, 60, 0.9)',
  glow: 'rgba(255, 50, 80, 0.5)', textGlow: 'rgba(255, 90, 110, 0.9)', glassTop: 'rgba(90, 16, 32, 0.55)', glassBottom: 'rgba(20, 3, 8, 0.88)',
  good: '#FF7A8C',
};

export const F = {
  regular: 'Montserrat_400Regular', medium: 'Montserrat_500Medium', semi: 'Montserrat_600SemiBold', bold: 'Montserrat_700Bold',
};
