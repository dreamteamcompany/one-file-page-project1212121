import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import PageLayout from '@/components/layout/PageLayout';
import { apiFetch } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import func2url from '../../backend/func2url.json';
import BlockReportModal, { BlockReport } from './bitrix-inactive-users/BlockReportModal';
import {
  InactiveUser,
  ApiResponse,
  ExceptionItem,
  BitrixSearchUser,
  ReportListItem,
  DeactivateMode,
  MODE_LABELS,
} from './bitrix-inactive-users/types';
import InactiveUsersTab from './bitrix-inactive-users/InactiveUsersTab';
import ExceptionsTab from './bitrix-inactive-users/ExceptionsTab';
import ReportsTab from './bitrix-inactive-users/ReportsTab';

const API_URL = func2url['bitrix-inactive-users'];

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
  const [reports, setReports] = useState<ReportListItem[]>([]);
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
          <InactiveUsersTab
            data={data}
            loading={loading}
            error={error}
            days={days}
            search={search}
            filtered={filtered}
            exceptionsCount={exceptions.length}
            isAdmin={isAdmin}
            onDaysChange={setDays}
            onSearchChange={setSearch}
            onSearch={handleSearch}
            onAddToExceptions={handleAddToExceptions}
          />
        </TabsContent>

        <TabsContent value="exceptions">
          <ExceptionsTab
            exceptionsLoading={exceptionsLoading}
            filteredExceptions={filteredExceptions}
            excSearch={excSearch}
            isAdmin={isAdmin}
            onExcSearchChange={setExcSearch}
            onAddModalOpen={() => setAddModalOpen(true)}
            onRemoveTarget={setRemoveTarget}
          />
        </TabsContent>

        <TabsContent value="reports">
          <ReportsTab
            reportsLoading={reportsLoading}
            reports={reports}
            onOpenReport={openReportById}
          />
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
