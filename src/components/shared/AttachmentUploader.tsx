import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { UploadedAttachment } from '@/hooks/useFileUploader';

interface AttachmentUploaderProps {
  attachments: UploadedAttachment[];
  isUploading: boolean;
  onSelect: (files: FileList | File[]) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
  buttonLabel?: string;
  className?: string;
  hint?: string;
}

const formatSize = (size: number): string => {
  if (!size) return '';
  if (size < 1024) return `${size} Б`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} КБ`;
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} МБ`;
  return `${(size / 1024 / 1024 / 1024).toFixed(1)} ГБ`;
};

const isImage = (att: UploadedAttachment) => {
  if (att.contentType?.startsWith('image/')) return true;
  return /\.(jpe?g|png|gif|webp|svg)$/i.test(att.filename);
};

const AttachmentUploader = ({
  attachments,
  isUploading,
  onSelect,
  onRemove,
  disabled,
  buttonLabel = 'Прикрепить файлы',
  className,
  hint,
}: AttachmentUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => inputRef.current?.click();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onSelect(e.target.files);
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={handleChange}
        className="hidden"
        disabled={disabled}
      />

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClick}
          disabled={disabled}
          className="gap-2"
        >
          <Icon name="Paperclip" size={16} />
          {buttonLabel}
        </Button>
        {isUploading && (
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Icon name="Loader2" size={12} className="animate-spin" />
            Загрузка...
          </span>
        )}
        {hint && !isUploading && (
          <span className="text-xs text-muted-foreground">{hint}</span>
        )}
      </div>

      {attachments.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {attachments.map((att) => (
            <li
              key={att.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md border bg-card text-sm"
            >
              <Icon
                name={isImage(att) ? 'Image' : 'File'}
                size={16}
                className="text-muted-foreground flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate">{att.filename}</span>
                  {att.size > 0 && (
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatSize(att.size)}
                    </span>
                  )}
                </div>
                {att.status === 'uploading' && (
                  <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${att.progress}%` }}
                    />
                  </div>
                )}
                {att.status === 'error' && (
                  <p className="text-xs text-destructive mt-0.5">
                    {att.errorMessage || 'Ошибка загрузки'}
                  </p>
                )}
              </div>
              {att.status === 'done' && (
                <Icon name="Check" size={14} className="text-emerald-500 flex-shrink-0" />
              )}
              <button
                type="button"
                onClick={() => onRemove(att.id)}
                className="p-1 rounded hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors"
                title="Удалить"
              >
                <Icon name="X" size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AttachmentUploader;
