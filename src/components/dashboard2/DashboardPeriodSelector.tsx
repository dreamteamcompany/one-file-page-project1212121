/**
 * Компонент выбора периода для дашборда
 * Single Responsibility: только UI выбора периода
 */
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface DashboardPeriodSelectorProps {
  selectedPeriod: 'today' | 'week' | 'month' | 'year' | 'custom';
  onPeriodChange: (period: 'today' | 'week' | 'month' | 'year' | 'custom') => void;
  dateFrom?: Date;
  dateTo?: Date;
  onDateFromChange: (date: Date | undefined) => void;
  onDateToChange: (date: Date | undefined) => void;
  children: React.ReactNode;
}

const DashboardPeriodSelector = ({
  selectedPeriod,
  onPeriodChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  children
}: DashboardPeriodSelectorProps) => {
  return (
    <Tabs value={selectedPeriod} onValueChange={(v) => onPeriodChange(v as typeof selectedPeriod)} className="mb-6">
      <TabsList className="grid w-full grid-cols-5 max-w-2xl text-xs sm:text-sm">
        <TabsTrigger value="today" className="px-2 sm:px-4">Сегодня</TabsTrigger>
        <TabsTrigger value="week" className="px-2 sm:px-4">Неделя</TabsTrigger>
        <TabsTrigger value="month" className="px-2 sm:px-4">Месяц</TabsTrigger>
        <TabsTrigger value="year" className="px-2 sm:px-4">Год</TabsTrigger>
        <TabsTrigger value="custom" className="px-2 sm:px-4">Период</TabsTrigger>
      </TabsList>

      {selectedPeriod === 'custom' && (
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal w-full sm:w-auto text-sm">
                <Icon name="Calendar" className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, 'PPP', { locale: ru }) : 'Дата от'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={onDateFromChange} />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal w-full sm:w-auto text-sm">
                <Icon name="Calendar" className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, 'PPP', { locale: ru }) : 'Дата до'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={onDateToChange} />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {['today', 'week', 'month', 'year', 'custom'].map((period) => (
        <TabsContent key={period} value={period} className="space-y-6 mt-6">
          {children}
        </TabsContent>
      ))}
    </Tabs>
  );
};

export default DashboardPeriodSelector;
