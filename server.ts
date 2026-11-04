import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import fs from 'fs';
import multer from 'multer';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
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

// Update single question by ID (with automatic equation deduplication)
app.put('/api/questions/:id', (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  const idx = questions.findIndex((q) => q.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Soal tidak ditemukan di bank soal.' });
  }

  // Scrub duplicate equation artifacts
  if (updateData.text) updateData.text = scrubEquationShadowDuplicates(updateData.text);
  if (updateData.explanation) updateData.explanation = scrubEquationShadowDuplicates(updateData.explanation);
  if (updateData.formulaLatex !== undefined) updateData.formulaLatex = scrubEquationShadowDuplicates(updateData.formulaLatex || '');
  if (Array.isArray(updateData.options)) {
    updateData.options = updateData.options.map((opt: any) => ({
      ...opt,
      text: scrubEquationShadowDuplicates(opt.text || ''),
    }));
  }

  questions[idx] = { ...questions[idx], ...updateData };
  res.json({ success: true, data: questions, updatedQuestion: questions[idx] });
});

// One-click batch scrub for all questions in bank
app.post('/api/questions/scrub', (_req, res) => {
  questions = questions.map((q) => ({
    ...q,
    text: scrubEquationShadowDuplicates(q.text || ''),
    explanation: scrubEquationShadowDuplicates(q.explanation || ''),
    formulaLatex: scrubEquationShadowDuplicates(q.formulaLatex || ''),
    options: Array.isArray(q.options)
      ? q.options.map((opt: any) => ({
          ...opt,
          text: scrubEquationShadowDuplicates(opt.text || ''),
        }))
      : q.options,
  }));
  res.json({ success: true, count: questions.length, data: questions });
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

  const cleanedQuestions = newQuestions.map((q) => ({
    ...q,
    text: scrubEquationShadowDuplicates(q.text || ''),
    explanation: scrubEquationShadowDuplicates(q.explanation || ''),
    formulaLatex: scrubEquationShadowDuplicates(q.formulaLatex || ''),
    options: Array.isArray(q.options)
      ? q.options.map((opt: any) => ({
          ...opt,
          text: scrubEquationShadowDuplicates(opt.text || ''),
        }))
      : q.options,
  }));

  if (mode === 'replace') {
    questions = [...cleanedQuestions];
  } else {
    // Append mode: avoid duplicate IDs
    const existingIds = new Set(questions.map((q) => q.id));
    const filteredNew = cleanedQuestions.filter((q) => !existingIds.has(q.id));
    questions = [...filteredNew, ...questions];
  }

  res.json({ success: true, count: questions.length, data: questions });
});

// Helper to repair invalid unescaped LaTeX backslashes inside JSON string literals
function repairJsonLatexEscapes(jsonStr: string): string {
  let result = '';
  let inString = false;
  let i = 0;
  const len = jsonStr.length;

  while (i < len) {
    const char = jsonStr[i];

    if (!inString) {
      if (char === '"') {
        inString = true;
      }
      result += char;
      i++;
      continue;
    }

    // Inside a JSON string literal
    if (char === '"') {
      let backslashCount = 0;
      let j = i - 1;
      while (j >= 0 && jsonStr[j] === '\\') {
        backslashCount++;
        j--;
      }
      if (backslashCount % 2 === 0) {
        inString = false;
      }
      result += char;
      i++;
      continue;
    }

    if (char === '\\') {
      const next = jsonStr[i + 1];
      if (next === undefined) {
        result += '\\\\';
        i++;
        continue;
      }

      // Check if already an escaped backslash: \\
      if (next === '\\') {
        result += '\\\\';
        i += 2;
        continue;
      }

      // Check if escaped quote: \"
      if (next === '"') {
        result += '\\"';
        i += 2;
        continue;
      }

      // Check for valid Unicode escape: \uXXXX
      if (next === 'u' && /^[0-9a-fA-F]{4}/.test(jsonStr.substring(i + 2, i + 6))) {
        result += jsonStr.substring(i, i + 6);
        i += 6;
        continue;
      }

      // Check for LaTeX commands that conflict with JSON escapes (like \frac, \binom, \times, \text, \tau, etc.)
      const peekAhead = jsonStr.substring(i + 1, i + 10);
      const isLatexCommand = /^[a-zA-Z]{2,}/.test(peekAhead);
      if (isLatexCommand) {
        result += '\\\\';
        i++;
        continue;
      }

      // Standard JSON escapes: \/, \b, \f, \n, \r, \t
      if (['/', 'b', 'f', 'n', 'r', 't'].includes(next)) {
        result += '\\' + next;
        i += 2;
        continue;
      }

      // Any other backslash is an INVALID escape in JSON (e.g. \s in \sqrt, \a in \alpha, \{, \}, etc.)
      result += '\\\\';
      i++;
      continue;
    }

    result += char;
    i++;
  }

  return result;
}

// Safely parse JSON array of questions with multi-stage fallback and LaTeX repair
function parseQuestionsJsonSafely(rawText: string): any[] {
  let clean = rawText.trim();
  if (clean.startsWith('```json')) clean = clean.slice(7);
  else if (clean.startsWith('```')) clean = clean.slice(3);
  if (clean.endsWith('```')) clean = clean.slice(0, -3);
  clean = clean.trim();

  // Attempt 1: Direct JSON.parse
  try {
    const res = JSON.parse(clean);
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.questions)) return res.questions;
  } catch {
    // continue
  }

  // Attempt 2: Smart LaTeX escape repair
  try {
    const repaired = repairJsonLatexEscapes(clean);
    const res = JSON.parse(repaired);
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.questions)) return res.questions;
  } catch {
    // continue
  }

  // Attempt 3: Regex match array chunk + LaTeX repair
  const arrMatch = clean.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (arrMatch) {
    try {
      const repaired = repairJsonLatexEscapes(arrMatch[0]);
      const res = JSON.parse(repaired);
      if (Array.isArray(res)) return res;
    } catch {
      // continue
    }
  }

  // Attempt 4: Aggressive backslash replacement (replace any \ not followed by " or \)
  try {
    const aggressive = clean.replace(/\\(?!["\\])/g, '\\\\');
    const res = JSON.parse(aggressive);
    if (Array.isArray(res)) return res;
  } catch {
    // continue
  }

  throw new Error('Naskah soal memuat notasi simbol/rumus matematika yang belum ter-escape dengan benar. Silakan coba klik tombol "Coba Proses Ulang".');
}

// Helper to deduplicate identical adjacent lines (e.g. repeated formula blocks)
function deduplicateAdjacentLines(text: string): string {
  if (!text) return '';
  const lines = text.split('\n');
  const result: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const current = lines[i];
    const prev = result.length > 0 ? result[result.length - 1] : null;
    if (prev !== null && current.trim() && current.trim() === prev.trim()) {
      continue; // Skip exact duplicate adjacent line
    }
    result.push(current);
  }
  return result.join('\n');
}

// Universal scrubber for equation shadow text and duplicate symbol artifacts
function scrubEquationShadowDuplicates(text: string): string {
  if (!text) return '';

  let s = text;

  // 1. Remove duplicate adjacent lines first
  s = deduplicateAdjacentLines(s);

  // 2. Math equation followed immediately by the same variable/letter:
  // e.g. "$x$ x kelipatan 5" -> "$x$ kelipatan 5"
  // e.g. "$x$ x berturut-turut" -> "$x$ berturut-turut"
  // e.g. "$x$ x adalah" -> "$x$ adalah"
  // e.g. "$y$ y" -> "$y$"
  s = s.replace(/\$([a-zA-Z])\$\s*\1(?![a-zA-Z0-9])/gi, '$$$1$$ ');

  // 3. Math equation followed immediately by the same number or digits:
  // e.g. "$1$ 1" -> "$1$" (renders as 1, not 11)
  // e.g. "$2$ 2" -> "$2$" (renders as 2, not 22)
  // e.g. "$4$ 4" -> "$4$" (renders as 4, not 44)
  // e.g. "$5$ 5" -> "$5$" (renders as 5, not 55)
  // e.g. "$8$ 8" -> "$8$" (renders as 8, not 88)
  s = s.replace(/\$([0-9]+)\$\s*\1(?![0-9])/g, '$$$1$$');

  // 4. Duplicate single letter at start of line or option without math tag:
  // e.g. "xx kelipatan 5" -> "x kelipatan 5"
  // e.g. "xx kelipatan 72" -> "x kelipatan 72"
  // e.g. "xx adalah genap" -> "x adalah genap"
  // e.g. "xx adalah faktor" -> "x adalah faktor"
  s = s.replace(/^([a-zA-Z])\1\s+/gm, '$1 ');

  // 5. Duplicate variable inside sentences before common math predicates:
  // e.g. "dan xx berturut-turut" -> "dan x berturut-turut"
  s = s.replace(/\b([a-zA-Z])\1(?=\s+(?:kelipatan|berturut|adalah|faktor|merupakan|bilangan|positif|bulat|pecahan|ganjil|genap|prima|\+|\-|\*|\/|=|<|>|≤|≥))/gi, '$1');

  // 6. Generic equation shadow: $formula$ followed by its exact or normalized plain text equivalent
  // e.g. "$FPB(72, x) = 3, KPK(72, x) = 1800$ FPB(72, x) = 3, KPK(72, x) = 1800"
  s = s.replace(/\$([^$]+)\$\s*([^$\n]+)/g, (fullMatch, formula, followingText) => {
    const normFormula = formula.replace(/\s+/g, '').replace(/\\times/g, '×').replace(/\\div/g, '÷');
    const normFollowing = followingText.replace(/\s+/g, '');
    if (normFormula.length >= 3 && normFollowing.startsWith(normFormula)) {
      const rest = followingText.trim().substring(formula.trim().length).trim();
      return `$$${formula}$$ ${rest}`.trim();
    }
    return fullMatch;
  });

  // 7. Clean up extra spaces around math delimiters and punctuation
  s = s
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+([.,;:?!])/g, '$1')
    .replace(/\$\s+/g, '$')
    .replace(/\s+\$/g, '$')
    .trim();

  // Ensure single space between $...$ and following word if not punctuation
  s = s.replace(/\$([^\$]+)\$([a-zA-Z0-9])/g, '$$$1$$ $2');

  return s;
}

// Extract full text from MS Word XML with OMML math equations converted to LaTeX
function extractTextAndMathFromWordXml(xml: string): string {
  // CRITICAL: Strip all <mc:Fallback>...</mc:Fallback> blocks!
  // In Word OpenXML, math equations & symbols are stored in <mc:Choice> while duplicate legacy text is stored in <mc:Fallback>.
  // Scanning both causes every symbol and number to be doubled (e.g. $x$ becomes $x$ x -> "xx", 1 becomes "11", etc.).
  xml = xml.replace(/<mc:Fallback(?:\s[^>]*)?>[\s\S]*?<\/mc:Fallback>/gi, '');
  xml = xml.replace(/<\/?mc:[^>]+>/gi, '');

  function cleanOmmlFragment(fragment: string): string {
    return fragment
      .replace(/<m:t(?:\s[^>]*)?>([\s\S]*?)<\/m:t>/g, '$1')
      .replace(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/×/g, ' \\times ')
      .replace(/÷/g, ' \\div ')
      .replace(/≤/g, ' \\le ')
      .replace(/≥/g, ' \\ge ')
      .replace(/≠/g, ' \\neq ')
      .replace(/±/g, ' \\pm ')
      .replace(/°/g, '^\\circ ')
      .replace(/≈/g, ' \\approx ')
      .replace(/π/g, ' \\pi ')
      .replace(/…/g, ' \\dots ');
  }

  function convertOmmlToLatex(ommlXml: string): string {
    let s = ommlXml.replace(/<m:rPr[\s\S]*?<\/m:rPr>/g, '');

    let prev = '';
    let iterations = 0;
    while (prev !== s && iterations < 10) {
      prev = s;
      iterations++;

      // Fractions: <m:f>...<m:num>...</m:num>...<m:den>...</m:den>...</m:f>
      s = s.replace(/<m:f(?:\s[^>]*)?>[\s\S]*?<m:num(?:\s[^>]*)?>([\s\S]*?)<\/m:num>[\s\S]*?<m:den(?:\s[^>]*)?>([\s\S]*?)<\/m:den>[\s\S]*?<\/m:f>/g, (_m, num, den) => {
        return `\\frac{${cleanOmmlFragment(num).trim()}}{${cleanOmmlFragment(den).trim()}}`;
      });

      // Radicals (square / nth root): <m:rad>...<m:deg>...</m:deg>...<m:e>...</m:e>...</m:rad>
      s = s.replace(/<m:rad(?:\s[^>]*)?>[\s\S]*?(?:<m:deg(?:\s[^>]*)?>([\s\S]*?)<\/m:deg>)?[\s\S]*?<m:e(?:\s[^>]*)?>([\s\S]*?)<\/m:e>[\s\S]*?<\/m:rad>/g, (_m, deg, base) => {
        const cleanDeg = deg ? cleanOmmlFragment(deg).trim() : '';
        const cleanBase = cleanOmmlFragment(base).trim();
        return cleanDeg ? `\\sqrt[${cleanDeg}]{${cleanBase}}` : `\\sqrt{${cleanBase}}`;
      });

      // Superscript: <m:sSup>...<m:e>...</m:e>...<m:sup>...</m:sup>...</m:sSup>
      s = s.replace(/<m:sSup(?:\s[^>]*)?>[\s\S]*?<m:e(?:\s[^>]*)?>([\s\S]*?)<\/m:e>[\s\S]*?<m:sup(?:\s[^>]*)?>([\s\S]*?)<\/m:sup>[\s\S]*?<\/m:sSup>/g, (_m, base, sup) => {
        return `{${cleanOmmlFragment(base).trim()}}^{${cleanOmmlFragment(sup).trim()}}`;
      });

      // Subscript: <m:sSub>...<m:e>...</m:e>...<m:sub>...</m:sub>...</m:sSub>
      s = s.replace(/<m:sSub(?:\s[^>]*)?>[\s\S]*?<m:e(?:\s[^>]*)?>([\s\S]*?)<\/m:e>[\s\S]*?<m:sub(?:\s[^>]*)?>([\s\S]*?)<\/m:sub>[\s\S]*?<\/m:sSub>/g, (_m, base, sub) => {
        return `{${cleanOmmlFragment(base).trim()}}_{${cleanOmmlFragment(sub).trim()}}`;
      });

      // Sub-Superscript: <m:sSubSup>...<m:e>...<m:sub>...<m:sup>...
      s = s.replace(/<m:sSubSup(?:\s[^>]*)?>[\s\S]*?<m:e(?:\s[^>]*)?>([\s\S]*?)<\/m:e>[\s\S]*?<m:sub(?:\s[^>]*)?>([\s\S]*?)<\/m:sub>[\s\S]*?<m:sup(?:\s[^>]*)?>([\s\S]*?)<\/m:sup>[\s\S]*?<\/m:sSubSup>/g, (_m, base, sub, sup) => {
        return `{${cleanOmmlFragment(base).trim()}}_{${cleanOmmlFragment(sub).trim()}}^{${cleanOmmlFragment(sup).trim()}}`;
      });

      // Delimiters (brackets)
      s = s.replace(/<m:d(?:\s[^>]*)?>[\s\S]*?<m:e(?:\s[^>]*)?>([\s\S]*?)<\/m:e>[\s\S]*?<\/m:d>/g, (_m, content) => {
        return `(${cleanOmmlFragment(content).trim()})`;
      });
    }

    return cleanOmmlFragment(s).trim();
  }

  const paragraphs: string[] = [];
  const pRegex = /<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g;
  let pMatch;

  while ((pMatch = pRegex.exec(xml)) !== null) {
    const pContent = pMatch[1];
    let pText = '';

    const tokenRegex = /(<m:oMath(?:\s[^>]*)?>[\s\S]*?<\/m:oMath>)|(<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>)|(<w:tab\/>)|(<w:br\/>)/g;
    let tMatch;
    let lastMathClean = '';
    let lastMathLatex = '';

    while ((tMatch = tokenRegex.exec(pContent)) !== null) {
      if (tMatch[1]) {
        const math = convertOmmlToLatex(tMatch[1]);
        if (math) {
          lastMathLatex = math.trim();
          lastMathClean = cleanOmmlFragment(tMatch[1]).trim();
          pText += ` $${math}$ `;
        }
      } else if (tMatch[2]) {
        const rawT = tMatch[3] || '';
        let decoded = rawT
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'");

        // Suppress shadow text runs right after math
        if (lastMathClean || lastMathLatex) {
          const trimmedDecoded = decoded.trim();
          // Case A: Full match shadow (e.g. math was "1", text is "1", or math "x", text "x")
          if (trimmedDecoded && (trimmedDecoded === lastMathClean || trimmedDecoded === lastMathLatex)) {
            lastMathClean = '';
            lastMathLatex = '';
            continue; // Suppress duplicate shadow text!
          }

          // Case B: Prefix shadow (e.g. math was "x", text is "x kelipatan 5" or "x berturut-turut")
          if (lastMathClean && lastMathClean.length > 0 && lastMathClean.length <= 15) {
            const escapedClean = lastMathClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const shadowPrefixRegex = new RegExp(`^\\s*${escapedClean}(?=[\\s.,;:?!]|$)`, 'i');
            if (shadowPrefixRegex.test(decoded)) {
              decoded = decoded.replace(shadowPrefixRegex, '').trimStart();
            }
          }

          lastMathClean = '';
          lastMathLatex = '';
        }

        pText += decoded;
      } else if (tMatch[4]) {
        pText += ' ';
      } else if (tMatch[5]) {
        pText += '\n';
      }
    }

    const trimmed = scrubEquationShadowDuplicates(pText);

    if (trimmed) {
      paragraphs.push(trimmed);
    }
  }

  return scrubEquationShadowDuplicates(paragraphs.join('\n'));
}

async function extractDocxTextWithMath(buffer: Buffer): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const docXmlFile = zip.file('word/document.xml');
    if (docXmlFile) {
      const xml = await docXmlFile.async('string');
      const text = extractTextAndMathFromWordXml(xml);
      if (text && text.trim().length > 30) {
        console.log('[Word Importer] Extracted text with OMML math successfully. Total length:', text.length);
        return text;
      }
    }
  } catch (err) {
    console.warn('[Word Importer] JSZip OMML extraction error, falling back to mammoth:', err);
  }

  const mammothResult = await mammoth.extractRawText({ buffer });
  return mammothResult.value;
}

// High-speed, 100% deterministic Indonesian Olympiad question parser
// Parses all questions, options A-E, answers, and explanations verbatim without external API quota
function parseIndonesianOlympiadText(
  extractedText: string,
  categoryOverride: string = 'SMP'
): any[] {
  const questions: any[] = [];
  const rawLines = extractedText.split('\n').map((l) => l.trim()).filter(Boolean);

  const qNumRegex = /^(?:No\.?\s*|Soal\s*)?(\d{1,2})[\.\)\]]\s*(.*)$/i;
  const isExplanationStepWord = (str: string) =>
    /^(?:Langkah|Tahap|Cara|Kasus|Metode|Sifat|Pola|Sub|Bagian)\s*\d+/i.test(str);

  const questionBlocks: { number: number; lines: string[] }[] = [];
  let currentBlock: { number: number; lines: string[] } | null = null;

  for (const line of rawLines) {
    const match = line.match(qNumRegex);

    if (match) {
      const num = parseInt(match[1], 10);
      const afterNum = match[2].trim();

      const isInsideExplanation =
        currentBlock && currentBlock.lines.some((l) => /Pembahasan\s*:/i.test(l));
      const looksLikeExplanationStep =
        isExplanationStepWord(afterNum) || afterNum.startsWith('>') || afterNum.startsWith('•');

      const isNextQuestion = !currentBlock
        ? num === 1 || num <= 5
        : num === currentBlock.number + 1 || (num > currentBlock.number && !isInsideExplanation);

      if (isNextQuestion && !looksLikeExplanationStep) {
        currentBlock = { number: num, lines: [line] };
        questionBlocks.push(currentBlock);
        continue;
      }
    }

    if (currentBlock) {
      currentBlock.lines.push(line);
    }
  }

  const nowTs = Date.now();

  for (const block of questionBlocks) {
    const qNum = block.number;
    const blockText = block.lines.join('\n');

    let state: 'QUESTION' | 'OPTIONS' | 'KEY' | 'EXPLANATION' = 'QUESTION';
    const optionMap = new Map<string, string>();
    let detectedKey = 'A';
    const explanationLines: string[] = [];
    const collectedQTextLines: string[] = [];

    const firstLineMatch = block.lines[0].match(qNumRegex);
    if (firstLineMatch && firstLineMatch[2]) {
      collectedQTextLines.push(firstLineMatch[2]);
    }

    const keyRegex = /(?:Kunci(?:\s*Jawaban)?|Jawaban(?:\s*Benar)?)\s*[:\-=]\s*\(?([A-E])\)?/i;
    const expRegex = /Pembahasan\s*[:\-=]?\s*(.*)$/i;

    for (let i = 1; i < block.lines.length; i++) {
      const line = block.lines[i];

      const keyMatch = line.match(keyRegex);
      if (keyMatch) {
        state = 'KEY';
        detectedKey = keyMatch[1].toUpperCase();
        continue;
      }

      const expMatch = line.match(expRegex);
      if (expMatch) {
        state = 'EXPLANATION';
        if (expMatch[1] && expMatch[1].trim()) {
          explanationLines.push(expMatch[1].trim());
        }
        continue;
      }

      // Check inline multiple options: "A. 1   B. 2   C. 4   D. 5   E. 8"
      const inlineOpts = [
        ...line.matchAll(
          /(?:^|\s+)(?:\(?([A-E])\)?[.\-:\)]\s*)([^\n]+?)(?=(?:\s+\(?([A-E])\)?[.\-:\)]\s*)|$)/gi
        ),
      ];
      if (inlineOpts.length >= 2 && state !== 'EXPLANATION') {
        state = 'OPTIONS';
        for (const m of inlineOpts) {
          const letter = m[1].toUpperCase();
          const optVal = scrubEquationShadowDuplicates(m[2].trim());
          optionMap.set(letter, optVal);
        }
        continue;
      }

      // Check single option per line: "A. 1" or "A) x kelipatan 5"
      const singleOptMatch = line.match(/^\(?([A-E])\)?[.\-:\)]\s*(.*)$/i);
      if (singleOptMatch && state !== 'EXPLANATION') {
        state = 'OPTIONS';
        const letter = singleOptMatch[1].toUpperCase();
        optionMap.set(letter, scrubEquationShadowDuplicates(singleOptMatch[2].trim()));
        continue;
      }

      if (state === 'QUESTION') {
        collectedQTextLines.push(line);
      } else if (state === 'OPTIONS') {
        const lastLetter = ['E', 'D', 'C', 'B', 'A'].find((l) => optionMap.has(l));
        if (lastLetter) {
          const updatedOpt = scrubEquationShadowDuplicates(optionMap.get(lastLetter) + ' ' + line);
          optionMap.set(lastLetter, updatedOpt);
        }
      } else if (state === 'EXPLANATION' || state === 'KEY') {
        explanationLines.push(line);
      }
    }

    const questionText = scrubEquationShadowDuplicates(
      collectedQTextLines.join(' ').replace(/\s+/g, ' ').trim()
    );

    const letters = ['A', 'B', 'C', 'D', 'E'];
    const finalOptions = letters.map((l) => ({
      id: l,
      text: scrubEquationShadowDuplicates(optionMap.get(l) || `Pilihan ${l}`),
    }));

    let domain = 'Aljabar';
    const textLower = (questionText + ' ' + blockText).toLowerCase();
    if (
      textLower.includes('fpb') ||
      textLower.includes('kpk') ||
      textLower.includes('bilangan') ||
      textLower.includes('habis dibagi') ||
      textLower.includes('prima') ||
      textLower.includes('desimal') ||
      textLower.includes('koma') ||
      textLower.includes('pecahan') ||
      textLower.includes('digit') ||
      textLower.includes('faktor')
    ) {
      domain = 'Teori Bilangan';
    } else if (
      textLower.includes('segitiga') ||
      textLower.includes('lingkaran') ||
      textLower.includes('sudut') ||
      textLower.includes('luas') ||
      textLower.includes('keliling') ||
      textLower.includes('persegi') ||
      textLower.includes('garis') ||
      textLower.includes('koordinat') ||
      textLower.includes('kubus') ||
      textLower.includes('trapesium') ||
      textLower.includes('jajar')
    ) {
      domain = 'Geometri';
    } else if (
      textLower.includes('peluang') ||
      textLower.includes('susunan') ||
      textLower.includes('kombinasi') ||
      textLower.includes('permutasi') ||
      textLower.includes('cara') ||
      textLower.includes('dadu') ||
      textLower.includes('kartu') ||
      textLower.includes('koin') ||
      textLower.includes('kemungkinan')
    ) {
      domain = 'Kombinatorika';
    }

    const cleanedExplanation = scrubEquationShadowDuplicates(
      explanationLines.length > 0
        ? explanationLines.join('\n')
        : 'Pembahasan sesuai naskah dokumen.'
    );

    questions.push({
      id: `MMO-WORD-${nowTs}-${qNum}`,
      category: categoryOverride === 'SMA' ? 'SMA' : 'SMP',
      domain,
      type: 'multiple_choice',
      questionNumber: qNum,
      stage: 'Penyisihan',
      text: questionText,
      formulaLatex: '', // Keep clean so no duplicate box
      options: finalOptions,
      correctAnswer: detectedKey,
      explanation: cleanedExplanation,
      points: { correct: 4, wrong: -1, blank: 0 },
    });
  }

  return questions;
}

// Multer memory storage for MS Word (.docx) uploads
const uploadWord = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
});

// Import questions from MS Word (.docx) with deterministic instant parser + Gemini AI fallback
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

    // 1. Extract text and OMML math formulas directly from .docx OpenXML
    const extractedText = await extractDocxTextWithMath(req.file.buffer);

    if (!extractedText || extractedText.trim().length < 15) {
      return res.status(400).json({
        success: false,
        error: 'Teks dari dokumen Word kosong atau tidak dapat diekstraksi. Pastikan dokumen memuat teks soal.',
      });
    }

    // 2. PRIMARY: High-speed, deterministic Indonesian Olympiad parser
    // Processes all 10+ questions verbatim without 429 quota exhaustion or variable doubling
    const deterministicQuestions = parseIndonesianOlympiadText(extractedText, categoryOverride);

    if (deterministicQuestions && deterministicQuestions.length >= 1) {
      console.log(
        `[Word Importer] Parser deterministik berhasil mengekstrak ${deterministicQuestions.length} butir soal lengkap!`
      );
      return res.json({
        success: true,
        count: deterministicQuestions.length,
        questions: deterministicQuestions,
        extractedSample: extractedText.substring(0, 200),
      });
    }

    // 3. FALLBACK: If document is unstructured or has no standard numbering, call Gemini AI if available
    const foundNumbers: number[] = [];
    const qNumPattern = /(?:^|\n)\s*(\d{1,2})\s*[\.\)]\s*(?=[A-Za-zА-Яа-я\$\\\{\[\(]|Diketahui|Jika|Berapa|Tentukan|Suatu|Pada|Sebuah|Dalam)/g;
    let m;
    while ((m = qNumPattern.exec(extractedText)) !== null) {
      const n = parseInt(m[1], 10);
      if (n >= 1 && n <= 60 && !foundNumbers.includes(n)) {
        foundNumbers.push(n);
      }
    }
    const totalDetected = foundNumbers.length > 0 ? Math.max(...foundNumbers) : 0;

    const prompt = `Anda adalah parser soal olimpiade matematika profesional untuk platform MMO 2027 (Matriks Mathematics Olympiad UMM).
Tugas Anda adalah membaca teks naskah soal dari dokumen Microsoft Word berikut, membedah setiap nomor soal, opsi jawaban (A, B, C, D, E), kunci jawaban yang benar, pembahasan, domain matematika, dan memastikan format KaTeX LaTeX ($...$) rapi.

Target Jenjang: "${categoryOverride}" (SMP atau SMA).
${totalDetected > 0 ? `JUMLAH BUTIR SOAL DALAM NASKAH: Terdeteksi ada ${totalDetected} butir soal (Nomor 1 s.d. Nomor ${totalDetected}).` : ''}

PANDUAN KETAT EKSTRAKSI:
1. EKSTRAKSI LENGKAP SELURUH BUTIR SOAL (DILARANG BERHENTI DI TENGAH JALAN):
   - Seluruh soal dari nomor 1 sampai nomor terakhir harus ada di dalam output JSON.
2. KEASLIAN ANGKA & PILIHAN (VERBATIM):
   - AMBIL TEKS, ANGKA SOAL, DAN PILIHAN JAWABAN PERSIS SEPERTI YANG TERTULIS DI NASKAH DOKUMEN.
   - JANGAN PERNAH MENGGANDAKAN ANGKA ATAU HURUF ($x$ tetap $x$, bukan $xx$).
3. FORMULA LATEX:
   - Rumus matematika sudah tertulis di dalam field "text". KOSONGKAN field "formulaLatex" (beri nilai "").
4. ATURAN ESCAPE BACKSLASH DALAM JSON:
   - Gunakan double backslash "\\\\" untuk setiap perintah LaTeX dalam JSON.

Format output HARUS berupa JSON Array murni:
[
  {
    "id": "MMO-WORD-[timestamp]-[nomor]",
    "category": "${categoryOverride}",
    "domain": "Aljabar",
    "type": "multiple_choice",
    "questionNumber": 1,
    "stage": "Penyisihan",
    "text": "Teks lengkap soal...",
    "formulaLatex": "",
    "options": [
      { "id": "A", "text": "1" },
      { "id": "B", "text": "2" },
      { "id": "C", "text": "4" },
      { "id": "D", "text": "5" },
      { "id": "E", "text": "8" }
    ],
    "correctAnswer": "A",
    "explanation": "Langkah penyelesaian lengkap...",
    "points": { "correct": 4, "wrong": -1, "blank": 0 }
  }
]

Berikut adalah teks dokumen Word yang diekstrak:
---
${extractedText.substring(0, 50000)}
---`;

    let generatedText = '';
    if (process.env.GEMINI_API_KEY) {
      const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
      let lastError: any = null;

      for (const modelName of candidateModels) {
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            console.log(`[Gemini Word Parser] Memproses dengan ${modelName} (percobaan ${attempt})...`);
            const response = await ai.models.generateContent({
              model: modelName,
              contents: prompt,
              config: {
                responseMimeType: 'application/json',
                ...(modelName === 'gemini-3.8-flash'
                  ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
                  : {}),
              },
            });
            if (response && response.text) {
              generatedText = response.text;
              break;
            }
          } catch (err: any) {
            lastError = err;
            const msg = String(err?.message || err);
            console.warn(`[Gemini Word Parser] Model ${modelName} percobaan ${attempt} error:`, msg);

            const isTransient =
              msg.includes('503') ||
              msg.includes('UNAVAILABLE') ||
              msg.includes('high demand') ||
              msg.includes('429') ||
              msg.includes('RESOURCE_EXHAUSTED');

            if (isTransient && attempt < 2) {
              await new Promise((resolve) => setTimeout(resolve, 1500));
              continue;
            }
            break;
          }
        }
        if (generatedText) break;
      }

      if (!generatedText && lastError) {
        throw lastError;
      }
    } else {
      return res.status(422).json({
        success: false,
        error:
          'Format nomor soal dalam berkas Word tidak terbaca secara otomatis. Pastikan format penomoran menggunakan "1. ", "2. " dst.',
      });
    }

    const parsedQuestions = parseQuestionsJsonSafely(generatedText);

    if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
      return res.status(422).json({
        success: false,
        error: 'Tidak ditemukan butir soal matematika yang dapat dikenali dalam dokumen Word.',
      });
    }

    const nowTsFallback = Date.now();
    const validDomains = ['Aljabar', 'Geometri', 'Kombinatorika', 'Teori Bilangan'];

    const formattedQuestions = parsedQuestions.map((q: any, i: number) => {
      const qNum = Number(q.questionNumber) || i + 1;
      const rawText = scrubEquationShadowDuplicates(String(q.text || `Soal Nomor ${qNum}`));
      const rawFormula = q.formulaLatex
        ? scrubEquationShadowDuplicates(String(q.formulaLatex).replace(/^\$+|\$+$/g, '').trim())
        : '';
      const isAlreadyInText =
        rawFormula.length > 0 &&
        rawText.replace(/\s+/g, '').includes(rawFormula.replace(/\s+/g, ''));
      const finalFormula = isAlreadyInText ? '' : rawFormula;

      return {
        id: q.id || `MMO-WORD-${nowTsFallback}-${i + 1}`,
        category: q.category === 'SMP' || q.category === 'SMA' ? q.category : categoryOverride,
        domain: validDomains.includes(q.domain) ? q.domain : 'Aljabar',
        type: q.type === 'short_answer' ? 'short_answer' : 'multiple_choice',
        questionNumber: qNum,
        stage: q.stage || 'Penyisihan',
        text: rawText,
        formulaLatex: finalFormula,
        options:
          Array.isArray(q.options) && q.options.length >= 2
            ? q.options.map((opt: any, optIdx: number) => ({
                id: opt.id || ['A', 'B', 'C', 'D', 'E'][optIdx] || 'A',
                text: scrubEquationShadowDuplicates(String(opt.text || '').trim()),
              }))
            : [
                { id: 'A', text: 'Pilihan A' },
                { id: 'B', text: 'Pilihan B' },
                { id: 'C', text: 'Pilihan C' },
                { id: 'D', text: 'Pilihan D' },
                { id: 'E', text: 'Pilihan E' },
              ],
        correctAnswer: String(q.correctAnswer || 'A').toUpperCase().trim(),
        explanation: scrubEquationShadowDuplicates(String(q.explanation || 'Pembahasan belum tersedia.')),
        points:
          q.points && typeof q.points === 'object'
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
    let userMsg = error?.message || 'Terjadi kesalahan sistem saat mengekstrak dan membedah dokumen Word.';

    try {
      if (userMsg.trim().startsWith('{') && userMsg.includes('"message"')) {
        const parsed = JSON.parse(userMsg);
        if (parsed?.error?.message) {
          userMsg = parsed.error.message;
        }
      }
    } catch {
      // ignore
    }

    if (
      userMsg.includes('503') ||
      userMsg.includes('high demand') ||
      userMsg.includes('UNAVAILABLE')
    ) {
      userMsg =
        'Server AI Google Gemini sedang mengalami lonjakan antrean tinggi sesaat (503 High Demand). Sistem telah mencoba beralih ke model cadangan. Silakan coba klik "Coba Proses Ulang" dalam beberapa detik.';
    } else if (userMsg.includes('429') || userMsg.includes('RESOURCE_EXHAUSTED')) {
      userMsg =
        'Batas frekuensi permintaan AI tercapai sementara (429 Quota Exceeded). Mohon tunggu sebentar sebelum mencoba kembali.';
    } else if (userMsg.includes('Bad escaped character') || userMsg.includes('JSON')) {
      userMsg =
        'Terdapat notasi rumus matematika pada naskah yang sempat mengalami kendala karakter escape KaTeX. Silakan tekan tombol "Coba Proses Ulang" di bawah.';
    }

    res.status(500).json({
      success: false,
      error: userMsg,
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
