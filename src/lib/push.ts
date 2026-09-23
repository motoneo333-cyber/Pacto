import { api } from './api';

const VAPID = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? '';

export const pushSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && !!VAPID;

function b64ToUint8(b64: string): Uint8Array {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Pide permiso, se suscribe y guarda la suscripcion. Lanza un Error con un mensaje legible si no se puede. */
export async function enablePush(userId: string): Promise<void> {
  if (!VAPID) throw new Error('Las notificaciones no están configuradas (falta VITE_VAPID_PUBLIC_KEY).');
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Este navegador no soporta notificaciones. En iPhone instala primero la app en la pantalla de inicio.');
  }
  if ((await Notification.requestPermission()) !== 'granted') throw new Error('Permiso de notificaciones denegado.');
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(VAPID) as BufferSource }));
  await api.savePushSubscription(userId, sub);
}
