import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  visible_to_user_ids?: number[];
  created_at: string;
}

const STALE_TIME = 5 * 60 * 1000;

const fetchJson = async <T>(endpoint: string): Promise<T[]> => {
  const response = await apiFetch(`${API_URL}?endpoint=${endpoint}`);
  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

const fetchUsers = async (): Promise<User[]> => {
  const response = await apiFetch(`${API_URL}?endpoint=users`);
  const data = await response.json();
  if (Array.isArray(data)) return data as User[];
  return (data.users as User[]) || [];
};

const fetchDepartments = async (): Promise<CustomerDepartment[]> => {
  const response = await apiFetch(`${API_URL}?endpoint=customer-departments`);
  const data = await response.json();
  if (Array.isArray(data)) return data as CustomerDepartment[];
  return (data.departments as CustomerDepartment[]) || [];
};

export const useServices = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const servicesQuery = useQuery({
    queryKey: ['services-list'],
    queryFn: async () => {
      try {
        return await fetchJson<Service>('services');
      } catch (error) {
        console.error('[Services] Failed to load services:', error);
        toast({
          title: 'Ошибка',
          description: 'Не удалось загрузить сервисы',
          variant: 'destructive',
        });
        return [] as Service[];
      }
    },
    staleTime: STALE_TIME,
  });

  const usersQuery = useQuery({
    queryKey: ['services-users'],
    queryFn: async () => {
      try {
        return await fetchUsers();
      } catch (error) {
        console.error('Failed to load users:', error);
        return [] as User[];
      }
    },
    staleTime: STALE_TIME,
  });

  const departmentsQuery = useQuery({
    queryKey: ['customer-departments'],
    queryFn: async () => {
      try {
        return await fetchDepartments();
      } catch (error) {
        console.error('Failed to load departments:', error);
        return [] as CustomerDepartment[];
      }
    },
    staleTime: STALE_TIME,
  });

  const categoriesQuery = useQuery({
    queryKey: ['ticket-service-categories'],
    queryFn: async () => {
      try {
        return await fetchJson<Category>('ticket-service-categories');
      } catch (error) {
        console.error('Failed to load categories:', error);
        return [] as Category[];
      }
    },
    staleTime: STALE_TIME,
  });

  const services = servicesQuery.data ?? [];
  const users = usersQuery.data ?? [];
  const departments = departmentsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const loading = servicesQuery.isLoading;

  const saveService = async (
    formData: {
      name: string;
      description: string;
      final_approver_id: string;
      customer_department_id: string;
      category_id: string;
    },
    editingService: Service | null,
    visibleToUserIds: number[] = []
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
          visible_to_user_ids: visibleToUserIds,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Успешно',
          description: editingService ? 'Сервис обновлён' : 'Сервис создан',
        });
        await queryClient.invalidateQueries({ queryKey: ['services-list'] });
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
        await queryClient.invalidateQueries({ queryKey: ['services-list'] });
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
