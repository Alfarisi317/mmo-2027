import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, Monitor, LayoutGrid, Camera, BellRing, X, HardDrive, RefreshCw, Cloud, ShieldAlert, ArrowLeft, ArrowRight } from 'lucide-react';
import { Question, UserAnswer, ViolationType, ViolationRecord, ParticipantProfile } from '../types';
import { QuestionCard } from './QuestionCard';
import { ExamPalette } from './ExamPalette';
import { ExamTimer } from './ExamTimer';
import { AIProctor } from './AIProctor';
import { AntiCheatGuard } from './AntiCheatGuard';
import { ApiService } from '../services/api';

interface ExamRoomProps {
  questions: Question[];
  participant: ParticipantProfile;
  durationMinutes?: number;
  onSubmitExam: (
    answers: Record<string, UserAnswer>,
    violations: ViolationRecord[],
    trustScore: number,
    durationSeconds?: number
  ) => void;
  onExitExam?: () => void;
}

export const ExamRoom: React.FC<ExamRoomProps> = ({
  questions,
  participant,
  durationMinutes = 60,
  onSubmitExam,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [violations, setViolations] = useState<ViolationRecord[]>([]);
  const [trustScore, setTrustScore] = useState<number>(100);
  const [strikeCount, setStrikeCount] = useState<number>(0);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [proctorMessage, setProctorMessage] = useState<string | null>(null);

  // Mobile drawer/view toggle ('question' | 'camera' | 'palette')
  const [mobileTab, setMobileTab] = useState<'question' | 'camera' | 'palette'>('question');

  const totalSeconds = durationMinutes * 60;
  const [remainingSeconds, setRemainingSeconds] = useState<number>(totalSeconds);

  // Storage key for 100% offline-safe local answers
  const storageKey = `mmo_exam_answers_${participant.id}`;

  // Answer state initialized from localStorage
  const [userAnswers, setUserAnswers] = useState<Record<string, UserAnswer>>(() => {
    try {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn('Failed to parse cached answers:', e);
    }
    return {};
  });

  // Sync timestamps & UI indicators
  const [lastSavedLocal, setLastSavedLocal] = useState<string>(() =>
    new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );
  const [lastSyncedServer, setLastSyncedServer] = useState<string | null>(null);
  const [isSyncingServer, setIsSyncingServer] = useState<boolean>(false);
  const [aiIncidentReportAlert, setAiIncidentReportAlert] = useState<string | null>(null);

  // References to avoid stale closures in intervals
  const userAnswersRef = useRef(userAnswers);
  userAnswersRef.current = userAnswers;
  const strikeCountRef = useRef(strikeCount);
  strikeCountRef.current = strikeCount;
  const trustScoreRef = useRef(trustScore);
  trustScoreRef.current = trustScore;
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const hasTriggeredAIRef = useRef<boolean>(false);

  // Batch sync answers and progress to server (Throttled per 3 minutes to support 200+ concurrent students)
  const syncProgressToServer = useCallback(async () => {
    if (!participant.id) return;
    const answeredCount = Object.values(userAnswersRef.current).filter((a) => a.status === 'answered').length;
    const currentStatus =
      strikeCountRef.current >= 4 ? 'DISQUALIFIED' : strikeCountRef.current >= 2 ? 'WARNING' : 'ACTIVE';

    setIsSyncingServer(true);
    try {
      await ApiService.updateParticipantProgress(participant.id, {
        answeredCount,
        currentQuestion: currentIndexRef.current + 1,
        strikeCount: strikeCountRef.current,
        trustScore: trustScoreRef.current,
        status: currentStatus,
        lastActive: 'Baru saja',
      });
      const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSyncedServer(nowTime);
    } catch (err) {
      console.warn('Server sync delayed (network safe):', err);
    } finally {
      setIsSyncingServer(false);
    }
  }, [participant.id]);

  // Periodic server sync every 3 minutes (180,000 ms) - completely free and lightweight for 200+ users
  useEffect(() => {
    if (!participant.id) return;

    // Initial sync
    syncProgressToServer();

    // 3-Minute Interval (180 seconds)
    const syncInterval = setInterval(() => {
      syncProgressToServer();
    }, 180000);

    return () => clearInterval(syncInterval);
  }, [participant.id, syncProgressToServer]);

  // Selective AI Proctor Trigger: Invoked ONLY when participant violations exceed 3 (strikeCount > 3)
  useEffect(() => {
    if (strikeCount > 3 && !hasTriggeredAIRef.current) {
      hasTriggeredAIRef.current = true;

      // Extract webcam photo evidence from AIProctor canvas hook
      let snapshotBase64: string | undefined;
      if (typeof (window as any).__mmo_capture_snapshot === 'function') {
        const snap = (window as any).__mmo_capture_snapshot();
        if (snap) snapshotBase64 = snap;
      }

      ApiService.generateAIViolationReport({
        participantId: participant.id,
        participantName: participant.fullName,
        violations,
        snapshotBase64,
        strikeCount,
      })
        .then((res) => {
          if (res.success && res.report) {
            setAiIncidentReportAlert(res.report);
          }
        })
        .catch((err) => {
          console.warn('AI report generation error:', err);
        });
    }
  }, [strikeCount, participant.id, participant.fullName, violations]);

  // Poll for broadcasts and direct warnings from proctor
  useEffect(() => {
    if (!participant.id) return;
    const pollInterval = setInterval(async () => {
      try {
        const warning = await ApiService.getWarning(participant.id);
        const broadcast = await ApiService.getBroadcast();
        const activeNotice = warning || broadcast;
        if (activeNotice) {
          setProctorMessage(activeNotice);
        }
      } catch {
        // ignore
      }
    }, 4000);

    return () => clearInterval(pollInterval);
  }, [participant.id]);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const persistAnswers = (updated: Record<string, UserAnswer>) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
      const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSavedLocal(nowTime);
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  };

  const handleSelectOption = (optionId: string, solutionStrategy?: string) => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;
    const updated: Record<string, UserAnswer> = {
      ...userAnswers,
      [currentQ.id]: {
        questionId: currentQ.id,
        value: optionId,
        solutionStrategy,
        status: 'answered',
        timestamp: Date.now(),
      },
    };
    setUserAnswers(updated);
    persistAnswers(updated);
  };

  const handleToggleDoubtful = () => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;
    const current = userAnswers[currentQ.id];
    const currentStatus = current?.status;

    const updated: Record<string, UserAnswer> = {
      ...userAnswers,
      [currentQ.id]: {
        questionId: currentQ.id,
        value: current?.value || '',
        solutionStrategy: current?.solutionStrategy,
        status: currentStatus === 'doubtful' ? (current?.value ? 'answered' : 'unanswered') : 'doubtful',
        timestamp: Date.now(),
      },
    };
    setUserAnswers(updated);
    persistAnswers(updated);
  };

  const handleClearAnswer = () => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;
    const updated = { ...userAnswers };
    delete updated[currentQ.id];
    setUserAnswers(updated);
    persistAnswers(updated);
  };

  const handleViolation = useCallback((type: ViolationType, description: string, severity: 'low' | 'medium' | 'high') => {
    const record: ViolationRecord = {
      id: `viol-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      type,
      severity,
      description,
    };

    setViolations((prev) => [record, ...prev]);

    const penalty = severity === 'high' ? 15 : severity === 'medium' ? 8 : 4;
    setTrustScore((prev) => Math.max(10, prev - penalty));

    if (severity === 'high' || type === 'TAB_SWITCH' || type === 'FULLSCREEN_EXIT') {
      setStrikeCount((prev) => prev + 1);
    }
  }, []);

  const handleUnlockByPin = (pin: string) => {
    if (pin.trim() === '2026' || pin.trim() === '2027') {
      setStrikeCount(0);
      return true;
    }
    return false;
  };

  const handleAutoSubmit = useCallback(() => {
    const durationSeconds = totalSeconds - remainingSeconds;
    // Flush final progress to server
    syncProgressToServer().catch(() => {});
    onSubmitExam(userAnswers, violations, trustScore, durationSeconds);
  }, [onSubmitExam, userAnswers, violations, trustScore, totalSeconds, remainingSeconds, syncProgressToServer]);

  const handleConfirmSubmit = () => {
    setShowSubmitModal(false);
    const durationSeconds = totalSeconds - remainingSeconds;
    // Flush final progress to server
    syncProgressToServer().catch(() => {});
    onSubmitExam(userAnswers, violations, trustScore, durationSeconds);
  };

  const currentQ = questions[currentIndex];
  const answeredTotal = questions.filter((q) => userAnswers[q.id]?.status === 'answered').length;
  const doubtfulTotal = questions.filter((q) => userAnswers[q.id]?.status === 'doubtful').length;
  const unansweredTotal = Math.max(0, questions.length - answeredTotal - doubtfulTotal);

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900 flex flex-col no-select">
      {/* Anti-cheat engine */}
      <AntiCheatGuard
        isActive={true}
        strikeCount={strikeCount}
        onViolation={handleViolation}
        onUnlockByPin={handleUnlockByPin}
      />

      {/* Dedicated Exam Room Header with clean neutral background */}
      <header className="sticky top-0 z-30 bg-[#f7f7f8]/95 backdrop-blur-md border-b border-[#D5D5D5] px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-6">
          {/* Brand & Participant Identity */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 rounded-2xl bg-[#646464] border border-[#646464] flex items-center justify-center font-bold text-white text-xs tracking-wider shadow-xs">
              M
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-xs sm:text-sm font-bold text-zinc-900 truncate">
                  {participant.fullName || 'Peserta MMO'}
                </span>
                <span className="text-[10px] sm:text-xs text-zinc-500 font-mono">
                  · {participant.category} {participant.stage ? `(${participant.stage})` : ''}
                </span>
              </div>
              <span className="text-[10px] sm:text-xs text-zinc-500 block truncate max-w-[130px] sm:max-w-xs">
                {participant.school || 'Sekolah'}
              </span>
            </div>
          </div>

          {/* Center Timer */}
          <div className="shrink-0">
            <ExamTimer
              remainingSeconds={remainingSeconds}
              totalSeconds={totalSeconds}
              onTimeExpire={handleAutoSubmit}
            />
          </div>

          {/* Action button: Khusus Layar Laptop/Desktop (di HP dipindah ke bilah bawah) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSubmitModal(true)}
              className="hidden lg:flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#646464] hover:bg-[#525252] rounded-2xl transition-all cursor-pointer whitespace-nowrap shadow-xs border border-[#646464]"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Kumpulkan Ujian</span>
            </button>
          </div>
        </div>

        {/* Resource-saving sync & storage status bar */}
        <div className="max-w-7xl mx-auto mt-2 pt-1.5 border-t border-[#E5E5E5] flex items-center justify-between text-[11px] text-zinc-600">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-lg font-medium text-[10px] sm:text-[11px]">
              <HardDrive className="w-3 h-3 text-emerald-600 shrink-0" />
              <span>Tersimpan di Browser</span>
              <span className="text-[10px] text-emerald-700 font-mono">· {lastSavedLocal}</span>
            </span>

            <span className="hidden sm:flex items-center gap-1.5 bg-zinc-100 text-zinc-700 border border-zinc-200 px-2 py-0.5 rounded-lg text-[11px]">
              <Cloud className="w-3 h-3 text-zinc-500 shrink-0" />
              <span>Sinkron Server:</span>
              <strong className="font-mono text-zinc-800">
                {lastSyncedServer ? lastSyncedServer : 'Menunggu sync berkala'}
              </strong>
              <span className="text-[10px] text-zinc-400">(Per 3 Menit)</span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => syncProgressToServer()}
            disabled={isSyncingServer}
            title="Kirim jawaban terbaru ke server sekarang tanpa menunggu 3 menit"
            className="flex items-center gap-1 text-[11px] font-semibold text-[#646464] hover:text-zinc-950 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncingServer ? 'animate-spin' : ''}`} />
            <span>{isSyncingServer ? 'Sinkron...' : 'Sinkron Sekarang'}</span>
          </button>
        </div>

        {/* Mobile Switcher Tab (HP Responsif) */}
        <div className="grid grid-cols-3 lg:hidden mt-2 pt-2 border-t border-[#D5D5D5] gap-1.5">
          <button
            onClick={() => setMobileTab('question')}
            className={`py-1.5 px-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1 ${
              mobileTab === 'question'
                ? 'bg-[#646464] text-white shadow-2xs'
                : 'bg-white border border-[#D5D5D5] text-zinc-700'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Soal</span>
          </button>
          <button
            onClick={() => setMobileTab('camera')}
            className={`py-1.5 px-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1 ${
              mobileTab === 'camera'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'bg-white border border-[#D5D5D5] text-emerald-800'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-emerald-600" />
            <span>Kamera</span>
          </button>
          <button
            onClick={() => setMobileTab('palette')}
            className={`py-1.5 px-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1 ${
              mobileTab === 'palette'
                ? 'bg-[#646464] text-white shadow-2xs'
                : 'bg-white border border-[#D5D5D5] text-zinc-700'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Nomor ({answeredTotal}/{questions.length})</span>
          </button>
        </div>
      </header>

      {/* AI Incident Report Alert Banner (Triggered only when violations > 3) */}
      {aiIncidentReportAlert && (
        <div className="bg-rose-950 text-rose-100 px-4 py-3 border-b border-rose-800 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-start gap-3 text-xs sm:text-sm">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-rose-200 uppercase tracking-wide text-xs">
                  Laporan Investigasi AI Pengawas (Pelanggaran &gt; 3 kali)
                </h4>
                <button
                  onClick={() => setAiIncidentReportAlert(null)}
                  className="text-rose-300 hover:text-white p-1 cursor-pointer"
                  title="Tutup pesan"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-rose-100 whitespace-pre-line leading-relaxed bg-black/40 p-2.5 rounded-xl border border-rose-800/60 font-sans">
                {aiIncidentReportAlert}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Proctor Notice Banner */}
      {proctorMessage && (
        <div className="bg-[#18181b] text-white px-4 py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm border-b border-zinc-700 shadow-md">
          <div className="flex items-center gap-2 max-w-5xl mx-auto flex-1">
            <BellRing className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold text-amber-300">Pemberitahuan Pengawas:</span>
            <span className="text-zinc-200">{proctorMessage}</span>
          </div>
          <button
            onClick={() => setProctorMessage(null)}
            className="text-zinc-400 hover:text-white p-1 rounded transition-colors"
            title="Tutup pesan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3.5 sm:p-5 lg:p-6 pb-28 lg:pb-6 grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">
        {/* Left: Active Question Area */}
        <div className={`lg:col-span-8 ${mobileTab !== 'question' ? 'hidden lg:block' : 'block'}`}>
          {currentQ ? (
            <QuestionCard
              question={currentQ}
              questionIndex={currentIndex}
              totalQuestions={questions.length}
              currentAnswer={userAnswers[currentQ.id]}
              onSelectOption={handleSelectOption}
              onToggleDoubtful={handleToggleDoubtful}
              onClearAnswer={handleClearAnswer}
              onPrev={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              onNext={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
              onSubmitExam={() => setShowSubmitModal(true)}
              isFirst={currentIndex === 0}
              isLast={currentIndex === questions.length - 1}
            />
          ) : (
            <div className="bg-white border border-[#D5D5D5] rounded-3xl p-8 text-center text-zinc-500">
              Tidak ada soal tersedia untuk sesi ini.
            </div>
          )}
        </div>

        {/* Right: AI Proctoring & Question Navigation Palette */}
        <div className="lg:col-span-4 space-y-4">
          {/* AIProctor is kept running with non-zero layout so video frames continue streaming to proctor without mobile freeze */}
          <div
            className={
              mobileTab === 'camera'
                ? 'block w-full'
                : 'block lg:block fixed lg:static -left-[9999px] top-0 w-[320px] h-[240px] lg:w-auto lg:h-auto pointer-events-none lg:pointer-events-auto opacity-0 lg:opacity-100'
            }
          >
            <AIProctor
              isActive={true}
              participantName={participant.fullName}
              onViolation={handleViolation}
              trustScore={trustScore}
              strikeCount={strikeCount}
            />
            {mobileTab === 'camera' && (
              <button
                type="button"
                onClick={() => setMobileTab('question')}
                className="mt-3 w-full py-2.5 rounded-2xl bg-[#646464] hover:bg-[#525252] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Monitor className="w-4 h-4" />
                <span>Kembali ke Lembar Soal</span>
              </button>
            )}
          </div>

          {/* Mobile persistent camera indicator bar */}
          {mobileTab === 'question' && (
            <div className="block lg:hidden bg-zinc-50 border border-[#D5D5D5] rounded-2xl p-2.5 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-semibold text-zinc-800">
                  Kamera Pengawas Terhubung & Aktif
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileTab('camera')}
                className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer flex items-center gap-1"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Atur Kamera →</span>
              </button>
            </div>
          )}

          <div className={mobileTab === 'palette' ? 'block' : 'hidden lg:block'}>
            <ExamPalette
              questions={questions}
              currentIndex={currentIndex}
              userAnswers={userAnswers}
              onSelectQuestion={(idx) => {
                setCurrentIndex(idx);
                setMobileTab('question'); // Switch back to question on mobile when selecting a number
              }}
              onSubmitExamClick={() => setShowSubmitModal(true)}
            />
          </div>
        </div>
      </main>

      {/* Mobile Sticky Bottom Action Bar (Khusus Layar HP agar Tombol Selesai Mudah Dilihat & Dijangkau) */}
      <aside
        aria-label="Bilah Aksi Bawah Mobile"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#D5D5D5] px-3.5 py-2.5 shadow-lg lg:hidden flex items-center justify-between gap-2"
      >
        {/* Tombol Cepat Sebelumnya & Selanjutnya */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="w-9 h-9 rounded-xl border border-[#D5D5D5] bg-[#f7f7f8] hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-zinc-700 cursor-pointer shadow-2xs"
            title="Soal Sebelumnya"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
            disabled={currentIndex === questions.length - 1}
            className="w-9 h-9 rounded-xl border border-[#D5D5D5] bg-[#f7f7f8] hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-zinc-700 cursor-pointer shadow-2xs"
            title="Soal Selanjutnya"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Tombol Nomor / Palet Soal */}
        <button
          type="button"
          onClick={() => setMobileTab(mobileTab === 'palette' ? 'question' : 'palette')}
          className={`flex-1 max-w-[130px] sm:max-w-[160px] py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs truncate ${
            mobileTab === 'palette'
              ? 'bg-zinc-800 border-zinc-800 text-white'
              : 'bg-[#fafafa] border-[#D5D5D5] text-zinc-700 hover:bg-zinc-100'
          }`}
          title="Buka daftar nomor soal"
        >
          <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">No. {currentIndex + 1} ({answeredTotal}/{questions.length})</span>
        </button>

        {/* Tombol Utama: SELESAI UJIAN (Mencolok, Terlihat Jelas di Bagian Bawah HP) */}
        <button
          type="button"
          onClick={() => setShowSubmitModal(true)}
          className="py-2.5 px-4 bg-[#27272a] hover:bg-black text-white font-extrabold text-xs rounded-2xl transition-all shadow-md flex items-center gap-2 cursor-pointer border border-zinc-800 active:scale-95 shrink-0 ring-1 ring-zinc-700/50"
          title="Kumpulkan lembar jawaban ujian"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Selesai Ujian</span>
        </button>
      </aside>

      {/* Confirmation Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D5D5D5] rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#646464] text-white flex items-center justify-center mx-auto mb-3 shadow-xs">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 mb-2">
              Konfirmasi Selesai Ujian MMO
            </h3>
            <p className="text-xs text-zinc-600 mb-5 leading-relaxed">
              Apakah Anda yakin ingin mengumpulkan seluruh lembar jawaban? Setelah dikumpulkan, bukti tanda terima resmi akan langsung diterbitkan dan data tersimpan di panitia.
            </p>

            {/* Answer Summary Card */}
            <div className="grid grid-cols-3 gap-2 bg-[#f7f7f8] border border-[#D5D5D5] rounded-2xl p-3 mb-5 text-center text-xs">
              <div className="p-1">
                <span className="text-zinc-500 block text-[10px]">Dijawab</span>
                <span className="font-mono font-bold text-zinc-900 text-sm">{answeredTotal}</span>
              </div>
              <div className="p-1">
                <span className="text-zinc-500 block text-[10px]">Ragu-ragu</span>
                <span className="font-mono font-bold text-amber-600 text-sm">{doubtfulTotal}</span>
              </div>
              <div className="p-1">
                <span className="text-zinc-500 block text-[10px]">Kosong</span>
                <span className="font-mono font-bold text-zinc-400 text-sm">{unansweredTotal}</span>
              </div>
            </div>

            {unansweredTotal > 0 && (
              <div className="mb-5 flex items-center gap-2 text-left bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-[11px] text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Perhatian: Masih ada {unansweredTotal} soal yang belum Anda jawab.</span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-2.5 px-4 rounded-2xl bg-[#f7f7f8] hover:bg-[#D5D5D5]/50 border border-[#D5D5D5] text-zinc-800 font-semibold text-xs transition-colors cursor-pointer"
              >
                Kembali Periksa
              </button>
              <button
                onClick={handleConfirmSubmit}
                className="flex-1 py-2.5 px-4 rounded-2xl bg-[#646464] hover:bg-[#525252] text-white font-semibold text-xs transition-all cursor-pointer shadow-xs border border-[#646464]"
              >
                Ya, Kumpulkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
