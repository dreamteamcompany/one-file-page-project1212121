import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';

interface TicketTimerCardProps {
  dueDate?: string;
}

const TicketTimerCard = ({ dueDate }: TicketTimerCardProps) => {
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    if (!dueDate) return;
    
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [dueDate]);

  const getTimeLeft = () => {
    if (!dueDate) return null;
    
    const due = new Date(dueDate).getTime();
    const diff = due - currentTime;
    
    if (diff < 0) {
      return { time: '00:00:00', expired: true };
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { 
      days,
      time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`, 
      expired: false 
    };
  };

  if (!dueDate) return null;

  return (
    <div className="p-4 rounded-lg bg-card border flex flex-col md:h-[380px] lg:h-auto">
      <div className="flex flex-col items-center flex-1 justify-center">
        <h3 className="text-sm font-semibold mb-4 text-foreground">Времени осталось</h3>
        <div className={`w-24 h-24 rounded-full ${getTimeLeft()?.expired ? 'bg-red-500/10 border-red-500' : 'bg-muted'} border-2 flex items-center justify-center mb-4`}>
          <Icon name="Clock" size={32} className={getTimeLeft()?.expired ? 'text-red-500' : 'text-foreground'} />
        </div>
        {getTimeLeft()?.expired ? (
          <div className="text-center">
            <div className="text-3xl font-bold text-red-500">Просрочено</div>
          </div>
        ) : (
          <div className="text-center">
            {getTimeLeft() && getTimeLeft()!.days > 0 && (
              <div className="text-sm text-muted-foreground mb-2">
                {getTimeLeft()!.days} {getTimeLeft()!.days === 1 ? 'день' : getTimeLeft()!.days < 5 ? 'дня' : 'дней'}
              </div>
            )}
            <div className="text-3xl font-bold text-foreground tabular-nums">
              {getTimeLeft()?.time}
            </div>
            <div className="text-xs text-muted-foreground mt-1">ЧЧ : ММ : СС</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketTimerCard;
