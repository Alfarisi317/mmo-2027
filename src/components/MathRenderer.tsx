import React, { useMemo } from 'react';
import katex from 'katex';

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
  const renderedHtml = useMemo(() => {
    if (!content) return '';

    // If the entire content is a pure latex formula
    if (inline) {
      try {
        return katex.renderToString(content, {
          displayMode: false,
          throwOnError: false,
        });
      } catch (err) {
        return content;
      }
    }

    // Split text by display math ($$...$$) and inline math ($...$)
    // Regex matches $$...$$ or $...$
    const parts: string[] = [];
    const regex = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      // Text before match
      if (match.index > lastIndex) {
        parts.push(escapeHtml(content.substring(lastIndex, match.index)));
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
        parts.push(`<span class="font-mono text-amber-300">${escapeHtml(rawMath)}</span>`);
      }

      lastIndex = regex.lastIndex;
    }

    // Remaining text
    if (lastIndex < content.length) {
      parts.push(escapeHtml(content.substring(lastIndex)));
    }

    // Convert newlines to breaks for regular text
    return parts.join('').replace(/\n/g, '<br />');
  }, [content, inline]);

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
