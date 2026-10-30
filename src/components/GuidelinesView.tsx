import React from 'react';
import { ShieldCheck, BookOpen, ArrowRight, Award, Compass, Brain, Trophy } from 'lucide-react';

interface GuidelinesViewProps {
  onStartExamClick: () => void;
}

export const GuidelinesView: React.FC<GuidelinesViewProps> = ({ onStartExamClick }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 lg:py-12 space-y-8 bg-white text-zinc-900">
      {/* Header */}
      <div className="border-b border-[#D5D5D5] pb-6">
        <span className="text-xs font-semibold text-[#646464] tracking-wider uppercase block mb-1">
          Buku Pedoman Teknis & Regulasi MMO 2027
        </span>
        <h1 className="text-2xl lg:text-3xl font-bold text-zinc-900 tracking-tight">
          Panduan Resmi Pelaksanaan MMO 2027
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Matriks Mathematics Olympiad: “Explore, Think, Excel” · HMPS Pendidikan Matematika Universitas Muhammadiyah Malang
        </p>
      </div>

      {/* Progression Theme Card */}
      <div className="bg-[#fafafa] border border-[#D5D5D5] rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-zinc-900">
          Alur Perkembangan Peserta: Explore → Think → Excel
        </h2>
        <p className="text-xs text-zinc-600 leading-relaxed">
          Karakter soal di MMO 2027 dirancang bukan sekadar soal hitungan biasa, melainkan alur perkembangan daya nalar matematis peserta dari babak penyisihan hingga babak final:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs pt-1">
          <div className="bg-white border border-[#D5D5D5] p-4 rounded-2xl shadow-2xs space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-[#646464] text-white flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-zinc-900 text-sm">1. Babak Penyisihan (Explore)</h3>
            <p className="text-zinc-600 text-[11px] leading-relaxed">
              Bentuk pilihan ganda yang menyajikan pola, tabel, diagram, data kontekstual, dan situasi nyata di mana peserta mengeksplorasi hubungan sebelum menjawab.
            </p>
          </div>

          <div className="bg-white border border-[#D5D5D5] p-4 rounded-2xl shadow-2xs space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-[#646464] text-white flex items-center justify-center">
              <Brain className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-zinc-900 text-sm">2. Babak Semifinal (Explore + Think)</h3>
            <p className="text-zinc-600 text-[11px] leading-relaxed">
              Bentuk pilihan ganda tingkat lanjut yang menuntut beberapa langkah penalaran logis, analisis kondisi majemuk, dan strategi eliminasi kesalahan umum.
            </p>
          </div>

          <div className="bg-white border border-[#D5D5D5] p-4 rounded-2xl shadow-2xs space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-[#646464] text-white flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-zinc-900 text-sm">3. Babak Final (Think + Excel)</h3>
            <p className="text-zinc-600 text-[11px] leading-relaxed">
              Bentuk uraian dan problem solving mendalam di mana peserta membuktikan proses berpikir, menuliskan strategi solusi, serta menunjukkan keunggulan penalaran.
            </p>
          </div>
        </div>
      </div>

      {/* Scoring Mechanism */}
      <div className="bg-[#fafafa] border border-[#D5D5D5] rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-[#646464]" />
          <h2 className="text-base font-bold text-zinc-900">Sistem Penilaian (Scoring System)</h2>
        </div>
        <p className="text-xs text-zinc-600 leading-relaxed">
          Penilaian babak objektif mengadopsi standar resmi Olimpiade Sains Nasional (OSN) untuk menguji ketepatan dan keyakinan peserta:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-white border border-[#D5D5D5] p-4 rounded-2xl text-center shadow-2xs">
            <span className="text-emerald-700 font-mono font-bold text-xl block">+4 Poin</span>
            <span className="text-zinc-800 font-semibold mt-1 block">Jawaban Benar</span>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Skor standar per butir pilihan ganda</span>
          </div>
          <div className="bg-white border border-[#D5D5D5] p-4 rounded-2xl text-center shadow-2xs">
            <span className="text-rose-700 font-mono font-bold text-xl block">-1 Poin</span>
            <span className="text-zinc-800 font-semibold mt-1 block">Jawaban Salah</span>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Pengurangan poin jika keliru</span>
          </div>
          <div className="bg-white border border-[#D5D5D5] p-4 rounded-2xl text-center shadow-2xs">
            <span className="text-zinc-500 font-mono font-bold text-xl block">0 Poin</span>
            <span className="text-zinc-800 font-semibold mt-1 block">Tidak Dijawab / Kosong</span>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Tidak ada penambahan/pengurangan</span>
          </div>
        </div>
        <div className="text-[11px] text-zinc-500 bg-white border border-[#D5D5D5] p-3 rounded-2xl">
          *Catatan Babak Final (Uraian): Setiap butir soal dinilai berdasarkan rubrik penskoran penalaran (0 - 10 poin) sesuai kelengkapan langkah dan kebenaran strategi pembuktian.
        </div>
      </div>

      {/* Anti-cheat & AI Proctoring Policy */}
      <div className="bg-[#fafafa] border border-[#D5D5D5] rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#646464]" />
          <h2 className="text-base font-bold text-zinc-900">Protokol Anti-Cheat & Pengawasan Proktor AI</h2>
        </div>
        <ul className="space-y-3 text-xs text-zinc-700">
          <li className="flex items-start gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#646464] mt-1.5 shrink-0" />
            <div>
              <strong className="text-zinc-900">Kunci Layar Penuh (Fullscreen Lockdown):</strong> Seluruh peserta diwajibkan mengaktifkan mode layar penuh. Keluar dari mode layar penuh akan dicatat sebagai pelanggaran.
            </div>
          </li>
          <li className="flex items-start gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#646464] mt-1.5 shrink-0" />
            <div>
              <strong className="text-zinc-900">Deteksi Perpindahan Tab & Jendela:</strong> Dilarang membuka tab browser lain, aplikasi kalkulator eksternal, atau membagi layar (split screen). Sistem otomatis mencatat perpindahan fokus dan memberikan strike.
            </div>
          </li>
          <li className="flex items-start gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#646464] mt-1.5 shrink-0" />
            <div>
              <strong className="text-zinc-900">Pemblokiran Salin-Tempel (Clipboard Guard):</strong> Fitur Copy, Paste, Cut, Klik Kanan, dan pintasan pengembang (F12, Inspect Element) dinonaktifkan secara ketat di browser.
            </div>
          </li>
          <li className="flex items-start gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#646464] mt-1.5 shrink-0" />
            <div>
              <strong className="text-zinc-900">Batas Maksimal Pelanggaran:</strong> Akumulasi 4 kali pelanggaran akan mengunci layar secara otomatis, memerlukan pembukaan kunci manual oleh pengawas panitia UMM dengan kode otorisasi PIN.
            </div>
          </li>
        </ul>
      </div>

      {/* Syllabus Domains */}
      <div className="bg-[#fafafa] border border-[#D5D5D5] rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[#646464]" />
          <h2 className="text-base font-bold text-zinc-900">Silabus Materi Olimpiade (SMP & SMA)</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-white p-4 rounded-2xl border border-[#D5D5D5] shadow-2xs">
            <h3 className="font-bold text-zinc-900 mb-1.5">1. Aljabar</h3>
            <p className="text-zinc-600 leading-relaxed">
              Persamaan & pertidaksamaan kuadrat, pemfaktoran bentuk simetris, fungsi lantai/atap, polinomial, ketidaksamaan AM-GM & Cauchy-Schwarz, serta matriks ordo 2x2.
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-[#D5D5D5] shadow-2xs">
            <h3 className="font-bold text-zinc-900 mb-1.5">2. Teori Bilangan</h3>
            <p className="text-zinc-600 leading-relaxed">
              Keterbagian, bilangan prima, FPB & KPK, aritmetika modulo, Teorema Sisa Cina (Chinese Remainder Theorem), Teorema Kecil Fermat, dan persamaan Diophantine.
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-[#D5D5D5] shadow-2xs">
            <h3 className="font-bold text-zinc-900 mb-1.5">3. Geometri</h3>
            <p className="text-zinc-600 leading-relaxed">
              Kongruensi & kesebangunan segitiga, Teorema Pythagoras & Apollonius, lingkaran dalam & luar, segiempat tali busur, Teorema Ceva & Menelaus, serta trigonometri sudut.
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-[#D5D5D5] shadow-2xs">
            <h3 className="font-bold text-zinc-900 mb-1.5">4. Kombinatorika</h3>
            <p className="text-zinc-600 leading-relaxed">
              Prinsip pencacahan dasar, permutasi & kombinasi, prinsip sarang burung merpati (Pigeonhole Principle), relasi rekursif berulang, dan prinsip inklusi-eksklusi.
            </p>
          </div>
        </div>
      </div>

      {/* Start Button */}
      <div className="pt-4 flex justify-center">
        <button
          onClick={onStartExamClick}
          className="px-8 py-3.5 bg-[#646464] hover:bg-[#525252] text-white font-bold text-sm rounded-2xl transition-all shadow-xs flex items-center gap-2 cursor-pointer border border-[#646464]"
        >
          <span>Menuju ke Portal Pendaftaran Ujian</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
