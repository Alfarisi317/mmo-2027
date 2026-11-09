import { Question } from '../types/index';

/**
 * Universal math sanitizer and textbook formatter for MMO 2027
 * - Strips fraction shadow numbers (e.g. "\frac{2013}{7000} 70002013", "2013/7000 70002013" -> "$\frac{2013}{7000}$")
 * - Deduplicates doubled strings & options (e.g. "xkelipatan5xkelipatan5" -> "$x$ kelipatan 5", "11" -> "1", "88" -> "8")
 * - Formats powers & exponents like "x^2", "x²", "cm^2", "r^2" into proper KaTeX superscripts (angka 2 kecil di kanan atas)
 * - Protects existing math blocks ($...$ and $$...$$) so KaTeX delimiters are never inverted or leaked as raw syntax
 * - Formats square roots "sqrt(x)", "√x" into KaTeX $\sqrt{x}$
 * - Formats linear fractions "2013/7000" into vertical $\frac{2013}{7000}$
 */
export function sanitizeMathString(raw: string): string {
  if (!raw) return '';
  let s = raw.trim();

  // 1. Remove duplicate adjacent lines first
  const lines = s.split('\n');
  const uniqueLines: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (uniqueLines.length === 0 || trimmed !== uniqueLines[uniqueLines.length - 1].trim() || !trimmed) {
      uniqueLines.push(line);
    }
  }
  s = uniqueLines.join('\n');

  // 2. Direct clean of linear fractions with attached or space-separated shadow:
  // e.g. "2013/7000 70002013", "2013/7000 20137000", "2013/7000 7000", "2013/7000 2013"
  s = s.replace(
    /\b(\d{1,6})\s*\/\s*(\d{1,6})\b\s*([0-9]+)/g,
    (full, num, den, shadow) => {
      const cleanNum = num.replace(/\s+/g, '');
      const cleanDen = den.replace(/\s+/g, '');
      const cleanShadow = shadow.replace(/\s+/g, '');
      if (
        cleanShadow === cleanNum + cleanDen ||
        cleanShadow === cleanDen + cleanNum ||
        cleanShadow === cleanNum ||
        cleanShadow === cleanDen ||
        cleanShadow.includes(cleanNum) ||
        cleanShadow.includes(cleanDen)
      ) {
        return `$\\frac{${num}}{${den}}$ `;
      }
      return full;
    }
  );

  // 2b. Linear fraction without space where denominator is concatenated with shadow: "2013/700070002013"
  s = s.replace(
    /\b(\d{1,6})\s*\/\s*(\d{2,15})/g,
    (full, num, denAndShadow) => {
      for (let len = 1; len <= Math.min(6, denAndShadow.length - 1); len++) {
        const testDen = denAndShadow.slice(0, len);
        const testShadow = denAndShadow.slice(len);
        if (
          testShadow === testDen + num ||
          testShadow === num + testDen ||
          testShadow === testDen ||
          testShadow === num
        ) {
          return `$\\frac{${num}}{${testDen}}$ `;
        }
      }
      return full;
    }
  );

  // 3. KaTeX \frac with shadow in all possible dollar/space wrapping:
  // e.g. "$\frac{2013}{7000} 70002013$", "$\frac{2013}{7000}$ 70002013", "\frac{2013}{7000} 70002013"
  s = s.replace(
    /(\$?)\\frac\s*\{([^}]+)\}\s*\{([^}]+)\}(\$?)\s*([0-9a-zA-Z]+)(\$?)/g,
    (full, _openDollar, num, den, _midDollar, shadow, _closeDollar) => {
      const cleanNum = num.replace(/\s+/g, '');
      const cleanDen = den.replace(/\s+/g, '');
      const cleanShadow = shadow.replace(/\s+/g, '');

      const isShadow =
        cleanShadow === cleanNum + cleanDen ||
        cleanShadow === cleanDen + cleanNum ||
        cleanShadow === cleanNum ||
        cleanShadow === cleanDen ||
        cleanShadow.includes(cleanNum) ||
        cleanShadow.includes(cleanDen);

      if (isShadow) {
        return `$\\frac{${num}}{${den}}$ `;
      }
      return full;
    }
  );

  // 3b. Inside existing math formula without outer dollars
  s = s.replace(
    /\\frac\s*\{([^}]+)\}\s*\{([^}]+)\}\s*([0-9a-zA-Z]+)/g,
    (full, num, den, shadow) => {
      const cleanNum = num.replace(/\s+/g, '');
      const cleanDen = den.replace(/\s+/g, '');
      const cleanShadow = shadow.replace(/\s+/g, '');
      if (
        cleanShadow === cleanNum + cleanDen ||
        cleanShadow === cleanDen + cleanNum ||
        cleanShadow === cleanNum ||
        cleanShadow === cleanDen ||
        cleanShadow.includes(cleanNum) ||
        cleanShadow.includes(cleanDen)
      ) {
        return `\\frac{${num}}{${den}} `;
      }
      return full;
    }
  );

  // 3c. Explicit shadow numbers right before common Indonesian predicates:
  // e.g. "70002013 ditulis dalam bentuk desimal" -> "ditulis dalam bentuk desimal"
  s = s.replace(/\b70002013\b\s*/g, '');
  s = s.replace(/\b20137000\b\s*/g, '');

  // 4. Full option string deduplication (for short option texts or numbers)
  const bare = s.replace(/^\$+|\$+$/g, '').trim();

  // 4a. Single-digit repeated: "11" -> "1", "$11$" -> "1", "$1$ 1" -> "1", "$1$1" -> "1"
  if (/^(\d)\1$/.test(bare) || /^\$*(\d)\$*\s*\1$/.test(s.trim())) {
    return bare.length > 0 ? bare[0] : s;
  }

  // 4b. Multi-digit repeated number: "1515" -> "15", "7272" -> "72", "18001800" -> "1800"
  if (/^(\d{2,6})\1$/.test(bare)) {
    return bare.replace(/^(\d{2,6})\1$/, '$1');
  }

  // 4c. Repeated single letter: "xx" -> "x", "$xx$" -> "x", "$x$ x" -> "x"
  if (/^([a-zA-Z])\1$/.test(bare)) {
    return bare[0];
  }

  // 4d. Exact half string duplication on bare string: e.g. "xkelipatan5xkelipatan5" -> "xkelipatan5"
  if (bare.length >= 4 && bare.length % 2 === 0) {
    const half = bare.length / 2;
    const p1 = bare.slice(0, half);
    const p2 = bare.slice(half);
    if (p1 === p2) {
      s = p1;
    }
  }

  // 4e. Exact half with space: e.g. "x kelipatan 5x kelipatan 5" or "x kelipatan 5 x kelipatan 5"
  const spaceParts = s.split(/\s+/);
  if (spaceParts.length >= 2 && spaceParts.length % 2 === 0) {
    const half = spaceParts.length / 2;
    const p1 = spaceParts.slice(0, half).join(' ');
    const p2 = spaceParts.slice(half).join(' ');
    if (p1 === p2) {
      s = p1;
    }
  }

  // 5. Squeezed Indonesian words attached to variables:
  // e.g. "xkelipatan5" -> "$x$ kelipatan 5"
  // e.g. "xadalahgenap" -> "$x$ adalah genap"
  // e.g. "xadalahfaktordari3" -> "$x$ adalah faktor dari 3"
  // e.g. "xkelipatan72" -> "$x$ kelipatan 72"
  // e.g. "xkelipatan7" -> "$x$ kelipatan 7"
  s = s.replace(
    /\b([a-zA-Z])(kelipatan|adalah|faktor|merupakan|bilangan|positif|bulat|ganjil|genap|prima)([a-zA-Z0-9]*)\b/gi,
    (_m, v, word, rest) => {
      let cleanRest = rest || '';
      if (cleanRest.startsWith('faktordari')) {
        cleanRest = 'faktor dari ' + cleanRest.slice(10);
      } else if (cleanRest.startsWith('dari')) {
        cleanRest = 'dari ' + cleanRest.slice(4);
      }
      return `$${v}$ ${word} ${cleanRest}`.replace(/\s+/g, ' ').trim();
    }
  );

  // 6. Linear fraction conversion (e.g. 2013/7000 -> $\frac{2013}{7000}$, avoiding URLs or dates)
  s = s.replace(
    /(?<!https?:)(?<!\d{4}\/)(?<![0-9/])\b(\d{1,6})\s*\/\s*(\d{1,6})\b(?![0-9/])/g,
    '$\\frac{$1}{$2}$'
  );

  // 7. Safe Math Delimiter & Exponent Handling:
  // Tokenize into MATH blocks ($$...$$ or $...$) vs TEXT blocks so math mode is never inverted!
  const tokens: { type: 'MATH' | 'TEXT'; content: string; display?: boolean }[] = [];
  const mathRegex = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g;
  let lastIndex = 0;
  let match;

  while ((match = mathRegex.exec(s)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'TEXT', content: s.substring(lastIndex, match.index) });
    }
    const isDisplay = match[0].startsWith('$$');
    const rawMath = isDisplay ? match[0].slice(2, -2) : match[0].slice(1, -1);
    tokens.push({ type: 'MATH', content: rawMath, display: isDisplay });
    lastIndex = mathRegex.lastIndex;
  }
  if (lastIndex < s.length) {
    tokens.push({ type: 'TEXT', content: s.substring(lastIndex) });
  }

  const processed = tokens.map((token) => {
    if (token.type === 'MATH') {
      let m = token.content;
      // Convert unicode superscripts inside math mode
      m = m.replace(/²/g, '^2');
      m = m.replace(/³/g, '^3');
      m = m.replace(/⁴/g, '^4');
      m = m.replace(/⁵/g, '^5');
      m = m.replace(/⁶/g, '^6');
      m = m.replace(/⁷/g, '^7');
      m = m.replace(/⁸/g, '^8');
      m = m.replace(/⁹/g, '^9');
      m = m.replace(/⁰/g, '^0');
      m = m.replace(/ⁿ/g, '^n');
      // Format single-character exponent with braces for clean KaTeX: x^2 -> x^{2}
      m = m.replace(/\^([a-zA-Z0-9])(?![{a-zA-Z0-9])/g, '^{$1}');
      return token.display ? `$$${m}$$` : `$${m}$`;
    } else {
      let t = token.content;
      // Outside math mode: convert square roots
      t = t.replace(/sqrt\(([^)]+)\)/gi, '$\\sqrt{$1}$');
      t = t.replace(/√([a-zA-Z0-9]+)/g, '$\\sqrt{$1}$');
      // Outside math mode: convert unicode superscripts
      t = t.replace(/²/g, '$^2$');
      t = t.replace(/³/g, '$^3$');
      // Outside math mode: convert raw caret exponents e.g. x^2, (x+1)^2, cm^2, 10^2
      t = t.replace(/([a-zA-Z0-9\)])\s*[\^]\s*([a-zA-Z0-9]+|\{[^}]+\})/g, '$$$1^{$2}$$');
      return t;
    }
  });

  s = processed.join('');

  // 8. Ensure clean spacing between math delimiters and adjacent words
  // e.g. "Jika$\frac" -> "Jika $\frac"
  s = s.replace(/([a-zA-Z0-9])\$([^\$]+)\$/g, '$1 $$$2$$');
  // e.g. "$\frac{...}$ditulis" -> "$\frac{...}$ ditulis"
  s = s.replace(/\$([^\$]+)\$([a-zA-Z0-9])/g, '$$$1$$ $2');

  // 9. Clean redundant nested dollars or empty math blocks
  s = s.replace(/\$\s*\$/g, ' ');
  s = s.replace(/[ \t]+/g, ' ');

  return s.trim();
}

/**
 * Sanitize an entire question object
 */
export function sanitizeQuestion(q: Question): Question {
  if (!q) return q;
  return {
    ...q,
    text: sanitizeMathString(q.text || ''),
    explanation: sanitizeMathString(q.explanation || ''),
    formulaLatex: sanitizeMathString(q.formulaLatex || ''),
    options: Array.isArray(q.options)
      ? q.options.map((opt) => ({
          ...opt,
          text: sanitizeMathString(opt.text || ''),
        }))
      : q.options,
  };
}

/**
 * Sanitize an entire list of questions
 */
export function sanitizeQuestionsList(questions: Question[]): Question[] {
  if (!Array.isArray(questions)) return [];
  return questions.map(sanitizeQuestion);
}
