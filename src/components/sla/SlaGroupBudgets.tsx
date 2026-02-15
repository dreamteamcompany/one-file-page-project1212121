import { useEffect, useState } from 'react';
import { apiFetch, getApiUrl } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import { Switch } from '@/components/ui/switch';

interface ExecutorGroup {
  id: number;
  name: string;
}

export interface GroupBudgetItem {
  executor_group_id: number;
  resolution_minutes: number | null;
  response_minutes: number | null;
  sort_order: number;
}

interface Props {
  slaId?: number;
  budgets: GroupBudgetItem[];
  onBudgetsChange: (budgets: GroupBudgetItem[]) => void;
}

const BudgetTimeInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (minutes: number | null) => void;
}) => {
  const hours = value ? Math.floor(value / 60) : 0;
  const minutes = value ? value % 60 : 0;

  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex gap-1 items-center">
        <Input
          type="number"
          min="0"
          className="w-16 h-8 text-xs"
          placeholder="ч"
          value={hours || ''}
          onChange={(e) => {
            const h = parseInt(e.target.value) || 0;
            onChange(h * 60 + minutes);
          }}
        />
        <span className="text-xs text-muted-foreground">ч</span>
        <Input
          type="number"
          min="0"
          max="59"
          className="w-16 h-8 text-xs"
          placeholder="мин"
          value={minutes || ''}
          onChange={(e) => {
            const m = parseInt(e.target.value) || 0;
            onChange(hours * 60 + m);
          }}
        />
        <span className="text-xs text-muted-foreground">мин</span>
      </div>
    </div>
  );
};

const SlaGroupBudgets = ({ slaId, budgets, onBudgetsChange }: Props) => {
  const [groups, setGroups] = useState<ExecutorGroup[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (slaId) {
      loadBudgets(slaId);
    } else {
      setEnabled(false);
      onBudgetsChange([]);
    }
  }, [slaId]);

  const loadGroups = async () => {
    try {
      const res = await apiFetch(
        `${getApiUrl('executor-groups')}?endpoint=executor-groups`
      );
      const data = await res.json();
      setGroups(Array.isArray(data) ? data : data.groups || []);
    } catch {
      setGroups([]);
    }
  };

  const loadBudgets = async (id: number) => {
    setLoading(true);
    try {
      const res = await apiFetch(
        `${getApiUrl('sla-group-budgets')}?endpoint=sla-group-budgets&sla_id=${id}`
      );
      const data = await res.json();
      const items = Array.isArray(data) ? data : [];
      if (items.length > 0) {
        setEnabled(true);
        onBudgetsChange(
          items.map((b: Record<string, number>) => ({
            executor_group_id: b.executor_group_id,
            resolution_minutes: b.resolution_minutes,
            response_minutes: b.response_minutes,
            sort_order: b.sort_order || 0,
          }))
        );
      } else {
        setEnabled(false);
        onBudgetsChange([]);
      }
    } catch {
      setEnabled(false);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    if (!checked) {
      onBudgetsChange([]);
    }
  };

  const addBudget = () => {
    const usedIds = budgets.map((b) => b.executor_group_id);
    const available = groups.filter((g) => !usedIds.includes(g.id));
    if (available.length === 0) return;

    onBudgetsChange([
      ...budgets,
      {
        executor_group_id: available[0].id,
        resolution_minutes: 120,
        response_minutes: null,
        sort_order: budgets.length,
      },
    ]);
  };

  const removeBudget = (index: number) => {
    onBudgetsChange(budgets.filter((_, i) => i !== index));
  };

  const updateBudget = (index: number, updates: Partial<GroupBudgetItem>) => {
    onBudgetsChange(
      budgets.map((b, i) => (i === index ? { ...b, ...updates } : b))
    );
  };

  const usedGroupIds = budgets.map((b) => b.executor_group_id);
  const getGroupName = (id: number) =>
    groups.find((g) => g.id === id)?.name || `Группа #${id}`;

  if (loading) {
    return (
      <div className="border-t border-white/10 pt-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
          Загрузка бюджетов групп...
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-white/10 pt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Icon name="Users" size={18} className="text-blue-500" />
          Бюджеты групп
        </h3>
        <div className="flex items-center gap-2">
          <Label htmlFor="budgets-toggle" className="text-xs text-muted-foreground">
            {enabled ? 'Включено' : 'Выключено'}
          </Label>
          <Switch
            id="budgets-toggle"
            checked={enabled}
            onCheckedChange={handleToggle}
          />
        </div>
      </div>

      {enabled && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Распределите общее время решения между группами исполнителей.
            Это опциональная настройка — каждая группа получит свой таймер.
          </p>

          {budgets.map((budget, index) => (
            <div
              key={index}
              className="flex flex-col sm:flex-row gap-3 p-3 rounded-lg bg-muted/30 border border-white/5"
            >
              <div className="flex-1 min-w-0">
                <Label className="text-xs text-muted-foreground">Группа</Label>
                <Select
                  value={budget.executor_group_id.toString()}
                  onValueChange={(val) =>
                    updateBudget(index, {
                      executor_group_id: parseInt(val),
                    })
                  }
                >
                  <SelectTrigger className="mt-1 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {groups
                      .filter(
                        (g) =>
                          g.id === budget.executor_group_id ||
                          !usedGroupIds.includes(g.id)
                      )
                      .map((g) => (
                        <SelectItem key={g.id} value={g.id.toString()}>
                          {g.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <BudgetTimeInput
                label="Решение"
                value={budget.resolution_minutes}
                onChange={(m) => updateBudget(index, { resolution_minutes: m })}
              />

              <BudgetTimeInput
                label="Реакция"
                value={budget.response_minutes}
                onChange={(m) => updateBudget(index, { response_minutes: m })}
              />

              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:bg-red-500/10"
                  onClick={() => removeBudget(index)}
                >
                  <Icon name="Trash2" size={16} />
                </Button>
              </div>
            </div>
          ))}

          {groups.filter((g) => !usedGroupIds.includes(g.id)).length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addBudget}
              className="w-full border-dashed"
            >
              <Icon name="Plus" size={16} className="mr-2" />
              Добавить группу
            </Button>
          )}

          {budgets.length > 0 && (
            <div className="flex items-center gap-2 p-2 rounded bg-blue-500/10 text-xs text-blue-400">
              <Icon name="Info" size={14} />
              Сумма бюджетов:{' '}
              {formatMinutes(
                budgets.reduce((sum, b) => sum + (b.resolution_minutes || 0), 0)
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const formatMinutes = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
};

export default SlaGroupBudgets;
