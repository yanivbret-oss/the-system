import { createContext, useContext, useEffect, useRef, useState, useId, ReactNode } from 'react';
import { View, Text, Pressable, Animated, TextProps, ViewStyle, TextStyle, StyleProp, Platform } from 'react-native';
import Svg, { Line, Circle, Defs, LinearGradient, RadialGradient, Stop, Rect, Polygon, Polyline } from 'react-native-svg';
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

// The window frame, drawn to the window's size: cut corners, a soft outer glow, a thin bright edge,
// a fainter inner edge, and bright accents on the cut corners. "hero" windows add neon bars on the
// sides and a crest at the top, like the System's big notification frames.
function Frame({ w, h, edge, glow, bright, hero, glassTop, glassBottom }: { w: number; h: number; edge: string; glow: string; bright: string; hero?: boolean; glassTop: string; glassBottom: string }) {
  const id = 'g' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const c = 14, k = 6;
  const poly = (o: number, cut: number) => [[cut + o, o], [w - cut - o, o], [w - o, cut + o], [w - o, h - cut - o], [w - cut - o, h - o], [cut + o, h - o], [o, h - cut - o], [o, cut + o]].map(p => p.join(',')).join(' ');
  const outer = poly(1, c), inner = poly(k, c - 3);
  const cx = w / 2;
  return (
    <Svg pointerEvents="none" width={w} height={h} style={{ position: 'absolute', left: 0, top: 0 }}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0.35" y2="1">
          <Stop offset="0" stopColor={glassTop} />
          <Stop offset="0.7" stopColor={glassBottom} />
        </LinearGradient>
      </Defs>
      <Polygon points={outer} fill={'url(#' + id + ')'} />
      {/* diagonal light streaks across the glass */}
      <Line x1={w * 0.62} y1={0} x2={w * 0.18} y2={h} stroke={bright} strokeOpacity={0.05} strokeWidth={1} />
      <Line x1={w * 0.95} y1={0} x2={w * 0.55} y2={h} stroke={bright} strokeOpacity={0.04} strokeWidth={0.6} />
      {hero ? <Polygon points={outer} fill="none" stroke={glow} strokeWidth={16} strokeOpacity={0.22} /> : null}
      <Polygon points={outer} fill="none" stroke={glow} strokeWidth={hero ? 7 : 5} strokeOpacity={0.5} />
      <Polygon points={outer} fill="none" stroke={edge} strokeWidth={1.2} />
      <Polygon points={inner} fill="none" stroke={edge} strokeOpacity={0.28} strokeWidth={0.8} />
      {/* bright accents on the four cut corners */}
      {[[1, c + 1, c + 1, 1], [w - c - 1, 1, w - 1, c + 1], [w - 1, h - c - 1, w - c - 1, h - 1], [c + 1, h - 1, 1, h - c - 1]].map(([x1, y1, x2, y2], n) => (
        <Line key={n} x1={x1} y1={y1} x2={x2} y2={y2} stroke={bright} strokeWidth={2.4} />
      ))}
      {hero ? <>
        {/* neon bars on both sides */}
        {[1.5, w - 1.5].map(x => (
          <Line key={x} x1={x} y1={h * 0.28} x2={x} y2={h * 0.72} stroke={glow} strokeWidth={18} strokeOpacity={0.5} />
        ))}
        {/* electric sparks along the neon bars */}
        {[0, 1].map(side => {
          const x = side ? w - 2 : 2, d = side ? -1 : 1;
          return [0.33, 0.47, 0.62].map((f, n) => {
            const y = h * f;
            return <Polyline key={side + '-' + n} points={`${x},${y} ${x + d * 7},${y + 5} ${x + d * 3},${y + 10} ${x + d * 11},${y + 17}`} fill="none" stroke={bright} strokeOpacity={0.7} strokeWidth={0.9} />;
          });
        })}
        {[1.5, w - 1.5].map(x => (
          <Line key={'b' + x} x1={x} y1={h * 0.3} x2={x} y2={h * 0.7} stroke={bright} strokeWidth={3} />
        ))}
        {/* crest at the top and a notch at the bottom */}
        <Polyline points={`${cx - 34},1 ${cx - 12},1 ${cx},9 ${cx + 12},1 ${cx + 34},1`} fill="none" stroke={bright} strokeWidth={2.4} />
        <Polygon points={`${cx - 4},1 ${cx},6 ${cx + 4},1`} fill={bright} />
        <Polyline points={`${cx - 22},${h - 1} ${cx - 8},${h - 1} ${cx},${h - 6} ${cx + 8},${h - 1} ${cx + 22},${h - 1}`} fill="none" stroke={bright} strokeWidth={2} />
      </> : null}
    </Svg>
  );
}

// A System window: dark glass in a cut-corner neon frame, with a header of an icon box and a title box
export function Win({ title, icon = '!', tone = 'normal', children, style, pad = 18, hero }: {
  title?: string; icon?: string; tone?: Tone; children?: ReactNode; style?: StyleProp<ViewStyle>; pad?: number; hero?: boolean;
}) {
  const t = useT();
  const edge = toneEdge(t, tone), glow = toneGlow(t, tone);
  const [size, setSize] = useState({ w: 0, h: 0 });
  return (
    <View onLayout={e => { const { width, height } = e.nativeEvent.layout; if (width !== size.w || height !== size.h) setSize({ w: width, h: height }); }}
      style={[{ padding: pad, paddingTop: pad + (hero ? 8 : 2), gap: 14 }, style]}>
      {size.w ? <Frame w={size.w} h={size.h} edge={edge} glow={glow} bright={tone === 'normal' ? t.bright : edge} hero={hero} glassTop={t.glassTop} glassBottom={t.glassBottom} /> : null}
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
// Not focusable on Android, where a focused button makes its ScrollView jump.
export function Btn({ label, onPress, primary, danger, gold, on, disabled, big, style, small }: {
  label: string; onPress?: () => void; primary?: boolean; danger?: boolean; gold?: boolean; on?: boolean; disabled?: boolean; big?: boolean; small?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const t = useT();
  const c = danger ? t.warn : gold ? t.gold : on ? t.good : primary ? t.edge : t.line;
  const glow = danger ? t.warnGlow : gold ? 'rgba(255, 200, 80, 0.35)' : primary || on ? t.glow : 'transparent';
  return (
    <Pressable
      onPress={onPress} disabled={disabled} focusable={Platform.OS === 'web'} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, selected: on }}
      style={({ pressed }) => [{ borderWidth: 1, borderColor: c, paddingVertical: big ? 15 : small ? 6 : 10, paddingHorizontal: small ? 10 : 16, alignItems: 'center', justifyContent: 'center',
        backgroundColor: pressed ? 'rgba(150, 215, 255, 0.18)' : on ? 'rgba(89, 232, 255, 0.1)' : primary ? 'rgba(10, 30, 60, 0.55)' : 'rgba(0, 0, 0, 0.55)',
        boxShadow: `0 0 12px ${glow}, inset 0 0 10px ${glow}`, opacity: disabled ? 0.35 : 1, minHeight: small ? 36 : 44 }, style]}
    >
      <Caps size={big ? 15 : small ? 11 : 13} color={danger ? t.warn : gold ? t.gold : on ? t.good : t.bright} glow={!!(primary || danger || gold || on)}>{label}</Caps>
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
      {/* the bottom rail sits on the tab bar, where these marks would read as a selected tab */}
      {!flip && <View style={{ position: 'absolute', bottom: -3, left: '30%', width: 40, height: 3, backgroundColor: t.bright, opacity: 0.7 }} />}
      {!flip && <View style={{ position: 'absolute', bottom: -3, right: '22%', width: 18, height: 3, backgroundColor: t.bright, opacity: 0.5 }} />}
    </View>
  );
}

// Black backdrop with faint circuit traces, diagonal streaks and blue light bleeding in from the edges
const CIRCUIT = (() => {
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const dirs = [[1, 0], [0, 1], [1, 1], [-1, 1], [0, -1], [1, -1]];
  return Array.from({ length: 46 }, () => {
    let x = Math.round(rnd() * 400), y = Math.round(rnd() * 860);
    const pts = [[x, y]];
    for (let s = 0; s < 3 + Math.floor(rnd() * 3); s++) {
      const [dx, dy] = dirs[Math.floor(rnd() * dirs.length)], len = 14 + rnd() * 50;
      x += dx * len; y += dy * len; pts.push([Math.round(x), Math.round(y)]);
    }
    return { pts: pts.map(p => p.join(',')).join(' '), end: pts[pts.length - 1], o: 0.06 + rnd() * 0.1 };
  });
})();
const VEINS = (() => {
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  return [[-4, 140, 1], [404, 520, -1], [-4, 700, 1], [404, 60, -1]].map(([x0, y0, dir]) => {
    const pts = [[x0, y0]]; let x = x0, y = y0;
    for (let i = 0; i < 9; i++) { x += dir * (4 + rnd() * 14); y += 8 + rnd() * 26; pts.push([Math.round(x), Math.round(y)]); x -= dir * rnd() * 10; }
    return pts.map(p => p.join(',')).join(' ');
  });
})();
export function Backdrop() {
  const t = useT();
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: t.bg }}>
      <Svg width="100%" height="100%" viewBox="0 0 400 860" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <RadialGradient id="bgL" cx="0" cy="0.25" r="0.75">
            <Stop offset="0" stopColor={t.rail} stopOpacity={0.32} />
            <Stop offset="1" stopColor={t.rail} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="bgR" cx="1" cy="0.72" r="0.7">
            <Stop offset="0" stopColor={t.rail} stopOpacity={0.26} />
            <Stop offset="1" stopColor={t.rail} stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id="bgT" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={t.bgTop} stopOpacity={1} />
            <Stop offset="0.35" stopColor={t.bg} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="400" height="860" fill="url(#bgT)" />
        <Rect x="0" y="0" width="400" height="860" fill="url(#bgL)" />
        <Rect x="0" y="0" width="400" height="860" fill="url(#bgR)" />
        {[40, 120, 210, 300, 390, 480].map((x, i) => (
          <Line key={i} x1={x} y1="0" x2={x - 260} y2="860" stroke={t.accent} strokeOpacity={0.05 + (i % 3) * 0.02} strokeWidth={0.6 + (i % 2) * 0.8} />
        ))}
        {CIRCUIT.map((c, i) => (
          <Polyline key={i} points={c.pts} fill="none" stroke={t.accent} strokeOpacity={c.o} strokeWidth={0.8} />
        ))}
        {CIRCUIT.map((c, i) => <Circle key={'n' + i} cx={c.end[0]} cy={c.end[1]} r={1.6} fill="none" stroke={t.accent} strokeOpacity={c.o * 1.6} strokeWidth={0.8} />)}
        {VEINS.map((v, i) => <Polyline key={'vg' + i} points={v} fill="none" stroke={t.rail} strokeOpacity={0.25} strokeWidth={5} />)}
        {VEINS.map((v, i) => <Polyline key={'v' + i} points={v} fill="none" stroke={t.good} strokeOpacity={0.55} strokeWidth={0.9} />)}
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

// "GOAL" with the double underline of the System's quest windows
export function GoalHeading() {
  const t = useT();
  return (
    <View style={{ alignItems: 'center', gap: 3, marginTop: 6 }}>
      <Caps size={17} color={t.bright} style={{ letterSpacing: 3 }}>Goal</Caps>
      <View style={{ width: 58, height: 1.5, backgroundColor: t.bright, boxShadow: `0 0 6px ${t.glow}` }} />
      <View style={{ width: 58, height: 1, backgroundColor: t.bright, opacity: 0.6, marginTop: 1 }} />
    </View>
  );
}
