import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { usePasteImage } from '@/hooks/usePasteImage';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import AttachmentUploader from '@/components/shared/AttachmentUploader';
import { UploadedAttachment } from '@/hooks/useFileUploader';

interface TicketService {
  id: number;
  name: string;
  description?: string;
  ticket_title?: string;
  category_id?: number;
  category_name?: string;
  service_ids?: number[];
}

interface Priority {
  id: number;
  name: string;
  color: string;
  description?: string;
  is_critical?: boolean;
}

interface TicketFormStep1Props {
  formData: {
    title: string;
    description: string;
    category_id: string;
    priority_id: string;
    due_date: string;
    custom_fields: Record<string, string>;
  };
  setFormData: (data: Record<string, string | number | number[] | Record<string, string>>) => void;
  priorities: Priority[];
  selectedTicketService?: TicketService;
  hasCustomFields?: boolean;
  onNext?: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onBack: () => void;
  isFirstStep?: boolean;
  classificationMode?: 'ai' | 'manual';
  attachments?: UploadedAttachment[];
  isUploadingFiles?: boolean;
  onSelectFiles?: (files: FileList | File[]) => void;
  onRemoveAttachment?: (id: string) => void;
  isSubmitting?: boolean;
}

const TicketFormStep1 = ({
  formData,
  setFormData,
  priorities,
  selectedTicketService,
  hasCustomFields,
  onNext,
  onSubmit,
  onBack,
  isFirstStep,
  classificationMode = 'ai',
  attachments,
  isUploadingFiles,
  onSelectFiles,
  onRemoveAttachment,
  isSubmitting = false,
}: TicketFormStep1Props) => {
  const [criticalConfirmOpen, setCriticalConfirmOpen] = useState(false);
  const [pendingPriorityId, setPendingPriorityId] = useState<string | null>(null);
  const [titleEditedByUser, setTitleEditedByUser] = useState(false);
  const [descPastedImages, setDescPastedImages] = useState<string[]>([]);

  const descRef = useRef<HTMLTextAreaElement>(null);

  const { handlePaste: handleDescPaste, uploadingPaste } = usePasteImage({
    onInsert: (dataUrl) => {
      setDescPastedImages((prev) => [...prev, dataUrl]);
    },
  });

  const ticketTitle = selectedTicketService?.ticket_title || '';
  const lastAutoTitleRef = useRef<string>('');

  useEffect(() => {
    if (titleEditedByUser) return;
    if (!ticketTitle) return;
    if (formData.title && formData.title !== lastAutoTitleRef.current) return;
    if (formData.title === ticketTitle) return;
    lastAutoTitleRef.current = ticketTitle;
    setFormData({ ...formData, title: ticketTitle });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketTitle]);

  const hasDescription = formData.description.trim().length > 0;
  const hasTitle = (formData.title || '').trim().length > 0;
  const canProceed = isFirstStep ? hasDescription : (hasDescription && hasTitle);

  const handlePriorityChange = (value: string) => {
    const selected = priorities.find((p) => p.id.toString() === value);
    if (selected?.is_critical) {
      setPendingPriorityId(value);
      setCriticalConfirmOpen(true);
    } else {
      setFormData({ ...formData, priority_id: value });
    }
  };

  const confirmCriticalPriority = () => {
    if (pendingPriorityId) {
      setFormData({ ...formData, priority_id: pendingPriorityId });
    }
    setPendingPriorityId(null);
    setCriticalConfirmOpen(false);
  };

  const cancelCriticalPriority = () => {
    setPendingPriorityId(null);
    setCriticalConfirmOpen(false);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (descPastedImages.length > 0) {
      const imgs = descPastedImages.map((s) => `![](${s})`).join('\n');
      const base = formData.description.trim();
      setFormData({ ...formData, description: base ? `${base}\n\n${imgs}` : imgs });
      setDescPastedImages([]);
    }
    onSubmit(e);
  };

  return (
    <form
      onSubmit={handleFormSubmit}
      onKeyDown={(e) => {
        const target = e.target as HTMLElement;
        if (e.key === 'Enter' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
        }
      }}
    >
      <div className="space-y-4 mt-4">
        {!isFirstStep && (
          <div className="space-y-2">
            <Label htmlFor="title" className="flex items-center gap-2">
              <Icon name="Tag" size={14} className="text-muted-foreground" />
              Тема заявки *
            </Label>
            <Input
              id="title"
              value={formData.title || ''}
              onChange={(e) => {
                setTitleEditedByUser(true);
                setFormData({ ...formData, title: e.target.value });
              }}
              placeholder="Краткая тема заявки"
              maxLength={255}
            />
            {ticketTitle && (formData.title || '').trim() !== ticketTitle && (
              <button
                type="button"
                onClick={() => {
                  setTitleEditedByUser(false);
                  lastAutoTitleRef.current = ticketTitle;
                  setFormData({ ...formData, title: ticketTitle });
                }}
                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                <Icon name="RotateCcw" size={12} />
                Подставить из услуги: «{ticketTitle}»
              </button>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="description">
            Описание проблемы или запроса *
          </Label>
          <div className="relative">
            <Textarea
              ref={descRef}
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              onPaste={handleDescPaste}
              placeholder="Опишите подробно вашу проблему. Можно вставить скриншот через Ctrl+V"
              rows={5}
              autoFocus
            />
            {uploadingPaste && (
              <div className="absolute inset-0 bg-background/60 rounded-md flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Icon name="Loader2" size={14} className="animate-spin" />
                Обработка изображения...
              </div>
            )}
          </div>
          {descPastedImages.length > 0 && (
            <div className="flex flex-wrap gap-2 p-2 bg-muted/30 rounded-lg border border-border/50">
              {descPastedImages.map((src, i) => (
                <div key={i} className="relative group">
                  <img
                    src={src}
                    alt=""
                    className="max-h-24 max-w-[160px] rounded-md border border-border object-cover cursor-pointer"
                    onClick={() => window.open(src, '_blank')}
                  />
                  <button
                    type="button"
                    onClick={() => setDescPastedImages((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-4 h-4 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {isFirstStep && (
            <p className="text-xs text-muted-foreground">
              {classificationMode === 'ai'
                ? 'ИИ автоматически определит категорию заявки по вашему описанию'
                : 'На следующем шаге вы выберете услугу и сервис вручную'}
            </p>
          )}
        </div>

        {onSelectFiles && onRemoveAttachment && (
          <div className="space-y-2">
            <Label>Вложения</Label>
            <AttachmentUploader
              attachments={attachments || []}
              isUploading={!!isUploadingFiles}
              onSelect={onSelectFiles}
              onRemove={onRemoveAttachment}
              hint="Можно прикрепить несколько файлов"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="priority_id">Приоритет</Label>
          <Select
            value={formData.priority_id}
            onValueChange={handlePriorityChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Выберите приоритет" />
            </SelectTrigger>
            <SelectContent>
              {priorities.map((priority) => (
                <SelectItem key={priority.id} value={priority.id.toString()}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: priority.color }}
                    />
                    <div>
                      <span>{priority.name}</span>
                      {priority.description && (
                        <p className="text-xs text-muted-foreground font-normal">{priority.description}</p>
                      )}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="gap-2"
          >
            {isFirstStep ? (
              <>
                <Icon name="X" size={18} />
                Отмена
              </>
            ) : (
              <>
                <Icon name="ArrowLeft" size={18} />
                Назад
              </>
            )}
          </Button>
          {isFirstStep && onNext ? (
            <Button
              type="button"
              className="flex-1 gap-2"
              onClick={() => {
                if (descPastedImages.length > 0) {
                  const imgs = descPastedImages.map((s) => `![](${s})`).join('\n');
                  const base = formData.description.trim();
                  setFormData({ ...formData, description: base ? `${base}\n\n${imgs}` : imgs });
                  setDescPastedImages([]);
                }
                onNext?.();
              }}
              disabled={!canProceed || isUploadingFiles}
            >
              <Icon name={classificationMode === 'ai' ? 'Sparkles' : 'ArrowRight'} size={18} />
              {isUploadingFiles ? 'Дождитесь загрузки файлов...' : 'Далее'}
            </Button>
          ) : hasCustomFields && onNext ? (
            <Button
              type="button"
              className="flex-1 gap-2"
              onClick={() => {
                if (descPastedImages.length > 0) {
                  const imgs = descPastedImages.map((s) => `![](${s})`).join('\n');
                  const base = formData.description.trim();
                  setFormData({ ...formData, description: base ? `${base}\n\n${imgs}` : imgs });
                  setDescPastedImages([]);
                }
                onNext?.();
              }}
              disabled={isUploadingFiles || !canProceed}
            >
              {isUploadingFiles ? 'Дождитесь загрузки файлов...' : 'Далее'}
              <Icon name="ArrowRight" size={18} />
            </Button>
          ) : (
            <Button
              type="submit"
              className="flex-1 gap-2"
              disabled={isUploadingFiles || !canProceed || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Icon name="Loader2" size={18} className="animate-spin" />
                  Создание заявки...
                </>
              ) : (
                <>
                  <Icon name="Send" size={18} />
                  {isUploadingFiles ? 'Дождитесь загрузки файлов...' : 'Создать заявку'}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={criticalConfirmOpen} onOpenChange={setCriticalConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Icon name="AlertTriangle" size={20} className="text-destructive" />
              Подтверждение критичного приоритета
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              Критичный приоритет назначается только в особых случаях: полная остановка работы, угроза безопасности данных, блокировка ключевых бизнес-процессов. Если при рассмотрении заявки выяснится, что вопрос не является критичным, приоритет будет снижен. Вы уверены, что ситуация требует именно критичного приоритета?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelCriticalPriority}>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCriticalPriority} className="bg-destructive hover:bg-destructive/90">
              Да, подтверждаю
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
};

export default TicketFormStep1;