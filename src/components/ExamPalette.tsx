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
    <div className="bg-white border-2 border-[#E49548]/60 rounded-2xl p-4 shadow-xs flex flex-col gap-4">
      {/* Header & Progress Indicator */}
      <div>
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-semibold text-[#4E779F]">Kemajuan Pengerjaan</span>
          <span className="font-mono font-bold text-[#1E3954]">
            {answeredCount}/{total} Selesai ({progressPercentage}%)
          </span>
        </div>
        <div className="w-full h-2.5 bg-[#EBF1F6] rounded-full overflow-hidden border border-[#B8CCE0]">
          <div
            className="h-full bg-[#E49548] transition-all duration-300 rounded-full"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-3 gap-1.5 text-[11px] text-[#1E3954] border-y border-[#EBF1F6] py-2.5">
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-[#2C4B6B] text-white flex items-center justify-center font-bold text-[9px]">
            <Check className="w-2.5 h-2.5 stroke-[3]" />
          </div>
          <span>Dijawab ({answeredCount})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-[#FAF3E3] border border-[#E49548] text-[#1E3954] flex items-center justify-center font-bold text-[9px]">
            <Bookmark className="w-2.5 h-2.5 text-[#CE7D30]" />
          </div>
          <span>Ragu ({doubtfulCount})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-[#EBF1F6] border border-[#B8CCE0] text-[#4E779F] flex items-center justify-center text-[9px]">
            <Circle className="w-2 h-2" />
          </div>
          <span>Kosong ({unansweredCount})</span>
        </div>
      </div>

      {/* Question Grid Buttons */}
      <div>
        <span className="text-xs font-bold text-[#4E779F] uppercase tracking-wider block mb-2.5">
          Navigasi Nomor Soal
        </span>
        <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
          {questions.map((q, idx) => {
            const ans = userAnswers[q.id];
            const isCurrent = idx === currentIndex;
            const isAnswered = ans?.status === 'answered';
            const isDoubtful = ans?.status === 'doubtful';

            let btnStyle = 'bg-[#EBF1F6]/60 border-[#B8CCE0] text-[#1E3954] hover:bg-[#FAF3E3] hover:border-[#E49548]';
            if (isAnswered) {
              btnStyle = 'bg-[#2C4B6B] text-white font-bold border-[#2C4B6B] shadow-xs';
            } else if (isDoubtful) {
              btnStyle = 'bg-[#FAF3E3] border-[#E49548] text-[#1E3954] font-semibold';
            }

            if (isCurrent) {
              btnStyle += ' ring-2 ring-[#E49548] ring-offset-2 ring-offset-white';
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
                  <Bookmark className="w-2.5 h-2.5 absolute top-1 right-1 text-[#CE7D30] fill-[#E49548]" />
                )}
                {isAnswered && !isCurrent && (
                  <Check className="w-2.5 h-2.5 absolute bottom-1 right-1 text-[#F4E6CC] stroke-[3]" />
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
          className="w-full py-2.5 px-4 bg-[#2C4B6B] hover:bg-[#243E59] text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs border border-[#E49548]"
        >
          Selesaikan & Kumpulkan Ujian
        </button>
      </div>
    </div>
  );
};
