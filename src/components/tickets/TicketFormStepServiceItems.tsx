import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { Label } from '@/components/ui/label';
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto pr-2">
          {filteredServices.map((service) => {
            const isSelected = selectedServices.includes(service.id);
            return (
              <button
                type="button"
                key={service.id}
                onClick={() => onToggleService(service.id)}
                className={`group flex items-start gap-3 text-left rounded-xl border-2 px-3.5 py-3 transition-all duration-150 ${
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
                  <Icon name="Building2" size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-sm leading-tight ${isSelected ? 'font-semibold text-primary' : 'font-medium text-foreground'}`}>
                      {service.name}
                    </span>
                    {isSelected && (
                      <div className="rounded-full bg-primary p-0.5 shrink-0">
                        <Icon name="Check" size={12} className="text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  {service.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {service.description}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
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