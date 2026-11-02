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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#fafafa] border border-[#D5D5D5] rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200">
        
        {/* Header with Iron Gate #53585E and Sky Blue #83B9DF */}
        <div className="bg-[#53585E] text-white px-5 py-4 flex items-center justify-between border-b border-[#41454a] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center text-[#83B9DF] border border-white/20 shadow-xs">
              <Sparkles className="w-5 h-5 text-[#83B9DF] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#83B9DF]/20 px-2.5 py-0.5 rounded-lg text-[#83B9DF] border border-[#83B9DF]/30">
                  Simulasi Mandiri · 3 Soal
                </span>
                <span className="text-xs text-[#83B9DF]">
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
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
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
              {/* Top Sub-Bar: Question switcher pills & scratchpad trigger */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#D5D5D5] rounded-2xl p-3 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#53585E] uppercase tracking-wider mr-1">
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
                            ? 'ring-2 ring-[#83B9DF] bg-[#53585E] text-white shadow-sm -translate-y-0.5'
                            : isDbt
                            ? 'bg-amber-100 border border-amber-300 text-amber-900'
                            : isAns
                            ? 'bg-[#53585E]/80 text-white'
                            : 'bg-[#f7f7f8] border border-[#D5D5D5] text-[#53585E] hover:border-[#83B9DF] hover:bg-[#83B9DF]/10'
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
                    className="px-3.5 py-1.5 rounded-xl bg-[#53585E] hover:bg-[#41454a] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow-[0_6px_16px_rgba(131,185,223,0.35)] hover:-translate-y-0.5 transition-all duration-200 border border-[#53585E]"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#83B9DF]" />
                    <span>Selesai Uji Coba</span>
                  </button>
                </div>
              </div>

              {/* Question Card */}
              <div className="bg-white border border-[#D5D5D5] rounded-3xl p-5 sm:p-7 shadow-xs space-y-6 transition-all duration-300 hover:border-[#83B9DF]/60">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#D5D5D5]">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-[#53585E]">
                      Soal Nomor {currentIndex + 1} dari {questions.length}
                    </span>
                    <span className="text-zinc-300">·</span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-[#83B9DF]/15 border border-[#83B9DF]/40 text-[#53585E]">
                      {currentQ.domain}
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-zinc-500 bg-[#f7f7f8] border border-[#D5D5D5] px-2 py-0.5 rounded-md">
                    Format: Pilihan Ganda (A-E)
                  </span>
                </div>

                {/* MathRenderer for Formula */}
                <div className="text-zinc-900 text-base sm:text-lg leading-relaxed select-none overflow-x-auto">
                  <MathRenderer content={currentQ.text} />
                </div>

                {/* Options List with Sky Blue selection and Iron Gate structure */}
                <div className="space-y-3 pt-2">
                  {currentQ.options?.map((opt) => {
                    const isSelected = selectedValue === opt.id;

                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleSelectOption(opt.id)}
                        className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border-2 transition-all duration-200 flex items-start gap-3.5 cursor-pointer select-none group ${
                          isSelected
                            ? 'bg-[#53585E] border-[#53585E] text-white shadow-md shadow-[#83B9DF]/20 -translate-y-0.5'
                            : 'bg-white border-[#D5D5D5] text-zinc-900 hover:bg-[#83B9DF]/5 hover:border-[#83B9DF] hover:shadow-xs'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-[#83B9DF] text-[#41454a]'
                              : 'bg-[#f7f7f8] border border-[#D5D5D5] text-[#53585E] group-hover:border-[#83B9DF] group-hover:bg-[#83B9DF]/20'
                          }`}
                        >
                          {isSelected ? <Check className="w-4 h-4 text-[#41454a] stroke-[3]" /> : opt.id}
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

                {/* Question Action Controls */}
                <div className="pt-4 border-t border-[#D5D5D5] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                      disabled={currentIndex === 0}
                      className="px-3.5 py-2 rounded-xl border border-[#D5D5D5] bg-white hover:bg-[#f7f7f8] hover:border-[#83B9DF] disabled:opacity-40 text-xs font-semibold text-[#53585E] flex items-center gap-1.5 cursor-pointer shadow-xs transition-all duration-200"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Sebelumnya</span>
                    </button>

                    <button
                      onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                      disabled={currentIndex === questions.length - 1}
                      className="px-3.5 py-2 rounded-xl border border-[#D5D5D5] bg-white hover:bg-[#f7f7f8] hover:border-[#83B9DF] disabled:opacity-40 text-xs font-semibold text-[#53585E] flex items-center gap-1.5 cursor-pointer shadow-xs transition-all duration-200"
                    >
                      <span>Selanjutnya</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedValue && (
                      <button
                        onClick={handleClearAnswer}
                        className="px-3 py-2 rounded-xl hover:bg-zinc-100 text-xs font-medium text-zinc-500 hover:text-zinc-800 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Hapus Pilihan</span>
                      </button>
                    )}

                    <button
                      onClick={handleToggleDoubtful}
                      className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all duration-200 ${
                        isDoubtful
                          ? 'bg-amber-50 border-amber-300 text-amber-800'
                          : 'bg-white border-[#D5D5D5] text-[#53585E] hover:border-amber-400'
                      }`}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${isDoubtful ? 'fill-amber-500 text-amber-500' : ''}`} />
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
            <div className="bg-white border border-[#D5D5D5] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 text-center">
              <div className="w-14 h-14 rounded-3xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-xs border border-emerald-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-700" />
              </div>

              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                  Simulasi Selesai & Berhasil
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold text-[#53585E] mt-2">
                  Anda Telah Mencoba Format Soal MMO 2027!
                </h3>
                <p className="text-xs sm:text-sm text-zinc-600 max-w-lg mx-auto mt-2 leading-relaxed">
                  Latihan ini bersifat mandiri dan tidak mengurangi nilai ujian asli. Format tampilan soal, rumus KaTeX, dan tombol aksi pada ujian resmi akan sama persis seperti simulasi ini.
                </p>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto bg-[#f7f7f8] border border-[#D5D5D5] rounded-2xl p-4">
                <div>
                  <span className="text-xs text-zinc-500 block">Total Soal</span>
                  <span className="text-lg font-mono font-bold text-[#53585E]">{questions.length}</span>
                </div>
                <div>
                  <span className="text-xs text-zinc-500 block">Terjawab</span>
                  <span className="text-lg font-mono font-bold text-emerald-700">{answeredCount}</span>
                </div>
                <div>
                  <span className="text-xs text-zinc-500 block">Ragu-ragu</span>
                  <span className="text-lg font-mono font-bold text-amber-600">{doubtfulCount}</span>
                </div>
              </div>

              {/* Explanations Toggle */}
              <div className="max-w-xl mx-auto pt-2">
                <button
                  type="button"
                  onClick={() => setShowExplanations(!showExplanations)}
                  className="px-4 py-2 bg-white hover:bg-[#f7f7f8] text-[#53585E] border border-[#D5D5D5] hover:border-[#83B9DF] rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 mx-auto cursor-pointer transition-all duration-200 shadow-xs hover:-translate-y-0.5"
                >
                  <BookOpen className="w-4 h-4 text-[#83B9DF]" />
                  <span>{showExplanations ? 'Sembunyikan Kunci & Pembahasan' : 'Lihat Kunci & Pembahasan 3 Soal Ini'}</span>
                </button>

                {showExplanations && (
                  <div className="mt-4 space-y-4 text-left animate-in fade-in duration-200">
                    {questions.map((q, idx) => {
                      const userAns = answers[q.id]?.value || 'Tidak dijawab';
                      const isCorrect = userAns.toUpperCase() === q.correctAnswer?.toUpperCase();

                      return (
                        <div key={q.id} className="p-4 rounded-2xl border border-[#D5D5D5] bg-[#fafafa] space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-[#53585E]">
                              Nomor {idx + 1} ({q.domain})
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-lg font-bold text-[11px] ${
                                isCorrect
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-zinc-200 text-zinc-700'
                              }`}
                            >
                              Jawaban Anda: {userAns} | Kunci: {q.correctAnswer}
                            </span>
                          </div>
                          {q.explanation && (
                            <div className="text-xs text-zinc-700 bg-white p-3 rounded-xl border border-zinc-200 leading-relaxed overflow-x-auto">
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
              <div className="pt-4 border-t border-[#D5D5D5] flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleResetTrial}
                  className="px-4 py-2.5 rounded-2xl bg-white hover:bg-[#f7f7f8] border border-[#D5D5D5] hover:border-[#83B9DF] text-[#53585E] text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs hover:-translate-y-0.5 transition-all duration-200"
                >
                  <RotateCcw className="w-4 h-4 text-[#83B9DF]" />
                  <span>Ulangi Simulasi</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSummary(false)}
                  className="px-4 py-2.5 rounded-2xl bg-[#f7f7f8] hover:bg-zinc-200 border border-[#D5D5D5] text-[#53585E] text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs transition-all duration-200"
                >
                  <ArrowLeft className="w-4 h-4 text-[#53585E]" />
                  <span>Periksa Lembar Soal</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-2xl bg-[#53585E] hover:bg-[#41454a] text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm hover:shadow-[0_6px_20px_rgba(131,185,223,0.35)] hover:-translate-y-0.5 transition-all duration-200 border border-[#53585E]"
                >
                  <LogOut className="w-4 h-4 text-[#83B9DF]" />
                  <span>Kembali ke Ruang Tunggu</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer on Question Mode */}
        {!showSummary && (
          <div className="bg-white border-t border-[#D5D5D5] px-5 py-3 flex items-center justify-between text-xs text-zinc-600 shrink-0">
            <span className="text-[11px] text-zinc-500">
              Terjawab: {answeredCount}/{questions.length} · Ragu: {doubtfulCount}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl text-zinc-600 hover:text-zinc-900 cursor-pointer font-medium"
              >
                Tutup Sementara
              </button>
              <button
                type="button"
                onClick={() => setShowSummary(true)}
                className="px-4 py-2 rounded-2xl bg-[#53585E] hover:bg-[#41454a] text-white text-xs font-bold cursor-pointer shadow-sm hover:shadow-[0_6px_20px_rgba(131,185,223,0.35)] hover:-translate-y-0.5 transition-all duration-200 border border-[#53585E]"
              >
                Selesai Uji Coba
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
