import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, getApiUrl } from '@/utils/api';
import PaymentsSidebar from '@/components/payments/PaymentsSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SLA {
  id: number;
  name: string;
  response_time_minutes: number;
  resolution_time_minutes: number;
}

interface TicketService {
  id: number;
  name: string;
}

interface Service {
  id: number;
  name: string;
}

interface Mapping {
  id: number;
  sla_id: number;
  ticket_service_id: number | null;
  service_id: number | null;
  sla_name: string;
  ticket_service_name: string | null;
  service_name: string | null;
  response_time_minutes: number;
  resolution_time_minutes: number;
  response_notification_minutes: number;
  resolution_notification_minutes: number;
  created_at: string;
}

const formatTime = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} мин`;
  if (mins === 0) return `${hours} ч`;
  return `${hours} ч ${mins} мин`;
};

const SlaServiceMappings = () => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [slas, setSlas] = useState<SLA[]>([]);
  const [ticketServices, setTicketServices] = useState<TicketService[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<Mapping | null>(null);
  const [formData, setFormData] = useState({
    sla_id: '',
    ticket_service_id: '',
    service_id: '',
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [dictionariesOpen, setDictionariesOpen] = useState(true);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  useEffect(() => {
    if (!hasPermission('sla', 'read')) {
      navigate('/tickets');
      return;
    }
    loadAll();
  }, [hasPermission, navigate]);

  if (!hasPermission('sla', 'read')) return null;

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const handleTouchEnd = () => { if (touchStart - touchEnd > 75) setMenuOpen(false); };

  const loadAll = () => {
    Promise.all([
      loadMappings(),
      loadSlas(),
      loadTicketServices(),
      loadServices(),
    ]).finally(() => setLoading(false));
  };

  const loadMappings = () =>
    apiFetch(`${getApiUrl('sla-service-mappings')}?endpoint=sla-service-mappings`)
      .then(r => r.json())
      .then(data => setMappings(Array.isArray(data) ? data : []))
      .catch(() => setMappings([]));

  const loadSlas = () =>
    apiFetch(`${getApiUrl('sla')}?endpoint=sla`)
      .then(r => r.json())
      .then(data => setSlas(Array.isArray(data) ? data : []))
      .catch(() => setSlas([]));

  const loadTicketServices = () =>
    apiFetch(`${getApiUrl('ticket_services')}?endpoint=ticket_services`)
      .then(r => r.json())
      .then(data => setTicketServices(Array.isArray(data) ? data : []))
      .catch(() => setTicketServices([]));

  const loadServices = () =>
    apiFetch(`${getApiUrl('services')}?endpoint=services`)
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : data?.services || [];
        setServices(list);
      })
      .catch(() => setServices([]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sla_id) return;

    const body: Record<string, unknown> = {
      sla_id: Number(formData.sla_id),
      ticket_service_id: formData.ticket_service_id ? Number(formData.ticket_service_id) : null,
      service_id: formData.service_id ? Number(formData.service_id) : null,
    };

    if (editingMapping) body.id = editingMapping.id;

    const method = editingMapping ? 'PUT' : 'POST';
    const res = await apiFetch(`${getApiUrl('sla-service-mappings')}?endpoint=sla-service-mappings`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setDialogOpen(false);
      resetForm();
      loadMappings();
    } else {
      const data = await res.json();
      alert(data.error || 'Ошибка сохранения');
    }
  };

  const handleEdit = (m: Mapping) => {
    setEditingMapping(m);
    setFormData({
      sla_id: String(m.sla_id),
      ticket_service_id: m.ticket_service_id ? String(m.ticket_service_id) : '',
      service_id: m.service_id ? String(m.service_id) : '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить эту связь?')) return;
    const res = await apiFetch(`${getApiUrl('sla-service-mappings')}?endpoint=sla-service-mappings`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) loadMappings();
    else {
      const data = await res.json();
      alert(data.error || 'Ошибка удаления');
    }
  };

  const resetForm = () => {
    setEditingMapping(null);
    setFormData({ sla_id: '', ticket_service_id: '', service_id: '' });
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) resetForm();
  };

  return (
    <div className="flex min-h-screen">
      <PaymentsSidebar
        menuOpen={menuOpen}
        dictionariesOpen={dictionariesOpen}
        setDictionariesOpen={setDictionariesOpen}
        settingsOpen={false}
        setSettingsOpen={() => {}}
        handleTouchStart={handleTouchStart}
        handleTouchMove={handleTouchMove}
        handleTouchEnd={handleTouchEnd}
      />

      {menuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMenuOpen(false)} />
      )}

      <main className="lg:ml-[250px] p-4 md:p-6 lg:p-[30px] min-h-screen flex-1 overflow-x-hidden max-w-full">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-[30px] px-4 md:px-[25px] py-4 md:py-[18px] bg-[#1b254b]/50 backdrop-blur-[20px] rounded-[15px] border border-white/10">
          <button onClick={() => setMenuOpen(!menuOpen)} className="lg:hidden p-2 text-white">
            <Icon name="Menu" size={24} />
          </button>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/sla')} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
              <Icon name="ArrowLeft" size={20} />
            </button>
            <div>
              <h1 className="text-lg md:text-xl font-bold">Связь SLA с услугами</h1>
              <p className="text-xs text-muted-foreground">Привязка соглашений к комбинациям услуга + сервис</p>
            </div>
          </div>
        </header>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <p className="text-muted-foreground text-sm">
              Всего связей: {mappings.length}
            </p>
          </div>
          {hasPermission('sla', 'create') && (
            <Button
              onClick={() => { resetForm(); setDialogOpen(true); }}
              className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
            >
              <Icon name="Plus" size={20} className="mr-2" />
              Добавить связь
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        ) : mappings.length === 0 ? (
          <Card className="bg-card/50 border-white/10">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Icon name="Link" size={64} className="text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">Связи не найдены</h3>
              <p className="text-muted-foreground mb-4 text-center">
                Привяжите SLA к комбинациям услуг и сервисов, чтобы сроки автоматически проставлялись в заявках
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {mappings.map((m) => (
              <Card key={m.id} className="bg-card/50 border-white/10 hover:border-white/20 transition-all">
                <CardContent className="p-4 md:p-5">
                  <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div className="flex-1 w-full">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        {m.ticket_service_name && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-sm font-medium">
                            <Icon name="Wrench" size={14} />
                            {m.ticket_service_name}
                          </span>
                        )}
                        {m.ticket_service_name && m.service_name && (
                          <Icon name="Plus" size={14} className="text-muted-foreground" />
                        )}
                        {m.service_name && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/10 text-secondary text-sm font-medium">
                            <Icon name="Building2" size={14} />
                            {m.service_name}
                          </span>
                        )}
                        <Icon name="ArrowRight" size={16} className="text-muted-foreground mx-1" />
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 text-green-500 text-sm font-medium">
                          <Icon name="Clock" size={14} />
                          {m.sla_name}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Icon name="Timer" size={14} className="text-primary" />
                          Реакция: {formatTime(m.response_time_minutes)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Icon name="CheckCircle2" size={14} className="text-green-500" />
                          Решение: {formatTime(m.resolution_time_minutes)}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      {hasPermission('sla', 'update') && (
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(m)} className="hover:bg-white/5">
                          <Icon name="Pencil" size={18} />
                        </Button>
                      )}
                      {hasPermission('sla', 'remove') && (
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)} className="hover:bg-red-500/10 text-red-500">
                          <Icon name="Trash2" size={18} />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingMapping ? 'Редактировать связь' : 'Добавить связь SLA'}</DialogTitle>
              <DialogDescription>
                Выберите SLA и комбинацию услуги/сервиса
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>SLA *</Label>
                <Select value={formData.sla_id} onValueChange={(v) => setFormData(f => ({ ...f, sla_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Выберите SLA" /></SelectTrigger>
                  <SelectContent>
                    {slas.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name} (реакция {formatTime(s.response_time_minutes)}, решение {formatTime(s.resolution_time_minutes)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Услуга</Label>
                <Select value={formData.ticket_service_id} onValueChange={(v) => setFormData(f => ({ ...f, ticket_service_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Любая услуга" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Любая услуга</SelectItem>
                    {ticketServices.map(ts => (
                      <SelectItem key={ts.id} value={String(ts.id)}>{ts.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Сервис</Label>
                <Select value={formData.service_id} onValueChange={(v) => setFormData(f => ({ ...f, service_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Любой сервис" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Любой сервис</SelectItem>
                    {services.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>Отмена</Button>
                <Button type="submit" disabled={!formData.sla_id}>
                  {editingMapping ? 'Сохранить' : 'Добавить'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default SlaServiceMappings;
