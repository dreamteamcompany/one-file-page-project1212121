import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, API_URL } from '@/utils/api';
import PaymentsSidebar from '@/components/payments/PaymentsSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import MappingFormDialog from '@/components/service-field-mappings/MappingFormDialog';
import MappingsTable from '@/components/service-field-mappings/MappingsTable';
import {
  ServiceCategory,
  Service,
  FieldGroup,
  ServiceFieldMapping,
} from '@/components/service-field-mappings/types';

const ServiceFieldMappings = () => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [mappings, setMappings] = useState<ServiceFieldMapping[]>([]);
  const [ticketServices, setTicketServices] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [fieldGroups, setFieldGroups] = useState<FieldGroup[]>([]);
  const [ticketServiceMappings, setTicketServiceMappings] = useState<{ ticket_service_id: number; service_id: number }[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<ServiceFieldMapping | null>(null);
  const [formData, setFormData] = useState({
    service_category_id: 0,
    service_id: 0,
    field_group_ids: [] as number[],
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  useEffect(() => {
    if (!hasPermission('service_field_mappings', 'read')) {
      navigate('/tickets');
      return;
    }
    loadData();
  }, [hasPermission, navigate]);

  if (!hasPermission('service_field_mappings', 'read')) {
    return null;
  }

  const loadData = async () => {
    // Load ticket-services (Услуга: Заблокировать доступ, Предоставить доступ)
    try {
      const response = await apiFetch(`${API_URL}?endpoint=ticket_services`);
      const data = await response.json();
      console.log('Loaded ticket-services (услуги):', data);
      setTicketServices(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load ticket-services:', error);
      setTicketServices([]);
    }

    // Load services (Сервис: процессы согласования)
    try {
      const response = await apiFetch(`${API_URL}?endpoint=services`);
      const data = await response.json();
      console.log('Loaded services (сервисы):', data);
      setServices(Array.isArray(data.services) ? data.services : []);
    } catch (error) {
      console.error('Failed to load services:', error);
      setServices([]);
    }

    // Load ticket-service mappings (связь услуг и сервисов)
    try {
      const response = await apiFetch(`${API_URL}?endpoint=ticket_service_mappings`);
      const data = await response.json();
      console.log('Loaded ticket-service mappings:', data);
      setTicketServiceMappings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load ticket-service mappings:', error);
      setTicketServiceMappings([]);
    }

    // Load field groups from localStorage
    const savedFieldGroups = localStorage.getItem('customFieldGroups');
    if (savedFieldGroups) {
      setFieldGroups(JSON.parse(savedFieldGroups));
    }

    // Load mappings from localStorage
    const savedMappings = localStorage.getItem('serviceFieldMappings');
    if (savedMappings) {
      setMappings(JSON.parse(savedMappings));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const requiredPermission = editingMapping ? 'update' : 'create';
    if (!hasPermission('service_field_mappings', requiredPermission)) {
      alert('У вас нет прав для этой операции');
      return;
    }

    if (!formData.service_category_id || !formData.service_id) {
      alert('Выберите услугу и сервис');
      return;
    }

    if (editingMapping) {
      const updatedMappings = mappings.map((m) =>
        m.id === editingMapping.id
          ? { ...m, ...formData, updated_at: new Date().toISOString() }
          : m
      );
      setMappings(updatedMappings);
      localStorage.setItem('serviceFieldMappings', JSON.stringify(updatedMappings));
    } else {
      // Check if mapping already exists
      const exists = mappings.find(
        (m) =>
          m.service_category_id === formData.service_category_id &&
          m.service_id === formData.service_id
      );

      if (exists) {
        alert('Связь для этой комбинации услуги и сервиса уже существует');
        return;
      }

      const newMapping: ServiceFieldMapping = {
        id: Date.now(),
        ...formData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const updatedMappings = [...mappings, newMapping];
      setMappings(updatedMappings);
      localStorage.setItem('serviceFieldMappings', JSON.stringify(updatedMappings));
    }

    resetForm();
  };

  const handleEdit = (mapping: ServiceFieldMapping) => {
    if (!hasPermission('service_field_mappings', 'update')) {
      alert('У вас нет прав для редактирования связей');
      return;
    }
    setEditingMapping(mapping);
    setFormData({
      service_category_id: mapping.service_category_id,
      service_id: mapping.service_id,
      field_group_ids: mapping.field_group_ids,
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (!hasPermission('service_field_mappings', 'remove')) {
      alert('У вас нет прав для удаления связей');
      return;
    }
    if (confirm('Удалить связь?')) {
      const updatedMappings = mappings.filter((m) => m.id !== id);
      setMappings(updatedMappings);
      localStorage.setItem('serviceFieldMappings', JSON.stringify(updatedMappings));
    }
  };

  const resetForm = () => {
    setFormData({
      service_category_id: 0,
      service_id: 0,
      field_group_ids: [],
    });
    setEditingMapping(null);
    setDialogOpen(false);
  };

  const handleFormDataChange = (field: string, value: number | { service_category_id: number; service_id: number } | number[]) => {
    if (field === 'service_category_id') {
      setFormData((prev) => ({ ...prev, ...value }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const toggleFieldGroup = (groupId: number) => {
    setFormData((prev) => ({
      ...prev,
      field_group_ids: prev.field_group_ids.includes(groupId)
        ? prev.field_group_ids.filter((id) => id !== groupId)
        : [...prev.field_group_ids, groupId],
    }));
  };

  const getTicketServiceName = (id: number) => {
    return ticketServices.find((c) => c.id === id)?.name || 'Неизвестно';
  };

  const getServiceName = (id: number) => {
    return services.find((s) => s.id === id)?.name || 'Неизвестно';
  };

  const getFieldGroupNames = (ids: number[]) => {
    return ids.map((id) => fieldGroups.find((g) => g.id === id)?.name || 'Неизвестно');
  };

  // Фильтруем сервисы по выбранной услуге через ticket_service_mappings
  const filteredServices = formData.service_category_id
    ? services.filter((s) => {
        const hasMapping = ticketServiceMappings.some(
          (m) => m.ticket_service_id === formData.service_category_id && m.service_id === s.id
        );
        console.log(`Service ${s.id} (${s.name}): hasMapping=${hasMapping}`, {
          ticketServiceId: formData.service_category_id,
          serviceId: s.id,
          mappings: ticketServiceMappings.filter(m => m.ticket_service_id === formData.service_category_id)
        });
        return hasMapping;
      })
    : [];
  
  console.log('filteredServices:', filteredServices, {
    selectedTicketServiceId: formData.service_category_id,
    totalServices: services.length,
    totalMappings: ticketServiceMappings.length
  });

  const filteredMappings = mappings.filter((mapping) => {
    const ticketServiceName = getTicketServiceName(mapping.service_category_id).toLowerCase();
    const serviceName = getServiceName(mapping.service_id).toLowerCase();
    const query = searchQuery.toLowerCase();
    return ticketServiceName.includes(query) || serviceName.includes(query);
  });

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <PaymentsSidebar
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      <div
        className="flex-1 overflow-y-auto"
        onTouchStart={(e) => setTouchStart(e.targetTouches[0].clientX)}
        onTouchMove={(e) => setTouchEnd(e.targetTouches[0].clientX)}
        onTouchEnd={() => {
          if (touchStart - touchEnd > 75) {
            setMenuOpen(false);
          }
        }}
      >
        <div className="p-6 space-y-6 w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMenuOpen(true)}
              >
                <Icon name="Menu" size={24} />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Связь Услуги-Сервисы-Поля</h1>
                <p className="text-muted-foreground mt-1">
                  Настройте какие поля показывать для каждой комбинации услуги и сервиса
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Icon
                name="Search"
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="Поиск по услугам или сервисам..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <MappingFormDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              editingMapping={editingMapping}
              formData={formData}
              onFormDataChange={handleFormDataChange}
              onSubmit={handleSubmit}
              onReset={resetForm}
              serviceCategories={ticketServices}
              services={services}
              fieldGroups={fieldGroups}
              canCreate={hasPermission('service_field_mappings', 'create')}
              filteredServices={filteredServices}
              toggleFieldGroup={toggleFieldGroup}
            />
          </div>

          <MappingsTable
            mappings={filteredMappings}
            onEdit={handleEdit}
            onDelete={handleDelete}
            getCategoryName={getTicketServiceName}
            getServiceName={getServiceName}
            getFieldGroupNames={getFieldGroupNames}
            canUpdate={hasPermission('service_field_mappings', 'update')}
            canDelete={hasPermission('service_field_mappings', 'remove')}
          />
        </div>
      </div>
    </div>
  );
};

export default ServiceFieldMappings;