// UI primitives portados de ui.jsx a React Native.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  PressableProps,
  RefreshControl,
  ScrollView,
  StyleProp,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alpha, colors, fonts, gradients, radius, shadows } from '../theme/tokens';
import { Icon, IconName } from './Icon';
import { GlobeSpinner } from './GlobeSpinner';
import { statusMeta } from '../domain';
import { useT } from '../store/AppContext';

// ── haptics ──────────────────────────────────────────────────
export function haptic(kind: 'light' | 'medium' | 'heavy' | 'success' | 'warn' | 'select' = 'light') {
  try {
    switch (kind) {
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warn':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'heavy':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'medium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'select':
        Haptics.selectionAsync();
        break;
      default:
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch {}
}

// ── Tap: pressable con escala (az-press) ─────────────────────
// El style va sobre el propio Pressable (animado) para que width/flex/
// aspectRatio funcionen correctamente, igual que el transform de escala.
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
export function Tap({
  children,
  onPress,
  style,
  hapticKind = 'light',
  disabled,
  scaleTo = 0.965,
  ...rest
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  hapticKind?: Parameters<typeof haptic>[0] | null;
  disabled?: boolean;
  scaleTo?: number;
} & Omit<PressableProps, 'style' | 'onPress'>) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={() => to(scaleTo)}
      onPressOut={() => to(1)}
      onPress={() => {
        if (disabled) return;
        if (hapticKind) haptic(hapticKind);
        onPress?.();
      }}
      style={[style, { transform: [{ scale }] }]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

// ── Texto con fuentes de marca ───────────────────────────────
export function AppText({
  children,
  style,
  serif = false,
  weight = '400',
  ...rest
}: {
  children?: React.ReactNode;
  style?: StyleProp<TextStyle>;
  serif?: boolean;
  weight?: '400' | '500' | '600' | '700' | '800';
} & React.ComponentProps<typeof Text>) {
  const family = serif
    ? weight === '700'
      ? fonts.serif
      : fonts.serif
    : weight === '800'
    ? fonts.sansExtra
    : weight === '700'
    ? fonts.sansBold
    : weight === '600'
    ? fonts.sansSemibold
    : weight === '500'
    ? fonts.sansMedium
    : fonts.sans;
  return (
    <Text style={[{ fontFamily: family, color: colors.ink }, style]} {...rest}>
      {children}
    </Text>
  );
}

// ── Glass card (BlurView) ────────────────────────────────────
export function Glass({
  children,
  style,
  tint = 'light',
  intensity = 36,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tint?: 'light' | 'dark' | 'default';
  intensity?: number;
}) {
  return (
    <BlurView intensity={intensity} tint={tint} style={[{ overflow: 'hidden', borderRadius: radius.lg }, style]}>
      {children}
    </BlurView>
  );
}

// ── EnterUp: entrada escalonada (azUp) para items de lista ───
export function EnterUp({ index = 0, children, style }: { index?: number; children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, {
      toValue: 1,
      duration: 420,
      delay: Math.min(index, 8) * 45,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [a, index]);
  return (
    <Animated.View style={[{ opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }, style]}>
      {children}
    </Animated.View>
  );
}

// ── Screen: superficie con safe-area ─────────────────────────
export function Screen({
  children,
  bg = colors.bg,
  scroll = true,
  padTop = true,
  padBottom = 0,
  contentStyle,
  style,
  scrollRef,
  fadeBottom = false,
  fadeTop = false,
  onScroll,
  refreshing,
  onRefresh,
}: {
  children?: React.ReactNode;
  bg?: string;
  scroll?: boolean;
  padTop?: boolean;
  padBottom?: number;
  contentStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  scrollRef?: React.Ref<ScrollView>;
  fadeBottom?: boolean;
  fadeTop?: boolean;
  onScroll?: React.ComponentProps<typeof ScrollView>['onScroll'];
  /** Habilita "deslizar para actualizar" (sincroniza con la BD). */
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const insets = useSafeAreaInsets();
  // scrollY para animar el spinner de "halar para actualizar" con el overscroll.
  const scrollY = useRef(new Animated.Value(0)).current;
  const handleScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: false,
        listener: onScroll as any,
      }),
    [scrollY, onScroll],
  );
  const pad: ViewStyle = {
    paddingTop: padTop ? insets.top : 0,
    paddingBottom: (insets.bottom || 0) + padBottom,
  };
  if (!scroll) {
    return <View style={[{ flex: 1, backgroundColor: bg }, pad, style]}>{children}</View>;
  }
  const sv = (
    <ScrollView
      ref={scrollRef}
      style={[{ flex: 1, backgroundColor: bg }, style]}
      contentContainerStyle={[pad, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      onScroll={onRefresh ? handleScroll : onScroll}
      scrollEventThrottle={16}
      refreshControl={
        onRefresh
          ? (
            // RefreshControl nativo TRANSPARENTE: aporta la mecánica (disparo +
            // el hueco al refrescar), pero el indicador visible es el globo de
            // Azahares en navy que dibujamos encima.
            <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor="transparent" colors={['transparent']} />
          )
          : undefined
      }
    >
      {children}
    </ScrollView>
  );
  // Overlay del spinner navy: aparece al halar (según el overscroll) y queda
  // fijo mientras `refreshing` está activo.
  const refreshOverlay = onRefresh ? (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: (padTop ? insets.top : 0) + 2,
        left: 0,
        right: 0,
        alignItems: 'center',
        opacity: refreshing
          ? 1
          : scrollY.interpolate({ inputRange: [-70, -18, 0], outputRange: [1, 0, 0], extrapolate: 'clamp' }),
        transform: [
          {
            translateY: refreshing
              ? 10
              : scrollY.interpolate({ inputRange: [-70, 0], outputRange: [10, -6], extrapolate: 'clamp' }),
          },
        ],
      }}
    >
      <GlobeSpinner size={40} showHalo={false} tint={colors.navy700} />
    </Animated.View>
  ) : null;
  if (!fadeBottom && !fadeTop && !onRefresh) return sv;
  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {sv}
      {refreshOverlay}
      {fadeTop && (
        <LinearGradient
          pointerEvents="none"
          colors={[bg, alpha(bg, 0)]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: (padTop ? insets.top : 0) + 14 }}
        />
      )}
      {fadeBottom && (
        <LinearGradient
          pointerEvents="none"
          colors={[alpha(bg, 0), bg]}
          locations={[0, 0.65]}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: (insets.bottom || 0) + 116 }}
        />
      )}
    </View>
  );
}

// ── Header ───────────────────────────────────────────────────
export function Header({
  title,
  subtitle,
  onBack,
  right,
  dark = false,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  dark?: boolean;
}) {
  const ink = dark ? colors.white : colors.ink;
  const sub = dark ? 'rgba(255,255,255,0.6)' : colors.ink50;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12 }}>
      {onBack && (
        <Tap
          onPress={onBack}
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            backgroundColor: dark ? 'rgba(255,255,255,0.14)' : colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
            ...(dark ? {} : shadows.sm),
          }}
        >
          <Icon name="chevL" size={22} color={ink} />
        </Tap>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText serif weight="600" style={{ fontSize: 24, color: ink, letterSpacing: -0.2, lineHeight: 27 }}>
          {title}
        </AppText>
        {subtitle ? <AppText style={{ fontSize: 13, color: sub, marginTop: 2 }}>{subtitle}</AppText> : null}
      </View>
      {right}
    </View>
  );
}

// ── Button ───────────────────────────────────────────────────
// true si los hijos son texto (string/number) o un array de solo texto —
// en cuyo caso hay que envolverlos en <Text> (React entrega "Hola {x}" como array).
function isTextLike(children: React.ReactNode): boolean {
  if (typeof children === 'string' || typeof children === 'number') return true;
  if (Array.isArray(children)) return children.every((c) => c == null || c === false || typeof c === 'string' || typeof c === 'number');
  return false;
}
type ButtonVariant = 'primary' | 'accent' | 'success' | 'soft' | 'ghost' | 'outline' | 'danger';
export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  iconRight,
  disabled,
  loading,
  full = true,
  style,
}: {
  children?: React.ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: 'lg' | 'md' | 'sm';
  icon?: IconName;
  iconRight?: IconName;
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const height = size === 'lg' ? 54 : size === 'sm' ? 38 : 46;
  const fontSize = size === 'sm' ? 14 : 16;
  const isGrad = variant === 'primary';
  const skin: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: 'transparent', fg: colors.white },
    accent: { bg: colors.accent, fg: colors.white },
    success: { bg: colors.success, fg: colors.white },
    soft: { bg: alpha(colors.navy500, 0.12), fg: colors.navy700 },
    ghost: { bg: 'transparent', fg: colors.ink60 },
    outline: { bg: colors.surface, fg: colors.ink, border: colors.line },
    danger: { bg: alpha(colors.error, 0.12), fg: colors.error },
  };
  const s = skin[variant];
  const inner = (
    <View
      style={{
        height,
        borderRadius: radius.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 9,
        paddingHorizontal: size === 'sm' ? 14 : 20,
        backgroundColor: isGrad ? 'transparent' : s.bg,
        borderWidth: s.border ? 1.5 : 0,
        borderColor: s.border,
      }}
    >
      {loading ? (
        <ActivityIndicator color={s.fg} />
      ) : (
        <>
          {icon && <Icon name={icon} size={size === 'sm' ? 17 : 20} color={s.fg} />}
          {isTextLike(children) ? (
            <AppText weight="600" style={{ color: s.fg, fontSize, letterSpacing: 0.2 }}>
              {children}
            </AppText>
          ) : (
            children
          )}
          {iconRight && <Icon name={iconRight} size={size === 'sm' ? 17 : 20} color={s.fg} />}
        </>
      )}
    </View>
  );
  return (
    <Tap
      onPress={onPress}
      disabled={disabled || loading}
      hapticKind="medium"
      style={[
        { width: full ? '100%' : undefined, opacity: disabled ? 0.45 : 1, borderRadius: radius.md, overflow: 'hidden' },
        variant === 'primary' ? shadows.sm : null,
        style,
      ]}
    >
      {isGrad ? (
        <LinearGradient colors={gradients.navy} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          {inner}
        </LinearGradient>
      ) : (
        inner
      )}
    </Tap>
  );
}

export function IconButton({
  name,
  onPress,
  size = 40,
  iconSize = 20,
  variant = 'surface',
  color,
  style,
}: {
  name: IconName;
  onPress?: () => void;
  size?: number;
  iconSize?: number;
  variant?: 'surface' | 'soft' | 'plain' | 'glassDark';
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const skins: Record<string, { bg: string; fg: string; shadow?: boolean }> = {
    surface: { bg: colors.surface, fg: color || colors.ink70, shadow: true },
    soft: { bg: alpha(colors.navy500, 0.12), fg: color || colors.navy700 },
    plain: { bg: 'transparent', fg: color || colors.ink60 },
    glassDark: { bg: 'rgba(255,255,255,0.14)', fg: color || colors.white },
  };
  const s = skins[variant];
  return (
    <Tap
      onPress={onPress}
      style={[
        { width: size, height: size, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: s.bg },
        s.shadow ? shadows.sm : null,
        style,
      ]}
    >
      <Icon name={name} size={iconSize} color={s.fg} />
    </Tap>
  );
}

// ── Card ─────────────────────────────────────────────────────
export function Card({
  children,
  onPress,
  pad = 16,
  style,
}: {
  children?: React.ReactNode;
  onPress?: () => void;
  pad?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const content = (
    <View style={[{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: pad }, shadows.card, style]}>
      {children}
    </View>
  );
  if (onPress) {
    return (
      <Tap onPress={onPress} style={{ borderRadius: radius.lg }}>
        {content}
      </Tap>
    );
  }
  return content;
}

// ── StatusBadge ──────────────────────────────────────────────
export function StatusBadge({ status, size = 'md' }: { status: string; size?: 'sm' | 'md' }) {
  const t = useT();
  const meta = statusMeta(status);
  const sm = size === 'sm';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: sm ? 22 : 26,
        paddingHorizontal: sm ? 8 : 10,
        borderRadius: 999,
        backgroundColor: alpha(meta.color.startsWith('#') ? meta.color : '#3b5bbf', 0.14),
      }}
    >
      <View style={{ width: sm ? 5 : 6, height: sm ? 5 : 6, borderRadius: 999, backgroundColor: meta.color }} />
      <AppText weight="600" style={{ fontSize: sm ? 11.5 : 12.5, color: meta.color }}>
        {t.status(status)}
      </AppText>
    </View>
  );
}

// ── Chip ─────────────────────────────────────────────────────
export function Chip({
  label,
  active,
  onPress,
  color = colors.navy700,
  count,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  color?: string;
  count?: number;
}) {
  return (
    <Tap
      onPress={onPress}
      hapticKind="select"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 34,
        paddingHorizontal: 13,
        borderRadius: 999,
        backgroundColor: active ? color : colors.surface,
        borderWidth: active ? 0 : 1,
        borderColor: colors.line,
      }}
    >
      <AppText weight="600" style={{ fontSize: 13.5, color: active ? colors.white : colors.ink60 }}>
        {label}
      </AppText>
      {count != null && (
        <AppText weight="700" style={{ fontSize: 11.5, color: active ? 'rgba(255,255,255,0.85)' : colors.ink40 }}>
          {count}
        </AppText>
      )}
    </Tap>
  );
}

// ── Progress (animado) ───────────────────────────────────────
export function Progress({
  value,
  color = colors.accent,
  height = 8,
  track = colors.line,
}: {
  value: number; // 0..100
  color?: string;
  height?: number;
  track?: string;
}) {
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(w, { toValue: Math.max(0, Math.min(100, value)), duration: 600, useNativeDriver: false }).start();
  }, [value, w]);
  return (
    <View style={{ width: '100%', height, backgroundColor: track, borderRadius: 999, overflow: 'hidden' }}>
      <Animated.View
        style={{
          height: '100%',
          borderRadius: 999,
          backgroundColor: color,
          width: w.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
        }}
      />
    </View>
  );
}

// ── Ring gauge ───────────────────────────────────────────────
export function Ring({
  value,
  size = 64,
  stroke = 7,
  color = colors.accent,
  track = colors.line,
  children,
}: {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(1, value)));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>{children}</View>
    </View>
  );
}

// ── CheckMark ────────────────────────────────────────────────
export function CheckMark({ size = 22, color = colors.white, stroke = 2.6 }: { size?: number; color?: string; stroke?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12.5 10 17.5 19 7" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── Sheet (bottom modal) ─────────────────────────────────────
export function Sheet({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  title?: string;
}) {
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) {
      setMounted(true);
      Animated.spring(slide, { toValue: 1, useNativeDriver: true, bounciness: 4, speed: 14 }).start();
    } else {
      Animated.timing(slide, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setMounted(false));
    }
  }, [open, slide]);
  if (!mounted) return null;
  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [600, 0] });
  return (
    <Modal transparent visible={mounted} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable onPress={onClose} style={{ position: 'absolute', inset: 0 as any, backgroundColor: 'rgba(8,14,33,0.5)' }} />
        <Animated.View
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            maxHeight: '86%',
            paddingBottom: (insets.bottom || 0) + 8,
            transform: [{ translateY }],
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 2 }}>
            <View style={{ width: 40, height: 5, borderRadius: 999, backgroundColor: colors.line }} />
          </View>
          {title ? (
            <AppText serif weight="600" style={{ fontSize: 20, color: colors.ink, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 4 }}>
              {title}
            </AppText>
          ) : null}
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: 8 }}>
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Toast (lee store) ────────────────────────────────────────
export function ToastHost({ toast }: { toast: { msg: string; tone?: string } | null }) {
  const insets = useSafeAreaInsets();
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(op, { toValue: toast ? 1 : 0, duration: 240, useNativeDriver: true }).start();
  }, [toast, op]);
  if (!toast) return null;
  const tone = toast.tone || 'success';
  const col = ({ success: colors.success, warn: colors.amber, error: colors.error, info: colors.accent } as any)[tone];
  const ic: IconName = tone === 'success' ? 'check' : tone === 'warn' ? 'alert' : 'info';
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', left: 0, right: 0, bottom: (insets.bottom || 0) + 96, alignItems: 'center', opacity: op }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 16,
          paddingVertical: 11,
          borderRadius: 999,
          backgroundColor: 'rgba(13,27,61,0.95)',
          maxWidth: '84%',
        }}
      >
        <View style={{ width: 22, height: 22, borderRadius: 999, backgroundColor: col, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={ic} size={14} color={colors.white} />
        </View>
        <AppText weight="500" style={{ fontSize: 14, color: colors.white }}>
          {toast.msg}
        </AppText>
      </View>
    </Animated.View>
  );
}

// ── Avatar ───────────────────────────────────────────────────
export function Avatar({ name, src, size = 44, ring }: { name?: string | null; src?: string | null; size?: number; ring?: boolean }) {
  const initials = (name || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  if (src) {
    return (
      <View style={{ width: size, height: size, borderRadius: 999, overflow: 'hidden', ...shadows.sm }}>
        {/* eslint-disable-next-line @typescript-eslint/no-var-requires */}
        <Animated.Image source={{ uri: src }} style={{ width: size, height: size }} />
      </View>
    );
  }
  return (
    <View style={{ borderRadius: 999, ...(ring ? {} : shadows.sm) }}>
      <LinearGradient
        colors={gradients.navy}
        style={{ width: size, height: size, borderRadius: 999, alignItems: 'center', justifyContent: 'center' }}
      >
        <AppText weight="700" style={{ color: colors.white, fontSize: size * 0.36 }}>
          {initials}
        </AppText>
      </LinearGradient>
    </View>
  );
}

// ── Field (input con label) ──────────────────────────────────
export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  icon,
  right,
  hint,
  keyboardType,
  autoFocus,
  autoCapitalize = 'none',
  invalid,
  onFocus,
  onBlur,
}: {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  icon?: IconName;
  right?: React.ReactNode;
  hint?: string;
  keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType'];
  autoFocus?: boolean;
  autoCapitalize?: React.ComponentProps<typeof TextInput>['autoCapitalize'];
  invalid?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const border = invalid ? colors.error : focused ? colors.accent : colors.line;
  return (
    <View>
      {label ? (
        <AppText weight="600" style={{ fontSize: 13, color: colors.ink60, marginBottom: 7, marginLeft: 2 }}>
          {label}
        </AppText>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          height: 52,
          borderRadius: radius.md,
          borderWidth: 1.5,
          borderColor: border,
          backgroundColor: colors.surface,
          paddingHorizontal: 16,
        }}
      >
        {icon && <Icon name={icon} size={19} color={focused ? colors.accent : colors.ink40} />}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.ink40}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoFocus={autoFocus}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          onFocus={() => {
            setFocused(true);
            onFocus?.();
          }}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          style={{ flex: 1, fontFamily: fonts.sans, fontSize: 16, color: colors.ink, marginLeft: icon ? 10 : 0 }}
        />
        {right}
      </View>
      {hint ? <AppText style={{ fontSize: 12, color: colors.ink40, marginTop: 6, marginLeft: 2 }}>{hint}</AppText> : null}
    </View>
  );
}

// ── Segmented ────────────────────────────────────────────────
export function Segmented({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[] | string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  return (
    <View style={{ flexDirection: 'row', padding: 4, borderRadius: radius.md, backgroundColor: alpha(colors.ink, 0.06) }}>
      {opts.map((o) => {
        const on = o.value === value;
        return (
          <Tap
            key={o.value}
            hapticKind="select"
            onPress={() => onChange(o.value)}
            style={{
              flex: 1,
              height: 40,
              borderRadius: radius.md - 4,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: on ? colors.surface : 'transparent',
              ...(on ? shadows.sm : {}),
            }}
          >
            <AppText weight="600" style={{ fontSize: 14, color: on ? colors.ink : colors.ink50 }}>
              {o.label}
            </AppText>
          </Tap>
        );
      })}
    </View>
  );
}

// ── Slider (barra deslizable simple) ─────────────────────────
export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  color = colors.navy700,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  color?: string;
}) {
  const [w, setW] = useState(1);
  const wRef = useRef(1);
  wRef.current = w;
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const fromX = (x: number) => {
    const ratio = Math.min(1, Math.max(0, x / wRef.current));
    const raw = min + ratio * (max - min);
    return clamp(Math.round(raw / step) * step);
  };
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => onChange(fromX(e.nativeEvent.locationX)),
      onPanResponderMove: (e) => onChange(fromX(e.nativeEvent.locationX)),
    }),
  ).current;
  const pct = ((clamp(value) - min) / (max - min)) * 100;
  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      {...pan.panHandlers}
      style={{ height: 30, justifyContent: 'center' }}
    >
      <View style={{ height: 5, borderRadius: 999, backgroundColor: colors.line }}>
        <View style={{ height: 5, borderRadius: 999, width: `${pct}%`, backgroundColor: color }} />
      </View>
      <View style={{ position: 'absolute', left: `${pct}%`, marginLeft: -11, width: 22, height: 22, borderRadius: 999, backgroundColor: colors.surface, ...shadows.sm, borderWidth: 2, borderColor: color }} />
    </View>
  );
}

// ── Skeleton ─────────────────────────────────────────────────
export function Skeleton({ h = 16, w = '100%', r = 10, style }: { h?: number; w?: number | string; r?: number; style?: StyleProp<ViewStyle> }) {
  const op = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [op]);
  return <Animated.View style={[{ height: h, width: w as any, borderRadius: r, backgroundColor: colors.line, opacity: op }, style]} />;
}
