import { supabase } from '@/lib/supabase/client';
import { db, saveLocalTask, deleteLocalTask } from '@/lib/db';
import {
  getCustomSubjects,
  getCustomChapters,
  getChapterOverrides,
  resolveChapterId,
  resolveSubjectId,
} from '@/lib/curriculumData';
import { generateUuid, isUuid } from '@/lib/uuid';

let isSyncing = false;

/**
 * Uploads all locally stored custom subjects (e.g. created on mobile) to Supabase.
 */
export async function syncCustomSubjectsToCloud(userId: string) {
  if (!userId) return;
  const localSubjects = getCustomSubjects();
  if (localSubjects.length === 0) return;

  try {
    // Fetch existing user subjects from Supabase
    const { data: cloudSubjects, error } = await supabase
      .from('subject')
      .select('id, name')
      .eq('user_id', userId);

    if (error) {
      console.warn('Could not fetch cloud subjects for sync:', error);
      return;
    }

    const cloudList = (cloudSubjects as any[]) ?? [];
    const cloudNames = new Set(cloudList.map((s) => (s.name ?? '').toLowerCase()));

    for (const sub of localSubjects) {
      if (!cloudNames.has(sub.name.toLowerCase())) {
        const newId = isUuid(sub.id) ? sub.id : generateUuid();
        const { error: insertError } = await supabase.from('subject').insert({
          id: newId,
          user_id: userId,
          name: sub.name,
          track: sub.track === 'all' ? 'jee_nsep' : sub.track,
        } as never);

        if (!insertError) {
          sub.id = newId;
        }
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('orbit_custom_subjects', JSON.stringify(localSubjects));
    }
  } catch (err) {
    console.warn('syncCustomSubjectsToCloud error:', err);
  }
}

/**
 * Uploads all locally stored custom chapters to Supabase.
 */
export async function syncCustomChaptersToCloud(userId: string) {
  if (!userId) return;
  const localChapters = getCustomChapters();
  if (localChapters.length === 0) return;

  try {
    const { data: cloudChapters, error } = await supabase
      .from('chapter')
      .select('id, name, subject_id')
      .eq('user_id', userId);

    if (error) return;

    const cloudList = (cloudChapters as any[]) ?? [];
    const cloudNames = new Set(cloudList.map((c) => (c.name ?? '').toLowerCase()));

    for (const chap of localChapters) {
      if (!cloudNames.has(chap.name.toLowerCase())) {
        const newId = isUuid(chap.id) ? chap.id : generateUuid();
        const validSubjectId = resolveSubjectId(chap.subjectId);

        const { error: insertError } = await supabase.from('chapter').insert({
          id: newId,
          user_id: userId,
          subject_id: validSubjectId,
          name: chap.name,
        } as never);

        if (!insertError) {
          chap.id = newId;
          chap.subjectId = validSubjectId;

          // Upsert initial progress
          await supabase.from('user_chapter_progress').upsert({
            user_id: userId,
            chapter_id: newId,
            status: chap.status,
            confidence_score: chap.confidence,
          } as never, { onConflict: 'user_id,chapter_id' });
        }
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('orbit_custom_chapters', JSON.stringify(localChapters));
    }
  } catch (err) {
    console.warn('syncCustomChaptersToCloud error:', err);
  }
}

/**
 * Uploads all syllabus progress overrides from localStorage to Supabase user_chapter_progress.
 */
export async function syncChapterOverridesToCloud(userId: string) {
  if (!userId) return;
  const overrides = getChapterOverrides();
  const entries = Object.entries(overrides);
  if (entries.length === 0) return;

  try {
    for (const [chapId, data] of entries) {
      const validChapterId = resolveChapterId(chapId);
      if (validChapterId && data.status) {
        await supabase
          .from('user_chapter_progress')
          .upsert(
            {
              user_id: userId,
              chapter_id: validChapterId,
              status: data.status,
              confidence_score: data.confidence ?? 50,
            } as never,
            { onConflict: 'user_id,chapter_id' }
          );
      }
    }
  } catch (err) {
    console.warn('syncChapterOverridesToCloud error:', err);
  }
}

/**
 * Bi-directional task synchronization:
 * 1. Pushes any legacy/local offline tasks from Dexie up to Supabase with valid UUIDs.
 * 2. Pulls all cloud tasks down to Dexie so PC & Phone have identical offline caches.
 */
export async function syncTasksBetweenLocalAndCloud(userId: string) {
  if (!userId) return;

  try {
    // Step 1: Push local offline tasks to Supabase
    const localTasks = await db.tasks.toArray();
    for (const t of localTasks) {
      if (t.user_id === userId || !t.user_id) {
        const isLegacyId = !isUuid(t.id);
        const realId = isLegacyId ? generateUuid() : t.id;
        const realChapId = resolveChapterId(t.chapter_id);

        // Push to cloud
        const { error } = await supabase.from('task').upsert({
          id: realId,
          user_id: userId,
          chapter_id: realChapId,
          title: t.title,
          scheduled_date: t.scheduled_date,
          time_slot: t.time_slot,
          effort_level: t.effort_level,
          priority: t.priority,
          position: t.position,
          status: t.status,
          incomplete_reason: t.incomplete_reason,
          estimated_minutes: t.estimated_minutes,
          actual_minutes: t.actual_minutes,
          completed_at: t.completed_at,
        } as never, { onConflict: 'id' });

        if (!error && isLegacyId) {
          // Replace legacy ID with valid UUID in Dexie
          await deleteLocalTask(t.id);
          await saveLocalTask({
            ...t,
            id: realId,
            chapter_id: realChapId,
            user_id: userId,
          });
        }
      }
    }

    // Step 2: Pull cloud tasks into local Dexie
    const { data: cloudTasks, error: fetchError } = await supabase
      .from('task')
      .select('*')
      .eq('user_id', userId);

    const taskList = (cloudTasks as any[]) ?? [];
    if (!fetchError && taskList.length > 0) {
      for (const ct of taskList) {
        await saveLocalTask({
          id: ct.id,
          user_id: userId,
          chapter_id: ct.chapter_id,
          title: ct.title,
          scheduled_date: ct.scheduled_date,
          time_slot: ct.time_slot,
          effort_level: ct.effort_level,
          priority: ct.priority,
          position: ct.position,
          status: ct.status,
          incomplete_reason: ct.incomplete_reason,
          estimated_minutes: ct.estimated_minutes,
          actual_minutes: ct.actual_minutes,
          created_at: ct.created_at,
          completed_at: ct.completed_at,
        });
      }
    }
  } catch (err) {
    console.warn('syncTasksBetweenLocalAndCloud error:', err);
  }
}

/**
 * Master sync function to run whenever user is active.
 * Ensures Phone and PC have identical data.
 */
export async function syncAllUserData(userId: string): Promise<void> {
  if (!userId || isSyncing) return;
  isSyncing = true;

  try {
    await Promise.allSettled([
      syncCustomSubjectsToCloud(userId),
      syncCustomChaptersToCloud(userId),
      syncChapterOverridesToCloud(userId),
      syncTasksBetweenLocalAndCloud(userId),
    ]);

    if (typeof window !== 'undefined') {
      localStorage.setItem('orbit_last_synced_at', Date.now().toString());
      window.dispatchEvent(new CustomEvent('orbit:sync_completed'));
    }
  } catch (err) {
    console.warn('Orbit background sync error:', err);
  } finally {
    isSyncing = false;
  }
}
