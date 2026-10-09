'use client';

import { format } from 'date-fns';
import { db } from '@/lib/db';
import { getReflectionForDay } from '@/api/reflection';
import { playOrbitChime } from '@/lib/orbitSound';

export interface NotificationStatus {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  enabled: boolean;
  todayPlanned: boolean;
  todayReflected: boolean;
  taskCountToday: number;
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
 * Check if user enabled Orbit notifications in settings
 */
export function areOrbitNotificationsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const saved = localStorage.getItem(SETTINGS_KEY);
  if (saved === null) return false;
  return saved === 'true';
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

  // 2. Dispatch system notification (Service Worker if registered, else window Notification)
  try {
    const notifOptions: NotificationOptions = {
      body: options.body,
      icon: '/icon.svg',
      badge: '/favicon.svg',
      tag: options.tag,
      requireInteraction: options.requireInteraction ?? false,
      data: { url: options.url || '/' },
      // The 'sound' attribute is part of the W3C spec; browsers that support it will use our custom asset:
      ...( { sound: '/sounds/orbit-chime.wav' } as any ),
    };

    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, notifOptions);
        return;
      }
    }

    if (Notification.permission === 'granted') {
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
 * Evaluates the 3 checkpoints (7:30 AM, 9:00 AM, 10:00 PM) for right now
 */
export async function evaluateCheckpointsNow(userId?: string): Promise<void> {
  if (!areOrbitNotificationsEnabled() || Notification.permission !== 'granted') return;

  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const totalMinutes = currentHour * 60 + currentMinute;

  // Window 1: 7:30 AM (between 7:30 and 8:50 AM)
  const isMorning730Window = totalMinutes >= 7 * 60 + 30 && totalMinutes < 8 * 60 + 50;
  if (isMorning730Window) {
    const lastSent = localStorage.getItem(LAST_730_KEY);
    if (lastSent !== todayStr) {
      const { planned, count } = await checkTodayPlanned(userId);
      if (!planned) {
        localStorage.setItem(LAST_730_KEY, todayStr);
        await dispatchOrbitNotification('Orbit · Morning Orbit Check (7:30 AM)', {
          body: "Your day isn't planned yet. Set your focus for today and stay in orbit.",
          tag: `orbit-730-${todayStr}`,
          url: '/planner',
        });
      }
    }
  }

  // Window 2: 9:00 AM (between 9:00 and 11:30 AM)
  const isMorning900Window = totalMinutes >= 9 * 60 && totalMinutes < 11 * 60 + 30;
  if (isMorning900Window) {
    const lastSent = localStorage.getItem(LAST_900_KEY);
    if (lastSent !== todayStr) {
      const { planned, count } = await checkTodayPlanned(userId);
      if (!planned) {
        localStorage.setItem(LAST_900_KEY, todayStr);
        await dispatchOrbitNotification('Orbit · Final Morning Call (9:00 AM)', {
          body: '0 tasks scheduled for today. Lock in your core study block before the day slips away.',
          tag: `orbit-900-${todayStr}`,
          url: '/planner',
        });
      }
    }
  }

  // Window 3: 10:00 PM (between 22:00 and 23:59 PM)
  const isNight2200Window = totalMinutes >= 22 * 60;
  if (isNight2200Window && userId) {
    const lastSent = localStorage.getItem(LAST_2200_KEY);
    if (lastSent !== todayStr) {
      const hasReflected = await checkTodayReflected(userId);
      if (!hasReflected) {
        localStorage.setItem(LAST_2200_KEY, todayStr);
        await dispatchOrbitNotification('Orbit · Evening Debrief (10:00 PM)', {
          body: 'Time to close your loop. Log your wins, blockers, and energy rating for today.',
          tag: `orbit-2200-${todayStr}`,
          url: '/journey',
        });
      }
    }
  }
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

  if (!areOrbitNotificationsEnabled() || Notification.permission !== 'granted') {
    return () => {};
  }

  // 1. Immediate check in case we just woke up inside a checkpoint window
  evaluateCheckpointsNow(userId);

  // 2. Schedule precise timer for 7:30 AM
  const ms730 = getMsUntilTime(7, 30);
  schedulerTimer730 = setTimeout(() => {
    evaluateCheckpointsNow(userId);
    // Recurring daily
    schedulerTimer730 = setInterval(() => evaluateCheckpointsNow(userId), 24 * 60 * 60 * 1000);
  }, ms730);

  // 3. Schedule precise timer for 9:00 AM
  const ms900 = getMsUntilTime(9, 0);
  schedulerTimer900 = setTimeout(() => {
    evaluateCheckpointsNow(userId);
    schedulerTimer900 = setInterval(() => evaluateCheckpointsNow(userId), 24 * 60 * 60 * 1000);
  }, ms900);

  // 4. Schedule precise timer for 10:00 PM (22:00)
  const ms2200 = getMsUntilTime(22, 0);
  schedulerTimer2200 = setTimeout(() => {
    evaluateCheckpointsNow(userId);
    schedulerTimer2200 = setInterval(() => evaluateCheckpointsNow(userId), 24 * 60 * 60 * 1000);
  }, ms2200);

  // 5. Heartbeat check every 5 minutes and on window focus/visibility change
  heartbeatInterval = setInterval(() => {
    evaluateCheckpointsNow(userId);
  }, 5 * 60 * 1000);

  const onVisibility = () => {
    if (document.visibilityState === 'visible') {
      evaluateCheckpointsNow(userId);
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    if (schedulerTimer730) clearTimeout(schedulerTimer730);
    if (schedulerTimer900) clearTimeout(schedulerTimer900);
    if (schedulerTimer2200) clearTimeout(schedulerTimer2200);
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

/**
 * Gets live status for display in Profile / Settings
 */
export async function getOrbitNotificationStatus(userId?: string): Promise<NotificationStatus> {
  const supported = isNotificationSupported();
  const permission = getNotificationPermission();
  const enabled = areOrbitNotificationsEnabled();
  const { planned, count } = await checkTodayPlanned(userId);
  const reflected = userId ? await checkTodayReflected(userId) : false;

  return {
    supported,
    permission,
    enabled,
    todayPlanned: planned,
    todayReflected: reflected,
    taskCountToday: count,
  };
}
