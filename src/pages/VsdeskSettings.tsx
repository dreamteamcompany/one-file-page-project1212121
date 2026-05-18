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
    // Сохраняем настройки перед запуском
    await handleSave();
    setSyncRunning(true);
    setSyncProgress({ processed: 0, total: 0, inserted: 0, skipped: 0, filtered: 0, errors: 0 });

    let offset = 0;
    const limit = 10;
    let safetyHops = 0;
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
        setSyncProgress((prev) => ({
          processed: data.processed,
          total: data.total,
          inserted: prev.inserted + (data.inserted || 0),
          skipped: prev.skipped + (data.skipped || 0),
          filtered: prev.filtered + (data.filtered || 0),
          errors: prev.errors + (data.errors || 0),
        }));
        if (data.done || data.batch_size === 0) {
          toast({ title: `Синхронизация завершена. Добавлено: ${data.inserted ?? 0} в этой пачке, всего обработано ${data.processed}` });
          break;
        }
        offset = data.next_offset;
      }
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
              onClick={handleRunSync}
              disabled={syncRunning || loading || enabledCount === 0}
              size="sm"
              className="gap-2"
            >
              <Icon name={syncRunning ? 'Loader2' : 'Play'} size={14} className={syncRunning ? 'animate-spin' : ''} />
              {syncRunning ? 'Синхронизация...' : 'Запустить синхронизацию'}
            </Button>
          </div>

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
            </div>
          ) : null}
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
