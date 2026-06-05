// Notificaciones locales con sonido (funcionan sin cuenta paga de Apple).
// Cuando llega una notificación nueva, suena y muestra el banner.
import * as Notifications from 'expo-notifications';

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
