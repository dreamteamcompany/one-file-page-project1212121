import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { Department, DepartmentUser } from './types';

interface Props {
  open: boolean;
  mode: 'create' | 'edit';
  department: Department | null;
  parentId: number | null;
  departments: Department[];
  apiUrl: string;
  authHeaders: (json?: boolean) => Record<string, string>;
  onClose: () => void;
  onSave: (name: string, headUserId: number | null) => Promise<void>;
}

const EditDepartmentDialog = ({
  open,
  mode,
  department,
  parentId,
  departments,
  apiUrl,
  authHeaders,
  onClose,
  onSave,
}: Props) => {
  const [name, setName] = useState('');
  const [headUserId, setHeadUserId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<DepartmentUser[]>([]);
  const [headLabel, setHeadLabel] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && department) {
      setName(department.name);
      setHeadUserId(department.head_user_id);
      setHeadLabel(department.head_name || '');
    } else {
      setName('');
      setHeadUserId(null);
      setHeadLabel('');
    }
    setSearch('');
    setResults([]);
  }, [open, mode, department]);

  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(
        `${apiUrl}?endpoint=search-users&q=${encodeURIComponent(search)}`,
        { headers: authHeaders() },
      );
      if (res.ok) setResults(await res.json());
    }, 250);
    return () => clearTimeout(t);
  }, [search, apiUrl, authHeaders]);

  const parentName =
    parentId != null ? departments.find((d) => d.id === parentId)?.name : null;

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave(name.trim(), headUserId);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Редактировать отдел' : 'Новый отдел'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {parentName && (
            <div className="text-xs text-muted-foreground">
              Родительский отдел: <span className="font-medium">{parentName}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label>Название отдела</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Отдел продаж"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Руководитель</Label>
            {headLabel ? (
              <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/30">
                <Icon name="User" size={14} />
                <span className="text-sm flex-1 truncate">{headLabel}</span>
                <button
                  type="button"
                  onClick={() => {
                    setHeadUserId(null);
                    setHeadLabel('');
                  }}
                  className="p-1 rounded hover:bg-accent"
                >
                  <Icon name="X" size={14} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Поиск сотрудника..."
                />
                {results.length > 0 && (
                  <div className="absolute top-full mt-1 w-full max-h-56 overflow-y-auto bg-popover border rounded-md shadow-lg z-50">
                    {results.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-accent border-b last:border-b-0"
                        onClick={() => {
                          setHeadUserId(u.id);
                          setHeadLabel(u.full_name);
                          setSearch('');
                          setResults([]);
                        }}
                      >
                        <div className="text-sm font-medium">{u.full_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {u.position || '—'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !name.trim()}>
            {saving ? 'Сохранение...' : mode === 'edit' ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditDepartmentDialog;
