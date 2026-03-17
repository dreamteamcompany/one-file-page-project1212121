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

interface CustomField {
  id: number;
  name: string;
  field_type: string;
  is_required: boolean;
  options?: string[];
  placeholder?: string;
  label?: string;
  hide_label?: boolean;
}

type FormData = {
  title: string;
  description: string;
  category_id: string;
  priority_id: string;
  due_date: string;
  custom_fields: Record<string, string>;
};

interface TicketFormStep4Props {
  formData: FormData;
  setFormData: (data: Record<string, string | number | number[] | Record<string, string>>) => void;
  customFields: CustomField[];
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onBack: () => void;
}

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

const TicketFormStep4 = ({
  formData,
  setFormData,
  customFields,
  onSubmit,
  onBack,
}: TicketFormStep4Props) => {
  return (
    <form onSubmit={onSubmit}>
      <div className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-3">
          {customFields.map((field) => {
            const isWide = ['textarea', 'company_structure'].includes(field.field_type);
            return (
              <div key={field.id} className={`space-y-2 ${isWide ? 'col-span-2' : ''}`}>
                {!field.hide_label && (
                  <Label>
                    {field.name}
                    {field.is_required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                )}
                {renderCustomField(field, formData, setFormData)}
              </div>
            );
          })}
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
          <Button type="submit" className="flex-1 gap-2">
            <Icon name="Send" size={18} />
            Создать заявку
          </Button>
        </div>
      </div>
    </form>
  );
};

export default TicketFormStep4;
