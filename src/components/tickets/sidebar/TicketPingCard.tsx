import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

interface TicketPingCardProps {
  onSendPing?: () => void;
  sendingPing?: boolean;
}

const TicketPingCard = ({ onSendPing, sendingPing = false }: TicketPingCardProps) => {
  if (!onSendPing) return null;

  return (
    <div className="p-4 rounded-lg bg-card border flex flex-col justify-center md:h-[380px] lg:h-auto">
      <Button
        onClick={onSendPing}
        disabled={sendingPing}
        size="lg"
        className="w-full font-semibold bg-orange-500 hover:bg-orange-600 text-white flex-shrink-0"
      >
        {sendingPing ? (
          <>
            <Icon name="Loader2" size={18} className="mr-2 animate-spin" />
            Отправка запроса...
          </>
        ) : (
          <>
            <Icon name="Bell" size={18} className="mr-2" />
            Запросить статус
          </>
        )}
      </Button>
      <p className="text-xs text-orange-700 dark:text-orange-400 mt-2 text-center">
        Уведомить исполнителя о необходимости обновить статус
      </p>
    </div>
  );
};

export default TicketPingCard;
