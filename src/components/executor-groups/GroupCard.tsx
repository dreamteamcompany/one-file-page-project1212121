import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import type { ExecutorGroup } from '@/hooks/useExecutorGroups';

interface GroupCardProps {
  group: ExecutorGroup;
  isSelected: boolean;
  onSelect: (group: ExecutorGroup) => void;
  onEdit: (group: ExecutorGroup) => void;
  onRemove: (group: ExecutorGroup) => void;
}

const GroupCard = ({ group, isSelected, onSelect, onEdit, onRemove }: GroupCardProps) => {
  return (
    <div
      onClick={() => onSelect(group)}
      className={`p-4 rounded-lg border cursor-pointer transition-all ${
        isSelected
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-border bg-card hover:border-primary/50'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-sm truncate">{group.name}</h3>
            {!group.is_active && (
              <Badge variant="secondary" className="text-xs">Неактивна</Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-1 mb-1">
            {group.auto_assign && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                <Icon name="Zap" size={10} />
                Авто
              </Badge>
            )}
            {group.assign_group_only && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                <Icon name="UsersRound" size={10} />
                Только группа
              </Badge>
            )}
          </div>
          {group.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{group.description}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Icon name="Users" size={12} />
              {group.member_count}
            </span>
            <span className="flex items-center gap-1">
              <Icon name="Link" size={12} />
              {group.mapping_count}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={(e) => { e.stopPropagation(); onEdit(group); }}
          >
            <Icon name="Pencil" size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onRemove(group); }}
          >
            <Icon name="Trash2" size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GroupCard;