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

interface RoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRole: Role | null;
  formData: {
    name: string;
    description: string;
    permission_ids: number[];
    system_role: string;
  };
  onFormChange: (data: { name: string; description: string; permission_ids: number[]; system_role: string }) => void;
  onSubmit: (e: React.FormEvent) => void;
  permissions: Permission[];
  togglePermission: (permId: number) => void;
  getResourceIcon: (resource: string) => string;
  getResourceColor: (resource: string) => string;
  getResourceDisplayName: (resource: string) => string;
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
}: RoleDialogProps) => {
  const { hasPermission } = useAuth();

  const groupedPermissions = permissions.reduce((acc, perm) => {
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
            <Label>Системная роль</Label>
            <Select
              value={formData.system_role || 'none'}
              onValueChange={(val) => onFormChange({ ...formData, system_role: val === 'none' ? '' : val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Не выбрана" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">Не выбрана</span>
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