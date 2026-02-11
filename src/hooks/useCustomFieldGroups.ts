import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export interface Field {
  id: number;
  name: string;
  field_type: string;
  options?: string[];
  placeholder?: string;
  label?: string;
  description?: string;
  required?: boolean;
  created_at?: string;
}

export interface FieldGroup {
  id: number;
  name: string;
  description?: string;
  field_ids: number[];
  created_at?: string;
}

export const fieldTypes = [
  { value: 'text', label: 'Текст', icon: 'Type' },
  { value: 'number', label: 'Число', icon: 'Hash' },
  { value: 'date', label: 'Дата', icon: 'Calendar' },
  { value: 'select', label: 'Выбор из списка', icon: 'List' },
  { value: 'checkbox', label: 'Флажок', icon: 'CheckSquare' },
  { value: 'textarea', label: 'Многострочный текст', icon: 'AlignLeft' },
  { value: 'email', label: 'Email', icon: 'Mail' },
  { value: 'phone', label: 'Телефон', icon: 'Phone' },
  { value: 'file', label: 'Файл', icon: 'FileText' },
];

export const useCustomFieldGroups = () => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [fieldGroups, setFieldGroups] = useState<FieldGroup[]>([]);
  const [availableFields, setAvailableFields] = useState<Field[]>([]);

  useEffect(() => {
    if (!hasPermission('custom_field_groups', 'read')) {
      navigate('/tickets');
      return;
    }
    const savedFields = localStorage.getItem('fieldRegistry');
    if (savedFields) {
      setAvailableFields(JSON.parse(savedFields));
    }

    const savedGroups = localStorage.getItem('customFieldGroups');
    if (savedGroups) {
      setFieldGroups(JSON.parse(savedGroups));
    } else {
      const mockGroups: FieldGroup[] = [
        {
          id: 1,
          name: 'Данные организации',
          description: 'Основные данные об организации',
          field_ids: [1, 2],
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          name: 'Контактная информация',
          description: 'Контакты для связи',
          field_ids: [1, 2],
          created_at: new Date().toISOString(),
        },
      ];
      setFieldGroups(mockGroups);
      localStorage.setItem('customFieldGroups', JSON.stringify(mockGroups));
    }
  }, [hasPermission, navigate]);

  const saveFieldGroup = (
    formData: { name: string; description: string; field_ids: number[] },
    editingGroup: FieldGroup | null
  ) => {
    const requiredPermission = editingGroup ? 'update' : 'create';
    if (!hasPermission('custom_field_groups', requiredPermission)) {
      alert('У вас нет прав для этой операции');
      return;
    }
    
    let updatedGroups: FieldGroup[];
    if (editingGroup) {
      updatedGroups = fieldGroups.map(g => 
        g.id === editingGroup.id 
          ? { ...g, name: formData.name, description: formData.description, field_ids: formData.field_ids }
          : g
      );
    } else {
      const newGroup: FieldGroup = {
        id: Math.max(0, ...fieldGroups.map(g => g.id)) + 1,
        name: formData.name,
        description: formData.description,
        field_ids: formData.field_ids,
        created_at: new Date().toISOString(),
      };
      updatedGroups = [...fieldGroups, newGroup];
    }
    
    setFieldGroups(updatedGroups);
    localStorage.setItem('customFieldGroups', JSON.stringify(updatedGroups));
  };

  const deleteFieldGroup = (id: number) => {
    if (!hasPermission('custom_field_groups', 'remove')) {
      alert('У вас нет прав для удаления групп полей');
      return;
    }
    if (!confirm('Вы уверены, что хотите удалить эту сущность?')) return;
    const updatedGroups = fieldGroups.filter(g => g.id !== id);
    setFieldGroups(updatedGroups);
    localStorage.setItem('customFieldGroups', JSON.stringify(updatedGroups));
  };

  const getFieldTypeLabel = (type: string) => {
    return fieldTypes.find(ft => ft.value === type)?.label || type;
  };

  const getFieldTypeIcon = (type: string) => {
    return fieldTypes.find(ft => ft.value === type)?.icon || 'HelpCircle';
  };

  const getFieldById = (id: number) => {
    return availableFields.find(f => f.id === id);
  };

  return {
    fieldGroups,
    availableFields,
    saveFieldGroup,
    deleteFieldGroup,
    getFieldTypeLabel,
    getFieldTypeIcon,
    getFieldById,
  };
};
