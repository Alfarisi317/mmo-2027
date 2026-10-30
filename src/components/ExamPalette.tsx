import React from 'react';
import { Check, Bookmark, Circle } from 'lucide-react';
import { Question, UserAnswer } from '../types';

interface ExamPaletteProps {
  questions: Question[];
  currentIndex: number;
  userAnswers: Record<string, UserAnswer>;
  onSelectQuestion: (index: number) => void;
  onSubmitExamClick: () => void;
}

export const ExamPalette: React.FC<ExamPaletteProps> = ({
  questions,
  currentIndex,
  userAnswers,
  onSelectQuestion,
  onSubmitExamClick,
}) => {
  const total = questions.length;
  const answeredCount = questions.filter(
    (q) => userAnswers[q.id]?.status === 'answered'
  ).length;
  const doubtfulCount = questions.filter(
    (q) => userAnswers[q.id]?.status === 'doubtful'
  ).length;
  const unansweredCount = total - answeredCount - doubtfulCount;

  const progressPercentage = Math.round(((answeredCount + doubtfulCount) / total) * 100);

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs flex flex-col gap-4">
      {/* Header & Progress Indicator */}
      <div>
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-medium text-zinc-600">Kemajuan Pengerjaan</span>
          <span className="font-mono font-bold text-zinc-900">
            {answeredCount}/{total} Selesai ({progressPercentage}%)
          </span>
        </div>
        <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
          <div
            className="h-full bg-zinc-800 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-3 gap-1.5 text-[11px] text-zinc-600 border-y border-zinc-200 py-2.5">
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-zinc-900 text-white flex items-center justify-center font-bold text-[9px]">
            <Check className="w-2.5 h-2.5 stroke-[3]" />
          </div>
          <span>Dijawab ({answeredCount})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center font-bold text-[9px]">
            <Bookmark className="w-2.5 h-2.5" />
          </div>
          <span>Ragu ({doubtfulCount})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-zinc-50 border border-zinc-200 text-zinc-400 flex items-center justify-center text-[9px]">
            <Circle className="w-2 h-2" />
          </div>
          <span>Kosong ({unansweredCount})</span>
        </div>
      </div>

      {/* Question Grid Buttons */}
      <div>
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2.5">
          Navigasi Nomor Soal
        </span>
        <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
          {questions.map((q, idx) => {
            const ans = userAnswers[q.id];
            const isCurrent = idx === currentIndex;
            const isAnswered = ans?.status === 'answered';
            const isDoubtful = ans?.status === 'doubtful';

            let btnStyle = 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:border-zinc-300';
            if (isAnswered) {
              btnStyle = 'bg-zinc-900 text-white font-bold border-zinc-900 shadow-xs';
            } else if (isDoubtful) {
              btnStyle = 'bg-amber-100 border-amber-400 text-amber-900 font-semibold';
            }

            if (isCurrent) {
              btnStyle += ' ring-2 ring-zinc-900 ring-offset-2 ring-offset-white';
            }

            return (
              <button
                key={q.id}
                onClick={() => onSelectQuestion(idx)}
                className={`h-9 rounded-lg border text-xs flex items-center justify-center relative transition-all duration-150 cursor-pointer ${btnStyle}`}
                title={`Soal ${idx + 1}: ${q.domain}`}
              >
                <span>{idx + 1}</span>
                {isDoubtful && (
                  <Bookmark className="w-2.5 h-2.5 absolute top-1 right-1 text-amber-600 fill-amber-600" />
                )}
                {isAnswered && !isCurrent && (
                  <Check className="w-2.5 h-2.5 absolute bottom-1 right-1 text-zinc-300 stroke-[3]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <button
          onClick={onSubmitExamClick}
          className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
        >
          Selesaikan & Kumpulkan Ujian
        </button>
      </div>
    </div>
  );
};
