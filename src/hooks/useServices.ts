import { useState, useEffect } from 'react';
import { apiFetch, API_URL } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';

export interface User {
  id: number;
  full_name: string;
  role: string;
}

export interface CustomerDepartment {
  id: number;
  name: string;
  description: string;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
}

export interface Service {
  id: number;
  name: string;
  description: string;
  intermediate_approver_id: number;
  final_approver_id: number;
  intermediate_approver_name?: string;
  final_approver_name?: string;
  customer_department_id?: number;
  customer_department_name?: string;
  category_id?: number;
  category_name?: string;
  category_icon?: string;
  created_at: string;
}

export const useServices = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<CustomerDepartment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadServices();
    loadUsers();
    loadDepartments();
    loadCategories();
  }, []);

  const loadServices = async () => {
    try {
      console.log('[Services] Loading services...');
      const response = await apiFetch(`${API_URL}?endpoint=services`);
      console.log('[Services] Response status:', response.status);
      const data = await response.json();
      console.log('[Services] Data received:', data);
      const services = Array.isArray(data) ? data : [];
      console.log('[Services] Setting services:', services.length, 'items');
      setServices(services);
    } catch (error) {
      console.error('[Services] Failed to load services:', error);
      setServices([]);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить сервисы',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await apiFetch(`${API_URL}?endpoint=users`);
      const data = await response.json();
      setUsers(Array.isArray(data) ? data : data.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
      setUsers([]);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await apiFetch(`${API_URL}?endpoint=customer-departments`);
      const data = await response.json();
      setDepartments(Array.isArray(data) ? data : data.departments || []);
    } catch (error) {
      console.error('Failed to load departments:', error);
      setDepartments([]);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await apiFetch(`${API_URL}?endpoint=ticket-service-categories`);
      const data = await response.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load categories:', error);
      setCategories([]);
    }
  };

  const saveService = async (
    formData: {
      name: string;
      description: string;
      final_approver_id: string;
      customer_department_id: string;
      category_id: string;
    },
    editingService: Service | null
  ) => {
    if (!formData.name || !formData.final_approver_id) {
      toast({
        title: 'Ошибка',
        description: 'Заполните все обязательные поля',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const url = editingService
        ? `${API_URL}?endpoint=services&id=${editingService.id}`
        : `${API_URL}?endpoint=services`;

      const response = await apiFetch(url, {
        method: editingService ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          intermediate_approver_id: parseInt(formData.final_approver_id),
          final_approver_id: parseInt(formData.final_approver_id),
          customer_department_id: formData.customer_department_id ? parseInt(formData.customer_department_id) : null,
          category_id: formData.category_id ? parseInt(formData.category_id) : null,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Успешно',
          description: editingService ? 'Сервис обновлён' : 'Сервис создан',
        });
        loadServices();
        return true;
      } else {
        throw new Error('Failed to save service');
      }
    } catch (error) {
      console.error('Failed to save service:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить сервис',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteService = async (id: number) => {
    if (!confirm('Удалить этот сервис?')) return false;

    try {
      const response = await apiFetch(`${API_URL}?endpoint=services&id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Успешно',
          description: 'Сервис удалён',
        });
        loadServices();
        return true;
      } else {
        throw new Error('Failed to delete service');
      }
    } catch (error) {
      console.error('Failed to delete service:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить сервис',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    services,
    users,
    departments,
    categories,
    loading,
    saveService,
    deleteService,
  };
};
