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
  const ticketTitle = selectedTicketService?.ticket_title || '';

  const canProceed = formData.description.trim().length > 0;

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
            onValueChange={(value) =>
              setFormData({ ...formData, priority_id: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Выберите приоритет" />
            </SelectTrigger>
            <SelectContent>
              {priorities.map((priority) => (
                <SelectItem key={priority.id} value={priority.id.toString()}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: priority.color }}
                    />
                    {priority.name}
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
    </form>
  );
};

export default TicketFormStep1;