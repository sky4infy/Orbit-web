'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/supabase/AuthProvider';
import { initOrbitNotificationScheduler } from '@/lib/notificationService';

export function ServiceWorkerRegister() {
  const { userId } = useAuth();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Installability is a nice-to-have, not critical — fail silently.
      });
    }
  }, []);

  useEffect(() => {
    // Start automated scheduler for 7:30 AM, 9:00 AM, and 10:00 PM check-ins
    const cleanup = initOrbitNotificationScheduler(userId ?? undefined);
    return cleanup;
  }, [userId]);

  return null;
}
