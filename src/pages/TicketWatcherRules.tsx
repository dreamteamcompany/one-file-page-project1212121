import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, getApiUrl } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import PageLayout from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import WatcherRulesList from './ticket-watcher-rules/WatcherRulesList';
import WatcherRuleDialog from './ticket-watcher-rules/WatcherRuleDialog';
import {
  EMPTY_FORM,
  FormState,
  Reference,
  RuleTarget,
  WatcherRule,
} from './ticket-watcher-rules/types';

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
      assignee_id: rule.assignee_id ? String(rule.assignee_id) : '',
      match_mode: rule.match_mode === 'OR' ? 'OR' : 'AND',
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
    const hasCondition = ['category_id', 'department_id', 'priority_id', 'executor_group_id', 'assignee_id']
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
        assignee_id: form.assignee_id ? Number(form.assignee_id) : null,
        match_mode: form.match_mode,
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
        assignee_id: rule.assignee_id,
        match_mode: rule.match_mode,
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

      <WatcherRulesList
        rules={rules}
        loading={loading}
        canManage={canManage}
        onCreate={openCreate}
        onToggleActive={toggleActive}
        onEdit={openEdit}
        onRemove={remove}
      />

      <WatcherRuleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        form={form}
        setForm={setForm}
        reference={reference}
        saving={saving}
        newTargetType={newTargetType}
        setNewTargetType={setNewTargetType}
        newTargetId={newTargetId}
        setNewTargetId={setNewTargetId}
        onAddTarget={addTarget}
        onRemoveTarget={removeTarget}
        onSave={save}
      />
    </PageLayout>
  );
};

export default TicketWatcherRules;