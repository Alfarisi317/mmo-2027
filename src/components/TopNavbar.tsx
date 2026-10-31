import React, { useState } from 'react';
import { ShieldCheck, Monitor, BookOpen, GraduationCap, Menu, X, Sparkles } from 'lucide-react';

interface TopNavbarProps {
  currentView: 'portal' | 'exam' | 'receipt' | 'proctor' | 'guidelines' | 'about';
  onNavigate: (view: 'portal' | 'exam' | 'receipt' | 'proctor' | 'guidelines' | 'about') => void;
  examInProgress?: boolean;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  currentView,
  onNavigate,
  examInProgress = false,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  if (examInProgress) {
    return null;
  }

  const handleNav = (view: 'portal' | 'exam' | 'receipt' | 'proctor' | 'guidelines' | 'about') => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#f7f7f8]/95 backdrop-blur-md border-b border-[#D5D5D5] px-4 sm:px-8 py-3 transition-colors shadow-2xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Wordmark in #53585E curved box with Sky Blue glow */}
        <button
          onClick={() => handleNav('portal')}
          className="flex items-center gap-2.5 bg-[#53585E] hover:bg-[#41454a] text-white px-3.5 py-1.5 rounded-2xl border border-[#83B9DF]/40 hover:border-[#83B9DF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#83B9DF] group cursor-pointer transition-all duration-300 shadow-xs hover:shadow-[0_4px_16px_rgba(131,185,223,0.35)] hover:-translate-y-0.5"
        >
          <div className="w-6 h-6 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center font-bold text-white text-[11px] tracking-wider group-hover:scale-105 transition-transform">
            M
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-extrabold tracking-tight text-white leading-tight flex items-center gap-1">
              <span>MMO 2027</span>
              <Sparkles className="w-2.5 h-2.5 text-[#83B9DF] opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
            <span className="text-[10px] text-[#83B9DF] leading-tight font-medium">
              Explore · Think · Excel
            </span>
          </div>
        </button>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-2 text-xs font-medium">
          <button
            onClick={() => handleNav('portal')}
            className={`px-3.5 py-1.5 rounded-2xl border transition-all duration-300 cursor-pointer ${
              currentView === 'portal'
                ? 'bg-[#53585E] text-white border-[#83B9DF]/50 font-bold shadow-xs'
                : 'bg-white text-zinc-700 border-[#D5D5D5] hover:border-[#83B9DF] hover:text-[#53585E] hover:shadow-[0_4px_12px_rgba(131,185,223,0.2)]'
            }`}
          >
            Portal Ujian
          </button>

          <button
            onClick={() => handleNav('proctor')}
            className={`px-3.5 py-1.5 rounded-2xl border transition-all duration-300 cursor-pointer flex items-center gap-1.5 ${
              currentView === 'proctor'
                ? 'bg-[#53585E] text-white border-[#83B9DF]/50 font-bold shadow-xs'
                : 'bg-white text-zinc-700 border-[#D5D5D5] hover:border-[#83B9DF] hover:text-[#53585E] hover:shadow-[0_4px_12px_rgba(131,185,223,0.2)]'
            }`}
          >
            <Monitor className="w-3.5 h-3.5 text-[#83B9DF]" />
            Dasbor Pengawas
          </button>

          <button
            onClick={() => handleNav('guidelines')}
            className={`px-3.5 py-1.5 rounded-2xl border transition-all duration-300 cursor-pointer flex items-center gap-1.5 ${
              currentView === 'guidelines'
                ? 'bg-[#53585E] text-white border-[#83B9DF]/50 font-bold shadow-xs'
                : 'bg-white text-zinc-700 border-[#D5D5D5] hover:border-[#83B9DF] hover:text-[#53585E] hover:shadow-[0_4px_12px_rgba(131,185,223,0.2)]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-[#83B9DF]" />
            Pedoman & Aturan
          </button>

          <button
            onClick={() => handleNav('about')}
            className={`px-3.5 py-1.5 rounded-2xl border transition-all duration-300 cursor-pointer flex items-center gap-1.5 ${
              currentView === 'about'
                ? 'bg-[#53585E] text-white border-[#83B9DF]/50 font-bold shadow-xs'
                : 'bg-white text-zinc-700 border-[#D5D5D5] hover:border-[#83B9DF] hover:text-[#53585E] hover:shadow-[0_4px_12px_rgba(131,185,223,0.2)]'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-[#83B9DF]" />
            Pendidikan Matematika UMM
          </button>
        </nav>

        {/* Action Button & Mobile Hamburger Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleNav('portal')}
            className="hidden sm:flex px-4 py-2 text-xs font-extrabold text-white bg-[#53585E] hover:bg-[#41454a] rounded-2xl transition-all duration-300 shadow-sm hover:shadow-[0_6px_20px_rgba(131,185,223,0.4)] hover:-translate-y-0.5 whitespace-nowrap shrink-0 items-center gap-1.5 cursor-pointer border border-[#83B9DF]/40"
          >
            <ShieldCheck className="w-4 h-4 text-[#83B9DF]" />
            <span>Mulai Ujian MMO</span>
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-2xl bg-white border border-[#D5D5D5] hover:border-[#83B9DF] text-zinc-700 hover:text-[#53585E] transition-colors cursor-pointer"
            aria-label="Buka Menu Navigasi"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer (HP Responsive) */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-[#D5D5D5] space-y-2 animate-in fade-in slide-in-from-top-2">
          <button
            onClick={() => handleNav('portal')}
            className={`w-full text-left px-4 py-2.5 rounded-2xl border text-xs font-semibold transition-all flex items-center gap-2 ${
              currentView === 'portal'
                ? 'bg-[#53585E] text-white border-[#83B9DF]/50'
                : 'bg-white text-zinc-800 border-[#D5D5D5] hover:border-[#83B9DF]'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-[#83B9DF]" />
            Portal Ujian Peserta
          </button>

          <button
            onClick={() => handleNav('proctor')}
            className={`w-full text-left px-4 py-2.5 rounded-2xl border text-xs font-semibold transition-all flex items-center gap-2 ${
              currentView === 'proctor'
                ? 'bg-[#53585E] text-white border-[#83B9DF]/50'
                : 'bg-white text-zinc-800 border-[#D5D5D5] hover:border-[#83B9DF]'
            }`}
          >
            <Monitor className="w-4 h-4 text-[#83B9DF]" />
            Dasbor Pengawas & Bank Soal
          </button>

          <button
            onClick={() => handleNav('guidelines')}
            className={`w-full text-left px-4 py-2.5 rounded-2xl border text-xs font-semibold transition-all flex items-center gap-2 ${
              currentView === 'guidelines'
                ? 'bg-[#53585E] text-white border-[#83B9DF]/50'
                : 'bg-white text-zinc-800 border-[#D5D5D5] hover:border-[#83B9DF]'
            }`}
          >
            <BookOpen className="w-4 h-4 text-[#83B9DF]" />
            Pedoman Teknis & Aturan
          </button>

          <button
            onClick={() => handleNav('about')}
            className={`w-full text-left px-4 py-2.5 rounded-2xl border text-xs font-semibold transition-all flex items-center gap-2 ${
              currentView === 'about'
                ? 'bg-[#53585E] text-white border-[#83B9DF]/50'
                : 'bg-white text-zinc-800 border-[#D5D5D5] hover:border-[#83B9DF]'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-[#83B9DF]" />
            Pendidikan Matematika UMM
          </button>
        </div>
      )}
    </header>
  );
};
