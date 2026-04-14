import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import Icon from '@/components/ui/icon';
import PageLayout from '@/components/layout/PageLayout';
import { apiFetch } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';
import func2url from '../../backend/func2url.json';

const API_URL = func2url['bitrix-inactive-users'];

interface InactiveUser {
  id: string;
  name: string;
  email: string;
  department: number[];
  position: string;
  last_login: string | null;
  days_inactive: number | null;
}

interface ApiResponse {
  total_active_users: number;
  inactive_count: number;
  days_threshold: number;
  users: InactiveUser[];
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
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [deactivating, setDeactivating] = useState(false);
  const [error, setError] = useState('');
  const [days, setDays] = useState(30);
  const [search, setSearch] = useState('');
  const [confirmMode, setConfirmMode] = useState<DeactivateMode | null>(null);

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

  useEffect(() => {
    loadData(days);
  }, []);

  const handleSearch = () => {
    loadData(days);
  };

  const neverLoggedCount = data?.users.filter(u => u.days_inactive === null).length || 0;
  const longInactiveCount = data?.users.filter(u => u.days_inactive !== null).length || 0;

  const getConfirmCount = (mode: DeactivateMode) => {
    if (mode === 'all') return data?.inactive_count || 0;
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
        toast({ title: `Деактивировано: ${result.deactivated} из ${result.total_requested}` });
        if (result.errors?.length > 0) {
          toast({ title: `Ошибки: ${result.errors.length}`, variant: 'destructive' });
        }
        loadData(days);
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

  const filtered = data?.users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.position || '').toLowerCase().includes(q);
  }) || [];

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
        {data && data.inactive_count > 0 && (
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
                Всех ({data.inactive_count})
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
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
                  <div key={u.id} className="p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{u.name}</p>
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </PageLayout>
  );
};

export default BitrixInactiveUsers;