import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  ClipboardPaste,
  Download,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Plus,
  Image as ImageIcon,
  Eye,
  FileText,
  Sparkles,
  RotateCcw,
  X,
  Code2,
  Copy,
  Check,
  Wand2,
} from 'lucide-react';
import {
  CompetitionStage,
  MathDomain,
  OlympiadCategory,
  Question,
} from '../types/index';
import {
  ParsedWordQuestionDraft,
  buildSampleWordTemplateDocx,
  draftsToStructuredJson,
  parseDocxBufferToDrafts,
  parseWordClipboardToDrafts,
} from '../utils/wordEquationParser';
import { ApiService } from '../services/api';
import { MathRenderer } from './MathRenderer';
import { MathFormulaToolbar } from './MathFormulaToolbar';

export type ImportInputMethod = 'paste' | 'docx' | 'image';

interface WordQuestionImporterProps {
  onSaveBatch: (
    questions: Question[],
    mode: 'append' | 'replace_all' | 'replace_packet',
    category: OlympiadCategory,
    stage: CompetitionStage
  ) => Promise<boolean>;
  existingCountByPacket: Record<string, number>;
  defaultCategory?: OlympiadCategory;
  defaultStage?: CompetitionStage;
  onClose?: () => void;
}

const MATH_DOMAINS: MathDomain[] = [
  'Aljabar',
  'Geometri',
  'Kombinatorika',
  'Teori Bilangan',
];

export const WordQuestionImporter: React.FC<WordQuestionImporterProps> = ({
  onSaveBatch,
  existingCountByPacket,
  defaultCategory = 'SMA',
  defaultStage = 'Penyisihan',
  onClose,
}) => {
  const [inputMode, setInputMode] = useState<ImportInputMethod>('paste');
  const [targetCategory, setTargetCategory] = useState<OlympiadCategory>(defaultCategory);
  const [targetStage, setTargetStage] = useState<CompetitionStage>(defaultStage);
  const [saveMode, setSaveMode] = useState<'append' | 'replace_packet' | 'replace_all'>('append');
  const [pointsCorrect, setPointsCorrect] = useState<number>(4);
  const [pointsWrong, setPointsWrong] = useState<number>(-1);
  const [pointsBlank, setPointsBlank] = useState<number>(0);

  const [isParsing, setIsParsing] = useState(false);
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoBanner, setInfoBanner] = useState<string | null>(null);

  const [pasteTextValue, setPasteTextValue] = useState('');
  const [lastFileName, setLastFileName] = useState<string | null>(null);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [equationsCount, setEquationsCount] = useState<number>(0);
  const [drafts, setDrafts] = useState<ParsedWordQuestionDraft[]>([]);
  const [showJsonPanel, setShowJsonPanel] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const packetKey = `${targetCategory}_${targetStage}`;
  const currentPacketCount = existingCountByPacket[packetKey] || 0;

  const readBlobAsDataUrl = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Gagal membaca berkas gambar.'));
      reader.readAsDataURL(blob);
    });

  const handleDownloadSampleDocx = async () => {
    try {
      const blob = await buildSampleWordTemplateDocx();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Contoh_Format_Soal_Word_MMO2027.docx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setErrorMsg('Gagal membuat berkas contoh Word (.docx).');
    }
  };

  const processDocxFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.docx')) {
      setErrorMsg('Format berkas tidak didukung. Unggah dokumen Microsoft Word berformat .docx.');
      return;
    }

    setErrorMsg(null);
    setInfoBanner(null);
    setIsParsing(true);
    setLastFileName(file.name);

    try {
      const serverRes = await ApiService.parseWordDocx(file, targetCategory, targetStage);
      let parseData = serverRes.success ? serverRes.data : undefined;

      if (!parseData) {
        const buf = await file.arrayBuffer();
        parseData = await parseDocxBufferToDrafts(buf, {
          category: targetCategory,
          stage: targetStage,
        });
      }

      if (!parseData || parseData.drafts.length === 0) {
        setErrorMsg(
          'Tidak ditemukan butir soal yang valid. Pastikan dokumen mengikuti urutan: Nomor & Soal → Pilihan A–E → Kunci Jawaban.'
        );
        setDrafts([]);
        setEquationsCount(0);
      } else {
        setDrafts(parseData.drafts);
        setEquationsCount(parseData.stats.equationsConverted);
        setShowJsonPanel(false);
        setInfoBanner(
          `Berhasil mengurai ${parseData.drafts.length} butir soal dari "${file.name}" (${parseData.stats.equationsConverted} rumus equation & ${parseData.stats.imagesExtracted} gambar).`
        );
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Terjadi kesalahan saat membaca berkas Word.');
    } finally {
      setIsParsing(false);
    }
  };

  const processImageFile = async (file: File) => {
    const lower = file.name.toLowerCase();
    const isValidImage =
      file.type.startsWith('image/') ||
      lower.endsWith('.png') ||
      lower.endsWith('.jpg') ||
      lower.endsWith('.jpeg') ||
      lower.endsWith('.webp');

    if (!isValidImage) {
      setErrorMsg('Format berkas harus berupa gambar (PNG, JPG, JPEG, atau WEBP).');
      return;
    }

    setErrorMsg(null);
    setInfoBanner(null);
    setIsAiParsing(true);
    setLastFileName(file.name);

    try {
      const previewUrl = await readBlobAsDataUrl(file);
      setUploadedImagePreview(previewUrl);
    } catch {
      setUploadedImagePreview(null);
    }

    try {
      const res = await ApiService.parsePdfOrImageWithAI(file, targetCategory, targetStage);
      if (!res.success || !res.data) {
        setErrorMsg(res.error || 'Gagal mengekstrak soal dari gambar.');
        return;
      }
      const { parseResult } = res.data;
      setDrafts(parseResult.drafts);
      setEquationsCount(parseResult.stats.equationsConverted);
      setShowJsonPanel(false);
      setInfoBanner(
        `Berhasil membaca ${parseResult.drafts.length} butir soal dari gambar "${file.name}" (${parseResult.stats.equationsConverted} rumus KaTeX).`
      );
    } catch (err: any) {
      setErrorMsg(err?.message || 'Terjadi kesalahan saat membaca gambar soal.');
    } finally {
      setIsAiParsing(false);
    }
  };

  const handleWordPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    const html = clipboardData.getData('text/html') || '';
    const plain = clipboardData.getData('text/plain') || '';

    const clipboardImages: string[] = [];
    if (clipboardData.items) {
      for (let i = 0; i < clipboardData.items.length; i++) {
        const item = clipboardData.items[i];
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) {
            try {
              const dataUrl = await readBlobAsDataUrl(blob);
              clipboardImages.push(dataUrl);
            } catch {
              // ignore unreadable clipboard image
            }
          }
        }
      }
    }

    const hasWordMathOrList =
      html.includes('<m:oMath') ||
      html.includes('<math') ||
      html.includes('msEquation') ||
      html.includes('MsoListParagraph') ||
      clipboardImages.length > 0;

    if (hasWordMathOrList || plain.trim().length > 0) {
      e.preventDefault();
      setErrorMsg(null);
      setInfoBanner(null);

      const combinedPlain = pasteTextValue.trim()
        ? `${pasteTextValue.trim()}\n${plain}`
        : plain;

      const parsed = parseWordClipboardToDrafts(html, combinedPlain, clipboardImages, {
        category: targetCategory,
        stage: targetStage,
      });

      setPasteTextValue(parsed.rawLinesPreview || combinedPlain);
      setLastFileName(null);

      if (parsed.drafts.length > 0) {
        setDrafts(parsed.drafts);
        setEquationsCount(parsed.stats.equationsConverted);
        setInfoBanner(
          `Terdeteksi ${parsed.drafts.length} butir soal dari teks tempelan (${parsed.stats.equationsConverted} rumus equation dikonversi ke KaTeX).`
        );
      } else {
        setErrorMsg(
          'Teks ditempel, namun belum terdeteksi pola Soal → Pilihan A–E → Kunci Jawaban. Klik "Parse AI (MMO 2027)" untuk penguraian cerdas.'
        );
      }
    }
  };

  const handleParseManualPaste = () => {
    if (!pasteTextValue.trim()) {
      setErrorMsg('Tempelkan terlebih dahulu isi soal pada kotak teks.');
      return;
    }
    setErrorMsg(null);
    setInfoBanner(null);
    const parsed = parseWordClipboardToDrafts('', pasteTextValue, [], {
      category: targetCategory,
      stage: targetStage,
    });
    if (parsed.drafts.length === 0) {
      setErrorMsg(
        'Tidak ditemukan soal valid. Pastikan tiap butir diawali nomor (mis. 1. ...), diikuti opsi A–E, dan diakhiri "Kunci Jawaban: ...". Atau klik "Parse AI (MMO 2027)".'
      );
      return;
    }
    setDrafts(parsed.drafts);
    setEquationsCount(parsed.stats.equationsConverted);
    setInfoBanner(`Berhasil mengurai ${parsed.drafts.length} butir soal untuk pratinjau KaTeX.`);
  };

  const handleParseWithAI = async () => {
    if (!pasteTextValue.trim()) {
      setErrorMsg('Tempelkan terlebih dahulu naskah soal mentah.');
      return;
    }
    setErrorMsg(null);
    setInfoBanner(null);
    setIsAiParsing(true);

    try {
      const res = await ApiService.parseWordTextWithAI(
        pasteTextValue,
        targetCategory,
        targetStage
      );
      if (!res.success || !res.data) {
        setErrorMsg(res.error || 'Gagal mengurai teks soal menggunakan AI.');
        return;
      }
      const { parseResult } = res.data;
      setDrafts(parseResult.drafts);
      setEquationsCount(parseResult.stats.equationsConverted);
      setShowJsonPanel(false);
      setInfoBanner(
        `AI berhasil mengurai ${parseResult.drafts.length} butir soal sesuai format MMO 2027 (${parseResult.stats.equationsConverted} rumus KaTeX $$...$$).`
      );
    } catch (err: any) {
      setErrorMsg(err?.message || 'Terjadi kesalahan saat memanggil AI Pengurai.');
    } finally {
      setIsAiParsing(false);
    }
  };

  const handleCopyStructuredJson = async () => {
    if (drafts.length === 0) return;
    try {
      const jsonString = JSON.stringify(draftsToStructuredJson(drafts), null, 2);
      await navigator.clipboard.writeText(jsonString);
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } catch {
      setErrorMsg('Gagal menyalin JSON ke clipboard browser.');
    }
  };

  const recomputeWarnings = (d: ParsedWordQuestionDraft): string[] => {
    const w: string[] = [];
    if (!d.text.trim() && !d.imageUrl) w.push('Teks soal kosong.');
    if (d.type === 'multiple_choice' && d.options.filter((o) => o.text.trim()).length < 4) {
      w.push('Minimal 4 opsi jawaban (A–D) perlu terisi.');
    }
    if (!d.correctAnswer.trim()) {
      w.push('Kunci jawaban belum dipilih.');
    } else if (
      d.type === 'multiple_choice' &&
      !d.options.some((o) => o.id.toUpperCase() === d.correctAnswer.toUpperCase())
    ) {
      w.push(`Kunci "${d.correctAnswer}" tidak ada pada opsi.`);
    }
    return w;
  };

  const updateDraft = (tempId: string, updater: (prev: ParsedWordQuestionDraft) => ParsedWordQuestionDraft) => {
    setDrafts((prev) =>
      prev.map((item) => {
        if (item.tempId !== tempId) return item;
        const next = updater(item);
        return { ...next, warnings: recomputeWarnings(next) };
      })
    );
  };

  const updateDraftOption = (tempId: string, optId: string, newText: string) => {
    updateDraft(tempId, (d) => ({
      ...d,
      options: d.options.map((o) => (o.id === optId ? { ...o, text: newText } : o)),
    }));
  };

  const toggleOptionE = (tempId: string) => {
    updateDraft(tempId, (d) => {
      const hasE = d.options.some((o) => o.id === 'E');
      if (hasE) {
        const nextOpts = d.options.filter((o) => o.id !== 'E');
        return {
          ...d,
          options: nextOpts,
          correctAnswer: d.correctAnswer === 'E' ? '' : d.correctAnswer,
        };
      } else {
        return {
          ...d,
          options: [...d.options, { id: 'E', text: '' }],
        };
      }
    });
  };

  const handleDraftImageUpload = async (tempId: string, file: File) => {
    try {
      const dataUrl = await readBlobAsDataUrl(file);
      updateDraft(tempId, (d) => ({ ...d, imageUrl: dataUrl }));
    } catch {
      setErrorMsg('Gagal membaca berkas gambar.');
    }
  };

  const handleApplyTargetToAllDrafts = () => {
    setDrafts((prev) =>
      prev.map((d) => ({
        ...d,
        category: targetCategory,
        stage: targetStage,
      }))
    );
    setInfoBanner(`Target ${targetCategory} · Babak ${targetStage} diterapkan ke seluruh ${drafts.length} pratinjau soal.`);
  };

  const handleCommitBatch = async () => {
    if (drafts.length === 0) return;

    const incomplete = drafts.filter((d) => !d.correctAnswer.trim() || (!d.text.trim() && !d.imageUrl));
    if (incomplete.length > 0) {
      setErrorMsg(
        `Masih ada ${incomplete.length} soal yang belum memiliki teks soal atau kunci jawaban. Lengkapi di daftar pratinjau terlebih dahulu.`
      );
      return;
    }

    setErrorMsg(null);
    setIsSaving(true);

    const questionsToSave: Question[] = drafts.map((d, idx) => ({
      id: `imp-${Date.now()}-${idx + 1}-${Math.random().toString(36).slice(2, 6)}`,
      category: d.category,
      stage: d.stage,
      domain: d.domain,
      type: d.type,
      questionNumber: Number(d.questionNumber) || idx + 1,
      text: d.text.trim(),
      formulaLatex: '',
      imageUrl: d.imageUrl,
      options:
        d.type === 'multiple_choice'
          ? d.options
              .filter((o) => o.text.trim() !== '' || ['A', 'B', 'C', 'D'].includes(o.id))
              .map((o) => ({ id: o.id, text: o.text.trim() }))
          : undefined,
      correctAnswer: d.correctAnswer.trim().toUpperCase(),
      explanation: d.explanation.trim(),
      points: {
        correct: Number.isFinite(pointsCorrect) ? pointsCorrect : 4,
        wrong: Number.isFinite(pointsWrong) ? pointsWrong : -1,
        blank: Number.isFinite(pointsBlank) ? pointsBlank : 0,
      },
    }));

    const ok = await onSaveBatch(questionsToSave, saveMode, targetCategory, targetStage);
    setIsSaving(false);

    if (ok) {
      setDrafts([]);
      setPasteTextValue('');
      setLastFileName(null);
      setUploadedImagePreview(null);
      setEquationsCount(0);
      if (onClose) {
        onClose();
      } else {
        setInfoBanner(`${questionsToSave.length} butir soal berhasil disimpan ke Bank Soal aktif.`);
      }
    }
  };

  const warningDraftCount = drafts.filter((d) => d.warnings.length > 0).length;

  return (
    <div className="bg-white border-2 border-[#E49548] rounded-3xl flex flex-col max-h-[90vh] overflow-hidden shadow-2xl text-[#1E3954]">
      {/* Sticky Modal Header */}
      <div className="px-5 sm:px-6 py-4 border-b-2 border-[#E49548] bg-[#2C4B6B] text-white flex items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-[#DCE9F5]">
            <span className="font-extrabold uppercase tracking-wider bg-[#F4E6CC] text-[#1E3954] px-2.5 py-0.5 rounded-full">
              Impor Soal MMO 2027
            </span>
            <span aria-hidden="true">·</span>
            <span>Pilih Jenjang &amp; Babak</span>
            <span aria-hidden="true">·</span>
            <span>Copy Paste, Word, atau Gambar</span>
          </div>
          <h3 className="text-base sm:text-lg font-extrabold text-white mt-1">
            Masukkan Paket Soal Baru
          </h3>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDownloadSampleDocx}
            className="px-3 py-1.5 rounded-xl bg-[#F4E6CC] hover:bg-white border border-[#E49548] text-xs font-extrabold text-[#1E3954] flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-[#CE7D30]" />
            <span>Contoh Word (.docx)</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup jendela impor soal"
              className="p-2 rounded-xl border border-[#4E779F] bg-[#243E59] hover:bg-[#3B5F84] text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 bg-[#EBF1F6]/40">
        {/* Step 1: Target Jenjang, Babak, Mode Simpan, & Skoring */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 bg-white border border-[#E49548]/60 rounded-2xl p-4 shadow-2xs">
          {/* Jenjang */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#1E3954] block">
              1. Pilih Jenjang
            </label>
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#EBF1F6] border border-[#B8CCE0] rounded-xl">
              {(['SMP', 'SMA'] as OlympiadCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setTargetCategory(cat)}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                    targetCategory === cat
                      ? 'bg-[#2C4B6B] text-white shadow-2xs'
                      : 'text-[#4E779F] hover:text-[#1E3954]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Babak */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#1E3954] block">
              2. Pilih Babak
            </label>
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#EBF1F6] border border-[#B8CCE0] rounded-xl">
              {(['Penyisihan', 'Semifinal'] as CompetitionStage[]).map((stg) => (
                <button
                  key={stg}
                  type="button"
                  onClick={() => setTargetStage(stg)}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                    targetStage === stg
                      ? 'bg-[#2C4B6B] text-white shadow-2xs'
                      : 'text-[#4E779F] hover:text-[#1E3954]'
                  }`}
                >
                  {stg === 'Semifinal' ? 'Semi Final' : stg}
                </button>
              ))}
            </div>
          </div>

          {/* Mode Simpan */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#1E3954] block font-mono tabular-nums">
              3. Mode Simpan ({targetCategory} · {currentPacketCount} soal)
            </label>
            <select
              value={saveMode}
              onChange={(e) => setSaveMode(e.target.value as 'append' | 'replace_packet' | 'replace_all')}
              className="w-full bg-white border border-[#B8CCE0] rounded-xl px-3 py-2 text-xs font-semibold text-[#1E3954] focus:outline-none focus:border-[#E49548]"
            >
              <option value="append">Tambahkan ke Bank Soal</option>
              <option value="replace_packet">Ganti paket {targetCategory} {targetStage}</option>
              <option value="replace_all">Ganti seluruh Bank Soal</option>
            </select>
          </div>

          {/* Skoring Default */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#1E3954] block">
              4. Skoring (Benar / Salah / Kosong)
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <input
                type="number"
                value={pointsCorrect}
                onChange={(e) => setPointsCorrect(Number(e.target.value))}
                aria-label="Skor Benar"
                className="bg-white border border-[#B8CCE0] rounded-xl px-2 py-1.5 text-xs font-mono tabular-nums text-emerald-700 font-semibold text-center focus:outline-none focus:border-[#E49548]"
                title="Poin Benar"
              />
              <input
                type="number"
                value={pointsWrong}
                onChange={(e) => setPointsWrong(Number(e.target.value))}
                aria-label="Skor Salah"
                className="bg-white border border-[#B8CCE0] rounded-xl px-2 py-1.5 text-xs font-mono tabular-nums text-rose-700 font-semibold text-center focus:outline-none focus:border-[#E49548]"
                title="Poin Salah"
              />
              <input
                type="number"
                value={pointsBlank}
                onChange={(e) => setPointsBlank(Number(e.target.value))}
                aria-label="Skor Kosong"
                className="bg-white border border-[#B8CCE0] rounded-xl px-2 py-1.5 text-xs font-mono tabular-nums text-[#1E3954] font-semibold text-center focus:outline-none focus:border-[#E49548]"
                title="Poin Kosong"
              />
            </div>
          </div>
        </div>

        {/* Step 2: 3 Clean Input Method Options */}
        <div className="space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-[#1E3954]">
              Pilih Metode Memasukkan Soal
            </span>
            <div className="inline-flex items-center gap-1 p-1 bg-[#2C4B6B] border border-[#E49548] rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setInputMode('paste');
                  setErrorMsg(null);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  inputMode === 'paste'
                    ? 'bg-[#F4E6CC] text-[#1E3954]'
                    : 'text-[#DCE9F5] hover:text-white'
                }`}
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>Copy Paste</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputMode('docx');
                  setErrorMsg(null);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  inputMode === 'docx'
                    ? 'bg-[#F4E6CC] text-[#1E3954]'
                    : 'text-[#DCE9F5] hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Word (.docx)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputMode('image');
                  setErrorMsg(null);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  inputMode === 'image'
                    ? 'bg-[#F4E6CC] text-[#1E3954]'
                    : 'text-[#DCE9F5] hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Gambar</span>
              </button>
            </div>
          </div>

          {/* Method 1: Copy Paste */}
          {inputMode === 'paste' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-8 space-y-2.5">
                <textarea
                  value={pasteTextValue}
                  onChange={(e) => setPasteTextValue(e.target.value)}
                  onPaste={handleWordPaste}
                  rows={8}
                  placeholder={`Salin soal dari Word atau sumber lain lalu tekan Ctrl+V di sini...\n\nContoh format:\n1. Berapakah hasil dari 3/2 ditambah 1?\nA. 1/2   B. 1   C. 5/2   D. 2   E. 3\nKunci Jawaban: C`}
                  className="w-full bg-white border border-[#B8CCE0] focus:border-[#E49548] rounded-xl p-3.5 text-xs font-mono text-[#1E3954] placeholder-slate-400 focus:outline-none leading-relaxed"
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-[#4E779F]">
                    Gunakan <strong className="text-[#1E3954]">Parse AI (MMO 2027)</strong> untuk merapikan rumus ke KaTeX <code className="text-[#2C4B6B] font-bold">$$...$$</code> secara otomatis.
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {pasteTextValue && (
                      <button
                        type="button"
                        onClick={() => {
                          setPasteTextValue('');
                          setErrorMsg(null);
                        }}
                        className="px-3 py-1.5 rounded-xl border border-[#B8CCE0] bg-white text-xs font-medium text-[#4E779F] hover:text-[#1E3954] hover:bg-[#FAF3E3] cursor-pointer whitespace-nowrap"
                      >
                        Bersihkan
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleParseManualPaste}
                      disabled={isAiParsing || !pasteTextValue.trim()}
                      className="px-3.5 py-1.5 rounded-xl bg-[#FAF3E3] hover:bg-[#F4E6CC] border border-[#E49548]/60 text-[#1E3954] text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#CE7D30]" />
                      <span>Urai Cepat Lokal</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleParseWithAI}
                      disabled={isAiParsing || !pasteTextValue.trim()}
                      className="px-4 py-1.5 rounded-xl bg-[#E49548] hover:bg-[#CE7D30] disabled:opacity-50 text-[#1E3954] text-xs font-extrabold flex items-center gap-1.5 cursor-pointer whitespace-nowrap border border-[#CE7D30]"
                    >
                      {isAiParsing ? (
                        <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Wand2 className="w-3.5 h-3.5" />
                      )}
                      <span>{isAiParsing ? 'Memparsing via AI...' : 'Parse AI (MMO 2027)'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 bg-[#FAF3E3] border border-[#E49548]/60 rounded-xl p-4 space-y-2 text-xs">
                <div className="font-extrabold text-[#1E3954]">Format Urutan Soal</div>
                <div className="font-mono text-[11px] bg-white border border-[#B8CCE0] rounded-xl p-3 text-[#1E3954] leading-relaxed whitespace-pre-wrap">
{`1. [Teks Soal + Equation]
A. [Opsi A]
B. [Opsi B]
C. [Opsi C]
D. [Opsi D]
E. [Opsi E]
Kunci Jawaban: B`}
                </div>
                <p className="text-[11px] text-[#4E779F] leading-relaxed">
                  Mendukung penanda kunci <code className="text-[#1E3954] font-semibold">Kunci Jawaban:</code>, <code className="text-[#1E3954] font-semibold">Kunci:</code>, <code className="text-[#1E3954] font-semibold">Jawaban:</code>, atau <code className="text-[#1E3954] font-semibold">KJ:</code>.
                </p>
              </div>
            </div>
          )}

          {/* Method 2: Word (.docx) */}
          {inputMode === 'docx' && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) processDocxFile(f);
              }}
              onClick={() => !isParsing && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-7 text-center transition-colors ${
                isParsing ? 'cursor-wait opacity-85' : 'cursor-pointer'
              } ${
                isDragging
                  ? 'border-[#E49548] bg-[#FAF3E3]'
                  : 'border-[#B8CCE0] bg-[#FAF3E3]/50 hover:border-[#E49548] hover:bg-[#FAF3E3]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) processDocxFile(f);
                  e.target.value = '';
                }}
                className="hidden"
              />
              <div className="mx-auto w-11 h-11 rounded-2xl bg-[#2C4B6B] border border-[#E49548] flex items-center justify-center mb-3">
                {isParsing ? (
                  <RotateCcw className="w-5 h-5 text-[#F4E6CC] animate-spin" />
                ) : (
                  <UploadCloud className="w-5 h-5 text-[#F4E6CC]" />
                )}
              </div>
              <p className="text-sm font-bold text-[#1E3954]">
                {isParsing
                  ? `Membaca XML & Equation dari "${lastFileName}"...`
                  : 'Tarik berkas Word (.docx) ke sini atau klik untuk memilih file'}
              </p>
              <p className="text-xs text-[#4E779F] mt-1 max-w-xl mx-auto">
                Mendukung Equation Editor Microsoft Word (OMML) ke KaTeX, penomoran otomatis Word, gambar diagram tertanam, serta opsi A–D maupun A–E.
              </p>
            </div>
          )}

          {/* Method 3: Gambar */}
          {inputMode === 'image' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) processImageFile(f);
                }}
                onClick={() => !isAiParsing && imageInputRef.current?.click()}
                className={`${
                  uploadedImagePreview ? 'lg:col-span-8' : 'lg:col-span-12'
                } border-2 border-dashed rounded-2xl p-7 text-center transition-colors ${
                  isAiParsing ? 'cursor-wait opacity-85' : 'cursor-pointer'
                } ${
                  isDragging
                    ? 'border-[#E49548] bg-[#FAF3E3]'
                    : 'border-[#B8CCE0] bg-[#FAF3E3]/50 hover:border-[#E49548] hover:bg-[#FAF3E3]'
                }`}
              >
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) processImageFile(f);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
                <div className="mx-auto w-11 h-11 rounded-2xl bg-[#2C4B6B] border border-[#E49548] flex items-center justify-center mb-3">
                  {isAiParsing ? (
                    <RotateCcw className="w-5 h-5 text-[#F4E6CC] animate-spin" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-[#F4E6CC]" />
                  )}
                </div>
                <p className="text-sm font-bold text-[#1E3954]">
                  {isAiParsing
                    ? `AI sedang membaca soal & rumus dari gambar "${lastFileName}"...`
                    : 'Tarik gambar / tangkapan layar soal (PNG, JPG, WEBP) ke sini atau klik untuk memilih'}
                </p>
                <p className="text-xs text-[#4E779F] mt-1 max-w-xl mx-auto">
                  Foto lembaran soal maupun screenshot akan dikenali dan dikonversi ke teks, opsi A–E, serta rumus KaTeX <code className="text-[#1E3954] font-semibold">$$...$$</code> untuk Anda periksa di pratinjau.
                </p>
              </div>

              {uploadedImagePreview && (
                <div className="lg:col-span-4 bg-[#FAF3E3] border border-[#E49548]/60 rounded-2xl p-3 flex flex-col justify-between gap-2">
                  <div className="text-[11px] font-bold text-[#1E3954] truncate">
                    Gambar Diunggah: {lastFileName}
                  </div>
                  <div className="bg-white border border-[#B8CCE0] rounded-xl p-2 flex items-center justify-center h-36 overflow-hidden">
                    <img
                      src={uploadedImagePreview}
                      alt="Pratinjau gambar soal yang diunggah"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
            <button type="button" onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {infoBanner && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">{infoBanner}</div>
            <button type="button" onClick={() => setInfoBanner(null)} className="text-emerald-600 hover:text-emerald-800 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Step 3: Live KaTeX Preview & Edit Queue */}
        {drafts.length > 0 && (
          <div className="pt-4 border-t border-[#B8CCE0] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-extrabold text-[#1E3954] flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#2C4B6B]" />
                  <span>Pratinjau &amp; Penyesuaian Soal ({drafts.length} Butir Siap Diperiksa)</span>
                </h4>
                <p className="text-xs text-[#4E779F] mt-0.5 font-mono tabular-nums">
                  {equationsCount} equation terkonversi ·{' '}
                  {warningDraftCount > 0 ? (
                    <span className="text-[#CE7D30] font-semibold">
                      {warningDraftCount} soal butuh kelengkapan kunci/opsi
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-semibold">Semua soal lengkap dan siap disimpan</span>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowJsonPanel((v) => !v)}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FAF3E3] border border-[#B8CCE0] text-xs font-bold text-[#1E3954] flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Code2 className="w-3.5 h-3.5 text-[#2C4B6B]" />
                  <span>{showJsonPanel ? 'Tutup JSON' : 'Lihat JSON'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleApplyTargetToAllDrafts}
                  className="px-3 py-1.5 rounded-xl bg-[#FAF3E3] hover:bg-[#F4E6CC] border border-[#E49548]/60 text-xs font-bold text-[#1E3954] cursor-pointer whitespace-nowrap"
                >
                  Terapkan {targetCategory} · {targetStage === 'Semifinal' ? 'Semi Final' : targetStage} ke Semua
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDrafts([]);
                    setShowJsonPanel(false);
                    setInfoBanner(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700 cursor-pointer whitespace-nowrap"
                >
                  Bersihkan Pratinjau
                </button>
              </div>
            </div>

            {showJsonPanel && (
              <div className="bg-[#1E3954] border-2 border-[#E49548] rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono text-[#F4E6CC]">
                    Output JSON Terstruktur MMO 2027 (KaTeX $$...$$)
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyStructuredJson}
                    className="px-3 py-1 rounded-lg bg-[#2C4B6B] hover:bg-[#3B5F84] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedJson ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin JSON</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="text-[11px] font-mono text-[#DCE9F5] overflow-x-auto max-h-56 leading-relaxed">
                  {JSON.stringify(draftsToStructuredJson(drafts), null, 2)}
                </pre>
              </div>
            )}

            {/* Draft Cards */}
            <div className="space-y-4">
              {drafts.map((draft, index) => {
                const hasWarnings = draft.warnings.length > 0;
                return (
                  <div
                    key={draft.tempId}
                    className={`border-2 rounded-2xl p-4 sm:p-5 space-y-4 ${
                      hasWarnings
                        ? 'border-[#E49548] bg-[#FAF3E3]/70'
                        : 'border-[#B8CCE0] bg-[#FAF3E3]/35'
                    }`}
                  >
                    {/* Draft Metadata Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#B8CCE0]/60">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono tabular-nums font-bold text-[#1E3954]">
                          Soal #{draft.questionNumber || index + 1}
                        </span>
                        <span className="text-[#4E779F]">·</span>
                        <select
                          value={draft.category}
                          onChange={(e) =>
                            updateDraft(draft.tempId, (d) => ({
                              ...d,
                              category: e.target.value as OlympiadCategory,
                            }))
                          }
                          className="bg-white border border-[#B8CCE0] rounded-lg px-2 py-1 text-xs font-semibold text-[#1E3954]"
                        >
                          <option value="SMP">SMP</option>
                          <option value="SMA">SMA</option>
                        </select>

                        <select
                          value={draft.stage}
                          onChange={(e) =>
                            updateDraft(draft.tempId, (d) => ({
                              ...d,
                              stage: e.target.value as CompetitionStage,
                            }))
                          }
                          className="bg-white border border-[#B8CCE0] rounded-lg px-2 py-1 text-xs font-semibold text-[#1E3954]"
                        >
                          <option value="Penyisihan">Penyisihan</option>
                          <option value="Semifinal">Semi Final</option>
                        </select>

                        <select
                          value={draft.domain}
                          onChange={(e) =>
                            updateDraft(draft.tempId, (d) => ({
                              ...d,
                              domain: e.target.value as MathDomain,
                            }))
                          }
                          className="bg-white border border-[#B8CCE0] rounded-lg px-2 py-1 text-xs font-semibold text-[#1E3954]"
                        >
                          {MATH_DOMAINS.map((dom) => (
                            <option key={dom} value={dom}>
                              {dom}
                            </option>
                          ))}
                        </select>

                        {hasWarnings ? (
                          <span className="text-xs text-[#CE7D30] font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-[#E49548]" />
                            <span>{draft.warnings[0]}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Siap Simpan</span>
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setDrafts((prev) => prev.filter((item) => item.tempId !== draft.tempId))}
                        className="text-xs text-[#4E779F] hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    </div>

                    {/* Two Column Editor (Left) & Live KaTeX Preview (Right) */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                      <div className="lg:col-span-6 space-y-3">
                        <div>
                          <label className="text-[11px] font-bold text-[#2C4B6B] block mb-1">
                            Teks Soal &amp; Rumus KaTeX ($$...$$)
                          </label>
                          <MathFormulaToolbar
                            compact
                            onInsert={(snippet) =>
                              updateDraft(draft.tempId, (d) => ({
                                ...d,
                                text: d.text ? `${d.text} ${snippet}` : snippet,
                              }))
                            }
                          />
                          <textarea
                            value={draft.text}
                            onChange={(e) =>
                              updateDraft(draft.tempId, (d) => ({ ...d, text: e.target.value }))
                            }
                            rows={3}
                            className="w-full bg-white border border-[#B8CCE0] rounded-xl p-2.5 text-xs font-mono text-[#1E3954] focus:outline-none focus:border-[#E49548]"
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <label className="px-2.5 py-1.5 rounded-lg bg-white border border-[#B8CCE0] hover:border-[#E49548] text-[11px] font-semibold text-[#1E3954] flex items-center gap-1.5 cursor-pointer">
                            <ImageIcon className="w-3.5 h-3.5 text-[#2C4B6B]" />
                            <span>{draft.imageUrl ? 'Ganti Gambar' : 'Sisipkan Gambar'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleDraftImageUpload(draft.tempId, file);
                                e.target.value = '';
                              }}
                            />
                          </label>
                          {draft.imageUrl && (
                            <button
                              type="button"
                              onClick={() => updateDraft(draft.tempId, (d) => ({ ...d, imageUrl: undefined }))}
                              className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                            >
                              Hapus Gambar
                            </button>
                          )}
                        </div>

                        {draft.type === 'multiple_choice' && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-[#2C4B6B]">
                                Pilihan Jawaban &amp; Kunci Jawaban
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleOptionE(draft.tempId)}
                                className="text-[11px] font-semibold text-[#2C4B6B] hover:text-[#CE7D30] cursor-pointer flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                <span>{draft.options.some((o) => o.id === 'E') ? 'Pakai A–D Saja' : 'Tambah Opsi E'}</span>
                              </button>
                            </div>

                            <div className="space-y-1.5">
                              {draft.options.map((opt) => {
                                const isKey = draft.correctAnswer.toUpperCase() === opt.id.toUpperCase();
                                return (
                                  <div key={opt.id} className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateDraft(draft.tempId, (d) => ({
                                          ...d,
                                          correctAnswer: opt.id,
                                        }))
                                      }
                                      title={`Jadikan ${opt.id} sebagai Kunci Jawaban`}
                                      className={`w-8 h-8 rounded-lg text-xs font-mono font-bold shrink-0 border transition-colors cursor-pointer ${
                                        isKey
                                          ? 'bg-emerald-700 text-white border-emerald-700'
                                          : 'bg-white text-[#1E3954] border-[#B8CCE0] hover:border-[#E49548]'
                                      }`}
                                    >
                                      {opt.id}
                                    </button>
                                    <input
                                      type="text"
                                      value={opt.text}
                                      onChange={(e) =>
                                        updateDraftOption(draft.tempId, opt.id, e.target.value)
                                      }
                                      placeholder={`Isi pilihan ${opt.id}...`}
                                      className="flex-1 bg-white border border-[#B8CCE0] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#1E3954] focus:outline-none focus:border-[#E49548]"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="lg:col-span-6 bg-white border border-[#B8CCE0] rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between text-[11px] text-[#4E779F] pb-2 border-b border-[#EBF1F6]">
                          <span className="font-bold text-[#1E3954]">Pratinjau Tampilan Peserta (KaTeX)</span>
                          <span className="font-mono">
                            Kunci:{' '}
                            <strong className={draft.correctAnswer ? 'text-emerald-700' : 'text-[#CE7D30]'}>
                              {draft.correctAnswer || 'Belum dipilih'}
                            </strong>
                          </span>
                        </div>

                        {draft.imageUrl && (
                          <div className="bg-[#FAF3E3]/50 border border-[#B8CCE0] rounded-lg p-2 flex justify-center">
                            <img
                              src={draft.imageUrl}
                              alt={`Ilustrasi soal ${draft.questionNumber}`}
                              className="max-h-40 object-contain rounded"
                            />
                          </div>
                        )}

                        <div className="text-sm text-[#1E3954] leading-relaxed">
                          <MathRenderer content={draft.text || '(Teks soal kosong)'} />
                        </div>

                        {draft.type === 'multiple_choice' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                            {draft.options.map((opt) => {
                              const isKey = draft.correctAnswer.toUpperCase() === opt.id.toUpperCase();
                              return (
                                <div
                                  key={opt.id}
                                  className={`px-2.5 py-2 rounded-lg border text-xs flex items-start gap-2 ${
                                    isKey
                                      ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-medium'
                                      : 'bg-[#FAF3E3]/40 border-[#B8CCE0] text-[#1E3954]'
                                  }`}
                                >
                                  <span
                                    className={`font-mono font-bold shrink-0 ${
                                      isKey ? 'text-emerald-700' : 'text-[#4E779F]'
                                    }`}
                                  >
                                    {opt.id}.
                                  </span>
                                  <span className="min-w-0 break-words">
                                    <MathRenderer content={opt.text || '-'} inline />
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Modal Footer when drafts exist or onClose is available */}
      {(drafts.length > 0 || onClose) && (
        <div className="px-5 sm:px-6 py-3.5 border-t border-[#B8CCE0] bg-[#FAF3E3] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-[#4E779F]">
            {drafts.length > 0 ? (
              <>
                <strong className="text-[#1E3954] font-mono tabular-nums">{drafts.length}</strong> soal siap disimpan ({' '}
                <strong className="text-[#1E3954]">
                  {saveMode === 'append'
                    ? 'Tambahkan ke Bank Soal'
                    : saveMode === 'replace_packet'
                    ? `Ganti Paket ${targetCategory} ${targetStage === 'Semifinal' ? 'Semi Final' : targetStage}`
                    : 'Ganti Seluruh Bank Soal'}
                </strong>
                ).
              </>
            ) : (
              <span>Pilih jenjang, babak, lalu masukkan soal melalui Copy Paste, Word (.docx), atau Gambar.</span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 justify-end">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-[#B8CCE0] bg-white hover:bg-[#F4E6CC] text-[#1E3954] text-xs font-bold cursor-pointer whitespace-nowrap"
              >
                Tutup
              </button>
            )}
            {drafts.length > 0 && (
              <button
                type="button"
                disabled={isSaving}
                onClick={handleCommitBatch}
                className="px-5 py-2 rounded-xl bg-[#E49548] hover:bg-[#CE7D30] disabled:opacity-50 text-[#1E3954] text-xs font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap border border-[#CE7D30]"
              >
                <CheckCircle2 className="w-4 h-4 text-[#1E3954]" />
                <span>{isSaving ? 'Menyimpan...' : `Simpan ${drafts.length} Soal ke Bank Soal`}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
