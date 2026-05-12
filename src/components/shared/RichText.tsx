import { memo } from 'react';

interface RichTextProps {
  text: string;
  className?: string;
}

const IMAGE_RE = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;

export function renderRichText(text: string): string {
  return text.replace(IMAGE_RE, (_match, alt, url) => {
    const safeAlt = alt.replace(/"/g, '&quot;');
    const safeUrl = url.replace(/"/g, '&quot;');
    return `<img src="${safeUrl}" alt="${safeAlt}" style="max-width:100%;max-height:400px;border-radius:6px;display:block;margin:4px 0" loading="lazy" />`;
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
