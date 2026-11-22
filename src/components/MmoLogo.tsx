import React from 'react';

interface MmoLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<MmoLogoProps['size']>, string> = {
  xs: 'w-8 h-7 rounded-lg p-0.5 border border-[#E49548]',
  sm: 'w-10 h-8 rounded-xl p-0.5 border border-[#E49548]',
  md: 'w-11 h-9 rounded-xl p-0.5 border-2 border-[#E49548]',
  lg: 'w-16 h-13 rounded-2xl p-1 border-2 border-[#E49548]',
  xl: 'w-24 h-20 sm:w-28 sm:h-24 rounded-3xl p-1.5 border-2 border-[#E49548]',
};

export const MmoLogo: React.FC<MmoLogoProps> = ({ size = 'sm', className = '' }) => {
  return (
    <div
      className={`bg-[#FAF3E3] overflow-hidden flex items-center justify-center shrink-0 shadow-xs ${SIZE_CLASSES[size]} ${className}`}
    >
      <img
        src="/assets/aistudio/image_e838cbdb.png"
        alt="Logo MMO 2027 - Matriks Mathematics Olympiad"
        className="w-full h-full object-cover object-[50%_55.5%] pointer-events-none select-none"
        draggable={false}
      />
    </div>
  );
};
