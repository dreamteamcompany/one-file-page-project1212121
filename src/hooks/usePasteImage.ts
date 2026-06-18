import { useCallback, useState } from 'react';
import { UPLOAD_FILE_URL, apiFetch } from '@/utils/api';

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
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
  /** Вызывается после успешной загрузки картинки на сервер, передаёт публичную ссылку */
  onUploaded: (url: string, cursorPos: number) => void;
  onError?: (message: string) => void;
}

export const usePasteImage = ({ folder = 'uploads/ticket-description', onUploaded, onError }: UsePasteImageOptions) => {
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
        const base64 = await fileToBase64(file);
        const filename = file.name && file.name !== 'image.png'
          ? file.name
          : `screenshot-${Date.now()}.png`;
        const resp = await apiFetch(UPLOAD_FILE_URL, {
          method: 'POST',
          body: JSON.stringify({ file: base64, filename, folder }),
        });
        if (!resp.ok) {
          const text = await resp.text().catch(() => '');
          throw new Error(`${resp.status} ${text}`);
        }
        const data = await resp.json();
        const url = data.cdn_url || data.url;
        if (!url) throw new Error('Сервер не вернул ссылку на файл');
        onUploaded(url, cursorPos);
      } catch (err) {
        console.error('[usePasteImage] upload failed', err);
        onError?.('Не удалось загрузить изображение. Попробуйте ещё раз.');
      } finally {
        setUploadingPaste(false);
      }
    },
    [folder, onUploaded, onError],
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
