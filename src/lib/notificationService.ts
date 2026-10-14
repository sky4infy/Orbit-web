'use client';

import { format } from 'date-fns';
import { db } from '@/lib/db';
import { getReflectionForDay } from '@/api/reflection';
import { playOrbitChime } from '@/lib/orbitSound';
import { supabase } from '@/lib/supabase/client';

export interface NotificationStatus {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  enabled: boolean;
  todayPlanned: boolean;
  todayReflected: boolean;
  taskCountToday: number;
  pushSupported: boolean;
  pushSubscribed: boolean;
}

const SETTINGS_KEY = 'orbit_notifications_enabled';
const LAST_730_KEY = 'orbit_notif_last_730';
const LAST_900_KEY = 'orbit_notif_last_900';
const LAST_2200_KEY = 'orbit_notif_last_2200';

let schedulerTimer730: any = null;
let schedulerTimer900: any = null;
let schedulerTimer2200: any = null;
let heartbeatInterval: any = null;

/**
 * Check if the browser supports notifications
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Get current notification permission
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Check if user enabled Orbit notifications in settings.
 * Defaults to TRUE if the browser already granted permission!
 */
export function areOrbitNotificationsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const saved = localStorage.getItem(SETTINGS_KEY);
  if (saved !== null) return saved === 'true';
  return 'Notification' in window && Notification.permission === 'granted';
}

/**
 * Set user notification preference
 */
export function setOrbitNotificationsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SETTINGS_KEY, enabled ? 'true' : 'false');
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setOrbitNotificationsEnabled(true);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Check if the browser supports standard Web Push via PushManager
 */
export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Checks whether this browser already holds an active PushSubscription
 */
export async function isWebPushSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}

/**
 * Subscribes this browser to Web Push using the VAPID Public Key
 * and saves the subscription to Supabase.
 */
export async function subscribeToWebPush(userId?: string): Promise<{ success: boolean; error?: string }> {
  if (!isPushSupported()) {
    return { success: false, error: 'Push notifications are not supported on this browser.' };
  }

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    return { success: false, error: 'VAPID public key not configured in environment.' };
  }

  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      return { success: false, error: 'Notification permission was not granted by browser.' };
    }

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();

    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as any,
      });
    }

    const rawP256dh = sub.getKey('p256dh');
    const rawAuth = sub.getKey('auth');
    const p256dh = arrayBufferToBase64(rawP256dh);
    const auth = arrayBufferToBase64(rawAuth);

    const effectiveUid = resolveEffectiveUserId(userId);
    if (effectiveUid) {
      const { error: dbError } = await (supabase.from('push_subscription') as any).upsert(
        {
          user_id: effectiveUid,
          endpoint: sub.endpoint,
          p256dh,
          auth,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      );
      if (dbError) {
        console.warn('[Orbit WebPush] Failed to save subscription to Supabase:', dbError);
      }
    }

    setOrbitNotificationsEnabled(true);
    return { success: true };
  } catch (err: any) {
    console.error('[Orbit WebPush] Subscription error:', err);
    return { success: false, error: err?.message || 'Failed to subscribe to Web Push' };
  }
}

/**
 * Unsubscribes from Web Push and removes subscription from Supabase
 */
export async function unsubscribeFromWebPush(userId?: string): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      const effectiveUid = resolveEffectiveUserId(userId);
      if (effectiveUid) {
        await supabase.from('push_subscription').delete().eq('endpoint', endpoint);
      }
    }
    return true;
  } catch (err) {
    console.error('[Orbit WebPush] Unsubscribe failed:', err);
    return false;
  }
}

/**
 * Triggers a real server-side push notification to this device to verify background wakeup.
 */
export async function sendTestWebPush(userId?: string): Promise<{ success: boolean; error?: string }> {
  if (!isPushSupported()) {
    return { success: false, error: 'Web Push is not supported in this browser.' };
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();

    if (!sub) {
      const subResult = await subscribeToWebPush(userId);
      if (!subResult.success) return subResult;
      sub = await reg.pushManager.getSubscription();
    }

    if (!sub) {
      return { success: false, error: 'Unable to establish push subscription.' };
    }

    const rawP256dh = sub.getKey('p256dh');
    const rawAuth = sub.getKey('auth');

    const res = await fetch('/api/notifications/test-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: {
          endpoint: sub.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(rawP256dh),
            auth: arrayBufferToBase64(rawAuth),
          },
        },
        title: 'Orbit · Background Push Verified 🪐',
        body: 'Success! This notification arrived from the cloud server. It works even when Orbit is closed.',
        url: '/planner',
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.error || `Server error ${res.status}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error triggering test push' };
  }
}

/**
 * Dispatches an Orbit notification with custom sound
 */
export async function dispatchOrbitNotification(
  title: string,
  options: {
    body: string;
    tag?: string;
    url?: string;
    requireInteraction?: boolean;
  }
): Promise<void> {
  if (!isNotificationSupported()) return;

  // 1. Play Orbit's signature chime sound
  playOrbitChime().catch(() => {});

  // 2. Dispatch system notification (Service Worker if ready, fallback to window.Notification)
  try {
    const notifOptions: NotificationOptions = {
      body: options.body,
      icon: '/icon.svg',
      badge: '/favicon.svg',
      tag: options.tag,
      requireInteraction: options.requireInteraction ?? false,
      data: { url: options.url || '/' },
      // W3C spec sound attribute
      ...( { sound: '/sounds/orbit-chime.wav' } as any ),
    };

    let swShown = false;
    if ('serviceWorker' in navigator) {
      try {
        const reg = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<null>((_, reject) => setTimeout(() => reject(new Error('sw timeout')), 600)),
        ]);
        if (reg && 'showNotification' in reg) {
          await reg.showNotification(title, notifOptions);
          swShown = true;
        }
      } catch {
        // Service worker took too long or isn't active, fallback to new Notification
      }
    }

    if (!swShown && Notification.permission === 'granted') {
      const n = new Notification(title, notifOptions);
      n.onclick = () => {
        window.focus();
        if (options.url) {
          window.location.href = options.url;
        }
        n.close();
      };
    }
  } catch (err) {
    console.warn('[Orbit Notifications] Failed to display notification:', err);
  }
}

/**
 * Sends a test notification so the user can verify sound and popup immediately
 */
export async function sendTestOrbitNotification(): Promise<void> {
  await dispatchOrbitNotification('Orbit · Audio & Notification Check 🪐', {
    body: 'Sound verified! Your morning (7:30 & 9:00 AM) and night (10:00 PM) check-ins are active.',
    tag: 'orbit-test-' + Date.now(),
    url: '/planner',
  });
}

/**
 * Checks if tasks are planned for today in Orbit's local Dexie database
 */
export async function checkTodayPlanned(userId?: string): Promise<{ planned: boolean; count: number }> {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    let tasks = await db.tasks.where('scheduled_date').equals(today).toArray();
    if (userId) {
      tasks = tasks.filter(t => t.user_id === userId);
    }
    const realTasks = tasks.filter(t => !t.id.startsWith('starter-'));
    return {
      planned: realTasks.length > 0,
      count: realTasks.length,
    };
  } catch {
    return { planned: false, count: 0 };
  }
}

/**
 * Checks if daily reflection has been recorded for today
 */
export async function checkTodayReflected(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    const reflection = await getReflectionForDay(userId, today);
    return !!(reflection && (reflection.wins || reflection.blockers || reflection.energy_rating != null));
  } catch {
    return false;
  }
}

/**
 * Resolves effective user ID from argument or localStorage cached session
 */
function resolveEffectiveUserId(userId?: string): string | null {
  if (userId) return userId;
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem('orbit_cached_user');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.id) return parsed.id;
    }
  } catch {}
  return null;
}

/**
 * Evaluates the 3 checkpoints (7:30 AM, 9:00 AM, 10:00 PM) for right now
 */
export async function evaluateCheckpointsNow(userId?: string): Promise<{
  triggered: 'morning_730' | 'morning_900' | 'night_2200' | null;
  reason?: string;
}> {
  if (!areOrbitNotificationsEnabled() || Notification.permission !== 'granted') {
    return { triggered: null, reason: 'notifications_disabled_or_not_granted' };
  }

  const effectiveUid = resolveEffectiveUserId(userId);
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const totalMinutes = currentHour * 60 + currentMinute;

  // Window 1: 7:30 AM (between 7:30 and 8:59 AM)
  const isMorning730Window = totalMinutes >= 7 * 60 + 30 && totalMinutes < 9 * 60;
  if (isMorning730Window) {
    const lastSent = localStorage.getItem(LAST_730_KEY);
    if (lastSent !== todayStr) {
      const { planned, count } = await checkTodayPlanned(effectiveUid ?? undefined);
      if (!planned) {
        localStorage.setItem(LAST_730_KEY, todayStr);
        await dispatchOrbitNotification('Orbit · Morning Orbit Check (7:30 AM)', {
          body: "Your day isn't planned yet. Set your focus for today and stay in orbit.",
          tag: `orbit-730-${todayStr}`,
          url: '/planner',
        });
        return { triggered: 'morning_730' };
      }
    }
  }

  // Window 2: 9:00 AM (between 9:00 and 12:00 PM)
  const isMorning900Window = totalMinutes >= 9 * 60 && totalMinutes < 12 * 60;
  if (isMorning900Window) {
    const lastSent = localStorage.getItem(LAST_900_KEY);
    if (lastSent !== todayStr) {
      const { planned, count } = await checkTodayPlanned(effectiveUid ?? undefined);
      if (!planned) {
        localStorage.setItem(LAST_900_KEY, todayStr);
        await dispatchOrbitNotification('Orbit · Final Morning Call (9:00 AM)', {
          body: '0 tasks scheduled for today. Lock in your core study block before the day slips away.',
          tag: `orbit-900-${todayStr}`,
          url: '/planner',
        });
        return { triggered: 'morning_900' };
      }
    }
  }

  // Window 3: 10:00 PM (from 22:00 through midnight)
  const isNight2200Window = totalMinutes >= 22 * 60;
  if (isNight2200Window) {
    const lastSent = localStorage.getItem(LAST_2200_KEY);
    if (lastSent !== todayStr) {
      const hasReflected = effectiveUid ? await checkTodayReflected(effectiveUid) : false;
      if (!hasReflected) {
        localStorage.setItem(LAST_2200_KEY, todayStr);
        await dispatchOrbitNotification('Orbit · Evening Debrief (10:00 PM)', {
          body: 'Time to close your loop. Log your wins, blockers, and energy rating for today.',
          tag: `orbit-2200-${todayStr}`,
          url: '/journey',
        });
        return { triggered: 'night_2200' };
      }
    }
  }

  return { triggered: null, reason: 'criteria_not_met_or_already_sent' };
}

/**
 * Calculates ms until the next target hour and minute
 */
function getMsUntilTime(targetHour: number, targetMinute: number): number {
  const now = new Date();
  const target = new Date(now);
  target.setHours(targetHour, targetMinute, 0, 0);

  if (target.getTime() <= now.getTime()) {
    // If target has passed today, schedule for tomorrow
    target.setDate(target.getDate() + 1);
  }
  return target.getTime() - now.getTime();
}

/**
 * Initializes the automated scheduler for 7:30 AM, 9:00 AM, and 10:00 PM
 */
export function initOrbitNotificationScheduler(userId?: string): () => void {
  if (typeof window === 'undefined') return () => {};

  // Clear any existing timers
  if (schedulerTimer730) clearTimeout(schedulerTimer730);
  if (schedulerTimer900) clearTimeout(schedulerTimer900);
  if (schedulerTimer2200) clearTimeout(schedulerTimer2200);
  if (heartbeatInterval) clearInterval(heartbeatInterval);

  // Run immediate checkpoint check
  evaluateCheckpointsNow(userId);

  // Schedule precise timer for 7:30 AM
  const ms730 = getMsUntilTime(7, 30);
  schedulerTimer730 = setTimeout(() => {
    evaluateCheckpointsNow(userId);
    schedulerTimer730 = setInterval(() => evaluateCheckpointsNow(userId), 24 * 60 * 60 * 1000);
  }, ms730);

  // Schedule precise timer for 9:00 AM
  const ms900 = getMsUntilTime(9, 0);
  schedulerTimer900 = setTimeout(() => {
    evaluateCheckpointsNow(userId);
    schedulerTimer900 = setInterval(() => evaluateCheckpointsNow(userId), 24 * 60 * 60 * 1000);
  }, ms900);

  // Schedule precise timer for 10:00 PM (22:00)
  const ms2200 = getMsUntilTime(22, 0);
  schedulerTimer2200 = setTimeout(() => {
    evaluateCheckpointsNow(userId);
    schedulerTimer2200 = setInterval(() => evaluateCheckpointsNow(userId), 24 * 60 * 60 * 1000);
  }, ms2200);

  // Heartbeat check every 2 minutes and whenever user unlocks phone or switches back to tab
  heartbeatInterval = setInterval(() => {
    evaluateCheckpointsNow(userId);
  }, 2 * 60 * 1000);

  const onWakeOrFocus = () => {
    if (document.visibilityState === 'visible') {
      evaluateCheckpointsNow(userId);
    }
  };

  window.addEventListener('focus', onWakeOrFocus);
  document.addEventListener('visibilitychange', onWakeOrFocus);

  return () => {
    if (schedulerTimer730) clearTimeout(schedulerTimer730);
    if (schedulerTimer900) clearTimeout(schedulerTimer900);
    if (schedulerTimer2200) clearTimeout(schedulerTimer2200);
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    window.removeEventListener('focus', onWakeOrFocus);
    document.removeEventListener('visibilitychange', onWakeOrFocus);
  };
}

/**
 * Gets live status for display in Profile / Settings
 */
export async function getOrbitNotificationStatus(userId?: string): Promise<NotificationStatus> {
  const supported = isNotificationSupported();
  const permission = getNotificationPermission();
  const enabled = areOrbitNotificationsEnabled();
  const pushSupported = isPushSupported();
  const pushSubscribed = await isWebPushSubscribed();
  const effectiveUid = resolveEffectiveUserId(userId);
  const { planned, count } = await checkTodayPlanned(effectiveUid ?? undefined);
  const reflected = effectiveUid ? await checkTodayReflected(effectiveUid) : false;

  return {
    supported,
    permission,
    enabled,
    todayPlanned: planned,
    todayReflected: reflected,
    taskCountToday: count,
    pushSupported,
    pushSubscribed,
  };
}
