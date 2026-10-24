import { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { View, Text, Pressable, Animated, TextProps, ViewStyle, TextStyle, StyleProp } from 'react-native';
import Svg, { Line, Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { BLUE, F, Theme } from './theme';

export const ThemeCtx = createContext<Theme>(BLUE);
export const useT = () => useContext(ThemeCtx);

export type Tone = 'normal' | 'penalty' | 'secret' | 'gold';
const toneEdge = (t: Theme, tone: Tone) => tone === 'penalty' ? t.warn : tone === 'secret' ? t.secret : tone === 'gold' ? t.gold : t.edge;
const toneGlow = (t: Theme, tone: Tone) => tone === 'penalty' ? t.warnGlow : tone === 'secret' ? t.secretGlow : tone === 'gold' ? 'rgba(255, 201, 77, 0.5)' : t.glow;
const glowText = (c: string, r = 10): TextStyle => ({ textShadowColor: c, textShadowRadius: r, textShadowOffset: { width: 0, height: 0 } });

// Body text with the System's soft glow
export function T({ style, glow, muted, ...p }: TextProps & { glow?: boolean; muted?: boolean }) {
  const t = useT();
  return <Text {...p} style={[{ color: muted ? t.muted : t.fg, fontFamily: F.medium, fontSize: 15, lineHeight: 23 }, glow && glowText(t.textGlow, 4), style]} />;
}

// Spaced capitals, as in the System's "NOTIFICATION" box
export function Caps({ children, size = 13, color, style, glow = true }: { children: ReactNode; size?: number; color?: string; style?: StyleProp<TextStyle>; glow?: boolean }) {
  const t = useT();
  return <Text style={[{ fontFamily: F.semi, fontSize: size, letterSpacing: size * 0.24, color: color || t.fg, textTransform: 'uppercase' }, glow && glowText(t.textGlow, 10), style]}>{children}</Text>;
}

// Numbers: tabular, bright, glowing
export function Num({ children, size = 28, color, style }: { children: ReactNode; size?: number; color?: string; style?: StyleProp<TextStyle> }) {
  const t = useT();
  return <Text style={[{ fontFamily: F.semi, fontSize: size, color: color || t.bright, fontVariant: ['tabular-nums'], letterSpacing: 1 }, glowText(t.textGlow, 12), style]}>{children}</Text>;
}

// Windows open like the System's: a quick fade and scale from the center line
export function Appear({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(a, { toValue: 1, duration: 320, delay, useNativeDriver: true }).start(); }, []);
  return (
    <Animated.View style={[{ opacity: a, transform: [{ scaleY: a.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }, style]}>
      {children}
    </Animated.View>
  );
}

// Thin bright corner brackets that sit on a window's corners
function Corners({ color, size = 10 }: { color: string; size?: number }) {
  const b = { position: 'absolute' as const, width: size, height: size, borderColor: color };
  return (
    <>
      <View pointerEvents="none" style={[b, { top: -1, left: -1, borderTopWidth: 2, borderLeftWidth: 2 }]} />
      <View pointerEvents="none" style={[b, { top: -1, right: -1, borderTopWidth: 2, borderRightWidth: 2 }]} />
      <View pointerEvents="none" style={[b, { bottom: -1, left: -1, borderBottomWidth: 2, borderLeftWidth: 2 }]} />
      <View pointerEvents="none" style={[b, { bottom: -1, right: -1, borderBottomWidth: 2, borderRightWidth: 2 }]} />
    </>
  );
}

// Faint diagonal light streaks across the glass
function Sheen() {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', opacity: 0.5 }}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Line x1="62" y1="0" x2="18" y2="100" stroke="rgba(200,235,255,0.07)" strokeWidth="0.6" />
        <Line x1="70" y1="0" x2="30" y2="100" stroke="rgba(200,235,255,0.05)" strokeWidth="0.3" />
        <Line x1="96" y1="0" x2="58" y2="100" stroke="rgba(200,235,255,0.06)" strokeWidth="0.4" />
        <Line x1="30" y1="0" x2="-8" y2="100" stroke="rgba(200,235,255,0.04)" strokeWidth="0.3" />
      </Svg>
    </View>
  );
}

// A System window: dark glass, thin glowing edge, corner brackets, header of an icon box and a title box
export function Win({ title, icon = '!', tone = 'normal', children, style, pad = 18 }: {
  title?: string; icon?: string; tone?: Tone; children?: ReactNode; style?: StyleProp<ViewStyle>; pad?: number;
}) {
  const t = useT();
  const edge = toneEdge(t, tone), glow = toneGlow(t, tone);
  return (
    <View style={[{ borderWidth: 1, borderColor: edge, padding: pad, gap: 14,
      backgroundImage: `linear-gradient(165deg, ${t.glassTop} 0%, ${t.glassBottom} 70%)`, backgroundColor: t.glassBottom,
      boxShadow: `0 0 18px ${glow}, inset 0 0 30px ${glow}` }, style]}>
      <Sheen />
      <Corners color={tone === 'normal' ? t.bright : edge} />
      {title ? <Header title={title} icon={icon} tone={tone} /> : null}
      {children}
    </View>
  );
}

export function Header({ title, icon = '!', tone = 'normal' }: { title: string; icon?: string; tone?: Tone }) {
  const t = useT();
  const edge = toneEdge(t, tone), glow = toneGlow(t, tone);
  const box: ViewStyle = { borderWidth: 1, borderColor: edge, minHeight: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)', boxShadow: `0 0 10px ${glow}, inset 0 0 8px ${glow}` };
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignSelf: 'center' }}>
      <View style={[box, { width: 38 }]}>
        <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: tone === 'normal' ? t.bright : edge, alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 6px ${glow}` }}>
          <Text style={[{ color: tone === 'normal' ? t.bright : edge, fontFamily: F.bold, fontSize: 12, lineHeight: 14 }, glowText(glow, 6)]}>{icon}</Text>
        </View>
      </View>
      <View style={[box, { paddingHorizontal: 18 }]}>
        <Caps size={14} color={tone === 'normal' ? t.bright : edge} style={glowText(glow, 12)}>{title}</Caps>
      </View>
    </View>
  );
}

// Outlined rectangle button, label in spaced capitals. "primary" glows; "danger" is red.
export function Btn({ label, onPress, primary, danger, on, disabled, big, style, small }: {
  label: string; onPress?: () => void; primary?: boolean; danger?: boolean; on?: boolean; disabled?: boolean; big?: boolean; small?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const t = useT();
  const c = danger ? t.warn : on ? t.good : primary ? t.edge : t.line;
  const glow = danger ? t.warnGlow : primary || on ? t.glow : 'transparent';
  return (
    <Pressable
      onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, selected: on }}
      style={({ pressed }) => [{ borderWidth: 1, borderColor: c, paddingVertical: big ? 15 : small ? 6 : 10, paddingHorizontal: small ? 10 : 16, alignItems: 'center', justifyContent: 'center',
        backgroundColor: pressed ? 'rgba(150, 215, 255, 0.18)' : on ? 'rgba(89, 232, 255, 0.1)' : primary ? 'rgba(80, 170, 255, 0.1)' : 'rgba(0, 0, 0, 0.3)',
        boxShadow: `0 0 12px ${glow}, inset 0 0 10px ${glow}`, opacity: disabled ? 0.35 : 1, minHeight: small ? 36 : 44 }, style]}
    >
      <Caps size={big ? 15 : small ? 11 : 13} color={danger ? t.warn : on ? t.good : t.bright} glow={!!(primary || danger || on)}>{label}</Caps>
    </Pressable>
  );
}

// Glowing rails that frame the screen, like the frame around the System's windows
export function Rail({ flip }: { flip?: boolean }) {
  const t = useT();
  return (
    <View style={{ height: 14, justifyContent: 'center' }}>
      <View style={{ height: 5, backgroundColor: t.rail, boxShadow: `0 0 16px 3px ${t.railGlow}` }}>
        <View style={{ position: 'absolute', top: 2, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.85)' }} />
      </View>
      <View style={{ position: 'absolute', [flip ? 'top' : 'bottom']: 0, left: '12%', right: '12%', height: 2, backgroundColor: t.accent, opacity: 0.6 }} />
      <View style={{ position: 'absolute', [flip ? 'top' : 'bottom']: -3, left: '30%', width: 40, height: 3, backgroundColor: t.bright, opacity: 0.7 }} />
      <View style={{ position: 'absolute', [flip ? 'top' : 'bottom']: -3, right: '22%', width: 18, height: 3, backgroundColor: t.bright, opacity: 0.5 }} />
    </View>
  );
}

// Deep navy backdrop with faint diagonal streaks
export function Backdrop() {
  const t = useT();
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <Svg width="100%" height="100%" viewBox="0 0 100 200" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={t.bgTop} />
            <Stop offset="0.45" stopColor={t.bg} />
            <Stop offset="1" stopColor={t.bg} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="200" fill="url(#bg)" />
        {[10, 34, 55, 80, 120, 150].map((x, i) => (
          <Line key={i} x1={x} y1="0" x2={x - 60} y2="200" stroke={t.accent} strokeOpacity={0.04 + (i % 3) * 0.015} strokeWidth={0.25 + (i % 2) * 0.3} />
        ))}
      </Svg>
    </View>
  );
}

// A progress ring, used for the time left until midnight
export function Ring({ size, progress, children, color }: { size: number; progress: number; children?: ReactNode; color?: string }) {
  const t = useT();
  const r = size / 2 - 6, c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={t.line} strokeWidth={3} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color || t.accent} strokeWidth={3} fill="none" strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, progress)))} strokeLinecap="square" />
      </Svg>
      {children}
    </View>
  );
}

// A bar meter for XP and stats
export function Meter({ value, color, height = 6 }: { value: number; color?: string; height?: number }) {
  const t = useT();
  return (
    <View style={{ height, backgroundColor: 'rgba(160, 215, 255, 0.1)', borderWidth: 1, borderColor: t.line, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height: '100%', backgroundColor: color || t.accent, boxShadow: `0 0 10px ${color || t.glow}` }} />
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, style]}>{children}</View>;
}

export function Divider() {
  const t = useT();
  return <View style={{ height: 1, backgroundColor: t.line }} />;
}
