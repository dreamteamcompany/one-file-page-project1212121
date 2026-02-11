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
    },
    editingStatus: TicketStatus | null
  ) => Promise<boolean>;
  onReset: () => void;
}

const StatusDialog = ({
  open,
  onOpenChange,
  editingStatus,
  onSave,
  onReset,
}: StatusDialogProps) => {
  const [formData, setFormData] = useState({
    name: '',
    color: '#3b82f6',
    is_closed: false,
    is_open: false,
    is_approval: false,
    is_approval_revoked: false,
    is_approved: false,
    is_waiting_response: false,
  });

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
        is_waiting_response: editingStatus.is_waiting_response || false
      });
    } else {
      setFormData({
        name: '',
        color: '#3b82f6',
        is_closed: false,
        is_open: false,
        is_approval: false,
        is_approval_revoked: false,
        is_approved: false,
        is_waiting_response: false,
      });
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
    setFormData({
      name: '',
      color: '#3b82f6',
      is_closed: false,
      is_open: false,
      is_approval: false,
      is_approval_revoked: false,
      is_approved: false,
      is_waiting_response: false,
    });
    onReset();
  };

  const handleDialogClose = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 gap-2 w-full sm:w-auto">
          <Icon name="Plus" size={18} />
          <span className="sm:inline">Добавить статус</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
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
        <form onSubmit={handleSubmit} className="space-y-4">
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
                      ? 'border-white shadow-lg' 
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
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_open"
                checked={formData.is_open}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, is_open: checked as boolean, is_closed: checked ? false : formData.is_closed, is_approval: checked ? false : formData.is_approval, is_approval_revoked: checked ? false : formData.is_approval_revoked, is_approved: checked ? false : formData.is_approved, is_waiting_response: checked ? false : formData.is_waiting_response })
                }
              />
              <Label
                htmlFor="is_open"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Открытый статус (заявка открыта)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_approval"
                checked={formData.is_approval}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, is_approval: checked as boolean, is_closed: checked ? false : formData.is_closed, is_open: checked ? false : formData.is_open, is_approval_revoked: checked ? false : formData.is_approval_revoked, is_approved: checked ? false : formData.is_approved, is_waiting_response: checked ? false : formData.is_waiting_response })
                }
              />
              <Label
                htmlFor="is_approval"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Согласующий статус (заявка на согласовании)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_approved"
                checked={formData.is_approved}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, is_approved: checked as boolean, is_closed: checked ? false : formData.is_closed, is_open: checked ? false : formData.is_open, is_approval: checked ? false : formData.is_approval, is_approval_revoked: checked ? false : formData.is_approval_revoked, is_waiting_response: checked ? false : formData.is_waiting_response })
                }
              />
              <Label
                htmlFor="is_approved"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Согласовано (заявка согласована всеми согласующими)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_approval_revoked"
                checked={formData.is_approval_revoked}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, is_approval_revoked: checked as boolean, is_closed: checked ? false : formData.is_closed, is_open: checked ? false : formData.is_open, is_approval: checked ? false : formData.is_approval, is_approved: checked ? false : formData.is_approved, is_waiting_response: checked ? false : formData.is_waiting_response })
                }
              />
              <Label
                htmlFor="is_approval_revoked"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Согласование отозвано (заявка была на согласовании, но отозвана)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_waiting_response"
                checked={formData.is_waiting_response}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, is_waiting_response: checked as boolean, is_closed: checked ? false : formData.is_closed, is_open: checked ? false : formData.is_open, is_approval: checked ? false : formData.is_approval, is_approval_revoked: checked ? false : formData.is_approval_revoked, is_approved: checked ? false : formData.is_approved })
                }
              />
              <Label
                htmlFor="is_waiting_response"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Ожидание ответа (заявка ожидает ответа от исполнителя)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_closed"
                checked={formData.is_closed}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, is_closed: checked as boolean, is_open: checked ? false : formData.is_open, is_approval: checked ? false : formData.is_approval, is_approval_revoked: checked ? false : formData.is_approval_revoked, is_approved: checked ? false : formData.is_approved, is_waiting_response: checked ? false : formData.is_waiting_response })
                }
              />
              <Label
                htmlFor="is_closed"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Закрытый статус (заявка завершена)
              </Label>
            </div>
          </div>
          <div className="flex gap-2 pt-4">
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
