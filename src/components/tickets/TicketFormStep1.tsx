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
}: TicketFormStep1Props) => {
  const [criticalConfirmOpen, setCriticalConfirmOpen] = useState(false);
  const [pendingPriorityId, setPendingPriorityId] = useState<string | null>(null);
  const [titleEditedByUser, setTitleEditedByUser] = useState(false);

  const descRef = useRef<HTMLTextAreaElement>(null);

  const { handlePaste: handleDescPaste, uploadingPaste } = usePasteImage({
    folder: 'uploads/inline-images',
    onInsert: (markdown) => {
      const ta = descRef.current;
      const current = formData.description;
      if (!ta) {
        setFormData({ ...formData, description: current + markdown });
        return;
      }
      const start = ta.selectionStart ?? current.length;
      const end = ta.selectionEnd ?? current.length;
      const next = current.slice(0, start) + markdown + current.slice(end);
      setFormData({ ...formData, description: next });
      requestAnimationFrame(() => {
        const pos = start + markdown.length;
        ta.setSelectionRange(pos, pos);
        ta.focus();
      });
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

  return (
    <form onSubmit={onSubmit}>
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
                Загрузка изображения...
              </div>
            )}
          </div>
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
              onClick={onNext}
              disabled={!canProceed || isUploadingFiles}
            >
              <Icon name={classificationMode === 'ai' ? 'Sparkles' : 'ArrowRight'} size={18} />
              {isUploadingFiles ? 'Дождитесь загрузки файлов...' : 'Далее'}
            </Button>
          ) : hasCustomFields && onNext ? (
            <Button
              type="button"
              className="flex-1 gap-2"
              onClick={onNext}
              disabled={isUploadingFiles || !canProceed}
            >
              {isUploadingFiles ? 'Дождитесь загрузки файлов...' : 'Далее'}
              <Icon name="ArrowRight" size={18} />
            </Button>
          ) : (
            <Button
              type="submit"
              className="flex-1 gap-2"
              disabled={isUploadingFiles || !canProceed}
            >
              <Icon name="Send" size={18} />
              {isUploadingFiles ? 'Дождитесь загрузки файлов...' : 'Создать заявку'}
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