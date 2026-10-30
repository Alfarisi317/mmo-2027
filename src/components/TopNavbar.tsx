import React, { useState } from 'react';
import { ShieldCheck, Monitor, BookOpen, GraduationCap, Menu, X } from 'lucide-react';

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
        {/* Brand Wordmark in #646464 curved box */}
        <button
          onClick={() => handleNav('portal')}
          className="flex items-center gap-2.5 bg-[#646464] hover:bg-[#525252] text-white px-3.5 py-1.5 rounded-2xl border border-[#646464] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#646464] group cursor-pointer transition-all shadow-xs"
        >
          <div className="w-6 h-6 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center font-bold text-white text-[11px] tracking-wider">
            M
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold tracking-tight text-white leading-tight">
              MMO 2027
            </span>
            <span className="text-[10px] text-[#D5D5D5] leading-tight">
              Explore · Think · Excel
            </span>
          </div>
        </button>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-2 text-xs font-medium">
          <button
            onClick={() => handleNav('portal')}
            className={`px-3.5 py-1.5 rounded-2xl border transition-all cursor-pointer ${
              currentView === 'portal'
                ? 'bg-[#646464] text-white border-[#646464] font-semibold shadow-xs'
                : 'bg-white text-zinc-700 border-[#D5D5D5] hover:bg-[#D5D5D5]/40 hover:text-zinc-900'
            }`}
          >
            Portal Ujian
          </button>

          <button
            onClick={() => handleNav('proctor')}
            className={`px-3.5 py-1.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-1.5 ${
              currentView === 'proctor'
                ? 'bg-[#646464] text-white border-[#646464] font-semibold shadow-xs'
                : 'bg-white text-zinc-700 border-[#D5D5D5] hover:bg-[#D5D5D5]/40 hover:text-zinc-900'
            }`}
          >
            <Monitor className="w-3.5 h-3.5 text-zinc-600" />
            Dasbor Pengawas
          </button>

          <button
            onClick={() => handleNav('guidelines')}
            className={`px-3.5 py-1.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-1.5 ${
              currentView === 'guidelines'
                ? 'bg-[#646464] text-white border-[#646464] font-semibold shadow-xs'
                : 'bg-white text-zinc-700 border-[#D5D5D5] hover:bg-[#D5D5D5]/40 hover:text-zinc-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-zinc-600" />
            Pedoman & Aturan
          </button>

          <button
            onClick={() => handleNav('about')}
            className={`px-3.5 py-1.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-1.5 ${
              currentView === 'about'
                ? 'bg-[#646464] text-white border-[#646464] font-semibold shadow-xs'
                : 'bg-white text-zinc-700 border-[#D5D5D5] hover:bg-[#D5D5D5]/40 hover:text-zinc-900'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-zinc-600" />
            Pendidikan Matematika UMM
          </button>
        </nav>

        {/* Action Button & Mobile Hamburger Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleNav('portal')}
            className="hidden sm:flex px-4 py-2 text-xs font-semibold text-white bg-[#646464] hover:bg-[#525252] rounded-2xl transition-all shadow-xs whitespace-nowrap shrink-0 items-center gap-1.5 cursor-pointer border border-[#646464]"
          >
            <ShieldCheck className="w-4 h-4 text-white" />
            <span>Mulai Ujian MMO</span>
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-2xl bg-white border border-[#D5D5D5] text-zinc-700 hover:text-zinc-900 transition-colors cursor-pointer"
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
                ? 'bg-[#646464] text-white border-[#646464]'
                : 'bg-white text-zinc-800 border-[#D5D5D5]'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Portal Ujian Peserta
          </button>

          <button
            onClick={() => handleNav('proctor')}
            className={`w-full text-left px-4 py-2.5 rounded-2xl border text-xs font-semibold transition-all flex items-center gap-2 ${
              currentView === 'proctor'
                ? 'bg-[#646464] text-white border-[#646464]'
                : 'bg-white text-zinc-800 border-[#D5D5D5]'
            }`}
          >
            <Monitor className="w-4 h-4" />
            Dasbor Pengawas & Bank Soal
          </button>

          <button
            onClick={() => handleNav('guidelines')}
            className={`w-full text-left px-4 py-2.5 rounded-2xl border text-xs font-semibold transition-all flex items-center gap-2 ${
              currentView === 'guidelines'
                ? 'bg-[#646464] text-white border-[#646464]'
                : 'bg-white text-zinc-800 border-[#D5D5D5]'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Pedoman & Aturan Ujian
          </button>

          <button
            onClick={() => handleNav('about')}
            className={`w-full text-left px-4 py-2.5 rounded-2xl border text-xs font-semibold transition-all flex items-center gap-2 ${
              currentView === 'about'
                ? 'bg-[#646464] text-white border-[#646464]'
                : 'bg-white text-zinc-800 border-[#D5D5D5]'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Pendidikan Matematika UMM
          </button>
        </div>
      )}
    </header>
  );
};
