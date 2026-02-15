import { useEffect, useState, useCallback } from 'react';
import { apiFetch, getApiUrl } from '@/utils/api';
import Icon from '@/components/ui/icon';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface BudgetItem {
  executor_group_id: number;
  resolution_minutes: number | null;
  response_minutes: number | null;
  group_name: string;
}

const formatTime = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
};

interface Props {
  slaId: number;
}

const SlaGroupBudgetsPreview = ({ slaId }: Props) => {
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const loadBudgets = useCallback(async () => {
    try {
      const res = await apiFetch(
        `${getApiUrl('sla-group-budgets')}?endpoint=sla-group-budgets&sla_id=${slaId}`
      );
      if (res.ok) {
        setBudgets(await res.json());
      }
    } catch { /* ignore */ }
  }, [slaId]);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  if (budgets.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-3">
      <CollapsibleTrigger asChild>
        <button className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors">
          <Icon name={isOpen ? 'ChevronDown' : 'ChevronRight'} size={14} />
          <Icon name="Users" size={14} />
          <span>Бюджеты групп ({budgets.length})</span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 ml-6 space-y-1.5">
        {budgets.map((b) => (
          <div
            key={b.executor_group_id}
            className="flex items-center gap-3 text-xs py-1.5 px-2 rounded bg-muted/20"
          >
            <span className="font-medium min-w-[100px]">{b.group_name}</span>
            {b.resolution_minutes && (
              <span className="text-muted-foreground">
                Решение: {formatTime(b.resolution_minutes)}
              </span>
            )}
            {b.response_minutes && (
              <span className="text-muted-foreground">
                Реакция: {formatTime(b.response_minutes)}
              </span>
            )}
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default SlaGroupBudgetsPreview;
