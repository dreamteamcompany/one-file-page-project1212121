import { useState } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
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
}: TicketFormStep1Props) => {
  const [criticalConfirmOpen, setCriticalConfirmOpen] = useState(false);
  const [pendingPriorityId, setPendingPriorityId] = useState<string | null>(null);

  const ticketTitle = selectedTicketService?.ticket_title || '';

  const canProceed = formData.description.trim().length > 0;

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
        {ticketTitle && !isFirstStep && (
          <div className="p-4 bg-accent/30 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="Tag" size={16} className="text-muted-foreground" />
              <Label className="text-sm font-medium">Название заявки</Label>
            </div>
            <p className="text-base font-semibold">{ticketTitle}</p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="description">
            Описание проблемы или запроса *
          </Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Опишите подробно вашу проблему. Например: &laquo;Не могу списать процедуры в базе Stoma1C_Krasnodar&raquo;"
            rows={5}
            autoFocus
          />
          {isFirstStep && (
            <p className="text-xs text-muted-foreground">
              ИИ автоматически определит категорию заявки по вашему описанию
            </p>
          )}
        </div>

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
              disabled={!canProceed}
            >
              <Icon name="Sparkles" size={18} />
              Далее
            </Button>
          ) : hasCustomFields && onNext ? (
            <Button
              type="button"
              className="flex-1 gap-2"
              onClick={onNext}
            >
              Далее
              <Icon name="ArrowRight" size={18} />
            </Button>
          ) : (
            <Button
              type="submit"
              className="flex-1 gap-2"
            >
              <Icon name="Send" size={18} />
              Создать заявку
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
              Критичный приоритет назначается только в особых случаях: полная остановка работы, угроза безопасности данных, блокировка ключевых бизнес-процессов. Вы уверены, что ситуация требует именно критичного приоритета?
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