import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Printer,
  ArrowLeft,
  ShieldCheck,
  MessageSquarePlus,
  Send,
  AlertCircle,
} from 'lucide-react';
import { ParticipantProfile, Question, SiteFeedbackEntry, UserAnswer } from '../types';
import { ApiService } from '../services/api';
import { MmoLogo } from './MmoLogo';

interface ExamReceiptViewProps {
  participant: ParticipantProfile;
  questions: Question[];
  userAnswers: Record<string, UserAnswer>;
  onReturnToHome: () => void;
}

export const ExamReceiptView: React.FC<ExamReceiptViewProps> = ({
  participant,
  questions,
  userAnswers,
  onReturnToHome,
}) => {
  const answeredCount = Object.keys(userAnswers).length;
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [submittedFeedback, setSubmittedFeedback] = useState<SiteFeedbackEntry | null>(null);

  const submissionTime = useMemo(() => {
    const now = new Date();
    return {
      date: now.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      time:
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' WIB',
      timestampCode: `MMO-${participant.category}-${Date.now().toString().slice(-6)}`,
    };
  }, [participant.category]);

  const handlePrint = () => {
    window.print();
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = feedbackText.trim();
    if (!cleaned) {
      setFeedbackError('Silakan tulis pesan atau saran Anda untuk website ujian MMO sebelum mengirim.');
      return;
    }

    setFeedbackError(null);
    setIsSubmittingFeedback(true);

    try {
      const result = await ApiService.submitSiteFeedback({
        participantId: participant.id,
        participantName: participant.fullName,
        school: participant.school,
        nisnOrRegNumber: participant.nisnOrRegNumber,
        category: participant.category,
        stage: participant.stage || 'Penyisihan',
        message: cleaned,
      });

      if (result.success && result.data) {
        setSubmittedFeedback(result.data);
        setFeedbackText('');
      } else {
        setFeedbackError(result.error || 'Gagal menyimpan pesan ke server panitia. Coba lagi sebentar.');
      }
    } catch {
      setFeedbackError('Terjadi gangguan koneksi saat mengirim pesan. Silakan coba kembali.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 lg:py-16 space-y-6">
      {/* Official Receipt Card */}
      <div className="bg-white border-2 border-[#E49548] rounded-3xl shadow-lg overflow-hidden text-[#1E3954]">
        {/* Header Strip in Deep Steel Blue */}
        <div className="bg-[#2C4B6B] text-white p-6 sm:p-8 border-b-2 border-[#E49548]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] uppercase tracking-wider bg-[#F4E6CC] text-[#1E3954] px-2.5 py-0.5 rounded-full font-extrabold">
                  Tanda Terima Resmi
                </span>
                <span className="text-[#E49548]">·</span>
                <span className="text-xs text-[#F4E6CC] font-semibold">MMO 2027</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                Matriks Mathematics Olympiad
              </h1>
              <p className="text-xs text-[#DCE9F5] mt-1">
                HMPS MATRIKS Bidang Keilmuan · Prodi Pendidikan Matematika UMM
              </p>
            </div>

            <MmoLogo size="lg" />
          </div>
        </div>

        {/* Confirmation Status Banner */}
        <div className="p-6 sm:p-8 border-b border-[#B8CCE0] bg-[#FAF3E3]">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1E3954]">
                Ujian Berhasil Dikumpulkan &amp; Selesai
              </h2>
              <p className="text-xs sm:text-sm text-[#3B5F84] mt-1 leading-relaxed">
                Terima kasih, lembar jawaban Anda telah diterima secara lengkap dan tersimpan dengan aman di server panitia. Sesi ujian Anda telah berakhir.
              </p>
            </div>
          </div>
        </div>

        {/* Participant & Submission Receipt Table */}
        <div className="p-6 sm:p-8 space-y-6 bg-white">
          <div className="border border-[#B8CCE0] rounded-2xl overflow-hidden text-xs">
            <div className="bg-[#EBF1F6] px-4 py-2.5 font-bold text-[#1E3954] border-b border-[#B8CCE0] flex justify-between items-center">
              <span>Rincian Berkas Pengerjaan</span>
              <span className="font-mono text-[#2C4B6B] font-semibold">{submissionTime.timestampCode}</span>
            </div>

            <div className="divide-y divide-[#DCE7F1] bg-white">
              <div className="grid grid-cols-3 px-4 py-3">
                <span className="text-[#4E779F] font-semibold">Nama Peserta</span>
                <span className="col-span-2 text-[#1E3954] font-bold">{participant.fullName}</span>
              </div>

              <div className="grid grid-cols-3 px-4 py-3">
                <span className="text-[#4E779F] font-semibold">Asal Sekolah</span>
                <span className="col-span-2 text-[#1E3954]">{participant.school}</span>
              </div>

              <div className="grid grid-cols-3 px-4 py-3">
                <span className="text-[#4E779F] font-semibold">Nomor Ujian / NISN</span>
                <span className="col-span-2 text-[#1E3954] font-mono font-semibold">{participant.nisnOrRegNumber}</span>
              </div>

              {participant.email && (
                <div className="grid grid-cols-3 px-4 py-3">
                  <span className="text-[#4E779F] font-semibold">Email Akun</span>
                  <span className="col-span-2 text-[#1E3954] font-mono">{participant.email}</span>
                </div>
              )}

              {participant.city && (
                <div className="grid grid-cols-3 px-4 py-3">
                  <span className="text-[#4E779F] font-semibold">Kota / Domisili</span>
                  <span className="col-span-2 text-[#1E3954]">{participant.city}</span>
                </div>
              )}

              <div className="grid grid-cols-3 px-4 py-3">
                <span className="text-[#4E779F] font-semibold">Kategori Kompetisi</span>
                <span className="col-span-2 text-[#1E3954] font-semibold">
                  {participant.category === 'SMP' ? 'Tingkat SMP / MTs Sederajat' : 'Tingkat SMA / MA / SMK Sederajat'}
                </span>
              </div>

              <div className="grid grid-cols-3 px-4 py-3">
                <span className="text-[#4E779F] font-semibold">Babak Kompetisi</span>
                <span className="col-span-2 text-[#1E3954] font-semibold">
                  Babak {participant.stage || 'Penyisihan'}
                </span>
              </div>

              <div className="grid grid-cols-3 px-4 py-3">
                <span className="text-[#4E779F] font-semibold">Progres Pengerjaan</span>
                <span className="col-span-2 text-[#1E3954] font-mono font-semibold">
                  {answeredCount} dari {questions.length} butir terjawab
                </span>
              </div>

              <div className="grid grid-cols-3 px-4 py-3">
                <span className="text-[#4E779F] font-semibold">Waktu Pengumpulan</span>
                <span className="col-span-2 text-[#1E3954] font-mono">
                  {submissionTime.date}, {submissionTime.time}
                </span>
              </div>

              <div className="grid grid-cols-3 px-4 py-3">
                <span className="text-[#4E779F] font-semibold">Status Berkas</span>
                <span className="col-span-2 text-emerald-700 font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Terverifikasi Sah oleh Sistem Ujian MMO
                </span>
              </div>
            </div>
          </div>

          {/* Committee Announcement Note */}
          <div className="bg-[#FAF3E3] border border-[#E49548]/70 rounded-xl p-4 text-xs text-[#1E3954] leading-relaxed space-y-1.5">
            <div className="font-bold text-[#1E3954]">Informasi Hasil &amp; Pengumuman:</div>
            <p className="text-[#2C4B6B]">
              Sesuai dengan ketentuan Dewan Juri MMO 2027, hasil nilai dan pengumuman pemenang akan diumumkan secara serentak melalui portal resmi dan kanal informasi HMPS Pendidikan Matematika Universitas Muhammadiyah Malang.
            </p>
            <p className="text-[#4E779F] text-[11px] pt-1">
              Simpan bukti tanda terima ini sebagai dokumen konfirmasi pengerjaan yang sah.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="w-full sm:w-auto flex-1 py-2.5 px-4 bg-[#2C4B6B] hover:bg-[#243E59] text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm whitespace-nowrap shrink-0 border border-[#E49548]"
            >
              <Printer className="w-4 h-4 text-[#F4E6CC]" />
              Cetak / Simpan Bukti Tanda Terima (PDF)
            </button>

            <button
              type="button"
              onClick={onReturnToHome}
              className="w-full sm:w-auto py-2.5 px-5 bg-[#F4E6CC] hover:bg-[#E49548] text-[#1E3954] text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-[#E49548] whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali ke Beranda
            </button>
          </div>
        </div>
      </div>

      {/* Post-Exam Website Feedback & Suggestion Box (hidden during print) */}
      <div className="bg-[#2C4B6B]/95 border-2 border-[#E49548] rounded-3xl shadow-lg overflow-hidden print:hidden text-white">
        <div className="px-6 py-4 bg-[#243E59] border-b border-[#E49548]/60 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#E49548] text-[#1E3954] flex items-center justify-center shrink-0">
            <MessageSquarePlus className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-[#F4E6CC]">
              Pesan &amp; Saran untuk Website Ujian MMO
            </h3>
            <p className="text-xs text-[#DCE9F5] mt-0.5">
              Masukan Anda terkait tampilan soal, kemudahan navigasi, atau kendala teknis website akan langsung tersimpan ke spreadsheet panitia.
            </p>
          </div>
        </div>

        <div className="p-6">
          {submittedFeedback ? (
            <div className="bg-[#FAF3E3] border-2 border-[#E49548] rounded-2xl p-4 space-y-2.5 text-[#1E3954]">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1 min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-[#1E3954]">
                    Terima kasih! Pesan &amp; saran Anda telah tercatat di sistem panitia.
                  </h4>
                  <p className="text-xs text-[#2C4B6B]">
                    {submittedFeedback.webhookStatus === 'synced'
                      ? 'Data sudah langsung masuk ke Google Spreadsheet & rekap Excel panitia.'
                      : 'Data tersimpan aman di server panitia dan siap direkap ke spreadsheet.'}
                  </p>
                </div>
              </div>

              <div className="bg-white border border-[#B8CCE0] rounded-xl p-3 text-xs text-[#1E3954] whitespace-pre-wrap leading-relaxed">
                {submittedFeedback.message}
              </div>

              <div className="text-[11px] text-[#3B5F84] font-mono">
                {submittedFeedback.participantName} · {submittedFeedback.submittedAtWib}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitFeedback} className="space-y-3.5">
              <div>
                <label
                  htmlFor="mmo-website-feedback"
                  className="block text-xs font-semibold text-[#F4E6CC] mb-1.5"
                >
                  Tulis Pesan atau Saran untuk Pengembangan Website Ini
                </label>
                <textarea
                  id="mmo-website-feedback"
                  rows={4}
                  value={feedbackText}
                  onChange={(e) => {
                    setFeedbackText(e.target.value);
                    if (feedbackError) setFeedbackError(null);
                  }}
                  placeholder="Contoh: Tampilan rumus matematika di layar HP sudah jelas, navigasi nomor soal mudah dipahami, atau saran perbaikan fitur website..."
                  className="w-full bg-white border-2 border-[#E49548]/70 focus:border-[#E49548] rounded-xl p-3 text-xs sm:text-sm text-[#1E3954] placeholder:text-zinc-400 focus:outline-none transition-colors resize-y"
                />
              </div>

              {feedbackError && (
                <div className="flex items-center gap-2 text-xs text-rose-900 bg-rose-100 border border-rose-300 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{feedbackError}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <span className="text-[11px] text-[#DCE9F5]">
                  Dikirim atas nama <strong className="text-[#F4E6CC]">{participant.fullName}</strong> ({participant.category} · {participant.stage || 'Penyisihan'})
                </span>

                <button
                  type="submit"
                  disabled={isSubmittingFeedback}
                  className="px-4 py-2.5 rounded-xl bg-[#E49548] hover:bg-[#CE7D30] disabled:opacity-60 text-[#1E3954] text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs whitespace-nowrap shrink-0 border border-[#F4E6CC]"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingFeedback ? 'Mengirim ke Panitia...' : 'Kirim Pesan & Saran'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

