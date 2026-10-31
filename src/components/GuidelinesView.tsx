import React from 'react';
import { ShieldCheck, BookOpen, ArrowRight, Award, Compass, Brain, Trophy, Sparkles } from 'lucide-react';

interface GuidelinesViewProps {
  onStartExamClick: () => void;
}

export const GuidelinesView: React.FC<GuidelinesViewProps> = ({ onStartExamClick }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 lg:py-12 space-y-8 bg-white text-zinc-900">
      {/* Header */}
      <div className="border-b border-[#D5D5D5] pb-6">
        <div className="inline-flex items-center gap-2 bg-[#53585E] text-white px-3.5 py-1.5 rounded-2xl text-xs font-semibold shadow-xs mb-3 border border-[#83B9DF]/30">
          <Sparkles className="w-3.5 h-3.5 text-[#83B9DF]" />
          <span>Buku Pedoman Teknis & Regulasi MMO 2027</span>
        </div>
        <h1 className="text-2xl lg:text-3xl font-extrabold text-[#53585E] tracking-tight">
          Panduan Resmi Pelaksanaan MMO 2027
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Matriks Mathematics Olympiad: “Explore, Think, Excel” · HMPS Pendidikan Matematika Universitas Muhammadiyah Malang
        </p>
      </div>

      {/* 3 Integrated Pillars Theme Card */}
      <div className="bg-[#fafafa] border border-[#D5D5D5] rounded-3xl p-6 sm:p-8 shadow-xs space-y-5 transition-all duration-300 hover:border-[#83B9DF]/70 hover:shadow-[0_8px_25px_rgba(131,185,223,0.18)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#83B9DF]/20 text-[#53585E] px-2.5 py-1 rounded-lg border border-[#83B9DF]/40">
              Prinsip Nalar Kompetisi
            </span>
            <span className="text-xs text-zinc-500 font-medium">
              Berlaku Terpadu di Seluruh Babak (Penyisihan, Semifinal, Final)
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#53585E] mt-2">
            3 Pilar Nalar Matematika Terintegrasi: Explore · Think · Excel
          </h2>
          <p className="text-xs text-zinc-600 leading-relaxed mt-1">
            Karakter soal di MMO 2027 dirancang bukan sekadar hafalan rumus atau hitungan biasa. Ketiga pilar nalar matematika ini <strong>terintegrasi secara menyeluruh di semua babak kompetisi (termasuk Babak Penyisihan)</strong>. Peserta diuji mulai dari kemampuan mengenali pola, menganalisis hubungan logika, hingga menghasilkan solusi optimal dengan presisi mutlak:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
          {/* Pilar 1: Explore */}
          <div className="bg-white border border-[#D5D5D5] hover:border-[#83B9DF] p-5 rounded-2xl shadow-xs hover:shadow-[0_10px_25px_rgba(131,185,223,0.28)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group cursor-default">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#83B9DF]/15 text-[#53585E] px-2.5 py-1 rounded-lg border border-[#83B9DF]/40 group-hover:bg-[#83B9DF] group-hover:text-white transition-colors duration-300">
                  Pilar 1 · Eksplorasi
                </span>
                <div className="w-8 h-8 rounded-xl bg-[#53585E] text-[#83B9DF] group-hover:bg-[#83B9DF] group-hover:text-white flex items-center justify-center transition-all duration-300 shadow-xs">
                  <Compass className="w-4 h-4" />
                </div>
              </div>
              <h3 className="font-extrabold text-[#53585E] group-hover:text-[#41454a] text-base tracking-tight transition-colors">
                EXPLORE
              </h3>
              <p className="text-zinc-600 text-xs leading-relaxed mt-2">
                Menyelidiki pola bilangan tersembunyi, abstraksi bentuk geometri, struktur diagram/tabel, dan menemukan petunjuk awal pemecahan masalah dari informasi yang disajikan.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#D5D5D5]/80 space-y-1">
              <span className="text-[10px] font-bold text-[#53585E] block uppercase tracking-wider">
                Fokus Kompetensi:
              </span>
              <p className="text-[11px] text-zinc-500 leading-normal">
                Observasi analitis, pemodelan matematis awal, dan dekonstruksi struktur masalah.
              </p>
            </div>
          </div>

          {/* Pilar 2: Think */}
          <div className="bg-white border border-[#D5D5D5] hover:border-[#83B9DF] p-5 rounded-2xl shadow-xs hover:shadow-[0_10px_25px_rgba(131,185,223,0.28)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group cursor-default">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#83B9DF]/15 text-[#53585E] px-2.5 py-1 rounded-lg border border-[#83B9DF]/40 group-hover:bg-[#83B9DF] group-hover:text-white transition-colors duration-300">
                  Pilar 2 · Penalaran
                </span>
                <div className="w-8 h-8 rounded-xl bg-[#53585E] text-[#83B9DF] group-hover:bg-[#83B9DF] group-hover:text-white flex items-center justify-center transition-all duration-300 shadow-xs">
                  <Brain className="w-4 h-4" />
                </div>
              </div>
              <h3 className="font-extrabold text-[#53585E] group-hover:text-[#41454a] text-base tracking-tight transition-colors">
                THINK
              </h3>
              <p className="text-zinc-600 text-xs leading-relaxed mt-2">
                Bernalar deduktif dan induktif yang kokoh, menguji hipotesis, menganalisis kondisi majemuk secara kritis, serta mengeliminasi kontradiksi logika dalam setiap butir soal.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#D5D5D5]/80 space-y-1">
              <span className="text-[10px] font-bold text-[#53585E] block uppercase tracking-wider">
                Fokus Kompetensi:
              </span>
              <p className="text-[11px] text-zinc-500 leading-normal">
                Deduksi logis, evaluasi kondisi bersyarat, dan eliminasi jebakan matematika.
              </p>
            </div>
          </div>

          {/* Pilar 3: Excel */}
          <div className="bg-white border border-[#D5D5D5] hover:border-[#83B9DF] p-5 rounded-2xl shadow-xs hover:shadow-[0_10px_25px_rgba(131,185,223,0.28)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group cursor-default">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#83B9DF]/15 text-[#53585E] px-2.5 py-1 rounded-lg border border-[#83B9DF]/40 group-hover:bg-[#83B9DF] group-hover:text-white transition-colors duration-300">
                  Pilar 3 · Keunggulan
                </span>
                <div className="w-8 h-8 rounded-xl bg-[#53585E] text-[#83B9DF] group-hover:bg-[#83B9DF] group-hover:text-white flex items-center justify-center transition-all duration-300 shadow-xs">
                  <Trophy className="w-4 h-4" />
                </div>
              </div>
              <h3 className="font-extrabold text-[#53585E] group-hover:text-[#41454a] text-base tracking-tight transition-colors">
                EXCEL
              </h3>
              <p className="text-zinc-600 text-xs leading-relaxed mt-2">
                Menunjukkan keunggulan komputasi dengan ketelitian tinggi, kecepatan perumusan strategi, sintesis konsep lintas bidang ilmu, dan akurasi solusi akhir yang tuntas.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#D5D5D5]/80 space-y-1">
              <span className="text-[10px] font-bold text-[#53585E] block uppercase tracking-wider">
                Fokus Kompetensi:
              </span>
              <p className="text-[11px] text-zinc-500 leading-normal">
                Ketepatan komputasi mutlak, kecepatan penentuan solusi, dan sintesis konsep.
              </p>
            </div>
          </div>
        </div>

        <div className="p-3.5 bg-white border border-[#83B9DF]/40 rounded-2xl text-[11px] text-zinc-600 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#83B9DF] shrink-0" />
          <span>
            <strong>Penting bagi Peserta:</strong> Pada Babak Penyisihan, soal-soal pilihan ganda maupun isian singkat menuntut kombinasi ketiga pilar sekaligus untuk mencapai skor optimal.
          </span>
        </div>
      </div>

      {/* Scoring Mechanism */}
      <div className="bg-[#fafafa] border border-[#D5D5D5] rounded-3xl p-6 sm:p-8 shadow-xs space-y-4 hover:border-[#83B9DF]/60 transition-all duration-300">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#53585E] text-[#83B9DF] flex items-center justify-center shadow-xs">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#53585E]">Sistem Penilaian (Scoring System)</h2>
            <p className="text-xs text-zinc-500">Standar resmi Olimpiade Sains Nasional (OSN)</p>
          </div>
        </div>
        <p className="text-xs text-zinc-600 leading-relaxed">
          Penilaian babak objektif mengadopsi standar resmi OSN untuk menguji keyakinan, presisi, dan integritas strategi peserta:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-white border border-[#D5D5D5] hover:border-emerald-400 p-4 rounded-2xl text-center shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
            <span className="text-emerald-700 font-mono font-bold text-xl block">+4 Poin</span>
            <span className="text-zinc-800 font-semibold mt-1 block">Jawaban Benar</span>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Skor standar per butir soal pilihan ganda</span>
          </div>
          <div className="bg-white border border-[#D5D5D5] hover:border-rose-400 p-4 rounded-2xl text-center shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
            <span className="text-rose-700 font-mono font-bold text-xl block">-1 Poin</span>
            <span className="text-zinc-800 font-semibold mt-1 block">Jawaban Salah</span>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Pengurangan poin jika keliru</span>
          </div>
          <div className="bg-white border border-[#D5D5D5] hover:border-zinc-400 p-4 rounded-2xl text-center shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
            <span className="text-zinc-500 font-mono font-bold text-xl block">0 Poin</span>
            <span className="text-zinc-800 font-semibold mt-1 block">Tidak Dijawab / Kosong</span>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">Tidak ada penambahan/pengurangan</span>
          </div>
        </div>
      </div>

      {/* Anti-cheat Policy */}
      <div className="bg-[#fafafa] border border-[#D5D5D5] rounded-3xl p-6 sm:p-8 shadow-xs space-y-4 hover:border-[#83B9DF]/60 transition-all duration-300">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#53585E] text-[#83B9DF] flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#53585E]">Protokol Anti-Cheat & Tata Tertib Layar</h2>
            <p className="text-xs text-zinc-500">Pengawasan integritas daring berstandar tinggi</p>
          </div>
        </div>
        <ul className="space-y-3 text-xs text-zinc-700">
          <li className="flex items-start gap-2.5">
            <div className="w-2 h-2 rounded-full bg-[#83B9DF] mt-1.5 shrink-0" />
            <div>
              <strong className="text-zinc-900">Kunci Layar Penuh (Fullscreen Lockdown):</strong> Seluruh peserta diwajibkan mengaktifkan mode layar penuh selama ujian berlangsung.
            </div>
          </li>
          <li className="flex items-start gap-2.5">
            <div className="w-2 h-2 rounded-full bg-[#83B9DF] mt-1.5 shrink-0" />
            <div>
              <strong className="text-zinc-900">Deteksi Alih Tab & Jendela:</strong> Dilarang berpindah tab browser atau membuka aplikasi pendukung lainnya. Setiap pelanggaran dicatat secara otomatis.
            </div>
          </li>
          <li className="flex items-start gap-2.5">
            <div className="w-2 h-2 rounded-full bg-[#83B9DF] mt-1.5 shrink-0" />
            <div>
              <strong className="text-zinc-900">Pemblokiran Salin-Tempel (Clipboard Guard):</strong> Fitur Copy, Paste, Cut, Klik Kanan, dan pintasan pengembang dinonaktifkan demi keadilan kompetisi.
            </div>
          </li>
          <li className="flex items-start gap-2.5">
            <div className="w-2 h-2 rounded-full bg-[#83B9DF] mt-1.5 shrink-0" />
            <div>
              <strong className="text-zinc-900">Batas Toleransi Pelanggaran:</strong> Akumulasi 4 kali pelanggaran akan mengunci ujian dan membutuhkan verifikasi pengawas panitia.
            </div>
          </li>
        </ul>
      </div>

      {/* Syllabus Domains */}
      <div className="bg-[#fafafa] border border-[#D5D5D5] rounded-3xl p-6 sm:p-8 shadow-xs space-y-4 hover:border-[#83B9DF]/60 transition-all duration-300">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#53585E] text-[#83B9DF] flex items-center justify-center shadow-xs">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#53585E]">Silabus Materi Olimpiade (SMP & SMA)</h2>
            <p className="text-xs text-zinc-500">Mencakup 4 domain utama matematika kompetisi</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-white p-4 rounded-2xl border border-[#D5D5D5] hover:border-[#83B9DF] shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
            <h3 className="font-bold text-[#53585E] mb-1.5">1. Aljabar</h3>
            <p className="text-zinc-600 leading-relaxed">
              Persamaan & pertidaksamaan kuadrat, pemfaktoran bentuk simetris, fungsi lantai/atap, polinomial, ketidaksamaan AM-GM & Cauchy-Schwarz, serta matriks ordo 2x2.
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-[#D5D5D5] hover:border-[#83B9DF] shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
            <h3 className="font-bold text-[#53585E] mb-1.5">2. Teori Bilangan</h3>
            <p className="text-zinc-600 leading-relaxed">
              Keterbagian, bilangan prima, FPB & KPK, aritmetika modulo, Teorema Sisa Cina (Chinese Remainder Theorem), Teorema Kecil Fermat, dan persamaan Diophantine.
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-[#D5D5D5] hover:border-[#83B9DF] shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
            <h3 className="font-bold text-[#53585E] mb-1.5">3. Geometri</h3>
            <p className="text-zinc-600 leading-relaxed">
              Kongruensi & kesebangunan segitiga, Teorema Pythagoras & Apollonius, lingkaran dalam & luar, segiempat tali busur, Teorema Ceva & Menelaus, serta trigonometri sudut.
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-[#D5D5D5] hover:border-[#83B9DF] shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
            <h3 className="font-bold text-[#53585E] mb-1.5">4. Kombinatorika</h3>
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
          className="px-8 py-3.5 bg-[#53585E] hover:bg-[#41454a] text-white font-extrabold text-sm rounded-2xl transition-all duration-300 shadow-md hover:shadow-[0_10px_25px_rgba(131,185,223,0.45)] hover:-translate-y-0.5 hover:border-[#83B9DF] flex items-center gap-2 cursor-pointer border border-[#53585E]"
        >
          <span>Menuju ke Portal Pendaftaran Ujian</span>
          <ArrowRight className="w-4 h-4 text-[#83B9DF]" />
        </button>
      </div>
    </div>
  );
};
