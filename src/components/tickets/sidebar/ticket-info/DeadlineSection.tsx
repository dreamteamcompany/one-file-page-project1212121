import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import DateMaskedInput from '@/components/ui/date-masked-input';
import { Ticket, DeadlineInfo } from './types';

interface DeadlineSectionProps {
  ticket: Ticket;
  deadlineInfo: DeadlineInfo | null;
  responseDeadlineInfo: DeadlineInfo | null;
  isCustomer: boolean;
  canEditDueDate?: boolean;
  onUpdateDueDate?: (dueDate: string | null) => void;
}

const DeadlineSection = ({
  ticket,
  deadlineInfo,
  responseDeadlineInfo,
  isCustomer,
  canEditDueDate = false,
  onUpdateDueDate,
}: DeadlineSectionProps) => {
  const canEdit = (isCustomer || canEditDueDate) && !!onUpdateDueDate;
  const [isEditingDueDate, setIsEditingDueDate] = useState(false);
  const [dueDateValue, setDueDateValue] = useState(ticket.due_date || '');
  const [dueTimeValue, setDueTimeValue] = useState(() => {
    if (ticket.due_date) {
      const date = new Date(ticket.due_date);
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    return '12:00';
  });

  return (
    <>
      {ticket.response_due_date && (
        <div className="p-4" style={responseDeadlineInfo ? { 
          backgroundColor: `${responseDeadlineInfo.color}08`
        } : {}}>
          <h3 className="text-xs font-semibold mb-3 text-foreground uppercase tracking-wide flex items-center gap-2">
            <Icon name="Timer" size={14} />
            Время реакции
          </h3>
          {responseDeadlineInfo ? (
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{
                backgroundColor: `${responseDeadlineInfo.color}20`
              }}>
                <Icon name={responseDeadlineInfo.urgent ? 'AlertCircle' : 'Timer'} size={16} style={{ color: responseDeadlineInfo.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm mb-0.5" style={{ color: responseDeadlineInfo.color }}>
                  {responseDeadlineInfo.label}
                </p>
                <p className="text-xs" style={{ color: responseDeadlineInfo.color, opacity: 0.75 }}>
                  {new Date(ticket.response_due_date).toLocaleDateString('ru-RU', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}
                  {' в '}
                  {new Date(ticket.response_due_date).toLocaleTimeString('ru-RU', {
                    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow'
                  })}
                  {' МСК'}
                </p>
              </div>
              {responseDeadlineInfo.urgent && (
                <Badge 
                  variant="secondary"
                  className="flex-shrink-0"
                  style={{ backgroundColor: responseDeadlineInfo.color, color: 'white', fontSize: '10px', padding: '2px 6px' }}
                >
                  Срочно
                </Badge>
              )}
            </div>
          ) : null}
        </div>
      )}

      {(ticket.due_date || canEdit) && (
        <div className="p-4" style={deadlineInfo ? { 
          backgroundColor: `${deadlineInfo.color}08`
        } : {}}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
              <Icon name="Calendar" size={14} />
              Дедлайн
            </h3>
            {canEdit && (
              <button
                onClick={() => {
                  setIsEditingDueDate(!isEditingDueDate);
                  if (!isEditingDueDate) {
                    if (ticket.due_date) {
                      const date = new Date(ticket.due_date);
                      const year = date.getFullYear();
                      const month = (date.getMonth() + 1).toString().padStart(2, '0');
                      const day = date.getDate().toString().padStart(2, '0');
                      setDueDateValue(`${year}-${month}-${day}`);
                      setDueTimeValue(`${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`);
                    } else {
                      setDueDateValue('');
                      setDueTimeValue('12:00');
                    }
                  }
                }}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Icon name={isEditingDueDate ? 'X' : 'Edit'} size={12} />
                {isEditingDueDate ? 'Отмена' : 'Изменить'}
              </button>
            )}
          </div>
          
          {isEditingDueDate ? (
            <div className="space-y-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Дата</label>
                <DateMaskedInput
                  value={dueDateValue}
                  onChange={(isoDate) => setDueDateValue(isoDate)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Время (МСК)</label>
                <input
                  type="time"
                  value={dueTimeValue}
                  onChange={(e) => setDueTimeValue(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background text-foreground"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    if (dueDateValue) {
                      const combinedDateTime = `${dueDateValue}T${dueTimeValue}:00+03:00`;
                      onUpdateDueDate!(combinedDateTime);
                    } else {
                      onUpdateDueDate!(null);
                    }
                    setIsEditingDueDate(false);
                  }}
                  className="flex-1"
                >
                  Сохранить
                </Button>
                {ticket.due_date && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onUpdateDueDate!(null);
                      setDueDateValue('');
                      setDueTimeValue('12:00');
                      setIsEditingDueDate(false);
                    }}
                  >
                    <Icon name="Trash2" size={14} />
                  </Button>
                )}
              </div>
            </div>
          ) : ticket.due_date && deadlineInfo ? (
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ 
                backgroundColor: `${deadlineInfo.color}20`
              }}>
                <Icon name={deadlineInfo.urgent ? 'AlertCircle' : 'Clock'} size={16} style={{ color: deadlineInfo.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm mb-0.5" style={{ color: deadlineInfo.color }}>
                  {deadlineInfo.label}
                </p>
                <p className="text-xs" style={{ color: deadlineInfo.color, opacity: 0.75 }}>
                  {new Date(ticket.due_date).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                  {' в '}
                  {new Date(ticket.due_date).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Europe/Moscow'
                  })}
                  {' МСК'}
                </p>
              </div>
              {deadlineInfo.urgent && (
                <Badge 
                  variant="secondary"
                  className="flex-shrink-0"
                  style={{ 
                    backgroundColor: deadlineInfo.color,
                    color: 'white',
                    fontSize: '10px',
                    padding: '2px 6px'
                  }}
                >
                  Срочно
                </Badge>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Не установлен</p>
          )}
        </div>
      )}
    </>
  );
};

export default DeadlineSection;