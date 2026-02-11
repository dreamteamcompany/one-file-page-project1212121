import { useState, useEffect } from 'react';
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

export const useTicketServices = () => {
  const [ticketServices, setTicketServices] = useState<TicketService[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadTicketServices();
    loadServices();
    loadCategories();
  }, []);

  const loadTicketServices = async () => {
    try {
      const response = await apiFetch(`${API_URL}?endpoint=ticket_services`);
      const data = await response.json();
      console.log('Loaded ticket services:', data);
      setTicketServices(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load ticket services:', error);
      setTicketServices([]);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить услуги заявок',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    try {
      const response = await apiFetch(`${API_URL}?endpoint=services`);
      const data = await response.json();
      setServices(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load services:', error);
      setServices([]);
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

  const saveTicketService = async (
    formData: {
      name: string;
      description: string;
      ticket_title: string;
      category_id: string;
    },
    selectedServiceIds: number[],
    editingService: TicketService | null
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
    };
    
    console.log('Saving ticket service with payload:', payload);

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
      console.log('Response from server:', responseData);

      if (response.ok) {
        toast({
          title: 'Успешно',
          description: editingService ? 'Услуга обновлена' : 'Услуга создана',
        });
        await loadTicketServices();
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
        loadTicketServices();
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
