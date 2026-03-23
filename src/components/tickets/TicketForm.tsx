import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { FIELD_GROUPS_URL, SERVICE_FIELD_MAPPINGS_URL, CLASSIFY_TICKET_URL, apiFetch } from '@/utils/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import TicketFormStep1 from './TicketFormStep1';
import TicketFormStepClassify from './TicketFormStepClassify';
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

interface ClassificationResult {
  ticket_service_id: number;
  service_ids: number[];
  ticket_service_name: string;
  service_names: string[];
  confidence: number;
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
  const [classifying, setClassifying] = useState(false);
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [visibleCustomFields, setVisibleCustomFields] = useState<CustomField[]>([]);

  const handleDialogChange = (open: boolean) => {
    if (open) {
      setStep(1);
      setSelectedServices([]);
      setClassification(null);
      setVisibleCustomFields([]);
      if (onDialogOpen) {
        onDialogOpen();
      }
    }
    setDialogOpen(open);
  };

  const selectedTicketService = ticketServices.find(
    ts => ts.id.toString() === formData.service_id
  );

  const filteredServices = selectedTicketService?.service_ids
    ? services.filter(service => selectedTicketService.service_ids?.includes(service.id))
    : [];

  const classifyTicket = async () => {
    if (!formData.description.trim()) return;

    setClassifying(true);
    try {
      const resp = await apiFetch(CLASSIFY_TICKET_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: formData.description }),
      });

      if (resp.ok) {
        const result: ClassificationResult = await resp.json();
        setClassification(result);
        setFormData({
          ...formData,
          service_id: result.ticket_service_id.toString(),
        });
        setSelectedServices(result.service_ids);
        setStep(2);
      } else {
        setStep(2);
        setClassification(null);
      }
    } catch (err) {
      console.error('[TicketForm] Classification failed:', err);
      setStep(2);
      setClassification(null);
    } finally {
      setClassifying(false);
    }
  };

  const handleNextFromDescription = () => {
    classifyTicket();
  };

  const handleChangeTicketService = (serviceId: number) => {
    setFormData({ ...formData, service_id: serviceId.toString() });
    setSelectedServices([]);
  };

  const toggleService = (serviceId: number) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleNextFromClassify = () => {
    if (visibleCustomFields.length > 0) {
      setStep(3);
    } else {
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      onSubmit(fakeEvent);
    }
  };

  const handleBack = () => {
    if (step === 3) {
      setStep(2);
    } else if (step === 2) {
      setStep(1);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedFormData = {
      ...formData,
      service_ids: selectedServices,
      title: selectedTicketService?.ticket_title || formData.description.slice(0, 100) || 'Новая заявка',
      category_id: '',
    };
    setFormData(updatedFormData);
    await handleSubmit(e, updatedFormData);
    setStep(1);
    setSelectedServices([]);
    setClassification(null);
  };

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

  const availableTicketServices = ticketServices.length > 0 ? ticketServices : services;

  const totalSteps = visibleCustomFields.length > 0 ? 3 : 2;
  const stepLabels = totalSteps === 3
    ? ['Описание', 'Категория', 'Доп. поля']
    : ['Описание', 'Категория'];

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
            {step === 1 && 'Опишите вашу проблему или запрос'}
            {step === 2 && 'Проверьте категорию заявки'}
            {step === 3 && 'Заполните дополнительные поля'}
          </DialogDescription>
        </DialogHeader>

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

        {classifying && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="animate-spin">
              <Icon name="Loader2" size={32} className="text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">ИИ анализирует описание...</p>
          </div>
        )}

        {!classifying && step === 1 && (
          <TicketFormStep1
            formData={formData}
            setFormData={setFormData}
            priorities={priorities}
            selectedTicketService={undefined}
            hasCustomFields={false}
            onNext={handleNextFromDescription}
            onSubmit={async (e) => { e.preventDefault(); handleNextFromDescription(); }}
            onBack={() => handleDialogChange(false)}
            isFirstStep
          />
        )}

        {!classifying && step === 2 && (
          <TicketFormStepClassify
            classification={classification || { ticket_service_id: 0, service_ids: [], ticket_service_name: '', service_names: [], confidence: 0 }}
            ticketServices={availableTicketServices}
            services={services}
            selectedTicketServiceId={formData.service_id}
            selectedServices={selectedServices}
            onChangeTicketService={handleChangeTicketService}
            onToggleService={toggleService}
            onNext={handleNextFromClassify}
            onBack={handleBack}
            filteredServices={filteredServices}
          />
        )}

        {!classifying && step === 3 && (
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