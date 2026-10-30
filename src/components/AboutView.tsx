import React from 'react';
import { Award, GraduationCap, MapPin, Mail, Globe, CheckCircle } from 'lucide-react';

export const AboutView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 lg:py-12 space-y-8 bg-white text-zinc-900">
      {/* Header */}
      <div className="border-b border-zinc-200 pb-6">
        <span className="text-xs font-semibold text-zinc-500 tracking-wider uppercase block mb-1">
          Penyelenggara Resmi Kompetisi
        </span>
        <h1 className="text-2xl lg:text-3xl font-bold text-zinc-900 tracking-tight">
          HMPS MATRIKS Bidang Keilmuan
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Program Studi Pendidikan Matematika · Universitas Muhammadiyah Malang (UMM)
        </p>
      </div>

      {/* Narrative Section */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6 lg:p-8 shadow-xs space-y-4">
        <div className="bg-zinc-900 text-white p-4 rounded-xl">
          <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-bold block mb-0.5">
            Tema Resmi Kompetisi
          </span>
          <p className="text-lg font-bold italic text-white">
            “Matriks Mathematics Olympiad: Explore, Think, Excel”
          </p>
        </div>
        <h2 className="text-base font-bold text-zinc-900">
          Tentang MMO (Matriks Mathematics Olympiad)
        </h2>
        <p className="text-xs lg:text-sm text-zinc-700 leading-relaxed">
          <strong>MMO (Matriks Mathematics Olympiad)</strong> adalah ajang kompetisi matematika bergengsi tahunan tingkat nasional yang diselenggarakan oleh <strong>Himpunan Mahasiswa Program Studi (HMPS) MATRIKS Bidang Keilmuan</strong>, Program Studi Pendidikan Matematika, Universitas Muhammadiyah Malang.
        </p>
        <p className="text-xs lg:text-sm text-zinc-700 leading-relaxed">
          Kompetisi ini ditujukan bagi siswa-siswi berprestasi jenjang <strong>SMP/MTs sederajat</strong> dan <strong>SMA/MA/SMK sederajat</strong> di seluruh Indonesia, diselenggarakan dalam format hibrida (hybrid daring & luring) dengan mengedepankan integritas akademik tinggi melalui teknologi pengawasan Proktor AI, sistem kunci layar anti-cheat, serta penilaian berstandar olimpiade.
        </p>
      </div>

      {/* Institution Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-zinc-900">
            <GraduationCap className="w-5 h-5" />
            <h3 className="text-sm font-bold text-zinc-900">Program Studi Pendidikan Matematika UMM</h3>
          </div>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Menghasilkan pendidik matematika yang unggul, profesional, inovatif berlandaskan nilai-nilai keislaman dan teknologi pendidikan modern. Terakreditasi Unggul oleh Lembaga Akreditasi Mandiri Kependidikan (LAMDIK).
          </p>
          <div className="pt-2 text-xs text-zinc-500 space-y-1 font-mono">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-zinc-400" />
              <span>Kampus III UMM, Jl. Raya Tlogomas No. 246, Malang, Jawa Timur</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-zinc-400" />
              <span>matematika@umm.ac.id</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-zinc-900">
            <Award className="w-5 h-5" />
            <h3 className="text-sm font-bold text-zinc-900">HMPS MATRIKS Bidang Keilmuan</h3>
          </div>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Bidang Keilmuan HMPS MATRIKS bergerak secara khusus dalam pengembangan potensi sains, penalaran matematis, penyelenggaraan olimpiade, workshop pengolahan data, dan kajian pendidikan saintifik bagi generasi muda.
          </p>
          <div className="pt-2 text-xs text-zinc-500 space-y-1 font-mono">
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-zinc-400" />
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
