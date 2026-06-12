import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { InactiveUser, ApiResponse } from './types';
import { formatDateOnlyMSK } from '@/utils/dateFormat';

interface InactiveUsersTabProps {
  data: ApiResponse | null;
  loading: boolean;
  error: string;
  days: number;
  search: string;
  filtered: InactiveUser[];
  exceptionsCount: number;
  isAdmin: boolean;
  onDaysChange: (days: number) => void;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  onAddToExceptions: (user: InactiveUser) => void;
}

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

const InactiveUsersTab = ({
  data,
  loading,
  error,
  days,
  search,
  filtered,
  exceptionsCount,
  isAdmin,
  onDaysChange,
  onSearchChange,
  onSearch,
  onAddToExceptions,
}: InactiveUsersTabProps) => {
  return (
    <>
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Не заходили более</span>
          <Input
            type="number"
            value={days}
            onChange={e => onDaysChange(parseInt(e.target.value) || 30)}
            className="w-20"
            min={1}
          />
          <span className="text-sm text-muted-foreground">дней</span>
          <Button size="sm" onClick={onSearch} disabled={loading}>
            {loading ? <Icon name="Loader2" size={16} className="animate-spin" /> : <Icon name="Search" size={16} />}
          </Button>
        </div>
        <Input
          placeholder="Поиск по имени, email, должности..."
          value={search}
          onChange={e => onSearchChange(e.target.value)}
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
                  <p className="text-2xl font-bold">{exceptionsCount}</p>
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
                          {formatDateOnlyMSK(u.last_login)}
                        </span>
                      )}
                      {isAdmin && !u.is_excluded && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => onAddToExceptions(u)}
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
    </>
  );
};

export default InactiveUsersTab;