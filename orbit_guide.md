# Orbit — Academic Operating System: Master User Guide

> **The Adaptive, Closed-Loop Intelligence Desk for STEM & Computer Science Scholars.**  
> *Official PDF Version available at: [`orbit_guide.pdf`](file:///d:/orbit-web-v2/orbit_guide.pdf)*

---

# Page 1: System Overview, Active Features & Product Roadmap

## 🌟 Executive Summary
Orbit is an intelligent, distraction-free study operating system engineered specifically for high-stakes STEM/JEE and Computer Science scholars. It replaces static to-do lists with an autonomous, closed-loop engine that automatically regulates cognitive fatigue, schedules spaced revisions, and categorizes practice errors.

---

## ⚡ Active Core Features (Ready to Use Right Now)

| Feature | Category | What It Does & Why It Matters |
| :--- | :--- | :--- |
| **The Command Cockpit** (`/planner`) | Core Daily Desk | Organizes study into structured Morning, Afternoon, and Evening sessions. Features dynamic streak tracking, XP leveling, and real-time daily progress rings. |
| **Cognitive Fatigue Shield** | Health Protection | Monitors sleep and energy metrics. If sleep is $<6\text{h}$ or energy $\le 2/5$, the engine automatically throttles high-friction problem sets and caps tactical load to prevent burnout. |
| **FSRS Adaptive Spaced Repetition** | Long-Term Memory | Calculates individualized forgetting curves. Surfaces chapters right before memory decay with an in-place active recall self-assessment (`Again`, `Hard`, `Good`). |
| **Closed-Loop Mistake Book** (`/mistakes`) | High-ROI Improvement | Classifies errors by root cause: *Conceptual, Calculation, Careless, Application,* or *Time Management*. Automatically enrolls the parent chapter for spaced review. |
| **Strict Single-Track Mastery** | Academic Isolation | Guarantees total curriculum isolation. Users are enrolled strictly in **STEM & Olympiad** (JEE Physics, Chem, Math) or **CS & AI** (DSA, AI/ML, OS/DBMS). |
| **Zero-Latency Local-First Sync** | Architecture | Backed by client IndexedDB (Dexie) for 0ms offline interaction, automatically synced with Supabase PostgreSQL cloud storage with Row-Level Security. |

---

## 🔮 What Can Be Implemented Later (Product Roadmap)

Orbit is architected with clean abstraction boundaries to accommodate these planned advanced modules:

1. **Deep Reasoning AI Mentor** (`AI / ML`)  
   Wired LLM inference (Claude / DeepSeek API) to diagnose root conceptual misconceptions directly from logged mistake descriptions.
2. **Focus Duration Analytics** (`Analytics`)  
   Automated telemetry utilizing the existing `study_session` schema to detect focus-fade patterns (e.g. *"Cognitive efficiency dips after 78 minutes"*).
3. **Camera OCR Mistake Ingestion** (`Vision`)  
   Snap a photo of handwritten test scratchwork. Auto-converts math into LaTeX equations and auto-detects calculation flaws.
4. **Peer Focus Circles** (`Social`)  
   Live mutual study rooms utilizing the `orbit_partner_name` schema for real-time Pomodoro accountability and silent co-working.
5. **Anki Deck Export** (`Sync`)  
   One-click export of unresolved mistakes and key review formulas into standard Anki `.apkg` packages for mobile card drilling.
6. **Live Mock Test Mode** (`Simulator`)  
   Full-screen timed test interface simulating the exact NTA JEE / GATE testing terminal with post-exam mistake auto-logging.

---

# Page 2: Tab 1 — `/planner` (The Command Desk)

The Planner is your primary daily cockpit. You spend 90% of your active study day on this screen. It eliminates decision fatigue by showing you exactly what to study right now.

### 1. Managing Daily Tasks
* **Add a Mission:** Click **"+ Add Task"**. Enter a title (e.g., *"Solve 25 Rotational Dynamics MCQs"*), choose a subject/chapter, assign a time slot (Morning, Afternoon, Evening), and set estimated minutes.
* **Check Off Completed Work:** Tap the circle next to any task. Completed tasks trigger positive reinforcement, increment XP, and feed the daily completion ring.
* **Reschedule or Move:** Swipe or click task options to move incomplete tasks to tomorrow without breaking your streak.

### 2. The Daily Orbit Ring
The glowing circular ring at the top displays your percentage completion for the current calendar date. Hitting 100% awards bonus streak protection and unlocks daily mastery levels.

### 3. Deep Work Focus Timer
Click the **Focus Timer** on any task to enter an immersive Pomodoro focus session. It tracks uninterrupted study minutes and records focus sessions to your local database.

### 4. 🛡️ The Fatigue Shield in Action
Click **"Calibrate Plan"** or log your morning check-in:
* **Sleep $<6.0$ Hours:** The engine flags cognitive depletion, caps your daily target to 4 hours max, and hides 3-hour hard problem sets.
* **Low Energy ($\le 2/5$):** Shifts focus to active recall and summary reading rather than new conceptual heavy-lifting.

### 5. The Spaced Revision Chamber
When chapters are due for retention review according to the FSRS forgetting curve, they appear in the **Active Recall Chamber** on your desk:

| Self-Assessment Grade | What It Means | Algorithm Impact |
| :--- | :--- | :--- |
| **Again** | Forgot key concepts or formulas | Resets review interval to 1 day; flags for urgent review. |
| **Hard** | Recalled with heavy mental strain | Expands interval cautiously (e.g., 2–3 days). |
| **Good** | Fast, confident recall | Expands interval exponentially (e.g., 7–14 days). |

*(You can complete revisions right on your planner desk in under 3 minutes).*

---

# Page 3: Tab 2 — `/journey` (Syllabus Mastery Map)

The Journey tab gives you a high-altitude visual radar of your entire syllabus. It tracks your progression from complete novice to full exam-level mastery for every chapter.

### 1. Single-Track Syllabus View
Your Journey tab exclusively displays the curriculum of your enrolled track:
* **STEM Track:** Physics (Mechanics, Thermo, Electrodynamics, Optics), Chemistry (Organic, Physical, Inorganic), Mathematics (Calculus, Vectors, Algebra).
* **CS Track:** Data Structures & Algorithms, Machine Learning & Deep Learning, Database Management Systems, Computer Networks & OS.

### 2. Chapter Mastery Lifecycles
Every chapter moves through 5 distinct academic stages:
* **Not Started:** Untouched material. Ready for initial lectures.
* **Learning:** Currently attending classes or reading theory.
* **Practicing:** Solving PYQs and standard problem sheets.
* **Revision Due:** Memory fading! FSRS algorithm has triggered a review.
* **Mastered:** High confidence ($>85\%$) with zero unresolved errors.

### 3. Confidence Sliders & Quick Update
Click on any subject card to expand its chapters. For each chapter:
* Adjust the **Confidence Slider (0% - 100%)** based on how comfortable you feel solving unassisted exam problems.
* Change the status badge with 1 tap.
* Observe the real-time subject mastery percentage bar update automatically.

### 4. Chapter Detail Screen (`/journey/[chapterId]`)
Clicking directly on any chapter title opens its comprehensive **Academic Dossier**:
* **Mistake History:** View all logged errors specific to this chapter.
* **FSRS Stability Metrics:** View ease factors, review intervals, and next scheduled review date.
* **Chapter Study Notes:** Store key formula cheat-sheets, edge cases, and personal insights.

### 5. Adding Custom Topics
Need to add a specific college elective or coaching-specific submodule? Click **"+ Add Subject"** or **"+ Add Chapter"** to expand your syllabus anytime.

---

# Page 4: Tab 3 — `/mistakes` (The Mistake Vault)

Logging practice and mock-test mistakes is proven to be **3x more effective** for score improvement than passively re-reading notes. Orbit turns your mistakes into an active retention asset.

### 1. How to Log an Error (The 30-Second Habit)
Whenever you miss a question in a practice session or mock exam:
1. Navigate to **`/mistakes`** and tap **"+ Log Mistake"**.
2. Select the **Subject and Chapter** the question belonged to.
3. Type a concise description of the question and the blunder.
4. Tag the **Difficulty** (Easy, Medium, Hard).
5. Select the precise **Root-Cause Taxonomy**.

> **Closed-Loop Automation:** The moment you submit a mistake, Orbit automatically enrolls that chapter into the Spaced Revision queue. You will never have to manually remember to revisit your weak areas.

### 2. The 5-Point Root Cause Taxonomy
Orbit forces you to diagnose *why* you missed the question so you can cure the root symptom:

* **Conceptual:** Fundamental gap in theory. Re-read core theorem or re-watch lecture derivation.
* **Calculation:** Arithmetic or algebraic sign slip. Practice scratchwork neatness & mental math checks.
* **Careless:** Misread question prompt (e.g. *"which of the following is NOT true"*). Highlight keywords during test.
* **Application:** Knew formula, but failed to recognize multi-concept connection in an unfamiliar context.
* **Time Pressure:** Panicked under clock countdown. Drill timed 15-minute speed sprints.

### 3. Resolving Mistakes
Once you re-attempt a question a week later and solve it cleanly unassisted, click **"Resolve"**. It moves out of your active backlog while permanently preserving your error telemetry.

---

# Page 5: Tabs 4 & 5 — `/week` & `/profile`

These final tabs zoom out to manage your weekly tactical rhythm, upcoming exam deadlines, health baselines, and local-first data backups.

### 1. Tab 4: `/week` (Tactical Load Radar)
Provides a bird's-eye view of your next 7 days:
* **Weekly Load Distribution:** Visualizes scheduled study hours per day to prevent front-loading Monday and burning out by Thursday.
* **Exam Horizon:** Displays countdown clocks to your registered milestones (e.g., *"JEE Main Session 1 — 94 days away"* or *"Semester Midterm"*).
* **Syllabus Coverage Blueprint:** Displays what percentage of the test syllabus you have reached *Practicing* or *Mastered* status on.
* **Add Test / Mock:** Click **"+ Add Exam"** to schedule coaching tests and map them to relevant syllabus chapters.

### 2. Tab 5: `/profile` (Health & OS Settings)
* **Academic Track Identity:** View your active enrollment (STEM vs CS). Orbit strictly isolates curricula based on this preference.
* **Accountability Circle:** Set your study partner's name (`partnerName`) for shared focus momentum.
* **Streak & XP Status:** View your cumulative study streak, experience points, and rank tier.

### 3. Data Backups & Offline Portability
Orbit stores everything on your device first via IndexedDB with automatic cloud sync to Supabase Postgres. You always own your data:
* **Export Backup:** Downloads an encrypted `.json` file containing all tasks, mistakes, and revisions.
* **Import Backup:** Instantly restores your entire academic state on any new laptop or browser with 1 click.

### 4. Mobile PWA Installation
To use Orbit like a native app on your phone:
* **iPhone (Safari):** Tap *Share* $\rightarrow$ *"Add to Home Screen"*.
* **Android (Chrome):** Tap *Install App* from the prompt.
* Opens full-screen with 0ms loading lag and works completely offline!

---

## ⚡ The Ideal 3-Minute Daily Routine
* **Morning (1 Min):** Open Orbit on your phone/laptop. Review your daily 3 missions on `/planner`.
* **Midday:** Start the Focus Timer during study blocks. Check off finished tasks.
* **Evening (2 Mins):** Log errors from practice sets into `/mistakes`. Spend 2 minutes in the Spaced Revision Chamber. Sleep well!
