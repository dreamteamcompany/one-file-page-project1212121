/**
 * Тулбар нового интерфейса заявок: чипсы активных фильтров + сортировка + режим отображения.
 */
import Icon from '@/components/ui/icon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TicketsFiltersValue } from '@/components/tickets/TicketsFilters';

interface SortOption {
  value: string;
  label: string;
}

interface WorkspaceToolbarProps {
  filters: TicketsFiltersValue;
  onRemoveFilter: (key: keyof TicketsFiltersValue) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
  sortDir: 'asc' | 'desc';
  onSortDirToggle: () => void;
  sortOptions: SortOption[];
  gridMode: boolean;
  onGridModeChange: (grid: boolean) => void;
}

const FILTER_LABELS: Record<string, string> = {
  search_content: 'Содержание',
  search_assignee: 'Исполнитель',
  search_creator: 'Заказчик',
  search_status: 'Статус',
  search_executor_group: 'Группа',
  search_service: 'Услуга',
  search_ticket_service: 'Сервис',
  due_from: 'Дедлайн с',
  due_to: 'Дедлайн по',
};

const CHIP_COLORS = [
  'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
];

const WorkspaceToolbar = ({
  filters,
  onRemoveFilter,
  sortBy,
  onSortByChange,
  sortDir,
  onSortDirToggle,
  sortOptions,
  gridMode,
  onGridModeChange,
}: WorkspaceToolbarProps) => {
  const activeFilters = (Object.entries(filters) as [keyof TicketsFiltersValue, string | undefined][])
    .filter(([, v]) => (v || '').trim() !== '');

  return (
    <div className="flex flex-col gap-3">
      {/* Чипсы фильтров + сортировка */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {activeFilters.length === 0 ? (
            <span className="text-sm text-muted-foreground">Фильтры не выбраны</span>
          ) : (
            activeFilters.map(([key, value], idx) => (
              <span
                key={key}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium ${CHIP_COLORS[idx % CHIP_COLORS.length]}`}
              >
                {FILTER_LABELS[key] || key}: {value}
                <button
                  type="button"
                  onClick={() => onRemoveFilter(key)}
                  className="ml-0.5 opacity-70 hover:opacity-100"
                >
                  <Icon name="X" size={12} />
                </button>
              </span>
            ))
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-muted-foreground sm:inline">Сортировка:</span>
          <Select value={sortBy} onValueChange={onSortByChange}>
            <SelectTrigger className="h-9 w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            title={sortDir === 'asc' ? 'По возрастанию' : 'По убыванию'}
            onClick={onSortDirToggle}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
          >
            <Icon name={sortDir === 'asc' ? 'ArrowUpNarrowWide' : 'ArrowDownWideNarrow'} size={16} />
          </button>
        </div>
      </div>

      {/* Режим отображения */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Режим отображения:</span>
        <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
          <button
            type="button"
            title="Список"
            onClick={() => onGridModeChange(false)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
              !gridMode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Icon name="List" size={16} />
          </button>
          <button
            type="button"
            title="Доска (скоро)"
            onClick={() => onGridModeChange(true)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
              gridMode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Icon name="LayoutGrid" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceToolbar;
