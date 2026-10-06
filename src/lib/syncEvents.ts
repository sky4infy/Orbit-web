/**
 * Real-time Cross-Tab and Cross-Device synchronization event bus.
 * Uses BroadcastChannel for instant same-browser cross-tab sync,
 * window CustomEvents for intra-tab reactive updates,
 * and localStorage storage events as fallback.
 */

const SYNC_CHANNEL_NAME = 'orbit_cross_tab_sync';
const SYNC_EVENT_NAME = 'orbit:data-changed';

let broadcastChannel: BroadcastChannel | null = null;

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
  } catch {
    broadcastChannel = null;
  }
}

/**
 * Notifies all tabs and components that user data has changed
 * (e.g. cloud sync finished, task updated, chapter modified, etc.)
 */
export function notifyDataChanged(source: string = 'local') {
  if (typeof window === 'undefined') return;

  const now = Date.now();

  // 1. Dispatch custom event for current window
  window.dispatchEvent(
    new CustomEvent(SYNC_EVENT_NAME, {
      detail: { source, timestamp: now },
    })
  );

  // 2. Broadcast across tabs on the same machine
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ source, timestamp: now });
    } catch {}
  }

  // 3. Always update localStorage so all tabs, multi-process windows, and WebViews trigger storage event
  try {
    localStorage.setItem('orbit_tab_ping', `${source}:${now}`);
  } catch {}
}

/**
 * Subscribes a React component or service to data change notifications across tabs and devices.
 * Returns an unsubscribe cleanup function.
 */
export function subscribeDataChanged(callback: (source?: string) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  let lastEventTime = 0;
  const safeCallback = (src: string) => {
    const now = Date.now();
    if (now - lastEventTime < 30) return; // Deduplicate dual broadcast & storage notifications
    lastEventTime = now;
    callback(src);
  };

  const handleCustomEvent = (e: Event) => {
    const custom = e as CustomEvent;
    safeCallback(custom.detail?.source || 'unknown');
  };

  const handleBroadcastMessage = (e: MessageEvent) => {
    safeCallback(e.data?.source || 'cross-tab');
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === 'orbit_tab_ping' || e.key === 'orbit_last_synced_at') {
      const src = e.newValue?.split(':')[0] || 'storage-ping';
      safeCallback(src);
    }
  };

  window.addEventListener(SYNC_EVENT_NAME, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcastMessage);
  }

  return () => {
    window.removeEventListener(SYNC_EVENT_NAME, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcastMessage);
    }
  };
}
