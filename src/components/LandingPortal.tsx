import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Calculator,
  Monitor,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Award,
  AlertTriangle,
  Compass,
  Brain,
  Trophy,
  Sparkles,
  Video,
  Camera,
  Smartphone,
  Mail,
  Eye,
  EyeOff,
  UserCheck,
  FileSpreadsheet,
  KeyRound,
  X,
  Search,
  ExternalLink,
  RotateCcw,
  Clock,
  User,
  Key,
  LogOut,
  RefreshCw,
  Check,
  Play,
} from 'lucide-react';
import { TrialExamModal } from './TrialExamModal';
import { OlympiadCategory, ParticipantProfile, CompetitionStage, SupervisionMode, RegisteredParticipant } from '../types';
import {
  authenticateParticipantOnline,
  getRegisteredParticipants,
  getLastSyncTime,
  isDemoModeActive,
  clearAllDemoParticipants,
  fetchRegisteredParticipantsFromServer,
  getExamGateStatusOnline,
  changeParticipantPasswordOnline,
  verifyEmergencyGatePasscodeOnline,
  isGateOpenForParticipant,
} from '../services/registeredParticipants';

interface LandingPortalProps {
  onStartExam: (participant: ParticipantProfile) => void;
  onOpenDashboard: () => void;
  onOpenGuidelines: () => void;
}

export const LandingPortal: React.FC<LandingPortalProps> = ({
  onStartExam,
  onOpenDashboard,
}) => {
  // Stepper state: 1 = Profil & Tema, 2 = Pedoman & Aturan, 3 = Masuk Akun Ujian
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Authentication State - Login dengan Nama Lengkap (case-insensitive) & NISN (kata sandi)
  const [fullNameInput, setFullNameInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [hasAgreedToRules, setHasAgreedToRules] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loginSuccessParticipant, setLoginSuccessParticipant] = useState<RegisteredParticipant | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Ruang Tunggu Ujian (Exam Waiting Room) State
  const [waitingParticipant, setWaitingParticipant] = useState<RegisteredParticipant | null>(null);
  const [isGateOpen, setIsGateOpen] = useState<boolean>(false);
  const [lastGateCheckTime, setLastGateCheckTime] = useState<string>('');
  const [showTrialModal, setShowTrialModal] = useState<boolean>(false);

  // Kode Akses Darurat Panitia (Direct Override for Vercel / Emergency Gate Opening)
  const [emergencyPasscodeInput, setEmergencyPasscodeInput] = useState<string>('');
  const [isVerifyingPasscode, setIsVerifyingPasscode] = useState<boolean>(false);
  const [emergencyPasscodeError, setEmergencyPasscodeError] = useState<string | null>(null);

  // Ubah Kata Sandi Modal State (dalam Ruang Tunggu)
  const [showChangePasswordModal, setShowChangePasswordModal] = useState<boolean>(false);
  const [oldPasswordInput, setOldPasswordInput] = useState<string>('');
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [passChangeError, setPassChangeError] = useState<string | null>(null);
  const [passChangeSuccess, setPassChangeSuccess] = useState<string | null>(null);
  const [isSubmittingPassChange, setIsSubmittingPassChange] = useState<boolean>(false);

  // Quick Demo Account modal state
  const [showDemoModal, setShowDemoModal] = useState<boolean>(false);
  const [registeredList, setRegisteredList] = useState<RegisteredParticipant[]>([]);
  const [demoSearch, setDemoSearch] = useState<string>('');
  const [lastSyncText, setLastSyncText] = useState<string>('');
  const [isDemoActive, setIsDemoActive] = useState<boolean>(true);

  // Segmented interactive selectors for Jenjang (SMP vs SMA) & Babak (Penyisihan vs Semifinal)
  // Siswa WAJIB mengklik salah satu opsi secara manual (tidak ada default terpilih / tercentang)
  const [selectedCategory, setSelectedCategory] = useState<OlympiadCategory | null>(null);
  const [selectedStage, setSelectedStage] = useState<CompetitionStage | null>(null);

  useEffect(() => {
    // 1. Initial quick load from local storage
    setRegisteredList(getRegisteredParticipants());
    setLastSyncText(getLastSyncTime());
    setIsDemoActive(isDemoModeActive());

    // 2. Real-time fetch from server backend (crucial for HP / mobile devices)
    fetchRegisteredParticipantsFromServer().then((data) => {
      setRegisteredList(data.participants);
      setLastSyncText(data.lastSyncText);
      setIsDemoActive(data.isDemoActive);
    });
  }, [currentStep, showDemoModal]);

  const handleStep1Next = () => {
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStep2Next = () => {
    if (!hasAgreedToRules) {
      setValidationError('Anda wajib mencentang persetujuan telah membaca pedoman dan aturan ujian.');
      return;
    }
    setValidationError(null);
    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Polling server to check if panitia opened the exam gate while student is in Ruang Tunggu
  useEffect(() => {
    if (!waitingParticipant) return;

    let isMounted = true;
    const pollGate = async () => {
      try {
        const status = await getExamGateStatusOnline();
        if (!isMounted) return;
        setLastGateCheckTime(new Date().toLocaleTimeString('id-ID'));
        
        // Periksa apakah gerbang untuk jenjang dan babak peserta ini telah dibuka oleh pengawas
        const canEnter = isGateOpenForParticipant(
          status,
          waitingParticipant.category,
          waitingParticipant.stage || 'Penyisihan'
        );

        if (canEnter) {
          setIsGateOpen(true);
          // Auto transition to exam
          setTimeout(() => {
            if (isMounted && waitingParticipant) {
              const p = waitingParticipant;
              onStartExam({
                id: p.id || `MMO27-${p.category}-${Math.floor(100 + Math.random() * 900)}`,
                fullName: p.fullName,
                school: p.school,
                nisnOrRegNumber: p.nisnOrRegNumber,
                category: p.category,
                stage: p.stage || 'Penyisihan',
                city: p.city || 'Indonesia',
                email: p.email,
                supervisionMode: 'WEB_CAM',
              });
            }
          }, 600);
        }
      } catch (err) {
        console.warn('Error polling exam gate status:', err);
      }
    };

    pollGate();
    const interval = setInterval(pollGate, 2000);

    const handleGateEvent = () => {
      pollGate();
    };
    window.addEventListener('mmo_exam_gate_change', handleGateEvent);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('mmo_exam_gate_change', handleGateEvent);
    };
  }, [waitingParticipant, onStartExam]);

  const handleVerifyEmergencyPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emergencyPasscodeInput.trim() || !waitingParticipant) return;
    setIsVerifyingPasscode(true);
    setEmergencyPasscodeError(null);
    try {
      const res = await verifyEmergencyGatePasscodeOnline(emergencyPasscodeInput);
      if (res.success) {
        setIsGateOpen(true);
        const p = waitingParticipant;
        setTimeout(() => {
          onStartExam({
            id: p.id || `MMO27-${p.category}-${Math.floor(100 + Math.random() * 900)}`,
            fullName: p.fullName,
            school: p.school,
            nisnOrRegNumber: p.nisnOrRegNumber,
            category: p.category,
            stage: p.stage || 'Penyisihan',
            city: p.city || 'Indonesia',
            email: p.email,
            supervisionMode: 'WEB_CAM',
          });
        }, 500);
      } else {
        setEmergencyPasscodeError(res.message);
      }
    } catch (err: any) {
      setEmergencyPasscodeError(err?.message || 'Gagal memverifikasi kode akses darurat.');
    } finally {
      setIsVerifyingPasscode(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitingParticipant) return;
    setPassChangeError(null);
    setPassChangeSuccess(null);

    if (newPasswordInput.length < 4) {
      setPassChangeError('Kata sandi baru minimal 4 karakter.');
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setPassChangeError('Konfirmasi kata sandi baru tidak sama.');
      return;
    }

    setIsSubmittingPassChange(true);
    try {
      const res = await changeParticipantPasswordOnline(
        waitingParticipant.id,
        oldPasswordInput || waitingParticipant.password || waitingParticipant.nisnOrRegNumber,
        newPasswordInput
      );
      if (res.success) {
        setPassChangeSuccess(res.message);
        setWaitingParticipant((prev) => (prev ? { ...prev, password: newPasswordInput } : prev));
        setPasswordInput(newPasswordInput);
        setTimeout(() => {
          setShowChangePasswordModal(false);
          setPassChangeSuccess(null);
          setOldPasswordInput('');
          setNewPasswordInput('');
          setConfirmPasswordInput('');
        }, 1500);
      } else {
        setPassChangeError(res.message || 'Gagal mengubah kata sandi.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPassChangeError(msg || 'Terjadi kesalahan saat memperbarui kata sandi.');
    } finally {
      setIsSubmittingPassChange(false);
    }
  };

  const handleLoginAndStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validasi wajib pilih Jenjang dan Babak
    if (!selectedCategory || !selectedStage) {
      setValidationError('Silakan pilih salah satu opsi Jenjang (SMP/SMA) dan Babak (Penyisihan/Semifinal) terlebih dahulu sebelum masuk.');
      return;
    }

    setIsLoggingIn(true);

    try {
      // Authenticate directly against server backend so HP and Laptop are 100% in sync
      const result = await authenticateParticipantOnline(
        fullNameInput,
        passwordInput,
        selectedCategory,
        selectedStage
      );
      if (!result.success || !result.participant) {
        setValidationError(result.error || 'Nama lengkap atau kata sandi (NISN) tidak cocok dengan data pendaftaran.');
        setIsLoggingIn(false);
        return;
      }

      // Honor the explicitly chosen Jenjang and Babak selected by the participant via buttons
      const p: RegisteredParticipant = {
        ...result.participant,
        category: selectedCategory,
        stage: selectedStage,
      };

      // If panitia has already opened the exam gate for this category & stage, start immediately
      if (result.isExamGateOpen) {
        setLoginSuccessParticipant(p);
        setTimeout(() => {
          onStartExam({
            id: p.id || `MMO27-${p.category}-${Math.floor(100 + Math.random() * 900)}`,
            fullName: p.fullName,
            school: p.school,
            nisnOrRegNumber: p.nisnOrRegNumber,
            category: p.category,
            stage: p.stage || selectedStage,
            city: p.city || 'Indonesia',
            email: p.email,
            supervisionMode: 'WEB_CAM',
          });
        }, 450);
      } else {
        // Gate is still locked by panitia: put student in Ruang Tunggu Ujian
        setWaitingParticipant(p);
        setOldPasswordInput(p.password || p.nisnOrRegNumber);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setValidationError(msg || 'Terjadi kesalahan saat memeriksa akun ke server.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSelectDemoAccount = (account: RegisteredParticipant) => {
    setFullNameInput(account.fullName);
    setPasswordInput(account.password || account.nisnOrRegNumber);
    if (account.category) {
      setSelectedCategory(account.category);
    }
    if (account.stage) {
      setSelectedStage(account.stage);
    }
    setShowDemoModal(false);
    setValidationError(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6 lg:py-10 space-y-8 text-white">
      {/* Systematic Stepper Indicator Bar matching poster numbered timeline */}
      <div className="bg-[#2C4B6B]/90 backdrop-blur-sm border-2 border-[#E49548] rounded-3xl p-3 sm:p-4 shadow-xl">
        <div className="relative">
          {/* Poster-style gradient orange timeline line connecting steps 1 — 2 — 3 */}
          <div className="hidden sm:block absolute left-10 right-10 top-1/2 -translate-y-1/2 h-[2px] bg-gradient-to-r from-[#DC7822] via-[#FBE2BE] to-[#DC7822] opacity-85 pointer-events-none" />
          <div className="relative z-10 grid grid-cols-3 gap-2 text-center">
            {/* Step 1 */}
            <button
              onClick={() => setCurrentStep(1)}
              className={`flex flex-col sm:flex-row items-center justify-center gap-2 py-2.5 px-3 rounded-2xl transition-all duration-300 cursor-pointer ${
                currentStep === 1
                  ? 'bg-[#F4E6CC] text-[#1E3954] font-extrabold shadow-md border-2 border-[#E49548] -translate-y-0.5'
                  : 'bg-[#243E59] text-white hover:border-[#E49548] hover:shadow-xs border border-[#4E779F]'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-extrabold shrink-0 transition-colors ${
                  currentStep === 1 ? 'bg-[#E49548] text-[#1E3954]' : 'bg-[#4E779F] text-white'
                }`}
              >
                1
              </span>
              <span className="text-xs sm:text-sm font-bold truncate">
                Profil & Tema MMO
              </span>
            </button>

            {/* Step 2 */}
            <button
              onClick={() => {
                if (currentStep >= 2 || hasAgreedToRules) setCurrentStep(2);
              }}
              className={`flex flex-col sm:flex-row items-center justify-center gap-2 py-2.5 px-3 rounded-2xl transition-all duration-300 ${
                currentStep === 2
                  ? 'bg-[#F4E6CC] text-[#1E3954] font-extrabold shadow-md border-2 border-[#E49548] -translate-y-0.5'
                  : currentStep > 2
                  ? 'bg-[#243E59] text-white border border-[#E49548]/70 hover:border-[#E49548] cursor-pointer'
                  : 'bg-[#243E59]/90 text-[#B8CCE0]/60 border border-[#4E779F]/40 cursor-not-allowed'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-extrabold shrink-0 transition-colors ${
                  currentStep === 2
                    ? 'bg-[#E49548] text-[#1E3954]'
                    : currentStep > 2
                    ? 'bg-emerald-400 text-[#1E3954]'
                    : 'bg-[#3B5F84]/70 text-[#B8CCE0]/70'
                }`}
              >
                {currentStep > 2 ? '✓' : '2'}
              </span>
              <span className="text-xs sm:text-sm font-bold truncate">
                Pedoman & Aturan
              </span>
            </button>

            {/* Step 3 */}
            <button
              onClick={() => {
                if (hasAgreedToRules) setCurrentStep(3);
              }}
              className={`flex flex-col sm:flex-row items-center justify-center gap-2 py-2.5 px-3 rounded-2xl transition-all duration-300 ${
                currentStep === 3
                  ? 'bg-[#F4E6CC] text-[#1E3954] font-extrabold shadow-md border-2 border-[#E49548] -translate-y-0.5'
                  : 'bg-[#243E59]/90 text-[#B8CCE0]/60 border border-[#4E779F]/40 cursor-not-allowed'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-extrabold shrink-0 transition-colors ${
                  currentStep === 3 ? 'bg-[#E49548] text-[#1E3954]' : 'bg-[#3B5F84]/70 text-[#B8CCE0]/70'
                }`}
              >
                3
              </span>
              <span className="text-xs sm:text-sm font-bold truncate">
                Masuk Akun Ujian
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAHAP 1: PROFIL & FILOSOFI TEMA MMO 2027                 */}
      {/* ======================================================== */}
      {currentStep === 1 && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Main Hero Card framed like the MMO Poster */}
          <div className="bg-[#2C4B6B]/90 backdrop-blur-sm border-2 border-[#E49548] rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden transition-all duration-300">
            {/* Subtle curved ambient accent */}
            <svg
              className="absolute -right-12 -bottom-12 w-80 h-80 text-[#E49548]/10 pointer-events-none"
              viewBox="0 0 200 200"
              fill="currentColor"
            >
              <path d="M44.7,-76.4C58.8,-69.2,71.8,-59.1,79.6,-45.8C87.4,-32.6,90,-16.3,88.5,-0.9C87,14.6,81.4,29.1,73.1,42.2C64.9,55.2,54,66.8,40.8,74.7C27.6,82.6,12.1,86.7,-3.1,89.8C-18.3,92.9,-36.6,95,-50.7,87.6C-64.8,80.2,-74.7,63.3,-81.4,46.3C-88.1,29.3,-91.6,12.2,-89.8,-4.2C-88,-20.6,-80.9,-36.3,-70.6,-48.6C-60.3,-60.9,-46.8,-69.8,-32.8,-77C-18.8,-84.2,-4.4,-89.7,9.7,-91.4C23.8,-93.1,30.6,-83.6,44.7,-76.4Z" transform="translate(100 100)" />
            </svg>

            <div className="max-w-3xl space-y-6 relative z-10">
              {/* Organizer Cream Ribbon */}
              <div className="inline-flex items-center gap-2 bg-[#F4E6CC] text-[#1E3954] px-4 py-1.5 rounded-full text-xs font-extrabold shadow-sm border border-[#E49548]">
                <Award className="w-4 h-4 text-[#CE7D30]" />
                <span>HMPS MATRIKS Bidang Keilmuan · Prodi Pendidikan Matematika UMM</span>
              </div>

              {/* Title & Theme Banner */}
              <div>
                <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight drop-shadow-xs">
                  Matriks Mathematics Olympiad (MMO) 2027
                </h1>
                
                {/* Official Theme Box */}
                <div className="mt-4 bg-[#243E59] border-2 border-[#E49548] rounded-3xl p-6 sm:p-7 text-white shadow-lg relative overflow-hidden group transition-all duration-300">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#E49548]/10 rounded-full blur-2xl group-hover:bg-[#E49548]/20 transition-all duration-500" />
                  <div className="flex items-center gap-2 mb-2 relative z-10">
                    <Sparkles className="w-4 h-4 text-[#E49548] animate-pulse" />
                    <span className="text-[11px] font-extrabold tracking-widest uppercase bg-[#F4E6CC] text-[#1E3954] px-3 py-0.5 rounded-full">
                      Tema Resmi Kompetisi
                    </span>
                  </div>
                  <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white relative z-10">
                    “Matriks Mathematics Olympiad: Explore, Think, Excel”
                  </p>
                  <p className="text-sm font-semibold text-[#F4E6CC] mt-1.5 relative z-10">
                    Jelajahi Matematika · Asah Penalaran · Tunjukkan Kemampuan Terbaik
                  </p>
                </div>
              </div>

              {/* 3 Panduan Tema Kompetisi (Explore, Think, Excel) */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-[#E49548]" />
                    <h3 className="text-xs font-extrabold text-[#F4E6CC] uppercase tracking-wider">
                      3 Pilar Nalar Matematika MMO 2027 (Terintegrasi di Seluruh Babak):
                    </h3>
                  </div>
                  <span className="text-[11px] font-medium text-[#DCE9F5]">
                    Berlaku pada Babak Penyisihan, Semifinal, hingga Final
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {/* Tema 1: EXPLORE */}
                  <div className="bg-[#243E59] border-2 border-[#E49548]/80 hover:border-[#E49548] p-5 rounded-2xl shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group cursor-default">
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#F4E6CC] text-[#1E3954] px-2.5 py-1 rounded-full">
                          Pilar 1 · Eksplorasi
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-[#E49548] text-[#1E3954] flex items-center justify-center transition-all duration-300 shadow-xs">
                          <Compass className="w-4 h-4" />
                        </div>
                      </div>
                      <h4 className="text-base font-extrabold text-white tracking-tight">
                        EXPLORE
                      </h4>
                      <p className="text-xs text-[#DCE9F5] mt-2 leading-relaxed">
                        Kemampuan menyelidiki dan mengamati struktur bilangan, pola bentuk geometris, relasi data tabel, dan mengidentifikasi informasi tersembunyi sebagai langkah awal pemecahan masalah.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#4E779F]/50 space-y-1">
                      <div className="text-[11px] font-bold text-[#F4E6CC]">
                        Fokus Kompetensi:
                      </div>
                      <p className="text-[11px] text-[#DCE9F5] leading-normal">
                        Pengenalan pola, abstraksi visual, observasi sistematis, dan pemodelan matematis awal.
                      </p>
                    </div>
                  </div>

                  {/* Tema 2: THINK */}
                  <div className="bg-[#243E59] border-2 border-[#E49548]/80 hover:border-[#E49548] p-5 rounded-2xl shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group cursor-default">
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#F4E6CC] text-[#1E3954] px-2.5 py-1 rounded-full">
                          Pilar 2 · Penalaran
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-[#E49548] text-[#1E3954] flex items-center justify-center transition-all duration-300 shadow-xs">
                          <Brain className="w-4 h-4" />
                        </div>
                      </div>
                      <h4 className="text-base font-extrabold text-white tracking-tight">
                        THINK
                      </h4>
                      <p className="text-xs text-[#DCE9F5] mt-2 leading-relaxed">
                        Kemampuan bernalar kritis, membangun argumen deduktif-induktif yang kokoh, menguji hipotesis, menganalisis variasi kondisi matematika, dan mengeliminasi kontradiksi logika.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#4E779F]/50 space-y-1">
                      <div className="text-[11px] font-bold text-[#F4E6CC]">
                        Fokus Kompetensi:
                      </div>
                      <p className="text-[11px] text-[#DCE9F5] leading-normal">
                        Logika analitis bertingkat (HOTS), deduksi ketat, perumusan relasi, dan strategi pemecahan non-rutin.
                      </p>
                    </div>
                  </div>

                  {/* Tema 3: EXCEL */}
                  <div className="bg-[#243E59] border-2 border-[#E49548]/80 hover:border-[#E49548] p-5 rounded-2xl shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group cursor-default">
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#F4E6CC] text-[#1E3954] px-2.5 py-1 rounded-full">
                          Pilar 3 · Keunggulan
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-[#E49548] text-[#1E3954] flex items-center justify-center transition-all duration-300 shadow-xs">
                          <Trophy className="w-4 h-4" />
                        </div>
                      </div>
                      <h4 className="text-base font-extrabold text-white tracking-tight">
                        EXCEL
                      </h4>
                      <p className="text-xs text-[#DCE9F5] mt-2 leading-relaxed">
                        Mendemonstrasikan keunggulan tertinggi melalui ketelitian komputasi mutlak, kecepatan penentuan solusi optimal, sintesis konsep lintas bidang, dan perumusan jawaban yang akurat serta tuntas.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#4E779F]/50 space-y-1">
                      <div className="text-[11px] font-bold text-[#F4E6CC]">
                        Fokus Kompetensi:
                      </div>
                      <p className="text-[11px] text-[#DCE9F5] leading-normal">
                        Akurasi hasil akhir, efisiensi langkah solusi, presisi pembuktian, dan sintesis konsep tingkat mahir.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 1 Actions */}
              <div className="pt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={handleStep1Next}
                  className="px-6 py-3 bg-[#E49548] hover:bg-[#CE7D30] text-[#1E3954] font-extrabold text-xs sm:text-sm rounded-2xl transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-md hover:-translate-y-0.5 border border-[#F4E6CC]/60"
                >
                  <span>Lanjut ke Pedoman & Tata Tertib Ujian</span>
                  <ArrowRight className="w-4 h-4 text-[#1E3954]" />
                </button>

                <button
                  onClick={onOpenDashboard}
                  className="px-4 py-3 bg-[#243E59] hover:bg-[#3B5F84] border border-[#E49548]/80 text-[#F4E6CC] font-bold text-xs rounded-2xl transition-all duration-300 flex items-center gap-1.5 cursor-pointer shadow-xs hover:-translate-y-0.5"
                >
                  <Monitor className="w-4 h-4 text-[#E49548]" />
                  <span>Dasbor Pengawas Panitia</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAHAP 2: PEDOMAN TEKNIS & CHECKBOX WAJIB BACA           */}
      {/* ======================================================== */}
      {currentStep === 2 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-[#2C4B6B]/90 backdrop-blur-sm border-2 border-[#E49548] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 transition-all duration-300">
            <div className="flex items-center justify-between pb-4 border-b border-[#4E779F]/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#E49548] text-[#1E3954] flex items-center justify-center font-extrabold text-sm shadow-xs border-2 border-[#F4E6CC]">
                  2
                </div>
                <div>
                  <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider bg-[#F4E6CC] text-[#1E3954] px-3 py-0.5 rounded-full mb-1">
                    Ketentuan Resmi
                  </span>
                  <h2 className="text-lg font-extrabold text-white">
                    Pedoman Teknis & Tata Tertib Peserta MMO 2027
                  </h2>
                  <p className="text-xs text-[#DCE9F5]">
                    Harap membaca seluruh aturan sebelum melanjutkan ke pengisian identitas.
                  </p>
                </div>
              </div>
            </div>

            {validationError && (
              <div className="bg-rose-50 border border-rose-300 p-3 rounded-2xl text-xs text-rose-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Scoring System Card */}
            <div className="bg-[#243E59] border-2 border-[#E49548]/80 p-5 rounded-2xl shadow-md space-y-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-[#E49548]" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider bg-[#F4E6CC] text-[#1E3954] px-3 py-0.5 rounded-full">
                  1. Sistem Penskoran Resmi (OSN Standard)
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                <div className="bg-[#FAF3E3] border border-[#E49548]/60 p-3 rounded-2xl transition-all">
                  <span className="text-emerald-700 font-mono font-extrabold text-base block">+4 Poin</span>
                  <span className="text-[#1E3954] font-bold text-[11px]">Jawaban Benar</span>
                </div>
                <div className="bg-[#FAF3E3] border border-[#E49548]/60 p-3 rounded-2xl transition-all">
                  <span className="text-rose-700 font-mono font-extrabold text-base block">-1 Poin</span>
                  <span className="text-[#1E3954] font-bold text-[11px]">Jawaban Salah</span>
                </div>
                <div className="bg-[#FAF3E3] border border-[#E49548]/60 p-3 rounded-2xl transition-all">
                  <span className="text-[#4E779F] font-mono font-extrabold text-base block">0 Poin</span>
                  <span className="text-[#1E3954] font-bold text-[11px]">Tidak Dijawab</span>
                </div>
              </div>
            </div>

            {/* Anti-cheat and Regulations */}
            <div className="bg-[#243E59] border-2 border-[#E49548]/80 p-5 rounded-2xl shadow-md space-y-3 text-xs text-[#DCE9F5]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#E49548]" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider bg-[#F4E6CC] text-[#1E3954] px-3 py-0.5 rounded-full">
                  2. Ketentuan Anti-Cheat & Pengawasan Layar
                </h3>
              </div>
              <ul className="space-y-2.5 list-disc pl-5 leading-relaxed">
                <li>
                  <strong className="text-white">Mode Layar Penuh (Fullscreen):</strong> Peserta wajib mengerjakan dalam mode layar penuh. Keluar dari fullscreen akan dihitung sebagai pelanggaran.
                </li>
                <li>
                  <strong className="text-white">Larangan Alih Tab & Jendela:</strong> Dilarang berpindah tab browser atau membuka aplikasi sampingan. Setiap alih tab dicatat secara otomatis oleh sistem proktor.
                </li>
                <li>
                  <strong className="text-white">Pembatasan Papan Klip:</strong> Fitur salin-tempel (<em>copy-paste</em>), klik kanan, dan <em>inspect element</em> dinonaktifkan demi integritas kompetisi.
                </li>
                <li>
                  <strong className="text-white">Batas Toleransi:</strong> Akumulasi 4 kali pelanggaran akan mengunci layar secara otomatis dan membutuhkan PIN otorisasi panitia untuk dibuka kembali.
                </li>
              </ul>
            </div>

            {/* MANDATORY CHECKBOX in cream-sand container */}
            <div className="bg-[#FAF3E3] border-2 border-[#E49548] p-4 rounded-2xl shadow-sm transition-all duration-300">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasAgreedToRules}
                  onChange={(e) => {
                    setHasAgreedToRules(e.target.checked);
                    if (e.target.checked) setValidationError(null);
                  }}
                  className="mt-1 w-4 h-4 rounded-md border-[#1E3954] accent-[#2C4B6B] cursor-pointer"
                />
                <span className="text-xs sm:text-sm font-bold text-[#1E3954] leading-snug">
                  Saya telah membaca, memahami, dan menyetujui seluruh pedoman teknis, tata tertib, serta konsekuensi sistem anti-cheat pada ujian MMO 2027.
                </span>
              </label>
            </div>

            {/* Navigation buttons for Step 2 */}
            <div className="pt-2 flex items-center justify-between gap-4">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2.5 bg-[#243E59] hover:bg-[#3B5F84] border border-[#E49548]/80 text-[#F4E6CC] font-bold text-xs rounded-2xl transition-all duration-300 flex items-center gap-1.5 cursor-pointer shadow-xs hover:-translate-y-0.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke Profil</span>
              </button>

              <button
                onClick={handleStep2Next}
                disabled={!hasAgreedToRules}
                className="px-6 py-2.5 bg-[#E49548] hover:bg-[#CE7D30] disabled:opacity-40 disabled:cursor-not-allowed text-[#1E3954] font-extrabold text-xs sm:text-sm rounded-2xl transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-md hover:-translate-y-0.5 border border-[#F4E6CC]/60"
              >
                <span>Lanjut ke Masuk Akun Ujian</span>
                <ArrowRight className="w-4 h-4 text-[#1E3954]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAHAP 3: MASUK AKUN UJIAN (NAMA LENGKAP & NISN)          */}
      {/* ======================================================== */}
      {currentStep === 3 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {waitingParticipant ? (
            /* ======================================================== */
            /* RUANG TUNGGU UJIAN (EXAM WAITING ROOM)                  */
            /* ======================================================== */
            <div className="bg-[#2C4B6B]/90 backdrop-blur-sm border-2 border-[#E49548] rounded-3xl p-6 sm:p-9 shadow-xl space-y-6 text-white">
              {/* Waiting Room Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#4E779F]/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#E49548] text-[#1E3954] flex items-center justify-center font-bold text-sm shadow-xs border-2 border-[#F4E6CC]">
                    <Clock className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider bg-[#F4E6CC] text-[#1E3954] px-3 py-0.5 rounded-full">
                        Ruang Tunggu Ujian MMO 2027
                      </span>
                      <span className="text-[11px] text-[#DCE9F5] font-mono">
                        Cek Server: {lastGateCheckTime || 'Menghubungkan...'}
                      </span>
                    </div>
                    <h2 className="text-xl font-extrabold text-white mt-1">
                      Menunggu Pembukaan Akses Soal oleh Panitia
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowChangePasswordModal(true)}
                    className="px-3.5 py-2 bg-[#243E59] hover:bg-[#3B5F84] border border-[#E49548]/80 text-[#F4E6CC] text-xs font-bold rounded-2xl transition-all duration-300 flex items-center gap-1.5 cursor-pointer shadow-xs hover:-translate-y-0.5"
                  >
                    <Key className="w-3.5 h-3.5 text-[#E49548]" />
                    <span>Ubah Kata Sandi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWaitingParticipant(null);
                      setLoginSuccessParticipant(null);
                    }}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 text-xs font-bold rounded-2xl transition-all duration-300 flex items-center gap-1.5 cursor-pointer shadow-xs hover:-translate-y-0.5"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-600" />
                    <span>Keluar Akun</span>
                  </button>
                </div>
              </div>

              {/* Status Alert: Gate Locked vs Gate Open */}
              {isGateOpen ? (
                <div className="bg-emerald-600 text-white p-5 rounded-2xl shadow-sm flex items-center gap-3 animate-in zoom-in-95">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Akses Soal Telah Dibuka oleh Panitia!</h3>
                    <p className="text-xs text-emerald-100 mt-0.5">
                      Mempersiapkan lembar soal dan pengawasan kamera... Anda akan dialihkan secara otomatis.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-[#FAF3E3] border-2 border-[#E49548] p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[#1E3954] shadow-xs">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-3.5 h-3.5 rounded-full bg-[#CE7D30] animate-ping shrink-0 mt-1 sm:mt-0" />
                    <div>
                      <div className="font-extrabold text-xs sm:text-sm">
                        Status Soal: Masih Terkunci (Menunggu Aba-Aba Panitia)
                      </div>
                      <div className="text-xs text-[#2C4B6B] mt-0.5">
                        Anda sudah berhasil masuk. Tetaplah di halaman ini. Begitu panitia membuka ujian di dasbor pengawas, sistem akan langsung membuka soal tanpa perlu memuat ulang (<em>refresh</em>).
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-mono text-[#1E3954] bg-[#F4E6CC] border border-[#E49548] px-2.5 py-1 rounded-xl shrink-0 self-start sm:self-center font-bold">
                    <RefreshCw className="w-3 h-3 animate-spin text-[#CE7D30]" />
                    <span>Sinkron Otomatis (2s)</span>
                  </div>
                </div>
              )}

              {/* Participant Profile Card */}
              <div className="bg-[#243E59] border-2 border-[#E49548]/80 rounded-3xl p-5 sm:p-6 shadow-md space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#4E779F]/50">
                  <span className="text-xs font-extrabold uppercase tracking-wider bg-[#F4E6CC] text-[#1E3954] px-3 py-0.5 rounded-full">
                    Identitas Peserta Terverifikasi
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-extrabold px-3 py-1 rounded-xl bg-[#F4E6CC] text-[#1E3954] border border-[#E49548]">
                      Jenjang {waitingParticipant.category}
                    </span>
                    <span className="text-xs font-extrabold px-3 py-1 rounded-xl bg-[#E49548] text-[#1E3954]">
                      Babak {waitingParticipant.stage || selectedStage || 'Penyisihan'}
                    </span>
                  </div>
                </div>

                {/* Switcher Jenjang & Babak Langsung di Ruang Tunggu */}
                <div className="p-3.5 bg-[#2C4B6B] border border-[#4E779F] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-[#F4E6CC] block">Paket Soal Ujian Terpilih:</span>
                    <span className="text-[#DCE9F5] text-[11px]">
                      Akan mengerjakan soal <strong className="text-white">Jenjang {waitingParticipant.category}</strong> — <strong className="text-white">Babak {waitingParticipant.stage || 'Penyisihan'}</strong>.
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const nextCat = waitingParticipant.category === 'SMP' ? 'SMA' : 'SMP';
                        setWaitingParticipant({ ...waitingParticipant, category: nextCat });
                        setSelectedCategory(nextCat);
                      }}
                      className="px-3 py-1.5 bg-[#F4E6CC] hover:bg-white border border-[#E49548] rounded-xl text-xs font-extrabold text-[#1E3954] transition-all duration-200 shadow-2xs hover:-translate-y-0.5 cursor-pointer"
                      title="Klik untuk berpindah jenjang soal"
                    >
                      Ubah ke Jenjang {waitingParticipant.category === 'SMP' ? 'SMA' : 'SMP'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const nextStage = waitingParticipant.stage === 'Penyisihan' ? 'Semifinal' : 'Penyisihan';
                        setWaitingParticipant({ ...waitingParticipant, stage: nextStage });
                        setSelectedStage(nextStage);
                      }}
                      className="px-3 py-1.5 bg-[#F4E6CC] hover:bg-white border border-[#E49548] rounded-xl text-xs font-extrabold text-[#1E3954] transition-all duration-200 shadow-2xs hover:-translate-y-0.5 cursor-pointer"
                      title="Klik untuk berpindah babak ujian"
                    >
                      Ubah ke Babak {waitingParticipant.stage === 'Penyisihan' ? 'Semifinal' : 'Penyisihan'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[11px] font-semibold text-[#DCE9F5] block">Nama Lengkap Peserta</span>
                    <span className="text-base sm:text-lg font-extrabold text-white block mt-0.5">
                      {waitingParticipant.fullName}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-[#DCE9F5] block">Nomor Induk Siswa Nasional (NISN)</span>
                    <span className="text-base sm:text-lg font-mono font-bold text-[#F4E6CC] block mt-0.5">
                      {waitingParticipant.nisnOrRegNumber}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-[#DCE9F5] block">Asal Sekolah / Madrasah</span>
                    <span className="text-xs sm:text-sm font-semibold text-white block mt-0.5">
                      {waitingParticipant.school}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-[#DCE9F5] block">Kota / Kabupaten</span>
                    <span className="text-xs sm:text-sm font-semibold text-white block mt-0.5">
                      {waitingParticipant.city || 'Indonesia'}
                    </span>
                  </div>
                </div>

                {/* Password Info Ribbon */}
                <div className="pt-3 border-t border-[#4E779F]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#DCE9F5] bg-[#2C4B6B] p-3 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-[#E49548] shrink-0" />
                    <span>
                      Kata sandi saat ini: <strong className="font-mono text-[#F4E6CC]">{waitingParticipant.password || waitingParticipant.nisnOrRegNumber}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowChangePasswordModal(true)}
                    className="text-[11px] text-[#F4E6CC] hover:text-white hover:underline font-bold cursor-pointer self-start sm:self-center"
                  >
                    Ubah Kata Sandi Ujian →
                  </button>
                </div>
              </div>

              {/* Emergency Access Passcode Card (Panitia Direct Passcode / Vercel Fallback) */}
              <div className="bg-[#243E59] border-2 border-[#E49548]/80 rounded-3xl p-5 sm:p-6 shadow-md transition-all duration-300 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-[#E49548]" />
                    <span className="text-xs font-extrabold text-[#F4E6CC] uppercase tracking-wider">
                      Punya Kode Akses Darurat dari Pengawas?
                    </span>
                  </div>
                  <span className="text-[10px] text-[#1E3954] font-mono bg-[#F4E6CC] border border-[#E49548] px-2.5 py-0.5 rounded-full font-extrabold">
                    Akses Cepat Pengawas
                  </span>
                </div>
                <p className="text-xs text-[#DCE9F5]">
                  Jika panitia telah mengumumkan bahwa ujian dimulai atau memberikan Kode Akses di Zoom/Meet, Anda dapat memasukkan kode akses panitia di bawah ini untuk langsung membuka lembar soal.
                </p>

                {emergencyPasscodeError && (
                  <div className="bg-rose-50 border border-rose-300 text-rose-900 text-xs p-3 rounded-2xl flex items-center gap-2 animate-in fade-in">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{emergencyPasscodeError}</span>
                  </div>
                )}

                <form onSubmit={handleVerifyEmergencyPasscode} className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
                  <input
                    type="text"
                    value={emergencyPasscodeInput}
                    onChange={(e) => setEmergencyPasscodeInput(e.target.value.toUpperCase())}
                    placeholder="Masukkan kode akses (Misal: MMO2027)"
                    className="w-full sm:w-80 bg-white border-2 border-[#4E779F] focus:border-[#E49548] focus:ring-2 focus:ring-[#E49548]/30 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-[#1E3954] font-mono font-bold uppercase tracking-wider placeholder-slate-400 transition-all duration-200"
                  />
                  <button
                    type="submit"
                    disabled={isVerifyingPasscode || !emergencyPasscodeInput.trim()}
                    className="w-full sm:w-auto px-5 py-2.5 bg-[#E49548] hover:bg-[#CE7D30] disabled:opacity-50 text-[#1E3954] font-extrabold text-xs rounded-2xl transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs hover:-translate-y-0.5 border border-[#F4E6CC]/60 shrink-0"
                  >
                    {isVerifyingPasscode ? (
                      <>
                        <RotateCcw className="w-3.5 h-3.5 animate-spin text-[#1E3954]" />
                        <span>Memeriksa...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5 text-[#1E3954]" />
                        <span>Buka Soal Sekarang</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Uji Coba Tampilan & Simulasi Soal (3 Soal Mandiri) */}
              <div className="bg-[#243E59] text-white border-2 border-[#E49548] rounded-3xl p-5 sm:p-6 shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-36 h-36 bg-[#E49548]/10 rounded-full blur-2xl group-hover:bg-[#E49548]/20 transition-all duration-500" />
                <div className="flex items-start gap-3.5 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-[#2C4B6B] flex items-center justify-center shrink-0 border-2 border-[#E49548] text-[#E49548] shadow-xs">
                    <Sparkles className="w-6 h-6 text-[#E49548] animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#F4E6CC] px-2.5 py-0.5 rounded-full text-[#1E3954]">
                        Simulasi Pra-Ujian
                      </span>
                      <span className="text-xs text-[#F4E6CC] font-semibold">
                        3 Soal KaTeX · Tanpa Mengurangi Nilai
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-extrabold text-white">
                      Uji Coba Tampilan & Navigasi Soal (3 Soal Latihan)
                    </h3>
                    <p className="text-xs text-[#DCE9F5] leading-relaxed max-w-xl">
                      Sembari menunggu panitia membuka gerbang ujian resmi, Anda bisa mencoba simulasi pengerjaan 3 soal matematika KaTeX agar terbiasa dengan tombol pilihan, coretan rumus, dan sistem navigasi.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowTrialModal(true)}
                  className="px-5 py-3 rounded-2xl bg-[#E49548] hover:bg-[#CE7D30] text-[#1E3954] font-extrabold text-xs flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-md hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 relative z-10 border border-[#F4E6CC]/60"
                >
                  <Play className="w-4 h-4 fill-[#1E3954] text-[#1E3954]" />
                  <span>Mulai Uji Coba (3 Soal)</span>
                </button>
              </div>

              {/* Pre-Exam Readiness Checklist */}
              <div className="bg-[#243E59] border border-[#E49548]/60 rounded-3xl p-5 shadow-xs space-y-3">
                <h4 className="text-xs font-extrabold text-[#F4E6CC] uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Kesiapan Sistem & Tata Tertib Selama Menunggu:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-[#FAF3E3] border border-[#E49548]/60 p-3 rounded-2xl flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold text-[#1E3954] block">Koneksi Server</span>
                      <span className="text-[11px] text-[#4E779F]">Terhubung & Stabil</span>
                    </div>
                  </div>
                  <div className="bg-[#FAF3E3] border border-[#E49548]/60 p-3 rounded-2xl flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold text-[#1E3954] block">Kamera Proktor</span>
                      <span className="text-[11px] text-[#4E779F]">Siap Diaktifkan</span>
                    </div>
                  </div>
                  <div className="bg-[#FAF3E3] border border-[#E49548]/60 p-3 rounded-2xl flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold text-[#1E3954] block">Sistem Anti-Cheat</span>
                      <span className="text-[11px] text-[#4E779F]">Aktif Saat Ujian Mulai</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ======================================================== */
            /* LOGIN FORM (NAMA LENGKAP & NISN)                        */
            /* ======================================================== */
            <div className="bg-[#2C4B6B]/90 backdrop-blur-sm border-2 border-[#E49548] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 text-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#4E779F]/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#E49548] text-[#1E3954] flex items-center justify-center font-extrabold text-sm shadow-xs border-2 border-[#F4E6CC]">
                    3
                  </div>
                  <div>
                    <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider bg-[#F4E6CC] text-[#1E3954] px-3 py-0.5 rounded-full mb-1">
                      Autentikasi Resmi
                    </span>
                    <h2 className="text-lg font-extrabold text-white">
                      Masuk Akun Peserta Ujian
                    </h2>
                    <p className="text-xs text-[#DCE9F5]">
                      Masukkan Nama Lengkap dan NISN pendaftaran Anda. Huruf kapital atau kecil tidak berpengaruh.
                    </p>
                  </div>
                </div>

                {/* Quick Demo Accounts button (only if demo mode is active and accounts exist) */}
                {isDemoActive && registeredList.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDemoModal(true)}
                      className="px-3.5 py-2 bg-[#F4E6CC] hover:bg-white border border-[#E49548] rounded-2xl text-xs font-extrabold text-[#1E3954] cursor-pointer shadow-xs flex items-center gap-1.5 transition-all duration-300 hover:-translate-y-0.5"
                      title="Pilih akun contoh pendaftar untuk uji coba cepat"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-[#1E3954]" />
                      <span>Pilih Akun Demo ({registeredList.length})</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Google Sheets Sync Status Ribbon */}
              <div className={`p-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs border ${
                registeredList.length > 0
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-[#FAF3E3] border-[#E49548] text-[#1E3954]'
              }`}>
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className={`w-4 h-4 shrink-0 ${registeredList.length > 0 ? 'text-emerald-700' : 'text-[#CE7D30]'}`} />
                  <span>
                    {registeredList.length > 0 ? (
                      <>
                        Basis data terhubung ke <strong>{isDemoActive ? 'Data Pendaftaran / Demo' : 'Data Pendaftaran Asli'}</strong> ({registeredList.length} akun peserta terdaftar).
                      </>
                    ) : (
                      <>
                        Belum ada data pendaftaran yang tersimpan. Panitia dapat memasukkan link Google Spreadsheet atau upload file Excel di <strong>Dashboard Pengawas</strong>.
                      </>
                    )}
                  </span>
                </div>
                <span className={`text-[11px] font-mono ${registeredList.length > 0 ? 'text-emerald-800' : 'text-[#2C4B6B]'}`}>
                  Sinkron: {lastSyncText}
                </span>
              </div>

              {validationError && (
                <div className="bg-rose-50 border border-rose-300 p-3.5 rounded-2xl text-xs text-rose-900 flex items-start gap-2.5 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-semibold">{validationError}</div>
                    <div className="text-[11px] text-rose-700">
                      {isDemoActive ? (
                        <>
                          Tip: Jika sedang mencoba, klik tombol <strong>"Pilih Akun Demo"</strong> di kanan atas, atau hubungi panitia jika baru mendaftar di formulir Google Form.
                        </>
                      ) : (
                        <>
                          Pastikan nama lengkap sama persis dengan yang diisi di Google Form (huruf kapital/kecil tidak berpengaruh) dan masukkan NISN sebagai kata sandi.
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Success State when participant is verified and redirecting */}
              {loginSuccessParticipant ? (
                <div className="bg-emerald-600 text-white p-6 rounded-3xl shadow-sm text-center space-y-3 animate-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold">Akun Terverifikasi!</h3>
                    <p className="text-sm font-medium text-emerald-100">
                      Selamat datang, <strong>{loginSuccessParticipant.fullName}</strong>
                    </p>
                  </div>
                  <div className="inline-flex flex-wrap items-center justify-center gap-2 text-xs bg-white/10 px-4 py-2 rounded-2xl">
                    <span>{loginSuccessParticipant.school}</span>
                    <span>·</span>
                    <span>Jenjang {loginSuccessParticipant.category}</span>
                    <span>·</span>
                    <span>NISN: {loginSuccessParticipant.nisnOrRegNumber}</span>
                  </div>
                  <p className="text-xs text-emerald-200 animate-pulse pt-2">
                    Memulai ujian dan mengaktifkan pengawasan kamera web...
                  </p>
                </div>
              ) : (
                <form onSubmit={handleLoginAndStart} className="space-y-5 bg-[#243E59] border-2 border-[#E49548]/80 p-6 sm:p-7 rounded-3xl shadow-md transition-all duration-300 text-white">
                  {/* Pilihan Interaktif: Jenjang (SMP/SMA) & Babak (Penyisihan/Semifinal) */}
                  <div className="space-y-4 p-4 sm:p-5 bg-[#2C4B6B] border border-[#E49548]/60 rounded-3xl shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#4E779F]/50">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#E49548]" />
                        <span className="text-xs font-extrabold text-[#F4E6CC] uppercase tracking-wider">
                          Pilih Paket Soal Ujian (Wajib Pilih)
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border transition-all ${
                          selectedCategory
                            ? 'text-[#1E3954] bg-[#F4E6CC] border-[#E49548]'
                            : 'text-[#1E3954] bg-amber-100 border-[#E49548]'
                        }`}>
                          {selectedCategory ? `Jenjang ${selectedCategory}` : '⚠️ Jenjang: Belum Dipilih'}
                        </span>
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border transition-all ${
                          selectedStage
                            ? 'text-[#1E3954] bg-[#F4E6CC] border-[#E49548]'
                            : 'text-[#1E3954] bg-amber-100 border-[#E49548]'
                        }`}>
                          {selectedStage ? `Babak ${selectedStage}` : '⚠️ Babak: Belum Dipilih'}
                        </span>
                      </div>
                    </div>

                    {/* 1. Tombol Pemilih Jenjang (SMP vs SMA) */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-white">
                          1. Pilih Tingkat / Jenjang Sekolah: <span className="text-[#E49548]">*</span>
                        </label>
                        <span className="text-[11px] text-[#DCE9F5]">
                          {selectedCategory ? `Terpilih: Jenjang ${selectedCategory}` : 'Wajib klik salah satu'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => setSelectedCategory('SMP')}
                          className={`p-3.5 rounded-2xl border-2 text-left transition-all duration-300 cursor-pointer flex items-center justify-between group ${
                            selectedCategory === 'SMP'
                              ? 'bg-[#F4E6CC] text-[#1E3954] border-[#E49548] shadow-md -translate-y-0.5'
                              : 'bg-[#243E59] text-white border-[#4E779F] hover:border-[#E49548] hover:-translate-y-0.5'
                          }`}
                        >
                          <div>
                            <span className="text-xs sm:text-sm font-extrabold block">
                              Jenjang SMP / MTs
                            </span>
                            <span className={`text-[11px] block mt-0.5 ${selectedCategory === 'SMP' ? 'text-[#2C4B6B]' : 'text-[#DCE9F5]'}`}>
                              Sekolah Menengah Pertama
                            </span>
                          </div>
                          <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            selectedCategory === 'SMP'
                              ? 'bg-[#E49548] text-[#1E3954]'
                              : 'bg-[#3B5F84] text-[#F4E6CC] group-hover:bg-[#E49548] group-hover:text-[#1E3954]'
                          }`}>
                            {selectedCategory === 'SMP' ? (
                              <Check className="w-4 h-4 stroke-[3]" />
                            ) : (
                              <span className="text-[10px] font-bold">SMP</span>
                            )}
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedCategory('SMA')}
                          className={`p-3.5 rounded-2xl border-2 text-left transition-all duration-300 cursor-pointer flex items-center justify-between group ${
                            selectedCategory === 'SMA'
                              ? 'bg-[#F4E6CC] text-[#1E3954] border-[#E49548] shadow-md -translate-y-0.5'
                              : 'bg-[#243E59] text-white border-[#4E779F] hover:border-[#E49548] hover:-translate-y-0.5'
                          }`}
                        >
                          <div>
                            <span className="text-xs sm:text-sm font-extrabold block">
                              Jenjang SMA / MA / SMK
                            </span>
                            <span className={`text-[11px] block mt-0.5 ${selectedCategory === 'SMA' ? 'text-[#2C4B6B]' : 'text-[#DCE9F5]'}`}>
                              Sekolah Menengah Atas & Kejuruan
                            </span>
                          </div>
                          <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            selectedCategory === 'SMA'
                              ? 'bg-[#E49548] text-[#1E3954]'
                              : 'bg-[#3B5F84] text-[#F4E6CC] group-hover:bg-[#E49548] group-hover:text-[#1E3954]'
                          }`}>
                            {selectedCategory === 'SMA' ? (
                              <Check className="w-4 h-4 stroke-[3]" />
                            ) : (
                              <span className="text-[10px] font-bold">SMA</span>
                            )}
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* 2. Tombol Pemilih Babak (Penyisihan vs Semifinal) */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-white">
                          2. Pilih Babak Kompetisi: <span className="text-[#E49548]">*</span>
                        </label>
                        <span className="text-[11px] text-[#DCE9F5]">
                          {selectedStage ? `Terpilih: Babak ${selectedStage}` : 'Wajib klik salah satu'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => setSelectedStage('Penyisihan')}
                          className={`p-3.5 rounded-2xl border-2 text-left transition-all duration-300 cursor-pointer flex items-center justify-between group ${
                            selectedStage === 'Penyisihan'
                              ? 'bg-[#F4E6CC] text-[#1E3954] border-[#E49548] shadow-md -translate-y-0.5'
                              : 'bg-[#243E59] text-white border-[#4E779F] hover:border-[#E49548] hover:-translate-y-0.5'
                          }`}
                        >
                          <div>
                            <span className="text-xs sm:text-sm font-extrabold block">
                              Babak Penyisihan
                            </span>
                            <span className={`text-[11px] block mt-0.5 ${selectedStage === 'Penyisihan' ? 'text-[#2C4B6B]' : 'text-[#DCE9F5]'}`}>
                              Langkah Awal Menuju Puncak Kompetisi
                            </span>
                          </div>
                          <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            selectedStage === 'Penyisihan'
                              ? 'bg-[#E49548] text-[#1E3954]'
                              : 'bg-[#3B5F84] text-[#F4E6CC] group-hover:bg-[#E49548] group-hover:text-[#1E3954]'
                          }`}>
                            {selectedStage === 'Penyisihan' ? (
                              <Check className="w-4 h-4 stroke-[3]" />
                            ) : (
                              <span className="text-[10px] font-bold">1</span>
                            )}
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedStage('Semifinal')}
                          className={`p-3.5 rounded-2xl border-2 text-left transition-all duration-300 cursor-pointer flex items-center justify-between group ${
                            selectedStage === 'Semifinal'
                              ? 'bg-[#F4E6CC] text-[#1E3954] border-[#E49548] shadow-md -translate-y-0.5'
                              : 'bg-[#243E59] text-white border-[#4E779F] hover:border-[#E49548] hover:-translate-y-0.5'
                          }`}
                        >
                          <div>
                            <span className="text-xs sm:text-sm font-extrabold block">
                              Babak Semifinal
                            </span>
                            <span className={`text-[11px] block mt-0.5 ${selectedStage === 'Semifinal' ? 'text-[#2C4B6B]' : 'text-[#DCE9F5]'}`}>
                              Tantangan Analitis & Penentuan Finalis
                            </span>
                          </div>
                          <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            selectedStage === 'Semifinal'
                              ? 'bg-[#E49548] text-[#1E3954]'
                              : 'bg-[#3B5F84] text-[#F4E6CC] group-hover:bg-[#E49548] group-hover:text-[#1E3954]'
                          }`}>
                            {selectedStage === 'Semifinal' ? (
                              <Check className="w-4 h-4 stroke-[3]" />
                            ) : (
                              <span className="text-[10px] font-bold">2</span>
                            )}
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Full Name Input */}
                  <div>
                    <label className="block text-xs font-bold text-[#F4E6CC] mb-1.5">
                      Nama Lengkap Peserta <span className="text-[#E49548]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#4E779F]">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={fullNameInput}
                        onChange={(e) => setFullNameInput(e.target.value)}
                        placeholder="Contoh: Alfa atau Budi Cahyono Nugroho"
                        className="w-full bg-white border-2 border-[#4E779F] focus:border-[#E49548] focus:ring-2 focus:ring-[#E49548]/30 rounded-2xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-[#1E3954] placeholder-slate-400 transition-all duration-200"
                      />
                    </div>
                    <span className="text-[11px] text-[#DCE9F5] mt-1 block">
                      💡 <strong>Format huruf kapital tidak berpengaruh</strong> (misal: <em>ALFA</em>, <em>Alfa</em>, atau <em>alfa</em> dianggap sama).
                    </span>
                  </div>

                  {/* Password Input (NISN) */}
                  <div>
                    <label className="block text-xs font-bold text-[#F4E6CC] mb-1.5">
                      Kata Sandi / NISN Pendaftaran <span className="text-[#E49548]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#4E779F]">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="Masukkan nomor NISN Anda (sebagai kata sandi)"
                        className="w-full bg-white border-2 border-[#4E779F] focus:border-[#E49548] focus:ring-2 focus:ring-[#E49548]/30 rounded-2xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-[#1E3954] placeholder-slate-400 transition-all duration-200"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#4E779F] hover:text-[#1E3954] cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#DCE9F5] mt-1">
                      <span>Gunakan nomor <strong>NISN</strong> saat mendaftar. Kata sandi dapat diubah di Ruang Tunggu.</span>
                    </div>
                  </div>

                  {/* Quick Hint Card */}
                  <div className="p-3.5 bg-[#2C4B6B] border border-[#4E779F] rounded-2xl flex items-center justify-between gap-3 text-xs text-[#DCE9F5]">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-[#E49548] shrink-0" />
                      <span>
                        Lupa NISN atau kesulitan masuk? Hubungi panitia atau gunakan akun contoh jika sedang uji coba.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFullNameInput('Siti Aulia Maharani');
                        setPasswordInput('0069876543');
                        setSelectedCategory('SMA');
                        setSelectedStage('Penyisihan');
                      }}
                      className="text-[11px] text-[#F4E6CC] hover:text-white hover:underline font-bold shrink-0 cursor-pointer"
                    >
                      Isi Contoh: Siti (SMA)
                    </button>
                  </div>

                  {/* Guide banner when either category or stage is not selected yet */}
                  {(!selectedCategory || !selectedStage) && (
                    <div className="p-3.5 bg-[#FAF3E3] border border-[#E49548] rounded-2xl flex items-start gap-3 text-xs text-[#1E3954] shadow-2xs animate-in fade-in">
                      <AlertTriangle className="w-4 h-4 text-[#CE7D30] shrink-0 mt-0.5" />
                      <div>
                        <div className="font-extrabold text-[#1E3954]">
                          Panduan Wajib: Pilih Tingkat & Babak
                        </div>
                        <p className="text-[11px] text-[#2C4B6B] mt-0.5 leading-relaxed">
                          Anda harus mengklik salah satu tombol <strong>Jenjang Sekolah (SMP/SMA)</strong> dan <strong>Babak Kompetisi (Penyisihan/Semifinal)</strong> di atas sebelum tombol masuk diaktifkan.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Final Submit & Back buttons */}
                  <div className="pt-4 border-t border-[#4E779F]/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="w-full sm:w-auto px-4 py-2.5 bg-[#2C4B6B] hover:bg-[#3B5F84] border border-[#4E779F] text-[#F4E6CC] font-bold text-xs rounded-2xl transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs hover:-translate-y-0.5"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Kembali ke Pedoman</span>
                    </button>

                    <button
                      type="submit"
                      disabled={isLoggingIn || !selectedCategory || !selectedStage}
                      title={
                        !selectedCategory || !selectedStage
                          ? 'Pilih Jenjang dan Babak di atas terlebih dahulu'
                          : 'Masuk ke Ruang Ujian'
                      }
                      className="w-full sm:w-auto px-6 py-3 bg-[#E49548] hover:bg-[#CE7D30] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:-translate-y-0 disabled:hover:shadow-none text-[#1E3954] font-extrabold text-xs sm:text-sm rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-md hover:-translate-y-0.5 border border-[#F4E6CC]/60"
                    >
                      {isLoggingIn ? (
                        <>
                          <RotateCcw className="w-4 h-4 text-[#1E3954] animate-spin" />
                          <span>Memverifikasi Akun ke Server...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4 text-[#1E3954]" />
                          <span>Masuk ke Ruang Ujian</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: UBAH KATA SANDI PESERTA (RUANG TUNGGU UJIAN)      */}
      {/* ======================================================== */}
      {showChangePasswordModal && waitingParticipant && (
        <div className="fixed inset-0 z-50 bg-[#1E3954]/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#E49548] rounded-3xl max-w-md w-full shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200 text-[#1E3954]">
            <div className="flex items-center justify-between pb-3 border-b border-[#EBF1F6]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-2xl bg-[#2C4B6B] border border-[#E49548] text-[#F4E6CC] flex items-center justify-center">
                  <Key className="w-4 h-4 text-[#E49548]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#1E3954]">Ubah Kata Sandi Ujian</h3>
                  <p className="text-xs text-[#4E779F]">Ganti kata sandi default NISN Anda</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowChangePasswordModal(false);
                  setPassChangeError(null);
                  setPassChangeSuccess(null);
                }}
                className="w-8 h-8 rounded-full hover:bg-[#FAF3E3] flex items-center justify-center text-[#4E779F] hover:text-[#1E3954] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {passChangeError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{passChangeError}</span>
              </div>
            )}

            {passChangeSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{passChangeSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1E3954] mb-1">
                  Kata Sandi Lama / NISN Saat Ini
                </label>
                <input
                  type="text"
                  required
                  value={oldPasswordInput}
                  onChange={(e) => setOldPasswordInput(e.target.value)}
                  placeholder="Masukkan nomor NISN Anda"
                  className="w-full bg-[#FAF3E3]/50 border border-[#B8CCE0] rounded-2xl px-3.5 py-2.5 text-xs text-[#1E3954] focus:outline-none focus:border-[#E49548]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1E3954] mb-1">
                  Kata Sandi Baru (minimal 4 karakter)
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Buat kata sandi baru"
                    className="w-full bg-[#FAF3E3]/50 border border-[#B8CCE0] rounded-2xl px-3.5 pr-10 py-2.5 text-xs text-[#1E3954] focus:outline-none focus:border-[#E49548]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#4E779F] hover:text-[#1E3954]"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1E3954] mb-1">
                  Konfirmasi Kata Sandi Baru
                </label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  placeholder="Ulangi kata sandi baru"
                  className="w-full bg-[#FAF3E3]/50 border border-[#B8CCE0] rounded-2xl px-3.5 py-2.5 text-xs text-[#1E3954] focus:outline-none focus:border-[#E49548]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowChangePasswordModal(false)}
                  className="px-4 py-2 bg-[#FAF3E3] hover:bg-[#F4E6CC] border border-[#B8CCE0] text-[#1E3954] text-xs font-semibold rounded-2xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPassChange}
                  className="px-5 py-2 bg-[#E49548] hover:bg-[#CE7D30] disabled:opacity-50 text-[#1E3954] text-xs font-extrabold rounded-2xl cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  {isSubmittingPassChange ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Kata Sandi</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: DAFTAR AKUN PENDAFTARAN GOOGLE SHEETS / DEMO      */}
      {/* ======================================================== */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 bg-[#1E3954]/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#E49548] rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-xl animate-in zoom-in-95 duration-200 text-[#1E3954]">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#EBF1F6] bg-[#2C4B6B] text-white rounded-t-3xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-2xl bg-[#F4E6CC] border border-[#E49548] text-[#1E3954] flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    Pilih Akun Peserta Terdaftar
                  </h3>
                  <p className="text-xs text-[#DCE9F5]">
                    Daftar akun dari sinkronisasi Google Sheets pendaftaran MMO 2027
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDemoModal(false)}
                className="w-8 h-8 rounded-full bg-[#243E59] hover:bg-[#3B5F84] flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-[#EBF1F6] bg-[#FAF3E3]">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4E779F]" />
                <input
                  type="text"
                  value={demoSearch}
                  onChange={(e) => setDemoSearch(e.target.value)}
                  placeholder="Cari nama peserta, email, sekolah, atau NISN..."
                  className="w-full bg-white border border-[#B8CCE0] rounded-2xl pl-10 pr-3 py-2 text-xs text-[#1E3954] placeholder-slate-400 focus:outline-none focus:border-[#E49548]"
                />
              </div>
            </div>

            {/* List of Accounts */}
            <div className="p-4 overflow-y-auto space-y-2.5 flex-1 divide-y divide-[#EBF1F6]">
              {registeredList
                .filter((acc) => {
                  if (!demoSearch.trim()) return true;
                  const s = demoSearch.toLowerCase();
                  return (
                    acc.fullName.toLowerCase().includes(s) ||
                    acc.school.toLowerCase().includes(s) ||
                    acc.email.toLowerCase().includes(s) ||
                    acc.nisnOrRegNumber.toLowerCase().includes(s) ||
                    acc.category.toLowerCase().includes(s)
                  );
                })
                .map((acc) => (
                  <div
                    key={acc.id}
                    className="pt-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl hover:bg-[#FAF3E3]/50 transition-colors border border-transparent hover:border-[#E49548]/60"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-[#1E3954]">
                          {acc.fullName}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                            acc.category === 'SMP'
                              ? 'bg-[#EBF1F6] text-[#1E3954] border-[#4E779F]'
                              : 'bg-[#FAF3E3] text-[#1E3954] border-[#E49548]'
                          }`}
                        >
                          {acc.category}
                        </span>
                      </div>
                      <div className="text-xs text-[#4E779F]">
                        {acc.school} · {acc.city}
                      </div>
                      <div className="text-[11px] font-mono text-[#4E779F] flex flex-wrap items-center gap-3">
                        <span>Email: <strong className="text-[#1E3954]">{acc.email}</strong></span>
                        <span>Sandi: <strong className="text-[#1E3954]">{acc.password}</strong></span>
                        <span>NISN: {acc.nisnOrRegNumber}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectDemoAccount(acc)}
                      className="px-4 py-2 bg-[#E49548] hover:bg-[#CE7D30] text-[#1E3954] text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-2xs shrink-0"
                    >
                      Gunakan Akun Ini
                    </button>
                  </div>
                ))}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#EBF1F6] bg-[#FAF3E3] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-[#4E779F] rounded-b-3xl">
              <div className="flex items-center gap-3">
                <span>{registeredList.length} akun contoh</span>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => {
                    const empty = clearAllDemoParticipants();
                    setRegisteredList(empty);
                    setIsDemoActive(false);
                    setShowDemoModal(false);
                  }}
                  className="text-rose-600 hover:text-rose-700 font-bold hover:underline cursor-pointer"
                >
                  Hapus Data Demo (Gunakan Data Asli)
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDemoModal(false);
                  onOpenDashboard();
                }}
                className="text-[#2C4B6B] hover:text-[#CE7D30] hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Buka Dashboard Pengawas</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Uji Coba 3 Soal Simulasi di Ruang Tunggu */}
      {showTrialModal && waitingParticipant && (
        <TrialExamModal
          isOpen={showTrialModal}
          onClose={() => setShowTrialModal(false)}
          category={waitingParticipant.category}
          participantName={waitingParticipant.fullName}
          isGateOpen={isGateOpen}
        />
      )}

      {/* Footer Details */}
      <footer className="border-t border-[#E49548]/60 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#DCE9F5] gap-4">
        <div>
          © 2027 Matriks Mathematics Olympiad (MMO) · HMPS Pendidikan Matematika UMM
        </div>
        <div className="flex items-center gap-4">
          <span className="font-bold text-[#F4E6CC]">Explore · Think · Excel</span>
          <span>·</span>
          <span>Universitas Muhammadiyah Malang</span>
        </div>
      </footer>
    </div>
  );
};
