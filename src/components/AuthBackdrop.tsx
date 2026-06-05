// Fondo navy compartido por las pantallas de auth (gradiente + glows).
import React from 'react';
import { Image, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { alpha, colors, gradients } from '../theme/tokens';

const LOGO = require('../../assets/logo/logo-horizontal.png');
const GLOBE = require('../../assets/logo/logo-globe.png');

export function AuthBackdrop() {
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
      <LinearGradient
        colors={gradients.navyDeep}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View
        style={{
          position: 'absolute',
          width: 520,
          height: 520,
          borderRadius: 999,
          top: -200,
          right: -180,
          backgroundColor: alpha(colors.accent, 0.28),
          opacity: 0.7,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: 420,
          height: 420,
          borderRadius: 999,
          bottom: -180,
          left: -140,
          backgroundColor: alpha(colors.navy500, 0.4),
        }}
      />
    </View>
  );
}

// Logo horizontal blanco (tintado a blanco vía tintColor).
export function Logo({ height = 30, width, style }: { height?: number; width?: number; style?: any }) {
  return (
    <Image
      source={LOGO}
      resizeMode="contain"
      style={[{ height, width: width ?? height * 4.2, tintColor: '#ffffff' }, style]}
    />
  );
}

export { GLOBE, LOGO };
