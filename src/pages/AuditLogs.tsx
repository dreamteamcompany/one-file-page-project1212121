import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { API_URL, apiFetch } from '@/utils/api';
import PaymentsSidebar from '@/components/payments/PaymentsSidebar';
import PaymentsHeader from '@/components/payments/PaymentsHeader';
import { Card, CardContent } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AuditLog {
  id: number;
  entity_type: string;
  entity_id: number;
  action: string;
  user_id: number;
  username: string;
  changed_fields: Record<string, { old: any; new: any }> | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

const AuditLogs = () => {
  const { token } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dictionariesOpen, setDictionariesOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  
  // Filters
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 75) {
      setMenuOpen(false);
    }
  };

  useEffect(() => {
    if (!token) return;

    const loadLogs = async () => {
      try {
        const params = new URLSearchParams({
          ...(entityTypeFilter && entityTypeFilter !== 'all' && { entity_type: entityTypeFilter }),
          ...(actionFilter && actionFilter !== 'all' && { action: actionFilter }),
        });

        const response = await apiFetch(`${API_URL}?endpoint=audit-logs&${params}`, {
          headers: { 'X-Auth-Token': token },
        });

        const data = await response.json();
        setLogs(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load audit logs:', err);
        toast({
          title: 'Ошибка',
          description: 'Не удалось загрузить историю изменений',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, [token, entityTypeFilter, actionFilter, toast]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created': return 'Plus';
      case 'updated': return 'Edit';
      case 'deleted': return 'Trash2';
      case 'approved': return 'Check';
      case 'rejected': return 'X';
      case 'submitted': return 'Send';
      default: return 'Activity';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created': return 'text-green-400';
      case 'updated': return 'text-blue-400';
      case 'deleted': return 'text-red-400';
      case 'approved': return 'text-green-500';
      case 'rejected': return 'text-red-500';
      case 'submitted': return 'text-yellow-400';
      default: return 'text-muted-foreground';
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      created: 'Создан',
      updated: 'Изменён',
      deleted: 'Удалён',
      approved: 'Согласован',
      rejected: 'Отклонён',
      submitted: 'Отправлен на согласование',
    };
    return labels[action] || action;
  };

  const getEntityTypeLabel = (entityType: string) => {
    const labels: Record<string, string> = {
      payment: 'Платёж',
      category: 'Категория',
      user: 'Пользователь',
      service: 'Сервис',
      contractor: 'Контрагент',
      legal_entity: 'Юр. лицо',
    };
    return labels[entityType] || entityType;
  };

  const filteredLogs = logs.filter(log => {
    if (userFilter && !log.username?.toLowerCase().includes(userFilter.toLowerCase())) {
      return false;
    }
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        log.username?.toLowerCase().includes(searchLower) ||
        log.entity_type?.toLowerCase().includes(searchLower) ||
        log.action?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  return (
    <div className="flex min-h-screen">
      <PaymentsSidebar
        menuOpen={menuOpen}
        dictionariesOpen={dictionariesOpen}
        setDictionariesOpen={setDictionariesOpen}
        settingsOpen={settingsOpen}
        setSettingsOpen={setSettingsOpen}
        handleTouchStart={handleTouchStart}
        handleTouchMove={handleTouchMove}
        handleTouchEnd={handleTouchEnd}
      />

      <main className="flex-1 lg:ml-64 bg-background min-h-screen overflow-x-hidden max-w-full">
        <PaymentsHeader menuOpen={menuOpen} setMenuOpen={setMenuOpen} />

        <div className="p-4 sm:p-6 space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">История изменений</h1>
            <p className="text-sm md:text-base text-muted-foreground">Все действия в системе</p>
          </div>

          <Card className="border-border bg-card">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="flex-1 relative">
                  <Icon name="Search" size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Поиск..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Тип объекта" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все типы</SelectItem>
                    <SelectItem value="payment">Платежи</SelectItem>
                    <SelectItem value="category">Категории</SelectItem>
                    <SelectItem value="user">Пользователи</SelectItem>
                    <SelectItem value="service">Сервисы</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Действие" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все действия</SelectItem>
                    <SelectItem value="created">Создание</SelectItem>
                    <SelectItem value="updated">Изменение</SelectItem>
                    <SelectItem value="deleted">Удаление</SelectItem>
                    <SelectItem value="approved">Согласование</SelectItem>
                    <SelectItem value="rejected">Отклонение</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                  <p className="mt-4 text-muted-foreground">Загрузка...</p>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-12">
                  <Icon name="FileText" size={48} className="mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">История изменений пуста</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      className="border border-border rounded-lg p-4 hover:bg-accent/30 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 ${getActionColor(log.action)}`}>
                          <Icon name={getActionIcon(log.action)} size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <p className="font-medium">
                                {getEntityTypeLabel(log.entity_type)} #{log.entity_id}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {getActionLabel(log.action)} • {log.username || 'Система'}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(log.created_at).toLocaleString('ru-RU', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          
                          {log.changed_fields && Object.keys(log.changed_fields).length > 0 && (
                            <div className="mt-3 space-y-2">
                              {Object.entries(log.changed_fields).map(([field, values]) => (
                                <div key={field} className="text-sm">
                                  <span className="text-muted-foreground">{field}:</span>{' '}
                                  <span className="text-red-400 line-through">{JSON.stringify(values.old)}</span>
                                  {' → '}
                                  <span className="text-green-400">{JSON.stringify(values.new)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {log.metadata?.comment && (
                            <div className="mt-2 text-sm text-muted-foreground italic">
                              💬 {log.metadata.comment}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AuditLogs;