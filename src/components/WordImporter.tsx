import React, { useState, useRef } from 'react';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Download,
  Trash2,
  Edit3,
  X,
  Layers,
  HelpCircle,
  Check,
  RefreshCw,
  BookOpen,
  ClipboardList,
  Image as ImageIcon,
  Copy,
  Camera,
  Eye,
} from 'lucide-react';
import { Question, OlympiadCategory, MathDomain } from '../types';
import { MathRenderer } from './MathRenderer';
import { ApiService } from '../services/api';
import { sanitizeMathString, sanitizeQuestionsList } from '../utils/mathSanitizer';

interface WordImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onQuestionsImported: (importedQuestions: Question[], mode: 'append' | 'replace') => void;
  initialCategory?: OlympiadCategory;
}

// Convert linear fractions, clean shadows, and format powers & exponents beautifully
function cleanAndBeautifyMathText(raw: string): string {
  return sanitizeMathString(raw);
}

export const WordImporter: React.FC<WordImporterProps> = ({
  isOpen,
  onClose,
  onQuestionsImported,
  initialCategory = 'SMP',
}) => {
  // Tabs: Smart Paste (default, zero quota) vs File Upload (.docx)
  const [activeTab, setActiveTab] = useState<'smart_paste' | 'file_upload'>('smart_paste');

  const [pastedText, setPastedText] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetCategory, setTargetCategory] = useState<OlympiadCategory>(initialCategory);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<number>(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  // Preview state
  const [parsedQuestions, setParsedQuestions] = useState<Question[]>([]);
  const [saveMode, setSaveMode] = useState<'append' | 'replace'>('append');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Screenshot upload per-question
  const [screenshotTargetIndex, setScreenshotTargetIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageUploadRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    validateAndSetFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    validateAndSetFile(file);
  };

  const validateAndSetFile = (file?: File) => {
    setErrorMessage(null);
    setSuccessInfo(null);
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.docx')) {
      setErrorMessage('Berkas harus berformat Microsoft Word (.docx). Mohon periksa kembali ekstensi berkas Anda.');
      setSelectedFile(null);
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage('Ukuran berkas melebihi batas maksimal 15 MB.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  // Process text pasted directly from Word (Zero AI Quota, Instant & Robust)
  const handleProcessPastedText = async () => {
    if (!pastedText.trim()) {
      setErrorMessage('Silakan tempel (paste) naskah soal dari Word terlebih dahulu ke dalam kolom teks.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessInfo(null);

    try {
      const cleaned = cleanAndBeautifyMathText(pastedText);
      const result = await ApiService.parseTextQuestions(cleaned, targetCategory);

      if (result.success && Array.isArray(result.questions) && result.questions.length > 0) {
        setParsedQuestions(result.questions);
        setSuccessInfo(`Berhasil membedah ${result.questions.length} butir soal dengan rumus tegak KaTeX!`);
      } else {
        setErrorMessage(
          result.error ||
            'Tidak dapat mendeteksi butir soal. Pastikan naskah memiliki format nomor ("1. ") dan opsi jawaban ("A. ", "B. ", dst).'
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Terjadi gangguan jaringan saat memproses naskah teks.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fill sample Olympiad text for quick testing
  const handleFillSample = () => {
    const sample = `1. Diketahui pecahan 2013/7000. Tentukan angka desimal ke-2013 di belakang koma dari bentuk desimal pecahan tersebut.
A. 1
B. 4
C. 2
D. 8
E. 5
Kunci: D
Pembahasan: Ubah 2013/7000 = (2013 ÷ 7) ÷ 1000. 2013 ÷ 7 = 287,571428... dengan pola 6 angka berulang: 571428. Posisi angka ke-2013 di belakang koma setelah pergeseran 3 angka adalah: (2013 - 3) = 2010. 2010 ÷ 6 = 335 sisa 0. Sisa 0 berarti angka ke-6 dari pola yaitu 8.

2. Diketahui FPB dan KPK dari bilangan 72 dan x berturut-turut adalah 3 dan 1800. Pernyataan berikut yang benar adalah ...
A. x kelipatan 5
B. x kelipatan 72
C. x adalah genap
D. x adalah faktor dari 3
E. x kelipatan 7
Kunci: A
Pembahasan: Hubungan FPB dan KPK dua bilangan: 72 × x = FPB(72, x) × KPK(72, x) = 3 × 1800 = 5400. Maka x = 5400 / 72 = 75. Karena x = 75 = 5 × 15, maka x adalah kelipatan 5.`;

    setPastedText(sample);
  };

  const handleProcessFile = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessInfo(null);
    setLoadingStep(1);

    const stepTimer1 = setTimeout(() => setLoadingStep(2), 1000);
    const stepTimer2 = setTimeout(() => setLoadingStep(3), 2500);

    try {
      const result = await ApiService.uploadWordQuestions(selectedFile, targetCategory);

      if (result.success && Array.isArray(result.questions) && result.questions.length > 0) {
        setParsedQuestions(result.questions);
        if (result.fallbackUsed) {
          setSuccessInfo(
            `Berhasil membedah ${result.questions.length} butir soal menggunakan mesin parsing cepat tanpa kuota AI!`
          );
        }
      } else {
        setErrorMessage(
          result.error ||
            'Tidak berhasil membedah soal dari berkas Word. Gunakan tab "Tempel Teks Cerdas" di samping untuk menempelkan naskah langsung dari Word.'
        );
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          'Terjadi kendala saat memproses berkas Word. Anda dapat menyalin teks soal langsung ke tab "Tempel Teks Cerdas".'
      );
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setIsLoading(false);
    }
  };

  const handleSaveToBank = async () => {
    if (parsedQuestions.length === 0) return;

    setIsSaving(true);
    try {
      const result = await ApiService.bulkSaveQuestions(parsedQuestions, saveMode);
      if (result.success) {
        onQuestionsImported(parsedQuestions, saveMode);
        onClose();
      } else {
        setErrorMessage(result.error || 'Gagal menyimpan soal ke server.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal menyimpan soal ke server.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteQuestion = (indexToDelete: number) => {
    setParsedQuestions((prev) => prev.filter((_, idx) => idx !== indexToDelete));
  };

  const handleCleanAllImported = () => {
    setParsedQuestions((prev) =>
      prev.map((q) => ({
        ...q,
        text: cleanAndBeautifyMathText(q.text),
        formulaLatex: '', // suppress duplicate formula block
        options: q.options?.map((opt) => ({
          ...opt,
          text: cleanAndBeautifyMathText(opt.text),
        })),
        explanation: cleanAndBeautifyMathText(q.explanation || ''),
      }))
    );
    setSuccessInfo('Seluruh duplikasi simbol KaTeX dan pecahan telah dirapikan!');
    setTimeout(() => setSuccessInfo(null), 3000);
  };

  const handleUpdateQuestionField = (index: number, field: keyof Question, value: any) => {
    setParsedQuestions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Image / Screenshot Upload & Paste handling for individual questions
  const handleAttachImageToQuestion = (index: number, file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Berkas harus berupa gambar (PNG, JPG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        handleUpdateQuestionField(index, 'imageUrl', e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePasteScreenshotOnQuestion = (index: number, e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          handleAttachImageToQuestion(index, file);
          break;
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-[#D5D5D5] rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="bg-[#f7f7f8] border-b border-[#D5D5D5] px-5 sm:px-7 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#646464] text-white flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-zinc-900">
                  Input & Impor Naskah Soal Word
                </h3>
                <span className="bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  Bebas Kuota · KaTeX Tegak
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-zinc-500">
                Pilih metode input: tempel teks langsung dari Word atau unggah berkas .docx dengan render KaTeX rapi.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isLoading || isSaving}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector (When not viewing parsed questions) */}
        {parsedQuestions.length === 0 && !isLoading && (
          <div className="px-5 sm:px-7 pt-3 bg-white border-b border-[#D5D5D5] flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('smart_paste');
                  setErrorMessage(null);
                }}
                className={`py-2 px-3 sm:px-4 rounded-t-xl text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'smart_paste'
                    ? 'border-[#646464] text-zinc-900 bg-zinc-50 shadow-2xs'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <ClipboardList className="w-4 h-4 text-emerald-600" />
                <span>Tempel Teks Cerdas (Rekomendasi)</span>
                <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2 rounded-md">
                  0 Kuota
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('file_upload');
                  setErrorMessage(null);
                }}
                className={`py-2 px-3 sm:px-4 rounded-t-xl text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'file_upload'
                    ? 'border-[#646464] text-zinc-900 bg-zinc-50 shadow-2xs'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <UploadCloud className="w-4 h-4 text-[#646464]" />
                <span>Unggah Berkas .docx</span>
              </button>
            </div>

            <span className="text-[11px] text-zinc-500 font-medium hidden sm:inline">
              Pecahan otomatis dikonversi ke pecahan tegak <code className="font-bold text-[#646464]">$\frac{'{a}{b}'}$</code>
            </span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-5">
          {/* Success Banner */}
          {successInfo && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center gap-3 text-emerald-900 text-xs shadow-xs animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="flex-1 font-semibold">{successInfo}</div>
              <button
                type="button"
                onClick={() => setSuccessInfo(null)}
                className="text-emerald-700 hover:text-emerald-900 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-900 text-xs shadow-xs">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold">Informasi:</span> {errorMessage}
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {activeTab === 'file_upload' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('smart_paste')}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-900 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-2xs"
                  >
                    Gunakan Tempel Cerdas
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="px-2.5 py-1.5 text-rose-600 hover:text-rose-800 text-xs font-semibold cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          )}

          {/* STEP 1A: SMART PASTE TAB */}
          {parsedQuestions.length === 0 && !isLoading && activeTab === 'smart_paste' && (
            <div className="space-y-4">
              {/* Category Selector */}
              <div className="bg-[#f7f7f8] border border-[#D5D5D5] rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="text-xs font-bold text-zinc-900 shrink-0">
                  Target Jenjang Soal:
                </label>
                <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setTargetCategory('SMP')}
                    className={`py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      targetCategory === 'SMP'
                        ? 'bg-[#646464] text-white border-[#646464] shadow-xs'
                        : 'bg-white text-zinc-700 border-[#D5D5D5] hover:bg-zinc-50'
                    }`}
                  >
                    <span>Jenjang SMP</span>
                    {targetCategory === 'SMP' && <Check className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetCategory('SMA')}
                    className={`py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      targetCategory === 'SMA'
                        ? 'bg-[#646464] text-white border-[#646464] shadow-xs'
                        : 'bg-white text-zinc-700 border-[#D5D5D5] hover:bg-zinc-50'
                    }`}
                  >
                    <span>Jenjang SMA</span>
                    {targetCategory === 'SMA' && <Check className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Textarea for Pasting */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                    <span>Tempel (Paste) Teks Soal dari Word di Sini:</span>
                    <span className="text-rose-500">*</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleFillSample}
                    className="text-[11px] text-[#646464] hover:text-zinc-900 font-semibold underline flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Isi Contoh Naskah Soal</span>
                  </button>
                </div>

                <textarea
                  rows={9}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={`Contoh format:
1. Diketahui FPB dan KPK dari bilangan 72 dan x berturut-turut adalah 3 dan 1800. Pernyataan berikut yang benar adalah ...
A. x kelipatan 5
B. x kelipatan 72
C. x adalah genap
D. x adalah faktor dari 3
E. x kelipatan 7
Kunci: A
Pembahasan: 72 * x = 3 * 1800 = 5400, maka x = 75 (kelipatan 5).`}
                  className="w-full bg-[#f7f7f8] border border-[#D5D5D5] rounded-2xl p-3.5 text-xs text-zinc-900 font-mono focus:outline-none focus:border-[#646464] leading-relaxed"
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-zinc-500">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      Pecahan seperti <code className="bg-zinc-100 px-1 py-0.5 rounded font-bold">2013/7000</code> otomatis diubah menjadi pecahan tegak KaTeX <code className="bg-zinc-100 px-1 py-0.5 rounded font-bold">$\frac{'{2013}{7000}'}$</code>.
                    </span>
                  </div>
                  <span className="font-mono text-zinc-400">
                    {pastedText.length} karakter
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleProcessPastedText}
                  disabled={!pastedText.trim()}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#646464] hover:bg-[#525252] disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
                >
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Proses & Pratinjau Naskah Soal</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 1B: FILE UPLOAD TAB */}
          {parsedQuestions.length === 0 && !isLoading && activeTab === 'file_upload' && (
            <div className="space-y-4">
              {/* Category Selector */}
              <div className="bg-[#f7f7f8] border border-[#D5D5D5] rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="text-xs font-bold text-zinc-900 shrink-0">
                  Target Jenjang Soal:
                </label>
                <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setTargetCategory('SMP')}
                    className={`py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      targetCategory === 'SMP'
                        ? 'bg-[#646464] text-white border-[#646464] shadow-xs'
                        : 'bg-white text-zinc-700 border-[#D5D5D5] hover:bg-zinc-50'
                    }`}
                  >
                    <span>Jenjang SMP</span>
                    {targetCategory === 'SMP' && <Check className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetCategory('SMA')}
                    className={`py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      targetCategory === 'SMA'
                        ? 'bg-[#646464] text-white border-[#646464] shadow-xs'
                        : 'bg-white text-zinc-700 border-[#D5D5D5] hover:bg-zinc-50'
                    }`}
                  >
                    <span>Jenjang SMA</span>
                    {targetCategory === 'SMA' && <Check className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Drag-and-drop zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center transition-all cursor-pointer ${
                  isDragging
                    ? 'border-[#646464] bg-zinc-100'
                    : selectedFile
                    ? 'border-emerald-500 bg-emerald-50/40'
                    : 'border-[#D5D5D5] bg-[#fafafa] hover:border-[#646464] hover:bg-zinc-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-2xl bg-white border border-[#D5D5D5] flex items-center justify-center mx-auto mb-3 text-[#646464] shadow-xs">
                  {selectedFile ? (
                    <FileText className="w-7 h-7 text-emerald-600" />
                  ) : (
                    <UploadCloud className="w-7 h-7 text-[#646464]" />
                  )}
                </div>

                {selectedFile ? (
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 truncate max-w-md mx-auto">
                      {selectedFile.name}
                    </h4>
                    <p className="text-xs text-emerald-700 font-mono mt-1">
                      {(selectedFile.size / 1024).toFixed(1)} KB · Berkas Microsoft Word siap diproses
                    </p>
                    <span className="inline-block mt-3 px-3 py-1 bg-white border border-emerald-300 rounded-lg text-[11px] text-emerald-800 font-semibold shadow-2xs">
                      Klik tombol "Mulai Ekstraksi Berkas Word" di bawah
                    </span>
                  </div>
                ) : (
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900">
                      Tarik & Letakkan Berkas Word (.docx) di sini
                    </h4>
                    <p className="text-xs text-zinc-500 mt-1">
                      atau <span className="text-[#646464] font-semibold underline">klik untuk memilih berkas dari komputer</span>
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-2 font-mono">
                      Maksimal ukuran berkas 15 MB · Format wajib .docx
                    </p>
                  </div>
                )}
              </div>

              {/* Action Button */}
              {selectedFile && (
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleProcessFile}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#646464] hover:bg-[#525252] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Mulai Ekstraksi Berkas Word</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Loading Indicator */}
          {isLoading && (
            <div className="py-12 sm:py-16 text-center space-y-6">
              <div className="relative w-20 h-20 mx-auto">
                <div className="w-20 h-20 rounded-full border-4 border-zinc-200 border-t-[#646464] animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-[#646464] animate-pulse" />
                </div>
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <h4 className="text-base font-bold text-zinc-900">
                  {loadingStep === 1
                    ? '1. Menyiapkan Naskah & Membedah Butir Soal...'
                    : loadingStep === 2
                    ? '2. Mengonversi Notasi Pecahan & Formula KaTeX...'
                    : '3. Memvalidasi Format Opsi Jawaban & Pembahasan...'}
                </h4>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Sistem sedang memproses nomor soal, opsi jawaban A–E, dan mengubah pecahan menjadi notasi KaTeX yang rapi.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: Preview Questions & KaTeX Rendering */}
          {parsedQuestions.length > 0 && !isLoading && (
            <div className="space-y-4">
              {/* Summary Bar */}
              <div className="bg-[#f7f7f8] border border-[#D5D5D5] rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                    {parsedQuestions.length}
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-zinc-900">
                      {parsedQuestions.length} Butir Soal Siap Diimpor
                    </h4>
                    <p className="text-[11px] text-zinc-500">
                      Jenjang: <strong className="text-zinc-800">{targetCategory}</strong> · Rumus KaTeX sudah berformat rapi. Anda juga dapat melampirkan tangkapan layar (SS) jika terdapat grafik/geometri.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCleanAllImported}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    title="Bersihkan duplikasi simbol persamaan KaTeX dan shadow text di seluruh butir soal"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Bersihkan Simbol Dobel</span>
                  </button>

                  {/* Save Mode Selector */}
                  <div className="flex items-center gap-1 bg-white border border-[#D5D5D5] p-1 rounded-xl text-xs">
                    <button
                      type="button"
                      onClick={() => setSaveMode('append')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                        saveMode === 'append'
                          ? 'bg-[#646464] text-white shadow-2xs'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      Tambahkan ke Bank Soal
                    </button>
                    <button
                      type="button"
                      onClick={() => setSaveMode('replace')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                        saveMode === 'replace'
                          ? 'bg-rose-700 text-white shadow-2xs'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      Gantikan Seluruh Soal
                    </button>
                  </div>
                </div>
              </div>

              {/* Questions List with KaTeX */}
              <div className="space-y-4 max-h-[52vh] overflow-y-auto pr-1">
                {parsedQuestions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    onPaste={(e) => handlePasteScreenshotOnQuestion(idx, e)}
                    className="bg-white border border-[#D5D5D5] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3 relative group"
                  >
                    {/* Top Question Badges & Delete */}
                    <div className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-6 h-6 rounded-lg bg-zinc-900 text-white font-bold text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200">
                          {q.domain}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200">
                          {q.category}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Kunci: {q.correctAnswer}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          +{q.points.correct} / {q.points.wrong} / {q.points.blank}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Attach screenshot button */}
                        <label
                          className="p-1.5 text-zinc-500 hover:text-zinc-800 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-medium"
                          title="Lampirkan Tangkapan Layar (SS) dari Snipping Tool (Win+Shift+S lalu Ctrl+V)"
                        >
                          <Camera className="w-3.5 h-3.5 text-[#646464]" />
                          <span className="hidden sm:inline">SS / Gambar</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleAttachImageToQuestion(idx, e.target.files?.[0])}
                            className="hidden"
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => setEditingIndex(editingIndex === idx ? null : idx)}
                          className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors"
                          title="Edit Soal"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(idx)}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Hapus Butir Soal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Question Content View */}
                    {editingIndex !== idx ? (
                      <div className="space-y-3">
                        {/* Question Text with KaTeX */}
                        <div className="text-xs sm:text-sm text-zinc-900 leading-relaxed font-sans">
                          <MathRenderer content={q.text} />
                        </div>

                        {/* Optional Attached Screenshot / Diagram */}
                        {q.imageUrl && (
                          <div className="relative inline-block bg-white border border-zinc-200 rounded-xl p-1.5 max-w-sm">
                            <img
                              src={q.imageUrl}
                              alt={`Diagram / Tangkapan Layar Soal ${idx + 1}`}
                              className="max-h-48 object-contain rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateQuestionField(idx, 'imageUrl', undefined)}
                              className="absolute top-2 right-2 bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-full shadow-xs cursor-pointer"
                              title="Hapus Gambar"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        {/* Options Grid with KaTeX */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {q.options?.map((opt) => {
                            const isCorrect = opt.id === q.correctAnswer;
                            return (
                              <div
                                key={opt.id}
                                className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                                  isCorrect
                                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-medium'
                                    : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                                }`}
                              >
                                <span
                                  className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[11px] shrink-0 ${
                                    isCorrect
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-white border border-zinc-300 text-zinc-700'
                                  }`}
                                >
                                  {opt.id}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <MathRenderer content={opt.text} />
                                </div>
                                {isCorrect && (
                                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Explanation with KaTeX */}
                        {q.explanation && (
                          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-[11px] text-zinc-700 leading-relaxed">
                            <strong className="text-zinc-900 font-semibold block mb-0.5">
                              Pembahasan KaTeX:
                            </strong>
                            <MathRenderer content={q.explanation} />
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Inline Edit Form */
                      <div className="space-y-3 bg-[#fafafa] p-3 rounded-xl border border-[#D5D5D5] text-xs">
                        <div>
                          <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                            Teks Soal (Gunakan $...$ untuk KaTeX):
                          </label>
                          <textarea
                            value={q.text}
                            onChange={(e) => handleUpdateQuestionField(idx, 'text', e.target.value)}
                            rows={3}
                            className="w-full bg-white border border-zinc-300 rounded-xl p-2 text-xs text-zinc-900 focus:outline-none focus:border-[#646464] font-mono"
                          />
                        </div>

                        {/* Image upload in inline edit */}
                        <div>
                          <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                            Gambar / Tangkapan Layar Soal (SS):
                          </label>
                          {q.imageUrl ? (
                            <div className="flex items-center gap-3 bg-white p-2 border border-zinc-200 rounded-xl">
                              <img
                                src={q.imageUrl}
                                alt="SS Soal"
                                className="max-h-20 object-contain rounded-lg"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateQuestionField(idx, 'imageUrl', undefined)}
                                className="text-xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                              >
                                Hapus Gambar
                              </button>
                            </div>
                          ) : (
                            <label className="border border-dashed border-zinc-300 hover:border-zinc-500 rounded-xl p-2.5 flex items-center justify-center gap-2 cursor-pointer bg-white text-zinc-600 text-[11px]">
                              <Camera className="w-3.5 h-3.5" />
                              <span>Pilih berkas gambar atau tekan Ctrl+V saat menyorot kartu soal</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleAttachImageToQuestion(idx, e.target.files?.[0])}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                              Domain Matematika:
                            </label>
                            <select
                              value={q.domain}
                              onChange={(e) =>
                                handleUpdateQuestionField(idx, 'domain', e.target.value as MathDomain)
                              }
                              className="w-full bg-white border border-zinc-300 rounded-xl px-2.5 py-1.5 text-xs text-zinc-900"
                            >
                              <option value="Aljabar">Aljabar</option>
                              <option value="Geometri">Geometri</option>
                              <option value="Kombinatorika">Kombinatorika</option>
                              <option value="Teori Bilangan">Teori Bilangan</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                              Kunci Jawaban:
                            </label>
                            <select
                              value={q.correctAnswer}
                              onChange={(e) => handleUpdateQuestionField(idx, 'correctAnswer', e.target.value)}
                              className="w-full bg-white border border-zinc-300 rounded-xl px-2.5 py-1.5 text-xs text-zinc-900 font-bold"
                            >
                              {q.options?.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                  Opsi {opt.id}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Options Text Edit */}
                        <div className="space-y-1.5 pt-1">
                          <label className="block text-[11px] font-bold text-zinc-700">
                            Pilihan Opsi A s.d. E:
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {q.options?.map((opt, optIdx) => (
                              <div key={opt.id} className="flex items-center gap-1.5">
                                <span className="w-5 text-center font-bold text-zinc-600 text-xs">
                                  {opt.id}.
                                </span>
                                <input
                                  type="text"
                                  value={opt.text}
                                  onChange={(e) => {
                                    const updatedOptions = [...(q.options || [])];
                                    updatedOptions[optIdx] = { ...opt, text: e.target.value };
                                    handleUpdateQuestionField(idx, 'options', updatedOptions);
                                  }}
                                  className="flex-1 bg-white border border-zinc-300 rounded-lg px-2 py-1 text-xs text-zinc-900 font-mono"
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                            Pembahasan (KaTeX $...$):
                          </label>
                          <textarea
                            value={q.explanation}
                            onChange={(e) => handleUpdateQuestionField(idx, 'explanation', e.target.value)}
                            rows={2}
                            className="w-full bg-white border border-zinc-300 rounded-xl p-2 text-xs text-zinc-900 focus:outline-none focus:border-[#646464]"
                          />
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingIndex(null)}
                            className="px-3 py-1 bg-[#646464] text-white rounded-lg text-xs font-semibold"
                          >
                            Selesai Mengedit
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Bottom Commit Bar */}
              <div className="pt-3 border-t border-[#D5D5D5] flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setParsedQuestions([]);
                    setSelectedFile(null);
                    setSuccessInfo(null);
                  }}
                  disabled={isSaving}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold transition-colors cursor-pointer border border-zinc-300"
                >
                  Batal / Kembali ke Input
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleSaveToBank}
                    disabled={isSaving || parsedQuestions.length === 0}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-[#646464] hover:bg-[#525252] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Menyimpan ke Bank Soal...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>
                          {saveMode === 'append'
                            ? `Tambahkan ${parsedQuestions.length} Soal ke Bank Ujian`
                            : `Gantikan Seluruh Bank Soal (${parsedQuestions.length} Soal)`}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
