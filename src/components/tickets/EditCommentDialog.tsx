import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import Icon from '@/components/ui/icon';
import { ru } from 'date-fns/locale';

interface EditCommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialText: string;
  initialCreatedAt: string;
  onSave: (data: { comment?: string; created_at?: string }) => Promise<boolean>;
}

const pad = (n: number) => n.toString().padStart(2, '0');

const formatDateLabel = (d: Date) =>
  `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;

const EditCommentDialog = ({
  open,
  onOpenChange,
  initialText,
  initialCreatedAt,
  onSave,
}: EditCommentDialogProps) => {
  const initialDate = useMemo(
    () => (initialCreatedAt ? new Date(initialCreatedAt) : new Date()),
    [initialCreatedAt],
  );

  const [text, setText] = useState(initialText);
  const [date, setDate] = useState<Date>(initialDate);
  const [time, setTime] = useState(
    `${pad(initialDate.getHours())}:${pad(initialDate.getMinutes())}`,
  );
  const [saving, setSaving] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setText(initialText);
      const d = initialCreatedAt ? new Date(initialCreatedAt) : new Date();
      setDate(d);
      setTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
    }
  }, [open, initialText, initialCreatedAt]);

  const handleSave = async () => {
    const payload: { comment?: string; created_at?: string } = {};

    if (text !== initialText) {
      payload.comment = text;
    }

    const [hh, mm] = time.split(':').map((s) => parseInt(s, 10) || 0);
    const combined = new Date(date);
    combined.setHours(hh, mm, 0, 0);

    const initMs = initialDate.getTime();
    if (combined.getTime() !== initMs) {
      payload.created_at = combined.toISOString();
    }

    if (Object.keys(payload).length === 0) {
      onOpenChange(false);
      return;
    }

    setSaving(true);
    const ok = await onSave(payload);
    setSaving(false);
    if (ok) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Редактирование комментария</DialogTitle>
          <DialogDescription>
            Доступно только администратору. Изменения будут видны всем участникам.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-comment-text">Текст комментария</Label>
            <Textarea
              id="edit-comment-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[140px] resize-none"
              disabled={saving}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Дата</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start font-normal"
                    disabled={saving}
                  >
                    <Icon name="Calendar" size={16} className="mr-2" />
                    {formatDateLabel(date)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => {
                      if (d) {
                        setDate(d);
                        setCalendarOpen(false);
                      }
                    }}
                    locale={ru}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-comment-time">Время</Label>
              <Input
                id="edit-comment-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Icon name="Loader2" size={16} className="mr-2 animate-spin" />
                Сохранение...
              </>
            ) : (
              'Сохранить'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditCommentDialog;
