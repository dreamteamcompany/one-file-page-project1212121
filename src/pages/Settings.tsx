import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import PageLayout from '@/components/layout/PageLayout';
import { useAuth } from '@/contexts/AuthContext';
import func2url from '../../backend/func2url.json';

const Settings = () => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleVsdeskSync = async () => {
    setSyncLoading(true);
    setSyncResult(null);
    try {
      const res = await fetch(func2url['vsdesk-sync']);
      const data = await res.json();
      setSyncResult({
        success: data.success,
        message: data.message || 'Синхронизация завершена',
      });
    } catch {
      setSyncResult({ success: false, message: 'Ошибка соединения с vsDesk' });
    } finally {
      setSyncLoading(false);
    }
  };

  useEffect(() => {
    if (!hasPermission('settings', 'read')) {
      navigate('/tickets');
    }
  }, [hasPermission, navigate]);

  if (!hasPermission('settings', 'read')) {
    return null;
  }

  const settingsSections = [
    {
      title: 'SLA',
      description: 'Настройка времени реакции и решения для заявок',
      icon: 'Clock',
      color: 'hsl(var(--primary))',
      items: [
        { name: 'Соглашения SLA', path: '/sla', icon: 'Clock', permission: { resource: 'sla', action: 'read' } },
        { name: 'Связь SLA с услугами', path: '/sla-service-mappings', icon: 'Link', permission: { resource: 'sla', action: 'read' } },
        { name: 'Аналитика SLA', path: '/sla-analytics', icon: 'BarChart3', permission: { resource: 'sla', action: 'read' } },
      ],
    },
    {
      title: 'Управление заявками',
      description: 'Услуги, категории, сервисы, статусы, приоритеты, группы и привязка исполнителей',
      icon: 'Ticket',
      color: 'hsl(var(--secondary))',
      items: [
        { name: 'Услуги заявок', path: '/ticket-services-management', icon: 'Wrench', permission: { resource: 'ticket_services', action: 'read' } },
        { name: 'Категории услуг', path: '/ticket-service-categories', icon: 'FolderTree', permission: { resource: 'ticket_service_categories', action: 'read' } },
        { name: 'Сервисы услуг', path: '/ticket-services', icon: 'Building2', permission: { resource: 'ticket_services', action: 'read' } },
        { name: 'Статусы заявок', path: '/ticket-statuses', icon: 'CircleDot', permission: { resource: 'ticket_statuses', action: 'read' } },
        { name: 'Приоритеты заявок', path: '/ticket-priorities', icon: 'AlertCircle', permission: { resource: 'ticket_priorities', action: 'read' } },
        { name: 'Группы исполнителей', path: '/executor-groups', icon: 'UsersRound', permission: { resource: 'executor_groups', action: 'read' } },
        { name: 'Привязка исполнителей', path: '/executor-assignments', icon: 'UserCheck', permission: { resource: 'executor_groups', action: 'read' } },
      ],
    },
    {
      title: 'Структура компании',
      description: 'Компании, подразделения и должности',
      icon: 'Building2',
      color: 'hsl(var(--accent))',
      items: [
        { name: 'Компании', path: '/companies', icon: 'Building2', permission: { resource: 'companies', action: 'read' } },
        { name: 'Подразделения', path: '/departments', icon: 'Network', permission: { resource: 'departments', action: 'read' } },
        { name: 'Должности', path: '/positions', icon: 'Briefcase', permission: { resource: 'positions', action: 'read' } },
      ],
    },
    {
      title: 'Управление полями',
      description: 'Реестр полей, группы и связь с услугами',
      icon: 'Database',
      color: 'hsl(var(--success))',
      items: [
        { name: 'Реестр полей', path: '/field-registry', icon: 'Database', permission: { resource: 'field_registry', action: 'read' } },
        { name: 'Группы полей', path: '/custom-field-groups', icon: 'Layers', permission: { resource: 'custom_field_groups', action: 'read' } },
        { name: 'Связь услуг с полями', path: '/service-field-mappings', icon: 'Link', permission: { resource: 'service_field_mappings', action: 'read' } },
      ],
    },
    {
      title: 'Пользователи',
      description: 'Управление пользователями системы',
      icon: 'Users',
      color: 'hsl(var(--primary))',
      path: '/users',
      permission: { resource: 'users', action: 'read' },
    },
    {
      title: 'Права доступа',
      description: 'Роли и разрешения пользователей',
      icon: 'Shield',
      color: 'hsl(var(--secondary))',
      path: '/roles',
      permission: { resource: 'roles', action: 'read' },
    },
    {
      title: 'Анализатор логов',
      description: 'Просмотр и анализ системных логов',
      icon: 'FileText',
      color: 'hsl(var(--accent))',
      path: '/log-analyzer',
      permission: { resource: 'log_analyzer', action: 'read' },
    },
  ];

  return (
    <PageLayout>
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Основные настройки</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Управление данными проекта
          </p>
        </div>
      </header>

      {hasPermission('settings', 'read') && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-500/10">
                <Icon name="RefreshCw" size={20} className="text-orange-500" />
              </div>
              <div>
                <CardTitle className="text-base">Интеграции</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Синхронизация данных с внешними системами
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-blue-500/10 flex items-center justify-center">
                  <Icon name="Server" size={16} className="text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">vsDesk</p>
                  <p className="text-xs text-muted-foreground">Заявки и комментарии</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {syncResult && (
                  <span className={`text-xs ${syncResult.success ? 'text-green-500' : 'text-red-500'}`}>
                    {syncResult.message}
                  </span>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleVsdeskSync}
                  disabled={syncLoading}
                  className="gap-2"
                >
                  <Icon name={syncLoading ? 'Loader2' : 'RefreshCw'} size={14} className={syncLoading ? 'animate-spin' : ''} />
                  {syncLoading ? 'Синхронизация...' : 'Синхронизировать'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {settingsSections.map((section) => {
          const hasAnyPermission = section.permission
            ? hasPermission(section.permission.resource, section.permission.action)
            : section.items?.some(item => hasPermission(item.permission.resource, item.permission.action));

          if (!hasAnyPermission) return null;

          return (
            <Card
              key={section.title}
              className="hover:border-primary/30 transition-colors cursor-pointer group"
              onClick={() => {
                if (section.path) {
                  navigate(section.path);
                }
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${section.color}20` }}
                  >
                    <Icon name={section.icon} size={20} style={{ color: section.color }} />
                  </div>
                  <div>
                    <CardTitle className="text-base group-hover:text-primary transition-colors">
                      {section.title}
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      {section.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              {section.items && (
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2">
                    {section.items
                      .filter(item => hasPermission(item.permission.resource, item.permission.action))
                      .map((item) => (
                        <button
                          key={item.path}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(item.path);
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted/50 hover:bg-primary/10 hover:text-primary text-xs text-muted-foreground transition-colors"
                        >
                          <Icon name={item.icon} size={14} />
                          {item.name}
                        </button>
                      ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </PageLayout>
  );
};

export default Settings;