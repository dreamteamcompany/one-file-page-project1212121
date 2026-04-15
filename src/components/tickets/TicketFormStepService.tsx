import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

interface Service {
  id: number;
  name: string;
  description?: string;
  service_ids?: number[];
}

interface TicketFormStepServiceProps {
  ticketServices: Service[];
  selectedTicketServiceId: string;
  onChangeTicketService: (serviceId: number) => void;
  onNext: () => void;
  onBack: () => void;
}

const TicketFormStepService = ({
  ticketServices,
  selectedTicketServiceId,
  onChangeTicketService,
  onNext,
  onBack,
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2">
          {ticketServices.map((service) => (
            <Card
              key={service.id}
              className={`cursor-pointer transition-all duration-200 ${
                selectedTicketServiceId === service.id.toString()
                  ? 'border-primary border-2 shadow-lg shadow-primary/20 bg-primary/5'
                  : 'hover:border-primary/50 hover:shadow-md'
              }`}
              onClick={() => onChangeTicketService(service.id)}
            >
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-start justify-between gap-2">
                  <span className={selectedTicketServiceId === service.id.toString() ? 'text-primary font-semibold' : ''}>
                    {service.name}
                  </span>
                  {selectedTicketServiceId === service.id.toString() && (
                    <div className="rounded-full bg-primary p-0.5">
                      <Icon name="Check" size={12} className="text-primary-foreground flex-shrink-0" />
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="gap-2"
        >
          <Icon name="ArrowLeft" size={18} />
          Назад
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
