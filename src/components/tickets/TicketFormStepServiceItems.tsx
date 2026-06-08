import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
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
    <div className="space-y-5 mt-2">
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Выберите сервис</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {filteredServices.map((service) => {
            const isSelected = selectedServices.includes(service.id);
            return (
              <button
                type="button"
                key={service.id}
                onClick={() => onToggleService(service.id)}
                className={`group relative flex items-center lg:items-start gap-4 lg:gap-3 text-left rounded-2xl border px-4 py-4 pr-14 lg:pr-4 transition-all duration-150 ${
                  isSelected
                    ? 'border-primary border-2 bg-primary/[0.04] shadow-sm'
                    : 'border-border bg-card hover:border-primary/40 hover:shadow-md'
                }`}
              >
                <div
                  className={`flex h-12 w-12 lg:h-10 lg:w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                    isSelected ? 'bg-primary/15 text-primary' : 'bg-muted text-primary/80'
                  }`}
                >
                  <Icon name="Building2" size={22} className="lg:hidden" />
                  <Icon name="Building2" size={20} className="hidden lg:block" />
                </div>
                <div className="min-w-0 flex-1 lg:pr-7">
                  <p className="text-base lg:text-sm font-semibold leading-tight text-foreground">
                    {service.name}
                  </p>
                  {service.description && (
                    <p className="mt-1 text-sm lg:text-xs leading-snug text-muted-foreground line-clamp-2">
                      {service.description}
                    </p>
                  )}
                </div>
                <div
                  className={`absolute right-4 top-1/2 -translate-y-1/2 lg:right-3 lg:top-3 lg:translate-y-0 flex h-7 w-7 lg:h-5 lg:w-5 items-center justify-center rounded-full border-2 transition-colors ${
                    isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30 bg-transparent'
                  }`}
                >
                  {isSelected && (
                    <>
                      <Icon name="Check" size={15} className="text-primary-foreground lg:hidden" />
                      <Icon name="Check" size={12} className="text-primary-foreground hidden lg:block" />
                    </>
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