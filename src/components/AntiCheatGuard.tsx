import React, { useEffect, useState, useCallback } from 'react';
import { Lock, Maximize, AlertOctagon, ShieldX, KeyRound } from 'lucide-react';
import { ViolationType } from '../types';

interface AntiCheatGuardProps {
  isActive: boolean;
  strikeCount: number;
  maxStrikes?: number;
  onViolation: (type: ViolationType, description: string, severity: 'low' | 'medium' | 'high') => void;
  onUnlockByPin: (pin: string) => boolean;
}

export const AntiCheatGuard: React.FC<AntiCheatGuardProps> = ({
  isActive,
  strikeCount,
  maxStrikes = 4,
  onViolation,
  onUnlockByPin,
}) => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(true);
  const [tabSwitchedWarning, setTabSwitchedWarning] = useState<boolean>(false);
  const [copyPasteWarning, setCopyPasteWarning] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  const isLocked = strikeCount >= maxStrikes;

  // Detect mobile or iOS where Fullscreen API is not supported on documentElement
  const isFullscreenAvailable = typeof document !== 'undefined' && Boolean(
    document.fullscreenEnabled || 
    (document as unknown as { webkitFullscreenEnabled?: boolean }).webkitFullscreenEnabled
  );

  // Request fullscreen utility
  const enterFullscreen = useCallback(async () => {
    try {
      const docEl = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void>;
        mozRequestFullScreen?: () => Promise<void>;
        msRequestFullscreen?: () => Promise<void>;
      };

      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
        setIsFullscreen(true);
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
        setIsFullscreen(true);
      } else {
        // Fullscreen not supported (e.g. iPhone Safari), allow normal layout
        setIsFullscreen(true);
      }
    } catch (err) {
      console.warn('Fullscreen request dismissed or constrained:', err);
      // Fallback gracefully so participant is not trapped
      setIsFullscreen(true);
    }
  }, []);

  // Monitor Fullscreen (only if API supported)
  useEffect(() => {
    if (!isActive || !isFullscreenAvailable) return;

    const handleFullscreenChange = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element };
      const currentlyFullscreen = Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);
      setIsFullscreen(currentlyFullscreen);

      if (!currentlyFullscreen && !isLocked) {
        onViolation(
          'FULLSCREEN_EXIT',
          'Peserta keluar dari mode layar penuh (Fullscreen ditutup).',
          'medium'
        );
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [isActive, isLocked, isFullscreenAvailable, onViolation]);

  // Monitor Tab Switch & Window Blur
  useEffect(() => {
    if (!isActive) return;

    let blurTimer: NodeJS.Timeout | null = null;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        onViolation(
          'TAB_SWITCH',
          'Peserta berpindah tab atau meminimalkan browser ujian MMO.',
          'high'
        );
        setTabSwitchedWarning(true);
      }
    };

    const handleBlur = () => {
      blurTimer = setTimeout(() => {
        if (!document.hidden) {
          onViolation(
            'WINDOW_BLUR',
            'Fokus jendela ujian hilang (diduga membuka aplikasi sampingan atau split-screen).',
            'medium'
          );
        }
      }, 500);
    };

    const handleFocus = () => {
      if (blurTimer) clearTimeout(blurTimer);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      if (blurTimer) clearTimeout(blurTimer);
    };
  }, [isActive, onViolation]);

  // Clipboard & Right-click protection
  useEffect(() => {
    if (!isActive) return;

    const showClipboardToast = (action: string) => {
      setCopyPasteWarning(`Aksi ${action} dilarang! Akses papan klip dinonaktifkan sistem anti-cheat MMO.`);
      setTimeout(() => setCopyPasteWarning(null), 3500);
    };

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      onViolation('COPY_PASTE_ATTEMPT', 'Mencoba menyalin (Copy) teks soal.', 'medium');
      showClipboardToast('Salin (Copy)');
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      onViolation('COPY_PASTE_ATTEMPT', 'Mencoba menempel (Paste) teks dari luar.', 'medium');
      showClipboardToast('Tempel (Paste)');
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      showClipboardToast('Potong (Cut)');
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      showClipboardToast('Klik Kanan (Menu Konteks)');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j')) ||
        (e.ctrlKey && (e.key === 'u' || e.key === 'U')) ||
        e.key === 'PrintScreen'
      ) {
        e.preventDefault();
        onViolation('INSPECT_SHORTCUT', `Mencoba menekan shortcut devtools/screenshot: ${e.key}`, 'high');
        showClipboardToast(`Pintasan tombol (${e.key})`);
      }
    };

    window.addEventListener('copy', handleCopy);
    window.addEventListener('paste', handlePaste);
    window.addEventListener('cut', handleCut);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('copy', handleCopy);
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('cut', handleCut);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, onViolation]);

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onUnlockByPin(pinInput);
    if (!success) {
      setPinError('PIN Pengawas keliru. Hubungi panitia ujian MMO.');
    } else {
      setPinError(null);
      setPinInput('');
      enterFullscreen();
    }
  };

  return (
    <>
      {/* Toast Warning for Copy-Paste */}
      {copyPasteWarning && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-white border border-rose-300 text-rose-900 px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-3 animate-bounce">
          <ShieldX className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="text-xs font-medium">{copyPasteWarning}</span>
        </div>
      )}

      {/* Return from Tab Switch Alert Banner */}
      {tabSwitchedWarning && !isLocked && (
        <div className="fixed inset-0 z-50 bg-zinc-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-rose-200 rounded-2xl p-6 shadow-2xl text-center">
            <div className="w-14 h-14 bg-rose-50 border border-rose-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertOctagon className="w-8 h-8 text-rose-600" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 mb-2">
              Peringatan Pelanggaran Tab!
            </h3>
            <p className="text-xs sm:text-sm text-zinc-600 mb-4 leading-relaxed">
              Sistem mencatat Anda telah meninggalkan jendela ujian MMO. Setiap perpindahan tab tercatat langsung di dasbor pengawas panitia.
            </p>
            <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-lg mb-5 text-xs text-zinc-700">
              <span className="text-zinc-500">Akumulasi Pelanggaran:</span>{' '}
              <span className="font-mono font-bold text-rose-600">{strikeCount} dari {maxStrikes}</span> kali batas toleransi.
            </div>
            <button
              onClick={() => {
                setTabSwitchedWarning(false);
                enterFullscreen();
              }}
              className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-lg text-sm transition-colors cursor-pointer shadow-xs"
            >
              Saya Mengerti & Kembali Mengerjakan
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen Prompt Overlay if exited */}
      {!isFullscreen && !isLocked && !tabSwitchedWarning && (
        <div className="fixed inset-0 z-40 bg-zinc-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-amber-200 rounded-2xl p-6 shadow-2xl text-center">
            <div className="w-12 h-12 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto mb-3">
              <Maximize className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 mb-1.5">
              Wajib Mode Layar Penuh
            </h3>
            <p className="text-xs text-zinc-600 mb-4">
              Ujian MMO mewajibkan mode layar penuh aktif guna memastikan kejujuran dan mencegah interaksi dengan aplikasi lain.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={enterFullscreen}
                className="flex-1 py-2.5 px-4 bg-[#646464] hover:bg-[#525252] text-white font-semibold rounded-2xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Maximize className="w-4 h-4" />
                Aktifkan Layar Penuh
              </button>
              <button
                type="button"
                onClick={() => setIsFullscreen(true)}
                className="py-2.5 px-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium rounded-2xl text-xs transition-colors cursor-pointer border border-[#D5D5D5]"
                title="Bagi pengguna browser HP atau Safari yang tidak mendukung fullscreen otomatis"
              >
                Lanjutkan di Layar HP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Lockout Modal when Max Strikes Exceeded */}
      {isLocked && (
        <div className="fixed inset-0 z-50 bg-zinc-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white border border-rose-300 rounded-2xl p-7 shadow-2xl text-center">
            <div className="w-16 h-16 bg-rose-50 border border-rose-200 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Lock className="w-8 h-8 text-rose-600" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 mb-2">
              Layar Ujian Terkunci Otomatis
            </h2>
            <p className="text-sm text-zinc-600 mb-5 leading-relaxed">
              Anda telah mencapai batas maksimal ({maxStrikes}) pelanggaran anti-cheat (perpindahan tab / jendela / aktivitas mencurigakan). Pengerjaan soal ditangguhkan.
            </p>

            <form onSubmit={handleUnlockSubmit} className="space-y-3 bg-zinc-50 border border-zinc-200 p-4 rounded-xl text-left">
              <label className="block text-xs font-medium text-zinc-700">
                Masukkan PIN Otorisasi Pengawas (Panitia MMO):
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="PIN Pengawas (Default: 2026)"
                  className="flex-1 bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-500 font-mono"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Buka Kunci
                </button>
              </div>
              {pinError && (
                <p className="text-xs text-rose-600 mt-1">{pinError}</p>
              )}
              <p className="text-[11px] text-zinc-500">
                Hubungi pengawas HMPS Matriks UMM untuk verifikasi pembukaan kunci layar.
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
