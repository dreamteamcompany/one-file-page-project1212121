import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import Icon from '@/components/ui/icon';
import { Company } from '@/types';

interface DepartmentsFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedCompany: string;
  onCompanyChange: (value: string) => void;
  companies: Company[];
  showArchived?: boolean;
  onShowArchivedChange?: (value: boolean) => void;
}

const DepartmentsFilters = ({
  searchQuery,
  onSearchChange,
  selectedCompany,
  onCompanyChange,
  companies,
  showArchived = false,
  onShowArchivedChange,
}: DepartmentsFiltersProps) => {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="relative flex-1 min-w-[240px]">
        <Icon name="Search" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по названию или коду..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      <Select
        value={selectedCompany || 'all'}
        onValueChange={(value) => onCompanyChange(value === 'all' ? '' : value)}
      >
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Все компании" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все компании</SelectItem>
          {companies.map((company) => (
            <SelectItem key={company.id} value={company.id.toString()}>
              {company.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {onShowArchivedChange && (
        <div className="flex items-center gap-2">
          <Switch
            id="show-archived"
            checked={showArchived}
            onCheckedChange={onShowArchivedChange}
          />
          <Label htmlFor="show-archived" className="text-sm cursor-pointer whitespace-nowrap">
            Показать архивные
          </Label>
        </div>
      )}
    </div>
  );
};

export default DepartmentsFilters;