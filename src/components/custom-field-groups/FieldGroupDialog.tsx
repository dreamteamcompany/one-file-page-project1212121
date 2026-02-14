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
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { Field, FieldGroup } from '@/hooks/useCustomFieldGroups';

interface FieldGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingGroup: FieldGroup | null;
  availableFields: Field[];
  getFieldTypeLabel: (type: string) => string;
  getFieldTypeIcon: (type: string) => string;
  onSubmit: (formData: { name: string; description: string; field_ids: number[] }) => void;
}

const FieldGroupDialog = ({
  open,
  onOpenChange,
  editingGroup,
  availableFields,
  getFieldTypeLabel,
  getFieldTypeIcon,
  onSubmit,
}: FieldGroupDialogProps) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    field_ids: [] as number[],
  });
  const [fieldSearchQuery, setFieldSearchQuery] = useState('');

  useEffect(() => {
    if (editingGroup) {
      setFormData({
        name: editingGroup.name,
        description: editingGroup.description || '',
        field_ids: editingGroup.fields ? editingGroup.fields.map(f => f.id) : [],
      });
    } else {
      setFormData({ name: '', description: '', field_ids: [] });
    }
    setFieldSearchQuery('');
  }, [editingGroup, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onOpenChange(false);
  };

  const toggleField = (fieldId: number) => {
    setFormData(prev => ({
      ...prev,
      field_ids: prev.field_ids.includes(fieldId)
        ? prev.field_ids.filter(id => id !== fieldId)
        : [...prev.field_ids, fieldId]
    }));
  };

  const filteredFieldsForSelection = availableFields.filter(field =>
    field.name.toLowerCase().includes(fieldSearchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] w-[calc(100%-2rem)] sm:w-full overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {editingGroup ? 'Редактировать группу полей' : 'Создать группу полей'}
          </DialogTitle>
          <DialogDescription>
            {editingGroup 
              ? 'Измените название, описание и состав полей группы'
              : 'Создайте новую группу полей для организации данных'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1 overflow-hidden">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Название *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Введите название группы"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Краткое описание группы"
              />
            </div>
          </div>

          <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
            <Label>Поля группы ({formData.field_ids.length})</Label>
            
            <Input
              placeholder="Поиск полей..."
              value={fieldSearchQuery}
              onChange={(e) => setFieldSearchQuery(e.target.value)}
              className="mb-2"
            />

            <ScrollArea className="flex-1 border rounded-md p-3">
              <div className="space-y-2">
                {filteredFieldsForSelection.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Нет доступных полей
                  </p>
                ) : (
                  filteredFieldsForSelection.map((field) => (
                    <label
                      key={field.id}
                      className="flex items-start gap-3 p-2 hover:bg-muted rounded cursor-pointer"
                    >
                      <Checkbox
                        checked={formData.field_ids.includes(field.id)}
                        onCheckedChange={() => toggleField(field.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon 
                            name={getFieldTypeIcon(field.field_type)} 
                            size={14} 
                            className="text-muted-foreground flex-shrink-0"
                          />
                          <span className="font-medium text-sm">{field.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {getFieldTypeLabel(field.field_type)}
                          </Badge>
                        </div>
                        {field.description && (
                          <p className="text-xs text-muted-foreground">{field.description}</p>
                        )}
                      </div>
                    </label>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Отмена
            </Button>
            <Button type="submit" className="w-full sm:flex-1">
              {editingGroup ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FieldGroupDialog;