import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Search,
  Monitor,
  Video,
  Send,
  Lock,
  Unlock,
  Radio,
  FileSpreadsheet,
  Eye,
  PlusCircle,
  BookOpen,
  KeyRound,
  LogIn,
  LogOut,
  Sparkles,
  Trash2,
  RotateCcw,
  Filter,
  QrCode,
  Camera,
  CameraOff,
  Maximize2,
  Share2,
  X,
  ExternalLink,
  Award,
  Download,
  Trophy,
  Check,
  Smartphone,
  Copy,
  UploadCloud,
  FileUp,
  ClipboardPaste,
  ShieldOff,
  FileText,
} from 'lucide-react';
import { WordImporter } from './WordImporter';
import { INITIAL_MOCK_PARTICIPANTS } from '../data/mockParticipants';
import { ApiService } from '../services/api';
import { ShareExamLinkModal } from './ShareExamLinkModal';
import {
  LiveParticipantMonitoring,
  OlympiadCategory,
  Question,
  MathDomain,
  CompetitionStage,
  QuestionFocus,
  QuestionType,
  RegisteredParticipant,
} from '../types';
import { MathRenderer } from './MathRenderer';
import { INITIAL_QUESTIONS_DATA } from '../data/questions';
import {
  getRegisteredParticipants,
  getGoogleSheetsUrl,
  saveGoogleSheetsUrl,
  syncParticipantsFromSheets,
  resetParticipantsToDefault,
  saveRegisteredParticipants,
  getLastSyncTime,
  setLastSyncTime,
  clearAllDemoParticipants,
  isDemoModeActive,
  parseSpreadsheetFile,
  parsePastedSpreadsheetText,
  fetchRegisteredParticipantsFromServer,
  getExamGateStatusOnline,
  setExamGateStatusOnline,
} from '../services/registeredParticipants';

interface ProctorDashboardProps {
  onBackToPortal: () => void;
  questions?: Question[];
  onAddQuestion?: (newQuestion: Question) => void;
  onUpdateAllQuestions?: (updated: Question[]) => void;
}

export const ProctorDashboard: React.FC<ProctorDashboardProps> = ({
  onBackToPortal,
  questions: externalQuestions,
  onAddQuestion: externalOnAddQuestion,
  onUpdateAllQuestions: externalOnUpdateAllQuestions,
}) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('mmo_proctor_auth') === 'true';
  });
  const [loginUsername, setLoginUsername] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Active view tab in dashboard: 'monitoring' | 'question_manager' | 'results_recap' | 'registration_sheets'
  const [activeTab, setActiveTab] = useState<'monitoring' | 'question_manager' | 'results_recap' | 'registration_sheets'>('monitoring');

  // Google Sheets Registration Data Sync States
  const [sheetsUrl, setSheetsUrl] = useState<string>(() => getGoogleSheetsUrl());
  const [isSyncingSheets, setIsSyncingSheets] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [registeredList, setRegisteredList] = useState<RegisteredParticipant[]>(() => getRegisteredParticipants());
  const [lastSyncText, setLastSyncText] = useState<string>(() => getLastSyncTime());
  const [isDemoActive, setIsDemoActive] = useState<boolean>(() => isDemoModeActive());
  const [syncMethod, setSyncMethod] = useState<'URL' | 'FILE' | 'PASTE'>('URL');
  const [showPasteModal, setShowPasteModal] = useState<boolean>(false);
  const [pastedText, setPastedText] = useState<string>('');
  const [copiedCredentialId, setCopiedCredentialId] = useState<string | null>(null);
  const [regFilterCategory, setRegFilterCategory] = useState<'ALL' | 'SMP' | 'SMA'>('ALL');
  const [regFilterStage, setRegFilterStage] = useState<'ALL' | CompetitionStage>('ALL');
  const [regSearchQuery, setRegSearchQuery] = useState<string>('');
  const [showAddManualModal, setShowAddManualModal] = useState<boolean>(false);

  // Manual participant form
  const [mName, setMName] = useState<string>('');
  const [mSchool, setMSchool] = useState<string>('');
  const [mEmail, setMEmail] = useState<string>('');
  const [mPassword, setMPassword] = useState<string>('mmo2026');
  const [mNisn, setMNisn] = useState<string>('');
  const [mCity, setMCity] = useState<string>('');
  const [mCategory, setMCategory] = useState<OlympiadCategory>('SMA');
  const [mStage, setMStage] = useState<CompetitionStage>('Penyisihan');

  // Rekap Nilai States
  const [inspectingScoresParticipant, setInspectingScoresParticipant] = useState<LiveParticipantMonitoring | null>(null);
  const [recapCategoryFilter, setRecapCategoryFilter] = useState<'ALL' | 'SMP' | 'SMA'>('ALL');
  const [recapStageFilter, setRecapStageFilter] = useState<'ALL' | CompetitionStage>('ALL');
  const [recapSearchQuery, setRecapSearchQuery] = useState<string>('');

  // Participants list (synced with multi-device server & local storage)
  // Default is EMPTY so no random mock names appear, only real HP examinees
  const [participants, setParticipants] = useState<LiveParticipantMonitoring[]>([]);

  // Master Exam Gate State (Controls whether participants can open the exam or stay in waiting room)
  const [isExamGateOpen, setIsExamGateOpen] = useState<boolean>(false);
  const [isTogglingGate, setIsTogglingGate] = useState<boolean>(false);
  const [gateSource, setGateSource] = useState<'server' | 'cache' | 'local_override'>('server');
  const [examPasscode, setExamPasscode] = useState<string>('MMO2027');

  useEffect(() => {
    let isMounted = true;
    const fetchGate = async () => {
      try {
        const res = await getExamGateStatusOnline();
        if (isMounted) {
          setIsExamGateOpen(res.isOpen);
          if (res.source) setGateSource(res.source);
          if (res.passcode) setExamPasscode(res.passcode);
        }
      } catch (err) {
        console.warn('Failed to load gate status:', err);
      }
    };
    fetchGate();
    const interval = setInterval(fetchGate, 2500);

    const handleGateEvent = () => {
      fetchGate();
    };
    window.addEventListener('mmo_exam_gate_change', handleGateEvent);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('mmo_exam_gate_change', handleGateEvent);
    };
  }, []);

  const handleToggleExamGate = async () => {
    setIsTogglingGate(true);
    const targetStatus = !isExamGateOpen;
    try {
      const res = await setExamGateStatusOnline(targetStatus, examPasscode);
      setIsExamGateOpen(res.isOpen);
      if (res.source) setGateSource(res.source);
      setBroadcastNotice(
        res.isOpen
          ? (res.source === 'server'
              ? '🔓 Akses soal ujian resmi DIBUKA (Vercel Serverless Aktif)! Peserta di Ruang Tunggu otomatis mulai mengerjakan soal.'
              : '🔓 Akses soal ujian resmi DIBUKA (Sinkronisasi Cepat/Lokal)! Peserta di Ruang Tunggu dapat mulai mengerjakan soal.')
          : '🔒 Akses soal ujian resmi DIKUNCI! Peserta yang baru login akan tertahan di Ruang Tunggu.'
      );
      setTimeout(() => setBroadcastNotice(null), 6000);
    } catch (err) {
      console.warn('Error toggling exam gate:', err);
      setIsExamGateOpen(targetStatus);
      setGateSource('local_override');
      setBroadcastNotice(
        targetStatus
          ? '🔓 Akses soal DIBUKA melalui Mode Cadangan Cepat! Gunakan Kode Akses MMO2027 jika ada peserta mengalami kendala.'
          : '🔒 Akses soal ujian resmi DIKUNCI!'
      );
      setTimeout(() => setBroadcastNotice(null), 6000);
    } finally {
      setIsTogglingGate(false);
    }
  };

  // Real-time server polling to synchronize HP phone entries to Laptop proctor
  useEffect(() => {
    let isMounted = true;

    const fetchLiveParticipants = async () => {
      try {
        const live = await ApiService.getParticipants();
        if (isMounted) {
          // Filter out any legacy dummy mock data
          const realExaminees = live.filter(
            (p) => !p.id.startsWith('mmo-p-1') && !p.id.startsWith('mmo-p-2') && !p.id.startsWith('mmo-p-3') && !p.id.startsWith('mmo-p-4') && !p.id.startsWith('mmo-p-5')
          );
          setParticipants(realExaminees);
        }
      } catch (err) {
        console.warn('Sync participants error:', err);
      }
    };

    fetchLiveParticipants();
    const interval = setInterval(fetchLiveParticipants, 2000);

    // Also listen to storage events if running on same device
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'mmo_live_participants' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            const filtered = parsed.filter(
              (p) => !p.id.startsWith('mmo-p-1') && !p.id.startsWith('mmo-p-2') && !p.id.startsWith('mmo-p-3') && !p.id.startsWith('mmo-p-4') && !p.id.startsWith('mmo-p-5')
            );
            setParticipants(filtered);
          }
        } catch (err) {
          console.warn('Error syncing storage:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Synchronize registered participants with server
  useEffect(() => {
    fetchRegisteredParticipantsFromServer().then((data) => {
      setRegisteredList(data.participants);
      setIsDemoActive(data.isDemoActive);
      setLastSyncText(data.lastSyncText);
    });
  }, [activeTab]);

  // Save participants updates to server and localStorage
  const updateParticipants = async (updater: (prev: LiveParticipantMonitoring[]) => LiveParticipantMonitoring[]) => {
    const updated = updater(participants);
    setParticipants(updated);
    try {
      localStorage.setItem('mmo_live_participants', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  };

  // Questions Manager State
  const [questionsList, setQuestionsList] = useState<Question[]>(() => {
    return externalQuestions && externalQuestions.length > 0 ? externalQuestions : INITIAL_QUESTIONS_DATA;
  });

  useEffect(() => {
    if (externalQuestions && externalQuestions.length > 0) {
      setQuestionsList(externalQuestions);
    }
  }, [externalQuestions]);

  // Word Importer Modal State
  const [showWordImporterModal, setShowWordImporterModal] = useState<boolean>(false);
  const [wordImportSuccessNotice, setWordImportSuccessNotice] = useState<string | null>(null);

  const handleQuestionsImportedFromWord = (importedQuestions: Question[], mode: 'append' | 'replace') => {
    let updated: Question[];
    if (mode === 'replace') {
      updated = [...importedQuestions];
    } else {
      const existingIds = new Set(questionsList.map((q) => q.id));
      const filtered = importedQuestions.filter((q) => !existingIds.has(q.id));
      updated = [...filtered, ...questionsList];
    }
    setQuestionsList(updated);
    if (externalOnUpdateAllQuestions) {
      externalOnUpdateAllQuestions(updated);
    }
    try {
      localStorage.setItem('mmo_questions_data', JSON.stringify(updated));
    } catch {
      // ignore
    }
    setWordImportSuccessNotice(
      `Berhasil ${mode === 'replace' ? 'mengganti' : 'menambahkan'} ${importedQuestions.length} butir soal dari dokumen Word ke Bank Soal!`
    );
    setTimeout(() => setWordImportSuccessNotice(null), 5000);
  };

  const [newCategory, setNewCategory] = useState<OlympiadCategory>('SMA');
  const [newStage, setNewStage] = useState<CompetitionStage>('Penyisihan');
  const [newFocus, setNewFocus] = useState<QuestionFocus>('Explore');
  const [newDomain, setNewDomain] = useState<MathDomain>('Aljabar');
  const [newType, setNewType] = useState<QuestionType>('multiple_choice');
  const [newText, setNewText] = useState<string>(
    'Diberikan pola barisan bilangan: $1, 4, 9, 16, 25, \\dots$\nJika seorang peserta mengamati selisih antar dua suku berurutan, selisih suku ke-$10$ dan suku ke-$9$ adalah...'
  );
  const [optA, setOptA] = useState<string>('$17$');
  const [optB, setOptB] = useState<string>('$19$');
  const [optC, setOptC] = useState<string>('$21$');
  const [optD, setOptD] = useState<string>('$23$');
  const [optE, setOptE] = useState<string>('$25$');
  const [newCorrectAnswer, setNewCorrectAnswer] = useState<string>('B');
  const [newExplanation, setNewExplanation] = useState<string>(
    'Pola barisan adalah bilangan kuadrat $n^2$. Selisih $10^2 - 9^2 = 100 - 81 = 19$. Menggunakan identitas $(n+1)^2 - n^2 = 2n + 1 = 2(9) + 1 = 19$.'
  );
  const [questionSavedNotification, setQuestionSavedNotification] = useState<string | null>(null);

  // Question bank view filters
  const [qbCategoryFilter, setQbCategoryFilter] = useState<'ALL' | OlympiadCategory>('ALL');
  const [qbStageFilter, setQbStageFilter] = useState<'ALL' | CompetitionStage>('ALL');
  const [qbSearch, setQbSearch] = useState<string>('');

  // Filters & selection
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | OlympiadCategory>('ALL');
  const [stageFilter, setStageFilter] = useState<'ALL' | CompetitionStage>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'WARNING' | 'SUBMITTED' | 'DISQUALIFIED'>('ALL');
  const [supervisionFilter, setSupervisionFilter] = useState<'ALL' | 'WEB_CAM' | 'ZOOM_2_DEVICE'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'cams'>('table');
  const [selectedParticipant, setSelectedParticipant] = useState<LiveParticipantMonitoring | null>(null);
  const [customWarningText, setCustomWarningText] = useState<string>('');
  const [broadcastNotice, setBroadcastNotice] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [expandedCameraParticipant, setExpandedCameraParticipant] = useState<LiveParticipantMonitoring | null>(null);

  // Zoom 2-Device Settings Modal State
  const [isZoomSettingsModalOpen, setIsZoomSettingsModalOpen] = useState<boolean>(false);
  const [zoomMeetingId, setZoomMeetingId] = useState<string>('827 1928 3741');
  const [zoomPasscode, setZoomPasscode] = useState<string>('MMO2027');
  const [zoomJoinUrl, setZoomJoinUrl] = useState<string>('https://zoom.us/j/82719283741');
  const [zoomCopied, setZoomCopied] = useState<boolean>(false);

  // Live feed messages
  const [activityLogs, setActivityLogs] = useState<{ id: string; time: string; message: string; type: 'warn' | 'info' | 'error' }[]>([
    { id: '1', time: '14:38:42', message: 'Dimas Satrio Utomo terdeteksi beralih tab (Strike 3)', type: 'warn' },
    { id: '2', time: '14:37:10', message: 'Kevin Jonathan Tan menjawab Soal 4 (Kombinatorika)', type: 'info' },
    { id: '3', time: '14:35:55', message: 'Aisyah Putri Wardani mencapai 4 strike - Layar terkunci otomatis', type: 'error' },
    { id: '4', time: '14:34:20', message: 'Muhammad Faris Al-Fatih mengumpulkan lembar jawaban MMO', type: 'info' },
    { id: '5', time: '14:32:04', message: 'Nabila Az-Zahra kembali ke mode layar penuh', type: 'info' },
  ]);

  // Handle Login Form
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginUsername.trim().toLowerCase() === 'alfa' && loginPassword === 'MMO2027sukses') {
      setIsAuthenticated(true);
      sessionStorage.setItem('mmo_proctor_auth', 'true');
      setLoginError(null);
    } else {
      setLoginError('Nama atau kata sandi pengawas keliru. Silakan coba lagi.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('mmo_proctor_auth');
  };

  // Statistics
  const stats = useMemo(() => {
    const total = participants.length;
    const active = participants.filter((p) => p.status === 'ACTIVE' || p.status === 'WARNING').length;
    const submitted = participants.filter((p) => p.status === 'SUBMITTED').length;
    const warnings = participants.filter((p) => p.status === 'WARNING' || p.strikeCount > 0).length;
    const avgTrust = Math.round(
      participants.reduce((acc, p) => acc + p.trustScore, 0) / (total || 1)
    );

    return { total, active, submitted, warnings, avgTrust };
  }, [participants]);

  // Filtered Participants
  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      const matchCat = categoryFilter === 'ALL' || p.category === categoryFilter;
      const matchStage = stageFilter === 'ALL' || (p.stage || 'Penyisihan') === stageFilter;
      const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
      const isZoom = p.supervisionMode === 'ZOOM_2_DEVICE' || p.cameraStatus === 'ZOOM';
      const matchSupervision =
        supervisionFilter === 'ALL' ||
        (supervisionFilter === 'ZOOM_2_DEVICE' && isZoom) ||
        (supervisionFilter === 'WEB_CAM' && !isZoom);
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.school.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchStage && matchStatus && matchSupervision && matchSearch;
    });
  }, [participants, categoryFilter, stageFilter, statusFilter, supervisionFilter, searchQuery]);

  // Send warning to participant
  const handleSendWarning = async (participantId: string) => {
    const message = customWarningText.trim() || 'Peringatan Pengawas: Harap tetap fokus pada layar ujian MMO!';
    
    // Send to server so participant's HP receives the notification
    await ApiService.sendWarning(participantId, message);

    const target = participants.find((p) => p.id === participantId);
    const newStrike = (target?.strikeCount || 0) + 1;
    const newStatus = newStrike >= 3 ? 'DISQUALIFIED' : 'WARNING';
    const newTrust = Math.max(10, (target?.trustScore || 100) - 10);

    await ApiService.updateParticipantProgress(participantId, {
      strikeCount: newStrike,
      status: newStatus,
      trustScore: newTrust,
    });

    updateParticipants((prev) =>
      prev.map((p) =>
        p.id === participantId
          ? {
              ...p,
              strikeCount: newStrike,
              status: newStatus,
              trustScore: newTrust,
            }
          : p
      )
    );

    setActivityLogs((prev) => [
      {
        id: String(Date.now()),
        time: new Date().toLocaleTimeString('id-ID'),
        message: `Pengawas mengirim teguran ke ${target?.name}: "${message}"`,
        type: 'warn',
      },
      ...prev,
    ]);

    setBroadcastNotice(`Teguran berhasil dikirimkan ke layar ${target?.name}`);
    setCustomWarningText('');
    setTimeout(() => setBroadcastNotice(null), 4000);
  };

  // Toggle Lock
  const handleToggleLock = async (participantId: string) => {
    const target = participants.find((p) => p.id === participantId);
    const isCurrentlyDisqualified = target?.status === 'DISQUALIFIED';
    const newStatus = isCurrentlyDisqualified ? 'ACTIVE' : 'DISQUALIFIED';
    const newStrikes = isCurrentlyDisqualified ? 0 : 4;

    await ApiService.updateParticipantProgress(participantId, {
      status: newStatus,
      strikeCount: newStrikes,
    });

    updateParticipants((prev) =>
      prev.map((p) => {
        if (p.id === participantId) {
          return {
            ...p,
            status: newStatus,
            strikeCount: newStrikes,
          };
        }
        return p;
      })
    );
  };

  // Delete single participant
  const handleDeleteParticipant = async (id: string, name: string) => {
    if (window.confirm(`Hapus data peserta "${name}" dari pemantauan ujian?`)) {
      await ApiService.deleteParticipant(id);
      setParticipants((prev) => prev.filter((p) => p.id !== id));
      if (selectedParticipant?.id === id) {
        setSelectedParticipant(null);
      }
    }
  };

  // Clear all participants
  const handleClearAllParticipants = async () => {
    if (window.confirm('Apakah Anda yakin ingin mengosongkan semua data peserta di dasbor pengawas? Data yang dihapus tidak dapat dipulihkan.')) {
      await ApiService.clearAllParticipants();
      setParticipants([]);
      setSelectedParticipant(null);
    }
  };

  // Export CSV Rapi dengan UTF-8 BOM
  const handleExportCSV = () => {
    const timestamp = new Date().toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    // Clean comma-separated headers
    const headers = [
      'ID Peserta',
      'No Peserta / NISN',
      'Nama Peserta',
      'Asal Sekolah',
      'Kota / Domisili',
      'Email Pendaftaran',
      'Kategori',
      'Progres Pengerjaan',
      'Akumulasi Strike',
      'Skor Integritas (%)',
      'Status Ujian',
      'Waktu Ekspor',
    ].join(';');

    const rows = filteredParticipants.map((p) => {
      const sanitizedName = p.name.replace(/;/g, ' ');
      const sanitizedSchool = p.school.replace(/;/g, ' ');
      return [
        `"${p.id}"`,
        `"${p.nisnOrRegNumber || '-'}"`,
        `"${sanitizedName}"`,
        `"${sanitizedSchool}"`,
        `"${p.city || '-'}"`,
        `"${p.email || '-'}"`,
        `"${p.category}"`,
        `"${p.answeredCount}/${p.totalQuestions}"`,
        p.strikeCount,
        `${p.trustScore}%`,
        `"${p.status}"`,
        `"${timestamp}"`,
      ].join(';');
    });

    const csvContent = '\uFEFF' + headers + '\n' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `MMO2027_Data_Peserta_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Official Excel Grade Recap Export (.csv with UTF-8 BOM and explicit sep=;)
  const handleExportExcelGrades = () => {
    const sorted = [...participants].sort((a, b) => {
      const scoreA = a.score ?? -999;
      const scoreB = b.score ?? -999;
      return scoreB - scoreA;
    });

    const maxQuestions = Math.max(
      ...sorted.map((p) => p.totalQuestions || 0),
      questionsList.length || 10
    );

    const questionHeaders: string[] = [];
    for (let i = 1; i <= maxQuestions; i++) {
      questionHeaders.push(`Soal ${i} (Jwb / Kunci / Skor)`);
    }

    const headers = [
      'Peringkat',
      'No Peserta / NISN',
      'Nama Peserta',
      'Asal Sekolah',
      'Kota / Domisili',
      'Email Pendaftaran',
      'Kategori',
      'Skor Akhir',
      'Benar (+4)',
      'Salah (-1)',
      'Kosong (0)',
      'Waktu Pengerjaan',
      'Waktu Pengumpulan',
      'Status Pengerjaan',
      ...questionHeaders,
    ].join(';');

    const rows = sorted.map((p, index) => {
      const sanitizedName = (p.name || '').replace(/;/g, ' ');
      const sanitizedSchool = (p.school || '').replace(/;/g, ' ');
      const rank = index + 1;
      const finalScore = p.score !== undefined ? p.score : 0;
      const correct = p.correctCount ?? 0;
      const wrong = p.wrongCount ?? 0;
      const blank = p.blankCount ?? Math.max(0, (p.totalQuestions || 0) - correct - wrong);
      const duration = p.durationTaken || '-';
      const submittedTime = p.submittedAtTime || p.lastActive || '-';
      const statusText = p.status === 'SUBMITTED' ? 'Selesai Dikumpulkan' : p.status;

      const qCols: string[] = [];
      const relevantQuestions = questionsList.filter((q) => q.category === p.category);

      for (let i = 1; i <= maxQuestions; i++) {
        const qItem = relevantQuestions[i - 1];
        if (qItem && p.perQuestionScores && p.perQuestionScores[qItem.id]) {
          const res = p.perQuestionScores[qItem.id];
          const scoreSign = res.score > 0 ? `+${res.score}` : `${res.score}`;
          qCols.push(`"${res.userAnswer} (Kunci: ${res.correctAnswer} | ${scoreSign})"`);
        } else if (qItem) {
          qCols.push(`"-"`);
        } else {
          qCols.push(`""`);
        }
      }

      return [
        rank,
        `"${p.nisnOrRegNumber || p.id || '-'}"`,
        `"${sanitizedName}"`,
        `"${sanitizedSchool}"`,
        `"${p.city || '-'}"`,
        `"${p.email || '-'}"`,
        `"${p.category}"`,
        finalScore,
        correct,
        wrong,
        blank,
        `"${duration}"`,
        `"${submittedTime}"`,
        `"${statusText}"`,
        ...qCols,
      ].join(';');
    });

    const csvContent = '\uFEFFsep=;\r\n' + headers + '\r\n' + rows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `MMO2027_Rekap_Nilai_Resmi_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Google Sheets Registration Data Handlers
  const handleSyncSheets = async () => {
    if (!sheetsUrl.trim()) {
      setSyncFeedback({
        type: 'error',
        message: 'Mohon masukkan tautan Google Spreadsheet pendaftaran terlebih dahulu.',
      });
      return;
    }
    setIsSyncingSheets(true);
    setSyncFeedback(null);
    try {
      const res = await syncParticipantsFromSheets(sheetsUrl);
      if (res.success) {
        setRegisteredList(res.participants);
        setIsDemoActive(false);
        setLastSyncText(getLastSyncTime());
        setSyncFeedback({
          type: 'success',
          message: res.message,
        });
      } else {
        setSyncFeedback({
          type: 'error',
          message: res.message,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSyncFeedback({
        type: 'error',
        message: msg || 'Gagal menyinkronkan data pendaftaran.',
      });
    } finally {
      setIsSyncingSheets(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSyncingSheets(true);
    setSyncFeedback(null);
    try {
      const participants = await parseSpreadsheetFile(file);
      saveRegisteredParticipants(participants);
      setRegisteredList(participants);
      setIsDemoActive(false);
      const timeStr = `File diunggah: ${file.name}`;
      setLastSyncTime(timeStr);
      setLastSyncText(timeStr);
      setSyncFeedback({
        type: 'success',
        message: `Berhasil mengimpor ${participants.length} data peserta dari berkas "${file.name}"! Akun sekarang langsung dapat login.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSyncFeedback({
        type: 'error',
        message: `Gagal membaca file: ${msg}`,
      });
    } finally {
      setIsSyncingSheets(false);
      if (e.target) e.target.value = '';
    }
  };

  const handlePasteImportSubmit = () => {
    if (!pastedText.trim()) return;
    try {
      const parsed = parsePastedSpreadsheetText(pastedText);
      if (parsed.length === 0) {
        alert('Tidak ditemukan baris data peserta dengan kolom email yang valid.');
        return;
      }
      saveRegisteredParticipants(parsed);
      setRegisteredList(parsed);
      setIsDemoActive(false);
      const timeStr = 'Ditempel langsung dari tabel';
      setLastSyncTime(timeStr);
      setLastSyncText(timeStr);
      setShowPasteModal(false);
      setPastedText('');
      setSyncFeedback({
        type: 'success',
        message: `Berhasil mengimpor ${parsed.length} akun peserta dari teks tabel!`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Gagal mengimpor: ${msg}`);
    }
  };

  const handleClearAllDemo = () => {
    if (window.confirm('Bersihkan semua akun demo dan aktifkan Mode Data Asli? Semua akun contoh bawaan akan dihapus sehingga hanya pendaftar real yang dapat masuk.')) {
      const empty = clearAllDemoParticipants();
      setRegisteredList(empty);
      setIsDemoActive(false);
      setLastSyncText(getLastSyncTime());
      setSyncFeedback({
        type: 'success',
        message: 'Mode Data Asli aktif! Seluruh akun demo telah dibersihkan. Silakan sinkronkan spreadsheet atau upload berkas Excel pendaftaran Anda.',
      });
    }
  };

  const handleResetToDefault = () => {
    if (window.confirm('Muat ulang daftar akun contoh (Demo) bawaan?')) {
      const def = resetParticipantsToDefault();
      setRegisteredList(def);
      setIsDemoActive(true);
      setLastSyncText(getLastSyncTime());
      setSyncFeedback({
        type: 'success',
        message: 'Daftar akun peserta contoh (Demo) berhasil dimuat kembali.',
      });
    }
  };

  const handleCopyCredential = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCredentialId(id);
    setTimeout(() => setCopiedCredentialId(null), 2000);
  };

  const handleAddManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mName.trim() || !mSchool.trim() || !mEmail.trim() || !mPassword.trim()) {
      alert('Nama, asal sekolah, email, dan kata sandi wajib diisi.');
      return;
    }

    const newParticipant: RegisteredParticipant = {
      id: `MMO27-${mCategory}-${Math.floor(100 + Math.random() * 900)}`,
      fullName: mName.trim(),
      school: mSchool.trim(),
      email: mEmail.trim().toLowerCase(),
      password: mPassword.trim(),
      nisnOrRegNumber: mNisn.trim() || `00${Math.floor(10000000 + Math.random() * 90000000)}`,
      city: mCity.trim() || 'Indonesia',
      category: mCategory,
      stage: mStage,
      registeredAt: new Date().toISOString(),
    };

    const updated = [newParticipant, ...registeredList];
    saveRegisteredParticipants(updated);
    setRegisteredList(updated);
    setShowAddManualModal(false);
    setMName('');
    setMSchool('');
    setMEmail('');
    setMPassword('mmo2026');
    setMNisn('');
    setMCity('');
    setSyncFeedback({
      type: 'success',
      message: `Peserta ${newParticipant.fullName} berhasil ditambahkan! Akun langsung dapat digunakan login.`,
    });
  };

  // Filter and sort participants for Rekap Nilai Tab
  const recapParticipants = useMemo(() => {
    let list = [...participants];
    if (recapCategoryFilter !== 'ALL') {
      list = list.filter((p) => p.category === recapCategoryFilter);
    }
    if (recapStageFilter !== 'ALL') {
      list = list.filter((p) => (p.stage || 'Penyisihan') === recapStageFilter);
    }
    if (recapSearchQuery.trim()) {
      const q = recapSearchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.school.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => {
      const scoreA = a.score ?? -999;
      const scoreB = b.score ?? -999;
      return scoreB - scoreA;
    });
  }, [participants, recapCategoryFilter, recapStageFilter, recapSearchQuery]);

  const submittedParticipants = useMemo(() => {
    return participants.filter((p) => p.status === 'SUBMITTED' || p.score !== undefined);
  }, [participants]);

  const avgScore = useMemo(() => {
    if (submittedParticipants.length === 0) return 0;
    const sum = submittedParticipants.reduce((acc, p) => acc + (p.score ?? 0), 0);
    return Math.round((sum / submittedParticipants.length) * 10) / 10;
  }, [submittedParticipants]);

  const topParticipant = useMemo(() => {
    if (submittedParticipants.length === 0) return null;
    return [...submittedParticipants].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
  }, [submittedParticipants]);

  // Add Question Handler
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) {
      alert('Mohon lengkapi teks soal.');
      return;
    }

    if (newType === 'multiple_choice' && (!optA.trim() || !optB.trim() || !optC.trim() || !optD.trim())) {
      alert('Untuk soal pilihan ganda, mohon lengkapi pilihan A, B, C, dan D.');
      return;
    }

    const newQ: Question = {
      id: `mmo-custom-${Date.now()}`,
      category: newCategory,
      stage: newStage,
      focus: newFocus,
      domain: newDomain,
      type: newType,
      questionNumber: questionsList.length + 1,
      text: newText.trim(),
      options:
        newType === 'multiple_choice'
          ? [
              { id: 'A', text: optA.trim() },
              { id: 'B', text: optB.trim() },
              { id: 'C', text: optC.trim() },
              { id: 'D', text: optD.trim() },
              ...(optE.trim() ? [{ id: 'E', text: optE.trim() }] : []),
            ]
          : [],
      correctAnswer: newCorrectAnswer.trim(),
      explanation: newExplanation.trim(),
      points: newType === 'short_answer' ? { correct: 10, wrong: 0, blank: 0 } : { correct: 4, wrong: -1, blank: 0 },
    };

    const updated = [newQ, ...questionsList];
    setQuestionsList(updated);

    // Sync to server so any mobile device gets the updated question bank
    await ApiService.addQuestion(newQ);

    try {
      localStorage.setItem('mmo_bank_soal', JSON.stringify(updated));
    } catch (err) {
      console.warn('Could not save to localStorage:', err);
    }

    if (externalOnAddQuestion) {
      externalOnAddQuestion(newQ);
    }
    if (externalOnUpdateAllQuestions) {
      externalOnUpdateAllQuestions(updated);
    }

    setQuestionSavedNotification(`Soal berhasil ditambahkan ke Bank Soal ${newCategory} (${newStage})!`);
    setTimeout(() => setQuestionSavedNotification(null), 4000);
  };

  const handleDeleteQuestion = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus butir soal ini dari bank soal?')) {
      const updated = questionsList.filter((q) => q.id !== id);
      setQuestionsList(updated);
      await ApiService.deleteQuestion(id);
      try {
        localStorage.setItem('mmo_bank_soal', JSON.stringify(updated));
      } catch (err) {
        console.warn('Could not update localStorage:', err);
      }
      if (externalOnUpdateAllQuestions) {
        externalOnUpdateAllQuestions(updated);
      }
      setQuestionSavedNotification('Butir soal berhasil dihapus dari bank soal.');
      setTimeout(() => setQuestionSavedNotification(null), 3000);
    }
  };

  const handleResetQuestions = async () => {
    if (window.confirm('Kembalikan bank soal ke daftar butir soal standar resmi MMO 2027?')) {
      setQuestionsList(INITIAL_QUESTIONS_DATA);
      await ApiService.resetQuestions();
      try {
        localStorage.setItem('mmo_bank_soal', JSON.stringify(INITIAL_QUESTIONS_DATA));
      } catch (err) {
        console.warn('Could not reset localStorage:', err);
      }
      if (externalOnUpdateAllQuestions) {
        externalOnUpdateAllQuestions(INITIAL_QUESTIONS_DATA);
      }
      setQuestionSavedNotification('Bank soal berhasil direset ke standar resmi MMO 2027.');
      setTimeout(() => setQuestionSavedNotification(null), 3000);
    }
  };

  // ========================================================
  // RENDER LOGIN GATE IF NOT AUTHENTICATED
  // ========================================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-white text-zinc-900">
        <div className="w-full max-w-md bg-[#fafafa] border border-[#D5D5D5] rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#646464] text-white flex items-center justify-center mx-auto mb-4 shadow-xs">
            <KeyRound className="w-7 h-7 text-white" />
          </div>

          <div className="text-center mb-6">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#646464] block mb-1">
              Portal Panitia MMO 2027
            </span>
            <h2 className="text-xl font-bold text-zinc-900">
              Autentikasi Pengawas Ujian
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Masukkan kredensial pengawas resmi HMPS Pendidikan Matematika UMM.
            </p>
          </div>

          {loginError && (
            <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-2xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-800 mb-1">
                Nama Pengawas
              </label>
              <input
                type="text"
                required
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="Masukkan username (Default: alfa)"
                className="w-full bg-white border border-[#D5D5D5] rounded-2xl px-3.5 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#646464] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-800 mb-1">
                Kata Sandi
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Masukkan password (Default: MMO2027sukses)"
                className="w-full bg-white border border-[#D5D5D5] rounded-2xl px-3.5 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#646464] font-mono transition-colors"
              />
            </div>

            <div className="bg-[#f7f7f8] border border-[#D5D5D5] p-3 rounded-2xl text-[11px] text-zinc-600 space-y-0.5">
              <div>Kredensial Pengawas:</div>
              <div className="font-mono text-zinc-800">Nama: <strong>alfa</strong> · Sandi: <strong>MMO2027sukses</strong></div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#646464] hover:bg-[#525252] text-white font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs mt-2"
            >
              <LogIn className="w-4 h-4" />
              Masuk ke Dasbor Pengawas
            </button>

            <button
              type="button"
              onClick={onBackToPortal}
              className="w-full py-2.5 text-xs text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer text-center"
            >
              Kembali ke Beranda Ujian
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ========================================================
  // RENDER AUTHENTICATED PROCTOR DASHBOARD
  // ========================================================
  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8 bg-white text-zinc-900">
      {/* Header Bar with #646464 and #D5D5D5 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#D5D5D5]">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#646464]">
              Live Monitoring & Bank Soal · MMO 2027 UMM
            </span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight mt-1">
            Dasbor Pengawas Panitia (MMO 2027)
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            HMPS Pendidikan Matematika UMM Bidang Keilmuan · Login sebagai: <strong className="text-zinc-800">alfa</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Tab Switcher */}
          <div className="flex items-center bg-[#f7f7f8] border border-[#D5D5D5] p-1 rounded-2xl text-xs">
            <button
              onClick={() => setActiveTab('monitoring')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
                activeTab === 'monitoring'
                  ? 'bg-[#646464] text-white shadow-xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Monitoring Peserta
            </button>
            <button
              onClick={() => setActiveTab('results_recap')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'results_recap'
                  ? 'bg-[#646464] text-white shadow-xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              Rekap & Peringkat Nilai
            </button>
            <button
              onClick={() => setActiveTab('question_manager')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'question_manager'
                  ? 'bg-[#646464] text-white shadow-xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Kelola Bank Soal
            </button>
            <button
              onClick={() => setActiveTab('registration_sheets')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'registration_sheets'
                  ? 'bg-[#646464] text-white shadow-xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Data Pendaftaran ({registeredList.length})
            </button>
          </div>

          <button
            onClick={() => setIsZoomSettingsModalOpen(true)}
            className="px-3.5 py-2 rounded-2xl bg-sky-700 hover:bg-sky-800 border border-sky-600 text-xs font-semibold text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Kelola Ruang Zoom Pengawas dan Pengawasan 2 Perangkat"
          >
            <Video className="w-4 h-4 text-white" />
            <span>Info Zoom (2 Divais)</span>
          </button>

          <button
            onClick={() => setIsShareModalOpen(true)}
            className="px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 border border-emerald-600 text-xs font-semibold text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Buka QR Code dan Link untuk dibagikan ke HP peserta"
          >
            <QrCode className="w-4 h-4 text-white" />
            <span>Bagikan Link Peserta</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-2xl bg-[#f7f7f8] hover:bg-[#D5D5D5]/40 border border-[#D5D5D5] text-xs font-semibold text-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Unduh berkas CSV rapi"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#646464]" />
            Ekspor CSV Rapi
          </button>

          {participants.length > 0 && (
            <button
              onClick={handleClearAllParticipants}
              className="px-3 py-2 rounded-2xl bg-white hover:bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Kosongkan data semua peserta"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">Kosongkan Peserta</span>
            </button>
          )}

          <button
            onClick={handleLogout}
            className="p-2 rounded-2xl bg-white hover:bg-rose-50 border border-[#D5D5D5] text-zinc-600 hover:text-rose-600 transition-colors cursor-pointer"
            title="Keluar dari sesi pengawas"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Master Exam Gate Control Banner (Panitia switch to unlock exam questions for examinees) */}
      <div
        className={`p-4 sm:p-5 rounded-3xl border transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          isExamGateOpen
            ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
            : 'bg-amber-50/90 border-amber-300 text-amber-950'
        }`}
      >
        <div className="flex items-start sm:items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xs ${
              isExamGateOpen ? 'bg-emerald-600' : 'bg-amber-600'
            }`}
          >
            {isExamGateOpen ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg border ${
                  isExamGateOpen
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}
              >
                {isExamGateOpen ? '● Akses Soal: DIBUKA' : '● Akses Soal: TERKUNCI (Ruang Tunggu)'}
              </span>
              <span className="text-[10px] text-zinc-600 bg-white/80 border border-[#D5D5D5] px-2 py-0.5 rounded-lg font-mono">
                {gateSource === 'server' ? '🌐 Vercel Serverless Sync' : '⚡ Local Resilient Cache'}
              </span>
              <span className="text-[10px] text-zinc-600 bg-white/80 border border-[#D5D5D5] px-2 py-0.5 rounded-lg flex items-center gap-1 font-mono">
                <span>Kode Darurat:</span>
                <strong className="text-zinc-900">{examPasscode}</strong>
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-zinc-900 mt-1">
              {isExamGateOpen
                ? 'Ujian Sedang Berlangsung — Akses Soal Terbuka'
                : 'Peserta Tertahan di Ruang Tunggu Ujian'}
            </h3>
            <p className="text-xs text-zinc-600 mt-0.5">
              {isExamGateOpen
                ? 'Semua peserta yang login langsung dapat membaca dan menjawab butir soal MMO 2027.'
                : 'Peserta yang telah login di HP atau laptop berada di Ruang Tunggu Ujian dan belum dapat melihat butir soal sampai tombol di samping diaktifkan.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 self-start md:self-center">
          <button
            type="button"
            onClick={handleToggleExamGate}
            disabled={isTogglingGate}
            className={`px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm text-white transition-all cursor-pointer shadow-sm flex items-center gap-2 ${
              isExamGateOpen
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {isTogglingGate ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                <span>Menghubungi Server...</span>
              </>
            ) : isExamGateOpen ? (
              <>
                <Lock className="w-4 h-4" />
                <span>Kunci Akses Soal (Tutup Ujian)</span>
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                <span>Buka Akses Soal Ujian Sekarang</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Broadcast Alert Banner if sent */}
      {broadcastNotice && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs p-3 rounded-2xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{broadcastNotice}</span>
        </div>
      )}

      {questionSavedNotification && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs p-3 rounded-2xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{questionSavedNotification}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: MONITORING PESERTA REAL-TIME                     */}
      {/* ======================================================== */}
      {activeTab === 'monitoring' && (
        <div className="space-y-6">
          {/* Real-time KPI Metric Tiles with curved borders */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
            <div className="bg-[#fafafa] border border-[#D5D5D5] p-4 rounded-3xl shadow-xs">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-medium">Total Peserta</span>
                <Users className="w-4 h-4 text-[#646464]" />
              </div>
              <div className="text-2xl font-mono font-bold text-zinc-900 tabular-nums">{stats.total}</div>
              <span className="text-[11px] text-zinc-500 mt-1 block">SMP & SMA Sederajat</span>
            </div>

            <div className="bg-[#fafafa] border border-[#D5D5D5] p-4 rounded-3xl shadow-xs">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-medium">Sedang Ujian</span>
                <Radio className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-mono font-bold text-emerald-700 tabular-nums">{stats.active}</div>
              <span className="text-[11px] text-zinc-500 mt-1 block">Terkoneksi ke sistem</span>
            </div>

            <div className="bg-[#fafafa] border border-[#D5D5D5] p-4 rounded-3xl shadow-xs">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-medium">Sudah Selesai</span>
                <CheckCircle2 className="w-4 h-4 text-[#646464]" />
              </div>
              <div className="text-2xl font-mono font-bold text-zinc-900 tabular-nums">{stats.submitted}</div>
              <span className="text-[11px] text-zinc-500 mt-1 block">Jawaban terkirim</span>
            </div>

            <div className="bg-[#fafafa] border border-[#D5D5D5] p-4 rounded-3xl shadow-xs">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-medium">Pelanggaran</span>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-mono font-bold text-amber-700 tabular-nums">{stats.warnings}</div>
              <span className="text-[11px] text-zinc-500 mt-1 block">Alih tab / anomali</span>
            </div>

            <div className="bg-[#fafafa] border border-[#D5D5D5] p-4 rounded-3xl shadow-xs">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-xs font-medium">Rata-rata Integritas</span>
                <ShieldAlert className="w-4 h-4 text-[#646464]" />
              </div>
              <div className="text-2xl font-mono font-bold text-zinc-900 tabular-nums">{stats.avgTrust}%</div>
              <span className="text-[11px] text-zinc-500 mt-1 block">Skor Proktor AI</span>
            </div>
          </div>

          {/* Main Workspace Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Live Participants Table or Video Wall */}
            <div className="lg:col-span-8 space-y-4">
              {/* Controls Bar */}
              <div className="bg-[#fafafa] border border-[#D5D5D5] p-3.5 rounded-3xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Cari nama peserta, sekolah, nomor ujian..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none w-full"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Category Filter (Jenjang SMP / SMA) */}
                  <div className="flex items-center bg-white border border-[#D5D5D5] p-0.5 rounded-2xl text-xs shadow-2xs">
                    {(['ALL', 'SMP', 'SMA'] as const).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-3 py-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                          categoryFilter === cat
                            ? 'bg-[#53585E] text-white shadow-xs'
                            : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                        }`}
                      >
                        {cat === 'ALL' ? 'Semua Jenjang' : cat}
                      </button>
                    ))}
                  </div>

                  {/* Stage Filter (Babak Penyisihan / Semifinal) */}
                  <div className="flex items-center bg-white border border-[#D5D5D5] p-0.5 rounded-2xl text-xs shadow-2xs">
                    {(['ALL', 'Penyisihan', 'Semifinal'] as const).map((stg) => (
                      <button
                        key={stg}
                        onClick={() => setStageFilter(stg)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                          stageFilter === stg
                            ? 'bg-[#53585E] text-white shadow-xs'
                            : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                        }`}
                      >
                        {stg === 'ALL' ? 'Semua Babak' : stg}
                      </button>
                    ))}
                  </div>

                  {/* Supervision Mode Filter (Zoom 2 Divais vs Webcam) */}
                  <div className="flex items-center bg-[#f7f7f8] border border-[#D5D5D5] p-0.5 rounded-2xl text-xs">
                    <button
                      onClick={() => setSupervisionFilter('ALL')}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-medium transition-colors cursor-pointer ${
                        supervisionFilter === 'ALL' ? 'bg-[#53585E] text-white font-semibold shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                      title="Semua metode pengawasan"
                    >
                      Semua
                    </button>
                    <button
                      onClick={() => setSupervisionFilter('ZOOM_2_DEVICE')}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                        supervisionFilter === 'ZOOM_2_DEVICE' ? 'bg-sky-700 text-white font-semibold shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                      title="Hanya peserta pengawasan Zoom (2 Divais)"
                    >
                      <Video className="w-3 h-3" />
                      <span>Zoom (2 Divais)</span>
                    </button>
                    <button
                      onClick={() => setSupervisionFilter('WEB_CAM')}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                        supervisionFilter === 'WEB_CAM' ? 'bg-[#646464] text-white font-semibold shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                      title="Hanya peserta kamera web langsung"
                    >
                      <Camera className="w-3 h-3" />
                      <span>Webcam</span>
                    </button>
                  </div>

                  {/* View Mode Switcher */}
                  <div className="flex items-center bg-[#f7f7f8] border border-[#D5D5D5] p-0.5 rounded-2xl text-xs">
                    <button
                      onClick={() => setViewMode('table')}
                      className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                        viewMode === 'table' ? 'bg-[#646464] text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                      title="Tampilan Tabel"
                    >
                      <Monitor className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setViewMode('cams')}
                      className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                        viewMode === 'cams' ? 'bg-[#646464] text-white shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                      title="Matriks Kamera Pengawas"
                    >
                      <Video className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* View Mode 1: Table */}
              {viewMode === 'table' ? (
                <div className="bg-white border border-[#D5D5D5] rounded-3xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#f7f7f8] text-zinc-600 uppercase tracking-wider text-[10px] border-b border-[#D5D5D5]">
                        <tr>
                          <th className="py-3.5 px-4">Peserta & Kamera</th>
                          <th className="py-3.5 px-3">Kategori</th>
                          <th className="py-3.5 px-3">Progres Soal</th>
                          <th className="py-3.5 px-3">Strikes</th>
                          <th className="py-3.5 px-3">Integritas</th>
                          <th className="py-3.5 px-3">Status</th>
                          <th className="py-3.5 px-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#D5D5D5]/60">
                        {filteredParticipants.map((p) => {
                          const isDisq = p.status === 'DISQUALIFIED';
                          const isWarn = p.status === 'WARNING';
                          const isDone = p.status === 'SUBMITTED';

                          return (
                            <tr
                              key={p.id}
                              onClick={() => setSelectedParticipant(p)}
                              className={`hover:bg-zinc-50 transition-colors cursor-pointer ${
                                selectedParticipant?.id === p.id ? 'bg-[#D5D5D5]/25' : ''
                              }`}
                            >
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-3">
                                  <div
                                    onClick={(e) => {
                                      if (p.cameraSnapshot) {
                                        e.stopPropagation();
                                        setExpandedCameraParticipant(p);
                                      }
                                    }}
                                    className={`relative w-11 h-11 rounded-2xl overflow-hidden shrink-0 border transition-all ${
                                      p.cameraSnapshot
                                        ? 'border-emerald-500 shadow-2xs hover:scale-105 cursor-pointer ring-1 ring-emerald-400/40 bg-zinc-950'
                                        : p.supervisionMode === 'ZOOM_2_DEVICE' || p.cameraStatus === 'ZOOM'
                                        ? 'border-sky-500 bg-sky-950 flex items-center justify-center text-white'
                                        : 'border-zinc-200 bg-zinc-100 flex items-center justify-center'
                                    }`}
                                    title={
                                      p.cameraSnapshot
                                        ? 'Klik untuk memperbesar siaran pengawas'
                                        : p.supervisionMode === 'ZOOM_2_DEVICE' || p.cameraStatus === 'ZOOM'
                                        ? 'Pengawasan melalui Zoom (Divais 2)'
                                        : 'Kamera belum aktif'
                                    }
                                  >
                                    {p.cameraSnapshot ? (
                                      <>
                                        <img
                                          src={p.cameraSnapshot}
                                          alt={p.name}
                                          className="w-full h-full object-cover"
                                        />
                                        <span
                                          className={`absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full ring-1 ring-white ${
                                            p.supervisionMode === 'ZOOM_2_DEVICE' || p.cameraStatus === 'ZOOM'
                                              ? 'bg-sky-400 animate-pulse'
                                              : 'bg-emerald-500 animate-pulse'
                                          }`}
                                        />
                                      </>
                                    ) : p.supervisionMode === 'ZOOM_2_DEVICE' || p.cameraStatus === 'ZOOM' ? (
                                      <div className="flex flex-col items-center justify-center text-sky-400">
                                        <Video className="w-4 h-4" />
                                        <span className="text-[7px] font-bold font-mono">ZOOM</span>
                                      </div>
                                    ) : (
                                      <Camera className="w-4 h-4 text-zinc-400" />
                                    )}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-zinc-900 flex items-center gap-1.5 flex-wrap">
                                      <span>{p.name}</span>
                                      {p.aiIncidentReport || p.strikeCount > 3 ? (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300 font-mono font-bold flex items-center gap-1 animate-pulse" title="Pelanggaran melebihi 3 kali - Laporan AI diterbitkan">
                                          <ShieldAlert className="w-2.5 h-2.5 text-rose-600" /> LAPORAN AI ({p.strikeCount})
                                        </span>
                                      ) : null}
                                      {p.supervisionMode === 'ZOOM_2_DEVICE' || p.cameraStatus === 'ZOOM' ? (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200 font-mono font-bold flex items-center gap-1">
                                          <Video className="w-2.5 h-2.5" /> ZOOM (2 DIVAIS)
                                        </span>
                                      ) : p.cameraSnapshot ? (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-bold flex items-center gap-1">
                                          <Camera className="w-2.5 h-2.5" /> WEBCAM
                                        </span>
                                      ) : null}
                                    </div>
                                    <div className="text-[11px] text-zinc-500">{p.school}</div>
                                    <div className="text-[10px] font-mono text-zinc-400">{p.id}</div>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3.5 px-3">
                                <div className="flex flex-col gap-1 items-start">
                                  <span className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                                    p.category === 'SMP'
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  }`}>
                                    {p.category}
                                  </span>
                                  <span className="text-[10px] font-semibold text-[#53585E] bg-[#83B9DF]/20 px-1.5 py-0.5 rounded-md border border-[#83B9DF]/40">
                                    {p.stage || 'Penyisihan'}
                                  </span>
                                </div>
                              </td>

                              <td className="py-3.5 px-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-zinc-900">
                                    {p.answeredCount}/{p.totalQuestions}
                                  </span>
                                </div>
                                <div className="w-16 h-1 bg-zinc-200 rounded-full overflow-hidden mt-1">
                                  <div
                                    className="h-full bg-[#646464] rounded-full"
                                    style={{ width: `${(p.answeredCount / p.totalQuestions) * 100}%` }}
                                  />
                                </div>
                              </td>

                              <td className="py-3.5 px-3">
                                <span
                                  className={`font-mono font-bold ${
                                    p.strikeCount > 0 ? 'text-rose-600' : 'text-zinc-500'
                                  }`}
                                >
                                  {p.strikeCount}
                                </span>
                              </td>

                              <td className="py-3.5 px-3">
                                <span
                                  className={`font-mono font-bold ${
                                    p.trustScore > 85
                                      ? 'text-emerald-700'
                                      : p.trustScore > 60
                                      ? 'text-amber-700'
                                      : 'text-rose-700'
                                  }`}
                                >
                                  {p.trustScore}%
                                </span>
                              </td>

                              <td className="py-3.5 px-3">
                                {isDone ? (
                                  <span className="text-zinc-700 font-medium bg-zinc-100 px-2 py-0.5 rounded-md">Selesai</span>
                                ) : isDisq ? (
                                  <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-md">Terkunci</span>
                                ) : isWarn ? (
                                  <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-md">Teguran</span>
                                ) : (
                                  <span className="text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md">Aktif</span>
                                )}
                              </td>

                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedParticipant(p);
                                    }}
                                    className="px-2.5 py-1 rounded-xl bg-white hover:bg-zinc-100 text-[11px] text-zinc-800 font-medium cursor-pointer border border-[#D5D5D5]"
                                  >
                                    Detail
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteParticipant(p.id, p.name);
                                    }}
                                    className="p-1 rounded-xl text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                    title="Hapus peserta ini"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {filteredParticipants.length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-zinc-500">
                              <div className="max-w-md mx-auto space-y-3">
                                <Users className="w-8 h-8 text-zinc-400 mx-auto" />
                                <div>
                                  <p className="font-semibold text-zinc-700">Belum ada peserta yang aktif</p>
                                  <p className="text-xs text-zinc-500 mt-0.5">
                                    Ketika peserta mengisi data nama dan sekolah dari HP atau laptop lalu memulai ujian, data peserta akan langsung tersinkronisasi dan tampil di sini secara real-time.
                                  </p>
                                </div>
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                                  <button
                                    onClick={() => setIsShareModalOpen(true)}
                                    className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                                  >
                                    <QrCode className="w-4 h-4" />
                                    <span>Bagikan Link & QR Peserta</span>
                                  </button>
                                  <button
                                    onClick={() => window.open('/?view=portal', '_blank')}
                                    className="px-4 py-2 rounded-2xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-800 text-xs font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
                                  >
                                    <ExternalLink className="w-4 h-4 text-zinc-600" />
                                    <span>Uji Coba Tab Baru</span>
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* View Mode 2: Multi-Cam Visual Wall */
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {filteredParticipants.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedParticipant(p)}
                      className={`bg-white border rounded-3xl p-3 transition-all cursor-pointer relative group shadow-xs ${
                        selectedParticipant?.id === p.id
                          ? 'border-[#646464] ring-2 ring-[#646464]/30'
                          : 'border-[#D5D5D5] hover:border-[#646464]'
                      }`}
                    >
                      <div className="aspect-video bg-zinc-950 rounded-2xl overflow-hidden relative flex items-center justify-center border border-zinc-800 mb-2">
                        {p.cameraSnapshot ? (
                          <img
                            src={p.cameraSnapshot}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                        ) : p.supervisionMode === 'ZOOM_2_DEVICE' || p.cameraStatus === 'ZOOM' ? (
                          <div className="flex flex-col items-center justify-center p-2 text-center bg-slate-900 text-white w-full h-full">
                            <div className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center text-xs font-bold mb-1 shadow-xs">
                              <Video className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-bold text-sky-300 leading-tight">
                              Zoom Pengawas
                            </span>
                            <span className="text-[8px] text-zinc-400 font-mono">
                              HP ke-2
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center p-2 text-center">
                            <div className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center text-xs font-mono mb-1">
                              {p.name.charAt(0)}
                            </div>
                            <span className="text-[9px] text-zinc-400 leading-tight">
                              {p.cameraStatus === 'DENIED' ? 'Kamera Diblokir HP' : 'Menunggu Kamera...'}
                            </span>
                          </div>
                        )}

                        <div className="absolute inset-2 border border-dashed border-emerald-400/40 rounded-xl pointer-events-none" />

                        <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-black/75 px-1.5 py-0.5 rounded-md text-[9px] font-mono text-zinc-200">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              p.supervisionMode === 'ZOOM_2_DEVICE' || p.cameraStatus === 'ZOOM'
                                ? 'bg-sky-400 animate-pulse'
                                : p.cameraSnapshot
                                ? 'bg-emerald-400 animate-pulse'
                                : 'bg-amber-400'
                            }`}
                          />
                          <span>
                            {p.supervisionMode === 'ZOOM_2_DEVICE' || p.cameraStatus === 'ZOOM'
                              ? 'ZOOM'
                              : p.cameraSnapshot
                              ? 'LIVE'
                              : 'NO CAM'}
                          </span>
                        </div>

                        <div className="absolute bottom-1 right-1 bg-black/70 px-1.5 py-0.5 rounded-md text-[9px] font-mono text-emerald-400">
                          {p.trustScore}%
                        </div>
                      </div>

                      <div className="text-[11px] font-semibold text-zinc-900 truncate">{p.name}</div>
                      <div className="text-[10px] text-zinc-500 truncate">{p.school}</div>
                      <div className="flex items-center justify-between text-[10px] mt-1 pt-1 border-t border-zinc-100">
                        <span className="font-mono text-zinc-600">{p.category}</span>
                        <span className={`font-mono font-bold ${p.strikeCount > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {p.strikeCount} Strikes
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Participant Inspector & Live Telemetry Feed */}
            <div className="lg:col-span-4 space-y-6">
              {/* Selected Participant Inspector */}
              {selectedParticipant ? (
                <div className="bg-[#fafafa] border border-[#D5D5D5] rounded-3xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#D5D5D5]">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-[#646464]" />
                      <span className="text-xs font-bold text-zinc-900">Inspeksi Peserta</span>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-500">{selectedParticipant.id}</span>
                  </div>

                  {/* Real-time Camera Feed of Selected Participant */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-zinc-700 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-[#646464]" />
                        Kamera Pengawas Langsung:
                      </span>
                      {selectedParticipant.cameraSnapshot && (
                        <button
                          onClick={() => setExpandedCameraParticipant(selectedParticipant)}
                          className="text-[10px] text-[#646464] hover:text-zinc-900 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Maximize2 className="w-3 h-3" /> Perbesar
                        </button>
                      )}
                    </div>

                    <div className="aspect-video bg-zinc-950 rounded-2xl overflow-hidden relative flex items-center justify-center border border-zinc-800 shadow-inner group">
                      {selectedParticipant.cameraSnapshot || selectedParticipant.incidentSnapshot ? (
                        <>
                          <img
                            src={selectedParticipant.cameraSnapshot || selectedParticipant.incidentSnapshot}
                            alt={selectedParticipant.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/70 backdrop-blur-xs px-2 py-0.5 rounded-lg text-[10px] font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            <span className={selectedParticipant.cameraSnapshot ? 'text-emerald-400' : 'text-rose-400'}>
                              {selectedParticipant.cameraSnapshot ? 'LIVE FEED HP' : 'BUKTI FOTO INSIDEN AI'}
                            </span>
                          </div>
                          <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-xs px-2 py-0.5 rounded-lg text-[10px] text-zinc-300 font-mono">
                            Integritas: {selectedParticipant.trustScore}%
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center p-4">
                          <CameraOff className="w-7 h-7 text-zinc-600 mb-1.5" />
                          <span className="text-xs font-semibold text-zinc-300">
                            {selectedParticipant.cameraStatus === 'DENIED'
                              ? 'Kamera Belum Diizinkan di HP'
                              : 'Menunggu Aliran Kamera Peserta...'}
                          </span>
                          <p className="text-[10px] text-zinc-400 max-w-xs mt-1 leading-relaxed">
                            Minta peserta menekan tombol <strong>"Izinkan / Aktifkan Kamera"</strong> di layar HP mereka agar gambar wajah muncul di sini.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-zinc-900">{selectedParticipant.name}</h4>
                    <p className="text-xs text-zinc-500">{selectedParticipant.school}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-2xl border border-[#D5D5D5] shadow-xs">
                      <span className="text-zinc-500 text-[10px] block">Kategori</span>
                      <span className="font-bold text-zinc-900">{selectedParticipant.category}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-2xl border border-[#D5D5D5] shadow-xs">
                      <span className="text-zinc-500 text-[10px] block">Progres Soal</span>
                      <span className="font-bold text-zinc-900 font-mono">
                        {selectedParticipant.answeredCount} / {selectedParticipant.totalQuestions}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-2xl border border-[#D5D5D5] shadow-xs">
                      <span className="text-zinc-500 text-[10px] block">Strikes Tercatat</span>
                      <span className="font-bold text-rose-700 font-mono">{selectedParticipant.strikeCount} kali</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-2xl border border-[#D5D5D5] shadow-xs">
                      <span className="text-zinc-500 text-[10px] block">Skor Integritas</span>
                      <span className="font-bold text-emerald-700 font-mono">{selectedParticipant.trustScore}%</span>
                    </div>
                  </div>

                  {/* AI Incident Report (Triggered if strikes > 3 or report exists) */}
                  {(selectedParticipant.aiIncidentReport || selectedParticipant.strikeCount > 3) && (
                    <div className="bg-rose-50 border border-rose-300 rounded-2xl p-3.5 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-rose-900 font-bold">
                        <span className="flex items-center gap-1.5">
                          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                          Laporan Investigasi AI (Strikes &gt; 3)
                        </span>
                        <span className="bg-rose-200 text-rose-800 px-1.5 py-0.5 rounded text-[10px] font-mono">
                          {selectedParticipant.strikeCount} Pelanggaran
                        </span>
                      </div>

                      {selectedParticipant.incidentSnapshot && (
                        <div className="relative aspect-video rounded-xl overflow-hidden border border-rose-300 bg-black">
                          <img
                            src={selectedParticipant.incidentSnapshot}
                            alt="Bukti Insiden AI"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-1 left-1 bg-black/75 text-rose-300 px-2 py-0.5 rounded text-[9px] font-mono">
                            BUKTI FOTO KAMERA SAAT PELANGGARAN MELEBIHI 3X
                          </div>
                        </div>
                      )}

                      <div className="bg-white/95 p-2.5 rounded-xl border border-rose-200 text-zinc-800 leading-relaxed text-[11px] whitespace-pre-line font-sans shadow-2xs">
                        {selectedParticipant.aiIncidentReport ||
                          'AI sedang memproses analisis foto dan riwayat pelanggaran peserta...'}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="space-y-2 pt-2">
                    <div className="text-[11px] font-semibold text-zinc-800">Kirim Peringatan Langsung ke Layar:</div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customWarningText}
                        onChange={(e) => setCustomWarningText(e.target.value)}
                        placeholder="Tulis pesan teguran..."
                        className="flex-1 bg-white border border-[#D5D5D5] rounded-2xl px-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-[#646464]"
                      />
                      <button
                        onClick={() => handleSendWarning(selectedParticipant.id)}
                        className="p-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-xs"
                        title="Kirim Teguran"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleToggleLock(selectedParticipant.id)}
                        className={`flex-1 py-2 px-3 rounded-2xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                          selectedParticipant.status === 'DISQUALIFIED'
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                            : 'bg-rose-50 border border-rose-300 hover:bg-rose-100 text-rose-800'
                        }`}
                      >
                        {selectedParticipant.status === 'DISQUALIFIED' ? (
                          <>
                            <Unlock className="w-3.5 h-3.5" /> Buka Kunci Layar
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5" /> Kunci Layar Peserta
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-[#fafafa] border border-[#D5D5D5] rounded-3xl p-6 text-center text-zinc-500 shadow-xs">
                  <Eye className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                  <p className="text-xs">Pilih salah satu peserta di tabel untuk melihat status dan aksi pengawas.</p>
                </div>
              )}

              {/* Real-time Activity Feed */}
              <div className="bg-[#fafafa] border border-[#D5D5D5] rounded-3xl p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#D5D5D5]">
                  <span className="text-xs font-bold text-zinc-900 flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-emerald-600" />
                    Live Log Keamanan & Aktivitas
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">Real-time Feed</span>
                </div>

                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {activityLogs.map((log) => (
                    <div
                      key={log.id}
                      className="text-xs bg-white border border-[#D5D5D5] p-2.5 rounded-2xl space-y-1 shadow-xs"
                    >
                      <div className="flex items-center justify-between text-[10px] text-zinc-500">
                        <span className="font-mono">{log.time}</span>
                        <span
                          className={`font-semibold ${
                            log.type === 'warn'
                              ? 'text-amber-700'
                              : log.type === 'error'
                              ? 'text-rose-700'
                              : 'text-zinc-700'
                          }`}
                        >
                          {log.type.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-zinc-800 text-[11px] leading-tight">{log.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: REKAPITULASI & PERINGKAT NILAI RESMI              */}
      {/* ======================================================== */}
      {activeTab === 'results_recap' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header Card with #646464 and #D5D5D5 */}
          <div className="bg-[#fafafa] border border-[#D5D5D5] rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#646464] text-white px-2.5 py-0.5 rounded-lg">
                  Hasil Pengerjaan Resmi
                </span>
                <span className="text-zinc-400">·</span>
                <span className="text-xs text-zinc-500 font-medium">MMO 2027 UMM</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900 tracking-tight">
                Rekapitulasi Nilai & Papan Peringkat Peserta
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Standar Penilaian Resmi: <strong>Benar (+4)</strong> · <strong>Salah (-1)</strong> · <strong>Kosong (0)</strong>. Hasil terurut otomatis dari skor tertinggi.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                onClick={handleExportExcelGrades}
                className="px-4 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-xs whitespace-nowrap"
                title="Unduh seluruh rekap nilai lengkap ke berkas Excel (.csv) dengan rincian per butir soal dan waktu pengerjaan"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Rekap Excel (.csv)</span>
              </button>
            </div>
          </div>

          {/* 3 KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-[#D5D5D5] p-5 rounded-3xl shadow-xs">
              <div className="flex items-center justify-between text-zinc-500 mb-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider">Peserta Selesai</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-zinc-900 font-mono tabular-nums">
                {submittedParticipants.length}{' '}
                <span className="text-xs font-normal text-zinc-500 font-sans">
                  / {participants.length} Terdaftar
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                {participants.length > 0
                  ? `${Math.round((submittedParticipants.length / participants.length) * 100)}% lembar jawaban terkumpul`
                  : 'Belum ada peserta terdaftar'}
              </p>
            </div>

            <div className="bg-white border border-[#D5D5D5] p-5 rounded-3xl shadow-xs">
              <div className="flex items-center justify-between text-zinc-500 mb-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider">Rata-Rata Skor</span>
                <Award className="w-4 h-4 text-[#646464]" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-zinc-900 font-mono tabular-nums">
                {avgScore > 0 ? `+${avgScore}` : avgScore}{' '}
                <span className="text-xs font-normal text-zinc-500 font-sans">Poin</span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                Dihitung dari seluruh peserta yang sudah mengumpulkan
              </p>
            </div>

            <div className="bg-white border border-[#D5D5D5] p-5 rounded-3xl shadow-xs">
              <div className="flex items-center justify-between text-zinc-500 mb-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider">Skor Tertinggi</span>
                <Trophy className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-mono tabular-nums">
                {topParticipant && topParticipant.score !== undefined
                  ? `${topParticipant.score > 0 ? '+' : ''}${topParticipant.score} Poin`
                  : '-'}
              </div>
              <p className="text-[11px] text-zinc-600 truncate mt-1">
                {topParticipant ? `${topParticipant.name} · ${topParticipant.school}` : 'Menunggu pengerjaan selesai'}
              </p>
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className="bg-[#fafafa] border border-[#D5D5D5] rounded-3xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Category & Stage Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter (Jenjang) */}
              <div className="flex items-center gap-1 bg-white border border-[#D5D5D5] p-1 rounded-2xl text-xs shadow-2xs">
                <button
                  onClick={() => setRecapCategoryFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    recapCategoryFilter === 'ALL'
                      ? 'bg-[#53585E] text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  Semua Jenjang ({participants.length})
                </button>
                <button
                  onClick={() => setRecapCategoryFilter('SMP')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    recapCategoryFilter === 'SMP'
                      ? 'bg-[#53585E] text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  SMP ({participants.filter((p) => p.category === 'SMP').length})
                </button>
                <button
                  onClick={() => setRecapCategoryFilter('SMA')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    recapCategoryFilter === 'SMA'
                      ? 'bg-[#53585E] text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  SMA ({participants.filter((p) => p.category === 'SMA').length})
                </button>
              </div>

              {/* Stage Filter (Babak) */}
              <div className="flex items-center gap-1 bg-white border border-[#D5D5D5] p-1 rounded-2xl text-xs shadow-2xs">
                <button
                  onClick={() => setRecapStageFilter('ALL')}
                  className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    recapStageFilter === 'ALL'
                      ? 'bg-[#53585E] text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  Semua Babak ({participants.length})
                </button>
                <button
                  onClick={() => setRecapStageFilter('Penyisihan')}
                  className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    recapStageFilter === 'Penyisihan'
                      ? 'bg-[#53585E] text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  Penyisihan ({participants.filter((p) => (p.stage || 'Penyisihan') === 'Penyisihan').length})
                </button>
                <button
                  onClick={() => setRecapStageFilter('Semifinal')}
                  className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    recapStageFilter === 'Semifinal'
                      ? 'bg-[#53585E] text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  Semifinal ({participants.filter((p) => p.stage === 'Semifinal').length})
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={recapSearchQuery}
                onChange={(e) => setRecapSearchQuery(e.target.value)}
                placeholder="Cari nama peserta atau asal sekolah..."
                className="w-full bg-white border border-[#D5D5D5] rounded-2xl pl-10 pr-4 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#646464] transition-colors"
              />
              {recapSearchQuery && (
                <button
                  onClick={() => setRecapSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Leaderboard Ranking Table */}
          <div className="bg-white border border-[#D5D5D5] rounded-3xl overflow-hidden shadow-xs">
            <div className="p-4 bg-[#fafafa] border-b border-[#D5D5D5] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#646464]" />
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                  Tabel Peringkat Resmi Hasil Penilaian
                </h3>
              </div>
              <span className="text-[11px] text-zinc-500 font-mono">
                {recapParticipants.length} Peserta Ditampilkan
              </span>
            </div>

            {recapParticipants.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 space-y-2">
                <Award className="w-10 h-10 text-zinc-300 mx-auto" />
                <p className="text-sm font-semibold text-zinc-800">Belum Ada Peserta yang Sesuai</p>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Nilai peserta akan dihitung dan muncul otomatis di sini begitu peserta menekan tombol kumpulkan ujian.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#D5D5D5] bg-[#f7f7f8] text-[11px] font-bold text-zinc-700 uppercase tracking-wider">
                      <th className="py-3.5 px-4 text-center w-16">Rank</th>
                      <th className="py-3.5 px-4">Nama Peserta & Sekolah</th>
                      <th className="py-3.5 px-3">Kategori</th>
                      <th className="py-3.5 px-3 text-right">Skor Akhir</th>
                      <th className="py-3.5 px-3">Rincian Jawaban</th>
                      <th className="py-3.5 px-3">Durasi & Waktu</th>
                      <th className="py-3.5 px-3 text-center">Status</th>
                      <th className="py-3.5 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D5D5D5]/60">
                    {recapParticipants.map((p, index) => {
                      const isRank1 = index === 0 && (p.score ?? 0) > 0;
                      const isRank2 = index === 1 && (p.score ?? 0) > 0;
                      const isRank3 = index === 2 && (p.score ?? 0) > 0;
                      const finalScore = p.score !== undefined ? p.score : 0;
                      const correct = p.correctCount ?? 0;
                      const wrong = p.wrongCount ?? 0;
                      const blank = p.blankCount ?? Math.max(0, (p.totalQuestions || 0) - correct - wrong);

                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-[#fafafa] transition-colors"
                        >
                          {/* Rank Column */}
                          <td className="py-3.5 px-4 text-center">
                            {isRank1 ? (
                              <div className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-amber-100 text-amber-800 font-extrabold text-xs shadow-2xs border border-amber-300">
                                #1
                              </div>
                            ) : isRank2 ? (
                              <div className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-slate-200 text-slate-800 font-extrabold text-xs shadow-2xs border border-slate-300">
                                #2
                              </div>
                            ) : isRank3 ? (
                              <div className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-amber-700/15 text-amber-900 font-extrabold text-xs shadow-2xs border border-amber-700/30">
                                #3
                              </div>
                            ) : (
                              <span className="font-mono text-zinc-500 font-semibold">
                                #{index + 1}
                              </span>
                            )}
                          </td>

                          {/* Participant Name & School */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-zinc-900 text-sm">
                              {p.name}
                            </div>
                            <div className="text-zinc-500 text-xs">
                              {p.school}
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-3.5 px-3">
                            <span className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#f7f7f8] text-zinc-800 border border-[#D5D5D5]">
                              {p.category}
                            </span>
                          </td>

                          {/* Final Score */}
                          <td className="py-3.5 px-3 text-right">
                            <div
                              className={`text-base font-extrabold font-mono tabular-nums ${
                                finalScore > 0
                                  ? 'text-emerald-700'
                                  : finalScore < 0
                                  ? 'text-rose-600'
                                  : 'text-zinc-700'
                              }`}
                            >
                              {finalScore > 0 ? `+${finalScore}` : finalScore}{' '}
                              <span className="text-[10px] font-normal text-zinc-400 font-sans">
                                Poin
                              </span>
                            </div>
                          </td>

                          {/* Answers breakdown */}
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-2 text-xs font-mono">
                              <span className="text-emerald-700 font-bold" title="Benar (+4 poin)">
                                ✓ {correct}
                              </span>
                              <span className="text-zinc-300">·</span>
                              <span className="text-rose-600 font-bold" title="Salah (-1 poin)">
                                ✗ {wrong}
                              </span>
                              <span className="text-zinc-300">·</span>
                              <span className="text-zinc-500 font-medium" title="Kosong (0 poin)">
                                − {blank}
                              </span>
                            </div>
                            <div className="text-[10px] text-zinc-400 mt-0.5">
                              {correct + wrong} dari {p.totalQuestions || 0} dijawab
                            </div>
                          </td>

                          {/* Duration & Submission Time */}
                          <td className="py-3.5 px-3">
                            <div className="font-semibold text-zinc-800 text-xs font-mono">
                              {p.durationTaken || '-'}
                            </div>
                            <div className="text-[11px] text-zinc-500">
                              {p.submittedAtTime || p.lastActive || '-'}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-3 text-center">
                            {p.status === 'SUBMITTED' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
                                <Check className="w-3 h-3 text-emerald-600" />
                                Selesai
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl">
                                Mengerjakan
                              </span>
                            )}
                          </td>

                          {/* Action Button */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => setInspectingScoresParticipant(p)}
                              className="px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-100 border border-[#D5D5D5] text-zinc-800 text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs hover:border-[#646464]"
                              title="Lihat rincian jawaban tiap butir soal"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#646464]" />
                              <span>Rincian Soal</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: INTEGRASI GOOGLE SHEETS PENDAFTARAN & DATA PESERTA */}
      {/* ======================================================== */}
      {activeTab === 'registration_sheets' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header Card */}
          <div className="bg-[#fafafa] border border-[#D5D5D5] rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#646464] text-white px-2.5 py-0.5 rounded-lg">
                  Integrasi Otomatis Google Form
                </span>
                <span className="text-zinc-400">·</span>
                {isDemoActive ? (
                  <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-[11px] font-bold inline-flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-700" />
                    Mode Akun Demo (Simulasi)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[11px] font-bold inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                    Mode Data Pendaftaran Asli (100% Real)
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900 tracking-tight">
                Data Akun Pendaftaran Peserta (Google Sheets & Excel)
              </h2>
              <p className="text-xs text-zinc-500 mt-1 max-w-2xl leading-relaxed">
                Sinkronkan tanggapan formulir pendaftaran Google Form agar peserta cukup memasukkan <strong>Email & Kata Sandi</strong>. Identitas sekolah, NISN, kota, dan jenjang otomatis divalidasi ke lembar ujian dan rekap nilai.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {isDemoActive ? (
                <button
                  type="button"
                  onClick={handleClearAllDemo}
                  className="px-3.5 py-2 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Hapus kelima akun demo Budi, Nadia, Siti, Faris, Dewi agar sistem murni menggunakan data pendaftaran Anda"
                >
                  <ShieldOff className="w-3.5 h-3.5 text-rose-600" />
                  <span>Hapus Data Demo (Gunakan Data Asli)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="px-3.5 py-2 rounded-2xl bg-white hover:bg-zinc-100 border border-[#D5D5D5] text-zinc-700 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Kembalikan akun contoh untuk simulasi pengujian"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Muat Ulang Akun Demo</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowAddManualModal(true)}
                className="px-3.5 py-2 rounded-2xl bg-white hover:bg-zinc-100 border border-[#D5D5D5] text-xs font-semibold text-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5 text-[#646464]" />
                <span>Tambah Peserta Manual</span>
              </button>
            </div>
          </div>

          {/* Import / Sync Control Panel with 3 Methods */}
          <div className="bg-white border border-[#D5D5D5] p-6 rounded-3xl shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D5D5D5]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                  <FileSpreadsheet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-900">
                    Metode Sinkronisasi Data Pendaftaran
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Pilih metode yang paling nyaman untuk mengimpor data Google Form / Excel ke portal ujian.
                  </p>
                </div>
              </div>

              {/* Tab Selector for 3 Methods */}
              <div className="inline-flex items-center p-1 bg-[#f7f7f8] border border-[#D5D5D5] rounded-2xl text-xs self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setSyncMethod('URL')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    syncMethod === 'URL'
                      ? 'bg-[#646464] text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>1. Tautan Google Sheets</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSyncMethod('FILE')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    syncMethod === 'FILE'
                      ? 'bg-[#646464] text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>2. Upload File Excel / CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasteModal(true)}
                  className="px-3 py-1.5 rounded-xl font-bold text-zinc-600 hover:text-zinc-900 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>3. Tempel Tabel Langsung</span>
                </button>
              </div>
            </div>

            {/* Method 1: Google Sheets URL */}
            {syncMethod === 'URL' && (
              <div className="space-y-3 animate-in fade-in">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      value={sheetsUrl}
                      onChange={(e) => {
                        setSheetsUrl(e.target.value);
                        saveGoogleSheetsUrl(e.target.value);
                      }}
                      placeholder="https://docs.google.com/spreadsheets/d/e/2PACX-1v.../pubhtml atau https://docs.google.com/spreadsheets/d/.../edit"
                      className="w-full bg-[#f7f7f8] border border-[#D5D5D5] rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#646464] focus:bg-white transition-colors font-mono"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSyncSheets}
                    disabled={isSyncingSheets}
                    className="px-5 py-2.5 rounded-2xl bg-[#646464] hover:bg-[#525252] disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    <RotateCcw className={`w-4 h-4 ${isSyncingSheets ? 'animate-spin' : ''}`} />
                    <span>{isSyncingSheets ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
                  </button>
                </div>
                <div className="text-[11px] text-zinc-500 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    Mendukung tautan Publikasikan ke Web (<strong>pubhtml</strong> / <strong>CSV</strong>) maupun tautan Berbagi Google Sheets biasa.
                  </span>
                  <span className="font-mono text-zinc-600">
                    Sinkron terakhir: <strong>{lastSyncText}</strong>
                  </span>
                </div>
              </div>
            )}

            {/* Method 2: Direct File Upload */}
            {syncMethod === 'FILE' && (
              <div className="space-y-3 animate-in fade-in">
                <label className="border-2 border-dashed border-[#D5D5D5] hover:border-[#646464] bg-[#fafafa] hover:bg-zinc-50/80 rounded-2xl p-6 flex flex-col items-center justify-center gap-2.5 text-center cursor-pointer transition-all">
                  <div className="w-11 h-11 rounded-2xl bg-zinc-200/80 flex items-center justify-center text-zinc-700">
                    <FileUp className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-zinc-900">
                      Klik atau Tarik Berkas Excel (.xlsx, .xls) / CSV ke sini
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Download spreadsheet dari Google Form (Menu <em>File &gt; Download &gt; Microsoft Excel (.xlsx)</em> atau CSV), lalu upload langsung tanpa perlu atur izin sharing link publik.
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-white border border-[#D5D5D5] rounded-xl text-xs font-semibold text-zinc-700 shadow-2xs">
                    Pilih Berkas dari Komputer
                  </span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {/* Sync Feedback Message */}
            {syncFeedback && (
              <div
                className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 animate-in fade-in ${
                  syncFeedback.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border border-rose-200 text-rose-900'
                }`}
              >
                {syncFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div>{syncFeedback.message}</div>
                  {syncFeedback.type === 'error' && (
                    <div className="text-[11px] font-semibold text-rose-700">
                      Solusi Cepat: Anda dapat memilih tab <strong>"2. Upload File Excel / CSV"</strong> di atas untuk mengunggah berkas Excel unduhan formulir pendaftaran secara langsung tanpa kendala akses link.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Setup Guide accordion */}
            <div className="bg-[#f7f7f8] border border-[#D5D5D5] p-4 rounded-2xl text-xs text-zinc-700 space-y-2">
              <span className="font-bold text-zinc-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#646464]" />
                Petunjuk Cepat Format Kolom Spreadsheet Formulir Pendaftaran:
              </span>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-zinc-600 pl-1 leading-relaxed">
                <li>
                  Baris pertama (header) minimal memiliki kolom: <strong>Email</strong>, <strong>Nama Lengkap</strong>, <strong>Asal Sekolah</strong>, <strong>Kategori (SMP / SMA)</strong>, <strong>NISN / No Peserta</strong>, dan <strong>Kota</strong>.
                </li>
                <li>
                  Kolom <strong>Kata Sandi</strong> opsional: jika di Google Form tidak ada kolom kata sandi, sistem secara otomatis menetapkan kata sandi default <strong>mmo2027</strong> untuk seluruh pendaftar.
                </li>
                <li>
                  Untuk tautan publik: Di Google Sheets, klik menu <em>File &gt; Bagikan &gt; Publikasikan ke web &gt; Pilih format CSV / Halaman web</em>, lalu salin tautan yang muncul.
                </li>
              </ul>
            </div>
          </div>

          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white border border-[#D5D5D5] p-4 rounded-3xl shadow-xs">
              <div className="text-zinc-500 text-xs font-medium">Total Akun Terdaftar</div>
              <div className="text-2xl font-bold font-mono text-zinc-900 mt-1 tabular-nums">
                {registeredList.length}
              </div>
              <span className="text-[11px] text-zinc-500">
                {registeredList.length === 0 ? 'Belum ada pendaftar' : 'Siap login ke ujian'}
              </span>
            </div>

            <div className="bg-white border border-[#D5D5D5] p-4 rounded-3xl shadow-xs">
              <div className="text-zinc-500 text-xs font-medium">Peserta Jenjang SMP</div>
              <div className="text-2xl font-bold font-mono text-blue-700 mt-1 tabular-nums">
                {registeredList.filter((p) => p.category === 'SMP').length}
              </div>
              <span className="text-[11px] text-zinc-500">SMP / MTs Sederajat</span>
            </div>

            <div className="bg-white border border-[#D5D5D5] p-4 rounded-3xl shadow-xs">
              <div className="text-zinc-500 text-xs font-medium">Peserta Jenjang SMA</div>
              <div className="text-2xl font-bold font-mono text-amber-700 mt-1 tabular-nums">
                {registeredList.filter((p) => p.category === 'SMA').length}
              </div>
              <span className="text-[11px] text-zinc-500">SMA / MA / SMK Sederajat</span>
            </div>

            <div className="bg-white border border-[#D5D5D5] p-4 rounded-3xl shadow-xs">
              <div className="text-zinc-500 text-xs font-medium">Status Basis Data</div>
              <div className="text-xs font-bold mt-2 flex items-center gap-1.5 truncate">
                {isDemoActive ? (
                  <span className="text-amber-700 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Mode Demo (Simulasi)</span>
                  </span>
                ) : (
                  <span className="text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Data Asli Real</span>
                  </span>
                )}
              </div>
              <span className="text-[10px] text-zinc-500 mt-1 block truncate">
                {lastSyncText}
              </span>
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className="bg-[#fafafa] border border-[#D5D5D5] rounded-3xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter (Jenjang) */}
              <div className="flex items-center gap-1 bg-white border border-[#D5D5D5] p-1 rounded-2xl text-xs shadow-2xs">
                <button
                  type="button"
                  onClick={() => setRegFilterCategory('ALL')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    regFilterCategory === 'ALL'
                      ? 'bg-[#53585E] text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  Semua Jenjang ({registeredList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRegFilterCategory('SMP')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    regFilterCategory === 'SMP'
                      ? 'bg-[#53585E] text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  SMP ({registeredList.filter((p) => p.category === 'SMP').length})
                </button>
                <button
                  type="button"
                  onClick={() => setRegFilterCategory('SMA')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    regFilterCategory === 'SMA'
                      ? 'bg-[#53585E] text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  SMA ({registeredList.filter((p) => p.category === 'SMA').length})
                </button>
              </div>

              {/* Stage Filter (Babak) */}
              <div className="flex items-center gap-1 bg-white border border-[#D5D5D5] p-1 rounded-2xl text-xs shadow-2xs">
                <button
                  type="button"
                  onClick={() => setRegFilterStage('ALL')}
                  className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    regFilterStage === 'ALL'
                      ? 'bg-[#53585E] text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  Semua Babak ({registeredList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRegFilterStage('Penyisihan')}
                  className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    regFilterStage === 'Penyisihan'
                      ? 'bg-[#53585E] text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  Penyisihan ({registeredList.filter((p) => (p.stage || 'Penyisihan') === 'Penyisihan').length})
                </button>
                <button
                  type="button"
                  onClick={() => setRegFilterStage('Semifinal')}
                  className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    regFilterStage === 'Semifinal'
                      ? 'bg-[#53585E] text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  Semifinal ({registeredList.filter((p) => p.stage === 'Semifinal').length})
                </button>
              </div>
            </div>

            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={regSearchQuery}
                onChange={(e) => setRegSearchQuery(e.target.value)}
                placeholder="Cari nama peserta, email, sekolah, kota, atau NISN..."
                className="w-full bg-white border border-[#D5D5D5] rounded-2xl pl-10 pr-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#646464]"
              />
            </div>
          </div>

          {/* Registered Participants Table */}
          <div className="bg-white border border-[#D5D5D5] rounded-3xl overflow-hidden shadow-xs">
            {registeredList.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto text-zinc-400">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-zinc-800">
                  Belum Ada Akun Peserta Terdaftar
                </h4>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  Semua data demo telah dibersihkan. Silakan masukkan tautan Google Spreadsheet, upload berkas Excel pendaftaran, atau tambahkan peserta manual di atas untuk mulai menguji coba secara utuh.
                </p>
                <div className="pt-2 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddManualModal(true)}
                    className="px-4 py-2 bg-[#646464] hover:bg-[#525252] text-white text-xs font-bold rounded-xl shadow-xs"
                  >
                    Tambah Peserta Manual
                  </button>
                  <button
                    type="button"
                    onClick={handleResetToDefault}
                    className="px-4 py-2 bg-white hover:bg-zinc-100 border border-[#D5D5D5] text-zinc-700 text-xs font-semibold rounded-xl shadow-2xs"
                  >
                    Muat Akun Demo Kembali
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#f7f7f8] border-b border-[#D5D5D5] text-zinc-600 uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4 font-bold text-center w-12">No</th>
                      <th className="py-3 px-4 font-bold">Nama Lengkap (Kredensial Login)</th>
                      <th className="py-3 px-4 font-bold">Asal Sekolah & Kota</th>
                      <th className="py-3 px-3 font-bold text-center">Jenjang & Babak</th>
                      <th className="py-3 px-3 font-bold font-mono">NISN / Sandi Awal</th>
                      <th className="py-3 px-3 font-bold font-mono">Kata Sandi Aktif</th>
                      <th className="py-3 px-4 font-bold">Email Pendaftaran</th>
                      <th className="py-3 px-3 font-bold text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D5D5D5]">
                    {registeredList
                      .filter((p) => {
                        if (regFilterCategory !== 'ALL' && p.category !== regFilterCategory) return false;
                        if (regFilterStage !== 'ALL' && (p.stage || 'Penyisihan') !== regFilterStage) return false;
                        if (!regSearchQuery.trim()) return true;
                        const q = regSearchQuery.toLowerCase();
                        return (
                          p.fullName.toLowerCase().includes(q) ||
                          p.school.toLowerCase().includes(q) ||
                          p.email.toLowerCase().includes(q) ||
                          p.city.toLowerCase().includes(q) ||
                          p.nisnOrRegNumber.toLowerCase().includes(q)
                        );
                      })
                      .map((p, idx) => {
                        const isCopiedName = copiedCredentialId === `${p.id}-name`;
                        const isCopiedNisn = copiedCredentialId === `${p.id}-nisn`;
                        const isCopiedPass = copiedCredentialId === `${p.id}-pass`;
                        return (
                          <tr key={p.id} className="hover:bg-zinc-50/80 transition-colors">
                            <td className="py-3 px-4 font-mono text-zinc-500 text-xs text-center">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5 font-bold text-zinc-900 text-xs sm:text-sm">
                                <span>{p.fullName}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyCredential(p.fullName, `${p.id}-name`)}
                                  className="text-zinc-400 hover:text-zinc-700 p-0.5 cursor-pointer"
                                  title="Salin Nama Lengkap"
                                >
                                  {isCopiedName ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                              <div className="text-[10px] text-zinc-500 font-mono">
                                ID: {p.id} · <span className="text-zinc-400">Case-insensitive</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-zinc-800 text-xs">
                                {p.school}
                              </div>
                              <div className="text-[11px] text-zinc-500">
                                {p.city}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span
                                  className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-lg border ${
                                    p.category === 'SMP'
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}
                                >
                                  {p.category}
                                </span>
                                <span className="inline-block text-[9px] font-semibold px-2 py-0.5 rounded-md bg-[#83B9DF]/20 text-[#53585E] border border-[#83B9DF]/40">
                                  {p.stage || 'Penyisihan'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3 font-mono text-xs font-bold text-zinc-900">
                              <div className="flex items-center gap-1.5">
                                <span>{p.nisnOrRegNumber}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyCredential(p.nisnOrRegNumber, `${p.id}-nisn`)}
                                  className="text-zinc-400 hover:text-zinc-700 p-0.5 cursor-pointer"
                                  title="Salin NISN"
                                >
                                  {isCopiedNisn ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                              <span className="text-[10px] text-zinc-400 block font-sans">Kata sandi default</span>
                            </td>
                            <td className="py-3 px-3 font-mono text-xs font-semibold text-zinc-800">
                              <div className="flex items-center gap-1.5">
                                <span>{p.password || p.nisnOrRegNumber}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyCredential(p.password || p.nisnOrRegNumber, `${p.id}-pass`)}
                                  className="text-zinc-400 hover:text-zinc-700 p-0.5 cursor-pointer"
                                  title="Salin Kata Sandi Aktif"
                                >
                                  {isCopiedPass ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                              {p.password && p.password !== p.nisnOrRegNumber && (
                                <span className="text-[10px] text-emerald-600 font-bold block font-sans">Diubah peserta</span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono text-xs text-zinc-600">
                              {p.email}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Hapus akun peserta ${p.fullName}?`)) {
                                    const updated = registeredList.filter((item) => item.id !== p.id);
                                    saveRegisteredParticipants(updated);
                                    setRegisteredList(updated);
                                  }
                                }}
                                className="p-1.5 rounded-xl hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition-colors cursor-pointer"
                                title="Hapus Peserta"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Tempel Teks Tabel (Copy-Paste dari Excel/Sheets) */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D5D5D5] rounded-3xl max-w-xl w-full p-6 shadow-xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#D5D5D5]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#646464] text-white flex items-center justify-center">
                  <ClipboardPaste className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-900">
                    Tempel Data dari Spreadsheet (Copy-Paste)
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    Blok tabel data pendaftar beserta baris header di Google Sheets / Excel, tekan Ctrl+C, lalu tempel (Ctrl+V) di bawah.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="w-7 h-7 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <textarea
                rows={8}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Contoh header dan baris:&#10;Email&#9;Password&#9;Nama Lengkap&#9;Asal Sekolah&#9;Kategori&#9;Kota&#10;peserta1@gmail.com&#9;mmo2026&#9;Ahmad Dani&#9;SMPN 1 Malang&#9;SMP&#9;Malang"
                className="w-full bg-[#f7f7f8] border border-[#D5D5D5] rounded-2xl p-3.5 text-xs text-zinc-900 font-mono focus:outline-none focus:border-[#646464] focus:bg-white resize-y"
              />
              <span className="text-[11px] text-zinc-500 block">
                Mendukung teks terpisah TAB (hasil copy spreadsheet) maupun teks koma CSV.
              </span>
            </div>

            <div className="pt-3 border-t border-[#D5D5D5] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-100 border border-[#D5D5D5] text-zinc-700 font-semibold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handlePasteImportSubmit}
                disabled={!pastedText.trim()}
                className="px-5 py-2 rounded-xl bg-[#646464] hover:bg-[#525252] disabled:opacity-50 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                Impor Data Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Peserta Manual */}
      {showAddManualModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D5D5D5] rounded-3xl max-w-lg w-full p-6 shadow-xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#D5D5D5]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#646464] text-white flex items-center justify-center">
                  <PlusCircle className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-zinc-900">
                  Tambah Akun Peserta Manual
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddManualModal(false)}
                className="w-7 h-7 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddManualSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-zinc-800 mb-1">Jenjang *</label>
                  <select
                    value={mCategory}
                    onChange={(e) => setMCategory(e.target.value as OlympiadCategory)}
                    className="w-full bg-[#f7f7f8] border border-[#D5D5D5] rounded-xl px-3 py-2 text-zinc-900 focus:outline-none focus:border-[#646464]"
                  >
                    <option value="SMP">SMP / MTs</option>
                    <option value="SMA">SMA / MA / SMK</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-zinc-800 mb-1">Babak *</label>
                  <select
                    value={mStage}
                    onChange={(e) => setMStage(e.target.value as CompetitionStage)}
                    className="w-full bg-[#f7f7f8] border border-[#D5D5D5] rounded-xl px-3 py-2 text-zinc-900 focus:outline-none focus:border-[#646464]"
                  >
                    <option value="Penyisihan">Penyisihan</option>
                    <option value="Semifinal">Semifinal</option>
                    <option value="Final">Final</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-zinc-800 mb-1">NISN / No Peserta</label>
                  <input
                    type="text"
                    value={mNisn}
                    onChange={(e) => setMNisn(e.target.value)}
                    placeholder="0071234567"
                    className="w-full bg-[#f7f7f8] border border-[#D5D5D5] rounded-xl px-3 py-2 text-zinc-900 font-mono focus:outline-none focus:border-[#646464]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-800 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={mName}
                  onChange={(e) => setMName(e.target.value)}
                  placeholder="Nama Peserta Lengkap"
                  className="w-full bg-[#f7f7f8] border border-[#D5D5D5] rounded-xl px-3 py-2 text-zinc-900 focus:outline-none focus:border-[#646464]"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-800 mb-1">Asal Sekolah *</label>
                <input
                  type="text"
                  required
                  value={mSchool}
                  onChange={(e) => setMSchool(e.target.value)}
                  placeholder="Nama Sekolah Lengkap"
                  className="w-full bg-[#f7f7f8] border border-[#D5D5D5] rounded-xl px-3 py-2 text-zinc-900 focus:outline-none focus:border-[#646464]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-800 mb-1">Alamat Email *</label>
                  <input
                    type="email"
                    required
                    value={mEmail}
                    onChange={(e) => setMEmail(e.target.value)}
                    placeholder="nama@gmail.com"
                    className="w-full bg-[#f7f7f8] border border-[#D5D5D5] rounded-xl px-3 py-2 text-zinc-900 font-mono focus:outline-none focus:border-[#646464]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-800 mb-1">Kata Sandi Login *</label>
                  <input
                    type="text"
                    required
                    value={mPassword}
                    onChange={(e) => setMPassword(e.target.value)}
                    placeholder="mmo2026"
                    className="w-full bg-[#f7f7f8] border border-[#D5D5D5] rounded-xl px-3 py-2 text-zinc-900 font-mono focus:outline-none focus:border-[#646464]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-800 mb-1">Kota / Domisili</label>
                <input
                  type="text"
                  value={mCity}
                  onChange={(e) => setMCity(e.target.value)}
                  placeholder="Kota / Kabupaten"
                  className="w-full bg-[#f7f7f8] border border-[#D5D5D5] rounded-xl px-3 py-2 text-zinc-900 focus:outline-none focus:border-[#646464]"
                />
              </div>

              <div className="pt-3 border-t border-[#D5D5D5] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddManualModal(false)}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-100 border border-[#D5D5D5] text-zinc-700 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#646464] hover:bg-[#525252] text-white font-bold cursor-pointer shadow-xs"
                >
                  Simpan Peserta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: MANAJEMEN BANK SOAL (INPUT SOAL LANGSUNG)        */}
      {/* ======================================================== */}
      {activeTab === 'question_manager' && (
        <div className="space-y-6">
          {wordImportSuccessNotice && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs text-emerald-900 shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">{wordImportSuccessNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setWordImportSuccessNotice(null)}
                className="text-emerald-700 hover:text-emerald-950 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Form Input Soal Baru */}
            <div className="lg:col-span-7 bg-[#fafafa] border border-[#D5D5D5] rounded-3xl p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#D5D5D5] gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-2xl bg-[#646464] text-white flex items-center justify-center">
                    <PlusCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-900">
                      Form Input & Tambah Soal Baru MMO 2027
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Mendukung format LaTeX KaTeX, karakter Explore, dan kunci jawaban.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowWordImporterModal(true)}
                  className="px-3.5 py-2 bg-[#646464] hover:bg-[#525252] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs border border-[#646464] shrink-0"
                  title="Impor naskah soal dari dokumen Word (.docx) dengan konversi rumus KaTeX otomatis"
                >
                  <FileText className="w-4 h-4 text-amber-300" />
                  <span>Impor dari Word (.docx)</span>
                </button>
              </div>

              <form onSubmit={handleSaveQuestion} className="space-y-4">
                {/* Category, Stage, Focus, Domain, and Type */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-800 mb-1">Kategori</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as OlympiadCategory)}
                      className="w-full bg-white border border-[#D5D5D5] rounded-xl px-2.5 py-2 text-xs text-zinc-900 focus:outline-none focus:border-[#646464]"
                    >
                      <option value="SMP">SMP / MTs</option>
                      <option value="SMA">SMA / MA / SMK</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-800 mb-1">Babak</label>
                    <select
                      value={newStage}
                      onChange={(e) => {
                        const val = e.target.value as CompetitionStage;
                        setNewStage(val);
                        if (val === 'Penyisihan') {
                          setNewFocus('Explore');
                          setNewType('multiple_choice');
                        } else if (val === 'Semifinal') {
                          setNewFocus('Explore + Think');
                          setNewType('multiple_choice');
                        } else {
                          setNewFocus('Think + Excel');
                          setNewType('short_answer');
                        }
                      }}
                      className="w-full bg-white border border-[#D5D5D5] rounded-xl px-2.5 py-2 text-xs text-zinc-900 focus:outline-none focus:border-[#646464]"
                    >
                      <option value="Penyisihan">Penyisihan</option>
                      <option value="Semifinal">Semifinal</option>
                      <option value="Final">Final</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-800 mb-1">Fokus Karakter</label>
                    <select
                      value={newFocus}
                      onChange={(e) => setNewFocus(e.target.value as QuestionFocus)}
                      className="w-full bg-white border border-[#D5D5D5] rounded-xl px-2.5 py-2 text-xs text-zinc-900 focus:outline-none focus:border-[#646464]"
                    >
                      <option value="Explore">Explore</option>
                      <option value="Explore + Think">Explore + Think</option>
                      <option value="Think + Excel">Think + Excel</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-800 mb-1">Bidang Materi</label>
                    <select
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value as MathDomain)}
                      className="w-full bg-white border border-[#D5D5D5] rounded-xl px-2.5 py-2 text-xs text-zinc-900 focus:outline-none focus:border-[#646464]"
                    >
                      <option value="Aljabar">Aljabar</option>
                      <option value="Geometri">Geometri</option>
                      <option value="Kombinatorika">Kombinatorika</option>
                      <option value="Teori Bilangan">Teori Bilangan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-800 mb-1">Jenis Soal</label>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as QuestionType)}
                      className="w-full bg-white border border-[#D5D5D5] rounded-xl px-2.5 py-2 text-xs text-zinc-900 font-semibold focus:outline-none focus:border-[#646464]"
                    >
                      <option value="multiple_choice">Pilihan Ganda</option>
                      <option value="short_answer">Uraian / Problem Solving</option>
                    </select>
                  </div>
                </div>

                {/* Teks Soal */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-zinc-800">
                      Teks Soal (Gunakan $...$ untuk rumus LaTeX) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-zinc-500 font-mono">Contoh: $x^2 + 5x = 0$</span>
                  </div>
                  <textarea
                    rows={4}
                    required
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    placeholder="Tulis teks narasi soal, situasi, tabel, atau diagram dengan formula LaTeX..."
                    className="w-full bg-white border border-[#D5D5D5] rounded-2xl p-3 text-xs text-zinc-900 focus:outline-none focus:border-[#646464] font-mono leading-relaxed"
                  />
                </div>

                {/* Conditional: Multiple Choice Options A - E */}
                {newType === 'multiple_choice' ? (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-800 block">Pilihan Jawaban (A - E):</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-zinc-200 text-zinc-800 font-bold flex items-center justify-center shrink-0">A</span>
                        <input
                          type="text"
                          required
                          value={optA}
                          onChange={(e) => setOptA(e.target.value)}
                          className="flex-1 bg-white border border-[#D5D5D5] rounded-xl px-2.5 py-1.5 text-xs text-zinc-900 font-mono"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-zinc-200 text-zinc-800 font-bold flex items-center justify-center shrink-0">B</span>
                        <input
                          type="text"
                          required
                          value={optB}
                          onChange={(e) => setOptB(e.target.value)}
                          className="flex-1 bg-white border border-[#D5D5D5] rounded-xl px-2.5 py-1.5 text-xs text-zinc-900 font-mono"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-zinc-200 text-zinc-800 font-bold flex items-center justify-center shrink-0">C</span>
                        <input
                          type="text"
                          required
                          value={optC}
                          onChange={(e) => setOptC(e.target.value)}
                          className="flex-1 bg-white border border-[#D5D5D5] rounded-xl px-2.5 py-1.5 text-xs text-zinc-900 font-mono"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-zinc-200 text-zinc-800 font-bold flex items-center justify-center shrink-0">D</span>
                        <input
                          type="text"
                          required
                          value={optD}
                          onChange={(e) => setOptD(e.target.value)}
                          className="flex-1 bg-white border border-[#D5D5D5] rounded-xl px-2.5 py-1.5 text-xs text-zinc-900 font-mono"
                        />
                      </div>
                      <div className="flex items-center gap-2 sm:col-span-2">
                        <span className="w-6 h-6 rounded-lg bg-zinc-200 text-zinc-800 font-bold flex items-center justify-center shrink-0">E</span>
                        <input
                          type="text"
                          value={optE}
                          onChange={(e) => setOptE(e.target.value)}
                          placeholder="Opsi E (Opsional)"
                          className="flex-1 bg-white border border-[#D5D5D5] rounded-xl px-2.5 py-1.5 text-xs text-zinc-900 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#f7f7f8] border border-[#D5D5D5] p-3.5 rounded-2xl text-xs space-y-1">
                    <span className="font-bold text-zinc-900 block">Mode Uraian / Problem Solving (Babak Final)</span>
                    <p className="text-zinc-600 text-[11px]">
                      Peserta akan disajikan kolom input nilai akhir serta lembar uraian strategi penalaran.
                    </p>
                  </div>
                )}

                {/* Kunci Jawaban & Pembahasan */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-800 mb-1">
                      {newType === 'multiple_choice' ? 'Kunci Pilihan' : 'Kunci Jawaban Target'}
                    </label>
                    {newType === 'multiple_choice' ? (
                      <select
                        value={newCorrectAnswer}
                        onChange={(e) => setNewCorrectAnswer(e.target.value)}
                        className="w-full bg-white border border-[#D5D5D5] rounded-xl px-2.5 py-2 text-xs font-bold text-zinc-900 focus:outline-none focus:border-[#646464]"
                      >
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                        <option value="E">E</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        required
                        value={newCorrectAnswer}
                        onChange={(e) => setNewCorrectAnswer(e.target.value)}
                        placeholder="Contoh: p = 3"
                        className="w-full bg-white border border-[#D5D5D5] rounded-xl px-2.5 py-2 text-xs font-bold text-zinc-900 font-mono focus:outline-none focus:border-[#646464]"
                      />
                    )}
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-zinc-800 mb-1">
                      Pembahasan, Langkah Solusi, & Bukti
                    </label>
                    <textarea
                      rows={2}
                      value={newExplanation}
                      onChange={(e) => setNewExplanation(e.target.value)}
                      placeholder="Uraikan proses penalaran dan penarikan kesimpulan yang benar..."
                      className="w-full bg-white border border-[#D5D5D5] rounded-xl p-2.5 text-xs text-zinc-900 focus:outline-none focus:border-[#646464] font-mono leading-relaxed"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#646464] hover:bg-[#525252] text-white font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs mt-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  Simpan Soal ke Bank Soal MMO 2027
                </button>
              </form>
            </div>

            {/* Live KaTeX Preview Box */}
            <div className="lg:col-span-5 bg-white border border-[#D5D5D5] rounded-3xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#D5D5D5]">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#646464] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#646464]" />
                    Pratinjau Langsung (Live KaTeX Preview)
                  </span>
                  <span className="text-[10px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-full font-mono">
                    {newCategory} · {newStage}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="bg-[#f7f7f8] border border-[#D5D5D5] p-4 rounded-2xl">
                    <span className="text-[11px] font-bold text-zinc-500 block mb-1">
                      Tampilan Soal di Layar Peserta:
                    </span>
                    <div className="text-zinc-900 text-sm leading-relaxed overflow-x-auto">
                      <MathRenderer content={newText} />
                    </div>
                  </div>

                  {newType === 'multiple_choice' ? (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-zinc-500 block">Pilihan Jawaban:</span>
                      {[
                        { id: 'A', text: optA },
                        { id: 'B', text: optB },
                        { id: 'C', text: optC },
                        { id: 'D', text: optD },
                        ...(optE ? [{ id: 'E', text: optE }] : []),
                      ].map((item) => (
                        <div
                          key={item.id}
                          className={`p-2.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                            newCorrectAnswer === item.id
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold'
                              : 'bg-white border-zinc-200 text-zinc-800'
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] ${
                              newCorrectAnswer === item.id ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-700'
                            }`}
                          >
                            {item.id}
                          </span>
                          <div className="flex-1 overflow-x-auto">
                            <MathRenderer content={item.text} />
                          </div>
                          {newCorrectAnswer === item.id && (
                            <span className="text-[10px] font-bold text-emerald-700">KUNCI</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-[#fafafa] border border-dashed border-[#D5D5D5] p-3.5 rounded-2xl space-y-2 text-xs">
                      <span className="font-bold text-zinc-800 block">Pratinjau Lembar Uraian Final:</span>
                      <div className="p-2 bg-white border border-[#D5D5D5] rounded-xl text-zinc-500 text-[11px] font-mono">
                        Target Jawaban: <strong className="text-zinc-900">{newCorrectAnswer || '-'}</strong>
                      </div>
                      <div className="p-2.5 bg-white border border-[#D5D5D5] rounded-xl text-zinc-400 text-[11px] italic">
                        Peserta akan menuliskan langkah pembuktian dan strategi matematika di sini...
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-[#D5D5D5] text-[11px] text-zinc-500 flex items-center justify-between">
                <span>Total butir soal aktif: <strong className="text-zinc-900">{questionsList.length} butir</strong></span>
                <span className="font-mono text-zinc-700">Explore, Think, Excel</span>
              </div>
            </div>
          </div>

          {/* List & Management of Current Questions */}
          <div className="bg-[#fafafa] border border-[#D5D5D5] rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#D5D5D5]">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#646464]" />
                <div>
                  <h3 className="text-base font-bold text-zinc-900">
                    Daftar Butir Soal di Bank Soal MMO 2027
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Kelola, telusuri, hapus butir uji coba, atau kembalikan ke butir standar.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowWordImporterModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-[#646464] hover:bg-[#525252] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs border border-[#646464]"
                  title="Impor naskah soal dari berkas Word (.docx) dengan konversi KaTeX"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-300" />
                  <span>Impor Word (.docx)</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetQuestions}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-100 border border-[#D5D5D5] text-xs font-semibold text-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  title="Kembalikan butir soal ke standar resmi MMO 2027"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-zinc-500" />
                  Reset ke Standar Resmi
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Cari teks soal, materi, atau kata kunci..."
                  value={qbSearch}
                  onChange={(e) => setQbSearch(e.target.value)}
                  className="bg-white border border-[#D5D5D5] rounded-2xl px-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-[#646464] w-full"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Category Filter (Jenjang) */}
                <div className="flex items-center bg-white border border-[#D5D5D5] p-0.5 rounded-2xl shadow-2xs">
                  {(['ALL', 'SMP', 'SMA'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setQbCategoryFilter(cat)}
                      className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                        qbCategoryFilter === cat
                          ? 'bg-[#53585E] text-white shadow-xs'
                          : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                      }`}
                    >
                      {cat === 'ALL'
                        ? `Semua Jenjang (${questionsList.length})`
                        : `${cat} (${questionsList.filter((q) => q.category === cat).length})`}
                    </button>
                  ))}
                </div>

                {/* Stage Filter (Babak) */}
                <div className="flex items-center bg-white border border-[#D5D5D5] p-0.5 rounded-2xl shadow-2xs">
                  {(['ALL', 'Penyisihan', 'Semifinal', 'Final'] as const).map((stg) => (
                    <button
                      key={stg}
                      onClick={() => setQbStageFilter(stg)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                        qbStageFilter === stg
                          ? 'bg-[#53585E] text-white shadow-xs'
                          : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                      }`}
                    >
                      {stg === 'ALL'
                        ? `Semua Babak (${questionsList.length})`
                        : `${stg} (${questionsList.filter((q) => q.stage === stg).length})`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Combination Bar */}
            <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
              <span className="text-[11px] font-semibold text-zinc-500">Pilihan Cepat Paket:</span>
              <button
                type="button"
                onClick={() => {
                  setQbCategoryFilter('SMP');
                  setQbStageFilter('Penyisihan');
                }}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                  qbCategoryFilter === 'SMP' && qbStageFilter === 'Penyisihan'
                    ? 'bg-[#53585E] text-white border-[#53585E]'
                    : 'bg-white hover:bg-[#83B9DF]/15 text-[#53585E] border-[#D5D5D5] hover:border-[#83B9DF]'
                }`}
              >
                SMP · Penyisihan
              </button>
              <button
                type="button"
                onClick={() => {
                  setQbCategoryFilter('SMP');
                  setQbStageFilter('Semifinal');
                }}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                  qbCategoryFilter === 'SMP' && qbStageFilter === 'Semifinal'
                    ? 'bg-[#53585E] text-white border-[#53585E]'
                    : 'bg-white hover:bg-[#83B9DF]/15 text-[#53585E] border-[#D5D5D5] hover:border-[#83B9DF]'
                }`}
              >
                SMP · Semifinal
              </button>
              <button
                type="button"
                onClick={() => {
                  setQbCategoryFilter('SMA');
                  setQbStageFilter('Penyisihan');
                }}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                  qbCategoryFilter === 'SMA' && qbStageFilter === 'Penyisihan'
                    ? 'bg-[#53585E] text-white border-[#53585E]'
                    : 'bg-white hover:bg-[#83B9DF]/15 text-[#53585E] border-[#D5D5D5] hover:border-[#83B9DF]'
                }`}
              >
                SMA · Penyisihan
              </button>
              <button
                type="button"
                onClick={() => {
                  setQbCategoryFilter('SMA');
                  setQbStageFilter('Semifinal');
                }}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                  qbCategoryFilter === 'SMA' && qbStageFilter === 'Semifinal'
                    ? 'bg-[#53585E] text-white border-[#53585E]'
                    : 'bg-white hover:bg-[#83B9DF]/15 text-[#53585E] border-[#D5D5D5] hover:border-[#83B9DF]'
                }`}
              >
                SMA · Semifinal
              </button>
            </div>

            {/* Questions Items List */}
            <div className="space-y-3 pt-2">
              {questionsList
                .filter((q) => {
                  const matchCat = qbCategoryFilter === 'ALL' || q.category === qbCategoryFilter;
                  const matchStage = qbStageFilter === 'ALL' || q.stage === qbStageFilter;
                  const matchSearch =
                    !qbSearch.trim() ||
                    q.text.toLowerCase().includes(qbSearch.toLowerCase()) ||
                    q.domain.toLowerCase().includes(qbSearch.toLowerCase()) ||
                    q.correctAnswer.toLowerCase().includes(qbSearch.toLowerCase());
                  return matchCat && matchStage && matchSearch;
                })
                .map((q, idx) => (
                  <div
                    key={q.id}
                    className="bg-white border border-[#D5D5D5] p-4 rounded-2xl text-xs space-y-2 shadow-2xs hover:border-[#646464] transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-zinc-900">#{idx + 1}</span>
                        <span className="text-zinc-300">·</span>
                        <span className="bg-[#f7f7f8] text-zinc-700 font-semibold px-2 py-0.5 rounded-md border border-[#D5D5D5]">
                          {q.category}
                        </span>
                        <span className="bg-[#f7f7f8] text-zinc-700 px-2 py-0.5 rounded-md border border-[#D5D5D5]">
                          {q.domain}
                        </span>
                        {q.stage && (
                          <span className="bg-[#646464] text-white font-bold px-2 py-0.5 rounded-md text-[10px]">
                            {q.stage} ({q.focus})
                          </span>
                        )}
                        <span className="text-zinc-500 font-mono text-[11px]">
                          [{q.type === 'short_answer' ? 'Uraian' : 'PG'}]
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          Kunci: {q.correctAnswer}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Hapus butir soal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="text-zinc-800 leading-relaxed pt-1 overflow-x-auto">
                      <MathRenderer content={q.text} />
                    </div>

                    {q.options && q.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px] text-zinc-600">
                        {q.options.map((opt) => (
                          <div
                            key={opt.id}
                            className={`p-1.5 rounded-lg border ${
                              q.correctAnswer === opt.id
                                ? 'bg-emerald-50/60 border-emerald-300 text-emerald-900 font-semibold'
                                : 'bg-[#fafafa] border-zinc-200'
                            }`}
                          >
                            <span className="font-bold mr-1.5">{opt.id}.</span>
                            <MathRenderer content={opt.text} inline />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Share Exam Link Modal */}
      <ShareExamLinkModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      {/* Enlarged Camera Feed Modal */}
      {expandedCameraParticipant && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl p-6 text-white relative animate-in fade-in">
            <button
              onClick={() => setExpandedCameraParticipant(null)}
              className="absolute top-4 right-4 p-2 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <h3 className="text-base font-bold text-white leading-tight">
                  {expandedCameraParticipant.name}
                </h3>
                <p className="text-xs text-zinc-400">
                  {expandedCameraParticipant.school} · {expandedCameraParticipant.category}
                </p>
              </div>
            </div>

            <div className="aspect-video bg-black rounded-2xl overflow-hidden relative flex items-center justify-center border border-zinc-800 mb-4">
              {expandedCameraParticipant.cameraSnapshot ? (
                <img
                  src={expandedCameraParticipant.cameraSnapshot}
                  alt={expandedCameraParticipant.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center p-6 text-zinc-400">
                  <CameraOff className="w-10 h-10 mx-auto mb-2 text-zinc-600" />
                  <p className="text-sm">Tidak ada aliran kamera aktif</p>
                </div>
              )}
              <div className="absolute top-3 left-3 bg-black/70 px-2.5 py-1 rounded-xl text-xs font-mono text-emerald-400">
                ● SIARAN LANGSUNG (LIVE PROCTOR)
              </div>
              <div className="absolute bottom-3 left-3 bg-black/70 px-2.5 py-1 rounded-xl text-xs font-mono text-zinc-300">
                Integritas: {expandedCameraParticipant.trustScore}% · Strikes: {expandedCameraParticipant.strikeCount}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setExpandedCameraParticipant(null)}
                className="px-5 py-2 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold cursor-pointer transition-colors"
              >
                Tutup Tampilan Kamera
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Rincian Jawaban & Nilai Peserta */}
      {inspectingScoresParticipant && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#D5D5D5] rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl text-zinc-900 relative animate-in fade-in overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="p-6 bg-[#fafafa] border-b border-[#D5D5D5] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-[#646464] text-white px-2.5 py-0.5 rounded-lg">
                    Rincian Hasil Ujian
                  </span>
                  <span className="text-zinc-400">·</span>
                  <span className="text-xs text-zinc-500 font-mono">
                    ID: {inspectingScoresParticipant.id}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-zinc-900 tracking-tight">
                  {inspectingScoresParticipant.name}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {inspectingScoresParticipant.school} · Kategori: <strong>{inspectingScoresParticipant.category}</strong>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right bg-white border border-[#D5D5D5] px-4 py-2 rounded-2xl shadow-2xs">
                  <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                    Skor Akhir
                  </span>
                  <span className="text-xl font-extrabold font-mono tabular-nums text-emerald-700">
                    {inspectingScoresParticipant.score !== undefined
                      ? `${inspectingScoresParticipant.score > 0 ? '+' : ''}${inspectingScoresParticipant.score}`
                      : '0'}{' '}
                    <span className="text-xs font-normal text-zinc-500 font-sans">Poin</span>
                  </span>
                </div>

                <button
                  onClick={() => setInspectingScoresParticipant(null)}
                  className="p-2 rounded-2xl bg-[#f7f7f8] hover:bg-zinc-200 border border-[#D5D5D5] text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
                  title="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Stats Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4 bg-[#f7f7f8] border-b border-[#D5D5D5] text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-[#D5D5D5] text-center">
                <span className="text-zinc-500 text-[10px] block">Benar (+4)</span>
                <span className="font-bold text-emerald-700 text-sm font-mono">
                  {inspectingScoresParticipant.correctCount ?? 0} Soal
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-[#D5D5D5] text-center">
                <span className="text-zinc-500 text-[10px] block">Salah (-1)</span>
                <span className="font-bold text-rose-600 text-sm font-mono">
                  {inspectingScoresParticipant.wrongCount ?? 0} Soal
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-[#D5D5D5] text-center">
                <span className="text-zinc-500 text-[10px] block">Kosong (0)</span>
                <span className="font-bold text-zinc-700 text-sm font-mono">
                  {inspectingScoresParticipant.blankCount ??
                    Math.max(
                      0,
                      (inspectingScoresParticipant.totalQuestions || 0) -
                        (inspectingScoresParticipant.correctCount ?? 0) -
                        (inspectingScoresParticipant.wrongCount ?? 0)
                    )}{' '}
                  Soal
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-[#D5D5D5] text-center">
                <span className="text-zinc-500 text-[10px] block">Durasi Pengerjaan</span>
                <span className="font-bold text-zinc-800 text-xs font-mono">
                  {inspectingScoresParticipant.durationTaken || '-'}
                </span>
              </div>
            </div>

            {/* Questions Detailed Breakdown */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                Rincian Analisis Jawaban Tiap Butir Soal:
              </h4>

              {(() => {
                const relevantQuestions = questionsList.filter(
                  (q) => q.category === inspectingScoresParticipant.category
                );

                if (relevantQuestions.length === 0) {
                  return (
                    <div className="p-6 text-center text-xs text-zinc-500 bg-[#fafafa] rounded-2xl border border-[#D5D5D5]">
                      Tidak ada butir soal yang sesuai dengan kategori peserta ini.
                    </div>
                  );
                }

                return relevantQuestions.map((q, idx) => {
                  const qRes = inspectingScoresParticipant.perQuestionScores?.[q.id];
                  const userAnswer = qRes?.userAnswer || '-';
                  const isCorrect = qRes?.isCorrect;
                  const scoreGained = qRes?.score ?? 0;
                  const isBlank = userAnswer === '-' || !userAnswer.trim();

                  return (
                    <div
                      key={q.id}
                      className={`p-4 rounded-2xl border text-xs space-y-3 transition-colors ${
                        isCorrect
                          ? 'bg-emerald-50/40 border-emerald-300'
                          : isBlank
                          ? 'bg-[#fafafa] border-zinc-200'
                          : 'bg-rose-50/40 border-rose-300'
                      }`}
                    >
                      {/* Question Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-200/80">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-zinc-900 text-sm">
                            Soal #{idx + 1}
                          </span>
                          <span className="text-zinc-300">·</span>
                          <span className="px-2 py-0.5 rounded-md bg-white border border-[#D5D5D5] text-zinc-700 font-semibold text-[10px]">
                            {q.domain}
                          </span>
                          {q.focus && (
                            <span className="px-2 py-0.5 rounded-md bg-[#646464] text-white text-[10px]">
                              {q.focus}
                            </span>
                          )}
                        </div>

                        {/* Result Badge */}
                        <div className="flex items-center gap-2">
                          {isCorrect ? (
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-xl text-xs">
                              <Check className="w-3.5 h-3.5 text-emerald-700" />
                              Benar (+4 Poin)
                            </span>
                          ) : isBlank ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-zinc-600 bg-zinc-200/80 px-2.5 py-0.5 rounded-xl text-xs">
                              Tidak Dijawab (0 Poin)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-bold text-rose-800 bg-rose-100 border border-rose-300 px-2.5 py-0.5 rounded-xl text-xs">
                              <X className="w-3.5 h-3.5 text-rose-700" />
                              Salah (-1 Poin)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Question Text */}
                      <div className="text-zinc-800 leading-relaxed overflow-x-auto">
                        <MathRenderer content={q.text} />
                      </div>

                      {/* Answers Comparison Box */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                        <div
                          className={`p-2.5 rounded-xl border ${
                            isCorrect
                              ? 'bg-emerald-100/70 border-emerald-300 text-emerald-950'
                              : isBlank
                              ? 'bg-zinc-100 border-zinc-200 text-zinc-600'
                              : 'bg-rose-100/70 border-rose-300 text-rose-950'
                          }`}
                        >
                          <span className="text-[10px] uppercase font-semibold text-zinc-500 block">
                            Jawaban Peserta
                          </span>
                          <span className="font-bold font-mono text-sm">
                            {userAnswer}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl border bg-emerald-50/70 border-emerald-300 text-emerald-950">
                          <span className="text-[10px] uppercase font-semibold text-emerald-800 block">
                            Kunci Jawaban Resmi
                          </span>
                          <span className="font-bold font-mono text-sm">
                            {q.correctAnswer}
                          </span>
                        </div>
                      </div>

                      {/* Explanation */}
                      {q.explanation && (
                        <div className="bg-white/80 border border-zinc-200 p-3 rounded-xl text-[11px] text-zinc-700 leading-relaxed">
                          <strong className="text-zinc-900 block mb-0.5">
                            Pembahasan Resmi:
                          </strong>
                          <MathRenderer content={q.explanation} />
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#fafafa] border-t border-[#D5D5D5] flex items-center justify-between">
              <button
                onClick={handleExportExcelGrades}
                className="px-3.5 py-2 rounded-2xl bg-white hover:bg-zinc-100 border border-[#D5D5D5] text-xs font-semibold text-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700" />
                <span>Unduh Semua Rekap ke Excel</span>
              </button>

              <button
                onClick={() => setInspectingScoresParticipant(null)}
                className="px-5 py-2 rounded-2xl bg-[#646464] hover:bg-[#525252] text-white text-xs font-semibold cursor-pointer transition-colors shadow-xs"
              >
                Tutup Rincian
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zoom 2-Device Proctoring Settings Modal */}
      {isZoomSettingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D5D5D5] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#D5D5D5] flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-xs">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    Pengaturan Pengawasan Zoom (2 Divais)
                  </h3>
                  <p className="text-[11px] text-sky-200">
                    MMO 2027 · Ruang Pengawas & Juri
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsZoomSettingsModalOpen(false)}
                className="p-1 rounded-xl text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs text-zinc-700">
              <div className="p-3 bg-sky-50 border border-sky-200 rounded-2xl text-sky-900 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-sky-700" />
                  Instruksi 2 Perangkat untuk Peserta:
                </span>
                <p className="text-[11px] leading-relaxed text-sky-800">
                  Peserta mengerjakan soal di Laptop atau HP utama, dan menyalakan kamera Zoom pengawas melalui HP kedua yang diletakkan di samping meja (sudut 45° menghadap layar dan tangan peserta).
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-800 mb-1">
                    Meeting ID Zoom
                  </label>
                  <input
                    type="text"
                    value={zoomMeetingId}
                    onChange={(e) => setZoomMeetingId(e.target.value)}
                    className="w-full bg-[#f7f7f8] border border-[#D5D5D5] rounded-xl px-3 py-2 font-mono text-zinc-900 text-xs focus:outline-none focus:border-[#646464] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-800 mb-1">
                    Passcode Zoom
                  </label>
                  <input
                    type="text"
                    value={zoomPasscode}
                    onChange={(e) => setZoomPasscode(e.target.value)}
                    className="w-full bg-[#f7f7f8] border border-[#D5D5D5] rounded-xl px-3 py-2 font-mono text-zinc-900 text-xs focus:outline-none focus:border-[#646464] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-800 mb-1">
                    Tautan / Link Join Zoom
                  </label>
                  <input
                    type="text"
                    value={zoomJoinUrl}
                    onChange={(e) => setZoomJoinUrl(e.target.value)}
                    className="w-full bg-[#f7f7f8] border border-[#D5D5D5] rounded-xl px-3 py-2 font-mono text-zinc-900 text-xs focus:outline-none focus:border-[#646464] focus:bg-white"
                  />
                </div>
              </div>

              {/* Broadcast reminder button */}
              <div className="pt-2 border-t border-[#D5D5D5] flex flex-col gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const notice = 'Pemberitahuan Pengawas: Peserta dengan mode 2 perangkat mohon pastikan kamera Zoom di HP kedua tetap aktif mengarah ke meja ujian.';
                    await ApiService.sendBroadcast(notice);
                    setBroadcastNotice('Pemberitahuan Zoom berhasil disiarkan ke semua layar peserta!');
                    setTimeout(() => setBroadcastNotice(null), 4000);
                  }}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Radio className="w-3.5 h-3.5 text-amber-700" />
                  <span>Kirimkan Pengingat Kamera Zoom ke Semua Peserta</span>
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#fafafa] border-t border-[#D5D5D5] flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Undangan Pengawasan Zoom MMO 2027 UMM:\nLink: ${zoomJoinUrl}\nMeeting ID: ${zoomMeetingId}\nPasscode: ${zoomPasscode}`
                  );
                  setZoomCopied(true);
                  setTimeout(() => setZoomCopied(false), 2500);
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white hover:bg-zinc-100 border border-[#D5D5D5] text-zinc-800 font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                {zoomCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{zoomCopied ? 'Tersalin!' : 'Salin Info Zoom'}</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <a
                  href={zoomJoinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Zoom</span>
                </a>
                <button
                  type="button"
                  onClick={() => setIsZoomSettingsModalOpen(false)}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-[#646464] hover:bg-[#525252] text-white font-semibold text-xs cursor-pointer shadow-xs"
                >
                  Selesai
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Word Importer Modal */}
      <WordImporter
        isOpen={showWordImporterModal}
        onClose={() => setShowWordImporterModal(false)}
        onQuestionsImported={handleQuestionsImportedFromWord}
        initialCategory={qbCategoryFilter === 'SMP' ? 'SMP' : 'SMA'}
      />
    </div>
  );
};
