import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { Label } from '@/components/ui/label';

interface Service {
  id: number;
  name: string;
  description?: string;
  service_ids?: number[];
}

const getServiceIcon = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes('заблок')) return 'Lock';
  if (n.includes('разблок')) return 'LockOpen';
  if (n.includes('доступ') && n.includes('предостав')) return 'KeyRound';
  if (n.includes('права') || n.includes('доступ')) return 'ShieldCheck';
  if (n.includes('оплат') || n.includes('счет') || n.includes('лиценз')) return 'CreditCard';
  if (n.includes('домен')) return 'Globe';
  if (n.includes('аналит') || n.includes('отчет')) return 'BarChart3';
  if (n.includes('доработ') || n.includes('разработ')) return 'Code';
  if (n.includes('сервер') || n.includes('банк')) return 'Server';
  if (n.includes('сим') || n.includes('карт')) return 'CreditCard';
  if (n.includes('проблем') || n.includes('ошибк') || n.includes('баг')) return 'AlertTriangle';
  if (n.includes('синхрон')) return 'RefreshCw';
  if (n.includes('регистр') || n.includes('приложен')) return 'Smartphone';
  if (n.includes('wazzup') || n.includes('чат') || n.includes('сообщен')) return 'MessageCircle';
  return 'Wrench';
};

interface TicketFormStepServiceProps {
  ticketServices: Service[];
  selectedTicketServiceId: string;
  onChangeTicketService: (serviceId: number) => void;
  onNext: () => void;
  onBack: () => void;
  isFirstStep?: boolean;
}

const TicketFormStepService = ({
  ticketServices,
  selectedTicketServiceId,
  onChangeTicketService,
  onNext,
  onBack,
  isFirstStep,
}: TicketFormStepServiceProps) => {
  return (
    <div className="space-y-4 mt-4">
      <div className="p-4 rounded-lg border border-blue-200 bg-blue-50 text-blue-700">
        <div className="flex items-center gap-2">
          <Icon name="Wrench" size={18} />
          <span className="font-medium text-sm">Выберите услугу</span>
        </div>
      </div>

      <div className="space-y-3">
        <Label>Услуга *</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto pr-2">
          {ticketServices.map((service) => {
            const isSelected = selectedTicketServiceId === service.id.toString();
            return (
              <button
                type="button"
                key={service.id}
                onClick={() => onChangeTicketService(service.id)}
                className={`group flex items-center gap-3 text-left rounded-xl border-2 px-3.5 py-3 transition-all duration-150 ${
                  isSelected
                    ? 'border-primary bg-primary/15 shadow-md shadow-primary/20'
                    : 'border-border bg-muted/40 hover:border-primary/60 hover:bg-muted/70 hover:shadow-sm'
                }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background/60 text-muted-foreground group-hover:text-primary'
                  }`}
                >
                  <Icon name={getServiceIcon(service.name)} size={18} />
                </div>
                <span className={`flex-1 text-sm leading-tight ${isSelected ? 'font-semibold text-primary' : 'font-medium text-foreground'}`}>
                  {service.name}
                </span>
                {isSelected && (
                  <div className="rounded-full bg-primary p-0.5 shrink-0">
                    <Icon name="Check" size={12} className="text-primary-foreground" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="gap-2"
        >
          {isFirstStep ? (
            <>
              <Icon name="X" size={18} />
              Отмена
            </>
          ) : (
            <>
              <Icon name="ArrowLeft" size={18} />
              Назад
            </>
          )}
        </Button>
        <Button
          type="button"
          className="flex-1 gap-2"
          disabled={!selectedTicketServiceId}
          onClick={onNext}
        >
          Далее
          <Icon name="ArrowRight" size={18} />
        </Button>
      </div>
    </div>
  );
};

export default TicketFormStepService;