import { useState, useEffect, useMemo } from 'react';
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

interface DepartmentPosition {
  department_id: number;
  position_id: number;
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

function getChildrenByParent(departments: Department[]): Map<number | null, Department[]> {
  const map = new Map<number | null, Department[]>();
  for (const dept of departments) {
    const key = dept.parent_id;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(dept);
  }
  return map;
}

function buildPathFromValue(
  departments: Department[],
  departmentId: number | undefined
): number[] {
  if (!departmentId) return [];

  const byId = new Map(departments.map((d) => [d.id, d]));
  const path: number[] = [];
  let current = byId.get(departmentId);

  while (current) {
    path.unshift(current.id);
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }

  return path;
}

function getLevelLabel(level: number): string {
  if (level === 0) return 'Подразделение';
  return '';
}

const CompanyStructureInput = ({ value, onChange }: CompanyStructureInputProps) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [departmentPositions, setDepartmentPositions] = useState<DepartmentPosition[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    value?.company_id?.toString() || ''
  );
  const [selectedPath, setSelectedPath] = useState<number[]>([]);
  const [selectedPositionId, setSelectedPositionId] = useState<string>(
    value?.position_id?.toString() || ''
  );

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (value?.department_id && departments.length > 0) {
      const path = buildPathFromValue(departments, value.department_id);
      setSelectedPath(path);
    }
  }, [value?.department_id, departments]);

  const loadData = async () => {
    try {
      const [compsRes, depsRes, posRes, depPosRes] = await Promise.all([
        apiFetch('/companies'),
        apiFetch('/departments'),
        apiFetch('/positions'),
        apiFetch('/department-positions'),
      ]);

      const [compsData, depsData, posData, depPosData] = await Promise.all([
        compsRes.json(),
        depsRes.json(),
        posRes.json(),
        depPosRes.json(),
      ]);

      setCompanies(Array.isArray(compsData) ? compsData : []);
      setDepartments(Array.isArray(depsData) ? depsData : []);
      setPositions(Array.isArray(posData) ? posData : []);
      setDepartmentPositions(Array.isArray(depPosData) ? depPosData : []);
    } catch (error) {
      console.error('Failed to load company structure data:', error);
    } finally {
      setLoading(false);
    }
  };

  const companyDepartments = useMemo(
    () =>
      selectedCompanyId
        ? departments.filter((d) => d.company_id?.toString() === selectedCompanyId)
        : [],
    [departments, selectedCompanyId]
  );

  const childrenMap = useMemo(
    () => getChildrenByParent(companyDepartments),
    [companyDepartments]
  );

  const levelSelects = useMemo(() => {
    const levels: { parentId: number | null; options: Department[]; selectedId: number | null }[] = [];

    const rootOptions = childrenMap.get(null) || [];
    if (rootOptions.length === 0) return levels;

    levels.push({
      parentId: null,
      options: rootOptions,
      selectedId: selectedPath[0] ?? null,
    });

    for (let i = 0; i < selectedPath.length; i++) {
      const children = childrenMap.get(selectedPath[i]) || [];
      if (children.length === 0) break;

      levels.push({
        parentId: selectedPath[i],
        options: children,
        selectedId: selectedPath[i + 1] ?? null,
      });
    }

    return levels;
  }, [childrenMap, selectedPath]);

  const deepestDepartmentId = selectedPath.length > 0
    ? selectedPath[selectedPath.length - 1]
    : undefined;

  const emitChange = (companyId: string, deptId: number | undefined, posId: string) => {
    onChange?.({
      company_id: companyId ? parseInt(companyId) : undefined,
      department_id: deptId,
      position_id: posId ? parseInt(posId) : undefined,
    });
  };

  const handleCompanyChange = (companyId: string) => {
    setSelectedCompanyId(companyId);
    setSelectedPath([]);
    setSelectedPositionId('');
    emitChange(companyId, undefined, '');
  };

  const handleLevelChange = (level: number, departmentId: string) => {
    const newPath = [...selectedPath.slice(0, level), parseInt(departmentId)];
    setSelectedPath(newPath);
    setSelectedPositionId('');

    const newDeepest = parseInt(departmentId);
    emitChange(selectedCompanyId, newDeepest, '');
  };

  const handlePositionChange = (positionId: string) => {
    setSelectedPositionId(positionId);
    emitChange(selectedCompanyId, deepestDepartmentId, positionId);
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

      {levelSelects.map((level, index) => (
        <div key={`level-${index}-${level.parentId}`} className="space-y-2">
          {index === 0 && <Label>{getLevelLabel(index)}</Label>}
          <Select
            value={level.selectedId?.toString() || ''}
            onValueChange={(val) => handleLevelChange(index, val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Выберите подразделение" />
            </SelectTrigger>
            <SelectContent>
              {level.options.map((dept) => (
                <SelectItem key={dept.id} value={dept.id.toString()}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}

      {deepestDepartmentId && (() => {
        const linkedPositionIds = new Set(
          departmentPositions
            .filter((dp) => dp.department_id === deepestDepartmentId)
            .map((dp) => dp.position_id)
        );
        const filteredPositions = positions.filter((p) => linkedPositionIds.has(p.id));

        return filteredPositions.length > 0 ? (
          <div className="space-y-2">
            <Label>Должность</Label>
            <Select value={selectedPositionId} onValueChange={handlePositionChange}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите должность" />
              </SelectTrigger>
              <SelectContent>
                {filteredPositions.map((position) => (
                  <SelectItem key={position.id} value={position.id.toString()}>
                    {position.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null;
      })()}
    </div>
  );
};

export default CompanyStructureInput;