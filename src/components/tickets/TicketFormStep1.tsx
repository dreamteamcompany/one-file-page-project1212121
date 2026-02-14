import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import CompanyStructureInput from '@/components/field-registry/CompanyStructureInput';
import DateMaskedInput from '@/components/ui/date-masked-input';
import PhoneMaskedInput from '@/components/ui/phone-masked-input';

interface TicketService {
  id: number;
  name: string;
  description?: string;
  ticket_title?: string;
  category_id?: number;
  category_name?: string;
  service_ids?: number[];
}

interface Priority {
  id: number;
  name: string;
  color: string;
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

interface TicketFormStep1Props {
  formData: {
    title: string;
    description: string;
    category_id: string;
    priority_id: string;
    due_date: string;
    custom_fields: Record<string, string>;
  };
  setFormData: (data: Record<string, string | number | number[] | Record<string, string>>) => void;
  priorities: Priority[];
  customFields: CustomField[];
  selectedTicketService?: TicketService;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onBack: () => void;
}

type FormData = {
  title: string;
  description: string;
  category_id: string;
  priority_id: string;
  due_date: string;
  custom_fields: Record<string, string>;
};

const updateCustomField = (
  formData: FormData,
  setFormData: (data: Record<string, string | number | number[] | Record<string, string>>) => void,
  fieldId: number,
  value: string
) => {
  setFormData({
    ...formData,
    custom_fields: {
      ...formData.custom_fields,
      [fieldId]: value,
    },
  });
};

const renderCustomField = (
  field: CustomField,
  formData: FormData,
  setFormData: (data: Record<string, string | number | number[] | Record<string, string>>) => void
) => {
  const value = formData.custom_fields[field.id] || '';

  switch (field.field_type) {
    case 'company_structure':
      return (
        <CompanyStructureInput
          value={value ? JSON.parse(value) : undefined}
          onChange={(structValue) =>
            updateCustomField(formData, setFormData, field.id, JSON.stringify(structValue))
          }
        />
      );

    case 'select':
      return (
        <Select
          value={value}
          onValueChange={(v) => updateCustomField(formData, setFormData, field.id, v)}
        >
          <SelectTrigger>
            <SelectValue placeholder={field.placeholder || 'Выберите значение'} />
          </SelectTrigger>
          <SelectContent>
            {(field.options || []).map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case 'checkbox':
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            id={`cf-${field.id}`}
            checked={value === 'true'}
            onCheckedChange={(checked) =>
              updateCustomField(formData, setFormData, field.id, String(checked))
            }
          />
          <label htmlFor={`cf-${field.id}`} className="text-sm cursor-pointer">
            {field.label || field.name}
          </label>
        </div>
      );

    case 'textarea':
      return (
        <Textarea
          value={value}
          onChange={(e) => updateCustomField(formData, setFormData, field.id, e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          required={field.is_required}
        />
      );

    case 'date':
      return (
        <DateMaskedInput
          value={value}
          onChange={(isoDate) => updateCustomField(formData, setFormData, field.id, isoDate)}
          required={field.is_required}
        />
      );

    case 'number':
      return (
        <Input
          type="number"
          value={value}
          onChange={(e) => updateCustomField(formData, setFormData, field.id, e.target.value)}
          placeholder={field.placeholder}
          required={field.is_required}
        />
      );

    case 'email':
      return (
        <Input
          type="email"
          value={value}
          onChange={(e) => updateCustomField(formData, setFormData, field.id, e.target.value)}
          placeholder={field.placeholder || 'example@mail.com'}
          required={field.is_required}
        />
      );

    case 'phone':
      return (
        <PhoneMaskedInput
          value={value}
          onChange={(phone) => updateCustomField(formData, setFormData, field.id, phone)}
          required={field.is_required}
        />
      );

    default:
      return (
        <Input
          value={value}
          onChange={(e) => updateCustomField(formData, setFormData, field.id, e.target.value)}
          placeholder={field.placeholder}
          required={field.is_required}
        />
      );
  }
};

const TicketFormStep1 = ({
  formData,
  setFormData,
  priorities,
  customFields,
  selectedTicketService,
  onSubmit,
  onBack,
}: TicketFormStep1Props) => {
  // Автоматически устанавливаем название заявки из выбранной услуги
  const ticketTitle = selectedTicketService?.ticket_title || '';
  
  return (
    <form onSubmit={onSubmit}>
      <div className="space-y-4 mt-4">
      {ticketTitle && (
        <div className="p-4 bg-accent/30 rounded-lg border">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="Tag" size={16} className="text-muted-foreground" />
            <Label className="text-sm font-medium">Название заявки</Label>
          </div>
          <p className="text-base font-semibold">{ticketTitle}</p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="description">Описание</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="Подробное описание проблемы или запроса"
          rows={4}
        />
      </div>

      <div className="space-y-2">
          <Label htmlFor="priority_id">Приоритет</Label>
          <Select
            value={formData.priority_id}
            onValueChange={(value) =>
              setFormData({ ...formData, priority_id: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Выберите приоритет" />
            </SelectTrigger>
            <SelectContent>
              {priorities.map((priority) => (
                <SelectItem key={priority.id} value={priority.id.toString()}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: priority.color }}
                    />
                    {priority.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
      </div>

      {customFields.length > 0 && (
        <div className="space-y-3 pt-4 border-t">
          <h3 className="font-medium text-sm">Дополнительные поля</h3>
          {customFields.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label>
                {field.name}
                {field.is_required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {renderCustomField(field, formData, setFormData)}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 pt-4">
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
          type="submit"
          className="flex-1 gap-2"
        >
          <Icon name="Send" size={18} />
          Создать заявку
        </Button>
      </div>
      </div>
    </form>
  );
};

export default TicketFormStep1;