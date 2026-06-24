import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import PageLayout from '@/components/layout/PageLayout';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch, getApiUrl } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';
import { formatDateTimeMSK } from '@/utils/dateFormat';
import func2url from '../../backend/func2url.json';

const AUTOMATION_URL = (func2url as Record<string, string>)['automation'];

type SchedulePreset = 'off' | 'hourly' | 'every_6h' | 'every_12h' | 'daily' | 'weekly';

interface AutomationJob {
  job_key: string;
  title: string;
  description: string;
  enabled: boolean;
  schedule_preset: SchedulePreset;
  params: Record<string, unknown>;
  last_run_at: string | null;
  last_finished_at: string | null;
  last_status: string | null;
  last_message: string;
  next_run_at: string | null;
}

interface AutomationRun {
  id: number;
  job_key: string;
  trigger_type: string;
  started_by_name: string;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  status: string;
  message: string;
  result: Record<string, unknown>;
}

interface Company {
  id: number;
  name: string;
}

const PRESET_OPTIONS: { value: SchedulePreset; label: string }[] = [
  { value: 'off', label: 'Выключено' },
  { value: 'hourly', label: 'Каждый час' },
  { value: 'every_6h', label: 'Каждые 6 часов' },
  { value: 'every_12h', label: 'Каждые 12 часов' },
  { value: 'daily', label: 'Раз в сутки' },
  { value: 'weekly', label: 'Раз в неделю' },
];

const JOB_ICONS: Record<string, string> = {
  bitrix_sync_positions: 'RefreshCw',
  bitrix_inactive_users: 'UserX',
  reassign_by_schedule: 'Users',
};

const MODE_OPTIONS = [
  { value: 'long_inactive', label: 'Давно не заходили' },
  { value: 'never_logged', label: 'Ни разу не заходили' },
  { value: 'all', label: 'Все неактивные' },
];

const formatDate = (iso: string | null): string => {
  if (!iso) return '—';
  try {
    return formatDateTimeMSK(iso);
  } catch {
    return '—';
  }
};

const statusBadge = (status: string | null) => {
  if (!status) return null;
  const map: Record<string, { label: string; cls: string }> = {
    success: { label: 'Успешно', cls: 'bg-green-500/15 text-green-500 border-green-500/30' },
    error: { label: 'Ошибка', cls: 'bg-red-500/15 text-red-500 border-red-500/30' },
    running: { label: 'Выполняется', cls: 'bg-blue-500/15 text-blue-500 border-blue-500/30' },
  };
  const info = map[status] || { label: status, cls: 'bg-muted text-muted-foreground' };
  return <Badge variant="outline" className={info.cls}>{info.label}</Badge>;
};

const AutomationSettings = () => {
  const { hasPermission, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const isAdmin = useMemo(() => {
    if (!user) return false;
    const roles = (user.roles || []) as Array<string | { system_role?: string; name?: string }>;
    return roles.some((r) =>
      typeof r === 'string'
        ? r === 'admin'
        : r?.system_role === 'admin' || r?.name === 'admin',
    );
  }, [user]);

  const [jobs, setJobs] = useState<AutomationJob[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [runs, setRuns] = useState<Record<string, AutomationRun[]>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [triggeringKey, setTriggeringKey] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasPermission('settings', 'read') || !isAdmin) {
      navigate('/settings');
    }
  }, [hasPermission, isAdmin, navigate]);

  const loadJobs = async () => {
    try {
      const r = await apiFetch(AUTOMATION_URL);
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        toast({ title: err.error || 'Не удалось загрузить задачи', variant: 'destructive' });
        return;
      }
      const data = await r.json();
      setJobs(data.jobs || []);
    } catch (e) {
      console.error(e);
      toast({ title: 'Ошибка соединения', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    try {
      const r = await apiFetch(`${getApiUrl('companies')}?resource=companies`);
      if (r.ok) {
        const data = await r.json();
        const list = Array.isArray(data) ? data : data.companies || data.items || [];
        setCompanies(
          list.map((c: { id: number; name: string }) => ({ id: c.id, name: c.name })),
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadRuns = async (jobKey: string) => {
    try {
      const r = await apiFetch(`${AUTOMATION_URL}?action=runs&job_key=${jobKey}&limit=20`);
      if (r.ok) {
        const data = await r.json();
        setRuns((prev) => ({ ...prev, [jobKey]: data.runs || [] }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadJobs();
    loadCompanies();
  }, []);

  const updateJobLocal = (jobKey: string, patch: Partial<AutomationJob>) => {
    setJobs((prev) => prev.map((j) => (j.job_key === jobKey ? { ...j, ...patch } : j)));
  };

  const saveJob = async (job: AutomationJob) => {
    setSavingKey(job.job_key);
    try {
      const r = await apiFetch(AUTOMATION_URL, {
        method: 'PUT',
        body: JSON.stringify({
          job_key: job.job_key,
          enabled: job.enabled,
          schedule_preset: job.schedule_preset,
          params: job.params,
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        toast({ title: err.error || 'Не удалось сохранить', variant: 'destructive' });
        await loadJobs();
        return;
      }
      const data = await r.json();
      if (data.job) updateJobLocal(job.job_key, data.job);
      toast({ title: 'Настройки сохранены' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Ошибка соединения', variant: 'destructive' });
    } finally {
      setSavingKey(null);
    }
  };

  const triggerJob = async (job: AutomationJob) => {
    setTriggeringKey(job.job_key);
    try {
      const r = await apiFetch(AUTOMATION_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'trigger', job_key: job.job_key }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast({ title: data.error || 'Запуск завершился ошибкой', variant: 'destructive' });
      } else {
        const okStatus = data.status === 'success';
        toast({
          title: okStatus ? 'Задача выполнена' : 'Задача завершилась с ошибкой',
          description: data.message || '',
          variant: okStatus ? 'default' : 'destructive',
        });
        if (data.job) updateJobLocal(job.job_key, data.job);
      }
      await loadRuns(job.job_key);
    } catch (e) {
      console.error(e);
      toast({ title: 'Ошибка соединения', variant: 'destructive' });
    } finally {
      setTriggeringKey(null);
    }
  };

  const toggleHistory = async (jobKey: string) => {
    const willOpen = !historyOpen[jobKey];
    setHistoryOpen((prev) => ({ ...prev, [jobKey]: willOpen }));
    if (willOpen && !runs[jobKey]) {
      await loadRuns(jobKey);
    }
  };

  if (!isAdmin) return null;

  return (
    <PageLayout>
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/settings')} className="gap-2">
            <Icon name="ArrowLeft" size={16} />
            Назад
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Автоматизация</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Периодический запуск синхронизации и проверок
            </p>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Icon name="Loader2" size={32} className="animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {jobs.map((job) => (
            <Card key={job.job_key}>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10">
                      <Icon
                        name={JOB_ICONS[job.job_key] || 'UserX'}
                        size={20}
                        className="text-primary"
                      />
                    </div>
                    <div>
                      <CardTitle className="text-base">{job.title}</CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {job.description}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {statusBadge(job.last_status)}
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`enabled-${job.job_key}`} className="text-xs text-muted-foreground">
                        {job.enabled ? 'Включено' : 'Выключено'}
                      </Label>
                      <Switch
                        id={`enabled-${job.job_key}`}
                        checked={job.enabled}
                        onCheckedChange={(v) => updateJobLocal(job.job_key, { enabled: v })}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Периодичность</Label>
                    <Select
                      value={job.schedule_preset}
                      onValueChange={(v) =>
                        updateJobLocal(job.job_key, { schedule_preset: v as SchedulePreset })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRESET_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {job.job_key === 'bitrix_sync_positions' && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Компания</Label>
                      <Select
                        value={String(job.params.company_id ?? '')}
                        onValueChange={(v) =>
                          updateJobLocal(job.job_key, {
                            params: { ...job.params, company_id: Number(v) },
                          })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Выберите компанию" />
                        </SelectTrigger>
                        <SelectContent>
                          {companies.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {job.job_key === 'bitrix_inactive_users' && (
                    <>
                      <div>
                        <Label className="text-xs text-muted-foreground">Кого деактивировать</Label>
                        <Select
                          value={String(job.params.mode ?? 'long_inactive')}
                          onValueChange={(v) =>
                            updateJobLocal(job.job_key, {
                              params: { ...job.params, mode: v },
                            })
                          }
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MODE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Порог дней неактивности</Label>
                        <Input
                          type="number"
                          min={1}
                          className="mt-1"
                          value={Number(job.params.days ?? 30)}
                          onChange={(e) =>
                            updateJobLocal(job.job_key, {
                              params: { ...job.params, days: Number(e.target.value) || 1 },
                            })
                          }
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-md bg-muted/30 border border-border/40">
                    <p className="text-muted-foreground">Последний запуск</p>
                    <p className="font-medium mt-1">{formatDate(job.last_run_at)}</p>
                  </div>
                  <div className="p-3 rounded-md bg-muted/30 border border-border/40">
                    <p className="text-muted-foreground">Следующий запуск</p>
                    <p className="font-medium mt-1">{formatDate(job.next_run_at)}</p>
                  </div>
                  <div className="p-3 rounded-md bg-muted/30 border border-border/40">
                    <p className="text-muted-foreground">Результат</p>
                    <p className="font-medium mt-1 truncate" title={job.last_message}>
                      {job.last_message || '—'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => saveJob(job)}
                    disabled={savingKey === job.job_key}
                    className="gap-2"
                  >
                    <Icon
                      name={savingKey === job.job_key ? 'Loader2' : 'Save'}
                      size={14}
                      className={savingKey === job.job_key ? 'animate-spin' : ''}
                    />
                    Сохранить
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => triggerJob(job)}
                    disabled={triggeringKey === job.job_key}
                    className="gap-2"
                  >
                    <Icon
                      name={triggeringKey === job.job_key ? 'Loader2' : 'Play'}
                      size={14}
                      className={triggeringKey === job.job_key ? 'animate-spin' : ''}
                    />
                    Запустить сейчас
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleHistory(job.job_key)}
                    className="gap-2"
                  >
                    <Icon name={historyOpen[job.job_key] ? 'ChevronUp' : 'History'} size={14} />
                    {historyOpen[job.job_key] ? 'Скрыть историю' : 'История запусков'}
                  </Button>
                </div>

                {historyOpen[job.job_key] && (
                  <div className="border border-border/50 rounded-md overflow-hidden">
                    {(runs[job.job_key] || []).length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground">
                        Запусков пока не было
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/50">
                            <tr className="text-left">
                              <th className="px-3 py-2">Время</th>
                              <th className="px-3 py-2">Тип</th>
                              <th className="px-3 py-2">Кем</th>
                              <th className="px-3 py-2">Статус</th>
                              <th className="px-3 py-2">Длительность</th>
                              <th className="px-3 py-2">Результат</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(runs[job.job_key] || []).map((r) => (
                              <tr key={r.id} className="border-t border-border/40">
                                <td className="px-3 py-2 whitespace-nowrap">{formatDate(r.started_at)}</td>
                                <td className="px-3 py-2">
                                  {r.trigger_type === 'manual' ? 'Вручную' : 'Авто'}
                                </td>
                                <td className="px-3 py-2">{r.started_by_name || '—'}</td>
                                <td className="px-3 py-2">{statusBadge(r.status)}</td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                  {r.duration_ms ? `${(r.duration_ms / 1000).toFixed(1)} с` : '—'}
                                </td>
                                <td className="px-3 py-2 max-w-[400px] truncate" title={r.message}>
                                  {r.message || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageLayout>
  );
};

export default AutomationSettings;