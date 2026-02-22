import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Department, Company, Position } from '@/types';

interface FormData {
  company_id: string;
  parent_id: string;
  name: string;
  code: string;
  description: string;
  position_ids: number[];
}

interface DepartmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingDepartment: Department | null;
  parentIdForNew: number | null;
  formData: FormData;
  onFormDataChange: (data: FormData) => void;
  companies: Company[];
  availableParents: Department[];
  positions: Position[];
  onSubmit: (e: React.FormEvent) => void;
}

const DepartmentFormDialog = ({
  open,
  onOpenChange,
  editingDepartment,
  parentIdForNew,
  formData,
  onFormDataChange,
  companies,
  availableParents,
  positions,
  onSubmit,
}: DepartmentFormDialogProps) => {
  const togglePosition = (positionId: number) => {
    onFormDataChange({
      ...formData,
      position_ids: formData.position_ids.includes(positionId)
        ? formData.position_ids.filter((id) => id !== positionId)
        : [...formData.position_ids, positionId],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingDepartment
              ? 'Редактирование подразделения'
              : parentIdForNew
              ? 'Новое дочернее подразделение'
              : 'Новое подразделение'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company_id">Компания *</Label>
            <Select
              value={formData.company_id}
              onValueChange={(value) => onFormDataChange({ ...formData, company_id: value, parent_id: '' })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите компанию" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id.toString()}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.company_id && (
            <div className="space-y-2">
              <Label htmlFor="parent_id">Родительское подразделение</Label>
              <Select
                value={formData.parent_id || 'root'}
                onValueChange={(value) =>
                  onFormDataChange({ ...formData, parent_id: value === 'root' ? '' : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Корневое подразделение" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Корневое подразделение</SelectItem>
                  {availableParents.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Название подразделения *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Код подразделения</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => onFormDataChange({ ...formData, code: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => onFormDataChange({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Должности в подразделении</Label>
            <div className="border rounded-md p-4 max-h-48 overflow-y-auto space-y-2">
              {positions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Должности не найдены</p>
              ) : (
                positions.map((position) => (
                  <div key={position.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`position-${position.id}`}
                      checked={formData.position_ids.includes(position.id)}
                      onCheckedChange={() => togglePosition(position.id)}
                    />
                    <label
                      htmlFor={`position-${position.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {position.name}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit">
              {editingDepartment ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DepartmentFormDialog;
