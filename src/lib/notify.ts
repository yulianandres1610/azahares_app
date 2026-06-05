// Notificaciones locales con sonido (funcionan sin cuenta paga de Apple).
// Cuando llega una notificación nueva, suena y muestra el banner.
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Carga defensiva de expo-device: si el módulo nativo no está enlazado,
// no rompe el arranque de la app (degrada sin push remoto).
function getDevice(): { isDevice?: boolean } | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-device');
  } catch {
    return null;
  }
}

// Handler: mostrar banner + reproducir sonido incluso con la app en primer plano.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    // compat campos viejos
    shouldShowAlert: true,
  }),
});

let permGranted: boolean | null = null;

export async function ensureNotifPermission(): Promise<boolean> {
  if (permGranted !== null) return permGranted;
  try {
    const cur = await Notifications.getPermissionsAsync();
    let status = cur.status;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    permGranted = status === 'granted';
  } catch {
    permGranted = false;
  }
  return permGranted;
}

// Registra el dispositivo para PUSH REMOTO (suena con la app cerrada).
// Requiere: cuenta Apple paga + projectId de EAS + credenciales APNs en Expo.
// Devuelve el Expo push token, o null si no se pudo.
export async function registerForPushToken(): Promise<string | null> {
  try {
    const Device = getDevice();
    if (Device && Device.isDevice === false) return null; // push real solo en dispositivo físico
    const ok = await ensureNotifPermission();
    if (!ok) return null;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      });
    }
    const projectId =
      (Constants.expoConfig as any)?.extra?.eas?.projectId ||
      (Constants as any)?.easConfig?.projectId;
    if (!projectId) return null; // sin projectId no se puede obtener el token Expo
    const res = await Notifications.getExpoPushTokenAsync({ projectId });
    return res.data || null;
  } catch {
    return null;
  }
}

// Dispara una notificación local inmediata (suena).
export async function presentLocal(title: string, body: string): Promise<void> {
  try {
    const ok = await ensureNotifPermission();
    if (!ok) return;
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null, // inmediata
    });
  } catch {
    // best-effort
  }
}
