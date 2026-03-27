import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { apiFetch } from '@/utils/api';
import func2url from '../../../backend/func2url.json';

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
  onStatsUpdate?: (stats: { success_count: number; fail_count: number }) => void;
}

const LogsTab = ({ onStatsUpdate }: LogsTabProps) => {
  const [data, setData] = useState<LogsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'' | 'true' | 'false'>('');
  const [page, setPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
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
        onStatsUpdate?.({ success_count: result.success_count, fail_count: result.fail_count });
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
                  className="p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer"
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

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LogsTab;
