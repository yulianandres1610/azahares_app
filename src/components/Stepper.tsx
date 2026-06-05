// Stepper compartido por el wizard y la inspección.
import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, shadows } from '../theme/tokens';
import { AppText, CheckMark, Tap } from './ui';

export function Stepper({
  steps,
  current,
  onPick,
  large,
}: {
  steps: string[];
  current: number;
  onPick?: (i: number) => void;
  large?: boolean;
}) {
  const sz = large ? 40 : 30;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        const tappable = !!onPick && i <= current;
        const circle = (
          <View style={{ alignItems: 'center', gap: large ? 9 : 7 }}>
            <View
              style={{
                width: sz,
                height: sz,
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: done ? colors.success : active ? 'transparent' : colors.surface,
                borderWidth: !done && !active ? 1.5 : 0,
                borderColor: colors.line,
                ...(active ? shadows.sm : {}),
                overflow: 'hidden',
              }}
            >
              {active && (
                <LinearGradient colors={gradients.navy} style={{ position: 'absolute', width: sz, height: sz }} />
              )}
              {done ? (
                <CheckMark size={large ? 20 : 16} />
              ) : (
                <AppText weight="700" style={{ color: active ? '#fff' : colors.ink40, fontSize: large ? 16 : 13 }}>
                  {i + 1}
                </AppText>
              )}
            </View>
            <AppText weight="600" style={{ fontSize: large ? 12.5 : 11, color: active ? colors.ink : colors.ink40 }}>
              {label}
            </AppText>
          </View>
        );
        return (
          <React.Fragment key={i}>
            {tappable ? (
              <Tap onPress={() => onPick?.(i)} hapticKind="select">
                {circle}
              </Tap>
            ) : (
              circle
            )}
            {i < steps.length - 1 && (
              <View
                style={{
                  flex: 1,
                  height: large ? 3 : 2,
                  marginHorizontal: large ? 8 : 6,
                  marginBottom: 22,
                  borderRadius: 999,
                  backgroundColor: i < current ? colors.success : colors.line,
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}
