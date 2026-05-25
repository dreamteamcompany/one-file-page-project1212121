import { Dispatch, SetStateAction } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { DepartmentUser } from '@/components/org-chart/types';

interface OrgChartHeaderProps {
  companiesCount: number;
  departmentsCount: number;
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  searchResults: DepartmentUser[];
  setSearchResults: Dispatch<SetStateAction<DepartmentUser[]>>;
  setSelectedDept: Dispatch<SetStateAction<number | null>>;
  expandAncestors: (deptId: number) => void;
  findMe: () => void;
  isAdmin: boolean;
  setCreatingCompany: Dispatch<SetStateAction<boolean>>;
}

const OrgChartHeader = ({
  companiesCount,
  departmentsCount,
  search,
  setSearch,
  searchResults,
  setSearchResults,
  setSelectedDept,
  expandAncestors,
  findMe,
  isAdmin,
  setCreatingCompany,
}: OrgChartHeaderProps) => {
  return (
    <div className="flex flex-wrap items-center gap-3 justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Icon name="GitBranch" size={22} />
          Оргструктура
        </h1>
        <span className="text-sm text-muted-foreground">
          Компаний: {companiesCount} · Отделов: {departmentsCount}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <Icon
            name="Search"
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Найти сотрудника или должность"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-72"
          />
          {searchResults.length > 0 && (
            <div className="absolute top-full mt-1 w-80 max-h-80 overflow-y-auto bg-popover border rounded-md shadow-lg z-50">
              {searchResults.map((u) => (
                <button
                  key={u.id}
                  className="w-full text-left px-3 py-2 hover:bg-accent border-b last:border-b-0"
                  onClick={() => {
                    if (u.department_id) {
                      setSelectedDept(u.department_id);
                      expandAncestors(u.department_id);
                      setTimeout(() => {
                        const el = document.querySelector(
                          `[data-dept-id="${u.department_id}"]`,
                        );
                        el?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'center',
                          inline: 'center',
                        });
                      }, 200);
                    }
                    setSearch('');
                    setSearchResults([]);
                  }}
                >
                  <div className="text-sm font-medium">{u.full_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {u.position || '—'}
                    {u.department_name ? ` · ${u.department_name}` : ''}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={findMe} className="gap-2">
          <Icon name="MapPin" size={14} />
          Найти меня
        </Button>
        {isAdmin && (
          <Button
            size="sm"
            onClick={() => setCreatingCompany(true)}
            className="gap-2"
          >
            <Icon name="Plus" size={14} />
            Добавить компанию
          </Button>
        )}
      </div>
    </div>
  );
};

export default OrgChartHeader;
