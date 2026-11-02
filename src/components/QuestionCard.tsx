import React from 'react';
import { ArrowLeft, ArrowRight, Bookmark, RotateCcw, Check, BookOpen, CheckCircle2 } from 'lucide-react';
import { Question, UserAnswer } from '../types';
import { MathRenderer } from './MathRenderer';

interface QuestionCardProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  currentAnswer?: UserAnswer;
  onSelectOption: (optionId: string, solutionStrategy?: string) => void;
  onToggleDoubtful: () => void;
  onClearAnswer: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSubmitExam?: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  questionIndex,
  totalQuestions,
  currentAnswer,
  onSelectOption,
  onToggleDoubtful,
  onClearAnswer,
  onPrev,
  onNext,
  onSubmitExam,
  isFirst,
  isLast,
}) => {
  const isDoubtful = currentAnswer?.status === 'doubtful';
  const selectedValue = currentAnswer?.value || '';
  const currentStrategy = currentAnswer?.solutionStrategy || '';
  const isShortAnswer = question.type === 'short_answer';

  return (
    <div className="bg-white border border-[#D5D5D5] rounded-3xl p-5 sm:p-7 lg:p-8 shadow-xs flex flex-col justify-between min-h-[580px] transition-all">
      <div>
        {/* Header Metadata: Hanya Nomor Soal, Domain Matematika, dan Bobot Poin */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-[#D5D5D5]">
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
            <span className="font-bold text-zinc-900 text-sm">
              Nomor {questionIndex + 1} <span className="font-normal text-zinc-400">/ {totalQuestions}</span>
            </span>
            <span aria-hidden="true" className="text-zinc-300">·</span>
            <span className="bg-[#f7f7f8] border border-[#D5D5D5] text-zinc-800 font-semibold px-2.5 py-0.5 rounded-xl">
              {question.domain}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-[11px] font-mono font-semibold text-zinc-700 px-2.5 py-1 bg-[#f7f7f8] border border-[#D5D5D5] rounded-xl" title="Bobot penskoran resmi">
              {isShortAnswer ? '+10 / 0' : '+4 / -1 / 0'}
            </div>
          </div>
        </div>

        {/* Question Text with KaTeX Rendering */}
        <div className="mb-6 text-zinc-900 text-base sm:text-lg leading-relaxed select-none overflow-x-auto">
          <MathRenderer content={question.text} />
        </div>

        {/* Multiple Choice Options List */}
        {!isShortAnswer && question.options && question.options.length > 0 && (
          <div className="space-y-3 mb-8">
            {question.options.map((opt) => {
              const isSelected = selectedValue === opt.id;

              return (
                <button
                  key={opt.id}
                  onClick={() => onSelectOption(opt.id, currentStrategy)}
                  className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border-2 transition-all duration-150 flex items-start gap-3 sm:gap-4 cursor-pointer select-none group ${
                    isSelected
                      ? 'bg-[#27272a] border-[#27272a] text-white shadow-md'
                      : 'bg-white border-[#D5D5D5] text-zinc-900 hover:bg-[#f7f7f8] hover:border-[#646464] shadow-2xs'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-zinc-800 text-white border border-zinc-700 ring-1 ring-zinc-500'
                        : 'bg-zinc-100 border border-[#D5D5D5] text-zinc-800 group-hover:bg-[#D5D5D5]/50'
                    }`}
                  >
                    {isSelected ? (
                      <span className="flex items-center gap-0.5">
                        <Check className="w-4 h-4 text-white stroke-[3]" />
                      </span>
                    ) : (
                      opt.id
                    )}
                  </div>
                  <div
                    className={`flex-1 pt-1 text-sm sm:text-base leading-relaxed overflow-x-auto ${
                      isSelected ? 'text-white katex-white font-medium' : 'text-zinc-900'
                    }`}
                  >
                    <MathRenderer
                      content={opt.text}
                      className={isSelected ? 'text-white katex-white' : 'text-zinc-900'}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Short Answer / Problem Solving Input */}
        {isShortAnswer && (
          <div className="space-y-4 mb-8 bg-[#fafafa] border border-[#D5D5D5] rounded-3xl p-4 sm:p-6 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-800">
              <BookOpen className="w-4 h-4 text-[#646464]" />
              <span>Lembar Uraian & Problem Solving</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                1. Jawaban Singkat / Nilai Akhir:
              </label>
              <input
                type="text"
                placeholder="Contoh: x = 12 atau (7, 42)"
                value={selectedValue}
                onChange={(e) => onSelectOption(e.target.value, currentStrategy)}
                className="w-full bg-white border border-[#D5D5D5] rounded-2xl px-4 py-2.5 text-sm text-zinc-900 font-mono focus:outline-none focus:border-[#646464] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                2. Strategi, Langkah Penalaran, & Pembuktian Matematika:
              </label>
              <textarea
                rows={5}
                placeholder="Tuliskan alur berpikir logis, rumus yang digunakan, penurunan rumus, atau penjelasan strategi Anda di sini..."
                value={currentStrategy}
                onChange={(e) => onSelectOption(selectedValue, e.target.value)}
                className="w-full bg-white border border-[#D5D5D5] rounded-2xl p-3.5 text-xs text-zinc-900 font-mono leading-relaxed focus:outline-none focus:border-[#646464] transition-colors"
              />
            </div>

            <div className="text-[11px] text-zinc-500 flex items-center justify-between">
              <span>Tuliskan jawaban singkat dan langkah penalaran secara sistematis.</span>
              <span className="font-mono text-zinc-700">
                {selectedValue.trim() ? 'Jawaban Terisi' : 'Belum diisi'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="pt-6 border-t border-[#D5D5D5] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            disabled={isFirst}
            className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-[#D5D5D5] bg-[#f7f7f8] hover:bg-[#D5D5D5]/50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Sebelumnya</span>
          </button>

          {!isLast ? (
            <button
              onClick={onNext}
              className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-[#D5D5D5] bg-[#f7f7f8] hover:bg-[#D5D5D5]/50 text-xs font-semibold text-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <span className="hidden sm:inline">Selanjutnya</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : onSubmitExam ? (
            <button
              onClick={onSubmitExam}
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-[#27272a] hover:bg-black text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs border border-zinc-700"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Selesai Ujian</span>
            </button>
          ) : (
            <button
              disabled
              className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-[#D5D5D5] bg-[#f7f7f8] opacity-40 cursor-not-allowed text-xs font-semibold text-zinc-800 flex items-center gap-1.5"
            >
              <span className="hidden sm:inline">Selanjutnya</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selectedValue && (
            <button
              onClick={onClearAnswer}
              className="px-2.5 sm:px-3 py-2 rounded-xl hover:bg-zinc-100 text-xs font-medium text-zinc-500 hover:text-zinc-800 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Hapus Pilihan</span>
            </button>
          )}

          <button
            onClick={onToggleDoubtful}
            className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs ${
              isDoubtful
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : 'bg-white border-[#D5D5D5] text-zinc-700 hover:border-amber-400 hover:text-amber-800'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isDoubtful ? 'fill-amber-500 text-amber-500' : ''}`} />
            <span>{isDoubtful ? 'Ragu-ragu' : 'Tandai Ragu'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
