import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiFetch } from '@/utils/api';

interface Company {
  id: number;
  name: string;
}

interface Department {
  id: number;
  name: string;
  parent_id: number | null;
  company_id: number;
}

interface Position {
  id: number;
  name: string;
}

interface CompanyStructureInputProps {
  value?: {
    company_id?: number;
    department_id?: number;
    position_id?: number;
  };
  onChange?: (value: {
    company_id?: number;
    department_id?: number;
    position_id?: number;
  }) => void;
}

interface HierarchicalDepartment extends Department {
  level: number;
}

function buildHierarchicalList(departments: Department[]): HierarchicalDepartment[] {
  const result: HierarchicalDepartment[] = [];
  const childrenMap = new Map<number | null, Department[]>();

  for (const dept of departments) {
    const key = dept.parent_id;
    if (!childrenMap.has(key)) childrenMap.set(key, []);
    childrenMap.get(key)!.push(dept);
  }

  function traverse(parentId: number | null, level: number) {
    const children = childrenMap.get(parentId) || [];
    for (const child of children) {
      result.push({ ...child, level });
      traverse(child.id, level + 1);
    }
  }

  traverse(null, 0);
  return result;
}

const CompanyStructureInput = ({ value, onChange }: CompanyStructureInputProps) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    value?.company_id?.toString() || ''
  );
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>(
    value?.department_id?.toString() || ''
  );
  const [selectedPositionId, setSelectedPositionId] = useState<string>(
    value?.position_id?.toString() || ''
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [compsRes, depsRes, posRes] = await Promise.all([
        apiFetch('/companies'),
        apiFetch('/departments'),
        apiFetch('/positions'),
      ]);

      const [compsData, depsData, posData] = await Promise.all([
        compsRes.json(),
        depsRes.json(),
        posRes.json(),
      ]);

      setCompanies(Array.isArray(compsData) ? compsData : []);
      setDepartments(Array.isArray(depsData) ? depsData : []);
      setPositions(Array.isArray(posData) ? posData : []);
    } catch (error) {
      console.error('Failed to load company structure data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDepartments = selectedCompanyId
    ? buildHierarchicalList(
        departments.filter((d) => d.company_id && d.company_id.toString() === selectedCompanyId)
      )
    : [];

  const handleCompanyChange = (companyId: string) => {
    setSelectedCompanyId(companyId);
    setSelectedDepartmentId('');
    setSelectedPositionId('');
    onChange?.({
      company_id: parseInt(companyId),
    });
  };

  const handleDepartmentChange = (departmentId: string) => {
    setSelectedDepartmentId(departmentId);
    setSelectedPositionId('');
    onChange?.({
      company_id: selectedCompanyId ? parseInt(selectedCompanyId) : undefined,
      department_id: parseInt(departmentId),
    });
  };

  const handlePositionChange = (positionId: string) => {
    setSelectedPositionId(positionId);
    onChange?.({
      company_id: selectedCompanyId ? parseInt(selectedCompanyId) : undefined,
      department_id: selectedDepartmentId ? parseInt(selectedDepartmentId) : undefined,
      position_id: parseInt(positionId),
    });
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Загрузка...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Компания</Label>
        <Select value={selectedCompanyId} onValueChange={handleCompanyChange}>
          <SelectTrigger>
            <SelectValue placeholder="Выберите компанию" />
          </SelectTrigger>
          <SelectContent>
            {companies.map((company) => (
              <SelectItem key={company.id} value={company.id.toString()}>
                {company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedCompanyId && filteredDepartments.length > 0 && (
        <div className="space-y-2">
          <Label>Подразделение</Label>
          <Select value={selectedDepartmentId} onValueChange={handleDepartmentChange}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите подразделение" />
            </SelectTrigger>
            <SelectContent>
              {filteredDepartments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id.toString()}>
                  <span style={{ paddingLeft: `${dept.level * 16}px` }}>
                    {dept.level > 0 ? '└ ' : ''}{dept.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedDepartmentId && positions.length > 0 && (
        <div className="space-y-2">
          <Label>Должность</Label>
          <Select value={selectedPositionId} onValueChange={handlePositionChange}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите должность" />
            </SelectTrigger>
            <SelectContent>
              {positions.map((position) => (
                <SelectItem key={position.id} value={position.id.toString()}>
                  {position.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};

export default CompanyStructureInput;