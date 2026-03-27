import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
import { apiFetch } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';
import func2url from '../../../backend/func2url.json';
import type { TicketService, Service } from './ExamplesTab';

const AI_TRAINING_URL = func2url['api-ai-training'];

interface LogEntry {
  id: number;
  description: string;
  ticket_service_id: number | null;
  ticket_service_name: string | null;
  service_ids: number[] | null;
  service_names: string[] | null;
  confidence: number | null;
  success: boolean;
  error_message: string | null;
  raw_response: string | null;
  examples_used: number;
  rules_used: number;
  duration_ms: number;
  test_mode: boolean;
  created_at: string;
}

interface LogsData {
  logs: LogEntry[];
  total: number;
  success_count: number;
  fail_count: number;
  avg_confidence: number;
}

interface LogsTabProps {
  ticketServices: TicketService[];
  services: Service[];
  onExampleAdded?: () => void;
}

const LogsTab = ({ ticketServices, services, onExampleAdded }: LogsTabProps) => {
  const { toast } = useToast();
  const [data, setData] = useState<LogsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'' | 'true' | 'false'>('');
  const [page, setPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [showAddExample, setShowAddExample] = useState(false);
  const [exampleForm, setExampleForm] = useState({ ticket_service_id: '', service_ids: [] as number[] });
  const [saving, setSaving] = useState(false);
  const pageSize = 20;

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ endpoint: 'logs', limit: String(pageSize), offset: String(page * pageSize) });
      if (filter) params.set('success', filter);
      const res = await apiFetch(`${AI_TRAINING_URL}?${params}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [filter, page]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  };

  const selectedTs = ticketServices.find(ts => ts.id.toString() === exampleForm.ticket_service_id);
  const filteredServices = selectedTs?.service_ids
    ? services.filter(s => selectedTs.service_ids?.includes(s.id))
    : services;

  const openAddExample = () => {
    if (selectedLog) {
      setExampleForm({
        ticket_service_id: selectedLog.ticket_service_id?.toString() || '',
        service_ids: selectedLog.service_ids || [],
      });
    }
    setShowAddExample(true);
  };

  const toggleServiceId = (serviceId: number) => {
    setExampleForm(prev => ({
      ...prev,
      service_ids: prev.service_ids.includes(serviceId)
        ? prev.service_ids.filter(id => id !== serviceId)
        : [...prev.service_ids, serviceId],
    }));
  };

  const saveAsExample = async () => {
    if (!selectedLog || !exampleForm.ticket_service_id) {
      toast({ title: 'Выберите услугу', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const body = {
      description: selectedLog.description,
      ticket_service_id: parseInt(exampleForm.ticket_service_id),
      service_ids: exampleForm.service_ids,
    };

    const res = await apiFetch(AI_TRAINING_URL + '?endpoint=examples', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (res.ok) {
      toast({ title: 'Пример добавлен из лога' });
      setShowAddExample(false);
      setSelectedLog(null);
      onExampleAdded?.();
    } else {
      toast({ title: 'Ошибка сохранения', variant: 'destructive' });
    }
    setSaving(false);
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icon name="Loader2" size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Icon name="CheckCircle" size={16} className="text-green-500" />
                </div>
                <div>
                  <p className="text-lg font-bold">{data.success_count}</p>
                  <p className="text-[10px] text-muted-foreground">Успешных</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <Icon name="XCircle" size={16} className="text-red-500" />
                </div>
                <div>
                  <p className="text-lg font-bold">{data.fail_count}</p>
                  <p className="text-[10px] text-muted-foreground">Ошибок</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Icon name="Gauge" size={16} className="text-blue-500" />
                </div>
                <div>
                  <p className="text-lg font-bold">{data.avg_confidence}%</p>
                  <p className="text-[10px] text-muted-foreground">Ср. уверенность</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Журнал классификаций</CardTitle>
              <CardDescription className="text-xs mt-1">
                Каждый вызов AI-классификатора с результатом
              </CardDescription>
            </div>
            <div className="flex gap-1">
              <Button
                variant={filter === '' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setFilter(''); setPage(0); }}
                className="text-xs h-7 px-2"
              >
                Все
              </Button>
              <Button
                variant={filter === 'true' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setFilter('true'); setPage(0); }}
                className="text-xs h-7 px-2"
              >
                Успешные
              </Button>
              <Button
                variant={filter === 'false' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setFilter('false'); setPage(0); }}
                className="text-xs h-7 px-2"
              >
                Ошибки
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!data?.logs.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Icon name="ScrollText" size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Пока нет записей</p>
              <p className="text-xs mt-1">Логи появятся после первой классификации заявки</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.logs.map(log => (
                <div
                  key={log.id}
                  className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                    !log.success
                      ? 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10'
                      : (log.confidence || 0) < 50
                      ? 'bg-yellow-500/5 border-yellow-500/20 hover:bg-yellow-500/10'
                      : 'bg-muted/20 hover:bg-muted/40'
                  }`}
                  onClick={() => setSelectedLog(log)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm line-clamp-1 mb-1">{log.description}</p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {log.success ? (
                          <>
                            <Badge variant="secondary" className="text-[10px] h-5">
                              {log.ticket_service_name || '—'}
                            </Badge>
                            {log.service_names?.map((name, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] h-5">
                                {name}
                              </Badge>
                            ))}
                            <Badge
                              variant="outline"
                              className={`text-[10px] h-5 ${
                                (log.confidence || 0) >= 80 ? 'text-green-600 border-green-300' :
                                (log.confidence || 0) >= 50 ? 'text-yellow-600 border-yellow-300' :
                                'text-red-600 border-red-300'
                              }`}
                            >
                              {log.confidence}%
                            </Badge>
                          </>
                        ) : (
                          <Badge variant="destructive" className="text-[10px] h-5">
                            Ошибка
                          </Badge>
                        )}
                        {log.test_mode && (
                          <Badge variant="outline" className="text-[10px] h-5 text-purple-600 border-purple-300">
                            тест
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-[10px] text-muted-foreground">{formatDate(log.created_at)}</span>
                      <span className="text-[10px] text-muted-foreground">{log.duration_ms}ms</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {data && data.total > pageSize && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <span className="text-xs text-muted-foreground">
                {page * pageSize + 1}–{Math.min((page + 1) * pageSize, data.total)} из {data.total}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                >
                  <Icon name="ChevronLeft" size={14} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  disabled={(page + 1) * pageSize >= data.total}
                  onClick={() => setPage(p => p + 1)}
                >
                  <Icon name="ChevronRight" size={14} />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedLog && !showAddExample} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedLog?.success ? (
                <Icon name="CheckCircle" size={18} className="text-green-500" />
              ) : (
                <Icon name="XCircle" size={18} className="text-red-500" />
              )}
              Детали классификации
            </DialogTitle>
            <DialogDescription>
              {selectedLog && formatDate(selectedLog.created_at)} — {selectedLog?.duration_ms}ms
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Текст заявки</p>
                <p className="text-sm bg-muted/30 rounded-lg p-3">{selectedLog.description}</p>
              </div>

              {selectedLog.success ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Услуга</p>
                      <Badge variant="secondary">{selectedLog.ticket_service_name || '—'}</Badge>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Уверенность</p>
                      <span className={`text-lg font-bold ${
                        (selectedLog.confidence || 0) >= 80 ? 'text-green-500' :
                        (selectedLog.confidence || 0) >= 50 ? 'text-yellow-500' : 'text-red-500'
                      }`}>
                        {selectedLog.confidence}%
                      </span>
                    </div>
                  </div>
                  {selectedLog.service_names && selectedLog.service_names.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Сервисы</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedLog.service_names.map((name, i) => (
                          <Badge key={i} variant="outline">{name}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Ошибка</p>
                  <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 rounded-lg p-3">
                    {selectedLog.error_message}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Примеров использовано</p>
                  <p className="text-sm font-medium">{selectedLog.examples_used}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Правил использовано</p>
                  <p className="text-sm font-medium">{selectedLog.rules_used}</p>
                </div>
              </div>

              {selectedLog.raw_response && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Ответ AI (raw)</p>
                  <pre className="text-xs bg-muted/30 rounded-lg p-3 whitespace-pre-wrap overflow-auto max-h-24">
                    {selectedLog.raw_response}
                  </pre>
                </div>
              )}

              <div className="pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={openAddExample}
                >
                  <Icon name="GraduationCap" size={16} />
                  Добавить как обучающий пример
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showAddExample} onOpenChange={(open) => { if (!open) setShowAddExample(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon name="GraduationCap" size={18} />
              Добавить как пример
            </DialogTitle>
            <DialogDescription>
              Укажите правильную классификацию для этой заявки
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Текст заявки</p>
                <p className="text-sm bg-muted/30 rounded-lg p-3 line-clamp-3">{selectedLog.description}</p>
              </div>

              {selectedLog.ticket_service_name && (
                <div className="p-3 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
                  <p className="text-xs text-yellow-700 dark:text-yellow-400">
                    AI определил: <strong>{selectedLog.ticket_service_name}</strong>
                    {selectedLog.service_names?.length ? ` → ${selectedLog.service_names.join(', ')}` : ''}
                    {' '}({selectedLog.confidence}%)
                  </p>
                </div>
              )}

              <div>
                <Label>Правильная услуга *</Label>
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
                  <Label>Правильные сервисы</Label>
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
                <Button variant="outline" onClick={() => setShowAddExample(false)}>Отмена</Button>
                <Button onClick={saveAsExample} disabled={saving || !exampleForm.ticket_service_id} className="gap-2">
                  {saving && <Icon name="Loader2" size={14} className="animate-spin" />}
                  Сохранить пример
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LogsTab;