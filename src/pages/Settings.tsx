import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import PaymentsSidebar from '@/components/payments/PaymentsSidebar';
import { useAuth } from '@/contexts/AuthContext';

const Settings = () => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dictionariesOpen, setDictionariesOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  useEffect(() => {
    if (!hasPermission('settings', 'read')) {
      navigate('/tickets');
    }
  }, [hasPermission, navigate]);

  if (!hasPermission('settings', 'read')) {
    return null;
  }

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

  const settingsSections = [
    {
      title: 'SLA',
      description: 'Настройка времени реакции и решения для заявок',
      icon: 'Clock',
      color: 'hsl(var(--primary))',
      path: '/sla',
      permission: { resource: 'sla', action: 'read' },
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
  ];

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
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-2 text-white"
            >
              <Icon name="Menu" size={24} />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Основные настройки</h1>
              <p className="text-sm md:text-base text-muted-foreground mt-1">
                Управление данными проекта
              </p>
            </div>
          </div>
        </header>

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


      </main>
    </div>
  );
};

export default Settings;