import React, { useMemo } from 'react';
import { CheckCircle2, Printer, ArrowLeft, ShieldCheck, FileCheck, School, Calendar, Clock } from 'lucide-react';
import { ParticipantProfile, Question, UserAnswer } from '../types';

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
  const submissionTime = useMemo(() => {
    const now = new Date();
    return {
      date: now.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      time: now.toLocaleTimeString('id-ID', {
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 lg:py-16">
      {/* Official Receipt Card */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Header Strip with neutral dark gray accent */}
        <div className="bg-zinc-900 text-white p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                  Tanda Terima Resmi
                </span>
                <span className="text-zinc-500">·</span>
                <span className="text-xs text-zinc-400">MMO 2026</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Matriks Mathematics Olympiad
              </h1>
              <p className="text-xs text-zinc-300 mt-1">
                HMPS MATRIKS Bidang Keilmuan · Prodi Pendidikan Matematika UMM
              </p>
            </div>

            <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-white text-base shrink-0">
              MMO
            </div>
          </div>
        </div>

        {/* Confirmation Status Banner */}
        <div className="p-6 sm:p-8 border-b border-zinc-200 bg-zinc-50/70">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900">
                Ujian Berhasil Dikumpulkan & Selesai
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 mt-1 leading-relaxed">
                Terima kasih, lembar jawaban Anda telah diterima secara lengkap dan tersimpan dengan aman di server panitia. Sesi ujian Anda telah berakhir.
              </p>
            </div>
          </div>
        </div>

        {/* Participant & Submission Receipt Table */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="border border-zinc-200 rounded-xl overflow-hidden text-xs">
            <div className="bg-zinc-100/80 px-4 py-2.5 font-semibold text-zinc-800 border-b border-zinc-200 flex justify-between items-center">
              <span>Rincian Berkas Pengerjaan</span>
              <span className="font-mono text-zinc-600 font-normal">{submissionTime.timestampCode}</span>
            </div>

            <div className="divide-y divide-zinc-200 bg-white">
              <div className="grid grid-cols-3 px-4 py-3">
                <span className="text-zinc-500 font-medium">Nama Peserta</span>
                <span className="col-span-2 text-zinc-900 font-semibold">{participant.fullName}</span>
              </div>

              <div className="grid grid-cols-3 px-4 py-3">
                <span className="text-zinc-500 font-medium">Asal Sekolah</span>
                <span className="col-span-2 text-zinc-900">{participant.school}</span>
              </div>

              <div className="grid grid-cols-3 px-4 py-3">
                <span className="text-zinc-500 font-medium">Nomor Ujian / NISN</span>
                <span className="col-span-2 text-zinc-900 font-mono font-medium">{participant.nisnOrRegNumber}</span>
              </div>

              {participant.email && (
                <div className="grid grid-cols-3 px-4 py-3">
                  <span className="text-zinc-500 font-medium">Email Akun</span>
                  <span className="col-span-2 text-zinc-900 font-mono">{participant.email}</span>
                </div>
              )}

              {participant.city && (
                <div className="grid grid-cols-3 px-4 py-3">
                  <span className="text-zinc-500 font-medium">Kota / Domisili</span>
                  <span className="col-span-2 text-zinc-900">{participant.city}</span>
                </div>
              )}

              <div className="grid grid-cols-3 px-4 py-3">
                <span className="text-zinc-500 font-medium">Kategori Kompetisi</span>
                <span className="col-span-2 text-zinc-900 font-medium">
                  {participant.category === 'SMP' ? 'Tingkat SMP / MTs Sederajat' : 'Tingkat SMA / MA / SMK Sederajat'}
                </span>
              </div>

              <div className="grid grid-cols-3 px-4 py-3">
                <span className="text-zinc-500 font-medium">Babak & Tema</span>
                <span className="col-span-2 text-zinc-900 font-medium">
                  Babak {participant.stage || 'Penyisihan'} · Fokus: {
                    participant.stage === 'Final' ? 'Think + Excel (Uraian & Problem Solving)' :
                    participant.stage === 'Semifinal' ? 'Explore + Think (Penalaran Majemuk)' :
                    'Explore (Pengamatan Pola & Struktur)'
                  }
                </span>
              </div>

              <div className="grid grid-cols-3 px-4 py-3">
                <span className="text-zinc-500 font-medium">Progres Pengerjaan</span>
                <span className="col-span-2 text-zinc-900 font-mono font-medium">
                  {answeredCount} dari {questions.length} butir terjawab
                </span>
              </div>

              <div className="grid grid-cols-3 px-4 py-3">
                <span className="text-zinc-500 font-medium">Waktu Pengumpulan</span>
                <span className="col-span-2 text-zinc-900 font-mono">
                  {submissionTime.date}, {submissionTime.time}
                </span>
              </div>

              <div className="grid grid-cols-3 px-4 py-3">
                <span className="text-zinc-500 font-medium">Status Berkas</span>
                <span className="col-span-2 text-emerald-700 font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Terverifikasi Sah oleh Sistem Ujian MMO
                </span>
              </div>
            </div>
          </div>

          {/* Committee Announcement Note */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-xs text-zinc-600 leading-relaxed space-y-1.5">
            <div className="font-semibold text-zinc-800">Informasi Hasil & Pengumuman:</div>
            <p>
              Sesuai dengan ketentuan Dewan Juri MMO 2026, hasil nilai dan pengumuman pemenang akan diumumkan secara serentak melalui portal resmi dan kanal informasi HMPS Pendidikan Matematika Universitas Muhammadiyah Malang.
            </p>
            <p className="text-zinc-500 text-[11px] pt-1">
              Simpan bukti tanda terima ini sebagai dokumen konfirmasi pengerjaan yang sah.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={handlePrint}
              className="w-full sm:w-auto flex-1 py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Cetak / Simpan Bukti Tanda Terima (PDF)
            </button>

            <button
              onClick={onReturnToHome}
              className="w-full sm:w-auto py-2.5 px-5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-zinc-200"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali ke Beranda
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
