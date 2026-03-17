import { useState, useEffect, useCallback } from 'react';
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
import TicketFormStep4 from './TicketFormStep4';

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

  const handleNextToCustomFields = () => {
    setStep(4);
  };

  const handleBack = () => {
    if (step === 4) {
      setStep(3);
    } else if (step === 3) {
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

  const [visibleCustomFields, setVisibleCustomFields] = useState<CustomField[]>([]);

  const loadVisibleFields = useCallback(async () => {
    if (!formData.service_id || selectedServices.length === 0) {
      setVisibleCustomFields([]);
      return;
    }

    try {
      const [mappingsResponse, groupsResponse] = await Promise.all([
        apiFetch(SERVICE_FIELD_MAPPINGS_URL),
        apiFetch(FIELD_GROUPS_URL),
      ]);

      if (!mappingsResponse.ok || !groupsResponse.ok) {
        setVisibleCustomFields([]);
        return;
      }

      const [mappings, fieldGroups] = await Promise.all([
        mappingsResponse.json(),
        groupsResponse.json(),
      ]);

      const relevantGroupIds = new Set<number>();
      const ticketServiceId = parseInt(formData.service_id);

      selectedServices.forEach(serviceId => {
        mappings
          .filter(
            (m: { ticket_service_id: number; service_id: number }) =>
              m.ticket_service_id === ticketServiceId && m.service_id === serviceId
          )
          .forEach((m: { field_group_id: number }) => relevantGroupIds.add(m.field_group_id));
      });

      if (relevantGroupIds.size === 0) {
        setVisibleCustomFields([]);
        return;
      }

      const allFields: CustomField[] = [];
      fieldGroups.forEach((group: { id: number; fields: CustomField[] }) => {
        if (relevantGroupIds.has(group.id) && group.fields) {
          group.fields.forEach((field: CustomField) => {
            if (!allFields.find(f => f.id === field.id)) {
              allFields.push(field);
            }
          });
        }
      });

      setVisibleCustomFields(allFields);
    } catch (error) {
      console.error('[TicketForm] Error loading custom fields:', error);
      setVisibleCustomFields([]);
    }
  }, [formData.service_id, selectedServices]);

  useEffect(() => {
    loadVisibleFields();
  }, [loadVisibleFields]);

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
          </DialogTitle>
          <DialogDescription className="text-sm">
            {step === 1 && '🎯 Выберите услугу для вашей заявки'}
            {step === 2 && '🔧 Выберите сервисы для услуги'}
            {step === 3 && '📝 Заполните основную информацию о заявке'}
            {step === 4 && '📋 Заполните дополнительные поля'}
          </DialogDescription>
        </DialogHeader>

        {/* Прогресс-бар */}
        {(() => {
          const totalSteps = visibleCustomFields.length > 0 ? 4 : 3;
          const stepLabels = totalSteps === 4
            ? ['Услуга', 'Сервисы', 'Описание', 'Доп. поля']
            : ['Услуга', 'Сервисы', 'Описание'];
          return (
            <div className="mt-2 mb-1">
              <div className="flex items-center gap-0">
                {stepLabels.map((label, index) => {
                  const stepNum = index + 1;
                  const isCompleted = step > stepNum;
                  const isCurrent = step === stepNum;
                  return (
                    <div key={stepNum} className="flex items-center flex-1 last:flex-none">
                      <div className="flex flex-col items-center gap-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                          isCompleted
                            ? 'bg-primary text-primary-foreground'
                            : isCurrent
                            ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {isCompleted ? <Icon name="Check" size={14} /> : stepNum}
                        </div>
                        <span className={`text-[10px] whitespace-nowrap ${isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                          {label}
                        </span>
                      </div>
                      {index < stepLabels.length - 1 && (
                        <div className={`flex-1 h-[2px] mb-4 mx-1 rounded transition-all ${step > stepNum ? 'bg-primary' : 'bg-muted'}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}



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
        ) : step === 3 ? (
          <TicketFormStep1
            formData={formData}
            setFormData={setFormData}
            priorities={priorities}
            selectedTicketService={selectedTicketService}
            hasCustomFields={visibleCustomFields.length > 0}
            onNext={visibleCustomFields.length > 0 ? handleNextToCustomFields : undefined}
            onSubmit={onSubmit}
            onBack={handleBack}
          />
        ) : (
          <TicketFormStep4
            formData={formData}
            setFormData={setFormData}
            customFields={visibleCustomFields}
            onSubmit={onSubmit}
            onBack={handleBack}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TicketForm;