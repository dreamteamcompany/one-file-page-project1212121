import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, API_URL } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';
import PaymentsSidebar from '@/components/payments/PaymentsSidebar';
import { useAuth } from '@/contexts/AuthContext';
import RoleCard from '@/components/roles/RoleCard';
import RoleDialog from '@/components/roles/RoleDialog';
import RoleHeader from '@/components/roles/RoleHeader';

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

const Roles = () => {
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [dictionariesOpen, setDictionariesOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permission_ids: [] as number[],
  });

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 75) {
      setMenuOpen(false);
    }
  };

  const loadRoles = () => {
    apiFetch(`${API_URL}?endpoint=roles`)
      .then(res => res.json())
      .then(data => {
        setRoles(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load roles:', err);
        setRoles([]);
        setLoading(false);
      });
  };

  const loadPermissions = () => {
    apiFetch(`${API_URL}?endpoint=permissions`)
      .then(res => res.json())
      .then(data => {
        setPermissions(Array.isArray(data) ? data : []);
      })
      .catch(err => {
        console.error('Failed to load permissions:', err);
        setPermissions([]);
      });
  };

  useEffect(() => {
    if (!hasPermission('roles', 'read')) {
      navigate('/tickets');
      return;
    }
    loadRoles();
    loadPermissions();
  }, [hasPermission, navigate]);

  if (!hasPermission('roles', 'read')) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const requiredPermission = editingRole ? 'update' : 'create';
    if (!hasPermission('roles', requiredPermission)) {
      toast({
        title: 'Ошибка',
        description: 'У вас нет прав для этой операции',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const method = editingRole ? 'PUT' : 'POST';
      const url = editingRole 
        ? `${API_URL}?endpoint=roles&id=${editingRole.id}`
        : `${API_URL}?endpoint=roles`;
      
      const body = formData;

      console.log('[ROLES] Submitting role:', { method, body, url });
      console.log('[ROLES] Token exists:', localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') ? 'YES' : 'NO');

      const response = await apiFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      console.log('[ROLES] Response:', response.status, response.statusText);

      if (response.ok) {
        toast({
          title: 'Успешно',
          description: editingRole ? 'Роль обновлена' : 'Роль создана',
        });
        setDialogOpen(false);
        setEditingRole(null);
        setFormData({
          name: '',
          description: '',
          permission_ids: [],
        });
        loadRoles();
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[ROLES] Error response:', errorData);
        toast({
          title: 'Ошибка',
          description: errorData.message || errorData.error || 'Не удалось сохранить роль',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('[ROLES] Failed to save role:', err);
      toast({
        title: 'Ошибка',
        description: 'Ошибка сети или сервера',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (role: Role) => {
    if (!hasPermission('roles', 'update')) {
      toast({
        title: 'Ошибка',
        description: 'У вас нет прав для редактирования ролей',
        variant: 'destructive',
      });
      return;
    }
    
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description,
      permission_ids: role.permissions?.map(p => p.id) || [],
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!hasPermission('roles', 'remove')) {
      toast({
        title: 'Ошибка',
        description: 'У вас нет прав для удаления ролей',
        variant: 'destructive',
      });
      return;
    }
    
    if (!confirm('Вы уверены, что хотите удалить эту роль?')) return;
    
    try {
      const response = await apiFetch(
        `${API_URL}?endpoint=roles`,
        { 
          method: 'DELETE',
          body: JSON.stringify({ id })
        }
      );

      if (response.ok) {
        toast({
          title: 'Успешно',
          description: 'Роль удалена',
        });
        loadRoles();
      } else {
        const error = await response.json();
        toast({
          title: 'Ошибка удаления',
          description: error.error || 'Не удалось удалить роль',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Failed to delete role:', err);
      toast({
        title: 'Ошибка сети',
        description: 'Проверьте подключение к интернету',
        variant: 'destructive',
      });
    }
  };

  const togglePermission = (permId: number) => {
    setFormData(prev => ({
      ...prev,
      permission_ids: prev.permission_ids.includes(permId)
        ? prev.permission_ids.filter(id => id !== permId)
        : [...prev.permission_ids, permId]
    }));
  };

  const getResourceIcon = (resource: string) => {
    switch (resource) {
      case 'payments':
        return 'CreditCard';
      case 'users':
        return 'Users';
      case 'roles':
        return 'Shield';
      case 'categories':
        return 'Tag';
      case 'tickets':
        return 'Ticket';
      case 'ticket_priorities':
        return 'AlertCircle';
      case 'ticket_statuses':
        return 'CircleDot';
      default:
        return 'Circle';
    }
  };

  const getResourceColor = (resource: string) => {
    switch (resource) {
      case 'payments':
        return 'text-blue-500 bg-blue-500/10';
      case 'users':
        return 'text-green-500 bg-green-500/10';
      case 'roles':
        return 'text-purple-500 bg-purple-500/10';
      case 'categories':
        return 'text-yellow-500 bg-yellow-500/10';
      case 'tickets':
        return 'text-orange-500 bg-orange-500/10';
      case 'ticket_priorities':
        return 'text-red-500 bg-red-500/10';
      case 'ticket_statuses':
        return 'text-cyan-500 bg-cyan-500/10';
      default:
        return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getResourceDisplayName = (resource: string) => {
    switch (resource) {
      case 'tickets':
        return 'Модификаторы доступа к заявкам';
      case 'payments':
        return 'Платежи';
      case 'users':
        return 'Пользователи';
      case 'roles':
        return 'Роли';
      case 'categories':
        return 'Категории';
      case 'ticket_priorities':
        return 'Приоритеты заявок';
      case 'ticket_statuses':
        return 'Статусы заявок';
      default:
        return resource;
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingRole(null);
      setFormData({
        name: '',
        description: '',
        permission_ids: [],
      });
    }
  };

  return (
    <div className="flex min-h-screen">
      <PaymentsSidebar
        menuOpen={menuOpen}
        dictionariesOpen={dictionariesOpen}
        setDictionariesOpen={setDictionariesOpen}
        settingsOpen={settingsOpen}
        setSettingsOpen={setSettingsOpen}
        handleTouchStart={handleTouchStart}
        handleTouchMove={handleTouchMove}
        handleTouchEnd={handleTouchEnd}
      />

      {menuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <main className="lg:ml-[250px] p-4 md:p-6 lg:p-[30px] min-h-screen flex-1 overflow-x-hidden max-w-full">
        <RoleHeader 
          menuOpen={menuOpen}
          onMenuToggle={() => setMenuOpen(!menuOpen)}
        />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Права доступа</h1>
            <p className="text-sm md:text-base text-muted-foreground">Управление ролями и разрешениями</p>
          </div>
          <RoleDialog
            open={dialogOpen}
            onOpenChange={handleDialogOpenChange}
            editingRole={editingRole}
            formData={formData}
            onFormChange={setFormData}
            onSubmit={handleSubmit}
            permissions={permissions}
            togglePermission={togglePermission}
            getResourceIcon={getResourceIcon}
            getResourceColor={getResourceColor}
            getResourceDisplayName={getResourceDisplayName}
          />
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Загрузка...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {roles.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                onEdit={handleEdit}
                onDelete={handleDelete}
                getResourceIcon={getResourceIcon}
                getResourceColor={getResourceColor}
                getResourceDisplayName={getResourceDisplayName}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Roles;
