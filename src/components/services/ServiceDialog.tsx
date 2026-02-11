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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import type { Service, User, CustomerDepartment, Category } from '@/hooks/useServices';

interface ServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingService: Service | null;
  users: User[];
  departments: CustomerDepartment[];
  categories: Category[];
  onSave: (
    formData: {
      name: string;
      description: string;
      final_approver_id: string;
      customer_department_id: string;
      category_id: string;
    },
    editingService: Service | null
  ) => Promise<boolean>;
  onReset: () => void;
}

const ServiceDialog = ({
  open,
  onOpenChange,
  editingService,
  users,
  departments,
  categories,
  onSave,
  onReset,
}: ServiceDialogProps) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    final_approver_id: '',
    customer_department_id: '',
    category_id: '',
  });

  useEffect(() => {
    if (editingService) {
      setFormData({
        name: editingService.name,
        description: editingService.description || '',
        final_approver_id: editingService.final_approver_id.toString(),
        customer_department_id: editingService.customer_department_id ? editingService.customer_department_id.toString() : '',
        category_id: editingService.category_id ? editingService.category_id.toString() : '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        final_approver_id: '',
        customer_department_id: '',
        category_id: '',
      });
    }
  }, [editingService]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onSave(formData, editingService);
    if (success) {
      onOpenChange(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      final_approver_id: '',
      customer_department_id: '',
      category_id: '',
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
        <Button>
          <Icon name="Plus" size={18} className="mr-2" />
          Создать сервис
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editingService ? 'Редактировать сервис' : 'Создать сервис'}
          </DialogTitle>
          <DialogDescription>
            Укажите название сервиса и согласующих лиц
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Название *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Например: AWS Cloud Services"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Краткое описание сервиса"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="category">Категория сервиса</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) =>
                setFormData({ ...formData, category_id: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите категорию" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    <div className="flex items-center gap-2">
                      <Icon name={cat.icon} size={16} />
                      {cat.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="department">Отдел-заказчик</Label>
            <Select
              value={formData.customer_department_id}
              onValueChange={(value) =>
                setFormData({ ...formData, customer_department_id: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите отдел" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id.toString()}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="final">Согласующее лицо (CEO) *</Label>
            <Select
              value={formData.final_approver_id}
              onValueChange={(value) =>
                setFormData({ ...formData, final_approver_id: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите пользователя" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>
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

export default ServiceDialog;
