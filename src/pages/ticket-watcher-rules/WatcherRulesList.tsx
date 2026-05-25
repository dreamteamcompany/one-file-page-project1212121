import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import WatcherRuleCard from './WatcherRuleCard';
import { WatcherRule } from './types';

interface WatcherRulesListProps {
  rules: WatcherRule[];
  loading: boolean;
  canManage: boolean;
  onCreate: () => void;
  onToggleActive: (rule: WatcherRule) => void;
  onEdit: (rule: WatcherRule) => void;
  onRemove: (rule: WatcherRule) => void;
}

const WatcherRulesList = ({
  rules,
  loading,
  canManage,
  onCreate,
  onToggleActive,
  onEdit,
  onRemove,
}: WatcherRulesListProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Icon name="Loader2" size={28} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Icon name="Eye" size={48} className="mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground mb-4">Пока нет ни одного правила</p>
          {canManage && (
            <Button onClick={onCreate} variant="outline">
              <Icon name="Plus" size={16} className="mr-2" />
              Создать первое правило
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {rules.map((rule) => (
        <WatcherRuleCard
          key={rule.id}
          rule={rule}
          canManage={canManage}
          onToggleActive={onToggleActive}
          onEdit={onEdit}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
};

export default WatcherRulesList;
