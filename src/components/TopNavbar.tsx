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
    <header className="sticky top-0 z-40 bg-[#274461]/95 backdrop-blur-md border-b-2 border-[#E49548] px-4 sm:px-8 py-3 transition-colors shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Wordmark */}
        <button
          onClick={() => handleNav('portal')}
          className="flex items-center gap-2.5 bg-[#2C4B6B] hover:bg-[#35587B] text-white px-3.5 py-1.5 rounded-2xl border-2 border-[#E49548] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F4E6CC] group cursor-pointer transition-all duration-200 shadow-xs"
        >
          <div className="w-7 h-7 rounded-xl bg-[#F4E6CC] text-[#1E3954] flex items-center justify-center font-extrabold text-xs tracking-wider group-hover:scale-105 transition-transform">
            M
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-extrabold tracking-tight text-white leading-tight flex items-center gap-1 whitespace-nowrap">
              <span>MMO 2027</span>
              <Sparkles className="w-2.5 h-2.5 text-[#E49548] opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
            <span className="text-[10px] text-[#F4E6CC] leading-tight font-semibold whitespace-nowrap">
              Explore · Think · Excel
            </span>
          </div>
        </button>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-2 text-xs font-medium">
          <button
            onClick={() => handleNav('portal')}
            className={`px-3.5 py-1.5 rounded-2xl border transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 ${
              currentView === 'portal'
                ? 'bg-[#F4E6CC] text-[#1E3954] border-[#E49548] font-bold shadow-xs'
                : 'bg-[#35587B]/75 text-white border-[#E49548]/40 hover:border-[#E49548] hover:bg-[#3B5F84]'
            }`}
          >
            Portal Ujian
          </button>

          <button
            onClick={() => handleNav('proctor')}
            className={`px-3.5 py-1.5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              currentView === 'proctor'
                ? 'bg-[#F4E6CC] text-[#1E3954] border-[#E49548] font-bold shadow-xs'
                : 'bg-[#35587B]/75 text-white border-[#E49548]/40 hover:border-[#E49548] hover:bg-[#3B5F84]'
            }`}
          >
            <Monitor className={`w-3.5 h-3.5 ${currentView === 'proctor' ? 'text-[#1E3954]' : 'text-[#E49548]'}`} />
            Dasbor Pengawas
          </button>

          <button
            onClick={() => handleNav('guidelines')}
            className={`px-3.5 py-1.5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              currentView === 'guidelines'
                ? 'bg-[#F4E6CC] text-[#1E3954] border-[#E49548] font-bold shadow-xs'
                : 'bg-[#35587B]/75 text-white border-[#E49548]/40 hover:border-[#E49548] hover:bg-[#3B5F84]'
            }`}
          >
            <BookOpen className={`w-3.5 h-3.5 ${currentView === 'guidelines' ? 'text-[#1E3954]' : 'text-[#E49548]'}`} />
            Pedoman &amp; Aturan
          </button>

          <button
            onClick={() => handleNav('about')}
            className={`px-3.5 py-1.5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              currentView === 'about'
                ? 'bg-[#F4E6CC] text-[#1E3954] border-[#E49548] font-bold shadow-xs'
                : 'bg-[#35587B]/75 text-white border-[#E49548]/40 hover:border-[#E49548] hover:bg-[#3B5F84]'
            }`}
          >
            <GraduationCap className={`w-3.5 h-3.5 ${currentView === 'about' ? 'text-[#1E3954]' : 'text-[#E49548]'}`} />
            Pendidikan Matematika UMM
          </button>
        </nav>

        {/* Action Button & Mobile Hamburger Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleNav('portal')}
            className="hidden sm:flex px-4 py-2 text-xs font-extrabold text-[#1E3954] bg-[#E49548] hover:bg-[#CE7D30] rounded-2xl transition-all duration-200 shadow-sm hover:-translate-y-0.5 whitespace-nowrap shrink-0 items-center gap-1.5 cursor-pointer border border-[#F4E6CC]"
          >
            <ShieldCheck className="w-4 h-4 text-[#1E3954]" />
            <span>Mulai Ujian MMO</span>
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-2xl bg-[#35587B] border border-[#E49548] text-white hover:bg-[#3B5F84] transition-colors cursor-pointer"
            aria-label="Buka Menu Navigasi"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer (HP Responsive) */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-[#E49548]/50 space-y-2 animate-in fade-in slide-in-from-top-2">
          <button
            onClick={() => handleNav('portal')}
            className={`w-full text-left px-4 py-2.5 rounded-2xl border text-xs font-semibold transition-all flex items-center gap-2 ${
              currentView === 'portal'
                ? 'bg-[#F4E6CC] text-[#1E3954] border-[#E49548]'
                : 'bg-[#35587B] text-white border-[#E49548]/50 hover:border-[#E49548]'
            }`}
          >
            <ShieldCheck className={`w-4 h-4 ${currentView === 'portal' ? 'text-[#1E3954]' : 'text-[#E49548]'}`} />
            Portal Ujian Peserta
          </button>

          <button
            onClick={() => handleNav('proctor')}
            className={`w-full text-left px-4 py-2.5 rounded-2xl border text-xs font-semibold transition-all flex items-center gap-2 ${
              currentView === 'proctor'
                ? 'bg-[#F4E6CC] text-[#1E3954] border-[#E49548]'
                : 'bg-[#35587B] text-white border-[#E49548]/50 hover:border-[#E49548]'
            }`}
          >
            <Monitor className={`w-4 h-4 ${currentView === 'proctor' ? 'text-[#1E3954]' : 'text-[#E49548]'}`} />
            Dasbor Pengawas &amp; Bank Soal
          </button>

          <button
            onClick={() => handleNav('guidelines')}
            className={`w-full text-left px-4 py-2.5 rounded-2xl border text-xs font-semibold transition-all flex items-center gap-2 ${
              currentView === 'guidelines'
                ? 'bg-[#F4E6CC] text-[#1E3954] border-[#E49548]'
                : 'bg-[#35587B] text-white border-[#E49548]/50 hover:border-[#E49548]'
            }`}
          >
            <BookOpen className={`w-4 h-4 ${currentView === 'guidelines' ? 'text-[#1E3954]' : 'text-[#E49548]'}`} />
            Pedoman Teknis &amp; Aturan
          </button>

          <button
            onClick={() => handleNav('about')}
            className={`w-full text-left px-4 py-2.5 rounded-2xl border text-xs font-semibold transition-all flex items-center gap-2 ${
              currentView === 'about'
                ? 'bg-[#F4E6CC] text-[#1E3954] border-[#E49548]'
                : 'bg-[#35587B] text-white border-[#E49548]/50 hover:border-[#E49548]'
            }`}
          >
            <GraduationCap className={`w-4 h-4 ${currentView === 'about' ? 'text-[#1E3954]' : 'text-[#E49548]'}`} />
            Pendidikan Matematika UMM
          </button>
        </div>
      )}
    </header>
  );
};
