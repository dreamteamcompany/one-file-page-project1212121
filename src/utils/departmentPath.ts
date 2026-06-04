export interface DepartmentNode {
  id: number;
  name: string;
  parent_id?: number | null;
}

/**
 * Строит полный путь отдела по оргструктуре от корня до текущего отдела.
 * Например: "Компания → Коммерция → Отдел продаж".
 */
export const buildDepartmentPath = (
  departments: DepartmentNode[],
  departmentId?: number | null,
  separator = ' → ',
): string => {
  if (!departmentId) return '';

  const byId = new Map(departments.map((d) => [d.id, d]));
  const names: string[] = [];
  const visited = new Set<number>();
  let current = byId.get(departmentId);

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    names.unshift(current.name);
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }

  return names.join(separator);
};
