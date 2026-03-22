import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import Icon from '@/components/ui/icon';
import PageLayout from '@/components/layout/PageLayout';
import AppHeader from '@/components/layout/AppHeader';
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
import useWorkSchedules, { type ScheduleEntry, type UserWithSchedule } from '@/hooks/useWorkSchedules';

const DAY_NAMES = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const DAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const DEFAULT_SCHEDULE: ScheduleEntry[] = Array.from({ length: 7 }, (_, i) => ({
  day_of_week: i,
  start_time: '09:00',
  end_time: '18:00',
  is_active: i < 5,
}));

const WorkSchedules = () => {
  const { usersWithSchedules, allUsers, loading, saveSchedule, deleteSchedule } = useWorkSchedules();
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editSchedules, setEditSchedules] = useState<ScheduleEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserWithSchedule | null>(null);

  const usersWithoutSchedule = allUsers.filter(
    u => !usersWithSchedules.some(ws => ws.user_id === u.id)
  );

  const handleAddUser = () => {
    if (!selectedUserId) return;
    setEditingUserId(selectedUserId);
    setEditSchedules(DEFAULT_SCHEDULE.map(s => ({ ...s })));
    setSelectedUserId(null);
  };

  const handleEdit = (userSchedule: UserWithSchedule) => {
    setEditingUserId(userSchedule.user_id);
    const full: ScheduleEntry[] = Array.from({ length: 7 }, (_, i) => {
      const existing = userSchedule.schedules.find(s => s.day_of_week === i);
      return existing
        ? { ...existing }
        : { day_of_week: i, start_time: '09:00', end_time: '18:00', is_active: false };
    });
    setEditSchedules(full);
  };

  const handleSave = async () => {
    if (!editingUserId) return;
    setSaving(true);
    const activeSchedules = editSchedules.filter(s => s.is_active);
    const success = await saveSchedule(editingUserId, activeSchedules);
    setSaving(false);
    if (success) {
      setEditingUserId(null);
      setEditSchedules([]);
    }
  };

  const handleCancel = () => {
    setEditingUserId(null);
    setEditSchedules([]);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteSchedule(deleteTarget.user_id);
    setDeleteTarget(null);
  };

  const updateDay = (dayIndex: number, field: keyof ScheduleEntry, value: unknown) => {
    setEditSchedules(prev => prev.map(s =>
      s.day_of_week === dayIndex ? { ...s, [field]: value } : s
    ));
  };

  const editingUserName = editingUserId
    ? (usersWithSchedules.find(u => u.user_id === editingUserId)?.user_name ||
       allUsers.find(u => u.id === editingUserId)?.full_name || '')
    : '';

  return (
    <PageLayout menuOpen={menuOpen} setMenuOpen={setMenuOpen}>
      <AppHeader menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Графики работы</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Настройте дни и время работы для каждого исполнителя
          </p>
        </div>
      </header>

      {!editingUserId && (
        <Card className="mb-6">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Select
                value={selectedUserId?.toString() || ''}
                onValueChange={(v) => setSelectedUserId(Number(v))}
              >
                <SelectTrigger className="w-full sm:flex-1">
                  <SelectValue placeholder="Выберите исполнителя" />
                </SelectTrigger>
                <SelectContent>
                  {usersWithoutSchedule.map(u => (
                    <SelectItem key={u.id} value={u.id.toString()}>
                      {u.full_name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAddUser} disabled={!selectedUserId} className="gap-2 shrink-0">
                <Icon name="Plus" size={16} />
                Добавить
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {editingUserId && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Icon name="Calendar" size={18} />
              <span className="truncate">График: {editingUserName}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from({ length: 7 }, (_, dayIdx) => {
                const schedule = editSchedules.find(s => s.day_of_week === dayIdx);
                if (!schedule) return null;
                const isWeekend = dayIdx >= 5;

                return (
                  <div
                    key={dayIdx}
                    className={`rounded-lg border transition-colors ${
                      schedule.is_active ? 'bg-card border-border' : 'bg-muted/30 border-border/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 p-2.5">
                      <Switch
                        checked={schedule.is_active}
                        onCheckedChange={(v) => updateDay(dayIdx, 'is_active', v)}
                      />
                      <span className={`text-sm font-medium min-w-0 ${
                        isWeekend ? 'text-orange-500' : ''
                      } ${!schedule.is_active ? 'text-muted-foreground' : ''}`}>
                        <span className="hidden sm:inline">{DAY_NAMES[dayIdx]}</span>
                        <span className="sm:hidden">{DAY_SHORT[dayIdx]}</span>
                      </span>
                      {schedule.is_active ? (
                        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
                          <Input
                            type="time"
                            value={schedule.start_time}
                            onChange={(e) => updateDay(dayIdx, 'start_time', e.target.value)}
                            className="w-[6.5rem] sm:w-28 h-8 text-sm px-2"
                          />
                          <span className="text-xs text-muted-foreground">—</span>
                          <Input
                            type="time"
                            value={schedule.end_time}
                            onChange={(e) => updateDay(dayIdx, 'end_time', e.target.value)}
                            className="w-[6.5rem] sm:w-28 h-8 text-sm px-2"
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground ml-auto">Выходной</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={handleCancel}>Отмена</Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving && <Icon name="Loader2" size={16} className="animate-spin" />}
                Сохранить
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Icon name="Loader2" size={32} className="animate-spin text-muted-foreground" />
        </div>
      ) : usersWithSchedules.length === 0 && !editingUserId ? (
        <div className="text-center py-12 text-muted-foreground">
          <Icon name="Calendar" size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Графики ещё не настроены</p>
          <p className="text-xs mt-1">Выберите исполнителя и задайте его рабочие дни и часы</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {usersWithSchedules.map(userSch => (
            <Card key={userSch.user_id} className={`transition-all ${
              editingUserId === userSch.user_id ? 'ring-2 ring-primary' : ''
            }`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon name="User" size={14} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{userSch.user_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{userSch.user_email}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleEdit(userSch)}
                    >
                      <Icon name="Pencil" size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(userSch)}
                    >
                      <Icon name="Trash2" size={14} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-1">
                  {Array.from({ length: 7 }, (_, dayIdx) => {
                    const sch = userSch.schedules.find(s => s.day_of_week === dayIdx);
                    const isActive = sch?.is_active !== false && !!sch;
                    return (
                      <div
                        key={dayIdx}
                        className={`flex-1 text-center rounded-md py-1.5 text-[10px] leading-tight ${
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted/50 text-muted-foreground'
                        }`}
                        title={isActive ? `${DAY_NAMES[dayIdx]}: ${sch!.start_time} – ${sch!.end_time}` : `${DAY_NAMES[dayIdx]}: выходной`}
                      >
                        <div className="font-medium">{DAY_SHORT[dayIdx]}</div>
                        {isActive && (
                          <div className="mt-0.5 opacity-75">
                            {sch!.start_time.slice(0, 5)}
                            <br />
                            {sch!.end_time.slice(0, 5)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить график?</AlertDialogTitle>
            <AlertDialogDescription>
              График работы для «{deleteTarget?.user_name}» будет удалён.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
};

export default WorkSchedules;
