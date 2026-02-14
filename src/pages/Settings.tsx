import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import PaymentsSidebar from '@/components/payments/PaymentsSidebar';
import ScheduledPaymentsSettings from '@/components/settings/ScheduledPaymentsSettings';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';

const CLEAR_DATA_API = 'https://functions.poehali.dev/69d0e8e7-3feb-4d34-9a63-64521e899118';

const Settings = () => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dictionariesOpen, setDictionariesOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [clearing, setClearing] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const { toast } = useToast();

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

  const handleClearAllData = async () => {
    if (confirmText !== 'УДАЛИТЬ ВСЁ') {
      toast({
        title: 'Ошибка',
        description: 'Введите "УДАЛИТЬ ВСЁ" для подтверждения',
        variant: 'destructive',
      });
      return;
    }

    setClearing(true);
    try {
      const response = await fetch(CLEAR_DATA_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed to clear data');

      const result = await response.json();
      
      toast({
        title: 'Данные удалены',
        description: `Очищено таблиц: ${result.tables_cleared}`,
      });

      setConfirmText('');
      
      // Перезагрузим страницу через 2 секунды
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (error) {
      console.error('Failed to clear data:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось очистить данные',
        variant: 'destructive',
      });
    } finally {
      setClearing(false);
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

  const dataCategories = [
    { name: 'Платежи', icon: 'CreditCard' },
    { name: 'На согласовании', icon: 'Clock' },
    { name: 'Согласованные и оплаченные', icon: 'CheckCircle' },
    { name: 'Отклонённые', icon: 'XCircle' },
    { name: 'Реестр экономии', icon: 'TrendingDown' },
    { name: 'Юридические лица', icon: 'Building2' },
    { name: 'Категории платежей', icon: 'FolderTree' },
    { name: 'Дополнительные поля', icon: 'ListPlus' },
    { name: 'Контрагенты', icon: 'Users' },
    { name: 'Отделы-заказчики', icon: 'Briefcase' },
    { name: 'Сервисы', icon: 'Server' },
    { name: 'Причины экономии', icon: 'FileText' },
    { name: 'История согласований', icon: 'History' },
    { name: 'История изменений', icon: 'GitCommit' },
    { name: 'Анализатор логов', icon: 'FileSearch' },
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

        <div className="grid gap-6">
          <ScheduledPaymentsSettings />
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon name="Trash2" size={24} className="text-destructive" />
                Опасная зона
              </CardTitle>
              <CardDescription>
                Действия в этой зоне необратимы. Будьте осторожны!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Icon name="AlertTriangle" size={20} className="text-destructive" />
                  Очистка всех данных
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Это действие удалит все данные из следующих разделов:
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
                  {dataCategories.map((category) => (
                    <div
                      key={category.name}
                      className="flex items-center gap-2 text-sm p-2 rounded bg-card"
                    >
                      <Icon name={category.icon} size={16} className="text-muted-foreground" />
                      <span>{category.name}</span>
                    </div>
                  ))}
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full sm:w-auto">
                      <Icon name="Trash2" size={18} className="mr-2" />
                      Очистить всю информацию
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <Icon name="AlertTriangle" size={24} className="text-destructive" />
                        Вы абсолютно уверены?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Это действие необратимо. Все данные будут безвозвратно удалены из базы данных.
                        <br />
                        <br />
                        Для подтверждения введите: <strong>УДАЛИТЬ ВСЁ</strong>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    
                    <div className="py-4">
                      <Input
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="Введите УДАЛИТЬ ВСЁ"
                        className="font-mono"
                      />
                    </div>

                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={() => setConfirmText('')}>
                        Отмена
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleClearAllData}
                        disabled={clearing || confirmText !== 'УДАЛИТЬ ВСЁ'}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        {clearing ? (
                          <>
                            <Icon name="Loader2" size={18} className="mr-2 animate-spin" />
                            Удаление...
                          </>
                        ) : (
                          'Удалить всё'
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon name="Info" size={24} />
                Информация о проекте
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Версия проекта</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">База данных</span>
                <span className="font-medium">PostgreSQL</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Статус</span>
                <span className="font-medium text-green-500 flex items-center gap-1">
                  <Icon name="CheckCircle" size={16} />
                  Активен
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Settings;