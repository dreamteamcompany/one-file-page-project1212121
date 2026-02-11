import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { useAuth } from '@/contexts/AuthContext';

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

interface RoleCardProps {
  role: Role;
  onEdit: (role: Role) => void;
  onDelete: (id: number) => void;
  getResourceIcon: (resource: string) => string;
  getResourceColor: (resource: string) => string;
  getResourceDisplayName: (resource: string) => string;
}

const RoleCard = ({
  role,
  onEdit,
  onDelete,
  getResourceIcon,
  getResourceColor,
  getResourceDisplayName,
}: RoleCardProps) => {
  const { hasPermission } = useAuth();

  const groupedPermissions = (role.permissions || []).reduce((acc, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = [];
    }
    acc[perm.resource].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <Card className="border-white/5 bg-card shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-bold mb-1">{role.name}</h3>
            <p className="text-sm text-muted-foreground">{role.description}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
            <Icon name="Shield" size={24} />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/10">
          <Icon name="Users" size={16} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {role.user_count} {role.user_count === 1 ? 'пользователь' : 'пользователей'}
          </span>
        </div>

        <div className="space-y-2 mb-4">
          <h4 className="text-sm font-semibold text-muted-foreground">Права доступа:</h4>
          {Object.entries(groupedPermissions).map(([resource, perms]) => (
            <div key={resource} className="flex items-start gap-2">
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${getResourceColor(resource)} flex-shrink-0 mt-0.5`}>
                <Icon name={getResourceIcon(resource)} size={14} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium mb-1">{getResourceDisplayName(resource)}</div>
                <div className="flex flex-wrap gap-1">
                  {perms.map((perm) => (
                    <span
                      key={perm.id}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-primary/10 text-primary"
                    >
                      {perm.description}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {role.permissions?.length === 0 && (
            <p className="text-sm text-muted-foreground italic">Нет прав доступа</p>
          )}
        </div>

        <div className="flex gap-2">
          {hasPermission('roles', 'update') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(role)}
              className="flex-1"
            >
              <Icon name="Pencil" size={16} className="mr-2" />
              Редактировать
            </Button>
          )}
          {hasPermission('roles', 'remove') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(role.id)}
              className="text-red-500 hover:text-red-600 hover:border-red-500"
            >
              <Icon name="Trash2" size={16} />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RoleCard;
