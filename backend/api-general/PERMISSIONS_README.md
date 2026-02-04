# Система прав доступа (RBAC)

## Архитектура

Система использует Role-Based Access Control (RBAC):
- **Пользователи (users)** → имеют **Роли (roles)** → которые имеют **Права (permissions)**
- Один пользователь может иметь несколько ролей
- Одна роль может иметь множество прав
- Права проверяются на уровне бэкенд-функций перед выполнением операций

## Структура прав

Каждое право имеет формат: `resource.action`

**Ресурсы:**
- `users` - пользователи
- `roles` - роли
- `permissions` - права доступа
- `tickets` - заявки
- `services` - услуги
- `ticket_services` - услуги заявок
- `ticket_service_categories` - категории услуг заявок
- `contractors` - контрагенты
- `legal_entities` - юридические лица
- `customer_departments` - отделы заказчика
- `categories` - категории платежей
- `ticket_comments` - комментарии к заявкам
- `notifications` - уведомления

**Действия:**
- `create` - создание ресурса
- `read` - чтение/просмотр ресурса
- `update` - редактирование ресурса
- `remove` - удаление ресурса

## Использование на бэкенде

### 1. Проверка прав в обработчике

```python
from permissions_middleware import check_permission

def handle_users(method, event, conn, payload):
    user_id = payload.get('user_id')
    
    if method == 'POST':
        # Проверяем право на создание пользователей
        if not check_permission(conn, user_id, 'users', 'create'):
            return response(403, {
                'error': 'Access denied',
                'message': 'No permission to create users'
            })
        
        # ... логика создания пользователя
```

### 2. Проверка наличия ЛЮБОГО права на ресурс

```python
from permissions_middleware import has_any_permission

if has_any_permission(conn, user_id, 'users'):
    # Пользователь имеет хоть какое-то право на users
    # Можно показать раздел в меню
```

### 3. Пакетная проверка прав

```python
from permissions_middleware import check_permissions_batch

required = [
    {'resource': 'users', 'action': 'create'},
    {'resource': 'users', 'action': 'update'},
    {'resource': 'roles', 'action': 'read'}
]

perms = check_permissions_batch(conn, user_id, required)
# {'users.create': True, 'users.update': False, 'roles.read': True}
```

## Использование на фронтенде

### 1. Хук usePermissions

```tsx
import { usePermissions } from '@/hooks/usePermissions';

const MyComponent = () => {
  const { can, canAny, loading } = usePermissions();
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      {can('users', 'create') && (
        <Button>Создать пользователя</Button>
      )}
      
      {canAny('users') && (
        <Link to="/users">Пользователи</Link>
      )}
    </div>
  );
};
```

### 2. Компонент PermissionGuard

```tsx
import { PermissionGuard } from '@/components/permissions/PermissionGuard';

<PermissionGuard resource="users" action="create">
  <Button>Создать пользователя</Button>
</PermissionGuard>

<PermissionGuard 
  resource="users" 
  action="remove"
  fallback={<span>Нет доступа</span>}
>
  <Button>Удалить</Button>
</PermissionGuard>
```

### 3. Проверка доступа к разделу

```tsx
import { AnyPermissionGuard } from '@/components/permissions/PermissionGuard';

<AnyPermissionGuard resource="users">
  <MenuItem to="/users">Пользователи</MenuItem>
</AnyPermissionGuard>
```

## API Endpoints

### Получить права текущего пользователя
```
GET /api-general?endpoint=user-permissions
Authorization: Bearer <token>

Response:
{
  "user_id": 1,
  "permissions": [
    {
      "id": 1,
      "name": "users.create",
      "resource": "users",
      "action": "create",
      "description": "Создание пользователей"
    }
  ],
  "grouped": {
    "users": {
      "create": true,
      "read": true,
      "update": false,
      "remove": false
    }
  }
}
```

### Получить все права (справочник)
```
GET /api-general?endpoint=permissions
Authorization: Bearer <token>
```

## Примеры использования

### Создание новой роли с правами

1. Создайте роль через UI или API
2. Выберите нужные права из списка
3. Назначьте роль пользователям

### Проверка прав перед действием

```tsx
const handleDelete = (userId: number) => {
  if (!can('users', 'remove')) {
    toast({
      title: 'Доступ запрещён',
      description: 'У вас нет прав на удаление пользователей',
      variant: 'destructive'
    });
    return;
  }
  
  // ... логика удаления
};
```

## Коды ошибок

- **401 Unauthorized** - токен отсутствует или невалидный
- **403 Forbidden** - нет прав на выполнение операции
- **404 Not Found** - ресурс не найден

## Лучшие практики

1. **Принцип наименьших привилегий** - давать только необходимые права
2. **Роли по функциям** - создавать роли по должностям/отделам
3. **Проверка на бэкенде** - ВСЕГДА проверять права на сервере, фронтенд - только для UX
4. **Логирование** - логировать попытки доступа к ресурсам
5. **Регулярный аудит** - проверять назначенные права раз в квартал

## Миграции

Все права хранятся в таблице `permissions`. При добавлении новых ресурсов:

```sql
INSERT INTO permissions (name, description, resource, action) VALUES
('new_resource.create', 'Создание нового ресурса', 'new_resource', 'create'),
('new_resource.read', 'Просмотр нового ресурса', 'new_resource', 'read'),
('new_resource.update', 'Редактирование нового ресурса', 'new_resource', 'update'),
('new_resource.remove', 'Удаление нового ресурса', 'new_resource', 'remove');
```
