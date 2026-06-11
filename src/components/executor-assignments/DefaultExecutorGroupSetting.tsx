import { useEffect, useState } from 'react';
import { apiFetch, getApiUrl } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { RefGroup } from '@/hooks/useExecutorAssignments';

interface DefaultExecutorGroupSettingProps {
  groups: RefGroup[];
}

const SETTINGS_URL = `${getApiUrl('system_settings')}?endpoint=system_settings`;
const SETTING_KEY = 'default_executor_group_id';

const DefaultExecutorGroupSetting = ({ groups }: DefaultExecutorGroupSettingProps) => {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [groupId, setGroupId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiFetch(`${SETTINGS_URL}&key=${SETTING_KEY}`);
        if (res.ok) {
          const data = await res.json();
          const value = (data?.value ?? '').toString().trim();
          if (value) {
            setEnabled(true);
            setGroupId(value);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const save = async (value: string) => {
    setSaving(true);
    try {
      const res = await apiFetch(SETTINGS_URL, {
        method: 'PUT',
        body: JSON.stringify({ key: SETTING_KEY, value }),
      });
      if (!res.ok) throw new Error('save failed');
      toast({ title: 'Настройка сохранена' });
    } catch {
      toast({ title: 'Не удалось сохранить', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    if (!checked) {
      setGroupId('');
      save('');
    } else if (groupId) {
      save(groupId);
    }
  };

  const handleGroupChange = (value: string) => {
    setGroupId(value);
    save(value);
  };

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Label className="text-base font-semibold">Группа по умолчанию</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Назначается на заявку, если у её услуги/сервиса не привязан исполнитель или группа
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={handleToggle} disabled={loading || saving} />
      </div>

      {enabled && (
        <div className="mt-4 max-w-md">
          <Select value={groupId} onValueChange={handleGroupChange} disabled={saving}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите группу исполнителей" />
            </SelectTrigger>
            <SelectContent>
              {groups.map((g) => (
                <SelectItem key={g.id} value={String(g.id)}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!groupId && (
            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
              <Icon name="TriangleAlert" size={14} />
              Выберите группу, чтобы настройка заработала
            </p>
          )}
        </div>
      )}
    </Card>
  );
};

export default DefaultExecutorGroupSetting;
