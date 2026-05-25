import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import StackBar from './StackBar';
import GroupBudgetRow from './GroupBudgetRow';
import { ExecutorGroup, GroupBudgetItem, SEGMENT_COLORS } from './types';

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

export default BudgetEditor;
