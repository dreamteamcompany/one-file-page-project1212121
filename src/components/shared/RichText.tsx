import { memo } from 'react';

interface RichTextProps {
  text: string;
  className?: string;
}

const IMAGE_RE = /!\[([^\]]*)\]\(((?:https?:\/\/|data:image\/)[^\s)]+)\)/g;

export function renderRichText(text: string): string {
  return text.replace(IMAGE_RE, (_match, alt, url) => {
    const safeAlt = alt.replace(/"/g, '&quot;');
    const isBase64 = url.startsWith('data:image/');
    const safeUrl = isBase64 ? url : url.replace(/"/g, '&quot;');
    return `<img src="${safeUrl}" alt="${safeAlt}" style="max-width:100%;max-height:400px;border-radius:6px;display:block;margin:4px 0;cursor:pointer" loading="lazy" onclick="window.open(this.src,'_blank')" />`;
  });
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