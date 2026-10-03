-- ============================================================
-- ORBIT — seed.sql (Multi-Curriculum: JEE/NSEP + College CS/AI)
-- Run this in the Supabase SQL editor after migrations.
-- Safe to re-run: uses ON CONFLICT DO NOTHING.
-- ============================================================

alter table subject add column if not exists track text not null default 'jee_nsep';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'subject_name_unique'
  ) then
    alter table subject add constraint subject_name_unique unique (name);
  end if;
end $$;

-- 1. Insert JEE & NSEP Subjects
insert into subject (name, track) values
  ('Physics', 'jee_nsep'),
  ('Chemistry', 'jee_nsep'),
  ('Mathematics', 'jee_nsep'),
  ('Biology', 'jee_nsep')
on conflict (name) do update set track = excluded.track;

-- 2. Insert College CS & AI/ML Subjects
insert into subject (name, track) values
  ('Data Structures & Algorithms', 'college_cs_aiml'),
  ('AI & Machine Learning', 'college_cs_aiml'),
  ('Web Development & Systems', 'college_cs_aiml'),
  ('Core Computer Science', 'college_cs_aiml')
on conflict (name) do update set track = excluded.track;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'chapter_subject_name_unique'
  ) then
    alter table chapter add constraint chapter_subject_name_unique unique (subject_id, name);
  end if;
end $$;

-- ---------- Physics (JEE & NSEP Depth) ----------
insert into chapter (subject_id, name)
select s.id, c.name
from subject s
cross join (values
  ('Units, Dimensions & Error Analysis'),
  ('Vectors & Calculus in Physics'),
  ('Kinematics: 1D & 2D Motion'),
  ('Newton Laws of Motion & Friction'),
  ('Work, Energy & Power'),
  ('Center of Mass, Momentum & Collisions'),
  ('Rotational Dynamics & Moment of Inertia (NSEP Focus)'),
  ('Rolling Motion & Angular Momentum Conservation'),
  ('Gravitation & Planetary Orbits'),
  ('Mechanical Properties of Solids & Fluids'),
  ('Surface Tension & Viscosity'),
  ('Thermal Physics & Calorimetry'),
  ('Kinetic Theory of Gases'),
  ('Thermodynamics & Heat Engines'),
  ('Simple Harmonic Motion & Oscillations'),
  ('Mechanical Waves & Doppler Effect'),
  ('Electrostatics: Field, Potential & Gauss Law'),
  ('Capacitors & Dielectrics'),
  ('Current Electricity & Kirchhoff Laws'),
  ('Magnetic Effects of Current & Biot-Savart'),
  ('Electromagnetic Induction & Faraday Law'),
  ('Alternating Current & LC Oscillations'),
  ('Electromagnetic Waves'),
  ('Ray Optics & Optical Instruments'),
  ('Wave Optics: Interference & Diffraction'),
  ('Dual Nature of Radiation & Matter'),
  ('Atoms & Nuclei'),
  ('Semiconductor Devices')
) as c(name)
where s.name = 'Physics'
on conflict (subject_id, name) do nothing;

-- ---------- Chemistry (JEE) ----------
insert into chapter (subject_id, name)
select s.id, c.name
from subject s
cross join (values
  ('Some Basic Concepts of Chemistry (Mole Concept)'),
  ('Structure of Atom'),
  ('Classification of Elements & Periodicity'),
  ('Chemical Bonding & Molecular Structure'),
  ('Chemical Thermodynamics'),
  ('Chemical & Ionic Equilibrium'),
  ('Redox Reactions'),
  ('Electrochemistry'),
  ('Chemical Kinetics'),
  ('Surface Chemistry'),
  ('p-Block Elements'),
  ('d & f Block Elements'),
  ('Coordination Compounds'),
  ('General Organic Chemistry (GOC) & Reaction Mechanisms'),
  ('Hydrocarbons (Alkanes, Alkenes, Alkynes)'),
  ('Haloalkanes & Haloarenes'),
  ('Alcohols, Phenols & Ethers'),
  ('Aldehydes, Ketones & Carboxylic Acids'),
  ('Amines & Nitrogen Compounds'),
  ('Biomolecules & Polymers')
) as c(name)
where s.name = 'Chemistry'
on conflict (subject_id, name) do nothing;

-- ---------- Mathematics (JEE) ----------
insert into chapter (subject_id, name)
select s.id, c.name
from subject s
cross join (values
  ('Sets, Relations & Functions'),
  ('Complex Numbers & Polar Form'),
  ('Quadratic Equations & Inequalities'),
  ('Sequences, Series & Progressions'),
  ('Permutations & Combinations'),
  ('Binomial Theorem & Expansions'),
  ('Matrices & Determinants'),
  ('Limits, Continuity & Differentiability'),
  ('Applications of Derivatives'),
  ('Indefinite & Definite Integrals'),
  ('Differential Equations'),
  ('Straight Lines & Circles'),
  ('Conic Sections: Parabola, Ellipse, Hyperbola'),
  ('Vector Algebra'),
  ('Three Dimensional Geometry'),
  ('Trigonometric Ratios & Equations'),
  ('Probability & Statistics')
) as c(name)
where s.name = 'Mathematics'
on conflict (subject_id, name) do nothing;

-- ---------- Biology ----------
insert into chapter (subject_id, name)
select s.id, c.name
from subject s
cross join (values
  ('Diversity in Living World'),
  ('Cell Structure and Function'),
  ('Plant Physiology'),
  ('Human Physiology'),
  ('Genetics and Evolution'),
  ('Biotechnology and Its Applications'),
  ('Ecology and Environment')
) as c(name)
where s.name = 'Biology'
on conflict (subject_id, name) do nothing;

-- ---------- Data Structures & Algorithms (College CS) ----------
insert into chapter (subject_id, name)
select s.id, c.name
from subject s
cross join (values
  ('Arrays, Hashing & Prefix Sums'),
  ('Two Pointers & Sliding Window'),
  ('Stacks, Queues & Monotonic Deques'),
  ('Binary Search & Search on Answer'),
  ('Linked Lists & Fast-Slow Pointers'),
  ('Trees, Binary Trees & Tree Traversals'),
  ('Binary Search Trees & Lowest Common Ancestor'),
  ('Tries & Prefix Trees'),
  ('Heaps & Priority Queues (Top-K Problems)'),
  ('Graphs: BFS, DFS & Connected Components'),
  ('Graphs: Dijkstra, Shortest Paths & DSU'),
  ('Dynamic Programming: 1D, Knapsack & Subsets'),
  ('Dynamic Programming: 2D, Grids & State Machines'),
  ('Dynamic Programming: Strings, Intervals & Bitmasks'),
  ('Greedy Algorithms & Intervals'),
  ('Backtracking & Recursion'),
  ('Bit Manipulation & Math for CP')
) as c(name)
where s.name = 'Data Structures & Algorithms'
on conflict (subject_id, name) do nothing;

-- ---------- AI & Machine Learning (College CS) ----------
insert into chapter (subject_id, name)
select s.id, c.name
from subject s
cross join (values
  ('Linear Algebra: Matrix Factorization & Eigenvectors'),
  ('Multivariable Calculus & Gradient Descent'),
  ('Probability, Statistics & Bayes Rule for ML'),
  ('Python, NumPy & Vectorized Computation'),
  ('Data Pipelines: Pandas & Feature Engineering'),
  ('Classical ML: Linear & Logistic Regression'),
  ('Tree Models: Decision Trees, Random Forest & XGBoost'),
  ('Neural Networks: Architectures, Loss & Backprop'),
  ('PyTorch: Tensors, Autograd & Training Loops'),
  ('Computer Vision: CNNs, ResNets & Transfer Learning'),
  ('NLP & Embeddings: Word2Vec, Attention Mechanism'),
  ('Transformers: Self-Attention, Encoders & Decoders'),
  ('LLMs: Pretraining, Fine-Tuning (LoRA) & Prompting'),
  ('RAG Systems: Vector Databases & Retrieval'),
  ('ML Systems: Model Evaluation, Latency & Deployment')
) as c(name)
where s.name = 'AI & Machine Learning'
on conflict (subject_id, name) do nothing;

-- ---------- Web Development & Systems ----------
insert into chapter (subject_id, name)
select s.id, c.name
from subject s
cross join (values
  ('Next.js 15 App Router & React Server Components'),
  ('TypeScript Advanced Typing & Generics'),
  ('State Management: TanStack Query & Zustand'),
  ('Relational Databases: PostgreSQL & Schema Design'),
  ('Database Indexing, Transactions & RLS Policies'),
  ('RESTful APIs, Validation & Error Handling'),
  ('Authentication: JWTs, Sessions & OAuth'),
  ('System Design: Caching with Redis & CDN Strategies'),
  ('System Design: Rate Limiting & Message Queues'),
  ('Real-time Communication: WebSockets & Server-Sent Events'),
  ('DevOps: Docker, Containerization & CI/CD Pipelines')
) as c(name)
where s.name = 'Web Development & Systems'
on conflict (subject_id, name) do nothing;

-- ---------- Core Computer Science ----------
insert into chapter (subject_id, name)
select s.id, c.name
from subject s
cross join (values
  ('Operating Systems: Processes, Threads & CPU Scheduling'),
  ('Operating Systems: Concurrency, Deadlocks & Semaphores'),
  ('Operating Systems: Virtual Memory & Page Replacement'),
  ('Computer Networks: TCP/IP Stack & Socket Programming'),
  ('Computer Networks: DNS, HTTP/HTTPS, SSL/TLS & WebSockets'),
  ('DBMS: Relational Model, Normalization & SQL'),
  ('DBMS: ACID Properties, Transactions & Concurrency Control'),
  ('Low-Level Design: Clean Architecture & SOLID Principles')
) as c(name)
where s.name = 'Core Computer Science'
on conflict (subject_id, name) do nothing;
