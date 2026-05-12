import { useCallback, useState } from 'react';

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });

interface UsePasteImageOptions {
  folder?: string;
  onInsert: (dataUrl: string) => void;
}

export const usePasteImage = ({ onInsert }: UsePasteImageOptions) => {
  const [uploadingPaste, setUploadingPaste] = useState(false);

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = Array.from(e.clipboardData.items);
      const imageItem = items.find((item) => item.type.startsWith('image/'));
      if (!imageItem) return;

      e.preventDefault();
      setUploadingPaste(true);

      try {
        const file = imageItem.getAsFile();
        if (!file) return;
        const dataUrl = await fileToDataUrl(file);
        onInsert(dataUrl);
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
 * Заменяет плейсхолдеры ![img:N] на реальные data URL перед сохранением/отправкой
 */
export function resolvePastedImages(text: string, images: string[]): string {
  return text.replace(/!\[img:(\d+)\]/g, (_m, idx) => {
    const src = images[Number(idx)];
    return src ? `![](${src})` : '';
  });
}
