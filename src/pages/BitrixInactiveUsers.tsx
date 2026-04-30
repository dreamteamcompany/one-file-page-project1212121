import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import PageLayout from '@/components/layout/PageLayout';
import { apiFetch } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import func2url from '../../backend/func2url.json';
import BlockReportModal, { BlockReport } from './bitrix-inactive-users/BlockReportModal';

const API_URL = func2url['bitrix-inactive-users'];

interface InactiveUser {
  id: string;
  name: string;
  email: string;
  department: number[];
  position: string;
  last_login: string | null;
  days_inactive: number | null;
  is_excluded?: boolean;
}

interface ApiResponse {
  total_active_users: number;
  inactive_count: number;
  days_threshold: number;
  users: InactiveUser[];
  exceptions_count?: number;
}

interface ExceptionItem {
  id: number;
  bitrix_user_id: string;
  full_name: string;
  email: string;
  position: string;
  reason: string;
  added_by_user_id: number | null;
  added_by_name: string;
  added_at: string | null;
}

interface BitrixSearchUser {
  id: string;
  name: string;
  email: string;
  position: string;
  already_excluded: boolean;
}

type DeactivateMode = 'all' | 'never_logged' | 'long_inactive';

const MODE_LABELS: Record<DeactivateMode, string> = {
  all: 'Всех неактивных',
  never_logged: 'Кто никогда не заходил',
  long_inactive: 'Кто долго не заходил',
};

const BitrixInactiveUsers = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasSystemRole } = useAuth();
  const isAdmin = hasSystemRole('admin');

  const [tab, setTab] = useState<'inactive' | 'exceptions' | 'reports'>('inactive');
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [deactivating, setDeactivating] = useState(false);
  const [error, setError] = useState('');
  const [days, setDays] = useState(30);
  const [search, setSearch] = useState('');
  const [confirmMode, setConfirmMode] = useState<DeactivateMode | null>(null);

  const [exceptions, setExceptions] = useState<ExceptionItem[]>([]);
  const [exceptionsLoading, setExceptionsLoading] = useState(false);
  const [excSearch, setExcSearch] = useState('');

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [bxQuery, setBxQuery] = useState('');
  const [bxResults, setBxResults] = useState<BitrixSearchUser[]>([]);
  const [bxSearching, setBxSearching] = useState(false);
  const [selectedBx, setSelectedBx] = useState<BitrixSearchUser | null>(null);
  const [reason, setReason] = useState('');
  const [savingException, setSavingException] = useState(false);

  const [removeTarget, setRemoveTarget] = useState<ExceptionItem | null>(null);

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [activeReport, setActiveReport] = useState<BlockReport | null>(null);
  const [reports, setReports] = useState<Array<{
    id: number;
    started_by_name: string;
    started_at: string | null;
    mode: string;
    days_threshold: number | null;
    total_requested: number;
    deactivated_count: number;
    errors_count: number;
    skipped_count: number;
  }>>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  const loadReports = async () => {
    setReportsLoading(true);
    try {
      const res = await apiFetch(`${API_URL}?action=reports`);
      if (res.ok) {
        const json = await res.json();
        setReports(json.reports || []);
      }
    } finally {
      setReportsLoading(false);
    }
  };

  const openReportById = async (id: number) => {
    try {
      const res = await apiFetch(`${API_URL}?action=report&id=${id}`);
      if (res.ok) {
        const json = await res.json();
        setActiveReport(json.report);
        setReportModalOpen(true);
      } else {
        toast({ title: 'Не удалось загрузить отчёт', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Не удалось подключиться', variant: 'destructive' });
    }
  };

  const loadData = async (d: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(`${API_URL}?days=${d}`);
      if (res.ok) {
        setData(await res.json());
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'Ошибка загрузки');
      }
    } catch {
      setError('Не удалось подключиться к серверу');
    } finally {
      setLoading(false);
    }
  };

  const loadExceptions = async () => {
    setExceptionsLoading(true);
    try {
      const res = await apiFetch(`${API_URL}?action=exceptions`);
      if (res.ok) {
        const json = await res.json();
        setExceptions(json.exceptions || []);
      }
    } finally {
      setExceptionsLoading(false);
    }
  };

  useEffect(() => {
    loadData(days);
    loadExceptions();
    loadReports();
  }, []);

  const handleSearch = () => {
    loadData(days);
  };

  const neverLoggedCount = data?.users.filter(u => u.days_inactive === null && !u.is_excluded).length || 0;
  const longInactiveCount = data?.users.filter(u => u.days_inactive !== null && !u.is_excluded).length || 0;
  const visibleInactiveCount = data?.users.filter(u => !u.is_excluded).length || 0;

  const getConfirmCount = (mode: DeactivateMode) => {
    if (mode === 'all') return visibleInactiveCount;
    if (mode === 'never_logged') return neverLoggedCount;
    return longInactiveCount;
  };

  const handleDeactivate = async () => {
    if (!confirmMode) return;
    setDeactivating(true);
    try {
      const res = await apiFetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ mode: confirmMode, days }),
      });
      if (res.ok) {
        const result = await res.json();
        let title = `Деактивировано: ${result.deactivated} из ${result.total_requested}`;
        if (result.skipped_excluded) {
          title += ` (пропущено из исключений: ${result.skipped_excluded})`;
        }
        toast({ title });
        if (result.errors?.length > 0) {
          toast({ title: `Ошибки: ${result.errors.length}`, variant: 'destructive' });
        }
        if (result.report) {
          setActiveReport(result.report);
          setReportModalOpen(true);
        }
        loadData(days);
        loadReports();
      } else {
        toast({ title: 'Ошибка деактивации', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Не удалось подключиться к серверу', variant: 'destructive' });
    } finally {
      setDeactivating(false);
      setConfirmMode(null);
    }
  };

  const handleAddToExceptions = async (user: InactiveUser) => {
    try {
      const res = await apiFetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'add_exception',
          bitrix_user_id: user.id,
          full_name: user.name,
          email: user.email,
          position: user.position,
        }),
      });
      if (res.ok) {
        toast({ title: 'Добавлен в исключения' });
        loadData(days);
        loadExceptions();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: err.error || 'Ошибка', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Не удалось подключиться', variant: 'destructive' });
    }
  };

  const handleRemoveException = async () => {
    if (!removeTarget) return;
    try {
      const res = await apiFetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'remove_exception',
          bitrix_user_id: removeTarget.bitrix_user_id,
        }),
      });
      if (res.ok) {
        toast({ title: 'Удалено из исключений' });
        loadExceptions();
        loadData(days);
      } else {
        toast({ title: 'Ошибка', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Не удалось подключиться', variant: 'destructive' });
    } finally {
      setRemoveTarget(null);
    }
  };

  useEffect(() => {
    if (!addModalOpen) return;
    const q = bxQuery.trim();
    if (q.length < 2) {
      setBxResults([]);
      setBxSearching(false);
      return;
    }

    setBxSearching(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch(
          `${API_URL}?action=search_bitrix&q=${encodeURIComponent(q)}`,
          { signal: controller.signal },
        );
        if (res.ok) {
          const json = await res.json();
          setBxResults(json.users || []);
        }
      } catch (e) {
        if ((e as { name?: string })?.name !== 'AbortError') {
          toast({ title: 'Ошибка поиска', variant: 'destructive' });
        }
      } finally {
        setBxSearching(false);
      }
    }, 400);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [bxQuery, addModalOpen]);

  const handleSaveException = async () => {
    if (!selectedBx) return;
    setSavingException(true);
    try {
      const res = await apiFetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'add_exception',
          bitrix_user_id: selectedBx.id,
          full_name: selectedBx.name,
          email: selectedBx.email,
          position: selectedBx.position,
          reason,
        }),
      });
      if (res.ok) {
        toast({ title: 'Добавлен в исключения' });
        setAddModalOpen(false);
        setBxQuery('');
        setBxResults([]);
        setSelectedBx(null);
        setReason('');
        loadExceptions();
        loadData(days);
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: err.error || 'Ошибка', variant: 'destructive' });
      }
    } finally {
      setSavingException(false);
    }
  };

  const filtered = data?.users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.position || '').toLowerCase().includes(q);
  }) || [];

  const filteredExceptions = exceptions.filter(e => {
    if (!excSearch) return true;
    const q = excSearch.toLowerCase();
    return e.full_name.toLowerCase().includes(q) || (e.email || '').toLowerCase().includes(q) || (e.position || '').toLowerCase().includes(q);
  });

  const getDaysBadge = (daysInactive: number | null) => {
    if (daysInactive === null) {
      return <Badge variant="outline" className="text-xs text-gray-500 border-gray-300">Никогда</Badge>;
    }
    if (daysInactive > 180) {
      return <Badge variant="outline" className="text-xs text-red-600 border-red-300 bg-red-50">{daysInactive} дн.</Badge>;
    }
    if (daysInactive > 90) {
      return <Badge variant="outline" className="text-xs text-orange-600 border-orange-300 bg-orange-50">{daysInactive} дн.</Badge>;
    }
    return <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300 bg-yellow-50">{daysInactive} дн.</Badge>;
  };

  return (
    <PageLayout>
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
            <Icon name="ArrowLeft" size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Неактивные пользователи Битрикс24</h1>
            <p className="text-sm text-muted-foreground">
              Сотрудники, которые не заходили в Битрикс за указанный период
            </p>
          </div>
        </div>
        {tab === 'inactive' && data && visibleInactiveCount > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-2" disabled={deactivating}>
                {deactivating ? (
                  <Icon name="Loader2" size={16} className="animate-spin" />
                ) : (
                  <Icon name="UserMinus" size={16} />
                )}
                Уволить
                <Icon name="ChevronDown" size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setConfirmMode('all')} className="gap-2">
                <Icon name="Users" size={14} />
                Всех ({visibleInactiveCount})
              </DropdownMenuItem>
              {neverLoggedCount > 0 && (
                <DropdownMenuItem onClick={() => setConfirmMode('never_logged')} className="gap-2">
                  <Icon name="UserX" size={14} />
                  Никогда не заходили ({neverLoggedCount})
                </DropdownMenuItem>
              )}
              {longInactiveCount > 0 && (
                <DropdownMenuItem onClick={() => setConfirmMode('long_inactive')} className="gap-2">
                  <Icon name="Clock" size={14} />
                  Долго не заходили ({longInactiveCount})
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {tab === 'exceptions' && isAdmin && (
          <Button size="sm" className="gap-2" onClick={() => setAddModalOpen(true)}>
            <Icon name="Plus" size={16} />
            Добавить в исключения
          </Button>
        )}
      </header>

      <AlertDialog open={confirmMode !== null} onOpenChange={(open) => { if (!open) setConfirmMode(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтвердите деактивацию</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmMode && (
                <>
                  Будет деактивировано <strong>{getConfirmCount(confirmMode)}</strong> пользователей
                  ({MODE_LABELS[confirmMode].toLowerCase()}).
                  <br /><br />
                  Пользователи из списка исключений будут пропущены.
                  <br /><br />
                  Учётные записи будут отключены в Битрикс24. Это действие можно отменить вручную через админку Битрикса.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deactivating}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              disabled={deactivating}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deactivating ? (
                <><Icon name="Loader2" size={16} className="animate-spin mr-2" />Деактивация...</>
              ) : (
                'Деактивировать'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={removeTarget !== null} onOpenChange={(open) => { if (!open) setRemoveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Убрать из исключений?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget && (
                <>Пользователь <strong>{removeTarget.full_name}</strong> снова сможет попасть под автоблокировку.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveException}>Убрать</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={addModalOpen} onOpenChange={(open) => {
        setAddModalOpen(open);
        if (!open) {
          setBxQuery('');
          setBxResults([]);
          setSelectedBx(null);
          setReason('');
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Добавить в исключения</DialogTitle>
            <DialogDescription>
              Найдите сотрудника в Битрикс24 и добавьте его в список исключений.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Icon
                name="Search"
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="Начните вводить фамилию, имя, email..."
                value={bxQuery}
                onChange={e => setBxQuery(e.target.value)}
                className="pl-9 pr-9"
                autoFocus
              />
              {bxSearching && (
                <Icon
                  name="Loader2"
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground"
                />
              )}
            </div>

            <div className="max-h-60 overflow-y-auto border rounded-md min-h-[60px]">
              {bxQuery.trim().length < 2 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Введите минимум 2 символа для поиска
                </div>
              ) : bxSearching && bxResults.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Идёт поиск...
                </div>
              ) : bxResults.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Никого не нашли
                </div>
              ) : (
                <div className="divide-y">
                  {bxResults.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => !u.already_excluded && setSelectedBx(u)}
                      disabled={u.already_excluded}
                      className={`w-full text-left p-2 text-sm hover:bg-muted/50 transition-colors ${
                        selectedBx?.id === u.id ? 'bg-primary/10' : ''
                      } ${u.already_excluded ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="font-medium">{u.name}</div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-2 items-center">
                        {u.email && <span>{u.email}</span>}
                        {u.position && <span>· {u.position}</span>}
                        {u.already_excluded && <Badge variant="secondary" className="text-xs">Уже в исключениях</Badge>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedBx && (
              <div className="p-3 rounded-md bg-muted/40 border">
                <p className="text-xs text-muted-foreground mb-1">Выбран:</p>
                <p className="font-medium text-sm">{selectedBx.name}</p>
              </div>
            )}

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Причина (необязательно)</label>
              <Textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Например: в декрете, удалённый сотрудник, директор..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModalOpen(false)}>Отмена</Button>
            <Button onClick={handleSaveException} disabled={!selectedBx || savingException}>
              {savingException ? <Icon name="Loader2" size={16} className="animate-spin mr-2" /> : null}
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'inactive' | 'exceptions' | 'reports')} className="mb-4">
        <TabsList>
          <TabsTrigger value="inactive" className="gap-2">
            <Icon name="UserX" size={14} />
            Неактивные {data ? `(${data.inactive_count})` : ''}
          </TabsTrigger>
          <TabsTrigger value="exceptions" className="gap-2">
            <Icon name="ShieldCheck" size={14} />
            Исключения ({exceptions.length})
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <Icon name="FileText" size={14} />
            Отчёты ({reports.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inactive">
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Не заходили более</span>
              <Input
                type="number"
                value={days}
                onChange={e => setDays(parseInt(e.target.value) || 30)}
                className="w-20"
                min={1}
              />
              <span className="text-sm text-muted-foreground">дней</span>
              <Button size="sm" onClick={handleSearch} disabled={loading}>
                {loading ? <Icon name="Loader2" size={16} className="animate-spin" /> : <Icon name="Search" size={16} />}
              </Button>
            </div>
            <Input
              placeholder="Поиск по имени, email, должности..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </div>

          {data && !loading && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Icon name="Users" size={20} className="text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{data.total_active_users}</p>
                      <p className="text-xs text-muted-foreground">Всего активных</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <Icon name="UserX" size={20} className="text-orange-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{data.inactive_count}</p>
                      <p className="text-xs text-muted-foreground">Неактивных ({data.days_threshold}+ дн.)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Icon name="ShieldCheck" size={20} className="text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{exceptions.length}</p>
                      <p className="text-xs text-muted-foreground">В исключениях</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <Icon name="UserCheck" size={20} className="text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{data.total_active_users - data.inactive_count}</p>
                      <p className="text-xs text-muted-foreground">Активных</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {error && (
            <Card className="mb-6 border-destructive">
              <CardContent className="pt-4 pb-4 text-destructive text-sm">{error}</CardContent>
            </Card>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Icon name="Loader2" size={32} className="animate-spin text-primary" />
            </div>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Найдено: {filtered.length}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filtered.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Icon name="CheckCircle" size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Все пользователи активны</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filtered.map(u => (
                      <div
                        key={u.id}
                        className={`p-3 rounded-lg border transition-colors flex items-center justify-between gap-3 ${
                          u.is_excluded ? 'bg-emerald-50/40 border-emerald-200' : 'bg-muted/20 hover:bg-muted/40'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium">{u.name}</p>
                            {u.is_excluded && (
                              <Badge variant="outline" className="text-xs text-emerald-700 border-emerald-300 bg-emerald-50 gap-1">
                                <Icon name="ShieldCheck" size={12} />
                                В исключениях
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {u.email && <span className="text-xs text-muted-foreground">{u.email}</span>}
                            {u.position && (
                              <Badge variant="secondary" className="text-xs">{u.position}</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {getDaysBadge(u.days_inactive)}
                          {u.last_login && (
                            <span className="text-xs text-muted-foreground hidden sm:inline">
                              {new Date(u.last_login).toLocaleDateString('ru-RU')}
                            </span>
                          )}
                          {isAdmin && !u.is_excluded && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => handleAddToExceptions(u)}
                              title="Добавить в исключения"
                            >
                              <Icon name="ShieldCheck" size={14} />
                              <span className="hidden md:inline">В исключения</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="exceptions">
          <div className="flex flex-wrap gap-3 mb-6">
            <Input
              placeholder="Поиск по имени, email, должности..."
              value={excSearch}
              onChange={e => setExcSearch(e.target.value)}
              className="max-w-xs"
            />
          </div>

          {exceptionsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Icon name="Loader2" size={32} className="animate-spin text-primary" />
            </div>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  В списке: {filteredExceptions.length}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredExceptions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Icon name="ShieldOff" size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Список исключений пуст</p>
                    {isAdmin && (
                      <Button size="sm" variant="outline" className="mt-3 gap-2" onClick={() => setAddModalOpen(true)}>
                        <Icon name="Plus" size={14} />
                        Добавить
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredExceptions.map(e => (
                      <div key={e.id} className="p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{e.full_name}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {e.email && <span className="text-xs text-muted-foreground">{e.email}</span>}
                            {e.position && (
                              <Badge variant="secondary" className="text-xs">{e.position}</Badge>
                            )}
                          </div>
                          {e.reason && (
                            <p className="text-xs text-muted-foreground mt-1 italic">{e.reason}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Добавил: {e.added_by_name || '—'}
                            {e.added_at && ` · ${new Date(e.added_at).toLocaleDateString('ru-RU')}`}
                          </p>
                        </div>
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setRemoveTarget(e)}
                          >
                            <Icon name="Trash2" size={14} />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reports">
          {reportsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Icon name="Loader2" size={32} className="animate-spin text-primary" />
            </div>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">История блокировок: {reports.length}</CardTitle>
              </CardHeader>
              <CardContent>
                {reports.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Icon name="FileText" size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Отчётов пока нет</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {reports.map(r => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => openReportById(r.id)}
                        className="w-full text-left p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors flex items-center justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {r.started_at ? new Date(r.started_at).toLocaleString('ru-RU') : '—'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {r.started_by_name || '—'}
                            {r.days_threshold ? ` · порог ${r.days_threshold} дн.` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="outline" className="text-xs text-red-700 border-red-300 bg-red-50">
                            {r.deactivated_count} забл.
                          </Badge>
                          {r.errors_count > 0 && (
                            <Badge variant="outline" className="text-xs text-orange-700 border-orange-300 bg-orange-50">
                              {r.errors_count} ош.
                            </Badge>
                          )}
                          {r.skipped_count > 0 && (
                            <Badge variant="outline" className="text-xs text-emerald-700 border-emerald-300 bg-emerald-50">
                              {r.skipped_count} пр.
                            </Badge>
                          )}
                          <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <BlockReportModal
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        report={activeReport}
      />
    </PageLayout>
  );
};

export default BitrixInactiveUsers;