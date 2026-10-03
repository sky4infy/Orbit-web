/**
 * Thin wrapper over the Vibration API. Most desktop browsers don't support
 * it at all, so this must never throw — it's pure enhancement for phones.
 */
export function vibrate(pattern: number | number[] = 12) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // ignore — haptics are a nice-to-have, never worth breaking a gesture over
    }
  }
}
