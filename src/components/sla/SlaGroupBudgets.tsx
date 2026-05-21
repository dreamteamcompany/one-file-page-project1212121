import { useEffect, useMemo, useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { Switch } from '@/components/ui/switch';

const InlineMinutesInput = ({
  label,
  value,
  onChange,
  invalid,
  description,
}: {
  label: string;
  value: number | null;
  onChange: (minutes: number | null) => void;
  invalid?: boolean;
  description?: string;
}) => {
  const hours = value ? Math.floor(value / 60) : 0;
  const minutes = value ? value % 60 : 0;

  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-1.5 min-w-0">
        <Label className="text-sm text-foreground truncate">{label}</Label>
        {description && (
          <span
            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 cursor-help"
            title={description}
          >
            <Icon name="Info" size={13} />
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Input
          type="number"
          min="0"
          className={`w-14 h-8 text-sm text-center px-1 ${invalid ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
          placeholder="0"
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
          className={`w-14 h-8 text-sm text-center px-1 ${invalid ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
          placeholder="0"
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

interface ExecutorGroup {
  id: number;
  name: string;
}

interface PriorityRef {
  id: number;
  name: string;
  level?: number;
  color?: string;
}

interface PriorityTimeRef {
  priority_id: number;
  response_time_minutes?: number | null;
  resolution_time_minutes?: number | null;
}

export interface GroupBudgetItem {
  executor_group_id: number;
  resolution_minutes: number | null;
  response_minutes: number | null;
  sort_order: number;
  priority_id?: number | null;
}

interface Props {
  slaId?: number;
  budgets: GroupBudgetItem[];
  onBudgetsChange: (budgets: GroupBudgetItem[]) => void;
  totalResolutionMinutes?: number | null;
  totalResponseMinutes?: number | null;
  priorities?: PriorityRef[];
  priorityTimes?: PriorityTimeRef[];
  priorityTimesEnabled?: boolean;
  onValidationChange?: (isValid: boolean) => void;
}

const SEGMENT_COLORS = [
  '#8b5cf6',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#14b8a6',
  '#6366f1',
];

const formatMinutes = (m: number) => {
  const abs = Math.abs(m);
  const h = Math.floor(abs / 60);
  const min = abs % 60;
  if (h === 0) return `${min} мин`;
  if (min === 0) return `${h} ч`;
  return `${h} ч ${min} мин`;
};

interface StackBarProps {
  totalMinutes: number;
  segments: { name: string; minutes: number; color: string }[];
  title: string;
}

const StackBar = ({ totalMinutes, segments, title }: StackBarProps) => {
  const sum = segments.reduce((s, x) => s + (x.minutes || 0), 0);
  const overflow = totalMinutes > 0 && sum > totalMinutes;
  const remainder = Math.max(0, totalMinutes - sum);
  const base = overflow ? sum : totalMinutes;
  const status = !totalMinutes
    ? { color: 'text-muted-foreground', text: 'Общее время решения не задано' }
    : overflow
      ? {
          color: 'text-red-500',
          text: `Превышение на ${formatMinutes(sum - totalMinutes)} — сохранить нельзя`,
        }
      : sum === totalMinutes
        ? { color: 'text-green-500', text: 'Распределено полностью' }
        : sum === 0
          ? { color: 'text-muted-foreground', text: `Доступно ${formatMinutes(totalMinutes)}` }
          : {
              color: 'text-amber-500',
              text: `Осталось ${formatMinutes(remainder)} (буфер)`,
            };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <span className={`text-xs font-medium ${status.color}`}>{status.text}</span>
      </div>
      <div
        className={`relative w-full h-7 rounded-md overflow-hidden border ${
          overflow ? 'border-red-500/60' : 'border-border'
        } bg-muted/40`}
      >
        {base > 0 && (
          <div className="absolute inset-0 flex">
            {segments.map((seg, i) => {
              if (!seg.minutes) return null;
              const width = (seg.minutes / base) * 100;
              return (
                <div
                  key={i}
                  className="h-full flex items-center justify-center text-[10px] font-semibold text-white truncate px-1"
                  style={{
                    width: `${width}%`,
                    backgroundColor: overflow ? '#ef4444' : seg.color,
                  }}
                  title={`${seg.name}: ${formatMinutes(seg.minutes)}`}
                >
                  {width > 12 ? seg.name : ''}
                </div>
              );
            })}
            {!overflow && remainder > 0 && (
              <div
                className="h-full flex items-center justify-center text-[10px] text-muted-foreground truncate px-1"
                style={{ width: `${(remainder / base) * 100}%` }}
                title={`Остаток: ${formatMinutes(remainder)}`}
              >
                {(remainder / base) * 100 > 12 ? `· ${formatMinutes(remainder)} ·` : ''}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const SlaGroupBudgets = ({
  slaId,
  budgets,
  onBudgetsChange,
  totalResolutionMinutes,
  totalResponseMinutes,
  priorities = [],
  priorityTimes = [],
  priorityTimesEnabled = false,
  onValidationChange,
}: Props) => {
  const [groups, setGroups] = useState<ExecutorGroup[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activePriorityTab, setActivePriorityTab] = useState<string>('default');

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          items.map((b: Record<string, number | null>) => ({
            executor_group_id: b.executor_group_id as number,
            resolution_minutes: (b.resolution_minutes as number | null) ?? null,
            response_minutes: (b.response_minutes as number | null) ?? null,
            sort_order: (b.sort_order as number) || 0,
            priority_id: (b.priority_id as number | null) ?? null,
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

  const currentPriorityId: number | null = useMemo(() => {
    if (activePriorityTab === 'default') return null;
    const id = parseInt(activePriorityTab);
    return isNaN(id) ? null : id;
  }, [activePriorityTab]);

  const totalForCurrentTab = useMemo(() => {
    if (currentPriorityId == null) {
      return {
        resolution: totalResolutionMinutes || 0,
        response: totalResponseMinutes || 0,
      };
    }
    const pt = priorityTimes.find((p) => p.priority_id === currentPriorityId);
    return {
      resolution: pt?.resolution_time_minutes ?? totalResolutionMinutes ?? 0,
      response: pt?.response_time_minutes ?? totalResponseMinutes ?? 0,
    };
  }, [currentPriorityId, priorityTimes, totalResolutionMinutes, totalResponseMinutes]);

  const tabBudgets = useMemo(() => {
    return budgets
      .map((b, idx) => ({ ...b, _origIndex: idx }))
      .filter((b) =>
        currentPriorityId == null
          ? b.priority_id == null
          : b.priority_id === currentPriorityId
      );
  }, [budgets, currentPriorityId]);

  const usedGroupIds = tabBudgets.map((b) => b.executor_group_id);

  const addBudget = () => {
    const available = groups.filter((g) => !usedGroupIds.includes(g.id));
    if (available.length === 0) return;

    onBudgetsChange([
      ...budgets,
      {
        executor_group_id: available[0].id,
        resolution_minutes: null,
        response_minutes: null,
        sort_order: tabBudgets.length,
        priority_id: currentPriorityId,
      },
    ]);
  };

  const removeBudget = (origIndex: number) => {
    onBudgetsChange(budgets.filter((_, i) => i !== origIndex));
  };

  const updateBudget = (origIndex: number, updates: Partial<GroupBudgetItem>) => {
    onBudgetsChange(
      budgets.map((b, i) => (i === origIndex ? { ...b, ...updates } : b))
    );
  };

  const moveBudget = (origIndex: number, dir: -1 | 1) => {
    const newArr = [...budgets];
    const target = origIndex + dir;
    if (target < 0 || target >= newArr.length) return;
    [newArr[origIndex], newArr[target]] = [newArr[target], newArr[origIndex]];
    onBudgetsChange(newArr.map((b, i) => ({ ...b, sort_order: i })));
  };

  const getGroupName = (id: number) =>
    groups.find((g) => g.id === id)?.name || `Группа #${id}`;

  const resolutionSegments = tabBudgets.map((b, i) => ({
    name: getGroupName(b.executor_group_id),
    minutes: b.resolution_minutes || 0,
    color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
  }));
  const responseSegments = tabBudgets.map((b, i) => ({
    name: getGroupName(b.executor_group_id),
    minutes: b.response_minutes || 0,
    color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
  }));

  const resolutionSum = resolutionSegments.reduce((s, x) => s + x.minutes, 0);
  const responseSum = responseSegments.reduce((s, x) => s + x.minutes, 0);

  const resolutionOverflow =
    totalForCurrentTab.resolution > 0 && resolutionSum > totalForCurrentTab.resolution;
  const responseOverflow =
    totalForCurrentTab.response > 0 && responseSum > totalForCurrentTab.response;

  const isValid = !enabled || (!resolutionOverflow && !responseOverflow);

  useEffect(() => {
    onValidationChange?.(isValid);
  }, [isValid, onValidationChange]);

  const tabPriorities = useMemo(() => {
    if (!priorityTimesEnabled) return [];
    return priorityTimes
      .map((pt) => priorities.find((p) => p.id === pt.priority_id))
      .filter((p): p is PriorityRef => !!p);
  }, [priorities, priorityTimes, priorityTimesEnabled]);

  if (loading) {
    return (
      <div className="border-t border-border pt-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
          Загрузка бюджетов групп...
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-border pt-4">
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
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Распределите общее время между группами исполнителей. Шкала ниже показывает заполнение
            от общего SLA (100%). Серый хвост — нераспределённый остаток.
          </p>

          {tabPriorities.length > 0 && (
            <Tabs value={activePriorityTab} onValueChange={setActivePriorityTab}>
              <TabsList className="w-full flex flex-wrap h-auto">
                <TabsTrigger value="default" className="text-xs">
                  Без приоритета
                </TabsTrigger>
                {tabPriorities.map((p) => (
                  <TabsTrigger key={p.id} value={p.id.toString()} className="text-xs">
                    <span
                      className="inline-block w-2 h-2 rounded-full mr-1.5"
                      style={{ backgroundColor: p.color || '#888' }}
                    />
                    {p.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value={activePriorityTab} className="mt-3" forceMount>
                <BudgetEditor
                  key={activePriorityTab}
                  tabBudgets={tabBudgets}
                  totalForCurrentTab={totalForCurrentTab}
                  resolutionSegments={resolutionSegments}
                  responseSegments={responseSegments}
                  resolutionOverflow={resolutionOverflow}
                  responseOverflow={responseOverflow}
                  groups={groups}
                  usedGroupIds={usedGroupIds}
                  budgetsLength={budgets.length}
                  updateBudget={updateBudget}
                  removeBudget={removeBudget}
                  moveBudget={moveBudget}
                  addBudget={addBudget}
                  getGroupName={getGroupName}
                />
              </TabsContent>
            </Tabs>
          )}

          {tabPriorities.length === 0 && (
            <BudgetEditor
              tabBudgets={tabBudgets}
              totalForCurrentTab={totalForCurrentTab}
              resolutionSegments={resolutionSegments}
              responseSegments={responseSegments}
              resolutionOverflow={resolutionOverflow}
              responseOverflow={responseOverflow}
              groups={groups}
              usedGroupIds={usedGroupIds}
              budgetsLength={budgets.length}
              updateBudget={updateBudget}
              removeBudget={removeBudget}
              moveBudget={moveBudget}
              addBudget={addBudget}
              getGroupName={getGroupName}
            />
          )}
        </div>
      )}
    </div>
  );
};

interface BudgetEditorProps {
  tabBudgets: (GroupBudgetItem & { _origIndex: number })[];
  totalForCurrentTab: { resolution: number; response: number };
  resolutionSegments: { name: string; minutes: number; color: string }[];
  responseSegments: { name: string; minutes: number; color: string }[];
  resolutionOverflow: boolean;
  responseOverflow: boolean;
  groups: ExecutorGroup[];
  usedGroupIds: number[];
  budgetsLength: number;
  updateBudget: (origIndex: number, updates: Partial<GroupBudgetItem>) => void;
  removeBudget: (origIndex: number) => void;
  moveBudget: (origIndex: number, dir: -1 | 1) => void;
  addBudget: () => void;
  getGroupName: (id: number) => string;
}

const BudgetEditor = ({
  tabBudgets,
  totalForCurrentTab,
  resolutionSegments,
  responseSegments,
  resolutionOverflow,
  responseOverflow,
  groups,
  usedGroupIds,
  updateBudget,
  removeBudget,
  moveBudget,
  addBudget,
  getGroupName: _getGroupName,
}: BudgetEditorProps) => {
  return (
    <div className="space-y-4">
      <div className="space-y-3 p-3 rounded-lg bg-muted/20 border border-border">
        <StackBar
          title="Решение"
          totalMinutes={totalForCurrentTab.resolution}
          segments={resolutionSegments}
        />
        <StackBar
          title="Реакция"
          totalMinutes={totalForCurrentTab.response}
          segments={responseSegments}
        />
      </div>

      {tabBudgets.map((budget, localIdx) => {
        const segColor = SEGMENT_COLORS[localIdx % SEGMENT_COLORS.length];
        return (
          <GroupBudgetRow
            key={budget._origIndex}
            budget={budget}
            localIdx={localIdx}
            totalCount={tabBudgets.length}
            color={segColor}
            groups={groups}
            usedGroupIds={usedGroupIds}
            resolutionOverflow={resolutionOverflow}
            responseOverflow={responseOverflow}
            updateBudget={updateBudget}
            removeBudget={removeBudget}
            moveBudget={moveBudget}
          />
        );
      })}

      {groups.filter((g) => !usedGroupIds.includes(g.id)).length > 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addBudget}
          className="w-full"
        >
          <Icon name="Plus" size={14} className="mr-1.5" />
          Добавить группу
        </Button>
      )}

      {(resolutionOverflow || responseOverflow) && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-500">
          <Icon name="AlertTriangle" size={14} className="mt-0.5 flex-shrink-0" />
          <div>
            Сумма бюджетов групп превышает общий SLA. Уменьшите время у одной из групп — иначе SLA не получится сохранить.
          </div>
        </div>
      )}
    </div>
  );
};

const GroupBudgetRow = ({
  budget,
  localIdx,
  totalCount,
  color,
  groups,
  usedGroupIds,
  resolutionOverflow,
  responseOverflow,
  updateBudget,
  removeBudget,
  moveBudget,
}: {
  budget: GroupBudgetItem & { _origIndex: number };
  localIdx: number;
  totalCount: number;
  color: string;
  groups: ExecutorGroup[];
  usedGroupIds: number[];
  resolutionOverflow: boolean;
  responseOverflow: boolean;
  updateBudget: (origIndex: number, updates: Partial<GroupBudgetItem>) => void;
  removeBudget: (origIndex: number) => void;
  moveBudget: (origIndex: number, dir: -1 | 1) => void;
}) => {
  const [open, setOpen] = useState(false);
  const groupName =
    groups.find((g) => g.id === budget.executor_group_id)?.name ||
    `Группа #${budget.executor_group_id}`;
  const hasOverflow =
    (resolutionOverflow && (budget.resolution_minutes || 0) > 0) ||
    (responseOverflow && (budget.response_minutes || 0) > 0);

  return (
    <div
      className={`rounded-lg border bg-muted/20 overflow-hidden ${
        hasOverflow ? 'border-red-500/40' : 'border-border'
      }`}
    >
      <div className="flex items-center gap-2 p-2.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
        >
          <Icon
            name={open ? 'ChevronDown' : 'ChevronRight'}
            size={14}
            className="text-muted-foreground flex-shrink-0"
          />
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="text-sm font-medium truncate">{groupName}</span>
        </button>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-shrink-0">
          <span className="flex items-center gap-1">
            <Icon name="Timer" size={11} />
            {formatMinutes(budget.response_minutes || 0) || '—'}
          </span>
          <span className="flex items-center gap-1">
            <Icon name="CheckCircle2" size={11} />
            {formatMinutes(budget.resolution_minutes || 0) || '—'}
          </span>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={localIdx === 0}
            onClick={() => moveBudget(budget._origIndex, -1)}
            title="Выше"
          >
            <Icon name="ChevronUp" size={13} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={localIdx === totalCount - 1}
            onClick={() => moveBudget(budget._origIndex, 1)}
            title="Ниже"
          >
            <Icon name="ChevronDown" size={13} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-500 hover:bg-red-500/10"
            onClick={() => removeBudget(budget._origIndex)}
          >
            <Icon name="Trash2" size={14} />
          </Button>
        </div>
      </div>

      {open && (
        <div className="px-3 pb-2 border-t border-border/50 bg-background/40 space-y-2">
          <div className="pt-2">
            <Label className="text-xs text-muted-foreground">Группа исполнителей</Label>
            <Select
              value={budget.executor_group_id.toString()}
              onValueChange={(val) =>
                updateBudget(budget._origIndex, {
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
          <div className="divide-y divide-border/40">
            <InlineMinutesInput
              label="Реакция"
              value={budget.response_minutes}
              onChange={(m) =>
                updateBudget(budget._origIndex, { response_minutes: m })
              }
              invalid={responseOverflow}
              description="Сколько максимум времени группа держит заявку до первого ответа"
            />
            <InlineMinutesInput
              label="Решение"
              value={budget.resolution_minutes}
              onChange={(m) =>
                updateBudget(budget._origIndex, { resolution_minutes: m })
              }
              invalid={resolutionOverflow}
              description="Сколько максимум времени группа держит заявку до полного решения"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SlaGroupBudgets;