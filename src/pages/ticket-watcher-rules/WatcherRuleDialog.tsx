import { Dispatch, SetStateAction } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  FormState,
  Reference,
  RuleTarget,
  WatcherRule,
  TARGET_TYPE_ICON,
  TARGET_TYPE_LABEL,
} from './types';

interface WatcherRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: WatcherRule | null;
  form: FormState;
  setForm: Dispatch<SetStateAction<FormState>>;
  reference: Reference | null;
  saving: boolean;
  newTargetType: RuleTarget['target_type'];
  setNewTargetType: Dispatch<SetStateAction<RuleTarget['target_type']>>;
  newTargetId: string;
  setNewTargetId: Dispatch<SetStateAction<string>>;
  onAddTarget: () => void;
  onRemoveTarget: (index: number) => void;
  onSave: () => void;
}

const WatcherRuleDialog = ({
  open,
  onOpenChange,
  editing,
  form,
  setForm,
  reference,
  saving,
  newTargetType,
  setNewTargetType,
  newTargetId,
  setNewTargetId,
  onAddTarget,
  onRemoveTarget,
  onSave,
}: WatcherRuleDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Редактирование правила' : 'Новое правило'}</DialogTitle>
          <DialogDescription>
            Условия из блока «Если» проверяются на заявке. Если все указанные совпадают —
            добавляются наблюдатели из блока «То».
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Название</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Например: VIP-заявки бухгалтерии"
            />
          </div>
          <div>
            <Label>Описание (необязательно)</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="font-medium">Активно</Label>
              <p className="text-xs text-muted-foreground">Отключённые правила не применяются</p>
            </div>
            <Switch
              checked={form.is_active}
              onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
            />
          </div>

          <div className="rounded-lg border p-3 space-y-2">
            <Label className="font-medium">Когда срабатывать</Label>
            <div className="flex items-center justify-between">
              <span className="text-sm">При создании заявки</span>
              <Switch
                checked={form.trigger_on_create}
                onCheckedChange={(v) => setForm((f) => ({ ...f, trigger_on_create: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">При изменении полей заявки</span>
              <Switch
                checked={form.trigger_on_update}
                onCheckedChange={(v) => setForm((f) => ({ ...f, trigger_on_update: v }))}
              />
            </div>
            <div className="flex items-start justify-between gap-3 pt-1 border-t border-border/40">
              <div className="flex-1">
                <span className="text-sm">При смене исполнителя</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Бывший исполнитель автоматически добавляется в наблюдатели.
                  Условия «Если» и таргеты «То» при этом триггере необязательны.
                </p>
              </div>
              <Switch
                checked={form.trigger_on_executor_change}
                onCheckedChange={(v) => setForm((f) => ({ ...f, trigger_on_executor_change: v }))}
              />
            </div>
          </div>

          <div className="rounded-lg border p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Icon name="GitBranch" size={16} />
              <Label className="font-medium">Если у заявки</Label>
              <span className="text-xs text-muted-foreground">
                (укажите 1+ условие, пустые игнорируются)
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Категория</Label>
                <Select
                  value={form.category_id || 'any'}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, category_id: v === 'any' ? '' : v }))
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Любая" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Любая</SelectItem>
                    {reference?.categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Отдел / департамент</Label>
                <Select
                  value={form.department_id || 'any'}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, department_id: v === 'any' ? '' : v }))
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Любой" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Любой</SelectItem>
                    {reference?.departments.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Приоритет</Label>
                <Select
                  value={form.priority_id || 'any'}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, priority_id: v === 'any' ? '' : v }))
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Любой" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Любой</SelectItem>
                    {reference?.priorities.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Группа исполнителей</Label>
                <Select
                  value={form.executor_group_id || 'any'}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, executor_group_id: v === 'any' ? '' : v }))
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Любая" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Любая</SelectItem>
                    {reference?.executor_groups.map((g) => (
                      <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Icon name="ArrowRight" size={16} />
              <Label className="font-medium">То добавить наблюдателей</Label>
            </div>

            {form.targets.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.targets.map((t, idx) => (
                  <Badge key={idx} variant="secondary" className="gap-1 pr-1">
                    <Icon name={TARGET_TYPE_ICON[t.target_type] as 'User'} size={12} />
                    <span className="text-xs">
                      {TARGET_TYPE_LABEL[t.target_type]}: {t.target_name || `#${t.target_id}`}
                    </span>
                    <button
                      type="button"
                      className="ml-1 rounded hover:bg-muted p-0.5"
                      onClick={() => onRemoveTarget(idx)}
                    >
                      <Icon name="X" size={10} />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr_auto] gap-2">
              <Select
                value={newTargetType}
                onValueChange={(v) => {
                  setNewTargetType(v as RuleTarget['target_type']);
                  setNewTargetId('');
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Пользователь</SelectItem>
                  <SelectItem value="group">Группа</SelectItem>
                  <SelectItem value="role">Роль</SelectItem>
                </SelectContent>
              </Select>

              <Select value={newTargetId} onValueChange={setNewTargetId}>
                <SelectTrigger><SelectValue placeholder="Выберите..." /></SelectTrigger>
                <SelectContent>
                  {(newTargetType === 'user' ? reference?.users
                    : newTargetType === 'group' ? reference?.executor_groups
                    : reference?.roles)?.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button type="button" variant="outline" onClick={onAddTarget} disabled={!newTargetId}>
                <Icon name="Plus" size={14} className="mr-1" />
                Добавить
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Отмена
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving && <Icon name="Loader2" size={14} className="mr-2 animate-spin" />}
            {editing ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WatcherRuleDialog;
