import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Check,
  Eye,
  Edit3,
  HelpCircle,
  PlusCircle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import {
  Question,
  OlympiadCategory,
  MathDomain,
  CompetitionStage,
  QuestionType,
} from '../types';
import { MathRenderer } from './MathRenderer';

interface QuickQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  question?: Question | null;
  onSave: (questionData: Question) => Promise<void> | void;
  defaultCategory?: OlympiadCategory;
}

// Client-side scrubber to deduplicate equation shadow text immediately in modal
function cleanDuplicatesHelper(str: string): string {
  if (!str) return '';
  let s = str;

  // Deduplicate adjacent identical lines
  const lines = s.split('\n');
  const uniqueLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const cur = lines[i];
    const prev = uniqueLines.length > 0 ? uniqueLines[uniqueLines.length - 1] : null;
    if (prev !== null && cur.trim() && cur.trim() === prev.trim()) {
      continue;
    }
    uniqueLines.push(cur);
  }
  s = uniqueLines.join('\n');

  // Shadow variables right after math: $x$ x -> $x$
  s = s.replace(/\$([a-zA-Z])\$\s*\1(?![a-zA-Z0-9])/gi, '$$$1$$ ');
  // Shadow numbers right after math: $1$ 1 -> $1$
  s = s.replace(/\$([0-9]+)\$\s*\1(?![0-9])/g, '$$$1$$');
  // Doubled single letters: xx kelipatan -> x kelipatan
  s = s.replace(/^([a-zA-Z])\1\s+/gm, '$1 ');
  s = s.replace(/\b([a-zA-Z])\1(?=\s+(?:kelipatan|berturut|adalah|faktor|merupakan|bilangan|positif|bulat|pecahan|ganjil|genap|prima|\+|\-|\*|\/|=|<|>|≤|≥))/gi, '$1');

  // Generic equation shadow
  s = s.replace(/\$([^$]+)\$\s*([^$\n]+)/g, (fullMatch, formula, followingText) => {
    const normFormula = formula.replace(/\s+/g, '').replace(/\\times/g, '×').replace(/\\div/g, '÷');
    const normFollowing = followingText.replace(/\s+/g, '');
    if (normFormula.length >= 3 && normFollowing.startsWith(normFormula)) {
      const rest = followingText.trim().substring(formula.trim().length).trim();
      return `$$${formula}$$ ${rest}`.trim();
    }
    return fullMatch;
  });

  return s
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+([.,;:?!])/g, '$1')
    .trim();
}

export const QuickQuestionModal: React.FC<QuickQuestionModalProps> = ({
  isOpen,
  onClose,
  question,
  onSave,
  defaultCategory = 'SMP',
}) => {
  const isEditing = Boolean(question && question.id);

  const [category, setCategory] = useState<OlympiadCategory>(
    question?.category || defaultCategory
  );
  const [stage, setStage] = useState<CompetitionStage>(question?.stage || 'Penyisihan');
  const [domain, setDomain] = useState<MathDomain>(question?.domain || 'Aljabar');
  const [type, setType] = useState<QuestionType>(question?.type || 'multiple_choice');
  const [questionNumber, setQuestionNumber] = useState<number>(question?.questionNumber || 1);
  const [text, setText] = useState<string>(question?.text || '');
  const [options, setOptions] = useState<{ id: string; text: string }[]>(() => {
    if (question?.options && question.options.length > 0) {
      return question.options;
    }
    return [
      { id: 'A', text: '' },
      { id: 'B', text: '' },
      { id: 'C', text: '' },
      { id: 'D', text: '' },
      { id: 'E', text: '' },
    ];
  });
  const [correctAnswer, setCorrectAnswer] = useState<string>(question?.correctAnswer || 'A');
  const [explanation, setExplanation] = useState<string>(question?.explanation || '');
  const [points, setPoints] = useState<{ correct: number; wrong: number; blank: number }>(() => {
    return question?.points || { correct: 4, wrong: -1, blank: 0 };
  });

  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [cleanFeedback, setCleanFeedback] = useState<string | null>(null);

  // Sync state when editing a new question
  useEffect(() => {
    if (question) {
      setCategory(question.category || defaultCategory);
      setStage(question.stage || 'Penyisihan');
      setDomain(question.domain || 'Aljabar');
      setType(question.type || 'multiple_choice');
      setQuestionNumber(question.questionNumber || 1);
      setText(question.text || '');
      setOptions(
        question.options && question.options.length > 0
          ? question.options
          : [
              { id: 'A', text: '' },
              { id: 'B', text: '' },
              { id: 'C', text: '' },
              { id: 'D', text: '' },
              { id: 'E', text: '' },
            ]
      );
      setCorrectAnswer(question.correctAnswer || 'A');
      setExplanation(question.explanation || '');
      setPoints(question.points || { correct: 4, wrong: -1, blank: 0 });
    } else {
      setCategory(defaultCategory);
      setStage('Penyisihan');
      setDomain('Aljabar');
      setType('multiple_choice');
      setQuestionNumber(1);
      setText('');
      setOptions([
        { id: 'A', text: '' },
        { id: 'B', text: '' },
        { id: 'C', text: '' },
        { id: 'D', text: '' },
        { id: 'E', text: '' },
      ]);
      setCorrectAnswer('A');
      setExplanation('');
      setPoints({ correct: 4, wrong: -1, blank: 0 });
    }
    setCleanFeedback(null);
  }, [question, defaultCategory, isOpen]);

  if (!isOpen) return null;

  const handleOptionChange = (idx: number, val: string) => {
    setOptions((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], text: val };
      return copy;
    });
  };

  const handleInsertSymbol = (symbol: string) => {
    setText((prev) => prev + (prev.endsWith(' ') || prev.length === 0 ? '' : ' ') + symbol + ' ');
  };

  const handleCleanDuplicates = () => {
    setText((prev) => cleanDuplicatesHelper(prev));
    setExplanation((prev) => cleanDuplicatesHelper(prev));
    setOptions((prev) =>
      prev.map((opt) => ({
        ...opt,
        text: cleanDuplicatesHelper(opt.text),
      }))
    );
    setCleanFeedback('Duplikasi simbol KaTeX & shadow text berhasil dibersihkan!');
    setTimeout(() => setCleanFeedback(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsSaving(true);
    try {
      const payload: Question = {
        id: question?.id || `MMO-MANUAL-${Date.now()}-${questionNumber}`,
        category,
        stage,
        domain,
        type,
        questionNumber: Number(questionNumber) || 1,
        text: cleanDuplicatesHelper(text.trim()),
        formulaLatex: '', // formulas are embedded in text via $...$
        options:
          type === 'multiple_choice'
            ? options.map((opt) => ({
                id: opt.id,
                text: cleanDuplicatesHelper(opt.text.trim()),
              }))
            : [],
        correctAnswer: correctAnswer.trim(),
        explanation: cleanDuplicatesHelper(explanation.trim()),
        points,
      };

      await onSave(payload);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-[#D5D5D5] rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl text-zinc-900 relative animate-in fade-in overflow-hidden my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#fafafa] border-b border-[#D5D5D5] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#646464] text-white flex items-center justify-center shadow-2xs shrink-0">
              {isEditing ? <Edit3 className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight flex items-center gap-2">
                {isEditing ? 'Formulir Edit Cepat Butir Soal' : 'Tambah Soal Cepat MMO 2027'}
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#646464] text-white uppercase">
                  {category} · {stage}
                </span>
              </h3>
              <p className="text-xs text-zinc-500">
                Ubah teks, rumus matematika KaTeX ($...$), pilihan jawaban, dan pembahasan secara langsung.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCleanDuplicates}
              className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Bersihkan duplikasi simbol dan shadow equations pada butir ini"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Bersihkan Simbol Dobel</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors cursor-pointer"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {cleanFeedback && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 flex items-center gap-2 text-xs text-emerald-800 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{cleanFeedback}</span>
          </div>
        )}

        {/* Tab Switcher: Form Edit vs Pratinjau KaTeX */}
        <div className="px-5 pt-3 bg-white border-b border-[#D5D5D5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1.5 text-xs font-bold rounded-t-xl border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'editor'
                  ? 'border-[#646464] text-zinc-900 bg-zinc-50'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Formulir Input</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 text-xs font-bold rounded-t-xl border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'preview'
                  ? 'border-[#646464] text-zinc-900 bg-zinc-50'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-emerald-600" />
              <span>Pratinjau Render KaTeX</span>
            </button>
          </div>

          <span className="text-[11px] text-zinc-500 font-mono hidden sm:inline">
            Gunakan format <code className="text-[#646464] font-bold">$...$</code> untuk rumus matematika
          </span>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'editor' ? (
            <div className="space-y-4">
              {/* Row 1: Metadata Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Nomor Soal</label>
                  <input
                    type="number"
                    min={1}
                    value={questionNumber}
                    onChange={(e) => setQuestionNumber(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-[#f7f7f8] border border-[#D5D5D5] rounded-xl px-2.5 py-1.5 text-xs text-zinc-900 font-bold focus:outline-none focus:border-[#646464]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Jenjang</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as OlympiadCategory)}
                    className="w-full bg-[#f7f7f8] border border-[#D5D5D5] rounded-xl px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-[#646464]"
                  >
                    <option value="SMP">SMP / MTs</option>
                    <option value="SMA">SMA / MA / SMK</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Babak</label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value as CompetitionStage)}
                    className="w-full bg-[#f7f7f8] border border-[#D5D5D5] rounded-xl px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-[#646464]"
                  >
                    <option value="Penyisihan">Penyisihan</option>
                    <option value="Semifinal">Semifinal</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Domain Materi</label>
                  <select
                    value={domain}
                    onChange={(e) => setDomain(e.target.value as MathDomain)}
                    className="w-full bg-[#f7f7f8] border border-[#D5D5D5] rounded-xl px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-[#646464]"
                  >
                    <option value="Aljabar">Aljabar</option>
                    <option value="Geometri">Geometri</option>
                    <option value="Kombinatorika">Kombinatorika</option>
                    <option value="Teori Bilangan">Teori Bilangan</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Jenis Soal</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as QuestionType)}
                    className="w-full bg-[#f7f7f8] border border-[#D5D5D5] rounded-xl px-2.5 py-1.5 text-xs text-zinc-900 font-semibold focus:outline-none focus:border-[#646464]"
                  >
                    <option value="multiple_choice">Pilihan Ganda</option>
                    <option value="short_answer">Uraian / Problem</option>
                  </select>
                </div>
              </div>

              {/* Teks Soal + Quick Math Buttons */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold text-zinc-800">
                    Teks Soal Matematika <span className="text-rose-500">*</span>
                  </label>

                  {/* Math Formula Shortcuts */}
                  <div className="flex items-center gap-1 flex-wrap text-[11px]">
                    <span className="text-zinc-400 text-[10px]">Sisip Simbol:</span>
                    <button
                      type="button"
                      onClick={() => handleInsertSymbol('$\\frac{a}{b}$')}
                      className="px-2 py-0.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-mono"
                    >
                      {'$'}\frac{'{a}{b}'}{'$'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertSymbol('$\\sqrt{x}$')}
                      className="px-2 py-0.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-mono"
                    >
                      {'$'}\sqrt{'{x}'}{'$'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertSymbol('$x^2$')}
                      className="px-2 py-0.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-mono"
                    >
                      $x^2$
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertSymbol('$\\times$')}
                      className="px-2 py-0.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-mono"
                    >
                      $\times$
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertSymbol('$\\div$')}
                      className="px-2 py-0.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-mono"
                    >
                      $\div$
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertSymbol('$\\le$')}
                      className="px-2 py-0.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-mono"
                    >
                      $\le$
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertSymbol('$\\ge$')}
                      className="px-2 py-0.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-mono"
                    >
                      $\ge$
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertSymbol('$x$')}
                      className="px-2 py-0.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-mono"
                    >
                      $x$
                    </button>
                  </div>
                </div>

                <textarea
                  rows={4}
                  required
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Ketik narasi soal dengan notasi LaTeX $...$..."
                  className="w-full bg-[#f7f7f8] border border-[#D5D5D5] rounded-2xl p-3 text-xs text-zinc-900 font-mono focus:outline-none focus:border-[#646464] leading-relaxed"
                />

                {/* Instant Inline Mini Preview for Question Text */}
                {text.trim() && (
                  <div className="bg-white border border-zinc-200 rounded-xl p-2.5 text-xs text-zinc-800">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                      Pratinjau KaTeX Soal:
                    </span>
                    <MathRenderer content={text} />
                  </div>
                )}
              </div>

              {/* Options Section (If Multiple Choice) */}
              {type === 'multiple_choice' ? (
                <div className="space-y-2 pt-2 border-t border-[#D5D5D5]">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-800">
                      Pilihan Jawaban (A s.d. E) & Pilih Kunci:
                    </label>
                    <span className="text-[10px] text-zinc-500">
                      Klik bulatan huruf untuk menandai kunci jawaban yang benar
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {options.map((opt, idx) => {
                      const isCorrect = correctAnswer === opt.id;
                      return (
                        <div
                          key={opt.id}
                          className={`p-2 rounded-2xl border transition-all ${
                            isCorrect
                              ? 'bg-emerald-50/70 border-emerald-300'
                              : 'bg-[#f7f7f8] border-[#D5D5D5]'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <button
                              type="button"
                              onClick={() => setCorrectAnswer(opt.id)}
                              className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${
                                isCorrect
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                              }`}
                              title={`Pilih ${opt.id} sebagai Kunci Jawaban`}
                            >
                              {opt.id}
                            </button>
                            <input
                              type="text"
                              value={opt.text}
                              onChange={(e) => handleOptionChange(idx, e.target.value)}
                              placeholder={`Isi pilihan ${opt.id} (rumus: $...$)`}
                              className="flex-1 bg-white border border-zinc-300 rounded-xl px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-[#646464] font-mono"
                            />
                            {isCorrect && (
                              <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-100 px-1.5 py-0.5 rounded-md">
                                KUNCI
                              </span>
                            )}
                          </div>

                          {/* Mini Render of Option */}
                          {opt.text.trim() && (
                            <div className="text-[11px] text-zinc-700 pl-8 overflow-x-auto">
                              <MathRenderer content={opt.text} inline />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-2 pt-2 border-t border-[#D5D5D5]">
                  <label className="text-xs font-bold text-zinc-800 block">
                    Kunci Jawaban Akhir Uraian / Problem Solving:
                  </label>
                  <input
                    type="text"
                    value={correctAnswer}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                    placeholder="Contoh: 42, atau x = 5/7..."
                    className="w-full bg-[#f7f7f8] border border-[#D5D5D5] rounded-xl px-3 py-2 text-xs text-zinc-900 font-mono focus:outline-none focus:border-[#646464]"
                  />
                </div>
              )}

              {/* Pembahasan Lengkap */}
              <div className="space-y-1.5 pt-2 border-t border-[#D5D5D5]">
                <label className="text-xs font-bold text-zinc-800 block">
                  Langkah Pembahasan & Solusi Lengkap (KaTeX $...$):
                </label>
                <textarea
                  rows={3}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Tuliskan langkah pembuktian, rumus, atau tahapan penyelesaian..."
                  className="w-full bg-[#f7f7f8] border border-[#D5D5D5] rounded-2xl p-3 text-xs text-zinc-900 font-mono focus:outline-none focus:border-[#646464] leading-relaxed"
                />
              </div>

              {/* Bobot Nilai */}
              <div className="pt-2 border-t border-[#D5D5D5]">
                <label className="text-xs font-bold text-zinc-800 block mb-1.5">
                  Standar Bobot Poin Penilaian:
                </label>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-emerald-700 font-bold block mb-0.5">
                      Benar (+)
                    </span>
                    <input
                      type="number"
                      value={points.correct}
                      onChange={(e) =>
                        setPoints((prev) => ({
                          ...prev,
                          correct: parseInt(e.target.value, 10) || 0,
                        }))
                      }
                      className="w-full bg-white border border-[#D5D5D5] rounded-xl p-2 text-center font-bold text-emerald-800"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-rose-700 font-bold block mb-0.5">
                      Salah (-)
                    </span>
                    <input
                      type="number"
                      value={points.wrong}
                      onChange={(e) =>
                        setPoints((prev) => ({
                          ...prev,
                          wrong: parseInt(e.target.value, 10) || 0,
                        }))
                      }
                      className="w-full bg-white border border-[#D5D5D5] rounded-xl p-2 text-center font-bold text-rose-800"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 font-bold block mb-0.5">
                      Kosong (0)
                    </span>
                    <input
                      type="number"
                      value={points.blank}
                      onChange={(e) =>
                        setPoints((prev) => ({
                          ...prev,
                          blank: parseInt(e.target.value, 10) || 0,
                        }))
                      }
                      className="w-full bg-white border border-[#D5D5D5] rounded-xl p-2 text-center font-bold text-zinc-700"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Full Preview Tab */
            <div className="bg-[#fafafa] border border-[#D5D5D5] rounded-2xl p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#D5D5D5]">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-zinc-900 text-white font-bold text-xs flex items-center justify-center">
                    {questionNumber}
                  </span>
                  <span className="font-bold text-xs bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-md border border-zinc-200">
                    {domain}
                  </span>
                  <span className="font-bold text-xs bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-md border border-zinc-200">
                    {category}
                  </span>
                  <span className="text-emerald-800 bg-emerald-50 font-bold text-xs px-2 py-0.5 rounded-md border border-emerald-200">
                    Kunci: {correctAnswer}
                  </span>
                </div>
                <span className="text-zinc-500 font-mono text-[11px]">
                  +{points.correct} / {points.wrong} / {points.blank}
                </span>
              </div>

              {/* Question Text */}
              <div className="text-zinc-900 text-sm leading-relaxed">
                <MathRenderer content={text || '(Teks soal masih kosong)'} />
              </div>

              {/* Options */}
              {type === 'multiple_choice' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {options.map((opt) => {
                    const isCorrect = opt.id === correctAnswer;
                    return (
                      <div
                        key={opt.id}
                        className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                          isCorrect
                            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-medium'
                            : 'bg-white border-zinc-200 text-zinc-800'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${
                            isCorrect
                              ? 'bg-emerald-600 text-white'
                              : 'bg-zinc-100 text-zinc-700'
                          }`}
                        >
                          {opt.id}
                        </span>
                        <div className="flex-1 overflow-x-auto pt-0.5">
                          <MathRenderer content={opt.text || `Pilihan ${opt.id}`} />
                        </div>
                        {isCorrect && (
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Explanation */}
              {explanation.trim() && (
                <div className="bg-white border border-[#D5D5D5] rounded-xl p-3 text-xs text-zinc-700 space-y-1">
                  <strong className="text-zinc-900 font-semibold block">
                    Pembahasan KaTeX:
                  </strong>
                  <MathRenderer content={explanation} />
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[#D5D5D5] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-100 border border-[#D5D5D5] text-xs font-semibold text-zinc-700 cursor-pointer"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={isSaving || !text.trim()}
              className="px-6 py-2.5 rounded-xl bg-[#646464] hover:bg-[#525252] disabled:opacity-50 text-white text-xs font-bold cursor-pointer shadow-xs flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{isEditing ? 'Simpan Perubahan Soal' : 'Simpan Butir ke Bank Soal'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
