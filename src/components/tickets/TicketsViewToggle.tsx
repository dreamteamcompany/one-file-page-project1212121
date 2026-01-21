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
}

const TicketsViewToggle = ({
  viewMode,
  onViewModeChange,
  bulkMode,
  onBulkModeToggle
}: TicketsViewToggleProps) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={viewMode === 'list' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewModeChange('list')}
          className="flex items-center gap-2"
        >
          <Icon name="List" size={16} className="hidden sm:inline" />
          <span className="hidden sm:inline">Список</span>
          <Icon name="List" size={16} className="sm:hidden" />
        </Button>
        <Button
          variant={viewMode === 'kanban' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onViewModeChange('kanban')}
          className="flex items-center gap-2"
        >
          <Icon name="LayoutGrid" size={16} className="hidden sm:inline" />
          <span className="hidden sm:inline">Канбан</span>
          <Icon name="LayoutGrid" size={16} className="sm:hidden" />
        </Button>
      </div>

      {viewMode === 'list' && (
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
