import * as XLSX from 'xlsx';
import {
  CompetitionStage,
  MathDomain,
  OlympiadCategory,
  Question,
  QuestionOption,
  QuestionType,
} from '../types/index';
import { sanitizeMathString } from './mathSanitizer';
import {
  ParsedWordQuestionDraft,
  WordImportDefaults,
  WordParseResult,
  draftsToStructuredJson,
  inferMathDomain,
} from './wordEquationParser';

function normalizeHeaderKey(header: string): string {
  return String(header || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function resolveColumnValue(row: Record<string, any>, aliases: string[]): string {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    for (const k of keys) {
      if (normalizeHeaderKey(k) === alias) {
        const val = row[k];
        if (val !== undefined && val !== null) {
          return String(val).trim();
        }
      }
    }
  }
  return '';
}

function parseCategory(raw: string, fallback: OlympiadCategory): OlympiadCategory {
  const upper = raw.trim().toUpperCase();
  if (upper.includes('SMP') || upper.includes('MTS')) return 'SMP';
  if (upper.includes('SMA') || upper.includes('MA') || upper.includes('SMK')) return 'SMA';
  return fallback;
}

function parseStage(raw: string, fallback: CompetitionStage): CompetitionStage {
  const lower = raw.trim().toLowerCase();
  if (lower.includes('semi')) return 'Semifinal';
  if (lower.includes('penyisihan') || lower.includes('prelim')) return 'Penyisihan';
  return fallback;
}

function parseDomain(raw: string, textForFallback: string): MathDomain {
  const lower = raw.trim().toLowerCase();
  if (lower.includes('geom')) return 'Geometri';
  if (lower.includes('komb') || lower.includes('peluang')) return 'Kombinatorika';
  if (lower.includes('teori') || lower.includes('bilangan')) return 'Teori Bilangan';
  if (lower.includes('aljabar') || lower.includes('algebra')) return 'Aljabar';
  return inferMathDomain(textForFallback);
}

function parseQuestionType(raw: string, optionsCount: number): QuestionType {
  const lower = raw.trim().toLowerCase();
  if (lower.includes('isian') || lower.includes('short') || lower.includes('esai')) {
    return 'short_answer';
  }
  if (lower.includes('pilihan') || lower.includes('pg') || lower.includes('multiple')) {
    return 'multiple_choice';
  }
  return optionsCount >= 2 ? 'multiple_choice' : 'short_answer';
}

function countMathFormulaTokens(text: string): number {
  if (!text) return 0;
  const matches = text.match(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g);
  return matches ? matches.length : 0;
}

/**
 * Parse .xlsx / .xls / .csv buffer into WordParseResult drafts
 */
export function parseSpreadsheetBufferToDrafts(
  buffer: ArrayBuffer | Uint8Array,
  defaults: WordImportDefaults
): WordParseResult {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return {
      drafts: [],
      rawLinesPreview: '',
      stats: {
        totalDetected: 0,
        equationsConverted: 0,
        imagesExtracted: 0,
        missingKeyCount: 0,
        incompleteOptionsCount: 0,
      },
    };
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

  const drafts: ParsedWordQuestionDraft[] = [];
  let equationsConverted = 0;

  rows.forEach((row, index) => {
    const rawQuestionText = resolveColumnValue(row, [
      'soal',
      'pertanyaan',
      'teks soal',
      'question',
      'text',
      'butir soal',
    ]);

    if (!rawQuestionText) return;

    const rawNo = resolveColumnValue(row, ['no', 'no.', 'nomor', 'number', 'no soal']);
    const rawCat = resolveColumnValue(row, ['jenjang', 'kategori', 'category', 'tingkat']);
    const rawStage = resolveColumnValue(row, ['babak', 'tahap', 'stage', 'sesi']);
    const rawDomain = resolveColumnValue(row, ['materi', 'domain', 'bidang', 'bidang materi', 'topik']);
    const rawType = resolveColumnValue(row, ['tipe', 'jenis', 'type', 'bentuk']);
    const rawKey = resolveColumnValue(row, ['kunci', 'kunci jawaban', 'kj', 'jawaban', 'key', 'correct']);
    const rawExplanation = resolveColumnValue(row, ['pembahasan', 'solusi', 'penyelesaian', 'explanation']);

    const optA = sanitizeMathString(resolveColumnValue(row, ['opsi a', 'pilihan a', 'a', 'option a']));
    const optB = sanitizeMathString(resolveColumnValue(row, ['opsi b', 'pilihan b', 'b', 'option b']));
    const optC = sanitizeMathString(resolveColumnValue(row, ['opsi c', 'pilihan c', 'c', 'option c']));
    const optD = sanitizeMathString(resolveColumnValue(row, ['opsi d', 'pilihan d', 'd', 'option d']));
    const optE = sanitizeMathString(resolveColumnValue(row, ['opsi e', 'pilihan e', 'e', 'option e']));

    const rawOptions: QuestionOption[] = [
      { id: 'A', text: optA },
      { id: 'B', text: optB },
      { id: 'C', text: optC },
      { id: 'D', text: optD },
      { id: 'E', text: optE },
    ].filter((opt, idx) => idx < 4 || opt.text.trim() !== '');

    const nonEmptyCount = rawOptions.filter((o) => o.text.trim() !== '').length;
    const type = parseQuestionType(rawType, nonEmptyCount);
    const cleanText = sanitizeMathString(rawQuestionText);
    const cleanExplanation = sanitizeMathString(rawExplanation);
    const parsedNum = parseInt(rawNo, 10);

    let correctAnswer = rawKey.trim().toUpperCase();
    if (type === 'multiple_choice' && correctAnswer) {
      const m = correctAnswer.match(/[A-E]/);
      if (m) correctAnswer = m[0];
    }

    const eqCount =
      countMathFormulaTokens(cleanText) +
      countMathFormulaTokens(cleanExplanation) +
      rawOptions.reduce((sum, o) => sum + countMathFormulaTokens(o.text), 0);
    equationsConverted += eqCount;

    const warnings: string[] = [];
    if (type === 'multiple_choice' && nonEmptyCount < 4) {
      warnings.push('Minimal 4 opsi jawaban (A–D) perlu terisi.');
    }
    if (!correctAnswer) {
      warnings.push('Kunci jawaban belum terdeteksi — pilih A–E di pratinjau.');
    } else if (
      type === 'multiple_choice' &&
      !rawOptions.some((o) => o.id === correctAnswer)
    ) {
      warnings.push(`Kunci "${correctAnswer}" tidak ada pada daftar opsi.`);
    }

    drafts.push({
      tempId: `sheet-draft-${Date.now()}-${index + 1}-${Math.random().toString(36).slice(2, 6)}`,
      questionNumber: Number.isFinite(parsedNum) && parsedNum > 0 ? parsedNum : drafts.length + 1,
      text: cleanText,
      options: type === 'multiple_choice' ? rawOptions : [],
      correctAnswer,
      explanation: cleanExplanation,
      domain: parseDomain(rawDomain, `${cleanText} ${cleanExplanation}`),
      category: parseCategory(rawCat, defaults.category),
      stage: parseStage(rawStage, defaults.stage),
      type,
      equationsCount: eqCount,
      warnings,
    });
  });

  return {
    drafts,
    rawLinesPreview: JSON.stringify(draftsToStructuredJson(drafts), null, 2),
    stats: {
      totalDetected: drafts.length,
      equationsConverted,
      imagesExtracted: 0,
      missingKeyCount: drafts.filter((d) => !d.correctAnswer).length,
      incompleteOptionsCount: drafts.filter(
        (d) => d.type === 'multiple_choice' && d.options.filter((o) => o.text.trim()).length < 4
      ).length,
    },
  };
}

/**
 * Generate a ready-to-fill Excel (.xlsx) template matching MMO 2027 question structure
 */
export function buildSampleExcelTemplateBlob(): Blob {
  const sampleRows = [
    {
      No: 1,
      Jenjang: 'SMA',
      Babak: 'Penyisihan',
      Materi: 'Aljabar',
      Tipe: 'Pilihan Ganda',
      Soal: 'Berapakah hasil dari $$ \\frac{3}{2} $$ ditambah $$ \\frac{5}{2} $$?',
      'Opsi A': '$$ 2 $$',
      'Opsi B': '$$ 3 $$',
      'Opsi C': '$$ 4 $$',
      'Opsi D': '$$ \\frac{9}{2} $$',
      'Opsi E': '$$ 5 $$',
      Kunci: 'C',
      Pembahasan: '$$ \\frac{3}{2} + \\frac{5}{2} = \\frac{8}{2} = 4 $$.',
    },
    {
      No: 2,
      Jenjang: 'SMP',
      Babak: 'Penyisihan',
      Materi: 'Teori Bilangan',
      Tipe: 'Pilihan Ganda',
      Soal: 'Bentuk sederhana dari $$ \\sqrt{48} + \\sqrt{27} $$ adalah ...',
      'Opsi A': '$$ 5\\sqrt{3} $$',
      'Opsi B': '$$ 7\\sqrt{3} $$',
      'Opsi C': '$$ 8\\sqrt{3} $$',
      'Opsi D': '$$ 9\\sqrt{3} $$',
      'Opsi E': '$$ 12\\sqrt{3} $$',
      Kunci: 'B',
      Pembahasan: '$$ 4\\sqrt{3} + 3\\sqrt{3} = 7\\sqrt{3} $$.',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleRows);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 10 },
    { wch: 13 },
    { wch: 16 },
    { wch: 15 },
    { wch: 48 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 8 },
    { wch: 36 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template_Soal_MMO2027');

  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Export active Bank Soal questions to formatted Excel (.xlsx)
 */
export function exportQuestionsToExcelBlob(questions: Question[]): Blob {
  const rows = questions.map((q, idx) => {
    const getOpt = (id: string) => q.options?.find((o) => o.id === id)?.text || '';
    return {
      No: q.questionNumber || idx + 1,
      Jenjang: q.category,
      Babak: q.stage || 'Penyisihan',
      Materi: q.domain,
      Tipe: q.type === 'multiple_choice' ? 'Pilihan Ganda' : 'Isian Singkat',
      Soal: q.text || '',
      'Opsi A': getOpt('A'),
      'Opsi B': getOpt('B'),
      'Opsi C': getOpt('C'),
      'Opsi D': getOpt('D'),
      'Opsi E': getOpt('E'),
      Kunci: q.correctAnswer || '',
      Pembahasan: q.explanation || '',
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 10 },
    { wch: 13 },
    { wch: 16 },
    { wch: 15 },
    { wch: 52 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 8 },
    { wch: 38 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bank_Soal_MMO2027');

  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Export active Bank Soal questions to structured MMO 2027 JSON
 */
export function exportQuestionsToJsonBlob(questions: Question[]): Blob {
  const structured = questions.map((q, idx) => {
    const getOpt = (id: string) => q.options?.find((o) => o.id === id)?.text || '';
    return {
      nomor: q.questionNumber || idx + 1,
      jenjang: q.category,
      babak: q.stage || 'Penyisihan',
      materi: q.domain,
      soal: q.text || '',
      opsi: {
        A: getOpt('A'),
        B: getOpt('B'),
        C: getOpt('C'),
        D: getOpt('D'),
        E: getOpt('E'),
      },
      kunci_jawaban: q.correctAnswer || '',
      pembahasan: q.explanation || '',
    };
  });

  return new Blob([JSON.stringify(structured, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
}
