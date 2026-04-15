/**
 * Компонент переключения режимов просмотра заявок
 * Single Responsibility: только UI переключения list/kanban/bulk
 */
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

interface TicketsViewToggleProps {
  viewMode: 'list' | 'kanban';
  onViewModeChange: (mode: 'list' | 'kanban') => void;
  bulkMode: boolean;
  onBulkModeToggle: () => void;
  showArchived: boolean;
  onToggleArchived: (archived: boolean) => void;
  showHidden?: boolean;
  onToggleHidden?: (hidden: boolean) => void;
  hiddenCount?: number;
}

const TicketsViewToggle = ({
  viewMode,
  onViewModeChange,
  bulkMode,
  onBulkModeToggle,
  showArchived,
  onToggleArchived,
  showHidden = false,
  onToggleHidden,
  hiddenCount = 0,
}: TicketsViewToggleProps) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={showArchived ? 'default' : 'outline'}
          size="sm"
          onClick={() => { onToggleArchived(!showArchived); if (showHidden && onToggleHidden) onToggleHidden(false); if (!showArchived) onViewModeChange('list'); }}
          className="flex items-center gap-2"
        >
          <Icon name="Archive" size={16} />
          <span className="hidden sm:inline">Архив</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {}}
          className="flex items-center gap-2"
        >
          <Icon name="Users" size={16} />
          <span className="hidden sm:inline">Заявки моих сотрудников</span>
          <span className="sm:hidden">Мои сотр.</span>
        </Button>
        {onToggleHidden && (
          <Button
            variant={showHidden ? 'default' : 'outline'}
            size="sm"
            onClick={() => { onToggleHidden(!showHidden); if (showArchived) onToggleArchived(false); if (!showHidden) onViewModeChange('list'); }}
            className="flex items-center gap-2"
          >
            <Icon name="EyeOff" size={16} />
            <span className="hidden sm:inline">Скрытые</span>
            {hiddenCount > 0 && (
              <span className="bg-orange-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                {hiddenCount}
              </span>
            )}
          </Button>
        )}
      </div>

      {viewMode === 'list' && !showArchived && !showHidden && (
        <Button
          variant={bulkMode ? 'default' : 'outline'}
          size="sm"
          onClick={onBulkModeToggle}
          className="flex items-center gap-2 text-sm sm:text-base"
        >
          <Icon name="CheckSquare" size={16} />
          <span className="hidden sm:inline">{bulkMode ? 'Отменить выбор' : 'Массовые действия'}</span>
          <span className="sm:hidden">{bulkMode ? 'Отмена' : 'Массовые'}</span>
        </Button>
      )}
    </div>
  );
};

export default TicketsViewToggle;