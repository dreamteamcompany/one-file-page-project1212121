import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { FIELD_GROUPS_URL, SERVICE_FIELD_MAPPINGS_URL, apiFetch } from '@/utils/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import TicketFormStep1 from './TicketFormStep1';
import TicketFormStep2 from './TicketFormStep2';
import TicketFormStep3 from './TicketFormStep3';

interface Category {
  id: number;
  name: string;
  icon: string;
}

interface Priority {
  id: number;
  name: string;
  color: string;
}

interface Status {
  id: number;
  name: string;
}

interface Department {
  id: number;
  name: string;
}

interface CustomField {
  id: number;
  name: string;
  field_type: string;
  is_required: boolean;
  options?: string[];
  placeholder?: string;
  label?: string;
}

interface Service {
  id: number;
  name: string;
  description: string;
  ticket_title?: string;
  category_id?: number;
  category_name?: string;
  service_ids?: number[];
}

interface TicketFormProps {
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  formData: {
    title: string;
    description: string;
    category_id: string;
    priority_id: string;
    status_id: string;
    service_id: string;
    service_ids: number[];
    due_date: string;
    custom_fields: Record<string, string>;
  };
  setFormData: (data: Record<string, string | number | number[] | Record<string, string>>) => void;
  categories: Category[];
  priorities: Priority[];
  statuses: Status[];
  departments: Department[];
  customFields: CustomField[];
  services: Service[];
  ticketServices?: Service[];
  handleSubmit: (e: React.FormEvent, overrideData?: Record<string, string | number | number[] | Record<string, string>>) => Promise<void>;
  onDialogOpen?: () => void;
  canCreate?: boolean;
}

const TicketForm = ({
  dialogOpen,
  setDialogOpen,
  formData,
  setFormData,
  categories,
  priorities,
  statuses,
  departments,
  customFields,
  services,
  ticketServices = [],
  handleSubmit,
  onDialogOpen,
  canCreate = true,
}: TicketFormProps) => {
  const [step, setStep] = useState(1);
  const [selectedServices, setSelectedServices] = useState<number[]>([]);


  
  console.log('[TicketForm] Current step:', step, 'Dialog open:', dialogOpen);

  const handleNext = () => {
    if (!formData.service_id) {
      return;
    }
    setStep(2);
  };

  const handleNextToServices = () => {
    setStep(3);
  };

  const handleBack = () => {
    if (step === 3) {
      setStep(2);
    } else {
      setStep(1);
    }
  };

  const handleServiceSelect = (serviceId: number) => {
    setFormData({ ...formData, service_id: serviceId.toString() });
  };

  const handleDialogChange = (open: boolean) => {
    if (open) {
      // При открытии диалога всегда сбрасываем на шаг 1
      setStep(1);
      setSelectedServices([]);
      if (onDialogOpen) {
        onDialogOpen();
      }
    }
    setDialogOpen(open);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Автоматически проставляем title из выбранной услуги
    // НЕ передаем category_id, так как он относится к ticket_service_categories, а не ticket_categories
    const updatedFormData = { 
      ...formData, 
      service_ids: selectedServices,
      title: selectedTicketService?.ticket_title || formData.title || 'Новая заявка',
      category_id: '', // Оставляем пустым, чтобы не нарушать FK constraint
    };
    
    // Обновляем formData синхронно
    setFormData(updatedFormData);
    
    // Отправляем обновленные данные
    await handleSubmit(e, updatedFormData);
    
    // Сбрасываем состояние формы после успешной отправки
    setStep(1);
    setSelectedServices([]);
  };

  const toggleService = (serviceId: number) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  // Находим выбранную услугу заявки
  const selectedTicketService = ticketServices.find(
    ts => ts.id.toString() === formData.service_id
  );
  
  // Фильтруем сервисы по service_ids из выбранной услуги
  const filteredServices = selectedTicketService?.service_ids
    ? services.filter(service => selectedTicketService.service_ids?.includes(service.id))
    : [];
  
  const availableTicketServices = ticketServices.length > 0 ? ticketServices : services;

  // Фильтруем дополнительные поля по связям услуга-сервисы-поля (загружаем из БД)
  const [visibleCustomFields, setVisibleCustomFields] = useState<CustomField[]>([]);
  
  useMemo(() => {
    const loadVisibleFields = async () => {
      console.log('[TicketForm] Filtering custom fields:', {
        service_id: formData.service_id,
        selectedServices,
        customFieldsCount: customFields.length,
        step
      });

      if (!formData.service_id || selectedServices.length === 0) {
        console.log('[TicketForm] No service_id or selectedServices, returning []');
        setVisibleCustomFields([]);
        return;
      }

      try {
        // Загружаем связи из БД
        const mappingsResponse = await apiFetch(SERVICE_FIELD_MAPPINGS_URL);
        if (!mappingsResponse.ok) {
          console.error('[TicketForm] Failed to load mappings');
          setVisibleCustomFields([]);
          return;
        }
        
        const mappings = await mappingsResponse.json();
        console.log('[TicketForm] Loaded mappings:', mappings);
        
        // Находим релевантные group_id для выбранных услуг и сервисов
        const relevantGroupIds = new Set<number>();
        
        selectedServices.forEach(serviceId => {
          const relevantMappings = mappings.filter(
            (m: {ticket_service_id: number; service_id: number; field_group_id: number}) => 
              m.ticket_service_id === parseInt(formData.service_id) && m.service_id === serviceId
          );
          console.log(`[TicketForm] Mappings for service ${serviceId}:`, relevantMappings);
          relevantMappings.forEach((m: {field_group_id: number}) => relevantGroupIds.add(m.field_group_id));
        });
        
        console.log('[TicketForm] Relevant group IDs:', Array.from(relevantGroupIds));
        
        if (relevantGroupIds.size === 0) {
          setVisibleCustomFields([]);
          return;
        }
        
        // Загружаем группы полей с полями из БД
        const groupsResponse = await apiFetch(FIELD_GROUPS_URL);
        if (!groupsResponse.ok) {
          console.error('[TicketForm] Failed to load field groups');
          setVisibleCustomFields([]);
          return;
        }
        
        const fieldGroups = await groupsResponse.json();
        console.log('[TicketForm] Loaded field groups:', fieldGroups);
        
        // Собираем все поля из релевантных групп
        const allFields: CustomField[] = [];
        fieldGroups.forEach((group: {id: number; fields: CustomField[]}) => {
          if (relevantGroupIds.has(group.id) && group.fields) {
            console.log(`[TicketForm] Adding fields from group ${group.id}:`, group.fields);
            group.fields.forEach((field: CustomField) => {
              // Избегаем дубликатов
              if (!allFields.find(f => f.id === field.id)) {
                allFields.push(field);
              }
            });
          }
        });
        
        console.log('[TicketForm] Visible custom fields:', allFields);
        setVisibleCustomFields(allFields);
      } catch (error) {
        console.error('[TicketForm] Error filtering custom fields:', error);
        setVisibleCustomFields([]);
      }
    };
    
    loadVisibleFields();
  }, [formData.service_id, selectedServices, step]);

  return (
    <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
      {canCreate && (
        <DialogTrigger asChild>
          <Button size="lg" className="gap-2 shadow-lg">
            <Icon name="Plus" size={20} />
            Создать заявку
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="TicketPlus" size={24} />
            Новая заявка
            <Badge variant="secondary" className="ml-auto text-xs">
              Шаг {step} из 3
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-sm">
            {step === 1 && '🎯 Выберите услугу для вашей заявки'}
            {step === 2 && '🔧 Выберите сервисы для услуги'}
            {step === 3 && '📝 Заполните основную информацию о заявке'}
          </DialogDescription>
        </DialogHeader>



        {step === 1 ? (
          <TicketFormStep2
            formData={formData}
            availableTicketServices={availableTicketServices}
            onServiceSelect={handleServiceSelect}
            onNext={handleNext}
            onBack={() => handleDialogChange(false)}
          />
        ) : step === 2 ? (
          <TicketFormStep3
            filteredServices={filteredServices}
            selectedServices={selectedServices}
            onToggleService={toggleService}
            onNext={handleNextToServices}
            onBack={handleBack}
          />
        ) : (
          <TicketFormStep1
            formData={formData}
            setFormData={setFormData}
            priorities={priorities}
            customFields={visibleCustomFields}
            selectedTicketService={selectedTicketService}
            onSubmit={onSubmit}
            onBack={handleBack}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TicketForm;