import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  Volume2,
  ShieldAlert,
  Eye,
  UserCheck,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Play,
  RotateCcw,
} from 'lucide-react';
import { ProctorStatus, ViolationType } from '../types';

interface AIProctorProps {
  isActive: boolean;
  participantName?: string;
  onViolation: (type: ViolationType, description: string, severity: 'low' | 'medium' | 'high') => void;
  onStatusChange?: (status: ProctorStatus) => void;
  onSnapshot?: (snapshotDataUrl: string, cameraStatus: 'ACTIVE' | 'DENIED' | 'OFFLINE' | 'SIMULATED' | 'ZOOM') => void;
  onCaptureRef?: (fn: () => string | null) => void;
  trustScore: number;
  strikeCount: number;
  defaultMode?: 'IN_APP' | 'ZOOM';
}

export const AIProctor: React.FC<AIProctorProps> = ({
  isActive,
  participantName = 'Peserta',
  onViolation,
  onStatusChange,
  onSnapshot,
  onCaptureRef,
  trustScore,
  strikeCount,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Camera state
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraLoading, setCameraLoading] = useState<boolean>(false);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [videoPlaying, setVideoPlaying] = useState<boolean>(false);
  const [ambientNoise, setAmbientNoise] = useState<number>(14);
  const [recentWarning, setRecentWarning] = useState<string | null>(null);
  const [cameraMode, setCameraMode] = useState<'STREAM' | 'PHOTO' | 'SIMULATION'>('STREAM');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // Trigger violation helper
  const triggerViolation = useCallback(
    (type: ViolationType, description: string, severity: 'low' | 'medium' | 'high') => {
      setRecentWarning(description);
      onViolation(type, description, severity);
      const timer = setTimeout(() => {
        setRecentWarning(null);
      }, 4000);
      return () => clearTimeout(timer);
    },
    [onViolation]
  );

  // Configure video DOM node imperatively for strict cross-browser autoplay compliance
  const configureVideoNode = (node: HTMLVideoElement) => {
    node.muted = true;
    node.defaultMuted = true;
    node.setAttribute('playsinline', 'true');
    node.setAttribute('webkit-playsinline', 'true');
    node.playsInline = true;
    node.autoplay = true;
  };

  // Callback ref to attach stream immediately whenever the video element is attached
  const setVideoElement = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node) {
      configureVideoNode(node);
      if (streamRef.current && node.srcObject !== streamRef.current) {
        node.srcObject = streamRef.current;
        node
          .play()
          .then(() => {
            setVideoPlaying(true);
          })
          .catch((err) => {
            console.warn('Video auto-play delayed/blocked:', err);
            setVideoPlaying(false);
          });
      }
    }
  }, []);

  // Initialize camera stream with balanced 480p anti-lag constraints and fallbacks
  const initMedia = useCallback(async (desiredFacing?: 'user' | 'environment') => {
    setCameraLoading(true);

    // Stop previous stream tracks cleanly
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch (e) {
        console.warn('Error stopping previous tracks:', e);
      }
      streamRef.current = null;
    }

    let stream: MediaStream | null = null;
    const targetFacing = desiredFacing || facingMode;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices not available in browser');
      }

      // Step 1: Request 480p resolution with max 24fps (anti-lag and battery saver)
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: targetFacing,
            width: { ideal: 640, max: 800 },
            height: { ideal: 480, max: 600 },
            frameRate: { ideal: 20, max: 24 },
          },
          audio: false,
        });
      } catch (e1) {
        console.warn('Constrained 480p failed, trying generic facingMode:', e1);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: targetFacing },
            audio: false,
          });
        } catch (e2) {
          console.warn('Generic facingMode failed, falling back to basic video:true:', e2);
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      if (!stream || stream.getVideoTracks().length === 0) {
        throw new Error('No active video track returned by device');
      }

      // Ensure all tracks are enabled
      stream.getVideoTracks().forEach((track) => {
        track.enabled = true;
      });

      streamRef.current = stream;

      // Attach stream to video element
      if (videoRef.current) {
        configureVideoNode(videoRef.current);
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
          setVideoPlaying(true);
        } catch (playErr) {
          console.warn('video.play() rejected, waiting for user touch:', playErr);
          setVideoPlaying(false);
        }
      }

      setHasCameraPermission(true);
      setCameraMode('STREAM');

      // Step 2: Try optional ambient noise audio analyzer in background (quiet failure)
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        const source = audioCtx.createMediaStreamSource(audioStream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;
      } catch (errAudio) {
        // Microphone is optional
      }
    } catch (err) {
      console.warn('Direct webcam stream unavailable:', err);
      setHasCameraPermission(false);
      if (!capturedPhotoUrl) {
        setCameraMode('SIMULATION');
      }
    } finally {
      setCameraLoading(false);
    }
  }, [facingMode, capturedPhotoUrl, onStatusChange]);

  // Toggle front / back camera
  const handleToggleFacingMode = () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    initMedia(nextFacing);
  };

  // Handle native mobile phone camera photo capture
  const handleNativeCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current || document.createElement('canvas');
        canvas.width = 240;
        canvas.height = 180;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const hRatio = canvas.width / img.width;
          const vRatio = canvas.height / img.height;
          const ratio = Math.max(hRatio, vRatio);
          const centerShiftX = (canvas.width - img.width * ratio) / 2;
          const centerShiftY = (canvas.height - img.height * ratio) / 2;
          ctx.drawImage(
            img,
            0,
            0,
            img.width,
            img.height,
            centerShiftX,
            centerShiftY,
            img.width * ratio,
            img.height * ratio
          );

          ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
          ctx.fillRect(6, 158, 228, 16);
          ctx.fillStyle = '#10b981';
          ctx.font = 'bold 9px monospace';
          ctx.fillText(`● FOTO TERVERIFIKASI · ${new Date().toLocaleTimeString('id-ID')}`, 10, 170);

          const photoDataUrl = canvas.toDataURL('image/jpeg', 0.5);
          setCapturedPhotoUrl(photoDataUrl);
          setCameraMode('PHOTO');
          setHasCameraPermission(true);
          onSnapshot?.(photoDataUrl, 'ACTIVE');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Start media stream on mount
  useEffect(() => {
    if (isActive) {
      initMedia();
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [isActive, initMedia]);

  // Throttled Audio Analysis Loop (Polled every 250ms instead of 60 FPS animation frame)
  useEffect(() => {
    if (!isActive) return;

    const audioInterval = setInterval(() => {
      if (analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setAmbientNoise(normalized);

        if (normalized > 80) {
          triggerViolation(
            'SUSPICIOUS_AUDIO',
            'Suara percakapan / kebisingan terdeteksi di sekitar peserta.',
            'medium'
          );
        }
      }
    }, 250);

    return () => clearInterval(audioInterval);
  }, [isActive, triggerViolation]);

  // Pure local capture function - called on demand when participant has strikes > 3
  const captureCurrentFrame = useCallback((): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = 320;
    canvas.height = 240;

    const videoEl = videoRef.current;
    const isVideoReady =
      videoEl &&
      videoEl.videoWidth > 0 &&
      videoEl.videoHeight > 0 &&
      !videoEl.paused &&
      videoEl.readyState >= 2;

    if (cameraMode === 'STREAM' && hasCameraPermission && isVideoReady) {
      try {
        ctx.save();
        ctx.translate(320, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoEl, 0, 0, 320, 240);
        ctx.restore();

        // High-strike incident evidence watermark
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fillRect(8, 212, 304, 20);
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`BUKTI INSIDEN PELANGGARAN · ${new Date().toLocaleTimeString('id-ID')}`, 14, 226);

        return canvas.toDataURL('image/jpeg', 0.6);
      } catch (e) {
        console.warn('Canvas stream snapshot error:', e);
      }
    } else if (cameraMode === 'PHOTO' && capturedPhotoUrl) {
      return capturedPhotoUrl;
    }
    return null;
  }, [cameraMode, hasCameraPermission, capturedPhotoUrl]);

  // Expose capture function via prop and window hook for ExamRoom on-demand AI call
  useEffect(() => {
    if (onCaptureRef) {
      onCaptureRef(captureCurrentFrame);
    }
    (window as any).__mmo_capture_snapshot = captureCurrentFrame;
    return () => {
      delete (window as any).__mmo_capture_snapshot;
    };
  }, [captureCurrentFrame, onCaptureRef]);

  const handleManualVideoPlay = () => {
    if (videoRef.current) {
      if (streamRef.current && videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current
        .play()
        .then(() => setVideoPlaying(true))
        .catch((err) => {
          console.warn('Manual play failed:', err);
          initMedia();
        });
    } else {
      initMedia();
    }
  };

  return (
    <div className="bg-white border border-[#D5D5D5] rounded-3xl p-4 sm:p-5 shadow-xs space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
            Pengawasan Kamera Ujian
          </h3>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-[10px] text-zinc-500">Integritas:</span>
          <span
            className={`font-mono font-bold ${
              trustScore > 85 ? 'text-emerald-700' : trustScore > 60 ? 'text-amber-700' : 'text-rose-700'
            }`}
          >
            {trustScore}%
          </span>
        </div>
      </div>

      {/* Hidden Native Camera Input (for direct phone selfie fallback) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleNativeCameraCapture}
        className="hidden"
      />

      {/* Hidden canvas for taking lightweight snapshots */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Video Viewport */}
      <div className="relative aspect-video bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 flex items-center justify-center">
        {/* Always-Mounted Video Element to prevent Null Reference or Freezes */}
        <video
          ref={setVideoElement}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={(e) => {
            const el = e.target as HTMLVideoElement;
            configureVideoNode(el);
            el.play()
              .then(() => setVideoPlaying(true))
              .catch(() => setVideoPlaying(false));
          }}
          onCanPlay={(e) => {
            const el = e.target as HTMLVideoElement;
            configureVideoNode(el);
            el.play()
              .then(() => setVideoPlaying(true))
              .catch(() => setVideoPlaying(false));
          }}
          className={`w-full h-full object-cover transform ${
            facingMode === 'user' ? '-scale-x-100' : ''
          } ${cameraMode === 'STREAM' && hasCameraPermission ? 'opacity-100 block' : 'opacity-0 absolute pointer-events-none'}`}
        />

        {/* Captured Selfie View */}
        {cameraMode === 'PHOTO' && capturedPhotoUrl && (
          <div className="relative w-full h-full">
            <img
              src={capturedPhotoUrl}
              alt="Verifikasi Foto Wajah"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/75 backdrop-blur-xs px-2 py-0.5 rounded-lg text-[10px] text-emerald-400 font-mono">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>FOTO TERVERIFIKASI</span>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-2 right-2 px-2.5 py-1 rounded-xl bg-black/75 hover:bg-black text-white text-[10px] font-semibold flex items-center gap-1 backdrop-blur-xs cursor-pointer border border-white/20"
            >
              <Camera className="w-3 h-3" />
              <span>Ambil Ulang Foto</span>
            </button>
          </div>
        )}

        {/* Fallback / Tap to Play Overlay if video stream exists but paused */}
        {cameraMode === 'STREAM' && hasCameraPermission && !videoPlaying && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-4 text-center z-10">
            <p className="text-xs text-zinc-200 mb-1 font-semibold">
              Kamera siap
            </p>
            <p className="text-[11px] text-zinc-400 mb-3 max-w-xs">
              Ketuk tombol hijau di bawah untuk mengaktifkan siaran kamera Anda:
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleManualVideoPlay}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Mulai Siaran Kamera</span>
              </button>
              <button
                type="button"
                onClick={handleToggleFacingMode}
                className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer border border-zinc-700"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Ganti Kamera {facingMode === 'user' ? 'Belakang' : 'Depan'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Live Stream Active Badge & Controls */}
        {cameraMode === 'STREAM' && hasCameraPermission && videoPlaying && (
          <>
            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-lg text-[10px] text-emerald-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>LIVE PENGAWAS</span>
            </div>

            {/* Quick switch/refresh camera controls on top right */}
            <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
              <button
                type="button"
                onClick={handleToggleFacingMode}
                title="Ganti kamera depan / belakang"
                className="p-1 px-2 rounded-lg bg-black/60 hover:bg-black/90 text-white/90 text-[10px] flex items-center gap-1 backdrop-blur-xs border border-white/20 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span className="text-[9px]">{facingMode === 'user' ? 'Kamera Belakang' : 'Kamera Depan'}</span>
              </button>
              <button
                type="button"
                onClick={() => initMedia()}
                title="Muat ulang kamera"
                className="p-1 px-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-white/90 text-[10px] flex items-center gap-1 backdrop-blur-xs border border-white/20 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>

            {/* Bounding box overlay */}
            <div className="absolute inset-x-6 inset-y-3 border border-dashed border-emerald-400/60 rounded-xl pointer-events-none flex flex-col justify-between p-1.5">
              <div className="flex justify-between items-center text-[10px] text-emerald-300 font-mono bg-black/60 px-2 py-0.5 rounded-lg backdrop-blur-xs">
                <span className="flex items-center gap-1">
                  <UserCheck className="w-3 h-3" /> Wajah Terpantau
                </span>
                <span>Fokus: Layar</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-zinc-300 font-mono bg-black/60 px-2 py-0.5 rounded-lg backdrop-blur-xs">
                <span className="flex items-center gap-1">
                  <Volume2 className="w-3 h-3" /> Audio: {ambientNoise}%
                </span>
                <span>Strikes: {strikeCount}/4</span>
              </div>
            </div>
          </>
        )}

        {/* Standby / Permission Request Box */}
        {(!hasCameraPermission || cameraMode === 'SIMULATION') && !capturedPhotoUrl && (
          <div className="flex flex-col items-center justify-center p-4 text-center w-full">
            <div className="w-10 h-10 rounded-2xl bg-zinc-800 text-zinc-300 flex items-center justify-center mb-2">
              <CameraOff className="w-5 h-5 text-zinc-400" />
            </div>
            <p className="text-xs font-semibold text-zinc-200 mb-0.5">
              {cameraLoading ? 'Menghubungkan Kamera...' : 'Kamera Belum Terhubung'}
            </p>
            <p className="text-[11px] text-zinc-400 max-w-xs mb-3 leading-relaxed">
              Izinkan akses kamera di browser Anda agar pengawas dapat memantau pengerjaan ujian secara langsung:
            </p>

            <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs">
              <button
                type="button"
                onClick={() => initMedia()}
                disabled={cameraLoading}
                className="flex-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${cameraLoading ? 'animate-spin' : ''}`} />
                <span>{cameraLoading ? 'Menghubungkan...' : 'Izinkan / Nyalakan Kamera'}</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 px-3 py-2 rounded-xl bg-[#646464] hover:bg-[#525252] text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Foto Selfie HP</span>
              </button>
            </div>
          </div>
        )}

        {/* Real-time warning badge */}
        {recentWarning && (
          <div className="absolute bottom-2 inset-x-2 bg-rose-900/90 border border-rose-400 text-rose-100 text-xs px-2.5 py-1.5 rounded-xl flex items-center gap-2 shadow-md animate-pulse">
            <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0" />
            <span className="text-[11px] leading-tight truncate">{recentWarning}</span>
          </div>
        )}
      </div>

      {/* Action shortcuts below viewport */}
      <div className="flex items-center justify-between text-[11px] pt-1">
        <span className="text-zinc-500">
          Status Kamera:{' '}
          <strong className="text-zinc-800">
            {cameraMode === 'STREAM' && hasCameraPermission && videoPlaying
              ? 'Live Siaran Aktif (480p)'
              : cameraMode === 'PHOTO'
              ? 'Foto Selfie HP'
              : 'Menunggu Izin Kamera'}
          </strong>
        </span>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-[#646464] hover:text-zinc-950 font-semibold flex items-center gap-1 cursor-pointer underline text-[11px]"
        >
          <Camera className="w-3 h-3" />
          <span>Ambil Foto Selfie Wajah</span>
        </button>
      </div>

      {/* Proctor Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs text-zinc-700">
        <div className="bg-[#fafafa] border border-[#D5D5D5] rounded-2xl p-2.5 flex items-center gap-2">
          <Eye className="w-4 h-4 text-[#646464] shrink-0" />
          <div className="truncate">
            <p className="text-[10px] text-zinc-500">Status Pengawas</p>
            <p
              className={`font-semibold ${
                hasCameraPermission || capturedPhotoUrl ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {hasCameraPermission || capturedPhotoUrl ? 'Terpantau Live' : 'Menunggu Izin'}
            </p>
          </div>
        </div>

        <div className="bg-[#fafafa] border border-[#D5D5D5] rounded-2xl p-2.5 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[#646464] shrink-0" />
          <div className="truncate">
            <p className="text-[10px] text-zinc-500">Toleransi Pelanggaran</p>
            <p
              className={`font-semibold ${
                strikeCount === 0
                  ? 'text-emerald-700'
                  : strikeCount < 3
                  ? 'text-amber-700'
                  : 'text-rose-700'
              }`}
            >
              {strikeCount} dari 4 Batas Maks
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
