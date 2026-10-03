'use client';

import { differenceInCalendarDays } from 'date-fns';
import type { ExamReadinessRow } from '@/types/database.types';

interface Props {
  exam: ExamReadinessRow;
  onDelete: (examId: string) => void;
}

const TYPE_LABEL: Record<string, string> = {
  nsep: 'NSEP Physics Olympiad',
  jee_main: 'JEE Main',
  jee_advanced: 'JEE Advanced',
  college_contest: 'Coding Contest',
  midsem: 'College Midsem',
  hackathon: 'Hackathon',
  coaching_test: 'Coaching Mock',
  school_test: 'School Test',
  iiser: 'IISER / IAT',
  other: 'Milestone',
};

export function ExamCard({ exam, onDelete }: Props) {
  const daysLeft = differenceInCalendarDays(new Date(exam.exam_date), new Date());
  const coverage = exam.total_chapters > 0 ? (exam.mastered_chapters / exam.total_chapters) * 100 : 0;

  return (
    <div className="rounded-xl2 border border-white/5 bg-ink-50 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-paper/40">{TYPE_LABEL[exam.exam_type]}</p>
          <p className="mt-0.5 font-display text-lg font-medium">{exam.name}</p>
        </div>
        <div className="text-right">
          <p className={`font-mono text-xl font-medium ${daysLeft <= 7 ? 'text-rust' : 'text-amber'}`}>
            {daysLeft >= 0 ? daysLeft : 0}
          </p>
          <p className="text-[10px] text-paper/30">days left</p>
        </div>
      </div>

      {exam.total_chapters > 0 ? (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs text-paper/50">
            <span>Syllabus coverage</span>
            <span className="font-mono">
              {exam.mastered_chapters}/{exam.total_chapters} mastered
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
            <div className="h-full rounded-full bg-sage" style={{ width: `${coverage}%` }} />
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-paper/30">No syllabus linked yet.</p>
      )}

      <button onClick={() => onDelete(exam.exam_id)} className="mt-3 text-[11px] text-paper/25 hover:text-rust">
        Remove
      </button>
    </div>
  );
}
