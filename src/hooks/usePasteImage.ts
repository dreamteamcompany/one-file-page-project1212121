import { useCallback, useState } from 'react';

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });

export interface PastedImage {
  id: string;
  dataUrl: string;
  /** Позиция курсора в тексте ПОСЛЕ которой вставлена картинка */
  afterPos: number;
}

interface UsePasteImageOptions {
  folder?: string;
  onInsert: (dataUrl: string, cursorPos: number) => void;
}

export const usePasteImage = ({ onInsert }: UsePasteImageOptions) => {
  const [uploadingPaste, setUploadingPaste] = useState(false);

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = Array.from(e.clipboardData.items);
      const imageItem = items.find((item) => item.type.startsWith('image/'));
      if (!imageItem) return;

      e.preventDefault();
      setUploadingPaste(true);

      const cursorPos = e.currentTarget.selectionStart ?? e.currentTarget.value.length;

      try {
        const file = imageItem.getAsFile();
        if (!file) return;
        const dataUrl = await fileToDataUrl(file);
        onInsert(dataUrl, cursorPos);
      } catch {
        console.error('[usePasteImage] failed to read image');
      } finally {
        setUploadingPaste(false);
      }
    },
    [onInsert],
  );

  return { handlePaste, uploadingPaste };
};

/**
 * Собирает финальный текст: вставляет картинки в нужные позиции текста
 */
export function buildFinalText(text: string, images: PastedImage[]): string {
  if (images.length === 0) return text;

  const sorted = [...images].sort((a, b) => a.afterPos - b.afterPos);
  let result = '';
  let lastPos = 0;

  for (const img of sorted) {
    const pos = Math.min(img.afterPos, text.length);
    result += text.slice(lastPos, pos);
    result += `\n![](${img.dataUrl})\n`;
    lastPos = pos;
  }

  result += text.slice(lastPos);
  return result;
}
