import Icon from '@/components/ui/icon';
import { isoToDisplay } from '@/components/ui/date-masked-input';
import { displayFromStorage as phoneDisplay } from '@/components/ui/phone-masked-input';
import { Ticket } from './TicketDetailsContent.types';

interface TicketCustomFieldsProps {
  ticket: Ticket;
  isShortDescription: boolean;
  copiedFieldId: number | null;
  setCopiedFieldId: (id: number | null) => void;
  canCallPhone: boolean;
}

const TicketCustomFields = ({
  ticket,
  isShortDescription,
  copiedFieldId,
  setCopiedFieldId,
  canCallPhone,
}: TicketCustomFieldsProps) => {
  const hasContent =
    (ticket.custom_fields && ticket.custom_fields.length > 0) ||
    ticket.ticket_service ||
    (ticket.services && ticket.services.length > 0);

  if (!hasContent) return null;

  return (
    <div className={`w-full ${isShortDescription ? '' : 'md:w-[420px]'} flex-shrink-0 flex flex-col self-stretch`}>
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Icon name="Settings" size={16} className="text-muted-foreground" />
        Дополнительные поля
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {ticket.ticket_service && (
          <div className="p-3 rounded-lg bg-muted/30 border col-span-2">
            <p className="text-xs text-muted-foreground mb-1">Услуга</p>
            <p className="text-sm font-medium text-foreground">{ticket.ticket_service.name}</p>
          </div>
        )}
        {ticket.services && ticket.services.length > 0 && ticket.services.map((service) => (
          <div key={service.id} className="p-3 rounded-lg bg-muted/30 border col-span-2">
            <p className="text-xs text-muted-foreground mb-1">Сервис</p>
            <p className="text-sm font-medium text-foreground">{service.name}</p>
            {service.category_name && (
              <p className="text-xs text-muted-foreground mt-0.5">{service.category_name}</p>
            )}
          </div>
        ))}
        {ticket.custom_fields?.map((field) => {
          const rawValue = field.display_value || field.value || '—';
          const displayText = (field.field_type === 'checkbox' || field.field_type === 'toggle')
            ? (rawValue === 'true' || rawValue === 'True' ? 'Да' : rawValue === 'false' || rawValue === 'False' ? 'Нет' : rawValue)
            : field.field_type === 'date' && rawValue !== '—'
              ? (isoToDisplay(rawValue) || rawValue)
              : field.field_type === 'phone' && rawValue !== '—'
                ? phoneDisplay(rawValue)
                : rawValue;
          const isLongValue = displayText.length > 25 || field.name.length > 20;
          const isChain = field.field_type === 'company_structure' && displayText.includes('→');
          const isPhone = field.field_type === 'phone';
          const canCopy = rawValue !== '—';
          const isCopied = copiedFieldId === field.id;
          const phoneRaw = isPhone ? (field.value || '').replace(/\D/g, '') : '';
          const handleFieldCopy = () => {
            if (!canCopy) return;
            navigator.clipboard.writeText(isPhone ? phoneRaw : displayText);
            setCopiedFieldId(field.id);
            setTimeout(() => setCopiedFieldId(null), 1500);
          };
          return (
            <div
              key={field.id}
              onClick={handleFieldCopy}
              className={`p-3 rounded-lg bg-muted/30 border ${isLongValue ? 'col-span-2' : ''} ${canCopy ? 'cursor-pointer hover:bg-muted/50 active:bg-muted/70 transition-colors relative group' : ''}`}
            >
              {!field.hide_label && <p className="text-xs text-muted-foreground mb-1 truncate">{field.name}</p>}
              {isChain ? (
                <p className="text-sm text-foreground break-words">
                  {displayText.split('→').slice(0, -1).map((part, i) => (
                    <span key={i} className="text-muted-foreground">{part.trim()}{' → '}</span>
                  ))}
                  <span className="font-bold text-foreground">{displayText.split('→').pop()?.trim()}</span>
                </p>
              ) : isPhone ? (
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground break-words">{displayText}</p>
                  {canCallPhone && phoneRaw && (
                    <a
                      href={`tel:+${phoneRaw}`}
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 w-7 h-7 rounded-full bg-green-500/15 hover:bg-green-500/25 active:bg-green-500/35 flex items-center justify-center transition-colors"
                    >
                      <Icon name="Phone" size={14} className="text-green-600" />
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-sm font-medium text-foreground break-words">{displayText}</p>
              )}
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
  );
};

export default TicketCustomFields;
