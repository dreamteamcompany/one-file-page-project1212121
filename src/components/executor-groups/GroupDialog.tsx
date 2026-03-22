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
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import type { ExecutorGroup, AutoAssignType } from '@/hooks/useExecutorGroups';

interface GroupFormData {
  name: string;
  description: string;
  isActive: boolean;
  autoAssignType: AutoAssignType;
  assignGroupOnly: boolean;
}

interface GroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingGroup: ExecutorGroup | null;
  onSave: (data: GroupFormData) => Promise<boolean>;
  onReset: () => void;
}

const AUTO_ASSIGN_OPTIONS: { value: AutoAssignType; label: string; description: string }[] = [
  { value: 'none', label: 'Не распределять', description: 'Заявки не назначаются автоматически' },
  { value: 'all', label: 'Равномерно по всем', description: 'Распределять равномерно по всем исполнителям' },
  { value: 'working', label: 'Равномерно по работающим', description: 'Распределять только по исполнителям на смене' },
];

const GroupDialog = ({ open, onOpenChange, editingGroup, onSave, onReset }: GroupDialogProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [autoAssignType, setAutoAssignType] = useState<AutoAssignType>('none');
  const [assignGroupOnly, setAssignGroupOnly] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingGroup) {
      setName(editingGroup.name);
      setDescription(editingGroup.description || '');
      setIsActive(editingGroup.is_active);
      setAutoAssignType(editingGroup.auto_assign_type || (editingGroup.auto_assign ? 'all' : 'none'));
      setAssignGroupOnly(editingGroup.assign_group_only ?? false);
    } else {
      setName('');
      setDescription('');
      setIsActive(true);
      setAutoAssignType('none');
      setAssignGroupOnly(false);
    }
  }, [editingGroup, open]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const success = await onSave({
      name: name.trim(),
      description: description.trim(),
      isActive,
      autoAssignType,
      assignGroupOnly,
    });
    setSaving(false);
    if (success) {
      onOpenChange(false);
      onReset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) onReset(); }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Icon name="Plus" size={16} />
          Новая группа
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingGroup ? 'Редактирование группы' : 'Новая группа исполнителей'}</DialogTitle>
          <DialogDescription>
            {editingGroup ? 'Измените данные группы' : 'Создайте группу и добавьте в неё исполнителей'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label htmlFor="group-name">Название *</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: IT-поддержка"
            />
          </div>
          <div>
            <Label htmlFor="group-desc">Описание</Label>
            <Textarea
              id="group-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Чем занимается группа"
              rows={3}
            />
          </div>

          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label>Тип автораспределения</Label>
              <Select value={autoAssignType} onValueChange={(v) => setAutoAssignType(v as AutoAssignType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUTO_ASSIGN_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex flex-col">
                        <span>{opt.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {AUTO_ASSIGN_OPTIONS.find(o => o.value === autoAssignType)?.description}
              </p>
            </div>

            {autoAssignType !== 'none' && (
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <Label htmlFor="assign-group-only" className="cursor-pointer">Назначать только группу</Label>
                  <p className="text-xs text-muted-foreground">
                    Заявка назначается на группу без выбора конкретного исполнителя
                  </p>
                </div>
                <Switch
                  id="assign-group-only"
                  checked={assignGroupOnly}
                  onCheckedChange={setAssignGroupOnly}
                />
              </div>
            )}
          </div>

          {editingGroup && (
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="group-active" className="cursor-pointer">Активна</Label>
              <Switch
                id="group-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          )}

          <Button onClick={handleSubmit} disabled={!name.trim() || saving} className="w-full">
            {saving ? <Icon name="Loader2" size={16} className="mr-2 animate-spin" /> : null}
            {editingGroup ? 'Сохранить' : 'Создать'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GroupDialog;
