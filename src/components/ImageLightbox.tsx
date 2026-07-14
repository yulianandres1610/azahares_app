// Visor de imagen a pantalla completa con zoom (pinch + doble tap).
// Reusa useLocalImage para traer el binario por la red que sí funciona en el
// dispositivo (mismo patrón que RemoteImage, evita el cargador nativo colgado).
import React from 'react';
import { Dimensions, Image, Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalImage } from './RemoteImage';
import { GlobeSpinner } from './GlobeSpinner';
import { Icon } from './Icon';
import { colors } from '../theme/tokens';

export function ImageLightbox({ url, onClose }: { url: string | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { uri, err } = useLocalImage(url);
  const { width, height } = Dimensions.get('window');
  const open = !!url;

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ width, height, alignItems: 'center', justifyContent: 'center' }}
          maximumZoomScale={4}
          minimumZoomScale={1}
          centerContent
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          bouncesZoom
        >
          {/* Tocar fuera de la imagen cierra */}
          <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={onClose} />
          {uri ? (
            <Image source={{ uri }} style={{ width, height }} resizeMode="contain" />
          ) : (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              {err ? <Icon name="image" size={40} color="rgba(255,255,255,0.5)" /> : <GlobeSpinner size={54} showHalo={false} />}
            </View>
          )}
        </ScrollView>
        {/* Cerrar */}
        <Pressable
          onPress={onClose}
          hitSlop={12}
          style={{
            position: 'absolute',
            top: insets.top + 8,
            right: 16,
            width: 42,
            height: 42,
            borderRadius: 999,
            backgroundColor: 'rgba(255,255,255,0.14)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="x" size={22} color="#fff" />
        </Pressable>
      </View>
    </Modal>
  );
}
