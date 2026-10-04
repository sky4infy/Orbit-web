import type { TrackType, ChapterStatus, ChapterStatusRow, SubjectProgressRow } from '@/types/database.types';
import type { TaskWithChapter } from '@/api/tasks';
import { generateUuid, isUuid } from '@/lib/uuid';

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
  { id: '4232da6e-2d8b-40e6-83a4-9740a55febeb', name: 'Physics', track: 'jee_nsep' as TrackType },
  { id: 'c2d00801-1e33-4db0-bf3e-5eb914ae1ea4', name: 'Chemistry', track: 'jee_nsep' as TrackType },
  { id: 'fb6a103c-6f47-46cc-8d2b-42c3c6c94894', name: 'Mathematics', track: 'jee_nsep' as TrackType },
];

export const CS_SUBJECTS = [
  { id: '0d4c1764-0dce-4a81-9298-c3bf353ddc1d', name: 'Data Structures & Algorithms', track: 'college_cs_aiml' as TrackType },
  { id: 'c25f0d0c-b91b-4fa3-934e-1db2ef7d3a40', name: 'AI & Machine Learning', track: 'college_cs_aiml' as TrackType },
  { id: '6fb8f461-a36d-405b-91c2-33b527056da6', name: 'Web Development & Systems', track: 'college_cs_aiml' as TrackType },
  { id: 'cc120ad1-f1b4-4857-9e08-41451018f2a7', name: 'Core Computer Science', track: 'college_cs_aiml' as TrackType },
];

export const JEE_CHAPTERS: CurriculumChapter[] = [
  // Physics (NSEP + JEE Advanced depth)
  { id: 'ef4adc05-e61b-4d6f-aa28-15271dcb0b03', name: 'Units, Dimensions & Error Analysis', subjectId: '4232da6e-2d8b-40e6-83a4-9740a55febeb', subjectName: 'Physics', track: 'jee_nsep', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: '7037c236-82a4-4b18-844b-3508b1a27a64', name: 'Vectors & Calculus in Physics', subjectId: '4232da6e-2d8b-40e6-83a4-9740a55febeb', subjectName: 'Physics', track: 'jee_nsep', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: 'a291663d-a966-4c42-9c67-a79864b3ad97', name: 'Kinematics: 1D & 2D Motion', subjectId: '4232da6e-2d8b-40e6-83a4-9740a55febeb', subjectName: 'Physics', track: 'jee_nsep', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: 'b069330e-35d3-437d-a707-090b52d7f04e', name: 'Newton Laws of Motion & Friction', subjectId: '4232da6e-2d8b-40e6-83a4-9740a55febeb', subjectName: 'Physics', track: 'jee_nsep', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: 'e61a847b-d45a-45f0-a260-6db53d364f38', name: 'Work, Energy & Power', subjectId: '4232da6e-2d8b-40e6-83a4-9740a55febeb', subjectName: 'Physics', track: 'jee_nsep', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: '76c6add3-639b-4a09-a4ac-4730cfae267e', name: 'Center of Mass, Momentum & Collisions', subjectId: '4232da6e-2d8b-40e6-83a4-9740a55febeb', subjectName: 'Physics', track: 'jee_nsep', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: 'c0917bdf-5875-4cf0-87b1-5c3aca428196', name: 'Rotational Dynamics & Angular Momentum (NSEP Focus)', subjectId: '4232da6e-2d8b-40e6-83a4-9740a55febeb', subjectName: 'Physics', track: 'jee_nsep', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: '9b425db0-2e7a-4ce3-be37-e7dfb55d6eef', name: 'Gravitation & Kepler Laws', subjectId: '4232da6e-2d8b-40e6-83a4-9740a55febeb', subjectName: 'Physics', track: 'jee_nsep', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: '131a4559-71f2-40f0-ba91-43032ac6baf8', name: 'Mechanical Properties of Solids & Fluids', subjectId: '4232da6e-2d8b-40e6-83a4-9740a55febeb', subjectName: 'Physics', track: 'jee_nsep', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: '48d8b15b-3998-477d-a9e7-be52810d78ad', name: 'Thermal Physics & Heat Engines', subjectId: '4232da6e-2d8b-40e6-83a4-9740a55febeb', subjectName: 'Physics', track: 'jee_nsep', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: '1bbe5446-bd74-4de2-b665-77572a3c5bc1', name: 'Simple Harmonic Motion (SHM)', subjectId: '4232da6e-2d8b-40e6-83a4-9740a55febeb', subjectName: 'Physics', track: 'jee_nsep', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: 'fc5741ba-5b5e-48a6-bbf7-071b3e0a37a8', name: 'Mechanical Waves & Sound', subjectId: '4232da6e-2d8b-40e6-83a4-9740a55febeb', subjectName: 'Physics', track: 'jee_nsep', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },

  // Chemistry
  { id: 'eb139dd4-2e86-4bd7-b87f-e8e9f926d567', name: 'Mole Concept & Stoichiometry', subjectId: 'c2d00801-1e33-4db0-bf3e-5eb914ae1ea4', subjectName: 'Chemistry', track: 'jee_nsep', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: '433930e4-5999-41ab-9f42-693c775c3a96', name: 'Atomic Structure & Quantum Numbers', subjectId: 'c2d00801-1e33-4db0-bf3e-5eb914ae1ea4', subjectName: 'Chemistry', track: 'jee_nsep', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: 'a4cb43c6-1914-4cbe-8c36-d178fb5baadf', name: 'Chemical Bonding & Molecular Structure', subjectId: 'c2d00801-1e33-4db0-bf3e-5eb914ae1ea4', subjectName: 'Chemistry', track: 'jee_nsep', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: '9bb82dd4-347e-452b-87dc-f173e845edcd', name: 'Chemical Thermodynamics', subjectId: 'c2d00801-1e33-4db0-bf3e-5eb914ae1ea4', subjectName: 'Chemistry', track: 'jee_nsep', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: '4f46fa2c-a5ae-4f85-8c37-cea8b7b71607', name: 'Chemical & Ionic Equilibrium', subjectId: 'c2d00801-1e33-4db0-bf3e-5eb914ae1ea4', subjectName: 'Chemistry', track: 'jee_nsep', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: '35ba705f-6518-4b5d-9e7b-4806b944bea5', name: 'General Organic Chemistry (GOC)', subjectId: 'c2d00801-1e33-4db0-bf3e-5eb914ae1ea4', subjectName: 'Chemistry', track: 'jee_nsep', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: '66742c16-324a-4968-bdd9-6e9a9e149b5a', name: 'Hydrocarbons (Alkanes, Alkenes, Alkynes)', subjectId: 'c2d00801-1e33-4db0-bf3e-5eb914ae1ea4', subjectName: 'Chemistry', track: 'jee_nsep', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },

  // Mathematics
  { id: 'd22ac6e5-e734-437a-9f5e-cd4a6656abab', name: 'Sets, Relations & Functions', subjectId: 'fb6a103c-6f47-46cc-8d2b-42c3c6c94894', subjectName: 'Mathematics', track: 'jee_nsep', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: '5b2de9a3-36dd-45b2-87bf-e1d020d903f2', name: 'Quadratic Equations & Inequalities', subjectId: 'fb6a103c-6f47-46cc-8d2b-42c3c6c94894', subjectName: 'Mathematics', track: 'jee_nsep', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: '550c960a-9ebf-47e2-8f3a-e62c18a72106', name: 'Sequences & Series (AP, GP, AGP)', subjectId: 'fb6a103c-6f47-46cc-8d2b-42c3c6c94894', subjectName: 'Mathematics', track: 'jee_nsep', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: '6643b471-9f43-4168-9190-066626764a13', name: 'Permutations & Combinations', subjectId: 'fb6a103c-6f47-46cc-8d2b-42c3c6c94894', subjectName: 'Mathematics', track: 'jee_nsep', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: '79d75bad-dbe8-472e-b2cf-601cb58d51e8', name: 'Binomial Theorem', subjectId: 'fb6a103c-6f47-46cc-8d2b-42c3c6c94894', subjectName: 'Mathematics', track: 'jee_nsep', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: '6db3c2ab-04c0-48e5-8d41-d0ae2bbfa3bd', name: 'Straight Lines & Circles', subjectId: 'fb6a103c-6f47-46cc-8d2b-42c3c6c94894', subjectName: 'Mathematics', track: 'jee_nsep', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: '6f84b737-1851-4385-a16d-a7b4820f8b06', name: 'Conic Sections (Parabola, Ellipse, Hyperbola)', subjectId: 'fb6a103c-6f47-46cc-8d2b-42c3c6c94894', subjectName: 'Mathematics', track: 'jee_nsep', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: 'caab7dae-d39a-4112-9250-f3036a569c0a', name: 'Trigonometric Ratios & Identities', subjectId: 'fb6a103c-6f47-46cc-8d2b-42c3c6c94894', subjectName: 'Mathematics', track: 'jee_nsep', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
];

export const CS_CHAPTERS: CurriculumChapter[] = [
  // DSA
  { id: '74d890e7-bdd5-4f5a-9a59-9adf32e055ad', name: 'Arrays, Two Pointers & Sliding Window', subjectId: '0d4c1764-0dce-4a81-9298-c3bf353ddc1d', subjectName: 'Data Structures & Algorithms', track: 'college_cs_aiml', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: '7dbada7e-2869-4762-9a5a-ba02e2af8ba2', name: 'Binary Search & Search on Answer', subjectId: '0d4c1764-0dce-4a81-9298-c3bf353ddc1d', subjectName: 'Data Structures & Algorithms', track: 'college_cs_aiml', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: '59ad8735-a9a0-44a9-9b0c-0288b2fdbb3c', name: 'Trees, BSTs & Binary Lift', subjectId: '0d4c1764-0dce-4a81-9298-c3bf353ddc1d', subjectName: 'Data Structures & Algorithms', track: 'college_cs_aiml', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: 'bf21c40c-ee6a-43c0-b5af-0700e1e4824f', name: 'Heaps & Priority Queues (Top-K)', subjectId: '0d4c1764-0dce-4a81-9298-c3bf353ddc1d', subjectName: 'Data Structures & Algorithms', track: 'college_cs_aiml', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: '4261518f-ed6e-4df9-8ed8-767f861f0d96', name: 'Graphs: BFS, DFS & Topological Sort', subjectId: '0d4c1764-0dce-4a81-9298-c3bf353ddc1d', subjectName: 'Data Structures & Algorithms', track: 'college_cs_aiml', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: '8424d95a-dc78-49f7-be83-deafe5afc280', name: 'Graphs: Dijkstra, Shortest Paths & DSU', subjectId: '0d4c1764-0dce-4a81-9298-c3bf353ddc1d', subjectName: 'Data Structures & Algorithms', track: 'college_cs_aiml', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: '4d89a5d3-1894-4f70-ad00-61898baae6c6', name: 'Dynamic Programming: 1D & Knapsack', subjectId: '0d4c1764-0dce-4a81-9298-c3bf353ddc1d', subjectName: 'Data Structures & Algorithms', track: 'college_cs_aiml', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: '8a17819d-c024-492a-bf42-8b9959cec2f6', name: 'Dynamic Programming: 2D Grids & Strings', subjectId: '0d4c1764-0dce-4a81-9298-c3bf353ddc1d', subjectName: 'Data Structures & Algorithms', track: 'college_cs_aiml', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },

  // AI & ML
  { id: 'ef70e98d-9aa0-4038-bb65-862a82d2b87b', name: 'Linear Algebra & SVD for ML', subjectId: 'c25f0d0c-b91b-4fa3-934e-1db2ef7d3a40', subjectName: 'AI & Machine Learning', track: 'college_cs_aiml', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: '3b23d4fb-c98d-4d3a-8a7b-bc5bd72d4e7b', name: 'Probability, Bayes Rule & Maximum Likelihood', subjectId: 'c25f0d0c-b91b-4fa3-934e-1db2ef7d3a40', subjectName: 'AI & Machine Learning', track: 'college_cs_aiml', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: '8cd6fdc8-b20b-4d99-afab-cc4227503092', name: 'Python, NumPy & Vectorized Pipelines', subjectId: 'c25f0d0c-b91b-4fa3-934e-1db2ef7d3a40', subjectName: 'AI & Machine Learning', track: 'college_cs_aiml', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: '934207a9-c2d1-477c-b4fa-5ac1490debe0', name: 'Classical ML: Logistic, Trees & XGBoost', subjectId: 'c25f0d0c-b91b-4fa3-934e-1db2ef7d3a40', subjectName: 'AI & Machine Learning', track: 'college_cs_aiml', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: '475a048d-75cf-46ba-b803-5e3e24edc210', name: 'Neural Networks: Architectures & Backprop', subjectId: 'c25f0d0c-b91b-4fa3-934e-1db2ef7d3a40', subjectName: 'AI & Machine Learning', track: 'college_cs_aiml', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: 'f894c1c2-28d5-4bb9-8236-65e4e1b6aef3', name: 'PyTorch: Tensors, Autograd & Training Loops', subjectId: 'c25f0d0c-b91b-4fa3-934e-1db2ef7d3a40', subjectName: 'AI & Machine Learning', track: 'college_cs_aiml', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: '387eff1f-9381-4543-8643-572069f4b3d5', name: 'Transformers: Self-Attention & Encoders', subjectId: 'c25f0d0c-b91b-4fa3-934e-1db2ef7d3a40', subjectName: 'AI & Machine Learning', track: 'college_cs_aiml', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },

  // Web Dev & Systems
  { id: 'bb469bf8-e58d-4154-a7c8-dcaa0644c1b7', name: 'HTTP, DNS, TCP/IP & Web Networking', subjectId: '6fb8f461-a36d-405b-91c2-33b527056da6', subjectName: 'Web Development & Systems', track: 'college_cs_aiml', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: '930d88a3-6fdb-4062-afe3-c7c8a9458d55', name: 'Next.js 14 App Router & Server Components', subjectId: '6fb8f461-a36d-405b-91c2-33b527056da6', subjectName: 'Web Development & Systems', track: 'college_cs_aiml', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: '3b71fb7c-56fe-4d8c-bff5-262f1a8a9315', name: 'PostgreSQL Schema Design & Index Optimization', subjectId: '6fb8f461-a36d-405b-91c2-33b527056da6', subjectName: 'Web Development & Systems', track: 'college_cs_aiml', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: 'b875ef6f-7d1a-4432-b9f7-34a495f48da4', name: 'System Design: Redis Caching & Rate Limiting', subjectId: '6fb8f461-a36d-405b-91c2-33b527056da6', subjectName: 'Web Development & Systems', track: 'college_cs_aiml', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },

  // Core CS
  { id: '690412b6-4b2e-4575-9aff-0508d27b790e', name: 'Operating Systems: Concurrency & Semaphores', subjectId: 'cc120ad1-f1b4-4857-9e08-41451018f2a7', subjectName: 'Core Computer Science', track: 'college_cs_aiml', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: '23881ddb-a9a7-44f8-bcc1-38a4c0430ca0', name: 'Database Internals: B-Trees & WAL Logs', subjectId: 'cc120ad1-f1b4-4857-9e08-41451018f2a7', subjectName: 'Core Computer Science', track: 'college_cs_aiml', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
  { id: 'a1ed631b-6b5f-4cf4-8fce-6878b38b0da0', name: 'Computer Networks: Flow Control & Congestion', subjectId: 'cc120ad1-f1b4-4857-9e08-41451018f2a7', subjectName: 'Core Computer Science', track: 'college_cs_aiml', status: 'not_started', confidence: 50, unresolvedMistakes: 0 },
];

/** Legacy Mock string ID mappings -> Real Supabase UUIDs */
export const LEGACY_CHAPTER_MAP: Record<string, string> = {
  // JEE Physics
  'jee-phy-1': 'ef4adc05-e61b-4d6f-aa28-15271dcb0b03',
  'jee-phy-2': '7037c236-82a4-4b18-844b-3508b1a27a64',
  'jee-phy-3': 'a291663d-a966-4c42-9c67-a79864b3ad97',
  'jee-phy-4': 'b069330e-35d3-437d-a707-090b52d7f04e',
  'jee-phy-5': 'e61a847b-d45a-45f0-a260-6db53d364f38',
  'jee-phy-6': 'c0917bdf-5875-4cf0-87b1-5c3aca428196',
  'jee-phy-7': '76c6add3-639b-4a09-a4ac-4730cfae267e',
  'jee-phy-8': '9b425db0-2e7a-4ce3-be37-e7dfb55d6eef',
  'jee-phy-9': '131a4559-71f2-40f0-ba91-43032ac6baf8',
  'jee-phy-10': '48d8b15b-3998-477d-a9e7-be52810d78ad',
  'jee-phy-11': '1bbe5446-bd74-4de2-b665-77572a3c5bc1',
  'jee-phy-12': 'fc5741ba-5b5e-48a6-bbf7-071b3e0a37a8',

  // JEE Chemistry
  'jee-chm-1': 'eb139dd4-2e86-4bd7-b87f-e8e9f926d567',
  'jee-chm-2': '433930e4-5999-41ab-9f42-693c775c3a96',
  'jee-chm-3': 'a4cb43c6-1914-4cbe-8c36-d178fb5baadf',
  'jee-chm-4': '9bb82dd4-347e-452b-87dc-f173e845edcd',
  'jee-chm-5': '4f46fa2c-a5ae-4f85-8c37-cea8b7b71607',
  'jee-chm-6': '35ba705f-6518-4b5d-9e7b-4806b944bea5',
  'jee-chm-7': '66742c16-324a-4968-bdd9-6e9a9e149b5a',

  // JEE Mathematics
  'jee-mth-1': 'd22ac6e5-e734-437a-9f5e-cd4a6656abab',
  'jee-mth-2': '5b2de9a3-36dd-45b2-87bf-e1d020d903f2',
  'jee-mth-3': '550c960a-9ebf-47e2-8f3a-e62c18a72106',
  'jee-mth-4': '6643b471-9f43-4168-9190-066626764a13',
  'jee-mth-5': '79d75bad-dbe8-472e-b2cf-601cb58d51e8',
  'jee-mth-6': '6db3c2ab-04c0-48e5-8d41-d0ae2bbfa3bd',
  'jee-mth-7': '6f84b737-1851-4385-a16d-a7b4820f8b06',
  'jee-mth-8': 'caab7dae-d39a-4112-9250-f3036a569c0a',

  // College CS & AI/ML
  'cs-dsa-1': '74d890e7-bdd5-4f5a-9a59-9adf32e055ad',
  'cs-dsa-2': '7dbada7e-2869-4762-9a5a-ba02e2af8ba2',
  'cs-dsa-3': '59ad8735-a9a0-44a9-9b0c-0288b2fdbb3c',
  'cs-dsa-4': 'bf21c40c-ee6a-43c0-b5af-0700e1e4824f',
  'cs-dsa-5': '4261518f-ed6e-4df9-8ed8-767f861f0d96',
  'cs-dsa-6': '8424d95a-dc78-49f7-be83-deafe5afc280',
  'cs-dsa-7': '4d89a5d3-1894-4f70-ad00-61898baae6c6',
  'cs-dsa-8': '8a17819d-c024-492a-bf42-8b9959cec2f6',

  'cs-ml-1': 'ef70e98d-9aa0-4038-bb65-862a82d2b87b',
  'cs-ml-2': '3b23d4fb-c98d-4d3a-8a7b-bc5bd72d4e7b',
  'cs-ml-3': '8cd6fdc8-b20b-4d99-afab-cc4227503092',
  'cs-ml-4': '934207a9-c2d1-477c-b4fa-5ac1490debe0',
  'cs-ml-5': '475a048d-75cf-46ba-b803-5e3e24edc210',
  'cs-ml-6': 'f894c1c2-28d5-4bb9-8236-65e4e1b6aef3',
  'cs-ml-7': '387eff1f-9381-4543-8643-572069f4b3d5',

  'cs-web-1': 'bb469bf8-e58d-4154-a7c8-dcaa0644c1b7',
  'cs-web-2': '930d88a3-6fdb-4062-afe3-c7c8a9458d55',
  'cs-web-3': '3b71fb7c-56fe-4d8c-bff5-262f1a8a9315',
  'cs-web-4': 'b875ef6f-7d1a-4432-b9f7-34a495f48da4',

  'cs-core-1': '690412b6-4b2e-4575-9aff-0508d27b790e',
  'cs-core-2': '23881ddb-a9a7-44f8-bcc1-38a4c0430ca0',
  'cs-core-3': 'a1ed631b-6b5f-4cf4-8fce-6878b38b0da0',
};

export const LEGACY_SUBJECT_MAP: Record<string, string> = {
  'sub-jee-phy': '4232da6e-2d8b-40e6-83a4-9740a55febeb',
  'sub-jee-chem': 'c2d00801-1e33-4db0-bf3e-5eb914ae1ea4',
  'sub-jee-math': 'fb6a103c-6f47-46cc-8d2b-42c3c6c94894',
  'sub-cs-dsa': '0d4c1764-0dce-4a81-9298-c3bf353ddc1d',
  'sub-cs-aiml': 'c25f0d0c-b91b-4fa3-934e-1db2ef7d3a40',
  'sub-cs-web': '6fb8f461-a36d-405b-91c2-33b527056da6',
  'sub-cs-core': 'cc120ad1-f1b4-4857-9e08-41451018f2a7',
};

const ALL_STANDARD_CHAPTERS = [...JEE_CHAPTERS, ...CS_CHAPTERS];
const ALL_STANDARD_SUBJECTS = [...JEE_SUBJECTS, ...CS_SUBJECTS];

/**
 * Resolves any chapter ID (legacy mock string, name, or real UUID) to a valid Supabase UUID.
 */
export function resolveChapterId(idOrName?: string | null): string {
  if (!idOrName) return 'ef4adc05-e61b-4d6f-aa28-15271dcb0b03';
  if (LEGACY_CHAPTER_MAP[idOrName]) return LEGACY_CHAPTER_MAP[idOrName];
  if (isUuid(idOrName)) return idOrName;

  // Search by exact or fuzzy name
  const trimmed = idOrName.trim().toLowerCase();
  const found = ALL_STANDARD_CHAPTERS.find(
    (c) => c.name.toLowerCase() === trimmed || c.name.toLowerCase().includes(trimmed)
  );
  if (found) return found.id;

  // Default to Units, Dimensions & Error Analysis
  return 'ef4adc05-e61b-4d6f-aa28-15271dcb0b03';
}

/**
 * Resolves any subject ID (legacy mock string, name, or real UUID) to a valid Supabase UUID.
 */
export function resolveSubjectId(idOrName?: string | null): string {
  if (!idOrName) return '4232da6e-2d8b-40e6-83a4-9740a55febeb';
  if (LEGACY_SUBJECT_MAP[idOrName]) return LEGACY_SUBJECT_MAP[idOrName];
  if (isUuid(idOrName)) return idOrName;

  const trimmed = idOrName.trim().toLowerCase();
  const found = ALL_STANDARD_SUBJECTS.find(
    (s) => s.name.toLowerCase() === trimmed || s.name.toLowerCase().includes(trimmed)
  );
  if (found) return found.id;

  // Default to Physics
  return '4232da6e-2d8b-40e6-83a4-9740a55febeb';
}

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
  const resolvedId = resolveChapterId(chapterId);
  const hidden = getHiddenChapters();
  if (!hidden.includes(resolvedId)) {
    hidden.push(resolvedId);
    localStorage.setItem(HIDDEN_CHAPTERS_KEY, JSON.stringify(hidden));
  }
  const custom = getCustomChapters().filter((c) => c.id !== chapterId && c.id !== resolvedId);
  localStorage.setItem(CUSTOM_CHAPTERS_KEY, JSON.stringify(custom));

  const overrides = getChapterOverrides();
  delete overrides[chapterId];
  delete overrides[resolvedId];
  localStorage.setItem(CHAPTER_OVERRIDES_KEY, JSON.stringify(overrides));
}

export function deleteSubject(subjectId: string) {
  if (typeof window === 'undefined') return;
  const resolvedId = resolveSubjectId(subjectId);
  const hidden = getHiddenSubjects();
  if (!hidden.includes(resolvedId)) {
    hidden.push(resolvedId);
    localStorage.setItem(HIDDEN_SUBJECTS_KEY, JSON.stringify(hidden));
  }
  const customSubs = getCustomSubjects().filter((s) => s.id !== subjectId && s.id !== resolvedId);
  localStorage.setItem(CUSTOM_SUBJECTS_KEY, JSON.stringify(customSubs));

  const allChaps = [...JEE_CHAPTERS, ...CS_CHAPTERS, ...getCustomChapters()];
  allChaps.filter((c) => c.subjectId === subjectId || c.subjectId === resolvedId).forEach((c) => deleteChapter(c.id));
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
  const newSub = { id: generateUuid(), name: name.trim(), track };
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
    id: generateUuid(),
    name: data.name.trim(),
    subjectId: resolveSubjectId(data.subjectId),
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
  const resolvedId = resolveChapterId(chapterId);
  const current = overrides[resolvedId] || overrides[chapterId] || {};
  const status = updates.status ?? current.status;
  const confidence = status ? computeConfidence(status) : updates.confidence ?? current.confidence;
  
  const updatedEntry = { ...current, ...updates, status, confidence };
  overrides[resolvedId] = updatedEntry;
  if (chapterId !== resolvedId) {
    overrides[chapterId] = updatedEntry;
  }
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
      const o = overrides[c.id] || (LEGACY_CHAPTER_MAP[c.id] ? overrides[LEGACY_CHAPTER_MAP[c.id]] : undefined);
      const status = o?.status ?? c.status;
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

export const STARTER_TASK_TITLES = new Set([
  'HC Verma Rotational Dynamics: 15 Core MCQs',
  'Chemical Bonding: Molecular Orbital Theory Diagrams',
  'NSEP Section B: 5 Multi-Correct Mechanics Challenge',
  'Circles & Tangents: 10 JEE Advanced Level PYQs',
  'Dynamic Programming: 0/1 Knapsack & Subset Sum Patterns',
  'PyTorch: Implement Multi-Head Attention from Scratch',
  'System Design: Redis Caching & Cache Invalidation Strategies',
  'Operating Systems: Producer-Consumer Concurrency Semaphore Exercise',
  'Wave Optics — Concept Review & Key Formulas',
  'Matrices & Determinants — Previous Year Problems',
  'Electromagnetic Induction — Self-Assessment Test',
  'Rotational Motion — Error Analysis & Mistake Log',
  'Coordination Compounds — NCERT Quick Scan',
]);

export function isStarterTask(title: string): boolean {
  if (!title) return false;
  return STARTER_TASK_TITLES.has(title.trim());
}

export function getStarterTasks(track: TrackType, date: string): TaskWithChapter[] {
  if (track === 'jee_nsep') {
    return [
      {
        id: generateUuid(),
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
          id: 'c0917bdf-5875-4cf0-87b1-5c3aca428196',
          name: 'Rotational Dynamics & Angular Momentum (NSEP Focus)',
          subject: { id: '4232da6e-2d8b-40e6-83a4-9740a55febeb', name: 'Physics' },
        },
      },
      {
        id: generateUuid(),
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
          id: 'a4cb43c6-1914-4cbe-8c36-d178fb5baadf',
          name: 'Chemical Bonding & Molecular Structure',
          subject: { id: 'c2d00801-1e33-4db0-bf3e-5eb914ae1ea4', name: 'Chemistry' },
        },
      },
      {
        id: generateUuid(),
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
          id: 'c0917bdf-5875-4cf0-87b1-5c3aca428196',
          name: 'Rotational Dynamics & Angular Momentum (NSEP Focus)',
          subject: { id: '4232da6e-2d8b-40e6-83a4-9740a55febeb', name: 'Physics' },
        },
      },
      {
        id: generateUuid(),
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
          id: '6db3c2ab-04c0-48e5-8d41-d0ae2bbfa3bd',
          name: 'Straight Lines & Circles',
          subject: { id: 'fb6a103c-6f47-46cc-8d2b-42c3c6c94894', name: 'Mathematics' },
        },
      },
    ];
  }

  // College CS & AI/ML
  return [
    {
      id: generateUuid(),
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
        id: '4d89a5d3-1894-4f70-ad00-61898baae6c6',
        name: 'Dynamic Programming: 1D & Knapsack',
        subject: { id: '0d4c1764-0dce-4a81-9298-c3bf353ddc1d', name: 'Data Structures & Algorithms' },
      },
    },
    {
      id: generateUuid(),
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
        id: '387eff1f-9381-4543-8643-572069f4b3d5',
        name: 'Transformers: Self-Attention & Encoders',
        subject: { id: 'c25f0d0c-b91b-4fa3-934e-1db2ef7d3a40', name: 'AI & Machine Learning' },
      },
    },
    {
      id: generateUuid(),
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
        id: 'b875ef6f-7d1a-4432-b9f7-34a495f48da4',
        name: 'System Design: Redis Caching & Rate Limiting',
        subject: { id: '6fb8f461-a36d-405b-91c2-33b527056da6', name: 'Web Development & Systems' },
      },
    },
    {
      id: generateUuid(),
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
        id: '690412b6-4b2e-4575-9aff-0508d27b790e',
        name: 'Operating Systems: Concurrency & Semaphores',
        subject: { id: 'cc120ad1-f1b4-4857-9e08-41451018f2a7', name: 'Core Computer Science' },
      },
    },
  ];
}
