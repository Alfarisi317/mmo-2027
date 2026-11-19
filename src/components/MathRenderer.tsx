import React, { useMemo } from 'react';
import katex from 'katex';
import { sanitizeMathString } from '../utils/mathSanitizer';

interface MathRendererProps {
  content: string;
  className?: string;
  inline?: boolean;
}

export const MathRenderer: React.FC<MathRendererProps> = ({
  content,
  className = '',
  inline = false,
}) => {
  const cleanContent = useMemo(() => sanitizeMathString(content), [content]);

  const renderedHtml = useMemo(() => {
    if (!cleanContent) return '';

    // Fast path: content is purely a single wrapped math formula ("$...$" or "$$...$$")
    if (
      cleanContent.startsWith('$$') &&
      cleanContent.endsWith('$$') &&
      cleanContent.length > 4 &&
      !cleanContent.slice(2, -2).includes('$$') &&
      !cleanContent.slice(2, -2).includes('$')
    ) {
      try {
        const rawMath = cleanContent.slice(2, -2).trim();
        return katex.renderToString(rawMath, {
          displayMode: false,
          throwOnError: false,
          output: 'html',
        });
      } catch {
        return escapeHtml(cleanContent);
      }
    }

    if (
      cleanContent.startsWith('$') &&
      cleanContent.endsWith('$') &&
      cleanContent.length > 2 &&
      !cleanContent.slice(1, -1).includes('$')
    ) {
      try {
        const rawMath = cleanContent.slice(1, -1).trim();
        return katex.renderToString(rawMath, {
          displayMode: false,
          throwOnError: false,
          output: 'html',
        });
      } catch {
        return escapeHtml(cleanContent);
      }
    }

    // Split text by double dollar ($$...$$) and single dollar ($...$)
    const parts: string[] = [];
    const regex = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(cleanContent)) !== null) {
      if (match.index > lastIndex) {
        parts.push(escapeHtml(cleanContent.substring(lastIndex, match.index)));
      }

      const formula = match[0];
      const isDouble = formula.startsWith('$$') && formula.endsWith('$$');
      const rawMath = isDouble
        ? formula.slice(2, -2).trim()
        : formula.slice(1, -1).trim();

      // Render $$...$$ in displayMode ONLY when it stands on its own line (and inline prop is false).
      // Mid-sentence $$...$$ (e.g. "Berapakah hasil dari $$ \frac{3}{2} $$ ditambah 1?") renders cleanly inline!
      let useDisplayMode = false;
      if (isDouble && !inline) {
        const before = cleanContent.slice(0, match.index);
        const after = cleanContent.slice(regex.lastIndex);
        const beforeOnSameLine = before.split('\n').pop() ?? '';
        const afterOnSameLine = after.split('\n')[0] ?? '';
        const hasInlineTextAround =
          beforeOnSameLine.trim().length > 0 || afterOnSameLine.trim().length > 0;
        useDisplayMode = !hasInlineTextAround && (before.includes('\n') || after.includes('\n'));
      }

      try {
        const rendered = katex.renderToString(rawMath, {
          displayMode: useDisplayMode,
          throwOnError: false,
          output: 'html',
        });
        parts.push(rendered);
      } catch {
        parts.push(`<span class="font-mono text-zinc-800">${escapeHtml(rawMath)}</span>`);
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < cleanContent.length) {
      parts.push(escapeHtml(cleanContent.substring(lastIndex)));
    }

    if (inline) {
      return parts.join('');
    }

    return parts.join('').replace(/\n/g, '<br />');
  }, [cleanContent, inline]);

  return (
    <span
      className={`math-content leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
