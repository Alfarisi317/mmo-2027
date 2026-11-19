import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Bookmark, RotateCcw, Check, BookOpen, CheckCircle2, Maximize2, X } from 'lucide-react';
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
  const [isImageModalOpen, setIsImageModalOpen] = useState<boolean>(false);
  const isDoubtful = currentAnswer?.status === 'doubtful';
  const selectedValue = currentAnswer?.value || '';
  const currentStrategy = currentAnswer?.solutionStrategy || '';
  const isShortAnswer = question.type === 'short_answer';

  return (
    <div className="bg-white border-2 border-[#E49548]/60 rounded-3xl p-5 sm:p-7 lg:p-8 shadow-xs flex flex-col justify-between min-h-[580px] transition-all">
      <div>
        {/* Header Metadata: Hanya Nomor Soal, Domain Matematika, dan Bobot Poin */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-[#EBF1F6]">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#4E779F]">
            <span className="font-extrabold text-[#1E3954] text-sm">
              Nomor {questionIndex + 1} <span className="font-normal text-[#4E779F]">/ {totalQuestions}</span>
            </span>
            <span aria-hidden="true" className="text-[#B8CCE0]">·</span>
            <span className="bg-[#FAF3E3] border border-[#E49548]/60 text-[#1E3954] font-bold px-2.5 py-0.5 rounded-xl">
              {question.domain}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-[11px] font-mono font-bold text-[#1E3954] px-2.5 py-1 bg-[#FAF3E3] border border-[#E49548]/60 rounded-xl" title="Bobot penskoran resmi">
              {isShortAnswer ? '+10 / 0' : '+4 / -1 / 0'}
            </div>
          </div>
        </div>

        {/* Question Text with KaTeX Rendering (rendered only if text exists) */}
        {question.text && question.text.trim().length > 0 && (
          <div className="mb-6 text-[#1E3954] text-base sm:text-lg leading-relaxed select-none overflow-x-auto">
            <MathRenderer content={question.text} />
          </div>
        )}

        {/* Optional Question Diagram / Screenshot from Word (Win+Shift+S) */}
        {question.imageUrl && (
          <div className="mb-6 rounded-2xl overflow-hidden border border-[#B8CCE0] bg-[#EBF1F6]/60 p-3 flex flex-col items-center max-w-2xl mx-auto shadow-2xs group relative">
            <div className="w-full flex justify-between items-center mb-1.5 px-1 text-[11px] text-[#4E779F]">
              <span className="font-semibold text-[#1E3954]">Tangkapan Layar Soal</span>
              <button
                type="button"
                onClick={() => setIsImageModalOpen(true)}
                className="flex items-center gap-1 text-[#2C4B6B] hover:text-[#CE7D30] font-semibold cursor-pointer"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Perbesar Gambar</span>
              </button>
            </div>
            <img
              src={question.imageUrl}
              alt={`Ilustrasi Soal ${questionIndex + 1}`}
              onClick={() => setIsImageModalOpen(true)}
              className="max-h-[460px] w-auto max-w-full object-contain rounded-xl cursor-zoom-in transition-transform duration-150 group-hover:scale-[1.008] bg-white border border-[#B8CCE0]"
            />
          </div>
        )}

        {/* Multiple Choice Options List */}
        {!isShortAnswer && question.options && question.options.length > 0 && (
          <div className="space-y-3 mb-8">
            {question.options.map((opt) => {
              const isSelected = selectedValue === opt.id;
              const hasCustomText = Boolean(opt.text && opt.text.trim().length > 0 && opt.text.trim() !== opt.id);

              return (
                <button
                  key={opt.id}
                  onClick={() => onSelectOption(opt.id, currentStrategy)}
                  className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border-2 transition-all duration-150 flex items-start gap-3 sm:gap-4 cursor-pointer select-none group ${
                    isSelected
                      ? 'bg-[#2C4B6B] border-[#E49548] text-white shadow-md'
                      : 'bg-white border-[#B8CCE0] text-[#1E3954] hover:bg-[#FAF3E3]/50 hover:border-[#E49548] shadow-2xs'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-[#E49548] text-[#1E3954] border border-[#F4E6CC]'
                        : 'bg-[#EBF1F6] border border-[#B8CCE0] text-[#1E3954] group-hover:bg-[#F4E6CC] group-hover:border-[#E49548]'
                    }`}
                  >
                    {isSelected ? (
                      <span className="flex items-center gap-0.5">
                        <Check className="w-4 h-4 text-[#1E3954] stroke-[3]" />
                      </span>
                    ) : (
                      opt.id
                    )}
                  </div>
                  <div
                    className={`flex-1 pt-1 text-sm sm:text-base leading-relaxed overflow-x-auto ${
                      isSelected ? 'text-white katex-white font-medium' : 'text-[#1E3954]'
                    }`}
                  >
                    {hasCustomText ? (
                      <MathRenderer
                        content={opt.text}
                        className={isSelected ? 'text-white katex-white' : 'text-[#1E3954]'}
                      />
                    ) : (
                      <span className="font-semibold text-sm">Pilihan {opt.id}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Short Answer / Problem Solving Input */}
        {isShortAnswer && (
          <div className="space-y-4 mb-8 bg-[#FAF3E3]/60 border border-[#E49548]/50 rounded-3xl p-4 sm:p-6 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-bold text-[#1E3954]">
              <BookOpen className="w-4 h-4 text-[#CE7D30]" />
              <span>Lembar Uraian & Problem Solving</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E3954] mb-1">
                1. Jawaban Singkat / Nilai Akhir:
              </label>
              <input
                type="text"
                placeholder="Contoh: x = 12 atau (7, 42)"
                value={selectedValue}
                onChange={(e) => onSelectOption(e.target.value, currentStrategy)}
                className="w-full bg-white border border-[#B8CCE0] rounded-2xl px-4 py-2.5 text-sm text-[#1E3954] font-mono focus:outline-none focus:border-[#E49548] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E3954] mb-1">
                2. Strategi, Langkah Penalaran, & Pembuktian Matematika:
              </label>
              <textarea
                rows={5}
                placeholder="Tuliskan alur berpikir logis, rumus yang digunakan, penurunan rumus, atau penjelasan strategi Anda di sini..."
                value={currentStrategy}
                onChange={(e) => onSelectOption(selectedValue, e.target.value)}
                className="w-full bg-white border border-[#B8CCE0] rounded-2xl p-3.5 text-xs text-[#1E3954] font-mono leading-relaxed focus:outline-none focus:border-[#E49548] transition-colors"
              />
            </div>

            <div className="text-[11px] text-[#4E779F] flex items-center justify-between">
              <span>Tuliskan jawaban singkat dan langkah penalaran secara sistematis.</span>
              <span className="font-mono font-semibold text-[#1E3954]">
                {selectedValue.trim() ? 'Jawaban Terisi' : 'Belum diisi'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="pt-6 border-t border-[#EBF1F6] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            disabled={isFirst}
            className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-[#B8CCE0] bg-[#FAF3E3] hover:bg-[#F4E6CC] hover:border-[#E49548] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-[#1E3954] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Sebelumnya</span>
          </button>

          {!isLast ? (
            <button
              onClick={onNext}
              className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-[#B8CCE0] bg-[#FAF3E3] hover:bg-[#F4E6CC] hover:border-[#E49548] text-xs font-bold text-[#1E3954] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <span className="hidden sm:inline">Selanjutnya</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : onSubmitExam ? (
            <button
              onClick={onSubmitExam}
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-[#E49548] hover:bg-[#CE7D30] text-[#1E3954] text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs border border-[#CE7D30]"
            >
              <CheckCircle2 className="w-4 h-4 text-[#1E3954]" />
              <span>Selesai Ujian</span>
            </button>
          ) : (
            <button
              disabled
              className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-[#B8CCE0] bg-[#FAF3E3] opacity-40 cursor-not-allowed text-xs font-bold text-[#1E3954] flex items-center gap-1.5"
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
              className="px-2.5 sm:px-3 py-2 rounded-xl hover:bg-[#EBF1F6] text-xs font-medium text-[#4E779F] hover:text-[#1E3954] transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Hapus Pilihan</span>
            </button>
          )}

          <button
            onClick={onToggleDoubtful}
            className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs ${
              isDoubtful
                ? 'bg-[#FAF3E3] border-[#E49548] text-[#1E3954]'
                : 'bg-white border-[#B8CCE0] text-[#1E3954] hover:border-[#E49548] hover:bg-[#FAF3E3]/60'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isDoubtful ? 'fill-[#E49548] text-[#CE7D30]' : 'text-[#4E779F]'}`} />
            <span>{isDoubtful ? 'Ragu-ragu' : 'Tandai Ragu'}</span>
          </button>
        </div>
      </div>

      {/* Lightbox Modal for Question Screenshot */}
      {isImageModalOpen && question.imageUrl && (
        <div
          className="fixed inset-0 z-50 bg-[#1E3954]/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 cursor-zoom-out animate-in fade-in duration-150"
          onClick={() => setIsImageModalOpen(false)}
        >
          <div
            className="relative max-w-5xl max-h-[92vh] flex flex-col items-center bg-white border-2 border-[#E49548] p-3 rounded-2xl shadow-2xl cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-[#EBF1F6] text-xs">
              <span className="font-bold text-[#1E3954]">
                Pratinjau Diperbesar · Soal Nomor {questionIndex + 1}
              </span>
              <button
                type="button"
                onClick={() => setIsImageModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[#FAF3E3] text-[#4E779F] hover:text-[#1E3954] cursor-pointer transition-colors"
                title="Tutup (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={question.imageUrl}
              alt={`Tangkapan Layar Soal ${questionIndex + 1}`}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            <div className="w-full pt-2 mt-2 text-center text-[11px] text-[#4E779F]">
              Gunakan mode layar penuh atau klik di luar untuk menutup.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
