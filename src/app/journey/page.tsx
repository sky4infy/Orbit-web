'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { getSubjectProgress, getChaptersForSubject, upsertChapterProgress } from '@/api/journey';
import type { SubjectProgressRow, ChapterStatusRow, ChapterStatus, TrackType } from '@/types/database.types';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { OrbitMasteryMap } from '@/components/OrbitMasteryMap';
import { AddSubjectModal } from '@/components/AddSubjectModal';
import { AddChapterModal } from '@/components/AddChapterModal';
import { ChapterStatusModal } from '@/components/ChapterStatusModal';
import {
  getCurriculumChapters,
  getCurriculumSubjects,
  saveChapterOverride,
  deleteSubject,
  deleteChapter,
} from '@/lib/curriculumData';
import { Orbit, ListFilter, AlertCircle, Plus, ChevronDown, CheckCircle2, Award, BookOpen, Trash2 } from 'lucide-react';

const STATUS_META: Record<ChapterStatus, { label: string; color: string; badge: string }> = {
  not_started: { label: 'Not started', color: 'bg-white/20', badge: 'border-white/10 text-paper/40 hover:border-white/30' },
  learning: { label: 'Learning', color: 'bg-sky-400', badge: 'border-sky-500/30 bg-sky-500/10 text-sky-300' },
  practicing: { label: 'Practicing', color: 'bg-amber', badge: 'border-amber/30 bg-amber/10 text-amber' },
  revision_due: { label: 'Revision due', color: 'bg-rust', badge: 'border-rust/30 bg-rust/10 text-rust' },
  mastered: { label: 'Mastered', color: 'bg-emerald-400', badge: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400 font-semibold' },
  locked: { label: 'Locked', color: 'bg-white/10', badge: 'border-white/10 text-paper/30' },
};

function buildCurriculumState(activeTrack: TrackType) {
  const rawSubs = getCurriculumSubjects(activeTrack);
  const rawChaps = getCurriculumChapters(activeTrack);

  const subRows: SubjectProgressRow[] = rawSubs.map((s) => {
    const chaps = rawChaps.filter((c) => c.subjectId === s.id);
    const mastered = chaps.filter((c) => c.status === 'mastered').length;
    const revDue = chaps.filter((c) => c.status === 'revision_due').length;
    const avgConf = chaps.length > 0 ? Math.round(chaps.reduce((acc, c) => acc + c.confidence, 0) / chaps.length) : 50;

    return {
      subject_id: s.id,
      subject_name: s.name,
      track: s.track,
      total_chapters: chaps.length,
      mastered_count: mastered,
      revision_due_count: revDue,
      avg_confidence: avgConf,
    };
  });

  const grouped: Record<string, ChapterStatusRow[]> = {};
  rawChaps.forEach((c) => {
    grouped[c.subjectId] ??= [];
    grouped[c.subjectId].push({
      chapter_id: c.id,
      chapter_name: c.name,
      subject_id: c.subjectId,
      subject_name: c.subjectName,
      track: c.track,
      status: c.status,
      confidence_score: c.confidence,
      notes: null,
      last_revised_at: null,
      unresolved_mistakes: c.unresolvedMistakes,
    });
  });

  return { subRows, grouped };
}

function withTimeout<T>(promise: Promise<T>, ms = 800): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Network timeout')), ms)),
  ]);
}

export default function JourneyPage() {
  const { userId } = useRequireAuth();
  const [track, setTrack] = useState<TrackType>('jee_nsep');
  const [viewMode, setViewMode] = useState<'list' | 'orbit'>('list');

  // Modals state
  const [addSubjectOpen, setAddSubjectOpen] = useState(false);
  const [addChapterForSubject, setAddChapterForSubject] = useState<{ id: string; name: string } | null>(null);
  const [editingChapter, setEditingChapter] = useState<{
    id: string;
    name: string;
    subjectName: string;
    status: ChapterStatus;
    confidence: number;
    unresolvedMistakes?: number;
  } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: 'subject' | 'chapter';
    id: string;
    name: string;
    count?: number;
  } | null>(null);

  // Eager initialization — renders user's track immediately (0ms delay)
  const initialTrack: TrackType = typeof window !== 'undefined'
    ? ((localStorage.getItem('orbit_active_track') as TrackType) || 'jee_nsep')
    : 'jee_nsep';
  const initialData = useMemo(() => buildCurriculumState(initialTrack), [initialTrack]);
  const [subjects, setSubjects] = useState<SubjectProgressRow[]>(initialData.subRows);
  const [openSubject, setOpenSubject] = useState<string | null>(initialData.subRows[0]?.subject_id ?? null);
  const [chaptersBySubject, setChaptersBySubject] = useState<Record<string, ChapterStatusRow[]>>(initialData.grouped);

  const reloadCurriculum = useCallback((activeTrack = track) => {
    const data = buildCurriculumState(activeTrack);
    setSubjects(data.subRows);
    setChaptersBySubject(data.grouped);
  }, [track]);

  // Read track preference once
  useEffect(() => {
    const saved = localStorage.getItem('orbit_active_track') as TrackType | null;
    if (saved && saved !== track) {
      setTrack(saved);
      reloadCurriculum(saved);
    }
  }, [track, reloadCurriculum]);

  // Background sync with timeout protection
  useEffect(() => {
    let isMounted = true;
    withTimeout(getSubjectProgress(track), 800)
      .then((rows) => {
        if (isMounted && rows && rows.length > 0) {
          setSubjects((prev) => {
            // merge remote with local custom subjects
            const remoteMap = new Map(rows.map((r) => [r.subject_id, r]));
            return prev.map((s) => remoteMap.get(s.subject_id) ?? s);
          });
        }
      })
      .catch(() => {
        // Fallback already rendered
      });
    return () => {
      isMounted = false;
    };
  }, [track]);

  async function toggleSubject(subjectId: string) {
    setOpenSubject((prev) => (prev === subjectId ? null : subjectId));
  }

  function handleSaveChapterStatus(chapterId: string, status: ChapterStatus, confidence: number) {
    saveChapterOverride(chapterId, { status, confidence });
    if (userId) {
      upsertChapterProgress(userId, chapterId, { status, confidence_score: confidence }).catch(() => {});
    }
    reloadCurriculum(track);
  }

  function handleDeleteSubject(subjectId: string, subjectName: string, chapterCount: number) {
    setDeleteConfirmation({
      type: 'subject',
      id: subjectId,
      name: subjectName,
      count: chapterCount,
    });
  }

  function handleDeleteChapter(chapterId: string, chapterName?: string) {
    setDeleteConfirmation({
      type: 'chapter',
      id: chapterId,
      name: chapterName || 'this chapter',
    });
  }

  const allChaptersForMap = useMemo(() => {
    return Object.values(chaptersBySubject).flat().map((c) => ({
      id: c.chapter_id,
      name: c.chapter_name,
      subjectId: c.subject_id,
      subjectName: c.subject_name,
      confidence: c.confidence_score,
      status: c.status,
      unresolvedMistakes: c.unresolved_mistakes,
    }));
  }, [chaptersBySubject]);

  return (
    <main className="mx-auto min-h-screen max-w-lg px-5 pb-32 pt-8">
      {/* Header */}
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wide text-paper/40">Structured Academic Syllabus</p>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-semibold text-paper">Journey & Mastery</h1>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-mono text-[10px] text-amber">
              {track === 'jee_nsep' ? 'STEM • JEE' : 'CS & AI'}
            </span>
          </div>

          {/* Actions: Add Subject & View Switcher */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAddSubjectOpen(true)}
              className="flex items-center gap-1 rounded-xl border border-amber/30 bg-amber/10 px-2.5 py-1.5 text-xs font-semibold text-amber transition hover:bg-amber/20 active:scale-95 shadow-sm"
              title="Add Custom Subject"
            >
              <Plus size={13} />
              <span>Subject</span>
            </button>

            <div className="flex items-center rounded-xl border border-white/10 bg-ink-50 p-1 text-xs">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 transition ${
                  viewMode === 'list' ? 'bg-amber text-ink font-semibold' : 'text-paper/60 hover:text-paper'
                }`}
              >
                <ListFilter size={13} />
                <span>List</span>
              </button>
              <button
                onClick={() => setViewMode('orbit')}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 transition ${
                  viewMode === 'orbit' ? 'bg-amber text-ink font-semibold' : 'text-paper/60 hover:text-paper'
                }`}
              >
                <Orbit size={13} />
                <span>Map</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {viewMode === 'orbit' ? (
        /* Orbital Mastery Map Mode */
        <div className="flex flex-col items-center">
          <div className="mb-3 text-center">
            <h2 className="text-sm font-semibold text-paper">Celestial Mastery Map</h2>
            <p className="text-[11px] text-paper/40">
              Center = Low confidence (needs practice) • Outer ring = Mastered (Completed)
            </p>
          </div>
          <div className="w-full overflow-hidden rounded-3xl border border-white/10 bg-ink-50/50 p-3 shadow-xl backdrop-blur-md">
            <OrbitMasteryMap chapters={allChaptersForMap} />
          </div>
        </div>
      ) : (
        /* List Breakdown Mode */
        <div className="flex flex-col gap-3">
          {subjects.map((s) => {
            const isOpen = openSubject === s.subject_id;
            const pct = s.total_chapters > 0 ? (s.mastered_count / s.total_chapters) * 100 : 0;
            const chapters = chaptersBySubject[s.subject_id] ?? [];

            return (
              <div
                key={s.subject_id}
                className="rounded-2xl border border-white/5 bg-ink-50 p-4 transition hover:border-white/10 shadow-sm"
              >
                {/* Subject Header */}
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => toggleSubject(s.subject_id)} className="flex-1 text-left">
                    <div className="flex items-center justify-between pr-2">
                      <span className="text-sm font-semibold text-paper">{s.subject_name}</span>
                      <span className="font-mono text-xs text-paper/40">
                        {s.mastered_count}/{s.total_chapters} mastered ({Math.round(pct)}%)
                      </span>
                    </div>
                    <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-white/5 pr-2">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber to-emerald-400 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {s.revision_due_count > 0 && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rust">
                        <AlertCircle size={13} />
                        {s.revision_due_count} chapter(s) scheduled for spaced revision
                      </p>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSubject(s.subject_id, s.subject_name, s.total_chapters);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-paper/20 hover:bg-rust/10 hover:text-rust transition shrink-0"
                    title={`Remove ${s.subject_name} from syllabus (if added twice or by mistake)`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Expanded Chapters */}
                {isOpen && (
                  <div className="mt-4 flex flex-col gap-2 border-t border-white/5 pt-3">
                    {chapters.length === 0 ? (
                      <p className="py-2 text-center text-xs text-paper/40">
                        No chapters in this subject.
                      </p>
                    ) : (
                      chapters.map((c) => (
                        <div
                          key={c.chapter_id}
                          className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.02] px-3 py-2.5 border border-white/5 hover:border-white/10 transition"
                        >
                          {/* Left: Chapter link to drilldown notes */}
                          <Link
                            href={`/journey/${c.chapter_id}`}
                            className="flex items-center gap-2.5 overflow-hidden flex-1 min-w-0 group"
                          >
                            <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${STATUS_META[c.status].color}`} />
                            <span className="truncate text-xs font-medium text-paper group-hover:text-amber transition-colors">
                              {c.chapter_name}
                            </span>
                          </Link>

                          {/* Right: Quick Interactive Status Update Pill & Delete */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {c.unresolved_mistakes > 0 && (
                              <span className="rounded-md bg-rust/20 px-1.5 py-0.5 font-mono text-[10px] text-rust">
                                {c.unresolved_mistakes} err
                              </span>
                            )}

                            {/* 1-Tap Status Updater */}
                            <button
                              type="button"
                              onClick={() =>
                                setEditingChapter({
                                  id: c.chapter_id,
                                  name: c.chapter_name,
                                  subjectName: c.subject_name,
                                  status: c.status,
                                  confidence: c.confidence_score,
                                  unresolvedMistakes: c.unresolved_mistakes,
                                })
                              }
                              className={`rounded-lg border px-2 py-0.5 text-[11px] font-mono transition hover:scale-105 active:scale-95 ${STATUS_META[c.status].badge}`}
                              title="Click to update status & auto-computed confidence"
                            >
                              {STATUS_META[c.status].label}
                            </button>

                            {/* Remove Chapter Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteChapter(c.chapter_id, c.chapter_name);
                              }}
                              className="flex h-6 w-6 items-center justify-center rounded-md text-paper/20 hover:bg-rust/10 hover:text-rust transition"
                              title="Remove chapter from syllabus"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}

                    {/* Add Chapter to this Subject Button */}
                    <button
                      type="button"
                      onClick={() =>
                        setAddChapterForSubject({ id: s.subject_id, name: s.subject_name })
                      }
                      className="mt-2 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/10 py-2.5 text-xs font-medium text-paper/50 hover:border-amber/40 hover:text-amber transition"
                    >
                      <Plus size={14} />
                      <span>Add Chapter to {s.subject_name}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Custom Subject Modal */}
      <AddSubjectModal
        track={track}
        open={addSubjectOpen}
        onClose={() => setAddSubjectOpen(false)}
        onCreated={() => reloadCurriculum(track)}
      />

      {/* Add Custom Chapter Modal */}
      <AddChapterModal
        subjects={subjects.map((s) => ({ subject_id: s.subject_id, subject_name: s.subject_name }))}
        defaultSubjectId={addChapterForSubject?.id}
        track={track}
        open={Boolean(addChapterForSubject)}
        onClose={() => setAddChapterForSubject(null)}
        onCreated={() => reloadCurriculum(track)}
      />

      {/* Chapter Mastery Status & Confidence Modal */}
      <ChapterStatusModal
        chapter={editingChapter}
        open={Boolean(editingChapter)}
        onClose={() => setEditingChapter(null)}
        onSave={handleSaveChapterStatus}
        onDelete={(id) => {
          deleteChapter(id);
          reloadCurriculum(track);
        }}
      />

      {/* Syllabus Deletion Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmation && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDeleteConfirmation(null)}
          >
            <motion.div
              className="w-full max-w-sm rounded-2xl border border-rust/30 bg-ink-100 p-5 shadow-2xl"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2.5 text-rust">
                <Trash2 size={18} />
                <h3 className="font-display text-base font-semibold text-paper">
                  Remove {deleteConfirmation.type === 'subject' ? 'Subject' : 'Chapter'}
                </h3>
              </div>
              <p className="mt-2.5 text-xs text-paper/70 leading-relaxed">
                Remove <strong className="text-paper">&quot;{deleteConfirmation.name}&quot;</strong>
                {deleteConfirmation.type === 'subject'
                  ? ` and all ${deleteConfirmation.count ?? 0} chapters in it `
                  : ' '}
                from your syllabus?
              </p>
              <p className="mt-1 text-[11px] text-paper/40">
                Use this if it was added twice or is not in your target coaching / board syllabus.
              </p>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmation(null)}
                  className="rounded-xl border border-white/10 px-3.5 py-1.5 text-xs font-medium text-paper/60 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (deleteConfirmation.type === 'subject') {
                      deleteSubject(deleteConfirmation.id);
                    } else {
                      deleteChapter(deleteConfirmation.id);
                    }
                    setDeleteConfirmation(null);
                    reloadCurriculum(track);
                  }}
                  className="rounded-xl bg-rust px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-rust/30 hover:brightness-110 active:scale-95 transition"
                >
                  Remove from Syllabus
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
