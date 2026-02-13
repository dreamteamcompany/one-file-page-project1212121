import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { FIELD_GROUPS_URL, apiFetch } from '@/utils/api';

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
  is_required?: boolean;
}

export interface FieldGroup {
  id: number;
  name: string;
  description?: string;
  fields?: Field[];
  created_at?: string;
  updated_at?: string;
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

  const loadFieldGroups = useCallback(async () => {
    try {
      const response = await apiFetch(FIELD_GROUPS_URL);
      if (response.ok) {
        const data = await response.json();
        setFieldGroups(data);
      }
    } catch (error) {
      console.error('Failed to load field groups:', error);
    }
  }, []);

  const loadAvailableFields = useCallback(async () => {
    try {
      const response = await apiFetch(`${FIELD_GROUPS_URL}?entity=fields`);
      if (response.ok) {
        const data = await response.json();
        setAvailableFields(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to load available fields:', error);
    }
  }, []);

  useEffect(() => {
    if (!hasPermission('custom_field_groups', 'read')) {
      navigate('/tickets');
      return;
    }
    loadFieldGroups();
    loadAvailableFields();
  }, [hasPermission, navigate, loadFieldGroups, loadAvailableFields]);

  const saveFieldGroup = async (
    formData: { name: string; description: string; field_ids: number[] },
    editingGroup: FieldGroup | null
  ) => {
    const requiredPermission = editingGroup ? 'update' : 'create';
    if (!hasPermission('custom_field_groups', requiredPermission)) {
      alert('У вас нет прав для этой операции');
      return;
    }
    
    try {
      const method = editingGroup ? 'PUT' : 'POST';
      const body = editingGroup 
        ? { id: editingGroup.id, ...formData }
        : formData;

      const response = await apiFetch(FIELD_GROUPS_URL, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await loadFieldGroups();
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error || 'Не удалось сохранить группу'}`);
      }
    } catch (error) {
      console.error('Failed to save field group:', error);
      alert('Ошибка при сохранении группы полей');
    }
  };

  const deleteFieldGroup = async (id: number) => {
    if (!hasPermission('custom_field_groups', 'remove')) {
      alert('У вас нет прав для удаления групп полей');
      return;
    }
    if (!confirm('Вы уверены, что хотите удалить эту группу?')) return;
    
    try {
      const response = await apiFetch(FIELD_GROUPS_URL, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        await loadFieldGroups();
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error || 'Не удалось удалить группу'}`);
      }
    } catch (error) {
      console.error('Failed to delete field group:', error);
      alert('Ошибка при удалении группы полей');
    }
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
    loadFieldGroups,
  };
};