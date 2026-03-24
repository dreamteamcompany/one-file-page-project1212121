import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import PageLayout from '@/components/layout/PageLayout';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';
import func2url from '../../backend/func2url.json';

const AI_TRAINING_URL = func2url['api-ai-training'];

interface TrainingExample {
  id: number;
  description: string;
  ticket_service_id: number;
  service_ids: number[];
  ticket_service_name: string;
  service_names: string[];
  created_at: string;
}

interface TrainingRule {
  id: number;
  rule_text: string;
  is_active: boolean;
  created_at: string;
}

interface TicketService {
  id: number;
  name: string;
  service_ids?: number[];
}

interface Service {
  id: number;
  name: string;
}

const AiTraining = () => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tab, setTab] = useState<'examples' | 'rules'>('examples');
  const [examples, setExamples] = useState<TrainingExample[]>([]);
  const [rules, setRules] = useState<TrainingRule[]>([]);
  const [ticketServices, setTicketServices] = useState<TicketService[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [stats, setStats] = useState({ examples_count: 0, active_rules_count: 0 });
  const [loading, setLoading] = useState(true);

  const [exampleDialog, setExampleDialog] = useState(false);
  const [ruleDialog, setRuleDialog] = useState(false);
  const [editingExample, setEditingExample] = useState<TrainingExample | null>(null);
  const [editingRule, setEditingRule] = useState<TrainingRule | null>(null);

  const [exampleForm, setExampleForm] = useState({ description: '', ticket_service_id: '', service_ids: [] as number[] });
  const [ruleForm, setRuleForm] = useState({ rule_text: '', is_active: true });

  useEffect(() => {
    if (!hasPermission('settings', 'read')) {
      navigate('/tickets');
      return;
    }
    loadData();
  }, [hasPermission, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [exRes, rulesRes, statsRes, tsRes, svcRes] = await Promise.all([
        apiFetch(`${AI_TRAINING_URL}?endpoint=examples`),
        apiFetch(`${AI_TRAINING_URL}?endpoint=rules`),
        apiFetch(`${AI_TRAINING_URL}?endpoint=stats`),
        apiFetch('/ticket_services?endpoint=ticket_services'),
        apiFetch('/services?endpoint=services'),
      ]);

      if (exRes.ok) setExamples(await exRes.json());
      if (rulesRes.ok) setRules(await rulesRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (tsRes.ok) {
        const tsData = await tsRes.json();
        setTicketServices(Array.isArray(tsData) ? tsData : tsData.ticket_services || []);
      }
      if (svcRes.ok) {
        const svcData = await svcRes.json();
        setServices(Array.isArray(svcData) ? svcData : []);
      }
    } catch (err) {
      console.error('Failed to load AI training data:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedTs = ticketServices.find(ts => ts.id.toString() === exampleForm.ticket_service_id);
  const filteredServices = selectedTs?.service_ids
    ? services.filter(s => selectedTs.service_ids?.includes(s.id))
    : services;

  const openExampleDialog = (example?: TrainingExample) => {
    if (example) {
      setEditingExample(example);
      setExampleForm({
        description: example.description,
        ticket_service_id: example.ticket_service_id.toString(),
        service_ids: example.service_ids || [],
      });
    } else {
      setEditingExample(null);
      setExampleForm({ description: '', ticket_service_id: '', service_ids: [] });
    }
    setExampleDialog(true);
  };

  const openRuleDialog = (rule?: TrainingRule) => {
    if (rule) {
      setEditingRule(rule);
      setRuleForm({ rule_text: rule.rule_text, is_active: rule.is_active });
    } else {
      setEditingRule(null);
      setRuleForm({ rule_text: '', is_active: true });
    }
    setRuleDialog(true);
  };

  const saveExample = async () => {
    if (!exampleForm.description.trim() || !exampleForm.ticket_service_id) {
      toast({ title: 'Заполните описание и выберите услугу', variant: 'destructive' });
      return;
    }

    const body = {
      ...(editingExample ? { id: editingExample.id } : {}),
      description: exampleForm.description.trim(),
      ticket_service_id: parseInt(exampleForm.ticket_service_id),
      service_ids: exampleForm.service_ids,
    };

    const res = await apiFetch(AI_TRAINING_URL + '?endpoint=examples', {
      method: editingExample ? 'PUT' : 'POST',
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast({ title: editingExample ? 'Пример обновлён' : 'Пример добавлен' });
      setExampleDialog(false);
      loadData();
    } else {
      toast({ title: 'Ошибка сохранения', variant: 'destructive' });
    }
  };

  const deleteExample = async (id: number) => {
    const res = await apiFetch(AI_TRAINING_URL + '?endpoint=examples', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      toast({ title: 'Пример удалён' });
      loadData();
    }
  };

  const saveRule = async () => {
    if (!ruleForm.rule_text.trim()) {
      toast({ title: 'Заполните текст правила', variant: 'destructive' });
      return;
    }

    const body = {
      ...(editingRule ? { id: editingRule.id } : {}),
      rule_text: ruleForm.rule_text.trim(),
      is_active: ruleForm.is_active,
    };

    const res = await apiFetch(AI_TRAINING_URL + '?endpoint=rules', {
      method: editingRule ? 'PUT' : 'POST',
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast({ title: editingRule ? 'Правило обновлено' : 'Правило добавлено' });
      setRuleDialog(false);
      loadData();
    } else {
      toast({ title: 'Ошибка сохранения', variant: 'destructive' });
    }
  };

  const deleteRule = async (id: number) => {
    const res = await apiFetch(AI_TRAINING_URL + '?endpoint=rules', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      toast({ title: 'Правило удалено' });
      loadData();
    }
  };

  const toggleRule = async (rule: TrainingRule) => {
    const res = await apiFetch(AI_TRAINING_URL + '?endpoint=rules', {
      method: 'PUT',
      body: JSON.stringify({ id: rule.id, is_active: !rule.is_active }),
    });
    if (res.ok) loadData();
  };

  const toggleServiceId = (serviceId: number) => {
    setExampleForm(prev => ({
      ...prev,
      service_ids: prev.service_ids.includes(serviceId)
        ? prev.service_ids.filter(id => id !== serviceId)
        : [...prev.service_ids, serviceId],
    }));
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center py-20">
          <Icon name="Loader2" size={32} className="animate-spin text-primary" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
            <Icon name="ArrowLeft" size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Обучение AI</h1>
            <p className="text-sm text-muted-foreground">
              Примеры и правила для автоматической классификации заявок
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Icon name="BookOpen" size={20} className="text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.examples_count}</p>
                <p className="text-xs text-muted-foreground">Примеров заявок</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Icon name="Lightbulb" size={20} className="text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active_rules_count}</p>
                <p className="text-xs text-muted-foreground">Активных правил</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 mb-4">
        <Button
          variant={tab === 'examples' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('examples')}
          className="gap-2"
        >
          <Icon name="BookOpen" size={16} />
          Примеры заявок
        </Button>
        <Button
          variant={tab === 'rules' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('rules')}
          className="gap-2"
        >
          <Icon name="Lightbulb" size={16} />
          Правила
        </Button>
      </div>

      {tab === 'examples' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Примеры заявок</CardTitle>
                <CardDescription className="text-xs mt-1">
                  Добавьте реальные заявки с правильной классификацией. AI будет использовать их как образец.
                </CardDescription>
              </div>
              <Button size="sm" className="gap-2" onClick={() => openExampleDialog()}>
                <Icon name="Plus" size={16} />
                Добавить
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {examples.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Icon name="BookOpen" size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Пока нет примеров</p>
                <p className="text-xs mt-1">Добавьте первый пример заявки для обучения AI</p>
              </div>
            ) : (
              <div className="space-y-3">
                {examples.map(ex => (
                  <div key={ex.id} className="p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium mb-1.5 line-clamp-2">{ex.description}</p>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="secondary" className="text-xs">
                            {ex.ticket_service_name}
                          </Badge>
                          {ex.service_names?.map((name, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openExampleDialog(ex)}>
                          <Icon name="Pencil" size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteExample(ex.id)}>
                          <Icon name="Trash2" size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'rules' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Правила классификации</CardTitle>
                <CardDescription className="text-xs mt-1">
                  Текстовые подсказки для AI. Например: «Если упоминается Stoma1C — это сервис 1С»
                </CardDescription>
              </div>
              <Button size="sm" className="gap-2" onClick={() => openRuleDialog()}>
                <Icon name="Plus" size={16} />
                Добавить
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {rules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Icon name="Lightbulb" size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Пока нет правил</p>
                <p className="text-xs mt-1">Добавьте правило, чтобы AI лучше понимал ваш контекст</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rules.map(rule => (
                  <div key={rule.id} className={`p-3 rounded-lg border transition-colors ${rule.is_active ? 'bg-muted/20 hover:bg-muted/40' : 'bg-muted/5 opacity-60'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{rule.rule_text}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Switch
                          checked={rule.is_active}
                          onCheckedChange={() => toggleRule(rule)}
                        />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openRuleDialog(rule)}>
                          <Icon name="Pencil" size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteRule(rule.id)}>
                          <Icon name="Trash2" size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={exampleDialog} onOpenChange={setExampleDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingExample ? 'Редактировать пример' : 'Новый пример заявки'}</DialogTitle>
            <DialogDescription>
              Опишите заявку и укажите правильную классификацию
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Описание заявки *</Label>
              <Textarea
                value={exampleForm.description}
                onChange={e => setExampleForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Не могу списать процедуры в базе Stoma1C_Krasnodar"
                className="mt-1.5"
                rows={3}
              />
            </div>
            <div>
              <Label>Услуга *</Label>
              <Select
                value={exampleForm.ticket_service_id}
                onValueChange={v => setExampleForm(prev => ({ ...prev, ticket_service_id: v, service_ids: [] }))}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Выберите услугу" />
                </SelectTrigger>
                <SelectContent>
                  {ticketServices.map(ts => (
                    <SelectItem key={ts.id} value={ts.id.toString()}>
                      {ts.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {filteredServices.length > 0 && (
              <div>
                <Label>Сервисы</Label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {filteredServices.map(svc => (
                    <Badge
                      key={svc.id}
                      variant={exampleForm.service_ids.includes(svc.id) ? 'default' : 'outline'}
                      className="cursor-pointer transition-colors"
                      onClick={() => toggleServiceId(svc.id)}
                    >
                      {svc.name}
                      {exampleForm.service_ids.includes(svc.id) && (
                        <Icon name="Check" size={12} className="ml-1" />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setExampleDialog(false)}>Отмена</Button>
              <Button onClick={saveExample}>
                {editingExample ? 'Сохранить' : 'Добавить'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={ruleDialog} onOpenChange={setRuleDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Редактировать правило' : 'Новое правило'}</DialogTitle>
            <DialogDescription>
              Напишите правило для AI-классификатора своими словами
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Текст правила *</Label>
              <Textarea
                value={ruleForm.rule_text}
                onChange={e => setRuleForm(prev => ({ ...prev, rule_text: e.target.value }))}
                placeholder="Если упоминается Stoma1C или любая база 1С — это всегда сервис «1С и удалённый рабочий стол»"
                className="mt-1.5"
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Пишите как объясняли бы человеку. AI воспримет это как инструкцию.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={ruleForm.is_active}
                onCheckedChange={v => setRuleForm(prev => ({ ...prev, is_active: v }))}
              />
              <Label>Правило активно</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setRuleDialog(false)}>Отмена</Button>
              <Button onClick={saveRule}>
                {editingRule ? 'Сохранить' : 'Добавить'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default AiTraining;