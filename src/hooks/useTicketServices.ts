import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, API_URL } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';

export interface TicketService {
  id: number;
  name: string;
  description: string;
  ticket_title?: string;
  category_id?: number;
  category_name?: string;
  created_at: string;
  service_ids?: number[];
  visible_to_user_ids?: number[];
}

export interface Service {
  id: number;
  name: string;
  description: string;
  category_id?: number;
  category_name?: string;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
}

const STALE_TIME = 5 * 60 * 1000;

const fetchJson = async <T>(endpoint: string): Promise<T[]> => {
  const response = await apiFetch(`${API_URL}?endpoint=${endpoint}`);
  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

export const useTicketServices = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const ticketServicesQuery = useQuery({
    queryKey: ['ticket-services'],
    queryFn: async () => {
      try {
        return await fetchJson<TicketService>('ticket_services');
      } catch (error) {
        console.error('Failed to load ticket services:', error);
        toast({
          title: 'Ошибка',
          description: 'Не удалось загрузить услуги заявок',
          variant: 'destructive',
        });
        return [] as TicketService[];
      }
    },
    staleTime: STALE_TIME,
  });

  const servicesQuery = useQuery({
    queryKey: ['services-list'],
    queryFn: async () => {
      try {
        return await fetchJson<Service>('services');
      } catch (error) {
        console.error('Failed to load services:', error);
        return [] as Service[];
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

  const ticketServices = ticketServicesQuery.data ?? [];
  const services = servicesQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const loading = ticketServicesQuery.isLoading;

  const saveTicketService = async (
    formData: {
      name: string;
      description: string;
      ticket_title: string;
      category_id: string;
    },
    selectedServiceIds: number[],
    editingService: TicketService | null,
    visibleToUserIds: number[] = []
  ) => {
    if (!formData.name) {
      toast({
        title: 'Ошибка',
        description: 'Заполните название услуги',
        variant: 'destructive',
      });
      return false;
    }

    const payload = {
      name: formData.name,
      description: formData.description,
      ticket_title: formData.ticket_title,
      category_id: formData.category_id ? parseInt(formData.category_id) : null,
      service_ids: selectedServiceIds,
      visible_to_user_ids: visibleToUserIds,
    };

    try {
      const url = editingService
        ? `${API_URL}?endpoint=ticket_services&id=${editingService.id}`
        : `${API_URL}?endpoint=ticket_services`;

      const response = await apiFetch(url, {
        method: editingService ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (response.ok) {
        toast({
          title: 'Успешно',
          description: editingService ? 'Услуга обновлена' : 'Услуга создана',
        });
        await queryClient.invalidateQueries({ queryKey: ['ticket-services'] });
        return true;
      } else {
        throw new Error(responseData.error || 'Failed to save ticket service');
      }
    } catch (error) {
      console.error('Failed to save ticket service:', error);
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось сохранить услугу',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteTicketService = async (id: number) => {
    if (!confirm('Удалить эту услугу заявки?')) return false;

    try {
      const response = await apiFetch(`${API_URL}?endpoint=ticket_services&id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Успешно',
          description: 'Услуга удалена',
        });
        await queryClient.invalidateQueries({ queryKey: ['ticket-services'] });
        return true;
      } else {
        const errorData = await response.json();
        toast({
          title: 'Ошибка',
          description: errorData.error || 'Не удалось удалить услугу',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      console.error('Failed to delete ticket service:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить услугу',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    ticketServices,
    services,
    categories,
    loading,
    saveTicketService,
    deleteTicketService,
  };
};
