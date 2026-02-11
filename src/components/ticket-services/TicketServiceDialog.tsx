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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import type { TicketService, Service, Category } from '@/hooks/useTicketServices';

interface TicketServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingService: TicketService | null;
  services: Service[];
  categories: Category[];
  onSave: (
    formData: {
      name: string;
      description: string;
      ticket_title: string;
      category_id: string;
    },
    selectedServiceIds: number[],
    editingService: TicketService | null
  ) => Promise<boolean>;
  onReset: () => void;
}

const TicketServiceDialog = ({
  open,
  onOpenChange,
  editingService,
  services,
  categories,
  onSave,
  onReset,
}: TicketServiceDialogProps) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    ticket_title: '',
    category_id: '',
  });
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);

  useEffect(() => {
    if (editingService) {
      console.log('Editing ticket service:', editingService);
      console.log('Service IDs from ticket service:', editingService.service_ids);
      setFormData({
        name: editingService.name,
        description: editingService.description || '',
        ticket_title: editingService.ticket_title || '',
        category_id: editingService.category_id ? editingService.category_id.toString() : '',
      });
      setSelectedServiceIds(editingService.service_ids || []);
    } else {
      setFormData({
        name: '',
        description: '',
        ticket_title: '',
        category_id: '',
      });
      setSelectedServiceIds([]);
    }
  }, [editingService]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onSave(formData, selectedServiceIds, editingService);
    if (success) {
      onOpenChange(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      ticket_title: '',
      category_id: '',
    });
    setSelectedServiceIds([]);
    onReset();
  };

  const handleDialogClose = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      resetForm();
    }
  };

  const toggleService = (serviceId: number) => {
    setSelectedServiceIds(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const filteredServices = services;

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogTrigger asChild>
        <Button>
          <Icon name="Plus" className="mr-2 h-4 w-4" />
          Добавить услугу заявки
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingService ? 'Редактировать услугу заявки' : 'Создать услугу заявки'}
          </DialogTitle>
          <DialogDescription>
            Услуга заявки — это набор услуг (работ), которые будут добавлены к заявке
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Название услуги заявки *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Например: Полное обслуживание техники"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Краткое описание услуги заявки"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket_title">Заголовок заявки</Label>
            <Input
              id="ticket_title"
              value={formData.ticket_title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, ticket_title: e.target.value }))
              }
              placeholder="Например: Заявка на обслуживание"
            />
            <p className="text-xs text-muted-foreground">
              Этот заголовок будет использоваться при создании заявки с этой услугой
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Категория заявки</Label>
            <Select
              value={formData.category_id || 'none'}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, category_id: value === 'none' ? '' : value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите категорию" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Без категории</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    <div className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Категория, которая будет автоматически установлена при создании заявки
            </p>
          </div>

          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-base">Включенные услуги</Label>
              <span className="text-sm text-muted-foreground">
                Выбрано: {selectedServiceIds.length}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Выберите услуги (работы), которые будут добавлены к заявке при выборе этой услуги заявки
            </p>

            {filteredServices.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Нет доступных услуг
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-md p-3">
                {filteredServices.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-start space-x-3 p-2 rounded-lg hover:bg-accent transition-colors"
                  >
                    <Checkbox
                      id={`service-${service.id}`}
                      checked={selectedServiceIds.includes(service.id)}
                      onCheckedChange={() => toggleService(service.id)}
                    />
                    <label
                      htmlFor={`service-${service.id}`}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="font-medium text-sm">{service.name}</div>
                      {service.description && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {service.description}
                        </div>
                      )}
                      {service.category_name && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Категория: {service.category_name}
                        </div>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogClose(false)}
            >
              Отмена
            </Button>
            <Button type="submit">
              {editingService ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TicketServiceDialog;