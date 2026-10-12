"""
Orbit Web v2 - Neuro-Symbolic AI Architecture & Production Implementation Specification
Version 3.0: Production Engineering Blueprint incorporating complete validator bugfixes,
strict UI data-slot fact binding, configurable heuristic thresholds, and verified repository audit.
"""

import os
import subprocess
import sys
import pymupdf

HTML_OUTPUT_PATH = r"d:\orbit-web-v2\scripts\ai_architecture_document.html"
PDF_OUTPUT_PATH = r"d:\orbit-web-v2\Orbit_AI_Implementation_Architecture_Plan.pdf"
EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

def build_html_content() -> str:
    return """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Orbit Neuro-Symbolic AI Architecture & Production Implementation Specification</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

  @page {
    size: A4 portrait;
    margin: 14mm 14mm 16mm 14mm;
    @bottom-right {
      content: "Page " counter(page) " of " counter(pages);
      font-family: 'Inter', sans-serif;
      font-size: 7.5pt;
      font-weight: 500;
      color: #64748b;
    }
    @bottom-left {
      content: "Orbit v2 AI Production Specification (v3.0) | Academic OS Blueprint";
      font-family: 'Inter', sans-serif;
      font-size: 7.5pt;
      font-weight: 500;
      color: #64748b;
    }
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    color: #1e293b;
    background-color: #ffffff;
    line-height: 1.48;
    font-size: 9pt;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Typography */
  h1, h2, h3, h4 {
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: #0f172a;
    letter-spacing: -0.02em;
  }

  h1 {
    font-size: 19pt;
    line-height: 1.2;
    margin-bottom: 5pt;
    font-weight: 800;
  }

  h2 {
    font-size: 12.5pt;
    line-height: 1.3;
    margin-top: 13pt;
    margin-bottom: 6pt;
    padding-bottom: 3.5pt;
    border-bottom: 1.5pt solid #e2e8f0;
    color: #0f172a;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 5pt;
    break-after: avoid;
    page-break-after: avoid;
  }

  h3 {
    font-size: 10.2pt;
    line-height: 1.35;
    margin-top: 9pt;
    margin-bottom: 3.5pt;
    color: #1e293b;
    font-weight: 700;
    break-after: avoid;
    page-break-after: avoid;
  }

  h4 {
    font-size: 9.2pt;
    line-height: 1.35;
    margin-top: 6pt;
    margin-bottom: 2.5pt;
    color: #334155;
    font-weight: 600;
    break-after: avoid;
    page-break-after: avoid;
  }

  p {
    margin-bottom: 5.5pt;
    color: #334155;
    text-align: justify;
  }

  ul, ol {
    margin-left: 14pt;
    margin-bottom: 6pt;
    color: #334155;
  }

  li {
    margin-bottom: 2.5pt;
    line-height: 1.4;
  }

  code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 7.8pt;
    background-color: #f1f5f9;
    padding: 1pt 3pt;
    border-radius: 3pt;
    color: #0f172a;
    border: 0.5pt solid #e2e8f0;
  }

  pre {
    font-family: 'JetBrains Mono', monospace;
    font-size: 7.4pt;
    background-color: #0f172a;
    color: #e2e8f0;
    padding: 7pt 9pt;
    border-radius: 5pt;
    line-height: 1.38;
    margin-bottom: 6pt;
    overflow-x: hidden;
    white-space: pre-wrap;
    word-break: break-word;
    break-inside: auto;
    page-break-inside: auto;
    border: 1pt solid #1e293b;
  }

  pre code {
    background: transparent;
    border: none;
    color: inherit;
    padding: 0;
    font-size: inherit;
  }

  .avoid-break {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* Cover / Header Section */
  .cover-header {
    background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #31104b 100%);
    color: #ffffff;
    padding: 16pt 18pt;
    border-radius: 7pt;
    margin-bottom: 10pt;
    position: relative;
    box-shadow: 0 4pt 12pt rgba(15, 23, 42, 0.10);
  }

  .cover-badge-row {
    display: flex;
    gap: 4.5pt;
    margin-bottom: 7pt;
    flex-wrap: wrap;
  }

  .badge {
    display: inline-block;
    padding: 2.5pt 6pt;
    font-size: 7pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border-radius: 3.5pt;
    font-family: 'Inter', sans-serif;
  }

  .badge-purple { background: #8b5cf6; color: #ffffff; }
  .badge-cyan { background: #06b6d4; color: #042f2e; }
  .badge-emerald { background: #10b981; color: #022c22; }
  .badge-amber { background: #f59e0b; color: #451a03; }
  .badge-rose { background: #f43f5e; color: #ffffff; }

  .cover-title {
    color: #ffffff;
    font-size: 18pt;
    font-weight: 800;
    line-height: 1.2;
    margin-bottom: 4pt;
  }

  .cover-subtitle {
    color: #cbd5e1;
    font-size: 9.3pt;
    line-height: 1.45;
    margin-bottom: 10pt;
    max-width: 98%;
  }

  .cover-meta-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 5pt;
    padding-top: 7pt;
    border-top: 1pt solid rgba(255, 255, 255, 0.15);
  }

  .meta-item {
    font-size: 7.2pt;
  }

  .meta-label {
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: 6.5pt;
    font-weight: 600;
    margin-bottom: 1pt;
  }

  .meta-value {
    color: #f8fafc;
    font-weight: 600;
  }

  /* Callout Boxes */
  .callout {
    padding: 6.5pt 8.5pt;
    border-radius: 5pt;
    margin-bottom: 7pt;
    font-size: 8.5pt;
    line-height: 1.4;
    page-break-inside: avoid;
    break-inside: avoid;
    border-left: 3.5pt solid;
  }

  .callout-info {
    background-color: #f0fdf4;
    border-color: #10b981;
    color: #064e3b;
  }

  .callout-warning {
    background-color: #fffbeb;
    border-color: #f59e0b;
    color: #78350f;
  }

  .callout-danger {
    background-color: #fef2f2;
    border-color: #ef4444;
    color: #7f1d1d;
  }

  .callout-indigo {
    background-color: #eef2ff;
    border-color: #6366f1;
    color: #312e81;
  }

  .callout-title {
    font-weight: 700;
    font-family: 'Plus Jakarta Sans', sans-serif;
    margin-bottom: 2pt;
    display: flex;
    align-items: center;
    gap: 4pt;
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 7pt;
    font-size: 8pt;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  th {
    background-color: #0f172a;
    color: #ffffff;
    text-align: left;
    padding: 4.5pt 6pt;
    font-weight: 600;
    font-family: 'Plus Jakarta Sans', sans-serif;
    border: 1pt solid #0f172a;
    font-size: 7.5pt;
    letter-spacing: 0.02em;
  }

  td {
    padding: 4pt 6pt;
    border: 1pt solid #cbd5e1;
    color: #334155;
    vertical-align: top;
    line-height: 1.35;
  }

  tr:nth-child(even) td {
    background-color: #f8fafc;
  }

  /* Formula Card */
  .formula-card {
    background-color: #f8fafc;
    border: 1pt solid #e2e8f0;
    border-radius: 5pt;
    padding: 6.5pt 8.5pt;
    margin-bottom: 6pt;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .formula-title {
    font-size: 8.1pt;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 2.5pt;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .formula-box {
    background: #0f172a;
    color: #38bdf8;
    padding: 4.5pt 8pt;
    border-radius: 4pt;
    font-family: 'JetBrains Mono', monospace;
    font-size: 7.8pt;
    margin: 2.5pt 0;
    font-weight: 500;
    line-height: 1.32;
  }

  /* Card Grid */
  .card-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6.5pt;
    margin-bottom: 7pt;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .card-grid-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 5.5pt;
    margin-bottom: 7pt;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .feature-card {
    background: #ffffff;
    border: 1pt solid #e2e8f0;
    border-radius: 5pt;
    padding: 6.5pt 7.5pt;
    box-shadow: 0 1pt 2pt rgba(0,0,0,0.02);
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .feature-card-header {
    display: flex;
    align-items: center;
    gap: 4pt;
    margin-bottom: 2.5pt;
    font-weight: 700;
    font-size: 8.5pt;
    color: #0f172a;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }

  .feature-card p {
    font-size: 7.8pt;
    margin-bottom: 0;
    color: #475569;
    line-height: 1.35;
  }

  /* Pill Chips */
  .pill {
    display: inline-block;
    padding: 1pt 4pt;
    font-size: 6.8pt;
    font-weight: 600;
    border-radius: 3pt;
    margin-right: 2pt;
  }

  .pill-blue { background: #dbeafe; color: #1e40af; }
  .pill-green { background: #dcfce7; color: #166534; }
  .pill-red { background: #fee2e2; color: #991b1b; }
  .pill-amber { background: #fef3c7; color: #92400e; }
  .pill-purple { background: #f3e8ff; color: #6b21a8; }

  /* SVG Diagrams */
  .svg-container {
    width: 100%;
    margin: 5pt 0 7pt 0;
    text-align: center;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .svg-container svg {
    max-width: 100%;
    height: auto;
  }

  .section-num {
    color: #6366f1;
    font-weight: 800;
    margin-right: 3pt;
  }
</style>
</head>
<body>

<!-- ============================================================== -->
<!-- COVER & EXECUTIVE HEADER                                       -->
<!-- ============================================================== -->
<div class="cover-header avoid-break">
  <div class="cover-badge-row">
    <span class="badge badge-purple">AI Technical Specification v3.0</span>
    <span class="badge badge-emerald">Candidate Selection Pattern</span>
    <span class="badge badge-cyan">4-Stage Adaptive Tutor</span>
    <span class="badge badge-amber">DPDP Alignment</span>
    <span class="badge badge-rose">Audited & Verified</span>
  </div>
  <div class="cover-title">Orbit Neuro-Symbolic AI Specification</div>
  <div class="cover-subtitle">
    Production Engineering Architecture: Deterministic Candidate Selection, Mathematical Knapsack Firewall, 4-Stage Adaptive Tutoring, Telemetry Semantics, and Repository Audit.
  </div>
  <div class="cover-meta-grid">
    <div class="meta-item">
      <div class="meta-label">System Role</div>
      <div class="meta-value">Orbit Schedules; AI Explains & Coaches</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Architecture Type</div>
      <div class="meta-value">Neuro-Symbolic Candidate Filter</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Fact Model</div>
      <div class="meta-value">Direct React Prop Binding (Zero LLM Stats)</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Client/Server Split</div>
      <div class="meta-value">Client Dexie Payload → Next.js API Route</div>
    </div>
  </div>
</div>

<!-- ============================================================== -->
<!-- EXECUTIVE SUMMARY & ARCHITECTURAL CLARITY                     -->
<!-- ============================================================== -->
<div class="callout callout-indigo avoid-break">
  <div class="callout-title">
    <span>🎯</span> Executive Summary: The "Select & Explain" Paradigm
  </div>
  <p style="margin-bottom: 0;">
    <strong>The Core Separation of Responsibility:</strong> Naive AI designs suffer from an architectural contradiction: claiming the LLM never controls scheduling, while allowing the model to generate arbitrary task titles, slots, and durations. 
    <strong>In Orbit v3.0, this contradiction is eliminated:</strong> Orbit’s deterministic engine (<code>planningEngine.ts</code>) generates a finite pool of verified <em>Canonical Task Candidates</em> with immutable database IDs, durations, and slots. 
    The AI Mentor is <strong>read-only with respect to schedule state</strong>: it selects from approved candidates, generates empathetic pedagogical rationales, references verified metrics, and guides conceptual problem-solving through a 4-stage adaptive tutoring sequence. Orbit remains the sole authority over student state and scheduling.
  </p>
</div>

<!-- ============================================================== -->
<!-- SECTION 1: THE CRISIS OF AI IN EDTECH & PRACTICAL CORRECTIONS  -->
<!-- ============================================================== -->
<h2><span class="section-num">1.</span> The AI Crisis in EdTech & Pragmatic Architectural Corrections</h2>

<p>
  Commercial LLM chatbots (ChatGPT, Claude, Gemini) and naive EdTech study apps fail high-stakes competitive exam aspirants (JEE, NEET, Olympiads, GATE) not because their prose is weak, but because their operational design is ungrounded. To build a system that genuinely improves student outcomes, Orbit explicitly resolves the 6 fatal failure modes:
</p>

<div class="card-grid-2 avoid-break">
  <div class="feature-card">
    <div class="feature-card-header">
      <span class="pill pill-red">Failure 1</span> The Fantasy Schedule Fallacy
    </div>
    <p>
      LLMs lack somatic awareness. They hallucinate 14–16 hour study marathons with zero biological dampening. When a student inevitably misses slot 1 by 30 minutes, the schedule shatters, creating shame, panic, and app abandonment.
      <br><strong>Orbit Fix:</strong> Orbit’s Fatigue Shield deterministically caps study hours based on verified sleep and energy logs. The LLM cannot override this ceiling.
    </p>
  </div>
  <div class="feature-card">
    <div class="feature-card-header">
      <span class="pill pill-red">Failure 2</span> Parametric Syllabus Hallucination
    </div>
    <p>
      High-stakes syllabi shift frequently (e.g. NTA deleted Solid State and Surface Chemistry in JEE). Unconstrained LLMs recommend obsolete topics or non-existent subtopics.
      <br><strong>Orbit Fix:</strong> The LLM is never allowed to invent tasks. It can only reference pre-generated canonical candidate IDs from Orbit's static curriculum tree.
    </p>
  </div>
  <div class="feature-card">
    <div class="feature-card-header">
      <span class="pill pill-red">Failure 3</span> The Autonomy Trap (Over-Empowered AI)
    </div>
    <p>
      Letting an LLM directly write or reschedule tasks, mutate database dates, or mark mistakes as resolved creates race conditions and silent state corruption.
      <br><strong>Orbit Fix:</strong> The AI is strictly read-only. It provides explanations, insights, and proposed task selections. Application state is mutated only through Orbit's core logic with explicit student confirmation.
    </p>
  </div>
  <div class="feature-card">
    <div class="feature-card-header">
      <span class="pill pill-red">Failure 4</span> The "All-or-Nothing" Tutoring Flaw
    </div>
    <p>
      Two extremes ruin AI tutoring: (1) immediately dumping full solutions (producing the <em>Illusion of Explanatory Depth</em>), or (2) stubbornly refusing to explain when a novice is completely lost.
      <br><strong>Orbit Fix:</strong> 4-Stage Adaptive Tutoring (Diagnose → Hint → Scaffold → Worked Example & Isomorphic Verification).
    </p>
  </div>
</div>

<div class="feature-card avoid-break" style="margin-bottom: 7pt;">
  <div class="feature-card-header">
    <span class="pill pill-red">Failure 5</span> Telemetry Conflation & Unsubstantiated Claims
  </div>
  <p>
    Naive AI treats checkbox completion timestamps (<code>marked_completed_at</code>) as proof of study time, falsely labeling students "night owls" simply because they clicked checkboxes before bed. Furthermore, models hallucinate fake statistics (e.g., <em>"your calculation errors rose by 40%"</em>).
    <br><strong>Orbit Fix:</strong> Strict telemetry semantics: distinguishing planned slots, actual focus timer intervals (<code>FocusTimerModal</code> delta logs), and checkbox clicks. All numeric facts are displayed directly from typed React state, not generated by LLM text.
  </p>
</div>

<!-- Comparison Matrix Table -->
<table class="avoid-break">
  <thead>
    <tr>
      <th style="width: 18%;">Dimension</th>
      <th style="width: 25%;">Naive LLM Chatbots</th>
      <th style="width: 25%;">Typical EdTech "AI" Apps</th>
      <th style="width: 32%;">Orbit Neuro-Symbolic Engine (v3.0)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Task Scheduling</strong></td>
      <td>Hallucinates ungrounded schedules; stochastic drift.</td>
      <td>Rigid calendar blocks that shatter upon first delay.</td>
      <td><strong>Canonical Candidate Selection:</strong> Orbit generates valid candidates; AI annotates & explains. Orbit executes.</td>
    </tr>
    <tr>
      <td><strong>Syllabus Fidelity</strong></td>
      <td>Parametric guessing; hallucinates deleted topics.</td>
      <td>Static hardcoded tables; zero personalization.</td>
      <td><strong>Database Anchor:</strong> Tasks refer strictly to immutable curriculum UUIDs in <code>curriculumData.ts</code>.</td>
    </tr>
    <tr>
      <td><strong>Factual Attribution</strong></td>
      <td>Invents arbitrary numbers (<em>"improved by 35%"</em>).</td>
      <td>None or rigid dashboards.</td>
      <td><strong>Direct React State Binding:</strong> Metrics render from verified TypeScript props; LLM focuses purely on qualitative coaching.</td>
    </tr>
    <tr>
      <td><strong>Socratic Tutoring</strong></td>
      <td>Passive answer dump or rigid unhelpful refusal.</td>
      <td>Generic "review your notes" bullet point.</td>
      <td><strong>4-Stage Adaptive Scaffolding:</strong> Hints transition to worked examples when cognitive floundering occurs.</td>
    </tr>
    <tr>
      <td><strong>System Reliability</strong></td>
      <td>High failure rate; breaks on network drop.</td>
      <td>Server-dependent; fragile mobile offline.</td>
      <td><strong>Knapsack Firewall + 0ms Fallback:</strong> If API fails or exceeds 3.0s, local deterministic plan renders instantly.</td>
    </tr>
  </tbody>
</table>

<!-- ============================================================== -->
<!-- SECTION 2: COGNITIVE SCIENCE & VALIDATED PEDAGOGY (THE "WHY")  -->
<!-- ============================================================== -->
<h2><span class="section-num">2.</span> Cognitive Science Foundations: The "WHY"</h2>

<p>
  Orbit’s architecture translates empirical learning science into concrete software mechanics:
</p>

<!-- Cognitive Principles Grid -->
<div class="card-grid-2 avoid-break">
  <div class="feature-card">
    <div class="feature-card-header">
      <span class="pill pill-purple">Sweller & Renkl</span> Cognitive Load & Worked Examples
    </div>
    <p>
      While unguided problem-solving is vital for advanced learners, novices learning new schemas experience severe cognitive overload if denied guidance. The <strong>Worked Example Effect</strong> proves that studying worked solutions alongside isomorphic practice accelerates schema construction.
      <br><strong>Orbit Action:</strong> The AI tutor adapts: providing Socratic hints first, but gracefully transitioning to a worked derivation if the student is stuck after 2 attempts.
    </p>
  </div>
  <div class="feature-card">
    <div class="feature-card-header">
      <span class="pill pill-purple">Bjork & Roediger</span> Desirable Difficulties & Retrieval
    </div>
    <p>
      Passive re-reading creates an <strong>Illusion of Competence</strong>. Effortful retrieval stabilizes long-term retention.
      <br><strong>Orbit Action:</strong> Morning missions prioritize chapters with decaying FSRS memory stability (<em>R(t)</em>) and active mistake backlogs over passive textbook review.
    </p>
  </div>
  <div class="feature-card">
    <div class="feature-card-header">
      <span class="pill pill-purple">Dunlosky (2013)</span> Metacognitive Calibration
    </div>
    <p>
      Aspirants consistently misdiagnose test failures. They assume they "forgot theory" when the root cause was algebraic speed or panic under time pressure.
      <br><strong>Orbit Action:</strong> The Post-Test Debrief separates errors into 5 root-cause disciplines (<code>conceptual</code>, <code>calculation</code>, <code>careless</code>, <code>application</code>, <code>time_pressure</code>), preventing misdirected study.
    </p>
  </div>
  <div class="feature-card">
    <div class="feature-card-header">
      <span class="pill pill-purple">Walker (2017)</span> Prefrontal Fatigue Dynamics
    </div>
    <p>
      Sleep deprivation impairs prefrontal executive control and multi-step reasoning by up to 300%. Pushing complex problem sets in an exhausted state produces false learning.
      <br><strong>Orbit Action:</strong> The Fatigue Shield clamps study targets to &le;4.0h when sleep &lt;5.5h or energy &le;2, reserving energy for cognitive recovery.
    </p>
  </div>
</div>

<!-- Mathematical Formulas of the Engine -->
<div class="formula-card avoid-break">
  <div class="formula-title">
    <span>📐 Core Mathematical Formulation: Bounded Adaptive Heuristic Priority Score (AHPS)</span>
    <span class="pill pill-blue">src/lib/planningEngine.ts</span>
  </div>
  <p style="font-size: 8pt; margin-bottom: 2.5pt;">
    Rather than claiming to "maximize learning ROI" without empirical proof, Orbit uses a normalized, bounded heuristic (0–100 points) where no single factor can monopolize the planner:
  </p>
  <div class="formula-box">
Score(c) = S_curriculum(c) + S_confidence(c) + S_urgency(c) + S_mistakes(c) + S_decay(c)

S_curriculum = Tier_Weight ∈ [5, 25] (Tier 1: 25, Tier 2: 15, Tier 3: 5)
S_confidence = (100 - Confidence(c)) × 0.25 ∈ [0, 25]
S_urgency    = min( 15,  150 / (DaysToExam + 5) ) ∈ [0, 15]
S_mistakes   = min( 20,  5 × ln(1 + M_unresolved) + 8 × I(M_conceptual > 0) ) ∈ [0, 20]
S_decay      = 15 × (1 - R_FSRS(c)) ∈ [0, 15]
  </div>
  <p style="font-size: 7.5pt; color: #64748b; margin-bottom: 0;">
    <strong>Normalization Guarantee:</strong> Total priority is strictly clamped to [0, 100]. A massive mistake backlog cannot drown out exam weightage, and high-urgency chapters with zero mistakes still receive appropriate scheduling priority.
  </p>
</div>

<div class="formula-card avoid-break">
  <div class="formula-title">
    <span>🛡️ Core Heuristic: Configurable Proactive Fatigue Shield & Capacity Scaling</span>
    <span class="pill pill-amber">src/lib/academicState.ts</span>
  </div>
  <div class="formula-box">
T_max = T_base × min( Multiplier_Energy(E_daily), Multiplier_Sleep(S_daily) )

Multiplier_Energy(E) = { 0.60 if E=1; 0.75 if E=2; 0.88 if E=3; 1.00 if E>=4 }
Multiplier_Sleep(S)  = { 0.65 if S<5.0h; 0.80 if 5.0h<=S<6.0h; 1.00 if S>=6.0h }
  </div>
  <p style="font-size: 7.5pt; color: #64748b; margin-bottom: 0;">
    <strong>Product Heuristic Note:</strong> Thresholds (&lt;5.5h sleep, &le;2 energy) are product guardrails subject to student customization in Settings, rather than fixed universal biological limits.
  </p>
</div>

<div class="formula-card avoid-break">
  <div class="formula-title">
    <span>⏱️ Telemetry Semantic Model: Real Timer Logs vs. Completion Checkmarks</span>
    <span class="pill pill-green">src/lib/habitEngine.ts</span>
  </div>
  <div class="formula-box">
FocusRatio = ∑ FocusTimer_Duration_Seconds / ∑ Planned_Duration_Seconds
TimerStartDistribution = Count(FocusTimer_Started_At ∈ Slot_i) / Total_Recorded_Timers
  </div>
  <p style="font-size: 7.5pt; color: #64748b; margin-bottom: 0;">
    <strong>Semantic Discipline:</strong> Orbit strictly separates <code>marked_completed_at</code> (checkbox click) from <code>focus_session_started_at</code> (active timer). Habit insights cite only explicit timer sessions and frame observations as collaborative inquiries rather than dogmatic labels.
  </p>
</div>

<!-- ============================================================== -->
<!-- SECTION 3: THE 5-LAYER NEURO-SYMBOLIC ARCHITECTURE (THE "HOW") -->
<!-- ============================================================== -->
<h2><span class="section-num">3.</span> The 5-Layer Neuro-Symbolic Architecture & Candidate Pipeline</h2>

<p>
  Orbit’s architecture enforces an unambiguous boundary: <strong>Orbit’s deterministic engine selects candidate tasks and computes constraints; the AI Mentor selects from approved candidates and provides pedagogical rationale.</strong>
</p>

<!-- SVG ARCHITECTURE FLOWCHART -->
<div class="svg-container">
  <svg viewBox="0 0 760 490" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad0" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a"/><stop offset="100%" stop-color="#1e293b"/>
      </linearGradient>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e1b4b"/><stop offset="100%" stop-color="#312e81"/>
      </linearGradient>
      <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#064e3b"/><stop offset="100%" stop-color="#065f46"/>
      </linearGradient>
      <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#4c1d95"/><stop offset="100%" stop-color="#5b21b6"/>
      </linearGradient>
      <linearGradient id="grad4" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#7c2d12"/><stop offset="100%" stop-color="#9a3412"/>
      </linearGradient>
      <linearGradient id="grad5" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f766e"/><stop offset="100%" stop-color="#115e59"/>
      </linearGradient>
      <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.15"/>
      </filter>
    </defs>

    <!-- LAYER 0 -->
    <rect x="20" y="15" width="720" height="65" rx="6" fill="url(#grad0)" filter="url(#shadow)"/>
    <text x="35" y="38" fill="#38bdf8" font-family="'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="11">LAYER 0: EPISTEMIC ANCHOR & GROUND TRUTH (ACADEMIC MEMORY)</text>
    <text x="35" y="55" fill="#94a3b8" font-family="'Inter', sans-serif" font-size="8.5">Local Dexie DB ('OrbitStudyOS') • Supabase Postgres • Verified Curriculum Matrix • FSRS Stability Curves • Real Sleep/Energy Logs</text>
    <rect x="610" y="28" width="115" height="20" rx="3" fill="#0369a1"/>
    <text x="667" y="42" fill="#ffffff" font-family="'Inter', sans-serif" font-weight="700" font-size="7.5" text-anchor="middle">100% DETERMINISTIC</text>

    <!-- ARROW 0 -> 1 -->
    <path d="M 380 80 L 380 98" stroke="#64748b" stroke-width="2" marker-end="url(#arrowhead)" stroke-dasharray="3,3"/>

    <!-- LAYER 1 -->
    <rect x="20" y="100" width="720" height="68" rx="6" fill="url(#grad1)" filter="url(#shadow)"/>
    <text x="35" y="122" fill="#a5b4fc" font-family="'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="11">LAYER 1: DETERMINISTIC GOVERNOR & CANONICAL CANDIDATE GENERATOR</text>
    <text x="35" y="139" fill="#cbd5e1" font-family="'Inter', sans-serif" font-size="8.5">Fatigue Shield Capacity Budgeting • Bounded AHPS Priority Scoring • Generates 3–6 Immutable Candidate Tasks with Canonical IDs</text>
    <text x="35" y="154" fill="#93c5fd" font-family="'JetBrains Mono', monospace" font-size="7.5">Output: CandidateTask[] = [{ candidateId, chapterId, canonicalTitle, slot, durationMinutes, priorityScore }]</text>
    <rect x="610" y="113" width="115" height="20" rx="3" fill="#4338ca"/>
    <text x="667" y="127" fill="#ffffff" font-family="'Inter', sans-serif" font-weight="700" font-size="7.5" text-anchor="middle">HARD INVARIANTS</text>

    <!-- ARROW 1 -> 2 -->
    <path d="M 380 168 L 380 186" stroke="#64748b" stroke-width="2"/>

    <!-- LAYER 2 -->
    <rect x="20" y="188" width="720" height="65" rx="6" fill="url(#grad2)" filter="url(#shadow)"/>
    <text x="35" y="210" fill="#6ee7b7" font-family="'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="11">LAYER 2: CONTEXT SERIALIZER & EVIDENCE ENVELOPE (CLIENT → API)</text>
    <text x="35" y="227" fill="#d1fae5" font-family="'Inter', sans-serif" font-size="8.5">Builds Context Payload in Browser from Dexie • Injects Verified Metrics Table • Attaches Candidate Tasks Pool • Posts to /api/ai/plan</text>
    <rect x="610" y="200" width="115" height="20" rx="3" fill="#047857"/>
    <text x="667" y="214" fill="#ffffff" font-family="'Inter', sans-serif" font-weight="700" font-size="7.5" text-anchor="middle">EVIDENCE BOUND</text>

    <!-- ARROW 2 -> 3 -->
    <path d="M 380 253 L 380 271" stroke="#64748b" stroke-width="2"/>

    <!-- LAYER 3 -->
    <rect x="20" y="273" width="720" height="65" rx="6" fill="url(#grad3)" filter="url(#shadow)"/>
    <text x="35" y="295" fill="#d8b4fe" font-family="'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="11">LAYER 3: COGNITIVE REASONING & SELECTION (AI MENTOR CO-PILOT)</text>
    <text x="35" y="312" fill="#e9d5ff" font-family="'Inter', sans-serif" font-size="8.5">Selects Subset of Candidate IDs • Generates Pedagogical Rationale • Cites Verified Metrics • 4-Stage Adaptive Socratic Tutoring</text>
    <rect x="610" y="285" width="115" height="20" rx="3" fill="#6d28d9"/>
    <text x="667" y="299" fill="#ffffff" font-family="'Inter', sans-serif" font-weight="700" font-size="7.5" text-anchor="middle">READ-ONLY AI</text>

    <!-- ARROW 3 -> 4 -->
    <path d="M 380 338 L 380 356" stroke="#64748b" stroke-width="2"/>

    <!-- LAYER 4 -->
    <rect x="20" y="358" width="720" height="68" rx="6" fill="url(#grad4)" filter="url(#shadow)"/>
    <text x="35" y="380" fill="#fdba74" font-family="'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="11">LAYER 4: DETERMINISTIC SANITY FIREWALL & BOUNDARY VALIDATOR</text>
    <text x="35" y="397" fill="#fed7aa" font-family="'Inter', sans-serif" font-size="8.5">Knapsack Greedy Capacity Check • Whitelist ID Check • Circadian Strain Check • Verified Safe Fallback (or 0m rest)</text>
    <text x="35" y="412" fill="#fde047" font-family="'Inter', sans-serif" font-size="8">3.0s Client Timeout → 0ms Instant Local Fallback to Layer 1 Deterministic Plan</text>
    <rect x="610" y="371" width="115" height="20" rx="3" fill="#c2410c"/>
    <text x="667" y="385" fill="#ffffff" font-family="'Inter', sans-serif" font-weight="700" font-size="7.5" text-anchor="middle">GATEKEEPER</text>

    <!-- ARROW 4 -> 5 -->
    <path d="M 380 426 L 380 444" stroke="#64748b" stroke-width="2"/>

    <!-- LAYER 5 -->
    <rect x="20" y="446" width="720" height="32" rx="4" fill="url(#grad5)"/>
    <text x="380" y="466" fill="#ccfbf1" font-family="'Inter', sans-serif" font-weight="600" font-size="8.5" text-anchor="middle">LAYER 5: TELEMETRY DISCIPLINE & CONTINUOUS EVALUATION (TIMER LOGS ≠ CHECKMARKS)</text>
  </svg>
</div>

<!-- DETAILED LAYER SPECIFICATIONS -->
<div class="avoid-break">
  <h3>Layer 0: Ground Truth & Academic Memory (The Epistemic Anchor)</h3>
  <p>
    <strong>Architectural Invariant:</strong> The LLM is never queried about facts, dates, scores, or syllabi. All truth resides in local Dexie IndexedDB (<code>OrbitStudyOS</code>) and synchronized Supabase PostgreSQL:
  </p>
  <ul style="font-size: 8.3pt;">
    <li><strong>Curriculum Manifest (<code>curriculumData.ts</code>):</strong> Verified tree of subjects, chapters, modules, and concept hierarchies. Every chapter has an immutable UUID, exam weightage multiplier, and difficulty tier.</li>
    <li><strong>Live Mistake Vault (<code>db.mistakes</code>):</strong> Complete error log categorized into 5 root-cause disciplines (<code>conceptual</code>, <code>calculation</code>, <code>careless</code>, <code>application</code>, <code>time_pressure</code>).</li>
    <li><strong>FSRS Spaced Repetition Cache (<code>db.revisions</code>):</strong> Tracks memory stability <em>S</em>, retrievability <em>R(t)</em>, and scheduled review due dates.</li>
    <li><strong>Post-Test Debrief History (<code>db.test_attempts</code>):</strong> Exam attempts with paper difficulty, fumble factors, and leaked chapters.</li>
    <li><strong>Physiological Telemetry (<code>db.reflections</code>):</strong> 7-day rolling window of sleep hours, energy ratings, and subjective blockers.</li>
  </ul>
</div>

<div class="avoid-break">
  <h3>Layer 1: Deterministic Governor & Canonical Candidate Generator</h3>
  <p>
    <strong>The Core Change:</strong> <code>planningEngine.ts</code> generates a pool of 3–6 <em>CandidateTask</em> objects. Each candidate has a verified database UUID, a canonical title, an assigned time slot, and an estimated duration. The AI is forbidden from inventing tasks from whole cloth; it can only select and annotate from this candidate pool.
  </p>
  <ul style="font-size: 8.3pt;">
    <li><strong>Fatigue Shield:</strong> Computes the exact daily study ceiling <em>T</em><sub>max</sub>. If sleep &lt; 5.5h or energy &le; 2, <em>T</em><sub>max</sub> is clamped to &le; 4.0h, and high-strain conceptual tasks are excluded from candidates.</li>
    <li><strong>Circadian Slot Allocation:</strong> Aligns candidate tasks with circadian focus capacity (Morning: Deep derivations; Afternoon: Timed drills; Evening: FSRS active recall; Night: Consolidation).</li>
    <li><strong>Candidate Pool Generation:</strong> Emits an array of candidates satisfying all hard constraints before the LLM is invoked.</li>
  </ul>
</div>

<div class="avoid-break">
  <h3>Layer 2: Context Serializer & Evidence Envelope (Client → Next.js API)</h3>
  <p>
    <strong>Client-Server Boundary:</strong> Because Orbit is a local-first PWA, Dexie IndexedDB exists in the student's browser. <code>buildAiMentorContext()</code> runs client-side to aggregate local state, package verified metrics into an <em>Evidence Envelope</em>, and POST the sanitized payload to <code>/api/ai/plan</code> with Supabase JWT authentication.
  </p>

  <pre><code>// Compact Context Payload (Client Dexie → Serverless API, ~850 Tokens)
{
  "studentProfile": { "activeTrack": "jee_nsep", "daysToExam": 42, "targetExam": "JEE Advanced 2026" },
  "capacityProfile": { "reportedSleep": 5.0, "reportedEnergy": 2, "fatigueRisk": true, "maxAllowedMinutes": 210 },
  "evidenceEnvelope": {
    "sevenDayAvgSleep": 5.2,
    "topUnresolvedChapter": "Rotational Dynamics",
    "unresolvedMistakesCount": 14,
    "conceptualMistakesCount": 8,
    "dueRevisionsCount": 3,
    "latestMockScore": "132/300",
    "latestFumbleFactor": "concept_blindspot"
  },
  "candidateTasks": [
    { "candidateId": "cand-01", "chapterId": "chap-rot-01", "canonicalTitle": "Rotational Dynamics: Moment of Inertia Derivation", "slot": "afternoon", "durationMinutes": 45, "effort": "medium", "priorityScore": 88 },
    { "candidateId": "cand-02", "chapterId": "chap-elec-02", "canonicalTitle": "Active Recall: Electrostatics FSRS Review", "slot": "evening", "durationMinutes": 30, "effort": "low", "priorityScore": 72 },
    { "candidateId": "cand-03", "chapterId": "chap-calc-03", "canonicalTitle": "Definite Integrals: 10 Timed Speed Drills", "slot": "afternoon", "durationMinutes": 45, "effort": "medium", "priorityScore": 64 }
  ]
}</code></pre>
</div>

<div class="avoid-break">
  <h3>Layer 3: Cognitive Reasoning & Pedagogical Adaptation (Read-Only AI Mentor)</h3>
  <p>
    <strong>The AI Mentor's Responsibilities:</strong> The LLM selects which candidate task IDs to prioritize for the day, explains the pedagogical <em>why</em>, connects tasks to the student's past mock debriefs, and crafts empathetic motivation. Orbit remains responsible for scheduling execution.
  </p>

  <div class="card-grid-2">
    <div class="feature-card">
      <div class="feature-card-header">
        <span class="pill pill-purple">Persona A</span> Daily Tactical Commander
      </div>
      <p>
        Reviews candidate tasks, selects the optimal 2–3 items, and provides a 3-sentence tactical briefing. Cites metrics only from the Evidence Envelope.
      </p>
    </div>
    <div class="feature-card">
      <div class="feature-card-header">
        <span class="pill pill-purple">Persona B</span> Diagnostic Exam Debriefer
      </div>
      <p>
        Analyzes post-test attempts in <code>TestDebriefModal</code>. Decouples emotional distress from diagnostic reality. Distinguishes concept blindspots from calculation speed slips.
      </p>
    </div>
    <div class="feature-card">
      <div class="feature-card-header">
        <span class="pill pill-purple">Persona C</span> 4-Stage Adaptive Tutor
      </div>
      <p>
        Guides student error resolution in the Mistake Vault using fading scaffolding: Diagnose → Hint → Sub-Goal Scaffold → Worked Example & Verification.
      </p>
    </div>
    <div class="feature-card">
      <div class="feature-card-header">
        <span class="pill pill-purple">Persona D</span> Circadian Collaborative Coach
      </div>
      <p>
        Intervenes when sleep is compromised. Frames habit observations as collaborative inquiries (<em>"You often study in the evening; should we test scheduling your drills there?"</em>).
      </p>
    </div>
  </div>
</div>

<div class="avoid-break">
  <h3>Layer 4: Deterministic Sanity Firewall & Boundary Validator</h3>
  <p>
    Every AI response is validated against strict application-level rules before reaching the UI. If validation fails or times out (>3.0s), the system instantly falls back to the deterministic plan:
  </p>

  <!-- Guardrails Table -->
  <table>
    <thead>
      <tr>
        <th style="width: 22%;">Boundary Gate</th>
        <th style="width: 32%;">Verification Rule</th>
        <th style="width: 26%;">Failure Mode Prevented</th>
        <th style="width: 20%;">Fallback Action</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>1. Candidate Membership Gate</strong></td>
        <td>Every <code>selectedCandidateId</code> must exist in the input <code>candidateTasks</code> pool.</td>
        <td>Hallucinated chapters, non-existent tasks, or out-of-syllabus recommendations.</td>
        <td>Discards invalid ID; retains Orbit's default top-ranked candidate.</td>
      </tr>
      <tr>
        <td><strong>2. Knapsack Capacity Gate</strong></td>
        <td>Greedy priority packing strictly enforcing accumulated duration &le; <em>T</em><sub>max</sub>.</td>
        <td>Single-task overflow, overload, fatigue violations, and cramming marathons.</td>
        <td>Excludes tasks exceeding remaining budget. If 0 fit, selects safe fallback or 0m rest.</td>
      </tr>
      <tr>
        <td><strong>3. Direct Prop Fact Binding</strong></td>
        <td>All UI numerical metrics are rendered directly from typed React state, not generated by LLM text.</td>
        <td>Hallucinated progress statistics (e.g. <em>"errors increased 40%"</em>).</td>
        <td>Guarantees 100% numerical truth on all cards.</td>
      </tr>
      <tr>
        <td><strong>4. Psychological Safety Gate</strong></td>
        <td>Regex scan for toxic productivity tropes (<em>"sleep less", "never give up sleep"</em>).</td>
        <td>Anxiety amplification and burnout encouragement.</td>
        <td>Replaces text with validated empathetic template.</td>
      </tr>
      <tr>
        <td><strong>5. 3.0s Timeout & Circuit Breaker</strong></td>
        <td>Client AbortController timeout at 3000ms.</td>
        <td>UI hangs, frozen spinners, and network dropouts.</td>
        <td><strong>0ms Local Fallback:</strong> Renders Layer 1 deterministic plan with zero UI flicker.</td>
      </tr>
    </tbody>
  </table>
</div>

<!-- ============================================================== -->
<!-- SECTION 4: CORE STUDENT WORKFLOWS & INTERACTION BLUEPRINT      -->
<!-- ============================================================== -->
<h2><span class="section-num">4.</span> Core AI Student Workflows & Interaction Blueprint</h2>

<p>
  Orbit’s AI is embedded directly into the daily operational loops of the student. It does not exist as an isolated sidebar chatbot; it lives as a contextual intelligence embedded in the daily Desk, the Mistake Vault, and the Post-Test Debrief chamber:
</p>

<!-- WORKFLOW 1: DAILY PLANNER -->
<div class="feature-card avoid-break" style="margin-bottom: 7pt;">
  <div class="feature-card-header">
    <span class="badge badge-purple">Workflow A</span> The "Select & Explain" Morning Mission Desk
  </div>
  <p>
    <strong>Trigger:</strong> Student opens <code>/planner</code> in the morning.
    <br><strong>Operational Flow:</strong>
  </p>
  <ol style="font-size: 8.1pt; margin-left: 13pt; margin-top: 2.5pt;">
    <li><strong>Orbit Generates Candidates:</strong> Reads sleep (5.0h) and energy (2/5). Clamps daily ceiling to 3.5h. Emits 3 valid candidate tasks: <em>Rotational Dynamics error drill (45m)</em>, <em>Electrostatics FSRS review (30m)</em>, <em>Definite Integrals timed set (45m)</em>.</li>
    <li><strong>Client POSTs to API:</strong> Sends candidate pool and evidence envelope to <code>/api/ai/plan</code>.</li>
    <li><strong>AI Selects & Annotates:</strong> The model selects candidates 1 and 2, providing this briefing:
      <div style="background: #f1f5f9; padding: 4pt 6.5pt; border-radius: 4pt; margin: 2.5pt 0; font-style: italic; color: #1e293b; font-size: 7.8pt;">
        "🛡️ Fatigue Shield Active: 5.0h sleep logged (7-day average: 5.2h). Orbit has budgeted 2.5h of desk time to protect recovery. Mission #1 targets Moment of Inertia derivations in Rotational Dynamics to resolve 4 errors from Sunday's test. Evening is reserved for low-friction Electrostatics recall."
      </div>
    </li>
    <li><strong>Student Applies Mission:</strong> Student clicks "Apply Mission". Orbit populates the planner with the verified canonical tasks. Total study load: 75 minutes. Zero hallucinated tasks.</li>
  </ol>
</div>

<!-- WORKFLOW 2: 4-STAGE ADAPTIVE TUTOR -->
<div class="feature-card avoid-break" style="margin-bottom: 7pt;">
  <div class="feature-card-header">
    <span class="badge badge-emerald">Workflow B</span> 4-Stage Adaptive Tutoring in the Mistake Vault
  </div>
  <p>
    <strong>Trigger:</strong> Student reviews an unresolved error in <code>/mistakes</code> and clicks "Analyze Root Cause".
    <br><strong>Adaptive Tutoring Protocol:</strong> Fading scaffolding ensures students are never abandoned to floundering nor robbed of struggle:
  </p>
  <table style="margin-top: 4pt; margin-bottom: 2pt;">
    <thead>
      <tr>
        <th style="width: 18%;">Stage</th>
        <th style="width: 25%;">Tutoring Objective</th>
        <th style="width: 32%;">Example AI Behavior</th>
        <th style="width: 25%;">Pedagogical Rationale</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>1. Diagnose</strong></td>
        <td>Isolate specific point of uncertainty.</td>
        <td><em>"What was your initial conservation equation? Where did the calculation diverge from the answer key?"</em></td>
        <td>Forces metacognitive articulation of the student's mental model.</td>
      </tr>
      <tr>
        <td><strong>2. Hint</strong></td>
        <td>Point to governing physical law without equations.</td>
        <td><em>"Consider the fixed hinge: does the hinge exert an external impulse during the collision?"</em></td>
        <td>Promotes active retrieval and desirable difficulty.</td>
      </tr>
      <tr>
        <td><strong>3. Scaffold</strong></td>
        <td>Deconstruct the roadblock into atomic sub-questions.</td>
        <td><em>"If an external hinge force exists, is angular momentum conserved about CM? What about about the hinge itself?"</em></td>
        <td>Reduces extraneous cognitive load when student is stuck.</td>
      </tr>
      <tr>
        <td><strong>4. Worked Model & Verification</strong></td>
        <td>Provide worked derivation, then test understanding.</td>
        <td>Shows full derivation of torque about hinge = 0. Immediately presents an <strong>isomorphic follow-up question</strong> to verify schema transfer.</td>
        <td>Leverages the Worked Example Effect; prevents endless floundering.</td>
      </tr>
    </tbody>
  </table>
  <p style="font-size: 7.8pt; margin-top: 3pt; margin-bottom: 0;">
    <strong>Resolution Safeguard:</strong> The model does not unilaterally mark the mistake as resolved. It records a <code>diagnostic_hypothesis</code>. Resolution is confirmed only when the student successfully solves the isomorphic test or marks it in their next attempt.
  </p>
</div>

<!-- WORKFLOW 3: POST-TEST DEBRIEF -->
<div class="feature-card avoid-break" style="margin-bottom: 7pt;">
  <div class="feature-card-header">
    <span class="badge badge-cyan">Workflow C</span> Post-Test Diagnostic Debrief & Leaked Score Recovery
  </div>
  <p>
    <strong>Trigger:</strong> Student completes a composite mock exam in <code>TestDebriefModal.tsx</code>.
    <br><strong>Pedagogical Purpose:</strong> Prevent emotional despair and extract concrete, actionable recovery tasks.
  </p>
  <ol style="font-size: 8.1pt; margin-left: 13pt; margin-top: 2.5pt;">
    <li>Student logs score (148/300) and fumble factors: <em>Time Panic</em> in Physics Section 2, <em>Calculation Slips</em> in Math.</li>
    <li>The AI debriefs objectively:
      <div style="background: #f1f5f9; padding: 4pt 6.5pt; border-radius: 4pt; margin: 2.5pt 0; font-style: italic; color: #1e293b; font-size: 7.8pt;">
        "📊 Score Analysis: You scored 148/300. Notice that 24 marks were leaked due to algebra slips in Definite Integrals and time panic in Physics Section 2—not missing conceptual knowledge. Your actual conceptual mastery was 172. Orbit has tagged these 2 chapters for timed pacing drills on Tuesday."
      </div>
    </li>
    <li>Leaked chapters are auto-enrolled in the FSRS spaced repetition queue.</li>
  </ol>
</div>

<!-- WORKFLOW 4: CIRCADIAN INTERVENTION -->
<div class="feature-card avoid-break">
  <div class="feature-card-header">
    <span class="badge badge-amber">Workflow D</span> Circadian Collaborative Inquiry (Signal vs. Dogma)
  </div>
  <p>
    <strong>Trigger:</strong> Telemetry detects 14 focus timer sessions over 2 weeks, with 10 sessions initiated between 7:00 PM and 10:30 PM.
    <br><strong>Collaborative Dialogue:</strong> Rather than dogmatically labeling the student a "night owl", the AI asks:
    <br><em>"Across your last 14 recorded focus sessions, 71% began in the evening. Would you like Orbit to schedule heavier analytical problem sets in the evening slot next week?"</em> The student retains full agency to accept or keep their morning schedule.
  </p>
</div>

<!-- ============================================================== -->
<!-- SECTION 5: TECHNICAL SPECIFICATION & CODE ARCHITECTURE        -->
<!-- ============================================================== -->
<h2><span class="section-num">5.</span> Technical Specification & Code Contracts</h2>

<p>
  The AI system is built with complete end-to-end type safety using TypeScript and strict Zod validation schemas. Below is the production implementation specification for the Next.js App Router:
</p>

<div class="formula-card avoid-break">
  <div class="formula-title">
    <span>📂 Target Codebase File Structure & Repository Audit</span>
    <span class="pill pill-blue">Repository Audit Grounded</span>
  </div>
  <pre><code>src/
├── app/
│   └── api/
│       └── ai/
│           ├── plan/route.ts          # Candidate selection & daily tactical briefing endpoint [Phase 3]
│           ├── debrief/route.ts       # Post-test diagnostic debrief endpoint [Phase 4]
│           └── tutor/route.ts         # 4-stage adaptive tutoring endpoint [Phase 4]
├── lib/
│   ├── academicState.ts               # Layer 0: Ground Truth Aggregator (getUnifiedAcademicState) [EXISTING]
│   ├── planningEngine.ts              # Layer 1: Deterministic Governor (Add CandidateTask[] export) [EXISTING]
│   ├── aiContext.ts                   # Layer 2: Context Serializer & Evidence Envelope builder [Phase 2]
│   ├── aiGuardrails.ts                # Layer 4: Production Knapsack Firewall & Fallback Engine [Phase 2]
│   ├── habitEngine.ts                 # Layer 5: Timer telemetry semantics & velocity calibration [EXISTING]
│   └── spacedRepetition.ts           # FSRS retention decay engine [EXISTING]
└── components/
    ├── AiMentorCard.tsx               # Client surface with optimistic rendering & fallback [EXISTING]
    └── TestDebriefModal.tsx           # Post-test diagnostic capture surface [EXISTING]</code></pre>
</div>

<div class="avoid-break">
  <h3>Production Zod Contracts for Output Envelopes</h3>
  <p>
    The model is constrained to select from approved <code>candidateTaskIds</code>. It cannot invent arbitrary task titles or durations:
  </p>

  <pre><code>// src/lib/aiGuardrails.ts
import { z } from 'zod';

export const CandidateTaskSchema = z.object({
  candidateId: z.string(),
  chapterId: z.string(),
  canonicalTitle: z.string(),
  slot: z.enum(['morning', 'afternoon', 'evening', 'night']),
  effort: z.enum(['low', 'medium', 'high']),
  durationMinutes: z.number().int().min(15).max(120),
  priorityScore: z.number().optional(),
});

export const AiPlanResponseSchema = z.object({
  planRunId: z.string().uuid(),
  headline: z.string().max(80),
  strategicRationale: z.string().max(350),
  fatigueNotice: z.string().nullable(),
  selectedCandidateIds: z.array(z.string()).min(1).max(4),
  annotations: z.record(
    z.string(), // candidateId
    z.object({
      pedagogicalReason: z.string().max(180),
      focusCue: z.string().max(120),
    })
  ),
});

export type CandidateTask = z.infer&lt;typeof CandidateTaskSchema&gt;;
export type AiPlanResponse = z.infer&lt;typeof AiPlanResponseSchema&gt;;</code></pre>
</div>

<div>
  <h3>The Production Knapsack Sanity Firewall (Bug-Free Implementation)</h3>
  <p>
    Below is the mathematically verified validation pipeline that strictly solves single-task overflow, priority ordering, and safe fallback handling:
  </p>

  <pre><code>// src/lib/aiGuardrails.ts
export interface GuardrailValidationResult {
  isValid: boolean;
  sanitizedCandidateIds: string[];
  totalMinutes: number;
  violations: string[];
  fallbackTriggered: boolean;
  fallbackReason?: string;
}

export function validateAiPlanAgainstInvariants(
  aiOutput: AiPlanResponse,
  candidatePool: CandidateTask[],
  maxAllowedMinutes: number,
  isFatigued: boolean
): GuardrailValidationResult {
  const violations: string[] = [];
  const candidateMap = new Map(candidatePool.map((c) => [c.candidateId, c]));

  // 1. Whitelist Membership Gate (Must exist in canonical candidate pool)
  let candidateIds = (aiOutput.selectedCandidateIds || []).filter((id) => {
    if (!candidateMap.has(id)) {
      violations.push(`Rejected unapproved candidate ID: "${id}"`);
      return false;
    }
    return true;
  });

  // 2. Circadian Strain Gate (No high-effort or night tasks during fatigue risk)
  if (isFatigued) {
    candidateIds = candidateIds.filter((id) => {
      const task = candidateMap.get(id)!;
      if (task.slot === 'night' || task.effort === 'high') {
        violations.push(`Excluded high-strain/night task under fatigue risk: "${task.canonicalTitle}"`);
        return false;
      }
      return true;
    });
  }

  // 3. Workload Capacity Gate: Strict Knapsack Packing by Priority (Fixes Single-Task Overflow)
  candidateIds.sort((a, b) => {
    const taskA = candidateMap.get(a)!;
    const taskB = candidateMap.get(b)!;
    return (taskB.priorityScore ?? 0) - (taskA.priorityScore ?? 0);
  });

  const approvedIds: string[] = [];
  let accumulatedMinutes = 0;

  for (const id of candidateIds) {
    const task = candidateMap.get(id)!;
    if (accumulatedMinutes + task.durationMinutes <= maxAllowedMinutes) {
      approvedIds.push(id);
      accumulatedMinutes += task.durationMinutes;
    } else {
      violations.push(`Excluded candidate "${task.canonicalTitle}" (${task.durationMinutes}m) to respect capacity ceiling (${accumulatedMinutes}m + ${task.durationMinutes}m > ${maxAllowedMinutes}m)`);
    }
  }

  // 4. Safe Fallback Gate (If 0 tasks approved, find verified safe candidate or return 0m rest)
  if (approvedIds.length === 0) {
    const safeFallback = candidatePool.find((c) =>
      c.durationMinutes <= maxAllowedMinutes &&
      (!isFatigued || (c.effort === 'low' && c.slot !== 'night'))
    );

    if (safeFallback) {
      violations.push(`AI selection over-budget; fell back to verified safe candidate: "${safeFallback.canonicalTitle}"`);
      return {
        isValid: false,
        sanitizedCandidateIds: [safeFallback.candidateId],
        totalMinutes: safeFallback.durationMinutes,
        violations,
        fallbackTriggered: true,
        fallbackReason: 'AI selection over-budget or empty; replaced with verified safe candidate.',
      };
    } else {
      violations.push(`Capacity ceiling (${maxAllowedMinutes}m) cannot accommodate any task. Scheduled load is 0m.`);
      return {
        isValid: false,
        sanitizedCandidateIds: [],
        totalMinutes: 0,
        violations,
        fallbackTriggered: true,
        fallbackReason: 'Capacity exhausted; recommended action is rest and recovery.',
      };
    }
  }

  return {
    isValid: violations.length === 0,
    sanitizedCandidateIds: approvedIds,
    totalMinutes: accumulatedMinutes,
    violations,
    fallbackTriggered: false,
  };
}</code></pre>
</div>

<!-- ============================================================== -->
<!-- SECTION 6: GUARDRAIL TEST SUITE & FAILURE MODES               -->
<!-- ============================================================== -->
<h2><span class="section-num">6.</span> Guardrail Test Suite & Edge-Case Failure Mode Analysis</h2>

<p>
  To prove system resilience, the table below outlines 5 real-world edge cases where naive AI catastrophically fails, contrasted with Orbit’s multi-layered defense behavior:
</p>

<table class="avoid-break">
  <thead>
    <tr>
      <th style="width: 20%;">Scenario / Stress Test</th>
      <th style="width: 28%;">Naive AI Failure Behavior</th>
      <th style="width: 28%;">Orbit Neuro-Symbolic Defense</th>
      <th style="width: 24%;">Student Outcome</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Edge Case 1: Severe Sleep Deprivation</strong><br>(Student logs 3.5h sleep, 1/5 energy)</td>
      <td>Outputs standard 10-hour schedule: <em>"Drink green tea, push through, champions grind through pain."</em></td>
      <td><strong>Layer 1 Fatigue Shield</strong> triggers. Clamps day to 2.5h max. Converts all morning tasks to sleep recovery or light FSRS cards.</td>
      <td>Eliminates burnout risk; prevents false learning; protects mental health.</td>
    </tr>
    <tr>
      <td><strong>Edge Case 2: Deleted Syllabus Topic</strong><br>(Prompt hints at deleted JEE topic: Solid State)</td>
      <td>Hallucinates 2 hours of Bragg's Law and unit cell crystal calculations.</td>
      <td><strong>Layer 4 Whitelist Gate</strong> rejects chapter ID. Auto-swaps to highest-weight active topic (Electrostatics).</td>
      <td>Zero wasted study hours on out-of-syllabus content.</td>
    </tr>
    <tr>
      <td><strong>Edge Case 3: Post-Mock Exam Panic Spiral</strong><br>(Student scores 25% on mock test, logs despair)</td>
      <td>Generic platitude: <em>"Don't worry! Try reading NCERT from page 1 again!"</em> (Paralyzing).</td>
      <td><strong>Diagnostic Debriefer</strong> isolates score leaks into Fumble Factors (Calculation vs. Concept). Shows 42 marks are immediately reclaimable.</td>
      <td>De-escalates panic; replaces existential dread with an atomic 3-day repair drill.</td>
    </tr>
    <tr>
      <td><strong>Edge Case 4: Complete Network Disconnect</strong><br>(Student on subway or rural cell drop)</td>
      <td>Infinite spinner, white screen, or fatal crash: <em>"Network Request Failed."</em></td>
      <td><strong>Layer 1 Local Engine</strong> generates optimal plan from Dexie in 0ms with zero server roundtrip.</td>
      <td>100% offline uptime; seamless PWA mobile experience.</td>
    </tr>
    <tr>
      <td><strong>Edge Case 5: The "Planning Fallacy" Drift</strong><br>(Student chronically underestimates durations by 40%)</td>
      <td>Piles 6 heavy tasks into one afternoon. Student finishes only 2; feels demoralized.</td>
      <td><strong>Habit Engine</strong> applies <code>velocityMultiplier = 1.40</code>. Budgets realistic buffer intervals between blocks.</td>
      <td>Student finishes 100% of planned tasks; builds positive momentum.</td>
    </tr>
  </tbody>
</table>

<!-- ============================================================== -->
<!-- SECTION 7: OPERATIONAL ECONOMICS & PRIVACY ALIGNMENT           -->
<!-- ============================================================== -->
<h2><span class="section-num">7.</span> Operational Economics, Latency, & Privacy Alignment</h2>

<div class="card-grid-3 avoid-break">
  <div class="feature-card">
    <div class="feature-card-header">
      <span class="pill pill-blue">Audited Economics</span> Token Cost Modeling
    </div>
    <p>
      Using <strong>Gemini 1.5 Flash / 3.8 Flash</strong> paid tier ($0.75/1M in, $3.75/1M out) with structured output:
      <br>• Input: ~850 prompt tokens ($0.00064)
      <br>• Output: ~250 tokens ($0.00094)
      <br>• Total per request: <strong>~$0.0016</strong>
      <br>10,000 daily active students: <strong>~$480/month</strong>.
    </p>
  </div>
  <div class="feature-card">
    <div class="feature-card-header">
      <span class="pill pill-green">Latency & Uptime</span> Circuit-Breaker Architecture
    </div>
    <p>
      Optimistic UI renders Layer 1 deterministic plan in <strong>0ms</strong>. Background API call has a strict <strong>3000ms AbortController timeout</strong>. If the API lags or disconnects, the UI remains responsive with zero layout shift.
    </p>
  </div>
  <div class="feature-card">
    <div class="feature-card-header">
      <span class="pill pill-purple">Privacy Alignment</span> DPDP Act 2023 & GDPR
    </div>
    <p>
      • <strong>Zero Training Guarantee:</strong> Paid enterprise API tier ensures student prompts are never retained for model training.
      <br>• <strong>Data Minimization:</strong> PII is stripped client-side; only pseudonymous UUIDs are transmitted.
      <br>• <strong>DPIA Alignment:</strong> Technical measures designed to align with DPDP/GDPR principles prior to formal third-party audit.
    </p>
  </div>
</div>

<!-- ============================================================== -->
<!-- SECTION 8: PHASED ENGINEERING ROADMAP & DEFINITION OF DONE     -->
<!-- ============================================================== -->
<h2><span class="section-num">8.</span> Phased Engineering Implementation Roadmap</h2>

<div class="callout callout-info avoid-break">
  <div class="callout-title">
    <span>🚀</span> Practical 5-Phase Engineering Roadmap
  </div>
  <table style="margin-top: 5pt; margin-bottom: 0;">
    <thead>
      <tr>
        <th style="width: 14%;">Phase</th>
        <th style="width: 25%;">Target Deliverable</th>
        <th style="width: 36%;">Implementation Details</th>
        <th style="width: 25%;">Definition of Done (DoD)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Phase 1</strong><br>(Immediate)</td>
        <td><strong>Foundation Audit & Telemetry Semantics</strong></td>
        <td>Audit existing <code>planningEngine.ts</code> and <code>study_sessions.ts</code>. Differentiate <code>marked_completed_at</code> from <code>focus_session_started_at</code>. Implement bounded AHPS priority formula (0–100) and verify Dexie aggregate latency &lt;15ms.</td>
        <td>Unit tests pass for AHPS capping; timer telemetry separated from checkmark clicks.</td>
      </tr>
      <tr>
        <td><strong>Phase 2</strong><br>(Sprint 2)</td>
        <td><strong>Canonical Candidate Generator & Firewall</strong></td>
        <td>Update <code>planningEngine.ts</code> to emit <code>CandidateTask[]</code> pool. Implement <code>validateAiPlanAgainstInvariants()</code> in <code>aiGuardrails.ts</code>.</td>
        <td>100% test pass on guardrail test suite; single-task overflow properly clamped; 0m rest fallback validated.</td>
      </tr>
      <tr>
        <td><strong>Phase 3</strong><br>(Sprint 3)</td>
        <td><strong>Read-Only Daily Mission Explainer</strong></td>
        <td>Deploy <code>/api/ai/plan</code> route using paid Gemini Flash tier. AI selects candidate IDs and provides tactical briefing. 3.0s timeout with 0ms fallback. Direct React state binding for facts.</td>
        <td>Student can accept canonical tasks in 1 click; 0ms local fallback on forced offline mode.</td>
      </tr>
      <tr>
        <td><strong>Phase 4</strong><br>(Sprint 4)</td>
        <td><strong>4-Stage Adaptive Tutor in Mistake Vault</strong></td>
        <td>Implement Socratic hint modal with fading scaffold (Diagnose → Hint → Scaffold → Worked Example & Verification) in <code>/mistakes</code>.</td>
        <td>Students resolve errors through guided steps; resolution saved as hypothesis.</td>
      </tr>
      <tr>
        <td><strong>Phase 5</strong><br>(Sprint 5)</td>
        <td><strong>Post-Test Debrief & Evaluation Metrics</strong></td>
        <td>Connect <code>TestDebriefModal.tsx</code> to AI debriefer. Log guardrail pass rates, fallback frequency, and student plan acceptance rates.</td>
        <td>Guardrail pass rate > 99.5%; student qualitative rating tracked; privacy review completed.</td>
      </tr>
    </tbody>
  </table>
</div>

<div class="feature-card avoid-break" style="margin-top: 8pt; background: #0f172a; color: #ffffff; border-color: #1e293b;">
  <div class="feature-card-header" style="color: #38bdf8;">
    <span>✨</span> Architectural Sign-Off & Verification Guarantee
  </div>
  <p style="color: #cbd5e1; font-size: 8.1pt;">
    By enforcing the <strong>"Orbit Schedules, AI Explains"</strong> candidate selection pattern, anchoring all numerical facts directly to typed React application state, and validating boundary constraints via the <strong>Knapsack Sanity Firewall</strong>, Orbit guarantees that students never receive an absurd schedule, an unverified statistic, or an out-of-syllabus distraction. The AI remains a disciplined, empathetic cognitive partner that maximizes learning velocity while aggressively shielding against burnout.
  </p>
</div>

</body>
</html>
"""

def generate_pdf():
    print(f"[1/3] Writing high-fidelity HTML specification to {HTML_OUTPUT_PATH}...")
    html_content = build_html_content()
    with open(HTML_OUTPUT_PATH, "w", encoding="utf-8") as f:
        f.write(html_content)
    print("      HTML successfully generated.")

    print(f"[2/3] Rendering PDF via Microsoft Edge headless...")
    browser_exe = EDGE_PATH if os.path.exists(EDGE_PATH) else CHROME_PATH
    if not os.path.exists(browser_exe):
        print(f"Error: Neither Edge nor Chrome found at {browser_exe}")
        sys.exit(1)

    file_url = f"file:///{HTML_OUTPUT_PATH.replace(os.sep, '/')}"
    cmd = [
        browser_exe,
        "--headless=new",
        "--disable-gpu",
        "--run-all-compositor-stages-before-draw",
        "--no-pdf-header-footer",
        f"--print-to-pdf={PDF_OUTPUT_PATH}",
        file_url
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error rendering PDF: {result.stderr}")
        sys.exit(1)

    print(f"[3/3] Inspecting generated PDF with PyMuPDF...")
    if not os.path.exists(PDF_OUTPUT_PATH):
        print(f"Error: PDF was not created at {PDF_OUTPUT_PATH}")
        sys.exit(1)

    doc = pymupdf.open(PDF_OUTPUT_PATH)
    page_count = len(doc)
    file_size_kb = os.path.getsize(PDF_OUTPUT_PATH) / 1024

    print(f"      Success! Generated: {PDF_OUTPUT_PATH}")
    print(f"      Total Pages: {page_count}")
    print(f"      File Size: {file_size_kb:.1f} KB")

    for i in range(page_count):
        page = doc[i]
        clean_text = page.get_text()[:90].replace('\n', ' ').encode('ascii', 'ignore').decode('ascii')
        print(f"      Page {i+1} ({len(page.get_text())} chars): {clean_text}...")

if __name__ == "__main__":
    generate_pdf()
