import { createContext, useContext, ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet, TextProps, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { BLUE, F, Theme } from './theme';

export const ThemeCtx = createContext<Theme>(BLUE);
export const useT = () => useContext(ThemeCtx);

type Tone = 'normal' | 'penalty' | 'secret';
const toneColor = (t: Theme, tone: Tone) => tone === 'penalty' ? t.warn : tone === 'secret' ? t.secret : t.edge;
const toneGlow = (t: Theme, tone: Tone) => tone === 'penalty' ? t.warnGlow : tone === 'secret' ? t.secretGlow : t.glow;

// Hebrew body text, right aligned, with the System's soft glow
export function T({ style, glow, muted, ...p }: TextProps & { glow?: boolean; muted?: boolean }) {
  const t = useT();
  return (
    <Text
      {...p}
      style={[
        { color: muted ? t.muted : t.fg, fontFamily: F.body, fontSize: 16, lineHeight: 24, textAlign: 'right', writingDirection: 'rtl' },
        glow && { textShadowColor: t.textGlow, textShadowRadius: 8, textShadowOffset: { width: 0, height: 0 } },
        style,
      ]}
    />
  );
}

// Spaced uppercase heading, as in the System's "NOTIFICATION" box
export function Head({ children, tone = 'normal', size = 18 }: { children: ReactNode; tone?: Tone; size?: number }) {
  const t = useT();
  const c = tone === 'normal' ? t.fg : toneColor(t, tone);
  return (
    <Text style={{ fontFamily: F.head, fontSize: size, letterSpacing: size * 0.22, color: c, textAlign: 'center',
      textShadowColor: tone === 'normal' ? t.textGlow : toneGlow(t, tone), textShadowRadius: 12, textShadowOffset: { width: 0, height: 0 } }}>
      {children}
    </Text>
  );
}

// A System window: dark glass, thin glowing edge, header made of an icon box and a title box
export function Win({ title, icon = '!', tone = 'normal', children, style }: { title?: string; icon?: string; tone?: Tone; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useT();
  const edge = toneColor(t, tone), glow = toneGlow(t, tone);
  return (
    <View style={[{ backgroundColor: t.panel, borderWidth: 1, borderColor: edge, padding: 16, gap: 12,
      boxShadow: `0 0 16px ${glow}, inset 0 0 28px ${glow}` }, style]}>
      {title ? (
        <View style={{ flexDirection: 'row', gap: 8, alignSelf: 'center', alignItems: 'stretch' }}>
          <View style={[s.box, { borderColor: edge, width: 40, boxShadow: `0 0 8px ${glow}` }]}>
            <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: edge, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: edge, fontFamily: F.headBold, fontSize: 13, lineHeight: 16 }}>{icon}</Text>
            </View>
          </View>
          <View style={[s.box, { borderColor: edge, paddingHorizontal: 16, boxShadow: `0 0 8px ${glow}` }]}>
            <Head tone={tone} size={15}>{title}</Head>
          </View>
        </View>
      ) : null}
      {children}
    </View>
  );
}

// Outlined rectangle button. "primary" glows brighter; "danger" is red.
export function Btn({ label, onPress, primary, danger, on, disabled, big, style, textStyle }: {
  label: string; onPress?: () => void; primary?: boolean; danger?: boolean; on?: boolean; disabled?: boolean; big?: boolean;
  style?: StyleProp<ViewStyle>; textStyle?: StyleProp<TextStyle>;
}) {
  const t = useT();
  const c = danger ? t.warn : on ? t.good : primary ? t.edge : t.line;
  const glow = danger ? t.warnGlow : primary ? t.glow : 'transparent';
  return (
    <Pressable
      onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled, selected: on }}
      style={({ pressed }) => [{ borderWidth: 1, borderColor: c, paddingVertical: big ? 14 : 9, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center',
        backgroundColor: on ? t.goodSoft : pressed ? 'rgba(150, 220, 255, 0.12)' : 'rgba(0, 0, 0, 0.25)',
        boxShadow: `0 0 10px ${glow}`, opacity: disabled ? 0.4 : 1, minHeight: 44 }, style]}
    >
      <Text style={[{ color: danger ? t.warn : on ? t.good : t.fg, fontFamily: F.bold, fontSize: big ? 18 : 15, textAlign: 'center',
        textShadowColor: primary || danger ? glow : 'transparent', textShadowRadius: 8, textShadowOffset: { width: 0, height: 0 } }, textStyle]}>
        {label}
      </Text>
    </Pressable>
  );
}

// The glowing blue rails that frame the System's windows, top and bottom of the screen
export function Rail() {
  const t = useT();
  return (
    <View style={{ height: 6, marginHorizontal: -16, backgroundColor: t.rail, boxShadow: `0 0 18px 4px ${t.railGlow}` }}>
      <View style={{ position: 'absolute', top: 2, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.7)' }} />
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, style]}>{children}</View>;
}

export function Chip({ label, value }: { label: string; value: string | number }) {
  const t = useT();
  return (
    <View style={{ borderWidth: 1, borderColor: t.line, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row-reverse', gap: 4 }}>
      <Text style={{ color: t.muted, fontFamily: F.body, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: t.fg, fontFamily: F.bold, fontSize: 13 }}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  box: { borderWidth: 1, alignItems: 'center', justifyContent: 'center', minHeight: 40, backgroundColor: 'rgba(0, 0, 0, 0.3)' },
});
