import { Question } from '../types/index';

/**
 * Helper to verify if a trailing alphanumeric token beside a fraction is Word shadow/fallback noise
 * e.g. "3/2 32", "3/2 23", "2013/7000 70002013", "2013/7000 20137000", "2013/7000 7000"
 */
function isFractionShadowToken(num: string, den: string, shadow: string): boolean {
  const cleanNum = num.replace(/\s+/g, '');
  const cleanDen = den.replace(/\s+/g, '');
  const cleanShadow = shadow.replace(/\s+/g, '');

  if (!cleanShadow || !/^[0-9]+$/.test(cleanShadow)) return false;

  if (
    cleanShadow === cleanNum + cleanDen ||
    cleanShadow === cleanDen + cleanNum ||
    cleanShadow === cleanNum ||
    cleanShadow === cleanDen ||
    cleanShadow === `${cleanNum}${cleanDen}${cleanNum}${cleanDen}` ||
    cleanShadow === `${cleanDen}${cleanNum}${cleanDen}${cleanNum}`
  ) {
    return true;
  }

  // Multi-digit fraction numerator/denominator embedded in longer scrambled shadow number
  if (
    (cleanNum.length >= 2 || cleanDen.length >= 2) &&
    cleanShadow.length >= Math.max(cleanNum.length, cleanDen.length) &&
    (cleanShadow.includes(cleanNum) || cleanShadow.includes(cleanDen))
  ) {
    return true;
  }

  return false;
}

/**
 * Universal math sanitizer and textbook formatter for MMO 2027
 * - Preserves both $...$ and $$...$$ KaTeX delimiters cleanly without mangling $$
 * - Strips fraction shadow numbers (e.g. "3/2 32", "$$ \frac{3}{2} $$ 32", "2013/7000 70002013")
 * - Deduplicates doubled numbers in sentences (e.g. "ke-1010" -> "ke-10", "2929" -> "29", "8080" -> "80", "+3+3" -> "+3")
 * - Deduplicates repeated mathematical equations (e.g. "2 + 9 x 3 = 29 2 + 9 x 3 = 29", "20 x 4 = 8020 x 4 = 80")
 * - Deduplicates doubled options (e.g. "11" -> "1", "88" -> "8", "xkelipatan5xkelipatan5" -> "$x$ kelipatan 5")
 * - Formats powers, square roots, and linear fractions ONLY in non-math TEXT blocks
 */
export function sanitizeMathString(raw: string): string {
  if (!raw) return '';
  let s = raw.trim();

  // 1. Remove duplicate adjacent lines first
  const lines = s.split('\n');
  const uniqueLines: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      uniqueLines.length === 0 ||
      trimmed !== uniqueLines[uniqueLines.length - 1].trim() ||
      !trimmed
    ) {
      uniqueLines.push(line);
    }
  }
  s = uniqueLines.join('\n');

  // 2. Repeated mathematical equations/expressions from Word duplication:
  // e.g. "2 + 9 x 3 = 29 2 + 9 x 3 = 29"
  s = s.replace(/(\d+[\s\S]*?=\s*\d+)\s+\1/g, '$1');
  // e.g. "2 x 16 = 322 x 16 = 32" or "20 x 4 = 8020 x 4 = 80"
  s = s.replace(
    /(\b(\d+)\s*([x×*+\-\/])\s*(\d+)\s*=\s*(\d+))(\d+)\s*\3\s*\4\s*=\s*\5/g,
    (full, eq1, n1, _op, _n2, res, glue) => {
      if (glue === res + n1 || glue === n1) {
        return eq1;
      }
      return full;
    }
  );

  // 3. Repeated operator + number: "+3+3" -> "+3", "-5-5" -> "-5"
  s = s.replace(/([\+\-]\s*\d+)\s*\1\b/g, '$1');

  // 4. Repeated numbers after "ke-": "ke-1010" -> "ke-10"
  s = s.replace(/(?<=ke-)(\d{1,4})\1(?=\b|\s|[.,;:?!()]|$)/g, '$1');

  // 5. Repeated numbers in sentence:
  // 4-digit doubled number: "2929" -> "29", "3232" -> "32", "8080" -> "80"
  s = s.replace(/(?<=\b|\s|^)(\d{2})\1(?=\b|\s|[.,;:?!]|$)/g, '$1');

  // Doubled single digit before common nouns: "44 batang" -> "4 batang"
  s = s.replace(
    /\b(\d)\1(?=\s+(?:batang|persegi|lingkaran|segitiga|buah|orang|siswa|cm|meter|kg|kali|butir|menit|detik|jam|hari|suku|sudut))/g,
    '$1'
  );

  // Doubled 3-digit: "100100" -> "100"
  s = s.replace(/(?<=\b|\s|^)(\d{3})\1(?=\b|\s|[.,;:?!]|$)/g, '$1');

  // 6. Direct clean of linear fractions with attached or space-separated shadow:
  // e.g. "3/2 32", "2013/7000 70002013", "2013/7000 20137000"
  s = s.replace(
    /(?<![\\{])\b(\d{1,6})\s*\/\s*(\d{1,6})\b\s*([0-9]+)/g,
    (full, num, den, shadow) => {
      if (isFractionShadowToken(num, den, shadow)) {
        return `$\\frac{${num}}{${den}}$ `;
      }
      return full;
    }
  );

  // 6b. Linear fraction without space where denominator is concatenated with shadow:
  // e.g. "3/232" -> $\frac{3}{2}$, "2013/700070002013" -> $\frac{2013}{7000}$
  s = s.replace(/\b(\d{1,6})\s*\/\s*(\d{2,15})/g, (full, num, denAndShadow) => {
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
  });

  // 7. KaTeX \frac with shadow in single ($) or double ($$) dollar wrapping:
  // e.g. "$\frac{3}{2}$ 32", "$$ \frac{3}{2} $$ 32", "$\frac{2013}{7000} 70002013$"
  s = s.replace(
    /(\$\$|\$)?\s*\\frac\s*\{([^}]+)\}\s*\{([^}]+)\}\s*(\$\$|\$)?\s*([0-9]+)\s*(\$\$|\$)?/g,
    (full, openDollar, num, den, midDollar, shadow, closeDollar) => {
      if (isFractionShadowToken(num, den, shadow)) {
        const useDouble = openDollar === '$$' || midDollar === '$$' || closeDollar === '$$';
        return useDouble ? `$$ \\frac{${num}}{${den}} $$ ` : `$\\frac{${num}}{${den}}$ `;
      }
      return full;
    }
  );

  // 7b. Explicit residue removal for known Word artifacts
  s = s.replace(/\b70002013\b\s*/g, '');
  s = s.replace(/\b20137000\b\s*/g, '');

  // 8. Full option string deduplication (for short option texts or numbers)
  const bare = s.replace(/^\$+|\$+$/g, '').trim();

  // 8a. Single-digit repeated: "11" -> "1", "$11$" -> "1", "$1$ 1" -> "1"
  if (/^(\d)\1$/.test(bare) || /^\$*(\d)\$*\s*\1$/.test(s.trim())) {
    const keepDouble = s.trim().startsWith('$$');
    if (bare.length > 0) {
      return s.trim().startsWith('$')
        ? keepDouble
          ? `$$ ${bare[0]} $$`
          : `$${bare[0]}$`
        : bare[0];
    }
    return s;
  }

  // 8b. Multi-digit repeated number: "1515" -> "15", "7272" -> "72", "18001800" -> "1800"
  if (/^(\d{2,6})\1$/.test(bare)) {
    const dedup = bare.replace(/^(\d{2,6})\1$/, '$1');
    const keepDouble = s.trim().startsWith('$$');
    return s.trim().startsWith('$')
      ? keepDouble
        ? `$$ ${dedup} $$`
        : `$${dedup}$`
      : dedup;
  }

  // 8c. Repeated single letter: "xx" -> "x", "$xx$" -> "x"
  if (/^([a-zA-Z])\1$/.test(bare)) {
    return bare[0];
  }

  // 8d. Exact half string duplication on bare string: e.g. "xkelipatan5xkelipatan5" -> "xkelipatan5"
  if (bare.length >= 4 && bare.length % 2 === 0 && !bare.includes('\\')) {
    const half = bare.length / 2;
    const p1 = bare.slice(0, half);
    const p2 = bare.slice(half);
    if (p1 === p2) {
      s = p1;
    }
  }

  // 8e. Exact half with space (only when not purely math delimiters wrapping expressions)
  const spaceParts = s.split(/\s+/);
  if (spaceParts.length >= 4 && spaceParts.length % 2 === 0) {
    const half = spaceParts.length / 2;
    const p1 = spaceParts.slice(0, half).join(' ');
    const p2 = spaceParts.slice(half).join(' ');
    if (p1 === p2 && !p1.startsWith('$')) {
      s = p1;
    }
  }

  // 9. Squeezed Indonesian words attached to variables:
  // e.g. "xkelipatan5" -> "$x$ kelipatan 5"
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

  // 10. Safe Math Tokenization:
  // Tokenize into MATH blocks ($$...$$ or $...$) vs TEXT blocks so math delimiters are NEVER inverted or destroyed!
  const tokens: { type: 'MATH' | 'TEXT'; content: string; display?: boolean }[] = [];
  const mathRegex = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mathRegex.exec(s)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'TEXT', content: s.substring(lastIndex, match.index) });
    }
    const isDouble = match[0].startsWith('$$') && match[0].endsWith('$$');
    const rawMath = isDouble ? match[0].slice(2, -2).trim() : match[0].slice(1, -1).trim();
    tokens.push({ type: 'MATH', content: rawMath, display: isDouble });
    lastIndex = mathRegex.lastIndex;
  }
  if (lastIndex < s.length) {
    tokens.push({ type: 'TEXT', content: s.substring(lastIndex) });
  }

  const processed = tokens.map((token, idx) => {
    if (token.type === 'MATH') {
      let m = token.content;
      if (!m) return '';
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

      const prevText = idx > 0 && tokens[idx - 1].type === 'TEXT' ? tokens[idx - 1].content : '';
      const nextText =
        idx < tokens.length - 1 && tokens[idx + 1].type === 'TEXT' ? tokens[idx + 1].content : '';

      const needsLeadingSpace = prevText.length > 0 && /[a-zA-Z0-9]$/.test(prevText);
      const needsTrailingSpace = nextText.length > 0 && /^[a-zA-Z0-9]/.test(nextText);

      const wrapped = token.display ? `$$ ${m} $$` : `$${m}$`;
      return `${needsLeadingSpace ? ' ' : ''}${wrapped}${needsTrailingSpace ? ' ' : ''}`;
    } else {
      let t = token.content;
      // Outside math mode: convert linear fractions (e.g. 3/2 or 2013/7000 -> $\frac{...}{...}$), avoiding URLs or dates
      t = t.replace(
        /(?<!https?:)(?<!\d{4}\/)(?<![0-9/])\b(\d{1,6})\s*\/\s*(\d{1,6})\b(?![0-9/])/g,
        '$\\frac{$1}{$2}$'
      );
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

  // 11. Clean redundant empty spaces between single empty math pairs (never touch $$...$$!)
  s = s.replace(/(?<!\$)\$\s+\$(?!\$)/g, ' ');
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
