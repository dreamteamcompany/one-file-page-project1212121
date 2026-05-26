import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { Badge } from '@/components/ui/badge';
import { WatcherRule, TARGET_TYPE_ICON } from './types';

interface WatcherRuleCardProps {
  rule: WatcherRule;
  canManage: boolean;
  onToggleActive: (rule: WatcherRule) => void;
  onEdit: (rule: WatcherRule) => void;
  onRemove: (rule: WatcherRule) => void;
}

const renderConditions = (rule: WatcherRule) => {
  const chips: { label: string; value: string }[] = [];
  if (rule.category_name) chips.push({ label: 'Категория', value: rule.category_name });
  if (rule.department_name) chips.push({ label: 'Отдел', value: rule.department_name });
  if (rule.priority_name) chips.push({ label: 'Приоритет', value: rule.priority_name });
  if (rule.executor_group_name) chips.push({ label: 'Группа', value: rule.executor_group_name });
  if (rule.assignee_name) chips.push({ label: 'Исполнитель', value: rule.assignee_name });
  if (!chips.length) return <span className="text-muted-foreground text-sm">условий нет</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <Badge key={c.label} variant="secondary" className="text-xs">
          {c.label}: <span className="font-semibold ml-1">{c.value}</span>
        </Badge>
      ))}
    </div>
  );
};

const WatcherRuleCard = ({
  rule,
  canManage,
  onToggleActive,
  onEdit,
  onRemove,
}: WatcherRuleCardProps) => {
  return (
    <Card className={rule.is_active ? '' : 'opacity-60'}>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h3 className="font-semibold text-base">{rule.name}</h3>
              {!rule.is_active && (
                <Badge variant="outline" className="text-xs">отключено</Badge>
              )}
              <div className="flex gap-1">
                {rule.trigger_on_create && (
                  <Badge variant="outline" className="text-xs">при создании</Badge>
                )}
                {rule.trigger_on_update && (
                  <Badge variant="outline" className="text-xs">при изменении</Badge>
                )}
                {rule.trigger_on_executor_change && (
                  <Badge variant="outline" className="text-xs">при смене исполнителя</Badge>
                )}
              </div>
            </div>
            {rule.description && (
              <p className="text-sm text-muted-foreground mb-2">{rule.description}</p>
            )}

            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              <div>
                <div className="text-xs uppercase text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Icon name="GitBranch" size={12} />
                  Если
                  <Badge variant="outline" className="text-[10px] ml-1 py-0 h-4">
                    {rule.match_mode === 'OR' ? 'любое (ИЛИ)' : 'все (И)'}
                  </Badge>
                </div>
                {renderConditions(rule)}
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Icon name="ArrowRight" size={12} />
                  То добавить наблюдателей
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {rule.trigger_on_executor_change && (
                    <Badge variant="secondary" className="text-xs bg-violet-500/10 text-violet-600 dark:text-violet-300">
                      <Icon name="UserMinus" size={10} className="mr-1" />
                      Бывший исполнитель
                    </Badge>
                  )}
                  {rule.targets.map((t, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      <Icon
                        name={TARGET_TYPE_ICON[t.target_type] as 'User'}
                        size={10}
                        className="mr-1"
                      />
                      {t.target_name || `#${t.target_id}`}
                    </Badge>
                  ))}
                  {rule.targets.length === 0 && !rule.trigger_on_executor_change && (
                    <span className="text-muted-foreground text-sm">нет</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {canManage && (
            <div className="flex sm:flex-col gap-2">
              <Button variant="ghost" size="sm" onClick={() => onToggleActive(rule)}>
                <Icon name={rule.is_active ? 'Pause' : 'Play'} size={14} className="mr-1" />
                {rule.is_active ? 'Отключить' : 'Включить'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onEdit(rule)}>
                <Icon name="Pencil" size={14} className="mr-1" />
                Изменить
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => onRemove(rule)}
              >
                <Icon name="Trash2" size={14} className="mr-1" />
                Удалить
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WatcherRuleCard;