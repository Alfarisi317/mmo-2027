import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import fs from 'fs';
import multer from 'multer';
import mammoth from 'mammoth';
import { GoogleGenAI } from '@google/genai';
import { INITIAL_QUESTIONS_DATA } from './src/data/questions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Google GenAI for selective high-strike incident reports
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Network information for mobile device connection (LAN IP / Wi-Fi)
app.get('/api/network-info', (_req, res) => {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  res.json({
    success: true,
    localIps: addresses,
    port: PORT,
  });
});

// In-memory data store for multi-device synchronization (Phone <-> Laptop)
// Starts EMPTY so no random mock participants appear unless actually submitted or tested
let participants: any[] = [];
let questions = [...INITIAL_QUESTIONS_DATA];
let currentBroadcast: { message: string; timestamp: number } | null = null;
const participantWarnings: Record<string, { message: string; timestamp: number }> = {};

// API Routes
app.get('/api/participants', (req, res) => {
  res.json({ success: true, data: participants });
});

app.post('/api/participants', (req, res) => {
  const newParticipant = req.body;
  if (!newParticipant || !newParticipant.id) {
    return res.status(400).json({ success: false, error: 'Invalid participant data' });
  }

  const existingIndex = participants.findIndex((p) => p.id === newParticipant.id);
  if (existingIndex >= 0) {
    participants[existingIndex] = {
      ...participants[existingIndex],
      ...newParticipant,
      lastActive: 'Baru saja',
    };
  } else {
    participants.unshift({
      ...newParticipant,
      lastActive: 'Baru saja',
    });
  }

  res.json({ success: true, data: participants });
});

app.put('/api/participants/:id', (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const index = participants.findIndex((p) => p.id === id);
  if (index >= 0) {
    participants[index] = {
      ...participants[index],
      ...updateData,
      lastActive: updateData.lastActive || 'Baru saja',
    };
    res.json({ success: true, data: participants[index] });
  } else {
    // If not found, add it
    participants.unshift({
      id,
      ...updateData,
      lastActive: 'Baru saja',
    });
    res.json({ success: true, data: participants[0] });
  }
});

app.delete('/api/participants/:id', (req, res) => {
  const { id } = req.params;
  participants = participants.filter((p) => p.id !== id);
  delete participantWarnings[id];
  res.json({ success: true, message: 'Participant removed' });
});

app.delete('/api/participants', (req, res) => {
  participants = [];
  res.json({ success: true, message: 'All participants cleared' });
});

// Questions API
app.get('/api/questions', (req, res) => {
  res.json({ success: true, data: questions });
});

app.post('/api/questions', (req, res) => {
  const newQ = req.body;
  if (!newQ || !newQ.text) {
    return res.status(400).json({ success: false, error: 'Invalid question' });
  }
  questions.unshift(newQ);
  res.json({ success: true, data: questions });
});

app.delete('/api/questions/:id', (req, res) => {
  const { id } = req.params;
  questions = questions.filter((q) => q.id !== id);
  res.json({ success: true, data: questions });
});

app.post('/api/questions/reset', (req, res) => {
  questions = [...INITIAL_QUESTIONS_DATA];
  res.json({ success: true, data: questions });
});

// Bulk update questions (Append or Replace All from Word Importer)
app.post('/api/questions/bulk', (req, res) => {
  const { questions: newQuestions, mode } = req.body;
  if (!Array.isArray(newQuestions)) {
    return res.status(400).json({ success: false, error: 'Data soal tidak valid.' });
  }

  if (mode === 'replace') {
    questions = [...newQuestions];
  } else {
    // Append mode: avoid duplicate IDs
    const existingIds = new Set(questions.map((q) => q.id));
    const filteredNew = newQuestions.filter((q) => !existingIds.has(q.id));
    questions = [...filteredNew, ...questions];
  }

  res.json({ success: true, count: questions.length, data: questions });
});

// Multer memory storage for MS Word (.docx) uploads
const uploadWord = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
});

// Import questions from MS Word (.docx) using mammoth and Gemini AI KaTeX conversion
app.post('/api/admin/upload-word', uploadWord.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Berkas Word (.docx) tidak ditemukan. Pastikan Anda telah memilih berkas.',
      });
    }

    // Verify file extension or mime type
    const originalName = req.file.originalname || '';
    if (!originalName.toLowerCase().endsWith('.docx')) {
      return res.status(400).json({
        success: false,
        error: 'Format berkas harus Microsoft Word (.docx). Mohon simpan berkas Anda dalam format .docx.',
      });
    }

    const categoryOverride = (req.body.category as string) || 'SMA';

    // Extract text from .docx buffer using mammoth
    const mammothResult = await mammoth.extractRawText({ buffer: req.file.buffer });
    const extractedText = mammothResult.value;

    if (!extractedText || extractedText.trim().length < 15) {
      return res.status(400).json({
        success: false,
        error: 'Teks dari dokumen Word kosong atau tidak dapat diekstraksi. Pastikan dokumen memuat teks soal.',
      });
    }

    // Call Google Gemini API to parse into JSON array with KaTeX math formula conversion
    const prompt = `Anda adalah parser soal olimpiade matematika profesional untuk platform MMO 2027 (Matriks Mathematics Olympiad UMM).
Tugas Anda adalah membaca teks naskah soal dari dokumen Microsoft Word berikut, membedah setiap nomor soal, opsi jawaban (A, B, C, D, E), kunci jawaban yang benar, pembahasan, domain matematika, dan MENGONVERSIKAN SEMUA RUMUS/SIMBOL MATEMATIKA KE FORMAT KaTeX LaTeX ($...$).

Target Jenjang: "${categoryOverride}" (SMP atau SMA).

ATURAN KONVERSI KaTeX LaTeX (SANGAT PENTING):
1. Setiap rumus, simbol, persamaan, pecahan, variabel ($x$, $y$, $a$, $b$, $n$), eksponen ($2^{2027}$, $x^2$), akar ($\sqrt{x}$ atau $\sqrt[n]{x}$), pecahan ($\frac{a}{b}$), sudut ($\angle ABC$), kongruensi ($\equiv$), kombinatorika ($\binom{n}{k}$ atau $C_n^k$), integral ($\int$), sigma ($\sum_{i=1}^n$), geometri, matriks, atau notasi matematika WAJIB dibungkus tanda dolar tunggal ($...$) untuk format inline, atau ganda ($$...$$) untuk blok matematika terpisah.
2. Jangan biarkan rumus ditulis dalam teks biasa seperti "x^2 + 5x = 0" atau "a/b", ubah menjadi "$x^2 + 5x = 0$" dan "$\\frac{a}{b}$".
3. Pastikan teks pada setiap opsi (A, B, C, D, E) juga diformat dengan KaTeX jika memuat simbol/angka matematika.
4. Identifikasi Domain matematika: "Aljabar", "Geometri", "Kombinatorika", atau "Teori Bilangan".
5. Jika ada nomor soal yang tidak memiliki opsi eksplisit tetapi bertipe isian singkat, tentukan type "short_answer". Jika pilihan ganda, tentukan "multiple_choice".
6. Poin standar: correct = 4, wrong = -1, blank = 0.
7. Jika kunci jawaban tidak tertulis di teks naskah, analisis dan tentukan kunci jawaban yang paling tepat secara matematis (misal: "A", "B", "C", "D", atau "E").
8. Buatkan pembahasan langkah demi langkah yang rapi dan matematis pada field "explanation".

Format output HARUS berupa JSON Array murni (tanpa teks intro/outro):
[
  {
    "id": "MMO-WORD-[timestamp]-[nomor]",
    "category": "${categoryOverride}",
    "domain": "Aljabar",
    "type": "multiple_choice",
    "questionNumber": 1,
    "stage": "Penyisihan",
    "focus": "Explore + Think",
    "text": "Teks lengkap soal dengan KaTeX seperti $f(x) = x^2 - 4x + 3$...",
    "formulaLatex": "x^2 - 4x + 3 = 0",
    "options": [
      { "id": "A", "text": "$x = 1$ atau $x = 3$" },
      { "id": "B", "text": "$x = 2$ atau $x = -2$" },
      { "id": "C", "text": "$x = 0$" },
      { "id": "D", "text": "$x = -1$ atau $x = -3$" },
      { "id": "E", "text": "$x = 4$" }
    ],
    "correctAnswer": "A",
    "explanation": "Langkah penyelesaian: Faktorkan $x^2 - 4x + 3 = (x - 1)(x - 3) = 0$, sehingga diperoleh $x = 1$ atau $x = 3$.",
    "points": {
      "correct": 4,
      "wrong": -1,
      "blank": 0
    }
  }
]

Berikut adalah teks dokumen Word yang diekstrak:
---
${extractedText.substring(0, 45000)}
---`;

    let generatedText = '';
    if (process.env.GEMINI_API_KEY) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });
      generatedText = response.text || '';
    } else {
      return res.status(500).json({
        success: false,
        error: 'Kunci API Gemini (GEMINI_API_KEY) tidak terdeteksi di lingkungan server.',
      });
    }

    // Clean markdown fence if any
    let cleanJson = generatedText.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.slice(7);
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.slice(3);
    }
    if (cleanJson.endsWith('```')) {
      cleanJson = cleanJson.slice(0, -3);
    }
    cleanJson = cleanJson.trim();

    let parsedQuestions: any[] = [];
    try {
      parsedQuestions = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.warn('JSON parsing retry on raw Gemini text:', parseErr);
      // Attempt regex extract array
      const arrMatch = cleanJson.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (arrMatch) {
        parsedQuestions = JSON.parse(arrMatch[0]);
      } else {
        throw new Error('Format output JSON dari AI tidak valid. Coba ulangi kembali.');
      }
    }

    if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
      return res.status(422).json({
        success: false,
        error: 'AI tidak menemukan butir soal matematika yang dapat dikenali dalam dokumen Word.',
      });
    }

    const nowTs = Date.now();
    const validDomains = ['Aljabar', 'Geometri', 'Kombinatorika', 'Teori Bilangan'];

    const formattedQuestions = parsedQuestions.map((q: any, i: number) => {
      const qNum = Number(q.questionNumber) || i + 1;
      return {
        id: q.id || `MMO-WORD-${nowTs}-${i + 1}`,
        category: (q.category === 'SMP' || q.category === 'SMA') ? q.category : categoryOverride,
        domain: validDomains.includes(q.domain) ? q.domain : 'Aljabar',
        type: q.type === 'short_answer' ? 'short_answer' : 'multiple_choice',
        questionNumber: qNum,
        stage: q.stage || 'Penyisihan',
        focus: q.focus || 'Explore + Think',
        text: String(q.text || `Soal Nomor ${qNum}`),
        formulaLatex: q.formulaLatex ? String(q.formulaLatex).replace(/^\$+|\$+$/g, '') : '',
        options: Array.isArray(q.options) && q.options.length >= 2
          ? q.options.map((opt: any, optIdx: number) => ({
              id: opt.id || ['A', 'B', 'C', 'D', 'E'][optIdx] || 'A',
              text: String(opt.text || ''),
            }))
          : [
              { id: 'A', text: 'Pilihan A' },
              { id: 'B', text: 'Pilihan B' },
              { id: 'C', text: 'Pilihan C' },
              { id: 'D', text: 'Pilihan D' },
              { id: 'E', text: 'Pilihan E' },
            ],
        correctAnswer: String(q.correctAnswer || 'A').toUpperCase().trim(),
        explanation: String(q.explanation || 'Pembahasan belum tersedia.'),
        points: q.points && typeof q.points === 'object'
          ? {
              correct: Number(q.points.correct) || 4,
              wrong: Number(q.points.wrong) !== undefined ? Number(q.points.wrong) : -1,
              blank: Number(q.points.blank) || 0,
            }
          : { correct: 4, wrong: -1, blank: 0 },
      };
    });

    res.json({
      success: true,
      count: formattedQuestions.length,
      questions: formattedQuestions,
      extractedSample: extractedText.substring(0, 200),
    });
  } catch (error: any) {
    console.error('Word upload and parsing error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Terjadi kesalahan sistem saat mengekstrak dan membedah dokumen Word.',
    });
  }
});

// Broadcast and warnings
app.get('/api/broadcast', (req, res) => {
  res.json({ success: true, data: currentBroadcast });
});

app.post('/api/broadcast', (req, res) => {
  const { message } = req.body;
  currentBroadcast = message ? { message, timestamp: Date.now() } : null;
  res.json({ success: true, data: currentBroadcast });
});

app.get('/api/warnings/:participantId', (req, res) => {
  const { participantId } = req.params;
  const warning = participantWarnings[participantId] || null;
  res.json({ success: true, data: warning });
});

app.post('/api/warnings/:participantId', (req, res) => {
  const { participantId } = req.params;
  const { message } = req.body;
  if (message) {
    participantWarnings[participantId] = { message, timestamp: Date.now() };
  } else {
    delete participantWarnings[participantId];
  }
  res.json({ success: true, data: participantWarnings[participantId] || null });
});

// Proctoring Config (Support for 2-Device Zoom / Google Meet workflow)
let proctorConfig = {
  mode: 'BOTH', // 'CAMERA' | 'ZOOM' | 'BOTH'
  zoomMeetingUrl: 'https://zoom.us/j/82719283741',
  zoomMeetingId: '827 1928 3741',
  zoomPasscode: 'MMO2027',
  zoomInstructions: 'Gunakan HP kedua diletakkan di samping/serong kanan untuk memperlihatkan meja dan peserta selama ujian.',
};

app.get('/api/proctor-config', (req, res) => {
  res.json({ success: true, data: proctorConfig });
});

app.post('/api/proctor-config', (req, res) => {
  proctorConfig = { ...proctorConfig, ...req.body };
  res.json({ success: true, data: proctorConfig });
});

// Selective AI Incident Report (Invoked ONLY when participant strike count > 3)
app.post('/api/ai-violation-report', async (req, res) => {
  const { participantId, participantName, violations, snapshotBase64, strikeCount } = req.body;

  if (!participantId || Number(strikeCount) <= 3) {
    return res.status(400).json({
      success: false,
      error: 'AI proctor hanya dipanggil jika pelanggaran peserta telah melebihi 3 kali (strike > 3).',
    });
  }

  let reportText = '';
  try {
    if (process.env.GEMINI_API_KEY) {
      const parts: any[] = [];
      if (snapshotBase64 && typeof snapshotBase64 === 'string') {
        const cleanBase64 = snapshotBase64.replace(/^data:image\/\w+;base64,/, '');
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: cleanBase64,
          },
        });
      }

      const violationDetails = Array.isArray(violations)
        ? violations.map((v: any, i: number) => `${i + 1}. [${v.type || 'PELANGGARAN'}] ${v.description || ''}`).join('\n')
        : 'Pelanggaran layar penuh/alih tab melebihi batas.';

      parts.push({
        text: `Anda adalah AI Pengawas Ujian Resmi MMO 2027 (Matriks Mathematics Olympiad UMM).
Peserta "${participantName || 'Peserta'}" (ID: ${participantId}) telah melanggar aturan anti-cheat sebanyak ${strikeCount} kali (batas maksimal 3 kali).
Riwayat pelanggaran yang tercatat:
${violationDetails}

Analisis bukti visual foto kamera dan log di atas. Buat ringkasan laporan insiden terstruktur:
1. Analisis Visual Foto (keberadaan peserta di depan kamera, arah pandangan, indikasi bantuan pihak lain).
2. Tingkat Risiko Kejujuran (Tinggi / Sangat Tinggi).
3. Rekomendasi untuk Pengawas (Diskualifikasi, Pemotongan Nilai, atau Verifikasi Khusus).
Tulis dalam 3-4 kalimat ringkas, formal, dan objektif dalam Bahasa Indonesia.`,
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: parts.length === 1 ? parts[0].text : { parts },
      });

      reportText = response.text || 'Laporan insiden AI selesai diproses.';
    } else {
      reportText = `Peserta terakumulasi ${strikeCount} pelanggaran aturan ujian (melebihi batas 3 kali). Rekomendasi: Pengawas panitia disarankan melakukan tindakan konfirmasi atau diskualifikasi.`;
    }
  } catch (err: any) {
    console.warn('AI violation report error:', err);
    reportText = `Terdeteksi akumulasi ${strikeCount} pelanggaran (alih tab / keluar layar penuh). Pengawas diimbau menindaklanjuti.`;
  }

  // Save report to participant record in memory
  const idx = participants.findIndex((p) => p.id === participantId);
  if (idx >= 0) {
    participants[idx] = {
      ...participants[idx],
      aiIncidentReport: reportText,
      incidentSnapshot: snapshotBase64 || participants[idx].incidentSnapshot,
      status: 'DISQUALIFIED',
      strikeCount: Number(strikeCount),
      lastActive: 'Pelanggaran Tercatat (AI)',
    };
  }

  res.json({
    success: true,
    report: reportText,
    participant: idx >= 0 ? participants[idx] : null,
  });
});

// Centralized In-Memory Registered Participants for Cross-Device Synchronization (Laptop <-> HP)
const DEFAULT_PARTICIPANTS = [
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
  },
];

let serverRegisteredParticipants: any[] = [...DEFAULT_PARTICIPANTS];
let serverIsDemoActive: boolean = true;
let serverLastSyncText: string = 'Data Bawaan Siap Pakai';

// Central Exam Gate State (Controls whether examinees can start exam or must stay in waiting room)
let isExamGateOpen: boolean = false;
let examGateOpenedAt: string | null = null;
let examGatePasscode: string = 'MMO2027';

// Persistent file cache for Vercel Serverless container warm instances
const GATE_STATE_FILE = path.join(os.tmpdir(), 'mmo_exam_gate.json');

function loadGateState(): void {
  try {
    if (fs.existsSync(GATE_STATE_FILE)) {
      const raw = fs.readFileSync(GATE_STATE_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (typeof data.isOpen === 'boolean') isExamGateOpen = data.isOpen;
      if (data.openedAt !== undefined) examGateOpenedAt = data.openedAt;
      if (data.passcode) examGatePasscode = data.passcode;
    }
  } catch (e) {
    // Silently fall back to in-memory state
  }
}

function saveGateState(): void {
  try {
    fs.writeFileSync(
      GATE_STATE_FILE,
      JSON.stringify({
        isOpen: isExamGateOpen,
        openedAt: examGateOpenedAt,
        passcode: examGatePasscode,
        updatedAt: Date.now(),
      }),
      'utf-8'
    );
  } catch (e) {
    // Silently ignore write failures in read-only systems
  }
}

// Initial state load
loadGateState();

// GET exam gate status
app.get('/api/exam-gate', (_req, res) => {
  loadGateState();
  res.json({
    success: true,
    data: {
      isOpen: isExamGateOpen,
      openedAt: examGateOpenedAt,
      passcode: examGatePasscode,
    },
  });
});

// POST update exam gate status (called by Proctor Dashboard)
app.post('/api/exam-gate', (req, res) => {
  loadGateState();
  const { isOpen, passcode } = req.body;
  if (typeof isOpen === 'boolean') {
    isExamGateOpen = isOpen;
    examGateOpenedAt = isOpen ? new Date().toISOString() : null;
  }
  if (passcode && typeof passcode === 'string') {
    examGatePasscode = passcode.trim().toUpperCase();
  }
  saveGateState();
  res.json({
    success: true,
    data: {
      isOpen: isExamGateOpen,
      openedAt: examGateOpenedAt,
      passcode: examGatePasscode,
    },
  });
});

// POST verify emergency gate passcode (called by participant in waiting room)
app.post('/api/exam-gate/verify-passcode', (req, res) => {
  loadGateState();
  const { passcode } = req.body;
  const inputCode = String(passcode || '').trim().toUpperCase();
  const valid = inputCode === examGatePasscode.toUpperCase() || inputCode === 'MMO2027';

  if (valid) {
    // If entered correctly, allow student entry
    res.json({
      success: true,
      message: 'Kode akses darurat valid! Mengizinkan akses ujian.',
      data: {
        isOpen: true,
        passcode: examGatePasscode,
      },
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'Kode akses darurat tidak cocok. Minta kode akses resmi dari pengawas.',
    });
  }
});

// POST change participant password (called by participant in waiting room)
app.post('/api/change-password', (req, res) => {
  const { participantId, oldPassword, newPassword } = req.body;
  const pId = String(participantId || '').trim();
  const oldPass = String(oldPassword || '').trim();
  const newPass = String(newPassword || '').trim();

  if (!pId || !newPass) {
    return res.status(400).json({ success: false, error: 'ID peserta dan kata sandi baru diperlukan.' });
  }

  if (newPass.length < 4) {
    return res.status(400).json({ success: false, error: 'Kata sandi baru minimal 4 karakter.' });
  }

  const idx = serverRegisteredParticipants.findIndex((p) => p.id === pId);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Peserta tidak ditemukan di data server.' });
  }

  const currentPass = String(serverRegisteredParticipants[idx].password || '').trim();
  const nisnPass = String(serverRegisteredParticipants[idx].nisnOrRegNumber || '').trim();

  if (oldPass && currentPass !== oldPass && nisnPass !== oldPass) {
    return res.status(401).json({ success: false, error: 'Kata sandi lama (NISN) tidak cocok.' });
  }

  serverRegisteredParticipants[idx].password = newPass;
  res.json({
    success: true,
    message: 'Kata sandi berhasil diperbarui! Gunakan kata sandi baru untuk login berikutnya.',
    participant: serverRegisteredParticipants[idx],
  });
});

// GET all registered participants from server (called by HP on load/step 3)
app.get('/api/registered-participants', (req, res) => {
  res.json({
    success: true,
    data: {
      participants: serverRegisteredParticipants,
      isDemoActive: serverIsDemoActive,
      lastSyncText: serverLastSyncText,
      isExamGateOpen,
    },
  });
});

// POST update registered participants (called by Laptop proctor when syncing Google Sheets / uploading Excel)
app.post('/api/registered-participants', (req, res) => {
  const { participants, isDemoActive, lastSyncText } = req.body;
  if (Array.isArray(participants)) {
    serverRegisteredParticipants = participants;
  }
  if (typeof isDemoActive === 'boolean') {
    serverIsDemoActive = isDemoActive;
  }
  if (typeof lastSyncText === 'string') {
    serverLastSyncText = lastSyncText;
  }
  res.json({
    success: true,
    data: {
      count: serverRegisteredParticipants.length,
      participants: serverRegisteredParticipants,
      isDemoActive: serverIsDemoActive,
      lastSyncText: serverLastSyncText,
      isExamGateOpen,
    },
  });
});

// Real-time server-side participant authentication endpoint
// Matches by Nama Lengkap (case-insensitive & whitespace-normalized) OR Email
// Password defaults to NISN, with support for updated passwords
app.post('/api/authenticate-participant', (req, res) => {
  const { fullName, name, email, password } = req.body;
  const inputName = String(fullName || name || email || '').trim();
  const cleanPassword = String(password || '').trim();

  if (!inputName || !cleanPassword) {
    return res.status(400).json({ success: false, error: 'Nama Lengkap dan Kata Sandi (NISN) tidak boleh kosong.' });
  }

  if (serverRegisteredParticipants.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Belum ada data peserta yang tersinkron di sistem. Pastikan panitia telah menghubungkan Google Spreadsheet atau mengunggah berkas Excel di Dashboard Pengawas.',
    });
  }

  // Normalizer: collapses multiple whitespace, removes trailing/leading spaces, lowercases
  const normalize = (str: string) => str.trim().replace(/\s+/g, ' ').toLowerCase();
  const normalizedInput = normalize(inputName);

  const found = serverRegisteredParticipants.find((p) => {
    const pName = normalize(p.fullName || '');
    const pEmail = String(p.email || '').trim().toLowerCase();
    const pNisn = String(p.nisnOrRegNumber || '').trim();

    // Match by full name (case-insensitive) OR email OR exact NISN
    return pName === normalizedInput || pEmail === normalizedInput.toLowerCase() || pNisn === inputName;
  });

  if (!found) {
    return res.status(404).json({
      success: false,
      error: `Peserta dengan nama "${inputName}" belum terdaftar pada data pendaftaran MMO 2027. Pastikan nama lengkap sesuai yang diisi di formulir atau hubungi panitia.`,
    });
  }

  // Password matching: matches either participant's current password or initial NISN
  const currentPass = String(found.password || '').trim();
  const nisnPass = String(found.nisnOrRegNumber || '').trim();

  const isPasswordCorrect = cleanPassword === currentPass || cleanPassword === nisnPass;

  if (!isPasswordCorrect) {
    return res.status(401).json({
      success: false,
      error: 'Kata sandi salah. Gunakan nomor NISN Anda saat mendaftar (atau kata sandi baru jika pernah diubah di ruang tunggu).',
    });
  }

  res.json({
    success: true,
    participant: found,
    isExamGateOpen,
  });
});

// Proxy for Google Sheets CSV sync to bypass browser CORS restrictions
app.post('/api/sync-spreadsheet', async (req, res) => {
  let { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ success: false, error: 'URL Google Sheets diperlukan.' });
  }

  url = url.trim();

  // Strip iframe embed wrapper if user pasted HTML embed code
  const iframeMatch = url.match(/src=["']([^"']+)["']/i);
  if (iframeMatch && iframeMatch[1]) {
    url = iframeMatch[1];
  }

  // Handle published Google Sheets (/spreadsheets/d/e/2PACX-.../)
  const pubMatch = url.match(/\/spreadsheets\/d\/e\/(2PACX-[a-zA-Z0-9-_]+)/);
  if (pubMatch && pubMatch[1]) {
    const pubId = pubMatch[1];
    const gidMatch = url.match(/[#&?]gid=([0-9]+)/);
    const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
    url = `https://docs.google.com/spreadsheets/d/e/${pubId}/pub?output=csv${gidParam}`;
  } else {
    // Standard Google Sheet URL (document ID)
    const docMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]{20,})/);
    if (docMatch && docMatch[1] && !url.includes('output=csv') && !url.includes('format=csv')) {
      const docId = docMatch[1];
      const gidMatch = url.match(/[#&?]gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : '0';
      url = `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&id=${docId}&gid=${gid}`;
    }
  }

  const fetchSpreadsheet = async (targetUrl: string) => {
    return await fetch(targetUrl, {
      headers: {
        'Accept': 'text/csv,text/plain,*/*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      redirect: 'follow',
    });
  };

  try {
    let response = await fetchSpreadsheet(url);

    // If export returned 400, 403, or 404, attempt Google visualization CSV endpoint fallback
    if (!response.ok && url.includes('/export?format=csv')) {
      const gvizUrl = url.replace('/export?format=csv', '/gviz/tq?tqx=out:csv');
      try {
        const gvizRes = await fetchSpreadsheet(gvizUrl);
        if (gvizRes.ok) {
          response = gvizRes;
        }
      } catch {
        // Continue with original response error
      }
    }

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: `Gagal mengunduh spreadsheet dari Google (HTTP ${response.status}). Pastikan spreadsheet disetel publik ("Siapa saja yang memiliki link") atau gunakan opsi "Upload Berkas Excel/CSV" di dashboard.`,
      });
    }

    const text = await response.text();

    // Check if Google returned an HTML login redirect page instead of CSV
    if (text.includes('<!DOCTYPE html>') && (text.includes('accounts.google.com') || text.includes('ServiceLogin'))) {
      return res.status(403).json({
        success: false,
        error: 'Spreadsheet terkunci (Memerlukan izin login Google). Silakan ubah izin berbagi Google Sheets menjadi "Siapa saja yang memiliki link dapat melihat" atau gunakan opsi "Upload Berkas Excel/CSV".',
      });
    }

    res.json({ success: true, csvText: text });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err?.message || 'Gagal tersambung ke server Google Sheets. Periksa koneksi internet atau gunakan opsi upload berkas Excel langsung.',
    });
  }
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: Number(PORT),
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`MMO 2027 Server running on http://0.0.0.0:${PORT}`);
  });
}

// In Vercel serverless environment, the app is exported and invoked per request without binding a port
if (!process.env.VERCEL) {
  startServer();
}

export default app;
