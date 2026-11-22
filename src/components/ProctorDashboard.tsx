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
  QrCode,
  Camera,
  CameraOff,
  Maximize2,
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
  Layers,
  BarChart3,
  PieChart,
  Edit3,
  Plus,
  FileJson,
  MessageSquareText,
  RefreshCw,
  Link2,
} from 'lucide-react';
import { sanitizeQuestionsList } from '../utils/mathSanitizer';
import { exportQuestionsToExcelBlob, exportQuestionsToJsonBlob } from '../utils/questionSpreadsheet';
import {
  exportFeedbackToCsvBlob,
  exportFeedbackToExcelBlob,
  GOOGLE_APPS_SCRIPT_FEEDBACK_TEMPLATE,
} from '../utils/feedbackSpreadsheet';
import { ApiService } from '../services/api';
import { ShareExamLinkModal } from './ShareExamLinkModal';
import { WordQuestionImporter } from './WordQuestionImporter';
import { QuestionEditorModal } from './QuestionEditorModal';
import {
  LiveParticipantMonitoring,
  OlympiadCategory,
  Question,
  MathDomain,
  CompetitionStage,
  RegisteredParticipant,
  SiteFeedbackEntry,
} from '../types';
import { MathRenderer } from './MathRenderer';
import { MmoLogo } from './MmoLogo';
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
  ExamGateMatrix,
} from '../services/registeredParticipants';

interface ProctorDashboardProps {
  onBackToPortal: () => void;
  questions?: Question[];
  onQuestionsChange?: (questions: Question[]) => void;
}

export const ProctorDashboard: React.FC<ProctorDashboardProps> = ({
  onBackToPortal,
  questions: externalQuestions,
  onQuestionsChange,
}) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('mmo_proctor_auth') === 'true';
  });
  const [loginUsername, setLoginUsername] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Active view tab in dashboard: 'monitoring' | 'question_manager' | 'results_recap' | 'registration_sheets' | 'feedback'
  const [activeTab, setActiveTab] = useState<
    'monitoring' | 'question_manager' | 'results_recap' | 'registration_sheets' | 'feedback'
  >('monitoring');

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

  // Master Exam Gate State & 4-Gate Matrix (SMP/SMA x Penyisihan/Semifinal)
  const [isExamGateOpen, setIsExamGateOpen] = useState<boolean>(false);
  const [gateMatrix, setGateMatrix] = useState<ExamGateMatrix>({
    'SMP_Penyisihan': false,
    'SMP_Semifinal': false,
    'SMA_Penyisihan': false,
    'SMA_Semifinal': false,
  });
  const [isTogglingGate, setIsTogglingGate] = useState<boolean>(false);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
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
          if (res.gateMatrix) {
            setGateMatrix(res.gateMatrix);
          }
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

  const handleToggleSpecificGate = async (key: keyof ExamGateMatrix) => {
    setTogglingKey(key);
    const targetStatus = !gateMatrix[key];
    const category = key.startsWith('SMP') ? 'SMP' : 'SMA';
    const stage = key.endsWith('Penyisihan') ? 'Penyisihan' : 'Semifinal';
    try {
      const res = await setExamGateStatusOnline(targetStatus, examPasscode, {
        gateKey: key,
        gateValue: targetStatus,
      });
      setIsExamGateOpen(res.isOpen);
      setGateMatrix(res.gateMatrix);
      if (res.source) setGateSource(res.source);
      setBroadcastNotice(
        targetStatus
          ? `🔓 Akses Soal ${category} · Babak ${stage} resmi DIBUKA! Peserta yang memilih ${category} ${stage} dapat langsung mengerjakan.`
          : `🔒 Akses Soal ${category} · Babak ${stage} DIKUNCI! Peserta ${category} ${stage} akan tertahan di Ruang Tunggu.`
      );
      setTimeout(() => setBroadcastNotice(null), 5000);
    } catch (err) {
      console.warn('Error toggling specific gate:', err);
      setGateMatrix((prev) => ({ ...prev, [key]: targetStatus }));
      setBroadcastNotice(
        targetStatus
          ? `🔓 Akses Soal ${category} · Babak ${stage} DIBUKA (Mode Cadangan Lokal).`
          : `🔒 Akses Soal ${category} · Babak ${stage} DIKUNCI.`
      );
      setTimeout(() => setBroadcastNotice(null), 5000);
    } finally {
      setTogglingKey(null);
    }
  };

  const handleOpenAllGates = async () => {
    setIsTogglingGate(true);
    try {
      const res = await setExamGateStatusOnline(true, examPasscode, { applyAll: true });
      setIsExamGateOpen(true);
      setGateMatrix(res.gateMatrix);
      if (res.source) setGateSource(res.source);
      setBroadcastNotice('🔓 SEMUA AKSES SOAL (SMP & SMA — Penyisihan & Semifinal) resmi DIBUKA!');
      setTimeout(() => setBroadcastNotice(null), 5000);
    } catch (err) {
      console.warn('Error opening all gates:', err);
      setIsExamGateOpen(true);
      setGateMatrix({
        'SMP_Penyisihan': true,
        'SMP_Semifinal': true,
        'SMA_Penyisihan': true,
        'SMA_Semifinal': true,
      });
      setBroadcastNotice('🔓 SEMUA AKSES SOAL resmi DIBUKA (Mode Cadangan Lokal).');
      setTimeout(() => setBroadcastNotice(null), 5000);
    } finally {
      setIsTogglingGate(false);
    }
  };

  const handleLockAllGates = async () => {
    setIsTogglingGate(true);
    try {
      const res = await setExamGateStatusOnline(false, examPasscode, { applyAll: true });
      setIsExamGateOpen(false);
      setGateMatrix(res.gateMatrix);
      if (res.source) setGateSource(res.source);
      setBroadcastNotice('🔒 SEMUA AKSES SOAL resmi DIKUNCI. Seluruh peserta akan tertahan di Ruang Tunggu.');
      setTimeout(() => setBroadcastNotice(null), 5000);
    } catch (err) {
      console.warn('Error locking all gates:', err);
      setIsExamGateOpen(false);
      setGateMatrix({
        'SMP_Penyisihan': false,
        'SMP_Semifinal': false,
        'SMA_Penyisihan': false,
        'SMA_Semifinal': false,
      });
      setBroadcastNotice('🔒 SEMUA AKSES SOAL resmi DIKUNCI.');
      setTimeout(() => setBroadcastNotice(null), 5000);
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

  // Question Bank state & management
  const [localFallbackQuestions, setLocalFallbackQuestions] = useState<Question[]>(() =>
    sanitizeQuestionsList(INITIAL_QUESTIONS_DATA)
  );
  const questionsList = useMemo<Question[]>(() => {
    const raw = externalQuestions !== undefined ? externalQuestions : localFallbackQuestions;
    return sanitizeQuestionsList(raw);
  }, [externalQuestions, localFallbackQuestions]);

  const applyQuestionsUpdate = (nextList: Question[]) => {
    const clean = sanitizeQuestionsList(nextList);
    setLocalFallbackQuestions(clean);
    onQuestionsChange?.(clean);
  };

  const [previewQuestionImage, setPreviewQuestionImage] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isEditorModalOpen, setIsEditorModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [confirmClearModal, setConfirmClearModal] = useState<'clear' | 'reset' | null>(null);
  const [qbNotification, setQbNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!isImportModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsImportModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isImportModalOpen]);

  // Question bank view filters
  const [qbCategoryFilter, setQbCategoryFilter] = useState<'ALL' | OlympiadCategory>('ALL');
  const [qbStageFilter, setQbStageFilter] = useState<'ALL' | CompetitionStage>('ALL');
  const [qbDomainFilter, setQbDomainFilter] = useState<'ALL' | MathDomain>('ALL');
  const [qbSearch, setQbSearch] = useState<string>('');

  const showQbBanner = (type: 'success' | 'error', text: string) => {
    setQbNotification({ type, text });
    setTimeout(() => setQbNotification(null), 5000);
  };

  const handleSaveWordBatch = async (
    batch: Question[],
    mode: 'append' | 'replace_all' | 'replace_packet',
    category: OlympiadCategory,
    stage: CompetitionStage
  ): Promise<boolean> => {
    const res = await ApiService.bulkSaveQuestions(batch, mode, category, stage);
    if (res.success && Array.isArray(res.data)) {
      applyQuestionsUpdate(res.data);
      showQbBanner('success', `${batch.length} soal berhasil disimpan ke Bank Soal aktif.`);
      return true;
    }
    showQbBanner('error', res.error || 'Gagal menyimpan soal ke server.');
    return false;
  };

  const handleSaveSingleQuestion = async (question: Question, isEdit: boolean) => {
    if (isEdit) {
      const res = await ApiService.updateQuestion(question.id, question);
      if (res.success && Array.isArray(res.data)) {
        applyQuestionsUpdate(res.data);
        showQbBanner('success', `Soal #${question.questionNumber} berhasil diperbarui.`);
      } else {
        throw new Error(res.error || 'Gagal memperbarui soal.');
      }
    } else {
      const res = await ApiService.addQuestion(question);
      if (res.success && Array.isArray(res.data)) {
        applyQuestionsUpdate(res.data);
        showQbBanner('success', `Soal baru #${question.questionNumber} berhasil ditambahkan.`);
      } else {
        throw new Error(res.error || 'Gagal menambahkan soal.');
      }
    }
  };

  const handleDeleteQuestion = async (id: string, num: number) => {
    const res = await ApiService.deleteQuestion(id);
    if (res.success && Array.isArray(res.data)) {
      applyQuestionsUpdate(res.data);
      showQbBanner('success', `Soal #${num} dihapus dari Bank Soal.`);
    } else {
      showQbBanner('error', res.error || 'Gagal menghapus soal.');
    }
  };

  const handleConfirmClearOrReset = async () => {
    if (confirmClearModal === 'clear') {
      const res = await ApiService.clearAllQuestions();
      if (res.success) {
        applyQuestionsUpdate([]);
        showQbBanner('success', 'Seluruh Bank Soal telah dikosongkan. Siap mengunggah soal baru dari Word.');
      } else {
        showQbBanner('error', res.error || 'Gagal mengosongkan Bank Soal.');
      }
    } else if (confirmClearModal === 'reset') {
      const res = await ApiService.resetQuestions();
      if (res.success && Array.isArray(res.data)) {
        applyQuestionsUpdate(res.data);
        showQbBanner('success', 'Bank Soal dipulihkan ke paket soal bawaan MMO 2027.');
      } else {
        showQbBanner('error', res.error || 'Gagal mereset Bank Soal.');
      }
    }
    setConfirmClearModal(null);
  };

  const handleExportQuestionsExcel = () => {
    if (questionsList.length === 0) {
      showQbBanner('error', 'Bank Soal masih kosong. Impor atau tambahkan soal terlebih dahulu sebelum mengekspor.');
      return;
    }
    const blob = exportQuestionsToExcelBlob(questionsList);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `Bank_Soal_MMO2027_${dateStamp}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showQbBanner('success', `${questionsList.length} butir soal berhasil diekspor ke berkas Excel (.xlsx).`);
  };

  const handleExportQuestionsJson = () => {
    if (questionsList.length === 0) {
      showQbBanner('error', 'Bank Soal masih kosong. Impor atau tambahkan soal terlebih dahulu sebelum mengekspor.');
      return;
    }
    const blob = exportQuestionsToJsonBlob(questionsList);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `Bank_Soal_MMO2027_${dateStamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showQbBanner('success', `${questionsList.length} butir soal berhasil diekspor ke format JSON terstruktur.`);
  };

  // Comprehensive Question Bank Statistics
  const questionBankStats = useMemo(() => {
    const total = questionsList.length;
    const smpTotal = questionsList.filter((q) => q.category === 'SMP').length;
    const smaTotal = questionsList.filter((q) => q.category === 'SMA').length;

    const smpPenyisihan = questionsList.filter((q) => q.category === 'SMP' && q.stage === 'Penyisihan').length;
    const smpSemifinal = questionsList.filter((q) => q.category === 'SMP' && q.stage === 'Semifinal').length;

    const smaPenyisihan = questionsList.filter((q) => q.category === 'SMA' && q.stage === 'Penyisihan').length;
    const smaSemifinal = questionsList.filter((q) => q.category === 'SMA' && q.stage === 'Semifinal').length;

    const penyisihanTotal = questionsList.filter((q) => q.stage === 'Penyisihan').length;
    const semifinalTotal = questionsList.filter((q) => q.stage === 'Semifinal').length;

    const domainCounts: Record<MathDomain, number> = {
      'Aljabar': questionsList.filter((q) => q.domain === 'Aljabar').length,
      'Geometri': questionsList.filter((q) => q.domain === 'Geometri').length,
      'Kombinatorika': questionsList.filter((q) => q.domain === 'Kombinatorika').length,
      'Teori Bilangan': questionsList.filter((q) => q.domain === 'Teori Bilangan').length,
    };

    const typeCounts = {
      multiple_choice: questionsList.filter((q) => q.type === 'multiple_choice' || !q.type).length,
      short_answer: questionsList.filter((q) => q.type === 'short_answer').length,
    };

    const formatCounts = {
      withImage: questionsList.filter((q) => Boolean(q.imageUrl)).length,
      textOnly: questionsList.filter((q) => !q.imageUrl).length,
    };

    return {
      total,
      smpTotal,
      smaTotal,
      smpPenyisihan,
      smpSemifinal,
      smaPenyisihan,
      smaSemifinal,
      penyisihanTotal,
      semifinalTotal,
      domainCounts,
      typeCounts,
      formatCounts,
    };
  }, [questionsList]);

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

  // Post-Exam Website Feedback & Spreadsheet Webhook State
  const [feedbackList, setFeedbackList] = useState<SiteFeedbackEntry[]>([]);
  const [feedbackWebhookUrl, setFeedbackWebhookUrl] = useState<string>('');
  const [feedbackWebhookInput, setFeedbackWebhookInput] = useState<string>('');
  const [isLoadingFeedback, setIsLoadingFeedback] = useState<boolean>(false);
  const [isSavingWebhook, setIsSavingWebhook] = useState<boolean>(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState<boolean>(false);
  const [isSyncingAllFeedback, setIsSyncingAllFeedback] = useState<boolean>(false);
  const [syncingFeedbackId, setSyncingFeedbackId] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showAppsScriptGuide, setShowAppsScriptGuide] = useState<boolean>(false);
  const [scriptCopied, setScriptCopied] = useState<boolean>(false);
  const [feedbackSearchQuery, setFeedbackSearchQuery] = useState<string>('');
  const [feedbackCategoryFilter, setFeedbackCategoryFilter] = useState<'ALL' | 'SMP' | 'SMA'>('ALL');
  const [confirmClearFeedbackModal, setConfirmClearFeedbackModal] = useState<boolean>(false);

  const loadFeedbackData = async (silent = false) => {
    if (!silent) setIsLoadingFeedback(true);
    try {
      const res = await ApiService.getSiteFeedbackList();
      setFeedbackList(res.data);
      setFeedbackWebhookUrl(res.webhookUrl);
      setFeedbackWebhookInput((prev) => (prev === '' && res.webhookUrl ? res.webhookUrl : prev || res.webhookUrl));
    } finally {
      if (!silent) setIsLoadingFeedback(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    loadFeedbackData(true);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'feedback') return;
    loadFeedbackData(false);
  }, [isAuthenticated, activeTab]);

  const filteredFeedbackList = useMemo(() => {
    const q = feedbackSearchQuery.trim().toLowerCase();
    return feedbackList.filter((item) => {
      if (feedbackCategoryFilter !== 'ALL' && item.category !== feedbackCategoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.participantName.toLowerCase().includes(q) ||
        item.school.toLowerCase().includes(q) ||
        item.nisnOrRegNumber.toLowerCase().includes(q) ||
        item.message.toLowerCase().includes(q)
      );
    });
  }, [feedbackList, feedbackCategoryFilter, feedbackSearchQuery]);

  const feedbackStats = useMemo(() => {
    const total = feedbackList.length;
    const synced = feedbackList.filter((item) => item.webhookStatus === 'synced').length;
    const pending = total - synced;
    return { total, synced, pending };
  }, [feedbackList]);

  const handleSaveFeedbackWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingWebhook(true);
    setFeedbackBanner(null);
    const res = await ApiService.saveFeedbackWebhookUrl(feedbackWebhookInput);
    setIsSavingWebhook(false);
    if (res.success) {
      const savedUrl = res.webhookUrl || '';
      setFeedbackWebhookUrl(savedUrl);
      setFeedbackWebhookInput(savedUrl);
      setFeedbackBanner({
        type: 'success',
        message: savedUrl
          ? 'URL Webhook Google Sheets berhasil disimpan. Pesan peserta berikutnya otomatis masuk ke Spreadsheet.'
          : 'URL Webhook Google Sheets dikosongkan. Pesan tetap tersimpan di server & bisa diekspor ke Excel.',
      });
    } else {
      setFeedbackBanner({
        type: 'error',
        message: res.error || 'Gagal menyimpan URL Webhook.',
      });
    }
  };

  const handleTestFeedbackWebhook = async () => {
    setIsTestingWebhook(true);
    setFeedbackBanner(null);
    const res = await ApiService.testFeedbackWebhook(feedbackWebhookInput);
    setIsTestingWebhook(false);
    if (res.success) {
      setFeedbackBanner({
        type: 'success',
        message: res.message || 'Uji koneksi ke Google Sheets berhasil!',
      });
    } else {
      setFeedbackBanner({
        type: 'error',
        message: res.error || 'Gagal mengirim baris uji ke Google Sheets.',
      });
    }
  };

  const handleSyncAllFeedback = async () => {
    setIsSyncingAllFeedback(true);
    setFeedbackBanner(null);
    const res = await ApiService.syncAllFeedbackToWebhook();
    setIsSyncingAllFeedback(false);
    if (res.success && Array.isArray(res.data)) {
      setFeedbackList(res.data);
      const synced = res.syncedCount ?? 0;
      const failed = res.failedCount ?? 0;
      setFeedbackBanner({
        type: failed > 0 ? 'error' : 'success',
        message:
          failed > 0
            ? `${synced} pesan terkirim, ${failed} pesan masih gagal (${res.lastError || 'periksa deployment Apps Script'}).`
            : synced > 0
            ? `${synced} pesan berhasil disinkronkan ke Google Sheets.`
            : 'Semua pesan sudah tersinkron di Google Sheets.',
      });
    } else {
      setFeedbackBanner({
        type: 'error',
        message: res.error || 'Gagal menyinkronkan pesan ke Google Sheets.',
      });
    }
  };

  const handleSyncSingleFeedback = async (id: string) => {
    setSyncingFeedbackId(id);
    setFeedbackBanner(null);
    const res = await ApiService.syncSingleFeedbackToWebhook(id);
    setSyncingFeedbackId(null);
    if (res.data) {
      setFeedbackList((prev) => prev.map((item) => (item.id === id ? res.data! : item)));
    }
    if (res.success) {
      setFeedbackBanner({
        type: 'success',
        message: 'Pesan berhasil dikirim ulang ke Google Sheets.',
      });
    } else {
      setFeedbackBanner({
        type: 'error',
        message: res.error || 'Gagal mengirim ulang pesan ke Google Sheets.',
      });
    }
  };

  const handleDeleteSingleFeedback = async (id: string) => {
    const ok = await ApiService.deleteSiteFeedback(id);
    if (ok) {
      setFeedbackList((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const handleConfirmClearAllFeedback = async () => {
    const ok = await ApiService.clearAllSiteFeedback();
    setConfirmClearFeedbackModal(false);
    if (ok) {
      setFeedbackList([]);
      setFeedbackBanner({
        type: 'success',
        message: 'Seluruh daftar pesan & saran di server telah dikosongkan.',
      });
    }
  };

  const handleExportFeedbackExcel = () => {
    const blob = exportFeedbackToExcelBlob(feedbackList);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Pesan_Saran_Website_MMO_2027_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportFeedbackCsv = () => {
    const blob = exportFeedbackToCsvBlob(feedbackList);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Pesan_Saran_Website_MMO_2027_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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

  // ========================================================
  // RENDER LOGIN GATE IF NOT AUTHENTICATED
  // ========================================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-[#2C4B6B]/95 border-2 border-[#E49548] rounded-3xl p-6 sm:p-8 shadow-2xl text-white">
          <MmoLogo size="lg" className="mx-auto mb-4 shadow-md" />

          <div className="text-center mb-6">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-[#F4E6CC] text-[#1E3954] px-3 py-0.5 rounded-lg inline-block mb-2">
              Portal Panitia MMO 2027
            </span>
            <h2 className="text-xl font-extrabold text-white">
              Autentikasi Pengawas Ujian
            </h2>
            <p className="text-xs text-[#DCE9F5] mt-1">
              Masukkan kredensial pengawas resmi HMPS Pendidikan Matematika UMM.
            </p>
          </div>

          {loginError && (
            <div className="mb-4 bg-rose-50 border border-rose-300 text-rose-800 p-3 rounded-2xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#F4E6CC] mb-1">
                Nama Pengawas
              </label>
              <input
                type="text"
                required
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="Masukkan username (Default: alfa)"
                className="w-full bg-white border-2 border-[#B8CCE0] rounded-2xl px-3.5 py-2.5 text-xs text-[#1E3954] placeholder-slate-400 focus:outline-none focus:border-[#E49548] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#F4E6CC] mb-1">
                Kata Sandi
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Masukkan password (Default: MMO2027sukses)"
                className="w-full bg-white border-2 border-[#B8CCE0] rounded-2xl px-3.5 py-2.5 text-xs text-[#1E3954] placeholder-slate-400 focus:outline-none focus:border-[#E49548] font-mono transition-colors"
              />
            </div>

            <div className="bg-[#243E59] border border-[#E49548]/60 p-3 rounded-2xl text-[11px] text-[#DCE9F5] space-y-0.5">
              <div>Kredensial Pengawas:</div>
              <div className="font-mono text-[#F4E6CC]">Nama: <strong>alfa</strong> · Sandi: <strong>MMO2027sukses</strong></div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#E49548] hover:bg-[#CE7D30] text-[#1E3954] font-extrabold text-xs rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md mt-2 border border-[#F4E6CC]/40"
            >
              <LogIn className="w-4 h-4" />
              Masuk ke Dasbor Pengawas
            </button>

            <button
              type="button"
              onClick={onBackToPortal}
              className="w-full py-2.5 text-xs text-[#DCE9F5] hover:text-[#F4E6CC] transition-colors cursor-pointer text-center font-semibold"
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
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6">
      {/* Header Bar with Steel-Blue & Amber Poster Theme */}
      <div className="bg-[#2C4B6B]/95 border-2 border-[#E49548] rounded-3xl p-5 sm:p-6 shadow-xl text-white flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <MmoLogo size="lg" className="shadow-md hidden sm:flex" />
          <div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#F4E6CC]">
                Live Monitoring &amp; Pengawasan · MMO 2027 UMM
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight mt-1">
              Dasbor Pengawas Panitia (MMO 2027)
            </h1>
            <p className="text-xs text-[#DCE9F5] mt-0.5">
              HMPS Pendidikan Matematika UMM Bidang Keilmuan · Login sebagai: <strong className="text-[#F4E6CC]">alfa</strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Tab Switcher */}
          <div className="flex flex-wrap items-center bg-[#243E59] border border-[#E49548]/70 p-1 rounded-2xl text-xs gap-0.5">
            <button
              onClick={() => setActiveTab('monitoring')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'monitoring'
                  ? 'bg-[#F4E6CC] text-[#1E3954] shadow-xs font-extrabold'
                  : 'text-[#DCE9F5] hover:text-white hover:bg-[#3B5F84]/60 font-medium'
              }`}
            >
              Monitoring Peserta
            </button>
            <button
              onClick={() => setActiveTab('question_manager')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap font-mono tabular-nums ${
                activeTab === 'question_manager'
                  ? 'bg-[#F4E6CC] text-[#1E3954] shadow-xs font-extrabold'
                  : 'text-[#DCE9F5] hover:text-white hover:bg-[#3B5F84]/60 font-medium'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="font-sans">Kelola Bank Soal ({questionsList.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('results_recap')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'results_recap'
                  ? 'bg-[#F4E6CC] text-[#1E3954] shadow-xs font-extrabold'
                  : 'text-[#DCE9F5] hover:text-white hover:bg-[#3B5F84]/60 font-medium'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              Rekap &amp; Peringkat Nilai
            </button>
            <button
              onClick={() => setActiveTab('registration_sheets')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'registration_sheets'
                  ? 'bg-[#F4E6CC] text-[#1E3954] shadow-xs font-extrabold'
                  : 'text-[#DCE9F5] hover:text-white hover:bg-[#3B5F84]/60 font-medium'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Data Pendaftaran ({registeredList.length})
            </button>
            <button
              onClick={() => setActiveTab('feedback')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap font-mono tabular-nums ${
                activeTab === 'feedback'
                  ? 'bg-[#F4E6CC] text-[#1E3954] shadow-xs font-extrabold'
                  : 'text-[#DCE9F5] hover:text-white hover:bg-[#3B5F84]/60 font-medium'
              }`}
            >
              <MessageSquareText className="w-3.5 h-3.5" />
              <span className="font-sans">Pesan &amp; Saran ({feedbackList.length})</span>
            </button>
          </div>

          <button
            onClick={() => setIsZoomSettingsModalOpen(true)}
            className="px-3.5 py-2 rounded-2xl bg-[#243E59] hover:bg-[#3B5F84] border border-[#4E779F] text-xs font-semibold text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Kelola Ruang Zoom Pengawas dan Pengawasan 2 Perangkat"
          >
            <Video className="w-4 h-4 text-[#F4E6CC]" />
            <span>Info Zoom (2 Divais)</span>
          </button>

          <button
            onClick={() => setIsShareModalOpen(true)}
            className="px-3.5 py-2 rounded-2xl bg-[#E49548] hover:bg-[#CE7D30] border border-[#F4E6CC]/50 text-xs font-extrabold text-[#1E3954] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Buka QR Code dan Link untuk dibagikan ke HP peserta"
          >
            <QrCode className="w-4 h-4 text-[#1E3954]" />
            <span>Bagikan Link Peserta</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-2xl bg-[#FAF3E3] hover:bg-[#F4E6CC] border border-[#E49548]/60 text-xs font-bold text-[#1E3954] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Unduh berkas CSV rapi"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#2C4B6B]" />
            Ekspor CSV Rapi
          </button>

          {participants.length > 0 && (
            <button
              onClick={handleClearAllParticipants}
              className="px-3 py-2 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-xs font-bold text-rose-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Kosongkan data semua peserta"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">Kosongkan Peserta</span>
            </button>
          )}

          <button
            onClick={handleLogout}
            className="p-2 rounded-2xl bg-[#243E59] hover:bg-rose-600 border border-[#4E779F] text-[#DCE9F5] hover:text-white transition-colors cursor-pointer"
            title="Keluar dari sesi pengawas"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Broadcast Alert Banner if sent */}
      {broadcastNotice && (
        <div className="bg-emerald-50 border-2 border-emerald-400 text-emerald-900 text-xs font-semibold p-3.5 rounded-2xl flex items-center gap-2 animate-in fade-in shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{broadcastNotice}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: MONITORING PESERTA REAL-TIME                     */}
      {/* ======================================================== */}
      {activeTab === 'monitoring' && (
        <div className="space-y-6">
          {/* 4-Switch Exam Gate Control Panel (Separate toggles for SMP & SMA per Babak) */}
          <div className="bg-[#2C4B6B]/95 border-2 border-[#E49548] rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 text-white">
            {/* Panel Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E49548]/40">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#F4E6CC] text-[#1E3954] px-2.5 py-0.5 rounded-lg border border-[#E49548]">
                    Kontrol Pintu Akses Soal Ujian
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg border ${
                    Object.values(gateMatrix).some(Boolean)
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-[#FAF3E3] text-[#1E3954] border-[#E49548]'
                  }`}>
                    {Object.values(gateMatrix).filter(Boolean).length} dari 4 Akses Terbuka
                  </span>
                  <span className="text-[10px] text-[#DCE9F5] bg-[#243E59] border border-[#4E779F] px-2.5 py-0.5 rounded-lg font-mono">
                    {gateSource === 'server' ? '🌐 Vercel Serverless Sync' : '⚡ Local Resilient Cache'}
                  </span>
                  <span className="text-[10px] text-[#DCE9F5] bg-[#243E59] border border-[#4E779F] px-2.5 py-0.5 rounded-lg flex items-center gap-1 font-mono">
                    <span>Kode Darurat:</span>
                    <strong className="text-[#F4E6CC]">{examPasscode}</strong>
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-extrabold text-white">
                  Pengaturan Akses Soal per Jenjang (SMP / SMA) &amp; Babak (Penyisihan / Semifinal)
                </h2>
                <p className="text-xs text-[#DCE9F5] mt-0.5">
                  Panitia dapat membuka dan mengunci akses soal untuk tiap jenjang dan babak secara mandiri. Peserta yang babaknya belum dibuka akan tetap berada di Ruang Tunggu.
                </p>
              </div>

              {/* Batch Actions: Buka Semua & Kunci Semua */}
              <div className="flex flex-wrap items-center gap-2 shrink-0 self-start lg:self-center">
                <button
                  type="button"
                  onClick={handleOpenAllGates}
                  disabled={isTogglingGate}
                  className="px-4 py-2 rounded-2xl bg-[#E49548] hover:bg-[#CE7D30] disabled:opacity-50 text-[#1E3954] font-extrabold text-xs transition-all duration-300 flex items-center gap-1.5 cursor-pointer shadow-md border border-[#F4E6CC]/40"
                  title="Buka akses soal untuk semua jenjang dan babak sekaligus"
                >
                  <Unlock className="w-3.5 h-3.5 text-[#1E3954]" />
                  <span>Buka Semua Pintu</span>
                </button>
                <button
                  type="button"
                  onClick={handleLockAllGates}
                  disabled={isTogglingGate}
                  className="px-4 py-2 rounded-2xl bg-[#243E59] hover:bg-[#1E3954] disabled:opacity-50 text-white font-bold text-xs transition-all duration-300 flex items-center gap-1.5 cursor-pointer shadow-xs border border-[#4E779F]"
                  title="Kunci semua akses soal (semua peserta tertahan di Ruang Tunggu)"
                >
                  <Lock className="w-3.5 h-3.5 text-[#F4E6CC]" />
                  <span>Kunci Semua Pintu</span>
                </button>
              </div>
            </div>

            {/* 4 Interactive Switches Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-[#1E3954]">
              {/* 1. SMP · Babak Penyisihan */}
              <div
                className={`p-4 rounded-3xl border-2 transition-all duration-300 flex flex-col justify-between space-y-3 ${
                  gateMatrix['SMP_Penyisihan']
                    ? 'bg-[#FAF3E3] border-emerald-500 shadow-md'
                    : 'bg-white border-[#B8CCE0] hover:border-[#E49548]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-lg bg-[#2C4B6B] text-[#F4E6CC]">
                      Jenjang SMP
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                      gateMatrix['SMP_Penyisihan']
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-[#EBF1F6] text-[#4E779F] border-[#B8CCE0]'
                    }`}>
                      {gateMatrix['SMP_Penyisihan'] ? '● TERBUKA' : '○ TERKUNCI'}
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold text-[#1E3954]">
                    SMP · Babak Penyisihan
                  </h3>
                  <p className="text-[11px] text-[#4E779F] mt-0.5 leading-snug">
                    Langkah Awal Menuju Puncak Kompetisi
                  </p>
                </div>

                <button
                  type="button"
                  disabled={togglingKey === 'SMP_Penyisihan'}
                  onClick={() => handleToggleSpecificGate('SMP_Penyisihan')}
                  className={`w-full py-2.5 px-3 rounded-2xl font-extrabold text-xs transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                    gateMatrix['SMP_Penyisihan']
                      ? 'bg-[#E49548] hover:bg-[#CE7D30] text-[#1E3954]'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {togglingKey === 'SMP_Penyisihan' ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : gateMatrix['SMP_Penyisihan'] ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Kunci Soal SMP Penyisihan</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Buka Soal SMP Penyisihan</span>
                    </>
                  )}
                </button>
              </div>

              {/* 2. SMP · Babak Semifinal */}
              <div
                className={`p-4 rounded-3xl border-2 transition-all duration-300 flex flex-col justify-between space-y-3 ${
                  gateMatrix['SMP_Semifinal']
                    ? 'bg-[#FAF3E3] border-emerald-500 shadow-md'
                    : 'bg-white border-[#B8CCE0] hover:border-[#E49548]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-lg bg-[#2C4B6B] text-[#F4E6CC]">
                      Jenjang SMP
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                      gateMatrix['SMP_Semifinal']
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-[#EBF1F6] text-[#4E779F] border-[#B8CCE0]'
                    }`}>
                      {gateMatrix['SMP_Semifinal'] ? '● TERBUKA' : '○ TERKUNCI'}
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold text-[#1E3954]">
                    SMP · Babak Semifinal
                  </h3>
                  <p className="text-[11px] text-[#4E779F] mt-0.5 leading-snug">
                    Tantangan Analitis &amp; Penentuan Finalis
                  </p>
                </div>

                <button
                  type="button"
                  disabled={togglingKey === 'SMP_Semifinal'}
                  onClick={() => handleToggleSpecificGate('SMP_Semifinal')}
                  className={`w-full py-2.5 px-3 rounded-2xl font-extrabold text-xs transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                    gateMatrix['SMP_Semifinal']
                      ? 'bg-[#E49548] hover:bg-[#CE7D30] text-[#1E3954]'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {togglingKey === 'SMP_Semifinal' ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : gateMatrix['SMP_Semifinal'] ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Kunci Soal SMP Semifinal</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Buka Soal SMP Semifinal</span>
                    </>
                  )}
                </button>
              </div>

              {/* 3. SMA · Babak Penyisihan */}
              <div
                className={`p-4 rounded-3xl border-2 transition-all duration-300 flex flex-col justify-between space-y-3 ${
                  gateMatrix['SMA_Penyisihan']
                    ? 'bg-[#FAF3E3] border-emerald-500 shadow-md'
                    : 'bg-white border-[#B8CCE0] hover:border-[#E49548]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-lg bg-[#1E3954] text-[#F4E6CC]">
                      Jenjang SMA
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                      gateMatrix['SMA_Penyisihan']
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-[#EBF1F6] text-[#4E779F] border-[#B8CCE0]'
                    }`}>
                      {gateMatrix['SMA_Penyisihan'] ? '● TERBUKA' : '○ TERKUNCI'}
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold text-[#1E3954]">
                    SMA · Babak Penyisihan
                  </h3>
                  <p className="text-[11px] text-[#4E779F] mt-0.5 leading-snug">
                    Langkah Awal Menuju Puncak Kompetisi
                  </p>
                </div>

                <button
                  type="button"
                  disabled={togglingKey === 'SMA_Penyisihan'}
                  onClick={() => handleToggleSpecificGate('SMA_Penyisihan')}
                  className={`w-full py-2.5 px-3 rounded-2xl font-extrabold text-xs transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                    gateMatrix['SMA_Penyisihan']
                      ? 'bg-[#E49548] hover:bg-[#CE7D30] text-[#1E3954]'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {togglingKey === 'SMA_Penyisihan' ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : gateMatrix['SMA_Penyisihan'] ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Kunci Soal SMA Penyisihan</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Buka Soal SMA Penyisihan</span>
                    </>
                  )}
                </button>
              </div>

              {/* 4. SMA · Babak Semifinal */}
              <div
                className={`p-4 rounded-3xl border-2 transition-all duration-300 flex flex-col justify-between space-y-3 ${
                  gateMatrix['SMA_Semifinal']
                    ? 'bg-[#FAF3E3] border-emerald-500 shadow-md'
                    : 'bg-white border-[#B8CCE0] hover:border-[#E49548]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-lg bg-[#1E3954] text-[#F4E6CC]">
                      Jenjang SMA
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                      gateMatrix['SMA_Semifinal']
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-[#EBF1F6] text-[#4E779F] border-[#B8CCE0]'
                    }`}>
                      {gateMatrix['SMA_Semifinal'] ? '● TERBUKA' : '○ TERKUNCI'}
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold text-[#1E3954]">
                    SMA · Babak Semifinal
                  </h3>
                  <p className="text-[11px] text-[#4E779F] mt-0.5 leading-snug">
                    Tantangan Analitis &amp; Penentuan Finalis
                  </p>
                </div>

                <button
                  type="button"
                  disabled={togglingKey === 'SMA_Semifinal'}
                  onClick={() => handleToggleSpecificGate('SMA_Semifinal')}
                  className={`w-full py-2.5 px-3 rounded-2xl font-extrabold text-xs transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                    gateMatrix['SMA_Semifinal']
                      ? 'bg-[#E49548] hover:bg-[#CE7D30] text-[#1E3954]'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {togglingKey === 'SMA_Semifinal' ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : gateMatrix['SMA_Semifinal'] ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Kunci Soal SMA Semifinal</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Buka Soal SMA Semifinal</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Real-time KPI Metric Tiles with curved amber borders */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
            <div className="bg-white border-2 border-[#E49548]/70 p-4 rounded-3xl shadow-sm">
              <div className="flex items-center justify-between text-[#2C4B6B] mb-2">
                <span className="text-xs font-bold">Total Peserta</span>
                <Users className="w-4 h-4 text-[#CE7D30]" />
              </div>
              <div className="text-2xl font-mono font-extrabold text-[#1E3954] tabular-nums">{stats.total}</div>
              <span className="text-[11px] text-[#4E779F] mt-1 block">SMP & SMA Sederajat</span>
            </div>

            <div className="bg-white border-2 border-[#E49548]/70 p-4 rounded-3xl shadow-sm">
              <div className="flex items-center justify-between text-[#2C4B6B] mb-2">
                <span className="text-xs font-bold">Sedang Ujian</span>
                <Radio className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-mono font-extrabold text-emerald-700 tabular-nums">{stats.active}</div>
              <span className="text-[11px] text-[#4E779F] mt-1 block">Terkoneksi ke sistem</span>
            </div>

            <div className="bg-white border-2 border-[#E49548]/70 p-4 rounded-3xl shadow-sm">
              <div className="flex items-center justify-between text-[#2C4B6B] mb-2">
                <span className="text-xs font-bold">Sudah Selesai</span>
                <CheckCircle2 className="w-4 h-4 text-[#2C4B6B]" />
              </div>
              <div className="text-2xl font-mono font-extrabold text-[#1E3954] tabular-nums">{stats.submitted}</div>
              <span className="text-[11px] text-[#4E779F] mt-1 block">Jawaban terkirim</span>
            </div>

            <div className="bg-white border-2 border-[#E49548]/70 p-4 rounded-3xl shadow-sm">
              <div className="flex items-center justify-between text-[#2C4B6B] mb-2">
                <span className="text-xs font-bold">Pelanggaran</span>
                <AlertTriangle className="w-4 h-4 text-[#CE7D30]" />
              </div>
              <div className="text-2xl font-mono font-extrabold text-[#CE7D30] tabular-nums">{stats.warnings}</div>
              <span className="text-[11px] text-[#4E779F] mt-1 block">Alih tab / anomali</span>
            </div>

            <div className="bg-white border-2 border-[#E49548]/70 p-4 rounded-3xl shadow-sm">
              <div className="flex items-center justify-between text-[#2C4B6B] mb-2">
                <span className="text-xs font-bold">Rata-rata Integritas</span>
                <ShieldAlert className="w-4 h-4 text-[#2C4B6B]" />
              </div>
              <div className="text-2xl font-mono font-extrabold text-[#1E3954] tabular-nums">{stats.avgTrust}%</div>
              <span className="text-[11px] text-[#4E779F] mt-1 block">Skor Proktor AI</span>
            </div>
          </div>

          {/* Main Workspace Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Live Participants Table or Video Wall */}
            <div className="lg:col-span-8 space-y-4">
              {/* Controls Bar */}
              <div className="bg-white border-2 border-[#E49548]/70 p-3.5 rounded-3xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-[#4E779F]" />
                  <input
                    type="text"
                    placeholder="Cari nama peserta, sekolah, nomor ujian..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none text-xs text-[#1E3954] placeholder-[#4E779F]/70 focus:outline-none w-full"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Category Filter (Jenjang SMP / SMA) */}
                  <div className="flex items-center bg-[#FAF3E3] border border-[#B8CCE0] p-0.5 rounded-2xl text-xs">
                    {(['ALL', 'SMP', 'SMA'] as const).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                          categoryFilter === cat
                            ? 'bg-[#2C4B6B] text-[#F4E6CC] shadow-xs'
                            : 'text-[#1E3954] hover:bg-white'
                        }`}
                      >
                        {cat === 'ALL' ? 'Semua Jenjang' : cat}
                      </button>
                    ))}
                  </div>

                  {/* Stage Filter (Babak Penyisihan / Semifinal) */}
                  <div className="flex items-center bg-[#FAF3E3] border border-[#B8CCE0] p-0.5 rounded-2xl text-xs">
                    {(['ALL', 'Penyisihan', 'Semifinal'] as const).map((stg) => (
                      <button
                        key={stg}
                        onClick={() => setStageFilter(stg)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                          stageFilter === stg
                            ? 'bg-[#2C4B6B] text-[#F4E6CC] shadow-xs'
                            : 'text-[#1E3954] hover:bg-white'
                        }`}
                      >
                        {stg === 'ALL' ? 'Semua Babak' : stg}
                      </button>
                    ))}
                  </div>

                  {/* Supervision Mode Filter (Zoom 2 Divais vs Webcam) */}
                  <div className="flex items-center bg-[#FAF3E3] border border-[#B8CCE0] p-0.5 rounded-2xl text-xs">
                    <button
                      onClick={() => setSupervisionFilter('ALL')}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-colors cursor-pointer ${
                        supervisionFilter === 'ALL' ? 'bg-[#2C4B6B] text-[#F4E6CC] shadow-xs' : 'text-[#1E3954] hover:bg-white'
                      }`}
                      title="Semua metode pengawasan"
                    >
                      Semua
                    </button>
                    <button
                      onClick={() => setSupervisionFilter('ZOOM_2_DEVICE')}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                        supervisionFilter === 'ZOOM_2_DEVICE' ? 'bg-[#2C4B6B] text-[#F4E6CC] shadow-xs' : 'text-[#1E3954] hover:bg-white'
                      }`}
                      title="Hanya peserta pengawasan Zoom (2 Divais)"
                    >
                      <Video className="w-3 h-3" />
                      <span>Zoom (2 Divais)</span>
                    </button>
                    <button
                      onClick={() => setSupervisionFilter('WEB_CAM')}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                        supervisionFilter === 'WEB_CAM' ? 'bg-[#2C4B6B] text-[#F4E6CC] shadow-xs' : 'text-[#1E3954] hover:bg-white'
                      }`}
                      title="Hanya peserta kamera web langsung"
                    >
                      <Camera className="w-3 h-3" />
                      <span>Webcam</span>
                    </button>
                  </div>

                  {/* View Mode Switcher */}
                  <div className="flex items-center bg-[#FAF3E3] border border-[#B8CCE0] p-0.5 rounded-2xl text-xs">
                    <button
                      onClick={() => setViewMode('table')}
                      className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                        viewMode === 'table' ? 'bg-[#2C4B6B] text-[#F4E6CC] shadow-xs' : 'text-[#1E3954] hover:bg-white'
                      }`}
                      title="Tampilan Tabel"
                    >
                      <Monitor className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setViewMode('cams')}
                      className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                        viewMode === 'cams' ? 'bg-[#2C4B6B] text-[#F4E6CC] shadow-xs' : 'text-[#1E3954] hover:bg-white'
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
                <div className="bg-white border-2 border-[#E49548]/70 rounded-3xl overflow-hidden shadow-md text-[#1E3954]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#2C4B6B] text-[#F4E6CC] uppercase tracking-wider text-[10px] border-b-2 border-[#E49548]">
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
                      <tbody className="divide-y divide-[#B8CCE0]/60">
                        {filteredParticipants.map((p) => {
                          const isDisq = p.status === 'DISQUALIFIED';
                          const isWarn = p.status === 'WARNING';
                          const isDone = p.status === 'SUBMITTED';

                          return (
                            <tr
                              key={p.id}
                              onClick={() => setSelectedParticipant(p)}
                              className={`hover:bg-[#FAF3E3]/60 transition-colors cursor-pointer ${
                                selectedParticipant?.id === p.id ? 'bg-[#F4E6CC]/50' : ''
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
                                        ? 'border-emerald-500 shadow-2xs hover:scale-105 cursor-pointer ring-1 ring-emerald-400/40 bg-[#1E3954]'
                                        : p.supervisionMode === 'ZOOM_2_DEVICE' || p.cameraStatus === 'ZOOM'
                                        ? 'border-[#E49548] bg-[#2C4B6B] flex items-center justify-center text-white'
                                        : 'border-[#B8CCE0] bg-[#EBF1F6] flex items-center justify-center'
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
                                      <div className="flex flex-col items-center justify-center text-[#F4E6CC]">
                                        <Video className="w-4 h-4" />
                                        <span className="text-[7px] font-bold font-mono">ZOOM</span>
                                      </div>
                                    ) : (
                                      <Camera className="w-4 h-4 text-[#4E779F]" />
                                    )}
                                  </div>
                                  <div>
                                    <div className="font-bold text-[#1E3954] flex items-center gap-1.5 flex-wrap">
                                      <span>{p.name}</span>
                                      {p.aiIncidentReport || p.strikeCount > 3 ? (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300 font-mono font-bold flex items-center gap-1 animate-pulse" title="Pelanggaran melebihi 3 kali - Laporan AI diterbitkan">
                                          <ShieldAlert className="w-2.5 h-2.5 text-rose-600" /> LAPORAN AI ({p.strikeCount})
                                        </span>
                                      ) : null}
                                      {p.supervisionMode === 'ZOOM_2_DEVICE' || p.cameraStatus === 'ZOOM' ? (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#EBF1F6] text-[#2C4B6B] border border-[#B8CCE0] font-mono font-bold flex items-center gap-1">
                                          <Video className="w-2.5 h-2.5" /> ZOOM (2 DIVAIS)
                                        </span>
                                      ) : p.cameraSnapshot ? (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-bold flex items-center gap-1">
                                          <Camera className="w-2.5 h-2.5" /> WEBCAM
                                        </span>
                                      ) : null}
                                    </div>
                                    <div className="text-[11px] text-[#4E779F]">{p.school}</div>
                                    <div className="text-[10px] font-mono text-[#4E779F]/80">{p.id}</div>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3.5 px-3">
                                <div className="flex flex-col gap-1 items-start">
                                  <span className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                                    p.category === 'SMP'
                                      ? 'bg-[#EBF1F6] text-[#2C4B6B] border-[#B8CCE0]'
                                      : 'bg-[#FAF3E3] text-[#1E3954] border-[#E49548]/60'
                                  }`}>
                                    {p.category}
                                  </span>
                                  <span className="text-[10px] font-bold text-[#1E3954] bg-[#F4E6CC] px-1.5 py-0.5 rounded-md border border-[#E49548]/50">
                                    {p.stage || 'Penyisihan'}
                                  </span>
                                </div>
                              </td>

                              <td className="py-3.5 px-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-[#1E3954]">
                                    {p.answeredCount}/{p.totalQuestions}
                                  </span>
                                </div>
                                <div className="w-16 h-1.5 bg-[#EBF1F6] rounded-full overflow-hidden mt-1">
                                  <div
                                    className="h-full bg-[#E49548] rounded-full"
                                    style={{ width: `${(p.answeredCount / p.totalQuestions) * 100}%` }}
                                  />
                                </div>
                              </td>

                              <td className="py-3.5 px-3">
                                <span
                                  className={`font-mono font-bold ${
                                    p.strikeCount > 0 ? 'text-rose-600' : 'text-[#4E779F]'
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
                                      ? 'text-[#CE7D30]'
                                      : 'text-rose-700'
                                  }`}
                                >
                                  {p.trustScore}%
                                </span>
                              </td>

                              <td className="py-3.5 px-3">
                                {isDone ? (
                                  <span className="text-[#1E3954] font-bold bg-[#EBF1F6] px-2 py-0.5 rounded-md">Selesai</span>
                                ) : isDisq ? (
                                  <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-md">Terkunci</span>
                                ) : isWarn ? (
                                  <span className="text-[#CE7D30] font-bold bg-[#FAF3E3] px-2 py-0.5 rounded-md border border-[#E49548]/50">Teguran</span>
                                ) : (
                                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">Aktif</span>
                                )}
                              </td>

                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedParticipant(p);
                                    }}
                                    className="px-2.5 py-1 rounded-xl bg-[#FAF3E3] hover:bg-[#F4E6CC] text-[11px] text-[#1E3954] font-bold cursor-pointer border border-[#E49548]/60"
                                  >
                                    Detail
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteParticipant(p.id, p.name);
                                    }}
                                    className="p-1 rounded-xl text-[#4E779F] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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
                            <td colSpan={7} className="py-12 text-center text-[#4E779F]">
                              <div className="max-w-md mx-auto space-y-3">
                                <Users className="w-8 h-8 text-[#4E779F] mx-auto" />
                                <div>
                                  <p className="font-bold text-[#1E3954]">Belum ada peserta yang aktif</p>
                                  <p className="text-xs text-[#4E779F] mt-0.5">
                                    Ketika peserta mengisi data nama dan sekolah dari HP atau laptop lalu memulai ujian, data peserta akan langsung tersinkronisasi dan tampil di sini secara real-time.
                                  </p>
                                </div>
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                                  <button
                                    onClick={() => setIsShareModalOpen(true)}
                                    className="px-4 py-2 rounded-2xl bg-[#E49548] hover:bg-[#CE7D30] text-[#1E3954] text-xs font-extrabold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                                  >
                                    <QrCode className="w-4 h-4" />
                                    <span>Bagikan Link & QR Peserta</span>
                                  </button>
                                  <button
                                    onClick={() => window.open('/?view=portal', '_blank')}
                                    className="px-4 py-2 rounded-2xl bg-[#FAF3E3] hover:bg-[#F4E6CC] border border-[#E49548]/60 text-[#1E3954] text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
                                  >
                                    <ExternalLink className="w-4 h-4 text-[#2C4B6B]" />
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
                      className={`bg-white border-2 rounded-3xl p-3 transition-all cursor-pointer relative group shadow-sm text-[#1E3954] ${
                        selectedParticipant?.id === p.id
                          ? 'border-[#E49548] ring-2 ring-[#E49548]/40'
                          : 'border-[#B8CCE0] hover:border-[#E49548]'
                      }`}
                    >
                      <div className="aspect-video bg-[#1E3954] rounded-2xl overflow-hidden relative flex items-center justify-center border border-[#2C4B6B] mb-2">
                        {p.cameraSnapshot ? (
                          <img
                            src={p.cameraSnapshot}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                        ) : p.supervisionMode === 'ZOOM_2_DEVICE' || p.cameraStatus === 'ZOOM' ? (
                          <div className="flex flex-col items-center justify-center p-2 text-center bg-[#243E59] text-white w-full h-full">
                            <div className="w-8 h-8 rounded-full bg-[#E49548] text-[#1E3954] flex items-center justify-center text-xs font-bold mb-1 shadow-xs">
                              <Video className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-bold text-[#F4E6CC] leading-tight">
                              Zoom Pengawas
                            </span>
                            <span className="text-[8px] text-[#DCE9F5] font-mono">
                              HP ke-2
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center p-2 text-center">
                            <div className="w-8 h-8 rounded-full bg-[#2C4B6B] text-[#F4E6CC] flex items-center justify-center text-xs font-mono mb-1">
                              {p.name.charAt(0)}
                            </div>
                            <span className="text-[9px] text-[#DCE9F5] leading-tight">
                              {p.cameraStatus === 'DENIED' ? 'Kamera Diblokir HP' : 'Menunggu Kamera...'}
                            </span>
                          </div>
                        )}

                        <div className="absolute inset-2 border border-dashed border-[#E49548]/50 rounded-xl pointer-events-none" />

                        <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-[#1E3954]/85 px-1.5 py-0.5 rounded-md text-[9px] font-mono text-[#F4E6CC]">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              p.supervisionMode === 'ZOOM_2_DEVICE' || p.cameraStatus === 'ZOOM'
                                ? 'bg-sky-400 animate-pulse'
                                : p.cameraSnapshot
                                ? 'bg-emerald-400 animate-pulse'
                                : 'bg-[#E49548]'
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

                        <div className="absolute bottom-1 right-1 bg-[#1E3954]/85 px-1.5 py-0.5 rounded-md text-[9px] font-mono text-emerald-400">
                          {p.trustScore}%
                        </div>
                      </div>

                      <div className="text-[11px] font-bold text-[#1E3954] truncate">{p.name}</div>
                      <div className="text-[10px] text-[#4E779F] truncate">{p.school}</div>
                      <div className="flex items-center justify-between text-[10px] mt-1 pt-1 border-t border-[#EBF1F6]">
                        <span className="font-mono font-bold text-[#2C4B6B]">{p.category}</span>
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
                <div className="bg-white border-2 border-[#E49548]/70 rounded-3xl p-5 shadow-md space-y-4 text-[#1E3954]">
                  <div className="flex items-center justify-between pb-3 border-b border-[#B8CCE0]">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-[#2C4B6B]" />
                      <span className="text-xs font-extrabold text-[#1E3954]">Inspeksi Peserta</span>
                    </div>
                    <span className="text-[11px] font-mono text-[#4E779F]">{selectedParticipant.id}</span>
                  </div>

                  {/* Real-time Camera Feed of Selected Participant */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-[#2C4B6B] flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-[#CE7D30]" />
                        Kamera Pengawas Langsung:
                      </span>
                      {selectedParticipant.cameraSnapshot && (
                        <button
                          onClick={() => setExpandedCameraParticipant(selectedParticipant)}
                          className="text-[10px] text-[#2C4B6B] hover:text-[#CE7D30] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Maximize2 className="w-3 h-3" /> Perbesar
                        </button>
                      )}
                    </div>

                    <div className="aspect-video bg-[#1E3954] rounded-2xl overflow-hidden relative flex items-center justify-center border-2 border-[#2C4B6B] shadow-inner group">
                      {selectedParticipant.cameraSnapshot || selectedParticipant.incidentSnapshot ? (
                        <>
                          <img
                            src={selectedParticipant.cameraSnapshot || selectedParticipant.incidentSnapshot}
                            alt={selectedParticipant.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-[#1E3954]/85 backdrop-blur-xs px-2 py-0.5 rounded-lg text-[10px] font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            <span className={selectedParticipant.cameraSnapshot ? 'text-emerald-400' : 'text-rose-400'}>
                              {selectedParticipant.cameraSnapshot ? 'LIVE FEED HP' : 'BUKTI FOTO INSIDEN AI'}
                            </span>
                          </div>
                          <div className="absolute bottom-2 left-2 bg-[#1E3954]/85 backdrop-blur-xs px-2 py-0.5 rounded-lg text-[10px] text-[#F4E6CC] font-mono">
                            Integritas: {selectedParticipant.trustScore}%
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center p-4">
                          <CameraOff className="w-7 h-7 text-[#4E779F] mb-1.5" />
                          <span className="text-xs font-semibold text-[#F4E6CC]">
                            {selectedParticipant.cameraStatus === 'DENIED'
                              ? 'Kamera Belum Diizinkan di HP'
                              : 'Menunggu Aliran Kamera Peserta...'}
                          </span>
                          <p className="text-[10px] text-[#DCE9F5] max-w-xs mt-1 leading-relaxed">
                            Minta peserta menekan tombol <strong>"Izinkan / Aktifkan Kamera"</strong> di layar HP mereka agar gambar wajah muncul di sini.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-extrabold text-[#1E3954]">{selectedParticipant.name}</h4>
                    <p className="text-xs text-[#4E779F]">{selectedParticipant.school}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-[#FAF3E3] p-2.5 rounded-2xl border border-[#E49548]/50">
                      <span className="text-[#4E779F] text-[10px] block font-semibold">Kategori</span>
                      <span className="font-bold text-[#1E3954]">{selectedParticipant.category}</span>
                    </div>
                    <div className="bg-[#FAF3E3] p-2.5 rounded-2xl border border-[#E49548]/50">
                      <span className="text-[#4E779F] text-[10px] block font-semibold">Progres Soal</span>
                      <span className="font-bold text-[#1E3954] font-mono">
                        {selectedParticipant.answeredCount} / {selectedParticipant.totalQuestions}
                      </span>
                    </div>
                    <div className="bg-[#FAF3E3] p-2.5 rounded-2xl border border-[#E49548]/50">
                      <span className="text-[#4E779F] text-[10px] block font-semibold">Strikes Tercatat</span>
                      <span className="font-bold text-rose-700 font-mono">{selectedParticipant.strikeCount} kali</span>
                    </div>
                    <div className="bg-[#FAF3E3] p-2.5 rounded-2xl border border-[#E49548]/50">
                      <span className="text-[#4E779F] text-[10px] block font-semibold">Skor Integritas</span>
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

                      <div className="bg-white/95 p-2.5 rounded-xl border border-rose-200 text-[#1E3954] leading-relaxed text-[11px] whitespace-pre-line font-sans shadow-2xs">
                        {selectedParticipant.aiIncidentReport ||
                          'AI sedang memproses analisis foto dan riwayat pelanggaran peserta...'}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="space-y-2 pt-2">
                    <div className="text-[11px] font-bold text-[#2C4B6B]">Kirim Peringatan Langsung ke Layar:</div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customWarningText}
                        onChange={(e) => setCustomWarningText(e.target.value)}
                        placeholder="Tulis pesan teguran..."
                        className="flex-1 bg-[#FAF3E3]/50 border border-[#B8CCE0] rounded-2xl px-3 py-1.5 text-xs text-[#1E3954] focus:outline-none focus:border-[#E49548] focus:bg-white"
                      />
                      <button
                        onClick={() => handleSendWarning(selectedParticipant.id)}
                        className="p-2.5 rounded-2xl bg-[#E49548] hover:bg-[#CE7D30] text-[#1E3954] cursor-pointer shadow-xs"
                        title="Kirim Teguran"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleToggleLock(selectedParticipant.id)}
                        className={`flex-1 py-2 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
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
                <div className="bg-white border-2 border-[#E49548]/70 rounded-3xl p-6 text-center text-[#4E779F] shadow-sm">
                  <Eye className="w-8 h-8 text-[#4E779F] mx-auto mb-2" />
                  <p className="text-xs">Pilih salah satu peserta di tabel untuk melihat status dan aksi pengawas.</p>
                </div>
              )}

              {/* Real-time Activity Feed */}
              <div className="bg-white border-2 border-[#E49548]/70 rounded-3xl p-5 shadow-md text-[#1E3954]">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#B8CCE0]">
                  <span className="text-xs font-extrabold text-[#1E3954] flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-emerald-600" />
                    Live Log Keamanan & Aktivitas
                  </span>
                  <span className="text-[10px] text-[#4E779F] font-mono">Real-time Feed</span>
                </div>

                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {activityLogs.map((log) => (
                    <div
                      key={log.id}
                      className="text-xs bg-[#FAF3E3]/50 border border-[#B8CCE0] p-2.5 rounded-2xl space-y-1"
                    >
                      <div className="flex items-center justify-between text-[10px] text-[#4E779F]">
                        <span className="font-mono">{log.time}</span>
                        <span
                          className={`font-bold ${
                            log.type === 'warn'
                              ? 'text-[#CE7D30]'
                              : log.type === 'error'
                              ? 'text-rose-700'
                              : 'text-[#2C4B6B]'
                          }`}
                        >
                          {log.type.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[#1E3954] text-[11px] leading-tight">{log.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: KELOLA BANK SOAL & IMPOR WORD (FULL CRUD)         */}
      {/* ======================================================== */}
      {activeTab === 'question_manager' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header & Primary Bank Actions */}
          <div className="bg-[#2C4B6B]/95 border-2 border-[#E49548] rounded-3xl p-5 sm:p-6 shadow-xl text-white flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#DCE9F5]">
                <span className="font-extrabold uppercase tracking-wider bg-[#F4E6CC] text-[#1E3954] px-2.5 py-0.5 rounded-lg">
                  Manajemen Bank Soal MMO 2027
                </span>
                <span>·</span>
                <span className="font-mono tabular-nums font-bold text-[#F4E6CC]">
                  {questionBankStats.total} Butir Tersimpan
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white mt-1.5">
                Kelola Bank Soal
              </h2>
              <p className="text-xs text-[#DCE9F5] mt-1">
                Klik Impor Soal untuk memasukkan soal via Copy Paste, Word (.docx), atau Gambar, lalu tinjau, sunting, atau ekspor Bank Soal aktif.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#E49548] hover:bg-[#CE7D30] text-[#1E3954] text-xs font-extrabold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 shadow-md border border-[#F4E6CC]/40"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Impor Soal</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingQuestion(null);
                  setIsEditorModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-[#FAF3E3] hover:bg-[#F4E6CC] border border-[#E49548]/60 text-[#1E3954] text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Manual</span>
              </button>
              <button
                type="button"
                onClick={handleExportQuestionsExcel}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 border border-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Ekspor Excel (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={handleExportQuestionsJson}
                className="px-3.5 py-2 rounded-xl bg-[#243E59] hover:bg-[#3B5F84] border border-[#4E779F] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <FileJson className="w-3.5 h-3.5 text-[#F4E6CC]" />
                <span>Ekspor JSON</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmClearModal('reset')}
                className="px-3.5 py-2 rounded-xl bg-[#243E59] hover:bg-[#3B5F84] border border-[#4E779F] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#F4E6CC]" />
                <span>Reset Soal Bawaan</span>
              </button>
              {questionsList.length > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmClearModal('clear')}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Kosongkan Bank Soal</span>
                </button>
              )}
            </div>
          </div>

          {qbNotification && (
            <div
              className={`rounded-2xl p-3.5 border-2 text-xs flex items-center justify-between gap-2 shadow-sm ${
                qbNotification.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-800'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {qbNotification.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{qbNotification.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setQbNotification(null)}
                className="text-current opacity-70 hover:opacity-100 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Question Bank Statistics & Active List */}
          <div className="bg-white border-2 border-[#E49548]/70 rounded-3xl p-5 sm:p-6 space-y-6 shadow-md text-[#1E3954]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#B8CCE0]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#2C4B6B] border border-[#E49548] text-[#F4E6CC] flex items-center justify-center shrink-0">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#1E3954]">
                    Statistik &amp; Daftar Soal Aktif ({questionBankStats.total} Butir)
                  </h3>
                  <p className="text-xs text-[#4E779F]">
                    Klik kartu paket atau bidang materi di bawah untuk menyaring daftar soal.
                  </p>
                </div>
              </div>

              {(qbCategoryFilter !== 'ALL' || qbStageFilter !== 'ALL' || qbDomainFilter !== 'ALL' || qbSearch.trim()) && (
                <button
                  type="button"
                  onClick={() => {
                    setQbCategoryFilter('ALL');
                    setQbStageFilter('ALL');
                    setQbDomainFilter('ALL');
                    setQbSearch('');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#FAF3E3] hover:bg-[#F4E6CC] text-[#1E3954] text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-[#E49548]/60"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#2C4B6B]" />
                  <span>Reset Filter</span>
                </button>
              )}
            </div>

            {/* 4 Main KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <button
                type="button"
                onClick={() => {
                  setQbCategoryFilter('ALL');
                  setQbStageFilter('ALL');
                  setQbDomainFilter('ALL');
                }}
                className={`p-4 rounded-2xl border-2 text-left transition-colors cursor-pointer ${
                  qbCategoryFilter === 'ALL' && qbStageFilter === 'ALL' && qbDomainFilter === 'ALL'
                    ? 'bg-[#2C4B6B] text-white border-[#E49548]'
                    : 'bg-[#FAF3E3]/50 border-[#B8CCE0] hover:border-[#E49548] text-[#1E3954]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider opacity-85">
                    Total Koleksi Soal
                  </span>
                  <BookOpen className="w-4 h-4 opacity-85" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold font-mono tabular-nums tracking-tight">
                    {questionBankStats.total}
                  </span>
                  <span className="text-xs opacity-80">Butir Soal</span>
                </div>
                <div className="mt-3 pt-2.5 border-t border-current/15 flex items-center justify-between text-[11px] opacity-90 font-mono tabular-nums">
                  <span>PG: {questionBankStats.typeCounts.multiple_choice} · Uraian: {questionBankStats.typeCounts.short_answer}</span>
                  <span>{questionBankStats.formatCounts.withImage} Gambar</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setQbCategoryFilter('SMP');
                  setQbStageFilter('ALL');
                }}
                className={`p-4 rounded-2xl border-2 text-left transition-colors cursor-pointer ${
                  qbCategoryFilter === 'SMP'
                    ? 'bg-[#2C4B6B] text-white border-[#E49548]'
                    : 'bg-[#FAF3E3]/50 border-[#B8CCE0] hover:border-[#E49548] text-[#1E3954]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${qbCategoryFilter === 'SMP' ? 'text-[#F4E6CC]' : 'text-[#2C4B6B]'}`}>
                    Jenjang SMP / MTs
                  </span>
                  <span className="text-[11px] font-mono tabular-nums opacity-85">
                    {questionBankStats.total > 0 ? Math.round((questionBankStats.smpTotal / questionBankStats.total) * 100) : 0}%
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold font-mono tabular-nums tracking-tight">
                    {questionBankStats.smpTotal}
                  </span>
                  <span className="text-xs opacity-80">Soal Aktif</span>
                </div>
                <div className="mt-3 pt-2.5 border-t border-current/15 text-[11px] font-mono tabular-nums opacity-90">
                  Penyisihan: {questionBankStats.smpPenyisihan} · Semifinal: {questionBankStats.smpSemifinal}
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setQbCategoryFilter('SMA');
                  setQbStageFilter('ALL');
                }}
                className={`p-4 rounded-2xl border-2 text-left transition-colors cursor-pointer ${
                  qbCategoryFilter === 'SMA'
                    ? 'bg-[#1E3954] text-white border-[#E49548]'
                    : 'bg-[#FAF3E3]/50 border-[#B8CCE0] hover:border-[#E49548] text-[#1E3954]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${qbCategoryFilter === 'SMA' ? 'text-[#F4E6CC]' : 'text-[#2C4B6B]'}`}>
                    Jenjang SMA / MA / SMK
                  </span>
                  <span className="text-[11px] font-mono tabular-nums opacity-85">
                    {questionBankStats.total > 0 ? Math.round((questionBankStats.smaTotal / questionBankStats.total) * 100) : 0}%
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold font-mono tabular-nums tracking-tight">
                    {questionBankStats.smaTotal}
                  </span>
                  <span className="text-xs opacity-80">Soal Aktif</span>
                </div>
                <div className="mt-3 pt-2.5 border-t border-current/15 text-[11px] font-mono tabular-nums opacity-90">
                  Penyisihan: {questionBankStats.smaPenyisihan} · Semifinal: {questionBankStats.smaSemifinal}
                </div>
              </button>

              <div className="p-4 rounded-2xl border-2 border-[#B8CCE0] bg-[#FAF3E3]/50 text-[#1E3954] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#2C4B6B]">
                      Sebaran Babak
                    </span>
                    <Layers className="w-4 h-4 text-[#CE7D30]" />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setQbStageFilter('Penyisihan')}
                      className="text-left cursor-pointer hover:opacity-80"
                    >
                      <span className="text-[10px] text-[#4E779F] block uppercase font-bold">Penyisihan</span>
                      <span className="text-2xl font-extrabold font-mono tabular-nums text-emerald-700">
                        {questionBankStats.penyisihanTotal}
                      </span>
                    </button>
                    <div className="h-8 w-px bg-[#B8CCE0]" />
                    <button
                      type="button"
                      onClick={() => setQbStageFilter('Semifinal')}
                      className="text-right cursor-pointer hover:opacity-80"
                    >
                      <span className="text-[10px] text-[#4E779F] block uppercase font-bold">Semifinal</span>
                      <span className="text-2xl font-extrabold font-mono tabular-nums text-[#CE7D30]">
                        {questionBankStats.semifinalTotal}
                      </span>
                    </button>
                  </div>
                </div>
                <div className="mt-3 h-2 w-full bg-[#EBF1F6] rounded-full overflow-hidden flex">
                  <div
                    style={{
                      width: `${questionBankStats.total > 0 ? (questionBankStats.penyisihanTotal / questionBankStats.total) * 100 : 50}%`,
                    }}
                    className="bg-emerald-600 h-full"
                  />
                  <div
                    style={{
                      width: `${questionBankStats.total > 0 ? (questionBankStats.semifinalTotal / questionBankStats.total) * 100 : 50}%`,
                    }}
                    className="bg-[#E49548] h-full"
                  />
                </div>
              </div>
            </div>

            {/* 4-Packet Matrix & 4 Domains Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7 bg-[#FAF3E3]/50 border border-[#B8CCE0] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#B8CCE0]">
                  <div className="flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-[#2C4B6B]" />
                    <span className="text-xs font-extrabold text-[#1E3954]">Matriks 4 Paket Ujian</span>
                  </div>
                  <span className="text-[11px] text-[#4E779F]">Klik paket untuk menyaring</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(
                    [
                      { cat: 'SMP' as const, stg: 'Penyisihan' as const, count: questionBankStats.smpPenyisihan, activeClass: 'bg-[#2C4B6B] text-[#F4E6CC] border-[#E49548]' },
                      { cat: 'SMP' as const, stg: 'Semifinal' as const, count: questionBankStats.smpSemifinal, activeClass: 'bg-[#2C4B6B] text-[#F4E6CC] border-[#E49548]' },
                      { cat: 'SMA' as const, stg: 'Penyisihan' as const, count: questionBankStats.smaPenyisihan, activeClass: 'bg-[#1E3954] text-[#F4E6CC] border-[#E49548]' },
                      { cat: 'SMA' as const, stg: 'Semifinal' as const, count: questionBankStats.smaSemifinal, activeClass: 'bg-[#1E3954] text-[#F4E6CC] border-[#E49548]' },
                    ]
                  ).map((pkt) => {
                    const isSelected = qbCategoryFilter === pkt.cat && qbStageFilter === pkt.stg;
                    return (
                      <button
                        key={`${pkt.cat}-${pkt.stg}`}
                        type="button"
                        onClick={() => {
                          setQbCategoryFilter(pkt.cat);
                          setQbStageFilter(pkt.stg);
                        }}
                        className={`p-3 rounded-xl border-2 text-left transition-colors cursor-pointer ${
                          isSelected
                            ? pkt.activeClass
                            : 'bg-white border-[#B8CCE0] hover:border-[#E49548] text-[#1E3954]'
                        }`}
                      >
                        <div className="text-[11px] font-bold mb-1">
                          {pkt.cat} · Babak {pkt.stg}
                        </div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xl font-extrabold font-mono tabular-nums">{pkt.count}</span>
                          <span className="text-[11px] opacity-80">Soal</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-5 bg-[#FAF3E3]/50 border border-[#B8CCE0] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#B8CCE0]">
                  <span className="text-xs font-extrabold text-[#1E3954]">Sebaran Bidang Materi</span>
                  <span className="text-[11px] text-[#4E779F]">
                    {qbDomainFilter !== 'ALL' ? `Filter: ${qbDomainFilter}` : 'Klik untuk menyaring'}
                  </span>
                </div>
                <div className="space-y-2">
                  {(
                    [
                      { domain: 'Aljabar', color: 'bg-[#2C4B6B]' },
                      { domain: 'Geometri', color: 'bg-emerald-600' },
                      { domain: 'Kombinatorika', color: 'bg-[#527CA3]' },
                      { domain: 'Teori Bilangan', color: 'bg-[#E49548]' },
                    ] as const
                  ).map((item) => {
                    const count = questionBankStats.domainCounts[item.domain as MathDomain];
                    const pct = questionBankStats.total > 0 ? Math.round((count / questionBankStats.total) * 100) : 0;
                    const isSelected = qbDomainFilter === item.domain;
                    return (
                      <button
                        key={item.domain}
                        type="button"
                        onClick={() => setQbDomainFilter(isSelected ? 'ALL' : (item.domain as MathDomain))}
                        className={`w-full text-left p-2 rounded-xl border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#2C4B6B] text-[#F4E6CC] border-[#E49548]'
                            : 'bg-white border-[#B8CCE0] hover:border-[#E49548] text-[#1E3954]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold">{item.domain}</span>
                          <span className="font-mono tabular-nums text-[11px] opacity-85">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div className={`h-1.5 w-full rounded-full overflow-hidden ${isSelected ? 'bg-[#1E3954]' : 'bg-[#EBF1F6]'}`}>
                          <div style={{ width: `${pct}%` }} className={`${isSelected ? 'bg-[#E49548]' : item.color} h-full rounded-full`} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="relative flex items-center flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-[#4E779F] absolute left-3" />
                <input
                  type="text"
                  placeholder="Cari teks soal, bidang materi, atau kunci jawaban..."
                  value={qbSearch}
                  onChange={(e) => setQbSearch(e.target.value)}
                  className="bg-[#FAF3E3]/50 border border-[#B8CCE0] rounded-xl pl-9 pr-8 py-1.5 text-xs text-[#1E3954] placeholder-[#4E779F]/70 focus:outline-none focus:border-[#E49548] focus:bg-white w-full"
                />
                {qbSearch && (
                  <button
                    type="button"
                    onClick={() => setQbSearch('')}
                    className="absolute right-2.5 text-[#4E779F] hover:text-[#1E3954] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="flex items-center bg-[#FAF3E3] border border-[#B8CCE0] p-0.5 rounded-xl">
                  {(['ALL', 'SMP', 'SMA'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setQbCategoryFilter(cat)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer font-mono tabular-nums ${
                        qbCategoryFilter === cat
                          ? 'bg-[#2C4B6B] text-[#F4E6CC]'
                          : 'text-[#1E3954] hover:bg-white'
                      }`}
                    >
                      {cat === 'ALL' ? `Semua (${questionsList.length})` : cat}
                    </button>
                  ))}
                </div>

                <div className="flex items-center bg-[#FAF3E3] border border-[#B8CCE0] p-0.5 rounded-xl">
                  {(['ALL', 'Penyisihan', 'Semifinal'] as const).map((stg) => (
                    <button
                      key={stg}
                      type="button"
                      onClick={() => setQbStageFilter(stg)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                        qbStageFilter === stg
                          ? 'bg-[#2C4B6B] text-[#F4E6CC]'
                          : 'text-[#1E3954] hover:bg-white'
                      }`}
                    >
                      {stg === 'ALL' ? 'Semua Babak' : stg}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Active Question Cards with Edit & Delete */}
            <div className="space-y-3">
              {(() => {
                if (questionsList.length === 0) {
                  return (
                    <div className="bg-[#FAF3E3]/50 border border-[#B8CCE0] rounded-2xl p-8 text-center space-y-3">
                      <BookOpen className="w-8 h-8 text-[#4E779F] mx-auto" />
                      <div className="space-y-1">
                        <h4 className="text-sm font-extrabold text-[#1E3954]">Bank Soal Saat Ini Kosong</h4>
                        <p className="text-xs text-[#4E779F] max-w-md mx-auto">
                          Klik Impor Soal untuk memasukkan soal dari Copy Paste, Word (.docx), atau Gambar, atau tambahkan soal manual.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsImportModalOpen(true)}
                          className="px-4 py-2 rounded-xl bg-[#E49548] hover:bg-[#CE7D30] text-[#1E3954] text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>Impor Soal</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingQuestion(null);
                            setIsEditorModalOpen(true);
                          }}
                          className="px-4 py-2 rounded-xl bg-white hover:bg-[#FAF3E3] border border-[#B8CCE0] text-[#1E3954] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambah Soal Manual</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                const filtered = questionsList.filter((q) => {
                  const matchCat = qbCategoryFilter === 'ALL' || q.category === qbCategoryFilter;
                  const matchStage = qbStageFilter === 'ALL' || q.stage === qbStageFilter;
                  const matchDomain = qbDomainFilter === 'ALL' || q.domain === qbDomainFilter;
                  const matchSearch =
                    !qbSearch.trim() ||
                    q.text.toLowerCase().includes(qbSearch.toLowerCase()) ||
                    q.domain.toLowerCase().includes(qbSearch.toLowerCase()) ||
                    q.correctAnswer.toLowerCase().includes(qbSearch.toLowerCase());
                  return matchCat && matchStage && matchDomain && matchSearch;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="bg-[#FAF3E3]/50 border border-[#B8CCE0] rounded-2xl p-8 text-center space-y-2">
                      <p className="text-xs text-[#2C4B6B]">
                        Tidak ada soal yang sesuai dengan filter pencarian saat ini.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setQbCategoryFilter('ALL');
                          setQbStageFilter('ALL');
                          setQbDomainFilter('ALL');
                          setQbSearch('');
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-[#2C4B6B] text-[#F4E6CC] text-xs font-bold cursor-pointer"
                      >
                        Tampilkan Semua ({questionsList.length})
                      </button>
                    </div>
                  );
                }

                return filtered.map((q, idx) => (
                  <div
                    key={q.id}
                    className="bg-[#FAF3E3]/35 border border-[#B8CCE0] hover:border-[#E49548]/80 p-4 rounded-2xl text-xs space-y-2.5 transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#B8CCE0]/60">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#2C4B6B]">
                        <span className="font-mono tabular-nums font-extrabold text-[#1E3954]">
                          #{q.questionNumber || idx + 1}
                        </span>
                        <span className="text-[#B8CCE0]">·</span>
                        <span className="font-bold text-[#1E3954]">{q.category}</span>
                        <span className="text-[#B8CCE0]">·</span>
                        <span className="font-medium">{q.domain}</span>
                        {q.stage && (
                          <>
                            <span className="text-[#B8CCE0]">·</span>
                            <span className="font-medium">{q.stage}</span>
                          </>
                        )}
                        <span className="text-[#B8CCE0]">·</span>
                        <span className="font-mono font-bold text-emerald-700">
                          Kunci: {q.correctAnswer}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingQuestion(q);
                            setIsEditorModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#FAF3E3] border border-[#B8CCE0] text-[#1E3954] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3 text-[#2C4B6B]" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q.id, q.questionNumber || idx + 1)}
                          className="px-2.5 py-1 rounded-lg bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>

                    <div className="text-[#1E3954] leading-relaxed overflow-x-auto">
                      <MathRenderer content={q.text} />
                    </div>

                    {q.imageUrl && (
                      <div className="pt-1">
                        <div
                          className="relative inline-block group cursor-zoom-in"
                          onClick={() => setPreviewQuestionImage(q.imageUrl || null)}
                          title="Klik untuk memperbesar gambar soal"
                        >
                          <img
                            src={q.imageUrl}
                            alt={`Gambar Soal #${q.questionNumber || idx + 1}`}
                            className="max-h-48 object-contain rounded-xl border border-[#B8CCE0] bg-white p-1"
                          />
                          <span className="absolute bottom-2 right-2 bg-[#1E3954]/85 text-[#F4E6CC] text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Maximize2 className="w-2.5 h-2.5" /> Perbesar
                          </span>
                        </div>
                      </div>
                    )}

                    {q.options && q.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px] text-[#1E3954]">
                        {q.options.map((opt) => (
                          <div
                            key={opt.id}
                            className={`p-2 rounded-lg border ${
                              q.correctAnswer === opt.id
                                ? 'bg-emerald-50/80 border-emerald-400 text-emerald-950 font-semibold'
                                : 'bg-white border-[#B8CCE0]'
                            }`}
                          >
                            <span className="font-mono font-bold mr-1.5">{opt.id}.</span>
                            <MathRenderer content={opt.text} inline />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: REKAPITULASI & PERINGKAT NILAI RESMI              */}
      {/* ======================================================== */}
      {activeTab === 'results_recap' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header Card */}
          <div className="bg-[#2C4B6B]/95 border-2 border-[#E49548] rounded-3xl p-6 shadow-md text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#F4E6CC] text-[#1E3954] px-2.5 py-0.5 rounded-lg">
                  Hasil Pengerjaan Resmi
                </span>
                <span className="text-[#E49548]">·</span>
                <span className="text-xs text-[#DCE9F5] font-medium">MMO 2027 UMM</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Rekapitulasi Nilai &amp; Papan Peringkat Peserta
              </h2>
              <p className="text-xs text-[#DCE9F5] mt-1">
                Standar Penilaian Resmi: <strong className="text-[#F4E6CC]">Benar (+4)</strong> · <strong className="text-[#F4E6CC]">Salah (-1)</strong> · <strong className="text-[#F4E6CC]">Kosong (0)</strong>. Hasil terurut otomatis dari skor tertinggi.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                onClick={handleExportExcelGrades}
                className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-xs whitespace-nowrap"
                title="Unduh seluruh rekap nilai lengkap ke berkas Excel (.csv) dengan rincian per butir soal dan waktu pengerjaan"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Rekap Excel (.csv)</span>
              </button>
            </div>
          </div>

          {/* 3 KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border-2 border-[#E49548]/70 p-5 rounded-3xl shadow-md">
              <div className="flex items-center justify-between text-[#2C4B6B] mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider">Peserta Selesai</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#1E3954] font-mono tabular-nums">
                {submittedParticipants.length}{' '}
                <span className="text-xs font-normal text-[#4E779F] font-sans">
                  / {participants.length} Terdaftar
                </span>
              </div>
              <p className="text-[11px] text-[#4E779F] mt-1">
                {participants.length > 0
                  ? `${Math.round((submittedParticipants.length / participants.length) * 100)}% lembar jawaban terkumpul`
                  : 'Belum ada peserta terdaftar'}
              </p>
            </div>

            <div className="bg-white border-2 border-[#E49548]/70 p-5 rounded-3xl shadow-md">
              <div className="flex items-center justify-between text-[#2C4B6B] mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider">Rata-Rata Skor</span>
                <Award className="w-4 h-4 text-[#CE7D30]" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#1E3954] font-mono tabular-nums">
                {avgScore > 0 ? `+${avgScore}` : avgScore}{' '}
                <span className="text-xs font-normal text-[#4E779F] font-sans">Poin</span>
              </div>
              <p className="text-[11px] text-[#4E779F] mt-1">
                Dihitung dari seluruh peserta yang sudah mengumpulkan
              </p>
            </div>

            <div className="bg-white border-2 border-[#E49548]/70 p-5 rounded-3xl shadow-md">
              <div className="flex items-center justify-between text-[#2C4B6B] mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider">Skor Tertinggi</span>
                <Trophy className="w-4 h-4 text-[#E49548]" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-mono tabular-nums">
                {topParticipant && topParticipant.score !== undefined
                  ? `${topParticipant.score > 0 ? '+' : ''}${topParticipant.score} Poin`
                  : '-'}
              </div>
              <p className="text-[11px] text-[#2C4B6B] truncate mt-1">
                {topParticipant ? `${topParticipant.name} · ${topParticipant.school}` : 'Menunggu pengerjaan selesai'}
              </p>
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className="bg-white border-2 border-[#E49548]/70 rounded-3xl p-4 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Category & Stage Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter (Jenjang) */}
              <div className="flex items-center gap-1 bg-[#FAF3E3] border border-[#B8CCE0] p-1 rounded-2xl text-xs">
                <button
                  onClick={() => setRecapCategoryFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    recapCategoryFilter === 'ALL'
                      ? 'bg-[#2C4B6B] text-[#F4E6CC] shadow-xs'
                      : 'text-[#2C4B6B] hover:text-[#1E3954] hover:bg-white/80'
                  }`}
                >
                  Semua Jenjang ({participants.length})
                </button>
                <button
                  onClick={() => setRecapCategoryFilter('SMP')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    recapCategoryFilter === 'SMP'
                      ? 'bg-[#2C4B6B] text-[#F4E6CC] shadow-xs'
                      : 'text-[#2C4B6B] hover:text-[#1E3954] hover:bg-white/80'
                  }`}
                >
                  SMP ({participants.filter((p) => p.category === 'SMP').length})
                </button>
                <button
                  onClick={() => setRecapCategoryFilter('SMA')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    recapCategoryFilter === 'SMA'
                      ? 'bg-[#2C4B6B] text-[#F4E6CC] shadow-xs'
                      : 'text-[#2C4B6B] hover:text-[#1E3954] hover:bg-white/80'
                  }`}
                >
                  SMA ({participants.filter((p) => p.category === 'SMA').length})
                </button>
              </div>

              {/* Stage Filter (Babak) */}
              <div className="flex items-center gap-1 bg-[#FAF3E3] border border-[#B8CCE0] p-1 rounded-2xl text-xs">
                <button
                  onClick={() => setRecapStageFilter('ALL')}
                  className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    recapStageFilter === 'ALL'
                      ? 'bg-[#2C4B6B] text-[#F4E6CC] shadow-xs'
                      : 'text-[#2C4B6B] hover:text-[#1E3954] hover:bg-white/80'
                  }`}
                >
                  Semua Babak ({participants.length})
                </button>
                <button
                  onClick={() => setRecapStageFilter('Penyisihan')}
                  className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    recapStageFilter === 'Penyisihan'
                      ? 'bg-[#2C4B6B] text-[#F4E6CC] shadow-xs'
                      : 'text-[#2C4B6B] hover:text-[#1E3954] hover:bg-white/80'
                  }`}
                >
                  Penyisihan ({participants.filter((p) => (p.stage || 'Penyisihan') === 'Penyisihan').length})
                </button>
                <button
                  onClick={() => setRecapStageFilter('Semifinal')}
                  className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    recapStageFilter === 'Semifinal'
                      ? 'bg-[#2C4B6B] text-[#F4E6CC] shadow-xs'
                      : 'text-[#2C4B6B] hover:text-[#1E3954] hover:bg-white/80'
                  }`}
                >
                  Semifinal ({participants.filter((p) => p.stage === 'Semifinal').length})
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#4E779F] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={recapSearchQuery}
                onChange={(e) => setRecapSearchQuery(e.target.value)}
                placeholder="Cari nama peserta atau asal sekolah..."
                className="w-full bg-[#FAF3E3] border border-[#B8CCE0] rounded-2xl pl-10 pr-4 py-2 text-xs text-[#1E3954] placeholder-[#4E779F]/70 focus:outline-none focus:border-[#E49548] focus:bg-white transition-colors"
              />
              {recapSearchQuery && (
                <button
                  onClick={() => setRecapSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4E779F] hover:text-[#1E3954] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Leaderboard Ranking Table */}
          <div className="bg-white border-2 border-[#E49548]/70 rounded-3xl overflow-hidden shadow-md">
            <div className="p-4 bg-[#FAF3E3] border-b border-[#B8CCE0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#CE7D30]" />
                <h3 className="text-xs font-extrabold text-[#1E3954] uppercase tracking-wider">
                  Tabel Peringkat Resmi Hasil Penilaian
                </h3>
              </div>
              <span className="text-[11px] text-[#4E779F] font-mono font-semibold">
                {recapParticipants.length} Peserta Ditampilkan
              </span>
            </div>

            {recapParticipants.length === 0 ? (
              <div className="p-12 text-center text-[#4E779F] space-y-2">
                <Award className="w-10 h-10 text-[#B8CCE0] mx-auto" />
                <p className="text-sm font-bold text-[#1E3954]">Belum Ada Peserta yang Sesuai</p>
                <p className="text-xs text-[#4E779F] max-w-sm mx-auto">
                  Nilai peserta akan dihitung dan muncul otomatis di sini begitu peserta menekan tombol kumpulkan ujian.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b-2 border-[#E49548] bg-[#2C4B6B] text-[11px] font-bold text-[#F4E6CC] uppercase tracking-wider">
                      <th className="py-3.5 px-4 text-center w-16">Rank</th>
                      <th className="py-3.5 px-4">Nama Peserta &amp; Sekolah</th>
                      <th className="py-3.5 px-3">Kategori</th>
                      <th className="py-3.5 px-3 text-right">Skor Akhir</th>
                      <th className="py-3.5 px-3">Rincian Jawaban</th>
                      <th className="py-3.5 px-3">Durasi &amp; Waktu</th>
                      <th className="py-3.5 px-3 text-center">Status</th>
                      <th className="py-3.5 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#B8CCE0]/60">
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
                          className="hover:bg-[#FAF3E3]/50 transition-colors"
                        >
                          {/* Rank Column */}
                          <td className="py-3.5 px-4 text-center">
                            {isRank1 ? (
                              <div className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-amber-100 text-amber-800 font-extrabold text-xs shadow-2xs border border-amber-300">
                                #1
                              </div>
                            ) : isRank2 ? (
                              <div className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-[#EBF1F6] text-[#1E3954] font-extrabold text-xs shadow-2xs border border-[#B8CCE0]">
                                #2
                              </div>
                            ) : isRank3 ? (
                              <div className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-[#F4E6CC] text-[#8F5219] font-extrabold text-xs shadow-2xs border border-[#E49548]">
                                #3
                              </div>
                            ) : (
                              <span className="font-mono text-[#4E779F] font-semibold">
                                #{index + 1}
                              </span>
                            )}
                          </td>

                          {/* Participant Name & School */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-[#1E3954] text-sm">
                              {p.name}
                            </div>
                            <div className="text-[#4E779F] text-xs">
                              {p.school}
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-3.5 px-3">
                            <span className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#FAF3E3] text-[#1E3954] border border-[#B8CCE0]">
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
                                  : 'text-[#2C4B6B]'
                              }`}
                            >
                              {finalScore > 0 ? `+${finalScore}` : finalScore}{' '}
                              <span className="text-[10px] font-normal text-[#4E779F] font-sans">
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
                              <span className="text-[#B8CCE0]">·</span>
                              <span className="text-rose-600 font-bold" title="Salah (-1 poin)">
                                ✗ {wrong}
                              </span>
                              <span className="text-[#B8CCE0]">·</span>
                              <span className="text-[#4E779F] font-medium" title="Kosong (0 poin)">
                                − {blank}
                              </span>
                            </div>
                            <div className="text-[10px] text-[#4E779F] mt-0.5">
                              {correct + wrong} dari {p.totalQuestions || 0} dijawab
                            </div>
                          </td>

                          {/* Duration & Submission Time */}
                          <td className="py-3.5 px-3">
                            <div className="font-semibold text-[#1E3954] text-xs font-mono">
                              {p.durationTaken || '-'}
                            </div>
                            <div className="text-[11px] text-[#4E779F]">
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
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-xl">
                                Mengerjakan
                              </span>
                            )}
                          </td>

                          {/* Action Button */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => setInspectingScoresParticipant(p)}
                              className="px-3 py-1.5 rounded-xl bg-[#FAF3E3] hover:bg-[#E49548] border border-[#B8CCE0] hover:border-[#E49548] text-[#1E3954] text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                              title="Lihat rincian jawaban tiap butir soal"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#2C4B6B]" />
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
          <div className="bg-[#2C4B6B]/95 border-2 border-[#E49548] rounded-3xl p-6 shadow-md text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#F4E6CC] text-[#1E3954] px-2.5 py-0.5 rounded-lg">
                  Integrasi Otomatis Google Form
                </span>
                <span className="text-[#E49548]">·</span>
                {isDemoActive ? (
                  <span className="px-2.5 py-0.5 bg-[#F4E6CC] text-[#8F5219] border border-[#E49548] rounded-lg text-[11px] font-bold inline-flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#CE7D30]" />
                    Mode Akun Demo (Simulasi)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[11px] font-bold inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                    Mode Data Pendaftaran Asli (100% Real)
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Data Akun Pendaftaran Peserta (Google Sheets &amp; Excel)
              </h2>
              <p className="text-xs text-[#DCE9F5] mt-1 max-w-2xl leading-relaxed">
                Sinkronkan tanggapan formulir pendaftaran Google Form agar peserta cukup memasukkan <strong className="text-[#F4E6CC]">Email &amp; Kata Sandi</strong>. Identitas sekolah, NISN, kota, dan jenjang otomatis divalidasi ke lembar ujian dan rekap nilai.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {isDemoActive ? (
                <button
                  type="button"
                  onClick={handleClearAllDemo}
                  className="px-3.5 py-2 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Hapus kelima akun demo Budi, Nadia, Siti, Faris, Dewi agar sistem murni menggunakan data pendaftaran Anda"
                >
                  <ShieldOff className="w-3.5 h-3.5 text-rose-600" />
                  <span>Hapus Data Demo (Gunakan Data Asli)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="px-3.5 py-2 rounded-2xl bg-[#1E3954] hover:bg-[#243E59] border border-[#4E779F] text-[#DCE9F5] text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Kembalikan akun contoh untuk simulasi pengujian"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#F4E6CC]" />
                  <span>Muat Ulang Akun Demo</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowAddManualModal(true)}
                className="px-3.5 py-2 rounded-2xl bg-[#E49548] hover:bg-[#CE7D30] text-xs font-extrabold text-[#1E3954] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5 text-[#1E3954]" />
                <span>Tambah Peserta Manual</span>
              </button>
            </div>
          </div>

          {/* Import / Sync Control Panel with 3 Methods */}
          <div className="bg-white border-2 border-[#E49548]/70 p-6 rounded-3xl shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#B8CCE0]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <FileSpreadsheet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#1E3954]">
                    Metode Sinkronisasi Data Pendaftaran
                  </h3>
                  <p className="text-xs text-[#4E779F]">
                    Pilih metode yang paling nyaman untuk mengimpor data Google Form / Excel ke portal ujian.
                  </p>
                </div>
              </div>

              {/* Tab Selector for 3 Methods */}
              <div className="inline-flex items-center p-1 bg-[#FAF3E3] border border-[#B8CCE0] rounded-2xl text-xs self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setSyncMethod('URL')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    syncMethod === 'URL'
                      ? 'bg-[#2C4B6B] text-[#F4E6CC] shadow-xs'
                      : 'text-[#2C4B6B] hover:text-[#1E3954]'
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
                      ? 'bg-[#2C4B6B] text-[#F4E6CC] shadow-xs'
                      : 'text-[#2C4B6B] hover:text-[#1E3954]'
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>2. Upload File Excel / CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasteModal(true)}
                  className="px-3 py-1.5 rounded-xl font-bold text-[#2C4B6B] hover:text-[#1E3954] transition-all cursor-pointer flex items-center gap-1.5"
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
                      className="w-full bg-[#FAF3E3] border border-[#B8CCE0] rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-[#1E3954] placeholder-[#4E779F]/70 focus:outline-none focus:border-[#E49548] focus:bg-white transition-colors font-mono"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSyncSheets}
                    disabled={isSyncingSheets}
                    className="px-5 py-2.5 rounded-2xl bg-[#E49548] hover:bg-[#CE7D30] disabled:opacity-60 disabled:cursor-not-allowed text-[#1E3954] text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    <RotateCcw className={`w-4 h-4 ${isSyncingSheets ? 'animate-spin' : ''}`} />
                    <span>{isSyncingSheets ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
                  </button>
                </div>
                <div className="text-[11px] text-[#4E779F] flex flex-wrap items-center justify-between gap-2">
                  <span>
                    Mendukung tautan Publikasikan ke Web (<strong>pubhtml</strong> / <strong>CSV</strong>) maupun tautan Berbagi Google Sheets biasa.
                  </span>
                  <span className="font-mono text-[#2C4B6B]">
                    Sinkron terakhir: <strong>{lastSyncText}</strong>
                  </span>
                </div>
              </div>
            )}

            {/* Method 2: Direct File Upload */}
            {syncMethod === 'FILE' && (
              <div className="space-y-3 animate-in fade-in">
                <label className="border-2 border-dashed border-[#B8CCE0] hover:border-[#E49548] bg-[#FAF3E3]/70 hover:bg-[#FAF3E3] rounded-2xl p-6 flex flex-col items-center justify-center gap-2.5 text-center cursor-pointer transition-all">
                  <div className="w-11 h-11 rounded-2xl bg-[#EBF1F6] border border-[#B8CCE0] flex items-center justify-center text-[#2C4B6B]">
                    <FileUp className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-[#1E3954]">
                      Klik atau Tarik Berkas Excel (.xlsx, .xls) / CSV ke sini
                    </div>
                    <p className="text-[11px] text-[#4E779F] mt-0.5">
                      Download spreadsheet dari Google Form (Menu <em>File &gt; Download &gt; Microsoft Excel (.xlsx)</em> atau CSV), lalu upload langsung tanpa perlu atur izin sharing link publik.
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-white border border-[#B8CCE0] rounded-xl text-xs font-bold text-[#1E3954] shadow-2xs">
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
                      Solusi Cepat: Anda dapat memilih tab <strong>&quot;2. Upload File Excel / CSV&quot;</strong> di atas untuk mengunggah berkas Excel unduhan formulir pendaftaran secara langsung tanpa kendala akses link.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Setup Guide accordion */}
            <div className="bg-[#FAF3E3] border border-[#B8CCE0] p-4 rounded-2xl text-xs text-[#2C4B6B] space-y-2">
              <span className="font-bold text-[#1E3954] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#CE7D30]" />
                Petunjuk Cepat Format Kolom Spreadsheet Formulir Pendaftaran:
              </span>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-[#2C4B6B] pl-1 leading-relaxed">
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
            <div className="bg-white border-2 border-[#E49548]/70 p-4 rounded-3xl shadow-md">
              <div className="text-[#2C4B6B] text-xs font-bold">Total Akun Terdaftar</div>
              <div className="text-2xl font-bold font-mono text-[#1E3954] mt-1 tabular-nums">
                {registeredList.length}
              </div>
              <span className="text-[11px] text-[#4E779F]">
                {registeredList.length === 0 ? 'Belum ada pendaftar' : 'Siap login ke ujian'}
              </span>
            </div>

            <div className="bg-white border-2 border-[#E49548]/70 p-4 rounded-3xl shadow-md">
              <div className="text-[#2C4B6B] text-xs font-bold">Peserta Jenjang SMP</div>
              <div className="text-2xl font-bold font-mono text-[#2C4B6B] mt-1 tabular-nums">
                {registeredList.filter((p) => p.category === 'SMP').length}
              </div>
              <span className="text-[11px] text-[#4E779F]">SMP / MTs Sederajat</span>
            </div>

            <div className="bg-white border-2 border-[#E49548]/70 p-4 rounded-3xl shadow-md">
              <div className="text-[#2C4B6B] text-xs font-bold">Peserta Jenjang SMA</div>
              <div className="text-2xl font-bold font-mono text-[#CE7D30] mt-1 tabular-nums">
                {registeredList.filter((p) => p.category === 'SMA').length}
              </div>
              <span className="text-[11px] text-[#4E779F]">SMA / MA / SMK Sederajat</span>
            </div>

            <div className="bg-white border-2 border-[#E49548]/70 p-4 rounded-3xl shadow-md">
              <div className="text-[#2C4B6B] text-xs font-bold">Status Basis Data</div>
              <div className="text-xs font-bold mt-2 flex items-center gap-1.5 truncate">
                {isDemoActive ? (
                  <span className="text-[#CE7D30] flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#E49548] shrink-0" />
                    <span>Mode Demo (Simulasi)</span>
                  </span>
                ) : (
                  <span className="text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Data Asli Real</span>
                  </span>
                )}
              </div>
              <span className="text-[10px] text-[#4E779F] mt-1 block truncate">
                {lastSyncText}
              </span>
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className="bg-white border-2 border-[#E49548]/70 rounded-3xl p-4 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter (Jenjang) */}
              <div className="flex items-center gap-1 bg-[#FAF3E3] border border-[#B8CCE0] p-1 rounded-2xl text-xs">
                <button
                  type="button"
                  onClick={() => setRegFilterCategory('ALL')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    regFilterCategory === 'ALL'
                      ? 'bg-[#2C4B6B] text-[#F4E6CC] shadow-xs'
                      : 'text-[#2C4B6B] hover:text-[#1E3954] hover:bg-white/80'
                  }`}
                >
                  Semua Jenjang ({registeredList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRegFilterCategory('SMP')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    regFilterCategory === 'SMP'
                      ? 'bg-[#2C4B6B] text-[#F4E6CC] shadow-xs'
                      : 'text-[#2C4B6B] hover:text-[#1E3954] hover:bg-white/80'
                  }`}
                >
                  SMP ({registeredList.filter((p) => p.category === 'SMP').length})
                </button>
                <button
                  type="button"
                  onClick={() => setRegFilterCategory('SMA')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    regFilterCategory === 'SMA'
                      ? 'bg-[#2C4B6B] text-[#F4E6CC] shadow-xs'
                      : 'text-[#2C4B6B] hover:text-[#1E3954] hover:bg-white/80'
                  }`}
                >
                  SMA ({registeredList.filter((p) => p.category === 'SMA').length})
                </button>
              </div>

              {/* Stage Filter (Babak) */}
              <div className="flex items-center gap-1 bg-[#FAF3E3] border border-[#B8CCE0] p-1 rounded-2xl text-xs">
                <button
                  type="button"
                  onClick={() => setRegFilterStage('ALL')}
                  className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    regFilterStage === 'ALL'
                      ? 'bg-[#2C4B6B] text-[#F4E6CC] shadow-xs'
                      : 'text-[#2C4B6B] hover:text-[#1E3954] hover:bg-white/80'
                  }`}
                >
                  Semua Babak ({registeredList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRegFilterStage('Penyisihan')}
                  className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    regFilterStage === 'Penyisihan'
                      ? 'bg-[#2C4B6B] text-[#F4E6CC] shadow-xs'
                      : 'text-[#2C4B6B] hover:text-[#1E3954] hover:bg-white/80'
                  }`}
                >
                  Penyisihan ({registeredList.filter((p) => (p.stage || 'Penyisihan') === 'Penyisihan').length})
                </button>
                <button
                  type="button"
                  onClick={() => setRegFilterStage('Semifinal')}
                  className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    regFilterStage === 'Semifinal'
                      ? 'bg-[#2C4B6B] text-[#F4E6CC] shadow-xs'
                      : 'text-[#2C4B6B] hover:text-[#1E3954] hover:bg-white/80'
                  }`}
                >
                  Semifinal ({registeredList.filter((p) => p.stage === 'Semifinal').length})
                </button>
              </div>
            </div>

            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4E779F]" />
              <input
                type="text"
                value={regSearchQuery}
                onChange={(e) => setRegSearchQuery(e.target.value)}
                placeholder="Cari nama peserta, email, sekolah, kota, atau NISN..."
                className="w-full bg-[#FAF3E3] border border-[#B8CCE0] rounded-2xl pl-10 pr-3 py-2 text-xs text-[#1E3954] placeholder-[#4E779F]/70 focus:outline-none focus:border-[#E49548] focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Registered Participants Table */}
          <div className="bg-white border-2 border-[#E49548]/70 rounded-3xl overflow-hidden shadow-md">
            {registeredList.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#FAF3E3] border border-[#B8CCE0] flex items-center justify-center mx-auto text-[#4E779F]">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-[#1E3954]">
                  Belum Ada Akun Peserta Terdaftar
                </h4>
                <p className="text-xs text-[#4E779F] max-w-md mx-auto">
                  Semua data demo telah dibersihkan. Silakan masukkan tautan Google Spreadsheet, upload berkas Excel pendaftaran, atau tambahkan peserta manual di atas untuk mulai menguji coba secara utuh.
                </p>
                <div className="pt-2 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddManualModal(true)}
                    className="px-4 py-2 bg-[#E49548] hover:bg-[#CE7D30] text-[#1E3954] text-xs font-extrabold rounded-xl shadow-xs cursor-pointer"
                  >
                    Tambah Peserta Manual
                  </button>
                  <button
                    type="button"
                    onClick={handleResetToDefault}
                    className="px-4 py-2 bg-[#FAF3E3] hover:bg-[#EBF1F6] border border-[#B8CCE0] text-[#1E3954] text-xs font-semibold rounded-xl shadow-2xs cursor-pointer"
                  >
                    Muat Akun Demo Kembali
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#2C4B6B] border-b-2 border-[#E49548] text-[#F4E6CC] uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4 font-bold text-center w-12">No</th>
                      <th className="py-3 px-4 font-bold">Nama Lengkap (Kredensial Login)</th>
                      <th className="py-3 px-4 font-bold">Asal Sekolah &amp; Kota</th>
                      <th className="py-3 px-3 font-bold text-center">Jenjang &amp; Babak</th>
                      <th className="py-3 px-3 font-bold font-mono">NISN / Sandi Awal</th>
                      <th className="py-3 px-3 font-bold font-mono">Kata Sandi Aktif</th>
                      <th className="py-3 px-4 font-bold">Email Pendaftaran</th>
                      <th className="py-3 px-3 font-bold text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#B8CCE0]/60">
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
                          <tr key={p.id} className="hover:bg-[#FAF3E3]/50 transition-colors">
                            <td className="py-3 px-4 font-mono text-[#4E779F] text-xs text-center">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5 font-bold text-[#1E3954] text-xs sm:text-sm">
                                <span>{p.fullName}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyCredential(p.fullName, `${p.id}-name`)}
                                  className="text-[#4E779F] hover:text-[#1E3954] p-0.5 cursor-pointer"
                                  title="Salin Nama Lengkap"
                                >
                                  {isCopiedName ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                              <div className="text-[10px] text-[#4E779F] font-mono">
                                ID: {p.id} · <span className="text-[#4E779F]/80">Case-insensitive</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-[#1E3954] text-xs">
                                {p.school}
                              </div>
                              <div className="text-[11px] text-[#4E779F]">
                                {p.city}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span
                                  className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-lg border ${
                                    p.category === 'SMP'
                                      ? 'bg-[#EBF1F6] text-[#2C4B6B] border-[#B8CCE0]'
                                      : 'bg-[#F4E6CC] text-[#8F5219] border-[#E49548]'
                                  }`}
                                >
                                  {p.category}
                                </span>
                                <span className="inline-block text-[9px] font-semibold px-2 py-0.5 rounded-md bg-[#FAF3E3] text-[#2C4B6B] border border-[#B8CCE0]">
                                  {p.stage || 'Penyisihan'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3 font-mono text-xs font-bold text-[#1E3954]">
                              <div className="flex items-center gap-1.5">
                                <span>{p.nisnOrRegNumber}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyCredential(p.nisnOrRegNumber, `${p.id}-nisn`)}
                                  className="text-[#4E779F] hover:text-[#1E3954] p-0.5 cursor-pointer"
                                  title="Salin NISN"
                                >
                                  {isCopiedNisn ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                              <span className="text-[10px] text-[#4E779F] block font-sans">Kata sandi default</span>
                            </td>
                            <td className="py-3 px-3 font-mono text-xs font-semibold text-[#1E3954]">
                              <div className="flex items-center gap-1.5">
                                <span>{p.password || p.nisnOrRegNumber}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyCredential(p.password || p.nisnOrRegNumber, `${p.id}-pass`)}
                                  className="text-[#4E779F] hover:text-[#1E3954] p-0.5 cursor-pointer"
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
                            <td className="py-3 px-4 font-mono text-xs text-[#2C4B6B]">
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
                                className="p-1.5 rounded-xl hover:bg-rose-50 text-[#4E779F] hover:text-rose-600 transition-colors cursor-pointer"
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

      {/* ======================================================== */}
      {/* VIEW 5: PESAN & SARAN WEBSITE + SPREADSHEET SYNC         */}
      {/* ======================================================== */}
      {activeTab === 'feedback' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Top Action & Export Card */}
          <div className="bg-[#2C4B6B]/95 border-2 border-[#E49548] rounded-3xl p-5 sm:p-6 shadow-md text-white space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[#E49548] text-[#1E3954] flex items-center justify-center shrink-0 shadow-xs">
                  <MessageSquareText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-white">
                    Pesan &amp; Saran Peserta untuk Website MMO
                  </h2>
                  <p className="text-xs text-[#DCE9F5] mt-0.5 leading-relaxed">
                    Setiap masukan yang dikirim peserta setelah ujian selesai otomatis tersimpan di server, dapat diekspor ke Excel/CSV, dan langsung diteruskan ke Google Spreadsheet jika Webhook aktif.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => loadFeedbackData(false)}
                  disabled={isLoadingFeedback}
                  className="px-3.5 py-2 rounded-xl bg-[#1E3954] hover:bg-[#243E59] border border-[#4E779F] text-xs font-semibold text-[#DCE9F5] flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#F4E6CC] ${isLoadingFeedback ? 'animate-spin' : ''}`} />
                  <span>Muat Ulang</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportFeedbackExcel}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 shadow-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ekspor Excel (.xlsx)</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportFeedbackCsv}
                  className="px-3.5 py-2 rounded-xl bg-[#FAF3E3] hover:bg-white border border-[#E49548] text-[#1E3954] text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#2C4B6B]" />
                  <span>Ekspor CSV</span>
                </button>

                {feedbackList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setConfirmClearFeedbackModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Kosongkan</span>
                  </button>
                )}
              </div>
            </div>

            {/* Clean Numeric Strip */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="bg-[#FAF3E3] border border-[#E49548]/60 rounded-2xl px-4 py-3">
                <span className="text-[11px] font-bold text-[#2C4B6B] block">Total Pesan Masuk</span>
                <span className="text-xl font-extrabold font-mono tabular-nums text-[#1E3954] mt-0.5 block">
                  {feedbackStats.total}
                </span>
              </div>
              <div className="bg-[#FAF3E3] border border-[#E49548]/60 rounded-2xl px-4 py-3">
                <span className="text-[11px] font-bold text-[#2C4B6B] block">Masuk Google Sheets</span>
                <span className="text-xl font-extrabold font-mono tabular-nums text-emerald-700 mt-0.5 block">
                  {feedbackStats.synced}
                </span>
              </div>
              <div className="bg-[#FAF3E3] border border-[#E49548]/60 rounded-2xl px-4 py-3">
                <span className="text-[11px] font-bold text-[#2C4B6B] block">Belum Sinkron Sheets</span>
                <span className="text-xl font-extrabold font-mono tabular-nums text-[#CE7D30] mt-0.5 block">
                  {feedbackStats.pending}
                </span>
              </div>
            </div>

            {/* Feedback Banner */}
            {feedbackBanner && (
              <div
                className={`p-3.5 rounded-2xl border text-xs flex items-start justify-between gap-3 ${
                  feedbackBanner.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-start gap-2">
                  {feedbackBanner.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                  )}
                  <span className="leading-relaxed">{feedbackBanner.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFeedbackBanner(null)}
                  className="text-[#4E779F] hover:text-[#1E3954] cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Google Sheets Apps Script Webhook Settings Card */}
          <div className="bg-white border-2 border-[#E49548]/70 rounded-3xl p-5 sm:p-6 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#B8CCE0]">
              <div className="flex items-center gap-2.5">
                <Link2 className="w-4 h-4 text-[#CE7D30] shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-[#1E3954]">
                    Webhook Otomatis ke Google Sheets (Opsional / Real-Time)
                  </h3>
                  <p className="text-[11px] text-[#4E779F]">
                    {feedbackWebhookUrl
                      ? 'Status: Terhubung · Setiap pesan baru otomatis ditambahkan ke Google Spreadsheet.'
                      : 'Status: Belum dikonfigurasi · Pesan tetap tersimpan aman di server & siap Ekspor Excel.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAppsScriptGuide((prev) => !prev)}
                className="px-3 py-1.5 rounded-xl bg-[#FAF3E3] hover:bg-[#EBF1F6] border border-[#B8CCE0] text-xs font-bold text-[#1E3954] cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
              >
                {showAppsScriptGuide ? 'Sembunyikan Panduan Script' : 'Panduan & Salin Kode Apps Script'}
              </button>
            </div>

            <form onSubmit={handleSaveFeedbackWebhook} className="flex flex-col lg:flex-row gap-2.5">
              <input
                type="url"
                value={feedbackWebhookInput}
                onChange={(e) => setFeedbackWebhookInput(e.target.value)}
                placeholder="Tempel Web App URL Google Apps Script (https://script.google.com/macros/s/.../exec)"
                className="flex-1 bg-[#FAF3E3] focus:bg-white border border-[#B8CCE0] focus:border-[#E49548] rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#1E3954] placeholder-[#4E779F]/70 focus:outline-none"
              />
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="submit"
                  disabled={isSavingWebhook}
                  className="px-4 py-2.5 rounded-xl bg-[#E49548] hover:bg-[#CE7D30] disabled:opacity-60 text-[#1E3954] text-xs font-extrabold cursor-pointer whitespace-nowrap shrink-0 transition-colors shadow-xs"
                >
                  {isSavingWebhook ? 'Menyimpan...' : 'Simpan URL'}
                </button>
                <button
                  type="button"
                  onClick={handleTestFeedbackWebhook}
                  disabled={isTestingWebhook || !feedbackWebhookInput.trim()}
                  className="px-4 py-2.5 rounded-xl bg-[#FAF3E3] hover:bg-[#EBF1F6] border border-[#B8CCE0] disabled:opacity-50 text-[#1E3954] text-xs font-bold cursor-pointer whitespace-nowrap shrink-0 transition-colors"
                >
                  {isTestingWebhook ? 'Menguji...' : 'Tes Kirim ke Sheets'}
                </button>
                {feedbackWebhookUrl && feedbackStats.pending > 0 && (
                  <button
                    type="button"
                    onClick={handleSyncAllFeedback}
                    disabled={isSyncingAllFeedback}
                    className="px-4 py-2.5 rounded-xl bg-[#2C4B6B] hover:bg-[#1E3954] disabled:opacity-60 text-[#F4E6CC] text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {isSyncingAllFeedback
                        ? 'Menyinkronkan...'
                        : `Sinkronkan (${feedbackStats.pending})`}
                    </span>
                  </button>
                )}
              </div>
            </form>

            {showAppsScriptGuide && (
              <div className="bg-[#FAF3E3] border border-[#B8CCE0] rounded-2xl p-4 space-y-3 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="font-bold text-[#1E3954]">
                    Cara Menghubungkan ke Google Sheets Panitia (3 Langkah):
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_FEEDBACK_TEMPLATE);
                      setScriptCopied(true);
                      setTimeout(() => setScriptCopied(false), 2500);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#EBF1F6] border border-[#B8CCE0] text-[#1E3954] font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 self-start"
                  >
                    {scriptCopied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{scriptCopied ? 'Kode Tersalin!' : 'Salin Kode Script'}</span>
                  </button>
                </div>

                <ol className="list-decimal list-inside space-y-1 text-[#2C4B6B] leading-relaxed">
                  <li>
                    Buka Google Spreadsheet tujuan, lalu klik menu <strong>Extensions &rarr; Apps Script</strong>.
                  </li>
                  <li>
                    Hapus kode lama, tempel script di bawah ini, lalu klik <strong>Deploy &rarr; New deployment &rarr; Web app</strong>.
                  </li>
                  <li>
                    Setel <em>Execute as: Me</em> dan <em>Who has access: Anyone</em>, salin <strong>Web app URL</strong>, lalu tempel di kolom atas.
                  </li>
                </ol>

                <pre className="bg-[#1E3954] border-2 border-[#E49548] text-[#FAF3E3] rounded-xl p-3.5 text-[11px] font-mono overflow-x-auto max-h-60 leading-relaxed">
                  {GOOGLE_APPS_SCRIPT_FEEDBACK_TEMPLATE}
                </pre>
              </div>
            )}
          </div>

          {/* Search & Feedback List Card */}
          <div className="bg-white border-2 border-[#E49548]/70 rounded-3xl overflow-hidden shadow-md">
            <div className="p-4 sm:p-5 bg-[#FAF3E3] border-b border-[#B8CCE0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-[#4E779F] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={feedbackSearchQuery}
                  onChange={(e) => setFeedbackSearchQuery(e.target.value)}
                  placeholder="Cari nama peserta, sekolah, NISN, atau isi pesan..."
                  className="w-full bg-white border border-[#B8CCE0] rounded-xl pl-9 pr-3 py-2 text-xs text-[#1E3954] placeholder-[#4E779F]/70 focus:outline-none focus:border-[#E49548]"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                {(['ALL', 'SMP', 'SMA'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFeedbackCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-xl font-bold border cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
                      feedbackCategoryFilter === cat
                        ? 'bg-[#2C4B6B] text-[#F4E6CC] border-[#2C4B6B]'
                        : 'bg-white text-[#2C4B6B] border-[#B8CCE0] hover:bg-[#EBF1F6]'
                    }`}
                  >
                    {cat === 'ALL' ? 'Semua Jenjang' : cat}
                  </button>
                ))}
              </div>
            </div>

            {filteredFeedbackList.length === 0 ? (
              <div className="p-10 text-center space-y-2 text-[#4E779F]">
                <MessageSquareText className="w-8 h-8 text-[#B8CCE0] mx-auto" />
                <p className="text-sm font-bold text-[#1E3954]">
                  {feedbackList.length === 0
                    ? 'Belum ada pesan & saran peserta yang masuk.'
                    : 'Tidak ada pesan yang cocok dengan filter pencarian.'}
                </p>
                <p className="text-xs text-[#4E779F]">
                  Pesan yang dikirim peserta dari halaman Tanda Terima Selesai Ujian akan langsung muncul di sini.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#2C4B6B] border-b-2 border-[#E49548] text-[#F4E6CC] uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4 text-center w-12">No</th>
                      <th className="py-3 px-4 whitespace-nowrap">Waktu Kirim</th>
                      <th className="py-3 px-4">Peserta &amp; Sekolah</th>
                      <th className="py-3 px-3 text-center whitespace-nowrap">Kategori</th>
                      <th className="py-3 px-4 min-w-[260px]">Pesan &amp; Saran Website</th>
                      <th className="py-3 px-3 whitespace-nowrap">Status Sheets</th>
                      <th className="py-3 px-3 text-center w-20">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#B8CCE0]/60">
                    {filteredFeedbackList.map((entry, idx) => (
                      <tr key={entry.id} className="hover:bg-[#FAF3E3]/50 transition-colors align-top">
                        <td className="py-3.5 px-4 text-center font-mono tabular-nums text-[#4E779F]">
                          {idx + 1}
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums text-[11px] text-[#2C4B6B] whitespace-nowrap">
                          {entry.submittedAtWib}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#1E3954] text-xs">{entry.participantName}</div>
                          <div className="text-[11px] text-[#2C4B6B] mt-0.5">{entry.school}</div>
                          <div className="text-[10px] font-mono text-[#4E779F] mt-0.5">
                            NISN: {entry.nisnOrRegNumber || '-'}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded-md border border-[#B8CCE0] bg-[#FAF3E3] text-[#1E3954] font-bold text-[11px]">
                            {entry.category} · {entry.stage}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-[#1E3954] leading-relaxed whitespace-pre-wrap">
                          {entry.message}
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <div className="space-y-1.5">
                            {entry.webhookStatus === 'synced' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-[11px]">
                                <Check className="w-3 h-3" />
                                Terkirim
                              </span>
                            ) : entry.webhookStatus === 'failed' ? (
                              <span
                                title={entry.webhookError || 'Gagal mengirim ke webhook'}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 font-semibold text-[11px]"
                              >
                                <AlertTriangle className="w-3 h-3" />
                                Gagal
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-md bg-[#EBF1F6] border border-[#B8CCE0] text-[#2C4B6B] font-semibold text-[11px]">
                                Server Lokal
                              </span>
                            )}

                            {entry.webhookStatus !== 'synced' && feedbackWebhookUrl && (
                              <div>
                                <button
                                  type="button"
                                  onClick={() => handleSyncSingleFeedback(entry.id)}
                                  disabled={syncingFeedbackId === entry.id}
                                  className="text-[11px] font-bold text-[#2C4B6B] hover:text-[#CE7D30] underline cursor-pointer disabled:opacity-50"
                                >
                                  {syncingFeedbackId === entry.id ? 'Mengirim...' : 'Kirim ke Sheets'}
                                </button>
                              </div>
                            )}

                            {entry.webhookError && (
                              <div className="text-[10px] text-rose-600 max-w-[180px] whitespace-normal">
                                {entry.webhookError}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteSingleFeedback(entry.id)}
                            className="p-1.5 rounded-xl hover:bg-rose-50 text-[#4E779F] hover:text-rose-600 transition-colors cursor-pointer"
                            title="Hapus Pesan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Tempel Teks Tabel (Copy-Paste dari Excel/Sheets) */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-[#1E3954]/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#E49548] rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl text-[#1E3954] animate-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 bg-[#2C4B6B] border-b-2 border-[#E49548] text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#E49548] text-[#1E3954] flex items-center justify-center shrink-0">
                  <ClipboardPaste className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    Tempel Data dari Spreadsheet (Copy-Paste)
                  </h3>
                  <p className="text-[11px] text-[#DCE9F5]">
                    Blok tabel data pendaftar beserta baris header di Google Sheets / Excel, tekan Ctrl+C, lalu tempel (Ctrl+V) di bawah.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="w-7 h-7 rounded-full hover:bg-[#1E3954] flex items-center justify-center text-[#DCE9F5] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <textarea
                rows={8}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Contoh header dan baris:&#10;Email&#9;Password&#9;Nama Lengkap&#9;Asal Sekolah&#9;Kategori&#9;Kota&#10;peserta1@gmail.com&#9;mmo2026&#9;Ahmad Dani&#9;SMPN 1 Malang&#9;SMP&#9;Malang"
                className="w-full bg-[#FAF3E3] border border-[#B8CCE0] rounded-2xl p-3.5 text-xs text-[#1E3954] placeholder-[#4E779F]/70 font-mono focus:outline-none focus:border-[#E49548] focus:bg-white resize-y"
              />
              <span className="text-[11px] text-[#4E779F] block">
                Mendukung teks terpisah TAB (hasil copy spreadsheet) maupun teks koma CSV.
              </span>
            </div>

            <div className="px-6 py-4 bg-[#FAF3E3] border-t border-[#B8CCE0] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-[#EBF1F6] border border-[#B8CCE0] text-[#1E3954] font-semibold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handlePasteImportSubmit}
                disabled={!pastedText.trim()}
                className="px-5 py-2 rounded-xl bg-[#E49548] hover:bg-[#CE7D30] disabled:opacity-50 text-[#1E3954] font-extrabold text-xs cursor-pointer shadow-xs"
              >
                Impor Data Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Peserta Manual */}
      {showAddManualModal && (
        <div className="fixed inset-0 z-50 bg-[#1E3954]/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#E49548] rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl text-[#1E3954] animate-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 bg-[#2C4B6B] border-b-2 border-[#E49548] text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#E49548] text-[#1E3954] flex items-center justify-center">
                  <PlusCircle className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-white">
                  Tambah Akun Peserta Manual
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddManualModal(false)}
                className="w-7 h-7 rounded-full hover:bg-[#1E3954] flex items-center justify-center text-[#DCE9F5] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddManualSubmit} className="p-6 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-[#1E3954] mb-1">Jenjang *</label>
                  <select
                    value={mCategory}
                    onChange={(e) => setMCategory(e.target.value as OlympiadCategory)}
                    className="w-full bg-[#FAF3E3] border border-[#B8CCE0] rounded-xl px-3 py-2 text-[#1E3954] focus:outline-none focus:border-[#E49548] focus:bg-white"
                  >
                    <option value="SMP">SMP / MTs</option>
                    <option value="SMA">SMA / MA / SMK</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#1E3954] mb-1">Babak *</label>
                  <select
                    value={mStage}
                    onChange={(e) => setMStage(e.target.value as CompetitionStage)}
                    className="w-full bg-[#FAF3E3] border border-[#B8CCE0] rounded-xl px-3 py-2 text-[#1E3954] focus:outline-none focus:border-[#E49548] focus:bg-white"
                  >
                    <option value="Penyisihan">Penyisihan</option>
                    <option value="Semifinal">Semifinal</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#1E3954] mb-1">NISN / No Peserta</label>
                  <input
                    type="text"
                    value={mNisn}
                    onChange={(e) => setMNisn(e.target.value)}
                    placeholder="0071234567"
                    className="w-full bg-[#FAF3E3] border border-[#B8CCE0] rounded-xl px-3 py-2 text-[#1E3954] placeholder-[#4E779F]/70 font-mono focus:outline-none focus:border-[#E49548] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#1E3954] mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={mName}
                  onChange={(e) => setMName(e.target.value)}
                  placeholder="Nama Peserta Lengkap"
                  className="w-full bg-[#FAF3E3] border border-[#B8CCE0] rounded-xl px-3 py-2 text-[#1E3954] placeholder-[#4E779F]/70 focus:outline-none focus:border-[#E49548] focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1E3954] mb-1">Asal Sekolah *</label>
                <input
                  type="text"
                  required
                  value={mSchool}
                  onChange={(e) => setMSchool(e.target.value)}
                  placeholder="Nama Sekolah Lengkap"
                  className="w-full bg-[#FAF3E3] border border-[#B8CCE0] rounded-xl px-3 py-2 text-[#1E3954] placeholder-[#4E779F]/70 focus:outline-none focus:border-[#E49548] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1E3954] mb-1">Alamat Email *</label>
                  <input
                    type="email"
                    required
                    value={mEmail}
                    onChange={(e) => setMEmail(e.target.value)}
                    placeholder="nama@gmail.com"
                    className="w-full bg-[#FAF3E3] border border-[#B8CCE0] rounded-xl px-3 py-2 text-[#1E3954] placeholder-[#4E779F]/70 font-mono focus:outline-none focus:border-[#E49548] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1E3954] mb-1">Kata Sandi Login *</label>
                  <input
                    type="text"
                    required
                    value={mPassword}
                    onChange={(e) => setMPassword(e.target.value)}
                    placeholder="mmo2026"
                    className="w-full bg-[#FAF3E3] border border-[#B8CCE0] rounded-xl px-3 py-2 text-[#1E3954] placeholder-[#4E779F]/70 font-mono focus:outline-none focus:border-[#E49548] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#1E3954] mb-1">Kota / Domisili</label>
                <input
                  type="text"
                  value={mCity}
                  onChange={(e) => setMCity(e.target.value)}
                  placeholder="Kota / Kabupaten"
                  className="w-full bg-[#FAF3E3] border border-[#B8CCE0] rounded-xl px-3 py-2 text-[#1E3954] placeholder-[#4E779F]/70 focus:outline-none focus:border-[#E49548] focus:bg-white"
                />
              </div>

              <div className="pt-4 mt-2 border-t border-[#B8CCE0] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddManualModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#FAF3E3] hover:bg-[#EBF1F6] border border-[#B8CCE0] text-[#1E3954] font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#E49548] hover:bg-[#CE7D30] text-[#1E3954] font-extrabold cursor-pointer shadow-xs"
                >
                  Simpan Peserta
                </button>
              </div>
            </form>
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
        <div className="fixed inset-0 z-50 bg-[#1E3954]/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#243E59] border-2 border-[#E49548] rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl p-6 text-white relative animate-in fade-in">
            <button
              onClick={() => setExpandedCameraParticipant(null)}
              className="absolute top-4 right-4 p-2 rounded-2xl bg-[#1E3954] hover:bg-[#2C4B6B] border border-[#4E779F] text-[#DCE9F5] hover:text-white transition-colors cursor-pointer"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <h3 className="text-base font-bold text-white leading-tight">
                  {expandedCameraParticipant.name}
                </h3>
                <p className="text-xs text-[#DCE9F5]">
                  {expandedCameraParticipant.school} · {expandedCameraParticipant.category}
                </p>
              </div>
            </div>

            <div className="aspect-video bg-[#1E3954] rounded-2xl overflow-hidden relative flex items-center justify-center border-2 border-[#4E779F]/60 mb-4">
              {expandedCameraParticipant.cameraSnapshot ? (
                <img
                  src={expandedCameraParticipant.cameraSnapshot}
                  alt={expandedCameraParticipant.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center p-6 text-[#DCE9F5]">
                  <CameraOff className="w-10 h-10 mx-auto mb-2 text-[#4E779F]" />
                  <p className="text-sm">Tidak ada aliran kamera aktif</p>
                </div>
              )}
              <div className="absolute top-3 left-3 bg-[#1E3954]/85 border border-[#4E779F]/50 px-2.5 py-1 rounded-xl text-xs font-mono text-emerald-400">
                ● SIARAN LANGSUNG (LIVE PROCTOR)
              </div>
              <div className="absolute bottom-3 left-3 bg-[#1E3954]/85 border border-[#4E779F]/50 px-2.5 py-1 rounded-xl text-xs font-mono text-[#F4E6CC]">
                Integritas: {expandedCameraParticipant.trustScore}% · Strikes: {expandedCameraParticipant.strikeCount}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setExpandedCameraParticipant(null)}
                className="px-5 py-2 rounded-2xl bg-[#E49548] hover:bg-[#CE7D30] text-[#1E3954] text-xs font-extrabold cursor-pointer transition-colors"
              >
                Tutup Tampilan Kamera
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Rincian Jawaban & Nilai Peserta */}
      {inspectingScoresParticipant && (
        <div className="fixed inset-0 z-50 bg-[#1E3954]/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border-2 border-[#E49548] rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl text-[#1E3954] relative animate-in fade-in overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="p-6 bg-[#2C4B6B] border-b-2 border-[#E49548] text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#F4E6CC] text-[#1E3954] px-2.5 py-0.5 rounded-lg">
                    Rincian Hasil Ujian
                  </span>
                  <span className="text-[#E49548]">·</span>
                  <span className="text-xs text-[#DCE9F5] font-mono">
                    ID: {inspectingScoresParticipant.id}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  {inspectingScoresParticipant.name}
                </h3>
                <p className="text-xs text-[#DCE9F5] mt-0.5">
                  {inspectingScoresParticipant.school} · Kategori: <strong className="text-[#F4E6CC]">{inspectingScoresParticipant.category}</strong>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right bg-[#FAF3E3] border-2 border-[#E49548] px-4 py-2 rounded-2xl shadow-2xs">
                  <span className="text-[10px] font-bold text-[#2C4B6B] uppercase tracking-wider block">
                    Skor Akhir
                  </span>
                  <span className="text-xl font-extrabold font-mono tabular-nums text-emerald-700">
                    {inspectingScoresParticipant.score !== undefined
                      ? `${inspectingScoresParticipant.score > 0 ? '+' : ''}${inspectingScoresParticipant.score}`
                      : '0'}{' '}
                    <span className="text-xs font-normal text-[#4E779F] font-sans">Poin</span>
                  </span>
                </div>

                <button
                  onClick={() => setInspectingScoresParticipant(null)}
                  className="p-2 rounded-2xl bg-[#1E3954] hover:bg-[#243E59] border border-[#4E779F] text-[#DCE9F5] hover:text-white transition-colors cursor-pointer"
                  title="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Stats Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4 bg-[#FAF3E3] border-b border-[#B8CCE0] text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-[#B8CCE0] text-center">
                <span className="text-[#4E779F] text-[10px] font-semibold block">Benar (+4)</span>
                <span className="font-bold text-emerald-700 text-sm font-mono">
                  {inspectingScoresParticipant.correctCount ?? 0} Soal
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-[#B8CCE0] text-center">
                <span className="text-[#4E779F] text-[10px] font-semibold block">Salah (-1)</span>
                <span className="font-bold text-rose-600 text-sm font-mono">
                  {inspectingScoresParticipant.wrongCount ?? 0} Soal
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-[#B8CCE0] text-center">
                <span className="text-[#4E779F] text-[10px] font-semibold block">Kosong (0)</span>
                <span className="font-bold text-[#1E3954] text-sm font-mono">
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
              <div className="bg-white p-2.5 rounded-xl border border-[#B8CCE0] text-center">
                <span className="text-[#4E779F] text-[10px] font-semibold block">Durasi Pengerjaan</span>
                <span className="font-bold text-[#1E3954] text-xs font-mono">
                  {inspectingScoresParticipant.durationTaken || '-'}
                </span>
              </div>
            </div>

            {/* Questions Detailed Breakdown */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <h4 className="text-xs font-extrabold text-[#1E3954] uppercase tracking-wider">
                Rincian Analisis Jawaban Tiap Butir Soal:
              </h4>

              {(() => {
                const relevantQuestions = questionsList.filter(
                  (q) => q.category === inspectingScoresParticipant.category
                );

                if (relevantQuestions.length === 0) {
                  return (
                    <div className="p-6 text-center text-xs text-[#4E779F] bg-[#FAF3E3] rounded-2xl border border-[#B8CCE0]">
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
                          ? 'bg-[#FAF3E3]/70 border-[#B8CCE0]'
                          : 'bg-rose-50/40 border-rose-300'
                      }`}
                    >
                      {/* Question Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#B8CCE0]/60">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-[#1E3954] text-sm">
                            Soal #{idx + 1}
                          </span>
                          <span className="text-[#B8CCE0]">·</span>
                          <span className="px-2 py-0.5 rounded-md bg-white border border-[#B8CCE0] text-[#2C4B6B] font-semibold text-[10px]">
                            {q.domain}
                          </span>
                          {q.focus && (
                            <span className="px-2 py-0.5 rounded-md bg-[#2C4B6B] text-[#F4E6CC] text-[10px] font-semibold">
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
                            <span className="inline-flex items-center gap-1 font-semibold text-[#2C4B6B] bg-[#EBF1F6] border border-[#B8CCE0] px-2.5 py-0.5 rounded-xl text-xs">
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
                      <div className="text-[#1E3954] leading-relaxed overflow-x-auto bg-white/90 p-3 rounded-xl border border-[#B8CCE0]/50">
                        <MathRenderer content={q.text} />
                      </div>

                      {/* Answers Comparison Box */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                        <div
                          className={`p-2.5 rounded-xl border ${
                            isCorrect
                              ? 'bg-emerald-100/70 border-emerald-300 text-emerald-950'
                              : isBlank
                              ? 'bg-[#EBF1F6] border-[#B8CCE0] text-[#2C4B6B]'
                              : 'bg-rose-100/70 border-rose-300 text-rose-950'
                          }`}
                        >
                          <span className="text-[10px] uppercase font-semibold text-[#4E779F] block">
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
                        <div className="bg-white border border-[#B8CCE0] p-3 rounded-xl text-[11px] text-[#2C4B6B] leading-relaxed">
                          <strong className="text-[#1E3954] block mb-0.5">
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
            <div className="p-4 bg-[#FAF3E3] border-t border-[#B8CCE0] flex items-center justify-between">
              <button
                onClick={handleExportExcelGrades}
                className="px-3.5 py-2 rounded-2xl bg-white hover:bg-[#EBF1F6] border border-[#B8CCE0] text-xs font-bold text-[#1E3954] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700" />
                <span>Unduh Semua Rekap ke Excel</span>
              </button>

              <button
                onClick={() => setInspectingScoresParticipant(null)}
                className="px-5 py-2 rounded-2xl bg-[#E49548] hover:bg-[#CE7D30] text-[#1E3954] text-xs font-extrabold cursor-pointer transition-colors shadow-xs"
              >
                Tutup Rincian
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zoom 2-Device Proctoring Settings Modal */}
      {isZoomSettingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1E3954]/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#E49548] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl text-[#1E3954] animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b-2 border-[#E49548] flex items-center justify-between bg-[#2C4B6B] text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#E49548] flex items-center justify-center text-[#1E3954] shadow-xs">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    Pengaturan Pengawasan Zoom (2 Divais)
                  </h3>
                  <p className="text-[11px] text-[#DCE9F5]">
                    MMO 2027 · Ruang Pengawas &amp; Juri
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsZoomSettingsModalOpen(false)}
                className="p-1 rounded-xl text-[#DCE9F5] hover:text-white hover:bg-[#1E3954] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs text-[#2C4B6B]">
              <div className="p-3 bg-[#EBF1F6] border border-[#B8CCE0] rounded-2xl text-[#1E3954] space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-[#2C4B6B]" />
                  Instruksi 2 Perangkat untuk Peserta:
                </span>
                <p className="text-[11px] leading-relaxed text-[#2C4B6B]">
                  Peserta mengerjakan soal di Laptop atau HP utama, dan menyalakan kamera Zoom pengawas melalui HP kedua yang diletakkan di samping meja (sudut 45° menghadap layar dan tangan peserta).
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#1E3954] mb-1">
                    Meeting ID Zoom
                  </label>
                  <input
                    type="text"
                    value={zoomMeetingId}
                    onChange={(e) => setZoomMeetingId(e.target.value)}
                    className="w-full bg-[#FAF3E3] border border-[#B8CCE0] rounded-xl px-3 py-2 font-mono text-[#1E3954] text-xs focus:outline-none focus:border-[#E49548] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1E3954] mb-1">
                    Passcode Zoom
                  </label>
                  <input
                    type="text"
                    value={zoomPasscode}
                    onChange={(e) => setZoomPasscode(e.target.value)}
                    className="w-full bg-[#FAF3E3] border border-[#B8CCE0] rounded-xl px-3 py-2 font-mono text-[#1E3954] text-xs focus:outline-none focus:border-[#E49548] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1E3954] mb-1">
                    Tautan / Link Join Zoom
                  </label>
                  <input
                    type="text"
                    value={zoomJoinUrl}
                    onChange={(e) => setZoomJoinUrl(e.target.value)}
                    className="w-full bg-[#FAF3E3] border border-[#B8CCE0] rounded-xl px-3 py-2 font-mono text-[#1E3954] text-xs focus:outline-none focus:border-[#E49548] focus:bg-white"
                  />
                </div>
              </div>

              {/* Broadcast reminder button */}
              <div className="pt-2 border-t border-[#B8CCE0] flex flex-col gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const notice = 'Pemberitahuan Pengawas: Peserta dengan mode 2 perangkat mohon pastikan kamera Zoom di HP kedua tetap aktif mengarah ke meja ujian.';
                    await ApiService.sendBroadcast(notice);
                    setBroadcastNotice('Pemberitahuan Zoom berhasil disiarkan ke semua layar peserta!');
                    setTimeout(() => setBroadcastNotice(null), 4000);
                  }}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-[#FAF3E3] hover:bg-[#F4E6CC] border border-[#E49548] text-[#1E3954] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Radio className="w-3.5 h-3.5 text-[#CE7D30]" />
                  <span>Kirimkan Pengingat Kamera Zoom ke Semua Peserta</span>
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#FAF3E3] border-t border-[#B8CCE0] flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Undangan Pengawasan Zoom MMO 2027 UMM:\nLink: ${zoomJoinUrl}\nMeeting ID: ${zoomMeetingId}\nPasscode: ${zoomPasscode}`
                  );
                  setZoomCopied(true);
                  setTimeout(() => setZoomCopied(false), 2500);
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white hover:bg-[#EBF1F6] border border-[#B8CCE0] text-[#1E3954] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                {zoomCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{zoomCopied ? 'Tersalin!' : 'Salin Info Zoom'}</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <a
                  href={zoomJoinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-[#2C4B6B] hover:bg-[#1E3954] text-[#F4E6CC] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Zoom</span>
                </a>
                <button
                  type="button"
                  onClick={() => setIsZoomSettingsModalOpen(false)}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-[#E49548] hover:bg-[#CE7D30] text-[#1E3954] font-extrabold text-xs cursor-pointer shadow-xs"
                >
                  Selesai
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Question Editor Modal (Edit / Add Manual) */}
      <QuestionEditorModal
        isOpen={isEditorModalOpen}
        initialQuestion={editingQuestion}
        defaultCategory={qbCategoryFilter === 'SMP' ? 'SMP' : 'SMA'}
        defaultStage={qbStageFilter === 'Semifinal' ? 'Semifinal' : 'Penyisihan'}
        nextQuestionNumber={questionsList.length + 1}
        onClose={() => {
          setIsEditorModalOpen(false);
          setEditingQuestion(null);
        }}
        onSave={handleSaveSingleQuestion}
      />

      {/* Focused Modal for Importing Questions (Copy Paste / Word .docx / Gambar) */}
      {isImportModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#1E3954]/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
          onClick={() => setIsImportModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Impor Soal MMO 2027"
        >
          <div
            className="w-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <WordQuestionImporter
              defaultCategory={qbCategoryFilter === 'SMP' ? 'SMP' : 'SMA'}
              defaultStage={qbStageFilter === 'Semifinal' ? 'Semifinal' : 'Penyisihan'}
              onSaveBatch={handleSaveWordBatch}
              existingCountByPacket={{
                SMP_Penyisihan: questionBankStats.smpPenyisihan,
                SMP_Semifinal: questionBankStats.smpSemifinal,
                SMA_Penyisihan: questionBankStats.smaPenyisihan,
                SMA_Semifinal: questionBankStats.smaSemifinal,
              }}
              onClose={() => setIsImportModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Confirmation Modal for Clear All / Reset Questions */}
      {confirmClearModal && (
        <div
          className="fixed inset-0 z-50 bg-[#1E3954]/75 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setConfirmClearModal(null)}
        >
          <div
            className="bg-white border-2 border-[#E49548] rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl text-[#1E3954]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#1E3954]">
                  {confirmClearModal === 'clear'
                    ? 'Kosongkan Seluruh Bank Soal?'
                    : 'Pulihkan Soal Bawaan MMO 2027?'}
                </h3>
                <p className="text-xs text-[#2C4B6B] mt-1 leading-relaxed">
                  {confirmClearModal === 'clear'
                    ? 'Seluruh soal aktif saat ini akan dihapus agar Anda bisa mengimpor paket soal baru dari Word dari awal.'
                    : 'Daftar soal aktif akan diganti dengan paket soal bawaan sistem MMO 2027.'}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmClearModal(null)}
                className="px-4 py-2 rounded-xl border border-[#B8CCE0] bg-[#FAF3E3] text-xs font-bold text-[#1E3954] hover:bg-[#EBF1F6] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmClearOrReset}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold cursor-pointer ${
                  confirmClearModal === 'clear'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-[#E49548] hover:bg-[#CE7D30] text-[#1E3954]'
                }`}
              >
                {confirmClearModal === 'clear' ? 'Ya, Kosongkan Semua' : 'Ya, Reset Bawaan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Clearing All Website Feedback */}
      {confirmClearFeedbackModal && (
        <div
          className="fixed inset-0 z-50 bg-[#1E3954]/75 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setConfirmClearFeedbackModal(false)}
        >
          <div
            className="bg-white border-2 border-[#E49548] rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl text-[#1E3954]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#1E3954]">
                  Kosongkan Semua Pesan &amp; Saran?
                </h3>
                <p className="text-xs text-[#2C4B6B] mt-1 leading-relaxed">
                  Seluruh daftar pesan dan saran website di server saat ini akan dihapus permanen. Pastikan Anda sudah mengekspor ke Excel atau menyinkronkan ke Google Sheets terlebih dahulu.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmClearFeedbackModal(false)}
                className="px-4 py-2 rounded-xl border border-[#B8CCE0] bg-[#FAF3E3] text-xs font-bold text-[#1E3954] hover:bg-[#EBF1F6] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAllFeedback}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 cursor-pointer"
              >
                Ya, Kosongkan Semua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Question Image Preview */}
      {previewQuestionImage && (
        <div
          className="fixed inset-0 z-60 bg-[#1E3954]/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 cursor-zoom-out animate-in fade-in duration-150"
          onClick={() => setPreviewQuestionImage(null)}
        >
          <div
            className="relative max-w-5xl max-h-[92vh] flex flex-col items-center bg-white border-2 border-[#E49548] p-3 rounded-3xl shadow-2xl cursor-default text-[#1E3954]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-[#B8CCE0] text-xs">
              <span className="font-bold text-[#1E3954]">Pratinjau Tangkapan Layar Soal</span>
              <button
                type="button"
                onClick={() => setPreviewQuestionImage(null)}
                className="p-1 rounded-lg hover:bg-[#FAF3E3] text-[#4E779F] hover:text-[#1E3954] cursor-pointer transition-colors"
                title="Tutup (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={previewQuestionImage}
              alt="Pratinjau Gambar Soal"
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
