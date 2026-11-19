import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  CheckCircle2,
  Image as ImageIcon,
  Plus,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import {
  CompetitionStage,
  MathDomain,
  OlympiadCategory,
  Question,
  QuestionOption,
  QuestionType,
} from '../types/index';
import { MathRenderer } from './MathRenderer';
import { MathFormulaToolbar } from './MathFormulaToolbar';
import { sanitizeMathString } from '../utils/mathSanitizer';

interface QuestionEditorModalProps {
  isOpen: boolean;
  initialQuestion: Question | null; // null = create new question
  defaultCategory?: OlympiadCategory;
  defaultStage?: CompetitionStage;
  nextQuestionNumber?: number;
  onClose: () => void;
  onSave: (question: Question, isEdit: boolean) => Promise<void>;
}

const DOMAINS: MathDomain[] = ['Aljabar', 'Geometri', 'Kombinatorika', 'Teori Bilangan'];

export const QuestionEditorModal: React.FC<QuestionEditorModalProps> = ({
  isOpen,
  initialQuestion,
  defaultCategory = 'SMA',
  defaultStage = 'Penyisihan',
  nextQuestionNumber = 1,
  onClose,
  onSave,
}) => {
  const [category, setCategory] = useState<OlympiadCategory>(defaultCategory);
  const [stage, setStage] = useState<CompetitionStage>(defaultStage);
  const [domain, setDomain] = useState<MathDomain>('Aljabar');
  const [type, setType] = useState<QuestionType>('multiple_choice');
  const [questionNumber, setQuestionNumber] = useState<number>(nextQuestionNumber);
  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [options, setOptions] = useState<QuestionOption[]>([
    { id: 'A', text: '' },
    { id: 'B', text: '' },
    { id: 'C', text: '' },
    { id: 'D', text: '' },
    { id: 'E', text: '' },
  ]);
  const [correctAnswer, setCorrectAnswer] = useState('A');
  const [explanation, setExplanation] = useState('');
  const [pointsCorrect, setPointsCorrect] = useState(4);
  const [pointsWrong, setPointsWrong] = useState(-1);
  const [pointsBlank, setPointsBlank] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const activeFieldRef = useRef<string>('text');
  const fieldRefs = useRef<Record<string, HTMLTextAreaElement | HTMLInputElement | null>>({});

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (initialQuestion) {
      setCategory(initialQuestion.category);
      setStage(initialQuestion.stage || 'Penyisihan');
      setDomain(initialQuestion.domain);
      setType(initialQuestion.type);
      setQuestionNumber(initialQuestion.questionNumber || 1);
      setText(initialQuestion.text || '');
      setImageUrl(initialQuestion.imageUrl);
      setOptions(
        initialQuestion.options && initialQuestion.options.length > 0
          ? initialQuestion.options.map((o) => ({ ...o }))
          : [
              { id: 'A', text: '' },
              { id: 'B', text: '' },
              { id: 'C', text: '' },
              { id: 'D', text: '' },
              { id: 'E', text: '' },
            ]
      );
      setCorrectAnswer(initialQuestion.correctAnswer || 'A');
      setExplanation(initialQuestion.explanation || '');
      setPointsCorrect(initialQuestion.points?.correct ?? 4);
      setPointsWrong(initialQuestion.points?.wrong ?? -1);
      setPointsBlank(initialQuestion.points?.blank ?? 0);
    } else {
      setCategory(defaultCategory);
      setStage(defaultStage);
      setDomain('Aljabar');
      setType('multiple_choice');
      setQuestionNumber(nextQuestionNumber);
      setText('');
      setImageUrl(undefined);
      setOptions([
        { id: 'A', text: '' },
        { id: 'B', text: '' },
        { id: 'C', text: '' },
        { id: 'D', text: '' },
        { id: 'E', text: '' },
      ]);
      setCorrectAnswer('A');
      setExplanation('');
      setPointsCorrect(4);
      setPointsWrong(-1);
      setPointsBlank(0);
    }
  }, [isOpen, initialQuestion, defaultCategory, defaultStage, nextQuestionNumber]);

  if (!isOpen) return null;

  const handlePasteImage = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          const reader = new FileReader();
          reader.onload = () => setImageUrl(String(reader.result || ''));
          reader.readAsDataURL(file);
          return;
        }
      }
    }
  };

  const handleFileImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setImageUrl(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const handleInsertMathSnippet = (snippet: string) => {
    const fieldKey = activeFieldRef.current || 'text';
    const el = fieldRefs.current[fieldKey];

    const applyAtCaret = (currentVal: string, setter: (next: string) => void) => {
      if (el && typeof el.selectionStart === 'number' && typeof el.selectionEnd === 'number') {
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const nextVal = currentVal.slice(0, start) + snippet + currentVal.slice(end);
        setter(nextVal);
        requestAnimationFrame(() => {
          el.focus();
          const pos = start + snippet.length;
          el.setSelectionRange(pos, pos);
        });
      } else {
        setter(currentVal ? `${currentVal} ${snippet}` : snippet);
      }
    };

    if (fieldKey === 'explanation') {
      applyAtCaret(explanation, setExplanation);
    } else if (fieldKey === 'short') {
      applyAtCaret(correctAnswer, setCorrectAnswer);
    } else if (fieldKey.startsWith('opt_')) {
      const optId = fieldKey.slice(4);
      const currentOpt = options.find((o) => o.id === optId)?.text || '';
      applyAtCaret(currentOpt, (next) =>
        setOptions((prev) => prev.map((o) => (o.id === optId ? { ...o, text: next } : o)))
      );
    } else {
      applyAtCaret(text, setText);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !imageUrl) {
      setError('Teks soal atau gambar soal wajib diisi.');
      return;
    }
    if (type === 'multiple_choice' && !correctAnswer.trim()) {
      setError('Pilih salah satu Kunci Jawaban (A–E).');
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      const resultQuestion: Question = {
        id: initialQuestion?.id || `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        category,
        stage,
        domain,
        type,
        questionNumber: Number(questionNumber) || 1,
        text: sanitizeMathString(text),
        formulaLatex: '',
        imageUrl,
        options:
          type === 'multiple_choice'
            ? options.map((o) => ({ id: o.id, text: sanitizeMathString(o.text) }))
            : undefined,
        correctAnswer: correctAnswer.trim().toUpperCase(),
        explanation: sanitizeMathString(explanation),
        points: {
          correct: Number.isFinite(pointsCorrect) ? pointsCorrect : 4,
          wrong: Number.isFinite(pointsWrong) ? pointsWrong : -1,
          blank: Number.isFinite(pointsBlank) ? pointsBlank : 0,
        },
      };
      await onSave(resultQuestion, Boolean(initialQuestion));
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan perubahan soal.');
    } finally {
      setIsSaving(false);
    }
  };

  const hasE = options.some((o) => o.id === 'E');

  return (
    <div
      className="fixed inset-0 z-50 bg-[#1E3954]/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white border-2 border-[#E49548] rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl text-[#1E3954]"
        onClick={(e) => e.stopPropagation()}
        onPaste={handlePasteImage}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b-2 border-[#E49548] flex items-center justify-between bg-[#2C4B6B] text-white">
          <div>
            <h3 className="text-base font-extrabold text-white">
              {initialQuestion ? `Edit Soal #${initialQuestion.questionNumber}` : 'Tambah Soal Baru'}
            </h3>
            <p className="text-xs text-[#DCE9F5] mt-0.5">
              Mendukung penulisan rumus KaTeX ($...$) serta tempel screenshot gambar diagram (Ctrl+V).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white bg-[#243E59] hover:bg-[#3B5F84] border border-[#4E779F] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Metadata Row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <label className="text-[11px] font-bold text-[#2C4B6B] block mb-1">No. Soal</label>
              <input
                type="number"
                min={1}
                value={questionNumber}
                onChange={(e) => setQuestionNumber(Number(e.target.value))}
                className="w-full bg-[#FAF3E3]/50 border border-[#B8CCE0] rounded-xl px-3 py-2 text-xs font-mono tabular-nums text-[#1E3954] focus:outline-none focus:border-[#E49548] focus:bg-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#2C4B6B] block mb-1">Jenjang</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as OlympiadCategory)}
                className="w-full bg-[#FAF3E3]/50 border border-[#B8CCE0] rounded-xl px-3 py-2 text-xs font-semibold text-[#1E3954] focus:outline-none focus:border-[#E49548] focus:bg-white"
              >
                <option value="SMP">SMP</option>
                <option value="SMA">SMA</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#2C4B6B] block mb-1">Babak</label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as CompetitionStage)}
                className="w-full bg-[#FAF3E3]/50 border border-[#B8CCE0] rounded-xl px-3 py-2 text-xs font-semibold text-[#1E3954] focus:outline-none focus:border-[#E49548] focus:bg-white"
              >
                <option value="Penyisihan">Penyisihan</option>
                <option value="Semifinal">Semifinal</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#2C4B6B] block mb-1">Domain Materi</label>
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value as MathDomain)}
                className="w-full bg-[#FAF3E3]/50 border border-[#B8CCE0] rounded-xl px-3 py-2 text-xs font-semibold text-[#1E3954] focus:outline-none focus:border-[#E49548] focus:bg-white"
              >
                {DOMAINS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#2C4B6B] block mb-1">Tipe</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as QuestionType)}
                className="w-full bg-[#FAF3E3]/50 border border-[#B8CCE0] rounded-xl px-3 py-2 text-xs font-semibold text-[#1E3954] focus:outline-none focus:border-[#E49548] focus:bg-white"
              >
                <option value="multiple_choice">Pilihan Ganda</option>
                <option value="short_answer">Isian Singkat</option>
              </select>
            </div>
          </div>

          {/* Main 2-Col Split: Editor & Live Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 space-y-4">
              <MathFormulaToolbar onInsert={handleInsertMathSnippet} />

              <div>
                <label className="text-[11px] font-bold text-[#2C4B6B] block mb-1">
                  Teks Soal (Gunakan $$...$$ atau $...$ untuk rumus KaTeX)
                </label>
                <textarea
                  ref={(el) => {
                    fieldRefs.current['text'] = el;
                  }}
                  onFocus={() => {
                    activeFieldRef.current = 'text';
                  }}
                  rows={4}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Tulis teks soal dan rumus, misal: Tentukan nilai $$ \frac{a+b}{2} $$..."
                  className="w-full bg-[#FAF3E3]/40 border border-[#B8CCE0] rounded-xl p-3 text-xs font-mono text-[#1E3954] focus:outline-none focus:border-[#E49548] focus:bg-white"
                />
              </div>

              {/* Image attachment */}
              <div className="flex flex-wrap items-center gap-2">
                <label className="px-3 py-1.5 rounded-xl bg-[#FAF3E3] border border-[#E49548]/60 hover:bg-[#F4E6CC] text-xs font-semibold text-[#1E3954] flex items-center gap-1.5 cursor-pointer">
                  <ImageIcon className="w-3.5 h-3.5 text-[#2C4B6B]" />
                  <span>{imageUrl ? 'Ganti Gambar Diagram' : 'Unggah Gambar / Paste Ctrl+V'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileImage(f);
                      e.target.value = '';
                    }}
                  />
                </label>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl(undefined)}
                    className="px-2.5 py-1.5 rounded-xl text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Gambar</span>
                  </button>
                )}
              </div>

              {type === 'multiple_choice' ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-[#2C4B6B]">
                      Pilihan Jawaban &amp; Klik Huruf untuk Kunci
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (hasE) {
                          setOptions((prev) => prev.filter((o) => o.id !== 'E'));
                          if (correctAnswer === 'E') setCorrectAnswer('A');
                        } else {
                          setOptions((prev) => [...prev, { id: 'E', text: '' }]);
                        }
                      }}
                      className="text-[11px] font-semibold text-[#2C4B6B] hover:text-[#CE7D30] flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{hasE ? 'Hapus Opsi E (Pakai A–D)' : 'Tambah Opsi E'}</span>
                    </button>
                  </div>

                  {options.map((opt) => {
                    const isKey = correctAnswer.toUpperCase() === opt.id.toUpperCase();
                    return (
                      <div key={opt.id} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCorrectAnswer(opt.id)}
                          className={`w-9 h-9 rounded-xl font-mono text-xs font-bold border shrink-0 transition-colors cursor-pointer ${
                            isKey
                              ? 'bg-emerald-700 text-white border-emerald-700'
                              : 'bg-[#FAF3E3] text-[#1E3954] border-[#B8CCE0] hover:border-[#E49548]'
                          }`}
                          title={`Jadikan ${opt.id} Kunci Jawaban`}
                        >
                          {opt.id}
                        </button>
                        <input
                          ref={(el) => {
                            fieldRefs.current[`opt_${opt.id}`] = el;
                          }}
                          onFocus={() => {
                            activeFieldRef.current = `opt_${opt.id}`;
                          }}
                          type="text"
                          value={opt.text}
                          onChange={(e) =>
                            setOptions((prev) =>
                              prev.map((o) => (o.id === opt.id ? { ...o, text: e.target.value } : o))
                            )
                          }
                          placeholder={`Opsi ${opt.id}...`}
                          className="flex-1 bg-[#FAF3E3]/40 border border-[#B8CCE0] rounded-xl px-3 py-2 text-xs font-mono text-[#1E3954] focus:outline-none focus:border-[#E49548] focus:bg-white"
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div>
                  <label className="text-[11px] font-bold text-[#2C4B6B] block mb-1">
                    Kunci Jawaban Isian Singkat
                  </label>
                  <input
                    ref={(el) => {
                      fieldRefs.current['short'] = el;
                    }}
                    onFocus={() => {
                      activeFieldRef.current = 'short';
                    }}
                    type="text"
                    value={correctAnswer}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                    placeholder="Masukkan jawaban pasti..."
                    className="w-full bg-[#FAF3E3]/40 border border-[#B8CCE0] rounded-xl px-3 py-2 text-xs font-mono text-[#1E3954] focus:outline-none focus:border-[#E49548] focus:bg-white"
                  />
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-[#2C4B6B] block mb-1">
                  Pembahasan (Opsional)
                </label>
                <textarea
                  ref={(el) => {
                    fieldRefs.current['explanation'] = el;
                  }}
                  onFocus={() => {
                    activeFieldRef.current = 'explanation';
                  }}
                  rows={2}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Langkah penyelesaian atau catatan kunci..."
                  className="w-full bg-[#FAF3E3]/40 border border-[#B8CCE0] rounded-xl p-2.5 text-xs font-mono text-[#1E3954] focus:outline-none focus:border-[#E49548] focus:bg-white"
                />
              </div>
            </div>

            {/* Right: Live KaTeX Preview */}
            <div className="lg:col-span-5 bg-[#FAF3E3] border-2 border-[#E49548]/60 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-[11px] text-[#4E779F] pb-2 border-b border-[#E49548]/40">
                <span className="font-extrabold text-[#1E3954]">Pratinjau Live (KaTeX)</span>
                <span className="font-mono">
                  Kunci: <strong className="text-emerald-700">{correctAnswer || '-'}</strong>
                </span>
              </div>

              {imageUrl && (
                <div className="bg-white border border-[#B8CCE0] rounded-xl p-2 flex justify-center">
                  <img src={imageUrl} alt="Pratinjau gambar soal" className="max-h-44 object-contain rounded" />
                </div>
              )}

              <div className="text-sm text-[#1E3954] leading-relaxed bg-white border border-[#B8CCE0] rounded-xl p-3">
                <MathRenderer content={text || '(Pratinjau teks soal akan tampil di sini)'} />
              </div>

              {type === 'multiple_choice' && (
                <div className="space-y-1.5">
                  {options.map((opt) => {
                    const isKey = correctAnswer.toUpperCase() === opt.id.toUpperCase();
                    return (
                      <div
                        key={opt.id}
                        className={`px-3 py-2 rounded-xl border text-xs flex items-start gap-2 ${
                          isKey
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-medium'
                            : 'bg-white border-[#B8CCE0] text-[#1E3954]'
                        }`}
                      >
                        <span className={`font-mono font-bold ${isKey ? 'text-emerald-700' : 'text-[#4E779F]'}`}>
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

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-[#EBF1F6] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#B8CCE0] bg-[#FAF3E3] hover:bg-[#F4E6CC] text-xs font-bold text-[#1E3954] cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-[#E49548] hover:bg-[#CE7D30] disabled:opacity-50 text-[#1E3954] text-xs font-extrabold flex items-center gap-2 cursor-pointer border border-[#CE7D30]"
            >
              <CheckCircle2 className="w-4 h-4 text-[#1E3954]" />
              <span>{isSaving ? 'Menyimpan...' : initialQuestion ? 'Simpan Perubahan' : 'Tambahkan Soal'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
