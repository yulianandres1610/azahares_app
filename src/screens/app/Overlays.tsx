// Placeholders de overlays (wizard, detalle+inspección, escaneo).
// TODO: portar screens-containers (wizard), screens-inspection (+cámara/etiqueta), screens-scan.
import React from 'react';
import { View } from 'react-native';
import { colors } from '../../theme/tokens';
import { Icon } from '../../components/Icon';
import { AppText, IconButton, Screen } from '../../components/ui';
import { useApp } from '../../store/AppContext';

function Stub({ title, icon, onClose }: { title: string; icon: any; onClose: () => void }) {
  return (
    <Screen bg={colors.bg}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 12 }}>
        <IconButton name="x" variant="plain" onPress={onClose} />
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 }}>
        <View style={{ width: 84, height: 84, borderRadius: 26, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={40} color={colors.navy500} />
        </View>
        <AppText serif weight="600" style={{ fontSize: 22, marginTop: 18 }}>
          {title}
        </AppText>
        <AppText style={{ color: colors.ink50, marginTop: 8, textAlign: 'center' }}>
          En construcción — próximo paso.
        </AppText>
      </View>
    </Screen>
  );
}

export function NewContainer({ onClose }: { onClose: () => void }) {
  const { t } = useApp();
  return <Stub title={t('newContainer')} icon="plus" onClose={onClose} />;
}

export function Detail({ id, onClose }: { id: string; onClose: () => void }) {
  const { t } = useApp();
  return <Stub title={t('inspection')} icon="inspect" onClose={onClose} />;
}

export function Scan({ onClose }: { onClose: () => void }) {
  const { t } = useApp();
  return <Stub title={t('scanTitle')} icon="qr" onClose={onClose} />;
}
