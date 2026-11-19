import React, { useEffect, useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface ExamTimerProps {
  remainingSeconds: number;
  totalSeconds: number;
  onTimeExpire: () => void;
}

export const ExamTimer: React.FC<ExamTimerProps> = ({
  remainingSeconds,
  totalSeconds,
  onTimeExpire,
}) => {
  const [hasNotifiedThreeMin, setHasNotifiedThreeMin] = useState<boolean>(false);
  const [showUrgentBanner, setShowUrgentBanner] = useState<boolean>(false);

  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;

  const isLowTime = remainingSeconds <= 600; // <= 10 minutes
  const isCriticalTime = remainingSeconds <= 180; // <= 3 minutes

  useEffect(() => {
    if (remainingSeconds <= 180 && !hasNotifiedThreeMin && remainingSeconds > 0) {
      setHasNotifiedThreeMin(true);
      setShowUrgentBanner(true);
      const timer = setTimeout(() => setShowUrgentBanner(false), 8000);
      return () => clearTimeout(timer);
    }

    if (remainingSeconds <= 0) {
      onTimeExpire();
    }
  }, [remainingSeconds, hasNotifiedThreeMin, onTimeExpire]);

  const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <>
      {/* Timer Capsule in Header */}
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border-2 transition-all ${
            isCriticalTime
              ? 'bg-rose-50 border-rose-400 text-rose-900 animate-pulse'
              : isLowTime
              ? 'bg-amber-50 border-[#E49548] text-[#1E3954]'
              : 'bg-[#F4E6CC] border-[#E49548] text-[#1E3954]'
          }`}
        >
          <Clock className={`w-4 h-4 ${isCriticalTime ? 'text-rose-600' : isLowTime ? 'text-[#CE7D30]' : 'text-[#2C4B6B]'}`} />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#2C4B6B] leading-none">
              Sisa Waktu
            </span>
            <span className="font-mono text-sm font-extrabold tabular-nums tracking-wider text-[#1E3954]">
              {formattedTime}
            </span>
          </div>
        </div>
      </div>

      {/* Floating Alert when 3 minutes remain */}
      {showUrgentBanner && (
        <div className="fixed top-20 right-6 z-50 bg-white border-2 border-rose-400 text-[#1E3954] p-4 rounded-xl shadow-xl max-w-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-4">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-rose-900">
              Waktu Tersisa Kurang dari 3 Menit!
            </h4>
            <p className="text-xs text-[#4E779F] mt-1">
              Seluruh jawaban akan dikumpulkan secara otomatis ke server saat waktu habis. Periksa kembali jawaban Anda.
            </p>
          </div>
        </div>
      )}
    </>
  );
};
