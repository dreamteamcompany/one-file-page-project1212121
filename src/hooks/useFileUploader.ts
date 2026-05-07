import { useCallback, useState } from 'react';
import { UPLOAD_FILE_URL, apiFetch } from '@/utils/api';

export interface UploadedAttachment {
  id: string;
  filename: string;
  url: string;
  size: number;
  contentType: string;
  status: 'uploading' | 'done' | 'error';
  progress: number;
  errorMessage?: string;
}

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

interface InlineUploadResponse {
  url: string;
  cdn_url: string;
  key: string;
  filename: string;
  content_type: string;
  size: number;
}

const fileToBase64 = (
  file: File,
  onProgress: (pct: number) => void,
): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 50));
      }
    };
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      onProgress(50);
      resolve(base64);
    };
    reader.readAsDataURL(file);
  });

const uploadInline = async (
  file: File,
  folder: string,
  onProgress: (pct: number) => void,
): Promise<InlineUploadResponse> => {
  const base64 = await fileToBase64(file, onProgress);
  onProgress(60);
  const resp = await apiFetch(UPLOAD_FILE_URL, {
    method: 'POST',
    body: JSON.stringify({ file: base64, filename: file.name, folder }),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Не удалось загрузить файл: ${resp.status} ${text}`);
  }
  onProgress(100);
  return resp.json();
};

export const useFileUploader = (folder = 'uploads/attachments') => {
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);

  const update = useCallback((id: string, patch: Partial<UploadedAttachment>) => {
    setAttachments((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }, []);

  const upload = useCallback(
    async (file: File): Promise<UploadedAttachment | null> => {
      const id = genId();
      const initial: UploadedAttachment = {
        id,
        filename: file.name,
        url: '',
        size: file.size,
        contentType: file.type || 'application/octet-stream',
        status: 'uploading',
        progress: 0,
      };
      setAttachments((prev) => [...prev, initial]);

      try {
        const result = await uploadInline(file, folder, (pct) =>
          update(id, { progress: pct }),
        );
        const done: UploadedAttachment = {
          ...initial,
          url: result.cdn_url,
          contentType: result.content_type,
          status: 'done',
          progress: 100,
        };
        update(id, done);
        return done;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Не удалось загрузить файл';
        update(id, { status: 'error', errorMessage: message });
        return null;
      }
    },
    [folder, update],
  );

  const uploadMany = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files);
      await Promise.all(arr.map((f) => upload(f)));
    },
    [upload],
  );

  const remove = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clear = useCallback(() => setAttachments([]), []);

  const isUploading = attachments.some((a) => a.status === 'uploading');
  const successful = attachments.filter((a) => a.status === 'done');

  return {
    attachments,
    isUploading,
    successful,
    upload,
    uploadMany,
    remove,
    clear,
    setAttachments,
  };
};

export default useFileUploader;