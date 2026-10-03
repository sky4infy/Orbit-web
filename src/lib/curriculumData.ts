import type { TrackType, ChapterStatus, ChapterStatusRow, SubjectProgressRow } from '@/types/database.types';
import type { TaskWithChapter } from '@/api/tasks';

export interface CurriculumChapter {
  id: string;
  name: string;
  subjectId: string;
  subjectName: string;
  track: TrackType;
  status: ChapterStatus;
  confidence: number;
  unresolvedMistakes: number;
}

export const JEE_SUBJECTS = [
  { id: 'sub-jee-phy', name: 'Physics', track: 'jee_nsep' as TrackType },
  { id: 'sub-jee-chem', name: 'Chemistry', track: 'jee_nsep' as TrackType },
  { id: 'sub-jee-math', name: 'Mathematics', track: 'jee_nsep' as TrackType },
];

export const CS_SUBJECTS = [
  { id: 'sub-cs-dsa', name: 'Data Structures & Algorithms', track: 'college_cs_aiml' as TrackType },
  { id: 'sub-cs-aiml', name: 'AI & Machine Learning', track: 'college_cs_aiml' as TrackType },
  { id: 'sub-cs-web', name: 'Web Dev & Systems', track: 'college_cs_aiml' as TrackType },
  { id: 'sub-cs-core', name: 'Core Computer Science', track: 'college_cs_aiml' as TrackType },
];

export const JEE_CHAPTERS: CurriculumChapter[] = [
  // Physics (NSEP + JEE Advanced depth)
  { id: 'jee-phy-1', name: 'Units, Dimensions & Error Analysis', subjectId: 'sub-jee-phy', subjectName: 'Physics', track: 'jee_nsep', status: 'mastered', confidence: 85, unresolvedMistakes: 0 },
  { id: 'jee-phy-2', name: 'Vectors & Calculus in Physics', subjectId: 'sub-jee-phy', subjectName: 'Physics', track: 'jee_nsep', status: 'mastered', confidence: 90, unresolvedMistakes: 1 },
  { id: 'jee-phy-3', name: 'Kinematics: 1D & 2D Projectiles', subjectId: 'sub-jee-phy', subjectName: 'Physics', track: 'jee_nsep', status: 'practicing', confidence: 75, unresolvedMistakes: 2 },
  { id: 'jee-phy-4', name: 'Newton Laws of Motion & Friction', subjectId: 'sub-jee-phy', subjectName: 'Physics', track: 'jee_nsep', status: 'practicing', confidence: 70, unresolvedMistakes: 3 },
  { id: 'jee-phy-5', name: 'Work, Energy & Power', subjectId: 'sub-jee-phy', subjectName: 'Physics', track: 'jee_nsep', status: 'learning', confidence: 65, unresolvedMistakes: 2 },
  { id: 'jee-phy-6', name: 'Rotational Dynamics & Angular Momentum (NSEP)', subjectId: 'sub-jee-phy', subjectName: 'Physics', track: 'jee_nsep', status: 'revision_due', confidence: 55, unresolvedMistakes: 5 },
  { id: 'jee-phy-7', name: 'Center of Mass & Collisions', subjectId: 'sub-jee-phy', subjectName: 'Physics', track: 'jee_nsep', status: 'practicing', confidence: 68, unresolvedMistakes: 2 },
  { id: 'jee-phy-8', name: 'Gravitation & Kepler Laws', subjectId: 'sub-jee-phy', subjectName: 'Physics', track: 'jee_nsep', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: 'jee-phy-9', name: 'Fluids & Surface Tension', subjectId: 'sub-jee-phy', subjectName: 'Physics', track: 'jee_nsep', status: 'not_started', confidence: 45, unresolvedMistakes: 0 },
  { id: 'jee-phy-10', name: 'Thermodynamics & Heat Engines', subjectId: 'sub-jee-phy', subjectName: 'Physics', track: 'jee_nsep', status: 'learning', confidence: 60, unresolvedMistakes: 1 },
  { id: 'jee-phy-11', name: 'Simple Harmonic Motion (SHM)', subjectId: 'sub-jee-phy', subjectName: 'Physics', track: 'jee_nsep', status: 'practicing', confidence: 72, unresolvedMistakes: 2 },
  { id: 'jee-phy-12', name: 'Mechanical Waves & Sound', subjectId: 'sub-jee-phy', subjectName: 'Physics', track: 'jee_nsep', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },

  // Chemistry
  { id: 'jee-chm-1', name: 'Mole Concept & Stoichiometry', subjectId: 'sub-jee-chem', subjectName: 'Chemistry', track: 'jee_nsep', status: 'mastered', confidence: 88, unresolvedMistakes: 1 },
  { id: 'jee-chm-2', name: 'Atomic Structure & Quantum Numbers', subjectId: 'sub-jee-chem', subjectName: 'Chemistry', track: 'jee_nsep', status: 'practicing', confidence: 78, unresolvedMistakes: 1 },
  { id: 'jee-chm-3', name: 'Chemical Bonding & Molecular Structure', subjectId: 'sub-jee-chem', subjectName: 'Chemistry', track: 'jee_nsep', status: 'revision_due', confidence: 60, unresolvedMistakes: 3 },
  { id: 'jee-chm-4', name: 'Chemical Thermodynamics', subjectId: 'sub-jee-chem', subjectName: 'Chemistry', track: 'jee_nsep', status: 'learning', confidence: 62, unresolvedMistakes: 2 },
  { id: 'jee-chm-5', name: 'Chemical & Ionic Equilibrium', subjectId: 'sub-jee-chem', subjectName: 'Chemistry', track: 'jee_nsep', status: 'practicing', confidence: 65, unresolvedMistakes: 4 },
  { id: 'jee-chm-6', name: 'General Organic Chemistry (GOC)', subjectId: 'sub-jee-chem', subjectName: 'Chemistry', track: 'jee_nsep', status: 'practicing', confidence: 74, unresolvedMistakes: 2 },
  { id: 'jee-chm-7', name: 'Hydrocarbons (Alkanes, Alkenes, Alkynes)', subjectId: 'sub-jee-chem', subjectName: 'Chemistry', track: 'jee_nsep', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },

  // Mathematics
  { id: 'jee-mth-1', name: 'Sets, Relations & Functions', subjectId: 'sub-jee-math', subjectName: 'Mathematics', track: 'jee_nsep', status: 'mastered', confidence: 85, unresolvedMistakes: 0 },
  { id: 'jee-mth-2', name: 'Quadratic Equations & Inequalities', subjectId: 'sub-jee-math', subjectName: 'Mathematics', track: 'jee_nsep', status: 'practicing', confidence: 76, unresolvedMistakes: 1 },
  { id: 'jee-mth-3', name: 'Sequences & Series (AP, GP, AGP)', subjectId: 'sub-jee-math', subjectName: 'Mathematics', track: 'jee_nsep', status: 'practicing', confidence: 80, unresolvedMistakes: 1 },
  { id: 'jee-mth-4', name: 'Permutations & Combinations', subjectId: 'sub-jee-math', subjectName: 'Mathematics', track: 'jee_nsep', status: 'learning', confidence: 58, unresolvedMistakes: 3 },
  { id: 'jee-mth-5', name: 'Binomial Theorem', subjectId: 'sub-jee-math', subjectName: 'Mathematics', track: 'jee_nsep', status: 'practicing', confidence: 70, unresolvedMistakes: 2 },
  { id: 'jee-mth-6', name: 'Straight Lines & Circles', subjectId: 'sub-jee-math', subjectName: 'Mathematics', track: 'jee_nsep', status: 'revision_due', confidence: 64, unresolvedMistakes: 3 },
  { id: 'jee-mth-7', name: 'Conic Sections (Parabola, Ellipse)', subjectId: 'sub-jee-math', subjectName: 'Mathematics', track: 'jee_nsep', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: 'jee-mth-8', name: 'Trigonometric Ratios & Identities', subjectId: 'sub-jee-math', subjectName: 'Mathematics', track: 'jee_nsep', status: 'mastered', confidence: 82, unresolvedMistakes: 1 },
];

export const CS_CHAPTERS: CurriculumChapter[] = [
  // DSA
  { id: 'cs-dsa-1', name: 'Arrays, Two Pointers & Sliding Window', subjectId: 'sub-cs-dsa', subjectName: 'Data Structures & Algorithms', track: 'college_cs_aiml', status: 'mastered', confidence: 90, unresolvedMistakes: 0 },
  { id: 'cs-dsa-2', name: 'Binary Search & Search on Answer', subjectId: 'sub-cs-dsa', subjectName: 'Data Structures & Algorithms', track: 'college_cs_aiml', status: 'practicing', confidence: 82, unresolvedMistakes: 1 },
  { id: 'cs-dsa-3', name: 'Trees, BSTs & Binary Lift', subjectId: 'sub-cs-dsa', subjectName: 'Data Structures & Algorithms', track: 'college_cs_aiml', status: 'practicing', confidence: 78, unresolvedMistakes: 2 },
  { id: 'cs-dsa-4', name: 'Heaps & Priority Queues (Top-K)', subjectId: 'sub-cs-dsa', subjectName: 'Data Structures & Algorithms', track: 'college_cs_aiml', status: 'mastered', confidence: 88, unresolvedMistakes: 0 },
  { id: 'cs-dsa-5', name: 'Graphs: BFS, DFS & Topological Sort', subjectId: 'sub-cs-dsa', subjectName: 'Data Structures & Algorithms', track: 'college_cs_aiml', status: 'practicing', confidence: 75, unresolvedMistakes: 2 },
  { id: 'cs-dsa-6', name: 'Graphs: Dijkstra, Shortest Paths & DSU', subjectId: 'sub-cs-dsa', subjectName: 'Data Structures & Algorithms', track: 'college_cs_aiml', status: 'revision_due', confidence: 65, unresolvedMistakes: 3 },
  { id: 'cs-dsa-7', name: 'Dynamic Programming: 1D & Knapsack', subjectId: 'sub-cs-dsa', subjectName: 'Data Structures & Algorithms', track: 'college_cs_aiml', status: 'revision_due', confidence: 60, unresolvedMistakes: 4 },
  { id: 'cs-dsa-8', name: 'Dynamic Programming: 2D Grids & Strings', subjectId: 'sub-cs-dsa', subjectName: 'Data Structures & Algorithms', track: 'college_cs_aiml', status: 'learning', confidence: 55, unresolvedMistakes: 3 },

  // AI & ML
  { id: 'cs-ml-1', name: 'Linear Algebra & SVD for ML', subjectId: 'sub-cs-aiml', subjectName: 'AI & Machine Learning', track: 'college_cs_aiml', status: 'mastered', confidence: 85, unresolvedMistakes: 1 },
  { id: 'cs-ml-2', name: 'Probability, Bayes Rule & Maximum Likelihood', subjectId: 'sub-cs-aiml', subjectName: 'AI & Machine Learning', track: 'college_cs_aiml', status: 'practicing', confidence: 74, unresolvedMistakes: 2 },
  { id: 'cs-ml-3', name: 'Python, NumPy & Vectorized Pipelines', subjectId: 'sub-cs-aiml', subjectName: 'AI & Machine Learning', track: 'college_cs_aiml', status: 'mastered', confidence: 92, unresolvedMistakes: 0 },
  { id: 'cs-ml-4', name: 'Classical ML: Logistic, Trees & XGBoost', subjectId: 'sub-cs-aiml', subjectName: 'AI & Machine Learning', track: 'college_cs_aiml', status: 'practicing', confidence: 80, unresolvedMistakes: 1 },
  { id: 'cs-ml-5', name: 'Neural Networks: Architectures & Backprop', subjectId: 'sub-cs-aiml', subjectName: 'AI & Machine Learning', track: 'college_cs_aiml', status: 'practicing', confidence: 78, unresolvedMistakes: 1 },
  { id: 'cs-ml-6', name: 'PyTorch: Tensors, Autograd & Training Loops', subjectId: 'sub-cs-aiml', subjectName: 'AI & Machine Learning', track: 'college_cs_aiml', status: 'practicing', confidence: 75, unresolvedMistakes: 2 },
  { id: 'cs-ml-7', name: 'Transformers: Self-Attention & Encoders', subjectId: 'sub-cs-aiml', subjectName: 'AI & Machine Learning', track: 'college_cs_aiml', status: 'learning', confidence: 62, unresolvedMistakes: 3 },
  { id: 'cs-ml-8', name: 'LLMs: LoRA, Fine-Tuning & Quantization', subjectId: 'sub-cs-aiml', subjectName: 'AI & Machine Learning', track: 'college_cs_aiml', status: 'learning', confidence: 58, unresolvedMistakes: 2 },

  // Web Dev & Systems
  { id: 'cs-web-1', name: 'Next.js 15 App Router & React Server Components', subjectId: 'sub-cs-web', subjectName: 'Web Dev & Systems', track: 'college_cs_aiml', status: 'mastered', confidence: 88, unresolvedMistakes: 0 },
  { id: 'cs-web-2', name: 'TypeScript Advanced Generics & Patterns', subjectId: 'sub-cs-web', subjectName: 'Web Dev & Systems', track: 'college_cs_aiml', status: 'mastered', confidence: 85, unresolvedMistakes: 1 },
  { id: 'cs-web-3', name: 'PostgreSQL, DB Indexing & RLS Policies', subjectId: 'sub-cs-web', subjectName: 'Web Dev & Systems', track: 'college_cs_aiml', status: 'practicing', confidence: 78, unresolvedMistakes: 1 },
  { id: 'cs-web-4', name: 'System Design: Redis Caching & Rate Limiting', subjectId: 'sub-cs-web', subjectName: 'Web Dev & Systems', track: 'college_cs_aiml', status: 'practicing', confidence: 72, unresolvedMistakes: 2 },
  { id: 'cs-web-5', name: 'Docker, Containerization & CI/CD Pipelines', subjectId: 'sub-cs-web', subjectName: 'Web Dev & Systems', track: 'college_cs_aiml', status: 'practicing', confidence: 70, unresolvedMistakes: 1 },

  // Core CS
  { id: 'cs-core-1', name: 'Operating Systems: Concurrency & Semaphores', subjectId: 'sub-cs-core', subjectName: 'Core Computer Science', track: 'college_cs_aiml', status: 'practicing', confidence: 75, unresolvedMistakes: 2 },
  { id: 'cs-core-2', name: 'Computer Networks: TCP/IP Stack & Sockets', subjectId: 'sub-cs-core', subjectName: 'Core Computer Science', track: 'college_cs_aiml', status: 'practicing', confidence: 72, unresolvedMistakes: 1 },
  { id: 'cs-core-3', name: 'DBMS: ACID, Transactions & Isolation Levels', subjectId: 'sub-cs-core', subjectName: 'Core Computer Science', track: 'college_cs_aiml', status: 'mastered', confidence: 84, unresolvedMistakes: 0 },
];

const CUSTOM_SUBJECTS_KEY = 'orbit_custom_subjects';
const CUSTOM_CHAPTERS_KEY = 'orbit_custom_chapters';
const CHAPTER_OVERRIDES_KEY = 'orbit_chapter_overrides';
const HIDDEN_SUBJECTS_KEY = 'orbit_hidden_subjects';
const HIDDEN_CHAPTERS_KEY = 'orbit_hidden_chapters';

export function computeConfidence(status: ChapterStatus, unresolvedMistakes = 0): number {
  let base = 0;
  switch (status) {
    case 'not_started':
    case 'locked':
      base = 0;
      break;
    case 'learning':
      base = 40;
      break;
    case 'revision_due':
      base = 55;
      break;
    case 'practicing':
      base = 75;
      break;
    case 'mastered':
      base = 95;
      break;
    default:
      base = 50;
  }
  const penalty = Math.min(unresolvedMistakes * 5, 25);
  return Math.max(0, base - penalty);
}

export function getHiddenSubjects(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HIDDEN_SUBJECTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getHiddenChapters(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HIDDEN_CHAPTERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function deleteChapter(chapterId: string) {
  if (typeof window === 'undefined') return;
  // 1. Add to hidden chapters
  const hidden = getHiddenChapters();
  if (!hidden.includes(chapterId)) {
    hidden.push(chapterId);
    localStorage.setItem(HIDDEN_CHAPTERS_KEY, JSON.stringify(hidden));
  }
  // 2. Remove from custom chapters if present
  const custom = getCustomChapters().filter((c) => c.id !== chapterId);
  localStorage.setItem(CUSTOM_CHAPTERS_KEY, JSON.stringify(custom));

  // 3. Remove from overrides
  const overrides = getChapterOverrides();
  if (overrides[chapterId]) {
    delete overrides[chapterId];
    localStorage.setItem(CHAPTER_OVERRIDES_KEY, JSON.stringify(overrides));
  }
}

export function deleteSubject(subjectId: string) {
  if (typeof window === 'undefined') return;
  // 1. Add to hidden subjects
  const hidden = getHiddenSubjects();
  if (!hidden.includes(subjectId)) {
    hidden.push(subjectId);
    localStorage.setItem(HIDDEN_SUBJECTS_KEY, JSON.stringify(hidden));
  }
  // 2. Remove from custom subjects if present
  const customSubs = getCustomSubjects().filter((s) => s.id !== subjectId);
  localStorage.setItem(CUSTOM_SUBJECTS_KEY, JSON.stringify(customSubs));

  // 3. Delete all chapters under this subject
  const allChaps = [...JEE_CHAPTERS, ...CS_CHAPTERS, ...getCustomChapters()];
  allChaps.filter((c) => c.subjectId === subjectId).forEach((c) => deleteChapter(c.id));
}

export function getCustomSubjects(): { id: string; name: string; track: TrackType }[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_SUBJECTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addCustomSubject(name: string, track: TrackType) {
  const list = getCustomSubjects();
  const newSub = { id: `custom-sub-${Date.now()}`, name: name.trim(), track };
  list.push(newSub);
  if (typeof window !== 'undefined') {
    localStorage.setItem(CUSTOM_SUBJECTS_KEY, JSON.stringify(list));
  }
  return newSub;
}

export function getCustomChapters(): CurriculumChapter[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_CHAPTERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addCustomChapter(data: {
  name: string;
  subjectId: string;
  subjectName: string;
  track: TrackType;
  status?: ChapterStatus;
  confidence?: number;
}): CurriculumChapter {
  const list = getCustomChapters();
  const initialStatus = data.status ?? 'not_started';
  const newChap: CurriculumChapter = {
    id: `custom-chap-${Date.now()}`,
    name: data.name.trim(),
    subjectId: data.subjectId,
    subjectName: data.subjectName,
    track: data.track,
    status: initialStatus,
    confidence: computeConfidence(initialStatus, 0),
    unresolvedMistakes: 0,
  };
  list.push(newChap);
  if (typeof window !== 'undefined') {
    localStorage.setItem(CUSTOM_CHAPTERS_KEY, JSON.stringify(list));
  }
  return newChap;
}

export function getChapterOverrides(): Record<string, { status?: ChapterStatus; confidence?: number }> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CHAPTER_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveChapterOverride(chapterId: string, updates: { status?: ChapterStatus; confidence?: number }) {
  const overrides = getChapterOverrides();
  const current = overrides[chapterId] || {};
  const status = updates.status ?? current.status;
  // If status is updated or present, link confidence deterministically to status
  const confidence = status ? computeConfidence(status) : updates.confidence ?? current.confidence;
  overrides[chapterId] = { ...current, ...updates, status, confidence };
  if (typeof window !== 'undefined') {
    localStorage.setItem(CHAPTER_OVERRIDES_KEY, JSON.stringify(overrides));
  }
}

export function getCurriculumChapters(track: TrackType): CurriculumChapter[] {
  const hiddenChapters = getHiddenChapters();
  const hiddenSubjects = getHiddenSubjects();

  const base = track === 'all' ? [...JEE_CHAPTERS, ...CS_CHAPTERS] : track === 'jee_nsep' ? JEE_CHAPTERS : CS_CHAPTERS;
  const custom = getCustomChapters().filter((c) => track === 'all' || c.track === track || c.track === 'all');
  const all = [...base, ...custom];
  const overrides = getChapterOverrides();

  return all
    .filter((c) => !hiddenChapters.includes(c.id) && !hiddenSubjects.includes(c.subjectId))
    .map((c) => {
      const o = overrides[c.id];
      const status = o?.status ?? c.status;
      // Derive confidence deterministically from status & mistakes
      const confidence = computeConfidence(status, c.unresolvedMistakes);
      return {
        ...c,
        status,
        confidence,
      };
    });
}

export function getCurriculumSubjects(track: TrackType) {
  const hiddenSubjects = getHiddenSubjects();
  const base = track === 'all' ? [...JEE_SUBJECTS, ...CS_SUBJECTS] : track === 'jee_nsep' ? JEE_SUBJECTS : CS_SUBJECTS;
  const custom = getCustomSubjects().filter((s) => track === 'all' || s.track === track || s.track === 'all');
  return [...base, ...custom].filter((s) => !hiddenSubjects.includes(s.id));
}

export function getStarterTasks(track: TrackType, date: string): TaskWithChapter[] {
  if (track === 'jee_nsep') {
    return [
      {
        id: 'starter-task-1',
        title: 'HC Verma Rotational Dynamics: 15 Core MCQs',
        scheduled_date: date,
        time_slot: 'morning',
        effort_level: 'high',
        priority: 1,
        position: 0,
        status: 'pending',
        incomplete_reason: null,
        estimated_minutes: 50,
        actual_minutes: null,
        chapter: {
          id: 'jee-phy-6',
          name: 'Rotational Dynamics & Angular Momentum (NSEP)',
          subject: { id: 'sub-jee-phy', name: 'Physics' },
        },
      },
      {
        id: 'starter-task-2',
        title: 'Chemical Bonding: Molecular Orbital Theory Diagrams',
        scheduled_date: date,
        time_slot: 'afternoon',
        effort_level: 'medium',
        priority: 2,
        position: 0,
        status: 'pending',
        incomplete_reason: null,
        estimated_minutes: 40,
        actual_minutes: null,
        chapter: {
          id: 'jee-chm-3',
          name: 'Chemical Bonding & Molecular Structure',
          subject: { id: 'sub-jee-chem', name: 'Chemistry' },
        },
      },
      {
        id: 'starter-task-3',
        title: 'NSEP Section B: 5 Multi-Correct Mechanics Challenge',
        scheduled_date: date,
        time_slot: 'evening',
        effort_level: 'high',
        priority: 1,
        position: 0,
        status: 'pending',
        incomplete_reason: null,
        estimated_minutes: 60,
        actual_minutes: null,
        chapter: {
          id: 'jee-phy-6',
          name: 'Rotational Dynamics & Angular Momentum (NSEP)',
          subject: { id: 'sub-jee-phy', name: 'Physics' },
        },
      },
      {
        id: 'starter-task-4',
        title: 'Circles & Tangents: 10 JEE Advanced Level PYQs',
        scheduled_date: date,
        time_slot: 'night',
        effort_level: 'medium',
        priority: 2,
        position: 0,
        status: 'pending',
        incomplete_reason: null,
        estimated_minutes: 45,
        actual_minutes: null,
        chapter: {
          id: 'jee-mth-6',
          name: 'Straight Lines & Circles',
          subject: { id: 'sub-jee-math', name: 'Mathematics' },
        },
      },
    ];
  }

  // College CS & AI/ML
  return [
    {
      id: 'starter-cs-1',
      title: 'Dynamic Programming: 0/1 Knapsack & Subset Sum Patterns',
      scheduled_date: date,
      time_slot: 'morning',
      effort_level: 'high',
      priority: 1,
      position: 0,
      status: 'pending',
      incomplete_reason: null,
      estimated_minutes: 50,
      actual_minutes: null,
      chapter: {
        id: 'cs-dsa-7',
        name: 'Dynamic Programming: 1D & Knapsack',
        subject: { id: 'sub-cs-dsa', name: 'Data Structures & Algorithms' },
      },
    },
    {
      id: 'starter-cs-2',
      title: 'PyTorch: Implement Multi-Head Attention from Scratch',
      scheduled_date: date,
      time_slot: 'afternoon',
      effort_level: 'high',
      priority: 1,
      position: 0,
      status: 'pending',
      incomplete_reason: null,
      estimated_minutes: 60,
      actual_minutes: null,
      chapter: {
        id: 'cs-ml-7',
        name: 'Transformers: Self-Attention & Encoders',
        subject: { id: 'sub-cs-aiml', name: 'AI & Machine Learning' },
      },
    },
    {
      id: 'starter-cs-3',
      title: 'System Design: Redis Caching & Cache Invalidation Strategies',
      scheduled_date: date,
      time_slot: 'evening',
      effort_level: 'medium',
      priority: 2,
      position: 0,
      status: 'pending',
      incomplete_reason: null,
      estimated_minutes: 45,
      actual_minutes: null,
      chapter: {
        id: 'cs-web-4',
        name: 'System Design: Redis Caching & Rate Limiting',
        subject: { id: 'sub-cs-web', name: 'Web Dev & Systems' },
      },
    },
    {
      id: 'starter-cs-4',
      title: 'Operating Systems: Producer-Consumer Concurrency Semaphore Exercise',
      scheduled_date: date,
      time_slot: 'night',
      effort_level: 'medium',
      priority: 3,
      position: 0,
      status: 'pending',
      incomplete_reason: null,
      estimated_minutes: 40,
      actual_minutes: null,
      chapter: {
        id: 'cs-core-1',
        name: 'Operating Systems: Concurrency & Semaphores',
        subject: { id: 'sub-cs-core', name: 'Core Computer Science' },
      },
    },
  ];
}
