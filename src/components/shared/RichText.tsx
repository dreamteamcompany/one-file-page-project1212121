import { memo } from 'react';

interface RichTextProps {
  text: string;
  className?: string;
  pastedImages?: string[];
}

const IMAGE_RE = /!\[([^\]]*)\]\(((?:https?:\/\/|data:image\/)[^\s)]+)\)/g;
const PLACEHOLDER_RE = /!\[img:(\d+)\]/g;

export function renderRichText(text: string, pastedImages?: string[]): string {
  let result = text;

  if (pastedImages && pastedImages.length > 0) {
    result = result.replace(PLACEHOLDER_RE, (_m, idx) => {
      const src = pastedImages[Number(idx)];
      if (!src) return '';
      return `<img src="${src}" style="max-width:100%;max-height:400px;border-radius:6px;display:block;margin:4px 0;cursor:pointer" loading="lazy" onclick="window.open(this.src,'_blank')" />`;
    });
  }

  result = result.replace(IMAGE_RE, (_match, alt, url) => {
    const safeAlt = alt.replace(/"/g, '&quot;');
    const isBase64 = url.startsWith('data:image/');
    const safeUrl = isBase64 ? url : url.replace(/"/g, '&quot;');
    return `<img src="${safeUrl}" alt="${safeAlt}" style="max-width:100%;max-height:400px;border-radius:6px;display:block;margin:4px 0;cursor:pointer" loading="lazy" onclick="window.open(this.src,'_blank')" />`;
  });

  return result;
}

const RichText = memo(({ text, className, pastedImages }: RichTextProps) => {
  const html = renderRichText(text, pastedImages);
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
