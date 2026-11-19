import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import fs from 'fs';
import multer from 'multer';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { INITIAL_QUESTIONS_DATA } from './src/data/questions.js';
import { sanitizeMathString } from './src/utils/mathSanitizer.js';
import {
  StructuredBankSoalItem,
  convertStructuredJsonToDrafts,
  parseDocxBufferToDrafts,
} from './src/utils/wordEquationParser.js';
import { parseSpreadsheetBufferToDrafts } from './src/utils/questionSpreadsheet.js';
import type { SiteFeedbackEntry } from './src/types/index.js';

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

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

const uploadDocx = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const uploadMedia = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

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
let questions: any[] = [...INITIAL_QUESTIONS_DATA];
const QUESTIONS_STORE_FILE = path.join(os.tmpdir(), 'mmo_questions_bank.json');

function loadQuestionsState(): void {
  try {
    if (fs.existsSync(QUESTIONS_STORE_FILE)) {
      const raw = fs.readFileSync(QUESTIONS_STORE_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.questions)) {
        questions = data.questions;
      }
    }
  } catch {
    // Fallback to INITIAL_QUESTIONS_DATA
  }
}

function saveQuestionsState(): void {
  try {
    fs.writeFileSync(
      QUESTIONS_STORE_FILE,
      JSON.stringify({
        questions,
        updatedAt: Date.now(),
      }),
      'utf-8'
    );
  } catch {
    // Ignore read-only filesystem errors
  }
}

loadQuestionsState();

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

function sanitizeServerQuestion(q: any) {
  return {
    ...q,
    text: sanitizeMathString(q.text || ''),
    explanation: sanitizeMathString(q.explanation || ''),
    formulaLatex: sanitizeMathString(q.formulaLatex || ''),
    options: Array.isArray(q.options)
      ? q.options.map((opt: any) => ({
          ...opt,
          text: sanitizeMathString(opt.text || ''),
        }))
      : q.options,
  };
}

// Questions API (Read & Full Management)
app.get('/api/questions', (_req, res) => {
  loadQuestionsState();
  const sanitized = questions.map(sanitizeServerQuestion);
  res.json({ success: true, data: sanitized });
});

// Parse uploaded Microsoft Word (.docx) file with native OMML Equations -> LaTeX KaTeX drafts
app.post('/api/admin/parse-docx', uploadDocx.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        error: 'Berkas Word (.docx) tidak ditemukan pada unggahan.',
      });
    }

    const fileName = req.file.originalname || '';
    if (!fileName.toLowerCase().endsWith('.docx')) {
      return res.status(400).json({
        success: false,
        error: 'Format berkas harus berupa Microsoft Word (.docx).',
      });
    }

    const category = req.body?.category === 'SMP' ? 'SMP' : 'SMA';
    const stage = req.body?.stage === 'Semifinal' ? 'Semifinal' : 'Penyisihan';

    const result = await parseDocxBufferToDrafts(req.file.buffer, {
      category,
      stage,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err?.message || 'Gagal mengurai berkas .docx. Pastikan berkas tidak terenkripsi password dan berformat .docx standar.',
    });
  }
});

const MMO_WORD_PARSER_SYSTEM_INSTRUCTION = `Kamu adalah sistem pengurai (parser) ahli untuk Bank Soal Olimpiade Matematika (MMO 2027). Tugas utamamu adalah memproses data mentah hasil salin-tempel (copy-paste) atau ekstraksi dokumen Microsoft Word dan mengubahnya menjadi format JSON terstruktur yang bersih.

ATURAN KRITIS (PENANGANAN BUG TEKS GANDA/BAYANGAN WORD):
Karakteristik data dari Microsoft Word sering menyertakan "teks fallback" atau teks bayangan di sebelah rumus (misalnya, angka "32" tercetak persis di samping rumus pecahan "3/2", "70002013" di sebelah "2013/7000", atau angka/persamaan ganda seperti "ke-1010", "2929").
1. Analisis konteks kalimat secara logis. Jika kamu mendeteksi ada angka/huruf aneh yang tergabung berantakan (seperti "32") berdampingan dengan rumus matematika yang masuk akal (seperti 3/2), HAPUS teks bayangan tersebut ("32").
2. Konversikan semua persamaan dan simbol matematika ke dalam sintaks KaTeX standar (misal: \\frac{3}{2}, \\sqrt{x}, x^{2}, \\sum).
3. Selalu apit setiap rumus KaTeX dengan simbol dolar ganda ($$ ... $$) agar peramban web dapat merendernya.

ATURAN STRUKTUR BERURUTAN (STATE MACHINE):
Urai naskah yang diberikan dengan urutan hierarki yang ketat:
1. Soal: Ambil nomor urut (bilangan bulat) dan teks soal penuh.
2. Pilihan Ganda: Ekstrak opsi A, B, C, D, E (bisa dalam format vertikal maupun horizontal di naskah asli; jika opsi E tidak ada di naskah, isi E dengan "").
3. Kunci Jawaban: Ekstrak huruf kunci tunggal ("A", "B", "C", "D", atau "E") yang biasanya ditandai dengan "Kunci:", "KJ:", "Jawaban:", atau "Kunci Jawaban:". Jika tidak tertulis, isi dengan "".

FORMAT OUTPUT:
Kembalikan HANYA array JSON murni sesuai skema yang ditetapkan tanpa markdown dan tanpa penjelasan apapun.`;

// AI-powered Word / Raw Copy-Paste Parser with Word shadow text removal & $$...$$ KaTeX output
app.post('/api/admin/parse-word-ai', async (req, res) => {
  const { rawText, category, stage } = req.body || {};

  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Teks soal dari Microsoft Word tidak boleh kosong.',
    });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({
      success: false,
      error: 'Kunci API Gemini belum tersedia di server. Periksa panel Settings > Secrets atau gunakan pengurai lokal Word.',
    });
  }

  const targetCategory = category === 'SMP' ? 'SMP' : 'SMA';
  const targetStage = stage === 'Semifinal' ? 'Semifinal' : 'Penyisihan';

  try {
    let response: any;
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: rawText,
          config: {
            systemInstruction: MMO_WORD_PARSER_SYSTEM_INSTRUCTION,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  nomor: {
                    type: Type.INTEGER,
                    description: 'Nomor urut soal matematika.',
                  },
                  soal: {
                    type: Type.STRING,
                    description: 'Teks soal penuh bebas teks bayangan Word dengan rumus KaTeX diapit $$ ... $$.',
                  },
                  opsi: {
                    type: Type.OBJECT,
                    properties: {
                      A: { type: Type.STRING },
                      B: { type: Type.STRING },
                      C: { type: Type.STRING },
                      D: { type: Type.STRING },
                      E: { type: Type.STRING },
                    },
                    required: ['A', 'B', 'C', 'D', 'E'],
                  },
                  kunci_jawaban: {
                    type: Type.STRING,
                    description: 'Huruf kunci jawaban A, B, C, D, atau E (atau string kosong jika tidak tertulis).',
                  },
                },
                required: ['nomor', 'soal', 'opsi', 'kunci_jawaban'],
              },
            },
          },
        });
        break;
      } catch (retryErr: any) {
        const errStatus = Number(retryErr?.status);
        const isTransient = errStatus === 503 || errStatus === 429 || errStatus === 500;
        if (!isTransient || attempt === maxAttempts) {
          throw retryErr;
        }
        await new Promise((r) => setTimeout(r, 600 * attempt));
      }
    }

    const jsonText = (response?.text ?? '[]').trim();
    const parsedRaw = JSON.parse(jsonText);

    if (!Array.isArray(parsedRaw) || parsedRaw.length === 0) {
      return res.status(422).json({
        success: false,
        error: 'AI tidak menemukan butir soal yang sesuai struktur Soal → Pilihan A–E → Kunci Jawaban pada teks tersebut.',
      });
    }

    const jsonOutput: StructuredBankSoalItem[] = parsedRaw.map((entry: any, idx: number) => ({
      nomor: Number(entry?.nomor) > 0 ? Number(entry.nomor) : idx + 1,
      soal: String(entry?.soal ?? '').trim(),
      opsi: {
        A: String(entry?.opsi?.A ?? '').trim(),
        B: String(entry?.opsi?.B ?? '').trim(),
        C: String(entry?.opsi?.C ?? '').trim(),
        D: String(entry?.opsi?.D ?? '').trim(),
        E: String(entry?.opsi?.E ?? '').trim(),
      },
      kunci_jawaban: String(entry?.kunci_jawaban ?? '').trim().toUpperCase(),
    }));

    const parseResult = convertStructuredJsonToDrafts(jsonOutput, {
      category: targetCategory,
      stage: targetStage,
    });

    res.json({
      success: true,
      data: {
        jsonOutput,
        parseResult,
      },
    });
  } catch (err: any) {
    console.error('AI Word parser error:', err);
    const status = Number(err?.status) || 500;
    let message = err?.message || 'Gagal memproses teks Word menggunakan Gemini AI.';
    try {
      const parsedErr = JSON.parse(message);
      if (parsedErr?.error?.message) {
        message = parsedErr.error.message;
      }
    } catch {
      // message is plain text
    }
    if (status === 400 || status === 403) {
      message = `Kunci API Gemini bermasalah (${message}). Periksa pengaturan di panel Settings > Secrets.`;
    } else if (status === 429) {
      message = `Batas kuota permintaan AI tercapai (${message}). Silakan coba lagi sebentar atau gunakan tombol "Urai Cepat (Lokal)".`;
    } else if (status === 503) {
      message = `Layanan Gemini AI sedang padat sementara (${message}). Silakan klik ulang atau gunakan tombol "Urai Cepat (Lokal)".`;
    }
    res.status(status >= 400 && status < 600 ? status : 500).json({
      success: false,
      error: message,
    });
  }
});

// Multimodal AI Extractor for uploaded PDF or Image (screenshot/photo) question sheets
app.post('/api/admin/parse-pdf-image-ai', uploadMedia.single('file'), async (req, res) => {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({
      success: false,
      error: 'Berkas PDF atau gambar soal tidak ditemukan pada unggahan.',
    });
  }

  const allowedMimeTypes = new Set([
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
  ]);
  const mimeType = (req.file.mimetype || '').toLowerCase();
  const originalLower = (req.file.originalname || '').toLowerCase();
  const resolvedMime = allowedMimeTypes.has(mimeType)
    ? mimeType === 'image/jpg'
      ? 'image/jpeg'
      : mimeType
    : originalLower.endsWith('.pdf')
    ? 'application/pdf'
    : originalLower.endsWith('.png')
    ? 'image/png'
    : originalLower.endsWith('.webp')
    ? 'image/webp'
    : originalLower.endsWith('.jpg') || originalLower.endsWith('.jpeg')
    ? 'image/jpeg'
    : '';

  if (!resolvedMime) {
    return res.status(400).json({
      success: false,
      error: 'Format berkas tidak didukung. Unggah berkas PDF (.pdf) atau gambar PNG/JPG/WEBP.',
    });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({
      success: false,
      error: 'Kunci API Gemini belum tersedia di server. Periksa panel Settings > Secrets.',
    });
  }

  const targetCategory = req.body?.category === 'SMP' ? 'SMP' : 'SMA';
  const targetStage = req.body?.stage === 'Semifinal' ? 'Semifinal' : 'Penyisihan';

  try {
    const mediaPart = {
      inlineData: {
        mimeType: resolvedMime,
        data: req.file.buffer.toString('base64'),
      },
    };
    const promptPart = {
      text: 'Ekstrak seluruh butir soal matematika dari dokumen PDF atau gambar terlampir secara berurutan (nomor, soal, opsi A–E, dan kunci_jawaban jika tersedia). Konversikan seluruh pecahan, akar, pangkat, sigma, integral, dan simbol matematika ke KaTeX standar yang diapit $$ ... $$.',
    };

    let response: any;
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: { parts: [mediaPart, promptPart] },
          config: {
            systemInstruction: MMO_WORD_PARSER_SYSTEM_INSTRUCTION,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  nomor: { type: Type.INTEGER },
                  soal: { type: Type.STRING },
                  opsi: {
                    type: Type.OBJECT,
                    properties: {
                      A: { type: Type.STRING },
                      B: { type: Type.STRING },
                      C: { type: Type.STRING },
                      D: { type: Type.STRING },
                      E: { type: Type.STRING },
                    },
                    required: ['A', 'B', 'C', 'D', 'E'],
                  },
                  kunci_jawaban: { type: Type.STRING },
                },
                required: ['nomor', 'soal', 'opsi', 'kunci_jawaban'],
              },
            },
          },
        });
        break;
      } catch (retryErr: any) {
        const errStatus = Number(retryErr?.status);
        const isTransient = errStatus === 503 || errStatus === 429 || errStatus === 500;
        if (!isTransient || attempt === maxAttempts) {
          throw retryErr;
        }
        await new Promise((r) => setTimeout(r, 600 * attempt));
      }
    }

    const jsonText = (response?.text ?? '[]').trim();
    const parsedRaw = JSON.parse(jsonText);

    if (!Array.isArray(parsedRaw) || parsedRaw.length === 0) {
      return res.status(422).json({
        success: false,
        error: 'Tidak ditemukan butir soal yang terbaca pada file PDF/gambar ini. Pastikan gambar jelas dan tidak buram.',
      });
    }

    const jsonOutput: StructuredBankSoalItem[] = parsedRaw.map((entry: any, idx: number) => ({
      nomor: Number(entry?.nomor) > 0 ? Number(entry.nomor) : idx + 1,
      soal: String(entry?.soal ?? '').trim(),
      opsi: {
        A: String(entry?.opsi?.A ?? '').trim(),
        B: String(entry?.opsi?.B ?? '').trim(),
        C: String(entry?.opsi?.C ?? '').trim(),
        D: String(entry?.opsi?.D ?? '').trim(),
        E: String(entry?.opsi?.E ?? '').trim(),
      },
      kunci_jawaban: String(entry?.kunci_jawaban ?? '').trim().toUpperCase(),
    }));

    const parseResult = convertStructuredJsonToDrafts(jsonOutput, {
      category: targetCategory,
      stage: targetStage,
    });

    res.json({
      success: true,
      data: {
        jsonOutput,
        parseResult,
      },
    });
  } catch (err: any) {
    console.error('AI PDF/Image parser error:', err);
    const status = Number(err?.status) || 500;
    let message = err?.message || 'Gagal mengekstrak soal dari PDF atau gambar.';
    try {
      const parsedErr = JSON.parse(message);
      if (parsedErr?.error?.message) message = parsedErr.error.message;
    } catch {
      // plain text
    }
    if (status === 400 || status === 403) {
      message = `Kunci API Gemini bermasalah (${message}). Periksa pengaturan di panel Settings > Secrets.`;
    } else if (status === 429) {
      message = `Batas kuota permintaan AI tercapai (${message}). Silakan coba lagi sebentar.`;
    } else if (status === 503) {
      message = `Layanan Gemini AI sedang padat sementara (${message}). Silakan coba kembali sebentar.`;
    }
    res.status(status >= 400 && status < 600 ? status : 500).json({
      success: false,
      error: message,
    });
  }
});

// Server-side Google Sheets Question Fetcher (avoids CORS & converts Sheet link -> CSV -> staging drafts)
app.post('/api/admin/fetch-sheets-questions', async (req, res) => {
  try {
    const { url, category, stage } = req.body || {};
    if (!url || typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Masukkan tautan Google Sheets atau link ekspor CSV yang valid.',
      });
    }

    const rawUrl = url.trim();
    let fetchUrl = rawUrl;

    const sheetMatch = rawUrl.match(/https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (sheetMatch) {
      const sheetId = sheetMatch[1];
      const gidMatch = rawUrl.match(/[?&#]gid=(\d+)/);
      const gid = gidMatch ? gidMatch[1] : '0';
      fetchUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    } else if (!/^https?:\/\//i.test(rawUrl)) {
      return res.status(400).json({
        success: false,
        error: 'URL harus diawali https:// (mis. tautan Google Sheets).',
      });
    }

    const sheetRes = await fetch(fetchUrl);
    if (!sheetRes.ok) {
      return res.status(400).json({
        success: false,
        error: `Gagal mengunduh Google Sheets (HTTP ${sheetRes.status}). Pastikan akses berbagi disetel "Siapa saja yang memiliki link dapat melihat".`,
      });
    }

    const csvText = await sheetRes.text();
    if (!csvText.trim() || csvText.trim().startsWith('<!DOCTYPE html') || csvText.includes('ServiceLogin')) {
      return res.status(400).json({
        success: false,
        error: 'Spreadsheet bersifat privat atau membutuhkan login Google. Ubah izin berbagi menjadi "Siapa saja yang memiliki link dapat melihat".',
      });
    }

    const targetCategory = category === 'SMP' ? 'SMP' : 'SMA';
    const targetStage = stage === 'Semifinal' ? 'Semifinal' : 'Penyisihan';
    const buffer = Buffer.from(csvText, 'utf-8');
    const parseResult = parseSpreadsheetBufferToDrafts(buffer, {
      category: targetCategory,
      stage: targetStage,
    });

    if (parseResult.drafts.length === 0) {
      return res.status(422).json({
        success: false,
        error: 'Tidak ditemukan baris soal yang valid pada Google Sheets. Pastikan baris header memiliki kolom "Soal", "Opsi A"–"Opsi E", dan "Kunci".',
      });
    }

    res.json({
      success: true,
      data: parseResult,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err?.message || 'Gagal membaca data soal dari Google Sheets.',
    });
  }
});

// Bulk save questions from Word importer preview
app.post('/api/questions/bulk', (req, res) => {
  loadQuestionsState();
  const {
    questions: incoming,
    mode = 'append',
    category,
    stage,
  } = req.body || {};

  if (!Array.isArray(incoming) || incoming.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Daftar soal yang akan disimpan tidak boleh kosong.',
    });
  }

  const sanitizedIncoming = incoming.map((q: any, idx: number) =>
    sanitizeServerQuestion({
      ...q,
      id: q.id || `mmo-${Date.now()}-${idx + 1}-${Math.random().toString(36).slice(2, 6)}`,
      questionNumber: Number(q.questionNumber) || idx + 1,
      points: q.points || { correct: 4, wrong: -1, blank: 0 },
    })
  );

  if (mode === 'replace_all') {
    questions = sanitizedIncoming;
  } else if (mode === 'replace_packet' && category && stage) {
    questions = [
      ...questions.filter((q) => !(q.category === category && (q.stage || 'Penyisihan') === stage)),
      ...sanitizedIncoming,
    ];
  } else {
    questions = [...questions, ...sanitizedIncoming];
  }

  saveQuestionsState();
  res.json({ success: true, data: questions });
});

// Add single question
app.post('/api/questions', (req, res) => {
  loadQuestionsState();
  const payload = req.body;
  if (!payload || (!payload.text && !payload.imageUrl)) {
    return res.status(400).json({ success: false, error: 'Teks soal atau gambar wajib diisi.' });
  }
  const newQuestion = sanitizeServerQuestion({
    ...payload,
    id: payload.id || `mmo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    points: payload.points || { correct: 4, wrong: -1, blank: 0 },
  });
  questions = [...questions, newQuestion];
  saveQuestionsState();
  res.json({ success: true, data: questions, added: newQuestion });
});

// Update single question
app.put('/api/questions/:id', (req, res) => {
  loadQuestionsState();
  const { id } = req.params;
  const idx = questions.findIndex((q) => q.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Soal tidak ditemukan.' });
  }
  questions[idx] = sanitizeServerQuestion({
    ...questions[idx],
    ...req.body,
    id,
  });
  saveQuestionsState();
  res.json({ success: true, data: questions, updated: questions[idx] });
});

// Delete single question
app.delete('/api/questions/:id', (req, res) => {
  loadQuestionsState();
  const { id } = req.params;
  const before = questions.length;
  questions = questions.filter((q) => q.id !== id);
  if (questions.length === before) {
    return res.status(404).json({ success: false, error: 'Soal tidak ditemukan.' });
  }
  saveQuestionsState();
  res.json({ success: true, data: questions });
});

// Clear all questions
app.post('/api/questions/clear-all', (_req, res) => {
  questions = [];
  saveQuestionsState();
  res.json({ success: true, data: questions });
});

// Reset questions to built-in INITIAL_QUESTIONS_DATA
app.post('/api/questions/reset', (_req, res) => {
  questions = [...INITIAL_QUESTIONS_DATA];
  saveQuestionsState();
  res.json({ success: true, data: questions.map(sanitizeServerQuestion) });
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
        model: 'gemini-4-hydrogen',
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
let examGateMatrix: Record<string, boolean> = {
  'SMP_Penyisihan': false,
  'SMP_Semifinal': false,
  'SMA_Penyisihan': false,
  'SMA_Semifinal': false,
};

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
      if (data.gateMatrix && typeof data.gateMatrix === 'object') {
        examGateMatrix = {
          ...examGateMatrix,
          ...data.gateMatrix,
        };
      }
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
        gateMatrix: examGateMatrix,
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
      gateMatrix: examGateMatrix,
    },
  });
});

// POST update exam gate status (called by Proctor Dashboard)
app.post('/api/exam-gate', (req, res) => {
  loadGateState();
  const { isOpen, passcode, gateMatrix, gateKey, gateValue, applyAll } = req.body;

  // Single gate key toggle: e.g. gateKey: 'SMP_Penyisihan', gateValue: true
  if (gateKey && typeof gateValue === 'boolean') {
    examGateMatrix[gateKey] = gateValue;
  }

  // Bulk matrix merge
  if (gateMatrix && typeof gateMatrix === 'object') {
    examGateMatrix = {
      ...examGateMatrix,
      ...gateMatrix,
    };
  }

  // Master switch or applyAll: turns all 4 gates open or closed
  if (applyAll === true || (typeof isOpen === 'boolean' && !gateMatrix && !gateKey)) {
    isExamGateOpen = isOpen;
    examGateMatrix = {
      'SMP_Penyisihan': isOpen,
      'SMP_Semifinal': isOpen,
      'SMA_Penyisihan': isOpen,
      'SMA_Semifinal': isOpen,
    };
    examGateOpenedAt = isOpen ? new Date().toISOString() : null;
  } else {
    // When individual gates are manipulated, overall gate isOpen reflects if at least one is open
    isExamGateOpen = Object.values(examGateMatrix).some(Boolean);
    if (isExamGateOpen && !examGateOpenedAt) {
      examGateOpenedAt = new Date().toISOString();
    } else if (!isExamGateOpen) {
      examGateOpenedAt = null;
    }
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
      gateMatrix: examGateMatrix,
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

  loadGateState();
  const { category, stage } = req.body;
  let specificGateOpen = isExamGateOpen;
  if (category && stage) {
    const key = `${category}_${stage}`;
    if (typeof examGateMatrix[key] === 'boolean') {
      specificGateOpen = examGateMatrix[key] || isExamGateOpen;
    }
  }

  res.json({
    success: true,
    participant: found,
    isExamGateOpen: specificGateOpen,
    gateMatrix: examGateMatrix,
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

// ========================================================
// POST-EXAM WEBSITE FEEDBACK & GOOGLE SHEETS WEBHOOK
// ========================================================
const FEEDBACK_STORE_FILE = path.join(os.tmpdir(), 'mmo_site_feedback.json');
let feedbackEntries: SiteFeedbackEntry[] = [];
let feedbackWebhookUrl: string = (process.env.FEEDBACK_SHEETS_WEBHOOK_URL || '').trim();

function loadFeedbackState(): void {
  try {
    if (fs.existsSync(FEEDBACK_STORE_FILE)) {
      const raw = fs.readFileSync(FEEDBACK_STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.entries)) {
        feedbackEntries = parsed.entries;
      }
      if (typeof parsed.webhookUrl === 'string' && parsed.webhookUrl.trim()) {
        feedbackWebhookUrl = parsed.webhookUrl.trim();
      } else if (typeof parsed.webhookUrl === 'string' && !process.env.FEEDBACK_SHEETS_WEBHOOK_URL) {
        feedbackWebhookUrl = parsed.webhookUrl.trim();
      }
    }
  } catch {
    // Fallback to clean in-memory state
  }
}

function saveFeedbackState(): void {
  try {
    fs.writeFileSync(
      FEEDBACK_STORE_FILE,
      JSON.stringify({
        entries: feedbackEntries,
        webhookUrl: feedbackWebhookUrl,
        updatedAt: Date.now(),
      }),
      'utf-8'
    );
  } catch {
    // Ignore read-only filesystem errors
  }
}

loadFeedbackState();

function formatWibDateTime(date: Date): string {
  try {
    const formatted = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date);
    return `${formatted} WIB`;
  } catch {
    return `${date.toLocaleString('id-ID')} WIB`;
  }
}

function validateWebhookUrl(rawUrl: string): { valid: boolean; normalized: string; error?: string } {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) {
    return { valid: true, normalized: '' };
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return {
        valid: false,
        normalized: trimmed,
        error: 'URL Webhook harus diawali dengan https:// (atau http:// untuk pengujian lokal).',
      };
    }
    return { valid: true, normalized: parsed.toString() };
  } catch {
    return {
      valid: false,
      normalized: trimmed,
      error: 'Format URL Webhook tidak valid. Pastikan Anda menyalin alamat Web App URL dari Google Apps Script dengan lengkap.',
    };
  }
}

async function forwardFeedbackToWebhook(
  targetUrl: string,
  entry: SiteFeedbackEntry,
  rowNumber: number,
  isTest = false
): Promise<{ ok: boolean; error?: string }> {
  const check = validateWebhookUrl(targetUrl);
  if (!check.valid || !check.normalized) {
    return { ok: false, error: check.error || 'URL Webhook Google Sheets belum diisi.' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8500);

  try {
    const response = await fetch(check.normalized, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json,text/plain,*/*',
      },
      body: JSON.stringify({
        sheetName: 'Saran_Website_MMO2027',
        rowNumber,
        id: entry.id,
        submittedAtWib: entry.submittedAtWib,
        participantName: entry.participantName,
        school: entry.school,
        nisnOrRegNumber: entry.nisnOrRegNumber,
        category: entry.category,
        stage: entry.stage,
        message: entry.message,
        isTest,
        source: 'MMO 2027 CBT Website',
      }),
      redirect: 'follow',
      signal: controller.signal,
    });

    const text = await response.text();

    if (!response.ok) {
      return {
        ok: false,
        error: `Webhook mengembalikan status HTTP ${response.status}. Periksa deployment Apps Script.`,
      };
    }

    if (
      text.includes('<!DOCTYPE html>') &&
      (text.includes('accounts.google.com') || text.includes('ServiceLogin') || text.includes('Sign in'))
    ) {
      return {
        ok: false,
        error: 'Akses Web App Apps Script belum dibuka ke publik. Setel "Who has access" menjadi "Anyone" (Siapa saja).',
      };
    }

    try {
      const parsed = JSON.parse(text);
      if (parsed && (parsed.status === 'error' || parsed.success === false)) {
        return {
          ok: false,
          error: parsed.message || parsed.error || 'Apps Script melaporkan kegagalan penyimpanan baris.',
        };
      }
    } catch {
      // Plain text or non-JSON success response from custom webhooks is acceptable when HTTP 2xx
    }

    return { ok: true };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return { ok: false, error: 'Koneksi ke Webhook Google Sheets melebihi batas waktu (timeout).' };
    }
    return { ok: false, error: err?.message || 'Gagal terhubung ke Webhook Google Sheets.' };
  } finally {
    clearTimeout(timeout);
  }
}

app.get('/api/feedback', (_req, res) => {
  res.json({
    success: true,
    data: feedbackEntries,
    webhookUrl: feedbackWebhookUrl,
  });
});

app.post('/api/feedback', async (req, res) => {
  const {
    participantId,
    participantName,
    school,
    nisnOrRegNumber,
    category,
    stage,
    message,
  } = req.body || {};

  const cleanMessage = typeof message === 'string' ? message.trim() : '';
  if (!cleanMessage) {
    return res.status(400).json({
      success: false,
      error: 'Pesan atau saran untuk website tidak boleh kosong.',
    });
  }

  const now = new Date();
  const entry: SiteFeedbackEntry = {
    id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: now.getTime(),
    submittedAtWib: formatWibDateTime(now),
    participantId: participantId ? String(participantId).trim() : undefined,
    participantName: String(participantName || 'Peserta MMO').trim(),
    school: String(school || '-').trim(),
    nisnOrRegNumber: String(nisnOrRegNumber || '-').trim(),
    category: category === 'SMP' ? 'SMP' : 'SMA',
    stage: stage === 'Semifinal' ? 'Semifinal' : 'Penyisihan',
    message: cleanMessage,
    webhookStatus: feedbackWebhookUrl ? 'failed' : 'not_configured',
  };

  feedbackEntries = [entry, ...feedbackEntries];
  saveFeedbackState();

  if (feedbackWebhookUrl) {
    const rowNumber = feedbackEntries.length;
    const syncRes = await forwardFeedbackToWebhook(feedbackWebhookUrl, entry, rowNumber, false);
    entry.lastSyncAttempt = Date.now();
    if (syncRes.ok) {
      entry.webhookStatus = 'synced';
      entry.webhookError = undefined;
    } else {
      entry.webhookStatus = 'failed';
      entry.webhookError = syncRes.error;
    }
    feedbackEntries = feedbackEntries.map((item) => (item.id === entry.id ? entry : item));
    saveFeedbackState();
  }

  res.json({
    success: true,
    data: entry,
  });
});

app.get('/api/feedback/webhook', (_req, res) => {
  res.json({
    success: true,
    webhookUrl: feedbackWebhookUrl,
  });
});

app.post('/api/feedback/webhook', (req, res) => {
  const { webhookUrl } = req.body || {};
  const check = validateWebhookUrl(webhookUrl ?? '');
  if (!check.valid) {
    return res.status(400).json({
      success: false,
      error: check.error,
    });
  }

  feedbackWebhookUrl = check.normalized;
  saveFeedbackState();

  res.json({
    success: true,
    webhookUrl: feedbackWebhookUrl,
  });
});

app.post('/api/feedback/webhook/test', async (req, res) => {
  const targetUrl = typeof req.body?.webhookUrl === 'string' && req.body.webhookUrl.trim()
    ? req.body.webhookUrl.trim()
    : feedbackWebhookUrl;

  if (!targetUrl) {
    return res.status(400).json({
      success: false,
      error: 'Masukkan URL Web App Google Apps Script terlebih dahulu sebelum melakukan uji kirim.',
    });
  }

  const now = new Date();
  const sampleEntry: SiteFeedbackEntry = {
    id: `fb-test-${Date.now()}`,
    createdAt: now.getTime(),
    submittedAtWib: formatWibDateTime(now),
    participantName: '[TES KONEKSI] Panitia MMO 2027',
    school: 'HMPS Pendidikan Matematika UMM',
    nisnOrRegNumber: 'TEST-001',
    category: 'SMA',
    stage: 'Penyisihan',
    message: 'Uji koneksi Webhook Pesan & Saran Website MMO 2027 berhasil terhubung ke Google Sheets.',
    webhookStatus: 'not_configured',
  };

  const syncRes = await forwardFeedbackToWebhook(targetUrl, sampleEntry, 1, true);
  if (!syncRes.ok) {
    return res.status(400).json({
      success: false,
      error: syncRes.error || 'Gagal mengirim uji coba ke Google Sheets.',
    });
  }

  res.json({
    success: true,
    message: 'Baris uji berhasil dikirim! Silakan cek sheet "Saran_Website_MMO2027" di Google Spreadsheet Anda.',
  });
});

app.post('/api/feedback/sync-all', async (_req, res) => {
  if (!feedbackWebhookUrl) {
    return res.status(400).json({
      success: false,
      error: 'URL Webhook Google Sheets belum dikonfigurasi.',
    });
  }

  const chronological = [...feedbackEntries].sort((a, b) => a.createdAt - b.createdAt);
  let syncedCount = 0;
  let failedCount = 0;
  let lastError: string | undefined;

  for (let i = 0; i < chronological.length; i++) {
    const item = chronological[i];
    if (item.webhookStatus === 'synced') continue;

    const syncRes = await forwardFeedbackToWebhook(feedbackWebhookUrl, item, i + 1, false);
    item.lastSyncAttempt = Date.now();
    if (syncRes.ok) {
      item.webhookStatus = 'synced';
      item.webhookError = undefined;
      syncedCount += 1;
    } else {
      item.webhookStatus = 'failed';
      item.webhookError = syncRes.error;
      failedCount += 1;
      lastError = syncRes.error;
    }
  }

  feedbackEntries = [...chronological].sort((a, b) => b.createdAt - a.createdAt);
  saveFeedbackState();

  res.json({
    success: true,
    syncedCount,
    failedCount,
    lastError,
    data: feedbackEntries,
  });
});

app.post('/api/feedback/:id/sync', async (req, res) => {
  const { id } = req.params;
  if (!feedbackWebhookUrl) {
    return res.status(400).json({
      success: false,
      error: 'URL Webhook Google Sheets belum dikonfigurasi.',
    });
  }

  const idx = feedbackEntries.findIndex((item) => item.id === id);
  if (idx < 0) {
    return res.status(404).json({
      success: false,
      error: 'Pesan tidak ditemukan di server.',
    });
  }

  const chronologicalIndex = [...feedbackEntries]
    .sort((a, b) => a.createdAt - b.createdAt)
    .findIndex((item) => item.id === id);

  const entry = { ...feedbackEntries[idx] };
  const syncRes = await forwardFeedbackToWebhook(
    feedbackWebhookUrl,
    entry,
    chronologicalIndex >= 0 ? chronologicalIndex + 1 : 1,
    false
  );

  entry.lastSyncAttempt = Date.now();
  if (syncRes.ok) {
    entry.webhookStatus = 'synced';
    entry.webhookError = undefined;
  } else {
    entry.webhookStatus = 'failed';
    entry.webhookError = syncRes.error;
  }

  feedbackEntries[idx] = entry;
  saveFeedbackState();

  res.json({
    success: syncRes.ok,
    data: entry,
    error: syncRes.ok ? undefined : syncRes.error,
  });
});

app.delete('/api/feedback/:id', (req, res) => {
  const { id } = req.params;
  const beforeLen = feedbackEntries.length;
  feedbackEntries = feedbackEntries.filter((item) => item.id !== id);
  if (feedbackEntries.length !== beforeLen) {
    saveFeedbackState();
  }
  res.json({ success: true, remaining: feedbackEntries.length });
});

app.delete('/api/feedback', (_req, res) => {
  feedbackEntries = [];
  saveFeedbackState();
  res.json({ success: true });
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
