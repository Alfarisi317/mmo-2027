import JSZip from 'jszip';
import {
  CompetitionStage,
  MathDomain,
  OlympiadCategory,
  Question,
  QuestionOption,
  QuestionType,
} from '../types/index';
import { sanitizeMathString } from './mathSanitizer';

export interface ParsedWordQuestionDraft {
  tempId: string;
  questionNumber: number;
  text: string;
  options: QuestionOption[];
  correctAnswer: string;
  explanation: string;
  domain: MathDomain;
  category: OlympiadCategory;
  stage: CompetitionStage;
  type: QuestionType;
  imageUrl?: string;
  equationsCount: number;
  warnings: string[];
}

export interface WordParseResult {
  drafts: ParsedWordQuestionDraft[];
  rawLinesPreview: string;
  stats: {
    totalDetected: number;
    equationsConverted: number;
    imagesExtracted: number;
    missingKeyCount: number;
    incompleteOptionsCount: number;
  };
}

export interface WordImportDefaults {
  category: OlympiadCategory;
  stage: CompetitionStage;
  points?: {
    correct: number;
    wrong: number;
    blank: number;
  };
}

export interface StructuredBankSoalItem {
  nomor: number;
  soal: string;
  opsi: {
    A: string;
    B: string;
    C: string;
    D: string;
    E: string;
  };
  kunci_jawaban: string;
}

// ============================================================================
// 1. LIGHTWEIGHT DETERMINISTIC XML AST PARSER (Node + Browser safe)
// ============================================================================

interface XmlElementNode {
  kind: 'element';
  name: string;
  localName: string;
  attrs: Record<string, string>;
  children: XmlNode[];
}

interface XmlTextNode {
  kind: 'text';
  text: string;
}

type XmlNode = XmlElementNode | XmlTextNode;

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    })
    .replace(/&#(\d+);/g, (_m, dec) => {
      const code = parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    })
    .replace(/&amp;/g, '&');
}

function parseAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRegex = /([a-zA-Z0-9_:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let m: RegExpExecArray | null;
  while ((m = attrRegex.exec(attrString)) !== null) {
    const key = m[1];
    const val = decodeXmlEntities(m[2] ?? m[3] ?? '');
    attrs[key] = val;
    const colonIdx = key.indexOf(':');
    if (colonIdx >= 0) {
      attrs[key.slice(colonIdx + 1)] = val;
    }
  }
  return attrs;
}

function getLocalName(tagName: string): string {
  const idx = tagName.indexOf(':');
  return idx >= 0 ? tagName.slice(idx + 1) : tagName;
}

export function parseXmlTree(xml: string): XmlElementNode {
  const root: XmlElementNode = {
    kind: 'element',
    name: '__root__',
    localName: '__root__',
    attrs: {},
    children: [],
  };
  const stack: XmlElementNode[] = [root];
  const len = xml.length;
  let i = 0;

  while (i < len) {
    const lt = xml.indexOf('<', i);
    if (lt === -1) {
      const tail = xml.slice(i);
      if (tail) {
        stack[stack.length - 1].children.push({
          kind: 'text',
          text: decodeXmlEntities(tail),
        });
      }
      break;
    }

    if (lt > i) {
      const textChunk = xml.slice(i, lt);
      if (textChunk) {
        stack[stack.length - 1].children.push({
          kind: 'text',
          text: decodeXmlEntities(textChunk),
        });
      }
    }

    // Comments
    if (xml.startsWith('<!--', lt)) {
      const endComment = xml.indexOf('-->', lt + 4);
      i = endComment === -1 ? len : endComment + 3;
      continue;
    }

    // Processing instruction / XML declaration
    if (xml.startsWith('<?', lt)) {
      const endPi = xml.indexOf('?>', lt + 2);
      i = endPi === -1 ? len : endPi + 2;
      continue;
    }

    // CDATA
    if (xml.startsWith('<![CDATA[', lt)) {
      const endCdata = xml.indexOf(']]>', lt + 9);
      const content = endCdata === -1 ? xml.slice(lt + 9) : xml.slice(lt + 9, endCdata);
      stack[stack.length - 1].children.push({ kind: 'text', text: content });
      i = endCdata === -1 ? len : endCdata + 3;
      continue;
    }

    // DOCTYPE or similar <!...>
    if (xml.startsWith('<!', lt)) {
      const endDecl = xml.indexOf('>', lt + 2);
      i = endDecl === -1 ? len : endDecl + 1;
      continue;
    }

    // Find closing '>' outside quotes
    let gt = -1;
    let quote: '"' | "'" | null = null;
    for (let j = lt + 1; j < len; j++) {
      const ch = xml[j];
      if (quote) {
        if (ch === quote) quote = null;
      } else {
        if (ch === '"' || ch === "'") quote = ch;
        else if (ch === '>') {
          gt = j;
          break;
        }
      }
    }

    if (gt === -1) break;

    const tagContent = xml.slice(lt + 1, gt).trim();
    i = gt + 1;

    if (!tagContent) continue;

    // Closing tag </...>
    if (tagContent.startsWith('/')) {
      const closeName = tagContent.slice(1).trim();
      const closeLocal = getLocalName(closeName);
      for (let s = stack.length - 1; s >= 1; s--) {
        if (stack[s].name === closeName || stack[s].localName === closeLocal) {
          stack.length = s;
          break;
        }
      }
      continue;
    }

    // Self-closing or opening tag
    const selfClosing = tagContent.endsWith('/');
    const cleanBody = selfClosing ? tagContent.slice(0, -1).trim() : tagContent;
    const spaceMatch = cleanBody.match(/^([^\s/]+)([\s\S]*)$/);
    if (!spaceMatch) continue;

    const tagName = spaceMatch[1];
    const attrPart = spaceMatch[2] || '';
    const el: XmlElementNode = {
      kind: 'element',
      name: tagName,
      localName: getLocalName(tagName),
      attrs: attrPart ? parseAttributes(attrPart) : {},
      children: [],
    };

    stack[stack.length - 1].children.push(el);
    if (!selfClosing) {
      stack.push(el);
    }
  }

  return root;
}

function findChild(node: XmlElementNode, localName: string): XmlElementNode | undefined {
  for (const c of node.children) {
    if (c.kind === 'element' && c.localName === localName) return c;
  }
  return undefined;
}

function findChildren(node: XmlElementNode, localName: string): XmlElementNode[] {
  const res: XmlElementNode[] = [];
  for (const c of node.children) {
    if (c.kind === 'element' && c.localName === localName) res.push(c);
  }
  return res;
}

function collectText(node: XmlNode): string {
  if (node.kind === 'text') return node.text;
  return node.children.map(collectText).join('');
}

// ============================================================================
// 2. UNICODE & SYMBOL TO LATEX MAPPING
// ============================================================================

const MATH_SYMBOL_MAP: Record<string, string> = {
  '×': '\\times ',
  '÷': '\\div ',
  '·': '\\cdot ',
  '⋅': '\\cdot ',
  '∙': '\\cdot ',
  '±': '\\pm ',
  '∓': '\\mp ',
  '≤': '\\le ',
  '≦': '\\le ',
  '≥': '\\ge ',
  '≧': '\\ge ',
  '≠': '\\neq ',
  '≈': '\\approx ',
  '≡': '\\equiv ',
  '≢': '\\not\\equiv ',
  '∝': '\\propto ',
  '∞': '\\infty ',
  '∈': '\\in ',
  '∉': '\\notin ',
  '∋': '\\ni ',
  '⊂': '\\subset ',
  '⊃': '\\supset ',
  '⊆': '\\subseteq ',
  '⊇': '\\supseteq ',
  '⊄': '\\not\\subset ',
  '∪': '\\cup ',
  '∩': '\\cap ',
  '∅': '\\emptyset ',
  '∀': '\\forall ',
  '∃': '\\exists ',
  '∄': '\\nexists ',
  '¬': '\\neg ',
  '∧': '\\land ',
  '∨': '\\lor ',
  '→': '\\to ',
  '←': '\\leftarrow ',
  '↔': '\\leftrightarrow ',
  '⇒': '\\Rightarrow ',
  '⇐': '\\Leftarrow ',
  '⇔': '\\Leftrightarrow ',
  '↦': '\\mapsto ',
  '∠': '\\angle ',
  '∡': '\\measuredangle ',
  '△': '\\triangle ',
  '⊥': '\\perp ',
  '∥': '\\parallel ',
  '≅': '\\cong ',
  '∼': '\\sim ',
  '°': '^\\circ ',
  '′': "'",
  '″': "''",
  '…': '\\dots ',
  '⋯': '\\cdots ',
  '⋮': '\\vdots ',
  '⋱': '\\ddots ',
  '∑': '\\sum ',
  '∏': '\\prod ',
  '∫': '\\int ',
  '∬': '\\iint ',
  '∭': '\\iiint ',
  '∮': '\\oint ',
  '∂': '\\partial ',
  '∇': '\\nabla ',
  '√': '\\sqrt ',
  '⌊': '\\lfloor ',
  '⌋': '\\rfloor ',
  '⌈': '\\lceil ',
  '⌉': '\\rceil ',
  '⟨': '\\langle ',
  '⟩': '\\rangle ',
  'ℕ': '\\mathbb{N}',
  'ℤ': '\\mathbb{Z}',
  'ℚ': '\\mathbb{Q}',
  'ℝ': '\\mathbb{R}',
  'ℂ': '\\mathbb{C}',
  'ℙ': '\\mathbb{P}',
  // Greek lowercase
  'α': '\\alpha ',
  'β': '\\beta ',
  'γ': '\\gamma ',
  'δ': '\\delta ',
  'ε': '\\varepsilon ',
  'ϵ': '\\epsilon ',
  'ζ': '\\zeta ',
  'η': '\\eta ',
  'θ': '\\theta ',
  'ϑ': '\\vartheta ',
  'ι': '\\iota ',
  'κ': '\\kappa ',
  'λ': '\\lambda ',
  'μ': '\\mu ',
  'ν': '\\nu ',
  'ξ': '\\xi ',
  'π': '\\pi ',
  'ϖ': '\\varpi ',
  'ρ': '\\rho ',
  'σ': '\\sigma ',
  'ς': '\\varsigma ',
  'τ': '\\tau ',
  'υ': '\\upsilon ',
  'φ': '\\varphi ',
  'ϕ': '\\phi ',
  'χ': '\\chi ',
  'ψ': '\\psi ',
  'ω': '\\omega ',
  // Greek uppercase
  'Γ': '\\Gamma ',
  'Δ': '\\Delta ',
  'Θ': '\\Theta ',
  'Λ': '\\Lambda ',
  'Ξ': '\\Xi ',
  'Π': '\\Pi ',
  'Σ': '\\Sigma ',
  'Υ': '\\Upsilon ',
  'Φ': '\\Phi ',
  'Ψ': '\\Psi ',
  'Ω': '\\Omega ',
  // Minus & quotes normalization inside math
  '−': '-',
  '–': '-',
  '—': '-',
};

function convertUnicodeMathRun(text: string): string {
  let out = '';
  for (const ch of text) {
    if (MATH_SYMBOL_MAP[ch]) {
      out += MATH_SYMBOL_MAP[ch];
    } else if (ch === '%') {
      out += '\\%';
    } else {
      out += ch;
    }
  }
  // Format standalone mathematical functions if written in plain math run
  out = out.replace(/(?<![\\a-zA-Z])(sin|cos|tan|csc|sec|cot|arcsin|arccos|arctan|log|ln|lim|det|gcd|max|min)(?![a-zA-Z])/g, '\\$1 ');
  return out;
}

function wrapLatexBaseIfNeeded(base: string): string {
  const b = base.trim();
  if (!b) return '{}';
  if (b.length === 1 && /[a-zA-Z0-9]/.test(b)) return b;
  if (b.startsWith('{') && b.endsWith('}')) return b;
  return `{${b}}`;
}

// ============================================================================
// 3. OMML (<m:oMath> / <m:oMathPara>) TO LATEX TRANSLATOR
// ============================================================================

function getValAttr(el: XmlElementNode | undefined): string {
  if (!el) return '';
  return el.attrs['val'] ?? el.attrs['m:val'] ?? el.attrs['w:val'] ?? '';
}

function translateOmmlChildren(node: XmlElementNode): string {
  return node.children.map(ommlNodeToLatex).join('');
}

export function ommlNodeToLatex(node: XmlNode): string {
  if (node.kind === 'text') {
    return '';
  }

  switch (node.localName) {
    case 'oMathPara': {
      const maths = findChildren(node, 'oMath');
      if (maths.length === 0) return translateOmmlChildren(node);
      if (maths.length === 1) return ommlNodeToLatex(maths[0]);
      return maths.map(ommlNodeToLatex).join(' \\\\ ');
    }

    case 'oMath':
    case 'e':
    case 'num':
    case 'den':
    case 'sub':
    case 'sup':
    case 'deg':
    case 'fName':
    case 'lim': {
      return translateOmmlChildren(node);
    }

    case 'r': {
      // Math run: check script/style in m:rPr or w:rPr
      const rPr = findChild(node, 'rPr');
      const scr = rPr ? getValAttr(findChild(rPr, 'scr')) : '';
      const sty = rPr ? getValAttr(findChild(rPr, 'sty')) : '';
      const rawTextParts: string[] = [];
      for (const c of node.children) {
        if (c.kind === 'element' && (c.localName === 't' || c.localName === 'sym')) {
          if (c.localName === 't') {
            rawTextParts.push(collectText(c));
          } else {
            const charHex = c.attrs['char'] || c.attrs['w:char'] || '';
            if (charHex) {
              const cp = parseInt(charHex, 16);
              if (Number.isFinite(cp)) rawTextParts.push(String.fromCodePoint(cp));
            }
          }
        }
      }
      const raw = rawTextParts.join('');
      if (!raw) return '';

      if (scr === 'double-struck') {
        return `\\mathbb{${raw}}`;
      }
      if (sty === 'p' && /^[a-zA-Z\s.,!?-]+$/.test(raw) && raw.trim().length > 1) {
        // Plain upright multi-letter text inside equation (e.g. " atau ", " cm")
        return `\\text{${raw}}`;
      }
      return convertUnicodeMathRun(raw);
    }

    case 't': {
      return convertUnicodeMathRun(collectText(node));
    }

    case 'f': {
      const fPr = findChild(node, 'fPr');
      const fType = fPr ? getValAttr(findChild(fPr, 'type')) : '';
      const num = ommlNodeToLatex(findChild(node, 'num') || { kind: 'element', name: 'num', localName: 'num', attrs: {}, children: [] }).trim();
      const den = ommlNodeToLatex(findChild(node, 'den') || { kind: 'element', name: 'den', localName: 'den', attrs: {}, children: [] }).trim();
      if (fType === 'noBar') {
        return `\\binom{${num}}{${den}}`;
      }
      if (fType === 'lin') {
        return `{${num}}/{${den}}`;
      }
      return `\\frac{${num}}{${den}}`;
    }

    case 'sSup': {
      const base = ommlNodeToLatex(findChild(node, 'e') || { kind: 'element', name: 'e', localName: 'e', attrs: {}, children: [] }).trim();
      const sup = ommlNodeToLatex(findChild(node, 'sup') || { kind: 'element', name: 'sup', localName: 'sup', attrs: {}, children: [] }).trim();
      return `${wrapLatexBaseIfNeeded(base)}^{${sup}}`;
    }

    case 'sSub': {
      const base = ommlNodeToLatex(findChild(node, 'e') || { kind: 'element', name: 'e', localName: 'e', attrs: {}, children: [] }).trim();
      const sub = ommlNodeToLatex(findChild(node, 'sub') || { kind: 'element', name: 'sub', localName: 'sub', attrs: {}, children: [] }).trim();
      return `${wrapLatexBaseIfNeeded(base)}_{${sub}}`;
    }

    case 'sSubSup': {
      const base = ommlNodeToLatex(findChild(node, 'e') || { kind: 'element', name: 'e', localName: 'e', attrs: {}, children: [] }).trim();
      const sub = ommlNodeToLatex(findChild(node, 'sub') || { kind: 'element', name: 'sub', localName: 'sub', attrs: {}, children: [] }).trim();
      const sup = ommlNodeToLatex(findChild(node, 'sup') || { kind: 'element', name: 'sup', localName: 'sup', attrs: {}, children: [] }).trim();
      return `${wrapLatexBaseIfNeeded(base)}_{${sub}}^{${sup}}`;
    }

    case 'sPre': {
      const base = ommlNodeToLatex(findChild(node, 'e') || { kind: 'element', name: 'e', localName: 'e', attrs: {}, children: [] }).trim();
      const sub = ommlNodeToLatex(findChild(node, 'sub') || { kind: 'element', name: 'sub', localName: 'sub', attrs: {}, children: [] }).trim();
      const sup = ommlNodeToLatex(findChild(node, 'sup') || { kind: 'element', name: 'sup', localName: 'sup', attrs: {}, children: [] }).trim();
      const subPart = sub ? `_{${sub}}` : '';
      const supPart = sup ? `^{${sup}}` : '';
      return `{}${subPart}${supPart}${wrapLatexBaseIfNeeded(base)}`;
    }

    case 'rad': {
      const radPr = findChild(node, 'radPr');
      const degHide = radPr ? getValAttr(findChild(radPr, 'degHide')) : '';
      const degNode = findChild(node, 'deg');
      const deg = degNode ? ommlNodeToLatex(degNode).trim() : '';
      const eNode = findChild(node, 'e');
      const e = eNode ? ommlNodeToLatex(eNode).trim() : '';
      if (deg && degHide !== '1' && degHide !== 'on' && degHide !== 'true') {
        return `\\sqrt[${deg}]{${e}}`;
      }
      return `\\sqrt{${e}}`;
    }

    case 'nary': {
      const naryPr = findChild(node, 'naryPr');
      const chrVal = naryPr ? getValAttr(findChild(naryPr, 'chr')) : '';
      let op = '\\int';
      if (chrVal === '∑') op = '\\sum';
      else if (chrVal === '∏') op = '\\prod';
      else if (chrVal === '⋃') op = '\\bigcup';
      else if (chrVal === '⋂') op = '\\bigcap';
      else if (chrVal === '∬') op = '\\iint';
      else if (chrVal === '∮') op = '\\oint';
      else if (chrVal) op = MATH_SYMBOL_MAP[chrVal]?.trim() || '\\int';

      const sub = findChild(node, 'sub') ? ommlNodeToLatex(findChild(node, 'sub')!).trim() : '';
      const sup = findChild(node, 'sup') ? ommlNodeToLatex(findChild(node, 'sup')!).trim() : '';
      const e = findChild(node, 'e') ? ommlNodeToLatex(findChild(node, 'e')!).trim() : '';
      return `${op}${sub ? `_{${sub}}` : ''}${sup ? `^{${sup}}` : ''} ${e}`;
    }

    case 'd': {
      const dPr = findChild(node, 'dPr');
      const begNode = dPr ? findChild(dPr, 'begChr') : undefined;
      const endNode = dPr ? findChild(dPr, 'endChr') : undefined;
      const sepNode = dPr ? findChild(dPr, 'sepChr') : undefined;
      const begChr = begNode ? getValAttr(begNode) : '(';
      const endChr = endNode ? getValAttr(endNode) : ')';
      const sepChr = sepNode ? getValAttr(sepNode) : '|';

      const eNodes = findChildren(node, 'e');
      // Special check: if single <m:e> contains <m:m> (matrix) directly, emit clean matrix env
      if (eNodes.length === 1) {
        const directMatrix = findChild(eNodes[0], 'm');
        if (directMatrix && eNodes[0].children.filter((c) => c.kind === 'element').length === 1) {
          const innerRows = matrixRowsLatex(directMatrix);
          if (begChr === '(' && endChr === ')') return `\\begin{pmatrix} ${innerRows} \\end{pmatrix}`;
          if (begChr === '[' && endChr === ']') return `\\begin{bmatrix} ${innerRows} \\end{bmatrix}`;
          if (begChr === '{' && endChr === '}') return `\\begin{Bmatrix} ${innerRows} \\end{Bmatrix}`;
          if (begChr === '|' && endChr === '|') return `\\begin{vmatrix} ${innerRows} \\end{vmatrix}`;
        }
      }

      const mapDelim = (ch: string): string => {
        if (!ch) return '.';
        if (ch === '{') return '\\{';
        if (ch === '}') return '\\}';
        if (ch === '⟨') return '\\langle';
        if (ch === '⟩') return '\\rangle';
        if (ch === '⌊') return '\\lfloor';
        if (ch === '⌋') return '\\rfloor';
        if (ch === '⌈') return '\\lceil';
        if (ch === '⌉') return '\\rceil';
        return ch;
      };

      const sepTex = sepChr ? ` \\middle${mapDelim(sepChr)} ` : ', ';
      const body = eNodes.map((en) => ommlNodeToLatex(en).trim()).join(sepTex);
      return `\\left${mapDelim(begChr)} ${body} \\right${mapDelim(endChr)}`;
    }

    case 'm': {
      return `\\begin{matrix} ${matrixRowsLatex(node)} \\end{matrix}`;
    }

    case 'eqArr': {
      const lines = findChildren(node, 'e').map((en) => ommlNodeToLatex(en).trim());
      if (lines.length === 1) return lines[0];
      return `\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}`;
    }

    case 'func': {
      const fName = findChild(node, 'fName') ? ommlNodeToLatex(findChild(node, 'fName')!).trim() : '';
      const e = findChild(node, 'e') ? ommlNodeToLatex(findChild(node, 'e')!).trim() : '';
      const cleanName = fName.replace(/\\text\{([^}]*)\}/g, '$1').trim();
      const knownFuncs = ['sin', 'cos', 'tan', 'csc', 'sec', 'cot', 'arcsin', 'arccos', 'arctan', 'log', 'ln', 'lim', 'max', 'min', 'det', 'gcd', 'exp'];
      const matched = knownFuncs.find((f) => cleanName === f || cleanName === `\\${f}`);
      if (matched) {
        return `\\${matched} ${e}`;
      }
      return `${fName} ${e}`;
    }

    case 'limLow': {
      const e = findChild(node, 'e') ? ommlNodeToLatex(findChild(node, 'e')!).trim() : '';
      const lim = findChild(node, 'lim') ? ommlNodeToLatex(findChild(node, 'lim')!).trim() : '';
      if (e.includes('\\lim') || e === 'lim') {
        return `\\lim_{${lim}}`;
      }
      return `\\mathop{${e}}_{${lim}}`;
    }

    case 'limUpp': {
      const e = findChild(node, 'e') ? ommlNodeToLatex(findChild(node, 'e')!).trim() : '';
      const lim = findChild(node, 'lim') ? ommlNodeToLatex(findChild(node, 'lim')!).trim() : '';
      return `\\mathop{${e}}^{${lim}}`;
    }

    case 'acc': {
      const accPr = findChild(node, 'accPr');
      const chr = accPr ? getValAttr(findChild(accPr, 'chr')) : '';
      const e = findChild(node, 'e') ? ommlNodeToLatex(findChild(node, 'e')!).trim() : '';
      if (chr === '\u0302' || chr === '^') return `\\hat{${e}}`;
      if (chr === '\u0303' || chr === '~') return `\\tilde{${e}}`;
      if (chr === '\u20D7' || chr === '→') return `\\vec{${e}}`;
      if (chr === '\u0307' || chr === '.') return `\\dot{${e}}`;
      return `\\bar{${e}}`;
    }

    case 'bar': {
      const barPr = findChild(node, 'barPr');
      const pos = barPr ? getValAttr(findChild(barPr, 'pos')) : 'top';
      const e = findChild(node, 'e') ? ommlNodeToLatex(findChild(node, 'e')!).trim() : '';
      return pos === 'bot' ? `\\underline{${e}}` : `\\overline{${e}}`;
    }

    case 'groupChr': {
      const gPr = findChild(node, 'groupChrPr');
      const chr = gPr ? getValAttr(findChild(gPr, 'chr')) : '';
      const pos = gPr ? getValAttr(findChild(gPr, 'pos')) : 'bot';
      const e = findChild(node, 'e') ? ommlNodeToLatex(findChild(node, 'e')!).trim() : '';
      if (chr === '⏞' || pos === 'top') return `\\overbrace{${e}}`;
      return `\\underbrace{${e}}`;
    }

    case 'box':
    case 'borderBox': {
      const e = findChild(node, 'e') ? ommlNodeToLatex(findChild(node, 'e')!).trim() : translateOmmlChildren(node);
      return e;
    }

    case 'phant': {
      const e = findChild(node, 'e') ? ommlNodeToLatex(findChild(node, 'e')!).trim() : '';
      return e;
    }

    // Property-only nodes carry metadata, emit nothing as text
    case 'rPr':
    case 'fPr':
    case 'dPr':
    case 'radPr':
    case 'naryPr':
    case 'mPr':
    case 'accPr':
    case 'barPr':
    case 'groupChrPr':
    case 'ctrlPr':
    case 'oMathParaPr':
      return '';

    default:
      return translateOmmlChildren(node);
  }
}

function matrixRowsLatex(mNode: XmlElementNode): string {
  const rows = findChildren(mNode, 'mr');
  return rows
    .map((mr) =>
      findChildren(mr, 'e')
        .map((cell) => ommlNodeToLatex(cell).trim())
        .join(' & ')
    )
    .join(' \\\\ ');
}

// ============================================================================
// 4. W3C MATHML (<math>...) TO LATEX TRANSLATOR (Word Online / Clipboard HTML)
// ============================================================================

export function mathmlNodeToLatex(node: XmlNode): string {
  if (node.kind === 'text') {
    return convertUnicodeMathRun(node.text.replace(/\s+/g, ' '));
  }

  const children = node.children.filter(
    (c) => !(c.kind === 'text' && !c.text.trim())
  );

  switch (node.localName) {
    case 'math':
    case 'mrow':
    case 'mstyle':
    case 'mpadded':
    case 'semantics':
      return children.map(mathmlNodeToLatex).join('');

    case 'annotation':
    case 'annotation-xml':
      return '';

    case 'mi':
    case 'mn':
    case 'mo': {
      const txt = collectText(node).trim();
      return convertUnicodeMathRun(txt);
    }

    case 'mtext': {
      const txt = collectText(node);
      return txt ? `\\text{${txt}}` : '';
    }

    case 'mspace':
      return ' ';

    case 'mfrac': {
      const num = children[0] ? mathmlNodeToLatex(children[0]).trim() : '';
      const den = children[1] ? mathmlNodeToLatex(children[1]).trim() : '';
      return `\\frac{${num}}{${den}}`;
    }

    case 'msup': {
      const base = children[0] ? mathmlNodeToLatex(children[0]).trim() : '';
      const sup = children[1] ? mathmlNodeToLatex(children[1]).trim() : '';
      return `${wrapLatexBaseIfNeeded(base)}^{${sup}}`;
    }

    case 'msub': {
      const base = children[0] ? mathmlNodeToLatex(children[0]).trim() : '';
      const sub = children[1] ? mathmlNodeToLatex(children[1]).trim() : '';
      return `${wrapLatexBaseIfNeeded(base)}_{${sub}}`;
    }

    case 'msubsup': {
      const base = children[0] ? mathmlNodeToLatex(children[0]).trim() : '';
      const sub = children[1] ? mathmlNodeToLatex(children[1]).trim() : '';
      const sup = children[2] ? mathmlNodeToLatex(children[2]).trim() : '';
      return `${wrapLatexBaseIfNeeded(base)}_{${sub}}^{${sup}}`;
    }

    case 'msqrt': {
      const body = children.map(mathmlNodeToLatex).join('').trim();
      return `\\sqrt{${body}}`;
    }

    case 'mroot': {
      const body = children[0] ? mathmlNodeToLatex(children[0]).trim() : '';
      const deg = children[1] ? mathmlNodeToLatex(children[1]).trim() : '';
      return deg ? `\\sqrt[${deg}]{${body}}` : `\\sqrt{${body}}`;
    }

    case 'mfenced': {
      const open = node.attrs['open'] ?? '(';
      const close = node.attrs['close'] ?? ')';
      const sep = node.attrs['separators'] ?? ',';
      const inner = children.map((c) => mathmlNodeToLatex(c).trim()).join(`${sep} `);
      return `\\left${open || '.'} ${inner} \\right${close || '.'}`;
    }

    case 'mover': {
      const base = children[0] ? mathmlNodeToLatex(children[0]).trim() : '';
      const over = children[1] ? collectText(children[1]).trim() : '';
      if (over === '¯' || over === '‾' || over === '_') return `\\overline{${base}}`;
      if (over === '→') return `\\vec{${base}}`;
      if (over === '^' || over === 'ˆ') return `\\hat{${base}}`;
      return `\\overset{${over}}{${base}}`;
    }

    case 'munder': {
      const base = children[0] ? mathmlNodeToLatex(children[0]).trim() : '';
      const under = children[1] ? mathmlNodeToLatex(children[1]).trim() : '';
      if (base.includes('\\lim') || base.includes('\\sum') || base.includes('\\prod')) {
        return `${base}_{${under}}`;
      }
      return `\\underset{${under}}{${base}}`;
    }

    case 'munderover': {
      const base = children[0] ? mathmlNodeToLatex(children[0]).trim() : '';
      const under = children[1] ? mathmlNodeToLatex(children[1]).trim() : '';
      const over = children[2] ? mathmlNodeToLatex(children[2]).trim() : '';
      return `${base}_{${under}}^{${over}}`;
    }

    case 'mtable': {
      const rows = children
        .filter((c): c is XmlElementNode => c.kind === 'element' && c.localName === 'mtr')
        .map((mtr) =>
          mtr.children
            .filter((c): c is XmlElementNode => c.kind === 'element' && c.localName === 'mtd')
            .map((mtd) => mathmlNodeToLatex(mtd).trim())
            .join(' & ')
        )
        .join(' \\\\ ');
      return `\\begin{matrix} ${rows} \\end{matrix}`;
    }

    default:
      return children.map(mathmlNodeToLatex).join('');
  }
}

// ============================================================================
// 5. DOCX ARCHIVE READER (OMML + WORD AUTO-NUMBERING + MEDIA IMAGES)
// ============================================================================

interface NumberingLevelDef {
  numFmt: string;
  lvlText: string;
  start: number;
}

type NumberingMap = Map<string, Map<number, NumberingLevelDef>>;

function parseNumberingXml(xml: string | null): NumberingMap {
  const result: NumberingMap = new Map();
  if (!xml) return result;

  const tree = parseXmlTree(xml);
  const numberingRoot = findChild(tree, 'numbering') || tree;

  const abstractMap = new Map<string, Map<number, NumberingLevelDef>>();
  for (const abs of findChildren(numberingRoot, 'abstractNum')) {
    const absId = abs.attrs['abstractNumId'] || abs.attrs['w:abstractNumId'];
    if (!absId) continue;
    const lvls = new Map<number, NumberingLevelDef>();
    for (const lvl of findChildren(abs, 'lvl')) {
      const ilvl = parseInt(lvl.attrs['ilvl'] || lvl.attrs['w:ilvl'] || '0', 10);
      const numFmt = getValAttr(findChild(lvl, 'numFmt')) || 'decimal';
      const lvlText = getValAttr(findChild(lvl, 'lvlText')) || '%1.';
      const start = parseInt(getValAttr(findChild(lvl, 'start')) || '1', 10) || 1;
      lvls.set(ilvl, { numFmt, lvlText, start });
    }
    abstractMap.set(absId, lvls);
  }

  for (const num of findChildren(numberingRoot, 'num')) {
    const numId = num.attrs['numId'] || num.attrs['w:numId'];
    const absRef = getValAttr(findChild(num, 'abstractNumId'));
    if (!numId || !absRef) continue;
    const absLvls = abstractMap.get(absRef);
    if (!absLvls) continue;

    const cloned = new Map<number, NumberingLevelDef>();
    absLvls.forEach((v, k) => cloned.set(k, { ...v }));

    // Apply lvlOverride if present
    for (const ovr of findChildren(num, 'lvlOverride')) {
      const ilvl = parseInt(ovr.attrs['ilvl'] || ovr.attrs['w:ilvl'] || '0', 10);
      const startOvr = getValAttr(findChild(ovr, 'startOverride'));
      if (startOvr) {
        const existing = cloned.get(ilvl);
        if (existing) existing.start = parseInt(startOvr, 10) || existing.start;
      }
    }

    result.set(numId, cloned);
  }

  return result;
}

function formatNumValue(count: number, numFmt: string): string {
  switch (numFmt) {
    case 'upperLetter': {
      const idx = ((count - 1) % 26);
      return String.fromCharCode(65 + idx);
    }
    case 'lowerLetter': {
      const idx = ((count - 1) % 26);
      return String.fromCharCode(97 + idx);
    }
    case 'lowerRoman':
    case 'upperRoman': {
      const romans: [number, string][] = [
        [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
        [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
        [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
      ];
      let n = count;
      let out = '';
      for (const [val, sym] of romans) {
        while (n >= val) {
          out += sym;
          n -= val;
        }
      }
      return numFmt === 'lowerRoman' ? out.toLowerCase() : out;
    }
    case 'bullet':
      return '';
    default:
      return String(count);
  }
}

function parseRelsXml(xml: string | null): Map<string, string> {
  const map = new Map<string, string>();
  if (!xml) return map;
  const tree = parseXmlTree(xml);
  const relsNode = findChild(tree, 'Relationships') || tree;
  for (const rel of findChildren(relsNode, 'Relationship')) {
    const id = rel.attrs['Id'];
    const target = rel.attrs['Target'];
    if (id && target) {
      map.set(id, target);
    }
  }
  return map;
}

function uint8ToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function guessMimeType(filePath: string): string | null {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  return null;
}

interface ExtractedParagraph {
  text: string;
  images: string[];
  equationsCount: number;
}

function extractParagraphContent(
  pNode: XmlElementNode,
  numberingMap: NumberingMap,
  counters: Map<string, Map<number, number>>,
  mediaDataUrls: Map<string, string>
): ExtractedParagraph {
  let prefix = '';
  let equationsCount = 0;
  const images: string[] = [];

  // 1. Check Word Auto-Numbering (w:pPr -> w:numPr)
  const pPr = findChild(pNode, 'pPr');
  const numPr = pPr ? findChild(pPr, 'numPr') : undefined;
  if (numPr) {
    const numId = getValAttr(findChild(numPr, 'numId'));
    const ilvlStr = getValAttr(findChild(numPr, 'ilvl'));
    const ilvl = ilvlStr ? parseInt(ilvlStr, 10) : 0;

    if (numId && numId !== '0') {
      const lvlDefs = numberingMap.get(numId);
      const lvlDef = lvlDefs?.get(ilvl);
      let numCounters = counters.get(numId);
      if (!numCounters) {
        numCounters = new Map();
        counters.set(numId, numCounters);
      }

      const prev = numCounters.get(ilvl);
      const nextCount = prev === undefined ? (lvlDef?.start ?? 1) : prev + 1;
      numCounters.set(ilvl, nextCount);
      // Reset deeper levels
      for (const key of Array.from(numCounters.keys())) {
        if (key > ilvl) numCounters.delete(key);
      }

      if (lvlDef && lvlDef.numFmt !== 'bullet') {
        const formatted = formatNumValue(nextCount, lvlDef.numFmt);
        let label = lvlDef.lvlText.replace(/%\d+/g, formatted);
        if (!label.endsWith(' ')) label += ' ';
        prefix = label;
      }
    }
  }

  // 2. Walk paragraph children in exact document order
  const parts: string[] = [];
  let hasOmmlInParagraph = false;

  const walkParagraphNode = (node: XmlElementNode) => {
    switch (node.localName) {
      case 'pPr':
        return;

      case 'oMathPara': {
        hasOmmlInParagraph = true;
        const latex = ommlNodeToLatex(node).trim();
        if (latex) {
          equationsCount++;
          parts.push(` $$${latex}$$ `);
        }
        return;
      }

      case 'oMath': {
        hasOmmlInParagraph = true;
        const latex = ommlNodeToLatex(node).trim();
        if (latex) {
          equationsCount++;
          parts.push(` $${latex}$ `);
        }
        return;
      }

      case 'r': {
        const rPr = findChild(node, 'rPr');
        const vertAlign = rPr ? getValAttr(findChild(rPr, 'vertAlign')) : '';
        let runBuf = '';

        const walkRun = (rc: XmlNode) => {
          if (rc.kind !== 'element') return;
          if (rc.localName === 't' || rc.localName === 'delText') {
            runBuf += collectText(rc);
          } else if (rc.localName === 'tab') {
            runBuf += '\t';
          } else if (rc.localName === 'br' || rc.localName === 'cr') {
            runBuf += '\n';
          } else if (rc.localName === 'drawing' || rc.localName === 'pict') {
            // Check embedded image references inside drawing/pict
            const collectEmbeds = (imgNode: XmlNode) => {
              if (imgNode.kind !== 'element') return;
              if (imgNode.localName === 'blip') {
                const rId = imgNode.attrs['embed'] || imgNode.attrs['r:embed'];
                if (rId && mediaDataUrls.has(rId)) {
                  images.push(mediaDataUrls.get(rId)!);
                }
              } else if (imgNode.localName === 'imagedata') {
                const rId = imgNode.attrs['id'] || imgNode.attrs['r:id'];
                if (rId && mediaDataUrls.has(rId)) {
                  images.push(mediaDataUrls.get(rId)!);
                }
              }
              imgNode.children.forEach(collectEmbeds);
            };
            collectEmbeds(rc);
          } else if (rc.localName === 'AlternateContent') {
            // Word wraps modern equations or shapes in mc:AlternateContent -> mc:Choice + mc:Fallback
            const choice = findChild(rc, 'Choice');
            if (choice) {
              choice.children.forEach((cc) => {
                if (cc.kind === 'element') walkParagraphNode(cc);
              });
            }
          }
        };

        node.children.forEach(walkRun);

        if (runBuf) {
          if (vertAlign === 'superscript' && runBuf.trim()) {
            // Attach superscript cleanly to preceding variable/number if possible
            parts.push(`$^{${runBuf.trim()}}$`);
          } else if (vertAlign === 'subscript' && runBuf.trim()) {
            parts.push(`$_{${runBuf.trim()}}$`);
          } else {
            parts.push(runBuf);
          }
        }
        return;
      }

      case 'hyperlink':
      case 'ins':
      case 'smartTag':
      case 'sdt':
      case 'sdtContent': {
        for (const c of node.children) {
          if (c.kind === 'element') walkParagraphNode(c);
        }
        return;
      }

      case 'AlternateContent': {
        const choice = findChild(node, 'Choice');
        const target = choice || findChild(node, 'Fallback');
        if (target) {
          target.children.forEach((cc) => {
            if (cc.kind === 'element') walkParagraphNode(cc);
          });
        }
        return;
      }

      default:
        return;
    }
  };

  for (const child of pNode.children) {
    if (child.kind === 'element') {
      walkParagraphNode(child);
    }
  }

  // Merge adjacent math blocks caused by superscripts like x + $^2$ -> $x^{2}$
  let rawLine = (prefix + parts.join('')).replace(/[ ]{2,}/g, ' ');
  // If paragraph was solely an oMathPara, switch $$...$$ to $...$ if short or keep $$...$$ clean
  if (hasOmmlInParagraph) {
    rawLine = rawLine.replace(/\$\$\s*\$\$/g, ' ').trim();
  }
  // Stitch word + immediate superscript: "x $^2$" or "x$^{2}$" -> "$x^{2}$"
  rawLine = rawLine.replace(/([a-zA-Z0-9\)])\s*\$\^(\{[^}]+\})\$/g, '$$$1^$2$$');
  rawLine = rawLine.replace(/([a-zA-Z0-9\)])\s*\$_(\{[^}]+\})\$/g, '$$$1_$2$$');

  return {
    text: rawLine.trim(),
    images,
    equationsCount,
  };
}

export async function parseDocxBufferToDrafts(
  buffer: Uint8Array | ArrayBuffer,
  defaults: WordImportDefaults
): Promise<WordParseResult> {
  const zip = await JSZip.loadAsync(buffer);
  const docFile = zip.file('word/document.xml');
  if (!docFile) {
    throw new Error('Berkas .docx tidak valid: word/document.xml tidak ditemukan.');
  }

  const documentXml = await docFile.async('string');
  const numberingXml = zip.file('word/numbering.xml')
    ? await zip.file('word/numbering.xml')!.async('string')
    : null;
  const relsXml = zip.file('word/_rels/document.xml.rels')
    ? await zip.file('word/_rels/document.xml.rels')!.async('string')
    : null;

  const numberingMap = parseNumberingXml(numberingXml);
  const relsMap = parseRelsXml(relsXml);

  // Preload referenced media images as Base64 data URLs
  const mediaDataUrls = new Map<string, string>();
  for (const [rId, target] of relsMap.entries()) {
    const normalizedPath = target.startsWith('/')
      ? target.slice(1)
      : target.startsWith('word/')
      ? target
      : `word/${target}`;
    const mime = guessMimeType(normalizedPath);
    if (!mime) continue;
    const mediaFile = zip.file(normalizedPath);
    if (!mediaFile) continue;
    try {
      const bytes = await mediaFile.async('uint8array');
      mediaDataUrls.set(rId, `data:${mime};base64,${uint8ToBase64(bytes)}`);
    } catch {
      // Skip unreadable media
    }
  }

  const docTree = parseXmlTree(documentXml);
  const docEl = findChild(docTree, 'document') || docTree;
  const bodyEl = findChild(docEl, 'body') || docEl;

  const counters = new Map<string, Map<number, number>>();
  const linesWithAssets: { line: string; images: string[] }[] = [];
  let totalEquations = 0;

  const processBlockNode = (node: XmlElementNode) => {
    if (node.localName === 'p') {
      const extracted = extractParagraphContent(node, numberingMap, counters, mediaDataUrls);
      totalEquations += extracted.equationsCount;
      // Split internal line breaks (<w:br/>) into sequential lines, keeping images on the first line
      const subLines = extracted.text.split('\n');
      subLines.forEach((sub, idx) => {
        const clean = sub.trim();
        if (clean || (idx === 0 && extracted.images.length > 0)) {
          linesWithAssets.push({
            line: clean,
            images: idx === 0 ? extracted.images : [],
          });
        }
      });
    } else if (node.localName === 'tbl') {
      for (const tr of findChildren(node, 'tr')) {
        const rowCellTexts: string[] = [];
        const rowImages: string[] = [];
        for (const tc of findChildren(tr, 'tc')) {
          const cellParts: string[] = [];
          for (const tcChild of tc.children) {
            if (tcChild.kind === 'element' && tcChild.localName === 'p') {
              const ext = extractParagraphContent(tcChild, numberingMap, counters, mediaDataUrls);
              totalEquations += ext.equationsCount;
              if (ext.text) cellParts.push(ext.text);
              rowImages.push(...ext.images);
            }
          }
          if (cellParts.length > 0) {
            rowCellTexts.push(cellParts.join(' '));
          }
        }
        const joinedRow = rowCellTexts.join('\t').trim();
        if (joinedRow || rowImages.length > 0) {
          linesWithAssets.push({ line: joinedRow, images: rowImages });
        }
      }
    } else if (node.localName === 'sdt' || node.localName === 'sdtContent') {
      for (const c of node.children) {
        if (c.kind === 'element') processBlockNode(c);
      }
    }
  };

  for (const child of bodyEl.children) {
    if (child.kind === 'element') {
      processBlockNode(child);
    }
  }

  return parseSequentialWordLinesToDrafts(linesWithAssets, defaults, totalEquations);
}

// ============================================================================
// 6. WORD CLIPBOARD HTML + MATHML + OMML PARSER (BROWSER PASTE)
// ============================================================================

export function parseWordClipboardToDrafts(
  html: string,
  plainText: string,
  clipboardImages: string[],
  defaults: WordImportDefaults
): WordParseResult {
  const topJsonItems = tryParseStructuredJson(plainText || '');
  if (topJsonItems && topJsonItems.length > 0) {
    return convertStructuredJsonToDrafts(topJsonItems, defaults);
  }

  let totalEquations = 0;

  if (html && (html.includes('<m:oMath') || html.includes('<math') || html.includes('MsoListParagraph') || html.includes('<p') || html.includes('<div'))) {
    // 1. Unwrap Word's conditional equation comments:
    //    <!--[if gte msEquation 12]><m:oMath>...</m:oMath><![endif]-->
    //    and REMOVE the duplicate fallback block <!--[if !msEquation]>...<![endif]-->!
    let cleanedHtml = html
      .replace(/<!--\[if\s+!msEquation\](?:--)?\s*>[\s\S]*?(?:<!--)?<!\[endif\]-->/gi, '')
      .replace(/<!--\[if\s+gte\s+msEquation[^\]]*\](?:--)?\s*>/gi, '')
      .replace(/<!--\[if\s+!supportLists\](?:--)?\s*>([\s\S]*?)(?:<!--)?<!\[endif\]-->/gi, '$1')
      .replace(/(?:<!--)?<!\[endif\]-->/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');

    // Remove <style>, <script>, <xml> metadata blocks except when <xml> wraps math
    cleanedHtml = cleanedHtml
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<head[\s\S]*?<\/head>/gi, '');

    // 2. Replace <m:oMathPara>...</m:oMathPara> and <m:oMath>...</m:oMath> with placeholders
    const mathReplacements: string[] = [];
    cleanedHtml = cleanedHtml.replace(/<m:oMathPara\b[\s\S]*?<\/m:oMathPara>/gi, (match) => {
      const tree = parseXmlTree(match);
      const target = findChild(tree, 'oMathPara') || tree;
      const latex = ommlNodeToLatex(target).trim();
      if (!latex) return '';
      totalEquations++;
      const idx = mathReplacements.length;
      mathReplacements.push(` $$${latex}$$ `);
      return `@@MMO_MATH_${idx}@@`;
    });

    cleanedHtml = cleanedHtml.replace(/<m:oMath\b[\s\S]*?<\/m:oMath>/gi, (match) => {
      const tree = parseXmlTree(match);
      const target = findChild(tree, 'oMath') || tree;
      const latex = ommlNodeToLatex(target).trim();
      if (!latex) return '';
      totalEquations++;
      const idx = mathReplacements.length;
      mathReplacements.push(` $${latex}$ `);
      return `@@MMO_MATH_${idx}@@`;
    });

    // 3. Replace W3C <math>...</math> with placeholders
    cleanedHtml = cleanedHtml.replace(/<math\b[\s\S]*?<\/math>/gi, (match) => {
      const tree = parseXmlTree(match);
      const target = findChild(tree, 'math') || tree;
      const latex = mathmlNodeToLatex(target).trim();
      if (!latex) return '';
      totalEquations++;
      const idx = mathReplacements.length;
      mathReplacements.push(` $${latex}$ `);
      return `@@MMO_MATH_${idx}@@`;
    });

    // 4. Parse HTML structure (either DOMParser in browser or fallback tag-stripper)
    const linesWithAssets: { line: string; images: string[] }[] = [];

    const applyMathReplacements = (input: string): string => {
      let out = input.replace(/\u00a0/g, ' ');
      mathReplacements.forEach((rep, idx) => {
        out = out.replace(`@@MMO_MATH_${idx}@@`, rep);
      });
      out = out.replace(/([a-zA-Z0-9\)])\s*\$\^(\{[^}]+\})\$/g, '$$$1^$2$$');
      out = out.replace(/([a-zA-Z0-9\)])\s*\$_(\{[^}]+\})\$/g, '$$$1_$2$$');
      return out;
    };

    if (typeof DOMParser !== 'undefined') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(cleanedHtml, 'text/html');

      const walkHtmlInline = (node: Node): { text: string; imgs: string[] } => {
        if (node.nodeType === 3) {
          return { text: node.textContent || '', imgs: [] };
        }
        if (node.nodeType !== 1) return { text: '', imgs: [] };
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();

        if (tag === 'br') return { text: '\n', imgs: [] };
        if (tag === 'img') {
          const src = el.getAttribute('src') || '';
          const alt = el.getAttribute('alt') || '';
          if (src.startsWith('data:image/')) {
            return { text: '', imgs: [src] };
          }
          if (alt && !alt.startsWith('http')) {
            return { text: ` ${alt} `, imgs: [] };
          }
          return { text: '', imgs: [] };
        }

        let buf = '';
        const imgs: string[] = [];
        el.childNodes.forEach((c) => {
          const res = walkHtmlInline(c);
          buf += res.text;
          imgs.push(...res.imgs);
        });

        if (tag === 'sup' && buf.trim()) {
          return { text: `$^{${buf.trim()}}$`, imgs };
        }
        if (tag === 'sub' && buf.trim()) {
          return { text: `$_{${buf.trim()}}$`, imgs };
        }
        if (tag === 'td' || tag === 'th') {
          return { text: `${buf.trim()}\t`, imgs };
        }
        return { text: buf, imgs };
      };

      const blockTags = new Set(['p', 'div', 'li', 'tr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
      const collectBlocks = (parent: Node) => {
        parent.childNodes.forEach((child) => {
          if (child.nodeType === 3) {
            const t = applyMathReplacements(child.textContent || '').trim();
            if (t) linesWithAssets.push({ line: t, images: [] });
            return;
          }
          if (child.nodeType !== 1) return;
          const el = child as HTMLElement;
          const tag = el.tagName.toLowerCase();

          const hasNestedBlock = Array.from(el.children).some((ch) =>
            blockTags.has(ch.tagName.toLowerCase()) || ch.tagName.toLowerCase() === 'table' || ch.tagName.toLowerCase() === 'ul' || ch.tagName.toLowerCase() === 'ol'
          );

          if (blockTags.has(tag) && !hasNestedBlock) {
            const { text, imgs } = walkHtmlInline(el);
            let final = text.replace(/\u00a0/g, ' ');
            if (tag === 'li' && el.parentElement?.tagName.toLowerCase() === 'ol') {
              const lis = Array.from(el.parentElement.children).filter((c) => c.tagName.toLowerCase() === 'li');
              const liIdx = lis.indexOf(el) + 1;
              const listType = el.parentElement.getAttribute('type') || '';
              if (!/^\s*(?:\d+|[A-Ea-e])[.)]/.test(final)) {
                if (listType === 'a' || listType === 'A') {
                  const letter = String.fromCharCode((listType === 'A' ? 65 : 97) + ((liIdx - 1) % 26));
                  final = `${letter}. ${final}`;
                } else {
                  final = `${liIdx}. ${final}`;
                }
              }
            }
            final = applyMathReplacements(final);
            final.split('\n').forEach((sub, sIdx) => {
              const clean = sub.trim();
              if (clean || (sIdx === 0 && imgs.length > 0)) {
                linesWithAssets.push({ line: clean, images: sIdx === 0 ? imgs : [] });
              }
            });
          } else {
            collectBlocks(el);
          }
        });
      };

      collectBlocks(doc.body);
    } else {
      // Tag-based fallback when DOMParser is unavailable
      const blockText = cleanedHtml
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(?:p|div|li|tr|h[1-6])>/gi, '\n')
        .replace(/<\/t[dh]>/gi, '\t')
        .replace(/<sup[^>]*>([\s\S]*?)<\/sup>/gi, '$^{$1}$')
        .replace(/<sub[^>]*>([\s\S]*?)<\/sub>/gi, '$_{$1}$')
        .replace(/<[^>]+>/g, '');

      const decoded = applyMathReplacements(decodeXmlEntities(blockText));
      decoded.split('\n').forEach((raw) => {
        const clean = raw.trim();
        if (clean) linesWithAssets.push({ line: clean, images: [] });
      });
    }

    if (linesWithAssets.length > 0) {
      if (clipboardImages.length > 0 && linesWithAssets[0].images.length === 0) {
        linesWithAssets[0].images.push(...clipboardImages);
      }
      const res = parseSequentialWordLinesToDrafts(linesWithAssets, defaults, totalEquations);
      if (res.drafts.length > 0) {
        return res;
      }
    }
  }

  // Check if pasted plain text is already a structured MMO 2027 JSON array
  const jsonItems = tryParseStructuredJson(plainText || '');
  if (jsonItems && jsonItems.length > 0) {
    return convertStructuredJsonToDrafts(jsonItems, defaults);
  }

  // Fallback to plain text lines (preserving tabs / newlines)
  const plainLines = (plainText || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line, idx) => ({
      line: line.trim(),
      images: idx === 0 ? clipboardImages : [],
    }))
    .filter((item) => item.line.length > 0 || item.images.length > 0);

  return parseSequentialWordLinesToDrafts(plainLines, defaults, totalEquations);
}

// ============================================================================
// 7. SEQUENTIAL QUESTION PARSER (SOAL -> PILIHAN A-E -> KUNCI JAWABAN)
// ============================================================================

const QUESTION_START_RE = /^(?:soal\s*(?:no\.?|nomor)?\s*)?(\d{1,3})\s*[.)\]:-]\s*(.*)$/i;
const OPTION_LINE_RE = /^[\(\[]?([A-Ea-e])[\)\].:\-]\s*(.+)$/;
const ANSWER_KEY_RE = /^(?:kunci(?:\s*jawaban)?|jawaban(?:\s*benar)?|kj|key)\s*[:=\-]?\s*[\(\[]?([A-Ea-e])[\)\].]?(?:\s*[-–:]?\s*(.*))?$/i;
const EXPLANATION_RE = /^(?:pembahasan|penyelesaian|solusi)\s*[:=\-]\s*(.*)$/i;

function splitInlineOptionsIfAny(line: string): { letter: string; text: string }[] | null {
  // Detect lines like "A. 10    B. 12    C. 14    D. 16    E. 18" (tabs or 2+ spaces before next option)
  const inlineMatches: { index: number; letter: string; fullMatchLen: number }[] = [];
  const re = /(?:^|\t|\s{2,})[\(\[]?([A-Ea-e])[\)\].]\s+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    const letter = m[1].toUpperCase();
    const offsetInMatch = m[0].search(/[\(\[]?[A-Ea-e]/);
    inlineMatches.push({
      index: m.index + offsetInMatch,
      letter,
      fullMatchLen: m[0].length - offsetInMatch,
    });
  }

  if (inlineMatches.length < 2) return null;
  // Must start near the beginning with 'A'
  if (inlineMatches[0].letter !== 'A' || inlineMatches[0].index > 3) return null;

  const opts: { letter: string; text: string }[] = [];
  for (let i = 0; i < inlineMatches.length; i++) {
    const cur = inlineMatches[i];
    const nextStart = i + 1 < inlineMatches.length ? inlineMatches[i + 1].index : line.length;
    const text = line.slice(cur.index + cur.fullMatchLen, nextStart).trim();
    opts.push({ letter: cur.letter, text });
  }
  return opts;
}

export function inferMathDomain(text: string): MathDomain {
  const lower = text.toLowerCase();
  if (/(segitiga|lingkaran|sudut|luas|keliling|kubus|balok|trapesium|jajar genjang|belah ketupat|diameter|jari-jari|garis singgung|sebangun|kongruen|phytagoras|pythagoras|volume|prisma|limas|persegi panjang)/i.test(lower)) {
    return 'Geometri';
  }
  if (/(peluang|probabilitas|kombinasi|permutasi|banyak cara|kisi|pewarnaan|dadu|kartu|susunan|digit berbeda|himpunan bagian|graf|pigeonhole)/i.test(lower)) {
    return 'Kombinatorika';
  }
  if (/(bilangan prima|habis dibagi|modulo|sisa pembagian|fpb|kpk|kelipatan|faktor|digit satuan|bilangan bulat|divisibility|kongruen modulo)/i.test(lower)) {
    return 'Teori Bilangan';
  }
  return 'Aljabar';
}

export function parseSequentialWordLinesToDrafts(
  items: { line: string; images: string[] }[],
  defaults: WordImportDefaults,
  equationsConverted = 0
): WordParseResult {
  const drafts: ParsedWordQuestionDraft[] = [];

  type ParserPhase = 'IDLE' | 'QUESTION' | 'OPTIONS' | 'POST_KEY';
  let phase: ParserPhase = 'IDLE';

  interface BuilderState {
    questionNumber: number;
    textLines: string[];
    optionsMap: Map<string, string>;
    lastOptionLetter: string;
    correctAnswer: string;
    explanationLines: string[];
    images: string[];
  }

  const state: { current: BuilderState | null } = { current: null };

  const flushCurrent = () => {
    const c = state.current;
    if (!c) return;
    const rawText = c.textLines.join('\n').trim();
    if (!rawText && c.optionsMap.size === 0 && c.images.length === 0) {
      state.current = null;
      return;
    }

    const letters = ['A', 'B', 'C', 'D', 'E'];
    const options: QuestionOption[] = [];
    for (const ltr of letters) {
      if (c.optionsMap.has(ltr)) {
        options.push({
          id: ltr,
          text: sanitizeMathString(c.optionsMap.get(ltr) || ''),
        });
      }
    }

    const cleanText = sanitizeMathString(rawText);
    const cleanExplanation = sanitizeMathString(c.explanationLines.join('\n').trim());
    const warnings: string[] = [];

    if (!cleanText && c.images.length === 0) {
      warnings.push('Teks soal kosong.');
    }
    if (options.length > 0 && options.length < 4) {
      warnings.push(`Baru terdeteksi ${options.length} opsi (disarankan 4–5 opsi A–E).`);
    }
    if (!c.correctAnswer) {
      warnings.push('Kunci jawaban belum terdeteksi — pilih A–E di pratinjau.');
    } else if (options.length > 0 && !options.some((o) => o.id === c.correctAnswer)) {
      warnings.push(`Kunci "${c.correctAnswer}" tidak ada pada daftar opsi.`);
    }

    const type: QuestionType = options.length >= 2 ? 'multiple_choice' : 'short_answer';
    const domain = inferMathDomain(`${cleanText} ${cleanExplanation}`);

    drafts.push({
      tempId: `draft-${Date.now()}-${drafts.length + 1}-${Math.random().toString(36).slice(2, 6)}`,
      questionNumber: c.questionNumber || drafts.length + 1,
      text: cleanText,
      options:
        options.length > 0
          ? options
          : [
              { id: 'A', text: '' },
              { id: 'B', text: '' },
              { id: 'C', text: '' },
              { id: 'D', text: '' },
              { id: 'E', text: '' },
            ],
      correctAnswer: c.correctAnswer || '',
      explanation: cleanExplanation,
      domain,
      category: defaults.category,
      stage: defaults.stage,
      type,
      imageUrl: c.images[0],
      equationsCount: equationsConverted,
      warnings,
    });

    state.current = null;
  };

  const startNewQuestion = (qNum: number, initialLine: string, imgs: string[]) => {
    flushCurrent();
    state.current = {
      questionNumber: qNum || drafts.length + 1,
      textLines: initialLine ? [initialLine] : [],
      optionsMap: new Map(),
      lastOptionLetter: '',
      correctAnswer: '',
      explanationLines: [],
      images: [...imgs],
    };
    phase = 'QUESTION';
  };

  for (const item of items) {
    const rawLine = item.line.replace(/\s+$/g, '');
    const trimmed = rawLine.trim();

    if (!trimmed && item.images.length === 0) continue;

    // 1. Check Answer Key ("Kunci Jawaban: B", "Kunci: A", "Jawaban: C", etc.)
    const keyMatch = trimmed.match(ANSWER_KEY_RE);
    if (keyMatch && state.current) {
      state.current.correctAnswer = keyMatch[1].toUpperCase();
      if (item.images.length > 0) state.current.images.push(...item.images);
      if (keyMatch[2] && /^(?:pembahasan|solusi)/i.test(keyMatch[2].trim())) {
        state.current.explanationLines.push(keyMatch[2].replace(/^(?:pembahasan|solusi)\s*[:=\-]?\s*/i, '').trim());
      }
      phase = 'POST_KEY';
      continue;
    }

    // 2. Check Explanation line ("Pembahasan: ...")
    const expMatch = trimmed.match(EXPLANATION_RE);
    if (expMatch && state.current) {
      if (expMatch[1]) state.current.explanationLines.push(expMatch[1].trim());
      if (item.images.length > 0) state.current.images.push(...item.images);
      phase = 'POST_KEY';
      continue;
    }

    // 3. Check explicit Question Start ("1. ...", "Soal 2: ...")
    const qStartMatch = trimmed.match(QUESTION_START_RE);
    const parsedNum = qStartMatch ? parseInt(qStartMatch[1], 10) : 0;
    const looksLikeQuestionStart =
      qStartMatch &&
      parsedNum >= 1 &&
      parsedNum <= 250 &&
      (phase === 'IDLE' ||
        phase === 'POST_KEY' ||
        phase === 'OPTIONS' ||
        (phase === 'QUESTION' && parsedNum === (state.current?.questionNumber || 0) + 1));

    if (looksLikeQuestionStart && qStartMatch) {
      startNewQuestion(parsedNum, qStartMatch[2].trim(), item.images);
      continue;
    }

    // 4. Check Multiple Options on a single line ("A. 10   B. 20   C. 30")
    const inlineOpts = splitInlineOptionsIfAny(trimmed);
    if (inlineOpts && state.current) {
      inlineOpts.forEach((o) => {
        state.current!.optionsMap.set(o.letter, o.text);
        state.current!.lastOptionLetter = o.letter;
      });
      if (item.images.length > 0) state.current.images.push(...item.images);
      phase = 'OPTIONS';
      continue;
    }

    // 5. Check Single Option Line ("A. ...", "b) ...", "(C) ...")
    const optMatch = trimmed.match(OPTION_LINE_RE);
    if (optMatch && state.current) {
      const letter = optMatch[1].toUpperCase();
      const validProgression =
        phase === 'OPTIONS' ||
        letter === 'A' ||
        (state.current.optionsMap.size > 0 && ['A', 'B', 'C', 'D', 'E'].includes(letter));

      if (validProgression) {
        let optText = optMatch[2].trim();
        const trailingKey = optText.match(/[\(\[]\s*(?:kunci(?:\s*jawaban)?|jawaban|kj)\s*[:=]?\s*([A-Ea-e])\s*[\)\]]\s*$/i);
        if (trailingKey) {
          state.current.correctAnswer = trailingKey[1].toUpperCase();
          optText = optText.slice(0, trailingKey.index).trim();
        }
        state.current.optionsMap.set(letter, optText);
        state.current.lastOptionLetter = letter;
        if (item.images.length > 0) state.current.images.push(...item.images);
        phase = 'OPTIONS';
        continue;
      }
    }

    // 6. If previous question just finished with Kunci Jawaban (POST_KEY),
    //    and a new non-explanation paragraph starts without explicit number, start next question!
    if (phase === 'POST_KEY' || phase === 'IDLE') {
      startNewQuestion(drafts.length + 1, trimmed, item.images);
      continue;
    }

    // 7. Continuation lines
    if (state.current) {
      if (item.images.length > 0) {
        state.current.images.push(...item.images);
      }
      if (!trimmed) continue;

      if (phase === 'OPTIONS' && state.current.lastOptionLetter) {
        const prevOpt = state.current.optionsMap.get(state.current.lastOptionLetter) || '';
        state.current.optionsMap.set(state.current.lastOptionLetter, `${prevOpt} ${trimmed}`.trim());
      } else {
        state.current.textLines.push(trimmed);
      }
    }
  }

  flushCurrent();

  // Ensure questionNumber is sequentially clean if missing
  drafts.forEach((d, idx) => {
    if (!d.questionNumber || d.questionNumber <= 0) {
      d.questionNumber = idx + 1;
    }
  });

  const imagesExtracted = drafts.filter((d) => Boolean(d.imageUrl)).length;
  const missingKeyCount = drafts.filter((d) => !d.correctAnswer).length;
  const incompleteOptionsCount = drafts.filter((d) => d.options.length < 4).length;

  return {
    drafts,
    rawLinesPreview: items.map((i) => i.line).filter(Boolean).join('\n'),
    stats: {
      totalDetected: drafts.length,
      equationsConverted: equationsConverted,
      imagesExtracted,
      missingKeyCount,
      incompleteOptionsCount,
    },
  };
}

// ============================================================================
// 7b. STRUCTURED JSON SCHEMA <-> DRAFT CONVERTERS
// ============================================================================

export function tryParseStructuredJson(raw: string): StructuredBankSoalItem[] | null {
  const trimmed = (raw || '').trim();
  if (!trimmed.startsWith('[')) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const validItems: StructuredBankSoalItem[] = [];
    for (let i = 0; i < parsed.length; i++) {
      const entry = parsed[i];
      if (!entry || typeof entry !== 'object') return null;
      if (typeof entry.soal !== 'string') return null;
      const opsiObj = entry.opsi && typeof entry.opsi === 'object' ? entry.opsi : {};
      validItems.push({
        nomor: Number(entry.nomor) > 0 ? Number(entry.nomor) : i + 1,
        soal: entry.soal,
        opsi: {
          A: typeof opsiObj.A === 'string' ? opsiObj.A : String(opsiObj.A ?? ''),
          B: typeof opsiObj.B === 'string' ? opsiObj.B : String(opsiObj.B ?? ''),
          C: typeof opsiObj.C === 'string' ? opsiObj.C : String(opsiObj.C ?? ''),
          D: typeof opsiObj.D === 'string' ? opsiObj.D : String(opsiObj.D ?? ''),
          E: typeof opsiObj.E === 'string' ? opsiObj.E : String(opsiObj.E ?? ''),
        },
        kunci_jawaban: typeof entry.kunci_jawaban === 'string' ? entry.kunci_jawaban.trim().toUpperCase() : '',
      });
    }
    return validItems;
  } catch {
    return null;
  }
}

function countMathFormulaTokens(text: string): number {
  if (!text) return 0;
  const matches = text.match(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g);
  return matches ? matches.length : 0;
}

export function convertStructuredJsonToDrafts(
  items: StructuredBankSoalItem[],
  defaults: WordImportDefaults
): WordParseResult {
  let totalEquations = 0;
  const drafts: ParsedWordQuestionDraft[] = items.map((item, idx) => {
    const cleanSoal = sanitizeMathString(item.soal || '');
    const letters: Array<'A' | 'B' | 'C' | 'D' | 'E'> = ['A', 'B', 'C', 'D', 'E'];
    const options: QuestionOption[] = letters
      .map((ltr) => ({
        id: ltr,
        text: sanitizeMathString(item.opsi?.[ltr] || ''),
      }))
      .filter((opt, optIdx) => optIdx < 4 || opt.text.trim() !== '');

    const rawKey = (item.kunci_jawaban || '').trim().toUpperCase();
    const keyMatch = rawKey.match(/[A-E]/);
    const correctAnswer = keyMatch ? keyMatch[0] : '';

    const eqCount =
      countMathFormulaTokens(cleanSoal) +
      options.reduce((acc, o) => acc + countMathFormulaTokens(o.text), 0);
    totalEquations += eqCount;

    const warnings: string[] = [];
    if (!cleanSoal.trim()) warnings.push('Teks soal kosong.');
    if (options.filter((o) => o.text.trim()).length < 4) {
      warnings.push('Minimal 4 opsi jawaban (A–D) perlu terisi.');
    }
    if (!correctAnswer) {
      warnings.push('Kunci jawaban belum terdeteksi — pilih A–E di pratinjau.');
    } else if (!options.some((o) => o.id === correctAnswer)) {
      warnings.push(`Kunci "${correctAnswer}" tidak ada pada daftar opsi.`);
    }

    return {
      tempId: `json-draft-${Date.now()}-${idx + 1}-${Math.random().toString(36).slice(2, 6)}`,
      questionNumber: Number(item.nomor) > 0 ? Number(item.nomor) : idx + 1,
      text: cleanSoal,
      options,
      correctAnswer,
      explanation: '',
      domain: inferMathDomain(cleanSoal),
      category: defaults.category,
      stage: defaults.stage,
      type: options.length >= 2 ? 'multiple_choice' : 'short_answer',
      equationsCount: eqCount,
      warnings,
    };
  });

  const missingKeyCount = drafts.filter((d) => !d.correctAnswer).length;
  const incompleteOptionsCount = drafts.filter((d) => d.options.filter((o) => o.text.trim()).length < 4).length;

  return {
    drafts,
    rawLinesPreview: JSON.stringify(items, null, 2),
    stats: {
      totalDetected: drafts.length,
      equationsConverted: totalEquations,
      imagesExtracted: 0,
      missingKeyCount,
      incompleteOptionsCount,
    },
  };
}

function wrapSingleDollarTokensToDouble(text: string): string {
  if (!text) return '';
  return text.replace(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g, (m) => {
    if (m.startsWith('$$')) {
      return `$$ ${m.slice(2, -2).trim()} $$`;
    }
    return `$$ ${m.slice(1, -1).trim()} $$`;
  });
}

export function draftsToStructuredJson(drafts: ParsedWordQuestionDraft[]): StructuredBankSoalItem[] {
  return drafts.map((d, idx) => {
    const getOpt = (id: string) =>
      wrapSingleDollarTokensToDouble(d.options.find((o) => o.id === id)?.text || '');
    return {
      nomor: Number(d.questionNumber) > 0 ? Number(d.questionNumber) : idx + 1,
      soal: wrapSingleDollarTokensToDouble(d.text || ''),
      opsi: {
        A: getOpt('A'),
        B: getOpt('B'),
        C: getOpt('C'),
        D: getOpt('D'),
        E: getOpt('E'),
      },
      kunci_jawaban: (d.correctAnswer || '').trim().toUpperCase(),
    };
  });
}

// ============================================================================
// 8. BUILD DOWNLOADABLE SAMPLE WORD (.DOCX) TEMPLATE WITH NATIVE OMML EQUATIONS
// ============================================================================

export async function buildSampleWordTemplateDocx(): Promise<Blob> {
  const zip = new JSZip();

  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  );

  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  const pText = (text: string) =>
    `<w:p><w:r><w:t xml:space="preserve">${text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')}</w:t></w:r></w:p>`;

  const pBold = (text: string) =>
    `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')}</w:t></w:r></w:p>`;

  // Sample Question 1 with native OMML fraction & exponent
  const q1Paragraph = `<w:p>
    <w:r><w:t xml:space="preserve">1. Jika nilai </w:t></w:r>
    <m:oMath>
      <m:r><m:t>x</m:t></m:r>
      <m:r><m:t>+</m:t></m:r>
      <m:f>
        <m:num><m:r><m:t>1</m:t></m:r></m:num>
        <m:den><m:r><m:t>x</m:t></m:r></m:den>
      </m:f>
      <m:r><m:t>=3</m:t></m:r>
    </m:oMath>
    <w:r><w:t xml:space="preserve">, berapakah nilai dari </w:t></w:r>
    <m:oMath>
      <m:sSup>
        <m:e><m:r><m:t>x</m:t></m:r></m:e>
        <m:sup><m:r><m:t>2</m:t></m:r></m:sup>
      </m:sSup>
      <m:r><m:t>+</m:t></m:r>
      <m:f>
        <m:num><m:r><m:t>1</m:t></m:r></m:num>
        <m:den>
          <m:sSup>
            <m:e><m:r><m:t>x</m:t></m:r></m:e>
            <m:sup><m:r><m:t>2</m:t></m:r></m:sup>
          </m:sSup>
        </m:den>
      </m:f>
    </m:oMath>
    <w:r><w:t xml:space="preserve">?</w:t></w:r>
  </w:p>`;

  // Sample Question 2 with native OMML radical (square root) & fraction in options
  const q2Paragraph = `<w:p>
    <w:r><w:t xml:space="preserve">2. Bentuk sederhana dari </w:t></w:r>
    <m:oMath>
      <m:rad>
        <m:radPr><m:degHide m:val="1"/></m:radPr>
        <m:deg/>
        <m:e><m:r><m:t>48</m:t></m:r></m:e>
      </m:rad>
      <m:r><m:t>+</m:t></m:r>
      <m:rad>
        <m:radPr><m:degHide m:val="1"/></m:radPr>
        <m:deg/>
        <m:e><m:r><m:t>27</m:t></m:r></m:e>
      </m:rad>
    </m:oMath>
    <w:r><m:t xml:space="preserve"> adalah ...</w:t></w:r>
  </w:p>`;

  const q2OptA = `<w:p><w:r><w:t xml:space="preserve">A. </w:t></w:r><m:oMath><m:r><m:t>5</m:t></m:r><m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:deg/><m:e><m:r><m:t>3</m:t></m:r></m:e></m:rad></m:oMath></w:p>`;
  const q2OptB = `<w:p><w:r><w:t xml:space="preserve">B. </w:t></w:r><m:oMath><m:r><m:t>7</m:t></m:r><m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:deg/><m:e><m:r><m:t>3</m:t></m:r></m:e></m:rad></m:oMath></w:p>`;
  const q2OptC = `<w:p><w:r><w:t xml:space="preserve">C. </w:t></w:r><m:oMath><m:r><m:t>8</m:t></m:r><m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:deg/><m:e><m:r><m:t>3</m:t></m:r></m:e></m:rad></m:oMath></w:p>`;
  const q2OptD = `<w:p><w:r><w:t xml:space="preserve">D. </w:t></w:r><m:oMath><m:r><m:t>9</m:t></m:r><m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:deg/><m:e><m:r><m:t>3</m:t></m:r></m:e></m:rad></m:oMath></w:p>`;
  const q2OptE = `<w:p><w:r><w:t xml:space="preserve">E. </w:t></w:r><m:oMath><m:r><m:t>12</m:t></m:r><m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:deg/><m:e><m:r><m:t>3</m:t></m:r></m:e></m:rad></m:oMath></w:p>`;

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
  <w:body>
    ${q1Paragraph}
    ${pText('A. 5')}
    ${pText('B. 7')}
    ${pText('C. 9')}
    ${pText('D. 11')}
    ${pText('E. 13')}
    ${pBold('Kunci Jawaban: B')}
    ${pText('')}
    ${q2Paragraph}
    ${q2OptA}
    ${q2OptB}
    ${q2OptC}
    ${q2OptD}
    ${q2OptE}
    ${pBold('Kunci Jawaban: B')}
    <w:sectPr/>
  </w:body>
</w:document>`;

  zip.file('word/document.xml', documentXml);

  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}
