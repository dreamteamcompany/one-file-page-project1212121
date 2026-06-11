import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import { useAuth } from '@/contexts/AuthContext';

const SYSTEM_ROLES = [
  { value: 'user', label: 'Пользователь', icon: 'User', description: 'Создаёт заявки и следит за своими' },
  { value: 'executor', label: 'Исполнитель', icon: 'Wrench', description: 'Берёт заявки в работу и решает их' },
  { value: 'admin', label: 'Администратор', icon: 'ShieldCheck', description: 'Полный доступ к настройкам системы' },
];

interface Permission {
  id: number;
  name: string;
  resource: string;
  action: string;
  description: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
  permissions?: Permission[];
  user_count: number;
}

interface ExecutorGroup {
  id: number;
  name: string;
}

interface RoleFormData {
  name: string;
  description: string;
  permission_ids: number[];
  system_role: string;
  restrict_to_groups: boolean;
  visible_group_ids: number[];
}

interface RoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRole: Role | null;
  formData: RoleFormData;
  onFormChange: (data: RoleFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  permissions: Permission[];
  togglePermission: (permId: number) => void;
  getResourceIcon: (resource: string) => string;
  getResourceColor: (resource: string) => string;
  getResourceDisplayName: (resource: string) => string;
  executorGroups: ExecutorGroup[];
}

const RoleDialog = ({
  open,
  onOpenChange,
  editingRole,
  formData,
  onFormChange,
  onSubmit,
  permissions,
  togglePermission,
  getResourceIcon,
  getResourceColor,
  getResourceDisplayName,
  executorGroups,
}: RoleDialogProps) => {
  const { hasPermission } = useAuth();

  const toggleVisibleGroup = (groupId: number) => {
    const current = formData.visible_group_ids || [];
    onFormChange({
      ...formData,
      visible_group_ids: current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId],
    });
  };

  const groupedPermissions = permissions
    .filter((perm) => !(perm.resource === 'tickets' && perm.action === 'forbid_change_executor'))
    .reduce((acc, perm) => {
      if (!acc[perm.resource]) {
        acc[perm.resource] = [];
      }
      acc[perm.resource].push(perm);
      return acc;
    }, {} as Record<string, Permission[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {hasPermission('roles', 'create') && (
        <DialogTrigger asChild>
          <Button className="bg-primary hover:bg-primary/90 gap-2 w-full sm:w-auto">
            <Icon name="Plus" size={18} />
            <span>Добавить роль</span>
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingRole ? 'Редактировать роль' : 'Новая роль'}</DialogTitle>
          <DialogDescription>
            {editingRole ? 'Измените настройки роли и права доступа' : 'Создайте новую роль и назначьте права доступа'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Название роли *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
              placeholder="Администратор"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => onFormChange({ ...formData, description: e.target.value })}
              placeholder="Полный доступ ко всем функциям"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Системный тип роли</Label>
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-amber-500/10 text-amber-500"
                title="Системный тип привязывает роль к встроенной логике приложения"
              >
                <Icon name="Lock" size={10} />
                опционально
              </span>
            </div>
            <Select
              value={formData.system_role || 'none'}
              onValueChange={(val) => onFormChange({ ...formData, system_role: val === 'none' ? '' : val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Не выбрана" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <div className="flex items-center gap-2">
                    <Icon name="UserCog" size={14} />
                    <span>Без типа</span>
                    <span className="text-xs text-muted-foreground ml-1">— обычная роль, права настраиваются вручную</span>
                  </div>
                </SelectItem>
                {SYSTEM_ROLES.map(sr => (
                  <SelectItem key={sr.value} value={sr.value}>
                    <div className="flex items-center gap-2">
                      <Icon name={sr.icon} size={14} />
                      <span>{sr.label}</span>
                      <span className="text-xs text-muted-foreground ml-1">— {sr.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Привязывает роль к встроенной логике: например, «Администратор» всегда видит все статусы и имеет полный доступ, «Исполнитель» может брать заявки в работу.
            </p>
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-start gap-3">
              <Switch
                id="restrict-to-groups"
                className="mt-0.5"
                checked={formData.restrict_to_groups}
                onCheckedChange={(v) => onFormChange({ ...formData, restrict_to_groups: v })}
              />
              <div className="space-y-0.5">
                <Label htmlFor="restrict-to-groups" className="text-sm font-medium cursor-pointer">
                  Видит только заявки групп
                </Label>
                <p className="text-xs text-muted-foreground">
                  Пользователь видит только заявки, назначенные на участников выбранных групп. Если группы не выбраны — не видит ни одной заявки.
                </p>
              </div>
            </div>

            {formData.restrict_to_groups && (
              <div className="ml-12 space-y-2">
                <Label className="text-xs text-muted-foreground">Выберите группы</Label>
                {executorGroups.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Нет доступных групп исполнителей</p>
                ) : (
                  <div className="space-y-2">
                    {executorGroups.map((group) => (
                      <div key={group.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`group-${group.id}`}
                          checked={(formData.visible_group_ids || []).includes(group.id)}
                          onCheckedChange={() => toggleVisibleGroup(group.id)}
                        />
                        <Label htmlFor={`group-${group.id}`} className="text-sm cursor-pointer">
                          {group.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <h4 className="text-sm font-semibold">Права доступа</h4>
            {Object.entries(groupedPermissions).map(([resource, perms]) => (
              <div key={resource} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${getResourceColor(resource)}`}>
                    <Icon name={getResourceIcon(resource)} size={14} />
                  </div>
                  <h5 className="text-sm font-medium">{getResourceDisplayName(resource)}</h5>
                </div>
                <div className="ml-8 space-y-2">
                  {perms.map((perm) => (
                    <div key={perm.id} className="flex items-center gap-2">
                      {resource === 'tickets' ? (
                        <>
                          <Switch
                            id={`perm-${perm.id}`}
                            checked={formData.permission_ids.includes(perm.id)}
                            onCheckedChange={() => togglePermission(perm.id)}
                          />
                          <Label htmlFor={`perm-${perm.id}`} className="text-sm cursor-pointer">
                            {perm.description}
                          </Label>
                        </>
                      ) : (
                        <>
                          <Checkbox
                            id={`perm-${perm.id}`}
                            checked={formData.permission_ids.includes(perm.id)}
                            onCheckedChange={() => togglePermission(perm.id)}
                          />
                          <Label htmlFor={`perm-${perm.id}`} className="text-sm cursor-pointer">
                            {perm.description}
                          </Label>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Button type="submit" className="w-full">
            {editingRole ? 'Сохранить изменения' : 'Создать роль'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RoleDialog;