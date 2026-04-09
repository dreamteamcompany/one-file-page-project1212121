import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, getApiUrl } from '@/utils/api';
import PageLayout from '@/components/layout/PageLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import SlaGroupBudgets, { GroupBudgetItem } from '@/components/sla/SlaGroupBudgets';
import SlaGroupBudgetsPreview from '@/components/sla/SlaGroupBudgetsPreview';

interface PriorityTime {
  priority_id: number;
  response_time_minutes: number;
  response_notification_minutes: number;
  resolution_time_minutes: number;
  resolution_notification_minutes: number;
  priority_name?: string;
  priority_level?: number;
  priority_color?: string;
}

interface SLAItem {
  id: number;
  name: string;
  response_time_minutes: number;
  response_notification_minutes: number;
  no_response_minutes?: number;
  no_response_status_id?: number;
  resolution_time_minutes: number;
  resolution_notification_minutes: number;
  use_work_schedule: boolean;
  priority_times?: PriorityTime[];
  created_at?: string;
  updated_at?: string;
}

interface TicketStatus {
  id: number;
  name: string;
  color: string;
}

interface TicketPriority {
  id: number;
  name: string;
  level: number;
  color: string;
}

const formatTime = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} мин`;
  if (mins === 0) return `${hours} ч`;
  return `${hours} ч ${mins} мин`;
};

const TimeInput = ({ label, value, onChange, description }: {
  label: string;
  value: number;
  onChange: (minutes: number) => void;
  description?: string;
}) => {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <Label htmlFor={`${label}-hours`} className="text-xs text-muted-foreground">Часы</Label>
          <Input
            id={`${label}-hours`}
            type="number"
            min="0"
            value={hours}
            onChange={(e) => onChange((parseInt(e.target.value) || 0) * 60 + minutes)}
            className="mt-1"
          />
        </div>
        <div className="flex-1">
          <Label htmlFor={`${label}-minutes`} className="text-xs text-muted-foreground">Минуты</Label>
          <Input
            id={`${label}-minutes`}
            type="number"
            min="0"
            max="59"
            value={minutes}
            onChange={(e) => onChange(hours * 60 + (parseInt(e.target.value) || 0))}
            className="mt-1"
          />
        </div>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
};

const CompactTimeInput = ({ label, value, onChange }: {
  label: string;
  value: number;
  onChange: (minutes: number) => void;
}) => {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex gap-1 items-center">
        <Input
          type="number"
          min="0"
          className="w-16 h-8 text-xs"
          placeholder="ч"
          value={hours || ''}
          onChange={(e) => onChange((parseInt(e.target.value) || 0) * 60 + minutes)}
        />
        <span className="text-xs text-muted-foreground">ч</span>
        <Input
          type="number"
          min="0"
          max="59"
          className="w-16 h-8 text-xs"
          placeholder="мин"
          value={minutes || ''}
          onChange={(e) => onChange(hours * 60 + (parseInt(e.target.value) || 0))}
        />
        <span className="text-xs text-muted-foreground">мин</span>
      </div>
    </div>
  );
};

const DEFAULT_FORM = {
  name: '',
  response_time_minutes: 240,
  response_notification_minutes: 180,
  no_response_minutes: 1440,
  no_response_status_id: undefined as number | undefined,
  resolution_time_minutes: 1440,
  resolution_notification_minutes: 1200,
  use_work_schedule: false,
};

const SLA = () => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [slas, setSlas] = useState<SLAItem[]>([]);
  const [statuses, setStatuses] = useState<TicketStatus[]>([]);
  const [priorities, setPriorities] = useState<TicketPriority[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSla, setEditingSla] = useState<SLAItem | null>(null);
  const [formData, setFormData] = useState({ ...DEFAULT_FORM });
  const [priorityTimes, setPriorityTimes] = useState<PriorityTime[]>([]);
  const [priorityTimesEnabled, setPriorityTimesEnabled] = useState(false);
  const [groupBudgets, setGroupBudgets] = useState<GroupBudgetItem[]>([]);
  const [expandedSla, setExpandedSla] = useState<number | null>(null);

  useEffect(() => {
    if (!hasPermission('sla', 'read')) {
      navigate('/tickets');
      return;
    }
    loadSlas();
    loadStatuses();
    loadPriorities();
  }, [hasPermission, navigate]);

  if (!hasPermission('sla', 'read')) return null;

  const loadSlas = () => {
    apiFetch(`${getApiUrl('sla')}?endpoint=sla`)
      .then(res => res.json())
      .then((data) => {
        setSlas(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setSlas([]);
        setLoading(false);
      });
  };

  const loadStatuses = () => {
    apiFetch(`${getApiUrl('ticket-statuses')}?endpoint=ticket-statuses`)
      .then(res => res.json())
      .then((data) => setStatuses(Array.isArray(data) ? data : []))
      .catch(() => setStatuses([]));
  };

  const loadPriorities = () => {
    apiFetch(`${getApiUrl('ticket-priorities')}?endpoint=ticket-priorities`)
      .then(res => res.json())
      .then((data) => setPriorities(Array.isArray(data) ? data : []))
      .catch(() => setPriorities([]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const requiredPermission = editingSla ? 'update' : 'create';
    if (!hasPermission('sla', requiredPermission)) return;

    if (priorityTimesEnabled && priorityTimes.length === 0) {
      alert('Включены времена по приоритетам, но ни один приоритет не добавлен');
      return;
    }

    const url = `${getApiUrl('sla')}?endpoint=sla`;
    const method = editingSla ? 'PUT' : 'POST';

    const submitData = {
      ...(editingSla ? { id: editingSla.id } : {}),
      ...formData,
      priority_times: priorityTimesEnabled ? priorityTimes : [],
    };

    const res = await apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submitData),
    });

    if (res.ok) {
      const result = await res.json();
      const slaId = editingSla?.id || result.id;

      if (slaId && groupBudgets.length > 0) {
        const budgetRes = await apiFetch(`${getApiUrl('sla-group-budgets')}?endpoint=sla-group-budgets`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sla_id: slaId, budgets: groupBudgets }),
        });

        if (!budgetRes.ok) {
          const budgetError = await budgetRes.json();
          alert(`Ошибка сохранения бюджетов групп: ${budgetError.error || 'Неизвестная ошибка'}`);
        }
      }

      setDialogOpen(false);
      setEditingSla(null);
      setFormData({ ...DEFAULT_FORM });
      setPriorityTimes([]);
      setPriorityTimesEnabled(false);
      setGroupBudgets([]);
      loadSlas();
    } else {
      const errData = await res.json();
      alert(errData.error || 'Ошибка сохранения SLA');
    }
  };

  const handleEdit = (sla: SLAItem) => {
    if (!hasPermission('sla', 'update')) return;
    setEditingSla(sla);
    setFormData({
      name: sla.name,
      response_time_minutes: sla.response_time_minutes,
      response_notification_minutes: sla.response_notification_minutes,
      no_response_minutes: sla.no_response_minutes || 1440,
      no_response_status_id: sla.no_response_status_id,
      resolution_time_minutes: sla.resolution_time_minutes,
      resolution_notification_minutes: sla.resolution_notification_minutes,
      use_work_schedule: sla.use_work_schedule || false,
    });

    if (sla.priority_times && sla.priority_times.length > 0) {
      setPriorityTimesEnabled(true);
      setPriorityTimes(sla.priority_times.map(pt => ({
        priority_id: pt.priority_id,
        response_time_minutes: pt.response_time_minutes,
        response_notification_minutes: pt.response_notification_minutes,
        resolution_time_minutes: pt.resolution_time_minutes,
        resolution_notification_minutes: pt.resolution_notification_minutes,
      })));
    } else {
      setPriorityTimesEnabled(false);
      setPriorityTimes([]);
    }

    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!hasPermission('sla', 'remove')) return;
    if (!confirm('Вы уверены, что хотите удалить это SLA?')) return;

    const res = await apiFetch(`${getApiUrl('sla')}?endpoint=sla`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      loadSlas();
    } else {
      const data = await res.json();
      alert(data.error || 'Не удалось удалить SLA');
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingSla(null);
      setFormData({ ...DEFAULT_FORM });
      setPriorityTimes([]);
      setPriorityTimesEnabled(false);
      setGroupBudgets([]);
    }
  };

  const getStatusName = (statusId?: number) => {
    if (!statusId) return '—';
    return statuses.find(s => s.id === statusId)?.name || '—';
  };

  const handlePriorityTimesToggle = (checked: boolean) => {
    setPriorityTimesEnabled(checked);
    if (checked && priorityTimes.length === 0 && priorities.length > 0) {
      setPriorityTimes(priorities.map(p => ({
        priority_id: p.id,
        response_time_minutes: formData.response_time_minutes,
        response_notification_minutes: formData.response_notification_minutes,
        resolution_time_minutes: formData.resolution_time_minutes,
        resolution_notification_minutes: formData.resolution_notification_minutes,
      })));
    }
    if (!checked) {
      setPriorityTimes([]);
    }
  };

  const updatePriorityTime = (priorityId: number, updates: Partial<PriorityTime>) => {
    setPriorityTimes(prev => prev.map(pt =>
      pt.priority_id === priorityId ? { ...pt, ...updates } : pt
    ));
  };

  const addPriorityTime = (priorityId: number) => {
    setPriorityTimes(prev => [...prev, {
      priority_id: priorityId,
      response_time_minutes: formData.response_time_minutes,
      response_notification_minutes: formData.response_notification_minutes,
      resolution_time_minutes: formData.resolution_time_minutes,
      resolution_notification_minutes: formData.resolution_notification_minutes,
    }]);
  };

  const removePriorityTime = (priorityId: number) => {
    setPriorityTimes(prev => prev.filter(pt => pt.priority_id !== priorityId));
  };

  const usedPriorityIds = priorityTimes.map(pt => pt.priority_id);
  const availablePriorities = priorities.filter(p => !usedPriorityIds.includes(p.id));

  const toggleExpand = (id: number) => {
    setExpandedSla(expandedSla === id ? null : id);
  };

  return (
    <PageLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/settings')} className="p-2 hover:bg-accent/30 rounded-lg transition-colors">
            <Icon name="ArrowLeft" size={20} />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">SLA</h1>
            <p className="text-muted-foreground text-sm">
              Соглашения об уровне обслуживания
            </p>
          </div>
        </div>
        {hasPermission('sla', 'create') && (
          <Button
            onClick={() => { setEditingSla(null); setPriorityTimes([]); setPriorityTimesEnabled(false); setGroupBudgets([]); setDialogOpen(true); }}
            className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
          >
            <Icon name="Plus" size={20} className="mr-2" />
            Создать SLA
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : slas.length === 0 ? (
        <Card className="bg-card/50 border-border">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Icon name="Clock" size={64} className="text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">SLA не найдены</h3>
            <p className="text-muted-foreground mb-4 text-center">
              Создайте первое соглашение об уровне обслуживания
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {slas.map((sla) => (
            <SlaCard
              key={sla.id}
              sla={sla}
              expanded={expandedSla === sla.id}
              onToggle={() => toggleExpand(sla.id)}
              onEdit={() => handleEdit(sla)}
              onDelete={() => handleDelete(sla.id)}
              getStatusName={getStatusName}
              canEdit={hasPermission('sla', 'update')}
              canDelete={hasPermission('sla', 'remove')}
            />
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSla ? 'Редактировать SLA' : 'Создать SLA'}</DialogTitle>
            <DialogDescription>
              Настройте параметры соглашения об уровне обслуживания
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Название SLA</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Например: Стандартный SLA"
                required
              />
            </div>

            <Tabs defaultValue="timing" className="w-full">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="timing" className="text-xs sm:text-sm">
                  <Icon name="Timer" size={14} className="mr-1.5 hidden sm:inline" />
                  Сроки
                </TabsTrigger>
                <TabsTrigger value="priorities" className="text-xs sm:text-sm">
                  <Icon name="Layers" size={14} className="mr-1.5 hidden sm:inline" />
                  Приоритеты
                </TabsTrigger>
                <TabsTrigger value="groups" className="text-xs sm:text-sm">
                  <Icon name="Users" size={14} className="mr-1.5 hidden sm:inline" />
                  Группы
                </TabsTrigger>
                <TabsTrigger value="settings" className="text-xs sm:text-sm">
                  <Icon name="Settings" size={14} className="mr-1.5 hidden sm:inline" />
                  Настройки
                </TabsTrigger>
              </TabsList>

              <TabsContent value="timing" className="space-y-5 mt-4">
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Icon name="Timer" size={16} className="text-primary" />
                    Время реакции
                  </h3>
                  <div className="space-y-4 pl-6">
                    <TimeInput
                      label="Максимальное время реакции"
                      value={formData.response_time_minutes}
                      onChange={(minutes) => setFormData({ ...formData, response_time_minutes: minutes })}
                      description="Максимальное время для первого ответа на заявку"
                    />
                    <TimeInput
                      label="Уведомление о сроке реакции"
                      value={formData.response_notification_minutes}
                      onChange={(minutes) => setFormData({ ...formData, response_notification_minutes: minutes })}
                      description="За сколько до окончания времени реакции отправить уведомление"
                    />
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Icon name="CheckCircle2" size={16} className="text-green-500" />
                    Время решения
                  </h3>
                  <div className="space-y-4 pl-6">
                    <TimeInput
                      label="Максимальное время решения"
                      value={formData.resolution_time_minutes}
                      onChange={(minutes) => setFormData({ ...formData, resolution_time_minutes: minutes })}
                      description="Максимальное время для полного решения заявки"
                    />
                    <TimeInput
                      label="Уведомление о сроке решения"
                      value={formData.resolution_notification_minutes}
                      onChange={(minutes) => setFormData({ ...formData, resolution_notification_minutes: minutes })}
                      description="За сколько до окончания времени решения отправить уведомление"
                    />
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Icon name="AlertTriangle" size={16} className="text-orange-500" />
                    При отсутствии ответа
                  </h3>
                  <div className="space-y-4 pl-6">
                    <TimeInput
                      label="Время без ответа"
                      value={formData.no_response_minutes}
                      onChange={(minutes) => setFormData({ ...formData, no_response_minutes: minutes })}
                      description="Если клиент не отвечает указанное время"
                    />
                    <div className="space-y-2">
                      <Label htmlFor="no_response_status">Перевести в статус</Label>
                      <Select
                        value={formData.no_response_status_id?.toString() || 'none'}
                        onValueChange={(value) => setFormData({ ...formData, no_response_status_id: value === 'none' ? undefined : parseInt(value) })}
                      >
                        <SelectTrigger id="no_response_status">
                          <SelectValue placeholder="Выберите статус" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Не переводить</SelectItem>
                          {statuses.map((status) => (
                            <SelectItem key={status.id} value={status.id.toString()}>
                              {status.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="priorities" className="mt-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Icon name="Layers" size={16} className="text-purple-500" />
                      Времена по приоритетам
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Индивидуальные сроки для каждого приоритета заявки
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="priority-times-toggle" className="text-xs text-muted-foreground">
                      {priorityTimesEnabled ? 'Вкл' : 'Выкл'}
                    </Label>
                    <Switch
                      id="priority-times-toggle"
                      checked={priorityTimesEnabled}
                      onCheckedChange={handlePriorityTimesToggle}
                    />
                  </div>
                </div>

                {!priorityTimesEnabled ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Icon name="Layers" size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Включите, чтобы задать разные сроки для каждого приоритета</p>
                    <p className="text-xs mt-1">Сейчас используются общие значения со вкладки «Сроки»</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {priorityTimes.map((pt) => {
                      const priority = priorities.find(p => p.id === pt.priority_id);
                      if (!priority) return null;

                      return (
                        <div key={pt.priority_id} className="p-3 rounded-lg bg-muted/30 border border-border space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: priority.color }} />
                              <span className="text-sm font-medium">{priority.name}</span>
                              <span className="text-xs text-muted-foreground">(ур. {priority.level})</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:bg-red-500/10"
                              onClick={() => removePriorityTime(pt.priority_id)}
                            >
                              <Icon name="Trash2" size={14} />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <CompactTimeInput
                              label="Реакция"
                              value={pt.response_time_minutes}
                              onChange={(m) => updatePriorityTime(pt.priority_id, { response_time_minutes: m })}
                            />
                            <CompactTimeInput
                              label="Уведом. реакции"
                              value={pt.response_notification_minutes}
                              onChange={(m) => updatePriorityTime(pt.priority_id, { response_notification_minutes: m })}
                            />
                            <CompactTimeInput
                              label="Решение"
                              value={pt.resolution_time_minutes}
                              onChange={(m) => updatePriorityTime(pt.priority_id, { resolution_time_minutes: m })}
                            />
                            <CompactTimeInput
                              label="Уведом. решения"
                              value={pt.resolution_notification_minutes}
                              onChange={(m) => updatePriorityTime(pt.priority_id, { resolution_notification_minutes: m })}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {availablePriorities.length > 0 && (
                      <Select onValueChange={(val) => addPriorityTime(parseInt(val))}>
                        <SelectTrigger className="w-auto h-8 text-sm">
                          <SelectValue placeholder="Добавить приоритет..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availablePriorities.map((p) => (
                            <SelectItem key={p.id} value={p.id.toString()}>
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                                {p.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="groups" className="mt-4">
                <SlaGroupBudgets
                  slaId={editingSla?.id}
                  budgets={groupBudgets}
                  onBudgetsChange={setGroupBudgets}
                />
              </TabsContent>

              <TabsContent value="settings" className="mt-4 space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Icon name="Clock" size={18} className="text-blue-500" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">Учёт рабочего времени</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        SLA-таймеры считаются только в рабочие часы
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.use_work_schedule}
                    onCheckedChange={(checked) => setFormData({ ...formData, use_work_schedule: checked })}
                  />
                </div>

                {formData.use_work_schedule && (
                  <div className="text-xs text-muted-foreground bg-blue-500/5 p-3 rounded-lg border border-blue-500/10">
                    Нерабочие часы и выходные не будут учитываться при расчёте сроков. Графики берутся из настроек групп исполнителей.
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>
                Отмена
              </Button>
              <Button type="submit">
                {editingSla ? 'Сохранить' : 'Создать'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

const SlaCard = ({
  sla,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  getStatusName,
  canEdit,
  canDelete,
}: {
  sla: SLAItem;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  getStatusName: (id?: number) => string;
  canEdit: boolean;
  canDelete: boolean;
}) => {
  const hasPriorityTimes = sla.priority_times && sla.priority_times.length > 0;

  return (
    <Card className="bg-card/50 border-border hover:border-border/80 transition-all">
      <CardContent className="p-0">
        <div
          className="flex items-center justify-between p-4 cursor-pointer select-none"
          onClick={onToggle}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Icon
              name={expanded ? 'ChevronDown' : 'ChevronRight'}
              size={16}
              className="text-muted-foreground shrink-0"
            />
            <h3 className="text-base font-semibold truncate">{sla.name}</h3>
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Icon name="Timer" size={12} className="text-primary" />
                {formatTime(sla.response_time_minutes)}
              </span>
              <span className="text-border">|</span>
              <span className="flex items-center gap-1">
                <Icon name="CheckCircle2" size={12} className="text-green-500" />
                {formatTime(sla.resolution_time_minutes)}
              </span>
            </div>
            <div className="flex gap-1.5 shrink-0">
              {sla.use_work_schedule && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] bg-blue-500/10 text-blue-500">
                  <Icon name="Clock" size={10} />
                  <span className="hidden sm:inline">Раб. время</span>
                </span>
              )}
              {hasPriorityTimes && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] bg-purple-500/10 text-purple-500">
                  <Icon name="Layers" size={10} />
                  <span className="hidden sm:inline">Приоритеты</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
            {canEdit && (
              <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8 hover:bg-accent/30">
                <Icon name="Pencil" size={16} />
              </Button>
            )}
            {canDelete && (
              <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 hover:bg-red-500/10 text-red-500">
                <Icon name="Trash2" size={16} />
              </Button>
            )}
          </div>
        </div>

        {expanded && (
          <div className="px-4 pb-4 pt-0 border-t border-border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2.5">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Реакция</div>
                <InfoRow icon="Timer" iconColor="text-primary" label="Время реакции" value={formatTime(sla.response_time_minutes)} />
                <InfoRow icon="Bell" iconColor="text-yellow-500" label="Уведомление" value={`через ${formatTime(sla.response_notification_minutes)}`} />
                {sla.no_response_minutes && (
                  <InfoRow icon="AlertTriangle" iconColor="text-orange-500" label="Без ответа" value={`${formatTime(sla.no_response_minutes)} → ${getStatusName(sla.no_response_status_id)}`} />
                )}
              </div>
              <div className="space-y-2.5">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Решение</div>
                <InfoRow icon="CheckCircle2" iconColor="text-green-500" label="Время решения" value={formatTime(sla.resolution_time_minutes)} />
                <InfoRow icon="Bell" iconColor="text-yellow-500" label="Уведомление" value={`через ${formatTime(sla.resolution_notification_minutes)}`} />
              </div>
            </div>

            {hasPriorityTimes && (
              <PriorityTimesPreview priorityTimes={sla.priority_times!} />
            )}

            <SlaGroupBudgetsPreview slaId={sla.id} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const InfoRow = ({ icon, iconColor, label, value }: { icon: string; iconColor: string; label: string; value: string }) => (
  <div className="flex items-center gap-2">
    <Icon name={icon} size={14} className={`${iconColor} shrink-0`} />
    <span className="text-xs text-muted-foreground">{label}:</span>
    <span className="text-xs font-medium">{value}</span>
  </div>
);

const PriorityTimesPreview = ({ priorityTimes }: { priorityTimes: PriorityTime[] }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-4">
      <CollapsibleTrigger asChild>
        <button className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors">
          <Icon name={isOpen ? 'ChevronDown' : 'ChevronRight'} size={14} />
          <Icon name="Layers" size={14} />
          <span>Времена по приоритетам ({priorityTimes.length})</span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 ml-6 space-y-1.5">
        {priorityTimes.map((pt) => (
          <div key={pt.priority_id} className="flex items-center gap-3 text-xs py-1.5 px-2 rounded bg-muted/20">
            <div className="flex items-center gap-1.5 min-w-[80px]">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pt.priority_color || '#888' }} />
              <span className="font-medium">{pt.priority_name}</span>
            </div>
            <span className="text-muted-foreground">Реакция: {formatTime(pt.response_time_minutes)}</span>
            <span className="text-muted-foreground">Решение: {formatTime(pt.resolution_time_minutes)}</span>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default SLA;
