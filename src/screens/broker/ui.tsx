// Primitivas compartidas del rol Broker: Hero navy, badges de estado,
// Pipeline (stepper de 4 fases), saludo/fecha en español y count-up.
// Portado de app/broker-ui.jsx.
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, RadialGradient as SvgRadial, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alpha, colors, gradients } from '../../theme/tokens';
import { Icon } from '../../components/Icon';
import { AppText, CheckMark } from '../../components/ui';
import {
  BK_CLIENT_STATUS, BK_ORDER_STATUS, BK_USER_STATUS, orderIdx,
  type BkClientStatusKey, type BkUserStatusKey,
} from '../../store/BrokerStore';
import type { SalesOrderStatus } from '../../lib/api/broker';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export function fechaES(d = new Date()) { return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`; }
export function saludoES(d = new Date()) { const h = d.getHours(); return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'; }

// ── count-up animado ───────────────────────────────────────────
export function useCountUp(target: number, run: boolean, dur = 1300) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf = 0; let start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / dur);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, dur]);
  return v;
}

// ── entrada slide-up escalonada (azUp) ─────────────────────────
export function FadeUp({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: any }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 450, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [a, delay]);
  return (
    <Animated.View style={[{ opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }, style]}>
      {children}
    </Animated.View>
  );
}

// ── Hero navy con glow radial ──────────────────────────────────
export function Hero({
  children,
  padH = 16,
  padBottom = 20,
  padTopExtra = 8,
  round = true,
}: {
  children: React.ReactNode;
  padH?: number;
  padBottom?: number;
  padTopExtra?: number;
  round?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ borderBottomLeftRadius: round ? 26 : 0, borderBottomRightRadius: round ? 26 : 0, overflow: 'hidden' }}>
      <LinearGradient colors={gradients.navyDeep} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        {/* glow radial superior derecho */}
        <Svg width={240} height={240} style={{ position: 'absolute', top: -130, right: -70 }}>
          <Defs>
            <SvgRadial id="heroGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={colors.accent} stopOpacity={0.42} />
              <Stop offset="0.7" stopColor={colors.accent} stopOpacity={0} />
            </SvgRadial>
          </Defs>
          <Circle cx={120} cy={120} r={120} fill="url(#heroGlow)" />
        </Svg>
        <View style={{ paddingTop: insets.top + padTopExtra, paddingHorizontal: padH, paddingBottom: padBottom }}>
          {children}
        </View>
      </LinearGradient>
    </View>
  );
}

// ── badges de estado ───────────────────────────────────────────
function Badge({ color, label, size = 'md' }: { color: string; label: string; size?: 'sm' | 'md' }) {
  const sm = size === 'sm';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: sm ? 22 : 26, paddingHorizontal: sm ? 8 : 10, borderRadius: 999, backgroundColor: alpha(color.startsWith('#') ? color : '#3b5bbf', 0.14), alignSelf: 'flex-start' }}>
      <View style={{ width: sm ? 5 : 6, height: sm ? 5 : 6, borderRadius: 999, backgroundColor: color }} />
      <AppText weight="600" style={{ fontSize: sm ? 11.5 : 12.5, color }}>{label}</AppText>
    </View>
  );
}
export function ClientBadge({ status, size }: { status: BkClientStatusKey; size?: 'sm' | 'md' }) {
  const m = BK_CLIENT_STATUS[status]; return <Badge color={m.color} label={m.label} size={size} />;
}
export function OrderBadge({ status, size }: { status: SalesOrderStatus; size?: 'sm' | 'md' }) {
  const m = BK_ORDER_STATUS[status]; return <Badge color={m.color} label={m.label} size={size} />;
}
export function UserBadge({ status, size }: { status: BkUserStatusKey; size?: 'sm' | 'md' }) {
  const m = BK_USER_STATUS[status]; return <Badge color={m.color} label={m.label} size={size} />;
}

// ── Pipeline (4 fases macro) ───────────────────────────────────
const PHASES = [
  { key: 'Cotización', icon: 'send', end: 2 },
  { key: 'Oferta', icon: 'fileText', end: 4 },
  { key: 'Pago', icon: 'receipt', end: 7 },
  { key: 'Logística', icon: 'ship', end: 10 },
] as const;

export function Pipeline({ state }: { state: SalesOrderStatus }) {
  const idx = Math.max(0, orderIdx(state));
  const curPhase = PHASES.findIndex((p) => idx <= p.end);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 }}>
      {PHASES.map((p, i) => {
        const done = i < curPhase; const cur = i === curPhase;
        return (
          <React.Fragment key={p.key}>
            <View style={{ alignItems: 'center', width: 56 }}>
              <View style={{
                width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                backgroundColor: done ? 'rgba(255,255,255,0.92)' : cur ? '#fff' : 'rgba(255,255,255,0.12)',
                ...(cur ? { shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 9, shadowOffset: { width: 0, height: 8 } } : {}),
              }}>
                {cur && <View style={{ position: 'absolute', width: 48, height: 48, borderRadius: 16, borderWidth: 5, borderColor: 'rgba(255,255,255,0.18)' }} />}
                {done ? <Icon name="check" size={19} color={colors.navy700} strokeWidth={2.6} /> : <Icon name={p.icon as any} size={19} color={done || cur ? colors.navy700 : 'rgba(255,255,255,0.6)'} />}
              </View>
              <AppText weight={cur ? '700' : '600'} style={{ fontSize: 10.5, marginTop: 7, color: cur ? '#fff' : 'rgba(255,255,255,0.55)' }}>{p.key}</AppText>
            </View>
            {i < PHASES.length - 1 && (
              <View style={{ flex: 1, height: 3, borderRadius: 999, marginTop: 17.5, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden' }}>
                <View style={{ height: '100%', borderRadius: 999, backgroundColor: '#fff', width: i < curPhase ? '100%' : '0%' }} />
              </View>
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ── HeroStat (cuadritos translúcidos del hero) ─────────────────
export function HeroStat({ value, label, tone }: { value: number | string; label: string; tone?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.09)', borderRadius: 14, padding: 12 }}>
      <AppText serif weight="600" style={{ fontSize: 23, color: tone || '#fff', lineHeight: 26 }}>{value}</AppText>
      <AppText weight="600" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11.5, marginTop: 4 }}>{label}</AppText>
    </View>
  );
}

// ── overlay con animación in/out (azFade up) ───────────────────
export function FadeOverlay({ children }: { children: React.ReactNode }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [a]);
  return (
    <Animated.View style={{ flex: 1, opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>
      {children}
    </Animated.View>
  );
}

// ── navegación del shell broker ────────────────────────────────
export type BkTab = 'home' | 'orders' | 'clients' | 'users' | 'wallet' | 'profile';
export type BkOverlay =
  | { type: 'newClient' }
  | { type: 'client'; id: string }
  | { type: 'order'; id: string }
  | { type: 'newOrder'; clientId?: string }
  | { type: 'newUser' }
  | { type: 'notifs' }
  | { type: 'catalog' }
  | null;

export interface BrokerNav {
  tab: BkTab; setTab: (t: BkTab) => void;
  overlay: BkOverlay; openOverlay: (o: NonNullable<BkOverlay>) => void; closeOverlay: () => void;
}
const NavCtx = createContext<BrokerNav | null>(null);
export const BrokerNavProvider = NavCtx.Provider;
export function useBkNav(): BrokerNav {
  const v = useContext(NavCtx);
  if (!v) throw new Error('useBkNav must be used within BrokerNavProvider');
  return v;
}

// ── encabezado de wizard (header navy con barra de progreso) ──
import { IconButton } from '../../components/ui';
export function WizardHeader({
  title, steps, step, onClose, subtitle, dots = false,
}: {
  title: string; steps: string[]; step: number; onClose: () => void; subtitle?: string; dots?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const pct = ((step + 1) / steps.length) * 100;
  return (
    <View style={{ borderBottomLeftRadius: 26, borderBottomRightRadius: 26, overflow: 'hidden' }}>
      <LinearGradient colors={gradients.navyDeep} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Svg width={220} height={220} style={{ position: 'absolute', top: -110, right: -50 }}>
          <Defs>
            <SvgRadial id="wizGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={colors.accent} stopOpacity={0.4} />
              <Stop offset="0.7" stopColor={colors.accent} stopOpacity={0} />
            </SvgRadial>
          </Defs>
          <Circle cx={110} cy={110} r={110} fill="url(#wizGlow)" />
        </Svg>
        <View style={{ paddingTop: insets.top + 2, paddingHorizontal: 16, paddingBottom: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <View style={{ width: 40 }} />
            <AppText serif weight="600" style={{ fontSize: 20, color: '#fff', textAlign: 'center', flex: 1 }}>{title}</AppText>
            <IconButton name="x" variant="glassDark" onPress={onClose} />
          </View>
          <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText weight="700" style={{ color: '#fff', fontSize: 15 }}>{steps[step]}</AppText>
            <AppText weight="600" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12.5 }}>Paso {step + 1} de {steps.length}</AppText>
          </View>
          <View style={{ height: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.16)', overflow: 'hidden', marginTop: 10 }}>
            <View style={{ height: '100%', borderRadius: 999, width: `${pct}%`, backgroundColor: colors.accent }} />
          </View>
          {dots && (
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
              {steps.map((_, i) => (
                <View key={i} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', opacity: i <= step ? 1 : 0.45 }}>
                  <View style={{ width: 18, height: 18, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: i < step ? 'rgba(255,255,255,0.92)' : i === step ? '#fff' : 'rgba(255,255,255,0.2)' }}>
                    {i < step ? <Icon name="check" size={11} color={colors.navy700} strokeWidth={3} /> : <AppText weight="800" style={{ fontSize: 10, color: colors.navy700 }}>{i + 1}</AppText>}
                  </View>
                </View>
              ))}
            </View>
          )}
          {subtitle ? <AppText style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12.5, marginTop: 12, lineHeight: 17 }}>{subtitle}</AppText> : null}
        </View>
      </LinearGradient>
    </View>
  );
}

// ── selector de código de país (dropdown compacto) ────────────
import { Modal, Pressable } from 'react-native';
import { radius, shadows } from '../../theme/tokens';
const COUNTRY_CODES = ['+53', '+1', '+52', '+34'];
export function CountryCode({ value, onChange, width = 92 }: { value: string; onChange: (v: string) => void; width?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={{ width, height: 52, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 }}>
        <AppText weight="600" style={{ fontSize: 15, color: colors.ink }}>{value}</AppText>
        <Icon name="chevD" size={14} color={colors.ink40} />
      </Pressable>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(8,14,33,0.4)' }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: 6, minWidth: 160, ...shadows.card }}>
            {COUNTRY_CODES.map((c) => (
              <Pressable key={c} onPress={() => { onChange(c); setOpen(false); }} style={{ paddingVertical: 13, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <AppText weight={c === value ? '700' : '500'} style={{ fontSize: 16, color: c === value ? colors.navy700 : colors.ink }}>{c}</AppText>
                {c === value && <CheckMark size={18} color={colors.navy700} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

export { CheckMark };
