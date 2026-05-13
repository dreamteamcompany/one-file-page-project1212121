import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, getApiUrl } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import PageLayout from '@/components/layout/PageLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RefItem {
  id: number;
  name: string;
  email?: string;
}

interface Reference {
  categories: RefItem[];
  departments: RefItem[];
  priorities: RefItem[];
  executor_groups: RefItem[];
  users: RefItem[];
  roles: RefItem[];
}

interface RuleTarget {
  id?: number;
  rule_id?: number;
  target_type: 'user' | 'group' | 'role';
  target_id: number;
  target_name?: string;
}

interface WatcherRule {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  trigger_on_create: boolean;
  trigger_on_update: boolean;
  trigger_on_executor_change: boolean;
  category_id: number | null;
  category_name?: string | null;
  department_id: number | null;
  department_name?: string | null;
  priority_id: number | null;
  priority_name?: string | null;
  executor_group_id: number | null;
  executor_group_name?: string | null;
  targets: RuleTarget[];
}

type FormState = {
  name: string;
  description: string;
  is_active: boolean;
  trigger_on_create: boolean;
  trigger_on_update: boolean;
  trigger_on_executor_change: boolean;
  category_id: string;
  department_id: string;
  priority_id: string;
  executor_group_id: string;
  targets: RuleTarget[];
};

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  is_active: true,
  trigger_on_create: true,
  trigger_on_update: false,
  trigger_on_executor_change: false,
  category_id: '',
  department_id: '',
  priority_id: '',
  executor_group_id: '',
  targets: [],
};

const TARGET_TYPE_LABEL: Record<RuleTarget['target_type'], string> = {
  user: 'Пользователь',
  group: 'Группа',
  role: 'Роль',
};

const TARGET_TYPE_ICON: Record<RuleTarget['target_type'], string> = {
  user: 'User',
  group: 'Users',
  role: 'Shield',
};

const TicketWatcherRules = () => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rules, setRules] = useState<WatcherRule[]>([]);
  const [reference, setReference] = useState<Reference | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WatcherRule | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [newTargetType, setNewTargetType] = useState<RuleTarget['target_type']>('user');
  const [newTargetId, setNewTargetId] = useState<string>('');

  const canManage = hasPermission('ticket_priorities', 'update');
  const url = getApiUrl('watcher-rules');

  useEffect(() => {
    if (!hasPermission('ticket_priorities', 'read')) {
      navigate('/tickets');
      return;
    }
    void loadAll();
  }, [hasPermission, navigate]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [rulesRes, refRes] = await Promise.all([
        apiFetch(url),
        apiFetch(`${url}?action=reference`),
      ]);
      if (rulesRes.ok) setRules(await rulesRes.json());
      if (refRes.ok) setReference(await refRes.json());
    } catch (e) {
      console.error(e);
      toast({ title: 'Не удалось загрузить правила', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setNewTargetType('user');
    setNewTargetId('');
    setDialogOpen(true);
  };

  const openEdit = (rule: WatcherRule) => {
    setEditing(rule);
    setForm({
      name: rule.name,
      description: rule.description || '',
      is_active: rule.is_active,
      trigger_on_create: rule.trigger_on_create,
      trigger_on_update: rule.trigger_on_update,
      trigger_on_executor_change: !!rule.trigger_on_executor_change,
      category_id: rule.category_id ? String(rule.category_id) : '',
      department_id: rule.department_id ? String(rule.department_id) : '',
      priority_id: rule.priority_id ? String(rule.priority_id) : '',
      executor_group_id: rule.executor_group_id ? String(rule.executor_group_id) : '',
      targets: rule.targets.map((t) => ({ ...t })),
    });
    setNewTargetType('user');
    setNewTargetId('');
    setDialogOpen(true);
  };

  const addTarget = () => {
    const id = parseInt(newTargetId, 10);
    if (!id) return;
    if (form.targets.some((t) => t.target_type === newTargetType && t.target_id === id)) {
      toast({ title: 'Этот наблюдатель уже добавлен' });
      return;
    }
    const refList =
      newTargetType === 'user' ? reference?.users
      : newTargetType === 'group' ? reference?.executor_groups
      : reference?.roles;
    const found = refList?.find((r) => r.id === id);
    setForm((f) => ({
      ...f,
      targets: [...f.targets, { target_type: newTargetType, target_id: id, target_name: found?.name }],
    }));
    setNewTargetId('');
  };

  const removeTarget = (index: number) => {
    setForm((f) => ({ ...f, targets: f.targets.filter((_, i) => i !== index) }));
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Укажите название правила', variant: 'destructive' });
      return;
    }
    const hasCondition = ['category_id', 'department_id', 'priority_id', 'executor_group_id']
      .some((k) => form[k as keyof FormState]);
    if (!form.trigger_on_create && !form.trigger_on_update && !form.trigger_on_executor_change) {
      toast({ title: 'Выберите хотя бы один триггер срабатывания', variant: 'destructive' });
      return;
    }
    if ((form.trigger_on_create || form.trigger_on_update) && !hasCondition) {
      toast({
        title: 'Для триггеров «При создании»/«При изменении» укажите хотя бы одно условие в блоке «Если»',
        variant: 'destructive',
      });
      return;
    }
    if (form.targets.length === 0 && !form.trigger_on_executor_change) {
      toast({ title: 'Добавьте хотя бы одного наблюдателя в блоке «То»', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        is_active: form.is_active,
        trigger_on_create: form.trigger_on_create,
        trigger_on_update: form.trigger_on_update,
        trigger_on_executor_change: form.trigger_on_executor_change,
        category_id: form.category_id ? Number(form.category_id) : null,
        department_id: form.department_id ? Number(form.department_id) : null,
        priority_id: form.priority_id ? Number(form.priority_id) : null,
        executor_group_id: form.executor_group_id ? Number(form.executor_group_id) : null,
        targets: form.targets.map((t) => ({ target_type: t.target_type, target_id: t.target_id })),
      };
      const res = await apiFetch(editing ? `${url}?id=${editing.id}` : url, {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({ title: err.error || 'Не удалось сохранить правило', variant: 'destructive' });
        return;
      }
      toast({ title: editing ? 'Правило обновлено' : 'Правило создано' });
      setDialogOpen(false);
      await loadAll();
    } catch (e) {
      console.error(e);
      toast({ title: 'Ошибка соединения', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (rule: WatcherRule) => {
    if (!confirm(`Удалить правило «${rule.name}»?`)) return;
    try {
      const res = await apiFetch(`${url}?id=${rule.id}`, { method: 'DELETE' });
      if (!res.ok) {
        toast({ title: 'Не удалось удалить правило', variant: 'destructive' });
        return;
      }
      toast({ title: 'Правило удалено' });
      setRules((prev) => prev.filter((r) => r.id !== rule.id));
    } catch (e) {
      console.error(e);
      toast({ title: 'Ошибка соединения', variant: 'destructive' });
    }
  };

  const toggleActive = async (rule: WatcherRule) => {
    try {
      const payload = {
        name: rule.name,
        description: rule.description,
        is_active: !rule.is_active,
        trigger_on_create: rule.trigger_on_create,
        trigger_on_update: rule.trigger_on_update,
        trigger_on_executor_change: !!rule.trigger_on_executor_change,
        category_id: rule.category_id,
        department_id: rule.department_id,
        priority_id: rule.priority_id,
        executor_group_id: rule.executor_group_id,
        targets: rule.targets.map((t) => ({ target_type: t.target_type, target_id: t.target_id })),
      };
      const res = await apiFetch(`${url}?id=${rule.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (!res.ok) return;
      await loadAll();
    } catch (e) {
      console.error(e);
    }
  };

  const renderConditions = (rule: WatcherRule) => {
    const chips: { label: string; value: string }[] = [];
    if (rule.category_name) chips.push({ label: 'Категория', value: rule.category_name });
    if (rule.department_name) chips.push({ label: 'Отдел', value: rule.department_name });
    if (rule.priority_name) chips.push({ label: 'Приоритет', value: rule.priority_name });
    if (rule.executor_group_name) chips.push({ label: 'Группа', value: rule.executor_group_name });
    if (!chips.length) return <span className="text-muted-foreground text-sm">условий нет</span>;
    return (
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <Badge key={c.label} variant="secondary" className="text-xs">
            {c.label}: <span className="font-semibold ml-1">{c.value}</span>
          </Badge>
        ))}
      </div>
    );
  };

  if (!hasPermission('ticket_priorities', 'read')) return null;

  return (
    <PageLayout>
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Icon name="Eye" size={26} />
            Наблюдатели
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Правила автоматического добавления наблюдателей к заявкам по принципу «Если → То»
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Icon name="Plus" size={16} className="mr-2" />
            Новое правило
          </Button>
        )}
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Icon name="Loader2" size={28} className="animate-spin text-muted-foreground" />
        </div>
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Icon name="Eye" size={48} className="mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-4">Пока нет ни одного правила</p>
            {canManage && (
              <Button onClick={openCreate} variant="outline">
                <Icon name="Plus" size={16} className="mr-2" />
                Создать первое правило
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <Card key={rule.id} className={rule.is_active ? '' : 'opacity-60'}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="font-semibold text-base">{rule.name}</h3>
                      {!rule.is_active && (
                        <Badge variant="outline" className="text-xs">отключено</Badge>
                      )}
                      <div className="flex gap-1">
                        {rule.trigger_on_create && (
                          <Badge variant="outline" className="text-xs">при создании</Badge>
                        )}
                        {rule.trigger_on_update && (
                          <Badge variant="outline" className="text-xs">при изменении</Badge>
                        )}
                        {rule.trigger_on_executor_change && (
                          <Badge variant="outline" className="text-xs">при смене исполнителя</Badge>
                        )}
                      </div>
                    </div>
                    {rule.description && (
                      <p className="text-sm text-muted-foreground mb-2">{rule.description}</p>
                    )}

                    <div className="grid sm:grid-cols-2 gap-3 mt-3">
                      <div>
                        <div className="text-xs uppercase text-muted-foreground mb-1.5 flex items-center gap-1">
                          <Icon name="GitBranch" size={12} />
                          Если
                        </div>
                        {renderConditions(rule)}
                      </div>
                      <div>
                        <div className="text-xs uppercase text-muted-foreground mb-1.5 flex items-center gap-1">
                          <Icon name="ArrowRight" size={12} />
                          То добавить наблюдателей
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {rule.trigger_on_executor_change && (
                            <Badge variant="secondary" className="text-xs bg-violet-500/10 text-violet-600 dark:text-violet-300">
                              <Icon name="UserMinus" size={10} className="mr-1" />
                              Бывший исполнитель
                            </Badge>
                          )}
                          {rule.targets.map((t, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              <Icon
                                name={TARGET_TYPE_ICON[t.target_type] as 'User'}
                                size={10}
                                className="mr-1"
                              />
                              {t.target_name || `#${t.target_id}`}
                            </Badge>
                          ))}
                          {rule.targets.length === 0 && !rule.trigger_on_executor_change && (
                            <span className="text-muted-foreground text-sm">нет</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex sm:flex-col gap-2">
                      <Button variant="ghost" size="sm" onClick={() => toggleActive(rule)}>
                        <Icon name={rule.is_active ? 'Pause' : 'Play'} size={14} className="mr-1" />
                        {rule.is_active ? 'Отключить' : 'Включить'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(rule)}>
                        <Icon name="Pencil" size={14} className="mr-1" />
                        Изменить
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => remove(rule)}
                      >
                        <Icon name="Trash2" size={14} className="mr-1" />
                        Удалить
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Редактирование правила' : 'Новое правило'}</DialogTitle>
            <DialogDescription>
              Условия из блока «Если» проверяются на заявке. Если все указанные совпадают —
              добавляются наблюдатели из блока «То».
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Название</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Например: VIP-заявки бухгалтерии"
              />
            </div>
            <div>
              <Label>Описание (необязательно)</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="font-medium">Активно</Label>
                <p className="text-xs text-muted-foreground">Отключённые правила не применяются</p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
            </div>

            <div className="rounded-lg border p-3 space-y-2">
              <Label className="font-medium">Когда срабатывать</Label>
              <div className="flex items-center justify-between">
                <span className="text-sm">При создании заявки</span>
                <Switch
                  checked={form.trigger_on_create}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, trigger_on_create: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">При изменении полей заявки</span>
                <Switch
                  checked={form.trigger_on_update}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, trigger_on_update: v }))}
                />
              </div>
              <div className="flex items-start justify-between gap-3 pt-1 border-t border-border/40">
                <div className="flex-1">
                  <span className="text-sm">При смене исполнителя</span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Бывший исполнитель автоматически добавляется в наблюдатели.
                    Условия «Если» и таргеты «То» при этом триггере необязательны.
                  </p>
                </div>
                <Switch
                  checked={form.trigger_on_executor_change}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, trigger_on_executor_change: v }))}
                />
              </div>
            </div>

            <div className="rounded-lg border p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Icon name="GitBranch" size={16} />
                <Label className="font-medium">Если у заявки</Label>
                <span className="text-xs text-muted-foreground">
                  (укажите 1+ условие, пустые игнорируются)
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Категория</Label>
                  <Select
                    value={form.category_id || 'any'}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, category_id: v === 'any' ? '' : v }))
                    }
                  >
                    <SelectTrigger><SelectValue placeholder="Любая" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Любая</SelectItem>
                      {reference?.categories.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Отдел / департамент</Label>
                  <Select
                    value={form.department_id || 'any'}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, department_id: v === 'any' ? '' : v }))
                    }
                  >
                    <SelectTrigger><SelectValue placeholder="Любой" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Любой</SelectItem>
                      {reference?.departments.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Приоритет</Label>
                  <Select
                    value={form.priority_id || 'any'}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, priority_id: v === 'any' ? '' : v }))
                    }
                  >
                    <SelectTrigger><SelectValue placeholder="Любой" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Любой</SelectItem>
                      {reference?.priorities.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Группа исполнителей</Label>
                  <Select
                    value={form.executor_group_id || 'any'}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, executor_group_id: v === 'any' ? '' : v }))
                    }
                  >
                    <SelectTrigger><SelectValue placeholder="Любая" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Любая</SelectItem>
                      {reference?.executor_groups.map((g) => (
                        <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Icon name="ArrowRight" size={16} />
                <Label className="font-medium">То добавить наблюдателей</Label>
              </div>

              {form.targets.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.targets.map((t, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1 pr-1">
                      <Icon name={TARGET_TYPE_ICON[t.target_type] as 'User'} size={12} />
                      <span className="text-xs">
                        {TARGET_TYPE_LABEL[t.target_type]}: {t.target_name || `#${t.target_id}`}
                      </span>
                      <button
                        type="button"
                        className="ml-1 rounded hover:bg-muted p-0.5"
                        onClick={() => removeTarget(idx)}
                      >
                        <Icon name="X" size={10} />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr_auto] gap-2">
                <Select
                  value={newTargetType}
                  onValueChange={(v) => {
                    setNewTargetType(v as RuleTarget['target_type']);
                    setNewTargetId('');
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Пользователь</SelectItem>
                    <SelectItem value="group">Группа</SelectItem>
                    <SelectItem value="role">Роль</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={newTargetId} onValueChange={setNewTargetId}>
                  <SelectTrigger><SelectValue placeholder="Выберите..." /></SelectTrigger>
                  <SelectContent>
                    {(newTargetType === 'user' ? reference?.users
                      : newTargetType === 'group' ? reference?.executor_groups
                      : reference?.roles)?.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button type="button" variant="outline" onClick={addTarget} disabled={!newTargetId}>
                  <Icon name="Plus" size={14} className="mr-1" />
                  Добавить
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Отмена
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Icon name="Loader2" size={14} className="mr-2 animate-spin" />}
              {editing ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default TicketWatcherRules;