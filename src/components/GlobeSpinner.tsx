// Globo girando con anillo cometa — mismo lenguaje visual que el splash.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg';
import { alpha, colors } from '../theme/tokens';
import { GLOBE } from './AuthBackdrop';

export function GlobeSpinner({
  size = 168,
  showHalo = true,
  tint,
}: {
  size?: number;
  showHalo?: boolean;
  /** Color base (globo + cometa). Por defecto blanco (para fondos oscuros).
   *  Pasar un navy para usarlo sobre fondos claros (p. ej. pull-to-refresh). */
  tint?: string;
}) {
  const base = tint ?? '#ffffff';
  const cometFrom = tint ?? colors.accent;
  const haloColor = tint ?? colors.accent;
  const ringColor = tint ? alpha(tint, 0.18) : 'rgba(255,255,255,0.12)';
  const globe = Math.round(size * 0.64);
  const ring = Math.round(size * 0.94);
  const spin = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1500, easing: Easing.bezier(0.5, 0.15, 0.5, 0.85), useNativeDriver: true }),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(halo, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(halo, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();
  }, [spin, breathe, halo]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const scale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });
  const haloScale = halo.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] });
  const haloOpacity = halo.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.8] });

  const r = (ring - 6) / 2;
  const circ = 2 * Math.PI * r;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* halo */}
      {showHalo && (
        <Animated.View
          style={{
            position: 'absolute',
            width: size * 0.78,
            height: size * 0.78,
            borderRadius: 999,
            backgroundColor: alpha(haloColor, 0.5),
            opacity: haloOpacity,
            transform: [{ scale: haloScale }],
          }}
        />
      )}
      {/* anillo de profundidad estático */}
      <View style={{ position: 'absolute', width: ring, height: ring, borderRadius: 999, borderWidth: 1, borderColor: ringColor }} />
      {/* anillo cometa rotando */}
      <Animated.View style={{ position: 'absolute', width: ring, height: ring, transform: [{ rotate }] }}>
        <Svg width={ring} height={ring} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Defs>
            <SvgGrad id="comet" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={cometFrom} stopOpacity="0" />
              <Stop offset="1" stopColor={base} stopOpacity="1" />
            </SvgGrad>
          </Defs>
          <Circle
            cx={ring / 2}
            cy={ring / 2}
            r={r}
            fill="none"
            stroke="url(#comet)"
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeDasharray={`${circ * 0.42} ${circ}`}
          />
        </Svg>
        {/* cabeza del cometa */}
        <View
          style={{
            position: 'absolute',
            top: -3,
            left: ring / 2 - 4,
            width: 8,
            height: 8,
            borderRadius: 999,
            backgroundColor: base,
            shadowColor: haloColor,
            shadowOpacity: 1,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 0 },
          }}
        />
      </Animated.View>
      {/* globo respirando */}
      <Animated.View style={{ transform: [{ scale }] }}>
        <Image source={GLOBE} resizeMode="contain" style={{ width: globe, height: globe, tintColor: base }} />
      </Animated.View>
    </View>
  );
}
