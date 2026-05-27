export interface DepartmentNode {
  id: number;
  parent_id: number | null;
  is_hidden?: boolean;
  is_archived?: boolean;
  is_active?: boolean;
  [key: string]: unknown;
}

/**
 * Возвращает effective parent_id для отдела: если родитель скрыт,
 * "поднимаемся" до первого видимого предка. Если все предки скрыты — null (корень).
 */
export function resolveVisibleParent(
  dept: DepartmentNode,
  byId: Map<number, DepartmentNode>,
): number | null {
  let parentId = dept.parent_id;
  const seen = new Set<number>();
  while (parentId != null) {
    if (seen.has(parentId)) return null;
    seen.add(parentId);
    const parent = byId.get(parentId);
    if (!parent) return null;
    if (!parent.is_hidden) return parent.id;
    parentId = parent.parent_id;
  }
  return null;
}

/**
 * Фильтрует список отделов для отображения:
 * - убирает отделы с is_hidden = true
 * - детям скрытых родителей подменяет parent_id на ближайшего видимого предка
 *   (чтобы дети "поднимались" на уровень выше)
 */
export function filterHiddenDepartments<T extends DepartmentNode>(
  departments: T[],
): T[] {
  const byId = new Map<number, T>();
  for (const d of departments) byId.set(d.id, d);

  const result: T[] = [];
  for (const d of departments) {
    if (d.is_hidden) continue;
    const effectiveParent = resolveVisibleParent(d, byId);
    if (effectiveParent === d.parent_id) {
      result.push(d);
    } else {
      result.push({ ...d, parent_id: effectiveParent });
    }
  }
  return result;
}