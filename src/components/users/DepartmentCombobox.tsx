import { useMemo, useState } from 'react';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { buildDepartmentPath } from '@/utils/departmentPath';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

interface Department {
  id: number;
  name: string;
  parent_id?: number | null;
}

interface DepartmentComboboxProps {
  departments: Department[];
  value?: number | null;
  onChange: (value: number | null) => void;
}

const DepartmentCombobox = ({ departments, value, onChange }: DepartmentComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const itemClass =
    'items-start border-0 outline-none ring-0 aria-selected:bg-muted aria-selected:text-foreground data-[selected=true]:bg-muted data-[selected=true]:text-foreground';

  const SEP = ' → ';

  const options = useMemo(
    () =>
      departments.map((dept) => {
        const path = buildDepartmentPath(departments, dept.id);
        const idx = path.lastIndexOf(SEP);
        const prefix = idx >= 0 ? path.slice(0, idx + SEP.length) : '';
        const last = idx >= 0 ? path.slice(idx + SEP.length) : path;
        return { id: dept.id, name: dept.name, path, prefix, last };
      }),
    [departments],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.path.toLowerCase().includes(q) || o.name.toLowerCase().includes(q),
    );
  }, [options, search]);

  const selectedLabel =
    value != null ? buildDepartmentPath(departments, value) : 'Без отдела';

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(''); }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">{selectedLabel}</span>
          <Icon name="ChevronsUpDown" size={16} className="ml-2 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Поиск отдела..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList
            className="max-h-[320px] overflow-y-auto overscroll-contain"
            onWheel={(e) => e.stopPropagation()}
          >
            <CommandEmpty>Отдел не найден</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="none"
                className={itemClass}
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <Icon
                  name="Check"
                  size={16}
                  className={cn('mr-2', value == null ? 'opacity-100' : 'opacity-0')}
                />
                Без отдела
              </CommandItem>
              {filtered.map((opt) => (
                <CommandItem
                  key={opt.id}
                  value={String(opt.id)}
                  className={itemClass}
                  onSelect={() => {
                    onChange(opt.id);
                    setOpen(false);
                  }}
                >
                  <Icon
                    name="Check"
                    size={16}
                    className={cn('mr-2 mt-0.5 shrink-0', value === opt.id ? 'opacity-100' : 'opacity-0')}
                  />
                  <span className="whitespace-normal break-words">
                    {opt.prefix}
                    <span className="font-semibold">{opt.last}</span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default DepartmentCombobox;