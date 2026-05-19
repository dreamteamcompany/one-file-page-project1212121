/**
 * Компонент переключения режимов просмотра заявок
 * Single Responsibility: только UI переключения list/kanban/bulk
 */
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';

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
  hideWaiting?: boolean;
  onToggleHideWaiting?: (value: boolean) => void;
  needsMyReply?: boolean;
  showAll?: boolean;
  onToggleShowAll?: (value: boolean) => void;
  showWatching?: boolean;
  onToggleWatching?: (value: boolean) => void;
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
  hideWaiting = true,
  onToggleHideWaiting,
  needsMyReply = false,
  showAll = false,
  onToggleShowAll,
  showWatching = false,
  onToggleWatching,
}: TicketsViewToggleProps) => {
  const { hasSystemRole } = useAuth();
  const isPlainUser = hasSystemRole('user') && !hasSystemRole('admin', 'manager');
  const isOpenOrAllActive = !showArchived && !showHidden;
  const currentLabel = showAll ? 'Все' : 'Открытые';

  const handleSelectOpen = () => {
    onViewModeChange('list');
    if (showArchived) onToggleArchived(false);
    if (showHidden && onToggleHidden) onToggleHidden(false);
    if (showAll && onToggleShowAll) onToggleShowAll(false);
  };

  const handleSelectAll = () => {
    onViewModeChange('list');
    if (onToggleShowAll) onToggleShowAll(true);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <div className="flex items-center gap-2 flex-wrap">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={isOpenOrAllActive ? 'default' : 'outline'}
              size="sm"
              className="flex items-center gap-2"
            >
              <Icon name="List" size={16} />
              <span className="hidden sm:inline">{currentLabel}</span>
              <Icon name="ChevronDown" size={14} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={handleSelectOpen}>
              <Icon name="List" size={14} className="mr-2" />
              Открытые
              {isOpenOrAllActive && !showAll && (
                <Icon name="Check" size={14} className="ml-auto" />
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSelectAll}>
              <Icon name="LayoutList" size={14} className="mr-2" />
              Все
              {showAll && <Icon name="Check" size={14} className="ml-auto" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant={showWatching ? 'default' : 'outline'}
          size="sm"
          onClick={() => onToggleWatching?.(!showWatching)}
          className="flex items-center gap-2"
        >
          <Icon name="Users" size={16} />
          <span className="hidden sm:inline">Наблюдаю</span>
          <span className="sm:hidden">Наблюдаю</span>
        </Button>
        <Button
          variant={showArchived ? 'default' : 'outline'}
          size="sm"
          onClick={() => { onToggleArchived(!showArchived); if (showHidden && onToggleHidden) onToggleHidden(false); if (!showArchived) onViewModeChange('list'); }}
          className="flex items-center gap-2"
        >
          <Icon name="Archive" size={16} />
          <span className="hidden sm:inline">Архив</span>
        </Button>
        {onToggleHidden && !isPlainUser && (
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

      {viewMode === 'list' && !showHidden && (
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