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

  // 1. Dispatch custom event for current tab components
  window.dispatchEvent(
    new CustomEvent(SYNC_EVENT_NAME, {
      detail: { source, timestamp: Date.now() },
    })
  );

  // 2. Broadcast across tabs on the same machine
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ source, timestamp: Date.now() });
    } catch {}
  } else {
    // Fallback: ping localStorage to trigger 'storage' event in other tabs
    try {
      localStorage.setItem('orbit_tab_ping', Date.now().toString());
    } catch {}
  }
}

/**
 * Subscribes a React component or service to data change notifications across tabs and devices.
 * Returns an unsubscribe cleanup function.
 */
export function subscribeDataChanged(callback: (source?: string) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = (e: Event) => {
    const custom = e as CustomEvent;
    callback(custom.detail?.source || 'unknown');
  };

  const handleBroadcastMessage = (e: MessageEvent) => {
    callback(e.data?.source || 'cross-tab');
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === 'orbit_tab_ping' || e.key === 'orbit_last_synced_at') {
      callback('storage-ping');
    }
  };

  window.addEventListener(SYNC_EVENT_NAME, handleCustomEvent);

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcastMessage);
  } else {
    window.addEventListener('storage', handleStorageEvent);
  }

  return () => {
    window.removeEventListener(SYNC_EVENT_NAME, handleCustomEvent);
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcastMessage);
    } else {
      window.removeEventListener('storage', handleStorageEvent);
    }
  };
}
