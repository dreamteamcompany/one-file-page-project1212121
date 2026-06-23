import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import Icon from '@/components/ui/icon';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { PeriodType } from './useOpsDashboard';

interface OpsHeaderProps {
  period: PeriodType;
  onPeriodChange: (p: PeriodType) => void;
  dateFrom?: Date;
  dateTo?: Date;
  onDateFromChange: (d: Date | undefined) => void;
  onDateToChange: (d: Date | undefined) => void;
  onRefresh: () => void;
  loading: boolean;
  title?: string;
  subtitle?: string;
}

const PERIODS: { value: PeriodType; label: string }[] = [
  { value: 'today', label: 'Сегодня' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'year', label: 'Год' },
  { value: 'custom', label: 'Период' },
];

const OpsHeader = ({
  period,
  onPeriodChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onRefresh,
  loading,
  title = '1. Операционный центр',
  subtitle = 'Оперативный обзор работы службы поддержки',
}: OpsHeaderProps) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card text-sm font-medium text-foreground hover:bg-muted transition-colors self-start shrink-0"
        >
          <Icon name="RefreshCw" size={15} className={loading ? 'animate-spin' : ''} />
          Обновить
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex p-1 bg-muted rounded-xl">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => onPeriodChange(p.value)}
              className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm rounded-lg font-medium transition-colors ${
                period === p.value
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card text-xs sm:text-sm text-foreground">
                  <Icon name="Calendar" size={14} />
                  {dateFrom ? format(dateFrom, 'dd MMM yyyy', { locale: ru }) : 'Дата от'}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={onDateFromChange} />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground text-sm">—</span>
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card text-xs sm:text-sm text-foreground">
                  <Icon name="Calendar" size={14} />
                  {dateTo ? format(dateTo, 'dd MMM yyyy', { locale: ru }) : 'Дата до'}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={onDateToChange} />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>
    </div>
  );
};

export default OpsHeader;