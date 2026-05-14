import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import { usePasteImage } from '@/hooks/usePasteImage';
import { renderCustomField } from './TicketFormStep4';
import { useTicketServices } from '@/hooks/useTicketServices';

interface CustomFieldOnTicket {
  id: number;
  name: string;
  field_type: string;
  value?: string;
  display_value?: string;
  hide_label?: boolean;
  options?: string[];
  is_required?: boolean;
  placeholder?: string;
}

interface TicketLike {
  id: number;
  title: string;
  description?: string;
  custom_fields?: CustomFieldOnTicket[];
  ticket_service?: { id: number; name: string };
}

interface EditTicketContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: TicketLike;
  updating?: boolean;
  onSave: (payload: {
    title?: string;
    description?: string;
    custom_fields?: Record<string, string>;
    ticket_service_id?: number | null;
  }) => Promise<boolean>;
}

const EditTicketContentDialog = ({
  open,
  onOpenChange,
  ticket,
  updating,
  onSave,
}: EditTicketContentDialogProps) => {
  const { toast } = useToast();
  const { ticketServices, loading: servicesLoading } = useTicketServices();

  const initialCustomFields = useMemo(() => {
    const acc: Record<string, string> = {};
    (ticket.custom_fields || []).forEach((f) => {
      acc[String(f.id)] = f.value ?? '';
    });
    return acc;
  }, [ticket]);

  const [title, setTitle] = useState(ticket.title || '');
  const [description, setDescription] = useState(ticket.description || '');
  const [ticketServiceId, setTicketServiceId] = useState<string>(
    ticket.ticket_service?.id ? String(ticket.ticket_service.id) : '',
  );
  const [customFieldsState, setCustomFieldsState] = useState<Record<string, string>>(
    initialCustomFields,
  );
  const [descPastedImages, setDescPastedImages] = useState<string[]>([]);
  const descRef = useRef<HTMLTextAreaElement>(null);

  const { handlePaste: handleDescPaste, uploadingPaste } = usePasteImage({
    onInsert: (dataUrl) => setDescPastedImages((prev) => [...prev, dataUrl]),
  });

  useEffect(() => {
    if (!open) return;
    setTitle(ticket.title || '');
    setDescription(ticket.description || '');
    setTicketServiceId(
      ticket.ticket_service?.id ? String(ticket.ticket_service.id) : '',
    );
    setCustomFieldsState(initialCustomFields);
    setDescPastedImages([]);
  }, [open, ticket, initialCustomFields]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Заголовок не может быть пустым',
        variant: 'destructive',
      });
      return;
    }

    let finalDescription = description.trim();
    if (descPastedImages.length > 0) {
      const imgs = descPastedImages.map((s) => `![](${s})`).join('\n');
      finalDescription = finalDescription ? `${finalDescription}\n\n${imgs}` : imgs;
    }

    const payload: {
      title?: string;
      description?: string;
      custom_fields?: Record<string, string>;
      ticket_service_id?: number | null;
    } = {};

    if (title !== ticket.title) payload.title = title;
    if (finalDescription !== (ticket.description || '')) payload.description = finalDescription;

    const cfChanged = (ticket.custom_fields || []).some(
      (f) => (customFieldsState[String(f.id)] ?? '') !== (f.value ?? ''),
    );
    if (cfChanged) payload.custom_fields = customFieldsState;

    const currentServiceId = ticket.ticket_service?.id
      ? String(ticket.ticket_service.id)
      : '';
    if (ticketServiceId !== currentServiceId) {
      payload.ticket_service_id = ticketServiceId ? Number(ticketServiceId) : null;
    }

    if (Object.keys(payload).length === 0) {
      toast({ title: 'Нет изменений', description: 'Поля не были изменены' });
      onOpenChange(false);
      return;
    }

    const ok = await onSave(payload);
    if (ok) {
      toast({ title: 'Сохранено', description: 'Содержание заявки обновлено' });
      onOpenChange(false);
    } else {
      toast({
        title: 'Не удалось сохранить',
        description: 'Возможно, недостаточно прав или произошла ошибка',
        variant: 'destructive',
      });
    }
  };

  const customFieldsList = ticket.custom_fields || [];

  const formDataForRender = useMemo(
    () => ({
      title: '',
      description: '',
      category_id: '',
      priority_id: '',
      due_date: '',
      custom_fields: customFieldsState,
    }),
    [customFieldsState],
  );

  const setFormDataForRender = (
    data: Record<string, string | number | number[] | Record<string, string>>,
  ) => {
    const next = data.custom_fields as Record<string, string> | undefined;
    if (next) setCustomFieldsState(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактировать содержание заявки</DialogTitle>
          <DialogDescription>
            Заголовок, описание, поля формы, услуга. Изменения попадут в историю заявки.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="edit-title" className="flex items-center gap-2">
              <Icon name="Tag" size={14} className="text-muted-foreground" />
              Заголовок *
            </Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Краткая тема заявки"
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description" className="flex items-center gap-2">
              <Icon name="FileText" size={14} className="text-muted-foreground" />
              Описание
            </Label>
            <div className="relative">
              <Textarea
                ref={descRef}
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onPaste={handleDescPaste}
                placeholder="Опишите подробно. Можно вставить скриншот через Ctrl+V"
                rows={6}
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
                      onClick={() =>
                        setDescPastedImages((prev) => prev.filter((_, j) => j !== i))
                      }
                      className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-4 h-4 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Icon name="Layers" size={14} className="text-muted-foreground" />
              Услуга / категория
            </Label>
            <Select
              value={ticketServiceId || 'none'}
              onValueChange={(v) => setTicketServiceId(v === 'none' ? '' : v)}
              disabled={servicesLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Не выбрана" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Не выбрана</SelectItem>
                {ticketServices.map((ts) => (
                  <SelectItem key={ts.id} value={String(ts.id)}>
                    {ts.category_name ? `${ts.category_name} / ` : ''}
                    {ts.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Смена услуги может повлиять на набор полей формы.
            </p>
          </div>

          {customFieldsList.length > 0 && (
            <div className="space-y-3 border-t pt-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Icon name="ListChecks" size={14} className="text-muted-foreground" />
                Поля формы
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {customFieldsList.map((field) => {
                  const isWide = ['textarea', 'company_structure'].includes(field.field_type);
                  const cfForRender = {
                    id: field.id,
                    name: field.name,
                    field_type: field.field_type,
                    is_required: !!field.is_required,
                    options: field.options,
                    placeholder: field.placeholder,
                    hide_label: field.hide_label,
                  };
                  return (
                    <div
                      key={field.id}
                      className={`space-y-2 ${isWide ? 'md:col-span-2' : ''}`}
                    >
                      {!field.hide_label && (
                        <Label>
                          {field.name}
                          {field.is_required && (
                            <span className="text-destructive ml-1">*</span>
                          )}
                        </Label>
                      )}
                      {renderCustomField(cfForRender, formDataForRender, setFormDataForRender)}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <DialogFooter className="pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updating}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={updating} className="gap-2">
              {updating ? (
                <>
                  <Icon name="Loader2" size={16} className="animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Icon name="Save" size={16} />
                  Сохранить
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTicketContentDialog;
