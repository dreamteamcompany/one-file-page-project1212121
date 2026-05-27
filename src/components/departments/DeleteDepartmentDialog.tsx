import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { Department } from '@/types';

interface DeleteDepartmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department: Department | null;
  hasChildren: boolean;
  onConfirm: (mode: 'cascade' | 'reparent') => Promise<void> | void;
}

const DeleteDepartmentDialog = ({
  open,
  onOpenChange,
  department,
  hasChildren,
  onConfirm,
}: DeleteDepartmentDialogProps) => {
  const [mode, setMode] = useState<'cascade' | 'reparent'>('reparent');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setMode(hasChildren ? 'reparent' : 'cascade');
      setSubmitting(false);
    }
  }, [open, hasChildren]);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm(mode);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="Trash2" className="h-5 w-5 text-destructive" />
            Удалить подразделение
          </DialogTitle>
          <DialogDescription>
            {department?.name
              ? <>Подразделение <span className="font-semibold">«{department.name}»</span> будет удалено.</>
              : 'Подразделение будет удалено.'}
          </DialogDescription>
        </DialogHeader>

        {hasChildren ? (
          <RadioGroup value={mode} onValueChange={(v) => setMode(v as 'cascade' | 'reparent')} className="space-y-3 pt-2">
            <div className="flex items-start gap-3 p-3 rounded-md border border-border hover:bg-muted/40">
              <RadioGroupItem value="reparent" id="mode-reparent" className="mt-1" />
              <Label htmlFor="mode-reparent" className="flex-1 cursor-pointer font-normal">
                <div className="font-medium">Перепривязать детей к родителю</div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Удаляется только сам отдел. Все вложенные подразделения перейдут на уровень выше.
                </p>
              </Label>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-md border border-border hover:bg-muted/40">
              <RadioGroupItem value="cascade" id="mode-cascade" className="mt-1" />
              <Label htmlFor="mode-cascade" className="flex-1 cursor-pointer font-normal">
                <div className="font-medium text-destructive">Удалить вместе с дочерними</div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Будут безвозвратно удалены и сам отдел, и все вложенные подразделения.
                </p>
              </Label>
            </div>
          </RadioGroup>
        ) : (
          <p className="text-sm text-muted-foreground pt-1">
            У подразделения нет дочерних. Оно будет удалено безвозвратно.
          </p>
        )}

        <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 text-amber-900 dark:text-amber-300 text-sm">
          <Icon name="AlertTriangle" className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Если в подразделении есть активные сотрудники, удаление будет заблокировано.
            Сначала перенесите их в другой отдел.
          </span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Отмена
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={submitting}>
            {submitting ? 'Удаление...' : 'Удалить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteDepartmentDialog;
