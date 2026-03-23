import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import Icon from '@/components/ui/icon';
import type { TicketStatus } from '@/hooks/useTicketStatuses';

const predefinedColors = [
  { name: 'Серый', value: '#6b7280' },
  { name: 'Синий', value: '#3b82f6' },
  { name: 'Зелёный', value: '#22c55e' },
  { name: 'Жёлтый', value: '#eab308' },
  { name: 'Оранжевый', value: '#f97316' },
  { name: 'Красный', value: '#ef4444' },
  { name: 'Фиолетовый', value: '#a855f7' },
  { name: 'Розовый', value: '#ec4899' },
];

const STATUS_TYPES = [
  { value: 'is_open', label: 'Открытый', desc: 'заявка открыта' },
  { value: 'is_approval', label: 'Согласование', desc: 'на согласовании' },
  { value: 'is_approved', label: 'Согласовано', desc: 'согласована всеми' },
  { value: 'is_approval_revoked', label: 'Отозвано', desc: 'согласование отозвано' },
  { value: 'is_waiting_response', label: 'Ожидание', desc: 'ожидает ответа исполнителя' },
  { value: 'is_awaiting_confirmation', label: 'Подтверждение', desc: 'ожидает подтверждения заказчика' },
  { value: 'is_closed', label: 'Закрытый', desc: 'заявка завершена' },
] as const;

type StatusTypeValue = typeof STATUS_TYPES[number]['value'];

interface StatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingStatus: TicketStatus | null;
  onSave: (
    formData: {
      name: string;
      color: string;
      is_closed: boolean;
      is_open: boolean;
      is_approval: boolean;
      is_approval_revoked: boolean;
      is_approved: boolean;
      is_waiting_response: boolean;
      is_awaiting_confirmation: boolean;
      count_for_distribution: boolean;
    },
    editingStatus: TicketStatus | null
  ) => Promise<boolean>;
  onReset: () => void;
}

const getActiveType = (formData: Record<string, boolean>): StatusTypeValue | '' => {
  for (const st of STATUS_TYPES) {
    if (formData[st.value]) return st.value;
  }
  return '';
};

const StatusDialog = ({
  open,
  onOpenChange,
  editingStatus,
  onSave,
  onReset,
}: StatusDialogProps) => {
  const defaultFormData = {
    name: '',
    color: '#3b82f6',
    is_closed: false,
    is_open: false,
    is_approval: false,
    is_approval_revoked: false,
    is_approved: false,
    is_waiting_response: false,
    is_awaiting_confirmation: false,
    count_for_distribution: false,
  };

  const [formData, setFormData] = useState(defaultFormData);

  useEffect(() => {
    if (editingStatus) {
      setFormData({
        name: editingStatus.name,
        color: editingStatus.color,
        is_closed: editingStatus.is_closed,
        is_open: editingStatus.is_open || false,
        is_approval: editingStatus.is_approval || false,
        is_approval_revoked: editingStatus.is_approval_revoked || false,
        is_approved: editingStatus.is_approved || false,
        is_waiting_response: editingStatus.is_waiting_response || false,
        is_awaiting_confirmation: editingStatus.is_awaiting_confirmation || false,
        count_for_distribution: editingStatus.count_for_distribution || false,
      });
    } else {
      setFormData(defaultFormData);
    }
  }, [editingStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onSave(formData, editingStatus);
    if (success) {
      onOpenChange(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setFormData(defaultFormData);
    onReset();
  };

  const handleDialogClose = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      resetForm();
    }
  };

  const handleTypeChange = (value: string) => {
    const resetFlags: Record<string, boolean> = {};
    for (const st of STATUS_TYPES) {
      resetFlags[st.value] = st.value === value;
    }
    setFormData((prev) => ({ ...prev, ...resetFlags }));
  };

  const activeType = getActiveType(formData as unknown as Record<string, boolean>);

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 gap-2 w-full sm:w-auto">
          <Icon name="Plus" size={18} />
          <span className="sm:inline">Добавить статус</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingStatus ? 'Редактировать статус' : 'Новый статус'}
          </DialogTitle>
          <DialogDescription>
            {editingStatus
              ? 'Измените данные статуса'
              : 'Добавьте новый статус заявки'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Название</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Название статуса"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Цвет</Label>
            <div className="grid grid-cols-4 gap-2">
              {predefinedColors.map((colorOption) => (
                <button
                  key={colorOption.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: colorOption.value })}
                  className={`h-12 rounded-lg border-2 transition-all hover:scale-105 ${
                    formData.color === colorOption.value
                      ? 'border-foreground shadow-lg'
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: colorOption.value }}
                  title={colorOption.name}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Label htmlFor="custom-color" className="text-sm">Свой цвет:</Label>
              <input
                id="custom-color"
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="h-10 w-20 rounded cursor-pointer"
              />
              <span className="text-sm text-muted-foreground">{formData.color}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Тип статуса</Label>
            <RadioGroup value={activeType} onValueChange={handleTypeChange} className="grid grid-cols-2 gap-2">
              {STATUS_TYPES.map((st) => (
                <label
                  key={st.value}
                  htmlFor={st.value}
                  className={`flex items-start gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                    activeType === st.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <RadioGroupItem value={st.value} id={st.value} className="mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium leading-tight">{st.label}</div>
                    <div className="text-xs text-muted-foreground leading-tight mt-0.5">{st.desc}</div>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="rounded-lg border border-border p-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="count_for_distribution"
                checked={formData.count_for_distribution}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, count_for_distribution: checked as boolean })
                }
              />
              <Label
                htmlFor="count_for_distribution"
                className="text-sm font-medium leading-none cursor-pointer"
              >
                Учитывать при распределении заявок
              </Label>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 ml-6">
              Заявки в этом статусе учитываются при балансировке нагрузки между исполнителями
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1">
              {editingStatus ? 'Сохранить' : 'Создать'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogClose(false)}
            >
              Отмена
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StatusDialog;
