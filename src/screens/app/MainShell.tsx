// Shell principal (placeholder — la tab bar y pantallas llegan en el siguiente paso).
import React from 'react';
import { View } from 'react-native';
import { colors } from '../../theme/tokens';
import { AppText, Button, Screen } from '../../components/ui';
import { Avatar } from '../../components/ui';
import { useApp } from '../../store/AppContext';

export function MainShell() {
  const { me, t, signOut, containers, containersLoading } = useApp();
  return (
    <Screen bg={colors.bg}>
      <View style={{ padding: 24, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={me?.fullName} src={me?.avatarUrl} size={52} />
          <View>
            <AppText style={{ color: colors.ink50, fontSize: 13 }}>{t('hello')},</AppText>
            <AppText serif weight="600" style={{ fontSize: 24 }}>
              {me?.fullName || me?.email}
            </AppText>
          </View>
        </View>
        <AppText style={{ color: colors.ink60 }}>
          {containersLoading ? t('loading') : `${containers.length} ${t('containersLc')}`}
        </AppText>
        <Button onPress={signOut} variant="outline" icon="logout">
          {t('signOut')}
        </Button>
      </View>
    </Screen>
  );
}
