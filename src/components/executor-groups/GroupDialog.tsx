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
import Icon from '@/components/ui/icon';
import type { ExecutorGroup } from '@/hooks/useExecutorGroups';

interface GroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingGroup: ExecutorGroup | null;
  onSave: (name: string, description: string, isActive: boolean) => Promise<boolean>;
  onReset: () => void;
}

const GroupDialog = ({ open, onOpenChange, editingGroup, onSave, onReset }: GroupDialogProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingGroup) {
      setName(editingGroup.name);
      setDescription(editingGroup.description || '');
      setIsActive(editingGroup.is_active);
    } else {
      setName('');
      setDescription('');
      setIsActive(true);
    }
  }, [editingGroup, open]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const success = await onSave(name.trim(), description.trim(), isActive);
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
          {editingGroup && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="group-active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-input"
              />
              <Label htmlFor="group-active">Активна</Label>
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
