import { useCallback, useState } from 'react';
import { UPLOAD_FILE_URL, apiFetch } from '@/utils/api';

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.readAsDataURL(file);
  });

interface UsePasteImageOptions {
  folder?: string;
  onInsert: (markdown: string) => void;
}

export const usePasteImage = ({ folder = 'uploads/inline-images', onInsert }: UsePasteImageOptions) => {
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

        const filename = `paste-${Date.now()}.${file.type.split('/')[1] || 'png'}`;
        const renamedFile = new File([file], filename, { type: file.type });

        const base64 = await fileToBase64(renamedFile);
        const resp = await apiFetch(UPLOAD_FILE_URL, {
          method: 'POST',
          body: JSON.stringify({ file: base64, filename, folder }),
        });

        if (!resp.ok) throw new Error('Ошибка загрузки');
        const data = await resp.json();
        const url: string = data.cdn_url || data.url;
        onInsert(`![](${url})`);
      } catch {
        console.error('[usePasteImage] upload failed');
      } finally {
        setUploadingPaste(false);
      }
    },
    [folder, onInsert],
  );

  return { handlePaste, uploadingPaste };
};
