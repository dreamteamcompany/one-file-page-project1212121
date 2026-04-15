import { useState, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';

interface UserVisibilitySelectorProps {
  users: { id: number; full_name: string }[];
  selectedUserIds: number[];
  onChange: (userIds: number[]) => void;
}

const UserVisibilitySelector = ({
  users,
  selectedUserIds,
  onChange,
}: UserVisibilitySelectorProps) => {
  const [search, setSearch] = useState('');

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const lower = search.toLowerCase();
    return users.filter((u) => u.full_name.toLowerCase().includes(lower));
  }, [users, search]);

  const toggleUser = (userId: number) => {
    if (selectedUserIds.includes(userId)) {
      onChange(selectedUserIds.filter((id) => id !== userId));
    } else {
      onChange([...selectedUserIds, userId]);
    }
  };

  return (
    <div className="space-y-3 pt-4 border-t">
      <div className="flex items-center justify-between">
        <Label className="text-base">Показывать только</Label>
        <span className="text-sm text-muted-foreground">
          Выбрано: {selectedUserIds.length}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        Если не выбрано ни одного — видят все пользователи
      </p>

      <div className="relative">
        <Icon
          name="Search"
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по имени"
          className="pl-9"
        />
      </div>

      {filteredUsers.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Пользователи не найдены
        </div>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-md p-3">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <Checkbox
                id={`visibility-user-${user.id}`}
                checked={selectedUserIds.includes(user.id)}
                onCheckedChange={() => toggleUser(user.id)}
              />
              <label
                htmlFor={`visibility-user-${user.id}`}
                className="flex-1 cursor-pointer text-sm font-medium"
              >
                {user.full_name}
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserVisibilitySelector;
