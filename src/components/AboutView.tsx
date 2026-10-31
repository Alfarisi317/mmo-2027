import React from 'react';
import { Award, GraduationCap, MapPin, Mail, Globe, CheckCircle, Sparkles } from 'lucide-react';

export const AboutView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 lg:py-12 space-y-8 bg-white text-zinc-900">
      {/* Header */}
      <div className="border-b border-[#D5D5D5] pb-6">
        <div className="inline-flex items-center gap-2 bg-[#53585E] text-white px-3.5 py-1.5 rounded-2xl text-xs font-semibold shadow-xs mb-3 border border-[#83B9DF]/30">
          <Sparkles className="w-3.5 h-3.5 text-[#83B9DF]" />
          <span>Penyelenggara Resmi Kompetisi</span>
        </div>
        <h1 className="text-2xl lg:text-3xl font-extrabold text-[#53585E] tracking-tight">
          HMPS MATRIKS Bidang Keilmuan
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Program Studi Pendidikan Matematika · Universitas Muhammadiyah Malang (UMM)
        </p>
      </div>

      {/* Narrative Section with Iron Gate & Sky Blue */}
      <div className="bg-[#fafafa] border border-[#D5D5D5] hover:border-[#83B9DF]/60 rounded-3xl p-6 lg:p-8 shadow-xs space-y-5 transition-all duration-300">
        <div className="bg-[#53585E] text-white p-5 rounded-2xl border border-[#83B9DF]/30 shadow-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#83B9DF]/10 rounded-full blur-2xl group-hover:bg-[#83B9DF]/20 transition-all duration-500" />
          <span className="text-[11px] uppercase tracking-wider text-[#83B9DF] font-bold block mb-1">
            Tema Resmi Kompetisi
          </span>
          <p className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
            “Matriks Mathematics Olympiad: Explore, Think, Excel”
          </p>
          <p className="text-xs text-[#83B9DF] mt-1 font-medium">
            Jelajahi Matematika · Asah Penalaran · Tunjukkan Kemampuan Terbaik
          </p>
        </div>
        <h2 className="text-base font-bold text-[#53585E]">
          Tentang MMO (Matriks Mathematics Olympiad)
        </h2>
        <p className="text-xs lg:text-sm text-zinc-700 leading-relaxed">
          <strong>MMO (Matriks Mathematics Olympiad)</strong> adalah ajang kompetisi matematika tahunan bergengsi tingkat nasional yang diselenggarakan oleh <strong>Himpunan Mahasiswa Program Studi (HMPS) MATRIKS Bidang Keilmuan</strong>, Program Studi Pendidikan Matematika, Universitas Muhammadiyah Malang.
        </p>
        <p className="text-xs lg:text-sm text-zinc-700 leading-relaxed">
          Kompetisi ini ditujukan bagi siswa-siswi berprestasi jenjang <strong>SMP/MTs sederajat</strong> dan <strong>SMA/MA/SMK sederajat</strong> di seluruh Indonesia, diselenggarakan dalam format digital modern dengan mengedepankan integritas akademik tinggi melalui sistem pengawasan proktor AI, kunci layar penuh anti-cheat, serta penilaian berstandar olimpiade nasional.
        </p>
      </div>

      {/* Institution Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-[#D5D5D5] hover:border-[#83B9DF] rounded-3xl p-6 shadow-xs hover:shadow-[0_8px_25px_rgba(131,185,223,0.22)] hover:-translate-y-0.5 transition-all duration-300 space-y-3">
          <div className="flex items-center gap-2 text-[#53585E]">
            <div className="w-8 h-8 rounded-xl bg-[#53585E] text-[#83B9DF] flex items-center justify-center shadow-xs">
              <GraduationCap className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#53585E]">Program Studi Pendidikan Matematika UMM</h3>
          </div>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Menghasilkan pendidik matematika yang unggul, profesional, inovatif berlandaskan nilai-nilai keislaman dan teknologi pendidikan modern. Terakreditasi Unggul oleh Lembaga Akreditasi Mandiri Kependidikan (LAMDIK).
          </p>
          <div className="pt-2 text-xs text-zinc-500 space-y-1 font-mono">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-[#53585E]" />
              <span>Kampus III UMM, Jl. Raya Tlogomas No. 246, Malang, Jawa Timur</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-[#83B9DF]" />
              <span>matematika@umm.ac.id</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#D5D5D5] hover:border-[#83B9DF] rounded-3xl p-6 shadow-xs hover:shadow-[0_8px_25px_rgba(131,185,223,0.22)] hover:-translate-y-0.5 transition-all duration-300 space-y-3">
          <div className="flex items-center gap-2 text-[#53585E]">
            <div className="w-8 h-8 rounded-xl bg-[#53585E] text-[#83B9DF] flex items-center justify-center shadow-xs">
              <Award className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#53585E]">HMPS MATRIKS Bidang Keilmuan</h3>
          </div>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Bidang Keilmuan HMPS MATRIKS bergerak secara khusus dalam pengembangan potensi sains, penalaran matematis, penyelenggaraan olimpiade, workshop pengolahan data, dan kajian pendidikan saintifik bagi generasi muda.
          </p>
          <div className="pt-2 text-xs text-zinc-500 space-y-1 font-mono">
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-[#53585E]" />
              <span>Instagram: @hmpsmatriks_umm</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Official MMO Portal AI Proctor Engine</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
