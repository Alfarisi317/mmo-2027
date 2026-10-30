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
  Code2,
} from 'lucide-react';
import { Question, OlympiadCategory, MathDomain } from '../types';
import { MathRenderer } from './MathRenderer';
import { ApiService } from '../services/api';

interface WordImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onQuestionsImported: (importedQuestions: Question[], mode: 'append' | 'replace') => void;
  initialCategory?: OlympiadCategory;
}

export const WordImporter: React.FC<WordImporterProps> = ({
  isOpen,
  onClose,
  onQuestionsImported,
  initialCategory = 'SMA',
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetCategory, setTargetCategory] = useState<OlympiadCategory>(initialCategory);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<number>(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Preview state
  const [parsedQuestions, setParsedQuestions] = useState<Question[]>([]);
  const [saveMode, setSaveMode] = useState<'append' | 'replace'>('append');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleProcessFile = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setErrorMessage(null);
    setLoadingStep(1);

    // Simulated progress steps for better user feedback
    const stepTimer1 = setTimeout(() => setLoadingStep(2), 1200);
    const stepTimer2 = setTimeout(() => setLoadingStep(3), 3200);

    try {
      const result = await ApiService.uploadWordQuestions(selectedFile, targetCategory);

      if (result.success && Array.isArray(result.questions) && result.questions.length > 0) {
        setParsedQuestions(result.questions);
      } else {
        setErrorMessage(
          result.error ||
            'AI tidak berhasil menemukan naskah soal matematika yang dapat dikenali. Pastikan berkas .docx memuat nomor soal dan opsi jawaban yang jelas.'
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Terjadi gangguan jaringan saat menghubungi server pemroses Word.');
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

  const handleUpdateQuestionField = (index: number, field: keyof Question, value: any) => {
    setParsedQuestions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleDownloadSampleText = () => {
    const sampleGuide = `CONTOH FORMAT PENULISAN NASKAH SOAL MATEMATIKA MMO 2027 (.DOCX)
===================================================================

Petunjuk Panitia:
- Simpan dokumen dalam format Microsoft Word (.docx).
- Rumus matematika dapat ditulis menggunakan simbol biasa (contoh: x^2 - 4x + 3 = 0, sqrt(2), a/b) atau persamaan Word. AI otomatis mengonversi ke KaTeX LaTeX ($...$).
- Tuliskan nomor soal, diikuti teks soal.
- Tuliskan opsi A, B, C, D, E pada baris terpisah atau urut.
- Sertakan "Kunci: [A/B/C/D/E]" dan "Pembahasan: [...]" di bawah setiap nomor soal (opsional, jika tidak ada AI akan menghitung kunci yang benar).

-------------------------------------------------------------------
CONTOH BUTIR SOAL 1:
1. Diketahui fungsi kuadrat f(x) = x^2 - 6x + 8. Nilai minimum dari fungsi f(x) adalah...
A. -2
B. -1
C. 0
D. 1
E. 8
Kunci: B
Pembahasan: Sumbu simetri x = -b/(2a) = -(-6)/(2*1) = 3. Nilai minimum f(3) = 3^2 - 6(3) + 8 = 9 - 18 + 8 = -1.

CONTOH BUTIR SOAL 2 (GEOMETRI):
2. Pada segitiga ABC siku-siku di B, panjang sisi AB = 6 cm dan BC = 8 cm. Jika D adalah titik tengah AC, maka panjang ruas garis BD adalah...
A. 4 cm
B. 5 cm
C. 7 cm
D. 10 cm
E. 12 cm
Kunci: B
Pembahasan: Panjang sisi miring AC = sqrt(6^2 + 8^2) = 10 cm. Ruas garis berat dari sudut siku-siku BD = 1/2 * AC = 5 cm.

CONTOH BUTIR SOAL 3 (KOMBINATORIKA & TEORI BILANGAN):
3. Banyaknya bilangan bulat positif n < 1000 sehingga n habis dibagi 3 atau 5 tetapi tidak habis dibagi 15 adalah...
A. 400
B. 466
C. 533
D. 399
E. 467
Kunci: D
Pembahasan: Gunakan prinsip inklusi-eksklusi. Banyak kelipatan 3: floor(999/3) = 333. Banyak kelipatan 5: floor(999/5) = 199. Kelipatan 15: floor(999/15) = 66. Total = 333 + 199 - 2*(66) = 400.
===================================================================
`;

    const blob = new Blob([sampleGuide], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Panduan_Format_Naskah_Soal_MMO_2027.txt`;
    link.click();
    URL.revokeObjectURL(url);
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
                  Impor Soal dari Microsoft Word (.docx)
                </h3>
                <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  AI KaTeX LaTeX
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-zinc-500">
                Ekstrak naskah soal Word dan ubah otomatis semua rumus & simbol matematika ke KaTeX ($...$).
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

        {/* Content Body */}
        <div className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-6">
          {/* Error Banner */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 flex items-start gap-3 text-rose-900 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold">Gagal Memproses:</span> {errorMessage}
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-rose-500 hover:text-rose-700 text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          )}

          {/* STEP 1: Upload & Configuration (When no questions parsed yet and not loading) */}
          {parsedQuestions.length === 0 && !isLoading && (
            <div className="space-y-5">
              {/* Category Selector */}
              <div className="bg-[#f7f7f8] border border-[#D5D5D5] rounded-2xl p-4">
                <label className="block text-xs font-bold text-zinc-900 mb-2">
                  1. Pilih Kategori Jenjang Soal:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTargetCategory('SMP')}
                    className={`py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                      targetCategory === 'SMP'
                        ? 'bg-[#646464] text-white border-[#646464] shadow-xs'
                        : 'bg-white text-zinc-700 border-[#D5D5D5] hover:bg-zinc-50'
                    }`}
                  >
                    <span>Jenjang SMP / MTs</span>
                    {targetCategory === 'SMP' && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetCategory('SMA')}
                    className={`py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                      targetCategory === 'SMA'
                        ? 'bg-[#646464] text-white border-[#646464] shadow-xs'
                        : 'bg-white text-zinc-700 border-[#D5D5D5] hover:bg-zinc-50'
                    }`}
                  >
                    <span>Jenjang SMA / SMK / MA</span>
                    {targetCategory === 'SMA' && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
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
                      Klik tombol "Mulai Ekstraksi & Konversi KaTeX" di bawah
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

              {/* Guidelines & Download Format Template */}
              <div className="bg-zinc-50 border border-[#D5D5D5] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <HelpCircle className="w-4 h-4 text-[#646464] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-zinc-900 block">Panduan Format Penulisan Naskah Soal:</span>
                    <p className="text-zinc-600 text-[11px] leading-relaxed">
                      Tulis nomor soal, teks pertanyaan, opsi A–E, serta Kunci & Pembahasan. AI Gemini otomatis mendeteksi pecahan, eksponen, akar, dan rumus KaTeX.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadSampleText}
                  className="shrink-0 px-3 py-1.5 bg-white hover:bg-zinc-100 border border-[#D5D5D5] text-zinc-800 rounded-xl font-semibold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 text-[#646464]" />
                  <span>Unduh Contoh Format (.txt)</span>
                </button>
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
                    <span>Mulai Ekstraksi & Konversi KaTeX AI</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Loading Indicator with Animated Step Progress */}
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
                    ? '1. Mengekstrak Teks Naskah Word (.docx)...'
                    : loadingStep === 2
                    ? '2. Membedah Nomor Soal & Kunci dengan Google Gemini AI...'
                    : '3. Mengonversi Simbol & Rumus Matematika ke KaTeX LaTeX ($...$)...'}
                </h4>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Mohon tunggu beberapa detik. Sistem sedang mengekstrak butir soal, menganalisis opsi jawaban, dan memastikan format KaTeX LaTeX siap dirender.
                </p>
              </div>

              {/* Visual Progress Steps */}
              <div className="max-w-sm mx-auto bg-zinc-50 border border-[#D5D5D5] rounded-2xl p-3 text-left space-y-2 text-xs">
                <div className="flex items-center gap-2 font-mono">
                  {loadingStep >= 1 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <RefreshCw className="w-4 h-4 text-zinc-400 animate-spin shrink-0" />
                  )}
                  <span className={loadingStep >= 1 ? 'text-zinc-900 font-semibold' : 'text-zinc-400'}>
                    Ekstraksi berkas Word mammoth
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  {loadingStep >= 2 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <RefreshCw className="w-4 h-4 text-zinc-400 animate-spin shrink-0" />
                  )}
                  <span className={loadingStep >= 2 ? 'text-zinc-900 font-semibold' : 'text-zinc-400'}>
                    Parsing struktur JSON array via Gemini AI
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  {loadingStep >= 3 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <RefreshCw className="w-4 h-4 text-zinc-400 animate-spin shrink-0" />
                  )}
                  <span className={loadingStep >= 3 ? 'text-zinc-900 font-semibold' : 'text-zinc-400'}>
                    Konversi rumus KaTeX LaTeX ($...$)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Preview Questions & KaTeX Rendering */}
          {parsedQuestions.length > 0 && !isLoading && (
            <div className="space-y-5">
              {/* Summary Bar */}
              <div className="bg-[#f7f7f8] border border-[#D5D5D5] rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                    {parsedQuestions.length}
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-zinc-900">
                      {parsedQuestions.length} Butir Soal Berhasil Dikonversi
                    </h4>
                    <p className="text-[11px] text-zinc-500">
                      Jenjang: <strong className="text-zinc-800">{targetCategory}</strong> · Periksa render rumus KaTeX di bawah sebelum disimpan ke bank soal.
                    </p>
                  </div>
                </div>

                {/* Save Mode Selector (Append vs Replace) */}
                <div className="flex items-center gap-2 bg-white border border-[#D5D5D5] p-1 rounded-xl text-xs">
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

              {/* Questions List with KaTeX */}
              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                {parsedQuestions.map((q, idx) => (
                  <div
                    key={q.id || idx}
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

                        {/* Optional Formula Preview */}
                        {q.formulaLatex && (
                          <div className="bg-[#f7f7f8] border border-[#D5D5D5] rounded-xl p-2.5 text-center text-xs overflow-x-auto">
                            <MathRenderer content={`$$${q.formulaLatex}$$`} />
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
                  }}
                  disabled={isSaving}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold transition-colors cursor-pointer border border-zinc-300"
                >
                  Batal / Unggah Berkas Lain
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
