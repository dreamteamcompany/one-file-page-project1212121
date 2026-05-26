import Icon from '@/components/ui/icon';

interface TicketCommentsBlockedProps {
  commentsBlockedMessage?: string;
}

const TicketCommentsBlocked = ({ commentsBlockedMessage }: TicketCommentsBlockedProps) => {
  return (
    <div className="rounded-lg border border-orange-500/40 bg-orange-500/10 p-4 flex items-start gap-3">
      <Icon name="AlertTriangle" size={20} className="text-orange-500 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-orange-400">Комментирование заблокировано</p>
        <p className="text-xs text-muted-foreground mt-1">
          {commentsBlockedMessage || 'Для продолжения работы необходимо изменить статус заявки.'}
        </p>
      </div>
    </div>
  );
};

export default TicketCommentsBlocked;
