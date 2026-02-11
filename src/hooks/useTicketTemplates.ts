import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export interface TicketTemplate {
  id: number;
  name: string;
  description: string;
  service_id: number;
  service_name?: string;
  ticket_service_ids: number[];
  ticket_service_names?: string[];
  sla_hours: number;
  priority_id?: number;
  priority_name?: string;
  category_id?: number;
  category_name?: string;
  created_at: string;
}

export interface Service {
  id: number;
  name: string;
  category_id?: number;
  category_name?: string;
}

export interface TicketService {
  id: number;
  name: string;
  description?: string;
}

export interface Priority {
  id: number;
  name: string;
  color: string;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
}

export const useTicketTemplates = () => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [ticketServices, setTicketServices] = useState<TicketService[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasPermission('ticket_templates', 'read')) {
      navigate('/tickets');
      return;
    }
    loadTemplates();
    loadDictionaries();
  }, [hasPermission, navigate]);

  const loadTemplates = () => {
    const savedTemplates = localStorage.getItem('ticketTemplates');
    if (savedTemplates) {
      setTemplates(JSON.parse(savedTemplates));
    } else {
      const mockTemplates: TicketTemplate[] = [
        {
          id: 1,
          name: 'Стандартная установка ПО',
          description: 'Установка ПО с настройкой',
          service_id: 1,
          service_name: 'Установка ПО',
          ticket_service_ids: [1, 2],
          ticket_service_names: ['Базовая настройка', 'Консультация'],
          sla_hours: 24,
          priority_id: 2,
          category_id: 1,
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          name: 'Срочный ремонт техники',
          description: 'Экспресс-ремонт с гарантией',
          service_id: 2,
          service_name: 'Ремонт оборудования',
          ticket_service_ids: [3],
          ticket_service_names: ['Срочный ремонт'],
          sla_hours: 4,
          priority_id: 4,
          category_id: 2,
          created_at: new Date().toISOString(),
        },
      ];
      setTemplates(mockTemplates);
      localStorage.setItem('ticketTemplates', JSON.stringify(mockTemplates));
    }
    setLoading(false);
  };

  const loadDictionaries = () => {
    const savedServices = localStorage.getItem('services');
    if (savedServices) {
      setServices(JSON.parse(savedServices));
    }

    const savedTicketServices = localStorage.getItem('ticketServices');
    if (savedTicketServices) {
      setTicketServices(JSON.parse(savedTicketServices));
    }

    const savedPriorities = localStorage.getItem('ticketPriorities');
    if (savedPriorities) {
      setPriorities(JSON.parse(savedPriorities));
    }

    const savedCategories = localStorage.getItem('ticketServiceCategories');
    if (savedCategories) {
      setCategories(JSON.parse(savedCategories));
    }
  };

  const saveTemplate = (
    formData: {
      name: string;
      description: string;
      service_id: number;
      ticket_service_ids: number[];
      sla_hours: number;
      priority_id?: number;
      category_id?: number;
    },
    editingTemplate: TicketTemplate | null
  ) => {
    const requiredPermission = editingTemplate ? 'update' : 'create';
    if (!hasPermission('ticket_templates', requiredPermission)) {
      alert('У вас нет прав для этой операции');
      return;
    }

    const service = services.find(s => s.id === formData.service_id);
    const selectedTicketServices = ticketServices.filter(ts => 
      formData.ticket_service_ids.includes(ts.id)
    );
    const priority = priorities.find(p => p.id === formData.priority_id);
    const category = categories.find(c => c.id === formData.category_id);

    let updatedTemplates: TicketTemplate[];
    if (editingTemplate) {
      updatedTemplates = templates.map(t =>
        t.id === editingTemplate.id
          ? {
              ...t,
              name: formData.name,
              description: formData.description,
              service_id: formData.service_id,
              service_name: service?.name,
              ticket_service_ids: formData.ticket_service_ids,
              ticket_service_names: selectedTicketServices.map(ts => ts.name),
              sla_hours: formData.sla_hours,
              priority_id: formData.priority_id,
              priority_name: priority?.name,
              category_id: formData.category_id,
              category_name: category?.name,
            }
          : t
      );
    } else {
      const newTemplate: TicketTemplate = {
        id: Math.max(0, ...templates.map(t => t.id)) + 1,
        name: formData.name,
        description: formData.description,
        service_id: formData.service_id,
        service_name: service?.name,
        ticket_service_ids: formData.ticket_service_ids,
        ticket_service_names: selectedTicketServices.map(ts => ts.name),
        sla_hours: formData.sla_hours,
        priority_id: formData.priority_id,
        priority_name: priority?.name,
        category_id: formData.category_id,
        category_name: category?.name,
        created_at: new Date().toISOString(),
      };
      updatedTemplates = [...templates, newTemplate];
    }

    setTemplates(updatedTemplates);
    localStorage.setItem('ticketTemplates', JSON.stringify(updatedTemplates));
  };

  const deleteTemplate = (id: number) => {
    if (!hasPermission('ticket_templates', 'remove')) {
      alert('У вас нет прав для удаления шаблонов');
      return;
    }
    if (!confirm('Вы уверены, что хотите удалить этот шаблон?')) return;
    const updatedTemplates = templates.filter(t => t.id !== id);
    setTemplates(updatedTemplates);
    localStorage.setItem('ticketTemplates', JSON.stringify(updatedTemplates));
  };

  const getServiceById = (id: number) => services.find(s => s.id === id);
  const getTicketServiceById = (id: number) => ticketServices.find(ts => ts.id === id);
  const getPriorityById = (id: number) => priorities.find(p => p.id === id);

  return {
    templates,
    services,
    ticketServices,
    priorities,
    categories,
    loading,
    saveTemplate,
    deleteTemplate,
    getServiceById,
    getTicketServiceById,
    getPriorityById,
    loadDictionaries,
  };
};
