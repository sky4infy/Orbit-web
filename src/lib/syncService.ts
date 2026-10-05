import { supabase } from '@/lib/supabase/client';
import { db, saveLocalTask, deleteLocalTask, saveLocalExam, deleteLocalExam } from '@/lib/db';
import { getHiddenSampleExams } from '@/api/exams';
import {
  getCustomSubjects,
  getCustomChapters,
  getChapterOverrides,
  getHiddenSubjects,
  getHiddenChapters,
  resolveChapterId,
  resolveSubjectId,
  isStarterTask,
  STARTER_TASK_TITLES,
  ALL_STANDARD_SUBJECTS,
  ALL_STANDARD_CHAPTERS,
  updateCustomSubjectId,
  updateCustomChapterId,
} from '@/lib/curriculumData';
import { generateUuid, isUuid } from '@/lib/uuid';
import { notifyDataChanged } from '@/lib/syncEvents';
import type { TrackType } from '@/types/database.types';

let isSyncing = false;

/**
 * Ensures that a subject exists in Supabase.
 * If it's a standard subject, it's already seeded in the cloud.
 * If it's a custom subject, verifies by ID or name, inserts if missing,
 * and keeps local storage IDs aligned with the cloud ID.
 */
export async function ensureSubjectInCloud(
  userId: string,
  subjectId: string,
  subjectName?: string,
  track: TrackType = 'college_cs_aiml'
): Promise<string> {
  if (!userId) return subjectId;

  const standard = ALL_STANDARD_SUBJECTS.find((s) => s.id === subjectId);
  if (standard) return standard.id;

  const resolvedName =
    subjectName && subjectName !== 'Custom Subject' && subjectName !== 'Custom Chapter'
      ? subjectName
      : getCustomSubjects().find((s) => s.id === subjectId)?.name || 'Custom Subject';

  try {
    // 1. Check if subject exists in Supabase by ID or Name
    const { data: cloudSubRaw } = await supabase
      .from('subject')
      .select('id, name')
      .or(`id.eq.${subjectId},and(user_id.eq.${userId},name.ilike.${resolvedName})`)
      .maybeSingle();

    const cloudSub = cloudSubRaw as any;
    if (cloudSub) {
      if (cloudSub.id !== subjectId) {
        updateCustomSubjectId(subjectId, cloudSub.id);
      }
      return cloudSub.id;
    }

    // 2. Insert new subject with subjectId so local & cloud share the exact same UUID
    const newId = isUuid(subjectId) ? subjectId : generateUuid();
    const { data: inserted, error } = await supabase
      .from('subject')
      .insert({
        id: newId,
        user_id: userId,
        name: resolvedName,
        track: track === 'all' ? 'jee_nsep' : track,
      } as never)
      .select('id')
      .single();

    if (!error && inserted) {
      if (newId !== subjectId) {
        updateCustomSubjectId(subjectId, (inserted as any).id);
      }
      return (inserted as any).id;
    }

    // If conflict on name, fetch existing
    const { data: existingRaw } = await supabase
      .from('subject')
      .select('id')
      .ilike('name', resolvedName)
      .maybeSingle();
    const existing = existingRaw as any;
    if (existing) {
      updateCustomSubjectId(subjectId, existing.id);
      return existing.id;
    }
  } catch (err) {
    console.warn('ensureSubjectInCloud exception:', err);
  }

  return subjectId;
}

/**
 * Ensures that a chapter and its parent subject exist in Supabase.
 * Inserts the chapter into Supabase if missing so foreign key constraints on task.chapter_id never fail.
 */
export async function ensureChapterInCloud(
  userId: string,
  chapterId: string
): Promise<string> {
  if (!userId) return chapterId;

  const standard = ALL_STANDARD_CHAPTERS.find((c) => c.id === chapterId);
  if (standard) return standard.id;

  const localChaps = getCustomChapters();
  const foundChap = localChaps.find((c) => c.id === chapterId);
  if (!foundChap) return chapterId;

  try {
    // 1. Ensure parent subject exists in Supabase
    const cloudSubjectId = await ensureSubjectInCloud(
      userId,
      foundChap.subjectId,
      foundChap.subjectName,
      foundChap.track
    );

    // 2. Check if chapter already exists in Supabase
    const { data: cloudChapRaw } = await supabase
      .from('chapter')
      .select('id, name')
      .or(`id.eq.${chapterId},and(user_id.eq.${userId},subject_id.eq.${cloudSubjectId},name.ilike.${foundChap.name})`)
      .maybeSingle();

    const cloudChap = cloudChapRaw as any;
    if (cloudChap) {
      if (cloudChap.id !== chapterId) {
        updateCustomChapterId(chapterId, cloudChap.id);
      }
      return cloudChap.id;
    }

    // 3. Insert chapter into Supabase with chapterId
    const newId = isUuid(chapterId) ? chapterId : generateUuid();
    const { data: inserted, error } = await supabase
      .from('chapter')
      .insert({
        id: newId,
        user_id: userId,
        subject_id: cloudSubjectId,
        name: foundChap.name,
      } as never)
      .select('id')
      .single();

    if (!error && inserted) {
      // Upsert initial progress
      await supabase.from('user_chapter_progress').upsert({
        user_id: userId,
        chapter_id: newId,
        status: foundChap.status || 'not_started',
        confidence_score: foundChap.confidence || 50,
      } as never, { onConflict: 'user_id,chapter_id' });

      if (newId !== chapterId) {
        updateCustomChapterId(chapterId, newId);
      }
      return newId;
    }
  } catch (err) {
    console.warn('ensureChapterInCloud exception:', err);
  }

  return chapterId;
}

/**
 * Bi-directional sync for custom subjects between local storage and Supabase.
 */
export async function syncCustomSubjectsToCloud(userId: string) {
  if (!userId) return;
  const localSubjects = getCustomSubjects();
  const hiddenSubs = getHiddenSubjects();
  const hiddenSubNames = new Set(hiddenSubs.map((h) => h.toLowerCase()));

  try {
    // 1. Fetch existing user subjects from Supabase
    const { data: cloudSubjects, error } = await supabase
      .from('subject')
      .select('id, name, track')
      .eq('user_id', userId);

    if (error) {
      console.warn('Could not fetch cloud subjects for sync:', error);
      return;
    }

    const cloudList = (cloudSubjects as any[]) ?? [];

    // 2. Push any new local subjects up to cloud or align IDs (skip hidden/deleted)
    for (const sub of localSubjects) {
      if (hiddenSubs.includes(sub.id) || hiddenSubNames.has(sub.name.toLowerCase())) {
        continue;
      }

      const matchInCloud = cloudList.find(
        (cs) => cs.id === sub.id || (cs.name ?? '').toLowerCase() === sub.name.toLowerCase()
      );

      if (matchInCloud) {
        if (matchInCloud.id !== sub.id) {
          updateCustomSubjectId(sub.id, matchInCloud.id);
          sub.id = matchInCloud.id;
        }
      } else {
        const newId = isUuid(sub.id) ? sub.id : generateUuid();
        const { error: insertError } = await supabase.from('subject').insert({
          id: newId,
          user_id: userId,
          name: sub.name,
          track: sub.track === 'all' ? 'college_cs_aiml' : sub.track || 'college_cs_aiml',
        } as never);

        if (!insertError) {
          sub.id = newId;
        }
      }
    }

    // 3. Pull down any custom subjects created on another device
    for (const cs of cloudList) {
      if (hiddenSubs.includes(cs.id) || hiddenSubNames.has((cs.name ?? '').toLowerCase())) {
        continue;
      }
      if (!localSubjects.some((ls) => ls.name.toLowerCase() === (cs.name ?? '').toLowerCase() || ls.id === cs.id)) {
        localSubjects.push({
          id: cs.id,
          name: cs.name,
          track: cs.track || 'college_cs_aiml',
        });
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
 * Uploads all locally stored custom chapters to Supabase and pulls down cloud chapters.
 */
export async function syncCustomChaptersToCloud(userId: string) {
  if (!userId) return;
  const localChapters = getCustomChapters();
  const hiddenChapters = getHiddenChapters();
  const hiddenSubjects = getHiddenSubjects();
  const hiddenSubNames = new Set(hiddenSubjects.map((h) => h.toLowerCase()));

  try {
    const { data: cloudChapters, error } = await supabase
      .from('chapter')
      .select('id, name, subject_id')
      .eq('user_id', userId);

    if (error) {
      console.warn('Could not fetch cloud chapters for sync:', error);
      return;
    }

    const cloudList = (cloudChapters as any[]) ?? [];
    const localSubjects = getCustomSubjects();
    const subMap = new Map<string, string>();
    for (const s of [...ALL_STANDARD_SUBJECTS, ...localSubjects]) {
      subMap.set(s.id, s.name);
    }

    // Push local chapters to cloud (skip hidden/deleted)
    for (const chap of localChapters) {
      if (
        hiddenChapters.includes(chap.id) ||
        hiddenSubjects.includes(chap.subjectId) ||
        hiddenSubNames.has(chap.subjectName.toLowerCase())
      ) {
        continue;
      }

      const validSubjectId = await ensureSubjectInCloud(
        userId,
        chap.subjectId,
        chap.subjectName,
        chap.track
      );

      const matchInCloud = cloudList.find(
        (cc) =>
          cc.id === chap.id ||
          (cc.subject_id === validSubjectId && (cc.name ?? '').toLowerCase() === chap.name.toLowerCase())
      );

      if (matchInCloud) {
        if (matchInCloud.id !== chap.id) {
          updateCustomChapterId(chap.id, matchInCloud.id);
          chap.id = matchInCloud.id;
        }
      } else {
        const newId = isUuid(chap.id) ? chap.id : generateUuid();
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
            status: chap.status || 'not_started',
            confidence_score: chap.confidence || 50,
          } as never, { onConflict: 'user_id,chapter_id' });
        }
      }
    }

    // Pull down any cloud chapters created on another device into local chapters
    for (const cc of cloudList) {
      if (hiddenChapters.includes(cc.id) || hiddenSubjects.includes(cc.subject_id)) {
        continue;
      }

      const realSubName = subMap.get(cc.subject_id) || 'Custom Subject';
      if (hiddenSubNames.has(realSubName.toLowerCase())) {
        continue;
      }

      const existingIndex = localChapters.findIndex(
        (lc) => lc.id === cc.id || (lc.subjectId === cc.subject_id && lc.name.toLowerCase() === (cc.name ?? '').toLowerCase())
      );

      if (existingIndex >= 0) {
        localChapters[existingIndex].id = cc.id;
        localChapters[existingIndex].subjectId = cc.subject_id;
        if (!localChapters[existingIndex].subjectName || localChapters[existingIndex].subjectName === 'Custom Subject') {
          localChapters[existingIndex].subjectName = realSubName;
        }
      } else {
        localChapters.push({
          id: cc.id,
          name: cc.name,
          subjectId: cc.subject_id,
          subjectName: realSubName,
          track: 'college_cs_aiml',
          status: 'not_started',
          confidence: 50,
          unresolvedMistakes: 0,
        });
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
 * Bi-directional sync for chapter overrides & user_chapter_progress.
 * Pushes local progress to Supabase and pulls cloud progress to localStorage and Dexie.
 */
export async function syncChapterOverridesToCloud(userId: string) {
  if (!userId) return;
  const overrides = getChapterOverrides();

  try {
    // 1. Push local overrides to Supabase
    const entries = Object.entries(overrides);
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

    // 2. Pull down cloud progress from Supabase into overrides and Dexie
    const { data: cloudProgress, error } = await supabase
      .from('user_chapter_progress')
      .select('chapter_id, status, confidence_score')
      .eq('user_id', userId);

    if (!error && cloudProgress && cloudProgress.length > 0) {
      for (const cp of cloudProgress as any[]) {
        if (cp.chapter_id && cp.status) {
          overrides[cp.chapter_id] = {
            status: cp.status,
            confidence: cp.confidence_score ?? 50,
          };

          // Also update Dexie db.progress cache
          try {
            const existingProgress = await db.progress
              .where({ user_id: userId, chapter_id: cp.chapter_id })
              .first();
            if (existingProgress && existingProgress.id) {
              await db.progress.update(existingProgress.id, {
                status: cp.status,
                confidence_score: cp.confidence_score ?? 50,
              });
            } else {
              await db.progress.add({
                user_id: userId,
                chapter_id: cp.chapter_id,
                status: cp.status,
                confidence_score: cp.confidence_score ?? 50,
                notes: null,
                last_revised_at: null,
              });
            }
          } catch {}
        }
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('orbit_chapter_overrides', JSON.stringify(overrides));
      }
    }
  } catch (err) {
    console.warn('syncChapterOverridesToCloud error:', err);
  }
}

/**
 * Synchronizes hidden/deleted subjects and chapters across devices via Supabase.
 */
export async function syncHiddenCurriculum(userId: string) {
  if (!userId || typeof window === 'undefined') return;

  try {
    const localHiddenSubs = getHiddenSubjects();
    const localHiddenChaps = getHiddenChapters();

    // 1. Fetch cloud hidden preferences from event_log
    const { data, error } = await supabase
      .from('event_log')
      .select('metadata, created_at')
      .eq('user_id', userId)
      .eq('event_type', 'chapter_status_updated')
      .order('created_at', { ascending: false })
      .limit(10);

    let cloudHiddenSubs: string[] = [];
    let cloudHiddenChaps: string[] = [];

    if (!error && data) {
      for (const row of data as any[]) {
        if (row.metadata?.preference === 'hidden_curriculum') {
          cloudHiddenSubs = row.metadata.hidden_subjects ?? [];
          cloudHiddenChaps = row.metadata.hidden_chapters ?? [];
          break;
        }
      }
    }

    // Merge local and cloud hidden items
    const mergedSubs = Array.from(new Set([...localHiddenSubs, ...cloudHiddenSubs]));
    const mergedChaps = Array.from(new Set([...localHiddenChaps, ...cloudHiddenChaps]));

    // Update local storage so deleted subjects remain deleted on this device
    localStorage.setItem('orbit_hidden_subjects', JSON.stringify(mergedSubs));
    localStorage.setItem('orbit_hidden_chapters', JSON.stringify(mergedChaps));

    // If this device had deleted items not yet recorded in the cloud, push to Supabase
    if (
      mergedSubs.length > cloudHiddenSubs.length ||
      mergedChaps.length > cloudHiddenChaps.length
    ) {
      await supabase.from('event_log').insert({
        user_id: userId,
        event_type: 'chapter_status_updated',
        metadata: {
          preference: 'hidden_curriculum',
          hidden_subjects: mergedSubs,
          hidden_chapters: mergedChaps,
        },
      } as never);
    }
  } catch (err) {
    console.warn('syncHiddenCurriculum error:', err);
  }
}

/**
 * Bi-directional task synchronization:
 * 1. Pushes real user tasks from Dexie up to Supabase with valid UUIDs.
 * 2. Purges any sample starter tasks so deleted tasks are NEVER resurrected.
 * 3. Pulls cloud tasks down to Dexie so PC & Phone have identical offline caches.
 */
export async function syncTasksBetweenLocalAndCloud(userId: string) {
  if (!userId) return;

  try {
    // Clean up any leaked starter tasks in Supabase for this user
    for (const starterTitle of Array.from(STARTER_TASK_TITLES)) {
      await supabase.from('task').delete().eq('user_id', userId).eq('title', starterTitle);
    }

    // Step 1: Push local offline tasks to Supabase (ONLY real tasks, NEVER starter tasks!)
    const localTasks = await db.tasks.toArray();
    for (const t of localTasks) {
      // If it's a sample starter task, purge it from local Dexie and NEVER upload
      if (isStarterTask(t.title)) {
        await deleteLocalTask(t.id);
        continue;
      }

      if (t.user_id === userId || !t.user_id) {
        const isLegacyId = !isUuid(t.id);
        const realId = isLegacyId ? generateUuid() : t.id;
        const realChapId = resolveChapterId(t.chapter_id);

        // Ensure chapter exists in cloud before upserting task to avoid foreign key failure
        await ensureChapterInCloud(userId, realChapId);

        // Push real custom task to cloud
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

    // Step 2: Pull cloud tasks into local Dexie (excluding any starter tasks)
    const { data: cloudTasks, error: fetchError } = await supabase
      .from('task')
      .select('*')
      .eq('user_id', userId);

    if (!fetchError && cloudTasks) {
      const taskList = (cloudTasks as any[]).filter((ct) => !isStarterTask(ct.title));
      const cloudTaskIds = new Set(taskList.map((ct) => ct.id));

      // Purge any local tasks in Dexie that were deleted in cloud on another device
      for (const lt of localTasks) {
        if ((lt.user_id === userId || !lt.user_id) && !cloudTaskIds.has(lt.id) && !isStarterTask(lt.title)) {
          await deleteLocalTask(lt.id);
        }
      }

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
 * Bi-directional exam synchronization:
 * 1. Pushes any offline created exams to Supabase with valid UUIDs.
 * 2. Purges any sample exams that the user has removed.
 * 3. Pulls cloud exams down to Dexie so PC & Phone have identical test dates.
 */
export async function syncExamsBetweenLocalAndCloud(userId: string) {
  if (!userId) return;

  try {
    const hiddenSampleIds = getHiddenSampleExams();

    // 1. Push local offline exams to Supabase
    const localExams = await db.exams.toArray();
    for (const le of localExams) {
      if (hiddenSampleIds.includes(le.id)) {
        await deleteLocalExam(le.id);
        continue;
      }

      if (le.user_id === userId || !le.user_id) {
        const isLegacyId = !isUuid(le.id);
        const realId = isLegacyId ? generateUuid() : le.id;

        const { error } = await supabase.from('exam').upsert({
          id: realId,
          user_id: userId,
          name: le.name,
          exam_type: le.exam_type,
          exam_date: le.exam_date,
        } as never, { onConflict: 'id' });

        if (!error) {
          if (isLegacyId) {
            await deleteLocalExam(le.id);
            await saveLocalExam({ ...le, id: realId, user_id: userId });
          }
          if (le.chapter_ids && le.chapter_ids.length > 0) {
            const validChapterIds = le.chapter_ids.map(resolveChapterId);
            await supabase.from('exam_chapter').delete().eq('exam_id', realId);
            await supabase
              .from('exam_chapter')
              .insert(validChapterIds.map((chapter_id) => ({ exam_id: realId, chapter_id })) as never);
          }
        }
      }
    }

    // 2. Pull cloud exams into local Dexie
    const { data: cloudExams, error: fetchError } = await supabase
      .from('exam')
      .select('id, name, exam_type, exam_date, created_at')
      .eq('user_id', userId);

    if (!fetchError && cloudExams) {
      const cloudExamIds = new Set((cloudExams as any[]).map((ce) => ce.id));

      // Purge local exams deleted on another device
      for (const le of localExams) {
        if (
          (le.user_id === userId || !le.user_id) &&
          !cloudExamIds.has(le.id) &&
          !hiddenSampleIds.includes(le.id)
        ) {
          await deleteLocalExam(le.id);
        }
      }

      for (const ce of cloudExams as any[]) {
        if (!hiddenSampleIds.includes(ce.id)) {
          const { data: chapData } = await supabase
            .from('exam_chapter')
            .select('chapter_id')
            .eq('exam_id', ce.id);

          const chapter_ids = ((chapData as any[]) ?? []).map((r) => r.chapter_id);

          await saveLocalExam({
            id: ce.id,
            user_id: userId,
            name: ce.name,
            exam_type: ce.exam_type,
            exam_date: ce.exam_date,
            created_at: ce.created_at || new Date().toISOString(),
            chapter_ids,
          });
        }
      }
    }
  } catch (err) {
    console.warn('syncExamsBetweenLocalAndCloud error:', err);
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
    // Stage 1: Sync curriculum preferences and custom subjects
    await syncHiddenCurriculum(userId);
    await syncCustomSubjectsToCloud(userId);

    // Stage 2: Sync custom chapters and chapter overrides with resolved subjects
    await syncCustomChaptersToCloud(userId);
    await syncChapterOverridesToCloud(userId);

    // Stage 3: Sync tasks and exams
    await Promise.allSettled([
      syncTasksBetweenLocalAndCloud(userId),
      syncExamsBetweenLocalAndCloud(userId),
    ]);

    if (typeof window !== 'undefined') {
      localStorage.setItem('orbit_last_synced_at', Date.now().toString());
      notifyDataChanged('cloud-synced');
    }
  } catch (err) {
    console.warn('Orbit background sync error:', err);
  } finally {
    isSyncing = false;
  }
}
