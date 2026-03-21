import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { isoToDisplay } from '@/components/ui/date-masked-input';
import { displayFromStorage as phoneDisplay } from '@/components/ui/phone-masked-input';

interface CustomField {
  id: number;
  name: string;
  field_type: string;
  value: string;
  hide_label?: boolean;
}

interface Ticket {
  id: number;
  title: string;
  description?: string;
  category_name?: string;
  category_icon?: string;
  priority_id?: number;
  priority_name?: string;
  priority_color?: string;
  status_id?: number;
  status_name?: string;
  status_color?: string;
  department_name?: string;
  created_by: number;
  creator_name?: string;
  creator_email?: string;
  assigned_to?: number;
  assignee_name?: string;
  assignee_email?: string;
  due_date?: string;
  created_at?: string;
  updated_at?: string;
  closed_at?: string;
  custom_fields?: CustomField[];
}

interface TicketDetailsInfoProps {
  ticket: Ticket;
}

const SHORT_VALUE_THRESHOLD = 25;
const SHORT_NAME_THRESHOLD = 20;

const isShortField = (field: CustomField): boolean => {
  const valueLength = (field.value || '').length;
  const nameLength = field.name.length;
  return valueLength <= SHORT_VALUE_THRESHOLD && nameLength <= SHORT_NAME_THRESHOLD;
};

const getDisplayValue = (field: CustomField): string => {
  if (field.field_type === 'date' && field.value) return isoToDisplay(field.value) || field.value;
  if (field.field_type === 'phone' && field.value) return phoneDisplay(field.value);
  return field.value || '—';
};

const TicketDetailsInfo = ({ ticket }: TicketDetailsInfoProps) => {
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleCopy = (field: CustomField) => {
    if (field.field_type === 'phone' || !field.value) return;
    const text = getDisplayValue(field);
    navigator.clipboard.writeText(text);
    setCopiedId(field.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="space-y-6">
      {ticket.description && (
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground flex items-center gap-2">
            <Icon name="FileText" size={16} />
            Описание
          </h3>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
        </div>
      )}

      {ticket.custom_fields && ticket.custom_fields.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground flex items-center gap-2">
            <Icon name="Settings" size={16} />
            Дополнительные поля
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {ticket.custom_fields.map((field) => {
              const isPhone = field.field_type === 'phone';
              const canCopy = !isPhone && !!field.value;
              const isCopied = copiedId === field.id;

              return (
                <div
                  key={field.id}
                  onClick={() => handleCopy(field)}
                  className={`p-3 rounded-lg bg-muted/50 ${isShortField(field) ? '' : 'col-span-2'} ${canCopy ? 'cursor-pointer hover:bg-muted/80 transition-colors group relative' : ''}`}
                >
                  {!field.hide_label && <p className="text-xs text-muted-foreground mb-1">{field.name}</p>}
                  <p className="text-sm break-words">
                    {getDisplayValue(field)}
                  </p>
                  {canCopy && (
                    <span className={`absolute top-2 right-2 transition-opacity ${isCopied ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`}>
                      {isCopied ? (
                        <span className="flex items-center gap-1 text-xs text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded">
                          <Icon name="Check" size={12} />
                          Скопировано
                        </span>
                      ) : (
                        <Icon name="Copy" size={14} className="text-muted-foreground" />
                      )}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketDetailsInfo;