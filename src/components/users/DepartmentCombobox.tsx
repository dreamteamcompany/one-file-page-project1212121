import { useState } from 'react';
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

  const selectedLabel =
    value != null ? buildDepartmentPath(departments, value) : 'Без отдела';

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
        <Command>
          <CommandInput placeholder="Поиск отдела..." />
          <CommandList>
            <CommandEmpty>Отдел не найден</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="Без отдела"
                className="data-[selected=true]:bg-muted data-[selected=true]:text-foreground"
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
              {departments.map((dept) => {
                const path = buildDepartmentPath(departments, dept.id);
                return (
                  <CommandItem
                    key={dept.id}
                    value={`${path} ${dept.name}`}
                    className="data-[selected=true]:bg-muted data-[selected=true]:text-foreground"
                    onSelect={() => {
                      onChange(dept.id);
                      setOpen(false);
                    }}
                  >
                    <Icon
                      name="Check"
                      size={16}
                      className={cn('mr-2 shrink-0', value === dept.id ? 'opacity-100' : 'opacity-0')}
                    />
                    <span className="truncate">{path}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default DepartmentCombobox;