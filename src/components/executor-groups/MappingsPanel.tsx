import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import type {
  ServiceMapping,
  ReferenceTicketService,
  ReferenceService,
} from '@/hooks/useExecutorGroups';

interface MappingsPanelProps {
  mappings: ServiceMapping[];
  ticketServices: ReferenceTicketService[];
  services: ReferenceService[];
  loading: boolean;
  getServicesForTicketService: (ticketServiceId: number) => number[];
  onAdd: (ticketServiceId: number, serviceId: number) => Promise<boolean>;
  onRemove: (mappingId: number) => Promise<boolean>;
}

const MappingsPanel = ({
  mappings,
  ticketServices,
  services,
  loading,
  getServicesForTicketService,
  onAdd,
  onRemove,
}: MappingsPanelProps) => {
  const [selectedTicketService, setSelectedTicketService] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const filteredServices = useMemo(() => {
    if (!selectedTicketService) return [];
    const validServiceIds = getServicesForTicketService(Number(selectedTicketService));
    if (validServiceIds.length === 0) {
      return services;
    }
    return services.filter(s => validServiceIds.includes(s.id));
  }, [selectedTicketService, services, getServicesForTicketService]);

  const handleAdd = async () => {
    if (!selectedTicketService || !selectedService) return;
    setAdding(true);
    const success = await onAdd(Number(selectedTicketService), Number(selectedService));
    setAdding(false);
    if (success) {
      setSelectedTicketService('');
      setSelectedService('');
    }
  };

  const handleRemove = async (mappingId: number) => {
    setRemovingId(mappingId);
    await onRemove(mappingId);
    setRemovingId(null);
  };

  const groupedMappings = useMemo(() => {
    const grouped: Record<string, ServiceMapping[]> = {};
    mappings.forEach(m => {
      const key = m.ticket_service_name;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(m);
    });
    return grouped;
  }, [mappings]);

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Icon name="Link" size={16} />
        Привязки к услугам ({mappings.length})
      </h3>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Select
          value={selectedTicketService}
          onValueChange={(v) => { setSelectedTicketService(v); setSelectedService(''); }}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Услуга" />
          </SelectTrigger>
          <SelectContent>
            {ticketServices.map(ts => (
              <SelectItem key={ts.id} value={String(ts.id)}>{ts.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedService}
          onValueChange={setSelectedService}
          disabled={!selectedTicketService}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Сервис" />
          </SelectTrigger>
          <SelectContent>
            {filteredServices.map(s => (
              <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={handleAdd}
          disabled={!selectedTicketService || !selectedService || adding}
          size="sm"
          className="gap-1"
        >
          {adding ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Plus" size={14} />}
          Добавить
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Icon name="Loader2" size={20} className="animate-spin text-muted-foreground" />
        </div>
      ) : mappings.length === 0 ? (
        <div className="text-center py-6 text-sm text-muted-foreground">
          <Icon name="Unlink" size={24} className="mx-auto mb-2 opacity-30" />
          <p>Привяжите комбинации «услуга + сервис»</p>
          <p className="text-xs mt-1">Когда придёт заявка с такой комбинацией — группа будет назначена автоматически</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedMappings).map(([tsName, items]) => (
            <div key={tsName}>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">{tsName}</p>
              <div className="space-y-1">
                {items.map(mapping => (
                  <div key={mapping.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 text-sm">
                      <Icon name="Server" size={14} className="text-muted-foreground" />
                      <span>{mapping.service_name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      disabled={removingId === mapping.id}
                      onClick={() => handleRemove(mapping.id)}
                    >
                      {removingId === mapping.id
                        ? <Icon name="Loader2" size={12} className="animate-spin" />
                        : <Icon name="X" size={12} />
                      }
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MappingsPanel;
