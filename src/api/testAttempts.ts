import { generateUuid } from '@/lib/uuid';
import { logEvent } from '@/api/events';
import { logMistake } from '@/api/mistakes';
import { notifyDataChanged } from '@/lib/syncEvents';
import {
  saveLocalTestAttempt,
  getLocalTestAttempts,
  type LocalTestAttempt,
} from '@/lib/db';
import type {
  TestDifficulty,
  TestFumbleFactor,
  RelativeDifficulty,
  SubjectDebriefEntry,
  MistakeType,
} from '@/types/database.types';

export interface RecordTestAttemptInput {
  exam_id?: string | null;
  task_id?: string | null;
  exam_name: string;
  attempt_date?: string;
  is_multi_subject?: boolean;
  score?: number | null;
  max_score?: number | null;
  paper_difficulty: TestDifficulty;
  fumble_factor: TestFumbleFactor;
  relative_difficulty: RelativeDifficulty;
  leaked_chapter_ids: string[];
  subject_breakdown?: SubjectDebriefEntry[];
  student_notes?: string | null;
  notes?: string | null;
  autoCreateMistakes?: boolean;
}

const FUMBLE_TO_MISTAKE_TYPE: Record<TestFumbleFactor, MistakeType> = {
  concept_blindspot: 'conceptual',
  time_panic: 'time_pressure',
  silly_slips: 'calculation',
  in_control: 'conceptual',
};

const FUMBLE_LABELS: Record<TestFumbleFactor, string> = {
  concept_blindspot: 'Formula or concept blankout under exam conditions',
  time_panic: 'Time panic & incomplete execution in test',
  silly_slips: 'Calculation / reading slip in test',
  in_control: 'Targeted error review from test attempt',
};

export async function recordTestAttempt(
  userId: string,
  input: RecordTestAttemptInput
): Promise<LocalTestAttempt> {
  const newId = generateUuid();
  const attemptDate = input.attempt_date || new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();

  // Consolidate all leaked chapter IDs across all subjects if subject_breakdown exists
  let allLeaked = [...input.leaked_chapter_ids];
  if (input.subject_breakdown && input.subject_breakdown.length > 0) {
    for (const sub of input.subject_breakdown) {
      for (const chId of sub.leaked_chapter_ids) {
        if (!allLeaked.includes(chId)) {
          allLeaked.push(chId);
        }
      }
    }
  }

  const attempt: LocalTestAttempt = {
    id: newId,
    user_id: userId || 'local-user',
    exam_id: input.exam_id ?? null,
    task_id: input.task_id ?? null,
    exam_name: input.exam_name.trim(),
    attempt_date: attemptDate,
    is_multi_subject: Boolean(input.is_multi_subject),
    score: input.score ?? null,
    max_score: input.max_score ?? null,
    paper_difficulty: input.paper_difficulty,
    fumble_factor: input.fumble_factor,
    relative_difficulty: input.relative_difficulty,
    leaked_chapter_ids: allLeaked,
    subject_breakdown: input.subject_breakdown,
    student_notes: input.student_notes?.trim() || null,
    notes: input.notes?.trim() || null,
    created_at: now,
  };

  // 1. Instant local persistence in Dexie
  await saveLocalTestAttempt(attempt);

  // 2. Behavioral Telemetry: Log rich test event for future AI and analytics
  const scorePercent =
    attempt.score !== null && attempt.score !== undefined && attempt.max_score && attempt.max_score > 0
      ? Math.round((attempt.score / attempt.max_score) * 100)
      : null;

  logEvent(userId || 'local-user', 'test_attempt_logged', {
    attempt_id: newId,
    exam_id: attempt.exam_id,
    task_id: attempt.task_id,
    exam_name: attempt.exam_name,
    attempt_date: attempt.attempt_date,
    is_multi_subject: attempt.is_multi_subject,
    score: attempt.score,
    max_score: attempt.max_score,
    score_percent: scorePercent,
    paper_difficulty: attempt.paper_difficulty,
    fumble_factor: attempt.fumble_factor,
    relative_difficulty: attempt.relative_difficulty,
    leaked_chapters_count: allLeaked.length,
    leaked_chapter_ids: allLeaked,
    subject_breakdown: attempt.subject_breakdown,
    student_notes: attempt.student_notes,
  }).catch(() => {});

  // 3. Automated Mistake Book Enrollment
  if (input.autoCreateMistakes) {
    if (input.subject_breakdown && input.subject_breakdown.length > 0) {
      // Subject-specific mistake tagging: each subject's chapters get its subject-specific fumble factor!
      for (const sub of input.subject_breakdown) {
        const mType = FUMBLE_TO_MISTAKE_TYPE[sub.fumble_factor] || 'conceptual';
        const label = FUMBLE_LABELS[sub.fumble_factor] || 'Lost marks in test';

        for (const chapId of sub.leaked_chapter_ids) {
          await logMistake({
            user_id: userId,
            chapter_id: chapId,
            mistake_type: mType,
            difficulty: 'medium',
            description: `[${sub.subject_name}] in "${input.exam_name}": ${label}`,
          }).catch((err) => {
            console.warn('Failed to auto-create subject mistake from test debrief:', err);
          });
        }
      }
    } else if (allLeaked.length > 0) {
      // Single-subject fallback
      const mType = FUMBLE_TO_MISTAKE_TYPE[input.fumble_factor] || 'conceptual';
      const label = FUMBLE_LABELS[input.fumble_factor] || 'Lost marks in test';

      for (const chapId of allLeaked) {
        await logMistake({
          user_id: userId,
          chapter_id: chapId,
          mistake_type: mType,
          difficulty: 'medium',
          description: `In "${input.exam_name}": ${label}`,
        }).catch((err) => {
          console.warn('Failed to auto-create mistake from test debrief:', err);
        });
      }
    }
  }

  notifyDataChanged('test-attempt-recorded');
  return attempt;
}

export async function fetchTestAttempts(userId: string): Promise<LocalTestAttempt[]> {
  return getLocalTestAttempts(userId || 'local-user');
}
