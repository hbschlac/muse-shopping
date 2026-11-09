/**
 * Turning on push alerts in the browser.
 *
 * iPhone only allows web push for a site saved to the home screen and opened
 * from there (iOS 16.4+). Chrome and Safari can both add Muse to the home
 * screen; the alert permission is then asked from inside the home-screen app.
 */

import { getPublicKey, saveSubscription, removeSubscription } from './api/notifications';

export type PushSupport =
  | 'ready'            // can subscribe now
  | 'needs-home-screen' // iPhone/iPad in a browser tab: add to home screen first
  | 'unsupported'      // this browser has no web push
  | 'denied';          // the shopper blocked notifications

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
}

export function pushSupport(): PushSupport {
  if (typeof window === 'undefined') return 'unsupported';
  if (isIOS() && !isStandalone()) return 'needs-home-screen';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'denied') return 'denied';
  return 'ready';
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

async function registration(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register('/sw.js');
  return navigator.serviceWorker.ready;
}

/** The subscription on this device, if push is already on here. */
export async function currentSubscription(): Promise<PushSubscription | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  const reg = await navigator.serviceWorker.getRegistration('/');
  return reg && reg.pushManager ? reg.pushManager.getSubscription() : null;
}

/**
 * Ask for permission (must run from a tap) and save this device.
 * Throws with a message the page can show.
 */
export async function enablePush(): Promise<void> {
  const support = pushSupport();
  if (support === 'needs-home-screen') throw new Error('Add Muse to your home screen first, then open it from there.');
  if (support === 'unsupported') throw new Error('This browser can’t receive push alerts.');
  if (support === 'denied') throw new Error('Notifications are blocked for Muse. Turn them on in your phone’s Settings, under Notifications.');

  const { configured, publicKey } = await getPublicKey();
  if (!configured || !publicKey) throw new Error('Push isn’t set up on the server yet.');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications weren’t allowed.');

  const reg = await registration();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
  }
  await saveSubscription(sub.toJSON());
}

export async function disablePush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  await removeSubscription(sub.endpoint).catch(() => {});
  await sub.unsubscribe().catch(() => {});
}
