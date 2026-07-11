// Mirrors supabase/schema.sql exactly.
// Once live, regenerate with:
//   npx supabase gen types typescript --project-id <id> > src/types/database.types.ts

export type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'night';
export type EffortLevel = 'low' | 'medium' | 'high';
export type TaskStatus = 'pending' | 'completed' | 'skipped' | 'moved';
export type IncompleteReason =
  | 'too_difficult' | 'distraction' | 'ran_out_of_time'
  | 'coaching_overran' | 'illness' | 'bad_planning';
export type MistakeType = 'conceptual' | 'calculation' | 'silly' | 'time_pressure' | 'misread_question';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type ChapterStatus = 'not_started' | 'learning' | 'practicing' | 'revision_due' | 'mastered' | 'locked';
export type EventType =
  | 'task_created' | 'task_completed' | 'task_skipped' | 'task_moved'
  | 'mistake_logged' | 'revision_completed' | 'reflection_submitted' | 'study_session_ended'
  | 'chapter_status_updated';

export interface Profile {
  id: string;
  display_name: string;
  created_at: string;
}

export interface Subject {
  id: string;
  name: string;
  created_at: string;
}

export interface Chapter {
  id: string;
  subject_id: string;
  name: string;
  created_at: string;
}

export interface UserChapterProgress {
  id: string;
  user_id: string;
  chapter_id: string;
  confidence_score: number;
  status: ChapterStatus;
  notes: string | null;
  last_revised_at: string | null;
}

/** Row shape of the `my_chapter_status` view — one query, fully joined. */
export interface ChapterStatusRow {
  chapter_id: string;
  chapter_name: string;
  subject_id: string;
  subject_name: string;
  status: ChapterStatus;
  confidence_score: number;
  notes: string | null;
  last_revised_at: string | null;
  unresolved_mistakes: number;
}

/** Row shape of the `my_subject_progress` view. */
export interface SubjectProgressRow {
  subject_id: string;
  subject_name: string;
  total_chapters: number;
  mastered_count: number;
  revision_due_count: number;
  avg_confidence: number;
}

export interface Task {
  id: string;
  user_id: string;
  chapter_id: string;
  title: string;
  scheduled_date: string;
  time_slot: TimeSlot;
  effort_level: EffortLevel;
  priority: number;
  position: number;
  status: TaskStatus;
  incomplete_reason: IncompleteReason | null;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface StudySession {
  id: string;
  user_id: string;
  task_id: string | null;
  start_time: string;
  end_time: string | null;
  paused_seconds: number;
  created_at: string;
}

export interface Mistake {
  id: string;
  user_id: string;
  chapter_id: string;
  task_id: string | null;
  mistake_type: MistakeType;
  difficulty: Difficulty;
  description: string | null;
  resolved: boolean;
  created_at: string;
}

export interface Revision {
  id: string;
  user_id: string;
  chapter_id: string;
  mistake_id: string | null;
  due_date: string;
  interval_days: number;
  review_count: number;
  success_count: number;
  failure_count: number;
  last_reviewed_at: string | null;
  created_at: string;
}

export interface Reflection {
  id: string;
  user_id: string;
  day: string;
  wins: string | null;
  blockers: string | null;
  tomorrow_focus: string | null;
  sleep_hours: number | null;
  energy_rating: number | null;
  created_at: string;
}

export interface EventLog {
  id: string;
  user_id: string;
  event_type: EventType;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profile: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      subject: { Row: Subject; Insert: Partial<Subject>; Update: Partial<Subject> };
      chapter: { Row: Chapter; Insert: Partial<Chapter>; Update: Partial<Chapter> };
      user_chapter_progress: { Row: UserChapterProgress; Insert: Partial<UserChapterProgress>; Update: Partial<UserChapterProgress> };
      task: { Row: Task; Insert: Partial<Task>; Update: Partial<Task> };
      study_session: { Row: StudySession; Insert: Partial<StudySession>; Update: Partial<StudySession> };
      mistake: { Row: Mistake; Insert: Partial<Mistake>; Update: Partial<Mistake> };
      revision: { Row: Revision; Insert: Partial<Revision>; Update: Partial<Revision> };
      reflection: { Row: Reflection; Insert: Partial<Reflection>; Update: Partial<Reflection> };
      event_log: { Row: EventLog; Insert: Partial<EventLog>; Update: Partial<EventLog> };
    };
  };
}
