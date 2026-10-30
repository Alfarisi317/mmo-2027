import React, { useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import { Award, CheckCircle, XCircle, MinusCircle, ShieldCheck, Download, RotateCcw, ChevronDown, ChevronUp, Printer } from 'lucide-react';
import { Question, UserAnswer, ViolationRecord, ParticipantProfile, MathDomain } from '../types';
import { MathRenderer } from './MathRenderer';

interface ExamResultViewProps {
  participant: ParticipantProfile;
  questions: Question[];
  userAnswers: Record<string, UserAnswer>;
  violations: ViolationRecord[];
  trustScore: number;
  onRetakeOrReturn: () => void;
  onGoToDashboard: () => void;
}

export const ExamResultView: React.FC<ExamResultViewProps> = ({
  participant,
  questions,
  userAnswers,
  violations,
  trustScore,
  onRetakeOrReturn,
  onGoToDashboard,
}) => {
  const [expandedSolutions, setExpandedSolutions] = useState<Record<string, boolean>>({});

  // Compute grading
  const stats = useMemo(() => {
    let correctCount = 0;
    let wrongCount = 0;
    let blankCount = 0;
    let totalScore = 0;

    const domainStats: Record<MathDomain, { total: number; correct: number; wrong: number; blank: number; score: number }> = {
      'Aljabar': { total: 0, correct: 0, wrong: 0, blank: 0, score: 0 },
      'Geometri': { total: 0, correct: 0, wrong: 0, blank: 0, score: 0 },
      'Kombinatorika': { total: 0, correct: 0, wrong: 0, blank: 0, score: 0 },
      'Teori Bilangan': { total: 0, correct: 0, wrong: 0, blank: 0, score: 0 },
    };

    questions.forEach((q) => {
      const userAns = userAnswers[q.id]?.value;
      const domain = q.domain;

      domainStats[domain].total += 1;

      if (!userAns) {
        blankCount += 1;
        domainStats[domain].blank += 1;
      } else if (userAns.trim().toUpperCase() === q.correctAnswer.trim().toUpperCase()) {
        correctCount += 1;
        totalScore += q.points.correct;
        domainStats[domain].correct += 1;
        domainStats[domain].score += q.points.correct;
      } else {
        wrongCount += 1;
        totalScore += q.points.wrong;
        domainStats[domain].wrong += 1;
        domainStats[domain].score += q.points.wrong;
      }
    });

    const maxScore = questions.length * 4;
    const accuracy = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

    return {
      correctCount,
      wrongCount,
      blankCount,
      totalScore,
      maxScore,
      accuracy,
      domainStats,
    };
  }, [questions, userAnswers]);

  // Celebrate with confetti if score is solid
  useEffect(() => {
    if (stats.totalScore >= stats.maxScore * 0.5) {
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#e2e8f0', '#94a3b8', '#64748b', '#cbd5e1'],
        });
      } catch (e) {
        // Safe confetti catch
      }
    }
  }, [stats.totalScore, stats.maxScore]);

  const toggleSolution = (qId: string) => {
    setExpandedSolutions((prev) => ({
      ...prev,
      [qId]: !prev[qId],
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 lg:py-12 space-y-8">
      {/* Official Certificate & Result Header Card */}
      <div className="bg-[#181a24] border border-[#262835] rounded-2xl p-6 lg:p-10 shadow-2xl relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-slate-400/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#262835]">
          <div>
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase block mb-1">
              Lembar Hasil Penilaian Instan · MMO 2026
            </span>
            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
              Matriks Mathematics Olympiad
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Universitas Muhammadiyah Malang · Prodi Pendidikan Matematika · HMPS MATRIKS Bidang Keilmuan
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-lg bg-[#22242f] hover:bg-[#2c303f] border border-[#333748] text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              Cetak / Simpan PDF
            </button>
            <button
              onClick={onGoToDashboard}
              className="px-3.5 py-2 rounded-lg bg-slate-200 hover:bg-white text-slate-900 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              Buka Dasbor Pengawas
            </button>
          </div>
        </div>

        {/* Participant Profile Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 py-6 border-b border-[#262835] text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">Nama Peserta</span>
            <span className="text-sm font-semibold text-white truncate block">{participant.fullName}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Asal Sekolah</span>
            <span className="text-sm font-semibold text-slate-200 truncate block">{participant.school}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Nomor Ujian / NISN</span>
            <span className="text-sm font-mono font-semibold text-slate-200 block">{participant.nisnOrRegNumber}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Kategori / Babak</span>
            <span className="text-sm font-semibold text-slate-200 block">{participant.category} · {participant.stage || 'Penyisihan'}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Kota / Domisili</span>
            <span className="text-sm font-semibold text-slate-200 block">{participant.city || '-'}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Email Akun</span>
            <span className="text-sm font-mono font-semibold text-slate-200 truncate block">{participant.email || '-'}</span>
          </div>
        </div>

        {/* Score Overview Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6">
          <div className="bg-[#121316] border border-[#252735] p-4 rounded-xl">
            <span className="text-xs text-slate-400 block mb-1">Skor Akhir Olimpiade</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl lg:text-4xl font-mono font-bold text-white tabular-nums">
                {stats.totalScore}
              </span>
              <span className="text-xs text-slate-400 font-mono">/ {stats.maxScore}</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Rumus: (Benar × 4) + (Salah × -1)
            </span>
          </div>

          <div className="bg-[#121316] border border-[#252735] p-4 rounded-xl">
            <span className="text-xs text-slate-400 block mb-1">Akurasi Jawaban</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl lg:text-4xl font-mono font-bold text-slate-100 tabular-nums">
                {stats.accuracy}%
              </span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {stats.correctCount} dari {questions.length} soal benar
            </span>
          </div>

          <div className="bg-[#121316] border border-[#252735] p-4 rounded-xl">
            <span className="text-xs text-slate-400 block mb-1">Distribusi Jawaban</span>
            <div className="flex items-center gap-3 text-xs mt-2 font-mono">
              <span className="text-emerald-400 font-bold">✓ {stats.correctCount}</span>
              <span className="text-rose-400 font-bold">✗ {stats.wrongCount}</span>
              <span className="text-slate-400 font-bold">○ {stats.blankCount}</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-2 block">
              Benar / Salah / Kosong
            </span>
          </div>

          <div className="bg-[#121316] border border-[#252735] p-4 rounded-xl">
            <span className="text-xs text-slate-400 block mb-1">Integritas Proktor AI</span>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-3xl lg:text-4xl font-mono font-bold tabular-nums ${
                trustScore > 85 ? 'text-emerald-400' : trustScore > 65 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {trustScore}%
              </span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {violations.length} Pelanggaran tercatat
            </span>
          </div>
        </div>
      </div>

      {/* Domain Breakdown Matrix */}
      <div className="bg-[#181a24] border border-[#262833] rounded-2xl p-6 lg:p-8 shadow-xl">
        <h3 className="text-base font-bold text-white mb-1">
          Analisis Penguasaan Bidang Matematika
        </h3>
        <p className="text-xs text-slate-400 mb-6">
          Evaluasi kemampuan analitis peserta berdasarkan 4 domain olimpiade matematika.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(Object.keys(stats.domainStats) as MathDomain[]).map((dom) => {
            const data = stats.domainStats[dom];
            const pct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;

            return (
              <div key={dom} className="bg-[#13141b] border border-[#272937] p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block mb-1">{dom}</span>
                  <div className="flex items-baseline justify-between text-xs text-slate-400 mb-2">
                    <span>Akurasi: <strong className="text-slate-100 font-mono">{pct}%</strong></span>
                    <span>Skor: <strong className="text-slate-100 font-mono">{data.score}</strong></span>
                  </div>
                  <div className="w-full h-1.5 bg-[#1f212c] rounded-full overflow-hidden">
                    <div className="h-full bg-slate-300 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 mt-3 pt-2 border-t border-[#222430] flex justify-between">
                  <span>{data.correct} Benar</span>
                  <span>{data.wrong} Salah</span>
                  <span>{data.blank} Kosong</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Anti-cheat & Proctor Log if any */}
      {violations.length > 0 && (
        <div className="bg-[#181a24] border border-[#262833] rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">
              Log Pelanggaran Proktor AI & Anti-Cheat
            </h3>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {violations.map((v) => (
              <div key={v.id} className="text-xs bg-[#13141b] border border-[#272937] p-2.5 rounded-lg flex items-center justify-between">
                <span className="text-slate-300">{v.description}</span>
                <span className="text-slate-400 font-mono text-[11px] shrink-0 ml-3">
                  {new Date(v.timestamp).toLocaleTimeString('id-ID')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Question Review and Mathematical Solutions */}
      <div className="bg-[#181a24] border border-[#262833] rounded-2xl p-6 lg:p-8 shadow-xl">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#262833]">
          <div>
            <h3 className="text-base font-bold text-white">
              Pembahasan Lengkap & Kunci Jawaban
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Pelajari langkah pembuktian matematis dan rumus solusi resmi dari Dewan Juri MMO.
            </p>
          </div>
          <button
            onClick={() => {
              const allOpen = Object.keys(expandedSolutions).length === questions.length;
              if (allOpen) {
                setExpandedSolutions({});
              } else {
                const next: Record<string, boolean> = {};
                questions.forEach((q) => { next[q.id] = true; });
                setExpandedSolutions(next);
              }
            }}
            className="text-xs text-slate-300 hover:text-white underline cursor-pointer"
          >
            {Object.keys(expandedSolutions).length === questions.length ? 'Tutup Semua' : 'Buka Semua Pembahasan'}
          </button>
        </div>

        <div className="space-y-4">
          {questions.map((q, idx) => {
            const userAns = userAnswers[q.id]?.value;
            const isCorrect = userAns && userAns.trim().toUpperCase() === q.correctAnswer.trim().toUpperCase();
            const isBlank = !userAns;
            const isOpen = Boolean(expandedSolutions[q.id]);

            return (
              <div
                key={q.id}
                className="bg-[#13141c] border border-[#252735] rounded-xl overflow-hidden transition-all"
              >
                {/* Header row */}
                <div
                  onClick={() => toggleSolution(q.id)}
                  className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-[#171822] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 bg-[#1e202a] text-slate-300">
                      {idx + 1}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-slate-200">{q.domain}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-400">Pilihan Anda: <strong className="text-slate-200">{userAns || 'Kosong'}</strong></span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-400">Kunci: <strong className="text-emerald-400">{q.correctAnswer}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {isBlank ? (
                      <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                        <MinusCircle className="w-3.5 h-3.5" /> 0 Poin
                      </span>
                    ) : isCorrect ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-400 font-bold">
                        <CheckCircle className="w-3.5 h-3.5" /> +4 Poin
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-rose-400 font-bold">
                        <XCircle className="w-3.5 h-3.5" /> -1 Poin
                      </span>
                    )}

                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Solution */}
                {isOpen && (
                  <div className="p-4 pt-2 border-t border-[#232533] bg-[#111217] space-y-3 text-sm">
                    <div className="text-slate-200 leading-relaxed pb-3 border-b border-[#232533]">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                        Soal:
                      </span>
                      <MathRenderer content={q.text} />
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                        Pembahasan & Penjelasan Resmi:
                      </span>
                      <div className="text-slate-300 leading-relaxed bg-[#161822] border border-[#272938] p-3.5 rounded-lg text-xs lg:text-sm">
                        <MathRenderer content={q.explanation} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Return button */}
      <div className="flex justify-center pt-4">
        <button
          onClick={onRetakeOrReturn}
          className="px-6 py-3 rounded-xl bg-[#22242f] hover:bg-[#2c303f] border border-[#333748] text-xs font-semibold text-slate-200 transition-colors flex items-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 text-slate-300" />
          Kembali ke Beranda MMO
        </button>
      </div>
    </div>
  );
};
