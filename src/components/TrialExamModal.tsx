import React, { useState } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  RotateCcw,
  Check,
  BookOpen,
  LogOut,
  Maximize2,
} from 'lucide-react';
import { Question, UserAnswer } from '../types';
import { TRIAL_QUESTIONS_SMP, TRIAL_QUESTIONS_SMA } from '../data/trialQuestions';
import { MathRenderer } from './MathRenderer';

interface TrialExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: 'SMP' | 'SMA';
  participantName: string;
  isGateOpen?: boolean;
}

export const TrialExamModal: React.FC<TrialExamModalProps> = ({
  isOpen,
  onClose,
  category,
  participantName,
  isGateOpen = false,
}) => {
  const questions: Question[] = category === 'SMP' ? TRIAL_QUESTIONS_SMP : TRIAL_QUESTIONS_SMA;
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, UserAnswer>>({});
  const [showSummary, setShowSummary] = useState<boolean>(false);
  const [showExplanations, setShowExplanations] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentQ = questions[currentIndex];
  const currentAnswer = answers[currentQ.id];
  const selectedValue = currentAnswer?.value || '';
  const isDoubtful = currentAnswer?.status === 'doubtful';

  const answeredCount = Object.values(answers).filter((a) => a.status === 'answered').length;
  const doubtfulCount = Object.values(answers).filter((a) => a.status === 'doubtful').length;

  const handleSelectOption = (optId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: {
        questionId: currentQ.id,
        value: optId,
        status: prev[currentQ.id]?.status === 'doubtful' ? 'doubtful' : 'answered',
        timestamp: Date.now(),
      },
    }));
  };

  const handleToggleDoubtful = () => {
    setAnswers((prev) => {
      const existing = prev[currentQ.id];
      const newStatus = existing?.status === 'doubtful' ? (existing?.value ? 'answered' : 'unanswered') : 'doubtful';
      return {
        ...prev,
        [currentQ.id]: {
          questionId: currentQ.id,
          value: existing?.value || '',
          status: newStatus,
          timestamp: Date.now(),
        },
      };
    });
  };

  const handleClearAnswer = () => {
    setAnswers((prev) => {
      const copy = { ...prev };
      delete copy[currentQ.id];
      return copy;
    });
  };

  const handleResetTrial = () => {
    setAnswers({});
    setCurrentIndex(0);
    setShowSummary(false);
    setShowExplanations(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1E3954]/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#EBF1F6] border-2 border-[#E49548] rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200">
        
        {/* Header with Steel-Blue #2C4B6B & Amber #E49548 */}
        <div className="bg-[#2C4B6B] text-white px-5 py-4 flex items-center justify-between border-b-2 border-[#E49548] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#243E59] flex items-center justify-center text-[#E49548] border border-[#E49548] shadow-xs">
              <Sparkles className="w-5 h-5 text-[#E49548] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#F4E6CC] px-2.5 py-0.5 rounded-lg text-[#1E3954] border border-[#E49548]">
                  Simulasi Mandiri · 3 Soal
                </span>
                <span className="text-xs text-[#DCE9F5]">
                  Jenjang {category} · {participantName}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-white mt-0.5">
                Uji Coba Tampilan & Navigasi Soal MMO 2027
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#243E59] hover:bg-[#3B5F84] border border-[#4E779F] flex items-center justify-center text-white transition-colors cursor-pointer"
            title="Tutup Uji Coba"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Notification if gate has been opened */}
        {isGateOpen && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs flex items-center justify-between gap-2 shrink-0 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Akses Soal Resmi Telah Dibuka Panitia! Anda bisa segera masuk ke ujian utama.</span>
            </div>
            <button
              onClick={onClose}
              className="px-2.5 py-1 bg-white text-emerald-800 font-bold rounded-lg text-[11px] hover:bg-emerald-50 cursor-pointer shadow-xs"
            >
              Masuk Ujian Resmi →
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {!showSummary ? (
            <>
              {/* Top Sub-Bar: Question switcher pills */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white border-2 border-[#E49548]/60 rounded-2xl p-3 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-[#1E3954] uppercase tracking-wider mr-1">
                    Nomor Soal:
                  </span>
                  {questions.map((q, idx) => {
                    const ans = answers[q.id];
                    const isAns = ans?.status === 'answered';
                    const isDbt = ans?.status === 'doubtful';
                    const isCurr = currentIndex === idx;

                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentIndex(idx)}
                        className={`w-9 h-9 rounded-xl font-mono font-bold text-xs flex items-center justify-center transition-all duration-200 cursor-pointer ${
                          isCurr
                            ? 'ring-2 ring-[#E49548] bg-[#2C4B6B] text-white shadow-sm -translate-y-0.5'
                            : isDbt
                            ? 'bg-[#FAF3E3] border border-[#E49548] text-[#1E3954]'
                            : isAns
                            ? 'bg-[#2C4B6B]/85 text-white'
                            : 'bg-[#EBF1F6] border border-[#B8CCE0] text-[#1E3954] hover:border-[#E49548] hover:bg-[#FAF3E3]'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSummary(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#E49548] hover:bg-[#CE7D30] text-[#1E3954] text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all duration-200 border border-[#CE7D30]"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#1E3954]" />
                    <span>Selesai Uji Coba</span>
                  </button>
                </div>
              </div>

              {/* Question Card */}
              <div className="bg-white border-2 border-[#E49548]/60 rounded-3xl p-5 sm:p-7 shadow-xs space-y-6 transition-all duration-300">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#EBF1F6]">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-[#1E3954]">
                      Soal Nomor {currentIndex + 1} dari {questions.length}
                    </span>
                    <span className="text-[#B8CCE0]">·</span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-[#FAF3E3] border border-[#E49548]/60 text-[#1E3954]">
                      {currentQ.domain}
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-[#4E779F] bg-[#FAF3E3] border border-[#B8CCE0] px-2 py-0.5 rounded-md">
                    Format: Pilihan Ganda (A-E)
                  </span>
                </div>

                {/* MathRenderer for Formula */}
                {currentQ.text && currentQ.text.trim().length > 0 && (
                  <div className="text-[#1E3954] text-base sm:text-lg leading-relaxed select-none overflow-x-auto">
                    <MathRenderer content={currentQ.text} />
                  </div>
                )}

                {/* Question Screenshot / Diagram if present */}
                {currentQ.imageUrl && (
                  <div className="rounded-2xl overflow-hidden border border-[#B8CCE0] bg-[#EBF1F6]/60 p-3 flex flex-col items-center max-w-2xl mx-auto shadow-2xs group relative">
                    <div className="w-full flex justify-between items-center mb-1.5 px-1 text-[11px] text-[#4E779F]">
                      <span className="font-semibold text-[#1E3954]">Tangkapan Layar Soal</span>
                      <button
                        type="button"
                        onClick={() => setPreviewImage(currentQ.imageUrl || null)}
                        className="flex items-center gap-1 text-[#2C4B6B] hover:text-[#CE7D30] font-semibold cursor-pointer"
                      >
                        <Maximize2 className="w-3 h-3" />
                        <span>Perbesar Gambar</span>
                      </button>
                    </div>
                    <img
                      src={currentQ.imageUrl}
                      alt={`Tangkapan Layar Soal ${currentIndex + 1}`}
                      onClick={() => setPreviewImage(currentQ.imageUrl || null)}
                      className="max-h-[460px] w-auto max-w-full object-contain rounded-xl cursor-zoom-in transition-transform duration-150 group-hover:scale-[1.008] bg-white border border-[#B8CCE0]"
                    />
                  </div>
                )}

                {/* Options List */}
                <div className="space-y-3 pt-2">
                  {currentQ.options?.map((opt) => {
                    const isSelected = selectedValue === opt.id;

                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleSelectOption(opt.id)}
                        className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border-2 transition-all duration-200 flex items-start gap-3.5 cursor-pointer select-none group ${
                          isSelected
                            ? 'bg-[#2C4B6B] border-[#E49548] text-white shadow-md -translate-y-0.5'
                            : 'bg-white border-[#B8CCE0] text-[#1E3954] hover:bg-[#FAF3E3]/50 hover:border-[#E49548] hover:shadow-xs'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-[#E49548] text-[#1E3954] border border-[#F4E6CC]'
                              : 'bg-[#EBF1F6] border border-[#B8CCE0] text-[#1E3954] group-hover:border-[#E49548] group-hover:bg-[#F4E6CC]'
                          }`}
                        >
                          {isSelected ? <Check className="w-4 h-4 text-[#1E3954] stroke-[3]" /> : opt.id}
                        </div>
                        <div
                          className={`flex-1 pt-1 text-sm sm:text-base leading-relaxed overflow-x-auto ${
                            isSelected ? 'text-white katex-white font-medium' : 'text-[#1E3954]'
                          }`}
                        >
                          <MathRenderer
                            content={opt.text}
                            className={isSelected ? 'text-white katex-white' : 'text-[#1E3954]'}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Question Action Controls */}
                <div className="pt-4 border-t border-[#EBF1F6] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                      disabled={currentIndex === 0}
                      className="px-3.5 py-2 rounded-xl border border-[#B8CCE0] bg-[#FAF3E3] hover:bg-[#F4E6CC] hover:border-[#E49548] disabled:opacity-40 text-xs font-bold text-[#1E3954] flex items-center gap-1.5 cursor-pointer shadow-xs transition-all duration-200"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Sebelumnya</span>
                    </button>

                    <button
                      onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                      disabled={currentIndex === questions.length - 1}
                      className="px-3.5 py-2 rounded-xl border border-[#B8CCE0] bg-[#FAF3E3] hover:bg-[#F4E6CC] hover:border-[#E49548] disabled:opacity-40 text-xs font-bold text-[#1E3954] flex items-center gap-1.5 cursor-pointer shadow-xs transition-all duration-200"
                    >
                      <span>Selanjutnya</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedValue && (
                      <button
                        onClick={handleClearAnswer}
                        className="px-3 py-2 rounded-xl hover:bg-[#EBF1F6] text-xs font-medium text-[#4E779F] hover:text-[#1E3954] flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Hapus Pilihan</span>
                      </button>
                    )}

                    <button
                      onClick={handleToggleDoubtful}
                      className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all duration-200 ${
                        isDoubtful
                          ? 'bg-[#FAF3E3] border-[#E49548] text-[#1E3954]'
                          : 'bg-white border-[#B8CCE0] text-[#1E3954] hover:border-[#E49548]'
                      }`}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${isDoubtful ? 'fill-[#E49548] text-[#CE7D30]' : 'text-[#4E779F]'}`} />
                      <span>{isDoubtful ? 'Ragu-ragu' : 'Tandai Ragu'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* ======================================================== */
            /* SUMMARY / REVIEW VIEW                                    */
            /* ======================================================== */
            <div className="bg-white border-2 border-[#E49548]/60 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 text-center">
              <div className="w-14 h-14 rounded-3xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-xs border border-emerald-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-700" />
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                  Simulasi Selesai & Berhasil
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold text-[#1E3954] mt-2">
                  Anda Telah Mencoba Format Soal MMO 2027!
                </h3>
                <p className="text-xs sm:text-sm text-[#4E779F] max-w-lg mx-auto mt-2 leading-relaxed">
                  Latihan ini bersifat mandiri dan tidak mengurangi nilai ujian asli. Format tampilan soal, rumus KaTeX, dan tombol aksi pada ujian resmi akan sama persis seperti simulasi ini.
                </p>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto bg-[#FAF3E3] border border-[#E49548]/50 rounded-2xl p-4">
                <div>
                  <span className="text-xs text-[#4E779F] block">Total Soal</span>
                  <span className="text-lg font-mono font-bold text-[#1E3954]">{questions.length}</span>
                </div>
                <div>
                  <span className="text-xs text-[#4E779F] block">Terjawab</span>
                  <span className="text-lg font-mono font-bold text-emerald-700">{answeredCount}</span>
                </div>
                <div>
                  <span className="text-xs text-[#4E779F] block">Ragu-ragu</span>
                  <span className="text-lg font-mono font-bold text-[#CE7D30]">{doubtfulCount}</span>
                </div>
              </div>

              {/* Explanations Toggle */}
              <div className="max-w-xl mx-auto pt-2">
                <button
                  type="button"
                  onClick={() => setShowExplanations(!showExplanations)}
                  className="px-4 py-2 bg-[#FAF3E3] hover:bg-[#F4E6CC] text-[#1E3954] border border-[#E49548] rounded-2xl text-xs font-bold flex items-center justify-center gap-2 mx-auto cursor-pointer transition-all duration-200 shadow-xs hover:-translate-y-0.5"
                >
                  <BookOpen className="w-4 h-4 text-[#CE7D30]" />
                  <span>{showExplanations ? 'Sembunyikan Kunci & Pembahasan' : 'Lihat Kunci & Pembahasan 3 Soal Ini'}</span>
                </button>

                {showExplanations && (
                  <div className="mt-4 space-y-4 text-left animate-in fade-in duration-200">
                    {questions.map((q, idx) => {
                      const userAns = answers[q.id]?.value || 'Tidak dijawab';
                      const isCorrect = userAns.toUpperCase() === q.correctAnswer?.toUpperCase();

                      return (
                        <div key={q.id} className="p-4 rounded-2xl border border-[#B8CCE0] bg-[#EBF1F6]/50 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-[#1E3954]">
                              Nomor {idx + 1} ({q.domain})
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-lg font-bold text-[11px] ${
                                isCorrect
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-[#FAF3E3] text-[#1E3954] border border-[#E49548]/50'
                              }`}
                            >
                              Jawaban Anda: {userAns} | Kunci: {q.correctAnswer}
                            </span>
                          </div>
                          {q.explanation && (
                            <div className="text-xs text-[#1E3954] bg-white p-3 rounded-xl border border-[#B8CCE0] leading-relaxed overflow-x-auto">
                              <MathRenderer content={q.explanation} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#EBF1F6] flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleResetTrial}
                  className="px-4 py-2.5 rounded-2xl bg-white hover:bg-[#FAF3E3] border border-[#B8CCE0] hover:border-[#E49548] text-[#1E3954] text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs hover:-translate-y-0.5 transition-all duration-200"
                >
                  <RotateCcw className="w-4 h-4 text-[#CE7D30]" />
                  <span>Ulangi Simulasi</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSummary(false)}
                  className="px-4 py-2.5 rounded-2xl bg-[#FAF3E3] hover:bg-[#F4E6CC] border border-[#E49548]/60 text-[#1E3954] text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs transition-all duration-200"
                >
                  <ArrowLeft className="w-4 h-4 text-[#1E3954]" />
                  <span>Periksa Lembar Soal</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-2xl bg-[#2C4B6B] hover:bg-[#243E59] text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm hover:-translate-y-0.5 transition-all duration-200 border border-[#E49548]"
                >
                  <LogOut className="w-4 h-4 text-[#F4E6CC]" />
                  <span>Kembali ke Ruang Tunggu</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer on Question Mode */}
        {!showSummary && (
          <div className="bg-white border-t border-[#B8CCE0] px-5 py-3 flex items-center justify-between text-xs text-[#4E779F] shrink-0">
            <span className="text-[11px] font-medium">
              Terjawab: {answeredCount}/{questions.length} · Ragu: {doubtfulCount}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl text-[#4E779F] hover:text-[#1E3954] cursor-pointer font-semibold"
              >
                Tutup Sementara
              </button>
              <button
                type="button"
                onClick={() => setShowSummary(true)}
                className="px-4 py-2 rounded-2xl bg-[#E49548] hover:bg-[#CE7D30] text-[#1E3954] text-xs font-extrabold cursor-pointer shadow-sm hover:-translate-y-0.5 transition-all duration-200 border border-[#CE7D30]"
              >
                Selesai Uji Coba
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Modal for Question Screenshot */}
      {previewImage && (
        <div
          className="fixed inset-0 z-60 bg-[#1E3954]/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 cursor-zoom-out animate-in fade-in duration-150"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-5xl max-h-[92vh] flex flex-col items-center bg-white border-2 border-[#E49548] p-3 rounded-2xl shadow-2xl cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-[#EBF1F6] text-xs">
              <span className="font-bold text-[#1E3954]">
                Pratinjau Diperbesar · Soal Simulasi #{currentIndex + 1}
              </span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-lg hover:bg-[#FAF3E3] text-[#4E779F] hover:text-[#1E3954] cursor-pointer transition-colors"
                title="Tutup (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={previewImage}
              alt={`Tangkapan Layar Soal ${currentIndex + 1}`}
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
