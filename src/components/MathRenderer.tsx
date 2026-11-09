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

    // If content is purely a single wrapped math formula, e.g. "$x^2$" or "$\frac{a}{b}$"
    if (
      cleanContent.startsWith('$') &&
      cleanContent.endsWith('$') &&
      !cleanContent.slice(1, -1).includes('$')
    ) {
      try {
        const rawMath = cleanContent.slice(1, -1).trim();
        return katex.renderToString(rawMath, {
          displayMode: false,
          throwOnError: false,
        });
      } catch (err) {
        return escapeHtml(cleanContent);
      }
    }

    // Split text by display math ($$...$$) and inline math ($...$)
    const parts: string[] = [];
    const regex = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(cleanContent)) !== null) {
      // Text before match
      if (match.index > lastIndex) {
        parts.push(escapeHtml(cleanContent.substring(lastIndex, match.index)));
      }

      const formula = match[0];
      const isDisplay = formula.startsWith('$$') && formula.endsWith('$$');
      const rawMath = isDisplay
        ? formula.slice(2, -2).trim()
        : formula.slice(1, -1).trim();

      try {
        const rendered = katex.renderToString(rawMath, {
          displayMode: isDisplay,
          throwOnError: false,
        });
        parts.push(rendered);
      } catch (err) {
        parts.push(`<span class="font-mono text-zinc-800">${escapeHtml(rawMath)}</span>`);
      }

      lastIndex = regex.lastIndex;
    }

    // Remaining text
    if (lastIndex < cleanContent.length) {
      parts.push(escapeHtml(cleanContent.substring(lastIndex)));
    }

    if (inline) {
      return parts.join('');
    }

    // Convert newlines to breaks for regular text
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
