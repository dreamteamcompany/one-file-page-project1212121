import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

export type TicketsFiltersValue = {
  search_assignee?: string;
  search_creator?: string;
  search_status?: string;
  search_executor_group?: string;
  search_service?: string;
  search_ticket_service?: string;
  search_content?: string;
  due_from?: string;
  due_to?: string;
};

interface Props {
  value: TicketsFiltersValue;
  onChange: (next: TicketsFiltersValue) => void;
  debounceMs?: number;
  align?: 'left' | 'right';
}

const FIELDS: { key: keyof TicketsFiltersValue; label: string; placeholder: string; type?: 'text' | 'date' }[] = [
  { key: 'search_content', label: 'Содержание', placeholder: 'Поиск по заголовку, описанию и доп. полям' },
  { key: 'search_assignee', label: 'Исполнитель', placeholder: 'ФИО или email' },
  { key: 'search_creator', label: 'Заказчик', placeholder: 'ФИО или email' },
  { key: 'search_status', label: 'Статус', placeholder: 'Название статуса' },
  { key: 'search_executor_group', label: 'Группа исполнителей', placeholder: 'Название группы' },
  { key: 'search_service', label: 'Услуга', placeholder: 'Название услуги' },
  { key: 'search_ticket_service', label: 'Сервис', placeholder: 'Название сервиса' },
  { key: 'due_from', label: 'Дедлайн с', placeholder: '', type: 'date' },
  { key: 'due_to', label: 'Дедлайн по', placeholder: '', type: 'date' },
];

const TicketsFilters = ({ value, onChange, debounceMs = 400, align = 'left' }: Props) => {
  const [local, setLocal] = useState<TicketsFiltersValue>(value);
  const [expanded, setExpanded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  const scheduleEmit = (next: TicketsFiltersValue) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChange(next);
    }, debounceMs);
  };

  const handleFieldChange = (key: keyof TicketsFiltersValue, val: string) => {
    const next = { ...local, [key]: val };
    setLocal(next);
    scheduleEmit(next);
  };

  const handleReset = () => {
    const empty: TicketsFiltersValue = {};
    setLocal(empty);
    if (timerRef.current) clearTimeout(timerRef.current);
    onChange(empty);
  };

  const activeCount = Object.values(local).filter((v) => (v || '').trim() !== '').length;

  return (
    <>
      <div className={`flex items-center gap-2 ${align === 'right' ? 'justify-end' : ''}`}>
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={() => setExpanded((s) => !s)}
        >
          <Icon name="Filter" size={16} className="mr-2" />
          Фильтры
          {activeCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center text-xs rounded-full bg-primary text-primary-foreground px-2 py-0.5">
              {activeCount}
            </span>
          )}
        </Button>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" className="h-9" onClick={handleReset}>
            <Icon name="X" size={14} className="mr-1" />
            Сбросить
          </Button>
        )}
      </div>

      {expanded && (
        <div className="basis-full mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {FIELDS.map((f) => (
            <div key={f.key} className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">{f.label}</label>
              <Input
                type={f.type || 'text'}
                value={local[f.key] || ''}
                placeholder={f.placeholder}
                onChange={(e) => handleFieldChange(f.key, e.target.value)}
                className="h-9"
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default TicketsFilters;