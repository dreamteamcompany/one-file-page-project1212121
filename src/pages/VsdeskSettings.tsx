import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@/components/layout/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch, API_URL } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';
import func2url from '../../backend/func2url.json';

interface OurStatus {
  id: number;
  name: string;
  color?: string;
}

interface VsdeskStatusRow {
  vsdesk_status: string;
  count: number;
  status_id: number | null;
  sync_enabled: boolean;
}

const VsdeskSettings = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statuses, setStatuses] = useState<VsdeskStatusRow[]>([]);
  const [ourStatuses, setOurStatuses] = useState<OurStatus[]>([]);
  const [totalTickets, setTotalTickets] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [syncRunning, setSyncRunning] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ processed: 0, total: 0, inserted: 0, skipped: 0, filtered: 0, errors: 0 });
  const [syncErrors, setSyncErrors] = useState<{ ext_id: string; reason: string }[]>([]);
  const [syncFinished, setSyncFinished] = useState(false);

  type JobInfo = {
    id: number;
    status: 'running' | 'done' | 'failed' | 'cancelled';
    total: number;
    processed: number;
    inserted: number;
    skipped: number;
    filtered: number;
    errors: number;
    error_details: { ext_id: string; reason: string }[];
    last_error: string | null;
    started_at: string;
    last_tick_at: string | null;
    finished_at: string | null;
  };
  const [job, setJob] = useState<JobInfo | null>(null);
  const [jobStarting, setJobStarting] = useState(false);

  const loadJobStatus = async () => {
    try {
      const res = await fetch(`${func2url['vsdesk-sync']}?action=job_status`);
      const data = await res.json();
      setJob(data.job || null);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    loadJobStatus();
    const i = setInterval(loadJobStatus, 3000);
    return () => clearInterval(i);
  }, []);

  const handleStartJob = async () => {
    await handleSave();
    setJobStarting(true);
    try {
      const res = await fetch(`${func2url['vsdesk-sync']}?action=start_job`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast({
          title: data.already_running
            ? 'Фоновая задача уже запущена'
            : `Задача создана. К обработке: ${data.total} заявок. Cron подхватит её в течение минуты.`,
        });
        await loadJobStatus();
      } else {
        toast({ title: data.error || 'Не удалось создать задачу', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Ошибка соединения', variant: 'destructive' });
    } finally {
      setJobStarting(false);
    }
  };

  const handleCancelJob = async () => {
    if (!window.confirm('Остановить фоновую синхронизацию? Уже импортированные заявки сохранятся.')) return;
    try {
      const res = await fetch(`${func2url['vsdesk-sync']}?action=cancel_job`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Фоновая задача остановлена' });
        await loadJobStatus();
      }
    } catch {
      toast({ title: 'Ошибка соединения', variant: 'destructive' });
    }
  };

  const handleTickNow = async () => {
    try {
      await fetch(`${func2url['vsdesk-sync']}?action=tick`, { method: 'POST' });
      await loadJobStatus();
    } catch {
      /* ignore */
    }
  };

  const [deltaJobStarting, setDeltaJobStarting] = useState(false);
  const handleStartDeltaJob = async () => {
    setDeltaJobStarting(true);
    try {
      const res = await fetch(`${func2url['vsdesk-sync']}?action=start_delta_job`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast({
          title: data.already_running
            ? 'Фоновая задача уже запущена'
            : `Догрузка обновлений запущена. К проверке: ${data.total} заявок.`,
        });
        await loadJobStatus();
      } else {
        toast({ title: data.error || 'Не удалось создать задачу', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Ошибка соединения', variant: 'destructive' });
    } finally {
      setDeltaJobStarting(false);
    }
  };

  const [deltaRunning, setDeltaRunning] = useState(false);
  const [deltaProgress, setDeltaProgress] = useState({ processed: 0, total: 0, inserted: 0, skipped: 0, filtered: 0, errors: 0 });
  const [deltaErrors, setDeltaErrors] = useState<{ ext_id: string; reason: string }[]>([]);

  const handleRunDeltaInTab = async () => {
    setDeltaRunning(true);
    setDeltaErrors([]);
    setDeltaProgress({ processed: 0, total: 0, inserted: 0, skipped: 0, filtered: 0, errors: 0 });
    let offset = 0;
    const limit = 10;
    let safetyHops = 0;
    const collected: { ext_id: string; reason: string }[] = [];
    try {
      while (true) {
        safetyHops += 1;
        if (safetyHops > 2000) break;
        const res = await fetch(`${func2url['vsdesk-sync']}?action=delta_sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ offset, limit }),
        });
        const data = await res.json();
        if (!data.success) {
          toast({ title: data.error || 'Ошибка догрузки', variant: 'destructive' });
          break;
        }
        if (Array.isArray(data.details) && data.details.length) collected.push(...data.details);
        setDeltaProgress((prev) => ({
          processed: data.processed,
          total: data.total,
          inserted: prev.inserted + (data.inserted || 0),
          skipped: prev.skipped + (data.skipped || 0),
          filtered: prev.filtered + (data.filtered || 0),
          errors: prev.errors + (data.errors || 0),
        }));
        setDeltaErrors([...collected]);
        if (data.done || data.batch_size === 0) {
          toast({ title: `Догрузка завершена. Обновлено: ${data.processed}, ошибок: ${collected.length}` });
          break;
        }
        offset = data.next_offset;
      }
    } catch {
      toast({ title: 'Ошибка соединения', variant: 'destructive' });
    } finally {
      setDeltaRunning(false);
    }
  };

  const [bumpLoading, setBumpLoading] = useState(false);
  const [bumpResult, setBumpResult] = useState<{ max_vsdesk_id: number; max_local_id: number; next_id_will_be: number } | null>(null);

  const handleBumpSequence = async () => {
    const ok = window.confirm(
      'Сейчас будет сдвинута нумерация заявок выше максимума vsDesk. После этого новые локальные заявки начнутся с большего номера, а импортированные сохранят оригинальные id vsDesk. Продолжить?'
    );
    if (!ok) return;
    setBumpLoading(true);
    try {
      const res = await fetch(`${func2url['vsdesk-sync']}?action=bump_sequence`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setBumpResult(data);
        toast({ title: `Нумерация сдвинута. Следующий id: ${data.next_id_will_be}` });
      } else {
        toast({ title: data.error || 'Не удалось сдвинуть нумерацию', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Ошибка соединения', variant: 'destructive' });
    } finally {
      setBumpLoading(false);
    }
  };

  const [purgeLoading, setPurgeLoading] = useState(false);
  const [purgeResult, setPurgeResult] = useState<{
    tickets: number;
    comments: number;
    comment_attachments: number;
    ticket_attachments: number;
    history: number;
    watchers: number;
    custom_field_values: number;
    s3_files_deleted: number;
  } | null>(null);

  const handlePurge = async () => {
    const ok = window.confirm(
      'Удалить ВСЕ заявки, импортированные из vsDesk, со всеми комментариями, файлами, историей и наблюдателями? Это действие нельзя отменить.'
    );
    if (!ok) return;
    const ok2 = window.confirm('Точно? Введи ОК для подтверждения.');
    if (!ok2) return;

    setPurgeLoading(true);
    setPurgeResult(null);
    try {
      const res = await fetch(`${func2url['vsdesk-sync']}?action=purge`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setPurgeResult(data);
        toast({ title: `Удалено заявок: ${data.tickets}` });
      } else {
        toast({ title: data.error || 'Не удалось удалить', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Ошибка соединения', variant: 'destructive' });
    } finally {
      setPurgeLoading(false);
    }
  };

  const [dryRunLoading, setDryRunLoading] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<{
    total_in_vsdesk: number;
    will_import: number;
    already_imported: number;
    filtered_by_status: number;
    by_status: { vsdesk_status: string; count: number }[];
    sample: { sampled_tickets: number; comments: number; attachments: number; history: number; watchers: number; custom_fields: number };
    forecast: { comments?: number; attachments?: number; history?: number; watchers?: number; custom_fields?: number };
  } | null>(null);

  const handleDryRun = async () => {
    setDryRunLoading(true);
    setDryRunResult(null);
    try {
      await handleSave();
      const res = await fetch(`${func2url['vsdesk-sync']}?action=dry_run`);
      const data = await res.json();
      if (data.error) {
        toast({ title: data.error, variant: 'destructive' });
      } else {
        setDryRunResult(data);
      }
    } catch {
      toast({ title: 'Ошибка соединения с vsDesk', variant: 'destructive' });
    } finally {
      setDryRunLoading(false);
    }
  };

  useEffect(() => {
    if (!hasPermission('settings', 'read')) {
      navigate('/tickets');
    }
  }, [hasPermission, navigate]);

  const loadAll = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [vsRes, ourRes] = await Promise.all([
        fetch(`${func2url['vsdesk-sync']}?action=statuses`),
        apiFetch(`${API_URL}?endpoint=ticket-statuses`),
      ]);
      const vsData = await vsRes.json();
      const ourData = await ourRes.json();

      if (vsData.error) {
        setErrorMsg(vsData.error);
        setStatuses([]);
      } else {
        setStatuses(vsData.statuses || []);
        setTotalTickets(vsData.total_tickets || 0);
      }
      setOurStatuses(Array.isArray(ourData) ? ourData : []);
    } catch (e) {
      setErrorMsg('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const toggleSync = (vs: string, enabled: boolean) => {
    setStatuses((prev) =>
      prev.map((s) => (s.vsdesk_status === vs ? { ...s, sync_enabled: enabled } : s)),
    );
  };

  const changeMappedStatus = (vs: string, statusId: number | null) => {
    setStatuses((prev) =>
      prev.map((s) => (s.vsdesk_status === vs ? { ...s, status_id: statusId } : s)),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${func2url['vsdesk-sync']}?action=mapping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mapping: statuses.map((s) => ({
            vsdesk_status: s.vsdesk_status,
            status_id: s.status_id,
            sync_enabled: s.sync_enabled,
          })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Настройки сохранены' });
      } else {
        toast({ title: 'Не удалось сохранить', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Ошибка соединения', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleRunSync = async () => {
    await handleSave();
    setSyncRunning(true);
    setSyncFinished(false);
    setSyncErrors([]);
    setSyncProgress({ processed: 0, total: 0, inserted: 0, skipped: 0, filtered: 0, errors: 0 });

    let offset = 0;
    const limit = 10;
    let safetyHops = 0;
    let totalInserted = 0;
    const collectedErrors: { ext_id: string; reason: string }[] = [];
    try {
      while (true) {
        safetyHops += 1;
        if (safetyHops > 1000) break;
        const res = await fetch(`${func2url['vsdesk-sync']}?action=sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ offset, limit }),
        });
        const data = await res.json();
        if (!data.success) {
          toast({ title: data.error || 'Ошибка синхронизации', variant: 'destructive' });
          break;
        }
        totalInserted += data.inserted || 0;
        if (Array.isArray(data.details) && data.details.length) {
          collectedErrors.push(...data.details);
        }
        setSyncProgress((prev) => ({
          processed: data.processed,
          total: data.total,
          inserted: prev.inserted + (data.inserted || 0),
          skipped: prev.skipped + (data.skipped || 0),
          filtered: prev.filtered + (data.filtered || 0),
          errors: prev.errors + (data.errors || 0),
        }));
        setSyncErrors([...collectedErrors]);
        if (data.done || data.batch_size === 0) {
          toast({ title: `Синхронизация завершена. Добавлено всего: ${totalInserted}, ошибок: ${collectedErrors.length}` });
          break;
        }
        offset = data.next_offset;
      }
      setSyncFinished(true);
    } catch {
      toast({ title: 'Ошибка соединения с vsDesk', variant: 'destructive' });
    } finally {
      setSyncRunning(false);
    }
  };

  if (!hasPermission('settings', 'read')) return null;

  const enabledCount = statuses.filter((s) => s.sync_enabled).length;
  const eligibleTickets = statuses.filter((s) => s.sync_enabled).reduce((acc, s) => acc + s.count, 0);

  return (
    <PageLayout>
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Настройка vsDesk</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Сопоставьте статусы и выберите, какие заявки тянуть из vsDesk
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/settings')} className="gap-2">
          <Icon name="ChevronLeft" size={16} />
          К настройкам
        </Button>
      </header>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Icon name="Server" size={20} className="text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-base">Подключение</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {loading
                  ? 'Загружаем статусы из vsDesk...'
                  : errorMsg
                  ? errorMsg
                  : `Всего заявок в vsDesk: ${totalTickets}. Статусов: ${statuses.length}.`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={loadAll} disabled={loading} className="gap-2">
              <Icon name={loading ? 'Loader2' : 'RefreshCw'} size={14} className={loading ? 'animate-spin' : ''} />
              Обновить список
            </Button>
            <Button onClick={handleSave} disabled={saving || loading} size="sm" className="gap-2">
              <Icon name="Save" size={14} />
              Сохранить настройки
            </Button>
            <Button
              onClick={handleBumpSequence}
              disabled={bumpLoading}
              size="sm"
              variant="outline"
              className="gap-2"
              title="Сдвинуть нумерацию выше vsDesk — нажмите ОДИН раз перед первой синхронизацией"
            >
              <Icon name={bumpLoading ? 'Loader2' : 'Hash'} size={14} className={bumpLoading ? 'animate-spin' : ''} />
              {bumpLoading ? 'Сдвигаем...' : 'Подготовить нумерацию'}
            </Button>
            <Button
              onClick={handleDryRun}
              disabled={dryRunLoading || loading || enabledCount === 0}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              <Icon name={dryRunLoading ? 'Loader2' : 'Eye'} size={14} className={dryRunLoading ? 'animate-spin' : ''} />
              {dryRunLoading ? 'Считаем...' : 'Сухой прогон'}
            </Button>
            <Button
              onClick={handleRunSync}
              disabled={syncRunning || loading || enabledCount === 0}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              <Icon name={syncRunning ? 'Loader2' : 'Play'} size={14} className={syncRunning ? 'animate-spin' : ''} />
              {syncRunning ? 'Синхронизация...' : 'Запустить во вкладке'}
            </Button>
            <Button
              onClick={handleStartJob}
              disabled={jobStarting || loading || enabledCount === 0 || job?.status === 'running'}
              size="sm"
              className="gap-2"
            >
              <Icon name={jobStarting ? 'Loader2' : 'Zap'} size={14} className={jobStarting ? 'animate-spin' : ''} />
              {job?.status === 'running' ? 'Фоновая задача запущена' : 'Запустить в фоне'}
            </Button>
            <Button
              onClick={handleRunDeltaInTab}
              disabled={deltaRunning || loading}
              size="sm"
              variant="outline"
              className="gap-2"
              title="Пройти по уже импортированным заявкам и догрузить новые комментарии/файлы/историю и обновить статусы"
            >
              <Icon name={deltaRunning ? 'Loader2' : 'RefreshCcw'} size={14} className={deltaRunning ? 'animate-spin' : ''} />
              {deltaRunning ? 'Догружаем...' : 'Догрузить во вкладке'}
            </Button>
            <Button
              onClick={handleStartDeltaJob}
              disabled={deltaJobStarting || loading || job?.status === 'running'}
              size="sm"
              variant="secondary"
              className="gap-2"
              title="Запустить догрузку обновлений в фоне (cron подхватит)"
            >
              <Icon name={deltaJobStarting ? 'Loader2' : 'CloudDownload'} size={14} className={deltaJobStarting ? 'animate-spin' : ''} />
              {deltaJobStarting ? 'Запускаем...' : 'Догрузить в фоне'}
            </Button>
            <Button
              onClick={handlePurge}
              disabled={purgeLoading || syncRunning}
              size="sm"
              variant="destructive"
              className="gap-2 ml-auto"
            >
              <Icon name={purgeLoading ? 'Loader2' : 'Trash2'} size={14} className={purgeLoading ? 'animate-spin' : ''} />
              {purgeLoading ? 'Удаляем...' : 'Удалить синхронизированные'}
            </Button>
          </div>

          {dryRunResult && (
            <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center gap-2 mb-3">
                <Icon name="Eye" size={16} className="text-blue-500" />
                <p className="text-sm font-medium">Прогноз импорта (без записи)</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Всего в vsDesk</span>
                  <span className="text-lg font-semibold">{dryRunResult.total_in_vsdesk}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Будет импортировано</span>
                  <span className="text-lg font-semibold text-green-500">{dryRunResult.will_import}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Уже импортировано</span>
                  <span className="text-lg font-semibold">{dryRunResult.already_imported}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Пропущено по статусу</span>
                  <span className="text-lg font-semibold">{dryRunResult.filtered_by_status}</span>
                </div>
              </div>
              {dryRunResult.by_status.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground mb-1">К импорту по статусам:</p>
                  <div className="flex flex-wrap gap-1">
                    {dryRunResult.by_status.map((s) => (
                      <span
                        key={s.vsdesk_status}
                        className="text-xs px-2 py-1 rounded-md bg-background border border-border/50"
                      >
                        {s.vsdesk_status}: <b>{s.count}</b>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {dryRunResult.sample.sampled_tickets > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Прогноз связанных данных (на основе выборки из {dryRunResult.sample.sampled_tickets} заявок):
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Комментариев</span>
                      <span className="font-semibold">≈ {dryRunResult.forecast.comments ?? 0}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Вложений</span>
                      <span className="font-semibold">≈ {dryRunResult.forecast.attachments ?? 0}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Истории</span>
                      <span className="font-semibold">≈ {dryRunResult.forecast.history ?? 0}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Наблюдателей</span>
                      <span className="font-semibold">≈ {dryRunResult.forecast.watchers ?? 0}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Кастомных полей</span>
                      <span className="font-semibold">≈ {dryRunResult.forecast.custom_fields ?? 0}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {job && (
            <div className="mt-4 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon
                    name={job.status === 'running' ? 'Loader2' : job.status === 'done' ? 'CheckCircle2' : 'AlertTriangle'}
                    size={16}
                    className={
                      job.status === 'running'
                        ? 'animate-spin text-blue-500'
                        : job.status === 'done'
                        ? 'text-green-500'
                        : 'text-red-500'
                    }
                  />
                  <p className="text-sm font-medium">
                    Фоновая синхронизация —{' '}
                    {job.status === 'running'
                      ? 'идёт'
                      : job.status === 'done'
                      ? 'завершена'
                      : job.status === 'cancelled'
                      ? 'остановлена'
                      : 'ошибка'}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {job.processed} / {job.total}
                </p>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{
                    width: job.total
                      ? `${Math.min(100, (job.processed / job.total) * 100)}%`
                      : '0%',
                  }}
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs">
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Добавлено</span>
                  <span className="font-semibold text-green-500">{job.inserted}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Пропущено</span>
                  <span className="font-semibold">{job.skipped}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Отфильтровано</span>
                  <span className="font-semibold">{job.filtered}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Ошибок</span>
                  <span className="font-semibold text-red-500">{job.errors}</span>
                </div>
              </div>
              {job.last_tick_at && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Последняя пачка: {new Date(job.last_tick_at).toLocaleTimeString()}
                </p>
              )}
              {job.status === 'running' && (
                <div className="flex gap-2 mt-3">
                  <Button onClick={handleTickNow} size="sm" variant="outline" className="gap-2">
                    <Icon name="FastForward" size={14} />
                    Обработать пачку сейчас
                  </Button>
                  <Button onClick={handleCancelJob} size="sm" variant="destructive" className="gap-2">
                    <Icon name="Square" size={14} />
                    Остановить
                  </Button>
                </div>
              )}
              {Array.isArray(job.error_details) && job.error_details.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="AlertTriangle" size={14} className="text-red-500" />
                    <p className="text-xs font-medium">Ошибки ({job.error_details.length})</p>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {job.error_details.slice(-50).map((err, i) => (
                      <div
                        key={`${err.ext_id}-${i}`}
                        className="flex items-start gap-2 text-xs p-2 rounded-md bg-background border border-border/50"
                      >
                        <span className="font-mono text-muted-foreground shrink-0">#{err.ext_id}</span>
                        <span className="text-red-500 break-all">{err.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {syncRunning || syncProgress.total > 0 ? (
            <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Прогресс</p>
                <p className="text-xs text-muted-foreground">
                  {syncProgress.processed} / {syncProgress.total}
                </p>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: syncProgress.total
                      ? `${Math.min(100, (syncProgress.processed / syncProgress.total) * 100)}%`
                      : '0%',
                  }}
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs">
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Добавлено</span>
                  <span className="font-semibold text-green-500">{syncProgress.inserted}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Пропущено</span>
                  <span className="font-semibold">{syncProgress.skipped}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Отфильтровано</span>
                  <span className="font-semibold">{syncProgress.filtered}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Ошибок</span>
                  <span className="font-semibold text-red-500">{syncProgress.errors}</span>
                </div>
              </div>

              {syncErrors.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="AlertTriangle" size={14} className="text-red-500" />
                    <p className="text-xs font-medium">Заявки с ошибками ({syncErrors.length})</p>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {syncErrors.map((err, i) => (
                      <div
                        key={`${err.ext_id}-${i}`}
                        className="flex items-start gap-2 text-xs p-2 rounded-md bg-background border border-border/50"
                      >
                        <span className="font-mono text-muted-foreground shrink-0">#{err.ext_id}</span>
                        <span className="text-red-500 break-all">{err.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {syncFinished && syncErrors.length === 0 && syncProgress.errors === 0 && (
                <div className="mt-3 pt-3 border-t border-border/50 text-xs text-green-500 flex items-center gap-2">
                  <Icon name="CheckCircle2" size={14} />
                  Все заявки импортированы без ошибок
                </div>
              )}
            </div>
          ) : null}

          {(deltaRunning || deltaProgress.total > 0) && (
            <div className="mt-4 p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon name="RefreshCcw" size={16} className={deltaRunning ? 'animate-spin text-purple-500' : 'text-purple-500'} />
                  <p className="text-sm font-medium">Догрузка обновлений во вкладке</p>
                </div>
                <p className="text-xs text-muted-foreground">{deltaProgress.processed} / {deltaProgress.total}</p>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 transition-all"
                  style={{
                    width: deltaProgress.total
                      ? `${Math.min(100, (deltaProgress.processed / deltaProgress.total) * 100)}%`
                      : '0%',
                  }}
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs">
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Обновлено</span>
                  <span className="font-semibold text-green-500">{deltaProgress.inserted}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Пропущено</span>
                  <span className="font-semibold">{deltaProgress.skipped}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Отфильтровано</span>
                  <span className="font-semibold">{deltaProgress.filtered}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Ошибок</span>
                  <span className="font-semibold text-red-500">{deltaProgress.errors}</span>
                </div>
              </div>
              {deltaErrors.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="AlertTriangle" size={14} className="text-red-500" />
                    <p className="text-xs font-medium">Ошибки ({deltaErrors.length})</p>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {deltaErrors.slice(-50).map((err, i) => (
                      <div
                        key={`${err.ext_id}-${i}`}
                        className="flex items-start gap-2 text-xs p-2 rounded-md bg-background border border-border/50"
                      >
                        <span className="font-mono text-muted-foreground shrink-0">#{err.ext_id}</span>
                        <span className="text-red-500 break-all">{err.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {bumpResult && (
            <div className="mt-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="Hash" size={16} className="text-amber-500" />
                <p className="text-sm font-medium">Нумерация подготовлена</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Макс. id в vsDesk</span>
                  <span className="font-semibold">{bumpResult.max_vsdesk_id}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Макс. id у нас</span>
                  <span className="font-semibold">{bumpResult.max_local_id}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">След. локальный id</span>
                  <span className="font-semibold text-green-500">{bumpResult.next_id_will_be}</span>
                </div>
              </div>
            </div>
          )}

          {purgeResult && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="Trash2" size={16} className="text-red-500" />
                <p className="text-sm font-medium">Удаление завершено</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Заявок</span>
                  <span className="font-semibold">{purgeResult.tickets}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Комментариев</span>
                  <span className="font-semibold">{purgeResult.comments}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Вложений к заявкам</span>
                  <span className="font-semibold">{purgeResult.ticket_attachments}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Вложений к коммент.</span>
                  <span className="font-semibold">{purgeResult.comment_attachments}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Истории</span>
                  <span className="font-semibold">{purgeResult.history}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Наблюдателей</span>
                  <span className="font-semibold">{purgeResult.watchers}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Кастомных полей</span>
                  <span className="font-semibold">{purgeResult.custom_field_values}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Файлов в S3</span>
                  <span className="font-semibold">{purgeResult.s3_files_deleted}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Сопоставление статусов</CardTitle>
          <CardDescription>
            Отметьте статусы vsDesk, заявки которых нужно тянуть, и выберите соответствующий
            статус в нашей системе. Не отмеченные статусы будут пропущены.
            {enabledCount > 0 && (
              <span className="ml-1 text-foreground">
                Будет импортировано {eligibleTickets} заявок ({enabledCount} статусов).
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Загрузка...</p>
          ) : statuses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Статусы из vsDesk не найдены. Нажмите «Обновить список».
            </p>
          ) : (
            <div className="space-y-2">
              {statuses.map((s) => (
                <div
                  key={s.vsdesk_status}
                  className="flex flex-col sm:flex-row gap-3 sm:items-center p-3 rounded-lg bg-muted/30 border border-border/50"
                >
                  <label className="flex items-center gap-2 sm:flex-1 cursor-pointer min-w-0">
                    <Checkbox
                      checked={s.sync_enabled}
                      onCheckedChange={(c) => toggleSync(s.vsdesk_status, !!c)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.vsdesk_status}</p>
                      <p className="text-xs text-muted-foreground">{s.count} заявок</p>
                    </div>
                  </label>
                  <div className="flex items-center gap-2 sm:w-72">
                    <Icon name="ArrowRight" size={16} className="text-muted-foreground" />
                    <Select
                      value={s.status_id ? String(s.status_id) : 'none'}
                      onValueChange={(v) =>
                        changeMappedStatus(s.vsdesk_status, v === 'none' ? null : Number(v))
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Выберите наш статус" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <span className="text-muted-foreground">Не сопоставлен</span>
                        </SelectItem>
                        {ourStatuses.map((os) => (
                          <SelectItem key={os.id} value={String(os.id)}>
                            <div className="flex items-center gap-2">
                              {os.color && (
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: os.color }}
                                />
                              )}
                              {os.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
};

export default VsdeskSettings;