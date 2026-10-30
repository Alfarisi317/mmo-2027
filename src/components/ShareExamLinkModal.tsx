import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Copy,
  Check,
  QrCode,
  X,
  Smartphone,
  Globe,
  Wifi,
  ExternalLink,
  Laptop,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { ApiService } from '../services/api';

interface ShareExamLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareExamLinkModal: React.FC<ShareExamLinkModalProps> = ({ isOpen, onClose }) => {
  const [copiedParticipant, setCopiedParticipant] = useState(false);
  const [copiedProctor, setCopiedProctor] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  
  // Network detection
  const [detectedIps, setDetectedIps] = useState<string[]>([]);
  const [selectedIp, setSelectedIp] = useState<string>('');
  const [customIpInput, setCustomIpInput] = useState<string>('');
  // Default to laptop_test for 100% immediate success without auth/404 issues
  const [mode, setMode] = useState<'laptop_test' | 'mobile'>('laptop_test');

  // Determine current origin info
  const isBrowser = typeof window !== 'undefined';
  const currentOrigin = isBrowser ? window.location.origin : '';
  const currentHostname = isBrowser ? window.location.hostname : '';
  const currentPort = isBrowser ? window.location.port || '3000' : '3000';
  const isLocalhost = currentHostname === 'localhost' || currentHostname === '127.0.0.1';
  const isCloudRun = currentHostname.includes('run.app') || currentHostname.includes('aistudio');

  // Load detected local IP from server if available
  useEffect(() => {
    if (!isOpen) return;

    ApiService.getNetworkInfo().then((info) => {
      if (info && info.localIps && info.localIps.length > 0) {
        const validIps = info.localIps.filter((ip) => !ip.startsWith('127.'));
        setDetectedIps(validIps);
        if (validIps.length > 0 && !selectedIp) {
          const preferred = validIps.find((ip) => ip.startsWith('192.168.') || ip.startsWith('10.')) || validIps[0];
          setSelectedIp(preferred);
          setCustomIpInput(preferred);
        }
      }
    });
  }, [isOpen, selectedIp]);

  // Clean base origin (strip trailing slash)
  const cleanOrigin = currentOrigin && currentOrigin !== 'null' && currentOrigin !== 'about:blank'
    ? currentOrigin.replace(/\/+$/, '')
    : (isBrowser ? window.location.href.split('?')[0].split('#')[0].replace(/\/+$/, '') : '');

  // Compute final URLs (clean, strictly pointing to root with view parameter)
  // If in ais-dev environment, use ais-pre which is the shared preview environment
  const sharedPreOrigin = cleanOrigin.includes('ais-dev-')
    ? cleanOrigin.replace('ais-dev-', 'ais-pre-')
    : cleanOrigin;

  const effectiveHost = isLocalhost && customIpInput.trim()
    ? `http://${customIpInput.trim()}:${currentPort}`
    : sharedPreOrigin;

  const participantUrl = `${effectiveHost}/?view=portal`;
  const proctorUrl = `${cleanOrigin}/?view=proctor`;
  const localDirectParticipantUrl = `${cleanOrigin}/?view=portal`;

  // Generate QR Code
  useEffect(() => {
    if (!isOpen) return;

    QRCode.toDataURL(participantUrl, {
      width: 260,
      margin: 2,
      color: {
        dark: '#18181b',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.warn('QR Code generation error:', err));
  }, [isOpen, participantUrl]);

  if (!isOpen) return null;

  const handleCopyParticipant = () => {
    navigator.clipboard.writeText(participantUrl);
    setCopiedParticipant(true);
    setTimeout(() => setCopiedParticipant(false), 2500);
  };

  const handleCopyProctor = () => {
    navigator.clipboard.writeText(proctorUrl);
    setCopiedProctor(true);
    setTimeout(() => setCopiedProctor(false), 2500);
  };

  const handleOpenLocalTest = () => {
    if (isBrowser) {
      window.open(localDirectParticipantUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white border border-[#D5D5D5] rounded-3xl w-full max-w-xl shadow-2xl p-5 sm:p-7 relative my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors cursor-pointer"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-[#646464] text-white flex items-center justify-center shadow-xs">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 leading-tight">
              Akses Pengerjaan Ujian Peserta MMO 2027
            </h3>
            <p className="text-xs text-zinc-500">
              Sinkronisasi Peserta ke Dasbor Pengawas secara Real-Time
            </p>
          </div>
        </div>

        {/* Tab Selection: Laptop Test vs Mobile HP */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 rounded-2xl mb-4 text-xs font-semibold">
          <button
            onClick={() => setMode('laptop_test')}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mode === 'laptop_test'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Laptop className="w-3.5 h-3.5 text-emerald-600" />
            <span>Uji Coba di Laptop (Paling Cepat)</span>
          </button>
          <button
            onClick={() => setMode('mobile')}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mode === 'mobile'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-[#646464]" />
            <span>Akses dari HP (Scan QR)</span>
          </button>
        </div>

        {mode === 'laptop_test' ? (
          /* Laptop Test Mode (Guaranteed 100% working without 404 / auth block) */
          <div className="space-y-4 py-1">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-950 space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Rekomendasi Terbaik: Buka Tab Peserta di Laptop Ini</span>
              </div>
              <p className="leading-relaxed text-zinc-700">
                Karena browser laptop Anda sudah terverifikasi di Google AI Studio, membuka tab peserta di laptop ini <strong>dijamin 100% langsung terbuka tanpa error &apos;Page not found&apos; atau batasan umur</strong>.
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-zinc-600 pt-1">
                <li>Bisa dibuka berdampingan (tab peserta di kiri, dasbor pengawas di kanan).</li>
                <li>Nama, sekolah, progres jawaban, dan kamera selfie langsung tampil real-time.</li>
                <li>Dapat membuka beberapa tab peserta sekaligus untuk menguji banyak peserta.</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                onClick={handleOpenLocalTest}
                className="flex-1 px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Buka Tab Peserta Baru Sekarang</span>
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(localDirectParticipantUrl);
                  setCopiedParticipant(true);
                  setTimeout(() => setCopiedParticipant(false), 2000);
                }}
                className="px-4 py-3 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold text-xs flex items-center justify-center gap-1.5 border border-zinc-200 cursor-pointer"
              >
                {copiedParticipant ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedParticipant ? 'Tersalin!' : 'Salin URL'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Mobile Access via QR & Link */
          <div className="space-y-4">
            {/* Clear explanation of "Available regions / Age requirements" & "Page not found" */}
            <div className="bg-amber-50 border border-amber-300/80 rounded-2xl p-3.5 text-xs text-amber-950 space-y-1.5">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-amber-900">
                    Mengapa di HP Teman Muncul &quot;Age requirements / Available regions&quot;?
                  </span>
                  <p className="text-[11px] text-amber-900 leading-relaxed mt-1">
                    Selama masa pratinjau di Google AI Studio, Google membatasi akses preview hanya untuk akun Google dewasa (<strong>usia 18+ tahun</strong>). Jika akun Google di browser HP teman Anda terdaftar di bawah 18 tahun (atau akun sekolah/family link), Google otomatis menolak dan memunculkan halaman batasan usia tersebut.
                  </p>
                  <p className="text-[11px] font-semibold text-amber-900 mt-1.5">
                    Solusi: Ganti ke akun Google dewasa (18+) di browser HP teman Anda, ATAU buka tab peserta di laptop Anda yang sudah terverifikasi.
                  </p>
                </div>
              </div>
            </div>

            {/* QR Code and Quick Scan Section */}
            <div className="bg-[#fafafa] border border-[#D5D5D5] rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="bg-white p-2 rounded-2xl border border-zinc-200 shadow-xs shrink-0">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="QR Code Akses Peserta"
                    className="w-36 h-36 rounded-xl object-contain mx-auto"
                  />
                ) : (
                  <div className="w-36 h-36 flex items-center justify-center text-xs text-zinc-400">
                    Membuat QR...
                  </div>
                )}
              </div>
              <div className="space-y-2 flex-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Scan QR Code dari HP</span>
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Buka kamera HP atau Google Lens, arahkan ke QR Code di samping.
                </p>
                <div className="pt-1">
                  <span className="text-[10px] text-zinc-400 block font-mono">Tautan Resmi Peserta:</span>
                  <span className="text-[11px] font-mono text-zinc-800 truncate block max-w-[260px]">
                    {participantUrl}
                  </span>
                </div>
              </div>
            </div>

            {/* Copy Link Button */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={participantUrl}
                className="flex-1 bg-zinc-50 border border-[#D5D5D5] rounded-2xl px-3.5 py-2.5 text-xs text-zinc-800 font-mono truncate select-all focus:outline-none"
              />
              <button
                onClick={handleCopyParticipant}
                className={`px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs whitespace-nowrap ${
                  copiedParticipant
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#646464] hover:bg-[#525252] text-white border border-[#646464]'
                }`}
              >
                {copiedParticipant ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-zinc-200">
          <button
            onClick={handleCopyProctor}
            className="text-[11px] text-zinc-500 hover:text-zinc-800 flex items-center gap-1 underline cursor-pointer"
          >
            {copiedProctor ? 'Link Pengawas Tersalin!' : 'Salin Link Pengawas'}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-2xl bg-[#646464] hover:bg-[#525252] text-white text-xs font-semibold transition-all cursor-pointer shadow-xs border border-[#646464]"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
