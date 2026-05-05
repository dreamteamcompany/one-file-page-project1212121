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

interface PresignResponse {
  upload_url: string;
  method: string;
  headers: Record<string, string>;
  cdn_url: string;
  key: string;
  filename: string;
  content_type: string;
}

const requestPresign = async (
  filename: string,
  contentType: string,
  folder: string,
): Promise<PresignResponse> => {
  const resp = await apiFetch(UPLOAD_FILE_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'presign', filename, content_type: contentType, folder }),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Не удалось получить ссылку для загрузки: ${resp.status} ${text}`);
  }
  return resp.json();
};

const putWithProgress = (
  url: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<void> =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Ошибка загрузки в S3: ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('Сетевая ошибка при загрузке файла'));
    xhr.send(file);
  });

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
        const presign = await requestPresign(file.name, initial.contentType, folder);
        await putWithProgress(presign.upload_url, file, (pct) =>
          update(id, { progress: pct }),
        );
        const done: UploadedAttachment = {
          ...initial,
          url: presign.cdn_url,
          contentType: presign.content_type,
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