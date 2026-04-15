import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Service {
  id: number;
  name: string;
  description: string;
}

interface TicketFormStepServiceItemsProps {
  filteredServices: Service[];
  allServices: Service[];
  selectedServices: number[];
  onToggleService: (serviceId: number) => void;
  onNext: () => void;
  onBack: () => void;
}

const TicketFormStepServiceItems = ({
  filteredServices,
  allServices,
  selectedServices,
  onToggleService,
  onNext,
  onBack,
}: TicketFormStepServiceItemsProps) => {
  return (
    <div className="space-y-4 mt-4">
      <div className="p-4 rounded-lg border border-blue-200 bg-blue-50 text-blue-700">
        <div className="flex items-center gap-2">
          <Icon name="Building2" size={18} />
          <span className="font-medium text-sm">Выберите сервис</span>
        </div>
      </div>

      <div className="space-y-3">
        <Label>Сервис *</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2">
          {filteredServices.map((service) => (
            <Card
              key={service.id}
              className={`cursor-pointer transition-all duration-200 ${
                selectedServices.includes(service.id)
                  ? 'border-primary border-2 shadow-lg shadow-primary/20 bg-primary/5'
                  : 'hover:border-primary/50 hover:shadow-md'
              }`}
              onClick={() => onToggleService(service.id)}
            >
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-start justify-between gap-2">
                  <span className={selectedServices.includes(service.id) ? 'text-primary font-semibold' : ''}>
                    {service.name}
                  </span>
                  {selectedServices.includes(service.id) && (
                    <div className="rounded-full bg-primary p-0.5">
                      <Icon name="Check" size={12} className="text-primary-foreground flex-shrink-0" />
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              {service.description && (
                <CardContent className="pt-0 px-4 pb-3">
                  <CardDescription className="text-xs line-clamp-1">
                    {service.description}
                  </CardDescription>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>

      {selectedServices.length > 0 && (
        <div className="p-3 bg-accent/30 rounded-lg">
          <div className="flex flex-wrap gap-2">
            {selectedServices.map(id => {
              const service = allServices.find(s => s.id === id);
              return service ? (
                <Badge key={id} variant="secondary" className="text-xs">
                  {service.name}
                </Badge>
              ) : null;
            })}
          </div>
        </div>
      )}

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
          disabled={selectedServices.length === 0}
          onClick={onNext}
        >
          Далее
          <Icon name="ArrowRight" size={18} />
        </Button>
      </div>
    </div>
  );
};

export default TicketFormStepServiceItems;
