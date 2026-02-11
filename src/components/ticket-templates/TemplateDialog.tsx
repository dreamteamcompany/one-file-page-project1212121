import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import {
  TicketTemplate,
  Service,
  TicketService,
  Priority,
  Category,
} from '@/hooks/useTicketTemplates';

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTemplate: TicketTemplate | null;
  services: Service[];
  ticketServices: TicketService[];
  priorities: Priority[];
  categories: Category[];
  onSubmit: (
    formData: {
      name: string;
      description: string;
      service_id: number;
      ticket_service_ids: number[];
      sla_hours: number;
      priority_id?: number;
      category_id?: number;
    }
  ) => void;
}

const TemplateDialog = ({
  open,
  onOpenChange,
  editingTemplate,
  services,
  ticketServices,
  priorities,
  categories,
  onSubmit,
}: TemplateDialogProps) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    service_id: 0,
    ticket_service_ids: [] as number[],
    sla_hours: 24,
    priority_id: 0,
    category_id: 0,
  });

  useEffect(() => {
    if (editingTemplate) {
      setFormData({
        name: editingTemplate.name,
        description: editingTemplate.description || '',
        service_id: editingTemplate.service_id,
        ticket_service_ids: editingTemplate.ticket_service_ids,
        sla_hours: editingTemplate.sla_hours,
        priority_id: editingTemplate.priority_id || 0,
        category_id: editingTemplate.category_id || 0,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        service_id: 0,
        ticket_service_ids: [],
        sla_hours: 24,
        priority_id: 0,
        category_id: 0,
      });
    }
  }, [editingTemplate, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.service_id) {
      alert('Заполните обязательные поля');
      return;
    }
    onSubmit({
      ...formData,
      priority_id: formData.priority_id || undefined,
      category_id: formData.category_id || undefined,
    });
    onOpenChange(false);
  };

  const toggleTicketService = (serviceId: number) => {
    setFormData((prev) => ({
      ...prev,
      ticket_service_ids: prev.ticket_service_ids.includes(serviceId)
        ? prev.ticket_service_ids.filter((id) => id !== serviceId)
        : [...prev.ticket_service_ids, serviceId],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {editingTemplate ? 'Редактировать шаблон' : 'Создать шаблон заявки'}
          </DialogTitle>
          <DialogDescription>
            Шаблон объединяет услугу, сервисы и SLA для быстрого создания заявок
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1 overflow-hidden">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Название шаблона *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Название шаблона"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sla_hours">SLA (часов) *</Label>
              <Input
                id="sla_hours"
                type="number"
                min="1"
                value={formData.sla_hours}
                onChange={(e) =>
                  setFormData({ ...formData, sla_hours: parseInt(e.target.value) || 24 })
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Краткое описание шаблона"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Категория</Label>
              <Select
                value={formData.category_id?.toString() || '0'}
                onValueChange={(value) =>
                  setFormData({ ...formData, category_id: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Не выбрано</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Услуга *</Label>
              <Select
                value={formData.service_id?.toString() || '0'}
                onValueChange={(value) =>
                  setFormData({ ...formData, service_id: parseInt(value) })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите услугу" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0" disabled>
                    Выберите услугу
                  </SelectItem>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id.toString()}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Приоритет</Label>
              <Select
                value={formData.priority_id?.toString() || '0'}
                onValueChange={(value) =>
                  setFormData({ ...formData, priority_id: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите приоритет" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Не выбрано</SelectItem>
                  {priorities.map((priority) => (
                    <SelectItem key={priority.id} value={priority.id.toString()}>
                      {priority.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
            <Label>
              Сервисы услуги ({formData.ticket_service_ids.length})
            </Label>

            <ScrollArea className="flex-1 border rounded-md p-3">
              <div className="space-y-2">
                {ticketServices.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Нет доступных сервисов
                  </p>
                ) : (
                  ticketServices.map((service) => (
                    <label
                      key={service.id}
                      className="flex items-start gap-3 p-2 hover:bg-muted rounded cursor-pointer"
                    >
                      <Checkbox
                        checked={formData.ticket_service_ids.includes(service.id)}
                        onCheckedChange={() => toggleTicketService(service.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{service.name}</span>
                        </div>
                        {service.description && (
                          <p className="text-xs text-muted-foreground">
                            {service.description}
                          </p>
                        )}
                      </div>
                    </label>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              {editingTemplate ? 'Сохранить' : 'Создать'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateDialog;
