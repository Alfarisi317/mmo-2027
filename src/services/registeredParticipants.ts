import * as XLSX from 'xlsx';
import { RegisteredParticipant, OlympiadCategory, CompetitionStage } from '../types';

const STORAGE_KEY = 'mmo_registered_participants_v1';
const SHEETS_URL_KEY = 'mmo_google_sheets_url_v1';
const LAST_SYNC_KEY = 'mmo_last_sync_timestamp_v1';
const DEMO_MODE_KEY = 'mmo_demo_mode_active_v1';

// Initial realistic mock participants for quick testing & demo
// Initial realistic mock participants for quick testing & demo (Password = NISN)
export const DEFAULT_PARTICIPANTS: RegisteredParticipant[] = [
  {
    id: 'MMO27-SMP-001',
    email: 'budi.smp@gmail.com',
    password: '0081234567',
    fullName: 'Budi Cahyono Nugroho',
    school: 'SMP Negeri 1 Malang',
    nisnOrRegNumber: '0081234567',
    category: 'SMP',
    stage: 'Penyisihan',
    city: 'Malang',
    phone: '081234567890',
    registeredAt: '2026-10-15 08:30:00',
  },
  {
    id: 'MMO27-SMP-002',
    email: 'nadia.safira@gmail.com',
    password: '0089876543',
    fullName: 'Nadia Safira Putri',
    school: 'MTsN 1 Kota Malang',
    nisnOrRegNumber: '0089876543',
    category: 'SMP',
    stage: 'Penyisihan',
    city: 'Malang',
    phone: '081298765432',
    registeredAt: '2026-10-16 09:15:00',
  },
  {
    id: 'MMO27-SMA-001',
    email: 'siti.maharani@gmail.com',
    password: '0069876543',
    fullName: 'Siti Aulia Maharani',
    school: 'SMA Negeri 3 Surabaya',
    nisnOrRegNumber: '0069876543',
    category: 'SMA',
    stage: 'Penyisihan',
    city: 'Surabaya',
    phone: '081377889900',
    registeredAt: '2026-10-17 11:20:00',
  },
  {
    id: 'MMO27-SMA-002',
    email: 'faris.akbar@gmail.com',
    password: '0055443322',
    fullName: 'Faris Maulana Akbar',
    school: 'SMA Taruna Nusantara',
    nisnOrRegNumber: '0055443322',
    category: 'SMA',
    stage: 'Penyisihan',
    city: 'Magelang',
    phone: '081912345678',
    registeredAt: '2026-10-18 14:05:00',
  },
  {
    id: 'MMO27-SMA-003',
    email: 'dewi.lestari@gmail.com',
    password: '0061122334',
    fullName: 'Dewi Lestari Anggraeni',
    school: 'SMA Negeri 1 Denpasar',
    nisnOrRegNumber: '0061122334',
    category: 'SMA',
    stage: 'Penyisihan',
    city: 'Denpasar',
    phone: '082155667788',
    registeredAt: '2026-10-19 16:40:00',
  },
];

/**
 * Check whether Demo Mode is enabled.
 * Default is false if user has explicitly cleared demo accounts, otherwise true on fresh load.
 */
export function isDemoModeActive(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(DEMO_MODE_KEY) !== 'false';
}

/**
 * Toggle Demo Mode
 */
export function setDemoModeActive(active: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEMO_MODE_KEY, active ? 'true' : 'false');
}

/**
 * Load all registered participants from localStorage.
 * If demo mode was cleared/disabled by user, returns empty array or synced data only (no forced demo injection).
 */
export function getRegisteredParticipants(): RegisteredParticipant[] {
  if (typeof window === 'undefined') return DEFAULT_PARTICIPANTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const demoActive = isDemoModeActive();

    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }

    // First time initialization
    if (demoActive) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PARTICIPANTS));
      return DEFAULT_PARTICIPANTS;
    }

    return [];
  } catch (err) {
    console.error('Failed to parse registered participants from storage:', err);
    return isDemoModeActive() ? DEFAULT_PARTICIPANTS : [];
  }
}

/**
 * Save participants to localStorage and push to backend server for cross-device sync
 */
export function saveRegisteredParticipants(
  participants: RegisteredParticipant[],
  syncToServer: boolean = true
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(participants));
    if (syncToServer) {
      saveRegisteredParticipantsToServer(
        participants,
        isDemoModeActive(),
        getLastSyncTime()
      );
    }
  } catch (err) {
    console.error('Failed to save registered participants:', err);
  }
}

/**
 * Push registered participants to server memory so HP and other devices can authenticate
 */
export async function saveRegisteredParticipantsToServer(
  participants: RegisteredParticipant[],
  demoActive: boolean = isDemoModeActive(),
  syncText: string = getLastSyncTime()
): Promise<void> {
  try {
    await fetch('/api/registered-participants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participants,
        isDemoActive: demoActive,
        lastSyncText: syncText,
      }),
    });
  } catch (err) {
    console.warn('Gagal sinkronisasi peserta ke server backend:', err);
  }
}

/**
 * Fetch registered participants from server (vital for HP/phone devices)
 */
export async function fetchRegisteredParticipantsFromServer(): Promise<{
  participants: RegisteredParticipant[];
  isDemoActive: boolean;
  lastSyncText: string;
}> {
  try {
    const res = await fetch('/api/registered-participants');
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        const { participants, isDemoActive: demoActive, lastSyncText: syncText } = json.data;
        if (Array.isArray(participants)) {
          // Cache locally on this device without re-pushing to server
          saveRegisteredParticipants(participants, false);
          if (typeof demoActive === 'boolean') {
            setDemoModeActive(demoActive);
          }
          if (typeof syncText === 'string') {
            setLastSyncTime(syncText);
          }
          return {
            participants,
            isDemoActive: demoActive,
            lastSyncText: syncText,
          };
        }
      }
    }
  } catch (err) {
    console.warn('Gagal mengambil data pendaftaran dari server, menggunakan cache lokal:', err);
  }

  return {
    participants: getRegisteredParticipants(),
    isDemoActive: isDemoModeActive(),
    lastSyncText: getLastSyncTime(),
  };
}

/**
 * Clear all demo participants completely so the system only uses real synced data.
 */
export function clearAllDemoParticipants(): RegisteredParticipant[] {
  setDemoModeActive(false);
  saveRegisteredParticipants([], false);
  setLastSyncTime('Data demo dibersihkan (Mode Data Asli)');
  saveRegisteredParticipantsToServer([], false, 'Data demo dibersihkan (Mode Data Asli)');
  return [];
}

/**
 * Reset participants back to initial mock dataset
 */
export function resetParticipantsToDefault(): RegisteredParticipant[] {
  setDemoModeActive(true);
  saveRegisteredParticipants(DEFAULT_PARTICIPANTS, false);
  setLastSyncTime('Menggunakan Data Contoh Bawaan');
  saveRegisteredParticipantsToServer(DEFAULT_PARTICIPANTS, true, 'Menggunakan Data Contoh Bawaan');
  return DEFAULT_PARTICIPANTS;
}

/**
 * Helper to normalize names (trim, single-space, lower-case for case-insensitive matching)
 */
export const normalizeParticipantName = (name: string): string => {
  return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
};

/**
 * Change participant password online (updates server memory and local cache)
 */
export async function changeParticipantPasswordOnline(
  participantId: string,
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string; participant?: RegisteredParticipant }> {
  try {
    const res = await fetch('/api/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId, oldPassword, newPassword }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      // Synchronize with local storage on this device
      const list = getRegisteredParticipants();
      const updated = list.map((p) => (p.id === participantId ? { ...p, password: newPassword } : p));
      saveRegisteredParticipants(updated, false);
      return {
        success: true,
        message: data.message || 'Kata sandi berhasil diperbarui!',
        participant: data.participant,
      };
    }
    return { success: false, message: data.error || 'Gagal mengubah kata sandi.' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: msg || 'Gagal menghubungi server untuk mengubah kata sandi.' };
  }
}

const EXAM_GATE_LOCAL_KEY = 'mmo_exam_gate_cache';

export interface ExamGateMatrix {
  'SMP_Penyisihan': boolean;
  'SMP_Semifinal': boolean;
  'SMA_Penyisihan': boolean;
  'SMA_Semifinal': boolean;
}

export interface ExamGateStatus {
  isOpen: boolean;
  openedAt: string | null;
  passcode?: string;
  gateMatrix?: ExamGateMatrix;
  source?: 'server' | 'cache' | 'local_override';
}

/**
 * Checks if exam gate is open for a specific category & stage
 */
export function isGateOpenForParticipant(
  status: ExamGateStatus,
  category?: OlympiadCategory | null,
  stage?: CompetitionStage | null
): boolean {
  if (status.isOpen) return true; // Master open allows all
  if (!category || !stage) return status.isOpen;
  const key = `${category}_${stage}` as keyof ExamGateMatrix;
  if (status.gateMatrix && typeof status.gateMatrix[key] === 'boolean') {
    return status.gateMatrix[key];
  }
  return status.isOpen;
}

/**
 * Get Exam Gate Status (controls whether student is held in waiting room)
 * Queries Vercel serverless /api/exam-gate with resilient localStorage fallback
 */
export async function getExamGateStatusOnline(): Promise<ExamGateStatus> {
  // 1. Try server/API endpoint
  try {
    const res = await fetch('/api/exam-gate');
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && json.data) {
        const defaultMatrix: ExamGateMatrix = {
          'SMP_Penyisihan': false,
          'SMP_Semifinal': false,
          'SMA_Penyisihan': false,
          'SMA_Semifinal': false,
        };
        const status: ExamGateStatus = {
          isOpen: Boolean(json.data.isOpen),
          openedAt: json.data.openedAt ?? null,
          passcode: json.data.passcode || 'MMO2027',
          gateMatrix: json.data.gateMatrix ? { ...defaultMatrix, ...json.data.gateMatrix } : defaultMatrix,
          source: 'server',
        };
        // Persist to local cache for fast offline / cold-start fallback
        try {
          localStorage.setItem(EXAM_GATE_LOCAL_KEY, JSON.stringify(status));
        } catch {
          // ignore
        }
        return status;
      }
    }
  } catch (err) {
    console.warn('Gagal membaca status gerbang ujian dari server, mencoba cache lokal:', err);
  }

  // 2. Resilient local storage fallback (crucial for Vercel / offline / cold starts)
  try {
    const cached = localStorage.getItem(EXAM_GATE_LOCAL_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      return {
        isOpen: Boolean(parsed.isOpen),
        openedAt: parsed.openedAt ?? null,
        passcode: parsed.passcode || 'MMO2027',
        gateMatrix: parsed.gateMatrix || {
          'SMP_Penyisihan': Boolean(parsed.isOpen),
          'SMP_Semifinal': Boolean(parsed.isOpen),
          'SMA_Penyisihan': Boolean(parsed.isOpen),
          'SMA_Semifinal': Boolean(parsed.isOpen),
        },
        source: 'cache',
      };
    }
  } catch {
    // ignore
  }

  return {
    isOpen: false,
    openedAt: null,
    passcode: 'MMO2027',
    gateMatrix: {
      'SMP_Penyisihan': false,
      'SMP_Semifinal': false,
      'SMA_Penyisihan': false,
      'SMA_Semifinal': false,
    },
    source: 'cache',
  };
}

/**
 * Update Exam Gate Status (called by Proctor Dashboard to open/lock the exam for students)
 * Supports single gate key toggle, master toggle, or matrix batch updates
 */
export async function setExamGateStatusOnline(
  isOpen: boolean,
  passcode: string = 'MMO2027',
  gateOptions?: {
    gateKey?: keyof ExamGateMatrix;
    gateValue?: boolean;
    gateMatrix?: Partial<ExamGateMatrix>;
    applyAll?: boolean;
  }
): Promise<{
  success: boolean;
  isOpen: boolean;
  passcode: string;
  gateMatrix: ExamGateMatrix;
  source: 'server' | 'cache';
}> {
  const timestamp = isOpen ? new Date().toISOString() : null;

  // Read current cached matrix
  let currentMatrix: ExamGateMatrix = {
    'SMP_Penyisihan': false,
    'SMP_Semifinal': false,
    'SMA_Penyisihan': false,
    'SMA_Semifinal': false,
  };
  try {
    const cached = localStorage.getItem(EXAM_GATE_LOCAL_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.gateMatrix) currentMatrix = { ...currentMatrix, ...parsed.gateMatrix };
    }
  } catch {
    // ignore
  }

  // Apply mutations
  if (gateOptions?.gateKey && typeof gateOptions.gateValue === 'boolean') {
    currentMatrix[gateOptions.gateKey] = gateOptions.gateValue;
  } else if (gateOptions?.gateMatrix) {
    currentMatrix = { ...currentMatrix, ...gateOptions.gateMatrix };
  } else if (gateOptions?.applyAll || !gateOptions) {
    currentMatrix = {
      'SMP_Penyisihan': isOpen,
      'SMP_Semifinal': isOpen,
      'SMA_Penyisihan': isOpen,
      'SMA_Semifinal': isOpen,
    };
  }

  const calculatedIsOpen = Object.values(currentMatrix).some(Boolean);

  // Optimistically cache locally so UI doesn't stutter or show false locked state
  try {
    localStorage.setItem(
      EXAM_GATE_LOCAL_KEY,
      JSON.stringify({
        isOpen: calculatedIsOpen,
        openedAt: timestamp,
        passcode,
        gateMatrix: currentMatrix,
        source: 'cache',
        updatedAt: Date.now(),
      })
    );
    // Dispatch custom event to notify listeners on the same window
    window.dispatchEvent(new Event('mmo_exam_gate_change'));
  } catch {
    // ignore
  }

  try {
    const res = await fetch('/api/exam-gate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isOpen: calculatedIsOpen,
        passcode,
        gateKey: gateOptions?.gateKey,
        gateValue: gateOptions?.gateValue,
        gateMatrix: gateOptions?.gateMatrix,
        applyAll: gateOptions?.applyAll,
      }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json && json.success && json.data) {
        const finalIsOpen = Boolean(json.data.isOpen);
        const finalPasscode = json.data.passcode || passcode;
        const finalMatrix: ExamGateMatrix = json.data.gateMatrix || currentMatrix;
        try {
          localStorage.setItem(
            EXAM_GATE_LOCAL_KEY,
            JSON.stringify({
              isOpen: finalIsOpen,
              openedAt: json.data.openedAt ?? timestamp,
              passcode: finalPasscode,
              gateMatrix: finalMatrix,
              source: 'server',
            })
          );
        } catch {
          // ignore
        }
        return {
          success: true,
          isOpen: finalIsOpen,
          passcode: finalPasscode,
          gateMatrix: finalMatrix,
          source: 'server',
        };
      }
    }
  } catch (err) {
    console.warn('Gagal sinkronisasi status gerbang ujian ke server, menggunakan cache lokal:', err);
  }

  // Fallback: If server is unreachable on Vercel, local cache still successfully updated!
  return {
    success: true,
    isOpen: calculatedIsOpen,
    passcode,
    gateMatrix: currentMatrix,
    source: 'cache',
  };
}

/**
 * Verify Emergency Gate Passcode (called by examinee in waiting room)
 * Works both online via /api/exam-gate/verify-passcode and offline with default/cached code
 */
export async function verifyEmergencyGatePasscodeOnline(
  inputCode: string
): Promise<{ success: boolean; message: string }> {
  const cleanCode = String(inputCode || '').trim().toUpperCase();
  if (!cleanCode) {
    return { success: false, message: 'Masukkan kode akses darurat panitia.' };
  }

  // 1. Try server validation
  try {
    const res = await fetch('/api/exam-gate/verify-passcode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode: cleanCode }),
    });
    const json = await res.json();
    if (res.ok && json.success) {
      // Mark local gate as open as well
      localStorage.setItem(
        EXAM_GATE_LOCAL_KEY,
        JSON.stringify({
          isOpen: true,
          openedAt: new Date().toISOString(),
          passcode: cleanCode,
          source: 'server',
        })
      );
      window.dispatchEvent(new Event('mmo_exam_gate_change'));
      return { success: true, message: json.message || 'Kode akses darurat valid! Memulai ujian...' };
    } else if (json && json.message) {
      return { success: false, message: json.message };
    }
  } catch {
    // Server unreachable: evaluate against local cache & standard default
  }

  // 2. Offline / local fallback check
  let cachedPasscode = 'MMO2027';
  try {
    const cached = localStorage.getItem(EXAM_GATE_LOCAL_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.passcode) cachedPasscode = parsed.passcode.toUpperCase();
    }
  } catch {
    // ignore
  }

  if (cleanCode === cachedPasscode || cleanCode === 'MMO2027') {
    localStorage.setItem(
      EXAM_GATE_LOCAL_KEY,
      JSON.stringify({
        isOpen: true,
        openedAt: new Date().toISOString(),
        passcode: cleanCode,
        source: 'local_override',
      })
    );
    window.dispatchEvent(new Event('mmo_exam_gate_change'));
    return { success: true, message: 'Kode akses darurat terverifikasi secara lokal! Memulai ujian...' };
  }

  return {
    success: false,
    message: 'Kode akses darurat salah. Pastikan kode yang dimasukkan sesuai arahan pengawas.',
  };
}

/**
 * Authenticate participant online against server (real-time for HP/cross-device)
 * Matches by Nama Lengkap (case-insensitive) OR Email, with NISN/password.
 */
export async function authenticateParticipantOnline(
  nameOrEmail: string,
  password: string,
  category?: OlympiadCategory | null,
  stage?: CompetitionStage | null
): Promise<{
  success: boolean;
  participant?: RegisteredParticipant;
  isExamGateOpen?: boolean;
  gateMatrix?: ExamGateMatrix;
  error?: string;
}> {
  const cleanInput = String(nameOrEmail || '').trim();
  const cleanPassword = String(password || '').trim();

  if (!cleanInput || !cleanPassword) {
    return { success: false, error: 'Nama Lengkap dan Kata Sandi (NISN) tidak boleh kosong.' };
  }

  try {
    const res = await fetch('/api/authenticate-participant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: cleanInput,
        password: cleanPassword,
        category: category || undefined,
        stage: stage || undefined,
      }),
    });
    const data = await res.json();
    if (res.ok && data.success && data.participant) {
      return {
        success: true,
        participant: data.participant,
        isExamGateOpen: data.isExamGateOpen ?? false,
        gateMatrix: data.gateMatrix,
      };
    } else if (data && data.error) {
      return { success: false, error: data.error };
    }
  } catch {
    // Network hiccup: fallback to local cache
  }

  const localAuth = authenticateParticipant(cleanInput, cleanPassword);
  let localGateOpen = false;
  try {
    const cached = localStorage.getItem(EXAM_GATE_LOCAL_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.isOpen) {
        localGateOpen = true;
      } else if (category && stage && parsed.gateMatrix) {
        const key = `${category}_${stage}` as keyof ExamGateMatrix;
        localGateOpen = Boolean(parsed.gateMatrix[key]);
      }
    }
  } catch {
    // ignore
  }

  return {
    ...localAuth,
    isExamGateOpen: localGateOpen,
  };
}

/**
 * Authenticate participant using Nama Lengkap (case-insensitive) or Email, and Password / NISN
 */
export function authenticateParticipant(
  nameOrEmail: string,
  password: string
): { success: boolean; participant?: RegisteredParticipant; error?: string } {
  const cleanInput = String(nameOrEmail || '').trim();
  const cleanPassword = String(password || '').trim();

  if (!cleanInput || !cleanPassword) {
    return { success: false, error: 'Nama Lengkap dan Kata Sandi (NISN) tidak boleh kosong.' };
  }

  const participants = getRegisteredParticipants();

  if (participants.length === 0) {
    return {
      success: false,
      error: 'Belum ada data peserta yang terdaftar di sistem. Silakan sinkronkan tautan Google Spreadsheet atau unggah berkas pendaftaran melalui Dashboard Pengawas.',
    };
  }

  const normInput = normalizeParticipantName(cleanInput);

  const found = participants.find((p) => {
    const pName = normalizeParticipantName(p.fullName || '');
    const pEmail = String(p.email || '').trim().toLowerCase();
    const pNisn = String(p.nisnOrRegNumber || '').trim();

    return pName === normInput || pEmail === cleanInput.toLowerCase() || pNisn === cleanInput;
  });

  if (!found) {
    return {
      success: false,
      error: `Peserta dengan nama "${cleanInput}" belum terdaftar pada data pendaftaran MMO 2027. Pastikan nama lengkap sesuai yang diisi di formulir atau hubungi panitia.`,
    };
  }

  const currentPass = String(found.password || '').trim();
  const nisnPass = String(found.nisnOrRegNumber || '').trim();

  if (cleanPassword !== currentPass && cleanPassword !== nisnPass) {
    return {
      success: false,
      error: 'Kata sandi salah. Gunakan nomor NISN Anda saat mendaftar (atau kata sandi baru jika pernah diubah).',
    };
  }

  return { success: true, participant: found };
}

/**
 * Get stored Google Sheets URL
 */
export function getGoogleSheetsUrl(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(SHEETS_URL_KEY) || '';
}

/**
 * Set stored Google Sheets URL
 */
export function saveGoogleSheetsUrl(url: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SHEETS_URL_KEY, url.trim());
}

/**
 * Get last sync timestamp
 */
export function getLastSyncTime(): string {
  if (typeof window === 'undefined') return 'Belum pernah disinkronkan';
  return localStorage.getItem(LAST_SYNC_KEY) || 'Belum pernah disinkronkan';
}

/**
 * Set last sync timestamp
 */
export function setLastSyncTime(timeStr?: string): void {
  if (typeof window === 'undefined') return;
  const val = timeStr || new Date().toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  localStorage.setItem(LAST_SYNC_KEY, val);
}

/**
 * Normalize Google Sheets URL to CSV Export URL.
 * Supports:
 * - Published to web URL: https://docs.google.com/spreadsheets/d/e/2PACX-.../pubhtml or /pub
 * - Standard share URL: https://docs.google.com/spreadsheets/d/{ID}/edit...
 * - Direct CSV download link or iframe embed tag
 */
export function formatGoogleSheetsToCsvUrl(url: string): string {
  let cleaned = url.trim();
  if (!cleaned) return '';

  // Extract link if user pasted an iframe embed code
  const iframeMatch = cleaned.match(/src=["']([^"']+)["']/i);
  if (iframeMatch && iframeMatch[1]) {
    cleaned = iframeMatch[1].trim();
  }

  // If Published to Web: /spreadsheets/d/e/2PACX-...
  const pubMatch = cleaned.match(/\/spreadsheets\/d\/e\/(2PACX-[a-zA-Z0-9-_]+)/);
  if (pubMatch && pubMatch[1]) {
    const pubId = pubMatch[1];
    let gidParam = '';
    const gidMatch = cleaned.match(/[#&?]gid=([0-9]+)/);
    if (gidMatch && gidMatch[1]) {
      gidParam = `&gid=${gidMatch[1]}`;
    }
    return `https://docs.google.com/spreadsheets/d/e/${pubId}/pub?output=csv${gidParam}`;
  }

  // Already an explicit CSV export URL
  if (cleaned.includes('output=csv') || (cleaned.includes('format=csv') && !cleaned.includes('/d/e/'))) {
    return cleaned;
  }

  // Standard Google Sheet URL (document ID min 20 chars, ignoring /d/e/)
  const docMatch = cleaned.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]{20,})/);
  if (docMatch && docMatch[1]) {
    const sheetId = docMatch[1];
    let gid = '0';
    const gidMatch = cleaned.match(/[#&?]gid=([0-9]+)/);
    if (gidMatch && gidMatch[1]) {
      gid = gidMatch[1];
    }
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&id=${sheetId}&gid=${gid}`;
  }

  return cleaned;
}

/**
 * Robust CSV parser that handles quotes and newlines
 */
export function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuote = false;

  const text = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === ',' && !insideQuote) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if (char === '\n' && !insideQuote) {
      currentRow.push(currentField.trim());
      if (currentRow.some((field) => field.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((field) => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Convert parsed spreadsheet rows into RegisteredParticipant objects with smart column detection
 */
export function mapCsvToParticipants(rows: string[][]): RegisteredParticipant[] {
  if (rows.length < 2) return [];

  // Clean headers
  const headers = rows[0].map((h) => String(h || '').toLowerCase().trim());

  // Smart column finder that prioritizes exact matches and avoids collisions (e.g. 'nama' vs 'nama sekolah')
  const findCol = (exactList: string[], partialKeywords: string[], excludeKeywords: string[] = []): number => {
    // 1. Try exact match first
    const exactIndex = headers.findIndex((h) => exactList.includes(h));
    if (exactIndex !== -1) return exactIndex;

    // 2. Try partial keyword matching without excluded keywords
    return headers.findIndex((h) => {
      const hasExclude = excludeKeywords.some((ex) => h.includes(ex));
      if (hasExclude) return false;
      return partialKeywords.some((pk) => h.includes(pk));
    });
  };

  const nameIdx = findCol(
    ['nama', 'nama lengkap', 'nama peserta', 'nama siswa', 'fullname', 'full name', 'name'],
    ['nama lengkap', 'nama peserta', 'nama siswa', 'nama', 'fullname'],
    ['sekolah', 'school', 'instansi', 'madrasah', 'ibu', 'ayah', 'orang tua', 'wali', 'pembina', 'pendamping']
  );

  const nisnIdx = findCol(
    ['nisn', 'nomor induk siswa nasional', 'nis', 'no peserta', 'nomor peserta', 'no ujian', 'nomor ujian', 'id peserta'],
    ['nisn', 'nomor peserta', 'no peserta', 'nis'],
    ['wa', 'whatsapp', 'hp', 'telepon', 'rekening']
  );

  const schoolIdx = findCol(
    ['nama sekolah', 'asal sekolah', 'sekolah', 'madrasah', 'instansi', 'school'],
    ['sekolah', 'madrasah', 'instansi', 'school'],
    []
  );

  const categoryIdx = findCol(
    ['kategori peserta', 'kategori', 'jenjang', 'tingkat', 'kelas', 'category'],
    ['kategori', 'jenjang', 'tingkat'],
    []
  );

  const cityIdx = findCol(
    ['kabupaten / kota', 'kabupaten/kota', 'kota / kabupaten', 'kabupaten', 'kota', 'domisili', 'provinsi'],
    ['kabupaten', 'kota', 'domisili', 'daerah'],
    ['lahir']
  );

  const phoneIdx = findCol(
    ['no wa aktif', 'no wa', 'no whatsapp', 'nomor wa', 'whatsapp', 'nomor telepon', 'no hp', 'telepon', 'hp'],
    ['wa', 'whatsapp', 'telepon', 'telp', 'phone', 'hp'],
    []
  );

  const emailIdx = findCol(
    ['email address', 'email', 'alamat email', 'surel', 'pos-el'],
    ['email', 'surel', 'e-mail'],
    []
  );

  const passwordIdx = findCol(
    ['password', 'kata sandi', 'sandi', 'pass', 'pin', 'token', 'kode akses', 'password ujian'],
    ['password', 'kata sandi', 'token'],
    []
  );

  const result: RegisteredParticipant[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const rawName = (nameIdx !== -1 && row[nameIdx] ? row[nameIdx] : '').trim();
    const rawNisn = (nisnIdx !== -1 && row[nisnIdx] ? row[nisnIdx] : '').trim();

    // If both name and nisn are empty, it's a completely empty row, skip it
    if (!rawName && !rawNisn) continue;

    const fullName = rawName || `Peserta ${r}`;
    const nisnOrRegNumber = rawNisn || `MMO27-${1000 + r}`;

    // Password defaults to NISN! If column exists and is filled, use it; otherwise NISN
    let password = (passwordIdx !== -1 && row[passwordIdx] ? row[passwordIdx] : '').trim();
    if (!password) {
      password = nisnOrRegNumber;
    }

    // Email: If provided, use it; otherwise fallback to synthetic email so row is never lost
    let email = (emailIdx !== -1 && row[emailIdx] ? row[emailIdx] : '').trim();
    if (!email || !email.includes('@')) {
      const safeId = (nisnOrRegNumber || fullName).toLowerCase().replace(/[^a-z0-9]/g, '');
      email = `${safeId || 'peserta' + r}@peserta.mmo2027.id`;
    }

    const school = (schoolIdx !== -1 && row[schoolIdx] ? row[schoolIdx] : 'Sekolah Peserta').trim();

    let category: OlympiadCategory = 'SMA';
    if (categoryIdx !== -1 && row[categoryIdx]) {
      const rawCat = row[categoryIdx].toUpperCase();
      if (rawCat.includes('SMP') || rawCat.includes('MTS') || rawCat.includes('MENENGAH PERTAMA')) {
        category = 'SMP';
      }
    } else if (school.toLowerCase().includes('smp') || school.toLowerCase().includes('mts')) {
      category = 'SMP';
    }

    const city = (cityIdx !== -1 && row[cityIdx] ? row[cityIdx] : 'Indonesia').trim();
    const phone = phoneIdx !== -1 && row[phoneIdx] ? row[phoneIdx].trim() : '';

    result.push({
      id: `MMO27-${category}-${100 + r}`,
      email: email.toLowerCase(),
      password,
      fullName,
      school,
      nisnOrRegNumber,
      category,
      stage: 'Penyisihan',
      city,
      phone,
      registeredAt: new Date().toISOString(),
    });
  }

  return result;
}

/**
 * Parse an Excel (.xlsx / .xls) or CSV file directly using SheetJS (XLSX)
 */
export async function parseSpreadsheetFile(file: File): Promise<RegisteredParticipant[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error('Berkas spreadsheet tidak memiliki lembar kerja (sheet).');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
  const stringRows = rawRows.map((r) => (Array.isArray(r) ? r.map((c) => String(c ?? '').trim()) : []));

  const participants = mapCsvToParticipants(stringRows);
  if (participants.length === 0) {
    throw new Error('Tidak ditemukan baris data peserta dengan kolom Nama dan NISN yang valid dalam file Excel tersebut.');
  }

  return participants;
}

/**
 * Parse pasted table text (from Excel/Google Sheets copy-paste)
 */
export function parsePastedSpreadsheetText(text: string): RegisteredParticipant[] {
  const clean = text.trim();
  if (!clean) return [];

  let rows: string[][];
  if (clean.includes('\t')) {
    // Tab-delimited (standard clipboard from Excel or Google Sheets)
    rows = clean
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => line.split('\t').map((c) => c.trim()));
  } else {
    rows = parseCsvRows(clean);
  }

  return mapCsvToParticipants(rows);
}

/**
 * Sync participants from Google Sheets via backend proxy or direct fetch
 */
export async function syncParticipantsFromSheets(
  rawUrl: string
): Promise<{ success: boolean; count: number; message: string; participants: RegisteredParticipant[] }> {
  const csvUrl = formatGoogleSheetsToCsvUrl(rawUrl);
  if (!csvUrl) {
    return {
      success: false,
      count: 0,
      message: 'URL Google Sheets tidak valid. Mohon masukkan tautan spreadsheet yang benar.',
      participants: getRegisteredParticipants(),
    };
  }

  saveGoogleSheetsUrl(rawUrl);

  try {
    let csvText = '';
    let serverError = '';

    // Attempt through server proxy first (bypasses browser CORS)
    try {
      const res = await fetch('/api/sync-spreadsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: rawUrl }),
      });
      const data = await res.json();
      if (res.ok && data && data.csvText) {
        csvText = data.csvText;
      } else if (data && data.error) {
        serverError = data.error;
      }
    } catch {
      // Server proxy unavailable, fallback to direct browser fetch
    }

    // Direct browser fetch fallback
    if (!csvText) {
      try {
        const directRes = await fetch(csvUrl);
        if (directRes.ok) {
          csvText = await directRes.text();
        } else {
          serverError = `Status: ${directRes.status}`;
        }
      } catch (directErr: any) {
        if (!serverError) {
          serverError = directErr?.message || 'CORS / Akses diblokir';
        }
      }
    }

    if (!csvText || csvText.length < 10) {
      throw new Error(
        serverError ||
          'Spreadsheet kosong atau tidak dapat diunduh. Pastikan link telah disetel "Siapa saja yang memiliki link dapat melihat" atau gunakan opsi "Upload Berkas Excel" di bawah.'
      );
    }

    const rows = parseCsvRows(csvText);
    const parsedParticipants = mapCsvToParticipants(rows);

    if (parsedParticipants.length === 0) {
      return {
        success: false,
        count: 0,
        message: 'Spreadsheet berhasil diunduh, namun tidak ditemukan kolom Nama atau NISN peserta yang valid. Pastikan lembar spreadsheet memiliki baris nama dan NISN pendaftar.',
        participants: getRegisteredParticipants(),
      };
    }

    // Save as real data and turn off demo mode
    setDemoModeActive(false);
    saveRegisteredParticipants(parsedParticipants);
    setLastSyncTime();

    return {
      success: true,
      count: parsedParticipants.length,
      message: `Berhasil menyinkronkan ${parsedParticipants.length} akun peserta asli dari Google Sheets!`,
      participants: parsedParticipants,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      count: 0,
      message: `Gagal sinkronisasi: ${errorMsg}`,
      participants: getRegisteredParticipants(),
    };
  }
}
