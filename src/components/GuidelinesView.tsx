import React from 'react';
import { ShieldCheck, BookOpen, ArrowRight, Award, Compass, Brain, Trophy, Sparkles } from 'lucide-react';

interface GuidelinesViewProps {
  onStartExamClick: () => void;
}

export const GuidelinesView: React.FC<GuidelinesViewProps> = ({ onStartExamClick }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 lg:py-12 space-y-8 text-white">
      {/* Header */}
      <div className="border-b-2 border-[#E49548]/60 pb-6">
        <div className="inline-flex items-center gap-2 bg-[#F4E6CC] text-[#1E3954] px-4 py-1.5 rounded-full text-xs font-extrabold shadow-xs mb-3 border border-[#E49548]">
          <Sparkles className="w-3.5 h-3.5 text-[#CE7D30]" />
          <span>Buku Pedoman Teknis &amp; Regulasi MMO 2027</span>
        </div>
        <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
          Panduan Resmi Pelaksanaan MMO 2027
        </h1>
        <p className="text-xs text-[#DCE9F5] mt-1">
          Matriks Mathematics Olympiad: “Explore, Think, Excel” · HMPS Pendidikan Matematika Universitas Muhammadiyah Malang
        </p>
      </div>

      {/* 3 Integrated Pillars Theme Card */}
      <div className="bg-[#2C4B6B]/90 border-2 border-[#E49548] rounded-3xl p-6 sm:p-8 shadow-lg space-y-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider bg-[#F4E6CC] text-[#1E3954] px-3 py-1 rounded-full">
              Prinsip Nalar Kompetisi
            </span>
            <span className="text-xs text-[#DCE9F5] font-medium">
              Berlaku Terpadu di Seluruh Babak (Penyisihan, Semifinal, Final)
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-white mt-3">
            3 Pilar Nalar Matematika Terintegrasi: Explore · Think · Excel
          </h2>
          <p className="text-xs text-[#EDF4FA] leading-relaxed mt-1">
            Karakter soal di MMO 2027 dirancang bukan sekadar hafalan rumus atau hitungan biasa. Ketiga pilar nalar matematika ini <strong className="text-white">terintegrasi secara menyeluruh di semua babak kompetisi (termasuk Babak Penyisihan)</strong>. Peserta diuji mulai dari kemampuan mengenali pola, menganalisis hubungan logika, hingga menghasilkan solusi optimal dengan presisi mutlak:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
          {/* Pilar 1: Explore */}
          <div className="bg-[#243E59]/90 border-2 border-[#E49548]/80 hover:border-[#E49548] p-5 rounded-2xl shadow-sm transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#F4E6CC] text-[#1E3954] px-2.5 py-1 rounded-full">
                  Pilar 1 · Eksplorasi
                </span>
                <div className="w-8 h-8 rounded-xl bg-[#E49548] text-[#1E3954] flex items-center justify-center shadow-xs">
                  <Compass className="w-4 h-4" />
                </div>
              </div>
              <h3 className="font-extrabold text-white text-base tracking-tight">
                EXPLORE
              </h3>
              <p className="text-[#DCE9F5] text-xs leading-relaxed mt-2">
                Menyelidiki pola bilangan tersembunyi, abstraksi bentuk geometri, struktur diagram/tabel, dan menemukan petunjuk awal pemecahan masalah dari informasi yang disajikan.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#E49548]/40 space-y-1">
              <span className="text-[10px] font-bold text-[#F4E6CC] block uppercase tracking-wider">
                Fokus Kompetensi:
              </span>
              <p className="text-[11px] text-[#DCE9F5] leading-normal">
                Observasi analitis, pemodelan matematis awal, dan dekonstruksi struktur masalah.
              </p>
            </div>
          </div>

          {/* Pilar 2: Think */}
          <div className="bg-[#243E59]/90 border-2 border-[#E49548]/80 hover:border-[#E49548] p-5 rounded-2xl shadow-sm transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#F4E6CC] text-[#1E3954] px-2.5 py-1 rounded-full">
                  Pilar 2 · Penalaran
                </span>
                <div className="w-8 h-8 rounded-xl bg-[#E49548] text-[#1E3954] flex items-center justify-center shadow-xs">
                  <Brain className="w-4 h-4" />
                </div>
              </div>
              <h3 className="font-extrabold text-white text-base tracking-tight">
                THINK
              </h3>
              <p className="text-[#DCE9F5] text-xs leading-relaxed mt-2">
                Bernalar deduktif dan induktif yang kokoh, menguji hipotesis, menganalisis kondisi majemuk secara kritis, serta mengeliminasi kontradiksi logika dalam setiap butir soal.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#E49548]/40 space-y-1">
              <span className="text-[10px] font-bold text-[#F4E6CC] block uppercase tracking-wider">
                Fokus Kompetensi:
              </span>
              <p className="text-[11px] text-[#DCE9F5] leading-normal">
                Deduksi logis, evaluasi kondisi bersyarat, dan eliminasi jebakan matematika.
              </p>
            </div>
          </div>

          {/* Pilar 3: Excel */}
          <div className="bg-[#243E59]/90 border-2 border-[#E49548]/80 hover:border-[#E49548] p-5 rounded-2xl shadow-sm transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#F4E6CC] text-[#1E3954] px-2.5 py-1 rounded-full">
                  Pilar 3 · Keunggulan
                </span>
                <div className="w-8 h-8 rounded-xl bg-[#E49548] text-[#1E3954] flex items-center justify-center shadow-xs">
                  <Trophy className="w-4 h-4" />
                </div>
              </div>
              <h3 className="font-extrabold text-white text-base tracking-tight">
                EXCEL
              </h3>
              <p className="text-[#DCE9F5] text-xs leading-relaxed mt-2">
                Menunjukkan keunggulan komputasi dengan ketelitian tinggi, kecepatan perumusan strategi, sintesis konsep lintas bidang ilmu, dan akurasi solusi akhir yang tuntas.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#E49548]/40 space-y-1">
              <span className="text-[10px] font-bold text-[#F4E6CC] block uppercase tracking-wider">
                Fokus Kompetensi:
              </span>
              <p className="text-[11px] text-[#DCE9F5] leading-normal">
                Ketepatan komputasi mutlak, kecepatan penentuan solusi, dan sintesis konsep.
              </p>
            </div>
          </div>
        </div>

        <div className="p-3.5 bg-[#FAF3E3] border border-[#E49548] rounded-2xl text-xs text-[#1E3954] flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#E49548] shrink-0" />
          <span>
            <strong>Penting bagi Peserta:</strong> Pada Babak Penyisihan, soal-soal pilihan ganda maupun isian singkat menuntut kombinasi ketiga pilar sekaligus untuk mencapai skor optimal.
          </span>
        </div>
      </div>

      {/* Scoring Mechanism */}
      <div className="bg-[#2C4B6B]/90 border-2 border-[#E49548] rounded-3xl p-6 sm:p-8 shadow-lg space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#E49548] text-[#1E3954] flex items-center justify-center shadow-xs shrink-0">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h2 className="inline-block text-sm font-extrabold uppercase tracking-wider bg-[#F4E6CC] text-[#1E3954] px-3.5 py-1 rounded-full">
              Sistem Penilaian (Scoring System)
            </h2>
            <p className="text-xs text-[#DCE9F5] mt-1">Standar resmi Olimpiade Sains Nasional (OSN)</p>
          </div>
        </div>
        <p className="text-xs text-[#EDF4FA] leading-relaxed">
          Penilaian babak objektif mengadopsi standar resmi OSN untuk menguji keyakinan, presisi, dan integritas strategi peserta:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-[#FAF3E3] border-2 border-[#E49548] p-4 rounded-2xl text-center shadow-xs">
            <span className="text-emerald-700 font-mono font-extrabold text-xl block">+4 Poin</span>
            <span className="text-[#1E3954] font-bold mt-1 block">Jawaban Benar</span>
            <span className="text-[11px] text-[#3B5F84] mt-0.5 block">Skor standar per butir soal pilihan ganda</span>
          </div>
          <div className="bg-[#FAF3E3] border-2 border-[#E49548] p-4 rounded-2xl text-center shadow-xs">
            <span className="text-rose-700 font-mono font-extrabold text-xl block">-1 Poin</span>
            <span className="text-[#1E3954] font-bold mt-1 block">Jawaban Salah</span>
            <span className="text-[11px] text-[#3B5F84] mt-0.5 block">Pengurangan poin jika keliru</span>
          </div>
          <div className="bg-[#FAF3E3] border-2 border-[#E49548] p-4 rounded-2xl text-center shadow-xs">
            <span className="text-[#3B5F84] font-mono font-extrabold text-xl block">0 Poin</span>
            <span className="text-[#1E3954] font-bold mt-1 block">Tidak Dijawab / Kosong</span>
            <span className="text-[11px] text-[#3B5F84] mt-0.5 block">Tidak ada penambahan/pengurangan</span>
          </div>
        </div>
      </div>

      {/* Anti-cheat Policy */}
      <div className="bg-[#2C4B6B]/90 border-2 border-[#E49548] rounded-3xl p-6 sm:p-8 shadow-lg space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#E49548] text-[#1E3954] flex items-center justify-center shadow-xs shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="inline-block text-sm font-extrabold uppercase tracking-wider bg-[#F4E6CC] text-[#1E3954] px-3.5 py-1 rounded-full">
              Protokol Anti-Cheat &amp; Tata Tertib Layar
            </h2>
            <p className="text-xs text-[#DCE9F5] mt-1">Pengawasan integritas daring berstandar tinggi</p>
          </div>
        </div>
        <ul className="space-y-3 text-xs text-[#EDF4FA]">
          <li className="flex items-start gap-2.5">
            <div className="w-2 h-2 rounded-full bg-[#E49548] mt-1.5 shrink-0" />
            <div>
              <strong className="text-[#F4E6CC]">Kunci Layar Penuh (Fullscreen Lockdown):</strong> Seluruh peserta diwajibkan mengaktifkan mode layar penuh selama ujian berlangsung.
            </div>
          </li>
          <li className="flex items-start gap-2.5">
            <div className="w-2 h-2 rounded-full bg-[#E49548] mt-1.5 shrink-0" />
            <div>
              <strong className="text-[#F4E6CC]">Deteksi Alih Tab &amp; Jendela:</strong> Dilarang berpindah tab browser atau membuka aplikasi pendukung lainnya. Setiap pelanggaran dicatat secara otomatis.
            </div>
          </li>
          <li className="flex items-start gap-2.5">
            <div className="w-2 h-2 rounded-full bg-[#E49548] mt-1.5 shrink-0" />
            <div>
              <strong className="text-[#F4E6CC]">Pemblokiran Salin-Tempel (Clipboard Guard):</strong> Fitur Copy, Paste, Cut, Klik Kanan, dan pintasan pengembang dinonaktifkan demi keadilan kompetisi.
            </div>
          </li>
          <li className="flex items-start gap-2.5">
            <div className="w-2 h-2 rounded-full bg-[#E49548] mt-1.5 shrink-0" />
            <div>
              <strong className="text-[#F4E6CC]">Batas Toleransi Pelanggaran:</strong> Akumulasi 4 kali pelanggaran akan mengunci ujian dan membutuhkan verifikasi pengawas panitia.
            </div>
          </li>
        </ul>
      </div>

      {/* Syllabus Domains */}
      <div className="bg-[#2C4B6B]/90 border-2 border-[#E49548] rounded-3xl p-6 sm:p-8 shadow-lg space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#E49548] text-[#1E3954] flex items-center justify-center shadow-xs shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h2 className="inline-block text-sm font-extrabold uppercase tracking-wider bg-[#F4E6CC] text-[#1E3954] px-3.5 py-1 rounded-full">
              Silabus Materi Olimpiade (SMP &amp; SMA)
            </h2>
            <p className="text-xs text-[#DCE9F5] mt-1">Mencakup 4 domain utama matematika kompetisi</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-[#243E59]/90 p-4 rounded-2xl border border-[#E49548]/70">
            <h3 className="font-bold text-[#F4E6CC] mb-1.5">1. Aljabar</h3>
            <p className="text-[#DCE9F5] leading-relaxed">
              Persamaan &amp; pertidaksamaan kuadrat, pemfaktoran bentuk simetris, fungsi lantai/atap, polinomial, ketidaksamaan AM-GM &amp; Cauchy-Schwarz, serta matriks ordo 2x2.
            </p>
          </div>
          <div className="bg-[#243E59]/90 p-4 rounded-2xl border border-[#E49548]/70">
            <h3 className="font-bold text-[#F4E6CC] mb-1.5">2. Teori Bilangan</h3>
            <p className="text-[#DCE9F5] leading-relaxed">
              Keterbagian, bilangan prima, FPB &amp; KPK, aritmetika modulo, Teorema Sisa Cina (Chinese Remainder Theorem), Teorema Kecil Fermat, dan persamaan Diophantine.
            </p>
          </div>
          <div className="bg-[#243E59]/90 p-4 rounded-2xl border border-[#E49548]/70">
            <h3 className="font-bold text-[#F4E6CC] mb-1.5">3. Geometri</h3>
            <p className="text-[#DCE9F5] leading-relaxed">
              Kongruensi &amp; kesebangunan segitiga, Teorema Pythagoras &amp; Apollonius, lingkaran dalam &amp; luar, segiempat tali busur, Teorema Ceva &amp; Menelaus, serta trigonometri sudut.
            </p>
          </div>
          <div className="bg-[#243E59]/90 p-4 rounded-2xl border border-[#E49548]/70">
            <h3 className="font-bold text-[#F4E6CC] mb-1.5">4. Kombinatorika</h3>
            <p className="text-[#DCE9F5] leading-relaxed">
              Prinsip pencacahan dasar, permutasi &amp; kombinasi, prinsip sarang burung merpati (Pigeonhole Principle), relasi rekursif berulang, dan prinsip inklusi-eksklusi.
            </p>
          </div>
        </div>
      </div>

      {/* Start Button */}
      <div className="pt-4 flex justify-center">
        <button
          onClick={onStartExamClick}
          className="px-8 py-3.5 bg-[#E49548] hover:bg-[#CE7D30] text-[#1E3954] font-extrabold text-sm rounded-2xl transition-all duration-200 shadow-lg hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer border-2 border-[#F4E6CC]"
        >
          <span>Menuju ke Portal Pendaftaran Ujian</span>
          <ArrowRight className="w-4 h-4 text-[#1E3954]" />
        </button>
      </div>
    </div>
  );
};
