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
  MistakeType,
} from '@/types/database.types';

export interface RecordTestAttemptInput {
  exam_id?: string | null;
  task_id?: string | null;
  exam_name: string;
  attempt_date?: string;
  score?: number | null;
  max_score?: number | null;
  paper_difficulty: TestDifficulty;
  fumble_factor: TestFumbleFactor;
  relative_difficulty: RelativeDifficulty;
  leaked_chapter_ids: string[];
  notes?: string | null;
  autoCreateMistakes?: boolean;
}

export async function recordTestAttempt(
  userId: string,
  input: RecordTestAttemptInput
): Promise<LocalTestAttempt> {
  const newId = generateUuid();
  const attemptDate = input.attempt_date || new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();

  const attempt: LocalTestAttempt = {
    id: newId,
    user_id: userId || 'local-user',
    exam_id: input.exam_id ?? null,
    task_id: input.task_id ?? null,
    exam_name: input.exam_name.trim(),
    attempt_date: attemptDate,
    score: input.score ?? null,
    max_score: input.max_score ?? null,
    paper_difficulty: input.paper_difficulty,
    fumble_factor: input.fumble_factor,
    relative_difficulty: input.relative_difficulty,
    leaked_chapter_ids: input.leaked_chapter_ids,
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
    score: attempt.score,
    max_score: attempt.max_score,
    score_percent: scorePercent,
    paper_difficulty: attempt.paper_difficulty,
    fumble_factor: attempt.fumble_factor,
    relative_difficulty: attempt.relative_difficulty,
    leaked_chapters_count: attempt.leaked_chapter_ids.length,
    leaked_chapter_ids: attempt.leaked_chapter_ids,
  }).catch(() => {});

  // 3. Connect to Mistake Book: If opted-in, automatically generate mistake records
  if (input.autoCreateMistakes && input.leaked_chapter_ids.length > 0) {
    const mistakeTypeMap: Record<TestFumbleFactor, MistakeType> = {
      concept_blindspot: 'conceptual',
      time_panic: 'time_pressure',
      silly_slips: 'calculation',
      in_control: 'conceptual',
    };
    const mistakeType = mistakeTypeMap[input.fumble_factor] || 'conceptual';

    const fumbleLabels: Record<TestFumbleFactor, string> = {
      concept_blindspot: 'Formula or concept blankout under exam conditions',
      time_panic: 'Time panic & incomplete execution in test',
      silly_slips: 'Calculation / reading slip in test',
      in_control: 'Targeted error review from test attempt',
    };

    for (const chapId of input.leaked_chapter_ids) {
      await logMistake({
        user_id: userId,
        chapter_id: chapId,
        mistake_type: mistakeType,
        difficulty: 'medium',
        description: `Lost marks in "${input.exam_name}": ${fumbleLabels[input.fumble_factor]}`,
      }).catch((err) => {
        console.warn('Failed to auto-create mistake from test debrief:', err);
      });
    }
  }

  notifyDataChanged('test-attempt-recorded');
  return attempt;
}

export async function fetchTestAttempts(userId: string): Promise<LocalTestAttempt[]> {
  return getLocalTestAttempts(userId || 'local-user');
}
