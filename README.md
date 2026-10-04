# Orbit — Adaptive Academic Operating System

> **An intelligent, local-first Academic OS for STEM/JEE and College CS/AI-ML students.**  
> Orbit closes the loop between daily study sessions, error logging, cognitive fatigue protection, and long-term memory retention.

---

## 📚 Official User Guide
Complete tab-by-tab walkthrough and executive manual:
* 📄 **[Download Official Master PDF (`orbit_guide.pdf`)](./orbit_guide.pdf)** — Publication-grade 5-page A4 executive manual.
* 📝 **[Read Markdown Guide (`orbit_guide.md`)](./orbit_guide.md)** — Clean GitHub-native documentation.

---

## 🏛 System Architecture

Orbit is engineered with a **dual-layer, local-first architecture**. It pairs zero-latency offline client state (IndexedDB via Dexie.js) with real-time multi-device cloud synchronization and relational integrity (PostgreSQL via Supabase).

```
                      ┌─────────────────────────────────────────┐
                      │          USER / CLIENT SURFACE          │
                      │    Next.js 14 (App Router) + PWA UI     │
                      └────────────────────┬────────────────────┘
                                           │
                                           ▼
      ┌─────────────────────────────────────────────────────────────────────────┐
      │                    UNIFIED ACADEMIC MEMORY ENGINE                       │
      │                     (src/lib/academicState.ts)                          │
      ├────────────────────────────────────┬────────────────────────────────────┤
      │                                    │                                    │
      ▼                                    ▼                                    ▼
┌───────────────┐                  ┌───────────────┐                  ┌───────────────────┐
│ FATIGUE SHIELD│                  │ FSRS RETENTION│                  │  ERROR TAXONOMY   │
│ & CAPACITY    │                  │    ENGINE     │                  │  & AUTO-REVISION  │
│ (Sleep/Energy)│                  │(SM-2 Adaptive)│                  │ (Root-cause Tag)  │
└───────┬───────┘                  └───────┬───────┘                  └─────────┬─────────┘
        │                                  │                                    │
        └──────────────────────────────────┼────────────────────────────────────┘
                                           │
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │            DUAL PERSISTENCE LAYER            │
                    ├──────────────────────────────┬───────────────┤
                    │   LOCAL-FIRST (0ms Latency)  │  CLOUD SYNC   │
                    │      IndexedDB / Dexie       │   Supabase    │
                    │      ('OrbitStudyOS')        │  (Postgres)   │
                    └──────────────────────────────┴───────────────┘
```

### Detailed Component Flow

```mermaid
graph TD
    A[Student Interaction] --> B[Planner / Journey / Mistake Desk]
    B --> C[Academic Memory Engine]
    
    subgraph Cognitive Intelligence
        C --> D[Fatigue Shield: Sleep & Energy Throttling]
        C --> E[FSRS Spaced Repetition Algorithm]
        C --> F[Mistake Taxonomy Engine]
    end
    
    subgraph Local Storage
        D --> G[(Dexie.js / IndexedDB)]
        E --> G
        F --> G
    end

    subgraph Remote Cloud
        G -.->|Background Sync| H[(Supabase Postgres)]
        H --> I[Row Level Security RLS]
        H --> J[Security Invoker Views]
    end
```

---

## ⚡ Core Innovations & Features

### 1. Unified Academic Memory Engine (`src/lib/academicState.ts`)
Consolidates student velocity, active backlogs, mistake taxonomies (conceptual vs. calculation), target exam proximity, and energy profiles into a single reactive state representation.

### 2. Cognitive Capacity & Fatigue Shield (`src/lib/planningEngine.ts`)
* Automatically monitors sleep duration and energy scores.
* When sleep is $< 6.0\text{ h}$ or energy score $\le 2/5$:
  * **Throttles tactical load** by capping total daily hours to $4.0\text{ h}$.
  * **Filters out high-strain problem sets** and complex conceptual tasks.
  * **Prioritizes low-friction active recall** and light revision to prevent cognitive burnout.

### 3. FSRS Adaptive Spaced Repetition (`src/lib/spacedRepetition.ts`)
* Enhanced SM-2 / Free Spaced Repetition Scheduler.
* Dynamically calculates recall stability, difficulty factors, and optimal review intervals:
  $$\text{Interval}_{\text{next}} = \text{Interval}_{\text{prev}} \times \text{Ease Factor} \times \text{Grade Multiplier}$$
* **Error Backlog Dampening:** If a chapter has high unaddressed mistake density, review intervals are automatically compressed to reinforce fragile neural pathways.
* Features an **in-place 3-grade recall chamber** (`Again`, `Hard`, `Good`) directly on the Planner desk.

### 4. Closed-Loop Mistake Book (`src/api/mistakes.ts`)
* Classifies errors into rigorous cognitive categories: `Conceptual`, `Calculation`, `Careless`, `Application`, or `Time Management`.
* Automatically enrolls the underlying syllabus chapter into the spaced repetition queue upon logging an error.

### 5. Strict Single-Track Isolation
* Users are assigned strictly to **one** academic track at a time:
  * **STEM & Olympiad Track:** Physics, Chemistry, and Mathematics with weightage tiers (High, Medium, Low).
  * **College CS & AI-ML Track:** Data Structures & Algorithms, Machine Learning & Deep Learning, DBMS, Operating Systems & Networks.
* Ensures total isolation: switching tracks dynamically filters your chapter progress, active recall queues, and daily tasks with zero cross-contamination.

### 6. Multi-Surface Task Undo Protection
* **Direct Checkmark Toggle:** Accidentally marked a task done? Simply tap the green checkmark again — it immediately restores the task back to active and recalculates the daily Orbit ring.
* **Instant Undo Toast:** A 6-second bottom notification bar provides an instant "Undo" button for accidental misclicks.

### 7. Multi-Device Cloud Synchronization Engine (`src/lib/syncService.ts`)
* **Zero-Loss Offline Migration:** Automatically reconciles local client state (Dexie IndexedDB and `localStorage`) with Supabase PostgreSQL upon user login.
* **Schema Contract Normalization (`src/lib/uuid.ts`):** Guarantees strict RFC 4122 v4 UUID compliance across all mutations, preventing relational foreign-key validation failures.
* **Starter Task Firewall:** Enforces strict boundary separation between mock demonstration tasks and authenticated user accounts, ensuring deleted tasks are never resurrected.
* **Cross-Device Curriculum Sync:** Backs up user-deleted subjects, custom disciplines, and syllabus modifications to Supabase `event_log` and `subject` tables, guaranteeing parity between phone and PC.
* **Single-Execution Reconciliation:** Eliminates UI flicker through idempotent lifecycle guards (`hasInitializedRef`), providing instant in-place updates without full-screen reloads.

### 8. Drift-Proof Focus Engine & Screen WakeLock API (`src/components/FocusTimerModal.tsx`)
* **Timestamp-Delta Precision:** Replaces fragile `setInterval` tick counters with real system timestamp deltas ($\Delta t = \text{Date.now()} - t_{\text{start}}$), completely immune to mobile background tab throttling or phone sleep.
* **Page Visibility API:** Automatically detects when the phone is unlocked or the browser tab is focused (`visibilitychange`) and syncs elapsed seconds down to the exact millisecond.
* **W3C Screen WakeLock:** Keeps the mobile display active during focused study blocks, preventing premature screen timeouts while solving problems on paper. Automatically releases the lock when paused or completed.

---

## 🔮 Product Roadmap (Upcoming Modules)

Orbit is built with clean architectural boundaries to seamlessly integrate the following planned modules:

| Feature | Category | Planned Capability |
| :--- | :--- | :--- |
| **Deep Reasoning Mentor** | AI / LLM | Connect Claude / Gemini / DeepSeek API to diagnose conceptual blindspots directly from logged mistake patterns after initial data accumulation. |
| **OCR Mistake Ingestion** | Vision AI | Snap photos of handwritten scratchwork or test questions; auto-converts math into LaTeX equations and auto-detects calculation slips. |
| **Focus Duration Telemetry** | Analytics | Uses `study_session` logs to detect cognitive efficiency drop-offs (e.g. *"Focus fades after 75 minutes"*). |
| **Peer Focus Circles** | Social Accountability | Silent co-working rooms leveraging `orbit_partner_name` for mutual Pomodoro accountability. |
| **Anki Deck Export** | Retention Sync | 1-click export of unaddressed mistakes and key formulas into standard Anki `.apkg` files for mobile flashcard review. |
| **Mock Test Simulator** | Exam Simulation | Timed full-screen exam simulation replicating the exact NTA JEE / GATE computer terminal interface. |

---

## 🗄️ Database Architecture (Supabase Postgres)

The backend runs on Supabase PostgreSQL with strict Row Level Security (RLS) policies and idempotent setup:

* **`profile`** — User metadata, target exams, sleep and energy preferences.
* **`subject`** — Academic disciplines partitioned by track (`jee_nsep`, `college_cs_aiml`).
* **`chapter`** — Complete syllabus chapters with exam weightage indicators.
* **`user_chapter_progress`** — Personal mastery percentage, confidence score, and status lifecycle.
* **`task`** — Daily atomic tasks with estimated minutes, priority, and energy cost.
* **`study_session`** — Focus sessions with duration analytics.
* **`mistake`** — Logged errors with root cause tagging, photo attachments, and resolution status.
* **`revision`** — Spaced repetition schedule with stability, ease factors, and review counts.
* **`reflection`** — Evening check-ins, fatigue logging, and qualitative notes.
* **`event_log`** — Append-only behavioral event stream for deep work analytics.
* **`exam` & `exam_chapter`** — Mock tests and upcoming milestones mapped to syllabus coverage.

### Pre-computed Performance Views
1. **`my_chapter_status`** — Dynamic chapter-level progress, mistake counts, and revision due dates.
2. **`my_subject_progress`** — Subject-level completion percentage and confidence distribution.
3. **`my_exam_readiness`** — Holistic syllabus readiness score weighted by exam blueprint.

---

## 🚀 Quickstart & Setup

### Prerequisites
* **Node.js LTS** (v18 or v20 recommended)
* A free **[Supabase](https://supabase.com)** account
* A free **[Vercel](https://vercel.com)** account (for production deployment)

### 1. Database Initialization (1-Click)
1. In your Supabase Project dashboard, navigate to the **SQL Editor**.
2. Open **`supabase/complete_orbit_database.sql`** from this repository.
3. Paste and run the entire script. It is **100% idempotent** and will:
   * Create all 12 tables and constraints.
   * Enable Row Level Security (RLS) with self-ownership policies.
   * Configure auth triggers for automatic user onboarding.
   * Seed all 7 curriculum subjects and 49 core syllabus chapters.

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in your project credentials (found in Supabase Dashboard → Settings → API):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

> [!CAUTION]
> The `NEXT_PUBLIC_SUPABASE_URL` must be the bare URL (e.g. `https://xxxx.supabase.co`). Do not append `/rest/v1/`.

### 3. Install & Run Locally
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run production build validation
npm run build
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📱 Progressive Web App (PWA)

Orbit is built as an installable PWA with offline caching:
* **iOS (Safari):** Tap **Share** → **Add to Home Screen**.
* **Android (Chrome):** Tap **Install Orbit** from the browser prompt.
* **Desktop (Chrome/Edge):** Click the **Install** icon in the address bar.

---

## 🌐 Production Deployment (Vercel)

1. Push your code to your GitHub repository:
   ```bash
   git push origin main
   ```
2. In [Vercel](https://vercel.com), import your repository.
3. Add the following **Environment Variables** in Project Settings:
   * `NEXT_PUBLIC_SUPABASE_URL`
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy**. Vercel will output your production URL.

---

## 📁 Repository Structure

```
├── src/
│   ├── api/               # Domain-specific Supabase & Dexie persistence drivers
│   │   ├── chapters.ts
│   │   ├── events.ts
│   │   ├── exams.ts
│   │   ├── gamification.ts
│   │   ├── journey.ts
│   │   ├── mistakes.ts    # Error logging + auto-spaced repetition trigger
│   │   ├── profile.ts
│   │   ├── revisions.ts   # Local-first Dexie spaced repetition queues
│   │   ├── study_sessions.ts
│   │   └── tasks.ts
│   ├── app/               # Next.js App Router pages
│   │   ├── journey/       # Interactive syllabus tree
│   │   ├── login/         # Supabase Auth
│   │   ├── mistakes/      # Mistake Book with error taxonomy
│   │   ├── planner/       # Tactical cockpit & recall chamber
│   │   ├── profile/       # Energy, sleep & account settings
│   │   └── week/          # 7-day tactical load & exam radar
│   ├── components/        # Reusable design system & desk widgets
│   │   ├── AiMentorCard.tsx
│   │   ├── CalibratePlanModal.tsx
│   │   ├── RevisionSession.tsx
│   │   └── ...
│   ├── db/
│   │   └── client.ts      # Dexie.js IndexedDB schema ('OrbitStudyOS')
│   └── lib/               # Intelligence engines & sync utilities
│       ├── academicState.ts   # Unified Academic Memory State
│       ├── curriculumData.ts  # Curriculum taxonomy & ID resolvers
│       ├── planningEngine.ts  # Capacity & Fatigue Shield
│       ├── spacedRepetition.ts# FSRS / SM-2 algorithm
│       ├── syncService.ts     # Multi-device cloud sync engine
│       ├── uuid.ts            # RFC 4122 v4 UUID generator & validator
│       └── supabase.ts        # Supabase Client singleton
├── supabase/
│   └── complete_orbit_database.sql # Consolidated 1-click master schema
└── public/                # Static assets, icons, manifest.json
```

---

## 📄 License
MIT License. Built for dedicated STEM and Computer Science students.
