import React from 'react';
import { Award, GraduationCap, MapPin, Mail, Globe, CheckCircle, Sparkles } from 'lucide-react';

export const AboutView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 lg:py-12 space-y-8 text-white">
      {/* Header */}
      <div className="border-b-2 border-[#E49548]/60 pb-6">
        <div className="inline-flex items-center gap-2 bg-[#F4E6CC] text-[#1E3954] px-4 py-1.5 rounded-full text-xs font-extrabold shadow-xs mb-3 border border-[#E49548]">
          <Sparkles className="w-3.5 h-3.5 text-[#CE7D30]" />
          <span>Penyelenggara Resmi Kompetisi</span>
        </div>
        <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
          HMPS MATRIKS Bidang Keilmuan
        </h1>
        <p className="text-xs text-[#DCE9F5] mt-1">
          Program Studi Pendidikan Matematika · Universitas Muhammadiyah Malang (UMM)
        </p>
      </div>

      {/* Narrative Section with Steel Blue & Orange Frame */}
      <div className="bg-[#2C4B6B]/90 border-2 border-[#E49548] rounded-3xl p-6 lg:p-8 shadow-lg space-y-5 transition-all duration-200">
        <div className="bg-[#243E59] text-white p-5 rounded-2xl border border-[#E49548]/70 shadow-sm relative overflow-hidden">
          <span className="inline-block text-[11px] uppercase tracking-wider bg-[#F4E6CC] text-[#1E3954] px-3 py-0.5 rounded-full font-extrabold mb-2">
            Tema Resmi Kompetisi
          </span>
          <p className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
            “Matriks Mathematics Olympiad: Explore, Think, Excel”
          </p>
          <p className="text-xs text-[#F4E6CC] mt-1 font-semibold">
            Jelajahi Matematika · Asah Penalaran · Tunjukkan Kemampuan Terbaik
          </p>
        </div>

        <h2 className="inline-block text-sm font-extrabold uppercase tracking-wider bg-[#F4E6CC] text-[#1E3954] px-4 py-1 rounded-full">
          Tentang MMO (Matriks Mathematics Olympiad)
        </h2>

        <p className="text-xs lg:text-sm text-[#EDF4FA] leading-relaxed">
          <strong className="text-white">MMO (Matriks Mathematics Olympiad)</strong> adalah ajang kompetisi matematika tahunan bergengsi tingkat nasional yang diselenggarakan oleh <strong className="text-white">Himpunan Mahasiswa Program Studi (HMPS) MATRIKS Bidang Keilmuan</strong>, Program Studi Pendidikan Matematika, Universitas Muhammadiyah Malang.
        </p>
        <p className="text-xs lg:text-sm text-[#EDF4FA] leading-relaxed">
          Kompetisi ini ditujukan bagi siswa-siswi berprestasi jenjang <strong className="text-white">SMP/MTs sederajat</strong> dan <strong className="text-white">SMA/MA/SMK sederajat</strong> di seluruh Indonesia, diselenggarakan dalam format digital modern dengan mengedepankan integritas akademik tinggi melalui sistem pengawasan proktor AI, kunci layar penuh anti-cheat, serta penilaian berstandar olimpiade nasional.
        </p>
      </div>

      {/* Institution Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-[#2C4B6B]/90 border-2 border-[#E49548] rounded-3xl p-6 shadow-md space-y-3 transition-all duration-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E49548] text-[#1E3954] flex items-center justify-center shadow-xs shrink-0">
              <GraduationCap className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-extrabold bg-[#F4E6CC] text-[#1E3954] px-3 py-1 rounded-full">
              Prodi Pendidikan Matematika UMM
            </h3>
          </div>
          <p className="text-xs text-[#EDF4FA] leading-relaxed">
            Menghasilkan pendidik matematika yang unggul, profesional, inovatif berlandaskan nilai-nilai keislaman dan teknologi pendidikan modern. Terakreditasi Unggul oleh Lembaga Akreditasi Mandiri Kependidikan (LAMDIK).
          </p>
          <div className="pt-2 border-t border-[#E49548]/40 text-xs text-[#DCE9F5] space-y-1.5 font-mono">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-[#E49548] shrink-0" />
              <span>Kampus III UMM, Jl. Raya Tlogomas No. 246, Malang, Jawa Timur</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-[#F4E6CC] shrink-0" />
              <span>matematika@umm.ac.id</span>
            </div>
          </div>
        </div>

        <div className="bg-[#2C4B6B]/90 border-2 border-[#E49548] rounded-3xl p-6 shadow-md space-y-3 transition-all duration-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E49548] text-[#1E3954] flex items-center justify-center shadow-xs shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-extrabold bg-[#F4E6CC] text-[#1E3954] px-3 py-1 rounded-full">
              HMPS MATRIKS Bidang Keilmuan
            </h3>
          </div>
          <p className="text-xs text-[#EDF4FA] leading-relaxed">
            Bidang Keilmuan HMPS MATRIKS bergerak secara khusus dalam pengembangan potensi sains, penalaran matematis, penyelenggaraan olimpiade, workshop pengolahan data, dan kajian pendidikan saintifik bagi generasi muda.
          </p>
          <div className="pt-2 border-t border-[#E49548]/40 text-xs text-[#DCE9F5] space-y-1.5 font-mono">
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-[#E49548] shrink-0" />
              <span>Instagram: @hmpsmatriks_umm</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span>Official MMO Portal AI Proctor Engine</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
