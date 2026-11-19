import React from 'react';

interface MathSnippet {
  label: string;
  symbol: string;
  snippet: string;
  title: string;
}

const MATH_SNIPPETS: MathSnippet[] = [
  {
    label: 'Pecahan',
    symbol: 'a/b',
    snippet: '$$ \\frac{a}{b} $$',
    title: 'Sisipkan pecahan vertikal',
  },
  {
    label: 'Akar',
    symbol: '√x',
    snippet: '$$ \\sqrt{x} $$',
    title: 'Sisipkan akar kuadrat',
  },
  {
    label: 'Pangkat',
    symbol: 'x²',
    snippet: '$$ x^{2} $$',
    title: 'Sisipkan pangkat eksponen',
  },
  {
    label: 'Indeks',
    symbol: 'aₙ',
    snippet: '$$ a_{n} $$',
    title: 'Sisipkan subskrip/indeks',
  },
  {
    label: 'Sigma',
    symbol: '∑',
    snippet: '$$ \\sum_{i=1}^{n} $$',
    title: 'Sisipkan notasi sigma',
  },
  {
    label: 'Integral',
    symbol: '∫',
    snippet: '$$ \\int_{a}^{b} f(x)\\,dx $$',
    title: 'Sisipkan integral tentu',
  },
  {
    label: 'Pi',
    symbol: 'π',
    snippet: '$$ \\pi $$',
    title: 'Sisipkan simbol pi',
  },
  {
    label: 'Derajat',
    symbol: '°',
    snippet: '$$ 90^{\\circ} $$',
    title: 'Sisipkan satuan derajat sudut',
  },
  {
    label: '≤',
    symbol: '≤',
    snippet: '\\le ',
    title: 'Sisipkan tanda kurang dari atau sama dengan',
  },
  {
    label: '≥',
    symbol: '≥',
    snippet: '\\ge ',
    title: 'Sisipkan tanda lebih dari atau sama dengan',
  },
  {
    label: '≠',
    symbol: '≠',
    snippet: '\\neq ',
    title: 'Sisipkan tanda tidak sama dengan',
  },
  {
    label: '×',
    symbol: '×',
    snippet: '\\times ',
    title: 'Sisipkan tanda perkalian',
  },
];

interface MathFormulaToolbarProps {
  onInsert: (snippet: string) => void;
  compact?: boolean;
}

export const MathFormulaToolbar: React.FC<MathFormulaToolbarProps> = ({
  onInsert,
  compact = false,
}) => {
  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 ${
        compact ? 'py-1' : 'p-2 bg-[#FAF3E3] border border-[#E49548]/60 rounded-xl'
      }`}
    >
      <span className="text-[11px] font-bold text-[#1E3954] pr-1 whitespace-nowrap">
        Sisip Rumus:
      </span>
      {MATH_SNIPPETS.map((item) => (
        <button
          key={item.label}
          type="button"
          onMouseDown={(e) => {
            // Preserve current focus/caret selection inside active input/textarea
            e.preventDefault();
          }}
          onClick={() => onInsert(item.snippet)}
          title={`${item.title}: ${item.snippet}`}
          className="px-2 py-1 rounded-lg bg-white hover:bg-[#2C4B6B] hover:text-white hover:border-[#E49548] border border-[#B8CCE0] text-[11px] font-mono text-[#1E3954] transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1"
        >
          <span className="font-bold">{item.symbol}</span>
          {!compact && <span className="font-sans text-[10px] opacity-80">{item.label}</span>}
        </button>
      ))}
    </div>
  );
};
