import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import type { GroupMember, ReferenceUser, AutoAssignType } from '@/hooks/useExecutorGroups';
import { type ScheduleEntry, isUserOnShift } from '@/hooks/useWorkSchedules';

interface MembersPanelProps {
  members: GroupMember[];
  users: ReferenceUser[];
  loading: boolean;
  onAdd: (userId: number, isLead: boolean) => Promise<boolean>;
  onRemove: (memberId: number) => Promise<boolean>;
  autoAssignType?: AutoAssignType;
  scheduleMap?: Record<number, ScheduleEntry[]>;
}

const MembersPanel = ({ members, users, loading, onAdd, onRemove, autoAssignType, scheduleMap }: MembersPanelProps) => {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isLead, setIsLead] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const showShiftStatus = autoAssignType === 'working' && scheduleMap;

  const existingUserIds = new Set(members.map(m => m.user_id));
  const availableUsers = users.filter(u => !existingUserIds.has(u.id));

  const handleAdd = async () => {
    if (!selectedUserId) return;
    setAdding(true);
    const success = await onAdd(Number(selectedUserId), isLead);
    setAdding(false);
    if (success) {
      setSelectedUserId('');
      setIsLead(false);
    }
  };

  const handleRemove = async (memberId: number) => {
    setRemovingId(memberId);
    await onRemove(memberId);
    setRemovingId(null);
  };

  const getShiftInfo = (userId: number): { onShift: boolean; tooltip: string } => {
    if (!scheduleMap) return { onShift: false, tooltip: '' };
    const schedules = scheduleMap[userId];
    if (!schedules || schedules.length === 0) {
      return { onShift: false, tooltip: 'График не настроен' };
    }
    const onShift = isUserOnShift(schedules);

    const now = new Date();
    const mskOffset = 3 * 60;
    const msk = new Date(now.getTime() + (mskOffset + now.getTimezoneOffset()) * 60000);
    const day = msk.getDay() === 0 ? 6 : msk.getDay() - 1;
    const todaySchedule = schedules.find(s => s.day_of_week === day && s.is_active);

    if (onShift && todaySchedule) {
      return { onShift: true, tooltip: `На смене до ${todaySchedule.end_time.slice(0, 5)}` };
    }
    if (todaySchedule) {
      return { onShift: false, tooltip: `Сегодня: ${todaySchedule.start_time.slice(0, 5)} – ${todaySchedule.end_time.slice(0, 5)}` };
    }
    return { onShift: false, tooltip: 'Сегодня выходной' };
  };

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Icon name="Users" size={16} />
        Участники ({members.length})
        {showShiftStatus && (
          <span className="text-xs font-normal text-muted-foreground ml-1">
            — на смене: {members.filter(m => getShiftInfo(m.user_id).onShift).length}
          </span>
        )}
      </h3>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Выберите пользователя" />
          </SelectTrigger>
          <SelectContent>
            {availableUsers.length === 0 ? (
              <div className="p-2 text-xs text-muted-foreground text-center">Нет доступных пользователей</div>
            ) : (
              availableUsers.map(u => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.full_name} ({u.email})
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is-lead"
            checked={isLead}
            onChange={(e) => setIsLead(e.target.checked)}
            className="rounded border-input"
          />
          <label htmlFor="is-lead" className="text-xs whitespace-nowrap">Лид</label>
        </div>
        <Button onClick={handleAdd} disabled={!selectedUserId || adding} size="sm" className="gap-1">
          {adding ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Plus" size={14} />}
          Добавить
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Icon name="Loader2" size={20} className="animate-spin text-muted-foreground" />
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-6 text-sm text-muted-foreground">
          <Icon name="UserPlus" size={24} className="mx-auto mb-2 opacity-30" />
          <p>Добавьте участников в группу</p>
        </div>
      ) : (
        <div className="space-y-2">
          {members.map(member => {
            const shiftInfo = showShiftStatus ? getShiftInfo(member.user_id) : null;

            return (
              <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0" title={shiftInfo?.tooltip}>
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <Icon name="User" size={14} className="text-primary" />
                    </div>
                    {shiftInfo && (
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${
                        shiftInfo.onShift ? 'bg-green-500' : 'bg-muted-foreground/40'
                      }`} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{member.user_name}</span>
                      {member.is_lead && <Badge className="text-[10px] px-1.5 py-0">Лид</Badge>}
                      {shiftInfo && (
                        <span className={`text-[10px] ${shiftInfo.onShift ? 'text-green-500' : 'text-muted-foreground'}`}>
                          {shiftInfo.onShift ? 'на смене' : shiftInfo.tooltip}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{member.user_email}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive shrink-0"
                  disabled={removingId === member.id}
                  onClick={() => handleRemove(member.id)}
                >
                  {removingId === member.id
                    ? <Icon name="Loader2" size={14} className="animate-spin" />
                    : <Icon name="X" size={14} />
                  }
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MembersPanel;