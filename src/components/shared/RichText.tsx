import { memo } from 'react';

interface RichTextProps {
  text: string;
  className?: string;
}

const IMAGE_RE = /!\[([^\]]*)\]\(((?:https?:\/\/|data:image\/)[^\s)]+)\)/g;

declare global {
  interface Window {
    __openImageLightbox?: (src: string, alt?: string) => void;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderRichText(text: string): string {
  let lastIndex = 0;
  let out = '';
  IMAGE_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = IMAGE_RE.exec(text)) !== null) {
    out += escapeHtml(text.slice(lastIndex, match.index));
    const alt = match[1];
    const url = match[2];
    const safeAlt = escapeHtml(alt).replace(/"/g, '&quot;');
    const isBase64 = url.startsWith('data:image/');
    const safeUrl = isBase64 ? url : url.replace(/"/g, '&quot;');
    out += `<img src="${safeUrl}" alt="${safeAlt}" style="max-width:100%;max-height:400px;border-radius:6px;display:block;margin:4px 0;cursor:pointer" loading="lazy" onclick="(window.__openImageLightbox ? window.__openImageLightbox(this.src, this.alt) : window.open(this.src, '_blank'))" />`;
    lastIndex = match.index + match[0].length;
  }
  out += escapeHtml(text.slice(lastIndex));
  return out;
}

const RichText = memo(({ text, className }: RichTextProps) => {
  const html = renderRichText(text);
  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
      style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere' }}
    />
  );
});

RichText.displayName = 'RichText';

export default RichText;