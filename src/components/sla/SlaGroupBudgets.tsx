import { useEffect, useMemo, useState } from 'react';
import { apiFetch, getApiUrl } from '@/utils/api';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { Switch } from '@/components/ui/switch';
import BudgetEditor from './group-budgets/BudgetEditor';
import {
  ExecutorGroup,
  GroupBudgetItem,
  PriorityRef,
  PriorityTimeRef,
  SEGMENT_COLORS,
} from './group-budgets/types';

export type { GroupBudgetItem } from './group-budgets/types';

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

export default SlaGroupBudgets;
